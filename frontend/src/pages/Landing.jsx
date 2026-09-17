import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Mail, KeyRound, ArrowRight, LogOut, UserCircle2, Loader2,
  MapPin, ShieldCheck, Zap, Sparkles, PlusCircle, CheckCircle, Navigation, Users, Briefcase,
  User, Building2, LocateFixed, CheckCircle2, Eye, EyeOff, Sun, Moon, Menu, X
} from "lucide-react";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { BENGALURU_AREAS, findNearestArea, setSavedArea } from "@/lib/locationAreas";
import { useUserLocation } from "@/hooks/useUserLocation";
import AuthModal from "@/components/AuthModal";
import BroadcastBanner from "@/components/BroadcastBanner";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import GoogleAccountPicker from "@/components/GoogleAccountPicker";
import { Logo } from "@/components/kit";

export default function Landing() {
  const nav = useNavigate();
  const { user, loading, login, logout, adoptSession, signupWithDetails, passwordLoginAuth } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState("freelancer");
  const [authModalMode, setAuthModalMode] = useState("signup");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sign in / Sign up flow state
  const [pendingRole, setPendingRole] = useState(null); // "employer" | "freelancer"
  const [authMode, setAuthMode] = useState("signup"); // "signup" | "signin"

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
  const [otpType, setOtpType] = useState("mobile"); // "mobile" | "email"
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
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

  const phoneDigits = phoneInput.replace(/\D/g, "");
  const isPhoneValid = phoneDigits.length === 10;

  // Request Email OTP (Sign In via Email OTP)
  const requestOtp = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setOtpError("Enter a valid email address.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const data = await apiPost("/auth/email/request-otp", { email });
      setDevOtp(data?.dev_otp || "123456");
      setOtpType("email");
      setOtpStage("sent");
      setOtpInput("");
      setResendCooldown(30);
    } catch {
      setOtpError("Network error. Try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP (Mobile SMS or Email)
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      if (otpType === "mobile") {
        const res = await apiPost("/auth/mobile/request-otp", { phone: phoneDigits, email: emailInput.trim() });
        setDevOtp(res?.dev_otp || String(Math.floor(100000 + Math.random() * 900000)));
        setResendCooldown(30);
      } else {
        await requestOtp();
      }
    } catch {
      setOtpError("Could not resend OTP code.");
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
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanName = sanitizeInput(nameInput);
    const cleanSkill = sanitizeInput(skillInput);
    const cleanCompany = sanitizeInput(companyInput);

    try {
      const payload = {
        email: cleanEmail,
        password: passwordInput,
        otp: otpInput.trim(),
        role: target,
        name: cleanName || undefined,
        phone: phoneDigits || undefined,
        phone_verified: true,
        area: areaInput,
        company_name: target === "employer" ? (cleanCompany || "Hyperlocal Co.") : undefined,
        skill: target !== "employer" ? (cleanSkill || "UI/UX & Brand Designer") : undefined,
      };

      if (otpType === "mobile") {
        const data = await apiPost("/auth/mobile/verify-otp", payload);
        resetRateLimit(`landing_signup_${cleanEmail}`);
        if (data?.session_token && data?.user) {
          await adoptSession(data.session_token, data.user);
          completeSessionAndRedirect(target, data.user);
        } else {
          const session = await signupWithDetails(payload);
          completeSessionAndRedirect(target, session?.user);
        }
      } else {
        const data = await apiPost("/auth/email/verify-otp", payload);
        if (data?.session_token && data?.user) {
          await adoptSession(data.session_token, data.user);
          completeSessionAndRedirect(target, data.user);
        } else {
          const session = await signupWithDetails(payload);
          completeSessionAndRedirect(target, session?.user);
        }
      }
    } catch {
      setOtpError("Invalid verification code. Please check and try again.");
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
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanName = sanitizeInput(nameInput);
    const cleanSkill = sanitizeInput(skillInput);
    const cleanCompany = sanitizeInput(companyInput);

    if (!cleanName) {
      setOtpError("Please enter your full name.");
      return;
    }
    if (!isPhoneValid) {
      setOtpError("Please enter a valid 10-digit mobile phone number.");
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
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setOtpError("Please enter a valid email address.");
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
      // Safety Measure: Request Mobile Phone OTP
      const res = await apiPost("/auth/mobile/request-otp", {
        phone: phoneDigits,
        email: cleanEmail,
      });
      setDevOtp(res?.dev_otp || String(Math.floor(100000 + Math.random() * 900000)));
      setOtpType("mobile");
      setOtpStage("sent");
      setOtpInput("");
      setResendCooldown(30);
    } catch (e) {
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
      setOtpError(e?.message || "Could not send mobile verification code.");
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
    const googleEmail = account.email;
    const googleName = account.name;
    
    setEmailInput(googleEmail);
    setNameInput(googleName);
    setGoogleConnected(true);
    setGoogleAccount(account);
    setOtpError(null);

    // If in signin mode, log in immediately with chosen Google account
    if (authMode === "signin") {
      setOtpLoading(true);
      try {
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
      if (role === "employer") return nav("/employer");
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
      <div className="min-h-screen w-full bg-sand/30 p-4 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-5xl border-2 border-ink bg-white p-6 shadow-[8px_8px_0px_#121212] sm:p-10">
          
          {/* Header navigation & Role Toggle Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink pb-5">
            <button
              data-testid="login-back-btn"
              onClick={() => {
                localStorage.removeItem("workhop_pending_role");
                setPendingRole(null);
              }}
              className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-white hover:bg-sand transition"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Interactive Role Switcher Tabs */}
            <div className="flex items-center gap-2 border-2 border-ink bg-sand p-1">
              <button
                type="button"
                data-testid="switch-role-employer"
                onClick={() => setPendingRole("employer")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition ${
                  employer ? "bg-ink text-white shadow-[2px_2px_0px_#E65A1E]" : "bg-transparent text-ink hover:bg-white"
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
                  !employer ? "bg-brand text-white shadow-[2px_2px_0px_#121212]" : "bg-transparent text-ink hover:bg-white"
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
                  <span className={`inline-block px-3 py-1 text-[10px] font-black tracking-widest text-white uppercase ${employer ? "bg-ink" : "bg-brand"}`}>
                    {employer ? "Employer / Client Account" : "Freelancer / Job Seeker Account"}
                  </span>
                  <h2 className="mt-3 whitespace-pre-line text-3xl sm:text-4xl font-black leading-[1.05] tracking-[-0.02em] text-ink">
                    {authMode === "signup" ? (employer ? "Create account to\nstart hiring." : "Create account to\nland gigs.") : "Welcome back.\nSign in."}
                  </h2>
                  <div className="mt-3 h-1.5 w-20 bg-brand" />
                  <p className="mt-5 text-sm leading-6 text-inkmuted">
                    {employer
                      ? "One account to unlock verified local pros in your block, post custom jobs and chat with candidates in real-time."
                      : "One account to apply to high-paying gigs in your 5km neighborhood, chat with employers and keep 100% of your earnings."}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-2 border-ink bg-sand p-4">
                <p className="text-xs font-black tracking-wider text-ink">✨ YOUR NEXT LOCAL GIG, ONE MINUTE AWAY</p>
                <p className="mt-1 text-xs text-inkmuted">
                  Hyperlocal verified network · Direct phone numbers · Real-time GPS distance matching
                </p>
              </div>
            </div>

            {/* Right Col: Details & Mobile Number Signup Form (7 Cols) */}
            <div className="flex flex-col justify-center border-t-2 border-ink pt-6 lg:border-l-2 lg:border-t-0 lg:pl-10 lg:pt-0 lg:col-span-7">
              
              {/* Prominent Sign In vs Sign Up Tabs */}
              <div className="flex border-2 border-ink bg-sand p-1 mb-5">
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
                      ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                      : "bg-transparent text-ink hover:bg-white"
                  }`}
                >
                  ✨ SIGN UP (NEW USER)
                </button>
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
                      ? "bg-ink text-white shadow-[2px_2px_0px_#121212]"
                      : "bg-transparent text-ink hover:bg-white"
                  }`}
                >
                  🔐 SIGN IN (EXISTING USER)
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                
                {/* Google Connected Badge with Switch Account Option */}
                {googleConnected && (
                  <div className="flex items-center justify-between border-2 border-ink bg-[#FFF3E9] p-2.5 shadow-[2px_2px_0px_#E65A1E]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                        {googleAccount?.initials || "G"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-ink">
                          ✓ Google Linked: <strong className="text-brand">{emailInput}</strong>
                        </span>
                        <span className="text-[10px] font-semibold text-inkmuted">
                          Signed in as {nameInput || "Google User"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="landing-switch-google-acc"
                      onClick={() => setGooglePickerOpen(true)}
                      className="border border-ink bg-white px-2 py-1 text-[10px] font-black text-ink hover:bg-sand transition"
                    >
                      Switch Account
                    </button>
                  </div>
                )}
                
                {authMode === "signup" && (
                  <>
                    {/* Full Name */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                        Full Name *
                      </label>
                      <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                        <User size={16} className="text-inkmuted mr-2 shrink-0" />
                        <input
                          data-testid="login-name-input"
                          value={nameInput}
                          onChange={(e) => { setNameInput(e.target.value); setOtpError(null); }}
                          placeholder={employer ? "e.g. Aarav Sharma / TechStudio Lead" : "e.g. Priya Sundaram"}
                          className="wh-input flex-1 bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60"
                        />
                      </div>
                    </div>

                    {/* 10-Digit Mobile Phone Number */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                          10-Digit Mobile Phone Number *
                        </label>
                        <span className="text-[10px] font-bold text-brand">
                          {isPhoneValid ? "✓ Valid 10 digits" : "Required for WhatsApp/SMS gig alerts"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center border-2 border-ink bg-white shadow-[2px_2px_0px_#121212]">
                        <span className="flex items-center gap-1 border-r-2 border-ink bg-sand px-3 py-2.5 text-xs font-black text-ink">
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
                          className="wh-input flex-1 bg-transparent px-3 py-2.5 text-sm font-black tracking-wider text-ink placeholder:tracking-normal placeholder:font-normal placeholder:text-inkmuted/60"
                        />
                      </div>
                    </div>

                    {/* Hyperlocal Area & GPS Selector */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                          Your Neighborhood / Area in Bengaluru *
                        </label>
                        <button
                          type="button"
                          data-testid="login-gps-btn"
                          onClick={requestLocation}
                          className="flex items-center gap-1 text-[10px] font-extrabold text-brand hover:underline"
                        >
                          <LocateFixed size={12} className={locStatus === "locating" ? "animate-spin" : ""} />
                          <span>{locStatus === "locating" ? "Locating GPS…" : "📍 Detect Live GPS"}</span>
                        </button>
                      </div>
                      <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2 shadow-[2px_2px_0px_#121212]">
                        <MapPin size={16} className="text-brand mr-2 shrink-0" />
                        <select
                          data-testid="login-area-select"
                          value={areaInput}
                          onChange={(e) => setAreaInput(e.target.value)}
                          className="wh-input flex-1 bg-transparent text-xs sm:text-sm font-black text-ink focus:outline-none"
                        >
                          {BENGALURU_AREAS.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.name} ({a.zone} Bengaluru)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Role-Specific Field: Company Name (Employer) OR Primary Skill (Freelancer) */}
                    {employer ? (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                          Company / Organization Name (Optional)
                        </label>
                        <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                          <Building2 size={16} className="text-inkmuted mr-2 shrink-0" />
                          <input
                            data-testid="login-company-input"
                            value={companyInput}
                            onChange={(e) => setCompanyInput(e.target.value)}
                            placeholder="e.g. BrewBox Cafe / LedgerLite Studio"
                            className="wh-input flex-1 bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                          Primary Skill / Trade *
                        </label>
                        <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                          <Sparkles size={16} className="text-brand mr-2 shrink-0" />
                          <input
                            data-testid="login-skill-input"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="e.g. Logo & Visual Designer, React Developer"
                            className="wh-input flex-1 bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Email Address */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                    Email Address *
                  </label>
                  <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                    <Mail size={16} className="text-inkmuted mr-2 shrink-0" />
                    <input
                      data-testid="login-email-input"
                      type="email"
                      value={emailInput}
                      onChange={(e) => { setEmailInput(e.target.value); setOtpError(null); }}
                      placeholder="you@example.com"
                      className="wh-input flex-1 bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                    {authMode === "signup" ? "Create Password (Min 6 chars) *" : "Password *"}
                  </label>
                  <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5 shadow-[2px_2px_0px_#121212]">
                    <KeyRound size={16} className="text-inkmuted mr-2 shrink-0" />
                    <input
                      data-testid="login-password-input"
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => { setPasswordInput(e.target.value); setOtpError(null); }}
                      placeholder={authMode === "signup" ? "Create a secure password" : "Enter your password"}
                      className="wh-input flex-1 bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-inkmuted hover:text-ink focus:outline-none ml-2"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Dedicated OTP Verification Card */}
                {otpStage === "sent" ? (
                  <div data-testid="otp-block" className="border-2 border-ink bg-sand p-4 shadow-[4px_4px_0px_#121212] animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-brand text-white text-sm font-black shrink-0">
                        {otpType === "mobile" ? "📱" : "✉️"}
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-ink">
                          {otpType === "mobile" ? "Mobile Phone OTP Verification" : "Email Verification Code"}
                        </p>
                        <p className="text-[11px] text-inkmuted font-semibold">
                          {otpType === "mobile" ? (
                            <>We sent a 6-digit code to <strong className="text-brand">🇮🇳 +91 {phoneDigits}</strong></>
                          ) : (
                            <>We sent a 6-digit code to <strong className="text-brand">{emailInput.trim()}</strong></>
                          )}
                        </p>
                      </div>
                    </div>

                    {devOtp && (
                      <div data-testid="dev-otp-text" className="mt-3 flex items-center justify-between border-2 border-ink bg-[#FFF3C4] px-3 py-2 text-xs font-black text-ink">
                        <span>TEST MODE — Your 6-digit {otpType === "mobile" ? "Mobile" : "Email"} OTP:</span>
                        <span className="font-mono text-sm tracking-widest text-brand bg-white px-2 py-0.5 border border-ink">
                          {devOtp}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex h-12 items-center gap-2 border-2 border-ink bg-white px-3 shadow-[2px_2px_0px_#121212]">
                      <KeyRound size={18} className="text-inkmuted shrink-0" />
                      <input
                        data-testid="login-otp-input"
                        value={otpInput}
                        onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
                        placeholder="Enter 6-digit code"
                        className="wh-input flex-1 bg-transparent text-lg font-black tracking-[0.35em] text-ink placeholder:tracking-normal placeholder:font-bold placeholder:text-sm placeholder:text-inkmuted/50"
                        autoFocus
                      />
                    </div>

                    <button
                      data-testid="login-otp-verify-btn"
                      onClick={verifyOtp}
                      disabled={otpLoading || otpInput.trim().length !== 6}
                      className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3.5 text-sm font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
                    >
                      {otpLoading ? <Loader2 size={18} className="animate-spin" /> : "VERIFY OTP & ACTIVATE ACCOUNT"}
                    </button>

                    <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2.5 text-xs">
                      <button
                        data-testid="login-otp-change-email"
                        onClick={() => { setOtpStage("idle"); setOtpError(null); }}
                        className="font-bold text-brand hover:underline"
                      >
                        ← Edit details / mobile number
                      </button>
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || otpLoading}
                        onClick={handleResendOtp}
                        className="font-bold text-ink hover:text-brand hover:underline disabled:opacity-50"
                      >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend OTP"}
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
                      className={`flex w-full items-center justify-center gap-2 border-2 border-ink py-3.5 text-sm font-black text-white shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${
                        employer ? "bg-ink hover:bg-black" : "bg-brand hover:opacity-95"
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
                      className="flex items-center justify-center gap-2 border-2 border-ink bg-white py-2.5 text-xs font-black text-ink hover:bg-sand disabled:opacity-60 transition"
                    >
                      {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> {authMode === "signin" ? "Sign In with Email OTP instead" : "Verify with Email OTP"}</>}
                    </button>

                    <div className="my-1 flex items-center gap-3">
                      <div className="h-0.5 flex-1 bg-ink/15" />
                      <span className="text-[10px] font-black tracking-widest text-inkmuted">OR</span>
                      <div className="h-0.5 flex-1 bg-ink/15" />
                    </div>

                    {/* Google Continue */}
                    <button
                      type="button"
                      data-testid="login-google-btn"
                      onClick={handleGoogleAuth}
                      className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-sand py-3 text-xs font-black tracking-wider text-ink shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
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
                  <p data-testid="login-error-msg" className="text-xs font-black text-[#C62828] bg-red-50 p-2.5 border border-red-200">
                    ⚠️ {otpError}
                  </p>
                )}

                {/* Clear switch footer: "Not signed up? Sign up now" or "Already have an account? Sign in" */}
                <div className="mt-4 border-2 border-dashed border-ink bg-sand/60 p-3.5 text-center">
                  {authMode === "signin" ? (
                    <p className="text-xs text-ink font-bold">
                      Not signed up yet?{" "}
                      <button
                        type="button"
                        data-testid="landing-switch-to-signup"
                        onClick={() => {
                          setAuthMode("signup");
                          setOtpError(null);
                          setOtpStage("idle");
                        }}
                        className="font-black text-brand underline underline-offset-4 hover:text-ink transition ml-1"
                      >
                        Sign up now to enter your details →
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-ink font-bold">
                      Already have an account?{" "}
                      <button
                        type="button"
                        data-testid="landing-switch-to-signin"
                        onClick={() => {
                          setAuthMode("signin");
                          setOtpError(null);
                          setOtpStage("idle");
                        }}
                        className="font-black text-brand underline underline-offset-4 hover:text-ink transition ml-1"
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
    <div className="min-h-screen w-full bg-sand/30 font-sans text-ink">
      <BroadcastBanner />
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b-2 border-ink bg-white dark:bg-[#121212] transition-colors">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo size="header" />
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-6" data-testid="landing-nav-tabs">
            {[
              { label: "EXPLORE PROS", path: "/employer", testId: "nav-pros" },
              { label: "FIND GIGS", path: "/freelancer/jobs", testId: "nav-gigs" },
              { label: "LIVE MAP", path: "/map", testId: "nav-map" },
              { label: "CATEGORIES", path: "/categories", testId: "nav-categories" },
              { label: "PLANS", path: "/employer/plans", testId: "nav-plans" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                data-testid={link.testId}
                className="text-xs font-black tracking-wider text-ink dark:text-white transition hover:text-brand hover:underline underline-offset-4"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions: Theme Toggle + Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Dark / Light Mode Toggle */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-sand dark:bg-[#222] text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212] transition active:translate-y-0.5 hover:bg-stone/30"
            >
              {isDark ? <Sun size={16} className="text-brand" /> : <Moon size={16} className="text-ink" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  data-testid="user-chip"
                  onClick={() => nav("/profile")}
                  className="flex items-center gap-2 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 py-2 hover:bg-sand dark:hover:bg-[#222] text-ink dark:text-white"
                >
                  <UserCircle2 size={16} className="text-brand" />
                  <span className="truncate text-xs font-extrabold max-w-[110px]">
                    {user.name || user.email?.split("@")[0]}
                  </span>
                  <ArrowRight size={13} className="text-inkmuted" />
                </button>
                <button
                  data-testid="logout-btn"
                  onClick={logout}
                  className="flex items-center gap-1 border-2 border-ink px-2.5 py-2 hover:bg-sand dark:hover:bg-[#222] text-ink dark:text-white"
                >
                  <LogOut size={14} />
                  <span className="text-[10px] font-black tracking-wider hidden sm:inline">LOGOUT</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  data-testid="landing-signin-btn"
                  onClick={() => {
                    setAuthModalMode("signin");
                    setAuthModalOpen(true);
                  }}
                  className="border-2 border-ink dark:border-[#555] bg-white dark:bg-[#1a1a1a] px-3.5 py-2 text-xs font-black tracking-wider text-[#121212] dark:text-white hover:bg-sand dark:hover:bg-[#222] transition"
                >
                  SIGN IN
                </button>
                <button
                  data-testid="landing-signup-btn"
                  onClick={() => {
                    setAuthModalMode("signup");
                    setAuthModalOpen(true);
                  }}
                  className="border-2 border-ink dark:border-white bg-[#121212] px-3.5 py-2 text-xs font-black tracking-wider text-white hover:bg-black transition shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#E65A1E]"
                >
                  SIGN UP
                </button>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              data-testid="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex lg:hidden h-9 w-9 items-center justify-center border-2 border-ink bg-white dark:bg-[#222] text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212]"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t-2 border-ink bg-white dark:bg-[#181818] p-4 lg:hidden animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400 tracking-wider">
                Explore WorkHop
              </span>
              {[
                { label: "EXPLORE PROS", path: "/employer" },
                { label: "FIND GIGS", path: "/freelancer/jobs" },
                { label: "LIVE MAP", path: "/map" },
                { label: "CATEGORIES", path: "/categories" },
                { label: "PLANS", path: "/employer/plans" },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between border-2 border-ink bg-sand dark:bg-[#222] p-2.5 text-xs font-black text-ink dark:text-white hover:bg-white"
                >
                  <span>{link.label}</span>
                  <ArrowRight size={14} className="text-brand" />
                </Link>
              ))}
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
                <p className="text-[10px] sm:text-[11px] text-inkmuted dark:text-stone-400">Select your workspace to view experts or apply to gigs</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                data-testid="quick-employer-btn"
                onClick={() => nav("/employer")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-ink bg-ink text-white px-3.5 py-2 text-xs font-black shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <Users size={14} />
                <span>🏢 EMPLOYER</span>
              </button>
              <button
                data-testid="quick-freelancer-btn"
                onClick={() => nav("/freelancer/jobs")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-ink bg-brand text-white px-3.5 py-2 text-xs font-black shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <Briefcase size={14} />
                <span>💼 FREELANCER</span>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 border-2 border-ink bg-sand dark:bg-[#222] px-3 py-1 text-[10px] sm:text-xs font-black tracking-wider">
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
        <div className="mt-8 sm:mt-12 grid grid-cols-1 gap-5 sm:gap-8 md:grid-cols-2">
          
          {/* Employer Card */}
          <button
            data-testid="role-employer-card"
            onClick={() => chooseRole("employer")}
            className="group border-2 border-ink bg-white dark:bg-[#1a1a1a] p-5 sm:p-8 lg:p-10 text-left shadow-[4px_4px_0px_#121212] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-y-1"
          >
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <span className="bg-brand px-3 py-1 text-[10px] sm:text-xs font-black tracking-[0.12em] text-white">
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

          {/* Freelancer Card */}
          <button
            data-testid="role-freelancer-card"
            onClick={() => chooseRole("freelancer")}
            className="group border-2 border-ink bg-brand p-5 sm:p-8 lg:p-10 text-left shadow-[4px_4px_0px_#121212] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-y-1"
          >
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <span className="bg-ink px-3 py-1 text-[10px] sm:text-xs font-black tracking-[0.12em] text-white">
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
              <span>Hyperlocal matching</span>
              <span>•</span>
              <span>Same-day payment releases</span>
            </div>
          </button>

        </div>
      </section>

      {/* Trust & Live Metrics Strip */}
      <section className="border-b-2 border-ink bg-[#FFF3E9] py-6 sm:py-8 px-4 sm:px-10 lg:px-16">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          <div>
            <p className="text-2xl sm:text-4xl font-black text-black">5 KM</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333]">Hyperlocal Radius</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-black text-black">200+</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333]">Active Bengaluru Gigs</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-black text-brand">100%</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333]">Keep Your Earnings</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-black text-black">1 MIN</p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#333333]">Fast Onboarding</p>
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
            <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-ink dark:bg-white text-white dark:text-black font-black text-sm">
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
              Simple flat unlocking credits. No hidden deductions or surprise cuts taken from freelancer payouts.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Navigation */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-ink bg-white dark:bg-[#121212] px-4 py-8 pb-24 sm:pb-8 text-xs font-bold text-inkmuted dark:text-stone-400">
        <p>© 2026 WorkHop Technologies · Hyperlocal Workspace</p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
          <Link to="/map" className="hover:text-brand">Live Map</Link>
          <Link to="/categories" className="hover:text-brand">Categories</Link>
          <Link to="/employer/plans" className="hover:text-brand">Plans</Link>
          <Link to="/support" className="hover:text-brand">Support</Link>
          <Link to="/legal" className="hover:text-brand">Legal</Link>
          <Link to="/admin" className="hover:text-brand">Admin</Link>
        </div>
      </footer>

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
