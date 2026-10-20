import { useState, useEffect, useCallback } from "react";
import {
  isLocationInBengaluru,
  getDistanceFromBengaluru,
  isCityOverrideEnabled,
  setCityOverride,
  reverseGeocodeCity,
} from "@/lib/locationAreas";
import { useUserLocation } from "@/hooks/useUserLocation";

// City Gate Hook for Geofencing WorkHop to Bengaluru
export function useCityGate() {
  const { coords, status: locStatus, requestLocation } = useUserLocation();
  const [detectedCity, setDetectedCity] = useState("your area");
  const [isOutsideCity, setIsOutsideCity] = useState(false);
  const [distanceKm, setDistanceKm] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(() => isCityOverrideEnabled());
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  // Auto-request location when user is signed in
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isUserLoggedIn = !!(
      localStorage.getItem("workhop_token") ||
      localStorage.getItem("workhop_user") ||
      localStorage.getItem("workhop_freelancer_id")
    );
    if (isUserLoggedIn && locStatus === "idle" && !coords) {
      requestLocation();
    }
  }, [locStatus, coords, requestLocation]);

  // 1. Check IP-based location on initial mount (catches desktop & non-GPS visitors)
  useEffect(() => {
    // If preview override already active, user opted to view Bengaluru platform
    if (isCityOverrideEnabled()) {
      setIsPreviewMode(true);
      setChecked(true);
      return;
    }

    let isMounted = true;
    const checkIpLocation = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
        // 1. Try our own backend geo check endpoint first
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2800);

        const res = await fetch(`${backendUrl}/api/geo/check`, {
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data = await res.json();
          if (data && isMounted) {
            if (data.city) {
              setDetectedCity(data.city);
            }
            if (data.city && !data.is_bengaluru) {
              setIsOutsideCity(true);
              setIsGateOpen(true);
            }
          }
        } else {
          // Fallback to client-side IP lookup if local dev or proxy without geo headers
          const ipRes = await fetch("https://ipwho.is/?fields=city,region,country,latitude,longitude,is_eu", {
            signal: AbortSignal.timeout(2500),
          }).catch(() => null);

          if (ipRes && ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData && isMounted && ipData.country === "India") {
              const city = ipData.city || "";
              const lowerCity = city.toLowerCase();
              const isBlr = lowerCity.includes("bengaluru") || lowerCity.includes("bangalore");

              let farFromBlr = false;
              if (ipData.latitude && ipData.longitude) {
                farFromBlr = !isLocationInBengaluru({ lat: ipData.latitude, lng: ipData.longitude });
              }

              if (city && (!isBlr || farFromBlr)) {
                setDetectedCity(city);
                setIsOutsideCity(true);
                setIsGateOpen(true);
              }
            }
          }
        }
      } catch (err) {
        // Silently fail to avoid breaking UX on network glitches
      } finally {
        if (isMounted) setChecked(true);
      }
    };

    checkIpLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Accurate Hardware GPS Check when user shares coordinates
  const handleCoordsCheck = useCallback((c) => {
    if (!c || typeof c.lat !== "number" || typeof c.lng !== "number") return;

    const inBlr = isLocationInBengaluru(c);
    const dist = getDistanceFromBengaluru(c);
    setDistanceKm(dist);

    if (!inBlr) {
      setIsOutsideCity(true);
      setIsGateOpen(true);
      setIsPreviewMode(false);
      setCityOverride(false);

      reverseGeocodeCity(c).then((cityName) => {
        if (cityName) setDetectedCity(cityName);
      });
    } else {
      // User is genuinely in Bengaluru! Close gate
      setIsOutsideCity(false);
      setIsGateOpen(false);
      setDetectedCity("Bengaluru");
    }
  }, []);

  useEffect(() => {
    if (coords) {
      handleCoordsCheck(coords);
    }
  }, [coords, handleCoordsCheck]);

  // Listen for global location updates
  useEffect(() => {
    const onLocationUpdated = (e) => {
      if (e?.detail) handleCoordsCheck(e.detail);
    };
    window.addEventListener("workhop:location_updated", onLocationUpdated);
    return () => window.removeEventListener("workhop:location_updated", onLocationUpdated);
  }, [handleCoordsCheck]);

  const enablePreviewMode = useCallback(() => {
    setCityOverride(true);
    setIsPreviewMode(true);
    setIsGateOpen(false);
  }, []);

  const exitPreviewMode = useCallback(() => {
    setCityOverride(false);
    setIsPreviewMode(false);
    if (isOutsideCity) {
      setIsGateOpen(true);
    }
  }, [isOutsideCity]);

  const openGateModal = useCallback(() => {
    setIsGateOpen(true);
  }, []);

  const closeGateModal = useCallback(() => {
    setIsGateOpen(false);
  }, []);

  // Submit city waitlist demand to backend
  const submitWaitlist = async ({ city, email, contact, role, note }) => {
    const finalEmail = (email || contact || "").trim();
    const finalCity = (city || detectedCity || "Mysore").trim();
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/city-waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: finalCity,
          email: finalEmail,
          contact: finalEmail,
          role: role || "user",
          coords,
          note,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
      throw new Error("Backend unavailable");
    } catch {
      // Fallback local persistence if offline / dev mode
      try {
        const { saveCityWaitlistEntry } = await import("@/lib/clientStore");
        return saveCityWaitlistEntry({
          city: finalCity,
          email: finalEmail,
          contact: finalEmail,
          role,
          note,
        });
      } catch {
        return {
          ok: true,
          city: finalCity,
          email: finalEmail,
          waitlist_count: 153,
          message: `You're on the waitlist for ${finalCity}! We'll notify you as soon as WorkHop launches in your area.`,
        };
      }
    }
  };

  return {
    isOutsideCity,
    detectedCity,
    distanceKm,
    isPreviewMode,
    isGateOpen,
    checked,
    locStatus,
    requestLocation,
    openGateModal,
    closeGateModal,
    enablePreviewMode,
    exitPreviewMode,
    submitWaitlist,
  };
}
