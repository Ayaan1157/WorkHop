import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "@/src/theme";
import {
  CATALOG_CATEGORY_NAMES,
  CATEGORY_SHORT_LABELS,
  CATEGORY_VISUALS,
} from "@/src/catalogFilters";

/**
 * Urban-Company-style illustrated category tiles in a single
 * right-to-left scrolling row (icon tile + label under it).
 */
export default function CategoryTiles({
  selected,
  onSelect,
  testIDPrefix = "cat-tile",
}: {
  selected: string;
  onSelect: (key: string) => void;
  testIDPrefix?: string;
}) {
  const keys = ["ALL", ...CATALOG_CATEGORY_NAMES];
  return (
    <View style={styles.wrap} testID={`${testIDPrefix}-row`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {keys.map((key) => {
          const v = CATEGORY_VISUALS[key];
          const active = selected === key;
          return (
            <Pressable
              key={key}
              testID={`${testIDPrefix}-${key.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              onPress={() => onSelect(key)}
              style={styles.tile}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: v?.bg || "#EDEDE4" },
                  active && styles.iconBoxActive,
                ]}
              >
                <Ionicons
                  name={(v?.icon || "grid") as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={active ? COLORS.white : COLORS.black}
                />
              </View>
              <Text
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={2}
              >
                {CATEGORY_SHORT_LABELS[key] || key}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
  },
  content: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  tile: { width: 72, alignItems: "center", gap: 4 },
  iconBox: {
    width: 54,
    height: 54,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: { backgroundColor: COLORS.brand, borderColor: COLORS.black },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.black,
    textAlign: "center",
    lineHeight: 12,
  },
  labelActive: { color: COLORS.brand },
});
