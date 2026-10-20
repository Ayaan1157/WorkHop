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
    if (!("geolocation" in navigator)) {
      globalStatus = "denied";
      setStatus("denied");
      notifyListeners();
      return;
    }
    globalStatus = "locating";
    setStatus("locating");
    notifyListeners();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
      },
      (err) => {
        const nextStatus = err.code === 1 ? "blocked" : "denied";
        globalStatus = nextStatus;
        setStatus(nextStatus);
        notifyListeners();
        window.dispatchEvent(new CustomEvent("workhop:location_permission_denied", { detail: { code: err.code } }));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return { coords, status, requestLocation };
}
