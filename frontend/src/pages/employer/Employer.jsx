import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Star, MapPin, IndianRupee, Clock, CheckCheck, Lock, LockOpen,
  PlusCircle, ArrowRight, MessagesSquare, Tag, LocateFixed, CheckCircle2,
  Loader2, Expand, Heart, SlidersHorizontal, ShieldCheck, Sparkles, ArrowUpDown
} from "lucide-react";
import { Shell, TopBar, IconBtn, CategoryTiles } from "@/components/kit";
import GoogleMap from "@/components/GoogleMap";
import CouponInput from "@/components/CouponInput";
import { ProCardSkeleton } from "@/components/Skeletons";
import BoostPreviewModal from "@/components/BoostPreviewModal";
import { useRazorpay } from "@/hooks/usePayments";
import { useUserLocation, distanceKm } from "@/hooks/useUserLocation";
import { LEAD_CATEGORY_FILTERS } from "@/lib/catalogFilters";
import { apiGet, getEmployerId } from "@/lib/api";
import { getSavedProIds, toggleSavePro } from "@/lib/clientStore";

export default function Employer() {
  const nav = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("distance"); // distance | rating | jobs | rate
  const [maxDistance, setMaxDistance] = useState(null);
  const [minRating, setMinRating] = useState(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [savedPros, setSavedPros] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const { startPayment } = useRazorpay();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  useEffect(() => {
    if (localStorage.getItem("workhop_employer_unlocked") === "1") setUnlocked(true);
    setSavedPros(getSavedProIds());
    apiGet("/leads/preview")
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleSave = (proId, e) => {
    if (e) e.stopPropagation();
    const updated = toggleSavePro(proId);
    setSavedPros(updated);
  };

  const term = search.trim().toLowerCase();
  const activeFilter = LEAD_CATEGORY_FILTERS.find((f) => f.key === catFilter);

  const base = leads.filter((l) => {
    if (onlySaved && !savedPros.includes(String(l.id))) return false;
    if (catFilter !== "ALL" && activeFilter && !activeFilter.cats.includes(l.skill) && l.category !== catFilter) return false;
    if (minRating && (l.rating || 0) < minRating) return false;
    if (!term) return true;
    return (
      l.skill.toLowerCase().includes(term) ||
      l.name.toLowerCase().includes(term) ||
      (l.portfolio || "").toLowerCase().includes(term) ||
      (l.keywords || []).some((k) => k.toLowerCase().includes(term))
    );
  });

  const withDist = base.map((l) => {
    if (coords && l.lat && l.lng) {
      return { ...l, distance_km: Math.round(distanceKm(coords, { lat: l.lat, lng: l.lng }) * 10) / 10 };
    }
    return { ...l, distance_km: l.distance_km || 1.2 };
  });

  const distFiltered = maxDistance ? withDist.filter((l) => (l.distance_km || 0) <= maxDistance) : withDist;

  const sorted = [...distFiltered].sort((a, b) => {
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "jobs") return (b.jobs_done || 0) - (a.jobs_done || 0);
    if (sortBy === "rate") return (a.rate_hr || 0) - (b.rate_hr || 0);
    return (a.distance_km || 0) - (b.distance_km || 0);
  });

  const mapPins = sorted
    .filter((l) => l.lat && l.lng)
    .map((l) => ({
      id: l.id,
      kind: "candidate",
      title: l.name,
      subtitle: `${l.skill} · ${l.distance_km} km away`,
      lat: l.lat,
      lng: l.lng,
    }));

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
    } catch (e) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("pay err", e);
    } finally {
      setPaying(false);
    }
  };

  return (
    <Shell>
      <TopBar
        title="NEARBY EXPERTS"
        sub="Bengaluru · live map · 2km radius"
        backTestID="employer-back-btn"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBoostModalOpen(true)}
              className="hidden sm:flex items-center gap-1 border-2 border-ink bg-[#FFF3C4] px-2.5 py-1 text-[10px] font-black text-black hover:bg-[#FFEAA0]"
              title="Preview listing boost"
            >
              <Sparkles size={13} className="text-brand" /> BOOST
            </button>
            <IconBtn testID="employer-inbox-btn" onClick={() => nav("/employer/inbox")}>
              <MessagesSquare size={18} className="text-ink" />
            </IconBtn>
            <IconBtn testID="employer-plans-btn" onClick={() => nav("/employer/plans")}>
              <Tag size={18} className="text-brand" />
            </IconBtn>
          </div>
        }
      />

      {/* PROPORTIONAL & AESTHETIC RADAR MAP CARD */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 pt-3">
        <div className="border-2 border-ink bg-white dark:bg-[#121212] shadow-[3px_3px_0px_#121212]">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b-2 border-ink bg-sand/70 dark:bg-[#1a1a1a] px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-brand animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-ink dark:text-white">
                Live Talent Radar · {leads.length} Verified Pros Nearby
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                data-testid="toggle-employer-map-btn"
                onClick={() => setShowMap(!showMap)}
                className="border border-ink bg-white dark:bg-[#222] px-2 py-0.5 text-[10px] font-black text-ink dark:text-white hover:bg-sand transition"
              >
                {showMap ? "Hide Map" : "Show Map"}
              </button>
              <button
                data-testid="map-expand-btn"
                onClick={() => nav("/map")}
                className="flex items-center gap-1 border border-ink bg-brand px-2 py-0.5 text-[10px] font-black text-white hover:opacity-90 shadow-[1px_1px_0px_#121212]"
              >
                <span>Interactive Radar</span>
                <Expand size={11} />
              </button>
            </div>
          </div>

          {/* Collapsible Map Body with proper proportions */}
          {showMap && (
            <div className="relative h-[250px] sm:h-[280px] w-full bg-sand/20" data-testid="employer-map">
              <GoogleMap pins={mapPins} zoom={13} userLocation={coords} height="100%" radiusKm={2} />
              <button
                data-testid="leads-near-me-btn"
                onClick={requestLocation}
                className={`absolute bottom-3 left-3 z-[400] flex items-center gap-1.5 border-2 border-ink px-2.5 py-1 text-xs font-black shadow-[2px_2px_0px_#121212] transition active:translate-y-0.5 ${
                  coords ? "bg-brand text-white" : "bg-white text-ink hover:bg-sand"
                }`}
              >
                {locStatus === "locating" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LocateFixed size={13} className={coords ? "text-white" : "text-brand"} />
                )}
                <span className="text-[10px] font-black tracking-wider">
                  {coords ? "GPS ACTIVE" : "NEAR ME"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POST JOB CTA BAR */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 pt-3">
        <button
          data-testid="post-job-btn"
          onClick={() => nav("/employer/post-job")}
          className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3.5 px-6 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-y-0.5 hover:bg-brand/95"
        >
          <PlusCircle size={16} /> POST A JOB · FROM ₹299
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-11 flex-1 items-center gap-2 border-2 border-ink bg-white px-3 shadow-[1.5px_1.5px_0px_#121212]">
              <Search size={16} className="text-inkmuted" />
              <input
                data-testid="leads-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pros — logo, shopify, gst, reels…"
                className="wh-input flex-1 bg-transparent text-sm font-semibold text-ink placeholder:text-inkmuted"
              />
              {search && (
                <button
                  data-testid="leads-search-clear-btn"
                  onClick={() => setSearch("")}
                  className="flex h-[22px] w-[22px] items-center justify-center bg-ink"
                >
                  <X size={14} className="text-white" />
                </button>
              )}
            </div>

            <button
              onClick={() => setFiltersDrawerOpen(!filtersDrawerOpen)}
              className={`flex h-11 items-center gap-1.5 border-2 border-ink px-4 text-xs font-black shadow-[1.5px_1.5px_0px_#121212] transition active:translate-y-0.5 ${
                filtersDrawerOpen || maxDistance || minRating ? "bg-ink text-white" : "bg-white text-ink hover:bg-sand"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">FILTERS</span>
              {(maxDistance || minRating) && <span className="h-2 w-2 rounded-full bg-brand" />}
            </button>
          </div>

          {/* TABS: ALL vs SAVED */}
          <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-2 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => setOnlySaved(false)}
                className={`border-2 border-ink px-3 py-1.5 text-[11px] font-black transition ${
                  !onlySaved ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-white text-ink hover:bg-sand"
                }`}
              >
                ALL PROS ({distFiltered.length})
              </button>
              <button
                onClick={() => setOnlySaved(true)}
                className={`flex items-center gap-1.5 border-2 border-ink px-3 py-1.5 text-[11px] font-black transition ${
                  onlySaved ? "bg-brand text-white" : "bg-white text-ink hover:bg-sand"
                }`}
              >
                <Heart size={12} fill={onlySaved ? "white" : "none"} />
                SAVED ({savedPros.length})
              </button>
            </div>

            {/* SORT DROPDOWN */}
            <div className="flex items-center gap-1 border-2 border-ink bg-white px-3 py-1.5 shadow-[1px_1px_0px_#121212]">
              <ArrowUpDown size={12} className="text-inkmuted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-[11px] font-black text-ink outline-none cursor-pointer"
              >
                <option value="distance">Nearest First</option>
                <option value="rating">Top Rated</option>
                <option value="jobs">Most Completed</option>
                <option value="rate">Rate: Low to High</option>
              </select>
            </div>
          </div>

          {/* EXPANDABLE FILTER DRAWER */}
          {filtersDrawerOpen && (
            <div className="flex flex-col gap-3 border-2 border-ink bg-sand p-4 mt-2 animate-in fade-in duration-150 shadow-[2px_2px_0px_#121212]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-ink">QUICK FILTERS</span>
                <button
                  onClick={() => {
                    setMaxDistance(null);
                    setMinRating(null);
                    setCatFilter("ALL");
                    setSearch("");
                  }}
                  className="text-[10px] font-bold text-brand hover:underline"
                >
                  Reset All
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black tracking-wider text-inkmuted">MAX DISTANCE</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "ALL", val: null },
                    { label: "≤ 2 KM", val: 2 },
                    { label: "≤ 5 KM", val: 5 },
                    { label: "≤ 10 KM", val: 10 },
                  ].map((d) => (
                    <button
                      key={d.label}
                      onClick={() => setMaxDistance(d.val)}
                      className={`border border-ink px-2.5 py-1 text-[10px] font-black ${
                        maxDistance === d.val ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-white text-ink hover:bg-stone"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black tracking-wider text-inkmuted">MINIMUM RATING</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "ANY", val: null },
                    { label: "4.5★+", val: 4.5 },
                    { label: "4.8★+", val: 4.8 },
                  ].map((r) => (
                    <button
                      key={r.label}
                      onClick={() => setMinRating(r.val)}
                      className={`border border-ink px-2.5 py-1 text-[10px] font-black ${
                        minRating === r.val ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-white text-ink hover:bg-stone"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CategoryTiles selected={catFilter} onSelect={setCatFilter} testIDPrefix="lead-cat-tile" />

      {/* PRO LISTINGS */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 py-2 pb-16 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={24} className="animate-spin text-brand" />
            <p className="text-xs font-bold text-inkmuted">Finding verified pros near you…</p>
          </div>
        ) : (
          <>
            {sorted.length === 0 && (
              <div data-testid="leads-empty" className="flex flex-col items-center gap-3 border-2 border-ink bg-sand p-8 text-center">
                <Search size={32} className="text-ink" />
                <p className="text-base font-black text-ink">
                  {onlySaved
                    ? "No saved pros yet"
                    : `No pros match "${search.trim() || catFilter}"`}
                </p>
                <p className="text-xs text-inkmuted max-w-sm">
                  {onlySaved
                    ? "Bookmark candidate profiles with the heart icon to save them for quick hiring."
                    : "Try adjusting your search keyword or clearing the active filters."}
                </p>
                {onlySaved && (
                  <button
                    onClick={() => setOnlySaved(false)}
                    className="mt-2 border-2 border-ink bg-ink px-4 py-2 text-xs font-black text-white"
                  >
                    VIEW ALL PROS
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.slice(0, 2).map((l, i) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  unlocked={unlocked}
                  index={i}
                  isSaved={savedPros.includes(String(l.id))}
                  onToggleSave={(e) => handleToggleSave(l.id, e)}
                  onClick={() => nav(`/pro/${l.id}`)}
                />
              ))}
            </div>

            {!unlocked && sorted.length > 0 && (
              <div className="relative my-2 border-2 border-ink p-6 bg-sand shadow-[3px_3px_0px_#121212]" data-testid="unlock-banner">
                <div className="absolute -left-0.5 -top-0.5 h-8 w-8 bg-brand" />
                <p className="whitespace-pre-line text-2xl font-black leading-tight text-ink">
                  Unlock the Closest 5{"\n"}Verified Experts on Your Block.
                </p>
                <p className="mt-2 text-sm text-inkmuted">
                  Phone numbers instantly revealed — call &amp; hire directly with zero middlemen.
                </p>
                <button
                  data-testid="unlock-cta-btn"
                  onClick={() => setSheetOpen(true)}
                  className="mt-4 flex w-full max-w-md items-center justify-center gap-2 border-2 border-ink bg-ink py-3.5 text-[15px] font-black text-white shadow-[2px_2px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition"
                >
                  <span>Unlock 5 Local Leads · ₹199</span>
                  <LockOpen size={16} />
                </button>
              </div>
            )}

            {unlocked && (
              <div
                data-testid="unlocked-badge"
                className="my-2 flex items-center justify-center gap-2 border-2 border-ok bg-[#E5F8EE] p-4 shadow-[2px_2px_0px_#121212]"
              >
                <CheckCircle2 size={20} className="text-ok" />
                <span className="text-sm font-extrabold text-ink">
                  Payment verified · All 5 leads unlocked
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
              {sorted.slice(2).map((l, i) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  unlocked={unlocked}
                  index={i + 2}
                  isSaved={savedPros.includes(String(l.id))}
                  onToggleSave={(e) => handleToggleSave(l.id, e)}
                  onClick={() => nav(`/pro/${l.id}`)}
                />
              ))}
            </div>

            <button
              data-testid="plans-banner"
              onClick={() => nav("/employer/plans")}
              className="mt-4 flex flex-col gap-3 border-2 border-ink bg-ink p-6 text-left transition hover:bg-ink/95 shadow-[3px_3px_0px_#E65A1E]"
            >
              <span className="self-start bg-brand px-3 py-1 text-[10px] font-black tracking-[0.15em] text-white">
                EMPLOYER BRANDING PLANS
              </span>
              <p className="text-xl font-black text-white">
                Looking to Hire At Scale or Need Urgent Talent?
              </p>
              <p className="text-xs text-white/75">
                Explore Pro Employer Plans · Unlimited Lead Unlocks · Dedicated Account Manager · Custom Boosts
              </p>
            </button>
          </>
        )}
      </div>

      {/* RAZORPAY UNLOCK SHEET */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/55"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-2xl border-t-2 border-ink bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">
              WORKHOP × RAZORPAY
            </p>
            <p className="text-4xl font-black tracking-tight text-ink">
              Pay ₹{coupon?.final_amount ?? 199}
            </p>
            <p className="mt-1 text-[13px] text-inkmuted">
              One-time unlock for verified leads in your radius.
            </p>
            <div className="my-4 border-2 border-ink bg-sand p-3">
              <p className="text-[10px] font-extrabold tracking-wide text-inkmuted">
                SECURE CHECKOUT
              </p>
              <p className="mt-1 text-base font-black text-ink">UPI · Cards · Netbanking</p>
            </div>
            <div className="mb-3">
              <CouponInput
                product="employer_unlock"
                amount={199}
                onApplied={setCoupon}
                testIDPrefix="unlock-coupon"
              />
            </div>
            <button
              data-testid="pay-confirm-btn"
              onClick={handlePay}
              disabled={paying}
              className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-4 text-[15px] font-black text-white disabled:opacity-60"
            >
              {paying ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Waiting for payment…
                </>
              ) : (
                `Pay ₹${coupon?.final_amount ?? 199} with Razorpay`
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-inkmuted">
              🔒 Razorpay Test Mode · Test card 4111 1111 1111 1111
            </p>
          </div>
        </div>
      )}

      {/* BOOST PREVIEW MODAL */}
      <BoostPreviewModal isOpen={boostModalOpen} onClose={() => setBoostModalOpen(false)} />
    </Shell>
  );
}

function LeadCard({ lead, unlocked, index, isSaved, onToggleSave, onClick }) {
  return (
    <div
      data-testid={`lead-card-${index}`}
      onClick={onClick}
      className="group relative cursor-pointer border-2 border-ink bg-white p-4 text-left transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#121212] active:translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-brand font-black tracking-wider text-white text-base">
          {lead.initials || (lead.name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p data-testid={`lead-name-${index}`} className="truncate text-[15px] font-black text-ink">
              {lead.name}
            </p>
            <span className="flex items-center gap-0.5 bg-ok/15 text-ok border border-ok px-1.5 py-0.2 text-[9px] font-black">
              <ShieldCheck size={10} /> VERIFIED
            </span>
          </div>
          <p className="text-xs text-inkmuted font-semibold truncate">{lead.skill}</p>
        </div>

        {/* TOP RIGHT: RATING & SAVE BUTTON */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[11px] font-black">
            <Star size={11} fill="#121212" /> {lead.rating}
            {lead.reviews_count ? ` (${lead.reviews_count})` : ""}
          </span>
          <button
            onClick={onToggleSave}
            className={`flex h-8 w-8 items-center justify-center border border-ink transition ${
              isSaved ? "bg-[#FFE5D6] text-brand" : "bg-white text-inkmuted hover:text-ink"
            }`}
            title={isSaved ? "Saved" : "Save pro"}
          >
            <Heart size={14} fill={isSaved ? "#E65A1E" : "none"} />
          </button>
        </div>
      </div>

      {!!lead.intro && (
        <p
          data-testid={`lead-intro-${index}`}
          className="mt-2.5 line-clamp-2 text-xs leading-4 text-inkmuted"
        >
          {lead.intro}
        </p>
      )}

      <div className="my-3 h-px bg-ink/15" />

      {/* STATS BADGE CHIPS */}
      <div className="flex flex-wrap gap-1.5" data-testid={`lead-stats-${index}`}>
        <Stat icon={<MapPin size={11} />}>
          {lead.area || "Bengaluru"} · {lead.distance_km} km
        </Stat>
        <Stat icon={<IndianRupee size={11} />}>
          {lead.rate_hr ? `₹${lead.rate_hr}/hr` : "Rate on chat"}
        </Stat>
        <Stat icon={<Clock size={11} />}>{lead.delivery_days || 3}d delivery</Stat>
        <Stat icon={<CheckCheck size={11} />}>{lead.jobs_done || 0} jobs</Stat>
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5 bg-sand/60 p-2.5 border border-ink/20">
        <Field
          icon={<span>📞</span>}
          label="PHONE"
          value={unlocked ? lead.phone : "+91 ••••• •••••"}
          blur={!unlocked}
          testID={`lead-phone-${index}`}
        />
        <Field
          icon={<span>🔗</span>}
          label="PORTFOLIO / WEBSITE"
          value={unlocked ? lead.portfolio : "████████████.in"}
          blur={!unlocked}
          testID={`lead-portfolio-${index}`}
        />
      </div>

      <div className="mt-3 flex items-center justify-between pt-1 border-t border-ink/10">
        <span className="text-[11px] font-black text-ink group-hover:text-brand transition">
          VIEW FULL PROFILE →
        </span>
        {unlocked ? (
          <span className="border-2 border-ink bg-brand px-3 py-1 text-[11px] font-black tracking-wider text-white">
            CONTACT
          </span>
        ) : (
          <span className="flex items-center gap-1 bg-ink px-2.5 py-1 text-[10px] font-black tracking-wider text-white">
            <Lock size={10} /> LOCKED
          </span>
        )}
      </div>
    </div>
  );
}

const Stat = ({ icon, children }) => (
  <span className="flex items-center gap-1 border border-ink/30 bg-sand px-2 py-0.5 text-[10px] font-extrabold text-ink">
    {icon}
    {children}
  </span>
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
