import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";

type Cat = { category: string; icon: string; subcategories: string[] };

export default function Categories() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Cat[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/catalog`)
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const goSearch = (term: string) => {
    router.push({ pathname: "/freelancer/jobs", params: { q: term } });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} testID="categories-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>ALL CATEGORIES</Text>
          <Text style={styles.topSub}>
            {catalog.length} categories · {catalog.reduce((n, c) => n + c.subcategories.length, 0)} services
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.black} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {catalog.map((c) => {
            const expanded = open === c.category;
            return (
              <View key={c.category} style={styles.catCard}>
                <Pressable
                  testID={`cat-${c.category.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  onPress={() => setOpen(expanded ? null : c.category)}
                  style={styles.catHead}
                >
                  <View style={styles.catIcon}>
                    <Ionicons name={c.icon as any} size={18} color={COLORS.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catTitle}>{c.category}</Text>
                    <Text style={styles.catCount}>{c.subcategories.length} services</Text>
                  </View>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.black} />
                </Pressable>
                {expanded && (
                  <View style={styles.subWrap}>
                    {c.subcategories.map((s) => (
                      <Pressable
                        key={s}
                        testID={`sub-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                        onPress={() => goSearch(s)}
                        style={({ pressed }) => [styles.subChip, pressed && { backgroundColor: COLORS.brand }]}
                      >
                        <Text style={styles.subText}>{s}</Text>
                        <Ionicons name="arrow-forward" size={11} color={COLORS.onSurfaceMuted} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          <Text style={styles.footnote}>Tap any service to search matching gigs in Bengaluru</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 2, borderBottomColor: COLORS.black,
  },
  iconBtn: { width: 40, height: 40, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center" },
  topTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 1.5, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  catCard: { borderWidth: 2, borderColor: COLORS.black, backgroundColor: COLORS.surface },
  catHead: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md },
  catIcon: { width: 40, height: 40, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center" },
  catTitle: { fontWeight: "900", fontSize: 15, color: COLORS.black },
  catCount: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 1 },
  subWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, padding: SPACING.md, paddingTop: 0 },
  subChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: COLORS.black, paddingHorizontal: SPACING.sm, paddingVertical: 6,
    backgroundColor: COLORS.surfaceSecondary,
  },
  subText: { fontSize: 12, fontWeight: "700", color: COLORS.black },
  footnote: { textAlign: "center", fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: SPACING.sm },
});
