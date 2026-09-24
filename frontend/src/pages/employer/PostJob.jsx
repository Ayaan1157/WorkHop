import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle2, Loader2, LocateFixed, ShieldCheck, MapPin, Sparkles, AlertCircle, Coins, Zap, Flame
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import { CATALOG_CATEGORY_NAMES, DISCIPLINES_CATALOG } from "@/lib/catalogFilters";
import { useRazorpay } from "@/hooks/usePayments";
import { useUserLocation } from "@/hooks/useUserLocation";
import { BENGALURU_AREAS, findNearestArea, getAreaCoordinates } from "@/lib/locationAreas";
import { API, apiGet, apiPost, getEmployerId } from "@/lib/api";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import MarketPriceAdvisor from "@/components/MarketPriceAdvisor";
import { sanitizeInput, checkSpamKeywords } from "@/lib/security";
import { ADMIN_EMAILS, getCreditsConfig } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";

export default function PostJob() {
  const nav = useNavigate();
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.is_admin ||
    user?.role === "admin" ||
    (user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()))
  );
  const { startPayment } = useRazorpay();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  const [credits, setCredits] = useState(null);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState("Graphics & Design");
  const [pay, setPay] = useState("");
  const location = useLocation();
  const [isBoosted, setIsBoosted] = useState(() => Boolean(location.state?.boost));
  const [area, setArea] = useState("Koramangala");
  const [customCoords, setCustomCoords] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const loadCredits = useCallback(async () => {
    if (isAdmin) {
      setCredits({ remaining: 9999, total: 9999 });
      return;
    }
    try {
      const data = await apiGet(`/employer/${getEmployerId()}/post-credits`);
      if (data) setCredits(data);
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // When GPS location is granted, auto-detect the closest area
  useEffect(() => {
    if (coords && coords.lat && coords.lng) {
      const nearest = findNearestArea(coords);
      if (nearest) {
        setArea(nearest.name);
        setCustomCoords({ lat: coords.lat, lng: coords.lng });
      }
    }
  }, [coords]);

  const handleSelectArea = (areaName) => {
    setArea(areaName);
    const resolved = getAreaCoordinates(areaName);
    setCustomCoords(resolved);
  };

  const submit = async (retryAfterPay = true) => {
    setError("");
    const cleanCompany = sanitizeInput(company);
    const cleanTitle = sanitizeInput(title);
    const cleanDesc = sanitizeInput(description);
    const cleanArea = sanitizeInput(area);

    if (!cleanCompany || !cleanTitle || !cleanDesc || !pay) {
      return setError("Fill in company, title, pay, and description.");
    }

    // Safety Measure: Content Moderation & Spam Keyword Scanner
    const spamCheck = checkSpamKeywords(`${cleanTitle} ${cleanDesc} ${cleanCompany}`);
    if (spamCheck.isSpam) {
      return setError(`Safety filter notice: Job description contains flagged content (${spamCheck.matched.join(", ")}). Please remove before posting.`);
    }

    // Safety Measure: Human Verification reCAPTCHA
    if (!captchaToken) {
      return setError("Please complete the reCAPTCHA human verification check before publishing your gig.");
    }

    // Terms & Conditions and 18+ Age Declaration Check
    if (!termsAccepted) {
      return setError("Please agree to the Terms and Conditions and confirm you are 18 years of age or older.");
    }

    setSubmitting(true);
    try {
      const eid = getEmployerId();
      const areaCoords = customCoords || getAreaCoordinates(cleanArea);

      // If urgent boost is enabled and user is not admin, charge ₹399 for the optional boost
      if (isBoosted && !isAdmin && retryAfterPay) {
        try {
          const pr = await startPayment(
            { product: "job_boost", plan_id: "urgent-boost", employer_id: eid, amount: 399 },
            "Urgent Job Boost (48 hrs) · ₹399"
          );
          if (pr?.ok === false && !pr?.purchase) {
            setError("Boost payment cancelled. Uncheck boost to publish for free.");
            setSubmitting(false);
            return;
          }
        } catch (payErr) {
          if (payErr?.message === "PAYMENT_CANCELLED") {
            setError("Boost payment cancelled. Uncheck boost to publish for free.");
            setSubmitting(false);
            return;
          }
          throw payErr;
        }
      }

      // Standard job posting is 100% free!
      const data = await apiPost("/employer/jobs", {
        employer_id: eid,
        company_name: cleanCompany,
        title: cleanTitle,
        bucket,
        pay: parseInt(pay, 10) || 0,
        description: cleanDesc,
        area: cleanArea || "Bengaluru",
        lat: areaCoords.lat,
        lng: areaCoords.lng,
        is_boosted: isBoosted,
      });

      if (data) {
        setPosted(true);
        loadCredits();
        return;
      }
      setError("Could not post the job. Please try again.");
    } catch (e) {
      if (e?.message !== "PAYMENT_CANCELLED") setError(e?.message || "Could not post the job.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "wh-input h-12 border-2 border-ink bg-white px-3 text-sm font-semibold text-ink outline-none";
  const label = "text-[10px] font-black tracking-[0.15em] text-ink uppercase";

  return (
    <Shell>
      <TopBar
        title="POST A JOB"
        sub="100% Free Job Posting · Bangalore's Gig Network"
        backTestID="postjob-back-btn"
        right={
          <span className="border-2 border-ink px-2.5 py-1.5 text-[10px] font-black bg-ok text-white tracking-wider">
            100% FREE
          </span>
        }
      />

      {posted ? (
        <div data-testid="postjob-success" className="mt-10 flex flex-col items-center gap-3 p-8 text-center animate-in fade-in">
          <CheckCircle2 size={56} className="text-ok" />
          <p className="text-2xl font-black text-ink">Job is live!</p>
          <p className="text-[13px] text-inkmuted max-w-sm">
            Verified pros in <span className="font-bold text-ink">{area}</span> and surrounding neighborhoods (5km radius) can now see and apply to your gig.
          </p>
          <button
            data-testid="postjob-done-btn"
            onClick={() => nav(-1)}
            className="w-full max-w-xs bg-ink py-4 text-sm font-black tracking-wider text-white hover:bg-brand transition"
          >
            DONE
          </button>
          <button
            data-testid="postjob-another-btn"
            onClick={() => {
              setPosted(false);
              setTitle("");
              setDescription("");
              setPay("");
            }}
            className="w-full max-w-xs border-2 border-ink py-3 text-xs font-black tracking-wider text-ink hover:bg-sand transition"
          >
            POST ANOTHER
          </button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6 pb-20">
          {/* PRIVACY & AREA NOTICE */}
          <div className="flex items-start gap-2.5 border-2 border-ink bg-[#FFF3C4] p-3.5 shadow-[2px_2px_0px_#121212]">
            <ShieldCheck size={18} className="text-brand shrink-0 mt-0.5" />
            <div className="text-xs text-ink leading-5">
              <span className="font-black text-ink uppercase tracking-wider block mb-0.5">
                🔒 Hyperlocal Privacy Protected
              </span>
              Enter your <strong>neighborhood / general area</strong> only (e.g. Koramangala, Indiranagar) — <em>never add your exact house, flat, or building address</em>. Applicants only see your general locality and calculated distance.
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={label}>COMPANY / EMPLOYER NAME</label>
            <input
              data-testid="postjob-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. BrewBox Cafe, Studio 9, or Your Name"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={label}>JOB TITLE</label>
            <input
              data-testid="postjob-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design our cafe menu & social flyers"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={label}>CATEGORY</label>
            <div className="flex flex-wrap gap-2">
              {CATALOG_CATEGORY_NAMES.map((b) => (
                <button
                  key={b}
                  type="button"
                  data-testid={`postjob-cat-${b.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  onClick={() => setBucket(b)}
                  className={`border-2 border-ink px-3 py-2 text-[10px] font-black transition ${
                    bucket === b ? "bg-ink text-white" : "bg-white text-ink hover:bg-sand"
                  }`}
                >
                  {b.toUpperCase()}
                </button>
              ))}
            </div>
            {(() => {
              const catObj = DISCIPLINES_CATALOG.find((d) => d.category === bucket);
              if (!catObj || !catObj.subcategories.length) return null;
              return (
                <div className="mt-2 flex flex-col gap-1 rounded border border-ink/30 bg-sand/40 dark:bg-[#202020] p-2.5">
                  <span className="text-[10px] font-black tracking-wider text-inkmuted dark:text-stone-400">
                    BANGALORE SUB-DISCIPLINES (TAP TO PREFILL TITLE):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {catObj.subcategories.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setTitle(sub)}
                        className="border border-ink/40 bg-white dark:bg-[#181818] px-2 py-1 text-[11px] font-bold text-ink dark:text-stone-200 hover:bg-brand hover:text-white transition shadow-[1px_1px_0px_#121212]"
                      >
                        + {sub}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className={label}>BUDGET / PAY (₹ FIXED OR MILESTONE)</label>
              <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                Non-binding custom budget
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-black text-inkmuted">₹</span>
              <input
                data-testid="postjob-pay"
                value={pay}
                onChange={(e) => setPay(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 12000"
                className={`${inputCls} pl-8 w-full`}
              />
            </div>

            {/* Smart Market Price Suggestion Card */}
            <MarketPriceAdvisor
              category={bucket}
              title={title}
              description={description}
              area={area}
              currentPay={pay}
              onApplyRate={(suggestedRate) => setPay(suggestedRate)}
              className="mt-1"
            />

            {/* Credit Cost Calculation Preview */}
            <div
              data-testid="postjob-credits-preview"
              className="mt-2 flex items-center justify-between border-2 border-dashed border-ink/40 bg-sand/60 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 font-bold text-ink">
                <Coins size={16} className="text-brand shrink-0" />
                <span>Freelancer Hops Required:</span>
              </div>
              <span className="font-black text-ink bg-white px-2 py-0.5 border border-ink shadow-[1px_1px_0px_#121212]">
                {Math.max(1, Math.floor((parseInt(pay, 10) || 0) / 1000))} Hops
              </span>
            </div>
          </div>

          {/* AREA SELECTION & REAL-TIME GEOLOCATION */}
          <div className="flex flex-col gap-2 border-2 border-ink bg-sand p-3.5">
            <div className="flex items-center justify-between">
              <label className={label}>JOB LOCALITY / AREA (NO HOUSE ADDRESS)</label>
              <button
                type="button"
                onClick={requestLocation}
                className="flex items-center gap-1 border border-ink bg-brand px-2.5 py-1 text-[10px] font-black text-white hover:bg-brand/90 transition active:translate-y-0.5"
              >
                {locStatus === "locating" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <LocateFixed size={12} />
                )}
                <span>USE LIVE GPS LOCATION</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                data-testid="postjob-area"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setCustomCoords(null);
                }}
                placeholder="e.g. Koramangala, Indiranagar, HSR Layout"
                className={`${inputCls} flex-1`}
              />
            </div>

            {/* QUICK AREA CHIPS */}
            <div className="mt-1">
              <span className="text-[9px] font-black tracking-wider text-inkmuted uppercase block mb-1.5">
                POPULAR BENGALURU LOCALITIES:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BENGALURU_AREAS.slice(0, 10).map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => handleSelectArea(a.name)}
                    className={`border border-ink px-2 py-1 text-[10px] font-bold transition ${
                      area === a.name
                        ? "bg-ink text-white"
                        : "bg-white text-ink hover:bg-sand/80"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={label}>SCOPE &amp; DELIVERABLES DESCRIPTION</label>
            <textarea
              data-testid="postjob-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the deliverables, timeline, required skills, and any specific preferences…"
              className="wh-input h-28 border-2 border-ink bg-white p-3 text-sm font-semibold text-ink outline-none"
            />
          </div>

          {/* EMPLOYER JOB BOOST & URGENT HIGHLIGHT */}
          <div
            data-testid="employer-job-boost-card"
            onClick={() => setIsBoosted(!isBoosted)}
            className={`cursor-pointer border-2 border-ink p-4 transition shadow-[3px_3px_0px_#121212] ${
              isBoosted ? "bg-[#FFF5F5] ring-2 ring-[#FF3B30] shadow-[3px_3px_0px_#FF3B30]" : "bg-white hover:bg-stone-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink ${
                  isBoosted ? "bg-[#FF3B30] text-white" : "bg-[#FFEBEA] text-[#FF3B30]"
                }`}>
                  <Flame size={20} className={isBoosted ? "fill-white text-white" : "fill-[#FF3B30] text-[#FF3B30]"} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black uppercase text-ink">
                      Boost Job &amp; Mark Urgent
                    </p>
                    <span className="border border-ink bg-[#FF3B30] px-1.5 py-0.2 text-[9px] font-black uppercase text-white shadow-[1px_1px_0px_#121212] flex items-center gap-1">
                      <Flame size={9} fill="white" /> URGENT · 48H
                    </span>
                  </div>
                  <p className="text-xs text-inkmuted mt-0.5">
                    Pin this gig at the top of freelancer searches and neighborhood feeds with a glowing URGENT badge.
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={isBoosted}
                    onChange={(e) => setIsBoosted(e.target.checked)}
                    className="h-4 w-4 accent-[#FF3B30] cursor-pointer"
                  />
                  <span className="text-xs font-black text-ink">{isAdmin ? "FREE (Admin)" : "+₹399"}</span>
                </div>
                <p className="text-[10px] text-inkmuted font-bold">48 hrs active</p>
              </div>
            </div>
          </div>

          {!!error && (
            <div className="flex items-center gap-2 border-2 border-[#C62828] bg-[#FFEBEE] p-3 text-xs font-bold text-[#C62828]">
              <AlertCircle size={15} />
              <p data-testid="postjob-error">{error}</p>
            </div>
          )}

          {/* Human Verification reCAPTCHA */}
          <RecaptchaWidget
            onVerify={(tok) => {
              setCaptchaToken(tok);
              setError("");
            }}
            onExpire={() => setCaptchaToken(null)}
            resetTrigger={captchaReset}
            className="my-1"
          />

          {/* Terms & Conditions and 18+ Age Declaration Checkbox */}
          <label
            data-testid="postjob-terms-checkbox-label"
            className={`flex items-start gap-2.5 cursor-pointer select-none border-2 p-3 shadow-[2px_2px_0px_#121212] transition ${
              termsAccepted ? "border-ink bg-white" : "border-ink/40 bg-sand/40 hover:border-ink"
            }`}
          >
            <input
              type="checkbox"
              data-testid="postjob-terms-checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                setError("");
              }}
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

          <button
            data-testid="postjob-submit-btn"
            disabled={submitting}
            onClick={() => submit(true)}
            className="flex items-center justify-center bg-ink py-4 text-sm font-black tracking-wider text-white disabled:opacity-60 hover:bg-brand transition active:translate-y-0.5 shadow-[3px_3px_0px_#121212]"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isAdmin ? (
              isBoosted ? "PUBLISH AS ADMIN (BOOSTED)" : "PUBLISH AS ADMIN (FREE)"
            ) : isBoosted ? (
              "PAY ₹399 (BOOST) & PUBLISH"
            ) : (
              "PUBLISH GIG · 100% FREE"
            )}
          </button>

          <p className="text-center text-[11px] text-inkmuted font-semibold">
            {isBoosted
              ? "🔒 Razorpay Test Mode · ₹399 48-Hour Urgent Boost · Standard listing is 100% free"
              : "✨ Job posting is 100% free · Zero platform fees · Live instantly in 5km radius"}
          </p>
        </div>
      )}
    </Shell>
  );
}
