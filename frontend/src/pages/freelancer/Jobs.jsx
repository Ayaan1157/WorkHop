import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, Grid3x3, Map as MapIcon, MessagesSquare, ShieldCheck, ShieldHalf,
  Zap, Rocket, SlidersHorizontal, MapPin, IndianRupee, Send, Lock, CheckCircle2, Loader2, Check,
} from "lucide-react";
import { Shell, TopBar, IconBtn, CategoryTiles, EmptyBlock } from "@/components/kit";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { JOB_CATEGORY_FILTERS } from "@/lib/catalogFilters";
import { apiGet, apiPost, getFreelancerId } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const BUDGETS = [
  { label: "UNDER ₹1K", value: "0-1000" }, { label: "₹1K – 5K", value: "1000-5000" },
  { label: "₹5K – 20K", value: "5000-20000" }, { label: "₹20K+", value: "20000-" },
];
const DISTS = [{ label: "≤ 2 KM", value: "2" }, { label: "≤ 5 KM", value: "5" }, { label: "≤ 10 KM", value: "10" }];

export default function Jobs() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState(null);
  const [quota, setQuota] = useState(null);
  const [freelancerId, setFid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ budget: null, dist: null });
  const [search, setSearch] = useState(sp.get("q") || "");
  const [convByJob, setConvByJob] = useState({});

  const [activeJob, setActiveJob] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyNote, setApplyNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [appliedJustNow, setAppliedJustNow] = useState(null);
  const [lastConvId, setLastConvId] = useState(null);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [boostCoupon, setBoostCoupon] = useState(null);
  const { startPayment } = useRazorpay();

  const load = useCallback(async () => {
    try {
      const fid = getFreelancerId();
      setFid(fid);
      const qs = fid ? `?freelancer_id=${fid}` : "";
      const [jobsRes, statusRes, quotaRes] = await Promise.all([
        apiGet(`/jobs${qs}`).catch(() => []),
        fid ? apiGet(`/freelancer/${fid}`).catch(() => null) : Promise.resolve(null),
        fid ? apiGet(`/freelancer/${fid}/quota`).catch(() => null) : Promise.resolve(null),
      ]);
      setJobs(jobsRes || []);
      setStatus(statusRes);
      setQuota(quotaRes);
      if (fid) {
        apiGet(`/chats?freelancer_id=${fid}`).then((chats) => {
          const m = {};
          (chats || []).forEach((c) => { m[c.job_id] = c.conversation_id; });
          setConvByJob(m);
        }).catch(() => {});
      }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const isVerified = !!status?.is_verified;
  const term = search.trim().toLowerCase();
  const activeFilter = JOB_CATEGORY_FILTERS.find((f) => f.key === catFilter);
  const inCat = (j) => catFilter === "ALL" || !activeFilter || activeFilter.cats.includes(j.category);
  const passes = (j) => {
    if (filters.budget) { const [a, b] = filters.budget.split("-"); const min = Number(a || 0); const max = b ? Number(b) : Infinity; if (j.pay < min || j.pay > max) return false; }
    if (filters.dist && j.distance_km > Number(filters.dist)) return false;
    return true;
  };
  const matches = (j, t) => j.title.toLowerCase().includes(t) || j.category.toLowerCase().includes(t) || j.description.toLowerCase().includes(t) || j.company_name.toLowerCase().includes(t) || (j.keywords || []).some((k) => k.toLowerCase().includes(t));
  let filtered = jobs.filter((j) => inCat(j) && passes(j) && (!term || matches(j, term)));
  if (term && filtered.length === 0) {
    const words = term.split(/\s+/).filter((w) => w.length > 2);
    if (words.length) filtered = jobs.filter((j) => inCat(j) && passes(j) && words.some((w) => matches(j, w)));
  }

  const appliedSet = new Set(quota?.applied_job_ids || []);
  const quotaUsed = quota?.quota_used ?? 0;
  const quotaLimit = quota?.quota_limit ?? 3;
  const hasBoost = !!quota?.has_boost;
  const quotaExhausted = quotaUsed >= quotaLimit;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const gotoVerify = () => {
    if (!user) { localStorage.setItem("workhop_auth_intent", "freelancer"); nav("/"); return; }
    nav("/freelancer");
  };

  const openApplyFor = (job) => {
    if (!isVerified) return gotoVerify();
    if (appliedSet.has(job.id)) return;
    if (quotaExhausted) { setActiveJob(job); setPaywallOpen(true); return; }
    setActiveJob(job); setApplyNote(""); setApplyError(null); setAppliedJustNow(null); setApplyOpen(true);
  };

  const submitApply = async () => {
    if (!activeJob || !freelancerId) return;
    setApplying(true); setApplyError(null);
    try {
      const data = await apiPost(`/jobs/${activeJob.id}/apply`, { freelancer_id: freelancerId, note: applyNote });
      setAppliedJustNow(activeJob.id);
      if (data.conversation_id) { setConvByJob((m) => ({ ...m, [activeJob.id]: data.conversation_id })); setLastConvId(data.conversation_id); }
      setQuota((q) => q ? { ...q, quota_used: data.quota_used, quota_limit: data.quota_limit, has_boost: data.has_boost, applied_job_ids: [...q.applied_job_ids, activeJob.id] } : q);
    } catch (e) {
      if (e?.status === 402) { setApplyOpen(false); setTimeout(() => setPaywallOpen(true), 250); return; }
      setApplyError(e?.message || "Failed to apply.");
    } finally { setApplying(false); }
  };

  const submitUnlock = async () => {
    if (!freelancerId) return;
    setUnlocking(true);
    try {
      const data = await startPayment({ product: "quota_boost", freelancer_id: freelancerId, coupon_code: boostCoupon?.code ?? null }, `+5 applies boost · ₹${boostCoupon?.final_amount ?? 149}`);
      if (data?.has_boost) {
        setQuota((q) => q ? { ...q, has_boost: true, boost_until: data.boost_until, quota_limit: data.quota_limit } : q);
        setPaywallOpen(false);
        if (activeJob) { setApplyNote(""); setApplyError(null); setAppliedJustNow(null); setTimeout(() => setApplyOpen(true), 250); }
      }
    } catch (e) { if (e?.message !== "PAYMENT_CANCELLED") console.log("unlock err", e); }
    finally { setUnlocking(false); }
  };

  return (
    <Shell>
      <TopBar
        title="JOBS NEAR YOU"
        sub={loading ? "Loading…" : `${jobs.length} active gigs · 2km radius`}
        onBack={() => nav("/")}
        backTestID="jobs-back-btn"
        right={
          <div className="flex items-center gap-2">
            <IconBtn testID="jobs-categories-btn" onClick={() => nav("/categories")}><Grid3x3 size={17} /></IconBtn>
            <IconBtn testID="jobs-map-btn" onClick={() => nav("/map")}><MapIcon size={18} /></IconBtn>
            <IconBtn testID="jobs-chats-btn" onClick={() => nav("/freelancer/chats")}><MessagesSquare size={18} className="text-brand" /></IconBtn>
            <span data-testid="verify-status-badge" className={`flex items-center gap-1 border-2 border-ink px-2 py-1.5 text-[10px] font-black tracking-wide text-white ${isVerified ? "bg-ok" : "bg-ink"}`}>
              {isVerified ? <ShieldCheck size={14} /> : <ShieldHalf size={14} />}{isVerified ? "VERIFIED" : "UNVERIFIED"}
            </span>
          </div>
        }
      />

      {isVerified && quota && (
        <div className="flex items-center gap-3 border-b-2 border-ink bg-brand px-4 py-2" data-testid="quota-bar">
          <div className="flex flex-1 items-center gap-1.5">
            {hasBoost ? <Rocket size={14} /> : <Zap size={14} />}
            <span className="text-[11px] font-black tracking-wider text-ink">{hasBoost ? `${Math.max(quotaLimit - quotaUsed, 0)} of ${quotaLimit} APPLIES LEFT · BOOST ON` : `${Math.max(quotaLimit - quotaUsed, 0)} of ${quotaLimit} FREE APPLIES LEFT`}</span>
          </div>
          {!hasBoost && <button data-testid="quota-upgrade-btn" onClick={() => setPaywallOpen(true)} className="bg-ink px-3 py-1.5 text-[10px] font-black tracking-wider text-white">+5 APPLIES ₹149</button>}
        </div>
      )}

      <div className="flex items-center gap-2 border-b-2 border-ink px-4 py-3">
        <div className="flex h-11 flex-1 items-center gap-2 border-2 border-ink bg-sand px-3">
          <Search size={16} className="text-inkmuted" />
          <input data-testid="jobs-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services… e.g. Logo Design" className="wh-input flex-1 bg-transparent text-sm font-semibold text-ink placeholder:text-inkmuted" />
          {search && <button data-testid="search-clear-btn" onClick={() => setSearch("")} className="flex h-[22px] w-[22px] items-center justify-center bg-ink"><X size={14} className="text-white" /></button>}
        </div>
        <button data-testid="jobs-filter-btn" onClick={() => setFiltersOpen((v) => !v)} className={`relative flex h-11 w-11 items-center justify-center border-2 border-ink ${activeFilterCount > 0 ? "bg-ink" : "bg-white"}`}>
          <SlidersHorizontal size={18} className={activeFilterCount > 0 ? "text-white" : "text-ink"} />
          {activeFilterCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center border-[1.5px] border-ink bg-brand text-[9px] font-black text-white">{activeFilterCount}</span>}
        </button>
      </div>

      {filtersOpen && (
        <div className="flex flex-col gap-3 border-b-2 border-ink bg-sand p-4" data-testid="jobs-filters-panel">
          <FilterGroup label="BUDGET (GIG PAY)" options={BUDGETS} value={filters.budget} onPick={(v) => setFilters((p) => ({ ...p, budget: p.budget === v ? null : v }))} />
          <FilterGroup label="LOCATION (DISTANCE)" options={DISTS} value={filters.dist} onPick={(v) => setFilters((p) => ({ ...p, dist: p.dist === v ? null : v }))} />
          <button onClick={() => setFilters({ budget: null, dist: null })} className="self-start text-[11px] font-black tracking-wider text-brand">RESET FILTERS</button>
        </div>
      )}

      <CategoryTiles selected={catFilter} onSelect={setCatFilter} testIDPrefix="jobs-cat-tile" />

      {!isVerified && (
        <div className="flex items-center gap-3 border-b-2 border-ink bg-ink p-3" data-testid="unverified-banner">
          <span className="flex h-9 w-9 items-center justify-center border-2 border-white bg-brand"><Lock size={18} className="text-white" /></span>
          <div className="flex-1">
            <p className="text-[13px] font-black text-white">{user ? "Browse freely — verify to apply" : "Browse freely — sign in to apply"}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[#D6D6D6]">Tap APPLY on any gig to start the one-time ₹99 Verified Pro onboarding.</p>
          </div>
          <button data-testid="banner-verify-cta" onClick={gotoVerify} className="border-2 border-white bg-brand px-3 py-2 text-[11px] font-black tracking-wider text-white">{!user ? "SIGN IN" : freelancerId ? "RESUME" : "VERIFY"}</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-ink" /></div>
      ) : filtered.length === 0 ? (
        <EmptyBlock testID="empty-state" icon={<Search size={28} className="text-ink" />} title={term ? `No matches for "${search.trim()}"` : "No gigs in this category"} sub={term ? "Try a different keyword or clear the search." : "Pick a different category above."} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 pb-16">
          {filtered.map((job, idx) => (
            <JobCard key={job.id} job={job} index={idx} verified={isVerified} applied={appliedSet.has(job.id)}
              onApply={() => openApplyFor(job)}
              onMessage={() => { const cid = convByJob[job.id]; cid ? nav(`/chat/${cid}?role=freelancer`) : nav("/freelancer/chats"); }}
              onVerifyPress={gotoVerify} />
          ))}
        </div>
      )}

      {/* Apply modal */}
      {applyOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55" onClick={() => setApplyOpen(false)}>
          <div className="w-full max-w-2xl border-t-2 border-ink bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">APPLY TO GIG</p>
            <p className="text-2xl font-black leading-tight text-ink">{activeJob?.title}</p>
            <div className="mt-2 flex gap-2">
              <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[11px] font-extrabold">{activeJob?.pay_label}</span>
              <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[11px] font-extrabold">{activeJob?.distance_km} km</span>
            </div>
            <p className="mt-3 text-[11px] font-black tracking-wider text-inkmuted">NOTE TO EMPLOYER (OPTIONAL)</p>
            <textarea data-testid="apply-note-input" value={applyNote} onChange={(e) => setApplyNote(e.target.value)} placeholder="I can be there in 30 min. Rate is fine." maxLength={300} className="wh-input mt-1 min-h-[80px] w-full border-2 border-ink bg-sand p-3 text-[13px] text-ink" />
            {applyError && <p data-testid="apply-error" className="mt-1 text-xs font-bold text-danger">{applyError}</p>}
            {appliedJustNow ? (
              <div>
                <div data-testid="apply-success-flash" className="mt-3 flex items-center justify-center gap-2 border-2 border-ink bg-ok py-4"><CheckCircle2 size={18} className="text-white" /><span className="text-sm font-black tracking-wide text-white">APPLIED · Chat thread opened</span></div>
                {lastConvId && <button data-testid="apply-open-chat-btn" onClick={() => { setApplyOpen(false); nav(`/chat/${lastConvId}?role=freelancer`); }} className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-ink py-3 text-xs font-black tracking-wider text-ink"><MessagesSquare size={14} /> MESSAGE EMPLOYER NOW</button>}
              </div>
            ) : (
              <button data-testid="apply-confirm-btn" disabled={applying} onClick={submitApply} className="mt-3 flex w-full items-center justify-center border-2 border-ink bg-ink py-4 text-[15px] font-black text-white disabled:opacity-60">{applying ? <Loader2 size={18} className="animate-spin" /> : "Send application"}</button>
            )}
            <p className="mt-2 text-center text-[11px] text-inkmuted">Employer sees your verified badge, rating & note. A private chat opens the moment you apply.</p>
          </div>
        </div>
      )}

      {/* Paywall modal */}
      {paywallOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55" onClick={() => setPaywallOpen(false)}>
          <div className="w-full max-w-2xl border-t-2 border-ink bg-white p-6" onClick={(e) => e.stopPropagation()}>
            {hasBoost ? (
              <>
                <span className="inline-flex items-center gap-1 bg-brand px-2 py-1 text-[10px] font-black tracking-wider text-white"><Rocket size={12} /> DAILY LIMIT</span>
                <p className="mt-2 whitespace-pre-line text-2xl font-black leading-tight text-ink">You've hit today's{"\n"}max of {quotaLimit} applies.</p>
                <p className="mt-1 text-[13px] text-inkmuted">Your boost is active but the daily cap is reached. Applies reset within 24 hours.</p>
                <button data-testid="paywall-close-btn" onClick={() => setPaywallOpen(false)} className="mt-3 w-full border-2 border-ink bg-ink py-4 text-[15px] font-black text-white">Got it</button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 bg-danger px-2 py-1 text-[10px] font-black tracking-wider text-white"><Zap size={12} /> QUOTA HIT</span>
                <p className="mt-2 whitespace-pre-line text-2xl font-black leading-tight text-ink">You've used your{"\n"}3 free applies today.</p>
                <p className="mt-1 text-[13px] text-inkmuted">Add 5 more applies for the next 24 hours and stop missing gigs in your block.</p>
                <div className="mt-3 flex flex-col gap-3 border-2 border-ink bg-sand p-4">
                  <div><p className="text-[10px] font-extrabold tracking-wide text-inkmuted">+5 APPLIES BOOST</p><p className="text-4xl font-black tracking-tight text-ink">₹149</p><p className="text-[11px] text-inkmuted">One-time. No subscription.</p></div>
                  <div className="flex flex-col gap-1">
                    {["5 extra job applies today", "Valid for 24 hours", "Max 8 applies per day total"].map((t) => <div key={t} className="flex items-center gap-2"><Check size={14} className="text-brand" /><span className="text-[13px] font-bold text-ink">{t}</span></div>)}
                  </div>
                </div>
                <div className="my-3"><CouponInput product="quota_boost" amount={149} onApplied={setBoostCoupon} testIDPrefix="boost-coupon" /></div>
                <button data-testid="paywall-pay-btn" disabled={unlocking} onClick={submitUnlock} className="flex w-full items-center justify-center border-2 border-ink bg-ink py-4 text-[15px] font-black text-white disabled:opacity-60">{unlocking ? <Loader2 size={18} className="animate-spin" /> : `Pay ₹${boostCoupon?.final_amount ?? 149} securely`}</button>
                <p className="mt-2 text-center text-[11px] text-inkmuted">🔒 Razorpay Test Mode · Test card 4111 1111 1111 1111</p>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

function FilterGroup({ label, options, value, onPick }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-black tracking-wider text-inkmuted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} onClick={() => onPick(o.value)} className={`border-2 border-ink px-3 py-1.5 text-[11px] font-black ${value === o.value ? "bg-ink text-white" : "bg-white text-ink"}`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, index, verified, applied, onApply, onMessage, onVerifyPress }) {
  return (
    <div data-testid={`job-card-${index}`} className="flex flex-col gap-2 border-2 border-ink bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="bg-brand px-2 py-1 text-[10px] font-black tracking-wider text-white">{(job.category || "Gig").toUpperCase()}</span>
        <span className="text-[11px] text-inkmuted">
          {(job.posted_minutes_ago ?? 25) < 60 ? `${job.posted_minutes_ago ?? 25} min ago` : `${Math.round((job.posted_minutes_ago ?? 120) / 60)}h ago`}
        </span>
      </div>
      <p className="text-base font-black leading-tight text-ink">{job.title}</p>
      <p className="line-clamp-2 text-xs leading-4 text-inkmuted">{job.description}</p>
      <div className="flex gap-2">
        <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[11px] font-extrabold"><IndianRupee size={12} /> {job.pay_label || (job.pay ? Number(job.pay).toLocaleString("en-IN") : "Fixed")}</span>
        <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[11px] font-extrabold"><MapPin size={12} /> {job.distance_km ?? 0.5} km</span>
      </div>
      <div className="my-1 h-px bg-ink/15" />
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[9px] font-black tracking-wider text-inkmuted">COMPANY</p>
          <p className="text-[13px] font-black text-ink">{job.company_name}</p>
          <div className="mt-1 flex items-center gap-1" data-testid={`job-area-${index}`}><MapPin size={12} className="text-inkmuted" /><span className="text-xs font-bold text-inkmuted">{job.area} · Bengaluru</span></div>
        </div>
        {applied ? (
          <button data-testid={`job-message-btn-${index}`} onClick={onMessage} className="flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-2 text-[11px] font-black tracking-wider text-ink"><MessagesSquare size={13} /> MESSAGE</button>
        ) : (
          <button data-testid={verified ? `job-apply-btn-${index}` : `job-verify-cta-${index}`} onClick={verified ? onApply : onVerifyPress} className="flex items-center gap-1 border-2 border-ink bg-brand px-3 py-2 text-[11px] font-black tracking-wider text-white"><Send size={13} /> APPLY</button>
        )}
      </div>
    </div>
  );
}
