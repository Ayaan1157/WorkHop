import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar as RNStatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Landing() {
  const router = useRouter();
  const { user, loading, login, logout, adoptSession } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpStage, setOtpStage] = useState<"idle" | "sent">("idle");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const requestOtp = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setOtpError("Enter a valid email address.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/email/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) {
        setOtpError(data?.detail || "Could not send code.");
        return;
      }
      setDevOtp(data.dev_otp || null);
      setOtpStage("sent");
      setOtpInput("");
    } catch {
      setOtpError("Network error. Try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otpInput.trim().length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/email/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim().toLowerCase(), otp: otpInput.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setOtpError(data?.detail || "Verification failed.");
        return;
      }
      await adoptSession(data.session_token, data.user);
      setOtpStage("idle");
      setEmailInput("");
      setOtpInput("");
    } catch {
      setOtpError("Network error. Try again.");
    } finally {
      setOtpLoading(false);
    }
  };
  const [pendingRole, setPendingRole] = useState<"employer" | "freelancer" | null>(null);

  // On mount, silently warm a check so tapping the freelancer card is instant.
  useEffect(() => {
    AsyncStorage.getItem("workhop_freelancer_id").catch(() => {});
  }, []);

  // Jobs feed sends unauthenticated pros here when they tap APPLY —
  // show the sign-in screen for the freelancer role.
  useEffect(() => {
    if (loading || user) return;
    AsyncStorage.getItem("workhop_auth_intent")
      .then(async (v) => {
        if (v === "freelancer") {
          await AsyncStorage.removeItem("workhop_auth_intent");
          await AsyncStorage.setItem("workhop_pending_role", "freelancer");
          setPendingRole("freelancer");
        }
      })
      .catch(() => {});
  }, [loading, user]);

  const goFreelancer = useCallback(() => {
    // Pros land on the jobs feed first — sign-in & verification start at APPLY.
    router.push("/freelancer/jobs");
  }, [router]);

  // After login completes (incl. web redirect round-trip), continue to the chosen side.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const pr = await AsyncStorage.getItem("workhop_pending_role");
      if (!pr) return;
      await AsyncStorage.removeItem("workhop_pending_role");
      setPendingRole(null);
      if (pr === "employer") router.push("/employer");
      else goFreelancer();
    })();
  }, [user, router, goFreelancer]);

  const chooseRole = async (role: "employer" | "freelancer") => {
    if (role === "freelancer") {
      // Browse jobs without an account; sign-in happens on APPLY.
      goFreelancer();
      return;
    }
    if (user) {
      router.push("/employer");
      return;
    }
    await AsyncStorage.setItem("workhop_pending_role", role);
    setPendingRole(role);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={["top", "bottom"]}>
        <Image
          source={require("../assets/images/workhop-logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <ActivityIndicator color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  if (pendingRole && !user) {
    const employer = pendingRole === "employer";
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <RNStatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.loginTopRow}>
          <Pressable
            testID="login-back-btn"
            onPress={async () => {
              await AsyncStorage.removeItem("workhop_pending_role");
              setPendingRole(null);
            }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.black} />
          </Pressable>
          <View style={[styles.rolePill, employer ? styles.rolePillDark : styles.rolePillOrange]}>
            <Text style={styles.rolePillText}>{employer ? "I'M HIRING" : "I'M LOOKING FOR A JOB"}</Text>
          </View>
        </View>

        <View style={styles.header} testID="login-header">
          <Image
            source={require("../assets/images/workhop-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
            testID="landing-logo"
          />
          <Text style={styles.brandTag}>hyperlocal gigs · verified pros</Text>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>
            {employer ? "Sign in to\nstart hiring." : "Sign in to\nland gigs."}
          </Text>
          <View style={styles.heroAccent} />
          <Text style={styles.loginSub}>
            {employer
              ? "One account to unlock verified pros near you, post jobs and chat with applicants."
              : "One account to get verified, apply to gigs in your 5km radius and chat with employers."}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.loginBlock}>
          <Pressable
            testID="login-google-btn"
            onPress={login}
            style={({ pressed }) => [styles.googleBtn, pressed && styles.cardPressed]}
          >
            <Ionicons name="logo-google" size={20} color={COLORS.white} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {otpStage === "idle" ? (
            <>
              <View style={styles.emailInputWrap}>
                <Ionicons name="mail" size={16} color={COLORS.onSurfaceMuted} />
                <TextInput
                  testID="login-email-input"
                  value={emailInput}
                  onChangeText={(t) => {
                    setEmailInput(t);
                    setOtpError(null);
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.onSurfaceMuted}
                  style={styles.emailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Pressable
                testID="login-email-btn"
                onPress={requestOtp}
                disabled={otpLoading}
                style={({ pressed }) => [
                  styles.emailBtn,
                  otpLoading && { opacity: 0.6 },
                  pressed && styles.cardPressed,
                ]}
              >
                {otpLoading ? (
                  <ActivityIndicator color={COLORS.black} size="small" />
                ) : (
                  <>
                    <Ionicons name="mail-open" size={18} color={COLORS.black} />
                    <Text style={styles.emailBtnText}>Continue with Email</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <View testID="otp-block">
              <Text style={styles.otpInfo}>
                We emailed a 6-digit code to{" "}
                <Text style={{ fontWeight: "900" }}>{emailInput.trim()}</Text>
              </Text>
              {devOtp && (
                <Text style={styles.devOtp} testID="dev-otp-text">
                  TEST MODE — your code: {devOtp}
                </Text>
              )}
              <View style={styles.emailInputWrap}>
                <Ionicons name="key" size={16} color={COLORS.onSurfaceMuted} />
                <TextInput
                  testID="login-otp-input"
                  value={otpInput}
                  onChangeText={(t) => {
                    setOtpInput(t.replace(/\D/g, "").slice(0, 6));
                    setOtpError(null);
                  }}
                  placeholder="6-digit code"
                  placeholderTextColor={COLORS.onSurfaceMuted}
                  style={[styles.emailInput, { letterSpacing: 6, fontWeight: "900" }]}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <Pressable
                testID="login-otp-verify-btn"
                onPress={verifyOtp}
                disabled={otpLoading}
                style={({ pressed }) => [
                  styles.googleBtn,
                  otpLoading && { opacity: 0.6 },
                  pressed && styles.cardPressed,
                ]}
              >
                {otpLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.googleBtnText}>Verify & Continue</Text>
                )}
              </Pressable>
              <Pressable
                testID="login-otp-change-email"
                onPress={() => {
                  setOtpStage("idle");
                  setOtpError(null);
                  setDevOtp(null);
                }}
              >
                <Text style={styles.changeEmail}>← Use a different email</Text>
              </Pressable>
            </View>
          )}
          {otpError && (
            <Text style={styles.otpError} testID="login-otp-error">
              {otpError}
            </Text>
          )}
          <Text style={styles.loginFootnote}>
            🔒 Secure sign-in · No passwords to remember
          </Text>
        </View>
        </ScrollView>

        <View style={styles.footerRow} testID="landing-footer">
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>WorkHop · Bengaluru</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <RNStatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScrollView
        contentContainerStyle={styles.landingScroll}
        showsVerticalScrollIndicator={false}
      >

      <View style={styles.header} testID="landing-header">
        <Image
          source={require("../assets/images/workhop-logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
          testID="landing-logo"
        />
        <Text style={styles.brandTag}>hyperlocal gigs · verified pros</Text>
      </View>

      {user && (
        <View style={styles.userRow} testID="user-row">
          <Pressable
            testID="user-chip"
            onPress={() => router.push("/profile")}
            style={styles.userChip}
          >
            <Ionicons name="person-circle" size={18} color={COLORS.brand} />
            <Text style={styles.userChipText} numberOfLines={1}>
              {user.name || user.email}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={COLORS.onSurfaceMuted} />
          </Pressable>
          <Pressable testID="logout-btn" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={14} color={COLORS.black} />
            <Text style={styles.logoutText}>LOGOUT</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.heroBlock}>
        <Text style={styles.heroTitle}>Pick a side.{"\n"}Get to work.</Text>
        <View style={styles.heroAccent} />
      </View>

      <View style={styles.cardsWrap}>
        <Pressable
          testID="role-employer-card"
          onPress={() => chooseRole("employer")}
          style={({ pressed }) => [
            styles.card,
            styles.cardEmployer,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.pillDark}>
              <Text style={styles.pillDarkText}>I&apos;M HIRING</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
          </View>
          <Text style={styles.cardTitleLight}>
            Find 5 verified{"\n"}experts on your block
          </Text>
          <Text style={styles.cardSubLight}>
            Unlock contact + portfolio of nearest pros. One-time ₹199.
          </Text>
        </Pressable>

        <Pressable
          testID="role-freelancer-card"
          onPress={() => chooseRole("freelancer")}
          style={({ pressed }) => [
            styles.card,
            styles.cardFreelancer,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.pillOrange}>
              <Text style={styles.pillOrangeText}>I&apos;M LOOKING FOR A JOB</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={COLORS.black} />
          </View>
          <Text style={styles.cardTitleDark}>
            Go live in your{"\n"}5km radius
          </Text>
          <Text style={styles.cardSubDark}>
            One-time ₹99 onboarding. Email + portfolio verified. Leap live in 2 hrs.
          </Text>
        </Pressable>
      </View>

      <View style={styles.footerRow} testID="landing-footer">
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>
          Dual-sided monetization · Mock Razorpay/UPI
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
  },
  header: { paddingTop: SPACING.sm, alignItems: "center" },
  center: { alignItems: "center", justifyContent: "center", gap: SPACING.lg },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  userChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  userChipText: { fontWeight: "800", fontSize: 12, color: COLORS.black, flexShrink: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
  },
  logoutText: { fontWeight: "900", fontSize: 10, letterSpacing: 1, color: COLORS.black },
  loginSub: {
    marginTop: SPACING.lg,
    fontSize: 14,
    color: COLORS.onSurfaceMuted,
    lineHeight: 20,
  },
  loginBlock: { flex: 1, justifyContent: "center", gap: SPACING.md },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.black,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.sm,
  },
  googleBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  loginFootnote: { textAlign: "center", fontSize: 11, color: COLORS.onSurfaceMuted },
  loginTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  rolePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  rolePillDark: { backgroundColor: COLORS.black },
  rolePillOrange: { backgroundColor: COLORS.brand },
  rolePillText: { color: COLORS.white, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  logoImage: {
    width: 260,
    height: 142,
    marginVertical: -SPACING.md,
  },
  brandTag: {
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
    marginTop: SPACING.sm,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroBlock: { marginTop: SPACING.xl },
  heroTitle: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "900",
    color: COLORS.black,
    letterSpacing: -0.5,
  },
  heroAccent: {
    marginTop: SPACING.md,
    width: 64,
    height: 6,
    backgroundColor: COLORS.brand,
  },
  cardsWrap: { marginTop: SPACING.xxl, gap: SPACING.lg },
  landingScroll: { flexGrow: 1, paddingBottom: SPACING.md },
  orRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginVertical: SPACING.md },
  orLine: { flex: 1, height: 2, backgroundColor: COLORS.black, opacity: 0.15 },
  orText: { fontWeight: "900", fontSize: 11, letterSpacing: 1.5, color: COLORS.onSurfaceMuted },
  emailInputWrap: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.md,
    height: 48, backgroundColor: COLORS.surfaceSecondary, marginBottom: SPACING.sm,
  },
  emailInput: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.black },
  emailBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.black, backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
  },
  emailBtnText: { fontWeight: "900", fontSize: 14, color: COLORS.black },
  otpInfo: { fontSize: 12, color: COLORS.black, marginBottom: SPACING.sm },
  devOtp: {
    fontSize: 12, fontWeight: "900", color: COLORS.black, backgroundColor: "#FFF3C4",
    borderWidth: 1.5, borderColor: COLORS.black, padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  changeEmail: { fontSize: 12, fontWeight: "800", color: COLORS.brand, marginTop: SPACING.sm },
  otpError: { fontSize: 12, fontWeight: "700", color: "#C62828", marginTop: SPACING.sm },
  card: {
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.xl,
    borderRadius: RADIUS.sm,
  },
  cardEmployer: { backgroundColor: COLORS.black },
  cardFreelancer: { backgroundColor: COLORS.brand },
  cardPressed: { opacity: 0.85, transform: [{ translateY: 1 }] },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  pillDark: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  pillDarkText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  pillOrange: {
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  pillOrangeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  cardTitleLight: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  cardSubLight: {
    color: "#D6D6D6",
    marginTop: SPACING.md,
    fontSize: 13,
    lineHeight: 18,
  },
  cardTitleDark: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.black,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  cardSubDark: {
    color: COLORS.black,
    marginTop: SPACING.md,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    marginTop: "auto",
  },
  footerDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.brand,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.onSurfaceMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
