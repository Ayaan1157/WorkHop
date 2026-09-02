import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";
import { LEAD_CATEGORY_FILTERS } from "@/src/catalogFilters";
import CategoryTiles from "@/src/components/CategoryTiles";
import CategoryBrowser from "@/src/components/CategoryBrowser";
import FilterSheet, { FilterSection } from "@/src/components/FilterSheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getEmployerId, useRazorpay } from "@/src/payments";
import CouponInput, { AppliedCoupon } from "@/src/components/CouponInput";
import OSMMap, { MapPin } from "@/src/components/OSMMap";
import { distanceKm, useUserLocation } from "@/src/useUserLocation";

const LEAD_FILTER_SECTIONS: FilterSection[] = [
  {
    key: "budget",
    label: "BUDGET (₹ / HOUR)",
    options: [
      { label: "UNDER ₹500", value: "0-500" },
      { label: "₹500 – 1000", value: "500-1000" },
      { label: "₹1000+", value: "1000-" },
    ],
  },
  {
    key: "dist",
    label: "LOCATION (DISTANCE)",
    options: [
      { label: "≤ 2 KM", value: "2" },
      { label: "≤ 5 KM", value: "5" },
      { label: "≤ 10 KM", value: "10" },
    ],
  },
  {
    key: "lang",
    label: "LANGUAGE THE PRO SPEAKS",
    options: [
      { label: "ENGLISH", value: "English" },
      { label: "HINDI", value: "Hindi" },
      { label: "KANNADA", value: "Kannada" },
      { label: "TAMIL", value: "Tamil" },
      { label: "TELUGU", value: "Telugu" },
    ],
  },
  {
    key: "delivery",
    label: "DELIVERY TIME",
    options: [
      { label: "≤ 1 DAY", value: "1" },
      { label: "≤ 3 DAYS", value: "3" },
      { label: "≤ 7 DAYS", value: "7" },
    ],
  },
];

type Lead = {
  id: string;
  initials: string;
  skill: string;
  distance_km: number;
  rating: number;
  jobs_done: number;
  name: string;
  phone: string;
  portfolio: string;
  bucket?: string;
  category?: string;
  area?: string;
  rate_hr?: number;
  intro?: string;
  languages?: string[];
  delivery_days?: number;
  reviews_count?: number;
  external_rating_source?: string;
  lat?: number;
  lng?: number;
  keywords?: string[];
};

export default function EmployerMap() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [browserOpen, setBrowserOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | null>>({
    budget: null,
    dist: null,
    lang: null,
    delivery: null,
  });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const sheetRef = useRef<BottomSheet>(null);
  const { startPayment, checkoutModal } = useRazorpay();
  const [unlockCoupon, setUnlockCoupon] = useState<AppliedCoupon | null>(null);
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  // Unlock persists across sessions.
  useEffect(() => {
    AsyncStorage.getItem("workhop_employer_unlocked")
      .then((v) => {
        if (v === "1") setUnlocked(true);
      })
      .catch(() => {});
  }, []);

  const searchTerm = search.trim().toLowerCase();
  const activeFilter = LEAD_CATEGORY_FILTERS.find((f) => f.key === catFilter);
  const passesLeadFilters = (l: Lead) => {
    if (filters.budget) {
      const [minS, maxS] = filters.budget.split("-");
      const min = Number(minS || 0);
      const max = maxS ? Number(maxS) : Infinity;
      const rate = l.rate_hr || 0;
      if (rate < min || rate > max) return false;
    }
    if (filters.dist && l.distance_km > Number(filters.dist)) return false;
    if (filters.lang && !(l.languages || []).includes(filters.lang)) return false;
    if (filters.delivery && (l.delivery_days || 3) > Number(filters.delivery)) return false;
    return true;
  };
  const baseLeads = leads.filter((l) => {
    if (
      catFilter !== "ALL" &&
      activeFilter &&
      !activeFilter.cats.includes(l.skill) &&
      l.category !== catFilter
    )
      return false;
    if (!passesLeadFilters(l)) return false;
    if (!searchTerm) return true;
    return (
      l.skill.toLowerCase().includes(searchTerm) ||
      l.name.toLowerCase().includes(searchTerm) ||
      l.portfolio.toLowerCase().includes(searchTerm) ||
      (l.keywords || []).some((k) => k.toLowerCase().includes(searchTerm))
    );
  });

  // With device location: recompute real distances and rank nearest-first.
  const filteredLeads = coords
    ? baseLeads
        .map((l) =>
          l.lat && l.lng
            ? {
                ...l,
                distance_km:
                  Math.round(
                    distanceKm(coords, { lat: l.lat, lng: l.lng }) * 10,
                  ) / 10,
              }
            : l,
        )
        .sort((a, b) => a.distance_km - b.distance_km)
    : baseLeads;

  const mapPins: MapPin[] = filteredLeads
    .filter((l) => l.lat && l.lng)
    .map((l) => ({
      id: l.id,
      kind: "candidate" as const,
      title: l.name,
      subtitle: `${l.skill} · ${l.distance_km} km away`,
      lat: l.lat as number,
      lng: l.lng as number,
    }));

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/leads/preview`)
      .then((r) => r.json())
      .then((data) => setLeads(data))
      .catch((e) => console.log("leads err", e))
      .finally(() => setLoading(false));
  }, []);

  const openSheet = () => sheetRef.current?.expand();
  const closeSheet = () => sheetRef.current?.close();

  const handlePay = async () => {
    setPaying(true);
    try {
      const employerId = await getEmployerId();
      const data = await startPayment(
        { product: "employer_unlock", employer_id: employerId, coupon_code: unlockCoupon?.code ?? null },
        `Unlock verified local leads · ₹${unlockCoupon?.final_amount ?? 199}`,
      );
      if (data?.leads) {
        setLeads(data.leads);
        setUnlocked(true);
        AsyncStorage.setItem("workhop_employer_unlocked", "1").catch(() => {});
        setTimeout(() => closeSheet(), 700);
      }
    } catch (e: any) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("pay err", e);
    } finally {
      setPaying(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topBar} testID="employer-topbar">
          <Pressable onPress={() => router.back()} testID="employer-back-btn" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.black} />
          </Pressable>
          <View style={styles.topTitleBlock}>
            <Text style={styles.topTitle}>NEARBY EXPERTS</Text>
            <Text style={styles.topSub}>Bengaluru · live map · 2km radius</Text>
          </View>
          <Pressable
            onPress={() => router.push("/employer/inbox")}
            testID="employer-inbox-btn"
            style={styles.iconBtn}
          >
            <Ionicons name="chatbubbles" size={18} color={COLORS.black} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/employer/plans")}
            testID="employer-plans-btn"
            style={styles.iconBtn}
          >
            <Ionicons name="pricetag" size={20} color={COLORS.brand} />
          </Pressable>
        </View>

        {/* Live OpenStreetMap with candidate pins */}
        <View style={styles.mapWrap} testID="employer-map">
          <OSMMap pins={mapPins} zoom={12} height={180} userLocation={coords} />
          <Pressable
            testID="leads-near-me-btn"
            onPress={requestLocation}
            style={[styles.nearMeBtn, coords && styles.nearMeBtnOn]}
          >
            {locStatus === "locating" ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="locate" size={14} color={COLORS.white} />
            )}
            <Text style={styles.mapExpandText}>
              {coords ? "NEAR YOU" : "NEAR ME"}
            </Text>
          </Pressable>
          <Pressable
            testID="map-expand-btn"
            onPress={() => router.push("/map")}
            style={styles.mapExpandBtn}
          >
            <Ionicons name="expand" size={14} color={COLORS.white} />
            <Text style={styles.mapExpandText}>FULL MAP</Text>
          </Pressable>
        </View>

        {/* Skill search — find the right pro fast */}
        <View style={styles.postJobRow}>
          <Pressable
            testID="post-job-btn"
            onPress={() => router.push("/employer/post-job")}
            style={({ pressed }) => [styles.postJobBtn, pressed && styles.btnPressed]}
          >
            <Ionicons name="add-circle" size={16} color={COLORS.white} />
            <Text style={styles.postJobText}>POST A JOB · FROM ₹299</Text>
          </Pressable>
        </View>

        {/* Tappable search bar → category browser + FILTERS */}
        <View style={styles.searchRow}>
          <Pressable
            style={styles.searchWrap}
            testID="leads-search-wrap"
            onPress={() => setBrowserOpen(true)}
          >
            <Ionicons name="search" size={16} color={COLORS.onSurfaceMuted} />
            <Text
              style={[styles.searchInput, !search && { color: COLORS.onSurfaceMuted }]}
              numberOfLines={1}
            >
              {search || "Search pros — logo, shopify, gst, reels…"}
            </Text>
            {search.length > 0 && (
              <Pressable
                testID="leads-search-clear-btn"
                onPress={() => setSearch("")}
                style={styles.searchClear}
              >
                <Ionicons name="close" size={14} color={COLORS.white} />
              </Pressable>
            )}
          </Pressable>
          <Pressable
            testID="leads-filter-btn"
            onPress={() => setFiltersOpen(true)}
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnOn]}
          >
            <Ionicons
              name="options"
              size={18}
              color={activeFilterCount > 0 ? COLORS.white : COLORS.black}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Illustrated category tiles — horizontal scroll */}
        <CategoryTiles
          selected={catFilter}
          onSelect={setCatFilter}
          testIDPrefix="lead-cat-tile"
        />

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.black} style={{ marginTop: 40 }} />
          ) : (
            <>
              {filteredLeads.length === 0 && (
                <View style={styles.emptyWrap} testID="leads-empty">
                  <Ionicons name="search" size={26} color={COLORS.black} />
                  <Text style={styles.emptyTitle}>No pros match &quot;{search.trim()}&quot;</Text>
                  <Text style={styles.emptySub}>Try a different skill keyword.</Text>
                </View>
              )}

              {filteredLeads.slice(0, 2).map((lead, idx) => (
                <LeadCard key={lead.id} lead={lead} unlocked={unlocked} index={idx} onPress={() => router.push(`/pro/${lead.id}`)} />
              ))}

              {!unlocked && filteredLeads.length > 0 && (
                <View style={styles.bannerWrap} testID="unlock-banner">
                  <View style={styles.bannerCorner} />
                  <Text style={styles.bannerTitle}>
                    Unlock the Closest 5{"\n"}Verified Experts on Your Block.
                  </Text>
                  <Text style={styles.bannerSub}>
                    Phone numbers instantly revealed — call & hire directly.
                  </Text>
                  <Pressable
                    testID="unlock-cta-btn"
                    onPress={openSheet}
                    style={({ pressed }) => [
                      styles.unlockBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.unlockBtnText}>
                      Unlock 5 Local Leads  •  ₹199
                    </Text>
                    <Ionicons name="lock-open" size={16} color={COLORS.white} />
                  </Pressable>
                </View>
              )}

              {unlocked && (
                <View style={styles.unlockedBadge} testID="unlocked-badge">
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.unlockedText}>
                    Payment verified · All 5 leads unlocked
                  </Text>
                </View>
              )}

              {filteredLeads.slice(2).map((lead, idx) => (
                <LeadCard key={lead.id} lead={lead} unlocked={unlocked} index={idx + 2} onPress={() => router.push(`/pro/${lead.id}`)} />
              ))}

              <Pressable
                testID="plans-banner"
                onPress={() => router.push("/employer/plans")}
                style={({ pressed }) => [styles.plansBanner, pressed && styles.btnPressed]}
              >
                <View style={styles.plansBannerPill}>
                  <Text style={styles.plansBannerPillText}>FOR EMPLOYERS</Text>
                </View>
                <Text style={styles.plansBannerTitle}>
                  Post jobs. Boost listings.{"\n"}Brand your company.
                </Text>
                <Text style={styles.plansBannerSub}>
                  Job posts from ₹299 · Enterprise branding & classified ads.
                </Text>
                <View style={styles.plansBannerCta}>
                  <Text style={styles.plansBannerCtaText}>VIEW PLANS & PRICING</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                </View>
              </Pressable>
            </>
          )}
        </ScrollView>

        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={["68%"]}
          enablePanDownToClose
          handleIndicatorStyle={styles.sheetHandle}
          backgroundStyle={styles.sheetBg}
          backdropComponent={(p) => (
            <BottomSheetBackdrop
              {...p}
              appearsOnIndex={0}
              disappearsOnIndex={-1}
              opacity={0.55}
            />
          )}
        >
          <BottomSheetView style={styles.sheetInner}>
            <Text style={styles.sheetKicker}>WORKHOP × RAZORPAY</Text>
            <Text style={styles.sheetTitle}>Pay ₹{unlockCoupon?.final_amount ?? 199}</Text>
            <Text style={styles.sheetSub}>
              One-time unlock for verified leads in your radius.
            </Text>

            <View style={styles.upiBox}>
              <Text style={styles.upiLabel}>SECURE CHECKOUT</Text>
              <Text style={styles.upiValue}>UPI · Cards · Netbanking</Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <CouponInput
                product="employer_unlock"
                amount={199}
                onApplied={(c) => setUnlockCoupon(c)}
                testIDPrefix="unlock-coupon"
              />
            </View>

            <Pressable
              testID="pay-confirm-btn"
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
                <Text style={styles.payBtnText}>Pay ₹{unlockCoupon?.final_amount ?? 199} with Razorpay</Text>
              )}
            </Pressable>

            <Text style={styles.sheetFootnote}>
              🔒 Razorpay Test Mode · Test card 4111 1111 1111 1111
            </Text>
          </BottomSheetView>
        </BottomSheet>
      </SafeAreaView>
      {checkoutModal}
      <CategoryBrowser
        visible={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onPickCategory={(cat) => {
          setCatFilter(cat);
          setSearch("");
        }}
        onPickTerm={(term) => {
          setSearch(term);
          setCatFilter("ALL");
        }}
        placeholder="Search pros — logo, shopify, reels…"
      />
      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sections={LEAD_FILTER_SECTIONS}
        values={filters}
        onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
        onReset={() =>
          setFilters({ budget: null, dist: null, lang: null, delivery: null })
        }
      />
    </GestureHandlerRootView>
  );
}

function LeadCard({
  lead,
  unlocked,
  index,
  onPress,
}: {
  lead: Lead;
  unlocked: boolean;
  index: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.leadCard, pressed && { opacity: 0.9 }]}
      testID={`lead-card-${index}`}
    >
      <View style={styles.leadHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{lead.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.leadNameRow}>
            <Text style={styles.leadNameVisible} testID={`lead-name-${index}`}>
              {lead.name}
            </Text>
          </View>
          <Text style={styles.leadSkill}>{lead.skill}</Text>
        </View>
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={11} color={COLORS.black} />
          <Text style={styles.ratingText}>
            {lead.rating}
            {lead.reviews_count ? ` (${lead.reviews_count})` : ""}
          </Text>
        </View>
      </View>

      {!!lead.intro && (
        <Text style={styles.leadIntro} numberOfLines={2} testID={`lead-intro-${index}`}>
          {lead.intro}
        </Text>
      )}

      <View style={styles.leadDivider} />

      {/* Decision info — visible BEFORE unlock */}
      <View style={styles.leadStatsRow} testID={`lead-stats-${index}`}>
        <View style={styles.leadStat}>
          <Ionicons name="location" size={12} color={COLORS.onSurfaceMuted} />
          <Text style={styles.leadStatText}>
            {lead.area || "Bengaluru"} · {lead.distance_km} km
          </Text>
        </View>
        <View style={styles.leadStat}>
          <Ionicons name="cash" size={12} color={COLORS.onSurfaceMuted} />
          <Text style={styles.leadStatText}>
            {lead.rate_hr ? `₹${lead.rate_hr}/hr` : "Rate on chat"}
          </Text>
        </View>
        <View style={styles.leadStat}>
          <Ionicons name="time" size={12} color={COLORS.onSurfaceMuted} />
          <Text style={styles.leadStatText}>
            {lead.delivery_days || 3}d delivery
          </Text>
        </View>
        <View style={styles.leadStat}>
          <Ionicons name="checkmark-done" size={12} color={COLORS.onSurfaceMuted} />
          <Text style={styles.leadStatText}>{lead.jobs_done} jobs</Text>
        </View>
      </View>

      {/* Contact — locked until unlock */}
      <View style={styles.leadFields}>
        <BlurrableRow
          icon="call"
          label="PHONE"
          value={unlocked ? lead.phone : "+91 ••••• •••••"}
          unlocked={unlocked}
          testID={`lead-phone-${index}`}
        />
        <BlurrableRow
          icon="link"
          label="PORTFOLIO / WEBSITE"
          value={unlocked ? lead.portfolio : "████████████.in"}
          unlocked={unlocked}
          testID={`lead-portfolio-${index}`}
        />
      </View>

      <View style={styles.leadFooter}>
        <Text style={styles.jobsTxt}>VIEW FULL PROFILE →</Text>
        {unlocked ? (
          <View style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>CONTACT</Text>
          </View>
        ) : (
          <View style={styles.lockedTag}>
            <Ionicons name="lock-closed" size={11} color={COLORS.white} />
            <Text style={styles.lockedTagText}>LOCKED</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function BlurrableRow({
  icon,
  label,
  value,
  unlocked,
  testID,
}: {
  icon: any;
  label: string;
  value: string;
  unlocked: boolean;
  testID: string;
}) {
  return (
    <View style={styles.fieldRow} testID={testID}>
      <Ionicons name={icon} size={14} color={COLORS.onSurfaceMuted} />
      <View style={styles.fieldTextWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
        {!unlocked && (
          <BlurView
            intensity={26}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>
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

  mapWrap: {
    height: 180,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    backgroundColor: COLORS.surfaceSecondary,
  },
  listScroll: { flex: 1 },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
  },
  postJobRow: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  postJobBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingVertical: SPACING.md,
  },
  postJobText: { color: COLORS.white, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
    fontWeight: "600",
    paddingVertical: 0,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  searchClear: {
    width: 22,
    height: 22,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: { fontWeight: "900", fontSize: 15, color: COLORS.black, textAlign: "center" },
  emptySub: { fontSize: 12, color: COLORS.onSurfaceMuted },

  mapExpandBtn: {
    position: "absolute",
    right: SPACING.md,
    bottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.black,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  mapExpandText: { color: COLORS.white, fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  nearMeBtn: {
    position: "absolute",
    left: SPACING.md,
    bottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.black,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  nearMeBtnOn: { backgroundColor: COLORS.brand },
  chipRowWrap: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.md,
  },
  chipRowContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: "center",
  },
  chip: {
    flexShrink: 0,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.black },
  chipText: { fontWeight: "900", fontSize: 11, letterSpacing: 0.5, color: COLORS.black },
  chipTextActive: { color: COLORS.white },

  leadCard: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  leadHead: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  avatarText: { color: COLORS.white, fontWeight: "900", letterSpacing: 1 },
  leadNameRow: { position: "relative", overflow: "hidden" },
  leadNameVisible: { fontWeight: "900", fontSize: 15, color: COLORS.black },
  leadSkill: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  ratingText: { fontSize: 11, fontWeight: "900" },
  leadDivider: { height: 1, backgroundColor: COLORS.black, marginVertical: SPACING.md, opacity: 0.15 },
  leadIntro: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.sm, lineHeight: 17 },
  leadStatsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.sm },
  leadStat: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1.5, borderColor: "#E3E3DB",
    paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: COLORS.surfaceSecondary,
  },
  leadStatText: { fontSize: 10, fontWeight: "800", color: COLORS.black },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  filterBtn: {
    width: 44, height: 44, borderWidth: 2, borderColor: COLORS.black,
    alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface,
  },
  filterBtnOn: { backgroundColor: COLORS.black },
  filterCount: {
    position: "absolute", top: -6, right: -6,
    backgroundColor: COLORS.brand, borderWidth: 1.5, borderColor: COLORS.black,
    width: 16, height: 16, alignItems: "center", justifyContent: "center",
  },
  filterCountText: { color: COLORS.white, fontSize: 9, fontWeight: "900" },
  leadFields: { gap: SPACING.sm },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  fieldTextWrap: { flex: 1, position: "relative", overflow: "hidden" },
  fieldLabel: { fontSize: 9, letterSpacing: 1.2, color: COLORS.onSurfaceMuted, fontWeight: "700" },
  fieldValue: { fontSize: 13, color: COLORS.black, fontWeight: "600", marginTop: 1 },
  leadFooter: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jobsTxt: { fontSize: 11, color: COLORS.onSurfaceMuted },
  lockedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  lockedTagText: { color: COLORS.white, fontSize: 10, letterSpacing: 1.2, fontWeight: "900" },
  contactBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  contactBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 11, letterSpacing: 1.2 },

  bannerWrap: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    gap: SPACING.md,
    position: "relative",
  },
  bannerCorner: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 32,
    height: 32,
    backgroundColor: COLORS.brand,
  },
  bannerTitle: { fontSize: 20, fontWeight: "900", color: COLORS.black, lineHeight: 24, marginTop: SPACING.sm },
  bannerSub: { fontSize: 12, color: COLORS.onSurfaceMuted },
  unlockBtn: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
    marginTop: SPACING.xs,
  },
  unlockBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
  btnPressed: { opacity: 0.85 },

  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: "#E5F8EE",
    borderWidth: 2,
    borderColor: COLORS.success,
    padding: SPACING.md,
  },
  unlockedText: { fontWeight: "800", color: COLORS.black, fontSize: 12, letterSpacing: 0.5 },

  plansBanner: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  plansBannerPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  plansBannerPillText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  plansBannerTitle: { fontSize: 20, fontWeight: "900", color: COLORS.white, lineHeight: 24 },
  plansBannerSub: { fontSize: 12, color: "#D6D6D6" },
  plansBannerCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.brand,
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.brand,
  },
  plansBannerCtaText: { color: COLORS.white, fontWeight: "900", fontSize: 13, letterSpacing: 1 },

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
});
