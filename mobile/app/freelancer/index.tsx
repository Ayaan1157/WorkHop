import { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";
import { CATALOG_CATEGORY_NAMES } from "@/src/catalogFilters";
import { useUserLocation } from "@/src/useUserLocation";
import { useRazorpay } from "@/src/payments";
import { useAuth } from "@/src/auth";
import CouponInput, { AppliedCoupon } from "@/src/components/CouponInput";
import KangarooMascot from "@/src/components/KangarooMascot";

const TOTAL_STEPS = 4;

type FreelancerState = {
  freelancerId: string | null;
  paid: boolean;
  aadhaarVerified: boolean;
  maskedAadhaar: string | null;
};

export default function FreelancerWizard() {
  const router = useRouter();
  const [state, setState] = useState<FreelancerState>({
    freelancerId: null,
    paid: false,
    aadhaarVerified: false,
    maskedAadhaar: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [phone, setPhone] = useState("");
  const [skill, setSkill] = useState("");
  const [category, setCategory] = useState("Graphics & Design");
  const [rateHr, setRateHr] = useState("");
  const [intro, setIntro] = useState("");
  const [langs, setLangs] = useState<string[]>(["English"]);
  const [deliveryDays, setDeliveryDays] = useState(3);
  const [hasExternal, setHasExternal] = useState<boolean | null>(null);
  const [extPlatform, setExtPlatform] = useState<"fiverr" | "upwork">("fiverr");
  const [extUrl, setExtUrl] = useState("");
  const [extRating, setExtRating] = useState("");
  const [extReviews, setExtReviews] = useState("");
  const { coords, status: locStatus, requestLocation } = useUserLocation();
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [fullName] = useState("New Pro");
  const { startPayment, checkoutModal } = useRazorpay();
  const { user: authUser } = useAuth();
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  // Prefill the verification email from the signed-in account.
  useEffect(() => {
    if (authUser?.email) setVerifyEmail((v) => v || authUser.email);
  }, [authUser?.email]);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10;

  // Returning pro: hydrate paid/aadhaar state + saved profile fields so the
  // wizard resumes where they left off instead of asking to pay again.
  useEffect(() => {
    (async () => {
      try {
        const fid = await AsyncStorage.getItem("workhop_freelancer_id");
        if (!fid) return;
        const r = await fetch(`${BACKEND_URL}/api/freelancer/${fid}`);
        if (!r.ok) return;
        const s = await r.json();
        setState((prev) => ({
          ...prev,
          freelancerId: fid,
          paid: !!s.paid,
          aadhaarVerified: !!s.aadhaar_verified,
        }));
        const pr = await fetch(`${BACKEND_URL}/api/freelancer/${fid}/profile`);
        if (pr.ok) {
          const p = await pr.json();
          if (p.phone) setPhone(String(p.phone).replace(/\D/g, "").replace(/^91/, ""));
          if (p.skill) setSkill(p.skill);
          if (p.category) setCategory(p.category);
          if (p.linkedin_url) setLinkedin(p.linkedin_url);
          if (p.portfolio_url) setPortfolio(p.portfolio_url);
          if (p.rate_hr) setRateHr(String(p.rate_hr));
          if (p.intro) setIntro(p.intro);
          if (Array.isArray(p.languages) && p.languages.length) setLangs(p.languages);
          if (p.delivery_days) setDeliveryDays(p.delivery_days);
          if (p.external_platform) {
            setHasExternal(true);
            setExtPlatform(p.external_platform === "upwork" ? "upwork" : "fiverr");
            if (p.external_url) setExtUrl(p.external_url);
            if (p.external_rating != null) setExtRating(String(p.external_rating));
            if (p.external_reviews != null) setExtReviews(String(p.external_reviews));
          }
        }
      } catch {}
    })();
  }, []);

  const step3Done =
    !!linkedin && !!portfolio && phoneValid && !!skill.trim() &&
    Number(rateHr) > 0 && !!intro.trim() && langs.length > 0;

  const completedSteps =
    (state.paid ? 1 : 0) +
    (state.aadhaarVerified ? 1 : 0) +
    (step3Done ? 1 : 0) +
    (slots.filter(Boolean).length === 3 ? 1 : 0);
  const progressPct = Math.min((completedSteps / TOTAL_STEPS) * 100, 100);

  const handlePay = async () => {
    setPaying(true);
    try {
      const data = await startPayment(
        { product: "freelancer_onboarding", full_name: fullName, coupon_code: coupon?.code ?? null },
        `Verified Pro onboarding · ₹${coupon?.final_amount ?? 99}`,
      );
      if (data?.freelancer_id) {
        setState((s) => ({ ...s, freelancerId: data.freelancer_id, paid: true }));
        AsyncStorage.setItem("workhop_freelancer_id", data.freelancer_id).catch(() => {});
      }
    } catch (e: any) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("pay err", e);
    } finally {
      setPaying(false);
    }
  };

  const sendVerifyOtp = async () => {
    setAadhaarError(null);
    const email = verifyEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setAadhaarError("Enter a valid email address.");
      return;
    }
    setVerifyingAadhaar(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/email/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAadhaarError(data?.detail || "Could not send code.");
        return;
      }
      setOtpSent(true);
      setDevOtp(data.dev_otp || null);
      setOtpCode("");
    } catch {
      setAadhaarError("Network error. Try again.");
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const confirmVerifyOtp = async () => {
    if (!state.freelancerId) return;
    setAadhaarError(null);
    if (otpCode.trim().length !== 6) {
      setAadhaarError("Enter the 6-digit code.");
      return;
    }
    setVerifyingAadhaar(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/freelancer/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancer_id: state.freelancerId,
          email: verifyEmail.trim().toLowerCase(),
          otp: otpCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setState((s) => ({ ...s, aadhaarVerified: true, maskedAadhaar: data.email }));
      } else {
        setAadhaarError(data?.detail || "Verification failed.");
      }
    } catch {
      setAadhaarError("Network error. Try again.");
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const toggleSlot = (i: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = next[i]
        ? null
        : // tiny base64 PNG (1x1 orange) — placeholder for case study image
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
      return next;
    });
  };

  const allReady =
    state.paid &&
    state.aadhaarVerified &&
    step3Done &&
    slots.every(Boolean);

  const handleSubmit = async () => {
    if (!state.freelancerId || !allReady) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/freelancer/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancer_id: state.freelancerId,
          linkedin_url: linkedin,
          portfolio_url: portfolio,
          portfolio_images: slots.filter(Boolean) as string[],
          phone: phoneDigits,
          skill: skill.trim(),
          category,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          rate_hr: Number(rateHr) || null,
          intro: intro.trim(),
          languages: langs,
          delivery_days: deliveryDays,
          external_platform: hasExternal ? extPlatform : "",
          external_url: hasExternal ? extUrl.trim() : "",
          external_rating: hasExternal && extRating ? Math.min(5, parseFloat(extRating)) : null,
          external_reviews: hasExternal && extReviews ? parseInt(extReviews, 10) : null,
        }),
      });
      if (res.ok) setShowOverlay(true);
    } catch (e) {
      console.log("submit err", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar} testID="freelancer-topbar">
        <Pressable onPress={() => router.back()} testID="freelancer-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>VERIFIED PRO ONBOARDING</Text>
          <Text style={styles.topSub}>
            Step {Math.min(completedSteps + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
          </Text>
        </View>
        <View style={styles.kangarooBadge}>
          <KangarooMascot size={32} withShades bgColor="transparent" bodyColor="#FFFFFF" outlineColor="#FFFFFF" />
        </View>
      </View>

      <View style={styles.progressTrack} testID="progress-track">
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <View style={styles.stepDotsRow}>
        {[1, 2, 3, 4].map((n) => {
          const done =
            (n === 1 && state.paid) ||
            (n === 2 && state.aadhaarVerified) ||
            (n === 3 && !!linkedin && !!portfolio) ||
            (n === 4 && slots.every(Boolean));
          return (
            <View key={n} style={styles.stepDotCell}>
              <View style={[styles.stepDot, done && styles.stepDotDone]}>
                <Text style={[styles.stepDotText, done && styles.stepDotTextDone]}>{n}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1 */}
          <StepBlock number={1} title="Payment Gateway Tether" active>
            <View style={styles.mascotCard} testID="step1-card">
              <View style={styles.mascotLeft}>
                <KangarooMascot size={88} withShades bgColor={COLORS.brand} bodyColor={COLORS.white} outlineColor={COLORS.black} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.white} />
                  <Text style={styles.verifiedBadgeText}>Get the Verified Badge</Text>
                </View>
                <Text style={styles.mascotTitle}>
                  Pay a one-time fee of ₹99 to launch your profile live within a 5km radius.
                </Text>
              </View>
            </View>
            {!state.paid && (
              <View style={{ marginBottom: 10 }}>
                <CouponInput
                  product="freelancer_onboarding"
                  amount={99}
                  onApplied={(c) => setCoupon(c?.code ?? null)}
                  testIDPrefix="onboarding-coupon"
                />
              </View>
            )}
            <Pressable
              testID="step1-pay-btn"
              disabled={paying || state.paid}
              onPress={handlePay}
              style={({ pressed }) => [
                styles.payBtn,
                state.paid && styles.payBtnDone,
                paying && { opacity: 0.7 },
                pressed && styles.btnPressed,
              ]}
            >
              {paying ? (
                <>
                  <ActivityIndicator color={COLORS.white} />
                  <Text style={styles.payBtnText}>Processing…</Text>
                </>
              ) : state.paid ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                  <Text style={styles.payBtnText}>Payment Verified · ₹99</Text>
                </>
              ) : (
                <Text style={styles.payBtnText}>Pay Onboarding Fee  •  ₹99</Text>
              )}
            </Pressable>
          </StepBlock>

          {/* STEP 2 — Email OTP verification */}
          <StepBlock
            number={2}
            title="Verify Your Email"
            active={state.paid}
            testID="step2-block"
          >
            {state.aadhaarVerified ? (
              <View style={styles.aadhaarSuccess} testID="email-verify-success">
                <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
                <Text style={styles.aadhaarSuccessText}>
                  Email verified · {state.maskedAadhaar || verifyEmail}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.dropZoneSub}>
                  We&apos;ll email you a 6-digit code to confirm it&apos;s really you.
                </Text>
                <View style={styles.aadhaarFieldRow}>
                  <TextInput
                    testID="verify-email-input"
                    style={styles.aadhaarInput}
                    placeholder="you@example.com"
                    placeholderTextColor="#9A9A9A"
                    value={verifyEmail}
                    onChangeText={(v) => {
                      setVerifyEmail(v);
                      setAadhaarError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={state.paid && !otpSent}
                  />
                  {!otpSent && (
                    <Pressable
                      testID="send-otp-btn"
                      onPress={sendVerifyOtp}
                      disabled={!state.paid || verifyingAadhaar}
                      style={({ pressed }) => [
                        styles.verifyBtn,
                        !state.paid && { opacity: 0.6 },
                        pressed && styles.btnPressed,
                      ]}
                    >
                      {verifyingAadhaar ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <Text style={styles.verifyBtnText}>SEND OTP</Text>
                      )}
                    </Pressable>
                  )}
                </View>
                {otpSent && (
                  <>
                    {devOtp && (
                      <Text style={styles.devOtpNote} testID="wizard-dev-otp">
                        TEST MODE — your code: {devOtp}
                      </Text>
                    )}
                    <View style={styles.aadhaarFieldRow}>
                      <TextInput
                        testID="otp-code-input"
                        style={[styles.aadhaarInput, { letterSpacing: 6, fontWeight: "900" }]}
                        placeholder="6-digit code"
                        placeholderTextColor="#9A9A9A"
                        value={otpCode}
                        onChangeText={(v) => {
                          setOtpCode(v.replace(/\D/g, "").slice(0, 6));
                          setAadhaarError(null);
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={state.paid}
                      />
                      <Pressable
                        testID="confirm-otp-btn"
                        onPress={confirmVerifyOtp}
                        disabled={!state.paid || verifyingAadhaar}
                        style={({ pressed }) => [
                          styles.verifyBtn,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        {verifyingAadhaar ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <Text style={styles.verifyBtnText}>VERIFY</Text>
                        )}
                      </Pressable>
                    </View>
                    <Pressable
                      testID="otp-change-email-btn"
                      onPress={() => {
                        setOtpSent(false);
                        setDevOtp(null);
                        setOtpCode("");
                        setAadhaarError(null);
                      }}
                    >
                      <Text style={styles.otpChangeText}>← Change email / resend code</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
            {aadhaarError && (
              <Text style={styles.errorText} testID="email-verify-error">
                {aadhaarError}
              </Text>
            )}
          </StepBlock>

          {/* STEP 3 */}
          <StepBlock
            number={3}
            title="Contact & Professional Links"
            active={state.paid}
            testID="step3-block"
          >
            <LabeledInput
              label="Phone Number (shown to employers after unlock)"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(t: string) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
              editable={state.paid}
              testID="phone-input"
            />
            {phone.length > 0 && !phoneValid && (
              <Text style={styles.errorText} testID="phone-error">
                Phone must be exactly 10 digits.
              </Text>
            )}
            <LabeledInput
              label="Primary Skill"
              placeholder="e.g. Logo Designer, Video Editor"
              value={skill}
              onChange={setSkill}
              editable={state.paid}
              testID="skill-input"
            />
            <Text style={styles.catLabel}>CATEGORY</Text>
            <View style={styles.catWrap}>
              {CATALOG_CATEGORY_NAMES.map((c) => (
                <Pressable
                  key={c}
                  testID={`profile-cat-${c.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  onPress={() => state.paid && setCategory(c)}
                  style={[styles.catChip, category === c && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                    {c.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              testID="profile-location-btn"
              onPress={() => state.paid && requestLocation()}
              style={[styles.locBtn, coords && styles.locBtnOn]}
            >
              {locStatus === "locating" ? (
                <ActivityIndicator size="small" color={coords ? COLORS.white : COLORS.black} />
              ) : (
                <Ionicons name="locate" size={14} color={coords ? COLORS.white : COLORS.black} />
              )}
              <Text style={[styles.locBtnText, coords && { color: COLORS.white }]}>
                {coords
                  ? "LOCATION ADDED ✓"
                  : "ADD MY LOCATION (optional · rank nearest to employers)"}
              </Text>
            </Pressable>
            <LabeledInput
              label="Fee per Hour (₹) — shown on your profile"
              placeholder="e.g. 500"
              value={rateHr}
              onChange={(t: string) => setRateHr(t.replace(/[^0-9]/g, "").slice(0, 5))}
              editable={state.paid}
              testID="rate-input"
            />
            <Text style={styles.catLabel}>TYPICAL DELIVERY TIME</Text>
            <View style={styles.catWrap}>
              {[1, 3, 7, 14].map((d) => (
                <Pressable
                  key={d}
                  testID={`delivery-chip-${d}`}
                  onPress={() => state.paid && setDeliveryDays(d)}
                  style={[styles.catChip, deliveryDays === d && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, deliveryDays === d && styles.catChipTextActive]}>
                    {d} DAY{d > 1 ? "S" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.catLabel}>LANGUAGES YOU SPEAK</Text>
            <View style={styles.catWrap}>
              {["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam"].map((l) => {
                const on = langs.includes(l);
                return (
                  <Pressable
                    key={l}
                    testID={`lang-chip-${l.toLowerCase()}`}
                    onPress={() =>
                      state.paid &&
                      setLangs((p) => (on ? p.filter((x) => x !== l) : [...p, l]))
                    }
                    style={[styles.catChip, on && styles.catChipActive]}
                  >
                    <Text style={[styles.catChipText, on && styles.catChipTextActive]}>
                      {l.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <LabeledInput
              label="Short Intro — employers see this before unlocking you"
              placeholder="e.g. Logo designer with 5 yrs experience. Fast turnarounds…"
              value={intro}
              onChange={(t: string) => setIntro(t.slice(0, 400))}
              editable={state.paid}
              multiline
              testID="intro-input"
            />
            <Text style={styles.catLabel}>DO YOU HAVE A FIVERR OR UPWORK PROFILE?</Text>
            <View style={styles.catWrap}>
              <Pressable
                testID="external-yes-btn"
                onPress={() => state.paid && setHasExternal(true)}
                style={[styles.catChip, hasExternal === true && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, hasExternal === true && styles.catChipTextActive]}>
                  YES
                </Text>
              </Pressable>
              <Pressable
                testID="external-no-btn"
                onPress={() => state.paid && setHasExternal(false)}
                style={[styles.catChip, hasExternal === false && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, hasExternal === false && styles.catChipTextActive]}>
                  NO
                </Text>
              </Pressable>
            </View>
            {hasExternal === true && (
              <View style={styles.extBlock} testID="external-import-block">
                <Text style={styles.extTitle}>TRANSFER YOUR RATING & REVIEWS</Text>
                <View style={styles.catWrap}>
                  {(["fiverr", "upwork"] as const).map((p) => (
                    <Pressable
                      key={p}
                      testID={`ext-platform-${p}`}
                      onPress={() => setExtPlatform(p)}
                      style={[styles.catChip, extPlatform === p && styles.catChipActive]}
                    >
                      <Text style={[styles.catChipText, extPlatform === p && styles.catChipTextActive]}>
                        {p.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <LabeledInput
                  label={`Your ${extPlatform === "fiverr" ? "Fiverr" : "Upwork"} profile URL`}
                  placeholder={extPlatform === "fiverr" ? "fiverr.com/yourname" : "upwork.com/freelancers/you"}
                  value={extUrl}
                  onChange={setExtUrl}
                  editable={state.paid}
                  testID="ext-url-input"
                />
                <View style={styles.extRow}>
                  <View style={{ flex: 1 }}>
                    <LabeledInput
                      label="Rating (0–5)"
                      placeholder="4.9"
                      value={extRating}
                      onChange={(t: string) => setExtRating(t.replace(/[^0-9.]/g, "").slice(0, 3))}
                      editable={state.paid}
                      testID="ext-rating-input"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <LabeledInput
                      label="No. of reviews"
                      placeholder="120"
                      value={extReviews}
                      onChange={(t: string) => setExtReviews(t.replace(/[^0-9]/g, "").slice(0, 5))}
                      editable={state.paid}
                      testID="ext-reviews-input"
                    />
                  </View>
                </View>
                <Text style={styles.extNote}>
                  Your imported rating shows on your WorkHop profile with a
                  “{extPlatform === "fiverr" ? "Fiverr" : "Upwork"} import” badge.
                </Text>
              </View>
            )}
            <LabeledInput
              label="LinkedIn Profile URL"
              placeholder="linkedin.com/in/yourname"
              value={linkedin}
              onChange={setLinkedin}
              editable={state.paid}
              testID="linkedin-input"
            />
            <LabeledInput
              label="Professional Website or Linktree"
              placeholder="yourportfolio.com"
              value={portfolio}
              onChange={setPortfolio}
              editable={state.paid}
              testID="portfolio-input"
            />
          </StepBlock>

          {/* STEP 4 */}
          <StepBlock
            number={4}
            title="Upload your work images (3D design, website landing page, logo design, etc.)"
            active={state.paid}
            testID="step4-block"
          >
            <Text style={styles.portfolioHelp}>
              Upload up to 3 high-resolution case studies
            </Text>
            <View style={styles.portfolioGrid}>
              {slots.map((slot, i) => (
                <Pressable
                  key={i}
                  testID={`portfolio-slot-${i}`}
                  onPress={() => state.paid && toggleSlot(i)}
                  style={[styles.portfolioSlot, slot && styles.portfolioSlotFilled]}
                >
                  {slot ? (
                    <>
                      <Ionicons name="image" size={26} color={COLORS.brand} />
                      <Text style={styles.slotFilledText}>UPLOADED</Text>
                    </>
                  ) : (
                    <Ionicons name="add" size={32} color={COLORS.black} />
                  )}
                </Pressable>
              ))}
            </View>
          </StepBlock>

          <Pressable
            testID="submit-btn"
            disabled={!allReady || submitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              !allReady && styles.submitBtnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit for Verification</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </>
            )}
          </Pressable>
          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {showOverlay && (
        <ProcessingOverlay
          onClose={() => router.replace("/")}
          onViewJobs={() => router.replace("/freelancer/jobs")}
        />
      )}
      {checkoutModal}
    </SafeAreaView>
  );
}

function StepBlock({
  number,
  title,
  active,
  children,
  testID,
}: {
  number: number;
  title: string;
  active: boolean;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.stepBlock, !active && styles.stepBlockLocked, !active && { pointerEvents: "none" as any }]}
    >
      <View style={styles.stepHeaderRow}>
        <View style={[styles.stepNumberBox, active && styles.stepNumberBoxActive]}>
          <Text style={[styles.stepNumberText, active && styles.stepNumberTextActive]}>
            0{number}
          </Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        {!active && (
          <View style={styles.stepLockIcon}>
            <Ionicons name="lock-closed" size={14} color={COLORS.white} />
          </View>
        )}
      </View>
      <View style={styles.stepBody}>{children}</View>
    </View>
  );
}

function LabeledInput({
  label,
  placeholder,
  value,
  onChange,
  editable,
  testID,
  multiline = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  testID: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.labeledInputWrap}>
      <Text style={styles.labeledInputLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={[styles.labeledInput, multiline && styles.labeledInputMulti]}
        placeholder={placeholder}
        placeholderTextColor="#9A9A9A"
        value={value}
        onChangeText={onChange}
        editable={editable}
        autoCapitalize="none"
        multiline={multiline}
      />
    </View>
  );
}

function ProcessingOverlay({
  onClose,
  onViewJobs,
}: {
  onClose: () => void;
  onViewJobs: () => void;
}) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNative = Platform.OS !== "web";
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 500, useNativeDriver: useNative }),
        Animated.timing(bounce, { toValue: 0, duration: 500, useNativeDriver: useNative }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });

  return (
    <View style={styles.overlay} testID="processing-overlay">
      <View style={styles.overlayContent}>
        <Animated.View style={[styles.overlayKangarooWrap, { transform: [{ translateY }] }]}>
          <KangarooMascot size={140} withShades jumping bgColor={COLORS.brand} bodyColor={COLORS.white} outlineColor={COLORS.black} />
        </Animated.View>
        <View style={styles.overlayShadow} />

        <View style={styles.overlayBadge}>
          <View style={styles.overlayBadgeDot} />
          <Text style={styles.overlayBadgeText}>VERIFYING</Text>
        </View>
        <Text style={styles.overlayTitle}>
          Our team is verifying your{"\n"}email and links.
        </Text>
        <Text style={styles.overlaySub}>
          Your profile will leap live within 2 hours.
        </Text>
        <Pressable testID="overlay-jobs-btn" onPress={onViewJobs} style={styles.overlayBtn}>
          <Text style={styles.overlayBtnText}>View jobs near you</Text>
        </Pressable>
        <Pressable testID="overlay-done-btn" onPress={onClose} style={styles.overlayBtnGhost}>
          <Text style={styles.overlayBtnGhostText}>Back to home</Text>
        </Pressable>
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
  kangarooBadge: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  kangarooBadgeText: { fontSize: 20 },

  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  progressFill: { height: "100%", backgroundColor: COLORS.brand },
  stepDotsRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  stepDotCell: { flex: 1, alignItems: "center" },
  stepDot: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  stepDotDone: { backgroundColor: COLORS.brand },
  stepDotText: { fontWeight: "900", fontSize: 12, color: COLORS.black },
  stepDotTextDone: { color: COLORS.white },

  scrollContent: { padding: SPACING.lg, gap: SPACING.lg },

  stepBlock: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  stepBlockLocked: { opacity: 0.4 },
  stepHeaderRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  stepNumberBox: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceSecondary,
  },
  stepNumberBoxActive: { backgroundColor: COLORS.brand },
  stepNumberText: { fontWeight: "900", color: COLORS.black, fontSize: 14 },
  stepNumberTextActive: { color: COLORS.white },
  stepTitle: { flex: 1, fontSize: 16, fontWeight: "900", color: COLORS.black, letterSpacing: -0.2 },
  stepLockIcon: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBody: { gap: SPACING.md },

  mascotCard: {
    flexDirection: "row",
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.md,
    alignItems: "center",
  },
  mascotLeft: { width: 80, alignItems: "center", justifyContent: "center" },
  kangarooBig: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  kangarooBigEmoji: { fontSize: 48 },
  kangarooShades: {
    position: "absolute",
    width: 40,
    height: 10,
    backgroundColor: COLORS.black,
    top: 26,
    borderRadius: 2,
  },
  verifiedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  verifiedBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  mascotTitle: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: SPACING.sm,
  },
  payBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  payBtnDone: { backgroundColor: COLORS.success },
  payBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 14, letterSpacing: 0.5 },
  btnPressed: { opacity: 0.85 },

  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.black,
    padding: SPACING.lg,
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
    gap: SPACING.sm,
  },
  dropZoneIcon: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  dropZoneTitle: { fontWeight: "900", fontSize: 14, color: COLORS.black, letterSpacing: 0.4 },
  dropZoneSub: { fontSize: 11, color: COLORS.onSurfaceMuted, textAlign: "center" },
  aadhaarFieldRow: { flexDirection: "row", gap: SPACING.sm },
  aadhaarInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.black,
    letterSpacing: 2,
    backgroundColor: COLORS.surface,
  },
  verifyBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.lg,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
  },
  verifyBtnText: { color: COLORS.white, fontWeight: "900", letterSpacing: 1, fontSize: 12 },
  aadhaarSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: "#E5F8EE",
    borderWidth: 2,
    borderColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  aadhaarSuccessText: { color: COLORS.black, fontWeight: "800", fontSize: 12 },
  errorText: { color: COLORS.error, fontSize: 12, fontWeight: "700" },
  devOtpNote: {
    fontSize: 12, fontWeight: "900", color: COLORS.black, backgroundColor: "#FFF3C4",
    borderWidth: 1.5, borderColor: COLORS.black, padding: SPACING.sm,
  },
  otpChangeText: { fontSize: 12, fontWeight: "800", color: COLORS.brand },
  catLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: "900", color: COLORS.black, marginTop: SPACING.xs },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  catChip: {
    borderWidth: 2, borderColor: COLORS.black,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  catChipActive: { backgroundColor: COLORS.black },
  catChipText: { fontWeight: "900", fontSize: 9, letterSpacing: 0.5, color: COLORS.black },
  catChipTextActive: { color: COLORS.white },
  locBtn: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.black,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary, marginTop: SPACING.xs,
  },
  locBtnOn: { backgroundColor: COLORS.success, borderColor: COLORS.black },
  locBtnText: { fontWeight: "800", fontSize: 10, letterSpacing: 0.4, color: COLORS.black, flex: 1 },
  labeledInputMulti: { height: 88, textAlignVertical: "top", paddingTop: SPACING.sm },
  extBlock: {
    borderWidth: 2, borderColor: COLORS.black, backgroundColor: "#FFF3C4",
    padding: SPACING.md, gap: SPACING.sm, marginTop: SPACING.xs,
  },
  extTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: COLORS.black },
  extRow: { flexDirection: "row", gap: SPACING.sm },
  extNote: { fontSize: 10, color: COLORS.onSurfaceMuted, fontWeight: "600" },

  labeledInputWrap: { gap: 6 },
  labeledInputLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.onSurfaceMuted,
    textTransform: "uppercase",
  },
  labeledInput: {
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.black,
    backgroundColor: COLORS.surface,
  },

  portfolioHelp: { fontSize: 12, color: COLORS.onSurfaceMuted },
  portfolioGrid: { flexDirection: "row", gap: SPACING.md },
  portfolioSlot: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  portfolioSlotFilled: { backgroundColor: "#FFE5D6" },
  slotFilledText: { fontSize: 9, fontWeight: "900", color: COLORS.black, letterSpacing: 1 },

  submitBtn: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },

  overlay: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  overlayContent: { alignItems: "center", gap: SPACING.lg, width: "100%" },
  overlayKangarooWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlayShadow: {
    width: 80,
    height: 8,
    backgroundColor: COLORS.black,
    opacity: 0.18,
    marginTop: -SPACING.md,
  },
  overlayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  overlayBadgeDot: { width: 8, height: 8, backgroundColor: COLORS.brand },
  overlayBadgeText: { color: COLORS.white, fontWeight: "900", fontSize: 11, letterSpacing: 1.4 },
  overlayTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.black,
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  overlaySub: { fontSize: 14, color: COLORS.onSurfaceMuted, textAlign: "center" },
  overlayBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
  },
  overlayBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 14, letterSpacing: 0.5 },
  overlayBtnGhost: {
    marginTop: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
  },
  overlayBtnGhostText: { color: COLORS.black, fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
});
