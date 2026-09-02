import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";
import { getEmployerId, useRazorpay } from "@/src/payments";
import CouponInput, { AppliedCoupon } from "@/src/components/CouponInput";

type Plan = {
  plan_id: string;
  section: "postings" | "branding";
  name: string;
  price: number;
  price_label: string;
  unit: string;
  duration_days: number | null;
  badge: string | null;
  features: string[];
};

type Purchase = {
  purchase_id: string;
  plan_id: string;
  plan_name: string;
  section: string;
  price: number;
  purchased_at: string;
  expires_at: string | null;
};

async function loadActivePurchases(): Promise<Purchase[] | null> {
  try {
    const eid = await getEmployerId();
    const r = await fetch(`${BACKEND_URL}/api/employer/${eid}/plans`);
    if (r.ok) return await r.json();
  } catch (e) {
    console.log("purchases err", e);
  }
  return null;
}

export default function EmployerPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const { startPayment, checkoutModal } = useRazorpay();
  const [planCoupon, setPlanCoupon] = useState<AppliedCoupon | null>(null);

  const loadPurchases = useCallback(async () => {
    const data = await loadActivePurchases();
    if (data) setPurchases(data);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND_URL}/api/plans`)
        .then((r) => r.json())
        .then(setPlans)
        .catch((e) => console.log("plans err", e)),
      loadPurchases(),
    ]).finally(() => setLoading(false));
  }, [loadPurchases]);

  const openSheet = (plan: Plan) => {
    setSelected(plan);
    setPlanCoupon(null);
    setPaySuccess(false);
    sheetRef.current?.expand();
  };

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const eid = await getEmployerId();
      const data = await startPayment(
        { product: "plan", plan_id: selected.plan_id, employer_id: eid, coupon_code: planCoupon?.code ?? null },
        `${selected.name} · ${planCoupon?.final_amount != null ? `₹${planCoupon.final_amount}` : selected.price_label}`,
      );
      if (data?.purchase) {
        setPaySuccess(true);
        await loadPurchases();
        setTimeout(() => sheetRef.current?.close(), 1200);
      }
    } catch (e: any) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("purchase err", e);
    } finally {
      setPaying(false);
    }
  };

  const postingPlans = plans.filter((p) => p.section === "postings");
  const brandingPlans = plans.filter((p) => p.section === "branding");

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topBar} testID="plans-topbar">
          <Pressable onPress={() => router.back()} testID="plans-back-btn" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.black} />
          </Pressable>
          <View style={styles.topTitleBlock}>
            <Text style={styles.topTitle}>PLANS & PRICING</Text>
            <Text style={styles.topSub}>Grow your hiring on WorkHop</Text>
          </View>
          <View style={styles.iconBtn}>
            <Ionicons name="pricetag" size={20} color={COLORS.brand} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.black} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {purchases.length > 0 && (
              <View style={styles.activeWrap} testID="active-plans">
                <Text style={styles.sectionKicker}>YOUR ACTIVE PLANS</Text>
                {purchases.map((p) => (
                  <View key={p.purchase_id} style={styles.activeCard} testID={`active-plan-${p.plan_id}`}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activeName}>{p.plan_name}</Text>
                      <Text style={styles.activeMeta}>
                        {p.expires_at
                          ? `Active until ${new Date(p.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                          : "Active — no expiry"}
                      </Text>
                    </View>
                    <Text style={styles.activePrice}>₹{p.price.toLocaleString("en-IN")}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionHead}>
              <View style={styles.sectionTag}>
                <Text style={styles.sectionTagText}>A</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Job Postings & Premium Listings</Text>
                <Text style={styles.sectionSub}>Pay-per-post or bundles</Text>
              </View>
            </View>
            {postingPlans.map((plan) => (
              <PlanCard key={plan.plan_id} plan={plan} onBuy={() => openSheet(plan)} />
            ))}

            <View style={[styles.sectionHead, { marginTop: SPACING.xl }]}>
              <View style={[styles.sectionTag, { backgroundColor: COLORS.black }]}>
                <Text style={styles.sectionTagText}>B</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Employer Branding & Classified Ads</Text>
                <Text style={styles.sectionSub}>Enterprise visibility on the platform</Text>
              </View>
            </View>
            {brandingPlans.map((plan) => (
              <PlanCard key={plan.plan_id} plan={plan} onBuy={() => openSheet(plan)} enterprise />
            ))}

            <Text style={styles.footNote}>🔒 All payments are mocked · No real money is debited</Text>
          </ScrollView>
        )}

        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={["70%"]}
          enablePanDownToClose
          handleIndicatorStyle={styles.sheetHandle}
          backgroundStyle={styles.sheetBg}
          backdropComponent={(p) => (
            <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
          )}
        >
          <BottomSheetView style={styles.sheetInner}>
            {paySuccess ? (
              <View style={styles.successWrap} testID="plan-pay-success">
                <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
                <Text style={styles.successTitle}>Payment successful</Text>
                <Text style={styles.successSub}>{selected?.name} is now active on your account.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sheetKicker}>WORKHOP × RAZORPAY</Text>
                <Text style={styles.sheetTitle}>
                  Pay {planCoupon?.final_amount != null ? `₹${planCoupon.final_amount.toLocaleString("en-IN")}` : selected?.price_label}
                </Text>
                <Text style={styles.sheetSub}>
                  {selected?.name} · {selected?.unit}
                </Text>

                <View style={styles.upiBox}>
                  <Text style={styles.upiLabel}>SECURE CHECKOUT</Text>
                  <Text style={styles.upiValue}>UPI · Cards · Netbanking</Text>
                </View>

                {selected && (
                  <View style={{ marginBottom: 12 }}>
                    <CouponInput
                      key={selected.plan_id}
                      product="plan"
                      amount={selected.price}
                      onApplied={(c) => setPlanCoupon(c)}
                      testIDPrefix="plan-coupon"
                    />
                  </View>
                )}

                <Pressable
                  testID="plan-pay-confirm-btn"
                  disabled={paying}
                  onPress={handlePay}
                  style={({ pressed }) => [
                    styles.payBtn,
                    paying && { opacity: 0.6 },
                    pressed && styles.btnPressed,
                  ]}
                >
                  {paying ? (
                    <>
                      <ActivityIndicator color={COLORS.white} />
                      <Text style={styles.payBtnText}>Waiting for payment…</Text>
                    </>
                  ) : (
                    <Text style={styles.payBtnText}>
                      Pay {planCoupon?.final_amount != null ? `₹${planCoupon.final_amount.toLocaleString("en-IN")}` : selected?.price_label} with Razorpay
                    </Text>
                  )}
                </Pressable>

                <Text style={styles.sheetFootnote}>
                  🔒 Razorpay Test Mode · Test card 4111 1111 1111 1111
                </Text>
              </>
            )}
          </BottomSheetView>
        </BottomSheet>
      </SafeAreaView>
      {checkoutModal}
    </GestureHandlerRootView>
  );
}

function PlanCard({
  plan,
  onBuy,
  enterprise,
}: {
  plan: Plan;
  onBuy: () => void;
  enterprise?: boolean;
}) {
  return (
    <View
      style={[styles.planCard, enterprise && styles.planCardEnterprise]}
      testID={`plan-card-${plan.plan_id}`}
    >
      <View style={styles.planHead}>
        <Text style={[styles.planName, enterprise && { color: COLORS.white }]}>{plan.name}</Text>
        {plan.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.priceRow}>
        <Text style={[styles.planPrice, enterprise && { color: COLORS.brand }]}>
          {plan.price_label}
        </Text>
        <Text style={[styles.planUnit, enterprise && { color: "#BDBDBD" }]}>/ {plan.unit}</Text>
      </View>
      <View style={styles.featureList}>
        {plan.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons
              name="checkmark"
              size={14}
              color={enterprise ? COLORS.brand : COLORS.success}
            />
            <Text style={[styles.featureText, enterprise && { color: "#D6D6D6" }]}>{f}</Text>
          </View>
        ))}
      </View>
      <Pressable
        testID={`plan-buy-${plan.plan_id}`}
        onPress={onBuy}
        style={({ pressed }) => [
          styles.buyBtn,
          enterprise && styles.buyBtnEnterprise,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={styles.buyBtnText}>Buy {plan.price_label}</Text>
        <Ionicons name="arrow-forward" size={15} color={COLORS.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    gap: SPACING.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleBlock: { flex: 1 },
  topTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 1.5, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2 },

  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  activeWrap: { gap: SPACING.sm, marginBottom: SPACING.md },
  sectionKicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    color: COLORS.onSurfaceMuted,
    marginBottom: 2,
  },
  activeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.success,
    backgroundColor: "#E5F8EE",
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  activeName: { fontWeight: "900", fontSize: 13, color: COLORS.black },
  activeMeta: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 1 },
  activePrice: { fontWeight: "900", fontSize: 13, color: COLORS.black },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sectionTag: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTagText: { color: COLORS.white, fontWeight: "900", fontSize: 15 },
  sectionTitle: { fontWeight: "900", fontSize: 16, color: COLORS.black, letterSpacing: -0.2 },
  sectionSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 1 },

  planCard: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.sm,
    gap: SPACING.md,
  },
  planCardEnterprise: { backgroundColor: COLORS.black },
  planHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { fontWeight: "900", fontSize: 16, color: COLORS.black, flex: 1, marginRight: SPACING.sm },
  badge: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
  planPrice: { fontSize: 30, fontWeight: "900", color: COLORS.black, letterSpacing: -0.5 },
  planUnit: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 5, fontWeight: "600" },
  featureList: { gap: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  featureText: { fontSize: 12, color: COLORS.black, flex: 1 },
  buyBtn: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  buyBtnEnterprise: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  buyBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  btnPressed: { opacity: 0.85 },

  footNote: {
    fontSize: 11,
    color: COLORS.onSurfaceMuted,
    textAlign: "center",
    marginTop: SPACING.md,
  },

  sheetBg: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 0,
  },
  sheetHandle: { backgroundColor: COLORS.black, width: 48, height: 4 },
  sheetInner: { padding: SPACING.xl, gap: SPACING.md },
  sheetKicker: { fontSize: 10, letterSpacing: 1.5, color: COLORS.onSurfaceMuted, fontWeight: "800" },
  sheetTitle: { fontSize: 36, fontWeight: "900", color: COLORS.black, letterSpacing: -0.5 },
  sheetSub: { fontSize: 13, color: COLORS.onSurfaceMuted, marginTop: -SPACING.sm },
  methodsRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  methodChip: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  methodChipActive: { backgroundColor: COLORS.brand },
  methodText: { fontWeight: "900", fontSize: 11, letterSpacing: 1, color: COLORS.black },
  methodTextActive: { color: COLORS.white },
  upiBox: {
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
  },
  upiLabel: { fontSize: 10, letterSpacing: 1, fontWeight: "800", color: COLORS.onSurfaceMuted },
  upiValue: { fontSize: 16, fontWeight: "900", color: COLORS.black, marginTop: 4 },
  payBtn: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    marginTop: SPACING.sm,
  },
  payBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
  sheetFootnote: { fontSize: 11, color: COLORS.onSurfaceMuted, textAlign: "center" },

  successWrap: { alignItems: "center", paddingVertical: SPACING.xxl, gap: SPACING.md },
  successTitle: { fontSize: 22, fontWeight: "900", color: COLORS.black },
  successSub: { fontSize: 13, color: COLORS.onSurfaceMuted, textAlign: "center" },
});
