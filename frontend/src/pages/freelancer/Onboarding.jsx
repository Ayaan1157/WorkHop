import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Lock, CheckCircle2, ArrowRight, Image as ImageIcon, Plus, LocateFixed, Loader2 } from "lucide-react";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { useUserLocation } from "@/hooks/useUserLocation";
import { CATALOG_CATEGORY_NAMES } from "@/lib/catalogFilters";
import { apiGet, apiPost, setFreelancerId, getFreelancerId } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { sanitizeInput } from "@/lib/security";

const TOTAL = 4;

export default function Onboarding() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { startPayment } = useRazorpay();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  const [state, setState] = useState({ freelancerId: null, paid: false, verified: false, verifiedEmail: null });
  const [paying, setPaying] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const [verifyEmail, setVerifyEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [vBusy, setVBusy] = useState(false);
  const [vError, setVError] = useState(null);

  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [phone, setPhone] = useState("");
  const [skill, setSkill] = useState("");
  const [category, setCategory] = useState("Graphics & Design");
  const [rateHr, setRateHr] = useState("");
  const [intro, setIntro] = useState("");
  const [langs, setLangs] = useState(["English"]);
  const [deliveryDays, setDeliveryDays] = useState(3);
  const [hasExternal, setHasExternal] = useState(null);
  const [extPlatform, setExtPlatform] = useState("fiverr");
  const [extUrl, setExtUrl] = useState("");
  const [extRating, setExtRating] = useState("");
  const [extReviews, setExtReviews] = useState("");
  const [slots, setSlots] = useState([null, null, null]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => { if (user?.email) setVerifyEmail((v) => v || user.email); }, [user?.email]);

  useEffect(() => {
    (async () => {
      const fid = getFreelancerId();
      if (!fid) return;
      try {
        const s = await apiGet(`/freelancer/${fid}`);
        setState((p) => ({ ...p, freelancerId: fid, paid: !!s.paid, verified: !!s.aadhaar_verified }));
        const pr = await apiGet(`/freelancer/${fid}/profile`).catch(() => null);
        if (pr) {
          if (pr.phone) setPhone(String(pr.phone).replace(/\D/g, "").replace(/^91/, ""));
          if (pr.skill) setSkill(pr.skill);
          if (pr.category) setCategory(pr.category);
          if (pr.linkedin_url) setLinkedin(pr.linkedin_url);
          if (pr.portfolio_url) setPortfolio(pr.portfolio_url);
          if (pr.rate_hr) setRateHr(String(pr.rate_hr));
          if (pr.intro) setIntro(pr.intro);
          if (Array.isArray(pr.languages) && pr.languages.length) setLangs(pr.languages);
          if (pr.delivery_days) setDeliveryDays(pr.delivery_days);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10;
  const step3Done = !!linkedin && !!portfolio && phoneValid && !!skill.trim() && Number(rateHr) > 0 && !!intro.trim() && langs.length > 0;
  const slotsDone = slots.every(Boolean);
  const completed = (state.paid ? 1 : 0) + (state.verified ? 1 : 0) + (step3Done ? 1 : 0) + (slotsDone ? 1 : 0) + (termsAccepted ? 1 : 0);
  const progressPct = Math.min((completed / (TOTAL + 1)) * 100, 100);
  const allReady = state.paid && state.verified && step3Done && slotsDone && termsAccepted;

  const handlePay = async () => {
    setPaying(true);
    try {
      const data = await startPayment({ product: "freelancer_onboarding", full_name: "New Pro", coupon_code: coupon?.code ?? null }, `Verified Pro onboarding · ₹${coupon?.final_amount ?? 99}`);
      if (data?.freelancer_id) { setState((s) => ({ ...s, freelancerId: data.freelancer_id, paid: true })); setFreelancerId(data.freelancer_id); }
    } catch (e) { if (e?.message !== "PAYMENT_CANCELLED") console.log("pay err", e); }
    finally { setPaying(false); }
  };

  const sendOtp = async () => {
    setVError(null);
    const email = verifyEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setVError("Enter a valid email address.");
    setVBusy(true);
    try {
      const data = await apiPost("/auth/email/request-otp", { email });
      setOtpSent(true); setDevOtp(data.dev_otp || null); setOtpCode("");
    } catch (e) { setVError(e?.message || "Could not send code."); }
    finally { setVBusy(false); }
  };

  const confirmOtp = async () => {
    if (!state.freelancerId) return;
    setVError(null);
    if (otpCode.trim().length !== 6) return setVError("Enter the 6-digit code.");
    setVBusy(true);
    try {
      const data = await apiPost("/freelancer/verify-email", { freelancer_id: state.freelancerId, email: verifyEmail.trim().toLowerCase(), otp: otpCode.trim() });
      if (data.verified) setState((s) => ({ ...s, verified: true, verifiedEmail: data.email }));
      else setVError(data?.detail || "Verification failed.");
    } catch (e) { setVError(e?.message || "Verification failed."); }
    finally { setVBusy(false); }
  };

  const pickSlot = (i, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSlots((prev) => { const n = [...prev]; n[i] = String(reader.result).split(",")[1] || ""; return n; });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!state.freelancerId || !allReady) return;
    setSubmitting(true);
    try {
      await apiPost("/freelancer/submit", {
        freelancer_id: state.freelancerId,
        linkedin_url: sanitizeInput(linkedin),
        portfolio_url: sanitizeInput(portfolio),
        portfolio_images: slots.filter(Boolean),
        phone: phoneDigits,
        skill: sanitizeInput(skill),
        category,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        rate_hr: Number(rateHr) || null,
        intro: sanitizeInput(intro),
        languages: langs,
        delivery_days: deliveryDays,
        external_platform: hasExternal ? extPlatform : "",
        external_url: hasExternal ? sanitizeInput(extUrl) : "",
        external_rating: hasExternal && extRating ? Math.min(5, parseFloat(extRating)) : null,
        external_reviews: hasExternal && extReviews ? parseInt(extReviews, 10) : null,
      });
      setShowOverlay(true);
    } catch (e) { console.log("submit err", e); }
    finally { setSubmitting(false); }
  };

  const chip = (on) => `border-2 border-ink px-2.5 py-1.5 text-[9px] font-black tracking-wide ${on ? "bg-ink text-white" : "bg-white text-ink"}`;
  const inputCls = "wh-input w-full border-2 border-ink bg-white px-3 py-3 text-sm text-ink placeholder:text-[#9A9A9A]";
  const fieldLabel = "text-[11px] font-black uppercase tracking-wider text-inkmuted";

  return (
    <div className="min-h-screen w-full bg-sand/30 text-ink">
      <div className="w-full min-h-screen bg-white max-w-2xl mx-auto border-x-0 sm:border-x-2 border-ink shadow-sm">
        <div className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
          <button data-testid="freelancer-back-btn" onClick={() => nav(-1)} className="flex h-10 w-10 items-center justify-center border-2 border-ink"><ChevronLeft size={22} /></button>
          <div className="flex-1"><p className="text-[14px] font-black tracking-[0.12em] text-ink">VERIFIED PRO ONBOARDING</p><p className="text-[11px] text-inkmuted">Step {Math.min(completed + 1, TOTAL)} of {TOTAL}</p></div>
          <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-brand"><ShieldCheck size={18} className="text-white" /></span>
        </div>

        <div className="h-1.5 border-b-2 border-ink bg-sand" data-testid="progress-track"><div className="h-full bg-brand transition-all" style={{ width: `${progressPct}%` }} /></div>
        <div className="flex border-b-2 border-ink px-4 py-3">
          {[1, 2, 3, 4].map((n) => {
            const done = (n === 1 && state.paid) || (n === 2 && state.verified) || (n === 3 && step3Done) || (n === 4 && slotsDone);
            return <div key={n} className="flex flex-1 justify-center"><span className={`flex h-7 w-7 items-center justify-center border-2 border-ink text-xs font-black ${done ? "bg-brand text-white" : "bg-white text-ink"}`}>{n}</span></div>;
          })}
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-6 pb-16">
          {/* STEP 1 */}
          <Step n={1} title="Payment Gateway Tether" active testID="step1-card">
            <div className="flex items-center gap-3 border-2 border-ink bg-sand p-3">
              <span className="flex h-16 w-16 items-center justify-center border-2 border-ink bg-brand"><ShieldCheck size={30} className="text-white" /></span>
              <div className="flex-1">
                <span className="inline-flex items-center gap-1 bg-ink px-2 py-1 text-[10px] font-black tracking-wide text-white"><ShieldCheck size={12} /> Get the Verified Badge</span>
                <p className="mt-2 text-[13px] font-bold leading-5 text-ink">Pay a one-time fee of ₹99 to launch your profile live within a 5km radius.</p>
              </div>
            </div>
            {!state.paid && <div className="my-2"><CouponInput product="freelancer_onboarding" amount={99} onApplied={setCoupon} testIDPrefix="onboarding-coupon" /></div>}
            <button data-testid="step1-pay-btn" disabled={paying || state.paid} onClick={handlePay} className={`flex items-center justify-center gap-2 border-2 border-ink py-3 text-sm font-black text-white ${state.paid ? "bg-ok" : "bg-brand"} disabled:opacity-70`}>
              {paying ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : state.paid ? <><CheckCircle2 size={18} /> Payment Verified · ₹99</> : "Pay Onboarding Fee · ₹99"}
            </button>
          </Step>

          {/* STEP 2 */}
          <Step n={2} title="Verify Your Email" active={state.paid} testID="step2-block">
            {state.verified ? (
              <div data-testid="email-verify-success" className="flex items-center gap-2 border-2 border-ok bg-[#E5F8EE] px-3 py-2"><ShieldCheck size={14} className="text-ok" /><span className="text-xs font-extrabold text-ink">Email verified · {state.verifiedEmail || verifyEmail}</span></div>
            ) : (
              <>
                <p className="text-[11px] text-inkmuted">We'll email you a 6-digit code to confirm it's really you.</p>
                <div className="flex gap-2">
                  <input data-testid="verify-email-input" value={verifyEmail} onChange={(e) => { setVerifyEmail(e.target.value); setVError(null); }} placeholder="you@example.com" disabled={!state.paid || otpSent} className={`${inputCls} flex-1 tracking-wide`} />
                  {!otpSent && <button data-testid="send-otp-btn" onClick={sendOtp} disabled={!state.paid || vBusy} className="min-w-[90px] bg-ink px-4 text-xs font-black tracking-wider text-white disabled:opacity-60">{vBusy ? <Loader2 size={16} className="mx-auto animate-spin" /> : "SEND OTP"}</button>}
                </div>
                {otpSent && (
                  <>
                    {devOtp && <p data-testid="wizard-dev-otp" className="border-[1.5px] border-ink bg-[#FFF3C4] p-2 text-xs font-black text-ink">TEST MODE — your code: {devOtp}</p>}
                    <div className="flex gap-2">
                      <input data-testid="otp-code-input" value={otpCode} onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setVError(null); }} placeholder="6-digit code" className={`${inputCls} flex-1 font-black tracking-[0.4em]`} />
                      <button data-testid="confirm-otp-btn" onClick={confirmOtp} disabled={vBusy} className="min-w-[90px] bg-ink px-4 text-xs font-black tracking-wider text-white disabled:opacity-60">{vBusy ? <Loader2 size={16} className="mx-auto animate-spin" /> : "VERIFY"}</button>
                    </div>
                    <button data-testid="otp-change-email-btn" onClick={() => { setOtpSent(false); setDevOtp(null); setOtpCode(""); setVError(null); }} className="text-left text-xs font-bold text-brand">← Change email / resend code</button>
                  </>
                )}
              </>
            )}
            {vError && <p data-testid="email-verify-error" className="text-xs font-bold text-danger">{vError}</p>}
          </Step>

          {/* STEP 3 */}
          <Step n={3} title="Contact & Professional Links" active={state.paid} testID="step3-block">
            <Labeled label="Phone Number (shown to employers after unlock)" testID="phone-input" value={phone} onChange={(v) => setPhone(v.replace(/[^0-9]/g, "").slice(0, 10))} placeholder="10-digit mobile number" disabled={!state.paid} />
            {phone.length > 0 && !phoneValid && <p data-testid="phone-error" className="text-xs font-bold text-danger">Phone must be exactly 10 digits.</p>}
            <Labeled label="Primary Skill" testID="skill-input" value={skill} onChange={setSkill} placeholder="e.g. Logo Designer, Video Editor" disabled={!state.paid} />
            <p className={fieldLabel}>CATEGORY</p>
            <div className="flex flex-wrap gap-2">{CATALOG_CATEGORY_NAMES.map((c) => <button key={c} data-testid={`profile-cat-${c.toLowerCase().replace(/[^a-z]+/g, "-")}`} onClick={() => state.paid && setCategory(c)} className={chip(category === c)}>{c.toUpperCase()}</button>)}</div>
            <button data-testid="profile-location-btn" onClick={() => state.paid && requestLocation()} className={`flex items-center gap-2 border-2 border-ink px-3 py-2 text-left ${coords ? "bg-ok" : "bg-sand"}`}>
              {locStatus === "locating" ? <Loader2 size={14} className={`animate-spin ${coords ? "text-white" : "text-ink"}`} /> : <LocateFixed size={14} className={coords ? "text-white" : "text-ink"} />}
              <span className={`flex-1 text-[10px] font-extrabold ${coords ? "text-white" : "text-ink"}`}>{coords ? "LOCATION ADDED ✓" : "ADD MY LOCATION (optional · rank nearest to employers)"}</span>
            </button>
            <Labeled label="Fee per Hour (₹) — shown on your profile" testID="rate-input" value={rateHr} onChange={(v) => setRateHr(v.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="e.g. 500" disabled={!state.paid} />
            <p className={fieldLabel}>TYPICAL DELIVERY TIME</p>
            <div className="flex flex-wrap gap-2">{[1, 3, 7, 14].map((d) => <button key={d} data-testid={`delivery-chip-${d}`} onClick={() => state.paid && setDeliveryDays(d)} className={chip(deliveryDays === d)}>{d} DAY{d > 1 ? "S" : ""}</button>)}</div>
            <p className={fieldLabel}>LANGUAGES YOU SPEAK</p>
            <div className="flex flex-wrap gap-2">{["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam"].map((l) => { const on = langs.includes(l); return <button key={l} data-testid={`lang-chip-${l.toLowerCase()}`} onClick={() => state.paid && setLangs((p) => on ? p.filter((x) => x !== l) : [...p, l])} className={chip(on)}>{l.toUpperCase()}</button>; })}</div>
            <Labeled label="Short Intro — employers see this before unlocking you" testID="intro-input" value={intro} onChange={(v) => setIntro(v.slice(0, 400))} placeholder="e.g. Logo designer with 5 yrs experience…" disabled={!state.paid} multiline />
            <p className={fieldLabel}>DO YOU HAVE A FIVERR OR UPWORK PROFILE?</p>
            <div className="flex gap-2">
              <button data-testid="external-yes-btn" onClick={() => state.paid && setHasExternal(true)} className={chip(hasExternal === true)}>YES</button>
              <button data-testid="external-no-btn" onClick={() => state.paid && setHasExternal(false)} className={chip(hasExternal === false)}>NO</button>
            </div>
            {hasExternal === true && (
              <div data-testid="external-import-block" className="flex flex-col gap-2 border-2 border-ink bg-[#FFF3C4] p-3">
                <p className="text-[10px] font-black tracking-wider text-ink">TRANSFER YOUR RATING & REVIEWS</p>
                <div className="flex gap-2">{["fiverr", "upwork"].map((p) => <button key={p} data-testid={`ext-platform-${p}`} onClick={() => setExtPlatform(p)} className={chip(extPlatform === p)}>{p.toUpperCase()}</button>)}</div>
                <Labeled label={`Your ${extPlatform === "fiverr" ? "Fiverr" : "Upwork"} profile URL`} testID="ext-url-input" value={extUrl} onChange={setExtUrl} placeholder={extPlatform === "fiverr" ? "fiverr.com/yourname" : "upwork.com/freelancers/you"} disabled={!state.paid} />
                <div className="flex gap-2">
                  <div className="flex-1"><Labeled label="Rating (0–5)" testID="ext-rating-input" value={extRating} onChange={(v) => setExtRating(v.replace(/[^0-9.]/g, "").slice(0, 3))} placeholder="4.9" disabled={!state.paid} /></div>
                  <div className="flex-1"><Labeled label="No. of reviews" testID="ext-reviews-input" value={extReviews} onChange={(v) => setExtReviews(v.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="120" disabled={!state.paid} /></div>
                </div>
              </div>
            )}
            <Labeled label="LinkedIn Profile URL" testID="linkedin-input" value={linkedin} onChange={setLinkedin} placeholder="linkedin.com/in/yourname" disabled={!state.paid} />
            <Labeled label="Professional Website or Linktree" testID="portfolio-input" value={portfolio} onChange={setPortfolio} placeholder="yourportfolio.com" disabled={!state.paid} />
          </Step>

          {/* STEP 4 */}
          <Step n={4} title="Upload your work images (logo, landing page, 3D design, etc.)" active={state.paid} testID="step4-block">
            <p className="text-xs text-inkmuted">Upload up to 3 high-resolution case studies (Max 5MB each • JPG, PNG, WEBP)</p>
            <div className="flex gap-3">
              {slots.map((slot, i) => (
                <label key={i} data-testid={`portfolio-slot-${i}`} className={`flex aspect-square flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-2 border-ink ${slot ? "bg-[#FFE5D6]" : "bg-sand"}`}>
                  {slot ? <><ImageIcon size={26} className="text-brand" /><span className="text-[9px] font-black tracking-wide text-ink">UPLOADED</span></> : <Plus size={32} className="text-ink" />}
                  <input type="file" accept="image/*" disabled={!state.paid} onChange={(e) => pickSlot(i, e)} className="hidden" />
                </label>
              ))}
            </div>
          </Step>

          {/* Terms & Conditions and 18+ Age Declaration Checkbox */}
          <label
            data-testid="onboarding-terms-checkbox-label"
            className={`flex items-start gap-2.5 cursor-pointer select-none border-2 p-3.5 shadow-[2px_2px_0px_#121212] transition ${
              termsAccepted ? "border-ink bg-white" : "border-ink/40 bg-sand/40 hover:border-ink"
            }`}
          >
            <input
              type="checkbox"
              data-testid="onboarding-terms-checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-none border-2 border-ink text-brand focus:ring-0 accent-[#FF5A1F] cursor-pointer shrink-0"
            />
            <span className="text-xs font-bold leading-snug text-ink">
              I agree to the{" "}
              <a
                href="/legal"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline hover:text-black font-extrabold"
                onClick={(e) => e.stopPropagation()}
              >
                Terms and Conditions
              </a>{" "}
              and confirm that I am 18 years of age or older.
            </span>
          </label>

          <button data-testid="submit-btn" disabled={!allReady || submitting} onClick={handleSubmit} className={`flex items-center justify-center gap-2 border-2 border-ink bg-ink py-4 text-[15px] font-black text-white ${!allReady ? "opacity-35" : ""}`}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <>Submit for Verification <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>

      {showOverlay && (
        <div data-testid="processing-overlay" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white p-8 text-center">
          <span className="flex h-32 w-32 animate-bounce items-center justify-center border-2 border-ink bg-brand"><ShieldCheck size={64} className="text-white" /></span>
          <span className="inline-flex items-center gap-2 bg-ink px-3 py-1.5"><span className="h-2 w-2 bg-brand" /><span className="text-[11px] font-black tracking-[0.14em] text-white">VERIFYING</span></span>
          <p className="whitespace-pre-line text-2xl font-black leading-tight text-ink">Our team is verifying your{"\n"}email and links.</p>
          <p className="text-sm text-inkmuted">Your profile will leap live within 2 hours.</p>
          <button data-testid="overlay-jobs-btn" onClick={() => nav("/freelancer/jobs")} className="border-2 border-ink bg-brand px-8 py-3 text-sm font-black text-white">View jobs near you</button>
          <button data-testid="overlay-done-btn" onClick={() => nav("/")} className="border-2 border-ink px-8 py-3 text-[13px] font-black text-ink">Back to home</button>
        </div>
      )}
    </div>
  );
}

function Step({ n, title, active, children, testID }) {
  return (
    <div data-testid={testID} className={`flex flex-col gap-3 border-2 border-ink bg-white p-4 ${!active ? "pointer-events-none opacity-40" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center border-2 border-ink text-sm font-black ${active ? "bg-brand text-white" : "bg-sand text-ink"}`}>0{n}</span>
        <p className="flex-1 text-base font-black leading-tight text-ink">{title}</p>
        {!active && <span className="flex h-7 w-7 items-center justify-center bg-ink"><Lock size={14} className="text-white" /></span>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Labeled({ label, value, onChange, placeholder, disabled, testID, multiline }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-black uppercase tracking-wider text-inkmuted">{label}</p>
      {multiline ? (
        <textarea data-testid={testID} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="wh-input h-[88px] w-full border-2 border-ink bg-white p-3 text-sm text-ink placeholder:text-[#9A9A9A]" />
      ) : (
        <input data-testid={testID} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="wh-input w-full border-2 border-ink bg-white px-3 py-3 text-sm text-ink placeholder:text-[#9A9A9A]" />
      )}
    </div>
  );
}
