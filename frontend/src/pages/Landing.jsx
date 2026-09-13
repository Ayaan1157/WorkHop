import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Mail, KeyRound, ArrowRight, LogOut, UserCircle2, Loader2,
  MapPin, ShieldCheck, Zap, Sparkles, PlusCircle, CheckCircle, Navigation, Users, Briefcase
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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
        hyperlocal gigs · verified pros
      </span>
    </div>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const { user, loading, login, logout, adoptSession } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpStage, setOtpStage] = useState("idle");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);

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

  const requestOtp = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setOtpError("Enter a valid email address.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const r = await fetch(`${API}/auth/email/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) return setOtpError(data?.detail || "Could not send code.");
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
      const r = await fetch(`${API}/auth/email/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim().toLowerCase(), otp: otpInput.trim() }),
      });
      const data = await r.json();
      if (!r.ok) return setOtpError(data?.detail || "Verification failed.");
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

  const chooseRole = (role) => {
    if (role === "freelancer") return goFreelancer();
    if (user) return nav("/employer");
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

  // ---- Sign-in screen (role chosen, not signed in) ----
  if (pendingRole && !user) {
    const employer = pendingRole === "employer";
    return (
      <div className="min-h-screen w-full bg-white p-6 sm:p-10 lg:p-16">
        <div className="mx-auto max-w-5xl border-2 border-ink bg-white p-6 shadow-2xl sm:p-10">
          <div className="flex items-center justify-between border-b-2 border-ink pb-5">
            <button
              data-testid="login-back-btn"
              onClick={() => {
                localStorage.removeItem("workhop_pending_role");
                setPendingRole(null);
              }}
              className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-white hover:bg-sand"
            >
              <ChevronLeft size={22} />
            </button>
            <div className={`border-2 border-ink px-4 py-1.5 ${employer ? "bg-ink" : "bg-brand"}`}>
              <span className="text-xs font-black tracking-[0.15em] text-white">
                {employer ? "I'M HIRING" : "I'M LOOKING FOR A JOB"}
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
            {/* Left Col: Info */}
            <div className="flex flex-col justify-between" data-testid="login-header">
              <div>
                <Logo />
                <div className="mt-8">
                  <h2 className="whitespace-pre-line text-4xl font-black leading-[1.05] tracking-[-0.02em] text-ink">
                    {employer ? "Sign in to\nstart hiring." : "Sign in to\nland gigs."}
                  </h2>
                  <div className="mt-3 h-1.5 w-20 bg-brand" />
                  <p className="mt-5 text-sm leading-6 text-inkmuted">
                    {employer
                      ? "One account to unlock verified pros near you, post custom jobs and chat with applicants in real-time."
                      : "One account to get verified with Aadhaar + portfolio, apply to gigs in your 5km radius and get hired."}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-2 border-ink bg-sand p-4">
                <p className="text-xs font-black tracking-wider text-ink">✨ HYPERLOCAL VERIFIED NETWORK</p>
                <p className="mt-1 text-xs text-inkmuted">
                  Zero commission on gig wages · Direct phone &amp; chat access · Razorpay secured
                </p>
              </div>
            </div>

            {/* Right Col: Sign in forms */}
            <div className="flex flex-col justify-center border-t-2 border-ink pt-6 lg:border-l-2 lg:border-t-0 lg:pl-10 lg:pt-0">
              <div className="flex flex-col gap-3">
                <button
                  data-testid="login-google-btn"
                  onClick={login}
                  className="flex items-center justify-center gap-3 border-2 border-ink bg-ink py-3.5 text-base font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                >
                  Continue with Google
                </button>

                <div className="my-2 flex items-center gap-3">
                  <div className="h-0.5 flex-1 bg-ink/15" />
                  <span className="text-[11px] font-black tracking-widest text-inkmuted">OR</span>
                  <div className="h-0.5 flex-1 bg-ink/15" />
                </div>

                {otpStage === "idle" ? (
                  <>
                    <div className="mb-2 flex h-12 items-center gap-2 border-2 border-ink bg-sand px-3">
                      <Mail size={16} className="text-inkmuted" />
                      <input
                        data-testid="login-email-input"
                        value={emailInput}
                        onChange={(e) => { setEmailInput(e.target.value); setOtpError(null); }}
                        placeholder="you@example.com"
                        className="wh-input flex-1 bg-transparent text-sm font-semibold text-ink placeholder:text-inkmuted"
                      />
                    </div>
                    <button
                      data-testid="login-email-btn"
                      onClick={requestOtp}
                      disabled={otpLoading}
                      className="flex items-center justify-center gap-2 border-2 border-ink bg-white py-3 text-sm font-black text-ink hover:bg-sand disabled:opacity-60"
                    >
                      {otpLoading ? <Loader2 size={18} className="animate-spin" /> : <><Mail size={18} /> Continue with Email</>}
                    </button>
                  </>
                ) : (
                  <div data-testid="otp-block">
                    <p className="mb-2 text-xs text-ink">
                      We emailed a 6-digit code to <span className="font-black">{emailInput.trim()}</span>
                    </p>
                    {devOtp && (
                      <p data-testid="dev-otp-text" className="mb-2 border-2 border-ink bg-[#FFF3C4] p-2 text-xs font-black text-ink">
                        TEST MODE — your code: {devOtp}
                      </p>
                    )}
                    <div className="mb-2 flex h-12 items-center gap-2 border-2 border-ink bg-sand px-3">
                      <KeyRound size={16} className="text-inkmuted" />
                      <input
                        data-testid="login-otp-input"
                        value={otpInput}
                        onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
                        placeholder="6-digit code"
                        className="wh-input flex-1 bg-transparent text-sm font-black tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:font-semibold placeholder:text-inkmuted"
                      />
                    </div>
                    <button
                      data-testid="login-otp-verify-btn"
                      onClick={verifyOtp}
                      disabled={otpLoading}
                      className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3.5 text-base font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
                    >
                      {otpLoading ? <Loader2 size={18} className="animate-spin" /> : "Verify & Continue"}
                    </button>
                    <button
                      data-testid="login-otp-change-email"
                      onClick={() => { setOtpStage("idle"); setOtpError(null); setDevOtp(null); }}
                      className="mt-2 text-xs font-bold text-brand"
                    >
                      ← Use a different email
                    </button>
                  </div>
                )}
                {otpError && <p data-testid="login-otp-error" className="mt-2 text-xs font-bold text-[#C62828]">{otpError}</p>}
                <p className="mt-2 text-center text-[11px] text-inkmuted">🔒 Secure sign-in · No passwords to remember</p>
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
              data-testid="user-chip"
              onClick={() => nav("/profile")}
              className="flex items-center gap-2 border-2 border-ink bg-white px-4 py-2 hover:bg-sand"
            >
              <UserCircle2 size={16} className="text-brand" />
              <span className="truncate text-xs font-extrabold text-ink">{user.name || user.email}</span>
              <ArrowRight size={13} className="text-inkmuted" />
            </button>
            <button data-testid="logout-btn" onClick={logout} className="flex items-center gap-1 border-2 border-ink px-3 py-2 hover:bg-sand">
              <LogOut size={14} /> <span className="text-[10px] font-black tracking-wider">LOGOUT</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => chooseRole("employer")}
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
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 border-2 border-ink bg-sand px-3.5 py-1.5 text-xs font-black tracking-wider">
            <span className="h-2.5 w-2.5 rounded-full bg-ok animate-pulse" />
            <span>HYPERLOCAL WORK PLATFORM · BENGALURU LIVE</span>
          </div>
          <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.03em] text-ink sm:text-7xl lg:text-8xl">
            Pick a side.<br />Get to work.
          </h1>
          <div className="mt-4 h-2 w-28 bg-brand" />
          <p className="mt-6 max-w-2xl text-base leading-7 text-inkmuted sm:text-xl">
            Connect with top-rated, Aadhaar &amp; portfolio-verified professionals within 5km. Direct chats, zero commission on wages, instant hires.
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
                I'M HIRING
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
            className="group border-2 border-ink bg-brand p-8 text-left shadow-[5px_5px_0px_#121212] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-y-1 sm:p-10"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="bg-ink px-4 py-1.5 text-xs font-black tracking-[0.15em] text-white">
                I'M LOOKING FOR A JOB
              </span>
              <div className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-ink group-hover:bg-white">
                <ArrowRight size={24} className="text-white group-hover:text-ink" />
              </div>
            </div>
            <p className="whitespace-pre-line text-3xl font-black leading-tight text-ink sm:text-4xl">
              Go live in your{"\n"}5km radius
            </p>
            <p className="mt-4 text-base leading-7 text-ink/90">
              One-time ₹99 onboarding. Email + portfolio verified. Get discovered by local companies and apply to high-paying gigs in 2 hours.
            </p>
            <div className="mt-8 flex items-center gap-3 border-t border-ink/20 pt-5 text-sm font-extrabold text-ink">
              <span>100% Verified Badge</span>
              <span>•</span>
              <span>Keep 100% of your earnings</span>
            </div>
          </button>

        </div>
      </section>

      {/* Feature Highlights Full Width Grid */}
      <section className="w-full border-b-2 border-ink bg-sand px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-2 border-ink bg-white p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-brand text-white">
              <MapPin size={24} />
            </div>
            <h3 className="mt-4 text-base font-black text-ink">5KM HYPERLOCAL RADIUS</h3>
            <p className="mt-2 text-xs leading-5 text-inkmuted">Meet nearby talent in person or work locally with lightning-fast turnarounds.</p>
          </div>
          
          <div className="border-2 border-ink bg-white p-6 shadow-[3px_3px_0px_#121212]">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-ink text-white">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-4 text-base font-black text-ink">100% VERIFIED PROFILES</h3>
            <p className="mt-2 text-xs leading-5 text-inkmuted">Every freelancer is verified with government ID, email, and live portfolios.</p>
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
            <h3 className="mt-4 text-base font-black text-ink">ZERO WAGE COMMISSIONS</h3>
            <p className="mt-2 text-xs leading-5 text-inkmuted">Keep 100% of your earnings with simple, transparent one-time unlock fees.</p>
          </div>
        </div>
      </section>

      {/* Quick Links & Footer (Full Width) */}
      <footer className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-8 sm:px-10 lg:px-16 xl:px-20" data-testid="landing-footer">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 bg-brand" />
          <span className="text-xs uppercase tracking-wider text-inkmuted">
            WorkHop · Hyperlocal Gigs · Razorpay Secured
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-extrabold text-ink">
          <Link to="/map" className="hover:text-brand">Live Map</Link>
          <Link to="/categories" className="hover:text-brand">Categories</Link>
          <Link to="/employer/plans" className="hover:text-brand">Employer Plans</Link>
          <Link to="/support" className="hover:text-brand">Support</Link>
          <Link to="/legal" className="hover:text-brand">Legal</Link>
          <Link to="/admin" className="hover:text-brand">Admin</Link>
        </div>
      </footer>

    </div>
  );
}
