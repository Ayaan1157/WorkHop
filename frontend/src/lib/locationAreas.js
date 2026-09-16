// Hyperlocal Areas & Real-Time Geolocation Utilities for Bengaluru
import { distanceKm } from "@/hooks/useUserLocation";

export const BENGALURU_AREAS = [
  { name: "Koramangala", lat: 12.9352, lng: 77.6245, zone: "South" },
  { name: "Indiranagar", lat: 12.9784, lng: 77.6408, zone: "East" },
  { name: "HSR Layout", lat: 12.9121, lng: 77.6446, zone: "South-East" },
  { name: "Whitefield", lat: 12.9698, lng: 77.7499, zone: "East" },
  { name: "Jayanagar", lat: 12.9308, lng: 77.5838, zone: "South" },
  { name: "MG Road / CBD", lat: 12.9756, lng: 77.6066, zone: "Central" },
  { name: "Electronic City", lat: 12.8452, lng: 77.6602, zone: "South" },
  { name: "Marathahalli", lat: 12.9591, lng: 77.6974, zone: "East" },
  { name: "BTM Layout", lat: 12.9166, lng: 77.6101, zone: "South" },
  { name: "Bellandur", lat: 12.9260, lng: 77.6762, zone: "South-East" },
  { name: "JP Nagar", lat: 12.9063, lng: 77.5857, zone: "South" },
  { name: "Malleshwaram", lat: 13.0031, lng: 77.5643, zone: "North-West" },
  { name: "Sarjapur Road", lat: 12.9090, lng: 77.6850, zone: "South-East" },
  { name: "Banashankari", lat: 12.9255, lng: 77.5468, zone: "South" },
  { name: "Rajajinagar", lat: 12.9982, lng: 77.5530, zone: "West" },
  { name: "Domlur", lat: 12.9609, lng: 77.6387, zone: "East" },
  { name: "Frazer Town", lat: 12.9968, lng: 77.6130, zone: "Central" },
  { name: "Kalyan Nagar", lat: 13.0280, lng: 77.6433, zone: "North-East" },
  { name: "Hebbal", lat: 13.0358, lng: 77.5970, zone: "North" },
  { name: "Church Street", lat: 12.9749, lng: 77.6047, zone: "Central" },
  { name: "Basavanagudi", lat: 12.9416, lng: 77.5755, zone: "South" },
  { name: "Yelahanka", lat: 13.1007, lng: 77.5963, zone: "North" },
];

// Find closest named locality from coordinates
export function findNearestArea(coords) {
  if (!coords || !coords.lat || !coords.lng) return null;
  let closest = null;
  let minDistance = Infinity;

  for (const area of BENGALURU_AREAS) {
    const dist = distanceKm(coords, { lat: area.lat, lng: area.lng });
    if (dist < minDistance) {
      minDistance = dist;
      closest = { ...area, distance_km: Math.round(dist * 10) / 10 };
    }
  }
  return closest;
}

// Get center coordinates for a locality name
export function getAreaCoordinates(areaName) {
  if (!areaName) return { lat: 12.9716, lng: 77.5946 }; // Default Bengaluru center
  const normalized = areaName.trim().toLowerCase();
  const match = BENGALURU_AREAS.find(
    (a) => a.name.toLowerCase().includes(normalized) || normalized.includes(a.name.toLowerCase())
  );
  if (match) return { lat: match.lat, lng: match.lng };
  return { lat: 12.9716, lng: 77.5946 };
}

// Calculate distance between two areas or coordinates
export function calculateDistance(source, target) {
  let srcCoords = source?.lat ? source : getAreaCoordinates(source);
  let tgtCoords = target?.lat ? target : getAreaCoordinates(target);
  const dist = distanceKm(srcCoords, tgtCoords);
  return Math.round(dist * 10) / 10;
}

// Get suitability badge
export function getDistanceSuitability(distKm) {
  if (distKm <= 2.5) {
    return { label: "Hyperlocal Match (≤ 2.5 km)", color: "#00A86B", badge: "PERFECT MATCH" };
  }
  if (distKm <= 5.0) {
    return { label: "Nearby Area (≤ 5 km)", color: "#E65A1E", badge: "NEARBY" };
  }
  if (distKm <= 10.0) {
    return { label: "Within Reach (≤ 10 km)", color: "#555555", badge: "COMMUTABLE" };
  }
  return { label: "Greater Bengaluru Area (> 10 km)", color: "#888888", badge: "FARTHER" };
}

// Local storage helpers for user's preferred area
export function getSavedArea() {
  const saved = localStorage.getItem("workhop_user_area");
  if (saved) return saved;
  return "Koramangala";
}

export function setSavedArea(areaName) {
  if (areaName) localStorage.setItem("workhop_user_area", areaName);
}

// Calculate deterministic pseudo-random organic offset around a base coordinate or area center
// This prevents markers from overlapping or forming artificial straight diagonal lines
export function getOrganicCoordinates(baseLat, baseLng, idOrKey, maxOffsetKm = 0.9) {
  let lat = Number(baseLat) || 12.9352; // Default Koramangala
  let lng = Number(baseLng) || 77.6245;

  const str = String(idOrKey || "0");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  // Golden-ratio angle distribution ensures even 360-degree organic radial scatter
  const angle = ((absHash * 137.5) % 360) * (Math.PI / 180);
  // Distance between 0.12km and maxOffsetKm (e.g. 0.9km)
  const normalizedDist = 0.12 + ((absHash % 1000) / 1000) * (maxOffsetKm - 0.12);

  // 1 deg latitude ≈ 111.32 km
  // 1 deg longitude ≈ 111.32 km * cos(lat) (≈ 108.5 km in Bengaluru ~12.97°N)
  const latDelta = (normalizedDist * Math.cos(angle)) / 111.32;
  const lngDelta = (normalizedDist * Math.sin(angle)) / (111.32 * Math.cos((lat * Math.PI) / 180));

  return {
    lat: Math.round((lat + latDelta) * 100000) / 100000,
    lng: Math.round((lng + lngDelta) * 100000) / 100000,
  };
}
