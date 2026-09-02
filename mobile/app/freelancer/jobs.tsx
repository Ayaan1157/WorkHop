import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";
import { JOB_CATEGORY_FILTERS as CATEGORY_FILTERS } from "@/src/catalogFilters";
import CategoryTiles from "@/src/components/CategoryTiles";
import CategoryBrowser from "@/src/components/CategoryBrowser";
import FilterSheet, { FilterSection } from "@/src/components/FilterSheet";
import { useRazorpay } from "@/src/payments";
import CouponInput, { AppliedCoupon } from "@/src/components/CouponInput";
import { useAuth } from "@/src/auth";

const JOB_FILTER_SECTIONS: FilterSection[] = [
  {
    key: "budget",
    label: "BUDGET (GIG PAY)",
    options: [
      { label: "UNDER ₹1K", value: "0-1000" },
      { label: "₹1K – 5K", value: "1000-5000" },
      { label: "₹5K – 20K", value: "5000-20000" },
      { label: "₹20K+", value: "20000-" },
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
];

type Job = {
  id: string;
  title: string;
  category: string;
  bucket: string;
  pay: number;
  pay_label: string;
  distance_km: number;
  posted_minutes_ago: number;
  company_name: string;
  area: string;
  description: string;
  keywords?: string[];
};

type Quota = {
  freelancer_id: string;
  quota_used: number;
  quota_limit: number;
  has_boost: boolean;
  boost_until: string | null;
  applied_job_ids: string[];
};

type FreelancerStatus = {
  freelancer_id: string;
  status: string;
  paid: boolean;
  aadhaar_verified: boolean;
  is_verified: boolean;
};

// Category filters are shared with employer screens — see src/catalogFilters.ts

export default function JobsFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<FreelancerStatus | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [freelancerId, setFreelancerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catFilter, setCatFilter] = useState("ALL");
  const [browserOpen, setBrowserOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | null>>({
    budget: null,
    dist: null,
  });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const [subcats, setSubcats] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const { q } = useLocalSearchParams<{ q?: string }>();
  useEffect(() => {
    if (q) setSearch(String(q));
  }, [q]);
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/catalog`)
      .then((r) => r.json())
      .then((cats: { category: string; subcategories: string[] }[]) => {
        const m: Record<string, string[]> = {};
        (cats || []).forEach((c) => {
          m[c.category] = c.subcategories;
        });
        setSubcats(m);
      })
      .catch(() => {});
  }, []);

  // Apply sheet state
  const applySheetRef = useRef<BottomSheet>(null);
  const paywallSheetRef = useRef<BottomSheet>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [applyNote, setApplyNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [appliedJustNow, setAppliedJustNow] = useState<string | null>(null);
  const [convByJob, setConvByJob] = useState<Record<string, string>>({});
  const [lastConvId, setLastConvId] = useState<string | null>(null);

  // Paywall state
  const [unlocking, setUnlocking] = useState(false);
  const { startPayment, checkoutModal } = useRazorpay();
  const [boostCoupon, setBoostCoupon] = useState<AppliedCoupon | null>(null);

  const load = useCallback(async () => {
    try {
      const fid = await AsyncStorage.getItem("workhop_freelancer_id");
      setFreelancerId(fid);
      const qs = fid ? `?freelancer_id=${fid}` : "";
      const [jobsRes, statusRes, quotaRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/jobs${qs}`).then((r) => r.json()),
        fid
          ? fetch(`${BACKEND_URL}/api/freelancer/${fid}`).then((r) =>
              r.ok ? r.json() : null,
            )
          : Promise.resolve(null),
        fid
          ? fetch(`${BACKEND_URL}/api/freelancer/${fid}/quota`).then((r) =>
              r.ok ? r.json() : null,
            )
          : Promise.resolve(null),
      ]);
      setJobs(jobsRes || []);
      setStatus(statusRes);
      setQuota(quotaRes);
      if (fid) {
        fetch(`${BACKEND_URL}/api/chats?freelancer_id=${fid}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((chats: { job_id: string; conversation_id: string }[]) => {
            const m: Record<string, string> = {};
            chats.forEach((c) => {
              m[c.job_id] = c.conversation_id;
            });
            setConvByJob(m);
          })
          .catch(() => {});
      }
    } catch (e) {
      console.log("jobs load err", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isVerified = !!status?.is_verified;
  const searchTerm = search.trim().toLowerCase();
  const activeFilter = CATEGORY_FILTERS.find((f) => f.key === catFilter);
  const allSubcatNames = new Set(
    Object.values(subcats).flat().map((s) => s.toLowerCase()),
  );
  const inCategory = (j: Job) =>
    catFilter === "ALL" || !activeFilter || activeFilter.cats.includes(j.category);
  const passesFilters = (j: Job) => {
    if (filters.budget) {
      const [minS, maxS] = filters.budget.split("-");
      const min = Number(minS || 0);
      const max = maxS ? Number(maxS) : Infinity;
      if (j.pay < min || j.pay > max) return false;
    }
    if (filters.dist && j.distance_km > Number(filters.dist)) return false;
    return true;
  };
  const matchesText = (j: Job, term: string) =>
    j.title.toLowerCase().includes(term) ||
    j.category.toLowerCase().includes(term) ||
    j.description.toLowerCase().includes(term) ||
    j.company_name.toLowerCase().includes(term) ||
    (j.keywords || []).some((k) => k.toLowerCase().includes(term));
  let filteredJobs = jobs.filter(
    (j) => inCategory(j) && passesFilters(j) && (!searchTerm || matchesText(j, searchTerm)),
  );
  if (searchTerm && filteredJobs.length === 0) {
    // Relaxed fallback: match any significant word (helps subcategory taps
    // like "Logo Design" find "logo" gigs).
    const words = searchTerm.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      filteredJobs = jobs.filter(
        (j) => inCategory(j) && passesFilters(j) && words.some((w) => matchesText(j, w)),
      );
    }
  }
  const appliedSet = new Set(quota?.applied_job_ids || []);
  const quotaUsed = quota?.quota_used ?? 0;
  const quotaLimit = quota?.quota_limit ?? 3;
  const hasBoost = !!quota?.has_boost;
  const quotaExhausted = quotaUsed >= quotaLimit;

  // APPLY for a signed-out browser: send them to Google sign-in first,
  // then (once signed in) to the verification wizard.
  const gotoVerify = async () => {
    if (!user) {
      await AsyncStorage.setItem("workhop_auth_intent", "freelancer").catch(() => {});
      router.push("/");
      return;
    }
    router.push("/freelancer");
  };

  const openApplyFor = (job: Job) => {
    if (!isVerified) {
      gotoVerify();
      return;
    }
    if (appliedSet.has(job.id)) return;
    if (quotaExhausted) {
      setActiveJob(job);
      paywallSheetRef.current?.expand();
      return;
    }
    setActiveJob(job);
    setApplyNote("");
    setApplyError(null);
    applySheetRef.current?.expand();
  };

  const submitApply = async () => {
    if (!activeJob || !freelancerId) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/jobs/${activeJob.id}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            freelancer_id: freelancerId,
            note: applyNote,
          }),
        },
      );
      const data = await res.json();
      if (res.status === 402) {
        // quota exhausted — swap sheets
        applySheetRef.current?.close();
        setTimeout(() => paywallSheetRef.current?.expand(), 280);
        return;
      }
      if (!res.ok) {
        setApplyError(data?.detail || "Failed to apply.");
        return;
      }
      setAppliedJustNow(activeJob.id);
      if (data.conversation_id) {
        setConvByJob((m) => ({ ...m, [activeJob.id]: data.conversation_id }));
        setLastConvId(data.conversation_id);
      }
      setQuota((q) =>
        q
          ? {
              ...q,
              quota_used: data.quota_used,
              quota_limit: data.quota_limit,
              has_boost: data.has_boost,
              applied_job_ids: [...q.applied_job_ids, activeJob.id],
            }
          : q,
      );
      setTimeout(() => {
        applySheetRef.current?.close();
        setAppliedJustNow(null);
      }, 1100);
    } catch (e) {
      setApplyError("Network error. Please retry.");
    } finally {
      setApplying(false);
    }
  };

  const submitUnlock = async () => {
    if (!freelancerId) return;
    setUnlocking(true);
    try {
      const data = await startPayment(
        { product: "quota_boost", freelancer_id: freelancerId, coupon_code: boostCoupon?.code ?? null },
        `+5 applies boost · ₹${boostCoupon?.final_amount ?? 149}`,
      );
      if (data?.has_boost) {
        setQuota((q) =>
          q
            ? {
                ...q,
                has_boost: true,
                boost_until: data.boost_until,
                quota_limit: data.quota_limit,
              }
            : q,
        );
        setTimeout(() => {
          paywallSheetRef.current?.close();
          // re-open apply sheet so the pro can finish the apply they tried
          if (activeJob) {
            setApplyNote("");
            setApplyError(null);
            setTimeout(() => applySheetRef.current?.expand(), 240);
          }
        }, 600);
      }
    } catch (e: any) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("unlock err", e);
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.replace("/")}
            testID="jobs-back-btn"
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.black} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle} numberOfLines={1} adjustsFontSizeToFit>
              JOBS NEAR YOU
            </Text>
            <Text style={styles.topSub} numberOfLines={1}>
              {loading
                ? "Loading…"
                : `${jobs.length} active gigs · 2km radius`}
            </Text>
          </View>
          <Pressable
            testID="jobs-categories-btn"
            onPress={() => router.push("/categories")}
            style={styles.topIconBtn}
          >
            <Ionicons name="grid" size={17} color={COLORS.black} />
          </Pressable>
          <Pressable
            testID="jobs-map-btn"
            onPress={() => router.push("/map")}
            style={styles.topIconBtn}
          >
            <Ionicons name="map" size={18} color={COLORS.black} />
          </Pressable>
          <Pressable
            testID="jobs-chats-btn"
            onPress={() => router.push("/freelancer/chats")}
            style={styles.topIconBtn}
          >
            <Ionicons name="chatbubbles" size={18} color={COLORS.brand} />
          </Pressable>
          <View
            style={[
              styles.verifyBadge,
              isVerified ? styles.verifyBadgeOn : styles.verifyBadgeOff,
            ]}
            testID="verify-status-badge"
          >
            <Ionicons
              name={isVerified ? "shield-checkmark" : "shield-half"}
              size={14}
              color={COLORS.white}
            />
            <Text style={styles.verifyBadgeText}>
              {isVerified ? "VERIFIED" : "UNVERIFIED"}
            </Text>
          </View>
        </View>

        {isVerified && quota && (
          <View style={styles.quotaBar} testID="quota-bar">
            <View style={styles.quotaLeft}>
              <Ionicons
                name={hasBoost ? "rocket" : "flash"}
                size={14}
                color={COLORS.black}
              />
              <Text style={styles.quotaText}>
                {hasBoost
                  ? `${Math.max(quotaLimit - quotaUsed, 0)} of ${quotaLimit} APPLIES LEFT · BOOST ON`
                  : `${Math.max(quotaLimit - quotaUsed, 0)} of ${quotaLimit} FREE APPLIES LEFT`}
              </Text>
            </View>
            {!hasBoost && (
              <Pressable
                testID="quota-upgrade-btn"
                onPress={() => paywallSheetRef.current?.expand()}
                style={styles.quotaUpgradeBtn}
              >
                <Text style={styles.quotaUpgradeText}>+5 APPLIES ₹149</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Tappable search bar → opens category drill-down browser + FILTERS */}
        <View style={styles.searchRow}>
          <Pressable
            style={styles.searchWrap}
            testID="search-wrap"
            onPress={() => setBrowserOpen(true)}
          >
            <Ionicons name="search" size={16} color={COLORS.onSurfaceMuted} />
            <Text
              style={[styles.searchInput, !search && { color: COLORS.onSurfaceMuted }]}
              numberOfLines={1}
            >
              {search || "Search services… e.g. Logo Design"}
            </Text>
            {search.length > 0 && (
              <Pressable
                testID="search-clear-btn"
                onPress={() => setSearch("")}
                hitSlop={8}
                style={styles.searchClear}
              >
                <Ionicons name="close" size={14} color={COLORS.white} />
              </Pressable>
            )}
          </Pressable>
          <Pressable
            testID="jobs-filter-btn"
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
          onSelect={(key) => {
            setCatFilter(key);
            if (allSubcatNames.has(search.trim().toLowerCase())) setSearch("");
          }}
          testIDPrefix="jobs-cat-tile"
        />

        {!isVerified && (
          <View style={styles.unverifiedBanner} testID="unverified-banner">
            <View style={styles.bannerLeft}>
              <Ionicons name="lock-closed" size={18} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {user ? "Browse freely — verify to apply" : "Browse freely — sign in to apply"}
              </Text>
              <Text style={styles.bannerSub}>
                {user
                  ? "Tap APPLY on any gig to start the one-time ₹99 Verified Pro onboarding (profile + email OTP) and chat with employers."
                  : "Tap APPLY on any gig to sign in with Google, then complete the one-time ₹99 Verified Pro onboarding."}
              </Text>
            </View>
            <Pressable
              testID="banner-verify-cta"
              onPress={gotoVerify}
              style={styles.bannerCta}
            >
              <Text style={styles.bannerCtaText}>
                {!user ? "SIGN IN" : freelancerId ? "RESUME" : "VERIFY"}
              </Text>
            </Pressable>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.black} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={COLORS.black}
              />
            }
          >
            {filteredJobs.length === 0 ? (
              <View style={styles.emptyWrap} testID="empty-state">
                <View style={styles.emptyIconBox}>
                  <Ionicons name="search" size={28} color={COLORS.black} />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchTerm
                    ? `No matches for "${search.trim()}"`
                    : "No gigs in this category"}
                </Text>
                <Text style={styles.emptySub}>
                  {searchTerm
                    ? "Try a different keyword or clear the search."
                    : "Pull to refresh or pick a different category above."}
                </Text>
              </View>
            ) : (
              filteredJobs.map((job, idx) => (
                <JobCard
                  key={job.id}
                  job={job}
                  index={idx}
                  verified={isVerified}
                  applied={appliedSet.has(job.id)}
                  onApply={() => openApplyFor(job)}
                  onMessage={() => {
                    const cid = convByJob[job.id];
                    if (cid) router.push(`/chat/${cid}?role=freelancer`);
                    else router.push("/freelancer/chats");
                  }}
                  onVerifyPress={gotoVerify}
                />
              ))
            )}
            <View style={{ height: SPACING.xxxl }} />
          </ScrollView>
        )}

        {/* Apply Sheet */}
        <BottomSheet
          ref={applySheetRef}
          index={-1}
          snapPoints={["62%"]}
          enablePanDownToClose
          keyboardBehavior="interactive"
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
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <Text style={styles.sheetKicker}>APPLY TO GIG</Text>
              <Text style={styles.sheetTitle} numberOfLines={2}>
                {activeJob?.title}
              </Text>
              <View style={styles.sheetMetaRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>{activeJob?.pay_label}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>
                    {activeJob?.distance_km} km
                  </Text>
                </View>
              </View>
              <Text style={styles.sheetLabel}>NOTE TO EMPLOYER (OPTIONAL)</Text>
              <TextInput
                testID="apply-note-input"
                value={applyNote}
                onChangeText={setApplyNote}
                placeholder="I can be there in 30 min. Rate is fine."
                placeholderTextColor="#9A9A9A"
                multiline
                numberOfLines={3}
                style={styles.sheetTextarea}
                maxLength={300}
              />
              {applyError && (
                <Text style={styles.errorText} testID="apply-error">
                  {applyError}
                </Text>
              )}
              {appliedJustNow ? (
                <View>
                  <View style={styles.appliedFlash} testID="apply-success-flash">
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                    <Text style={styles.appliedFlashText}>
                      APPLIED · Chat thread opened
                    </Text>
                  </View>
                  {lastConvId && (
                    <Pressable
                      testID="apply-open-chat-btn"
                      onPress={() => {
                        applySheetRef.current?.close();
                        setAppliedJustNow(null);
                        router.push(`/chat/${lastConvId}?role=freelancer`);
                      }}
                      style={styles.openChatBtn}
                    >
                      <Ionicons name="chatbubbles" size={14} color={COLORS.black} />
                      <Text style={styles.openChatBtnText}>MESSAGE EMPLOYER NOW</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  testID="apply-confirm-btn"
                  disabled={applying}
                  onPress={submitApply}
                  style={[styles.confirmBtn, applying && { opacity: 0.6 }]}
                >
                  {applying ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.confirmBtnText}>Send application</Text>
                  )}
                </Pressable>
              )}
              <Text style={styles.sheetFootnote}>
                Employer sees your verified badge, rating & note. A private chat
                opens the moment you apply.
              </Text>
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>

        {/* Paywall Sheet */}
        <BottomSheet
          ref={paywallSheetRef}
          index={-1}
          snapPoints={["58%"]}
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
            {hasBoost ? (
              <>
                <View style={styles.paywallBadge}>
                  <Ionicons name="rocket" size={12} color={COLORS.white} />
                  <Text style={styles.paywallBadgeText}>DAILY LIMIT</Text>
                </View>
                <Text style={styles.sheetTitle}>
                  You&apos;ve hit today&apos;s{"\n"}max of {quotaLimit} applies.
                </Text>
                <Text style={styles.sheetSub}>
                  Your boost is active but the daily cap is reached. Applies reset within 24 hours — come back tomorrow.
                </Text>
                <Pressable
                  testID="paywall-close-btn"
                  onPress={() => paywallSheetRef.current?.close()}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmBtnText}>Got it</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.paywallBadge}>
                  <Ionicons name="flash" size={12} color={COLORS.white} />
                  <Text style={styles.paywallBadgeText}>QUOTA HIT</Text>
                </View>
                <Text style={styles.sheetTitle}>You&apos;ve used your{"\n"}3 free applies today.</Text>
                <Text style={styles.sheetSub}>
                  Add 5 more applies for the next 24 hours and stop missing gigs in your block.
                </Text>

                <View style={styles.paywallPriceCard}>
                  <View>
                    <Text style={styles.priceKicker}>+5 APPLIES BOOST</Text>
                    <Text style={styles.priceBig}>₹149</Text>
                    <Text style={styles.priceMicro}>One-time. No subscription.</Text>
                  </View>
                  <View style={styles.paywallList}>
                    <Row text="5 extra job applies today" />
                    <Row text="Valid for 24 hours" />
                    <Row text="Max 8 applies per day total" />
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <CouponInput
                    product="quota_boost"
                    amount={149}
                    onApplied={(c) => setBoostCoupon(c)}
                    testIDPrefix="boost-coupon"
                  />
                </View>

                <Pressable
                  testID="paywall-pay-btn"
                  disabled={unlocking}
                  onPress={submitUnlock}
                  style={[styles.confirmBtn, unlocking && { opacity: 0.6 }]}
                >
                  {unlocking ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.confirmBtnText}>Pay ₹{boostCoupon?.final_amount ?? 149} securely</Text>
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
        placeholder="Search services… e.g. Logo Design"
      />
      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sections={JOB_FILTER_SECTIONS}
        values={filters}
        onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
        onReset={() => setFilters({ budget: null, dist: null })}
      />
    </GestureHandlerRootView>
  );
}

function Row({ text }: { text: string }) {
  return (
    <View style={styles.rowItem}>
      <Ionicons name="checkmark" size={14} color={COLORS.brand} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

function JobCard({
  job,
  index,
  verified,
  applied,
  onApply,
  onMessage,
  onVerifyPress,
}: {
  job: Job;
  index: number;
  verified: boolean;
  applied: boolean;
  onApply: () => void;
  onMessage: () => void;
  onVerifyPress: () => void;
}) {
  return (
    <View style={styles.jobCard} testID={`job-card-${index}`}>
      <View style={styles.jobHead}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>
            {job.category.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.timeText}>
          {job.posted_minutes_ago < 60
            ? `${job.posted_minutes_ago} min ago`
            : `${Math.round(job.posted_minutes_ago / 60)}h ago`}
        </Text>
      </View>

      <Text style={styles.jobTitle}>{job.title}</Text>
      <Text style={styles.jobDesc} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons name="cash" size={12} color={COLORS.black} />
          <Text style={styles.metaPillText}>{job.pay_label}</Text>
        </View>
        <View style={styles.metaPill}>
          <Ionicons name="location" size={12} color={COLORS.black} />
          <Text style={styles.metaPillText}>{job.distance_km} km</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.employerRow}>
        <View style={styles.employerInfo}>
          <Text style={styles.employerLabel}>COMPANY</Text>
          <Text style={styles.employerName}>{job.company_name}</Text>
          <View style={styles.areaWrap} testID={`job-area-${index}`}>
            <Ionicons name="location" size={12} color={COLORS.onSurfaceMuted} />
            <Text style={styles.areaText}>{job.area} · Bengaluru</Text>
          </View>
        </View>
        {applied ? (
          <Pressable
            style={styles.messageBtn}
            onPress={onMessage}
            testID={`job-message-btn-${index}`}
          >
            <Ionicons name="chatbubbles" size={13} color={COLORS.black} />
            <Text style={styles.messageBtnText}>MESSAGE</Text>
          </Pressable>
        ) : verified ? (
          <Pressable
            style={styles.applyBtn}
            onPress={onApply}
            testID={`job-apply-btn-${index}`}
          >
            <Ionicons name="paper-plane" size={13} color={COLORS.white} />
            <Text style={styles.applyBtnText}>APPLY</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.applyBtn}
            onPress={onVerifyPress}
            testID={`job-verify-cta-${index}`}
          >
            <Ionicons name="paper-plane" size={13} color={COLORS.white} />
            <Text style={styles.applyBtnText}>APPLY</Text>
          </Pressable>
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
  topTitle: { fontWeight: "900", fontSize: 14, letterSpacing: 1.4, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2 },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  verifyBadgeOn: { backgroundColor: COLORS.success },
  verifyBadgeOff: { backgroundColor: COLORS.black },
  verifyBadgeText: { color: COLORS.white, fontWeight: "900", fontSize: 10, letterSpacing: 1 },

  quotaBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.brand,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    gap: SPACING.md,
  },
  quotaLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  quotaText: { color: COLORS.black, fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  quotaUpgradeBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  quotaUpgradeText: { color: COLORS.white, fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },

  // ---- Search bar (sticky chrome, above chip row) ----
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surfaceSecondary,
  },
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

  // ---- Filter chip row (horizontal-only sticky chrome) ----
  chipRowWrap: {
    height: 56,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
  },
  chipRowContent: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
  },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  chipActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.black,
  },
  // ---- Search row + filter button ----
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    backgroundColor: COLORS.surface,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  filterBtnOn: { backgroundColor: COLORS.black },
  filterCount: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: COLORS.brand,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: { color: COLORS.white, fontSize: 9, fontWeight: "900" },
  chipTextActive: { color: COLORS.white },

  // ---- Subcategory chip row (below the category row) ----
  subChipRowWrap: {
    height: 46,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: "center",
  },
  subChip: {
    flexShrink: 0,
    height: 30,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.black,
  },
  subChipActive: {
    backgroundColor: COLORS.black,
    borderColor: COLORS.black,
  },
  subChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.black,
  },
  subChipTextActive: { color: COLORS.white },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceSecondary,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: COLORS.black, letterSpacing: -0.2 },
  emptySub: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center" },

  unverifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.black,
    padding: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  bannerLeft: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  bannerTitle: { color: COLORS.white, fontWeight: "900", fontSize: 13, letterSpacing: 0.3 },
  bannerSub: { color: "#D6D6D6", fontSize: 11, marginTop: 2, lineHeight: 15 },
  bannerCta: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  bannerCtaText: { color: COLORS.white, fontWeight: "900", fontSize: 11, letterSpacing: 1 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: SPACING.lg, gap: SPACING.md },

  jobCard: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  jobHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryChip: { backgroundColor: COLORS.brand, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  categoryChipText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  timeText: { fontSize: 11, color: COLORS.onSurfaceMuted },
  jobTitle: { fontSize: 16, fontWeight: "900", color: COLORS.black, letterSpacing: -0.2, lineHeight: 20 },
  jobDesc: { fontSize: 12, color: COLORS.onSurfaceMuted, lineHeight: 16 },
  metaRow: { flexDirection: "row", gap: SPACING.sm, marginTop: 2 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  metaPillText: { fontSize: 11, fontWeight: "800", color: COLORS.black },
  divider: { height: 1, backgroundColor: COLORS.black, opacity: 0.15, marginVertical: SPACING.sm },
  employerRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  employerInfo: { flex: 1, gap: 2 },
  employerLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: COLORS.onSurfaceMuted },
  employerName: { fontSize: 13, fontWeight: "900", color: COLORS.black },
  areaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  areaText: { fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceMuted },
  topIconBtn: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  messageBtnText: { color: COLORS.black, fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  openChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  openChatBtnText: { color: COLORS.black, fontWeight: "900", fontSize: 12, letterSpacing: 1 },

  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  applyBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  appliedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  appliedTagText: { color: COLORS.white, fontWeight: "900", fontSize: 11, letterSpacing: 1 },

  // Sheets
  sheetBg: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 0,
  },
  sheetHandle: { backgroundColor: COLORS.black, width: 48, height: 4 },
  sheetInner: { padding: SPACING.xl, gap: SPACING.md },
  sheetKicker: { fontSize: 10, letterSpacing: 1.5, color: COLORS.onSurfaceMuted, fontWeight: "800" },
  sheetTitle: { fontSize: 26, fontWeight: "900", color: COLORS.black, letterSpacing: -0.5, lineHeight: 30 },
  sheetSub: { fontSize: 13, color: COLORS.onSurfaceMuted, marginTop: -SPACING.xs },
  sheetMetaRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs },
  sheetLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.onSurfaceMuted,
    marginTop: SPACING.sm,
  },
  sheetTextarea: {
    borderWidth: 2,
    borderColor: COLORS.black,
    minHeight: 80,
    padding: SPACING.md,
    fontSize: 13,
    color: COLORS.black,
    textAlignVertical: "top",
    backgroundColor: COLORS.surfaceSecondary,
  },
  errorText: { color: COLORS.error, fontSize: 12, fontWeight: "700" },
  confirmBtn: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  confirmBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
  sheetFootnote: { fontSize: 11, color: COLORS.onSurfaceMuted, textAlign: "center", marginTop: SPACING.xs },
  appliedFlash: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    marginTop: SPACING.sm,
  },
  appliedFlashText: { color: COLORS.white, fontWeight: "900", fontSize: 14, letterSpacing: 0.8 },

  // Paywall
  paywallBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  paywallBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  paywallPriceCard: {
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceSecondary,
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  priceKicker: { fontSize: 10, letterSpacing: 1.4, fontWeight: "800", color: COLORS.onSurfaceMuted },
  priceBig: { fontSize: 36, fontWeight: "900", color: COLORS.black, letterSpacing: -0.5, marginTop: 2 },
  priceMicro: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2 },
  paywallList: { gap: SPACING.xs, marginTop: SPACING.xs },
  rowItem: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  rowText: { fontSize: 13, color: COLORS.black, fontWeight: "700" },
});
