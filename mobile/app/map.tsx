import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import OSMMap, { MapPin } from "@/src/components/OSMMap";
import { useUserLocation } from "@/src/useUserLocation";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";

type Filter = "all" | "candidate" | "employer";

export default function LiveMap() {
  const router = useRouter();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.5946 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const { coords, status, requestLocation } = useUserLocation();

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/map/pins`)
      .then((r) => r.json())
      .then((d) => {
        setPins([...d.candidates, ...d.employers]);
        if (d.center) setCenter(d.center);
      })
      .catch((e) => console.log("pins err", e))
      .finally(() => setLoading(false));
  }, []);

  const visible = pins.filter((p) => filter === "all" || p.kind === filter);
  const counts = {
    candidate: pins.filter((p) => p.kind === "candidate").length,
    employer: pins.filter((p) => p.kind === "employer").length,
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar} testID="map-topbar">
        <Pressable onPress={() => router.back()} testID="map-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>
            {coords ? "LIVE MAP · NEAR YOU" : "LIVE MAP · BENGALURU"}
          </Text>
          <Text style={styles.topSub}>
            {counts.candidate} pros · {counts.employer} hiring companies
          </Text>
        </View>
        <Pressable
          testID="map-locate-btn"
          onPress={requestLocation}
          style={[styles.iconBtn, coords && styles.locateBtnOn]}
        >
          {status === "locating" ? (
            <ActivityIndicator size="small" color={coords ? COLORS.white : COLORS.black} />
          ) : (
            <Ionicons
              name="locate"
              size={20}
              color={coords ? COLORS.white : COLORS.black}
            />
          )}
        </Pressable>
      </View>

      {status === "idle" && !coords && (
        <Pressable
          testID="map-locate-banner"
          onPress={requestLocation}
          style={styles.locateBanner}
        >
          <Ionicons name="navigate" size={14} color={COLORS.white} />
          <Text style={styles.locateBannerText}>
            Use my location to find the closest pros & gigs
          </Text>
          <Text style={styles.locateBannerCta}>ENABLE</Text>
        </Pressable>
      )}
      {(status === "denied" || status === "blocked") && (
        <View style={styles.locateBanner} testID="map-locate-denied">
          <Ionicons name="alert-circle" size={14} color={COLORS.white} />
          <Text style={styles.locateBannerText}>
            {status === "blocked"
              ? "Location is off for WorkHop. Enable it in Settings."
              : "Location permission needed to center the map on you."}
          </Text>
          <Pressable
            testID="map-locate-retry"
            onPress={() =>
              status === "blocked" ? Linking.openSettings() : requestLocation()
            }
          >
            <Text style={styles.locateBannerCta}>
              {status === "blocked" ? "OPEN SETTINGS" : "RETRY"}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.filterRow} testID="map-filter-row">
        {(
          [
            { key: "all", label: "ALL" },
            { key: "candidate", label: "🟠 PROS" },
            { key: "employer", label: "⬛ EMPLOYERS" },
          ] as { key: Filter; label: string }[]
        ).map((f) => (
          <Pressable
            key={f.key}
            testID={`map-filter-${f.key}`}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.black} style={{ marginTop: 60 }} />
      ) : (
        <View style={styles.mapWrap} testID="live-map">
          <OSMMap pins={visible} center={center} zoom={13} height="100%" userLocation={coords} />
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.brand }]} />
          <Text style={styles.legendText}>Verified pros</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.black }]} />
          <Text style={styles.legendText}>Hiring employers</Text>
        </View>
        <Text style={styles.legendHint}>Tap a pin for details</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontWeight: "900", fontSize: 15, letterSpacing: 1.2, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2 },
  locateBtnOn: { backgroundColor: COLORS.brand, borderColor: COLORS.black },
  locateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  locateBannerText: { flex: 1, color: COLORS.white, fontSize: 11, fontWeight: "700" },
  locateBannerCta: {
    color: COLORS.brand,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  filterChip: {
    flexShrink: 0,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.brand },
  filterText: { fontWeight: "900", fontSize: 11, letterSpacing: 0.5, color: COLORS.black },
  filterTextActive: { color: COLORS.white },
  mapWrap: { flex: 1, borderBottomWidth: 2, borderColor: COLORS.black },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderWidth: 2, borderColor: COLORS.black, borderRadius: 6 },
  legendText: { fontSize: 11, fontWeight: "700", color: COLORS.black },
  legendHint: { fontSize: 10, color: COLORS.onSurfaceMuted, marginLeft: "auto" },
});
