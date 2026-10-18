import { useState, useEffect, useCallback } from "react";
import {
  isLocationInBengaluru,
  getDistanceFromBengaluru,
  isCityOverrideEnabled,
  setCityOverride,
} from "@/lib/locationAreas";
import { useUserLocation } from "@/hooks/useUserLocation";

// City Gate Hook for Geofencing WorkHop to Bengaluru
export function useCityGate() {
  const { coords, status: locStatus, requestLocation } = useUserLocation();
  const [detectedCity, setDetectedCity] = useState("Mysore");
  const [isOutsideCity, setIsOutsideCity] = useState(false);
  const [distanceKm, setDistanceKm] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(() => isCityOverrideEnabled());
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [checked, setChecked] = useState(false);

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
  useEffect(() => {
    if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") return;

    const inBlr = isLocationInBengaluru(coords);
    const dist = getDistanceFromBengaluru(coords);
    setDistanceKm(dist);

    if (!inBlr) {
      setIsOutsideCity(true);
      // Rough estimation for Mysore if south-west and ~120-160km away
      if (coords.lat < 12.6 && coords.lng < 77.0 && dist > 80 && dist < 180) {
        setDetectedCity("Mysore");
      }
      if (!isCityOverrideEnabled()) {
        setIsGateOpen(true);
      }
    } else {
      // User is genuinely in Bengaluru! Close gate
      setIsOutsideCity(false);
      setIsGateOpen(false);
    }
  }, [coords]);

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
