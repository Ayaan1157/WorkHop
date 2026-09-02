import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export type MapPin = {
  id: string;
  kind: "candidate" | "employer";
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
};

function buildHtml(
  pins: MapPin[],
  center: { lat: number; lng: number },
  zoom: number,
  interactive: boolean,
  userLocation?: { lat: number; lng: number } | null,
): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: #F9F9F6; }
  .leaflet-popup-content-wrapper { border: 2px solid #111; border-radius: 4px; box-shadow: none; }
  .leaflet-popup-content { margin: 10px 12px; font-family: -apple-system, sans-serif; }
  .pin-title { font-weight: 800; font-size: 13px; color: #111; }
  .pin-sub { font-size: 11px; color: #666; margin-top: 2px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: ${interactive},
    dragging: ${interactive},
    scrollWheelZoom: ${interactive},
    touchZoom: ${interactive},
    doubleClickZoom: ${interactive},
    attributionControl: true
  }).setView([${center.lat}, ${center.lng}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var pins = ${JSON.stringify(pins)};
  pins.forEach(function (p) {
    var color = p.kind === 'candidate' ? '#FF5A00' : '#111111';
    var marker = L.circleMarker([p.lat, p.lng], {
      radius: 9, color: '#111111', weight: 2,
      fillColor: color, fillOpacity: 1
    }).addTo(map);
    marker.bindPopup('<div class="pin-title">' + p.title + '</div><div class="pin-sub">' + p.subtitle + '</div>');
  });
  var you = ${JSON.stringify(userLocation || null)};
  if (you) {
    L.circleMarker([you.lat, you.lng], {
      radius: 8, color: '#FFFFFF', weight: 3,
      fillColor: '#1A73E8', fillOpacity: 1
    }).addTo(map).bindPopup('<div class="pin-title">You are here</div>');
  }
</script>
</body>
</html>`;
}

export default function OSMMap({
  pins,
  center = { lat: 12.9716, lng: 77.5946 },
  zoom = 13,
  height = 200,
  interactive = true,
  userLocation = null,
}: {
  pins: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number | "100%";
  interactive?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const html = buildHtml(pins, userLocation || center, zoom, interactive, userLocation);

  if (Platform.OS === "web") {
    const { unstable_createElement } = require("react-native-web");
    return unstable_createElement("iframe", {
      srcDoc: html,
      style: { border: 0, width: "100%", height, display: "block" },
      title: "WorkHop map",
    });
  }

  return (
    <View style={[styles.wrap, { height: height === "100%" ? undefined : height, flex: height === "100%" ? 1 : undefined }]}>
      <WebView
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "#F9F9F6" },
});
