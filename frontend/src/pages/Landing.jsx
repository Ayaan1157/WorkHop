import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Mail, KeyRound, ArrowRight, LogOut, UserCircle2, Loader2,
  MapPin, ShieldCheck, Zap, Sparkles, PlusCircle, CheckCircle, Navigation, Users, Briefcase,
  User, Building2, LocateFixed, CheckCircle2, Eye, EyeOff, Sun, Moon, Menu, X, Star
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
import GoogleAccountPicker from "@/components/GoogleAccountPicker";
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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googlePickerOpen, setGooglePickerOpen] = useState(false);
  const [googleAccount, setGoogleAccount] = useState(null);

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
    const target = pendingRole || localStorage.getItem("workhop_pending_role") || "employer";
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

    // Google Sign-Up Path: Already verified by Google!
    if (googleConnected) {
      setOtpLoading(true);
      setOtpError(null);
      try {
        const payload = {
          email: cleanEmail,
          password: passwordInput || "google-auth-verified",
          role: target,
          name: cleanName,
          phone: phoneDigits,
          phone_verified: true,
          email_verified: true,
          google_verified: true,
          area: areaInput,
          company_name: target === "employer" ? (cleanCompany || cleanName || undefined) : undefined,
          skill: target !== "employer" ? (cleanSkill || undefined) : undefined,
        };

        await apiPost("/users", payload).catch(() => {});
        resetRateLimit(`landing_signup_${cleanEmail}`);
        const session = await signupWithDetails(payload);
        completeSessionAndRedirect(target, session?.user);
      } catch (e) {
        setOtpError(e?.message || "Failed to complete Google sign-up.");
      } finally {
        setOtpLoading(false);
      }
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

  // Google Continue Handler - Opens Account Picker
  const handleGoogleAuth = () => {
    setOtpError(null);
    setGooglePickerOpen(true);
  };

  // Called when user selects a Google account from the picker
  const handleSelectGoogleAccount = async (account) => {
    const target = pendingRole || localStorage.getItem("workhop_pending_role") || "freelancer";
    const googleEmail = (account.email || "").trim().toLowerCase();
    const googleName = account.name;
    
    setEmailInput(googleEmail);
    setNameInput(googleName);
    setGoogleConnected(true);
    setGoogleAccount(account);
    setOtpError(null);

    // If in signin mode, check if account exists first!
    if (authMode === "signin") {
      setOtpLoading(true);
      try {
        if (!isEmailRegistered(googleEmail)) {
          setOtpError("Email not found. Please register first.");
          setAuthMode("signup");
          setOtpLoading(false);
          return;
        }
        const session = await login(googleEmail, googleName);
        const resolvedRole = session?.user?.role || target || "freelancer";
        completeSessionAndRedirect(resolvedRole, session?.user);
      } catch (e) {
        setOtpError(e?.message || "Google sign-in failed.");
      } finally {
        setOtpLoading(false);
      }
      return;
    }

    // If in signup mode, prompt for required mobile number and neighborhood
    if (!isPhoneValid || !areaInput) {
      setOtpError(`✓ Google account linked (${googleEmail})! Please enter your 10-digit mobile number and neighborhood below to finish registration.`);
    }
  };

  const completeSessionAndRedirect = (target, userData = null) => {
    const roleToUse = userData?.role || target || "freelancer";
    localStorage.removeItem("workhop_pending_role");
    localStorage.setItem("workhop_auth_role", roleToUse);
    if (userData?.phone || phoneDigits) localStorage.setItem("workhop_pro_phone", userData?.phone || phoneDigits);
    if (userData?.area || areaInput) setSavedArea(userData?.area || areaInput);
    if (userData?.company_name || (roleToUse === "employer" && companyInput)) {
      localStorage.setItem("workhop_company_name", userData?.company_name || companyInput);
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
                
                {/* Google Connected Badge with Switch Account Option */}
                {googleConnected && (
                  <div className="flex items-center justify-between border-2 border-ink dark:border-zinc-700 bg-[#FFF3E9] dark:bg-amber-950/30 p-2.5 shadow-[2px_2px_0px_#E65A1E]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                        {googleAccount?.initials || "G"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-ink dark:text-white">
                          ✓ Google Linked: <strong className="text-brand">{emailInput}</strong>
                        </span>
                        <span className="text-[10px] font-semibold text-inkmuted dark:text-zinc-400">
                          Signed in as {nameInput || "Google User"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="landing-switch-google-acc"
                      onClick={() => setGooglePickerOpen(true)}
                      className="border border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-[10px] font-black text-ink dark:text-white hover:bg-sand dark:hover:bg-zinc-700 transition"
                    >
                      Switch Account
                    </button>
                  </div>
                )}
                
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
                    {googleConnected ? (
                      <span className="text-[10px] font-bold text-emerald-600">
                        ✓ Google Verified
                      </span>
                    ) : cleanEmail ? (
                      <span className={`text-[10px] font-bold ${isEmailValid ? "text-emerald-600" : "text-red-500"}`}>
                        {isEmailValid ? "✓ Valid email format" : "⚠️ Active email required"}
                      </span>
                    ) : null}
                  </div>
                  <div className={`mt-1 flex items-center border-2 ${
                    googleConnected || isEmailValid
                      ? "border-emerald-600 bg-emerald-50/20"
                      : cleanEmail && !isEmailValid
                      ? "border-red-500 bg-red-50/20"
                      : "border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  } px-3 py-2.5 shadow-[2px_2px_0px_#121212]`}>
                    <Mail size={16} className={googleConnected || isEmailValid ? "text-emerald-600 mr-2 shrink-0" : "text-inkmuted dark:text-zinc-400 mr-2 shrink-0"} />
                    <input
                      data-testid="login-email-input"
                      type="email"
                      readOnly={googleConnected}
                      value={emailInput}
                      onChange={(e) => { setEmailInput(e.target.value); setOtpError(null); }}
                      placeholder="you@example.com"
                      className="wh-input flex-1 bg-transparent text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted/60 dark:placeholder:text-zinc-500 focus:outline-none"
                    />
                    {googleConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          setGoogleConnected(false);
                          setGoogleAccount(null);
                        }}
                        className="ml-2 text-[10px] font-black text-brand underline whitespace-nowrap"
                      >
                        Change
                      </button>
                    )}
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
                          We sent a 6-digit verification code to <strong className="text-brand underline">{cleanEmail}</strong>. Please check your inbox (and spam folder).
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
                      className="flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 py-3 text-xs font-black tracking-wider text-ink dark:text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{authMode === "signup" ? "Continue with Google (Details Required)" : "Continue with Google"}</span>
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

        {/* Google Account Selector Dialog */}
        <GoogleAccountPicker
          isOpen={googlePickerOpen}
          onClose={() => setGooglePickerOpen(false)}
          onSelectAccount={handleSelectGoogleAccount}
          currentEmail={emailInput}
        />
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

      {/* Hero Section (Edge-to-Edge) */}
      <section className="w-full border-b-2 border-ink bg-white dark:bg-[#121212] px-4 py-8 sm:px-10 lg:px-16 xl:px-20">
        
        {/* Quick Direct Workspace Shortcut Bar if already authenticated */}
        {user && (
          <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-[#FFF3E9] dark:bg-[#251710] p-3.5 sm:p-4 shadow-[3px_3px_0px_#121212]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center border-2 border-ink bg-brand text-white">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-black text-ink dark:text-white">Welcome back, {user.name || "Member"}!</p>
                <p className="text-[10px] sm:text-[11px] text-inkmuted dark:text-stone-400">
                  {isEmployerUser
                    ? "Your Employer Workspace · View and hire verified local experts"
                    : "Your Freelancer Workspace · Apply to active gigs and chat with employers"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {isEmployerUser ? (
                <button
                  data-testid="quick-employer-btn"
                  onClick={() => nav("/employer")}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-ink bg-ink text-white px-4 py-2 text-xs font-black shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  <Users size={14} />
                  <span>🏢 GO TO EMPLOYER SITE</span>
                </button>
              ) : (
                <button
                  data-testid="quick-freelancer-btn"
                  onClick={() => nav("/freelancer/jobs")}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-ink bg-brand text-white px-4 py-2 text-xs font-black shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  <Briefcase size={14} />
                  <span>💼 GO TO FREELANCER SITE</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="max-w-4xl">
          <div className="inline-flex max-w-full items-center gap-1.5 sm:gap-2 border-2 border-ink bg-sand dark:bg-[#222] px-2.5 sm:px-3 py-1 text-[9.5px] xs:text-[10px] sm:text-xs font-black tracking-wider">
            <span className="h-2 w-2 rounded-full bg-ok animate-pulse shrink-0" />
            <span className="truncate">YOUR NEXT LOCAL GIG, ONE MINUTE AWAY · BENGALURU</span>
          </div>
          <h1 className="mt-4 text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.06] tracking-tight text-ink dark:text-white">
            Pick a side.<br />Get to work.
          </h1>
          <div className="mt-3 h-1.5 w-20 sm:w-28 bg-brand" />
          <p className="mt-4 max-w-2xl text-sm sm:text-lg leading-relaxed text-inkmuted dark:text-stone-300">
            <span className="font-extrabold text-ink dark:text-white">Your next local gig, one minute away.</span> Connect with top-rated, portfolio-verified professionals within 5km. Direct chats, instant hires.
          </p>
        </div>

        {/* Dual Action Cards Stretching Full Width */}
        <div className={`mt-8 sm:mt-12 grid grid-cols-1 gap-5 sm:gap-8 ${user ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
          
          {/* Employer Card: Shown if not logged in OR if logged in as Employer */}
          {(!user || isEmployerUser) && (
            <button
              data-testid="role-employer-card"
              onClick={() => chooseRole("employer")}
              className="group border-2 border-ink bg-white dark:bg-[#1a1a1a] p-4 sm:p-8 lg:p-10 text-left shadow-[4px_4px_0px_#121212] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-y-1"
            >
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <span className="bg-brand px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-black tracking-[0.1em] text-white">
                  I'M HIRING (EMPLOYER)
                </span>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center border-2 border-ink bg-sand dark:bg-[#2a2a2a] group-hover:bg-brand group-hover:text-white transition">
                  <ArrowRight size={20} className="text-ink dark:text-white group-hover:text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight text-black dark:text-white">
                Find 5 verified experts on your block
              </p>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-black dark:text-white/80 font-semibold">
                Unlock direct phone numbers and full verified portfolios of top designers, developers, videographers, and creators near you.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-ink/20 dark:border-white/20 pt-4 text-xs font-black text-brand">
                <span>One-time unlock from ₹199</span>
                <span>•</span>
                <span>Instant Call &amp; Chat</span>
              </div>
            </button>
          )}

          {/* Freelancer Card: Shown if not logged in OR if logged in as Freelancer */}
          {(!user || isFreelancerUser) && (
            <button
              data-testid="role-freelancer-card"
              onClick={() => chooseRole("freelancer")}
              className="group border-2 border-ink bg-brand p-4 sm:p-8 lg:p-10 text-left shadow-[4px_4px_0px_#121212] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-y-1"
            >
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <span className="bg-ink px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-black tracking-[0.1em] text-white">
                  I'M LOOKING FOR GIGS (FREELANCER)
                </span>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center border-2 border-white bg-white/10 group-hover:bg-ink transition">
                  <ArrowRight size={20} className="text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight text-white">
                Apply to 200+ gigs within 5km of you
              </p>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/95 font-semibold">
                Direct chat with Bengaluru employers looking for immediate hires. Zero middlemen, keep 100% earnings.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/20 pt-4 text-xs font-extrabold text-white">
                <span>Hyperlocal 5km Matching</span>
                <span>•</span>
                <span>Direct Client Payments (0% Fee)</span>
              </div>
            </button>
          )}

        </div>
      </section>

      {/* Featured AI & Smart Automations Strip / Banner */}
      <section className="border-b-2 border-ink bg-[#121212] text-white px-4 py-5 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center border-2 border-white bg-brand text-white shadow-[2px_2px_0px_#ffffff]">
              <Sparkles className="h-8 w-8 sm:h-9 sm:w-9 animate-pulse" strokeWidth={2.3} />
            </span>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="bg-[#FFE082] !text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                  style={{ color: "#000000" }}
                >
                  NEW CATEGORY
                </span>
                <span className="text-[11px] font-bold text-stone-400">TRENDING IN BENGALURU</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight whitespace-nowrap">
                AI &amp; Smart Automations
              </h2>
            </div>
          </div>

          {/* 5 Quick Sub-Tags - all visible at once without horizontal scrolling */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap xl:flex-nowrap items-stretch sm:items-center gap-2">
            {[
              {
                title: "AI Video & Reels",
                sub: "Avatars, UGC Ads",
                query: "AI UGC & Reel Generation",
              },
              {
                title: "AI Graphic & 3D",
                sub: "Midjourney & 3D",
                query: "AI Product & Studio Photography",
              },
              {
                title: "Automations & Bots",
                sub: "Bots & Workflows",
                query: "No-Code Workflow Automation",
              },
              {
                title: "AI Content & SEO",
                sub: "Prompts & Copy",
                query: "AI Content Humanization & SEO Polishing",
              },
              {
                title: "Coding with AI",
                sub: "Scripts & Bug Fixes",
                query: "Custom Vibe Coding, Scripts & Web Fixes",
              },
            ].map((tag, idx) => (
              <button
                key={tag.title}
                type="button"
                onClick={() => nav(isEmployerUser ? `/employer?q=${encodeURIComponent(tag.query)}` : `/freelancer/jobs?q=${encodeURIComponent(tag.query)}`)}
                className={`group flex flex-col justify-center text-left border-2 border-white/80 bg-white/5 hover:bg-brand hover:border-brand px-2.5 py-2 sm:py-1.5 transition shadow-[2px_2px_0px_rgba(255,255,255,0.4)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer sm:shrink-0 ${
                  idx === 4 ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <div className="flex items-center justify-between sm:justify-start gap-1">
                  <span className="text-xs font-black text-white group-hover:text-white leading-tight">
                    {tag.title}
                  </span>
                  <ArrowRight size={11} className="text-brand group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
                </div>
                <span className="text-[10px] text-stone-300 font-medium group-hover:text-white/90 leading-tight mt-0.5">
                  {tag.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Live Metrics Strip */}
      <section className="border-b-2 border-ink dark:border-zinc-800 bg-[#FFF3E9] dark:bg-[#1a140f] py-6 sm:py-8 px-4 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4 text-center items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-2xl sm:text-4xl font-black text-black dark:text-white">5 KM</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333] dark:text-stone-300">Hyperlocal Radius</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-2xl sm:text-4xl font-black text-black dark:text-white">200+</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333] dark:text-stone-300">Active Bengaluru Gigs</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-2xl sm:text-4xl font-black text-brand">100%</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333] dark:text-stone-300">Keep Your Earnings</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-2xl sm:text-4xl font-black text-black dark:text-white">1 MIN</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333] dark:text-stone-300">Fast Onboarding</p>
          </div>
        </div>
      </section>

      {/* Feature Value Props */}
      <section className="border-b-2 border-ink bg-white dark:bg-[#121212] py-10 sm:py-16 px-4 sm:px-10 lg:px-16">
        <div className="max-w-3xl">
          <span className="text-xs font-black uppercase tracking-widest text-brand">WHY WORKHOP</span>
          <h2 className="mt-1 text-2xl sm:text-4xl font-black text-ink dark:text-white">Built specifically for high-speed local collaborations</h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <div className="border-2 border-ink bg-sand/50 dark:bg-[#1c1c1c] p-5 sm:p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-brand text-white font-black text-sm">
              1
            </div>
            <h3 className="mt-3 text-base sm:text-lg font-black text-ink dark:text-white">VERIFIED TALENT</h3>
            <p className="mt-1.5 text-xs leading-5 text-inkmuted dark:text-stone-400">
              Every freelancer is verified with email, Aadhaar, and live portfolios.
            </p>
          </div>

          <div className="border-2 border-ink bg-sand/50 dark:bg-[#1c1c1c] p-5 sm:p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-ink dark:bg-[#2a2a2a] text-white dark:!text-white font-black text-sm">
              2
            </div>
            <h3 className="mt-3 text-base sm:text-lg font-black text-ink dark:text-white">DIRECT CONTACT</h3>
            <p className="mt-1.5 text-xs leading-5 text-inkmuted dark:text-stone-400">
              Unlock direct mobile numbers and start chatting on WhatsApp/Phone immediately without waiting.
            </p>
          </div>

          <div className="border-2 border-ink bg-sand/50 dark:bg-[#1c1c1c] p-5 sm:p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-ok text-white font-black text-sm">
              3
            </div>
            <h3 className="mt-3 text-base sm:text-lg font-black text-ink dark:text-white">TRANSPARENT PRICING</h3>
            <p className="mt-1.5 text-xs leading-5 text-inkmuted dark:text-stone-400">
              Transparent 1 Hop = ₹15 bidding. Direct client payments with zero platform commission taken from your earnings.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Verified Pros & Talent Showcase */}
      <section className="border-b-2 border-ink bg-white dark:bg-[#121212] py-12 sm:py-16 px-4 sm:px-10 lg:px-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b-2 border-ink dark:border-white/10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-ok/40 bg-ok/10 dark:bg-ok/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-ok mb-3">
              <ShieldCheck size={14} className="text-ok" />
              <span>LIVE TALENT POOL · BENGALURU</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-ink dark:text-white leading-tight">
              Meet Verified Local Freelancers Near You
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-inkmuted dark:text-stone-400 font-medium">
              Portfolio-screened, ID-verified creators, developers &amp; marketers active across Bengaluru. Direct WhatsApp chat, zero commission.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/employer"
              className="inline-flex items-center gap-2 border-2 border-ink bg-ink text-white dark:bg-brand px-5 py-3 text-xs sm:text-sm font-black uppercase shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <span>EXPLORE ALL FREELANCERS</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Pros Cards Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredPros.map((pro, idx) => (
            <div
              key={pro.id || idx}
              onClick={() => nav(`/employer?q=${encodeURIComponent(pro.name)}`)}
              className="group border-2 border-ink bg-sand/30 dark:bg-[#1a1a1a] p-5 shadow-[3px_3px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-brand text-white font-black text-sm shadow-[1px_1px_0px_#121212]">
                      {pro.initials || (pro.name || "VP").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-black text-ink dark:text-white">{pro.name}</p>
                        <span className="flex items-center gap-0.5 bg-ok/15 text-ok border border-ok px-1.5 py-0.2 text-[9px] font-black">
                          <ShieldCheck size={9} /> VERIFIED
                        </span>
                        {pro.paid && (
                          <span className="flex items-center gap-0.5 bg-[#FFF3C4] text-brand border border-brand px-1.5 py-0.2 text-[9px] font-black">
                            <Sparkles size={9} /> TOP PRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-brand truncate max-w-[200px]">{pro.skill}</p>
                    </div>
                  </div>
                  {Number(pro.reviews_count) > 0 && pro.rating ? (
                    <span className="flex items-center gap-1 border border-ink bg-white dark:bg-zinc-800 px-2 py-0.5 text-xs font-black dark:text-white">
                      <Star size={11} fill="#E65A1E" className="text-brand" /> {pro.rating}
                    </span>
                  ) : (
                    <span className="border border-ink/40 bg-sand/60 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-inkmuted dark:text-stone-300">
                      No reviews yet
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-inkmuted dark:text-stone-300 font-medium line-clamp-2 leading-relaxed">
                  {pro.intro}
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] font-bold text-inkmuted dark:text-stone-400">
                  <span className="border border-ink/20 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px]">
                    📍 {pro.area || "Bengaluru"}
                  </span>
                  <span className="border border-ink/20 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px]">
                    ₹{pro.rate_hr}/hr
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-ink/10 flex items-center justify-between text-xs font-black text-brand group-hover:text-ink dark:group-hover:text-white transition">
                <span>VIEW PROFILE &amp; CONTACT</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Community Reviews Section */}
      <section id="reviews" className="border-b-2 border-ink bg-[#FAFAF8] dark:bg-[#151515] py-12 sm:py-16 px-4 sm:px-10 lg:px-16 transition-colors">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b-2 border-ink dark:border-white/10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-brand/40 bg-brand/10 dark:bg-brand/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-brand mb-3">
              <Star size={14} fill="#E65A1E" className="text-brand" />
              <span>VERIFIED BENGALURU REVIEWS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-ink dark:text-white leading-tight">
              Real gigs. Real founders. Real Bangalore talent.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-inkmuted dark:text-stone-400 font-medium">
              Over 1,400+ gigs completed across Indiranagar, Koramangala, HSR Layout, and Whitefield with a 4.9★ rating.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/reviews"
              className="inline-flex items-center gap-2 border-2 border-ink bg-brand px-5 py-3 text-xs sm:text-sm font-black uppercase text-white shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
            >
              <span>VIEW ALL 1,400+ REVIEWS</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* 3 Featured Review Cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          
          {/* Card 1 */}
          <div className="border-2 border-ink bg-white dark:bg-[#1C1C1C] p-6 shadow-[3px_3px_0px_#121212] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="#E65A1E" className="text-brand" />
                  ))}
                </div>
                <span className="border border-green-600 bg-green-500/10 dark:bg-green-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-green-700 dark:text-green-400">
                  VERIFIED GIG
                </span>
              </div>
              
              <h4 className="text-sm font-black text-ink dark:text-white">
                "Delivered ahead of schedule. Pixel-perfect Tailwind &amp; flawless mobile responsiveness."
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                Outstanding communication on WhatsApp. Escrow milestone settlement was released instantly upon sign-off.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-black text-ink dark:text-white">Siddharth Rao</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">UrbanKrafts • Indiranagar (0.8km)</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-brand">₹28,000</span>
                  <p className="text-[10px] text-stone-400">Escrow Settled</p>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 bg-sand dark:bg-[#252525] p-2 border border-ink/20">
                Worked with: <span className="font-bold text-ink dark:text-stone-200">Karthik Raja</span> (UI/UX)
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="border-2 border-ink bg-white dark:bg-[#1C1C1C] p-6 shadow-[3px_3px_0px_#121212] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="#E65A1E" className="text-brand" />
                  ))}
                </div>
                <span className="border border-brand/40 bg-brand/10 dark:bg-brand/20 px-2 py-0.5 text-[10px] font-black uppercase text-brand">
                  0% PLATFORM FEE
                </span>
              </div>
              
              <h4 className="text-sm font-black text-ink dark:text-white">
                "Super responsive and understands the Bengaluru cafe aesthetic perfectly."
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                Sent 3 strong creative directions within 24 hours. Settled directly via UPI without any platform fee cuts.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-black text-ink dark:text-white">Karan Somani</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">BrewBlock • Koramangala (1.2km)</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-brand">₹16,000</span>
                  <p className="text-[10px] text-stone-400">Direct Pay</p>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 bg-sand dark:bg-[#252525] p-2 border border-ink/20">
                Worked with: <span className="font-bold text-ink dark:text-stone-200">Sneha Rao</span> (Brand Designer)
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="border-2 border-ink bg-white dark:bg-[#1C1C1C] p-6 shadow-[3px_3px_0px_#121212] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="#E65A1E" className="text-brand" />
                  ))}
                </div>
                <span className="border border-green-600 bg-green-500/10 dark:bg-green-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-green-700 dark:text-green-400">
                  VERIFIED GIG
                </span>
              </div>
              
              <h4 className="text-sm font-black text-ink dark:text-white">
                "Accurate architectural dielines and quick kickoff at an HSR Layout cafe."
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                Quick 10-minute kickoff at an HSR cafe to align on elevations. WorkHop's 5km matching made it seamless.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-black text-ink dark:text-white">Anita Jayaram</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">LedgerLite • HSR Layout (1.5km)</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-brand">₹32,000</span>
                  <p className="text-[10px] text-stone-400">Escrow Settled</p>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 bg-sand dark:bg-[#252525] p-2 border border-ink/20">
                Worked with: <span className="font-bold text-ink dark:text-stone-200">Rahul Verma</span> (CAD Drafter)
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="mt-8 border-2 border-ink bg-brand/10 dark:bg-brand/20 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-ink dark:text-white uppercase tracking-wide">
              Have you completed a gig with a Bengaluru freelancer or client?
            </p>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              Leave verified feedback and help build the most transparent hyperlocal network in Bangalore.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/reviews"
              className="border-2 border-ink bg-white dark:bg-[#222] text-ink dark:text-white px-4 py-2.5 text-xs font-black uppercase hover:bg-stone-100 transition shadow-[2px_2px_0px_#121212]"
            >
              Browse All Reviews
            </Link>
            <Link
              to="/reviews"
              className="border-2 border-ink bg-brand text-white px-4 py-2.5 text-xs font-black uppercase hover:bg-black transition shadow-[2px_2px_0px_#121212]"
            >
              ★ Leave A Review
            </Link>
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
