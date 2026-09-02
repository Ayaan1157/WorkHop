import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Star, MapPin, IndianRupee, Clock, CheckCheck, Lock, LockOpen, PlusCircle, ArrowRight, MessagesSquare, Tag, LocateFixed, CheckCircle2, Loader2, Expand } from "lucide-react";
import { Shell, TopBar, IconBtn, CategoryTiles } from "@/components/kit";
import OSMMap from "@/components/OSMMap";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { useUserLocation, distanceKm } from "@/hooks/useUserLocation";
import { LEAD_CATEGORY_FILTERS } from "@/lib/catalogFilters";
import { apiGet, getEmployerId } from "@/lib/api";

export default function Employer() {
  const nav = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const { startPayment } = useRazorpay();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  useEffect(() => {
    if (localStorage.getItem("workhop_employer_unlocked") === "1") setUnlocked(true);
    apiGet("/leads/preview").then(setLeads).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const term = search.trim().toLowerCase();
  const activeFilter = LEAD_CATEGORY_FILTERS.find((f) => f.key === catFilter);
  const base = leads.filter((l) => {
    if (catFilter !== "ALL" && activeFilter && !activeFilter.cats.includes(l.skill) && l.category !== catFilter) return false;
    if (!term) return true;
    return l.skill.toLowerCase().includes(term) || l.name.toLowerCase().includes(term) || (l.portfolio || "").toLowerCase().includes(term) || (l.keywords || []).some((k) => k.toLowerCase().includes(term));
  });
  const filtered = coords
    ? base.map((l) => (l.lat && l.lng ? { ...l, distance_km: Math.round(distanceKm(coords, { lat: l.lat, lng: l.lng }) * 10) / 10 } : l)).sort((a, b) => a.distance_km - b.distance_km)
    : base;

  const mapPins = filtered.filter((l) => l.lat && l.lng).map((l) => ({ id: l.id, kind: "candidate", title: l.name, subtitle: `${l.skill} · ${l.distance_km} km away`, lat: l.lat, lng: l.lng }));

  const handlePay = async () => {
    setPaying(true);
    try {
      const data = await startPayment(
        { product: "employer_unlock", employer_id: getEmployerId(), coupon_code: coupon?.code ?? null },
        `Unlock verified local leads · ₹${coupon?.final_amount ?? 199}`,
      );
      if (data?.leads) {
        setLeads(data.leads);
        setUnlocked(true);
        localStorage.setItem("workhop_employer_unlocked", "1");
        setTimeout(() => setSheetOpen(false), 600);
      }
    } catch (e) { if (e?.message !== "PAYMENT_CANCELLED") console.log("pay err", e); }
    finally { setPaying(false); }
  };

  return (
    <Shell>
      <TopBar
        title="NEARBY EXPERTS"
        sub="Bengaluru · live map · 2km radius"
        backTestID="employer-back-btn"
        right={
          <div className="flex gap-2">
            <IconBtn testID="employer-inbox-btn" onClick={() => nav("/employer/inbox")}><MessagesSquare size={18} className="text-ink" /></IconBtn>
            <IconBtn testID="employer-plans-btn" onClick={() => nav("/employer/plans")}><Tag size={18} className="text-brand" /></IconBtn>
          </div>
        }
      />

      <div className="relative h-[180px] border-b-2 border-ink" data-testid="employer-map">
        <OSMMap pins={mapPins} zoom={12} userLocation={coords} height="100%" />
        <button data-testid="leads-near-me-btn" onClick={requestLocation} className={`absolute bottom-3 left-3 z-[400] flex items-center gap-1.5 border-2 border-ink px-3 py-1.5 ${coords ? "bg-brand" : "bg-ink"}`}>
          {locStatus === "locating" ? <Loader2 size={13} className="animate-spin text-white" /> : <LocateFixed size={13} className="text-white" />}
          <span className="text-[10px] font-black tracking-wider text-white">{coords ? "NEAR YOU" : "NEAR ME"}</span>
        </button>
        <button data-testid="map-expand-btn" onClick={() => nav("/map")} className="absolute bottom-3 right-3 z-[400] flex items-center gap-1.5 border-2 border-ink bg-ink px-3 py-1.5"><Expand size={13} className="text-white" /><span className="text-[10px] font-black tracking-wider text-white">FULL MAP</span></button>
      </div>

      <div className="px-4 pt-3">
        <button data-testid="post-job-btn" onClick={() => nav("/employer/post-job")} className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white transition active:translate-y-0.5"><PlusCircle size={16} /> POST A JOB · FROM ₹299</button>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-11 flex-1 items-center gap-2 border-2 border-ink bg-white px-3">
          <Search size={16} className="text-inkmuted" />
          <input data-testid="leads-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pros — logo, shopify, gst, reels…" className="wh-input flex-1 bg-transparent text-sm font-semibold text-ink placeholder:text-inkmuted" />
          {search && <button data-testid="leads-search-clear-btn" onClick={() => setSearch("")} className="flex h-[22px] w-[22px] items-center justify-center bg-ink"><X size={14} className="text-white" /></button>}
        </div>
      </div>

      <CategoryTiles selected={catFilter} onSelect={setCatFilter} testIDPrefix="lead-cat-tile" />

      <div className="flex flex-col gap-3 p-4 pb-16">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-ink" /></div>
        ) : (
          <>
            {filtered.length === 0 && (
              <div data-testid="leads-empty" className="flex flex-col items-center gap-2 border-2 border-ink p-6 text-center">
                <Search size={26} className="text-ink" />
                <p className="text-[15px] font-black text-ink">No pros match "{search.trim()}"</p>
                <p className="text-xs text-inkmuted">Try a different skill keyword.</p>
              </div>
            )}
            {filtered.slice(0, 2).map((l, i) => <LeadCard key={l.id} lead={l} unlocked={unlocked} index={i} onClick={() => nav(`/pro/${l.id}`)} />)}

            {!unlocked && filtered.length > 0 && (
              <div className="relative border-2 border-ink p-4" data-testid="unlock-banner">
                <div className="absolute -left-0.5 -top-0.5 h-8 w-8 bg-brand" />
                <p className="whitespace-pre-line text-xl font-black leading-tight text-ink">Unlock the Closest 5{"\n"}Verified Experts on Your Block.</p>
                <p className="mt-2 text-xs text-inkmuted">Phone numbers instantly revealed — call &amp; hire directly.</p>
                <button data-testid="unlock-cta-btn" onClick={() => setSheetOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3 text-[15px] font-black text-white"><span>Unlock 5 Local Leads · ₹199</span><LockOpen size={16} /></button>
              </div>
            )}
            {unlocked && (
              <div data-testid="unlocked-badge" className="flex items-center justify-center gap-2 border-2 border-ok bg-[#E5F8EE] p-3"><CheckCircle2 size={18} className="text-ok" /><span className="text-xs font-extrabold text-ink">Payment verified · All 5 leads unlocked</span></div>
            )}
            {filtered.slice(2).map((l, i) => <LeadCard key={l.id} lead={l} unlocked={unlocked} index={i + 2} onClick={() => nav(`/pro/${l.id}`)} />)}

            <button data-testid="plans-banner" onClick={() => nav("/employer/plans")} className="flex flex-col gap-3 border-2 border-ink bg-ink p-4 text-left transition active:translate-y-0.5">
              <span className="self-start bg-brand px-3 py-1 text-[10px] font-black tracking-[0.15em] text-white">FOR EMPLOYERS</span>
              <p className="whitespace-pre-line text-xl font-black leading-tight text-white">Post jobs. Boost listings.{"\n"}Brand your company.</p>
              <p className="text-xs text-[#D6D6D6]">Job posts from ₹299 · Enterprise branding &amp; classified ads.</p>
              <span className="flex items-center justify-center gap-2 border-2 border-brand bg-brand py-3 text-[13px] font-black tracking-wider text-white">VIEW PLANS &amp; PRICING <ArrowRight size={16} /></span>
            </button>
          </>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55" onClick={() => setSheetOpen(false)}>
          <div className="w-full max-w-2xl border-t-2 border-ink bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">WORKHOP × RAZORPAY</p>
            <p className="text-4xl font-black tracking-tight text-ink">Pay ₹{coupon?.final_amount ?? 199}</p>
            <p className="mt-1 text-[13px] text-inkmuted">One-time unlock for verified leads in your radius.</p>
            <div className="my-4 border-2 border-ink bg-sand p-3">
              <p className="text-[10px] font-extrabold tracking-wide text-inkmuted">SECURE CHECKOUT</p>
              <p className="mt-1 text-base font-black text-ink">UPI · Cards · Netbanking</p>
            </div>
            <div className="mb-3"><CouponInput product="employer_unlock" amount={199} onApplied={setCoupon} testIDPrefix="unlock-coupon" /></div>
            <button data-testid="pay-confirm-btn" onClick={handlePay} disabled={paying} className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-4 text-[15px] font-black text-white disabled:opacity-60">
              {paying ? <><Loader2 size={18} className="animate-spin" /> Waiting for payment…</> : `Pay ₹${coupon?.final_amount ?? 199} with Razorpay`}
            </button>
            <p className="mt-2 text-center text-[11px] text-inkmuted">🔒 Razorpay Test Mode · Test card 4111 1111 1111 1111</p>
          </div>
        </div>
      )}
    </Shell>
  );
}

function LeadCard({ lead, unlocked, index, onClick }) {
  return (
    <button data-testid={`lead-card-${index}`} onClick={onClick} className="border-2 border-ink bg-white p-3 text-left transition active:translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-brand font-black tracking-wider text-white">{lead.initials}</div>
        <div className="flex-1">
          <p data-testid={`lead-name-${index}`} className="text-[15px] font-black text-ink">{lead.name}</p>
          <p className="text-xs text-inkmuted">{lead.skill}</p>
        </div>
        <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[11px] font-black"><Star size={11} fill="#121212" /> {lead.rating}{lead.reviews_count ? ` (${lead.reviews_count})` : ""}</span>
      </div>
      {!!lead.intro && <p data-testid={`lead-intro-${index}`} className="mt-2 line-clamp-2 text-xs leading-4 text-inkmuted">{lead.intro}</p>}
      <div className="my-3 h-px bg-ink/15" />
      <div className="flex flex-wrap gap-2" data-testid={`lead-stats-${index}`}>
        <Stat icon={<MapPin size={12} />}>{lead.area || "Bengaluru"} · {lead.distance_km} km</Stat>
        <Stat icon={<IndianRupee size={12} />}>{lead.rate_hr ? `₹${lead.rate_hr}/hr` : "Rate on chat"}</Stat>
        <Stat icon={<Clock size={12} />}>{lead.delivery_days || 3}d delivery</Stat>
        <Stat icon={<CheckCheck size={12} />}>{lead.jobs_done} jobs</Stat>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <Field icon={<span>📞</span>} label="PHONE" value={unlocked ? lead.phone : "+91 ••••• •••••"} blur={!unlocked} testID={`lead-phone-${index}`} />
        <Field icon={<span>🔗</span>} label="PORTFOLIO / WEBSITE" value={unlocked ? lead.portfolio : "████████████.in"} blur={!unlocked} testID={`lead-portfolio-${index}`} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-inkmuted">VIEW FULL PROFILE →</span>
        {unlocked ? (
          <span className="border-2 border-ink bg-brand px-3 py-1.5 text-[11px] font-black tracking-wider text-white">CONTACT</span>
        ) : (
          <span className="flex items-center gap-1 bg-ink px-2 py-1 text-[10px] font-black tracking-wider text-white"><Lock size={11} /> LOCKED</span>
        )}
      </div>
    </button>
  );
}

const Stat = ({ icon, children }) => (
  <span className="flex items-center gap-1 border-[1.5px] border-[#E3E3DB] bg-sand px-2 py-1 text-[10px] font-extrabold text-ink">{icon}{children}</span>
);
const Field = ({ label, value, blur, testID }) => (
  <div className="flex items-center gap-2" data-testid={testID}>
    <div className="relative flex-1 overflow-hidden">
      <p className="text-[9px] font-bold tracking-wide text-inkmuted">{label}</p>
      <p className="text-[13px] font-semibold text-ink">{value}</p>
      {blur && <span className="pointer-events-none absolute inset-0 backdrop-blur-[5px]" />}
    </div>
  </div>
);
