import React, { useEffect, useState, useMemo, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BLOG_POSTS } from "@/data/blogPosts";
import {
  Search, X, Star, MapPin, IndianRupee, Clock, CheckCheck, Lock, LockOpen,
  PlusCircle, ArrowRight, MessagesSquare, Tag, LocateFixed, CheckCircle2,
  Loader2, Expand, Heart, SlidersHorizontal, ShieldCheck, Sparkles, ArrowUpDown,
  Map as MapIcon, Shield, Briefcase, Flame
} from "lucide-react";
import { Shell, TopBar, IconBtn, CategoryTiles } from "@/components/kit";
import GoogleMap from "@/components/GoogleMap";
import CouponInput from "@/components/CouponInput";
import { ProCardSkeleton } from "@/components/Skeletons";
import BoostPreviewModal from "@/components/BoostPreviewModal";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useRazorpay } from "@/hooks/usePayments";
import { useUserLocation, distanceKm } from "@/hooks/useUserLocation";
import { LEAD_CATEGORY_FILTERS } from "@/lib/catalogFilters";
import { getOrganicCoordinates, getProximityCoordinates } from "@/lib/locationAreas";
import { apiGet, getEmployerId } from "@/lib/api";
import { getSavedProIds, toggleSavePro, ADMIN_EMAILS } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";
import { matchLeadToTaxonomy, searchTaxonomy } from "@/lib/keywordTaxonomy";

export default function Employer() {
  const nav = useNavigate();
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.is_admin ||
    user?.role === "admin" ||
    (user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()))
  );
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
  const [radarRadius, setRadarRadius] = useState(2);
  const { startPayment } = useRazorpay();
  const { coords, status: locStatus, requestLocation } = useUserLocation();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (isAdmin || localStorage.getItem("workhop_employer_unlocked") === "1") setUnlocked(true);
    setSavedPros(getSavedProIds());
    apiGet("/leads/preview")
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleToggleSave = (proId, e) => {
    if (e) e.stopPropagation();
    const updated = toggleSavePro(proId);
    setSavedPros(updated);
  };

  const term = search.trim().toLowerCase();
  const matchedTaxonomies = useMemo(() => {
    if (!term || term.length < 2) return [];
    return searchTaxonomy(term);
  }, [term]);
  const activeFilter = LEAD_CATEGORY_FILTERS.find((f) => f.key === catFilter || f.cats.includes(catFilter));

  const base = leads.filter((l) => {
    if (onlySaved && !savedPros.includes(String(l.id))) return false;
    if (catFilter !== "ALL" && activeFilter) {
      const proCat = (l.category || l.bucket || "").toLowerCase();
      const proSkill = (l.skill || "").toLowerCase();
      const filterKey = activeFilter.key.toLowerCase();
      const inThisCat =
        proCat === filterKey ||
        proSkill === filterKey ||
        activeFilter.cats.some((c) => {
          const cl = c.toLowerCase();
          return cl === proSkill || cl === proCat || proSkill.includes(cl) || proCat.includes(cl);
        });
      if (!inThisCat) return false;
    }
    if (minRating && (l.rating || 0) < minRating) return false;
    if (!term) return true;
    return matchLeadToTaxonomy(l, term);
  });

  const sorted = useMemo(() => {
    const center = coords || { lat: 12.9352, lng: 77.6245 };
    const withDist = base.map((l, idx) => {
      const org = getProximityCoordinates(center.lat, center.lng, l.distance_km || (0.3 + (idx % 15) * 0.25), l.id || idx);
      const dist = distanceKm(center, org);
      return {
        ...l,
        lat: org.lat,
        lng: org.lng,
        distance_km: Math.round(dist * 10) / 10,
      };
    });

    const distFiltered = maxDistance ? withDist.filter((l) => (l.distance_km || 0) <= maxDistance) : withDist;

    return [...distFiltered].sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "jobs") return (b.jobs_done || 0) - (a.jobs_done || 0);
      if (sortBy === "rate") return (a.rate_hr || 0) - (b.rate_hr || 0);
      return (a.distance_km || 0) - (b.distance_km || 0);
    });
  }, [base, coords, maxDistance, sortBy]);

  const mapPins = useMemo(() => {
    return sorted
      .filter((l) => l.lat && l.lng)
      .map((l) => ({
        id: l.id,
        kind: "candidate",
        title: l.name,
        subtitle: `${l.skill} · ${l.distance_km} km away`,
        lat: l.lat,
        lng: l.lng,
      }));
  }, [sorted]);

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

  const mapSection = useMemo(() => {
    if (!showMap) return null;
    return (
      <div className="relative isolate h-[160px] sm:h-[280px] w-full bg-sand/20" data-testid="employer-map">
        <GoogleMap
          pins={mapPins}
          zoom={13}
          userLocation={coords}
          height="100%"
          radiusKm={radarRadius}
          onRadiusChange={setRadarRadius}
        />
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
    );
  }, [showMap, mapPins, coords, locStatus, requestLocation, radarRadius]);

  return (
    <Shell>
      <TopBar
        borderBottom={false}
        title="NEARBY EXPERTS"
        sub="Bengaluru · live map"
        backTestID="employer-back-btn"
        right={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAdmin && (
              <button
                onClick={() => nav("/freelancer/jobs")}
                className="hidden sm:inline-flex h-9 items-center gap-1.5 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 text-xs font-black tracking-wider text-ink dark:text-white hover:bg-sand dark:hover:bg-[#252525] shadow-[1.5px_1.5px_0px_#121212] transition active:translate-y-0.5"
                title="Switch to Freelancer Gigs"
              >
                <Briefcase size={14} className="text-brand shrink-0" />
                <span>GIGS VIEW</span>
              </button>
            )}
            {isAdmin && (
              <IconBtn testID="employer-admin-btn" onClick={() => nav("/admin")} title="Admin Dashboard">
                <Shield size={16} className="text-brand shrink-0" />
              </IconBtn>
            )}
            <button
              onClick={() => setBoostModalOpen(true)}
              className="hidden sm:inline-flex h-9 items-center gap-1.5 border-2 border-ink bg-[#FFEBEA] dark:bg-[#2a1414] px-3 text-xs font-black tracking-wider text-[#C62828] dark:text-[#ff6b6b] hover:bg-[#FFD7D5] shadow-[1.5px_1.5px_0px_#121212] transition active:translate-y-0.5"
              title="Make your gig urgent & boost to top"
            >
              <Flame size={14} className="text-[#FF3B30] fill-[#FF3B30] shrink-0" />
              <span>URGENT BOOST</span>
            </button>
            <IconBtn testID="employer-map-btn" onClick={() => setShowMap(!showMap)} title={showMap ? "Hide Map" : "Show Map"}>
              <MapIcon size={16} className={showMap ? "text-brand" : "text-ink dark:text-white"} />
            </IconBtn>
            <IconBtn testID="employer-plans-btn" onClick={() => nav("/employer/plans")} title="View Plans">
              <Tag size={16} className="text-brand" />
            </IconBtn>
          </div>
        }
      />

      {/* Category Icons Strip Placed Directly Above Map */}
      <CategoryTiles
        selected={catFilter}
        onSelect={(cat) => setCatFilter(cat)}
        testIDPrefix="lead-cat-tile"
      />

      {/* PROPORTIONAL & AESTHETIC RADAR MAP CARD */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 pt-3">
        <div className="border-2 border-ink bg-white dark:bg-[#121212] shadow-[3px_3px_0px_#121212]">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b-2 border-ink bg-sand/70 dark:bg-[#1a1a1a] px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-brand animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-ink dark:text-white">
                Live Talent Radar (2km) · {leads.length} Verified Pros Nearby
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
          {mapSection}
        </div>
      </div>

      {/* POST JOB CTA BAR */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 pt-3">
        <button
          data-testid="post-job-btn"
          onClick={() => nav("/employer/post-job")}
          className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3.5 px-6 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-y-0.5 hover:bg-brand/95"
        >
          <PlusCircle size={16} /> POST A GIG · 100% FREE
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-11 flex-1 items-center gap-2 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 shadow-[1.5px_1.5px_0px_#121212]">
              <Search size={16} className="text-inkmuted" />
              <input
                data-testid="leads-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pros — e.g. AutoCAD, Framer dev, Zomato menu, Kannada VO, Shopify…"
                className="wh-input flex-1 bg-transparent text-sm font-semibold text-ink dark:text-white placeholder:text-inkmuted"
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
              className={`flex h-11 items-center gap-1.5 border-2 border-ink px-3 sm:px-4 text-xs font-black shadow-[1.5px_1.5px_0px_#121212] transition active:translate-y-0.5 ${
                filtersDrawerOpen || maxDistance || minRating ? "bg-ink text-white" : "bg-white dark:bg-[#1a1a1a] text-ink dark:text-white hover:bg-sand"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">FILTERS</span>
              {(maxDistance || minRating) && <span className="h-2 w-2 rounded-full bg-brand" />}
            </button>
          </div>

          {/* Keyword Taxonomy Mapped Service Indicator */}
          {search && matchedTaxonomies.length > 0 && (
            <div data-testid="taxonomy-tags-bar" className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
              <span className="font-extrabold text-inkmuted dark:text-stone-400">Mapped Service:</span>
              {matchedTaxonomies.slice(0, 3).map((m) => (
                <button
                  type="button"
                  key={m.subdiscipline}
                  onClick={() => setSearch(m.subdiscipline)}
                  className="inline-flex items-center gap-1 border border-ink bg-[#FFF3C4] dark:bg-stone-800 px-2 py-0.5 font-bold text-ink dark:text-stone-200 shadow-[1px_1px_0px_#121212] hover:bg-brand hover:text-white transition"
                >
                  <Sparkles size={11} className="text-brand shrink-0" />
                  <span>{m.subdiscipline}</span>
                  <span className="text-[9px] opacity-75">({m.category})</span>
                </button>
              ))}
            </div>
          )}

          {/* TABS: ALL vs SAVED & SORT */}
          <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-2 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => setOnlySaved(false)}
                className={`flex h-9 items-center border-2 border-ink px-3 text-xs font-black transition ${
                  !onlySaved ? "bg-ink text-white dark:bg-[#2a2a2a] dark:!text-white" : "bg-white dark:bg-[#222] text-ink dark:!text-white hover:bg-sand"
                }`}
              >
                ALL PROS ({sorted.length})
              </button>
              <button
                onClick={() => setOnlySaved(true)}
                className={`flex h-9 items-center gap-1.5 border-2 border-ink px-3 text-xs font-black transition ${
                  onlySaved ? "bg-brand text-white" : "bg-white dark:bg-[#222] text-ink dark:!text-white hover:bg-sand"
                }`}
              >
                <Heart size={12} fill={onlySaved ? "white" : "none"} />
                SAVED ({savedPros.length})
              </button>
            </div>

            {/* SORT DROPDOWN */}
            <div className="flex h-9 items-center gap-1.5 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 shadow-[1.5px_1.5px_0px_#121212]">
              <ArrowUpDown size={13} className="text-inkmuted shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-black text-ink dark:text-white outline-none cursor-pointer"
              >
                <option value="distance" className="text-black">Nearest First</option>
                <option value="rating" className="text-black">Top Rated</option>
                <option value="jobs" className="text-black">Most Completed</option>
                <option value="rate" className="text-black">Rate: Low to High</option>
              </select>
            </div>
          </div>

          {/* EXPANDABLE FILTER DRAWER */}
          <div className={`flex-col gap-3 border-2 border-ink bg-sand dark:bg-[#1c1c1c] p-4 mt-2 shadow-[2px_2px_0px_#121212] ${filtersDrawerOpen ? "flex" : "hidden"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-ink dark:text-white">QUICK FILTERS</span>
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
                <span className="text-[10px] font-black tracking-wider text-inkmuted dark:text-stone-400">MAX DISTANCE</span>
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
                        maxDistance === d.val ? "bg-ink text-white dark:bg-[#2a2a2a] dark:!text-white" : "bg-white text-ink dark:bg-[#222] dark:!text-white hover:bg-stone"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black tracking-wider text-inkmuted dark:text-stone-400">MINIMUM RATING</span>
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
                        minRating === r.val ? "bg-ink text-white dark:bg-[#2a2a2a] dark:!text-white" : "bg-white text-ink dark:bg-[#222] dark:!text-white hover:bg-stone"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  unlocked={isAdmin || unlocked}
                  index={i}
                  isSaved={savedPros.includes(String(l.id))}
                  onToggleSave={(e) => handleToggleSave(l.id, e)}
                  onClick={() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                    nav(`/pro/${l.id}`);
                  }}
                />
              ))}
            </div>

            {!(isAdmin || unlocked) && sorted.length > 0 && (
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
                  className="mt-4 flex w-full max-w-md items-center justify-center gap-2 border-2 border-ink bg-[#121212] dark:bg-[#1a1a1a] py-3.5 text-[15px] font-black text-white shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#E65A1E] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition"
                >
                  <span>Unlock 5 Local Leads · ₹199</span>
                  <LockOpen size={16} />
                </button>
              </div>
            )}

            {(isAdmin || unlocked) && (
              <div
                data-testid="unlocked-badge"
                className="my-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-2 border-ok bg-[#E5F8EE] dark:bg-[#132c1e] p-3 sm:p-4 shadow-[2px_2px_0px_#121212]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-ok shrink-0" />
                  <span className="text-xs sm:text-sm font-extrabold text-ink dark:text-emerald-200">
                    {isAdmin ? "Admin Full Access · All Pro Leads Unlocked (Zero Paywall)" : "Payment verified · All 5 leads unlocked"}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nav("/freelancer/jobs")}
                      className="border border-ink bg-white dark:bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-black text-ink dark:text-white hover:bg-sand"
                    >
                      SWITCH TO GIGS →
                    </button>
                    <button
                      onClick={() => nav("/admin")}
                      className="border border-ink bg-brand text-white px-2.5 py-1 text-[10px] font-black"
                    >
                      ADMIN DASHBOARD
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
              {sorted.slice(2).map((l, i) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  unlocked={isAdmin || unlocked}
                  index={i + 2}
                  isSaved={savedPros.includes(String(l.id))}
                  onToggleSave={(e) => handleToggleSave(l.id, e)}
                  onClick={() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                    nav(`/pro/${l.id}`);
                  }}
                />
              ))}
            </div>

            <button
              data-testid="plans-banner"
              onClick={() => nav("/employer/plans")}
              className="mt-4 flex flex-col gap-3 border-2 border-ink bg-[#121212] dark:bg-[#161618] p-6 text-left transition hover:bg-black shadow-[3px_3px_0px_#E65A1E]"
            >
              <span className="self-start bg-brand px-3 py-1 text-[10px] font-black tracking-[0.15em] text-white">
                EMPLOYER BRANDING PLANS
              </span>
              <p className="text-xl font-black text-white">
                Looking to Hire At Scale or Need Urgent Talent?
              </p>
              <p className="text-xs text-white/80 font-semibold">
                Explore Pro Employer Plans · Unlimited Lead Unlocks · Dedicated Account Manager · Custom Boosts
              </p>
            </button>

            {/* LATEST FROM THE BLOG / HIRING PLAYBOOKS SECTION */}
            <div className="mt-8 pt-8 border-t-2 border-ink">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="border border-ink bg-brand text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      WORKHOP INSIGHTS
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-ink dark:text-white uppercase tracking-tight">
                      Hiring Playbooks &amp; Local Market Guides
                    </h3>
                  </div>
                  <p className="text-xs text-inkmuted font-semibold mt-0.5">
                    Insights on 5km radius freelancing, rate cards, and direct WhatsApp recruiting in Bangalore.
                  </p>
                </div>
                <Link
                  to="/blog"
                  className="flex items-center gap-1 text-xs font-black text-brand hover:underline"
                >
                  VIEW ALL GUIDES ({BLOG_POSTS.length}) →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BLOG_POSTS.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="flex flex-col justify-between border-2 border-ink bg-white dark:bg-[#161618] p-4 shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:border-brand group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`border px-1.5 py-0.5 text-[9px] font-black uppercase ${post.categoryColor}`}>
                          {post.category}
                        </span>
                        <span className="text-[10px] font-bold text-inkmuted">{post.readTime}</span>
                      </div>
                      <h4 className="text-sm font-black text-ink dark:text-white group-hover:text-brand transition leading-snug line-clamp-2">
                        {post.title}
                      </h4>
                      <p className="text-xs text-inkmuted dark:text-stone-300 font-medium mt-1.5 line-clamp-2">
                        {post.summary}
                      </p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-ink/10 flex items-center justify-between text-[11px] font-black text-brand">
                      <span>READ PLAYBOOK</span>
                      <ArrowRight size={12} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
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
      <BoostPreviewModal
        isOpen={boostModalOpen}
        onClose={() => setBoostModalOpen(false)}
        onConfirmBoost={() => {
          setBoostModalOpen(false);
          nav("/employer/post-job", { state: { boost: true } });
        }}
      />
      {/* FLOATING CIRCULAR CHAT WIDGET (Bottom Right) */}
      <FloatingChatWidget role="employer" />
    </Shell>
  );
}

const LeadCard = memo(function LeadCard({ lead, unlocked, index, isSaved, onToggleSave, onClick }) {
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
});

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
