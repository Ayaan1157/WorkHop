import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Briefcase, Users, PlusCircle, MailOpen, MapPin, Sparkles, Building2,
  Phone, Mail, CheckCircle2, ChevronRight, Coins, Trophy, Zap, Clock,
  ArrowUpRight, Pencil, X, Search, ShieldCheck, Star, Trash2, Check,
  ExternalLink, Eye, ArrowRightLeft, Globe, Flame
} from "lucide-react";
import { Shell, TopBar, Spinner, EmptyBlock } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, getEmployerId } from "@/lib/api";
import {
  getStoredJobs, postCustomJob, getStoredChats, getSavedProIds,
  getStoredLeads, getCreditsConfig, ADMIN_EMAILS
} from "@/lib/clientStore";
import { getDistanceSuitability } from "@/lib/locationAreas";
import ApplicantLeaderboardModal from "@/components/ApplicantLeaderboardModal";

export default function EmployerDashboard() {
  const nav = useNavigate();
  const { user, login } = useAuth();
  const employerId = getEmployerId();

  const isAdmin = Boolean(
    user?.is_admin ||
    user?.role === "admin" ||
    (user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()))
  );

  // Profile States
  const [companyName, setCompanyName] = useState(() =>
    user?.company_name || localStorage.getItem("workhop_company_name") || "Hyperlocal Enterprises"
  );
  const [employerName, setEmployerName] = useState(() =>
    user?.name || (user?.email ? user.email.split("@")[0] : "Employer")
  );
  const [area, setArea] = useState(() =>
    user?.area || localStorage.getItem("workhop_user_area") || "Koramangala"
  );
  const [phone, setPhone] = useState(() =>
    user?.phone || localStorage.getItem("workhop_pro_phone") || "9876543210"
  );
  const [industry, setIndustry] = useState(() =>
    localStorage.getItem("workhop_employer_industry") || "Tech & Creative Services"
  );
  const [bio, setBio] = useState(() =>
    localStorage.getItem("workhop_employer_bio") || "Hiring top-tier local freelance talent across Bengaluru for design, development, and marketing gigs."
  );
  const [gstNumber, setGstNumber] = useState(() =>
    user?.gst_number || localStorage.getItem("workhop_employer_gst") || ""
  );

  // Modals & UI States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ companyName, employerName, area, phone, industry, bio, gstNumber });
  const [leaderboardJob, setLeaderboardJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [chats, setChats] = useState([]);
  const [savedPros, setSavedPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState({ remaining: 5, total: 5 });

  // Load Employer Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Jobs posted by employer
      let allJobs = [];
      try {
        const remoteJobs = await apiGet("/employer/jobs");
        allJobs = Array.isArray(remoteJobs) ? remoteJobs : [];
      } catch {
        allJobs = getStoredJobs();
      }
      // Prioritize employer's custom jobs or all recent jobs
      setJobs(allJobs);

      // 2. Applicant chats / proposals
      try {
        const chatsData = await apiGet("/chats");
        setChats(Array.isArray(chatsData) ? chatsData : getStoredChats());
      } catch {
        setChats(getStoredChats());
      }

      // 3. Post Credits (100% Free Unlimited Job Posts)
      if (isAdmin) {
        setCredits({ remaining: 9999, total: 9999, is_free: true });
      } else {
        try {
          const c = await apiGet(`/employer/${employerId}/post-credits`);
          if (c) setCredits({ ...c, is_free: true });
        } catch {
          setCredits({ remaining: 9999, total: 9999, is_free: true });
        }
      }

      // 4. Saved Pros
      const savedIds = getSavedProIds();
      const allPros = getStoredLeads();
      const matched = allPros.filter((p) => savedIds.includes(String(p.id)));
      setSavedPros(matched.length > 0 ? matched : allPros.slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, [employerId, isAdmin]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Save Employer Profile
  const handleSaveProfile = (e) => {
    e?.preventDefault();
    setCompanyName(editForm.companyName);
    setEmployerName(editForm.employerName);
    setArea(editForm.area);
    setPhone(editForm.phone);
    setIndustry(editForm.industry);
    setBio(editForm.bio);
    setGstNumber(editForm.gstNumber || "");

    localStorage.setItem("workhop_company_name", editForm.companyName);
    localStorage.setItem("workhop_user_area", editForm.area);
    localStorage.setItem("workhop_pro_phone", editForm.phone);
    localStorage.setItem("workhop_employer_industry", editForm.industry);
    localStorage.setItem("workhop_employer_bio", editForm.bio);
    localStorage.setItem("workhop_employer_gst", editForm.gstNumber ? editForm.gstNumber.trim().toUpperCase() : "");

    setEditModalOpen(false);
  };

  // Switch Role to Freelancer
  const handleSwitchToFreelancer = () => {
    localStorage.setItem("workhop_auth_role", "freelancer");
    nav("/freelancer/profile");
  };

  // Quick 1-click Urgent Boost for a job
  const handleBoostJob = async (jobId) => {
    try {
      await apiPost(`/employer/jobs/${jobId}/boost`, {});
      await loadDashboardData();
    } catch {
      // update locally in stored jobs
      const all = getStoredJobs().map((j) =>
        j.id === jobId ? { ...j, is_boosted: true, boost_expires_at: new Date(Date.now() + 48 * 3600000).toISOString() } : j
      );
      setJobs(all);
    }
  };

  const totalApplicants = chats.length;
  const activeJobsCount = jobs.filter((j) => !j.is_filled).length;

  return (
    <Shell>
      <TopBar
        title="EMPLOYER DASHBOARD & HIRING HUB"
        sub={`Active Company Account · ${area}, Bengaluru`}
        backTestID="employer-dashboard-back-btn"
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="switch-to-freelancer-btn"
              onClick={handleSwitchToFreelancer}
              className="hidden sm:flex items-center gap-1.5 border-2 border-ink bg-sand px-3 py-1.5 text-xs font-black uppercase text-ink hover:bg-white transition shadow-[1.5px_1.5px_0px_#121212]"
              title="Switch to Freelancer Profile"
            >
              <ArrowRightLeft size={13} className="text-brand" />
              <span>FREELANCER VIEW</span>
            </button>
            <button
              type="button"
              data-testid="employer-post-btn-header"
              onClick={() => nav("/employer/post-job")}
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:bg-brand/90 transition shadow-[1.5px_1.5px_0px_#121212] active:translate-y-0.5"
            >
              <PlusCircle size={14} />
              <span>POST A GIG</span>
            </button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8 pb-20">
        {/* ═══════════ 1. EMPLOYER PROFILE HERO CARD ═══════════ */}
        <div
          data-testid="employer-profile-hero"
          className="border-2 border-ink bg-white dark:bg-[#141414] p-5 sm:p-7 shadow-[4px_4px_0px_#121212] mb-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center border-2 border-ink bg-brand text-2xl sm:text-3xl font-black text-white shadow-[2px_2px_0px_#121212]">
                {(companyName || employerName || "E").slice(0, 1).toUpperCase()}
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-ink bg-[#00A86B] text-white" title="Verified Employer">
                  <Check size={12} strokeWidth={3} />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-ink dark:text-white uppercase tracking-tight">
                    {companyName}
                  </h1>
                  <span className="border border-ink bg-[#FFF3C4] px-2 py-0.5 text-[9px] font-black uppercase text-[#92400E] shadow-[1px_1px_0px_#121212] flex items-center gap-1">
                    <ShieldCheck size={12} className="text-brand" /> VERIFIED HIRER
                  </span>
                  {gstNumber ? (
                    <span
                      data-testid="employer-gst-badge"
                      className="border border-ink bg-white dark:bg-stone-800 px-2 py-0.5 text-[9px] font-black uppercase text-ink dark:text-stone-200 shadow-[1px_1px_0px_#121212] font-mono flex items-center gap-1"
                    >
                      <span className="text-brand font-black">GSTIN:</span> {gstNumber}
                    </span>
                  ) : (
                    <span className="border border-ink/40 bg-sand/60 dark:bg-stone-800/60 px-2 py-0.5 text-[9px] font-bold uppercase text-inkmuted dark:text-stone-400 shadow-[1px_1px_0px_#121212]">
                      GST: Optional
                    </span>
                  )}
                  {isAdmin && (
                    <span className="border border-ink bg-ok px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-[1px_1px_0px_#121212]">
                      ADMIN ACCESS
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-brand mt-0.5">
                  Managed by {employerName} · {industry}
                </p>

                <p className="text-xs text-inkmuted dark:text-stone-300 mt-2 max-w-xl line-clamp-2">
                  {bio}
                </p>

                <div className="mt-3 flex items-center gap-4 text-xs font-bold text-inkmuted dark:text-stone-400 flex-wrap">
                  <span className="flex items-center gap-1 text-ink dark:text-white">
                    <MapPin size={13} className="text-brand" /> {area}, Bengaluru
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-brand" /> {user?.email || "employer@workhop.local"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-brand" /> +91 {phone}
                  </span>
                  {gstNumber && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-ink dark:text-stone-200">
                        <span className="text-brand font-black">GST:</span> {gstNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Profile & Role Switch Actions */}
            <div className="flex flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
              <button
                type="button"
                data-testid="edit-employer-profile-btn"
                onClick={() => {
                  setEditForm({ companyName, employerName, area, phone, industry, bio, gstNumber });
                  setEditModalOpen(true);
                }}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 border-2 border-ink bg-white dark:bg-stone-800 px-4 py-2.5 text-xs font-black uppercase text-ink dark:text-white hover:bg-stone-100 transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
              >
                <Pencil size={13} /> EDIT COMPANY INFO
              </button>
              <button
                type="button"
                data-testid="switch-to-freelancer-mobile-btn"
                onClick={handleSwitchToFreelancer}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 border-2 border-ink bg-sand px-4 py-2.5 text-xs font-black uppercase text-ink hover:bg-sand/80 transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5 sm:hidden"
              >
                <ArrowRightLeft size={13} /> FREELANCER VIEW
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════ 2. KEY METRICS STATS RIBBON ═══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          <div className="border-2 border-ink bg-white dark:bg-[#141414] p-4 shadow-[3px_3px_0px_#121212]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">ACTIVE GIGS POSTED</span>
              <Briefcase size={16} className="text-brand" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink dark:text-white mt-2" data-testid="metric-active-gigs">
              {activeJobsCount}
            </p>
            <p className="text-[10px] font-bold text-inkmuted dark:text-stone-400 mt-0.5">Live on 5km neighborhood feed</p>
          </div>

          <div className="border-2 border-ink bg-white dark:bg-[#141414] p-4 shadow-[3px_3px_0px_#121212]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">TOTAL APPLICANTS</span>
              <Users size={16} className="text-ok" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink dark:text-white mt-2" data-testid="metric-total-applicants">
              {totalApplicants}
            </p>
            <p className="text-[10px] font-bold text-inkmuted dark:text-stone-400 mt-0.5">Verified candidate proposals</p>
          </div>

          <div className="border-2 border-ink bg-[#E5F8EE] p-4 shadow-[3px_3px_0px_#121212]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-ok">JOB POSTINGS</span>
              <Zap size={16} className="text-ok" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink dark:text-ink mt-2" data-testid="metric-post-credits">
              FREE <span className="text-xs font-bold text-ok">Unlimited</span>
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">Zero posting fees</span>
              <Link to="/employer/post-job" className="text-[10px] font-black uppercase text-brand underline">
                + POST A GIG
              </Link>
            </div>
          </div>

          <div className="border-2 border-ink bg-white dark:bg-[#141414] p-4 shadow-[3px_3px_0px_#121212]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">HIRED &amp; COMPLETED</span>
              <ShieldCheck size={16} className="text-brand" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink dark:text-white mt-2">
              2 <span className="text-xs font-bold text-inkmuted">Pros</span>
            </p>
            <p className="text-[10px] font-bold text-ok mt-0.5">100% Escrow Protected</p>
          </div>
        </div>

        {/* ═══════════ 3. QUICK ACTIONS GRID ═══════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          <button
            type="button"
            data-testid="quick-post-job"
            onClick={() => nav("/employer/post-job")}
            className="flex items-center justify-between border-2 border-ink bg-brand p-4 text-left shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-0.5"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white">Post a New Gig</p>
              <p className="text-[10px] text-white/80 font-bold mt-0.5">Publish scope, pay &amp; get bids</p>
            </div>
            <PlusCircle size={20} className="text-white" />
          </button>

          <button
            type="button"
            data-testid="quick-inbox"
            onClick={() => nav("/employer/inbox")}
            className="flex items-center justify-between border-2 border-ink bg-white dark:bg-[#141414] p-4 text-left shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-0.5"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-ink dark:text-white">Applicant Inbox</p>
              <p className="text-[10px] text-inkmuted dark:text-stone-400 font-bold mt-0.5">{chats.length} proposals received</p>
            </div>
            <MailOpen size={20} className="text-brand" />
          </button>

          <button
            type="button"
            data-testid="quick-browse-pros"
            onClick={() => nav("/employer")}
            className="flex items-center justify-between border-2 border-ink bg-white dark:bg-[#141414] p-4 text-left shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-0.5"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-ink dark:text-white">Find Nearby Pros</p>
              <p className="text-[10px] text-inkmuted dark:text-stone-400 font-bold mt-0.5">50+ verified pros in 5km</p>
            </div>
            <Search size={20} className="text-ok" />
          </button>

          <button
            type="button"
            data-testid="quick-plans"
            onClick={() => nav("/employer/plans")}
            className="flex items-center justify-between border-2 border-ink bg-white dark:bg-[#141414] p-4 text-left shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-0.5"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-ink dark:text-white">Plans &amp; Add-ons</p>
              <p className="text-[10px] text-inkmuted dark:text-stone-400 font-bold mt-0.5">Urgent boosts &amp; branding</p>
            </div>
            <Coins size={20} className="text-brand" />
          </button>
        </div>

        {/* ═══════════ 4. POSTED GIGS & APPLICANT MANAGEMENT ═══════════ */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 border-b-2 border-ink pb-2">
            <div>
              <h2 className="text-lg font-black uppercase text-ink dark:text-white tracking-tight">
                My Job Posts &amp; Open Gigs
              </h2>
              <p className="text-xs text-inkmuted dark:text-stone-400 font-semibold">
                Manage your published gigs, view candidate bids, and pin urgent jobs
              </p>
            </div>
            <button
              type="button"
              data-testid="employer-new-post-btn"
              onClick={() => nav("/employer/post-job")}
              className="flex items-center gap-1 border-2 border-ink bg-ink px-3 py-1.5 text-xs font-black text-white hover:bg-black transition shadow-[1.5px_1.5px_0px_#121212]"
            >
              <PlusCircle size={13} /> + NEW JOB
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : jobs.length === 0 ? (
            <div className="border-2 border-ink bg-white dark:bg-[#141414] p-8 text-center shadow-[4px_4px_0px_#121212]">
              <Briefcase size={36} className="mx-auto text-inkmuted mb-2 opacity-50" />
              <p className="text-sm font-black text-ink dark:text-white">You haven't posted any jobs yet</p>
              <p className="text-xs text-inkmuted dark:text-stone-400 mt-1 max-w-sm mx-auto">
                Post your first freelance requirement in 2 minutes. Verified talent in your 5km radius will submit proposals.
              </p>
              <button
                type="button"
                onClick={() => nav("/employer/post-job")}
                className="mt-4 inline-flex items-center gap-1.5 border-2 border-ink bg-brand px-5 py-2.5 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212]"
              >
                <PlusCircle size={14} /> POST YOUR FIRST GIG
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.slice(0, 6).map((j) => (
                <div
                  key={j.id}
                  data-testid={`employer-job-card-${j.id}`}
                  className="border-2 border-ink bg-white dark:bg-[#141414] p-4 sm:p-5 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="border border-ink bg-ink px-2 py-0.5 text-[9px] font-black uppercase text-white">
                          {j.bucket || j.category || "Creative"}
                        </span>
                        {j.is_boosted && (
                          <span className="border border-ink bg-[#FF3B30] px-2 py-0.5 text-[9px] font-black uppercase text-white flex items-center gap-1 shadow-[1.5px_1.5px_0px_#121212] animate-pulse">
                            <Flame size={10} fill="currentColor" /> URGENT
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-inkmuted dark:text-stone-400">
                          {j.area} · Posted {j.posted_minutes_ago || 10}m ago
                        </span>
                      </div>

                      <h3 className="text-base font-black text-ink dark:text-white mt-1.5">
                        {j.title}
                      </h3>

                      <div className="mt-2 flex items-center gap-3 text-xs font-bold text-inkmuted dark:text-stone-400 flex-wrap">
                        <span className="text-ink dark:text-white font-black text-sm">
                          ₹{Number(j.pay || 0).toLocaleString("en-IN")} Budget
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Coins size={12} className="text-brand" /> Requires {j.credits_to_apply || 5} Hops
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-bold text-ok">
                          <Users size={12} /> {j.applicants_count || 3} Applicants
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons for this Job */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setLeaderboardJob(j)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 border-2 border-ink bg-[#FFF3C4] px-3 py-2 text-xs font-black uppercase text-ink hover:bg-[#FFEAA0] transition shadow-[1.5px_1.5px_0px_#121212]"
                        title="View Applicant Leaderboard & Bids"
                      >
                        <Trophy size={13} className="text-amber-500" /> BIDS ({j.applicants_count || 3})
                      </button>

                      {!j.is_boosted && (
                        <button
                          type="button"
                          onClick={() => handleBoostJob(j.id)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border-2 border-ink bg-[#FFEBEA] hover:bg-[#FFD7D5] dark:bg-stone-800 px-3 py-2 text-xs font-black uppercase text-[#C62828] dark:text-red-400 transition shadow-[1.5px_1.5px_0px_#121212]"
                          title="Make this gig urgent & pin to top"
                        >
                          <Flame size={13} className="text-[#FF3B30] fill-[#FF3B30]" /> MAKE URGENT
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => nav(`/employer/inbox`)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 border-2 border-ink bg-ink px-3 py-2 text-xs font-black uppercase text-white hover:bg-black transition shadow-[1.5px_1.5px_0px_#121212]"
                      >
                        VIEW PROPOSALS <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════ 5. RECENT APPLICANTS FEED ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Box 1: Recent Applicants */}
          <div className="border-2 border-ink bg-white dark:bg-[#141414] p-5 shadow-[4px_4px_0px_#121212]">
            <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <h3 className="text-xs font-black uppercase text-ink dark:text-white">Recent Candidate Proposals</h3>
              </div>
              <Link to="/employer/inbox" className="text-[11px] font-black text-brand underline">
                View All ({chats.length})
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {chats.slice(0, 4).map((c, idx) => {
                const dist = c.distance_km ?? 1.2;
                const suit = getDistanceSuitability(dist);
                const isBoosted = (c.boost_credits || 0) > 0;

                return (
                  <div
                    key={c.id || idx}
                    onClick={() => nav(`/chat/${c.conversation_id || c.id}?role=employer`)}
                    className="cursor-pointer border border-ink/40 p-3 hover:bg-sand/40 dark:hover:bg-stone-800/60 transition flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink bg-brand font-black text-white text-sm">
                        {(c.freelancer_name || "P").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-ink dark:text-white truncate">{c.freelancer_name || "Verified Pro"}</p>
                          {isBoosted && (
                            <span className="border border-ink bg-amber-500 text-white px-1 py-0.2 text-[8px] font-black">
                              ★ +{c.boost_credits} Hops Bid
                            </span>
                          )}
                          <span className="text-[8px] font-black text-white px-1 py-0.2 border border-ink" style={{ backgroundColor: suit.color }}>
                            {suit.badge}
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-brand truncate">{c.job_title}</p>
                        <p className="text-[10px] text-inkmuted dark:text-stone-400 truncate">{c.last_message || "Application submitted"}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-inkmuted shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box 2: Saved / Bookmarked Pros */}
          <div className="border-2 border-ink bg-white dark:bg-[#141414] p-5 shadow-[4px_4px_0px_#121212]">
            <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <h3 className="text-xs font-black uppercase text-ink dark:text-white">Shortlisted Top Pros</h3>
              </div>
              <Link to="/employer" className="text-[11px] font-black text-brand underline">
                Browse More Pros
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {savedPros.map((pro) => (
                <div
                  key={pro.id}
                  onClick={() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                    nav(`/pro/${pro.id}`);
                  }}
                  className="cursor-pointer border border-ink/40 p-3 hover:bg-sand/40 dark:hover:bg-stone-800/60 transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink bg-ink text-white font-black text-sm">
                      {(pro.name || "P").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-ink dark:text-white truncate">{pro.name}</p>
                        <span className="text-[9px] font-black text-amber-500 flex items-center gap-0.5">
                          ⭐ {pro.rating || 4.9}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-brand truncate">{pro.skill}</p>
                      <p className="text-[10px] text-inkmuted dark:text-stone-400">₹{pro.rate_hr || 750}/hr · {pro.jobs_done || 12} jobs completed</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                      nav(`/pro/${pro.id}`);
                    }}
                    className="border border-ink bg-sand px-2 py-1 text-[10px] font-black uppercase text-ink hover:bg-white"
                  >
                    VIEW
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ EDIT COMPANY PROFILE MODAL ═══════════ */}
      {editModalOpen && (
        <div
          data-testid="employer-edit-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditModalOpen(false);
          }}
        >
          <div
            data-testid="employer-edit-modal"
            className="w-full max-w-lg border-2 border-ink bg-white dark:bg-[#141414] p-6 shadow-[6px_6px_0px_#121212] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-brand" />
                <h3 className="text-base font-black uppercase text-ink dark:text-white">Edit Company &amp; Hiring Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center border border-ink hover:bg-stone-200"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 block mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  placeholder="e.g. BrewBox Studio, Apex AI"
                  className="w-full border-2 border-ink bg-white dark:bg-stone-900 p-2.5 font-bold text-ink dark:text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 block mb-1">
                  Employer Contact Person
                </label>
                <input
                  type="text"
                  value={editForm.employerName}
                  onChange={(e) => setEditForm({ ...editForm, employerName: e.target.value })}
                  placeholder="e.g. Aayaan"
                  className="w-full border-2 border-ink bg-white dark:bg-stone-900 p-2.5 font-bold text-ink dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 block mb-1">
                    Neighborhood / Locality
                  </label>
                  <input
                    type="text"
                    value={editForm.area}
                    onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                    placeholder="e.g. Koramangala"
                    className="w-full border-2 border-ink bg-white dark:bg-stone-900 p-2.5 font-bold text-ink dark:text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 block mb-1">
                    Contact Phone (10 digits)
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, "") })}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="w-full border-2 border-ink bg-white dark:bg-stone-900 p-2.5 font-bold text-ink dark:text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 block mb-1">
                  Primary Hiring Industry
                </label>
                <input
                  type="text"
                  value={editForm.industry}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                  placeholder="e.g. Graphic Design & Video Production"
                  className="w-full border-2 border-ink bg-white dark:bg-stone-900 p-2.5 font-bold text-ink dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 block mb-1">
                  About the Employer / Hiring Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  placeholder="Tell candidates about your company and hiring requirements…"
                  className="w-full border-2 border-ink bg-white dark:bg-stone-900 p-2.5 font-bold text-ink dark:text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                    GSTIN / GST Number (Optional)
                  </label>
                  <span className="text-[9px] font-bold text-inkmuted dark:text-stone-500 uppercase">Optional for Tax Invoicing</span>
                </div>
                <input
                  type="text"
                  data-testid="employer-gst-input"
                  value={editForm.gstNumber || ""}
                  onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. 29AAAAA0000A1Z5 (Optional)"
                  maxLength={15}
                  className="w-full border-2 border-ink bg-white dark:bg-stone-900 p-2.5 font-mono font-bold text-ink dark:text-white outline-none tracking-wider placeholder:tracking-normal placeholder:font-sans uppercase text-xs"
                />
                <p className="text-[10px] text-inkmuted dark:text-stone-400 mt-1">
                  15-character GST identification number for claiming business tax credits on gig invoices.
                </p>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 border-t-2 border-ink/10 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="border-2 border-ink bg-white dark:bg-stone-800 px-4 py-2 text-xs font-black text-ink dark:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="border-2 border-ink bg-brand px-5 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212]"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {leaderboardJob && (
        <ApplicantLeaderboardModal
          isOpen={Boolean(leaderboardJob)}
          onClose={() => setLeaderboardJob(null)}
          jobId={leaderboardJob.id}
          jobTitle={leaderboardJob.title}
        />
      )}
    </Shell>
  );
}
