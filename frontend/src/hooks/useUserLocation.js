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
      // Only restore real coordinates (ignore stale cellular IP fallbacks like Kudligi)
      if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number" && !parsed?.isIpFallback) {
        globalCoords = parsed;
        globalStatus = "granted";
      } else if (parsed?.isIpFallback) {
        // Clear inaccurate cellular IP from storage
        sessionStorage.removeItem("workhop_user_coords");
        localStorage.removeItem("workhop_user_coords");
      }
    }
  } catch {}
}

/**
 * Specifically requests high-accuracy hardware GPS from the user's phone.
 * Gives the phone's GPS chip 15 seconds to acquire a fresh satellite fix (maximumAge: 0).
 */
export function detectAccurateGps(timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      resolve({ success: false, error: "Geolocation is not supported by your browser." });
      return;
    }

    globalStatus = "locating";
    notifyListeners();

    const tryWithConfig = (highAccuracy, maxAge, timeout) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            isHardwareGps: true,
            isManual: false,
            isIpFallback: false,
            detectedAt: new Date().toISOString(),
          };
          globalCoords = nextCoords;
          globalStatus = "granted";
          try {
            sessionStorage.setItem("workhop_user_coords", JSON.stringify(nextCoords));
            localStorage.setItem("workhop_user_coords", JSON.stringify(nextCoords));
            localStorage.setItem("workhop_city_override", "bengaluru");
          } catch {}
          notifyListeners();
          window.dispatchEvent(new CustomEvent("workhop:location_updated", { detail: nextCoords }));
          resolve({ success: true, coords: nextCoords });
        },
        (err) => {
          // If high accuracy satellite GPS timed out or unavailable, try assisted GPS before failing
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            tryWithConfig(false, 30000, 6000);
            return;
          }
          let msg = "Could not detect GPS location.";
          if (err.code === 1) {
            msg = "Location permission denied. Please allow location access in your phone/browser settings.";
          } else if (err.code === 2) {
            msg = "Device GPS position unavailable. Please ensure your phone's Location / GPS toggle is turned on.";
          } else if (err.code === 3) {
            msg = "GPS satellite acquisition timed out. Please try again or select your location manually.";
          }
          globalStatus = err.code === 1 ? "blocked" : "denied";
          notifyListeners();
          resolve({ success: false, error: msg, code: err.code });
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeout,
          maximumAge: maxAge,
        }
      );
    };

    tryWithConfig(true, 0, timeoutMs);
  });
}

/**
 * Manually sets the user's location (e.g. "Indiranagar", "Koramangala", or custom coords).
 * Saves to localStorage, sets city override to Bengaluru, and updates all listeners instantly.
 */
export function setManualLocation(areaOrCoords) {
  let nextCoords = null;
  let areaName = "Bengaluru";

  const areaCoordinatesMap = {
    koramangala: { lat: 12.9352, lng: 77.6245 },
    indiranagar: { lat: 12.9784, lng: 77.6408 },
    "hsr layout": { lat: 12.9121, lng: 77.6446 },
    whitefield: { lat: 12.9698, lng: 77.7499 },
    jayanagar: { lat: 12.9308, lng: 77.5838 },
    "mg road": { lat: 12.9756, lng: 77.6066 },
    "mg road / cbd": { lat: 12.9756, lng: 77.6066 },
    "electronic city": { lat: 12.8452, lng: 77.6602 },
    marathahalli: { lat: 12.9591, lng: 77.6974 },
    "btm layout": { lat: 12.9166, lng: 77.6101 },
    bellandur: { lat: 12.9260, lng: 77.6762 },
    "jp nagar": { lat: 12.9063, lng: 77.5857 },
    malleshwaram: { lat: 13.0031, lng: 77.5643 },
    "sarjapur road": { lat: 12.9090, lng: 77.6850 },
    sarjapur: { lat: 12.9090, lng: 77.6850 },
    banashankari: { lat: 12.9255, lng: 77.5468 },
    rajajinagar: { lat: 12.9982, lng: 77.5530 },
    domlur: { lat: 12.9609, lng: 77.6387 },
    "frazer town": { lat: 12.9968, lng: 77.6130 },
    "kalyan nagar": { lat: 13.0280, lng: 77.6433 },
    hebbal: { lat: 13.0358, lng: 77.5970 },
    "church street": { lat: 12.9749, lng: 77.6047 },
    basavanagudi: { lat: 12.9416, lng: 77.5755 },
    yelahanka: { lat: 13.1007, lng: 77.5963 },
  };

  if (typeof areaOrCoords === "string") {
    areaName = areaOrCoords.trim();
    const key = areaName.toLowerCase();
    const matched = areaCoordinatesMap[key] || { lat: 12.9716, lng: 77.5946 };
    nextCoords = {
      lat: matched.lat,
      lng: matched.lng,
      area: areaName,
      city: "Bengaluru",
      isManual: true,
      isHardwareGps: false,
      isIpFallback: false,
    };
  } else if (areaOrCoords && typeof areaOrCoords.lat === "number") {
    areaName = areaOrCoords.area || areaOrCoords.name || "Bengaluru";
    nextCoords = {
      ...areaOrCoords,
      area: areaName,
      city: "Bengaluru",
      isManual: true,
      isHardwareGps: false,
      isIpFallback: false,
    };
  }

  if (!nextCoords) return null;

  globalCoords = nextCoords;
  globalStatus = "granted";
  try {
    sessionStorage.setItem("workhop_user_coords", JSON.stringify(nextCoords));
    localStorage.setItem("workhop_user_coords", JSON.stringify(nextCoords));
    localStorage.setItem("workhop_user_area", areaName);
    localStorage.setItem("workhop_city_override", "bengaluru");
    localStorage.removeItem("workhop_last_kudligi_error");
  } catch {}

  notifyListeners();
  window.dispatchEvent(new CustomEvent("workhop:location_updated", { detail: nextCoords }));
  return nextCoords;
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

  const requestLocation = useCallback((options = {}) => {
    return detectAccurateGps(options.timeout || 15000);
  }, []);

  return { coords, status, requestLocation, detectAccurateGps, setManualLocation };
}
