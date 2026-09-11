import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, KeyRound, ArrowRight, LogOut, UserCircle2, Loader2 } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function Logo() {
  return (
    <div className="flex flex-col items-center" data-testid="landing-logo">
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <Logo />
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  // ---- Sign-in screen (role chosen, not signed in) ----
  if (pendingRole && !user) {
    const employer = pendingRole === "employer";
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white px-6 pb-8">
        <div className="flex items-center justify-between pt-5">
          <button
            data-testid="login-back-btn"
            onClick={() => {
              localStorage.removeItem("workhop_pending_role");
              setPendingRole(null);
            }}
            className="flex h-10 w-10 items-center justify-center border-2 border-ink"
          >
            <ChevronLeft size={22} />
          </button>
          <div className={`border-2 border-ink px-3 py-1.5 ${employer ? "bg-ink" : "bg-brand"}`}>
            <span className="text-[11px] font-black tracking-[0.15em] text-white">
              {employer ? "I'M HIRING" : "I'M LOOKING FOR A JOB"}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center" data-testid="login-header">
          <Logo />
        </div>

        <div className="mt-8">
          <h2 className="whitespace-pre-line text-4xl font-black leading-[1.05] tracking-[-0.02em] text-ink">
            {employer ? "Sign in to\nstart hiring." : "Sign in to\nland gigs."}
          </h2>
          <div className="mt-3 h-1.5 w-16 bg-brand" />
          <p className="mt-4 text-sm leading-6 text-inkmuted">
            {employer
              ? "One account to unlock verified pros near you, post jobs and chat with applicants."
              : "One account to get verified, apply to gigs in your 5km radius and chat with employers."}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            data-testid="login-google-btn"
            onClick={login}
            className="flex items-center justify-center gap-3 border-2 border-ink bg-ink py-4 text-base font-black text-white transition active:translate-y-0.5"
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
                className="flex items-center justify-center gap-2 border-2 border-ink bg-white py-3 text-sm font-black text-ink disabled:opacity-60"
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
                className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-4 text-base font-black text-white disabled:opacity-60"
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
          <p className="text-center text-[11px] text-inkmuted">🔒 Secure sign-in · No passwords to remember</p>
        </div>
      </div>
    );
  }

  // ---- Landing (role picker) ----
  return (
    <div className="mx-auto min-h-screen max-w-md bg-white px-6 pb-8">
      <div className="flex flex-col items-center pt-6" data-testid="landing-header">
        <Logo />
      </div>

      {user && (
        <div className="mt-4 flex items-center gap-2" data-testid="user-row">
          <button
            data-testid="user-chip"
            onClick={() => nav("/profile")}
            className="flex flex-1 items-center gap-1.5 border-2 border-ink bg-white px-3 py-2"
          >
            <UserCircle2 size={18} className="text-brand" />
            <span className="flex-1 truncate text-left text-xs font-extrabold text-ink">{user.name || user.email}</span>
            <ArrowRight size={13} className="text-inkmuted" />
          </button>
          <button data-testid="logout-btn" onClick={logout} className="flex items-center gap-1 border-2 border-ink px-3 py-2.5">
            <LogOut size={14} /> <span className="text-[10px] font-black tracking-wider">LOGOUT</span>
          </button>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.03em] text-ink">Pick a side.<br />Get to work.</h2>
        <div className="mt-3 h-1.5 w-16 bg-brand" />
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <button
          data-testid="role-employer-card"
          onClick={() => chooseRole("employer")}
          className="border-2 border-ink bg-ink p-6 text-left transition active:translate-y-0.5"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-brand px-3 py-1.5 text-[11px] font-black tracking-[0.15em] text-white">I'M HIRING</span>
            <ArrowRight size={22} className="text-white" />
          </div>
          <p className="whitespace-pre-line text-2xl font-black leading-tight text-white">Find 5 verified{"\n"}experts on your block</p>
          <p className="mt-3 text-[13px] leading-5 text-[#D6D6D6]">Unlock contact + portfolio of nearest pros. One-time ₹199.</p>
        </button>

        <button
          data-testid="role-freelancer-card"
          onClick={() => chooseRole("freelancer")}
          className="border-2 border-ink bg-brand p-6 text-left transition active:translate-y-0.5"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-ink px-3 py-1.5 text-[11px] font-black tracking-[0.15em] text-white">I'M LOOKING FOR A JOB</span>
            <ArrowRight size={22} className="text-ink" />
          </div>
          <p className="whitespace-pre-line text-2xl font-black leading-tight text-ink">Go live in your{"\n"}5km radius</p>
          <p className="mt-3 text-[13px] leading-5 text-ink/85">One-time ₹99 onboarding. Email + portfolio verified. Leap live in 2 hrs.</p>
        </button>
      </div>

      <div className="mt-10 flex items-center gap-2" data-testid="landing-footer">
        <div className="h-2 w-2 bg-brand" />
        <span className="text-[11px] uppercase tracking-wider text-inkmuted">Dual-sided monetization · Razorpay/UPI</span>
      </div>
    </div>
  );
}
