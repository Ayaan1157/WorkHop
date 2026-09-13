import { useEffect, useRef } from "react";
import L from "leaflet";

// Vanilla Leaflet map (avoids react-leaflet React-19 peer issues).
// pins: [{ id, kind: 'candidate'|'employer', title, subtitle, lat, lng }]
export default function OSMMap({ pins = [], center = { lat: 12.9716, lng: 77.5946 }, zoom = 12, userLocation = null, height = "100%" }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView(
      [center.lat, center.lng],
      zoom,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center when center/userLocation changes
  useEffect(() => {
    if (!mapRef.current) return;
    const c = userLocation || center;
    mapRef.current.setView([c.lat, c.lng], userLocation ? 14 : zoom);
  }, [center, userLocation, zoom]);

  // Draw markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const pinIcon = (color) =>
      L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;background:${color};border:2px solid #121212;transform:rotate(45deg)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

    const escapeHtml = (str) =>
      String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    pins.forEach((p) => {
      const color = p.kind === "employer" ? "#121212" : "#FF5A00";
      const titleEsc = escapeHtml(p.title);
      const subEsc = escapeHtml(p.subtitle);
      L.marker([p.lat, p.lng], { icon: pinIcon(color) })
        .addTo(layer)
        .bindPopup(
          `<strong style="font-family:Archivo,sans-serif">${titleEsc}</strong><br/><span style="font-family:Archivo,sans-serif;font-size:11px;color:#6B6B6B">${subEsc}</span>`,
        );
    });

    if (userLocation) {
      L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 8,
        color: "#121212",
        weight: 2,
        fillColor: "#2196F3",
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindPopup("You are here");
    }
  }, [pins, userLocation]);

  return <div ref={elRef} style={{ height, width: "100%" }} data-testid="osm-map" />;
}
