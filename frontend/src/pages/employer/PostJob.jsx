import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import { CATALOG_CATEGORY_NAMES } from "@/lib/catalogFilters";
import { useRazorpay } from "@/hooks/usePayments";
import { API, apiGet, apiPost, getEmployerId } from "@/lib/api";

export default function PostJob() {
  const nav = useNavigate();
  const { startPayment } = useRazorpay();
  const [credits, setCredits] = useState(null);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState("Graphics & Design");
  const [pay, setPay] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);

  const loadCredits = useCallback(async () => {
    try {
      const data = await apiGet(`/employer/${getEmployerId()}/post-credits`);
      if (data) setCredits(data);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadCredits(); }, [loadCredits]);

  const submit = async (retryAfterPay = true) => {
    setError("");
    if (!company.trim() || !title.trim() || !description.trim() || !pay) return setError("Fill in company, title, pay and description.");
    setSubmitting(true);
    try {
      const eid = getEmployerId();
      const data = await apiPost("/employer/jobs", {
        employer_id: eid,
        company_name: company,
        title,
        bucket,
        pay: parseInt(pay, 10) || 0,
        description,
        area: area || "Bengaluru",
      });
      if (data) {
        setPosted(true);
        loadCredits();
        return;
      }
      if (retryAfterPay) {
        const pr = await startPayment({ product: "plan", plan_id: "single-post", employer_id: eid }, "Single Post · ₹299");
        if (pr?.purchase) { await submit(false); return; }
      }
      setError("Could not post the job.");
    } catch (e) {
      if (e?.message !== "PAYMENT_CANCELLED") setError(e?.message || "Could not post the job.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "wh-input h-12 border-2 border-ink bg-white px-3 text-sm font-semibold text-ink";
  const label = "text-[10px] font-black tracking-[0.15em] text-ink";

  return (
    <Shell>
      <TopBar
        title="POST A JOB"
        sub={credits ? `${credits.remaining} post credit${credits.remaining === 1 ? "" : "s"} left` : "…"}
        backTestID="postjob-back-btn"
        right={<span className="border-2 border-ink bg-brand px-2 py-1.5 text-[10px] font-black text-white">₹299/POST</span>}
      />
      {posted ? (
        <div data-testid="postjob-success" className="mt-10 flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 size={56} className="text-ok" />
          <p className="text-2xl font-black text-ink">Job is live!</p>
          <p className="text-[13px] text-inkmuted">Verified pros in Bengaluru can now see and apply to your gig.</p>
          <button data-testid="postjob-done-btn" onClick={() => nav(-1)} className="w-full max-w-xs bg-ink py-4 text-sm font-black tracking-wider text-white">DONE</button>
          <button data-testid="postjob-another-btn" onClick={() => { setPosted(false); setTitle(""); setDescription(""); setPay(""); }} className="w-full max-w-xs border-2 border-ink py-3 text-xs font-black tracking-wider text-ink">POST ANOTHER</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4 pb-16">
          <div className="flex flex-col gap-1.5"><label className={label}>COMPANY NAME</label><input data-testid="postjob-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. BrewBox Cafe" className={inputCls} /></div>
          <div className="flex flex-col gap-1.5"><label className={label}>JOB TITLE</label><input data-testid="postjob-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design our menu & flyers" className={inputCls} /></div>
          <label className={label}>CATEGORY</label>
          <div className="flex flex-wrap gap-2">
            {CATALOG_CATEGORY_NAMES.map((b) => (
              <button key={b} data-testid={`postjob-cat-${b.toLowerCase().replace(/[^a-z]+/g, "-")}`} onClick={() => setBucket(b)} className={`border-2 border-ink px-3 py-2 text-[10px] font-black ${bucket === b ? "bg-ink text-white" : "bg-white text-ink"}`}>{b.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5"><label className={label}>PAY (₹ FIXED)</label><input data-testid="postjob-pay" value={pay} onChange={(e) => setPay(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 8000" className={inputCls} /></div>
          <div className="flex flex-col gap-1.5"><label className={label}>AREA</label><input data-testid="postjob-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Koramangala" className={inputCls} /></div>
          <label className={label}>DESCRIPTION</label>
          <textarea data-testid="postjob-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope, deliverables, timeline…" className="wh-input h-28 border-2 border-ink bg-white p-3 text-sm font-semibold text-ink" />
          {!!error && <p data-testid="postjob-error" className="text-xs font-bold text-[#C62828]">{error}</p>}
          <button data-testid="postjob-submit-btn" disabled={submitting} onClick={() => submit(true)} className="flex items-center justify-center bg-ink py-4 text-sm font-black tracking-wider text-white disabled:opacity-60">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : (credits && credits.remaining > 0 ? "PUBLISH JOB (1 CREDIT)" : "PAY ₹299 & PUBLISH")}
          </button>
          <p className="text-center text-[11px] text-inkmuted">🔒 Razorpay Test Mode · UPI (GPay/PhonePe), cards & netbanking</p>
        </div>
      )}
    </Shell>
  );
}
