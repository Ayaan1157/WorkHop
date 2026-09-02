import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Phone, Globe, LockOpen, ShieldCheck, MapPin, ArrowLeftRight, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { Shell, TopBar, Spinner } from "@/components/kit";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { apiGet, getEmployerId } from "@/lib/api";

const Blur = () => <span className="pointer-events-none absolute inset-0 backdrop-blur-[6px]" />;

export default function Pro() {
  const { id } = useParams();
  const [pro, setPro] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const { startPayment } = useRazorpay();

  useEffect(() => {
    apiGet(`/pros/${id}`)
      .then((d) => { if (d) { setPro(d.pro); setReviews(d.reviews || []); } })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (localStorage.getItem("workhop_employer_unlocked") === "1") setUnlocked(true);
  }, [id]);

  const handleUnlock = async () => {
    setPaying(true);
    try {
      const employerId = getEmployerId();
      const data = await startPayment(
        { product: "employer_unlock", employer_id: employerId, coupon_code: coupon?.code ?? null },
        `Unlock contact of ${pro?.name || "this pro"} · ₹${coupon?.final_amount ?? 199}`,
      );
      if (data?.leads) {
        setUnlocked(true);
        localStorage.setItem("workhop_employer_unlocked", "1");
        const fresh = data.leads.find((l) => l.id === id);
        if (fresh) setPro((p) => (p ? { ...p, phone: fresh.phone } : p));
      }
    } catch (e) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("unlock err", e);
    } finally { setPaying(false); }
  };

  return (
    <Shell>
      <TopBar title="PRO PROFILE" backTestID="pro-back-btn" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !pro ? (
        <p className="mt-16 text-center text-inkmuted">Profile not found.</p>
      ) : (
        <div className="flex flex-col gap-4 p-4 pb-16">
          <div className="flex flex-col items-center gap-2 border-2 border-ink p-6" data-testid="pro-hero">
            <div className="flex h-[72px] w-[72px] items-center justify-center border-2 border-ink bg-brand text-[26px] font-black text-white">{pro.initials}</div>
            <p className="text-xl font-black text-ink">{pro.name}</p>
            <p className="text-center text-[13px] text-inkmuted">{pro.skill}</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <span className="flex items-center gap-1 border border-ink bg-ok px-2 py-1 text-[9px] font-black text-white"><ShieldCheck size={11} /> VERIFIED PRO</span>
              <span className="flex items-center gap-1 border border-ink px-2 py-1 text-[9px] font-extrabold text-ink"><MapPin size={11} /> {pro.area || "Bengaluru"} · {pro.distance_km} km</span>
            </div>
            {!!pro.external_rating_source && (
              <span data-testid="imported-rating-badge" className="mt-1 flex items-center gap-1 border border-ink bg-[#FFF3C4] px-2 py-1 text-[9px] font-black text-ink"><ArrowLeftRight size={11} /> RATING IMPORTED FROM {pro.external_rating_source.toUpperCase()}</span>
            )}
          </div>

          <div className="flex gap-2">
            {[
              { n: `★ ${pro.rating}`, l: pro.reviews_count ? `${pro.reviews_count} REVIEWS` : "RATING" },
              { n: pro.jobs_done, l: "JOBS DONE" },
              { n: `${pro.delivery_days || 3}d`, l: "DELIVERY" },
              { n: pro.rate_hr ? `₹${pro.rate_hr}` : "—", l: "PER HOUR" },
            ].map((s, i) => (
              <div key={i} className="flex flex-1 flex-col items-center border-2 border-ink py-3">
                <span className="text-sm font-black text-ink">{s.n}</span>
                <span className="mt-0.5 text-[8px] font-extrabold tracking-wide text-inkmuted">{s.l}</span>
              </div>
            ))}
          </div>

          {!!pro.intro && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-black tracking-[0.15em] text-ink">ABOUT THIS PRO</p>
              <p data-testid="pro-intro" className="border-2 border-ink bg-sand p-3 text-[13px] leading-5 text-ink">{pro.intro}</p>
            </div>
          )}

          {(pro.languages || []).length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-black tracking-[0.15em] text-ink">LANGUAGES</p>
              <div className="flex flex-wrap gap-2">
                {pro.languages.map((l) => <span key={l} className="border-[1.5px] border-ink px-2 py-1 text-[11px] font-bold text-ink">{l}</span>)}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-black tracking-[0.15em] text-ink">CONTACT</p>
            <div className="flex flex-col gap-2 border-2 border-ink p-3" data-testid="pro-contact-card">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-brand" />
                <span className="relative flex-1 overflow-hidden font-extrabold text-ink">{unlocked ? pro.phone || "+91 ••••• •••••" : "+91 ••••• •••••"}{!unlocked && <Blur />}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-brand" />
                <span className="relative flex-1 overflow-hidden font-extrabold text-ink">{unlocked ? pro.portfolio : "████████████.in"}{!unlocked && <Blur />}</span>
              </div>
              {!unlocked && (
                <div className="mt-1">
                  <CouponInput product="employer_unlock" amount={199} onApplied={setCoupon} testIDPrefix="pro-coupon" />
                </div>
              )}
              {!unlocked ? (
                <button data-testid="pro-unlock-btn" onClick={handleUnlock} disabled={paying} className="mt-1 flex items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white disabled:opacity-70">
                  {paying ? <Loader2 size={15} className="animate-spin" /> : <><LockOpen size={15} /> UNLOCK THIS LEAD · ₹{coupon?.final_amount ?? 199}</>}
                </button>
              ) : (
                <div data-testid="pro-unlocked-badge" className="mt-1 flex items-center gap-1.5"><CheckCircle2 size={15} className="text-ok" /><span className="text-xs font-extrabold text-ink">Contact unlocked — call & hire directly</span></div>
              )}
            </div>
          </div>

          {(pro.keywords || []).length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-black tracking-[0.15em] text-ink">SKILLS & TOOLS</p>
              <div className="flex flex-wrap gap-2">
                {pro.keywords.slice(0, 8).map((k) => <span key={k} className="border-[1.5px] border-ink px-2 py-1 text-[11px] font-bold text-ink">{k}</span>)}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-black tracking-[0.15em] text-ink">REVIEWS ({reviews.length})</p>
            {reviews.length === 0 ? (
              <p className="text-xs text-inkmuted">No WorkHop reviews yet — reviews appear after completed gigs.</p>
            ) : reviews.map((r) => (
              <div key={r.review_id} className="border-2 border-ink p-3">
                <div className="flex justify-between"><span className="text-[13px] font-black text-ink">{r.reviewer_name}</span><span className="text-[13px] font-black text-brand">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></div>
                <p className="text-[10px] font-bold text-brand">{r.job_title}</p>
                {!!r.text && <p className="mt-0.5 text-xs text-ink">{r.text}</p>}
              </div>
            ))}
          </div>
          <p className="flex items-center justify-center gap-1 text-[11px] text-inkmuted"><MessageSquare size={11} /> Reviews build after completed gigs</p>
        </div>
      )}
    </Shell>
  );
}
