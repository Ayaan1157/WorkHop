import { useEffect, useState } from "react";
import {
  FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";
import { CATEGORY_VISUALS } from "@/src/catalogFilters";

type CatalogCat = { category: string; icon: string; subcategories: string[] };

/**
 * Full-screen drill-down search: tap the search bar → 9 main categories →
 * tap one → its subcategories → tap to apply. Free-text search supported
 * from the input at the top.
 */
export default function CategoryBrowser({
  visible,
  onClose,
  onPickCategory,
  onPickTerm,
  placeholder = "Search services…",
}: {
  visible: boolean;
  onClose: () => void;
  onPickCategory: (category: string) => void;
  onPickTerm: (term: string) => void;
  placeholder?: string;
}) {
  const [catalog, setCatalog] = useState<CatalogCat[]>([]);
  const [activeCat, setActiveCat] = useState<CatalogCat | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/catalog`)
      .then((r) => r.json())
      .then((d) => setCatalog(d || []))
      .catch(() => {});
  }, []);

  const reset = () => {
    setActiveCat(null);
    setQuery("");
  };

  const submitText = () => {
    if (!query.trim()) return;
    onPickTerm(query.trim());
    reset();
    onClose();
  };

  const q = query.trim().toLowerCase();
  const matchingSubs = q
    ? catalog.flatMap((c) =>
        c.subcategories
          .filter((s) => s.toLowerCase().includes(q))
          .map((s) => ({ cat: c.category, sub: s })),
      ).slice(0, 12)
    : [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            testID="browser-back-btn"
            onPress={() => {
              if (activeCat) setActiveCat(null);
              else {
                reset();
                onClose();
              }
            }}
            style={styles.iconBtn}
          >
            <Ionicons name={activeCat ? "chevron-back" : "close"} size={22} color={COLORS.black} />
          </Pressable>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={COLORS.onSurfaceMuted} />
            <TextInput
              testID="browser-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={COLORS.onSurfaceMuted}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={submitText}
              autoFocus
            />
            {query.length > 0 && (
              <Pressable testID="browser-clear-btn" onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color={COLORS.onSurfaceMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {q.length > 1 ? (
          <FlatList
            data={matchingSubs}
            keyExtractor={(i) => `${i.cat}-${i.sub}`}
            ListHeaderComponent={
              <Pressable testID="browser-search-all" onPress={submitText} style={styles.row}>
                <Ionicons name="search" size={18} color={COLORS.brand} />
                <Text style={styles.rowText}>Search “{query.trim()}”</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.black} />
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                testID={`browser-suggest-${item.sub.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                onPress={() => {
                  onPickTerm(item.sub);
                  reset();
                  onClose();
                }}
                style={styles.row}
              >
                <Ionicons
                  name={(CATEGORY_VISUALS[item.cat]?.icon || "grid") as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={COLORS.black}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{item.sub}</Text>
                  <Text style={styles.rowSub}>{item.cat}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceMuted} />
              </Pressable>
            )}
          />
        ) : activeCat ? (
          <FlatList
            data={activeCat.subcategories}
            keyExtractor={(s) => s}
            ListHeaderComponent={
              <Pressable
                testID="browser-pick-whole-category"
                onPress={() => {
                  onPickCategory(activeCat.category);
                  reset();
                  onClose();
                }}
                style={[styles.row, styles.rowHighlight]}
              >
                <Ionicons
                  name={(CATEGORY_VISUALS[activeCat.category]?.icon || "grid") as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={COLORS.white}
                />
                <Text style={[styles.rowText, { color: COLORS.white }]}>
                  All of {activeCat.category}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                testID={`browser-sub-${item.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                onPress={() => {
                  onPickTerm(item);
                  reset();
                  onClose();
                }}
                style={styles.row}
              >
                <Text style={[styles.rowText, { flex: 1 }]}>{item}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceMuted} />
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={catalog}
            keyExtractor={(c) => c.category}
            ListHeaderComponent={
              <Text style={styles.listTitle}>BROWSE ALL CATEGORIES</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                testID={`browser-cat-${item.category.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                onPress={() => setActiveCat(item)}
                style={styles.row}
              >
                <View
                  style={[
                    styles.rowIconBox,
                    { backgroundColor: CATEGORY_VISUALS[item.category]?.bg || "#EDEDE4" },
                  ]}
                >
                  <Ionicons
                    name={(CATEGORY_VISUALS[item.category]?.icon || "grid") as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={COLORS.black}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{item.category}</Text>
                  <Text style={styles.rowSub}>
                    {item.subcategories.length} services
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceMuted} />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  iconBtn: {
    width: 44, height: 44, borderWidth: 2, borderColor: COLORS.black,
    alignItems: "center", justifyContent: "center",
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.md,
    height: 44, backgroundColor: COLORS.surfaceSecondary,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.black },
  listTitle: {
    fontSize: 11, fontWeight: "900", letterSpacing: 1.5, color: COLORS.onSurfaceMuted,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: "#E3E3DB", minHeight: 56,
  },
  rowHighlight: { backgroundColor: COLORS.black },
  rowIconBox: {
    width: 40, height: 40, borderWidth: 2, borderColor: COLORS.black,
    alignItems: "center", justifyContent: "center",
  },
  rowText: { fontSize: 14, fontWeight: "800", color: COLORS.black },
  rowSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 1 },
});
