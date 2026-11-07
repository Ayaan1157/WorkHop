import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Mail, KeyRound, ArrowRight, LogOut, UserCircle2, Loader2,
  MapPin, ShieldCheck, Zap, Sparkles, PlusCircle, CheckCircle, Navigation, Users, Briefcase,
  User, Building2, LocateFixed, CheckCircle2, Eye, EyeOff, Sun, Moon, Menu, X, Star,
  Palette, Code2, Megaphone, PenTool, Video, Cpu, Music, Compass, MessageSquare, PhoneCall, Wallet, Lock
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getStoredLeads, isEmailRegistered } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { BENGALURU_AREAS, findNearestArea, setSavedArea } from "@/lib/locationAreas";
import { useUserLocation } from "@/hooks/useUserLocation";
import AuthModal from "@/components/AuthModal";
import BroadcastBanner from "@/components/BroadcastBanner";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import { supabase, supabaseSignInWithGoogle } from "@/lib/supabase";
import SiteFooter from "@/components/SiteFooter";
import { Logo, MobileBottomNav } from "@/components/kit";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Landing() {
  usePageMeta({
    title: "WorkHop · Your Next Local Gig, One Minute Away (Bengaluru)",
    description: "Connect with verified freelance experts within 5km in Bengaluru. Instant call, direct WhatsApp chat, zero middlemen, 100% earnings.",
    canonical: "https://workhop.in/",
    ogTitle: "WorkHop · Hyperlocal Freelance Marketplace Bengaluru",
    ogDescription: "Hire top freelancers within 5km or get local gigs in Koramangala, Indiranagar, HSR Layout and across Bangalore.",
  });

  const nav = useNavigate();
  const { user, loading, login, logout, adoptSession, signupWithDetails, passwordLoginAuth } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  const userRole = user ? (user.role || localStorage.getItem("workhop_auth_role") || "freelancer").toLowerCase() : null;
  const isEmployerUser = Boolean(user && (userRole?.includes("employ") || userRole?.includes("client")));
  const isFreelancerUser = Boolean(user && !isEmployerUser);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState("freelancer");
  const [authModalMode, setAuthModalMode] = useState("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sign in / Sign up flow state
  const [pendingRole, setPendingRole] = useState(null); // "employer" | "freelancer"
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [featuredPros, setFeaturedPros] = useState(() => getStoredLeads().slice(0, 6));

  useEffect(() => {
    apiGet("/leads/preview")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setFeaturedPros(data.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [areaInput, setAreaInput] = useState("Koramangala");
  const [companyInput, setCompanyInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const [otpInput, setOtpInput] = useState("");
  const [otpStage, setOtpStage] = useState("idle"); // "idle" | "sent"
  const [otpType, setOtpType] = useState("email"); // "mobile" | "email"
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Recaptcha Security State
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (loading || user) return;
    const params = new URLSearchParams(window.location.search);
    const urlAuth = params.get("auth");
    if (urlAuth === "signup" || urlAuth === "signin") {
      const savedRole = localStorage.getItem("workhop_pending_role") || "freelancer";
      setPendingRole(savedRole);
      setAuthMode(urlAuth === "signup" ? "signup" : "signin");
      localStorage.setItem("workhop_auth_intent", urlAuth === "signup" ? "signup" : "signin");
      return;
    }
    if (localStorage.getItem("workhop_auth_intent") === "freelancer") {
      localStorage.removeItem("workhop_auth_intent");
      localStorage.setItem("workhop_pending_role", "freelancer");
      setPendingRole("freelancer");
    }
  }, [loading, user]);

  const goFreelancer = useCallback(() => nav("/freelancer/jobs"), [nav]);

  useEffect(() => {
    if (!user) return;
    const pr = localStorage.getItem("workhop_pending_role");
    if (!pr) return;
    localStorage.removeItem("workhop_pending_role");
    setPendingRole(null);
    if (pr === "employer") nav("/employer");
    else goFreelancer();
  }, [user, nav, goFreelancer]);

  const [gpsNotice, setGpsNotice] = useState(null);

  // GPS auto-detect area
  useEffect(() => {
    if (coords) {
      const nearest = findNearestArea(coords);
      if (nearest) {
        setAreaInput(nearest.name);
        setSavedArea(nearest.name);
      }
    }
  }, [coords]);

  const handleDetectGps = async () => {
    setGpsNotice(null);
    try {
      const res = await requestLocation();
      const loc = res?.coords || coords;
      if (loc) {
        const nearest = findNearestArea(loc);
        if (nearest) {
          setAreaInput(nearest.name);
          setSavedArea(nearest.name);
          if (nearest.isOutsideBengaluru) {
            setGpsNotice({
              type: "outside",
              text: `📍 Location detected (~${nearest.distanceToBengaluruCenter}km away). Selected nearest hub: ${nearest.name}.`,
            });
          } else {
            setGpsNotice({
              type: "success",
              text: `✓ Live GPS detected: ${nearest.name} (${nearest.zone} Bengaluru)`,
            });
          }
        }
      } else {
        setGpsNotice({
          type: "error",
          text: "⚠️ Location permission denied or unavailable. Please pick your area below.",
        });
      }
    } catch {
      setGpsNotice({
        type: "error",
        text: "⚠️ Location request failed. Please select your area below.",
      });
    }
  };

  const rawPhoneDigits = phoneInput.replace(/\D/g, "");
  const phoneDigits = rawPhoneDigits.length > 10 && rawPhoneDigits.startsWith("91") ? rawPhoneDigits.slice(2) : rawPhoneDigits;
  const isPhoneValid = /^[6-9]\d{9}$/.test(phoneDigits) &&
    !/^([0-9])\1{9}$/.test(phoneDigits) &&
    phoneDigits !== "1234567890" &&
    phoneDigits !== "9876543210" &&
    phoneDigits !== "0123456789";

  const cleanEmail = (emailInput || "").trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const dummyDomains = ["test.com", "example.com", "example.org", "dummy.com", "fake.com", "mailinator.com", "tempmail.com", "yopmail.com"];
  const isDummyEmail = dummyDomains.some((d) => cleanEmail.endsWith(`@${d}`));
  const isDummyUsername = ["test", "dummy", "fake", "user", "admin", "abc", "xyz", "sample"].includes(cleanEmail.split("@")[0]);
  const isEmailValid = Boolean(cleanEmail && emailRegex.test(cleanEmail) && !isDummyEmail && !isDummyUsername);

  // Request Email OTP (Sign In via Email OTP)
  const requestOtp = async () => {
    if (!isEmailValid) {
      setOtpError("Enter a valid, active email address.");
      return;
    }
    if (authMode === "signin" && !isEmailRegistered(cleanEmail)) {
      let isRegisteredInSupa = false;
      try {
        const { data: supaUser } = await supabase
          .from("profiles")
          .select("id, role")
          .ilike("email", cleanEmail)
          .maybeSingle();
        if (supaUser?.id) isRegisteredInSupa = true;
      } catch (_) {}

      if (!isRegisteredInSupa) {
        setOtpError("Account not registered. Please register first.");
        setAuthMode("signup");
        return;
      }
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      await apiPost("/auth/send-otp", { email: cleanEmail, action: "send" });
      setOtpType("email");
      setOtpStage("sent");
      setOtpInput("");
      setResendCooldown(30);
    } catch (e) {
      setOtpError(e?.message || "Could not send verification code.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP (Email Verification Code)
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      await apiPost("/auth/send-otp", { phone: phoneDigits, email: cleanEmail, action: "send" });
      setResendCooldown(30);
    } catch (e) {
      setOtpError(e?.message || "Could not resend verification code.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP & Complete Auth
  const verifyOtp = async () => {
    if (otpInput.trim().length !== 6) {
      setOtpError("Enter the 6-digit verification code.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    const target = pendingRole || localStorage.getItem("workhop_pending_role") || "freelancer";
    const cleanName = sanitizeInput(nameInput);
    const cleanSkill = sanitizeInput(skillInput);
    const cleanCompany = sanitizeInput(companyInput);

    try {
      const verifyRes = await apiPost("/auth/send-otp", {
        email: cleanEmail,
        code: otpInput.trim(),
        action: "verify",
      });

      if (!verifyRes?.verified && !verifyRes?.ok) {
        throw new Error(verifyRes?.detail || "Invalid 6-digit verification code.");
      }

      const payload = {
        email: cleanEmail,
        password: passwordInput,
        role: target,
        name: cleanName || undefined,
        phone: phoneDigits || undefined,
        phone_verified: true,
        email_verified: true,
        area: areaInput,
        company_name: target === "employer" ? (cleanCompany || undefined) : undefined,
        skill: target !== "employer" ? (cleanSkill || undefined) : undefined,
      };

      // Sync to real Supabase auth & backend
      try {
        if (passwordInput) {
          const { data: sbAuth } = await supabase.auth.signUp({
            email: cleanEmail,
            password: passwordInput,
            options: {
              data: {
                full_name: cleanName,
                name: cleanName,
                role: target,
                area: areaInput,
                phone: phoneDigits,
              },
            },
          });
          if (sbAuth?.session?.access_token) {
            setToken(sbAuth.session.access_token);
          }
        }
      } catch (sbErr) {
        console.warn("Supabase auth sync notice:", sbErr?.message);
      }

      await apiPost("/users", payload).catch(() => {});
      resetRateLimit(`landing_signup_${cleanEmail}`);

      const session = await signupWithDetails(payload);
      completeSessionAndRedirect(target, session?.user);
    } catch (e) {
      setOtpError(e?.message || "Invalid verification code. Please check your inbox and try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Sign In Handler with Mandatory Password
  const handleSignIn = async () => {
    const target = pendingRole || localStorage.getItem("workhop_pending_role") || "freelancer";
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setOtpError("Please enter your email address.");
      return;
    }

    if (!isEmailRegistered(cleanEmail)) {
      let isRegisteredInSupa = false;
      try {
        const { data: supaUser } = await supabase
          .from("profiles")
          .select("id, role")
          .ilike("email", cleanEmail)
          .maybeSingle();
        if (supaUser?.id) isRegisteredInSupa = true;
      } catch (_) {}

      if (!isRegisteredInSupa) {
        setOtpError("Account not registered. Please register first.");
        setAuthMode("signup");
        return;
      }
    }

    if (!passwordInput) {
      setOtpError("Please enter your password to sign in.");
      return;
    }

    // Rate Limiting Anti-Brute Force Protection
    const rate = checkRateLimit(`landing_signin_${cleanEmail}`, 5, 60000);
    if (!rate.allowed) {
      setOtpError(`Security lockout: Too many failed login attempts. Please wait ${rate.waitSeconds} seconds.`);
      return;
    }

    // Human Verification Check
    if (!captchaToken) {
      setOtpError("Please complete the reCAPTCHA human verification check before signing in.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await passwordLoginAuth(cleanEmail, passwordInput, target);
      resetRateLimit(`landing_signin_${cleanEmail}`);
      const resolvedRole = res?.user?.role || target || "freelancer";
      completeSessionAndRedirect(resolvedRole, res?.user);
    } catch (e) {
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
      setOtpError(e?.message || "Incorrect email or password. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Sign Up Handler with Mandatory Details
  const handleSignUp = async () => {
    const target = pendingRole || localStorage.getItem("workhop_pending_role") || "freelancer";
    const cleanName = sanitizeInput(nameInput);
    const cleanSkill = sanitizeInput(skillInput);
    const cleanCompany = sanitizeInput(companyInput);

    if (!cleanName) {
      setOtpError("Please enter your full name.");
      return;
    }
    if (!isPhoneValid) {
      setOtpError("Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).");
      return;
    }
    if (!areaInput) {
      setOtpError("Please select your neighborhood area.");
      return;
    }
    if (target !== "employer" && !cleanSkill) {
      setOtpError("Please enter your primary skill / trade.");
      return;
    }
    if (!isEmailValid) {
      setOtpError("Please enter a genuine, active email address (test/temporary email domains are not permitted).");
      return;
    }

    if (!passwordInput || passwordInput.length < 6) {
      setOtpError("Please create a password with at least 6 characters.");
      return;
    }

    // Rate Limiting on Signups
    const rate = checkRateLimit(`landing_signup_${cleanEmail}`, 4, 120000);
    if (!rate.allowed) {
      setOtpError(`Security limit reached: Please wait ${rate.waitSeconds} seconds before trying to register again.`);
      return;
    }

    // Human Verification Check
    if (!captchaToken) {
      setOtpError("Please complete the reCAPTCHA human verification check before creating an account.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    try {
      // Send real 6-digit email verification code via Gmail SMTP
      await apiPost("/auth/send-otp", {
        phone: phoneDigits,
        email: cleanEmail,
        action: "send",
      });
      setOtpType("email");
      setOtpStage("sent");
      setOtpInput("");
      setResendCooldown(30);
    } catch (e) {
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
      setOtpError(e?.message || "Could not send verification email. Please check your email address and try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Real Google OAuth Handler via Supabase
  const handleGoogleAuth = async () => {
    setOtpError(null);
    setGoogleLoading(true);
    try {
      const target = pendingRole || localStorage.getItem("workhop_pending_role") || "freelancer";
      const intent = authMode === "signup" ? "signup" : "signin";
      localStorage.setItem("workhop_pending_role", target);
      localStorage.setItem("workhop_auth_intent", intent);
      if (areaInput) localStorage.setItem("workhop_user_area", areaInput);
      await supabaseSignInWithGoogle({ intent, role: target });
    } catch (err) {
      console.warn("Failed to launch Google OAuth:", err);
      setOtpError(err?.message || "Could not launch Google Sign-In. Please check your network and try again.");
      setGoogleLoading(false);
    }
  };

  const completeSessionAndRedirect = (target, userData = null) => {
    const roleToUse = userData?.role || target || "freelancer";
    localStorage.removeItem("workhop_pending_role");
    localStorage.setItem("workhop_auth_role", roleToUse);
    if (userData?.phone || phoneDigits) localStorage.setItem("workhop_pro_phone", userData?.phone || phoneDigits);
    if (userData?.area || areaInput) setSavedArea(userData?.area || areaInput);
    if (roleToUse === "employer") {
      if (userData?.company_name || companyInput) {
        localStorage.setItem("workhop_company_name", userData?.company_name || companyInput);
      }
    } else {
      localStorage.removeItem("workhop_company_name");
      localStorage.removeItem("workhop_employer_gst");
    }
    if (userData?.skill || (roleToUse !== "employer" && skillInput)) {
      localStorage.setItem("workhop_pro_skill", userData?.skill || skillInput);
    }

    setPendingRole(null);
    setOtpStage("idle");
    setEmailInput("");
    setPasswordInput("");
    setOtpInput("");
    if (userData?.is_admin || roleToUse === "admin") {
      nav("/admin");
    } else if (roleToUse === "employer") {
      nav("/employer");
    } else {
      nav("/freelancer/jobs");
    }
  };

  const chooseRole = (role) => {
    if (user) {
      if (role === "employer") return nav("/employer");
      if (role === "freelancer") return nav("/freelancer/jobs");
      if (isEmployerUser) return nav("/employer");
      return nav("/freelancer/jobs");
    }
    setAuthModalRole(role);
    setAuthModalMode("signup");
    setAuthModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white">
        <Logo />
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  // ---- Sign-in / Sign-up screen (role chosen, capturing mobile number & details) ----
  if (pendingRole && !user) {
    const employer = pendingRole === "employer";
    return (
      <div className="min-h-screen w-full bg-sand/30 dark:bg-[#101012] p-4 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-5xl border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#18181b] p-6 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#E65A1E] sm:p-10">
          
          {/* Header navigation & Role Toggle Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink dark:border-zinc-700 pb-5">
            <button
              data-testid="login-back-btn"
              onClick={() => {
                localStorage.removeItem("workhop_pending_role");
                setPendingRole(null);
              }}
              className="flex h-10 w-10 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 text-ink dark:text-white hover:bg-sand dark:hover:bg-zinc-700 transition"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Interactive Role Switcher Tabs */}
            <div className="flex items-center gap-2 border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-900 p-1">
              <button
                type="button"
                data-testid="switch-role-employer"
                onClick={() => setPendingRole("employer")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition ${
                  employer ? "bg-ink text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_#E65A1E]" : "bg-transparent text-ink dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                }`}
              >
                <Users size={14} />
                <span>🏢 I'M HIRING</span>
              </button>
              <button
                type="button"
                data-testid="switch-role-freelancer"
                onClick={() => setPendingRole("freelancer")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition ${
                  !employer ? "bg-brand text-white shadow-[2px_2px_0px_#121212]" : "bg-transparent text-ink dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                }`}
              >
                <Briefcase size={14} />
                <span>🛠️ LOOKING FOR A JOB</span>
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left Col: Info & USP (5 Cols) */}
            <div className="flex flex-col justify-between lg:col-span-5" data-testid="login-header">
              <div>
                <Logo />
                <div className="mt-8">
                  <span className={`inline-block px-3 py-1 text-[10px] font-black tracking-widest text-white uppercase ${employer ? "bg-ink dark:bg-zinc-800" : "bg-brand"}`}>
                    {employer ? "Employer / Client Account" : "Freelancer / Job Seeker Account"}
                  </span>
                  <h2 className="mt-3 whitespace-pre-line text-3xl sm:text-4xl font-black leading-[1.05] tracking-[-0.02em] text-ink dark:text-white">
                    {authMode === "signup" ? (employer ? "Create account to\nstart hiring." : "Create account to\nland gigs.") : "Welcome back.\nSign in."}
                  </h2>
                  <div className="mt-3 h-1.5 w-20 bg-brand" />
                  <p className="mt-5 text-sm leading-6 text-inkmuted dark:text-zinc-400">
                    {employer
                      ? "One account to unlock verified local pros in your block, post custom jobs and chat with candidates in real-time."
                      : "One account to apply to high-paying gigs in your 5km neighborhood, chat with employers and keep 100% of your earnings."}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-900 p-4">
                <p className="text-xs font-black tracking-wider text-ink dark:text-white">✨ YOUR NEXT LOCAL GIG, ONE MINUTE AWAY</p>
                <p className="mt-1 text-xs text-inkmuted dark:text-zinc-400">
                  Hyperlocal verified network · Direct phone numbers · Real-time GPS distance matching
                </p>
              </div>
            </div>

            {/* Right Col: Details & Mobile Number Signup Form (7 Cols) */}
            <div className="flex flex-col justify-center border-t-2 border-ink dark:border-zinc-700 pt-6 lg:border-l-2 lg:border-t-0 lg:pl-10 lg:pt-0 lg:col-span-7">
              
              {/* Prominent Sign In vs Sign Up Tabs */}
              <div className="flex border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-900 p-1 mb-5">
                <button
                  type="button"
                  data-testid="landing-tab-signin"
                  onClick={() => {
                    setAuthMode("signin");
                    setOtpError(null);
                    setOtpStage("idle");
                  }}
                  className={`flex-1 py-2 text-xs font-black tracking-wider transition ${
                    authMode === "signin"
                      ? "bg-ink text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_#121212]"
                      : "bg-transparent text-ink dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                  }`}
                >
                  🔐 SIGN IN (EXISTING USER)
                </button>
                <button
                  type="button"
                  data-testid="landing-tab-signup"
                  onClick={() => {
                    setAuthMode("signup");
                    setOtpError(null);
                    setOtpStage("idle");
                  }}
                  className={`flex-1 py-2 text-xs font-black tracking-wider transition ${
                    authMode === "signup"
                      ? "bg-brand text-white !text-white shadow-[2px_2px_0px_#121212]"
                      : "bg-transparent text-ink dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                  }`}
                >
                  ✨ SIGN UP (NEW USER)
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                
                {authMode === "signup" && (
                  <>
                    {/* Full Name */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                        Full Name *
                      </label>
                      <div className="mt-1 flex items-center border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                        <User size={16} className="text-inkmuted dark:text-zinc-400 mr-2 shrink-0" />
                        <input
                          data-testid="login-name-input"
                          value={nameInput}
                          onChange={(e) => { setNameInput(e.target.value); setOtpError(null); }}
                          placeholder={employer ? "e.g. Aarav Sharma / TechStudio Lead" : "e.g. Priya Sundaram"}
                          className="wh-input flex-1 bg-transparent text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted/60 dark:placeholder:text-zinc-500"
                        />
                      </div>
                    </div>

                    {/* 10-Digit Mobile Phone Number */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                          10-Digit Mobile Phone Number *
                        </label>
                        <span className={`text-[10px] font-bold ${
                          isPhoneValid
                            ? "text-emerald-600"
                            : phoneDigits.length > 0
                            ? "text-red-500"
                            : "text-brand"
                        }`}>
                          {isPhoneValid
                            ? "✓ Valid 10-digit Indian Mobile"
                            : phoneDigits.length > 0
                            ? "⚠️ Starts with 6, 7, 8, or 9 (10 digits)"
                            : "Required: 10 digits (6-9xxxxxxxxx)"}
                        </span>
                      </div>
                      <div className={`mt-1 flex items-center border-2 ${
                        isPhoneValid
                          ? "border-emerald-600 bg-emerald-50/20"
                          : phoneDigits.length > 0 && !isPhoneValid
                          ? "border-red-500 bg-red-50/20"
                          : "border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      } shadow-[2px_2px_0px_#121212]`}>
                        <span className="flex items-center gap-1 border-r-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 px-3 py-2.5 text-xs font-black text-ink dark:text-zinc-200">
                          🇮🇳 +91
                        </span>
                        <input
                          data-testid="login-phone-input"
                          type="tel"
                          maxLength={10}
                          value={phoneInput}
                          onChange={(e) => {
                            setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10));
                            setOtpError(null);
                          }}
                          placeholder="98765 43210"
                          className="wh-input flex-1 bg-transparent px-3 py-2.5 text-sm font-black tracking-wider text-ink dark:text-white placeholder:tracking-normal placeholder:font-normal placeholder:text-inkmuted/60 dark:placeholder:text-zinc-500"
                        />
                      </div>
                    </div>

                    {/* Hyperlocal Area & GPS Selector */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                          Your Neighborhood / Area in Bengaluru *
                        </label>
                        <button
                          type="button"
                          data-testid="login-gps-btn"
                          onClick={handleDetectGps}
                          className="flex items-center gap-1 text-[10px] font-extrabold text-brand hover:underline"
                        >
                          <LocateFixed size={12} className={locStatus === "locating" ? "animate-spin" : ""} />
                          <span>{locStatus === "locating" ? "Locating GPS…" : "📍 Detect Live GPS"}</span>
                        </button>
                      </div>
                      <div className="mt-1 flex items-center border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-[2px_2px_0px_#121212]">
                        <MapPin size={16} className="text-brand mr-2 shrink-0" />
                        <select
                          data-testid="login-area-select"
                          value={areaInput}
                          onChange={(e) => {
                            setAreaInput(e.target.value);
                            setGpsNotice(null);
                          }}
                          className="wh-input flex-1 bg-transparent text-xs sm:text-sm font-black text-ink dark:text-white dark:bg-zinc-900 focus:outline-none"
                        >
                          {BENGALURU_AREAS.map((a) => (
                            <option key={a.name} value={a.name} className="dark:bg-zinc-900 text-black dark:text-white">
                              {a.name} ({a.zone} Bengaluru)
                            </option>
                          ))}
                        </select>
                      </div>
                      {gpsNotice && (
                        <p
                          className={`mt-1.5 text-[11px] font-bold p-1.5 border rounded ${
                            gpsNotice.type === "success"
                              ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : gpsNotice.type === "outside"
                              ? "text-amber-800 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                              : "text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800"
                          }`}
                        >
                          {gpsNotice.text}
                        </p>
                      )}
                    </div>

                    {/* Role-Specific Field: Company Name (Employer) OR Primary Skill (Freelancer) */}
                    {employer ? (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                          Company / Organization Name (Optional)
                        </label>
                        <div className="mt-1 flex items-center border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                          <Building2 size={16} className="text-inkmuted dark:text-zinc-400 mr-2 shrink-0" />
                          <input
                            data-testid="login-company-input"
                            value={companyInput}
                            onChange={(e) => setCompanyInput(e.target.value)}
                            placeholder="e.g. BrewBox Cafe / LedgerLite Studio"
                            className="wh-input flex-1 bg-transparent text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted/60 dark:placeholder:text-zinc-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                          Primary Skill / Trade *
                        </label>
                        <div className="mt-1 flex items-center border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                          <Sparkles size={16} className="text-brand mr-2 shrink-0" />
                          <input
                            data-testid="login-skill-input"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="e.g. Logo & Visual Designer, React Developer"
                            className="wh-input flex-1 bg-transparent text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted/60 dark:placeholder:text-zinc-500"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                      Email Address *
                    </label>
                    {cleanEmail ? (
                      <span className={`text-[10px] font-bold ${isEmailValid ? "text-emerald-600" : "text-red-500"}`}>
                        {isEmailValid ? "✓ Valid email format" : "⚠️ Active email required"}
                      </span>
                    ) : null}
                  </div>
                  <div className={`mt-1 flex items-center border-2 ${
                    isEmailValid
                      ? "border-emerald-600 bg-emerald-50/20"
                      : cleanEmail && !isEmailValid
                      ? "border-red-500 bg-red-50/20"
                      : "border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  } px-3 py-2.5 shadow-[2px_2px_0px_#121212]`}>
                    <Mail size={16} className={isEmailValid ? "text-emerald-600 mr-2 shrink-0" : "text-inkmuted dark:text-zinc-400 mr-2 shrink-0"} />
                    <input
                      data-testid="login-email-input"
                      type="email"
                      value={emailInput}
                      onChange={(e) => { setEmailInput(e.target.value); setOtpError(null); }}
                      placeholder="you@example.com"
                      className="wh-input flex-1 bg-transparent text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted/60 dark:placeholder:text-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                    {authMode === "signup" ? "Create Password (Min 6 chars) *" : "Password *"}
                  </label>
                  <div className="mt-1 flex items-center border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                    <KeyRound size={16} className="text-inkmuted dark:text-zinc-400 mr-2 shrink-0" />
                    <input
                      data-testid="login-password-input"
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => { setPasswordInput(e.target.value); setOtpError(null); }}
                      placeholder={authMode === "signup" ? "Create a secure password" : "Enter your password"}
                      className="wh-input flex-1 bg-transparent text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted/60 dark:placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-inkmuted dark:text-zinc-400 hover:text-ink dark:hover:text-white focus:outline-none ml-2"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Dedicated OTP Verification Card */}
                {otpStage === "sent" ? (
                  <div data-testid="otp-block" className="border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-900 p-4 shadow-[4px_4px_0px_#121212] animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-brand text-white text-sm font-black shrink-0">
                        ✉️
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                          Email Verification Code
                        </p>
                        <p className="text-[11px] text-inkmuted dark:text-zinc-400 font-semibold">
                          We sent a 6-digit verification code to <strong className="text-brand underline">{cleanEmail}</strong>. Please check your inbox.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex h-12 items-center gap-2 border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 shadow-[2px_2px_0px_#121212]">
                      <KeyRound size={18} className="text-brand shrink-0" />
                      <input
                        data-testid="login-otp-input"
                        value={otpInput}
                        onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
                        placeholder="Enter 6-digit code"
                        className="wh-input flex-1 bg-transparent text-lg font-black tracking-[0.35em] text-ink dark:text-white placeholder:tracking-normal placeholder:font-bold placeholder:text-sm placeholder:text-inkmuted/50 dark:placeholder:text-zinc-500"
                        autoFocus
                      />
                    </div>

                    <button
                      data-testid="login-otp-verify-btn"
                      onClick={verifyOtp}
                      disabled={otpLoading || otpInput.trim().length !== 6}
                      className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-brand py-3.5 text-sm font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
                    >
                      {otpLoading ? <Loader2 size={18} className="animate-spin" /> : "VERIFY CODE & ACTIVATE ACCOUNT"}
                    </button>

                    <div className="mt-3 flex items-center justify-between border-t border-ink/10 dark:border-zinc-800 pt-2.5 text-xs">
                      <button
                        data-testid="login-otp-change-email"
                        onClick={() => { setOtpStage("idle"); setOtpError(null); }}
                        className="font-bold text-brand hover:underline"
                      >
                        ← Edit details / email
                      </button>
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || otpLoading}
                        onClick={handleResendOtp}
                        className="font-bold text-ink dark:text-zinc-300 hover:text-brand hover:underline disabled:opacity-50"
                      >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code to inbox"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 mt-2">
                    
                    {/* Recaptcha Widget */}
                    <RecaptchaWidget
                      onVerify={(tok) => {
                        setCaptchaToken(tok);
                        setOtpError(null);
                      }}
                      onExpire={() => setCaptchaToken(null)}
                      resetTrigger={captchaReset}
                      className="my-1"
                    />

                    {/* Primary Submit Button */}
                    <button
                      type="button"
                      data-testid="login-submit-btn"
                      disabled={otpLoading}
                      onClick={authMode === "signup" ? handleSignUp : handleSignIn}
                      className={`flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 py-3.5 text-sm font-black text-white shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${
                        employer ? "bg-ink dark:bg-zinc-800 hover:bg-black dark:hover:bg-zinc-700" : "bg-brand hover:opacity-95"
                      }`}
                    >
                      {otpLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <span>
                            {authMode === "signup"
                              ? employer
                                ? "Complete & Start Hiring"
                                : "Complete & Find Gigs"
                              : "SIGN IN WITH PASSWORD"}
                          </span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    {/* Email OTP Verification */}
                    <button
                      data-testid="login-email-btn"
                      onClick={requestOtp}
                      disabled={otpLoading}
                      className="flex items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 text-xs font-black text-ink dark:text-white hover:bg-sand dark:hover:bg-zinc-800 disabled:opacity-60 transition"
                    >
                      {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> {authMode === "signin" ? "Sign In with Email OTP instead" : "Verify with Email OTP"}</>}
                    </button>

                    <div className="my-1 flex items-center gap-3">
                      <div className="h-0.5 flex-1 bg-ink/15 dark:bg-white/10" />
                      <span className="text-[10px] font-black tracking-widest text-inkmuted dark:text-zinc-400">OR</span>
                      <div className="h-0.5 flex-1 bg-ink/15 dark:bg-white/10" />
                    </div>

                    {/* Google Continue */}
                    <button
                      type="button"
                      data-testid="login-google-btn"
                      onClick={handleGoogleAuth}
                      disabled={googleLoading}
                      className="flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 py-3 text-xs font-black tracking-wider text-ink dark:text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
                    >
                      {googleLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-brand" />
                          <span>Connecting to Google...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>
                            {authMode === "signup"
                              ? "Sign Up with Google (Fast & Verified)"
                              : "Sign In with Google"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {otpError && (
                  <p data-testid="login-error-msg" className="text-xs font-black text-[#C62828] bg-red-50 dark:bg-rose-950/40 p-2.5 border border-red-200 dark:border-rose-800">
                    ⚠️ {otpError}
                  </p>
                )}

                {/* Clear switch footer: "Not signed up? Sign up now" or "Already have an account? Sign in" */}
                <div className="mt-4 border-2 border-dashed border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-900/60 p-3.5 text-center">
                  {authMode === "signin" ? (
                    <p className="text-xs text-ink dark:text-zinc-200 font-bold">
                      Not signed up yet?{" "}
                      <button
                        type="button"
                        data-testid="landing-switch-to-signup"
                        onClick={() => {
                          setAuthMode("signup");
                          setOtpError(null);
                          setOtpStage("idle");
                        }}
                        className="font-black text-brand underline underline-offset-4 hover:text-ink dark:hover:text-white transition ml-1"
                      >
                        Sign up now to enter your details →
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-ink dark:text-zinc-200 font-bold">
                      Already have an account?{" "}
                      <button
                        type="button"
                        data-testid="landing-switch-to-signin"
                        onClick={() => {
                          setAuthMode("signin");
                          setOtpError(null);
                          setOtpStage("idle");
                        }}
                        className="font-black text-brand underline underline-offset-4 hover:text-ink dark:hover:text-white transition ml-1"
                      >
                        Sign in with your email &amp; password →
                      </button>
                    </p>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main Public Landing View (Default) ----
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-sand/30 font-sans text-ink">
      <BroadcastBanner />
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b-2 border-ink bg-white dark:bg-[#121212] transition-colors">
        <div className="mx-auto flex h-[64px] sm:h-[76px] w-full max-w-[1600px] items-center justify-between gap-1.5 xs:gap-2 sm:gap-4 px-2 xs:px-3 sm:px-6 xl:px-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <Logo size="header" />
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-3.5 2xl:gap-6 shrink-0" data-testid="landing-nav-tabs">
            {(() => {
              const uRole = user ? (user.role || localStorage.getItem("workhop_auth_role") || "freelancer").toLowerCase() : null;
              const isEmp = Boolean(user && (uRole?.includes("employ") || uRole?.includes("client")));
              const isFree = Boolean(user && !isEmp);
              return [
                { label: "EXPLORE PROS", path: "/employer", testId: "nav-pros", forRole: "employer" },
                { label: "FIND GIGS", path: "/freelancer/jobs", testId: "nav-gigs", forRole: "freelancer" },
                { label: "LIVE MAP", path: "/map", testId: "nav-map" },
                { label: "CATEGORIES", path: "/categories", testId: "nav-categories" },
                { label: "REVIEWS", path: "/reviews", testId: "nav-reviews" },
                { label: "PLANS", path: isFree ? "/plans?tab=freelancer" : "/employer/plans", testId: "nav-plans" },
              ].filter((link) => {
                if (!user) return true;
                if (link.forRole === "employer") return isEmp;
                if (link.forRole === "freelancer") return isFree;
                return true;
              }).map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={link.testId}
                  className="whitespace-nowrap px-1 py-1.5 text-xs font-black tracking-wide text-ink dark:text-stone-300 transition-colors hover:text-brand hover:underline decoration-2 underline-offset-8 decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {link.label}
                </Link>
              ));
            })()}
          </nav>

          {/* Right Actions: Theme Toggle + Auth */}
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Dark / Light Mode Toggle */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center border-2 border-ink bg-sand dark:bg-[#222] text-ink dark:text-white shadow-[1px_1px_0px_#121212] sm:shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333] transition active:translate-y-0.5 hover:bg-stone/30 shrink-0"
            >
              {isDark ? <Sun size={14} className="text-brand" /> : <Moon size={14} className="text-ink dark:text-white" />}
            </button>

            {user ? (
              <div className="inline-flex h-9 sm:h-10 items-center border-2 border-ink divide-x-2 divide-ink bg-white dark:bg-[#1a1a1a] shadow-[1px_1px_0px_#121212] sm:shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333] shrink-0">
                <button
                  data-testid="user-chip"
                  onClick={() => nav("/profile")}
                  title={user.name || user.email}
                  className="flex h-full items-center gap-1 xs:gap-1.5 px-2 sm:px-3 hover:bg-sand dark:hover:bg-[#252525] text-xs font-black text-ink dark:text-white transition"
                >
                  <UserCircle2 size={14} className="text-brand shrink-0" />
                  <span className="truncate text-[10px] xs:text-[11px] sm:text-xs font-black max-w-[60px] xs:max-w-[85px] sm:max-w-[110px] xl:max-w-[140px] block">
                    {user.name || user.email?.split("@")[0]}
                  </span>
                  <ArrowRight size={13} className="text-inkmuted dark:text-stone-400 shrink-0 hidden sm:block" />
                </button>
                <button
                  data-testid="logout-btn"
                  onClick={logout}
                  title="Sign Out of WorkHop"
                  className="flex h-full items-center gap-1 px-2 sm:px-2.5 bg-[#C62828] text-white hover:bg-red-700 transition text-[9px] xs:text-[10px] sm:text-[11px] font-black uppercase whitespace-nowrap"
                >
                  <LogOut size={12} />
                  <span>SIGN OUT</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0">
                <button
                  data-testid="landing-signin-btn"
                  onClick={() => {
                    setAuthModalMode("signin");
                    setAuthModalOpen(true);
                  }}
                  className="flex h-9 sm:h-10 items-center border-2 border-ink dark:border-[#555] bg-white dark:bg-[#1a1a1a] px-2 xs:px-2.5 sm:px-3.5 text-[10px] xs:text-[11px] sm:text-xs font-black tracking-wide text-[#121212] dark:text-white hover:bg-sand dark:hover:bg-[#222] transition shadow-[1px_1px_0px_#121212] sm:shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333] whitespace-nowrap shrink-0"
                >
                  SIGN IN
                </button>
                <button
                  data-testid="landing-signup-btn"
                  onClick={() => {
                    setAuthModalMode("signup");
                    setAuthModalOpen(true);
                  }}
                  className="flex h-9 sm:h-10 items-center border-2 border-ink dark:border-white bg-[#121212] px-2 xs:px-2.5 sm:px-3.5 text-[10px] xs:text-[11px] sm:text-xs font-black tracking-wide !text-white hover:bg-black transition shadow-[1px_1px_0px_#121212] sm:shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#E65A1E] whitespace-nowrap shrink-0"
                  style={{ color: "#FFFFFF" }}
                >
                  <span className="!text-white font-black" style={{ color: "#FFFFFF" }}>
                    SIGN UP
                  </span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              data-testid="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex xl:hidden h-9 w-9 sm:h-10 sm:w-10 items-center justify-center border-2 border-ink bg-white dark:bg-[#222] text-ink dark:text-white shadow-[1px_1px_0px_#121212] sm:shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333] shrink-0"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t-2 border-ink bg-white dark:bg-[#181818] p-4 xl:hidden animate-in slide-in-from-top-2">
            {/* User Account / Sign Out in Mobile Drawer */}
            {user ? (
              <div className="mb-3 border-2 border-ink bg-[#FFF4ED] dark:bg-[#251710] p-3 shadow-[2px_2px_0px_#121212] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-ink dark:text-white">{user.name || user.email}</p>
                  <p className="text-[10px] font-bold text-inkmuted dark:text-stone-400 capitalize">{user.role || "Member"} · Signed In</p>
                </div>
                <button
                  data-testid="drawer-logout-btn"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 border-2 border-ink bg-[#C62828] text-white px-3 py-1.5 text-xs font-black uppercase shadow-[1px_1px_0px_#121212] hover:bg-red-700 shrink-0"
                >
                  <LogOut size={13} />
                  <span>SIGN OUT</span>
                </button>
              </div>
            ) : (
              <div className="mb-3 border-2 border-ink bg-sand dark:bg-[#222] p-3 shadow-[2px_2px_0px_#121212] flex items-center justify-between gap-2">
                <span className="text-xs font-black text-ink dark:text-white">Account Access</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalMode("signin");
                      setAuthModalOpen(true);
                    }}
                    className="border-2 border-ink bg-white px-3 py-1 text-xs font-black text-ink shadow-[1px_1px_0px_#121212]"
                  >
                    SIGN IN
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalMode("signup");
                      setAuthModalOpen(true);
                    }}
                    className="border-2 border-ink bg-ink text-white px-3 py-1 text-xs font-black shadow-[1px_1px_0px_#121212]"
                  >
                    SIGN UP
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400 tracking-wider">
                Explore WorkHop
              </span>
              {(() => {
                const uRole = user ? (user.role || localStorage.getItem("workhop_auth_role") || "freelancer").toLowerCase() : null;
                const isEmp = Boolean(user && (uRole?.includes("employ") || uRole?.includes("client")));
                const isFree = Boolean(user && !isEmp);
                return [
                  { label: "EXPLORE PROS", path: "/employer", forRole: "employer" },
                  { label: "FIND GIGS", path: "/freelancer/jobs", forRole: "freelancer" },
                  { label: "LIVE MAP", path: "/map" },
                  { label: "CATEGORIES", path: "/categories" },
                  { label: "REVIEWS", path: "/reviews" },
                  { label: "PLANS", path: isFree ? "/plans?tab=freelancer" : "/employer/plans" },
                ].filter((link) => {
                  if (!user) return true;
                  if (link.forRole === "employer") return isEmp;
                  if (link.forRole === "freelancer") return isFree;
                  return true;
                }).map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between border-2 border-ink bg-sand dark:bg-[#222] p-2.5 text-xs font-black text-ink dark:text-white hover:bg-white"
                  >
                    <span>{link.label}</span>
                    <ArrowRight size={14} className="text-brand" />
                  </Link>
                ));
              })()}
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          1. HERO SECTION — Short Headline, 2 CTAs & 5 km Radar Map + Floating UI
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="w-full border-b-2 border-ink bg-white dark:bg-[#121212] px-4 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-16 xl:px-20 overflow-hidden">
        {/* Quick Direct Workspace Bar if already authenticated */}
        {user && (
          <div className="mx-auto max-w-7xl mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-[#FFF3E9] dark:bg-[#251710] px-4 py-3 shadow-[3px_3px_0px_#121212]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-brand text-white">
                <Sparkles size={16} />
              </span>
              <p className="text-xs sm:text-sm font-black text-ink dark:text-white">
                Welcome back, {user.name || "Member"}!
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isEmployerUser ? (
                <button
                  data-testid="quick-employer-btn"
                  onClick={() => nav("/employer")}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-ink bg-ink text-white px-4 py-2 text-xs font-black shadow-[2px_2px_0px_#121212]"
                >
                  <Users size={14} />
                  <span>OPEN EMPLOYER WORKSPACE</span>
                </button>
              ) : (
                <button
                  data-testid="quick-freelancer-btn"
                  onClick={() => nav("/freelancer/jobs")}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-ink bg-brand text-white px-4 py-2 text-xs font-black shadow-[2px_2px_0px_#121212]"
                >
                  <Briefcase size={14} />
                  <span>OPEN FREELANCER WORKSPACE</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Short Headline + 1-Line Subtext + 2 CTAs */}
          <div className="lg:col-span-6 text-left">
            <div className="inline-flex items-center gap-2 border-2 border-ink bg-[#FFF3C4] px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_#121212]">
              <span className="h-2 w-2 rounded-full bg-ok animate-pulse shrink-0" />
              <span>5 KM GEOFENCED MARKETPLACE · BENGALURU</span>
            </div>

            <h1 className="mt-4 text-4xl xs:text-5xl sm:text-6xl xl:text-[64px] font-black leading-[1.04] tracking-tight text-ink dark:text-white">
              Hire or find gigs within <span className="text-brand">5 km.</span>
            </h1>

            <p className="mt-4 max-w-lg text-sm sm:text-base lg:text-lg font-medium leading-relaxed text-inkmuted dark:text-stone-300">
              Verified local freelancers and live gigs on your block — instant direct chat, zero middlemen, 0% commission.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                data-testid="role-freelancer-card"
                onClick={() => chooseRole("freelancer")}
                className="flex items-center justify-center gap-2 border-2 border-ink bg-brand px-6 py-3.5 sm:px-7 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <span>Find work nearby</span>
                <ArrowRight size={17} />
              </button>

              <a
                href="#how-it-works"
                className="flex items-center justify-center gap-2 border-2 border-ink bg-sand dark:bg-[#1E1E22] px-5 py-3.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-ink dark:text-white shadow-[4px_4px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <span>How it works</span>
              </a>
            </div>

            {/* Secondary Role Switch Pill for Employers */}
            <div className="mt-5 flex flex-wrap items-center gap-2 pt-2">
              <Link
                to="/employer"
                data-testid="role-employer-card"
                className="group inline-flex items-center gap-2 border border-ink/30 dark:border-white/20 bg-[#E5F8EE] px-3.5 py-2 text-xs font-black text-black transition hover:border-ink"
              >
                <Building2 size={14} className="text-ok shrink-0" />
                <span>Hiring talent? Browse verified pros within 5 km</span>
                <ArrowRight size={13} className="text-black transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Clean Youngster with Laptop + Subtle Neighborhood Hop Animation (Inspired by Workhoppers) */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="relative w-full max-w-[540px] border-2 border-ink bg-sand/60 dark:bg-[#1a1a1e] p-6 sm:p-8 shadow-[6px_6px_0px_#121212] overflow-hidden">
              
              {/* Top Neighborhood Badge */}
              <div className="flex items-center justify-between border-b-2 border-ink/15 dark:border-white/10 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-ok animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-ink dark:text-white">
                    Bengaluru Hyperlocal · 5km Radius
                  </span>
                </div>
                <span className="border border-ink bg-[#FFF3C4] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_#121212]">
                  Direct Hires · 0% Cut
                </span>
              </div>

              {/* Youngster with Laptop Real Photo Composition + Animated City Hop Trail */}
              <div className="relative aspect-[4/3] w-full flex items-center justify-center rounded-sm bg-gradient-to-b from-[#FFFDF9] to-[#F5EFE6] dark:from-[#18181C] dark:to-[#101012] border-2 border-ink dark:border-zinc-700 overflow-hidden shadow-inner">
                
                {/* Background Subtle City Skyline Line Art */}
                <svg
                  viewBox="0 0 460 320"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  aria-label="Neighborhood skyline with hop trail"
                >
                  <defs>
                    <linearGradient id="hopperTrail" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00A86B" />
                      <stop offset="100%" stopColor="#E65A1E" />
                    </linearGradient>
                  </defs>

                  {/* Bengaluru Startup Skyline Dotted Silhouette */}
                  <g stroke="#D4D4D8" dark-stroke="#3F3F46" strokeWidth="1.5" fill="none" opacity="0.6">
                    {/* Building 1 (Startup Office) */}
                    <rect x="20" y="145" width="45" height="145" />
                    <line x1="30" y1="165" x2="55" y2="165" />
                    <line x1="30" y1="185" x2="55" y2="185" />
                    <line x1="30" y1="205" x2="55" y2="205" />
                    {/* Building 2 (Co-working Tower) */}
                    <rect x="75" y="115" width="55" height="175" fill="#E5F8EE" fillOpacity="0.45" stroke="#00A86B" />
                    <circle cx="102" cy="142" r="9" stroke="#00A86B" strokeWidth="1.5" />
                    {/* Building 3 & 4 (Tech Park) */}
                    <rect x="140" y="165" width="40" height="125" />
                    <rect x="190" y="195" width="45" height="95" />
                    {/* Ground line */}
                    <line x1="10" y1="290" x2="450" y2="290" stroke="#121212" strokeWidth="2" />
                  </g>

                  {/* Playful Animated Hop Arc connecting local business to youngster */}
                  <path
                    d="M 102 115 Q 185 35 285 130"
                    fill="none"
                    stroke="#E65A1E"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    className="animate-pulse"
                  />
                  {/* Little Grasshopper / Hop Icon on the building top */}
                  <g transform="translate(95, 96)">
                    <circle cx="7" cy="7" r="9" fill="#00A86B" />
                    <text x="3" y="11" fill="#FFFFFF" fontSize="11" fontWeight="bold">⚡</text>
                  </g>
                </svg>

                {/* Actual Person with Laptop (Warm Youngster with Laptop) + Subtle Breathing Float Animation */}
                <div className="absolute right-3 sm:right-6 bottom-0 z-10 flex items-end justify-center pointer-events-none select-none">
                  <img
                    src="/hero/youngster_laptop.png"
                    alt="Young freelance pro working on a laptop in Bengaluru"
                    className="wh-breathe-subtle h-[225px] sm:h-[265px] w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                    loading="eager"
                  />
                </div>

                {/* Floating Skill Badge 1 (Figma & UI/UX) */}
                <div className="wh-float-1 absolute top-3 left-3 z-20 max-w-[190px] border-2 border-ink bg-[#FFF3C4] p-2 sm:p-2.5 shadow-[3px_3px_0px_#121212]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-black">
                      UI/UX &amp; Figma Pro
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold text-black/80">
                    Koramangala · <span className="text-brand font-black">0.8 km away</span>
                  </p>
                </div>

                {/* Floating Skill Badge 2 (Live Gig Alert) */}
                <div className="wh-float-2 absolute bottom-3 left-3 z-20 border-2 border-ink bg-[#E5F8EE] px-3 py-1.5 shadow-[3px_3px_0px_#121212] flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-white font-black text-[10px]">
                    ✓
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase text-black leading-tight">
                      ₹15,000 Gig Live
                    </p>
                    <p className="text-[9px] font-bold text-black/70">
                      Indiranagar · Apply in 1 Tap
                    </p>
                  </div>
                </div>

                {/* Floating Skill Badge 3 (Direct WhatsApp & Chat) */}
                <div className="wh-float-3 absolute top-3 right-3 z-20 border-2 border-ink bg-white dark:bg-zinc-800 px-3 py-1.5 shadow-[3px_3px_0px_#121212] flex items-center gap-1.5">
                  <span className="text-xs">💬</span>
                  <p className="text-[10px] font-black uppercase text-ink dark:text-white">
                    Direct Chat · 0% Fee
                  </p>
                </div>
              </div>

              {/* Bottom Quick Hubs Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-black text-inkmuted dark:text-zinc-400">
                <span>POPULAR HUBS:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Koramangala", "Indiranagar", "HSR Layout", "Whitefield"].map((hub) => (
                    <span key={hub} className="border border-ink/20 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-300 bg-white/80 dark:bg-zinc-800">
                      📍 {hub}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. MARQUEE BELT (TASK 1) — Seamless Infinite Horizontal Belt
          ═══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="WorkHop platform highlights"
        className="wh-marquee-belt w-full border-b-2 border-ink py-2 sm:py-3 select-none"
      >
        <div className="wh-marquee-mask w-full overflow-hidden">
          <div className="wh-marquee-track items-center">
            {[0, 1].map((loopIdx) => (
              <div
                key={loopIdx}
                aria-hidden={loopIdx === 1 ? "true" : undefined}
                className="flex shrink-0 items-center"
              >
                {[
                  "Hyperlocal Gigs",
                  "Within 5 km",
                  "Verified Freelancers",
                  "Secure Escrow Payments",
                  "Instant Chat",
                  "AI & Smart Automations",
                  "Reviews You Can Trust",
                  "Zero Commute Hiring",
                  "Keep 100% Earnings",
                ].map((item) => (
                  <div key={`${loopIdx}-${item}`} className="flex shrink-0 items-center">
                    <span className="wh-marquee-item px-3 sm:px-5 lg:px-6 text-xs sm:text-sm lg:text-[15px] font-black uppercase tracking-wider whitespace-nowrap">
                      {item}
                    </span>
                    {/* 4-Point Star / Sparkle Separator in Muted Tone */}
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="wh-marquee-star h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 opacity-70"
                      fill="currentColor"
                    >
                      <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                    </svg>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. HOW IT WORKS — 3 Visual Step Cards in a Row (Max 1 Short Line Each)
          ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="border-b-2 border-ink bg-[#FAFAF8] dark:bg-[#141416] py-10 sm:py-16 px-4 sm:px-10 lg:px-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-brand">
                HOW IT WORKS
              </span>
              <h2 className="mt-1 text-2xl sm:text-4xl font-black text-ink dark:text-white tracking-tight">
                From pin drop to payout in 3 steps.
              </h2>
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
              AVERAGE MATCH TIME: &lt; 5 MINS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Step 1 */}
            <div className="group border-2 border-ink bg-white dark:bg-[#1C1C20] overflow-hidden shadow-[4px_4px_0px_#121212] flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-[6px_6px_0px_#121212]">
              {/* Graphic Art */}
              <div className="w-full bg-[#FAF7F2] dark:bg-[#151518] border-b-2 border-ink overflow-hidden aspect-[4/3] flex items-center justify-center p-2">
                <img
                  src="/steps/step1_art.png"
                  alt="Step 1: Post or find a job within 5km"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-[11px] font-black text-brand">
                      STEP 01
                    </span>
                    <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">HYPERLOCAL 5KM</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-ink dark:text-white">
                    Post or find a job
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm font-medium text-inkmuted dark:text-stone-300">
                    Drop your pin or browse verified local gigs within 5 km of your block.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-ink/10 dark:border-white/10 flex items-center gap-2 text-[11px] font-black text-brand">
                  <LocateFixed size={13} />
                  <span>KORAMANGALA · HSR · INDIRANAGAR + MORE</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group border-2 border-ink bg-white dark:bg-[#1C1C20] overflow-hidden shadow-[4px_4px_0px_#121212] flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-[6px_6px_0px_#121212]">
              {/* Graphic Art */}
              <div className="w-full bg-[#FAF7F2] dark:bg-[#151518] border-b-2 border-ink overflow-hidden aspect-[4/3] flex items-center justify-center p-2">
                <img
                  src="/steps/step2_art.png"
                  alt="Step 2: Chat and agree via instant WhatsApp & call"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-[11px] font-black text-brand">
                      STEP 02
                    </span>
                    <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">DIRECT CONNECT</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-ink dark:text-white">
                    Chat &amp; agree
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm font-medium text-inkmuted dark:text-stone-300">
                    Unlock direct phone &amp; WhatsApp to align on project scope in minutes.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-ink/10 dark:border-white/10 flex items-center gap-2 text-[11px] font-black text-ok">
                  <PhoneCall size={13} />
                  <span>INSTANT CALL · DIRECT WHATSAPP</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group border-2 border-ink bg-white dark:bg-[#1C1C20] overflow-hidden shadow-[4px_4px_0px_#121212] flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-[6px_6px_0px_#121212]">
              {/* Graphic Art */}
              <div className="w-full bg-[#FAF7F2] dark:bg-[#151518] border-b-2 border-ink overflow-hidden aspect-[4/3] flex items-center justify-center p-2">
                <img
                  src="/steps/step3_art.png"
                  alt="Step 3: Get paid securely with 0% commission"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-[11px] font-black text-brand">
                      STEP 03
                    </span>
                    <span className="text-[10px] font-bold text-brand">0% COMMISSION</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-ink dark:text-white">
                    Get paid securely
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm font-medium text-inkmuted dark:text-stone-300">
                    Settle via milestone escrow or direct UPI with zero commission deductions.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-ink/10 dark:border-white/10 flex items-center gap-2 text-[11px] font-black text-brand">
                  <Lock size={13} />
                  <span>KEEP 100% OF YOUR EARNINGS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. CATEGORIES — Compact Pill Chips (Inspired by Browse by Category)
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b-2 border-ink bg-white dark:bg-[#121212] py-6 sm:py-8 px-4 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          {/* Header Row with Sparkle */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand shrink-0" />
                <h2 className="text-lg sm:text-2xl font-black text-ink dark:text-white tracking-tight">
                  Browse by category
                </h2>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm font-medium text-inkmuted dark:text-stone-400">
                Find the exact kind of local talent your business needs within 5 km
              </p>
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-brand hover:underline decoration-2 underline-offset-4"
            >
              <span>View all 45+ specializations</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Compact Category Pills (Horizontal scroll on mobile, flex wrap on desktop) */}
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar flex-nowrap sm:flex-wrap">
            {[
              { label: "Design & Architecture", slug: "graphics-design", Icon: Palette, emoji: "🎨", color: "bg-[#FFF3C4]" },
              { label: "Tech & Code", slug: "programming-tech", Icon: Code2, emoji: "💻", color: "bg-[#E5F8EE]" },
              { label: "Digital Marketing", slug: "digital-marketing", Icon: Megaphone, emoji: "📣", color: "bg-[#FCE4EC]" },
              { label: "Video & Motion", slug: "video-animation", Icon: Video, emoji: "🎬", color: "bg-[#E0F7FA]" },
              { label: "AI & Automations", slug: "ai-smart-automations", Icon: Cpu, emoji: "⚡", color: "bg-[#FFEAA0]" },
              { label: "Writing & Copy", slug: "writing-translation", Icon: PenTool, emoji: "✍️", color: "bg-[#F3E5F5]" },
              { label: "Music & Audio", slug: "music-audio", Icon: Music, emoji: "🎵", color: "bg-[#FFF8E7]" },
              { label: "Business & Ops", slug: "business", Icon: Briefcase, emoji: "💼", color: "bg-[#E8F5E9]" },
              { label: "Hyperlocal Field", slug: "hyperlocal-specialized", Icon: Compass, emoji: "📍", color: "bg-[#D8F3DC]" },
            ].map(({ label, slug, Icon, color }) => (
              <button
                key={slug}
                type="button"
                data-testid={`cat-tile-${slug}`}
                onClick={() => nav(`/categories?discipline=${encodeURIComponent(slug)}`)}
                className="group inline-flex items-center gap-2 border-2 border-ink/80 dark:border-zinc-700 bg-white dark:bg-[#1A1A1E] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-black text-ink dark:text-white rounded-full shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none hover:border-brand hover:text-brand whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border border-ink ${color} text-black shrink-0 transition group-hover:scale-110`}>
                  <Icon size={13} className="text-black" />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          5. FEATURE HIGHLIGHTS — 3 Alternating Visual Mockup + Short Copy Blocks
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b-2 border-ink bg-[#F4F1EA] dark:bg-[#18181c] py-12 sm:py-18 px-4 sm:px-10 lg:px-16 transition-colors">
        <div className="mx-auto max-w-7xl space-y-10 sm:space-y-14">
          {/* Highlight 1: 5 km Hyperlocal Map Match (Visual Left, Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-6 border-2 border-ink bg-white dark:bg-[#1C1C21] p-5 sm:p-6 shadow-[4px_4px_0px_#121212]">
              <div className="flex items-center justify-between border-b border-ink/10 dark:border-white/10 pb-3 mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-brand">
                  NEARBY VERIFIED PROS · &lt; 2 KM
                </span>
                <span className="bg-[#E5F8EE] border border-ink px-2 py-0.5 text-[10px] font-black text-black">
                  LIVE GPS FILTER
                </span>
              </div>
              <div className="space-y-2.5">
                {(featuredPros.slice(0, 3).length > 0
                  ? featuredPros.slice(0, 3)
                  : [
                      { name: "Cobblestone Designs", skill: "Architecture & Interior Design", area: "Indiranagar · 0.7 km", rate_hr: 1200 },
                      { name: "Karthik Raja", skill: "UI/UX & Product Design", area: "Indiranagar · 0.8 km", rate_hr: 850 },
                      { name: "Sneha Rao", skill: "Brand Identity & Packaging", area: "Koramangala · 1.2 km", rate_hr: 750 },
                    ]
                ).map((pro, idx) => (
                  <div
                    key={pro.id || idx}
                    onClick={() => nav(`/employer?q=${encodeURIComponent(pro.name)}`)}
                    className="flex items-center justify-between gap-3 border-2 border-ink bg-[#FAFAF8] dark:bg-[#242429] p-3 cursor-pointer transition hover:border-brand"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink bg-brand text-xs font-black text-white">
                        {(pro.initials || (pro.name || "VP").slice(0, 2)).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-ink dark:text-white truncate">
                          {pro.name}
                        </p>
                        <p className="text-[11px] font-bold text-brand truncate">
                          {pro.skill}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block bg-[#FFF3C4] border border-ink px-2 py-0.5 text-[10px] font-black text-black">
                        📍 {pro.area || "1.1 km"}
                      </span>
                      <p className="mt-1 text-[11px] font-black text-ink dark:text-white">
                        ₹{pro.rate_hr || 800}/hr
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 lg:pl-4">
              <span className="inline-block border border-ink bg-[#FFF3C4] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                5 KM GEOFENCE MATCHING
              </span>
              <h3 className="mt-3 text-2xl sm:text-4xl font-black leading-tight text-ink dark:text-white">
                Talent on your street, not across timezones.
              </h3>
              <p className="mt-3 max-w-lg text-sm sm:text-base font-medium leading-relaxed text-inkmuted dark:text-stone-300 line-clamp-2">
                Filter verified pros and urgent gigs within 5 km of your pin — meet over coffee or kick off remotely in minutes.
              </p>
            </div>
          </div>

          {/* Highlight 2: Escrow & Hops Wallet (Text Left, Visual Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <span className="inline-block border border-ink bg-[#E5F8EE] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                ZERO PLATFORM CUT
              </span>
              <h3 className="mt-3 text-2xl sm:text-4xl font-black leading-tight text-ink dark:text-white">
                Protected escrow &amp; 100% take-home pay.
              </h3>
              <p className="mt-3 max-w-lg text-sm sm:text-base font-medium leading-relaxed text-inkmuted dark:text-stone-300 line-clamp-2">
                Bid transparently with Hops (1 Hop = ₹15) and lock milestone funds safely — freelancers keep every rupee earned.
              </p>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 border-2 border-ink bg-white dark:bg-[#1C1C21] p-5 sm:p-6 shadow-[4px_4px_0px_#121212]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="border-2 border-ink bg-[#E5F8EE] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-black">ESCROW VAULT</span>
                    <ShieldCheck size={16} className="text-ok" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-black">₹28,000</p>
                  <p className="mt-1 text-[11px] font-bold text-black/80">
                    Milestone Locked · Auto-Releases on Approval
                  </p>
                </div>

                <div className="border-2 border-ink bg-[#FFF3C4] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-black">PLATFORM CUT</span>
                    <Wallet size={16} className="text-brand" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-brand">₹0 (0%)</p>
                  <p className="mt-1 text-[11px] font-bold text-black/80">
                    100% Direct Payout · 1 Hop = ₹15 Bidding
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Highlight 3: Direct Chat & Instant Call (Visual Left, Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-6 border-2 border-ink bg-white dark:bg-[#1C1C21] p-5 sm:p-6 shadow-[4px_4px_0px_#121212]">
              <div className="flex items-center justify-between border-b border-ink/10 dark:border-white/10 pb-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center border border-ink bg-ok text-xs font-black text-white">
                    SR
                  </span>
                  <div>
                    <p className="text-xs font-black text-ink dark:text-white">
                      Sneha Rao · <span className="text-ok">Verified Pro</span>
                    </p>
                    <p className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                      Koramangala 4th Block · 0.9 km away
                    </p>
                  </div>
                </div>
                <span className="bg-brand px-2.5 py-1 text-[10px] font-black uppercase text-white flex items-center gap-1">
                  <PhoneCall size={11} /> CALL READY
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="border border-ink/20 bg-sand dark:bg-[#25252B] p-2.5 font-medium text-ink dark:text-white">
                  &ldquo;Hey! Saw your packaging brief. I’m 5 mins from Third Wave Koramangala — free for a quick call?&rdquo;
                </div>
                <div className="border border-brand/40 bg-brand/10 dark:bg-brand/20 p-2.5 font-bold text-ink dark:text-white flex items-center justify-between">
                  <span>✓ Direct WhatsApp &amp; Phone Unlocked</span>
                  <span className="text-[10px] font-black uppercase text-brand">4.9 ★ (34 Gigs)</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 lg:pl-4">
              <span className="inline-block border border-ink bg-[#FFEAA0] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                INSTANT DIRECT CHAT
              </span>
              <h3 className="mt-3 text-2xl sm:text-4xl font-black leading-tight text-ink dark:text-white">
                Direct WhatsApp &amp; phone in one click.
              </h3>
              <p className="mt-3 max-w-lg text-sm sm:text-base font-medium leading-relaxed text-inkmuted dark:text-stone-300 line-clamp-2">
                Skip gatekept ticket queues — unlock verified phone numbers, chat live, and check real neighborhood reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          6. TRUST / STATS STRIP — Big Numbers + Tiny Labels
          NOTE: Placeholder numbers below are clearly marked for easy updating.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b-2 border-ink bg-[#FFF3E9] dark:bg-[#19130E] py-8 sm:py-10 px-4 sm:px-10 lg:px-16">
        {/* PLACEHOLDER STATS — Update the numbers in the array below anytime */}
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "5 km", label: "Hyperlocal Match Radius", highlight: false },
            { value: "50+", label: "Local Gigs Completed", highlight: false },
            { value: "4.9 ★", label: "Verified Client Rating", highlight: true },
            { value: "0%", label: "Platform Commission", highlight: false },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center">
              <p
                className={`text-3xl sm:text-5xl font-black tracking-tight ${
                  stat.highlight ? "text-brand" : "text-ink dark:text-white"
                }`}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-inkmuted dark:text-stone-300">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          7. FINAL CTA BANNER + CLEAN FOOTER
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b-2 border-ink bg-[#121212] text-white py-12 sm:py-16 px-4 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-block bg-brand px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white">
            READY IN 60 SECONDS
          </span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-white">
            Your next gig or hire is <span className="text-brand">within 5 km.</span>
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => chooseRole("freelancer")}
              className="flex items-center gap-2 border-2 border-white bg-brand px-7 py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_#ffffff] transition hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <span>Find work nearby</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => chooseRole("employer")}
              className="flex items-center gap-2 border-2 border-white bg-ink px-7 py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_#E65A1E] transition hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <span>Hire local talent</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Full-Featured Global Site Footer */}
      <SiteFooter />
      <MobileBottomNav />

      {/* Auth Modal for Global Direct Sign-in / Sign-up */}
      <AuthModal
        isOpen={authModalOpen}
        initialRole={authModalRole}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />

    </div>
  );
}
