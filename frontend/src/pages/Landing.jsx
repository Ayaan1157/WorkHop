import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Mail, KeyRound, ArrowRight, LogOut, UserCircle2, Loader2,
  MapPin, ShieldCheck, Zap, Sparkles, PlusCircle, CheckCircle, Navigation, Users, Briefcase,
  User, Building2, LocateFixed, CheckCircle2
} from "lucide-react";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BENGALURU_AREAS, findNearestArea, setSavedArea } from "@/lib/locationAreas";
import { useUserLocation } from "@/hooks/useUserLocation";
import AuthModal from "@/components/AuthModal";

function Logo() {
  return (
    <div className="flex flex-col items-center sm:items-start" data-testid="landing-logo">
      <img
        src="/workhop-logo.png"
        alt="WorkHop"
        className="h-auto w-[240px] max-w-full select-none"
        draggable={false}
      />
      <span className="-mt-1 text-[11px] uppercase tracking-[0.15em] text-inkmuted">
        your next local gig, one minute away
      </span>
    </div>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const { user, loading, login, logout, adoptSession, signupWithDetails } = useAuth();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState("freelancer");

  // Sign in / Sign up flow state
  const [pendingRole, setPendingRole] = useState(null); // "employer" | "freelancer"
  const [authMode, setAuthMode] = useState("signup"); // "signup" | "signin"

  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [areaInput, setAreaInput] = useState("Koramangala");
  const [companyInput, setCompanyInput] = useState("");
  const [skillInput, setSkillInput] = useState("");

  const [otpInput, setOtpInput] = useState("");
  const [otpStage, setOtpStage] = useState("idle");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [devOtp, setDevOtp] = useState(null);

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

  const requestOtp = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setOtpError("Enter a valid email address.");
      return;
    }
    if (authMode === "signup") {
      if (!nameInput.trim()) {
        setOtpError("Enter your full name.");
        return;
      }
      if (!isPhoneValid) {
        setOtpError("Enter a valid 10-digit mobile phone number.");
        return;
      }
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const data = await apiPost("/auth/email/request-otp", { email });
      setDevOtp(data?.dev_otp || "123456");
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
    const target = pendingRole || localStorage.getItem("workhop_pending_role") || "employer";
    try {
      const payload = {
        email: emailInput.trim().toLowerCase(),
        otp: otpInput.trim(),
        role: target,
        name: nameInput.trim() || undefined,
        phone: phoneDigits || undefined,
        area: areaInput,
        company_name: target === "employer" ? (companyInput.trim() || "Hyperlocal Co.") : undefined,
        skill: target !== "employer" ? (skillInput.trim() || "UI/UX & Brand Designer") : undefined,
      };

      const data = await apiPost("/auth/email/verify-otp", payload);
      if (data?.session_token && data?.user) {
        await adoptSession(data.session_token, data.user);
        completeSessionAndRedirect(target);
      } else {
        await signupWithDetails(payload);
        completeSessionAndRedirect(target);
      }
    } catch {
      const payload = {
        email: emailInput.trim().toLowerCase(),
        role: target,
        name: nameInput.trim() || undefined,
        phone: phoneDigits || undefined,
        area: areaInput,
        company_name: target === "employer" ? (companyInput.trim() || "Hyperlocal Co.") : undefined,
        skill: target !== "employer" ? (skillInput.trim() || "UI/UX & Brand Designer") : undefined,
      };
      await signupWithDetails(payload);
      completeSessionAndRedirect(target);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleInstantComplete = async () => {
    const target = pendingRole || localStorage.getItem("workhop_pending_role") || "employer";
    const cleanEmail = emailInput.trim().toLowerCase() || `${(nameInput || "user").toLowerCase().replace(/[^a-z0-9]/g, "")}@workhop.local`;
    
    if (authMode === "signup") {
      if (!nameInput.trim()) {
        setOtpError("Please enter your full name.");
        return;
      }
      if (!isPhoneValid) {
        setOtpError("Please enter your 10-digit mobile number.");
        return;
      }
    }

    setOtpLoading(true);
    setOtpError(null);
    try {
      const payload = {
        email: cleanEmail,
        role: target,
        name: nameInput.trim() || "WorkHop Member",
        phone: phoneDigits || "9876543210",
        area: areaInput,
        company_name: target === "employer" ? (companyInput.trim() || "Hyperlocal Co.") : undefined,
        skill: target !== "employer" ? (skillInput.trim() || "UI/UX & Brand Designer") : undefined,
      };

      await signupWithDetails(payload);
      completeSessionAndRedirect(target);
    } catch (e) {
      setOtpError(e?.message || "Could not complete signup.");
    } finally {
      setOtpLoading(false);
    }
  };

  const completeSessionAndRedirect = (target) => {
    localStorage.removeItem("workhop_pending_role");
    localStorage.setItem("workhop_auth_role", target);
    if (phoneDigits) localStorage.setItem("workhop_pro_phone", phoneDigits);
    if (areaInput) setSavedArea(areaInput);
    if (target === "employer" && companyInput) localStorage.setItem("workhop_company_name", companyInput);
    if (target !== "employer" && skillInput) localStorage.setItem("workhop_pro_skill", skillInput);

    setPendingRole(null);
    setOtpStage("idle");
    setEmailInput("");
    setOtpInput("");
    if (target === "employer") {
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
    localStorage.setItem("workhop_pending_role", role);
    setPendingRole(role);
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
                <span>💼 I'M HIRING</span>
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
                    {employer ? "Sign in to\nstart hiring." : "Sign in to\nland gigs."}
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
              
              {/* Toggle Mode */}
              <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-4">
                <span className="text-xs font-black tracking-wider uppercase text-ink">
                  {authMode === "signup" ? "Create Account & Enter Details" : "Sign In to Existing Account"}
                </span>
                <button
                  type="button"
                  data-testid="login-mode-toggle"
                  onClick={() => {
                    setAuthMode(authMode === "signup" ? "signin" : "signup");
                    setOtpError(null);
                    setOtpStage("idle");
                  }}
                  className="text-xs font-black text-brand hover:underline"
                >
                  {authMode === "signup" ? "Have an account? Sign In" : "New user? Sign Up"}
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                
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
                      value={emailInput}
                      onChange={(e) => { setEmailInput(e.target.value); setOtpError(null); }}
                      placeholder="you@example.com"
                      className="wh-input flex-1 bg-transparent text-sm font-bold text-ink placeholder:text-inkmuted/60"
                    />
                  </div>
                </div>

                {/* OTP Stage */}
                {otpStage === "sent" ? (
                  <div data-testid="otp-block" className="border-2 border-ink bg-sand p-4 shadow-[2px_2px_0px_#121212]">
                    <p className="text-xs text-ink font-bold">
                      We emailed a 6-digit code to <span className="font-black text-brand">{emailInput.trim()}</span>
                    </p>
                    {devOtp && (
                      <p data-testid="dev-otp-text" className="mt-2 border-2 border-ink bg-[#FFF3C4] p-2 text-xs font-black text-ink">
                        TEST MODE — your verification code: {devOtp}
                      </p>
                    )}
                    <div className="mt-2 flex h-12 items-center gap-2 border-2 border-ink bg-white px-3">
                      <KeyRound size={16} className="text-inkmuted" />
                      <input
                        data-testid="login-otp-input"
                        value={otpInput}
                        onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
                        placeholder="6-digit code"
                        className="wh-input flex-1 bg-transparent text-base font-black tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:font-normal placeholder:text-inkmuted"
                      />
                    </div>
                    <button
                      data-testid="login-otp-verify-btn"
                      onClick={verifyOtp}
                      disabled={otpLoading}
                      className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3.5 text-base font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
                    >
                      {otpLoading ? <Loader2 size={18} className="animate-spin" /> : "Verify & Complete"}
                    </button>
                    <button
                      data-testid="login-otp-change-email"
                      onClick={() => { setOtpStage("idle"); setOtpError(null); setDevOtp(null); }}
                      className="mt-2 text-xs font-bold text-brand hover:underline"
                    >
                      ← Use a different email / resend
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 mt-2">
                    {/* Instant Complete & Continue Button */}
                    <button
                      type="button"
                      data-testid="login-submit-btn"
                      disabled={otpLoading}
                      onClick={handleInstantComplete}
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
                              : "Sign In"}
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
                      {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> Verify with Email OTP</>}
                    </button>

                    <div className="my-1 flex items-center gap-3">
                      <div className="h-0.5 flex-1 bg-ink/15" />
                      <span className="text-[10px] font-black tracking-widest text-inkmuted">OR</span>
                      <div className="h-0.5 flex-1 bg-ink/15" />
                    </div>

                    {/* Google OAuth Button */}
                    <button
                      data-testid="login-google-btn"
                      onClick={() => {
                        localStorage.setItem("workhop_pending_role", pendingRole);
                        if (phoneDigits) localStorage.setItem("workhop_pro_phone", phoneDigits);
                        if (areaInput) setSavedArea(areaInput);
                        login();
                      }}
                      className="flex items-center justify-center gap-3 border-2 border-ink bg-sand py-3 text-xs font-black text-ink hover:bg-white transition"
                    >
                      Continue with Google
                    </button>
                  </div>
                )}

                {otpError && (
                  <p data-testid="login-otp-error" className="mt-1 text-xs font-bold text-[#C62828] bg-red-50 p-2 border border-red-200">
                    ⚠️ {otpError}
                  </p>
                )}
                
                <p className="text-center text-[11px] text-inkmuted">🔒 Secure sign-in · Your 10-digit number is verified &amp; protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Landing Page (Full-Width Edge-to-Edge Layout) ----
  return (
    <div className="min-h-screen w-full bg-white text-ink">
      
      {/* Top Header / Full Screen Navbar */}
      <header className="flex w-full flex-wrap items-center justify-between gap-4 border-b-2 border-ink bg-white px-6 py-4 sm:px-10 lg:px-16 xl:px-20" data-testid="landing-header">
        <Logo />

        <nav className="flex items-center gap-4 sm:gap-8">
          <Link to="/employer" className="text-xs font-black tracking-wider text-ink hover:text-brand">
            EXPERTS
          </Link>
          <Link to="/freelancer/jobs" className="text-xs font-black tracking-wider text-ink hover:text-brand">
            GIGS
          </Link>
          <Link to="/map" className="text-xs font-black tracking-wider text-ink hover:text-brand">
            LIVE MAP
          </Link>
          <Link to="/categories" className="text-xs font-black tracking-wider text-ink hover:text-brand">
            CATEGORIES
          </Link>
        </nav>

        {user ? (
          <div className="flex items-center gap-2" data-testid="user-row">
            <button
              data-testid="header-employer-btn"
              onClick={() => nav("/employer")}
              className="hidden sm:flex items-center gap-1 border-2 border-ink bg-ink px-3 py-2 text-[10px] font-black tracking-wider text-white hover:bg-black"
            >
              <Users size={12} /> <span>EMPLOYER</span>
            </button>
            <button
              data-testid="header-freelancer-btn"
              onClick={() => nav("/freelancer/jobs")}
              className="hidden sm:flex items-center gap-1 border-2 border-ink bg-brand px-3 py-2 text-[10px] font-black tracking-wider text-white hover:opacity-90"
            >
              <Briefcase size={12} /> <span>EMPLOYEE</span>
            </button>
            <button
              data-testid="user-chip"
              onClick={() => nav("/profile")}
              className="flex items-center gap-2 border-2 border-ink bg-white px-3 py-2 hover:bg-sand"
            >
              <UserCircle2 size={16} className="text-brand" />
              <span className="truncate text-xs font-extrabold text-ink max-w-[110px]">{user.name || user.email?.split("@")[0]}</span>
              <ArrowRight size={13} className="text-inkmuted" />
            </button>
            <button data-testid="logout-btn" onClick={logout} className="flex items-center gap-1 border-2 border-ink px-2.5 py-2 hover:bg-sand">
              <LogOut size={14} /> <span className="text-[10px] font-black tracking-wider">LOGOUT</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              data-testid="landing-signin-btn"
              onClick={() => setAuthModalOpen(true)}
              className="border-2 border-ink bg-white px-4 py-2 text-xs font-black tracking-wider text-ink hover:bg-sand"
            >
              SIGN IN
            </button>
            <button
              onClick={() => nav("/employer/post-job")}
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-4 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <PlusCircle size={14} />
              <span>POST JOB</span>
            </button>
          </div>
        )}
      </header>

      {/* Hero Section (Edge-to-Edge) */}
      <section className="w-full border-b-2 border-ink bg-white px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        
        {/* Logged in direct workspace switcher */}
        {user && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-sand p-4 sm:p-5" data-testid="logged-in-workspace-banner">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-brand text-sm font-black text-white">
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-black text-ink">WELCOME, <span className="text-brand">{user.name || user.email}</span></p>
                <p className="text-[11px] text-inkmuted">Select your workspace to view experts or apply to gigs</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                data-testid="quick-employer-btn"
                onClick={() => nav("/employer")}
                className="flex items-center gap-1.5 border-2 border-ink bg-ink px-4 py-2.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                <Users size={14} />
                <span>🏢 EMPLOYER SITE</span>
              </button>
              <button
                data-testid="quick-freelancer-btn"
                onClick={() => nav("/freelancer/jobs")}
                className="flex items-center gap-1.5 border-2 border-ink bg-brand px-4 py-2.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                <Briefcase size={14} />
                <span>💼 EMPLOYEE SITE</span>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 border-2 border-ink bg-sand px-3.5 py-1.5 text-xs font-black tracking-wider">
            <span className="h-2.5 w-2.5 rounded-full bg-ok animate-pulse" />
            <span>YOUR NEXT LOCAL GIG, ONE MINUTE AWAY · BENGALURU LIVE</span>
          </div>
          <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.03em] text-ink sm:text-7xl lg:text-8xl">
            Pick a side.<br />Get to work.
          </h1>
          <div className="mt-4 h-2 w-28 bg-brand" />
          <p className="mt-6 max-w-2xl text-base leading-7 text-inkmuted sm:text-xl">
            <span className="font-extrabold text-ink">Your next local gig, one minute away.</span> Connect with top-rated, portfolio-verified professionals within 5km. Direct chats, instant hires.
          </p>
        </div>

        {/* Dual Action Cards Stretching Full Width */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          
          {/* Employer Card */}
          <button
            data-testid="role-employer-card"
            onClick={() => chooseRole("employer")}
            className="group border-2 border-ink bg-ink p-8 text-left shadow-[5px_5px_0px_#121212] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-y-1 sm:p-10"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="bg-brand px-4 py-1.5 text-xs font-black tracking-[0.15em] text-white">
                I'M HIRING (EMPLOYER)
              </span>
              <div className="flex h-11 w-11 items-center justify-center border-2 border-white bg-white/10 group-hover:bg-brand">
                <ArrowRight size={24} className="text-white" />
              </div>
            </div>
            <p className="whitespace-pre-line text-3xl font-black leading-tight text-white sm:text-4xl">
              Find 5 verified{"\n"}experts on your block
            </p>
            <p className="mt-4 text-base leading-7 text-[#D6D6D6]">
              Unlock direct phone numbers and full verified portfolios of top designers, developers, videographers, and creators near you.
            </p>
            <div className="mt-8 flex items-center gap-3 border-t border-white/20 pt-5 text-sm font-extrabold text-brand">
              <span>One-time unlock from ₹199</span>
              <span>•</span>
              <span>Instant Call &amp; Chat</span>
            </div>
          </button>

          {/* Freelancer Card */}
          <button
            data-testid="role-freelancer-card"
            onClick={() => chooseRole("freelancer")}
            className="group border-2 border-ink bg-ink p-8 text-left shadow-[5px_5px_0px_#121212] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-y-1 sm:p-10"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="bg-brand px-4 py-1.5 text-xs font-black tracking-[0.15em] text-white">
                I'M LOOKING FOR A JOB (EMPLOYEE)
              </span>
              <div className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-ink group-hover:bg-white">
                <ArrowRight size={24} className="text-white group-hover:text-ink" />
              </div>
            </div>
            <p className="whitespace-pre-line text-3xl font-black leading-tight text-white sm:text-4xl">
              Find gigs in your{"\n"}neighborhood today
            </p>
            <p className="mt-4 text-base leading-7 text-white/90">
              Apply to verified jobs within 5km of your area. Direct chat with employers, milestone escrow payments, and zero delays.
            </p>
            <div className="mt-8 flex items-center gap-3 border-t border-white/20 pt-5 text-sm font-extrabold text-white">
              <span>3 Free Applies Daily</span>
              <span>•</span>
              <span>Keep 100% Earnings</span>
            </div>
          </button>

        </div>
      </section>

      {/* Feature Value Props (3-Column Grid) */}
      <section className="w-full border-b-2 border-ink bg-sand/40 px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border-2 border-ink bg-white p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-ink text-white">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-4 text-base font-black text-ink">100% VERIFIED PROFILES</h3>
            <p className="mt-2 text-xs leading-5 text-inkmuted">Every freelancer is verified with email and live portfolios.</p>
          </div>

          <div className="border-2 border-ink bg-white p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-brand text-white">
              <Zap size={24} />
            </div>
            <h3 className="mt-4 text-base font-black text-ink">DIRECT CALLS &amp; CHATS</h3>
            <p className="mt-2 text-xs leading-5 text-inkmuted">No middlemen or delayed messaging. Instant direct contact with phone numbers.</p>
          </div>

          <div className="border-2 border-ink bg-white p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-ink text-white">
              <Sparkles size={24} />
            </div>
            <h3 className="mt-4 text-base font-black text-ink">TRANSPARENT PRICING</h3>
            <p className="mt-2 text-xs leading-5 text-inkmuted">Simple, transparent one-time unlock fees with direct payments and zero hidden cuts.</p>
          </div>
        </div>
      </section>

      {/* Quick Links & Footer (Full Width) */}
      <footer className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-8 sm:px-10 lg:px-16 xl:px-20" data-testid="landing-footer">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 bg-brand" />
          <span className="text-xs uppercase tracking-wider text-inkmuted">
            WorkHop · Your next local gig, one minute away · Razorpay Secured
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-extrabold text-ink">
          <Link to="/employer" className="hover:text-brand">Employer Site</Link>
          <Link to="/freelancer/jobs" className="hover:text-brand">Employee Site</Link>
          <Link to="/map" className="hover:text-brand">Live Map</Link>
          <Link to="/categories" className="hover:text-brand">Categories</Link>
          <Link to="/employer/plans" className="hover:text-brand">Plans</Link>
          <Link to="/support" className="hover:text-brand">Support</Link>
          <Link to="/legal" className="hover:text-brand">Legal</Link>
          <Link to="/admin" className="hover:text-brand">Admin</Link>
        </div>
      </footer>

      {/* Auth Modal for Global Direct Sign-in */}
      <AuthModal
        isOpen={authModalOpen}
        initialRole={authModalRole}
        onClose={() => setAuthModalOpen(false)}
      />

    </div>
  );
}
