import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "@/src/theme";

export type FilterSection = {
  key: string;
  label: string;
  options: { label: string; value: string }[];
};

/**
 * Bottom-anchored filter sheet with single-select option rows per section.
 * A section with no selected value means "Any".
 */
export default function FilterSheet({
  visible,
  onClose,
  sections,
  values,
  onChange,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  sections: FilterSection[];
  values: Record<string, string | null>;
  onChange: (key: string, value: string | null) => void;
  onReset: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} testID="filter-backdrop" />
        <View style={styles.sheet} testID="filter-sheet">
          <View style={styles.head}>
            <Text style={styles.title}>FILTERS</Text>
            <Pressable testID="filter-reset-btn" onPress={onReset}>
              <Text style={styles.reset}>RESET</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={styles.body}>
            {sections.map((s) => (
              <View key={s.key} style={styles.section}>
                <Text style={styles.sectionLabel}>{s.label}</Text>
                <View style={styles.optWrap}>
                  <Pressable
                    testID={`filter-${s.key}-any`}
                    onPress={() => onChange(s.key, null)}
                    style={[styles.opt, !values[s.key] && styles.optActive]}
                  >
                    <Text style={[styles.optText, !values[s.key] && styles.optTextActive]}>
                      ANY
                    </Text>
                  </Pressable>
                  {s.options.map((o) => {
                    const active = values[s.key] === o.value;
                    return (
                      <Pressable
                        key={o.value}
                        testID={`filter-${s.key}-${o.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                        onPress={() => onChange(s.key, active ? null : o.value)}
                        style={[styles.opt, active && styles.optActive]}
                      >
                        <Text style={[styles.optText, active && styles.optTextActive]}>
                          {o.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <Pressable testID="filter-apply-btn" onPress={onClose} style={styles.applyBtn}>
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
            <Text style={styles.applyText}>SHOW RESULTS</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.5)" },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 3,
    borderTopColor: COLORS.black,
    paddingBottom: SPACING.xl,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  title: { fontWeight: "900", fontSize: 14, letterSpacing: 1.5, color: COLORS.black },
  reset: { fontWeight: "900", fontSize: 11, letterSpacing: 1, color: COLORS.brand },
  body: { padding: SPACING.lg, gap: SPACING.lg },
  section: { gap: SPACING.sm },
  sectionLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: COLORS.onSurfaceMuted },
  optWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  opt: {
    borderWidth: 2, borderColor: COLORS.black,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  optActive: { backgroundColor: COLORS.black },
  optText: { fontWeight: "800", fontSize: 11, color: COLORS.black },
  optTextActive: { color: COLORS.white },
  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: COLORS.brand, marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md, borderWidth: 2, borderColor: COLORS.black,
  },
  applyText: { color: COLORS.white, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
});
