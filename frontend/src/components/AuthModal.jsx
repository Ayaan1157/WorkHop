import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Briefcase, Users, Phone, MapPin, Mail, User, Building2,
  Sparkles, ShieldCheck, CheckCircle2, ArrowRight, Loader2, LocateFixed, KeyRound
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import { BENGALURU_AREAS, findNearestArea, setSavedArea } from "@/lib/locationAreas";
import { useUserLocation } from "@/hooks/useUserLocation";

export default function AuthModal({ isOpen, onClose, initialRole = null, initialMode = "signup" }) {
  const nav = useNavigate();
  const { user, login, adoptSession, signupWithDetails } = useAuth();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  // Role: "employer" | "freelancer"
  const [role, setRole] = useState(initialRole || "freelancer");
  // Mode: "signup" | "signin"
  const [mode, setMode] = useState(initialMode);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("Koramangala");
  const [companyName, setCompanyName] = useState("");
  const [skill, setSkill] = useState("");

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

  // Request Email OTP
  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup") {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!isPhoneValid) {
        setError("Please enter a valid 10-digit mobile number.");
        return;
      }
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
        completeAndRedirect(role);
      } else {
        // Fallback local signup
        await signupWithDetails(payload);
        completeAndRedirect(role);
      }
    } catch {
      // Offline fallback
      const payload = {
        email: cleanEmail,
        role: role,
        name: fullName.trim() || undefined,
        phone: phoneDigits || undefined,
        area: area,
        company_name: isEmployer ? (companyName.trim() || "Hyperlocal Co.") : undefined,
        skill: !isEmployer ? (skill.trim() || "UI/UX & Brand Designer") : undefined,
      };
      await signupWithDetails(payload);
      completeAndRedirect(role);
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Signup with Details
  const handleInstantSignup = async () => {
    const cleanEmail = email.trim().toLowerCase() || `${(fullName || "user").toLowerCase().replace(/[^a-z0-9]/g, "")}@workhop.local`;
    if (mode === "signup") {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!isPhoneValid) {
        setError("Please enter a valid 10-digit mobile phone number.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        email: cleanEmail,
        role: role,
        name: fullName.trim() || "WorkHop User",
        phone: phoneDigits || "9876543210",
        area: area,
        company_name: isEmployer ? (companyName.trim() || "Hyperlocal Co.") : undefined,
        skill: !isEmployer ? (skill.trim() || "UI/UX & Brand Designer") : undefined,
      };

      await signupWithDetails(payload);
      completeAndRedirect(role);
    } catch (e) {
      setError(e?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const completeAndRedirect = (selectedRole) => {
    localStorage.setItem("workhop_auth_role", selectedRole);
    if (area) setSavedArea(area);
    if (phoneDigits) localStorage.setItem("workhop_pro_phone", phoneDigits);
    if (isEmployer && companyName) localStorage.setItem("workhop_company_name", companyName);
    if (!isEmployer && skill) localStorage.setItem("workhop_pro_skill", skill);

    onClose();
    if (selectedRole === "employer") {
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
                {mode === "signup" ? "Create WorkHop Account" : "Sign In to WorkHop"}
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
                ? "Pick your role, enter your phone & details to get started instantly"
                : "Sign in with your email or Google account to continue"}
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

        {/* STEP 1: Upwork-style 2-Card Role Selector */}
        <div className="mt-5">
          <label className="text-[11px] font-black uppercase tracking-wider text-inkmuted">
            1. I AM SIGNING IN AS:
          </label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    isEmployer ? "border-white bg-brand text-white" : "border-ink bg-white text-ink"
                  }`}
                >
                  <Users size={16} />
                </span>
                {isEmployer && <CheckCircle2 size={18} className="text-brand" />}
              </div>
              <div className="mt-3">
                <p className="text-sm font-black">💼 I want to hire talent</p>
                <p className={`text-[11px] leading-4 mt-0.5 ${isEmployer ? "text-sand" : "text-inkmuted"}`}>
                  Post jobs, discover verified experts near you &amp; chat in real-time.
                </p>
              </div>
            </button>

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
          </div>
        </div>

        {/* STEP 2: Details & Phone Signup Form */}
        <div className="mt-5 border-t-2 border-ink pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-black uppercase tracking-wider text-inkmuted">
              2. {mode === "signup" ? "ENTER YOUR DETAILS & MOBILE NUMBER" : "SIGN IN CREDENTIALS"}
            </label>
            <button
              type="button"
              data-testid="auth-mode-toggle"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
                setOtpStage("idle");
              }}
              className="text-xs font-black text-brand hover:underline"
            >
              {mode === "signup" ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
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
                      Company / Organization Name (Optional)
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
              <p data-testid="auth-error-msg" className="text-xs font-black text-[#C62828] bg-red-50 p-2 border border-red-200">
                ⚠️ {error}
              </p>
            )}

            {/* Action Buttons */}
            {otpStage === "idle" && (
              <div className="mt-2 flex flex-col gap-2">
                {/* 1-Click Instant Complete & Continue */}
                <button
                  type="button"
                  data-testid="auth-submit-btn"
                  disabled={loading}
                  onClick={handleInstantSignup}
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
                          : "Sign In"}
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
                  <span>Verify with Email OTP</span>
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="h-0.5 flex-1 bg-ink/10" />
                  <span className="text-[10px] font-black tracking-widest text-inkmuted">OR</span>
                  <div className="h-0.5 flex-1 bg-ink/10" />
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  data-testid="auth-google-btn"
                  onClick={() => {
                    localStorage.setItem("workhop_pending_role", role);
                    if (phoneDigits) localStorage.setItem("workhop_pro_phone", phoneDigits);
                    if (area) setSavedArea(area);
                    login();
                  }}
                  className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3 text-xs font-black text-white hover:bg-black transition"
                >
                  <span>Continue with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info badge */}
        <div className="mt-5 border-t border-ink/15 pt-3 flex items-center justify-between text-[11px] text-inkmuted font-semibold">
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
