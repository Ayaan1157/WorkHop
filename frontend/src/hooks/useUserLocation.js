import { useCallback, useState, useEffect } from "react";

export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

let globalCoords = null;
let globalStatus = "idle";
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn({ coords: globalCoords, status: globalStatus }));
}

if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem("workhop_user_coords") || localStorage.getItem("workhop_user_coords");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
        globalCoords = parsed;
        globalStatus = "granted";
      }
    }
  } catch {}
}

async function fetchIpLocation() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
        return { lat: data.latitude, lng: data.longitude, city: data.city, isIpFallback: true };
      }
    }
  } catch {}
  return null;
}

export function useUserLocation() {
  const [coords, setCoords] = useState(globalCoords);
  const [status, setStatus] = useState(globalStatus);

  useEffect(() => {
    const listener = ({ coords, status }) => {
      setCoords(coords);
      setStatus(status);
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const requestLocation = useCallback(() => {
    return new Promise((resolve) => {
      globalStatus = "locating";
      setStatus("locating");
      notifyListeners();

      const onLocationSuccess = (nextCoords, isIp = false) => {
        globalCoords = nextCoords;
        globalStatus = "granted";
        try {
          sessionStorage.setItem("workhop_user_coords", JSON.stringify(nextCoords));
          localStorage.setItem("workhop_user_coords", JSON.stringify(nextCoords));
        } catch {}
        setCoords(nextCoords);
        setStatus("granted");
        notifyListeners();
        window.dispatchEvent(new CustomEvent("workhop:location_updated", { detail: nextCoords }));
        resolve({ coords: nextCoords, status: "granted", isIpFallback: isIp });
      };

      const tryIpFallback = async (originalErr) => {
        const ipCoords = await fetchIpLocation();
        if (ipCoords) {
          onLocationSuccess(ipCoords, true);
          return;
        }
        const nextStatus = originalErr?.code === 1 ? "blocked" : "denied";
        globalStatus = nextStatus;
        setStatus(nextStatus);
        notifyListeners();
        window.dispatchEvent(new CustomEvent("workhop:location_permission_denied", { detail: { code: originalErr?.code } }));
        resolve({ coords: null, status: nextStatus, error: originalErr });
      };

      if (!("geolocation" in navigator)) {
        tryIpFallback(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onLocationSuccess({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // If high accuracy failed or timed out, retry with fast network/wifi positioning
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              onLocationSuccess({ lat: pos2.coords.latitude, lng: pos2.coords.longitude });
            },
            (err2) => {
              tryIpFallback(err2);
            },
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
          );
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 }
      );
    });
  }, []);

  return { coords, status, requestLocation };
}
