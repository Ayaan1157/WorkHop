import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Search, X, Grid3x3, Map as MapIcon, MessagesSquare, ShieldCheck, ShieldHalf,
  Zap, Rocket, SlidersHorizontal, MapPin, IndianRupee, Send, Lock, CheckCircle2,
  Loader2, Check, Heart, ArrowUpDown, Star, Sparkles, Filter, LocateFixed, Expand
} from "lucide-react";
import {
  Shell, TopBar, IconBtn, CategoryTiles, EmptyBlock, Breadcrumbs,
  ProfileProgressBar, BoostPreviewModal, JobCardSkeleton
} from "@/components/kit";
import GoogleMap from "@/components/GoogleMap";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { useUserLocation } from "@/hooks/useUserLocation";
import {
  BENGALURU_AREAS,
  findNearestArea,
  calculateDistance,
  getDistanceSuitability,
  getSavedArea,
  setSavedArea,
  getProximityCoordinates,
} from "@/lib/locationAreas";
import { JOB_CATEGORY_FILTERS } from "@/lib/catalogFilters";
import { apiGet, apiPost, getFreelancerId } from "@/lib/api";
import { getSavedJobIds, toggleSaveJob } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";

const BUDGETS = [
  { label: "ALL BUDGETS", value: null },
  { label: "UNDER ₹1K", value: "0-1000" },
  { label: "₹1K – 5K", value: "1000-5000" },
  { label: "₹5K – 20K", value: "5000-20000" },
  { label: "₹20K+", value: "20000-" },
];

const DISTS = [
  { label: "ANY DISTANCE", value: null },
  { label: "≤ 2 KM", value: "2" },
  { label: "≤ 5 KM", value: "5" },
  { label: "≤ 10 KM", value: "10" },
];

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Distance: Nearest", value: "dist_asc" },
  { label: "Rating: Top Rated", value: "rating_desc" },
];

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
  const [filters, setFilters] = useState({ budget: null, dist: null, minRating: null, verifiedOnly: false });
  const [sortBy, setSortBy] = useState("newest");
  const [viewTab, setViewTab] = useState("all"); // 'all' | 'saved'
  const [savedJobIds, setSavedJobIds] = useState(getSavedJobIds());
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
  const [boostPreviewOpen, setBoostPreviewOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [boostCoupon, setBoostCoupon] = useState(null);
  const { startPayment } = useRazorpay();
  const { coords: liveCoords, status: locStatus, requestLocation } = useUserLocation();
  const [applicantArea, setApplicantArea] = useState(getSavedArea());

  // Auto-request GPS on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Auto-detect closest locality when GPS granted
  useEffect(() => {
    if (liveCoords?.lat && liveCoords?.lng) {
      const nearest = findNearestArea(liveCoords);
      if (nearest) {
        setApplicantArea(nearest.name);
        setSavedArea(nearest.name);
      }
    }
  }, [liveCoords]);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleSave = (id, e) => {
    e.stopPropagation();
    const updated = toggleSaveJob(id);
    setSavedJobIds(updated);
  };

  const isVerified = !!status?.is_verified;
  const term = search.trim().toLowerCase();
  const activeFilter = JOB_CATEGORY_FILTERS.find((f) => f.key === catFilter);
  const inCat = (j) => catFilter === "ALL" || !activeFilter || activeFilter.cats.includes(j.category);

  const passes = (j) => {
    if (viewTab === "saved" && !savedJobIds.includes(j.id)) return false;
    if (filters.budget) {
      const [a, b] = filters.budget.split("-");
      const min = Number(a || 0);
      const max = b ? Number(b) : Infinity;
      if (j.pay < min || j.pay > max) return false;
    }
    if (filters.dist && j.distance_km > Number(filters.dist)) return false;
    if (filters.minRating && Number(j.employer_rating || 5) < filters.minRating) return false;
    if (filters.verifiedOnly && !j.verified_employer) return false;
    return true;
  };

  const matches = (j, t) =>
    j.title.toLowerCase().includes(t) ||
    (j.category || "").toLowerCase().includes(t) ||
    (j.description || "").toLowerCase().includes(t) ||
    (j.company_name || "").toLowerCase().includes(t) ||
    (j.keywords || []).some((k) => k.toLowerCase().includes(t));

  const filtered = useMemo(() => {
    let result = jobs.filter((j) => inCat(j) && passes(j) && (!term || matches(j, term)));
    if (term && result.length === 0) {
      const words = term.split(/\s+/).filter((w) => w.length > 2);
      if (words.length) result = jobs.filter((j) => inCat(j) && passes(j) && words.some((w) => matches(j, w)));
    }

    // Instant Multi-Facet Sorting
    return [...result].sort((a, b) => {
      if (sortBy === "price_desc") return (b.pay || 0) - (a.pay || 0);
      if (sortBy === "price_asc") return (a.pay || 0) - (b.pay || 0);
      if (sortBy === "dist_asc") return (a.distance_km || 0) - (b.distance_km || 0);
      if (sortBy === "rating_desc") return (Number(b.employer_rating) || 5) - (Number(a.employer_rating) || 5);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, catFilter, filters, term, sortBy, viewTab, savedJobIds]);

  const mapPins = useMemo(() => {
    const center = liveCoords || { lat: 12.9352, lng: 77.6245 };
    return filtered.slice(0, 40).map((j, idx) => {
      const coords = getProximityCoordinates(center.lat, center.lng, j.distance_km || (0.4 + (idx % 15) * 0.3), j.id || idx);
      return {
        id: j.id,
        kind: "job",
        title: j.title,
        subtitle: `${j.company_name} · ₹${Number(j.pay || 0).toLocaleString("en-IN")} · ${j.distance_km || 0.5} km`,
        pay: j.pay,
        lat: j.lat || coords.lat,
        lng: j.lng || coords.lng,
        distance_km: j.distance_km,
      };
    });
  }, [filtered, liveCoords]);

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
    if (!user) { localStorage.setItem("workhop_auth_intent", "freelancer"); nav("/"); return; }
    if (appliedSet.has(job.id)) return;
    if (quotaExhausted) { setActiveJob(job); setPaywallOpen(true); return; }
    const fid = freelancerId || getFreelancerId();
    if (!freelancerId) setFid(fid);
    setActiveJob(job); setApplyNote(""); setApplyError(null); setAppliedJustNow(null); setApplyOpen(true);
  };

  const submitApply = async () => {
    if (!activeJob || !freelancerId) return;
    setApplying(true); setApplyError(null);
    const calculatedDist = calculateDistance(applicantArea, activeJob.area || "Bengaluru");
    try {
      const data = await apiPost(`/jobs/${activeJob.id}/apply`, {
        freelancer_id: freelancerId,
        note: applyNote,
        applicant_area: applicantArea,
        distance_km: calculatedDist,
      });
      setAppliedJustNow(activeJob.id);
      if (data.conversation_id) { setConvByJob((m) => ({ ...m, [activeJob.id]: data.conversation_id })); setLastConvId(data.conversation_id); }
      setQuota((q) => q ? { ...q, quota_used: data.quota_used, quota_limit: data.quota_limit, has_boost: data.has_boost, applied_job_ids: [...(q.applied_job_ids || []), activeJob.id] } : q);
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
        title="JOBS &amp; LOCAL GIGS"
        sub={loading ? "Loading…" : `${filtered.length} active gigs · 5km hyperlocal radius`}
        onBack={() => nav("/")}
        backTestID="jobs-back-btn"
        right={
          <div className="flex items-center gap-2">
            <IconBtn testID="jobs-categories-btn" onClick={() => nav("/categories")} title="Categories"><Grid3x3 size={17} /></IconBtn>
            <IconBtn testID="jobs-map-btn" onClick={() => setShowMap(!showMap)} title={showMap ? "Hide Map" : "Show Map"}><MapIcon size={18} className={showMap ? "text-brand" : ""} /></IconBtn>
            <IconBtn testID="jobs-chats-btn" onClick={() => nav("/freelancer/chats")} title="My Chats"><MessagesSquare size={18} className="text-brand" /></IconBtn>
            <span data-testid="verify-status-badge" className={`flex items-center gap-1 border-2 border-ink px-2.5 py-1.5 text-[10px] font-black tracking-wide text-white ${isVerified ? "bg-ok" : "bg-ink"}`}>
              {isVerified ? <ShieldCheck size={14} /> : <ShieldHalf size={14} />}{isVerified ? "VERIFIED PRO" : "UNVERIFIED"}
            </span>
          </div>
        }
      />

      {/* Upwork-style Profile Progress Bar & Guidance */}
      <div className="border-b-2 border-ink bg-white dark:bg-[#161618]">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-8">
          <Breadcrumbs items={[{ label: "Find Gigs", to: "/freelancer/jobs" }, { label: catFilter === "ALL" ? "All Categories" : catFilter }]} />
          <div className="mt-3">
            <ProfileProgressBar user={user} role="freelancer" />
          </div>
        </div>
      </div>

      {/* PROPORTIONAL & AESTHETIC LIVE GIG RADAR MAP CARD */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 pt-3">
        <div className="border-2 border-ink bg-white dark:bg-[#121212] shadow-[3px_3px_0px_#121212]">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b-2 border-ink bg-sand/70 dark:bg-[#1a1a1a] px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#059669] animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-ink dark:text-white">
                Live Gig Radar (5km) · {filtered.length} Local Gigs Nearby
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                data-testid="toggle-jobs-map-btn"
                onClick={() => setShowMap(!showMap)}
                className="border border-ink bg-white dark:bg-[#222] px-2 py-0.5 text-[10px] font-black text-ink dark:text-white hover:bg-sand transition"
              >
                {showMap ? "Hide Map" : "Show Map"}
              </button>
              <button
                data-testid="jobs-map-expand-btn"
                onClick={() => nav("/map")}
                className="flex items-center gap-1 border border-ink bg-[#059669] px-2 py-0.5 text-[10px] font-black text-white hover:opacity-90 shadow-[1px_1px_0px_#121212]"
              >
                <span>Interactive Radar</span>
                <Expand size={11} />
              </button>
            </div>
          </div>

          {/* Collapsible Map Body with proper proportions */}
          {showMap && (
            <div className="relative isolate h-[160px] sm:h-[280px] w-full bg-sand/20" data-testid="jobs-radar-map">
              <GoogleMap
                pins={mapPins}
                zoom={13}
                userLocation={liveCoords}
                height="100%"
                radiusKm={5}
                onSelectPin={(pin) => {
                  const target = filtered.find((j) => j.id === pin.id);
                  if (target) {
                    setActiveJob(target);
                    setApplyOpen(true);
                  }
                }}
              />
              <button
                data-testid="jobs-near-me-btn"
                onClick={requestLocation}
                className={`absolute bottom-3 left-3 z-[400] flex items-center gap-1.5 border-2 border-ink px-2.5 py-1 text-xs font-black shadow-[2px_2px_0px_#121212] transition active:translate-y-0.5 ${
                  liveCoords ? "bg-[#059669] text-white" : "bg-white text-ink hover:bg-sand"
                }`}
              >
                {locStatus === "locating" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LocateFixed size={13} />
                )}
                <span>{liveCoords ? "GPS Locked" : "Locate Me"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quota Bar */}
      {isVerified && quota && (
        <div className="border-b-2 border-ink bg-brand" data-testid="quota-bar">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-2 sm:px-8">
            <div className="flex items-center gap-2">
              {hasBoost ? <Rocket size={15} className="text-white" /> : <Zap size={15} className="text-white" />}
              <span className="text-xs font-black tracking-wider text-white">
                {hasBoost ? `${Math.max(quotaLimit - quotaUsed, 0)} of ${quotaLimit} APPLIES LEFT · 24H BOOST ACTIVE` : `${Math.max(quotaLimit - quotaUsed, 0)} of ${quotaLimit} FREE APPLIES REMAINING TODAY`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setBoostPreviewOpen(true)} className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-white underline">
                <Sparkles size={12} /> Preview Boost
              </button>
              {!hasBoost && (
                <button data-testid="quota-upgrade-btn" onClick={() => setPaywallOpen(true)} className="border-2 border-ink bg-ink px-3 py-1 text-[10px] font-black text-white hover:bg-black transition shadow-[1.5px_1.5px_0px_#FFFFFF]">
                  +5 APPLIES ₹149
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Switcher Tabs: All Gigs vs Saved Bookmarks */}
      <div className="border-b-2 border-ink bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] px-4 sm:px-8">
          <button
            onClick={() => setViewTab("all")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black tracking-wider transition ${
              viewTab === "all" ? "border-brand bg-sand text-ink" : "border-transparent text-inkmuted hover:text-ink"
            }`}
          >
            <span>ALL GIGS ({jobs.length})</span>
          </button>
          <button
            onClick={() => setViewTab("saved")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-black tracking-wider transition ${
              viewTab === "saved" ? "border-brand bg-sand text-ink" : "border-transparent text-inkmuted hover:text-ink"
            }`}
          >
            <Heart size={14} className={savedJobIds.length > 0 ? "text-brand" : "text-inkmuted"} fill={savedJobIds.length > 0 ? "#E65A1E" : "none"} />
            <span>SAVED ({savedJobIds.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Sort & Filter Bar */}
      <div className="border-b-2 border-ink bg-white dark:bg-[#121212]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col sm:flex-row items-stretch sm:items-center gap-2.5 px-3 py-2.5 sm:px-8">
          <div className="flex h-11 flex-1 items-center gap-2 border-2 border-ink bg-sand dark:bg-[#1f1f1f] px-3 shadow-[1.5px_1.5px_0px_#121212]">
            <Search size={16} className="text-inkmuted" />
            <input
              data-testid="jobs-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gigs — UI design, reels, react, flutter…"
              className="wh-input flex-1 bg-transparent text-sm font-semibold text-ink dark:text-white placeholder:text-inkmuted"
            />
            {search && (
              <button data-testid="search-clear-btn" onClick={() => setSearch("")} className="flex h-5 w-5 items-center justify-center bg-ink">
                <X size={13} className="text-white" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sorting Dropdown */}
            <div className="flex-1 sm:flex-none flex items-center justify-between gap-1.5 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 py-2 shadow-[1.5px_1.5px_0px_#121212]">
              <ArrowUpDown size={14} className="text-inkmuted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-black text-ink dark:text-white outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="text-black">{o.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              data-testid="jobs-filter-btn"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex h-10 sm:h-11 items-center gap-2 border-2 border-ink px-3 sm:px-4 transition shadow-[1.5px_1.5px_0px_#121212] active:translate-y-0.5 ${
                activeFilterCount > 0 ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-white dark:bg-[#1a1a1a] text-ink dark:text-white hover:bg-sand"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span className="text-xs font-black tracking-wider">FILTERS</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center bg-brand text-[9px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Facet Filter Drawer */}
      {filtersOpen && (
        <div className="border-b-2 border-ink bg-sand" data-testid="jobs-filters-panel">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 sm:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FilterGroup label="BUDGET (GIG PAY)" options={BUDGETS} value={filters.budget} onPick={(v) => setFilters((p) => ({ ...p, budget: v }))} />
              <FilterGroup label="LOCATION RADIUS" options={DISTS} value={filters.dist} onPick={(v) => setFilters((p) => ({ ...p, dist: v }))} />
              <div>
                <p className="mb-1.5 text-[10px] font-black tracking-wider text-inkmuted uppercase">EMPLOYER RATING</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "ALL", value: null },
                    { label: "4.5★+", value: 4.5 },
                    { label: "4.8★+", value: 4.8 },
                  ].map((r) => (
                    <button
                      key={r.label}
                      onClick={() => setFilters((p) => ({ ...p, minRating: r.value }))}
                      className={`border-2 border-ink px-3 py-1.5 text-[11px] font-black ${
                        filters.minRating === r.value ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-white text-ink"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-ink/20 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => setFilters((p) => ({ ...p, verifiedOnly: e.target.checked }))}
                  className="h-4 w-4 border-2 border-ink"
                />
                <span className="text-xs font-bold text-ink">Verified Employers Only</span>
              </label>
              <button
                onClick={() => setFilters({ budget: null, dist: null, minRating: null, verifiedOnly: false })}
                className="text-xs font-black text-brand underline"
              >
                RESET ALL FILTERS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tiles */}
      <CategoryTiles selected={catFilter} onSelect={setCatFilter} testIDPrefix="jobs-cat-tile" />

      {/* Unverified Banner */}
      {!isVerified && (
        <div className="border-b-2 border-ink bg-ink" data-testid="unverified-banner">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 p-4 sm:px-8">
            <span className="flex h-10 w-10 items-center justify-center border-2 border-white bg-brand text-white">
              <Lock size={18} />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-black text-white">{user ? "Browse freely — verify once to apply to all gigs" : "Browse freely — sign in to apply"}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[#D6D6D6]">Profile & email verification unlocks direct chat and instant hiring.</p>
            </div>
            <button
              data-testid="banner-verify-cta"
              onClick={gotoVerify}
              className="border-2 border-white bg-brand px-4 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              {!user ? "SIGN IN" : freelancerId ? "RESUME" : "VERIFY ₹99"}
            </button>
          </div>
        </div>
      )}

      {/* Gig Cards Grid */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyBlock
            testID="empty-state"
            icon={<Search size={28} className="text-ink" />}
            title={viewTab === "saved" ? "No saved gigs yet" : term ? `No matches for "${search.trim()}"` : "No gigs match your active filters"}
            sub={viewTab === "saved" ? "Click the heart icon on any gig card to bookmark it for later." : "Try resetting your filters or searching for another keyword."}
            action={
              viewTab === "saved" ? (
                <button onClick={() => setViewTab("all")} className="border-2 border-ink bg-ink px-4 py-2 text-xs font-black text-white">
                  BROWSE ALL GIGS
                </button>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((job, idx) => (
              <FiverrGigCard
                key={job.id}
                job={job}
                index={idx}
                verified={isVerified}
                applied={appliedSet.has(job.id)}
                isSaved={savedJobIds.includes(job.id)}
                onToggleSave={(e) => handleToggleSave(job.id, e)}
                onApply={() => openApplyFor(job)}
                onMessage={() => {
                  const cid = convByJob[job.id];
                  cid ? nav(`/chat/${cid}?role=freelancer`) : nav("/freelancer/chats");
                }}
                onVerifyPress={gotoVerify}
              />
            ))}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {applyOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setApplyOpen(false)}>
          <div className="w-full max-w-xl border-2 border-ink bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand">SUBMIT GIG APPLICATION</span>
              <button onClick={() => setApplyOpen(false)} className="text-ink hover:text-brand"><X size={18} /></button>
            </div>
            <h3 className="mt-3 text-xl font-black text-ink">{activeJob?.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="border border-ink bg-sand px-2 py-1 text-xs font-black text-ink">₹{activeJob?.pay_label} FIXED</span>
              <span className="border border-ink bg-sand px-2 py-1 text-xs font-bold text-ink flex items-center gap-1">
                <MapPin size={11} className="text-brand" /> Job Area: {activeJob?.area || "Bengaluru"}
              </span>
            </div>

            {/* APPLICANT AREA & LIVE REAL-TIME DISTANCE MATCH */}
            <div className="my-3 border-2 border-ink bg-sand p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-ink">
                  YOUR NEIGHBORHOOD / AREA (FOR SUITABILITY)
                </span>
                <button
                  type="button"
                  onClick={requestLocation}
                  className="flex items-center gap-1 border border-ink bg-brand px-2 py-0.5 text-[9px] font-black text-white hover:bg-brand/90 transition active:translate-y-0.5"
                >
                  {locStatus === "locating" ? <Loader2 size={10} className="animate-spin" /> : <LocateFixed size={10} />}
                  <span>{locStatus === "locating" ? "DETECTING…" : "USE LIVE GPS"}</span>
                </button>
              </div>

              <input
                value={applicantArea}
                onChange={(e) => {
                  setApplicantArea(e.target.value);
                  setSavedArea(e.target.value);
                }}
                placeholder="e.g. Indiranagar, Koramangala, HSR Layout"
                className="wh-input mt-1.5 h-10 w-full border-2 border-ink bg-white px-3 text-xs font-bold text-ink outline-none"
              />

              <div className="mt-2 flex flex-wrap gap-1">
                {BENGALURU_AREAS.slice(0, 8).map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => {
                      setApplicantArea(a.name);
                      setSavedArea(a.name);
                    }}
                    className={`border border-ink px-2 py-0.5 text-[9px] font-black transition ${
                      applicantArea === a.name ? "bg-ink text-white" : "bg-white text-ink hover:bg-sand"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>

              {/* Real-time distance and suitability calculation */}
              {activeJob && (
                <div className="mt-2.5 flex items-center justify-between border-t border-ink/20 pt-2 text-xs font-black">
                  <span className="flex items-center gap-1 text-ink">
                    <MapPin size={12} className="text-brand" />
                    <span>
                      {applicantArea} → {activeJob.area || "Job"}: <strong>{calculateDistance(applicantArea, activeJob.area || "Bengaluru")} km away</strong>
                    </span>
                  </span>
                  {(() => {
                    const d = calculateDistance(applicantArea, activeJob.area || "Bengaluru");
                    const suit = getDistanceSuitability(d);
                    return (
                      <span
                        className="border border-ink px-2 py-0.5 text-[9px] font-black text-white"
                        style={{ backgroundColor: suit.color }}
                      >
                        {suit.badge}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-inkmuted">PITCH / COVER NOTE (OPTIONAL)</p>
            <textarea
              data-testid="apply-note-input"
              value={applyNote}
              onChange={(e) => setApplyNote(e.target.value)}
              placeholder="Hi! I am based in this area and have the required experience. Can start immediately…"
              maxLength={300}
              className="wh-input mt-1 min-h-[75px] w-full border-2 border-ink bg-white p-2.5 text-xs text-ink font-semibold outline-none"
            />
            {applyError && <p data-testid="apply-error" className="mt-2 text-xs font-bold text-danger">{applyError}</p>}
            
            {appliedJustNow ? (
              <div className="mt-4">
                <div data-testid="apply-success-flash" className="flex items-center justify-center gap-2 border-2 border-ink bg-ok p-4 text-white">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-black tracking-wide">APPLICATION SENT · DIRECT CHAT OPENED</span>
                </div>
                {lastConvId && (
                  <button
                    data-testid="apply-open-chat-btn"
                    onClick={() => { setApplyOpen(false); nav(`/chat/${lastConvId}?role=freelancer`); }}
                    className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3.5 text-xs font-black text-white hover:bg-black transition"
                  >
                    <MessagesSquare size={14} /> OPEN CHAT WITH EMPLOYER
                  </button>
                )}
              </div>
            ) : (
              <button
                data-testid="apply-confirm-btn"
                disabled={applying}
                onClick={submitApply}
                className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3.5 text-sm font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
              >
                {applying ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} /> SEND APPLICATION (1 APPLY)</>}
              </button>
            )}
            <p className="mt-2 text-center text-[11px] text-inkmuted">Employer sees your verified credentials immediately. 0% platform fee on earnings.</p>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {paywallOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPaywallOpen(false)}>
          <div className="w-full max-w-lg border-2 border-ink bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <span className="flex items-center gap-1.5 text-xs font-black text-brand uppercase">
                <Rocket size={15} /> DAILY APPLY LIMIT REACHED
              </span>
              <button onClick={() => setPaywallOpen(false)}><X size={18} /></button>
            </div>
            <p className="mt-3 text-2xl font-black text-ink leading-tight">Add 5 Extra Applies</p>
            <p className="mt-1 text-xs text-inkmuted">Keep landing gigs in your neighborhood with instant boost activation.</p>
            <div className="my-4 border-2 border-ink bg-sand p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-ink">₹149</span>
                <span className="text-xs font-bold text-inkmuted">Valid 24 hours</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-xs font-extrabold text-ink">
                <p className="flex items-center gap-1.5 text-ok"><Check size={14} /> +5 extra applications today (max 8)</p>
                <p className="flex items-center gap-1.5 text-ok"><Check size={14} /> Highlighted applicant badge</p>
              </div>
            </div>
            <CouponInput product="quota_boost" amount={149} onApplied={setBoostCoupon} testIDPrefix="boost-coupon" />
            <button
              data-testid="paywall-pay-btn"
              disabled={unlocking}
              onClick={submitUnlock}
              className="mt-3 flex w-full items-center justify-center border-2 border-ink bg-ink py-3.5 text-sm font-black text-white hover:bg-black transition disabled:opacity-60"
            >
              {unlocking ? <Loader2 size={18} className="animate-spin" /> : `PAY ₹${boostCoupon?.final_amount ?? 149} & UNLOCK`}
            </button>
          </div>
        </div>
      )}

      {/* Boost Preview Modal */}
      <BoostPreviewModal
        isOpen={boostPreviewOpen}
        onClose={() => setBoostPreviewOpen(false)}
        onConfirmBoost={() => { setBoostPreviewOpen(false); setPaywallOpen(true); }}
      />
    </Shell>
  );
}

function FilterGroup({ label, options, value, onPick }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-black tracking-wider text-inkmuted uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onPick(o.value)}
            className={`border-2 border-ink px-3 py-1.5 text-[11px] font-black transition ${
              value === o.value ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-white text-ink hover:bg-sand"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Fiverr / Upwork modeled Gig Card
function FiverrGigCard({ job, index, verified, applied, isSaved, onToggleSave, onApply, onMessage, onVerifyPress }) {
  return (
    <div
      data-testid={`job-card-${index}`}
      className="group flex flex-col justify-between border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#121212]"
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="border border-ink bg-brand px-2 py-0.5 text-[10px] font-black text-white uppercase">
              {job.category || "Gig"}
            </span>
            <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-0.5 text-[10px] font-bold text-ink">
              <MapPin size={10} className="text-brand" /> {job.distance_km ?? 0.5} km away
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-inkmuted">
              {(job.posted_minutes_ago ?? 25) < 60 ? `${job.posted_minutes_ago ?? 25}m ago` : `${Math.round((job.posted_minutes_ago ?? 120) / 60)}h ago`}
            </span>
            {/* Bookmark heart button */}
            <button
              data-testid={`job-save-btn-${index}`}
              onClick={onToggleSave}
              className="flex h-7 w-7 items-center justify-center border border-ink bg-white hover:bg-sand transition"
              title={isSaved ? "Remove from saved" : "Save gig"}
            >
              <Heart
                size={14}
                className={isSaved ? "text-brand" : "text-inkmuted"}
                fill={isSaved ? "#E65A1E" : "none"}
              />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-base font-black leading-tight text-ink group-hover:text-brand transition">
          {job.title}
        </h3>

        {/* Description Snippet */}
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-inkmuted">
          {job.description}
        </p>

        {/* Employer Info & Rating */}
        <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-ink">{job.company_name}</span>
              {job.verified_employer && (
                <ShieldCheck size={13} className="text-ok" title="Verified Local Employer" />
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-inkmuted">
              <span className="flex items-center gap-0.5 text-ink font-bold">
                <Star size={11} fill="#E65A1E" className="text-brand" /> {job.employer_rating || "4.9"}
              </span>
              <span>•</span>
              <span>{job.area || "Bengaluru"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Pay & Action Row */}
      <div className="mt-4 flex items-center justify-between border-t-2 border-ink pt-3">
        <div>
          <span className="text-[9px] font-black tracking-wider text-inkmuted uppercase">FIXED PAY</span>
          <p className="text-base font-black text-ink">
            ₹{job.pay_label || (job.pay ? Number(job.pay).toLocaleString("en-IN") : "Fixed")}
          </p>
        </div>

        <div>
          {applied ? (
            <button
              data-testid={`job-message-btn-${index}`}
              onClick={onMessage}
              className="flex items-center gap-1.5 border-2 border-ink bg-white px-4 py-2 text-xs font-black tracking-wider text-ink hover:bg-sand transition"
            >
              <MessagesSquare size={14} />
              <span>MESSAGE</span>
            </button>
          ) : (
            <button
              data-testid={`job-apply-btn-${index}`}
              onClick={onApply}
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-4 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <Send size={13} />
              <span>APPLY NOW</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
