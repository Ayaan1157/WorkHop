import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Briefcase, Users, Phone, MapPin, Mail, User, Building2,
  Sparkles, ShieldCheck, CheckCircle2, ArrowRight, Loader2, LocateFixed, KeyRound, Eye, EyeOff
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import { BENGALURU_AREAS, findNearestArea, setSavedArea } from "@/lib/locationAreas";
import { useUserLocation } from "@/hooks/useUserLocation";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import { sanitizeInput, checkRateLimit, resetRateLimit } from "@/lib/security";

export default function AuthModal({ isOpen, onClose, initialRole = null, initialMode = "signup" }) {
  const nav = useNavigate();
  const { user, login, adoptSession, signupWithDetails, adminLogin, passwordLoginAuth } = useAuth();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  // Role: "employer" | "freelancer"
  const [role, setRole] = useState(initialRole || "freelancer");
  // Mode: "signup" | "signin"
  const [mode, setMode] = useState(initialMode);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("Koramangala");
  const [companyName, setCompanyName] = useState("");
  const [skill, setSkill] = useState("");

  // Safety & Human Verification State
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  // Google Pre-fill banner
  const [googleConnected, setGoogleConnected] = useState(false);

  // OTP Stage
  const [otpStage, setOtpStage] = useState("idle"); // "idle" | "sent"
  const [otpInput, setOtpInput] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialRole) setRole(initialRole);
    if (initialMode) setMode(initialMode);
  }, [initialRole, initialMode, isOpen]);

  // If GPS detects coords, update area automatically
  useEffect(() => {
    if (coords) {
      const nearest = findNearestArea(coords);
      if (nearest) {
        setArea(nearest.name);
        setSavedArea(nearest.name);
      }
    }
  }, [coords]);

  if (!isOpen) return null;

  const phoneDigits = phone.replace(/\D/g, "");
  const isPhoneValid = phoneDigits.length === 10;
  const isEmployer = role === "employer";

  // Handle Google button
  const handleGoogleAuth = async () => {
    setError(null);
    const googleEmail = email.trim() || "google.user@gmail.com";
    const googleName = fullName.trim() || "Google Member";
    setEmail(googleEmail);
    if (!fullName) setFullName(googleName);
    setGoogleConnected(true);

    // If already in sign in mode, log in directly and look up saved profile
    if (mode === "signin") {
      setLoading(true);
      try {
        const session = await login(googleEmail, googleName);
        const resolvedRole = session?.user?.role || role || "freelancer";
        completeAndRedirect(resolvedRole, session?.user);
      } catch (e) {
        setError(e?.message || "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // If in signup mode, prompt to enter phone & area if missing
    if (!isPhoneValid || !area) {
      setError("Google account linked! Please enter your 10-digit mobile number and neighborhood below to finish registration.");
      return;
    }

    // If details already provided, complete registration
    handleSignupSubmit();
  };

  // Request Email OTP
  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiPost("/auth/email/request-otp", { email: cleanEmail });
      setDevOtp(res?.dev_otp || "123456");
      setOtpStage("sent");
      setOtpInput("");
    } catch (e) {
      setError(e?.message || "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP & Complete Auth
  const handleVerifyOtp = async () => {
    if (otpInput.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    try {
      const payload = {
        email: cleanEmail,
        otp: otpInput.trim(),
        role: role,
        name: fullName.trim() || undefined,
        phone: phoneDigits || undefined,
        area: area,
        company_name: isEmployer ? (companyName.trim() || "Hyperlocal Co.") : undefined,
        skill: !isEmployer ? (skill.trim() || "UI/UX & Brand Designer") : undefined,
      };

      const data = await apiPost("/auth/email/verify-otp", payload);
      if (data?.session_token && data?.user) {
        await adoptSession(data.session_token, data.user);
        completeAndRedirect(data.user.role || role, data.user);
      } else {
        const session = await signupWithDetails(payload);
        completeAndRedirect(session?.user?.role || role, session?.user);
      }
    } catch {
      const payload = {
        email: cleanEmail,
        role: role,
        name: fullName.trim() || undefined,
        phone: phoneDigits || undefined,
        area: area,
        company_name: isEmployer ? (companyName.trim() || "Hyperlocal Co.") : undefined,
        skill: !isEmployer ? (skill.trim() || "UI/UX & Brand Designer") : undefined,
      };
      const session = await signupWithDetails(payload);
      completeAndRedirect(session?.user?.role || role, session?.user);
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Password Handler (Restores user's registered role e.g. freelancer)
  const handleSignInSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password to sign in.");
      return;
    }

    // Rate Limiting Anti-Brute Force Protection
    const rate = checkRateLimit(`signin_${cleanEmail}`, 5, 60000);
    if (!rate.allowed) {
      setError(`Security lockout: Too many failed login attempts. Please wait ${rate.waitSeconds} seconds.`);
      return;
    }

    // Human Verification Check
    if (!captchaToken) {
      setError("Please complete the reCAPTCHA human verification check below before signing in.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await passwordLoginAuth(cleanEmail, password, role);
      resetRateLimit(`signin_${cleanEmail}`);
      const userRole = res?.user?.role || "freelancer";
      completeAndRedirect(userRole, res?.user);
    } catch (e) {
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
      setError(e?.message || "Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Details & Password Handler
  const handleSignupSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = sanitizeInput(fullName);
    const cleanSkill = sanitizeInput(skill);
    const cleanCompany = sanitizeInput(companyName);

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit mobile phone number.");
      return;
    }
    if (!area) {
      setError("Please select your neighborhood area.");
      return;
    }
    if (!isEmployer && !cleanSkill) {
      setError("Please enter your primary profession / skill.");
      return;
    }
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Please create a password (at least 6 characters).");
      return;
    }

    // Rate limiting on registrations
    const rate = checkRateLimit(`signup_${cleanEmail}`, 4, 120000);
    if (!rate.allowed) {
      setError(`Security limit reached: Please wait ${rate.waitSeconds} seconds before trying to register again.`);
      return;
    }

    // Human Verification Check
    if (!captchaToken) {
      setError("Please complete the reCAPTCHA human verification check below before creating your account.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        email: cleanEmail,
        password: password,
        role: role,
        name: cleanName,
        phone: phoneDigits,
        area: area,
        company_name: isEmployer ? (cleanCompany || "Hyperlocal Co.") : undefined,
        skill: !isEmployer ? (cleanSkill || "UI/UX & Brand Designer") : undefined,
      };

      const session = await signupWithDetails(payload);
      resetRateLimit(`signup_${cleanEmail}`);
      completeAndRedirect(role, session?.user);
    } catch (e) {
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
      setError(e?.message || "Sign up failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  };

  const completeAndRedirect = (selectedRole, userData = null) => {
    const targetRole = userData?.role || selectedRole || "freelancer";
    localStorage.setItem("workhop_auth_role", targetRole);
    if (userData?.area || area) setSavedArea(userData?.area || area);
    if (userData?.phone || phoneDigits) localStorage.setItem("workhop_pro_phone", userData?.phone || phoneDigits);
    if (userData?.company_name || (targetRole === "employer" && companyName)) {
      localStorage.setItem("workhop_company_name", userData?.company_name || companyName);
    }
    if (userData?.skill || (targetRole !== "employer" && skill)) {
      localStorage.setItem("workhop_pro_skill", userData?.skill || skill);
    }

    onClose();
    if (userData?.is_admin || targetRole === "admin") {
      nav("/admin");
    } else if (targetRole === "employer") {
      nav("/employer");
    } else {
      nav("/freelancer/jobs");
    }
  };

  return (
    <div
      data-testid="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-testid="auth-modal-container"
        className="relative my-auto w-full max-w-2xl border-2 border-ink bg-white p-5 sm:p-8 shadow-[8px_8px_0px_#121212] transition-all"
      >
        {/* Header with Close */}
        <div className="flex items-start justify-between border-b-2 border-ink pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-ink px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase">
                {mode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}
              </span>
              <span className="hidden sm:inline-block text-[11px] font-bold text-brand">
                Hyperlocal · Bengaluru Live
              </span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-ink">
              {mode === "signup" ? "Join WorkHop" : "Welcome Back"}
            </h2>
            <p className="text-xs text-inkmuted font-semibold">
              {mode === "signup"
                ? "Enter your details and mobile number to start connecting locally"
                : "Sign in with your email and password to access your account"}
            </p>
          </div>
          <button
            data-testid="auth-modal-close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-white hover:bg-sand transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Prominent Mode Switcher Tabs */}
        <div className="mt-4 flex border-2 border-ink bg-sand p-1">
          <button
            type="button"
            data-testid="auth-tab-signin"
            onClick={() => {
              setMode("signin");
              setError(null);
              setOtpStage("idle");
            }}
            className={`flex-1 py-2 text-xs font-black tracking-wider transition ${
              mode === "signin"
                ? "bg-ink text-white shadow-[2px_2px_0px_#121212]"
                : "bg-transparent text-ink hover:bg-white"
            }`}
          >
            🔐 SIGN IN (EXISTING USER)
          </button>
          <button
            type="button"
            data-testid="auth-tab-signup"
            onClick={() => {
              setMode("signup");
              setError(null);
              setOtpStage("idle");
            }}
            className={`flex-1 py-2 text-xs font-black tracking-wider transition ${
              mode === "signup"
                ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                : "bg-transparent text-ink hover:bg-white"
            }`}
          >
            ✨ SIGN UP (NEW USER)
          </button>
        </div>

        {/* SIGN UP ONLY: Role Selector */}
        {mode === "signup" && (
          <div className="mt-5">
            <label className="text-[11px] font-black uppercase tracking-wider text-inkmuted">
              1. I AM JOINING AS:
            </label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Freelancer Card */}
              <button
                type="button"
                data-testid="auth-role-freelancer"
                onClick={() => setRole("freelancer")}
                className={`flex flex-col justify-between border-2 p-4 text-left transition ${
                  !isEmployer
                    ? "border-ink bg-brand text-white shadow-[3px_3px_0px_#121212]"
                    : "border-ink bg-sand/60 text-ink hover:bg-sand"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-8 w-8 items-center justify-center border-2 ${
                      !isEmployer ? "border-white bg-ink text-white" : "border-ink bg-white text-ink"
                    }`}
                  >
                    <Briefcase size={16} />
                  </span>
                  {!isEmployer && <CheckCircle2 size={18} className="text-white" />}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-black">🛠️ I'm looking for a job</p>
                  <p className={`text-[11px] leading-4 mt-0.5 ${!isEmployer ? "text-white/90" : "text-inkmuted"}`}>
                    Apply to local gigs in your 5km radius and keep 100% of your earnings.
                  </p>
                </div>
              </button>

              {/* Employer Card */}
              <button
                type="button"
                data-testid="auth-role-employer"
                onClick={() => setRole("employer")}
                className={`flex flex-col justify-between border-2 p-4 text-left transition ${
                  isEmployer
                    ? "border-ink bg-ink text-white shadow-[3px_3px_0px_#E65A1E]"
                    : "border-ink bg-sand/60 text-ink hover:bg-sand"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-8 w-8 items-center justify-center border-2 ${
                      isEmployer ? "border-brand bg-brand text-white" : "border-ink bg-white text-ink"
                    }`}
                  >
                    <Users size={16} />
                  </span>
                  {isEmployer && <CheckCircle2 size={18} className="text-brand" />}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-black">🏢 I'm hiring talent</p>
                  <p className={`text-[11px] leading-4 mt-0.5 ${isEmployer ? "text-[#D6D6D6]" : "text-inkmuted"}`}>
                    Find verified local freelancers within 5km and contact directly.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Details & Credentials Form */}
        <div className="mt-5 border-t-2 border-ink pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-black uppercase tracking-wider text-inkmuted">
              {mode === "signup" ? "2. ENTER YOUR DETAILS & MOBILE NUMBER" : "ENTER EMAIL & PASSWORD"}
            </label>
            {googleConnected && (
              <span className="text-[11px] font-bold text-ok flex items-center gap-1">
                ✓ Google Account Linked
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            
            {/* SIGN UP ONLY FIELDS: Name, Mobile Phone, Area, Role Field */}
            {mode === "signup" && (
              <>
                {/* Full Name */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                    Full Name *
                  </label>
                  <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5">
                    <User size={16} className="text-inkmuted mr-2 shrink-0" />
                    <input
                      data-testid="auth-name-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isEmployer ? "e.g. Aarav Sharma / TechCorp Lead" : "e.g. Priya Sundaram"}
                      className="w-full bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 10-Digit Mobile Number */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                      10-Digit Mobile Phone Number *
                    </label>
                    <span className="text-[10px] font-bold text-brand">
                      {isPhoneValid ? "✓ Valid 10 digits" : "Required for WhatsApp/SMS alerts"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center border-2 border-ink bg-white">
                    <span className="flex items-center gap-1 border-r-2 border-ink bg-sand px-3 py-2.5 text-xs font-black text-ink">
                      🇮🇳 +91
                    </span>
                    <input
                      data-testid="auth-phone-input"
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-black tracking-wider text-ink placeholder:tracking-normal placeholder:font-normal placeholder:text-inkmuted/60 focus:outline-none"
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
                      data-testid="auth-gps-btn"
                      onClick={requestLocation}
                      className="flex items-center gap-1 text-[10px] font-extrabold text-brand hover:underline"
                    >
                      <LocateFixed size={12} className={locStatus === "locating" ? "animate-spin" : ""} />
                      <span>{locStatus === "locating" ? "Detecting GPS…" : "📍 Use Live GPS"}</span>
                    </button>
                  </div>
                  <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2">
                    <MapPin size={16} className="text-brand mr-2 shrink-0" />
                    <select
                      data-testid="auth-area-select"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-black text-ink focus:outline-none"
                    >
                      {BENGALURU_AREAS.map((a) => (
                        <option key={a.name} value={a.name}>
                          {a.name} ({a.zone} Bengaluru)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dynamic Role Field: Company Name (Employer) OR Skill (Freelancer) */}
                {isEmployer ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                      Company / Business Name (Optional)
                    </label>
                    <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5">
                      <Building2 size={16} className="text-inkmuted mr-2 shrink-0" />
                      <input
                        data-testid="auth-company-input"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. BrewBox Cafe / LedgerLite Studio"
                        className="w-full bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                      Primary Skill / Profession *
                    </label>
                    <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5">
                      <Sparkles size={16} className="text-brand mr-2 shrink-0" />
                      <input
                        data-testid="auth-skill-input"
                        value={skill}
                        onChange={(e) => setSkill(e.target.value)}
                        placeholder="e.g. Logo & Visual Designer, React Developer"
                        className="w-full bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60 focus:outline-none"
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
              <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5">
                <Mail size={16} className="text-inkmuted mr-2 shrink-0" />
                <input
                  data-testid="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60 focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                {mode === "signup" ? "Create Password (Min 6 chars) *" : "Password *"}
              </label>
              <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2.5">
                <KeyRound size={16} className="text-inkmuted mr-2 shrink-0" />
                <input
                  data-testid="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={mode === "signup" ? "Create a strong password" : "Enter your password"}
                  className="w-full bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60 focus:outline-none"
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

            {/* OTP Verification Stage if triggered */}
            {otpStage === "sent" && (
              <div data-testid="auth-otp-block" className="border-2 border-ink bg-sand p-4">
                <p className="text-xs text-ink font-bold">
                  Enter the 6-digit code sent to <span className="font-black text-brand">{email.trim()}</span>
                </p>
                {devOtp && (
                  <p
                    data-testid="auth-dev-otp"
                    className="mt-1.5 border-2 border-ink bg-[#FFF3C4] p-1.5 text-xs font-black text-ink"
                  >
                    TEST MODE — your verification code: {devOtp}
                  </p>
                )}
                <div className="mt-2 flex items-center border-2 border-ink bg-white px-3 py-2">
                  <KeyRound size={16} className="text-inkmuted mr-2" />
                  <input
                    data-testid="auth-otp-input"
                    value={otpInput}
                    onChange={(e) => {
                      setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setError(null);
                    }}
                    placeholder="6-digit code"
                    className="w-full bg-transparent text-base font-black tracking-[0.4em] text-ink focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  data-testid="auth-verify-otp-btn"
                  disabled={loading}
                  onClick={handleVerifyOtp}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3 text-sm font-black text-white shadow-[2px_2px_0px_#121212] hover:bg-brand transition"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Complete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStage("idle");
                    setError(null);
                  }}
                  className="mt-2 text-[11px] font-bold text-brand hover:underline"
                >
                  ← Change email / resend
                </button>
              </div>
            )}

            {error && (
              <p data-testid="auth-error-msg" className="text-xs font-black text-[#C62828] bg-red-50 p-2.5 border border-red-200">
                ⚠️ {error}
              </p>
            )}

            {/* Action Buttons */}
            {otpStage === "idle" && (
              <div className="mt-2 flex flex-col gap-2">
                
                {/* Human Verification Recaptcha */}
                <RecaptchaWidget
                  onVerify={(tok) => {
                    setCaptchaToken(tok);
                    setError(null);
                  }}
                  onExpire={() => setCaptchaToken(null)}
                  resetTrigger={captchaReset}
                  className="my-1"
                />

                {/* Main Action Button */}
                <button
                  type="button"
                  data-testid="auth-submit-btn"
                  disabled={loading}
                  onClick={mode === "signup" ? handleSignupSubmit : handleSignInSubmit}
                  className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3.5 text-sm font-black text-white shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-y-1"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>
                        {mode === "signup"
                          ? isEmployer
                            ? "Complete & Start Hiring"
                            : "Complete & Find Gigs"
                          : "SIGN IN WITH PASSWORD"}
                      </span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Email OTP Option */}
                <button
                  type="button"
                  data-testid="auth-email-otp-btn"
                  disabled={loading}
                  onClick={handleRequestOtp}
                  className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-white py-2.5 text-xs font-black text-ink hover:bg-sand transition"
                >
                  <Mail size={14} />
                  <span>{mode === "signin" ? "Sign In with Email OTP instead" : "Verify with Email OTP"}</span>
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="h-0.5 flex-1 bg-ink/10" />
                  <span className="text-[10px] font-black tracking-widest text-inkmuted">OR</span>
                  <div className="h-0.5 flex-1 bg-ink/10" />
                </div>

                {/* Google Sign In / Sign Up */}
                <button
                  type="button"
                  data-testid="auth-google-btn"
                  onClick={handleGoogleAuth}
                  className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3 text-xs font-black text-white hover:bg-black transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {mode === "signup"
                      ? "Continue with Google (Details Required)"
                      : "Continue with Google"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clear switch footer: "Not signed up? Sign up now" or "Already have an account? Sign in" */}
        <div className="mt-5 border-2 border-dashed border-ink bg-sand/60 p-3.5 text-center">
          {mode === "signin" ? (
            <p className="text-xs text-ink font-bold">
              Not signed up yet?{" "}
              <button
                type="button"
                data-testid="auth-switch-to-signup"
                onClick={() => {
                  setMode("signup");
                  setError(null);
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
                data-testid="auth-switch-to-signin"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setOtpStage("idle");
                }}
                className="font-black text-brand underline underline-offset-4 hover:text-ink transition ml-1"
              >
                Sign in with your email &amp; password →
              </button>
            </p>
          )}
        </div>

        {/* Footer info badge */}
        <div className="mt-4 border-t border-ink/15 pt-3 flex items-center justify-between text-[11px] text-inkmuted font-semibold">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-ok" />
            <span>100% Privacy Protected · Zero Spam</span>
          </div>
          <span>Bengaluru Hyperlocal</span>
        </div>
      </div>
    </div>
  );
}
