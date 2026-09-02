import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";
import { getEmployerId, useRazorpay } from "@/src/payments";
import CouponInput, { AppliedCoupon } from "@/src/components/CouponInput";

type Pro = {
  id: string; initials: string; skill: string; distance_km: number; rating: number;
  jobs_done: number; name: string; phone?: string; portfolio: string; bucket?: string;
  category?: string; area?: string; rate_hr?: number; intro?: string;
  languages?: string[]; delivery_days?: number; reviews_count?: number;
  external_rating_source?: string; keywords?: string[];
};
type Review = { review_id: string; reviewer_name: string; rating: number; text: string; job_title: string; created_at: string };

export default function ProProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pro, setPro] = useState<Pro | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const { startPayment, checkoutModal } = useRazorpay();

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/pros/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setPro(d.pro);
          setReviews(d.reviews);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    AsyncStorage.getItem("workhop_employer_unlocked")
      .then((v) => {
        if (v === "1") setUnlocked(true);
      })
      .catch(() => {});
  }, [id]);

  const handleUnlock = async () => {
    setPaying(true);
    try {
      const employerId = await getEmployerId();
      const data = await startPayment(
        { product: "employer_unlock", employer_id: employerId, coupon_code: coupon?.code ?? null },
        `Unlock contact of ${pro?.name || "this pro"} · ₹${coupon?.final_amount ?? 199}`,
      );
      if (data?.leads) {
        setUnlocked(true);
        await AsyncStorage.setItem("workhop_employer_unlocked", "1");
        const fresh = (data.leads as Pro[]).find((l) => l.id === id);
        if (fresh) setPro((p) => (p ? { ...p, phone: fresh.phone } : p));
      }
    } catch (e: any) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("unlock err", e);
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} testID="pro-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <Text style={styles.topTitle}>PRO PROFILE</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.black} style={{ marginTop: 60 }} />
      ) : !pro ? (
        <Text style={styles.emptyText}>Profile not found.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero} testID="pro-hero">
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{pro.initials}</Text>
            </View>
            <Text style={styles.name}>{pro.name}</Text>
            <Text style={styles.skill}>{pro.skill}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={11} color={COLORS.white} />
                <Text style={styles.verifiedText}>VERIFIED PRO</Text>
              </View>
              <View style={styles.locPill}>
                <Ionicons name="location" size={11} color={COLORS.black} />
                <Text style={styles.locText}>
                  {pro.area || "Bengaluru"} · {pro.distance_km} km
                </Text>
              </View>
            </View>
            {!!pro.external_rating_source && (
              <View style={styles.importedPill} testID="imported-rating-badge">
                <Ionicons name="swap-horizontal" size={11} color={COLORS.black} />
                <Text style={styles.importedText}>
                  RATING IMPORTED FROM {pro.external_rating_source.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>★ {pro.rating}</Text>
              <Text style={styles.statLabel}>
                {pro.reviews_count ? `${pro.reviews_count} REVIEWS` : "RATING"}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{pro.jobs_done}</Text>
              <Text style={styles.statLabel}>JOBS DONE</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{pro.delivery_days || 3}d</Text>
              <Text style={styles.statLabel}>DELIVERY</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {pro.rate_hr ? `₹${pro.rate_hr}` : "—"}
              </Text>
              <Text style={styles.statLabel}>PER HOUR</Text>
            </View>
          </View>

          {!!pro.intro && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ABOUT THIS PRO</Text>
              <Text style={styles.introText} testID="pro-intro">{pro.intro}</Text>
            </View>
          )}

          {(pro.languages || []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LANGUAGES</Text>
              <View style={styles.kwWrap}>
                {(pro.languages || []).map((l) => (
                  <View key={l} style={styles.kwChip}>
                    <Ionicons name="chatbox-ellipses" size={10} color={COLORS.black} />
                    <Text style={styles.kwText}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact — locked until this lead is unlocked */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT</Text>
            <View style={styles.contactCard} testID="pro-contact-card">
              <View style={styles.contactRow}>
                <Ionicons name="call" size={16} color={COLORS.brand} />
                <View style={styles.contactValueWrap}>
                  <Text style={styles.contactValue}>
                    {unlocked ? pro.phone || "+91 ••••• •••••" : "+91 ••••• •••••"}
                  </Text>
                  {!unlocked && (
                    <BlurView intensity={26} tint="light" style={StyleSheet.absoluteFillObject} />
                  )}
                </View>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="globe" size={16} color={COLORS.brand} />
                <View style={styles.contactValueWrap}>
                  <Text style={styles.contactValue}>
                    {unlocked ? pro.portfolio : "████████████.in"}
                  </Text>
                  {!unlocked && (
                    <BlurView intensity={26} tint="light" style={StyleSheet.absoluteFillObject} />
                  )}
                </View>
              </View>
              {!unlocked && (
                <View style={{ marginTop: 10 }}>
                  <CouponInput
                    product="employer_unlock"
                    amount={199}
                    onApplied={(c) => setCoupon(c)}
                    testIDPrefix="pro-coupon"
                  />
                </View>
              )}
              {!unlocked && (
                <Pressable
                  testID="pro-unlock-btn"
                  onPress={handleUnlock}
                  disabled={paying}
                  style={[styles.unlockBtn, paying && { opacity: 0.7 }]}
                >
                  {paying ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-open" size={15} color={COLORS.white} />
                      <Text style={styles.unlockBtnText}>UNLOCK THIS LEAD · ₹{coupon?.final_amount ?? 199}</Text>
                    </>
                  )}
                </Pressable>
              )}
              {unlocked && (
                <View style={styles.unlockedRow} testID="pro-unlocked-badge">
                  <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                  <Text style={styles.unlockedText}>Contact unlocked — call & hire directly</Text>
                </View>
              )}
            </View>
          </View>

          {(pro.keywords || []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SKILLS & TOOLS</Text>
              <View style={styles.kwWrap}>
                {(pro.keywords || []).slice(0, 8).map((k) => (
                  <View key={k} style={styles.kwChip}>
                    <Text style={styles.kwText}>{k}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REVIEWS ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>
                No WorkHop reviews yet — reviews appear after completed gigs.
              </Text>
            ) : (
              reviews.map((r) => (
                <View key={r.review_id} style={styles.reviewCard}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.reviewName}>{r.reviewer_name}</Text>
                    <Text style={styles.reviewStars}>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </Text>
                  </View>
                  <Text style={styles.reviewJob}>{r.job_title}</Text>
                  {!!r.text && <Text style={styles.reviewText}>{r.text}</Text>}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
      {checkoutModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 2, borderBottomColor: COLORS.black,
  },
  iconBtn: { width: 40, height: 40, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center" },
  topTitle: { fontWeight: "900", fontSize: 15, letterSpacing: 1.5, color: COLORS.black },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  emptyText: { textAlign: "center", marginTop: 60, color: COLORS.onSurfaceMuted },
  hero: { alignItems: "center", gap: SPACING.sm, borderWidth: 2, borderColor: COLORS.black, padding: SPACING.xl, backgroundColor: COLORS.surface },
  avatar: { width: 72, height: 72, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.white, fontWeight: "900", fontSize: 26 },
  name: { fontWeight: "900", fontSize: 20, color: COLORS.black },
  skill: { fontSize: 13, color: COLORS.onSurfaceMuted, textAlign: "center" },
  badgeRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.success, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.black },
  verifiedText: { color: COLORS.white, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  locPill: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: COLORS.black, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  locText: { fontSize: 9, fontWeight: "800", color: COLORS.black },
  importedPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF3C4", borderWidth: 1, borderColor: COLORS.black, paddingHorizontal: SPACING.sm, paddingVertical: 4, marginTop: SPACING.xs },
  importedText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, color: COLORS.black },
  statsRow: { flexDirection: "row", gap: SPACING.sm },
  statBox: { flex: 1, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", paddingVertical: SPACING.md, backgroundColor: COLORS.surface },
  statNum: { fontWeight: "900", fontSize: 14, color: COLORS.black },
  statLabel: { fontSize: 8, letterSpacing: 0.8, color: COLORS.onSurfaceMuted, marginTop: 2, fontWeight: "800" },
  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: 11, letterSpacing: 1.5, fontWeight: "900", color: COLORS.black },
  introText: { fontSize: 13, color: COLORS.black, lineHeight: 20, borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary },
  contactCard: { borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.surface },
  contactRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  contactValueWrap: { flex: 1, overflow: "hidden" },
  contactValue: { fontWeight: "800", fontSize: 14, color: COLORS.black },
  unlockBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.black,
    paddingVertical: SPACING.md, marginTop: SPACING.xs,
  },
  unlockBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  unlockedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.xs },
  unlockedText: { fontSize: 12, fontWeight: "800", color: COLORS.black },
  kwWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  kwChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: COLORS.black, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  kwText: { fontSize: 11, fontWeight: "700", color: COLORS.black },
  noReviews: { fontSize: 12, color: COLORS.onSurfaceMuted },
  reviewCard: { borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, gap: 3, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface },
  reviewHead: { flexDirection: "row", justifyContent: "space-between" },
  reviewName: { fontWeight: "900", fontSize: 13, color: COLORS.black },
  reviewStars: { color: COLORS.brand, fontSize: 13, fontWeight: "900" },
  reviewJob: { fontSize: 10, color: COLORS.brand, fontWeight: "700" },
  reviewText: { fontSize: 12, color: COLORS.black, marginTop: 2 },
});
