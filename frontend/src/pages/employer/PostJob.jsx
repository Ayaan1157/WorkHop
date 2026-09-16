import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Loader2, LocateFixed, ShieldCheck, MapPin, Sparkles, AlertCircle
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import { CATALOG_CATEGORY_NAMES } from "@/lib/catalogFilters";
import { useRazorpay } from "@/hooks/usePayments";
import { useUserLocation } from "@/hooks/useUserLocation";
import { BENGALURU_AREAS, findNearestArea, getAreaCoordinates } from "@/lib/locationAreas";
import { API, apiGet, apiPost, getEmployerId } from "@/lib/api";

export default function PostJob() {
  const nav = useNavigate();
  const { startPayment } = useRazorpay();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  const [credits, setCredits] = useState(null);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState("Graphics & Design");
  const [pay, setPay] = useState("");
  const [area, setArea] = useState("Koramangala");
  const [customCoords, setCustomCoords] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);

  const loadCredits = useCallback(async () => {
    try {
      const data = await apiGet(`/employer/${getEmployerId()}/post-credits`);
      if (data) setCredits(data);
    } catch {
      /* ignore */
    }
  }, []);

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
    if (!company.trim() || !title.trim() || !description.trim() || !pay) {
      return setError("Fill in company, title, pay, and description.");
    }
    setSubmitting(true);
    try {
      const eid = getEmployerId();
      const areaCoords = customCoords || getAreaCoordinates(area);

      const data = await apiPost("/employer/jobs", {
        employer_id: eid,
        company_name: company,
        title,
        bucket,
        pay: parseInt(pay, 10) || 0,
        description,
        area: area || "Bengaluru",
        lat: areaCoords.lat,
        lng: areaCoords.lng,
      });

      if (data) {
        setPosted(true);
        loadCredits();
        return;
      }
      if (retryAfterPay) {
        const pr = await startPayment(
          { product: "plan", plan_id: "single-post", employer_id: eid },
          "Single Post · ₹299"
        );
        if (pr?.purchase) {
          await submit(false);
          return;
        }
      }
      setError("Could not post the job.");
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
        sub={credits ? `${credits.remaining} post credit${credits.remaining === 1 ? "" : "s"} left` : "…"}
        backTestID="postjob-back-btn"
        right={
          <span className="border-2 border-ink bg-brand px-2 py-1.5 text-[10px] font-black text-white">
            ₹299/POST
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={label}>PAY (₹ FIXED / MILESTONE)</label>
            <input
              data-testid="postjob-pay"
              value={pay}
              onChange={(e) => setPay(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 5000"
              className={inputCls}
            />
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

          {!!error && (
            <div className="flex items-center gap-2 border-2 border-[#C62828] bg-[#FFEBEE] p-3 text-xs font-bold text-[#C62828]">
              <AlertCircle size={15} />
              <p data-testid="postjob-error">{error}</p>
            </div>
          )}

          <button
            data-testid="postjob-submit-btn"
            disabled={submitting}
            onClick={() => submit(true)}
            className="flex items-center justify-center bg-ink py-4 text-sm font-black tracking-wider text-white disabled:opacity-60 hover:bg-brand transition active:translate-y-0.5 shadow-[3px_3px_0px_#121212]"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : credits && credits.remaining > 0 ? (
              `PUBLISH JOB (${credits.remaining} CREDIT${credits.remaining === 1 ? "" : "S"} LEFT)`
            ) : (
              "PAY ₹299 & PUBLISH"
            )}
          </button>

          <p className="text-center text-[11px] text-inkmuted">
            🔒 Razorpay Test Mode · UPI (GPay/PhonePe), cards &amp; netbanking
          </p>
        </div>
      )}
    </Shell>
  );
}
