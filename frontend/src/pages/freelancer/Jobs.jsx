import React, { memo, useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Search, X, Grid3x3, Map as MapIcon, MessagesSquare, ShieldCheck, ShieldHalf,
  Zap, Rocket, SlidersHorizontal, MapPin, IndianRupee, Send, Lock, CheckCircle2,
  Loader2, Check, Heart, ArrowUpDown, Star, Sparkles, Filter, LocateFixed, Expand,
  Users, Shield, Coins, Trophy, Flame, FileText, AlertTriangle, Eye, EyeOff,
  Plus, Minus, Trash2, Paperclip, UploadCloud
} from "lucide-react";
import {
  Shell, TopBar, IconBtn, EmptyBlock, Breadcrumbs,
  ProfileProgressBar, BoostPreviewModal, JobCardSkeleton
} from "@/components/kit";
import GoogleMap from "@/components/GoogleMap";
import CouponInput from "@/components/CouponInput";
import CreditsTopUpModal from "@/components/CreditsTopUpModal";
import ApplicantLeaderboardModal from "@/components/ApplicantLeaderboardModal";
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
import {
  getSavedJobIds,
  toggleSaveJob,
  ADMIN_EMAILS,
  getCreditsWallet,
  getFreelancerProfile,
  getJobLeaderboard
} from "@/lib/clientStore";
import { scanText, redactViolations, scanPdfFile } from "@/lib/contactScanner";
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
  const isAdmin = Boolean(
    user?.is_admin ||
    user?.role === "admin" ||
    (user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()))
  );
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
  const [boostCredits, setBoostCredits] = useState(0);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [appliedJustNow, setAppliedJustNow] = useState(null);
  const [lastConvId, setLastConvId] = useState(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [leaderboardJob, setLeaderboardJob] = useState(null);
  const [wallet, setWallet] = useState(() => getCreditsWallet(getFreelancerId()));

  // Live Bidding Leaderboard & Top Bid computation for the active gig proposal modal
  const modalLeaderboard = useMemo(() => {
    if (!activeJob?.id) return { list: [], topBid: 10 };
    const list = getJobLeaderboard(activeJob.id) || [];
    const highestBid = list.length > 0 ? Math.max(...list.map((item) => Number(item.boost_credits) || 0), 0) : 0;
    return { list, topBid: highestBid > 0 ? highestBid : 10 };
  }, [activeJob]);

  // Rate Quoting (Fixed vs Hourly)
  const [proposedRateType, setProposedRateType] = useState("fixed"); // "fixed" | "hourly"
  const [proposedQuote, setProposedQuote] = useState(1000);

  // PDF Attachment & Scanner State
  const [pdfAttachment, setPdfAttachment] = useState(null);
  const [pdfScanning, setPdfScanning] = useState(false);
  const [textViolations, setTextViolations] = useState([]);
  const [pdfViolations, setPdfViolations] = useState([]);

  // Portfolio Highlights
  const [portfolioHighlights, setPortfolioHighlights] = useState([]);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [newHighlightTag, setNewHighlightTag] = useState("");
  const [showAddHighlight, setShowAddHighlight] = useState(false);

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

  const isVerified = isAdmin || !!status?.is_verified;
  const term = search.trim().toLowerCase();
  const activeFilter = JOB_CATEGORY_FILTERS.find((f) => f.key === catFilter || f.cats.includes(catFilter));
  const inCat = (j) => {
    if (catFilter === "ALL" || !activeFilter) return true;
    const cat = (j.category || "").toLowerCase();
    const bkt = (j.bucket || "").toLowerCase();
    const filterKey = activeFilter.key.toLowerCase();
    if (cat === filterKey || bkt === filterKey) return true;
    return activeFilter.cats.some((c) => {
      const cl = c.toLowerCase();
      return cl === cat || cl === bkt || (cat && cat.includes(cl)) || (bkt && bkt.includes(cl));
    });
  };

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
  const quotaExhausted = isAdmin ? false : (quotaUsed >= quotaLimit);
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (catFilter !== "ALL" ? 1 : 0);

  const gotoVerify = () => {
    if (!user) { localStorage.setItem("workhop_auth_intent", "freelancer"); nav("/"); return; }
    nav("/freelancer");
  };

  const openApplyFor = (job) => {
    if (!user) { localStorage.setItem("workhop_auth_intent", "freelancer"); nav("/"); return; }
    if (appliedSet.has(job.id)) return;
    const fid = freelancerId || getFreelancerId();
    if (!freelancerId) setFid(fid);
    setWallet(getCreditsWallet(fid));
    setBoostCredits(0);
    setActiveJob(job);
    setApplyNote("");
    setApplyError(null);
    setAppliedJustNow(null);

    // Set proposal rate defaults
    setProposedRateType(job.price_type === "hourly" ? "hourly" : "fixed");
    setProposedQuote(job.pay || 1000);

    // Reset attachments & scanners
    setPdfAttachment(null);
    setPdfScanning(false);
    setTextViolations([]);
    setPdfViolations([]);

    // Load portfolio highlights
    const profile = getFreelancerProfile(fid);
    let items = (profile?.portfolio || []).map((p) => ({
      id: p.id || Math.random().toString(),
      title: p.title || "Portfolio Work Sample",
      tag: p.tags?.[0] || p.category || "Design & Tech",
      link: p.link || "",
      visible: true,
    }));
    if (items.length === 0) {
      items = [
        { id: "ph-1", title: "Fintech Onboarding Flow (MVP)", tag: "Figma & React", link: "", visible: true },
        { id: "ph-2", title: "Hyperlocal Dispatch System", tag: "Mobile Web & Maps", link: "", visible: true },
        { id: "ph-3", title: "Neo-Brutalist Design System", tag: "Tailwind CSS", link: "", visible: false },
      ];
    }
    setPortfolioHighlights(items);
    setShowAddHighlight(false);
    setNewHighlightTitle("");
    setNewHighlightTag("");

    setApplyOpen(true);
  };

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setApplyNote(val);
    const scanResult = scanText(val);
    setTextViolations(scanResult.violations || []);
    if (applyError && scanResult.violations.length === 0 && pdfViolations.length === 0) {
      setApplyError(null);
    }
  };

  const handleAutoRedactNote = () => {
    const clean = redactViolations(applyNote);
    setApplyNote(clean);
    setTextViolations([]);
    if (pdfViolations.length === 0) {
      setApplyError(null);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setApplyError("Please upload a valid PDF document (.pdf).");
      return;
    }
    setPdfScanning(true);
    try {
      const res = await scanPdfFile(file);
      setPdfAttachment({
        fileName: res.fileName,
        fileSize: res.fileSize,
        dataUrl: res.dataUrl,
      });
      setPdfViolations(res.violations || []);
    } catch (err) {
      console.error("PDF scanning error:", err);
    } finally {
      setPdfScanning(false);
    }
  };

  const handleRemovePdf = () => {
    setPdfAttachment(null);
    setPdfViolations([]);
    if (textViolations.length === 0) {
      setApplyError(null);
    }
  };

  const handleAddHighlight = () => {
    if (!newHighlightTitle.trim()) return;
    setPortfolioHighlights((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        title: newHighlightTitle.trim(),
        tag: newHighlightTag.trim() || "Work Sample",
        visible: true,
      },
    ]);
    setNewHighlightTitle("");
    setNewHighlightTag("");
    setShowAddHighlight(false);
  };

  const submitApply = async () => {
    const fid = freelancerId || getFreelancerId();
    if (!activeJob || !fid) return;

    // Contact scanner safety validation
    if (textViolations.length > 0 || pdfViolations.length > 0) {
      setApplyError("Direct contact details detected! WorkHop requires removing phone numbers, emails, handles, or links before submitting.");
      return;
    }

    const baseCost = activeJob.credits_to_apply || Math.max(1, Math.floor((activeJob.pay || 1000) / 1000));
    const totalCost = baseCost + boostCredits;
    const currentWallet = getCreditsWallet(fid);

    // Requirement 1: Block application if balance is insufficient
    if (currentWallet.balance < totalCost) {
      setApplyError(`Insufficient Hops. This application requires ${totalCost} Hops, but you only have ${currentWallet.balance} Hops.`);
      setCreditsModalOpen(true);
      return;
    }

    setApplying(true); setApplyError(null);
    const calculatedDist = calculateDistance(applicantArea, activeJob.area || "Bengaluru");
    try {
      const data = await apiPost(`/jobs/${activeJob.id}/apply`, {
        freelancer_id: fid,
        note: applyNote,
        applicant_area: applicantArea,
        distance_km: calculatedDist,
        boost_credits: boostCredits,
        proposed_rate_type: proposedRateType,
        proposed_quote: proposedQuote,
        pdf_attachment: pdfAttachment,
        portfolio_items: portfolioHighlights.filter((p) => p.visible),
      });
      setAppliedJustNow(activeJob.id);
      if (data.conversation_id) { setConvByJob((m) => ({ ...m, [activeJob.id]: data.conversation_id })); setLastConvId(data.conversation_id); }
      setWallet(getCreditsWallet(fid));
      load();
    } catch (e) {
      if (e?.status === 402 || e?.code === "INSUFFICIENT_CREDITS") {
        setApplyError(e?.message || "Insufficient Hops — top up or subscribe to apply.");
        setCreditsModalOpen(true);
        return;
      }
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

  const gigCardsGrid = useMemo(() => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
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
      );
    }
    return (
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
            onOpenLeaderboard={() => setLeaderboardJob(job)}
            onMessage={() => {
              const cid = convByJob[job.id];
              cid ? nav(`/chat/${cid}?role=freelancer`) : nav("/freelancer/chats");
            }}
            onVerifyPress={gotoVerify}
          />
        ))}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, filtered, isVerified, appliedSet, savedJobIds, convByJob, viewTab, term, search, nav]);

  return (
    <Shell>
      <TopBar
        title="JOBS &amp; LOCAL GIGS"
        sub={loading ? "Loading…" : `${filtered.length} active gigs · 5km hyperlocal radius`}
        onBack={() => nav("/")}
        backTestID="jobs-back-btn"
        right={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => nav("/employer")}
                className="hidden sm:flex items-center gap-1 border-2 border-ink bg-white px-2 py-1 text-[10px] font-black text-ink hover:bg-sand transition"
                title="Switch to Employer (Explore Pros)"
              >
                <Users size={12} className="text-brand" /> PROS VIEW
              </button>
            )}
            {isAdmin && (
              <IconBtn testID="jobs-admin-btn" onClick={() => nav("/admin")} title="Admin Dashboard">
                <Shield size={18} className="text-brand" />
              </IconBtn>
            )}
            <IconBtn testID="jobs-categories-btn" onClick={() => nav("/categories")} title="Categories"><Grid3x3 size={17} /></IconBtn>
            <IconBtn testID="jobs-map-btn" onClick={() => setShowMap(!showMap)} title={showMap ? "Hide Map" : "Show Map"}><MapIcon size={18} className={showMap ? "text-brand" : ""} /></IconBtn>
            <IconBtn testID="jobs-chats-btn" onClick={() => nav("/freelancer/chats")} title="My Chats"><MessagesSquare size={18} className="text-brand" /></IconBtn>
            <span data-testid="verify-status-badge" className={`hidden xs:flex items-center gap-1 border-2 border-ink px-2.5 py-1.5 text-[10px] font-black tracking-wide text-white ${isVerified ? "bg-ok" : "bg-ink"}`}>
              {isVerified ? <ShieldCheck size={14} /> : <ShieldHalf size={14} />}{isAdmin ? "ADMIN VERIFIED" : (isVerified ? "VERIFIED PRO" : "UNVERIFIED")}
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

          {catFilter !== "ALL" && (
            <div className="flex items-center gap-1.5 border-2 border-ink bg-[#FFF3C4] px-2.5 py-1 text-xs font-black text-ink shadow-[1.5px_1.5px_0px_#121212]">
              <span>Category: {activeFilter?.label || catFilter}</span>
              <button
                type="button"
                data-testid="clear-active-cat-btn"
                onClick={() => setCatFilter("ALL")}
                className="flex h-4 w-4 items-center justify-center border border-ink bg-white hover:bg-sand transition"
                title="Clear category filter"
              >
                <X size={10} />
              </button>
            </div>
          )}

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
      <div
        className={`border-b-2 border-ink bg-sand ${filtersOpen ? "block" : "hidden"}`}
        data-testid="jobs-filters-panel"
      >
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 sm:px-8">
            {/* Category Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-black tracking-wider text-inkmuted uppercase">GIG CATEGORY</p>
                {catFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setCatFilter("ALL")}
                    className="text-[10px] font-black text-brand underline"
                  >
                    Reset Category
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {JOB_CATEGORY_FILTERS.map((cat) => {
                  const isSelected = catFilter === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      data-testid={`filter-cat-${cat.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      onClick={() => setCatFilter(cat.key)}
                      className={`border-2 border-ink px-3 py-1.5 text-[11px] font-black transition ${
                        isSelected
                          ? "bg-ink text-white dark:bg-white dark:text-black shadow-[1.5px_1.5px_0px_#121212]"
                          : "bg-white text-ink hover:bg-sand"
                      }`}
                    >
                      {cat.key === "ALL" ? "ALL CATEGORIES" : cat.label}
                    </button>
                  );
                })}
              </div>
              {catFilter !== "ALL" && activeFilter && activeFilter.cats.length > 1 && (
                <div className="mt-2 pt-2 border-t border-dashed border-ink/20">
                  <p className="mb-1 text-[10px] font-bold text-inkmuted uppercase tracking-wider">
                    SPECIALIZED SUB-DISCIPLINES (TAP TO FILTER):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {activeFilter.cats.filter((c) => c !== catFilter && c !== activeFilter.key).map((sub) => {
                      const isSubActive = search.toLowerCase() === sub.toLowerCase();
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSearch(isSubActive ? "" : sub)}
                          className={`border border-ink/40 px-2 py-0.5 text-[10px] font-bold transition ${
                            isSubActive
                              ? "bg-brand text-white border-ink shadow-[1px_1px_0px_#121212]"
                              : "bg-sand/60 text-ink dark:bg-[#202020] dark:text-stone-300 hover:bg-sand"
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-ink/20 pt-3">
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
                onClick={() => {
                  setFilters({ budget: null, dist: null, minRating: null, verifiedOnly: false });
                  setCatFilter("ALL");
                }}
                className="text-xs font-black text-brand underline"
              >
                RESET ALL FILTERS
              </button>
            </div>
          </div>
        </div>

      {/* Unverified Banner */}
      {!isVerified && (
        <div className="border-b-2 border-ink bg-[#121212] dark:bg-[#161618]" data-testid="unverified-banner">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 p-4 sm:px-8">
            <span className="flex h-10 w-10 items-center justify-center border-2 border-white bg-brand text-white">
              <Lock size={18} />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-black !text-white text-white" style={{ color: "#FFFFFF" }}>
                {user ? "Browse freely — verify once to apply to all gigs" : "Browse freely — sign in to apply"}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 !text-white text-white font-medium" style={{ color: "#FFFFFF" }}>
                Profile &amp; email verification unlocks direct chat and instant hiring.
              </p>
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
        {gigCardsGrid}
      </div>

      {/* Comprehensive Upwork-Style Proposal Modal */}
      {applyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setApplyOpen(false)}>
          <div
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto border-4 border-ink bg-white dark:bg-[#121212] p-4 sm:p-6 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#E65A1E]"
            onClick={(e) => e.stopPropagation()}
            data-testid="apply-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-brand text-white shadow-[1px_1px_0px_#121212]">
                  <Send size={14} />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand">SUBMIT GIG PROPOSAL</span>
                  <p className="text-[11px] font-bold text-inkmuted">Hyperlocal Direct Bid &amp; Instant Hire</p>
                </div>
              </div>
              <button onClick={() => setApplyOpen(false)} className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white text-ink hover:bg-sand transition">
                <X size={16} />
              </button>
            </div>

            {/* Job Summary Banner & Full Description */}
            <div className="mt-3 border-2 border-ink bg-sand p-3.5 shadow-[2px_2px_0px_#121212]" data-testid="apply-modal-job-summary">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-ink/20 pb-2 mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand">
                  {activeJob?.category || "GIG OPPORTUNITY"} {activeJob?.company_name ? `· ${activeJob.company_name}` : ""}
                </span>
                {activeJob?.employer_name && (
                  <span className="text-[10px] font-bold text-ink">
                    Posted by: <span className="font-black">{activeJob.employer_name}</span>
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-ink leading-snug">{activeJob?.title}</h3>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="border border-ink bg-white px-2 py-0.5 text-xs font-black text-ink shadow-[1px_1px_0px_#121212]">
                  {activeJob?.price_type === "hourly" ? `₹${activeJob?.pay_label}/hr HOURLY` : `₹${activeJob?.pay_label} FIXED`}
                </span>
                <span className="border border-ink bg-white px-2 py-0.5 text-xs font-bold text-ink flex items-center gap-1 shadow-[1px_1px_0px_#121212]">
                  <MapPin size={11} className="text-brand" /> Job Area: {activeJob?.area || "Bengaluru"}
                </span>
                <span className="border border-ink bg-white px-2 py-0.5 text-xs font-bold text-ink flex items-center gap-1 shadow-[1px_1px_0px_#121212]">
                  <Coins size={11} className="text-brand" /> Base Apply: {activeJob?.credits_to_apply || Math.max(1, Math.floor((activeJob?.pay || 1000) / 1000))} Hops
                </span>
              </div>

              {/* Full Job Description Box */}
              {activeJob?.description && (
                <div className="mt-3 border-t-2 border-ink/20 pt-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-ink block mb-1.5 flex items-center gap-1">
                    <FileText size={12} className="text-brand" /> FULL JOB DESCRIPTION &amp; SCOPE:
                  </span>
                  <div className="border-2 border-ink bg-white p-3 shadow-[2px_2px_0px_#121212]">
                    <p className="text-xs sm:text-sm font-semibold text-ink leading-relaxed whitespace-pre-line" data-testid="apply-modal-job-description">
                      {activeJob.description}
                    </p>
                    {activeJob?.keywords && activeJob.keywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ink/15 pt-2">
                        <span className="text-[9px] font-black uppercase text-ink mr-1">Required Skills:</span>
                        {activeJob.keywords.map((kw, i) => (
                          <span key={i} className="border border-ink bg-sand px-1.5 py-0.5 text-[10px] font-bold text-ink shadow-[0.5px_0.5px_0px_#121212]">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ═══════ 1. TERMS & RATE QUOTING (Upwork Terms Screen) ═══════ */}
            <div className="mt-4 border-2 border-ink bg-white p-3.5 shadow-[2px_2px_0px_#121212]" data-testid="proposal-terms-section">
              <div className="flex items-center justify-between border-b border-ink/20 pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-brand tracking-wider">TERMS &amp; RATE QUOTE</span>
                  <h4 className="text-xs font-black text-ink">What is the rate you'd like to bid for this job?</h4>
                </div>
                {/* Fixed vs Hourly toggle */}
                <div className="flex border border-ink bg-sand p-0.5 text-[10px] font-black">
                  <button
                    type="button"
                    data-testid="rate-type-fixed"
                    onClick={() => setProposedRateType("fixed")}
                    className={`px-2 py-0.5 transition ${proposedRateType === "fixed" ? "bg-ink text-white" : "text-ink hover:bg-white"}`}
                  >
                    Fixed Price
                  </button>
                  <button
                    type="button"
                    data-testid="rate-type-hourly"
                    onClick={() => setProposedRateType("hourly")}
                    className={`px-2 py-0.5 transition ${proposedRateType === "hourly" ? "bg-ink text-white" : "text-ink hover:bg-white"}`}
                  >
                    Hourly Rate
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-ink">
                      {proposedRateType === "fixed" ? "Your Project Quote" : "Your Hourly Rate"}
                    </label>
                    <p className="text-[10px] text-inkmuted">Total amount client will see on your proposal</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-black text-ink">₹</span>
                      <input
                        type="number"
                        data-testid="proposed-quote-input"
                        value={proposedQuote}
                        onChange={(e) => setProposedQuote(Math.max(0, Number(e.target.value)))}
                        className="wh-input h-9 w-32 border-2 border-ink bg-white pl-6 pr-2 text-xs font-black text-ink outline-none"
                      />
                    </div>
                    <span className="text-xs font-bold text-inkmuted">{proposedRateType === "fixed" ? "total" : "/hr"}</span>
                    <button
                      type="button"
                      data-testid="match-employer-rate-btn"
                      onClick={() => setProposedQuote(activeJob?.pay || 1000)}
                      className="border border-ink bg-sand px-2 py-2 text-[9px] font-black uppercase text-ink hover:bg-brand hover:text-white transition"
                      title="Match employer's budget"
                    >
                      Match Employer
                    </button>
                  </div>
                </div>

                {/* Platform fee breakdown */}
                <div className="flex items-center justify-between border-t border-dashed border-ink/20 pt-2 text-xs">
                  <div>
                    <span className="font-bold text-ink">Freelancer Platform Fee: 0%</span>
                    <span className="ml-1.5 rounded bg-[#E5F8EE] px-1.5 py-0.5 text-[9px] font-black text-[#00875A]">WORKHOP 0% ADVANTAGE</span>
                  </div>
                  <span className="font-bold text-inkmuted">-₹0.00</span>
                </div>

                <div className="flex items-center justify-between border-t border-ink/20 pt-2 text-xs font-black">
                  <span className="text-ink">You'll receive (100% of quote)</span>
                  <span className="text-sm font-black text-[#00A86B]" data-testid="you-receive-amount">
                    ₹{Number(proposedQuote || 0).toLocaleString("en-IN")}{proposedRateType === "hourly" ? " /hr" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* ═══════ 2. APPLICANT AREA & HYPERLOCAL DISTANCE ═══════ */}
            <div className="mt-3 border-2 border-ink bg-sand p-3">
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
                className="wh-input mt-1.5 h-9 w-full border-2 border-ink bg-white px-3 text-xs font-bold text-ink outline-none"
              />

              <div className="mt-1.5 flex flex-wrap gap-1">
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

              {activeJob && (
                <div className="mt-2 flex items-center justify-between border-t border-ink/20 pt-1.5 text-xs font-black">
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

            {/* ═══════ 3. COVER LETTER & PDF ATTACHMENT WITH CONTACT SCANNER ═══════ */}
            <div className="mt-3 border-2 border-ink bg-white p-3.5 shadow-[2px_2px_0px_#121212]" data-testid="cover-letter-section">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand flex items-center gap-1">
                  <FileText size={12} /> COVER LETTER &amp; WORK ATTACHMENTS
                </span>
                <span className="text-[10px] font-bold text-inkmuted">{applyNote.length}/500</span>
              </div>
              <p className="mt-0.5 text-[10px] text-inkmuted">
                Introduce yourself and highlight relevant experience. Direct contact details (phone, email, links, handles) are automatically scanned and prohibited before contract formation.
              </p>

              <textarea
                data-testid="apply-note-input"
                value={applyNote}
                onChange={handleNoteChange}
                placeholder="Hi! I have extensive experience in this area and can deliver clean, high-performance work for this gig..."
                maxLength={500}
                className="wh-input mt-2 min-h-[75px] w-full border-2 border-ink bg-white p-2.5 text-xs text-ink font-semibold outline-none"
              />

              {/* PDF Attachment Upload Row */}
              <div className="mt-2.5">
                <span className="text-[10px] font-black uppercase text-ink tracking-wider">PDF ATTACHMENT (PROPOSAL / RESUME / PORTFOLIO)</span>
                
                {pdfAttachment ? (
                  <div className="mt-1.5 flex items-center justify-between border-2 border-ink bg-sand p-2.5 shadow-[1px_1px_0px_#121212]" data-testid="pdf-attached-preview">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 items-center justify-center border border-ink bg-brand text-white shrink-0">
                        <FileText size={14} />
                      </span>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-black text-ink truncate">{pdfAttachment.fileName}</p>
                        <p className="text-[9px] font-bold text-inkmuted">{pdfAttachment.fileSize} · Scanned for compliance</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      data-testid="remove-pdf-btn"
                      className="flex items-center gap-1 border border-ink bg-white px-2 py-1 text-[10px] font-black text-danger hover:bg-danger hover:text-white transition shrink-0"
                    >
                      <Trash2 size={12} /> REMOVE
                    </button>
                  </div>
                ) : (
                  <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-ink bg-sand/60 p-3 hover:bg-sand transition">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      data-testid="pdf-upload-input"
                    />
                    {pdfScanning ? (
                      <div className="flex items-center gap-2 text-xs font-black text-ink">
                        <Loader2 size={14} className="animate-spin text-brand" />
                        <span>Scanning PDF for compliance...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-black text-ink">
                        <UploadCloud size={16} className="text-brand" />
                        <span>Upload Proposal / CV (.PDF) — Auto-scanned for privacy</span>
                      </div>
                    )}
                  </label>
                )}
              </div>

              {/* Contact Violations Alert Banner */}
              {(textViolations.length > 0 || pdfViolations.length > 0) && (
                <div className="mt-3 border-2 border-danger bg-[#FFEBEE] p-3 text-xs text-[#C62828] shadow-[2px_2px_0px_#E63946]" data-testid="contact-violations-alert">
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <AlertTriangle size={15} />
                    <span>Prohibited Contact Details Detected ({textViolations.length + pdfViolations.length})</span>
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-ink">
                    WorkHop prohibits sharing direct phone numbers, email addresses, handles, or off-platform URLs before hire to ensure payment protection and verified contracts.
                  </p>
                  <ul className="mt-2 space-y-1 bg-white/80 p-2 border border-danger/40 text-[10px] font-mono">
                    {[...textViolations, ...pdfViolations].map((v, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="font-bold uppercase text-[#C62828]">[{v.type}]</span> {v.match}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {textViolations.length > 0 && (
                      <button
                        type="button"
                        data-testid="auto-redact-btn"
                        onClick={handleAutoRedactNote}
                        className="flex items-center gap-1 border border-ink bg-danger px-2.5 py-1 text-[10px] font-black text-white hover:bg-black transition shadow-[1px_1px_0px_#121212]"
                      >
                        <span>🧹 Auto-Redact Contact Details</span>
                      </button>
                    )}
                    {pdfViolations.length > 0 && (
                      <button
                        type="button"
                        data-testid="remove-violating-pdf-btn"
                        onClick={handleRemovePdf}
                        className="flex items-center gap-1 border border-ink bg-white px-2 py-1 text-[10px] font-bold text-ink hover:bg-sand transition"
                      >
                        <Trash2 size={11} /> Remove Flagged PDF
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Clean Status Check */}
              {textViolations.length === 0 && pdfViolations.length === 0 && (applyNote.trim() || pdfAttachment) && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-[#00A86B]" data-testid="scan-clean-badge">
                  <CheckCircle2 size={13} />
                  <span>Verified Safe: No off-platform contact details detected.</span>
                </div>
              )}
            </div>

            {/* ═══════ 4. PORTFOLIO HIGHLIGHTS (CURATE & HIDE) ═══════ */}
            <div className="mt-3 border-2 border-ink bg-sand p-3 shadow-[2px_2px_0px_#121212]" data-testid="portfolio-highlights-section">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-ink tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-brand" />
                  ATTACH PORTFOLIO HIGHLIGHTS (CURATE &amp; HIDE)
                </span>
                <span className="text-[10px] font-bold text-inkmuted">
                  {portfolioHighlights.filter((p) => p.visible).length} included
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-inkmuted">
                Choose which highlights to attach. You can hide specific projects if you want only relevant samples shown for this gig.
              </p>

              <div className="mt-2 space-y-1.5">
                {portfolioHighlights.map((ph, idx) => (
                  <div
                    key={ph.id || idx}
                    className={`flex items-center justify-between border-2 border-ink p-2 transition ${
                      ph.visible ? "bg-white shadow-[1px_1px_0px_#121212]" : "bg-white/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`flex h-6 w-6 items-center justify-center border border-ink text-[10px] font-black shrink-0 ${ph.visible ? "bg-brand text-white" : "bg-sand text-inkmuted"}`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-black text-ink truncate">{ph.title}</p>
                        <p className="text-[9px] font-semibold text-inkmuted">{ph.tag}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`toggle-highlight-${idx}`}
                      onClick={() => {
                        setPortfolioHighlights((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, visible: !item.visible } : item))
                        );
                      }}
                      className={`flex items-center gap-1 border border-ink px-2 py-1 text-[9px] font-black transition shrink-0 ${
                        ph.visible
                          ? "bg-[#E5F8EE] text-[#00875A] hover:bg-[#D4F4E4]"
                          : "bg-sand text-inkmuted hover:bg-white"
                      }`}
                    >
                      {ph.visible ? (
                        <>
                          <Eye size={11} /> ATTACHED
                        </>
                      ) : (
                        <>
                          <EyeOff size={11} /> HIDDEN
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Highlight Inline */}
              <div className="mt-2">
                {showAddHighlight ? (
                  <div className="border border-ink bg-white p-2">
                    <p className="text-[10px] font-black uppercase text-ink">Add Work Sample Highlight</p>
                    <div className="mt-1 flex flex-col sm:flex-row gap-1.5">
                      <input
                        placeholder="Project title (e.g. Fintech Mobile App)"
                        value={newHighlightTitle}
                        onChange={(e) => setNewHighlightTitle(e.target.value)}
                        className="wh-input h-7 flex-1 border border-ink px-2 text-xs font-semibold text-ink outline-none"
                      />
                      <input
                        placeholder="Tag (e.g. React / Figma)"
                        value={newHighlightTag}
                        onChange={(e) => setNewHighlightTag(e.target.value)}
                        className="wh-input h-7 w-full sm:w-28 border border-ink px-2 text-xs font-semibold text-ink outline-none"
                      />
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddHighlight}
                        className="border border-ink bg-brand px-2 py-1 text-[10px] font-black text-white hover:bg-black transition"
                      >
                        Add Highlight
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddHighlight(false)}
                        className="border border-ink bg-sand px-2 py-1 text-[10px] font-bold text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddHighlight(true)}
                    className="flex items-center gap-1 text-[10px] font-black text-brand hover:underline"
                  >
                    <Plus size={11} /> Add custom work highlight
                  </button>
                )}
              </div>
            </div>

            {/* ═══════ 5. UPWORK-STYLE PROPOSAL BOOSTING (LIVE BIDDING) ═══════ */}
            {activeJob && (
              <div className="mt-3 border-2 border-ink bg-[#FFF9E6] p-3 shadow-[2px_2px_0px_#121212]" data-testid="proposal-boost-section">
                <div className="flex items-center justify-between border-b border-ink/20 pb-2">
                  <div>
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-brand tracking-wider">
                      <Rocket size={13} />
                      BOOST YOUR PROPOSAL (OPTIONAL)
                    </span>
                    <p className="text-[10px] text-inkmuted">Place a bid to move your proposal to the top of the client's list.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeaderboardJob(activeJob)}
                    className="text-[10px] font-black text-brand underline hover:text-brand/80"
                  >
                    Full Standings →
                  </button>
                </div>

                {/* Mini competitor bids table */}
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                  {[
                    { rank: "1st Place", bid: Math.max(10, modalLeaderboard?.topBid || 10), medal: "🥇" },
                    { rank: "2nd Place", bid: Math.max(6, Math.floor((modalLeaderboard?.topBid || 10) * 0.7)), medal: "🥈" },
                    { rank: "3rd Place", bid: Math.max(4, Math.floor((modalLeaderboard?.topBid || 10) * 0.4)), medal: "🥉" },
                    { rank: "4th Place", bid: 2, medal: "🎖️" },
                  ].map((slot, i) => (
                    <div key={i} className="border border-ink bg-white p-1.5">
                      <span className="text-[9px] font-black text-inkmuted">{slot.medal} {slot.rank}</span>
                      <p className="text-xs font-black text-ink">{slot.bid} Hops</p>
                    </div>
                  ))}
                </div>

                {/* Recommendation banner */}
                <div className="mt-2.5 flex items-center justify-between border border-ink bg-white p-2 text-xs">
                  <span className="flex items-center gap-1 font-bold text-ink text-[11px]">
                    <Flame size={13} className="text-brand" />
                    Bid {Math.max(1, (modalLeaderboard?.topBid || 10) + 1)} Hops or higher to take 1st place!
                  </span>
                  <button
                    type="button"
                    onClick={() => setBoostCredits(Math.max(1, (modalLeaderboard?.topBid || 10) + 1))}
                    className="border border-ink bg-brand px-2 py-0.5 text-[9px] font-black text-white hover:bg-black transition"
                  >
                    BID FOR #1
                  </button>
                </div>

                {/* Stepper counter */}
                <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-black text-ink">Your Boost Bid:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBoostCredits((b) => Math.max(0, b - 1))}
                      className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white font-black text-ink hover:bg-sand transition"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={boostCredits}
                      onChange={(e) => setBoostCredits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="wh-input h-8 w-16 border-2 border-ink bg-white text-center text-xs font-black text-ink outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setBoostCredits((b) => b + 1)}
                      className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white font-black text-ink hover:bg-sand transition"
                    >
                      <Plus size={14} />
                    </button>
                    <div className="ml-1 flex gap-1 flex-wrap">
                      {[0, 2, 5, 8, 12].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          data-testid={`boost-option-${pts}`}
                          onClick={() => setBoostCredits(pts)}
                          className={`border border-ink px-2 py-1 text-[10px] font-black transition ${
                            boostCredits === pts ? "bg-brand text-white" : "bg-white text-ink hover:bg-sand"
                          }`}
                        >
                          {pts === 0 ? "Standard" : `+${pts}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ 6. HOPS COST & WALLET BALANCE SUMMARY ═══════ */}
            {activeJob && (
              <div className="mt-3 flex items-center justify-between border-2 border-ink bg-sand p-3 shadow-[2px_2px_0px_#121212]">
                <div>
                  <span className="text-[10px] font-black uppercase text-inkmuted tracking-wider">TOTAL REQUIRED</span>
                  <p className="text-sm font-black text-ink flex items-center gap-1">
                    <Coins size={15} className="text-brand" />
                    {(activeJob.credits_to_apply || Math.max(1, Math.floor((activeJob.pay || 1000) / 1000))) + boostCredits} Hops
                    <span className="text-[10px] font-semibold text-inkmuted">
                      ({activeJob.credits_to_apply || Math.max(1, Math.floor((activeJob.pay || 1000) / 1000))} base + {boostCredits} boost)
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-inkmuted tracking-wider">YOUR BALANCE</span>
                  <p className="text-sm font-black text-ink" data-testid="apply-current-balance">
                    {wallet.balance} Hops
                  </p>
                </div>
              </div>
            )}

            {applyError && (
              <p data-testid="apply-error" className="mt-2 text-xs font-bold text-danger">
                {applyError}
              </p>
            )}

            {/* Insufficient Hops Banner & CTA */}
            {activeJob && wallet.balance < ((activeJob.credits_to_apply || Math.max(1, Math.floor((activeJob.pay || 1000) / 1000))) + boostCredits) && (
              <div className="mt-3 border-2 border-ink bg-[#FFEBEE] p-3 text-xs font-black text-[#C62828] shadow-[2px_2px_0px_#C62828]">
                <p className="flex items-center gap-1.5">
                  <Lock size={14} />
                  Insufficient Hops ({wallet.balance} available, {(activeJob.credits_to_apply || 1) + boostCredits} required).
                </p>
                <button
                  type="button"
                  data-testid="insufficient-credits-cta"
                  onClick={() => setCreditsModalOpen(true)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 border-2 border-ink bg-brand py-2.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212] transition hover:bg-black"
                >
                  <Coins size={14} /> TOP UP HOPS OR SUBSCRIBE →
                </button>
              </div>
            )}

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
              activeJob && wallet.balance >= ((activeJob.credits_to_apply || Math.max(1, Math.floor((activeJob.pay || 1000) / 1000))) + boostCredits) && (
                <button
                  data-testid="apply-confirm-btn"
                  disabled={applying || textViolations.length > 0 || pdfViolations.length > 0}
                  onClick={submitApply}
                  className={`mt-4 flex w-full items-center justify-center gap-2 border-2 border-ink py-3.5 text-sm font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60 ${
                    textViolations.length > 0 || pdfViolations.length > 0 ? "bg-danger cursor-not-allowed" : "bg-brand hover:bg-brand/95"
                  }`}
                >
                  {applying ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : textViolations.length > 0 || pdfViolations.length > 0 ? (
                    <>
                      <AlertTriangle size={16} />
                      <span>RESOLVE CONTACT DETAILS TO SUBMIT</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>APPLY</span>
                    </>
                  )}
                </button>
              )
            )}
            <p className="mt-2 text-center text-[11px] text-inkmuted">Employer sees your verified credentials immediately. 0% platform fee on earnings.</p>
          </div>
        </div>
      )}

      {/* Credits Top-Up / Subscription Modal */}
      <CreditsTopUpModal
        open={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        requiredCredits={activeJob ? (activeJob.credits_to_apply || 1) + boostCredits : null}
        onUpdated={(w) => {
          setWallet(w);
          setApplyError(null);
        }}
      />

      {/* Applicant Leaderboard Modal */}
      <ApplicantLeaderboardModal
        open={Boolean(leaderboardJob)}
        onClose={() => setLeaderboardJob(null)}
        job={leaderboardJob}
        onOpenApply={(j) => openApplyFor(j)}
      />

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
const FiverrGigCard = memo(function FiverrGigCard({ job, index, verified, applied, isSaved, onToggleSave, onApply, onMessage, onVerifyPress, onOpenLeaderboard }) {
  const [descExpanded, setDescExpanded] = useState(false);
  const creditsCost = job.credits_to_apply || Math.max(1, Math.floor((job.pay || 1000) / 1000));
  return (
    <div
      data-testid={`job-card-${index}`}
      className="group flex flex-col justify-between border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#121212]"
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Urgent / Boosted Badge */}
            {job.is_boosted && (
              <span
                data-testid={`urgent-badge-${index}`}
                className="border border-ink bg-[#FF3B30] px-2 py-0.5 text-[9px] font-black text-white uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0px_#121212] animate-pulse"
              >
                <Flame size={10} fill="currentColor" /> URGENT
              </span>
            )}
            <span className="border border-ink bg-brand px-2 py-0.5 text-[10px] font-black text-white uppercase">
              {job.category || "Gig"}
            </span>
            <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-0.5 text-[10px] font-bold text-ink">
              <MapPin size={10} className="text-brand" /> {job.distance_km ?? 0.5} km away
            </span>
            {/* Credit Cost Badge */}
            <span
              data-testid={`credit-cost-badge-${index}`}
              className="border border-ink bg-[#FFF3C4] px-2 py-0.5 text-[10px] font-black text-ink flex items-center gap-1 shadow-[1px_1px_0px_#121212]"
            >
              <Coins size={10} className="text-brand" /> {creditsCost} {creditsCost === 1 ? "HOP" : "HOPS"}
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

        {/* Description Snippet & Full Toggle */}
        <div className="mt-2">
          <p className={`text-xs leading-5 text-inkmuted ${descExpanded ? "whitespace-pre-line text-ink font-medium" : "line-clamp-2"}`}>
            {job.description}
          </p>
          {job.description && job.description.length > 70 && (
            <button
              type="button"
              data-testid={`expand-desc-btn-${index}`}
              onClick={(e) => {
                e.stopPropagation();
                setDescExpanded(!descExpanded);
              }}
              className="mt-1 text-[10px] font-black text-brand hover:underline block"
            >
              {descExpanded ? "Show less ↑" : "Read full description ↓"}
            </button>
          )}
        </div>

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

          {/* Proposal Leaderboard Trigger */}
          <button
            type="button"
            data-testid={`view-leaderboard-btn-${index}`}
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1 border border-ink bg-sand hover:bg-white px-2 py-1 text-[9px] font-black uppercase text-ink shadow-[1px_1px_0px_#121212] transition"
            title="View proposal bidding leaderboard"
          >
            <Trophy size={11} className="text-brand" />
            <span>Leaderboard</span>
          </button>
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
              <span>APPLY</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
