import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";

export type AppliedCoupon = {
  code: string;
  description: string;
  discount_amount?: number;
  final_amount?: number;
};

/**
 * "Apply coupon" row for any payment window.
 * Validates against POST /api/coupons/validate and reports the applied
 * code upward so the checkout can pass coupon_code to create-order.
 */
export default function CouponInput({
  product,
  amount,
  onApplied,
  testIDPrefix = "coupon",
}: {
  product: string;
  amount?: number; // rupees — enables discount preview
  onApplied: (coupon: AppliedCoupon | null) => void;
  testIDPrefix?: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);

  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), product, amount: amount ?? null }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.detail || "Invalid coupon.");
        return;
      }
      const c: AppliedCoupon = {
        code: data.code,
        description: data.description,
        discount_amount: data.discount_amount,
        final_amount: data.final_amount,
      };
      setApplied(c);
      onApplied(c);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    setApplied(null);
    setCode("");
    setError(null);
    onApplied(null);
  };

  if (applied) {
    return (
      <View style={styles.appliedRow} testID={`${testIDPrefix}-applied`}>
        <Ionicons name="pricetag" size={14} color={COLORS.success} />
        <Text style={styles.appliedText} numberOfLines={2}>
          <Text style={{ fontWeight: "900" }}>{applied.code}</Text> applied
          {applied.discount_amount != null
            ? ` · you save ₹${applied.discount_amount} — pay ₹${applied.final_amount}`
            : ` · ${applied.description}`}
        </Text>
        <Pressable testID={`${testIDPrefix}-remove-btn`} onPress={remove} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={COLORS.black} />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <Ionicons name="pricetag-outline" size={14} color={COLORS.onSurfaceMuted} />
          <TextInput
            testID={`${testIDPrefix}-input`}
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setError(null);
            }}
            placeholder="Have a coupon code?"
            placeholderTextColor={COLORS.onSurfaceMuted}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
        <Pressable
          testID={`${testIDPrefix}-apply-btn`}
          onPress={apply}
          disabled={busy || !code.trim()}
          style={[styles.applyBtn, (!code.trim() || busy) && { opacity: 0.5 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.applyText}>APPLY</Text>
          )}
        </Pressable>
      </View>
      {error && (
        <Text style={styles.error} testID={`${testIDPrefix}-error`}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: SPACING.sm },
  inputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.md,
    height: 42, backgroundColor: COLORS.surfaceSecondary,
  },
  input: { flex: 1, fontSize: 13, fontWeight: "700", color: COLORS.black },
  applyBtn: {
    backgroundColor: COLORS.black, paddingHorizontal: SPACING.md,
    alignItems: "center", justifyContent: "center", height: 42,
  },
  applyText: { color: COLORS.white, fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  appliedRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.success, backgroundColor: "#E5F7E0",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  appliedText: { flex: 1, fontSize: 12, color: COLORS.black },
  error: { color: "#C62828", fontSize: 11, fontWeight: "700", marginTop: 4 },
});
