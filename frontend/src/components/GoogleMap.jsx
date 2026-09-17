import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, LocateFixed, Sparkles, Navigation, Briefcase, User, Building2 } from "lucide-react";

// Google Maps Raster Tiles & Fallbacks
const MAP_LAYERS = {
  google_road: {
    name: "Google Standard",
    url: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
    attribution: "&copy; Google Maps",
  },
  google_satellite: {
    name: "Google Satellite",
    url: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
    attribution: "&copy; Google Maps Satellite",
  },
  google_terrain: {
    name: "Google Terrain",
    url: "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
    attribution: "&copy; Google Maps Terrain",
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  },
};

export default function GoogleMap({
  pins = [],
  center = { lat: 12.9716, lng: 77.5946 },
  zoom = 13,
  userLocation = null,
  radiusKm = 5,
  selectedPinId = null,
  onSelectPin = null,
  height = "460px",
  className = "",
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const radiusLayerRef = useRef(null);
  const markersByIdRef = useRef({});

  const [activeLayerType, setActiveLayerType] = useState("google_road");
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;

    const initialCenter = userLocation || center;
    const map = L.map(elRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [initialCenter.lat, initialCenter.lng],
      zoom: userLocation ? 14 : zoom,
    });

    // Custom Top-Right Zoom Control
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add Tile Layer
    const cfg = MAP_LAYERS[activeLayerType] || MAP_LAYERS.google_road;
    const tileLayer = L.tileLayer(cfg.url, {
      subdomains: cfg.subdomains,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    radiusLayerRef.current = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch Tile Layer (Google Roads / Satellite / OSM)
  const switchLayer = (type) => {
    setActiveLayerType(type);
    setLayerMenuOpen(false);
    if (!mapRef.current) return;

    const cfg = MAP_LAYERS[type] || MAP_LAYERS.google_road;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const newTileLayer = L.tileLayer(cfg.url, {
      subdomains: cfg.subdomains,
      maxZoom: cfg.maxZoom,
    }).addTo(mapRef.current);

    // Keep markers on top
    if (radiusLayerRef.current) radiusLayerRef.current.bringToBack();
    tileLayerRef.current = newTileLayer;
  };

  // Update Center / User Location
  useEffect(() => {
    if (!mapRef.current) return;
    const target = userLocation || center;
    if (target?.lat && target?.lng) {
      mapRef.current.flyTo([target.lat, target.lng], userLocation ? 14 : zoom, {
        duration: 1.2,
      });
    }
  }, [center, userLocation, zoom]);

  // Handle selectedPinId pan & popup
  useEffect(() => {
    if (!selectedPinId || !mapRef.current) return;
    const marker = markersByIdRef.current[selectedPinId];
    if (marker) {
      const latLng = marker.getLatLng();
      mapRef.current.flyTo(latLng, 15, { duration: 0.8 });
      marker.openPopup();
    }
  }, [selectedPinId]);

  // Draw Proximity Radius Circle around User
  useEffect(() => {
    const layer = radiusLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const loc = userLocation || center;
    if (loc && radiusKm && radiusKm > 0) {
      L.circle([loc.lat, loc.lng], {
        radius: radiusKm * 1000,
        color: "#E65A1E",
        weight: 2,
        opacity: 0.7,
        dashArray: "6, 8",
        fillColor: "#E65A1E",
        fillOpacity: 0.08,
      }).addTo(layer);
    }
  }, [userLocation, center, radiusKm]);

  // Draw Interactive Markers
  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markersByIdRef.current = {};

    const escapeHtml = (str) =>
      String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 1. User Marker (Glowing Radar Pulse)
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `
          <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:#3B82F6;opacity:0.35;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.4);position:relative;z-index:2;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(layer)
        .bindPopup(`
          <div style="font-family:Archivo,sans-serif;padding:4px;min-width:140px;text-align:center;">
            <span style="display:inline-block;background:#2563EB;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:2px;letter-spacing:0.1em;">YOU ARE HERE</span>
            <p style="font-size:12px;font-weight:800;margin-top:4px;color:#121212;">Your Current Location</p>
            <p style="font-size:10px;color:#6B6B6B;">Scanning nearby within ${radiusKm || 5}km</p>
          </div>
        `);
      markersByIdRef.current["user"] = userMarker;
    }

    // 2. Pins: Candidates (Freelancers) or Jobs (Open Gigs) or Employers
    pins.forEach((p) => {
      const isCandidate = p.kind === "candidate";
      const isJob = p.kind === "job";
      const isSelected = p.id === selectedPinId;
      const titleEsc = escapeHtml(p.title);
      const subEsc = escapeHtml(p.subtitle);
      const distStr = p.distance_km ? `${p.distance_km} km away` : "";
      const ratingStr = p.rating ? `⭐ ${p.rating}` : "";
      const rateStr = p.rate_hr ? `₹${p.rate_hr}/hr` : "";
      const payStr = p.pay ? `₹${Number(p.pay).toLocaleString("en-IN")}` : "";

      let pinHtml = "";
      if (isCandidate) {
        // Freelancer Pin
        pinHtml = `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:${isSelected ? "scale(1.15)" : "scale(1)"};transition:transform 0.2s;">
            <div style="display:flex;align-items:center;gap:3px;background:#E65A1E;color:#FFFFFF;border:2px solid #121212;padding:2px 6px;border-radius:12px;font-family:Archivo,sans-serif;font-weight:900;font-size:10px;box-shadow:2px 2px 0px #121212;white-space:nowrap;">
              <span>👤</span>
              <span>${titleEsc.split(" ")[0]}</span>
            </div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #121212;margin-top:-1px;"></div>
          </div>
        `;
      } else if (isJob) {
        // Job Posting Pin
        pinHtml = `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:${isSelected ? "scale(1.15)" : "scale(1)"};transition:transform 0.2s;">
            <div style="display:flex;align-items:center;gap:3px;background:#059669;color:#FFFFFF;border:2px solid #121212;padding:2px 6px;border-radius:12px;font-family:Archivo,sans-serif;font-weight:900;font-size:10px;box-shadow:2px 2px 0px #121212;white-space:nowrap;">
              <span>💼</span>
              <span>${payStr || titleEsc.slice(0, 12)}</span>
            </div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #121212;margin-top:-1px;"></div>
          </div>
        `;
      } else {
        // Employer / Company Pin
        pinHtml = `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:${isSelected ? "scale(1.15)" : "scale(1)"};transition:transform 0.2s;">
            <div style="display:flex;align-items:center;gap:3px;background:#121212;color:#FFFFFF;border:2px solid #FFFFFF;padding:2px 6px;border-radius:12px;font-family:Archivo,sans-serif;font-weight:900;font-size:10px;box-shadow:2px 2px 0px rgba(0,0,0,0.5);white-space:nowrap;">
              <span>🏢</span>
              <span>${titleEsc.slice(0, 14)}</span>
            </div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid #121212;margin-top:-1px;"></div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: "custom-map-pin",
        html: pinHtml,
        iconSize: [80, 30],
        iconAnchor: [40, 26],
      });

      // Rich Actionable Popup
      let popupContent = "";
      if (isCandidate) {
        popupContent = `
          <div style="font-family:Archivo,sans-serif;padding:6px;min-width:180px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
              <span style="background:#E65A1E;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:2px;letter-spacing:0.05em;text-transform:uppercase;">
                VERIFIED PRO
              </span>
              ${distStr ? `<span style="font-size:10px;font-weight:800;color:#E65A1E;">⚡ ${distStr}</span>` : ""}
            </div>
            <p style="font-size:13px;font-weight:900;color:#121212;margin:2px 0;">${titleEsc}</p>
            <p style="font-size:11px;color:#555;margin:0 0 6px 0;">${subEsc}</p>
            ${
              ratingStr || rateStr
                ? `<div style="display:flex;gap:8px;font-size:11px;font-weight:800;color:#121212;margin-bottom:8px;border-top:1px dashed #eee;padding-top:4px;">
                    ${ratingStr ? `<span>${ratingStr}</span>` : ""}
                    ${rateStr ? `<span style="color:#E65A1E;">${rateStr}</span>` : ""}
                  </div>`
                : ""
            }
            <div style="display:flex;gap:4px;margin-top:6px;">
              <a href="/pro/${p.id}" style="display:block;width:100%;text-align:center;background:#E65A1E;color:#fff;font-size:10px;font-weight:900;padding:5px 8px;text-decoration:none;border:1.5px solid #121212;box-shadow:1.5px 1.5px 0px #121212;letter-spacing:0.05em;">
                VIEW PROFILE & CHAT →
              </a>
            </div>
          </div>
        `;
      } else if (isJob) {
        popupContent = `
          <div style="font-family:Archivo,sans-serif;padding:6px;min-width:190px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
              <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:2px;letter-spacing:0.05em;text-transform:uppercase;">
                OPEN GIG · ${payStr || "FIXED"}
              </span>
              ${distStr ? `<span style="font-size:10px;font-weight:800;color:#059669;">⚡ ${distStr}</span>` : ""}
            </div>
            <p style="font-size:13px;font-weight:900;color:#121212;margin:2px 0;">${titleEsc}</p>
            <p style="font-size:11px;color:#555;margin:0 0 6px 0;">🏢 ${p.company_name || subEsc}</p>
            <div style="display:flex;gap:4px;margin-top:6px;">
              <a href="/freelancer/jobs" style="display:block;width:100%;text-align:center;background:#059669;color:#fff;font-size:10px;font-weight:900;padding:5px 8px;text-decoration:none;border:1.5px solid #121212;box-shadow:1.5px 1.5px 0px #121212;letter-spacing:0.05em;">
                VIEW GIG & APPLY →
              </a>
            </div>
          </div>
        `;
      } else {
        popupContent = `
          <div style="font-family:Archivo,sans-serif;padding:6px;min-width:180px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
              <span style="background:#121212;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:2px;letter-spacing:0.05em;text-transform:uppercase;">
                HIRING COMPANY
              </span>
              ${distStr ? `<span style="font-size:10px;font-weight:800;color:#121212;">⚡ ${distStr}</span>` : ""}
            </div>
            <p style="font-size:13px;font-weight:900;color:#121212;margin:2px 0;">${titleEsc}</p>
            <p style="font-size:11px;color:#555;margin:0 0 6px 0;">${subEsc}</p>
            <div style="display:flex;gap:4px;margin-top:6px;">
              <a href="/employer" style="display:block;width:100%;text-align:center;background:#121212;color:#fff;font-size:10px;font-weight:900;padding:5px 8px;text-decoration:none;border:1.5px solid #121212;box-shadow:1.5px 1.5px 0px #121212;letter-spacing:0.05em;">
                VIEW OPEN GIGS →
              </a>
            </div>
          </div>
        `;
      }

      const marker = L.marker([p.lat, p.lng], { icon: customIcon })
        .addTo(layer)
        .bindPopup(popupContent);

      marker.on("click", () => {
        if (onSelectPin) onSelectPin(p);
      });

      markersByIdRef.current[p.id] = marker;
    });
  }, [pins, userLocation, selectedPinId, onSelectPin, radiusKm]);

  // Recenter on user
  const handleRecenter = () => {
    if (!mapRef.current) return;
    const target = userLocation || center;
    mapRef.current.flyTo([target.lat, target.lng], userLocation ? 15 : zoom, {
      duration: 1,
    });
  };

  return (
    <div
      className={`relative isolate w-full overflow-hidden rounded border-2 border-ink bg-stone/20 shadow-[4px_4px_0px_#121212] ${className}`}
      style={{ height }}
      data-testid="google-map-container"
    >
      {/* Map Canvas */}
      <div ref={elRef} className="h-full w-full" data-testid="leaflet-map-canvas" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
        {/* Layer Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLayerMenuOpen(!layerMenuOpen)}
            data-testid="map-style-toggle"
            className="flex items-center gap-1.5 border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-black text-ink shadow-[2px_2px_0px_#121212] hover:bg-sand transition"
            title="Switch Map Style"
          >
            <Layers size={14} className="text-brand" />
            <span className="hidden sm:inline">{MAP_LAYERS[activeLayerType]?.name || "Google Map"}</span>
          </button>

          {layerMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-44 border-2 border-ink bg-white p-1 shadow-[3px_3px_0px_#121212] z-[1100] animate-in fade-in">
              <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-inkmuted border-b border-ink/10">
                Map Engine
              </div>
              {Object.entries(MAP_LAYERS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => switchLayer(key)}
                  className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs font-bold transition ${
                    activeLayerType === key ? "bg-brand text-white font-black" : "text-ink hover:bg-sand"
                  }`}
                >
                  <span>{cfg.name}</span>
                  {activeLayerType === key && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Pins Count */}
        <div className="hidden xs:flex items-center gap-1.5 border-2 border-ink bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-ink shadow-[2px_2px_0px_#121212]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
          </span>
          <span>{pins.length} Pins on Map</span>
        </div>
      </div>

      {/* Top-Right Floating Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <button
          onClick={handleRecenter}
          data-testid="map-recenter-btn"
          className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-ink shadow-[2px_2px_0px_#121212] hover:bg-sand transition active:translate-y-0.5"
          title="Center on My Location"
        >
          <LocateFixed size={16} className={userLocation ? "text-brand" : "text-ink"} />
        </button>
      </div>

      {/* Bottom Floating Status Chip */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 border border-ink/40 bg-white/95 px-2 py-0.5 text-[9px] font-black text-ink shadow-sm backdrop-blur-sm">
        <span className="text-brand">⚡ WORKHOP RADAR</span>
        <span>·</span>
        <span>{radiusKm ? `${radiusKm}km Radius` : "Bengaluru"}</span>
      </div>
    </div>
  );
}
