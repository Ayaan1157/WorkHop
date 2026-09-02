import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

export type Coords = { lat: number; lng: number };
export type LocationStatus = "idle" | "locating" | "granted" | "denied" | "blocked";

/**
 * Device location with the full permission contract:
 * - silently reuses an already-granted permission (no prompt on mount)
 * - requestLocation() must be called on explicit user intent (e.g. tapping
 *   a "Near me" button); respects canAskAgain and reports "blocked" so the
 *   caller can render an "Open Settings" action.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const getPosition = useCallback(async () => {
    setStatus("locating");
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setStatus("granted");
    } catch {
      setStatus("denied");
    }
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (p.granted) getPosition();
      })
      .catch(() => {});
  }, [getPosition]);

  const requestLocation = useCallback(async () => {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) return getPosition();
      if (!current.canAskAgain) {
        setStatus("blocked");
        return;
      }
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.granted) return getPosition();
      setStatus(req.canAskAgain ? "denied" : "blocked");
    } catch {
      setStatus("denied");
    }
  }, [getPosition]);

  return { coords, status, requestLocation };
}

/** Great-circle distance between two coordinates, in km. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
