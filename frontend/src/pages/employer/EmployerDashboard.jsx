import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Briefcase, Users, PlusCircle, MapPin, Sparkles, Building2,
  Phone, Mail, CheckCircle2, ChevronRight, ChevronLeft, Coins, Trophy,
  Pencil, X, ShieldCheck, Star, Check, ArrowRightLeft,
  Flame, Plus, Menu, LayoutGrid, MessagesSquare,
  Map as MapIcon, Tag, LifeBuoy, FileText, LogOut
} from "lucide-react";
import { Shell } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, getEmployerId } from "@/lib/api";
import {
  getStoredJobs, getStoredChats, getSavedProIds,
  getStoredLeads, ADMIN_EMAILS, calculateHopsForJob
} from "@/lib/clientStore";
import { getDistanceSuitability } from "@/lib/locationAreas";
import ApplicantLeaderboardModal from "@/components/ApplicantLeaderboardModal";
import CompleteJobReviewModal from "@/components/CompleteJobReviewModal";
import EditModal from "@/components/EditModal";

const labelCls = "text-xs font-semibold text-inkmuted dark:text-[#888] mb-1.5 block";
const inputCls = "w-full bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#ddd] dark:border-[#333] rounded-lg px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-[#999] dark:placeholder:text-[#555] focus:outline-none focus:border-[#E65A1E] transition";

export default function EmployerDashboard() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
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
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState({ companyName, employerName, area, phone, industry, bio, gstNumber });
  const [leaderboardJob, setLeaderboardJob] = useState(null);
  const [reviewJob, setReviewJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [chats, setChats] = useState([]);
  const [savedPros, setSavedPros] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setJobs(allJobs);

      // 2. Applicant chats / proposals
      try {
        const chatsData = await apiGet("/chats");
        setChats(Array.isArray(chatsData) ? chatsData : getStoredChats());
      } catch {
        setChats(getStoredChats());
      }

      // 3. Saved Pros
      const savedIds = getSavedProIds();
      const allPros = getStoredLeads();
      const matched = allPros.filter((p) => savedIds.includes(String(p.id)));
      setSavedPros(matched.length > 0 ? matched : allPros.slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, []);

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
      const all = getStoredJobs().map((j) =>
        j.id === jobId ? { ...j, is_boosted: true, boost_expires_at: new Date(Date.now() + 48 * 3600000).toISOString() } : j
      );
      setJobs(all);
    }
  };

  const totalApplicants = chats.length;
  const activeJobsCount = jobs.filter((j) => !j.is_filled).length;

  const navMenuItems = [
    {
      icon: Building2,
      label: "Employer Dashboard & Hiring Hub",
      sub: "Manage gigs, applicant proposals & billing",
      to: "/employer/dashboard",
      testID: "profile-employer-dashboard",
    },
    {
      icon: Briefcase,
      label: "Employer Site (Nearby Pros)",
      sub: "Explore 50+ verified pros & unlock leads",
      to: "/employer",
      testID: "profile-employer",
    },
    {
      icon: Tag,
      label: "Employee Site (Find Gigs)",
      sub: "Browse 50+ active gigs in 5km radius",
      to: "/freelancer/jobs",
      testID: "profile-jobs",
    },
    {
      icon: MessagesSquare,
      label: "My Messages & Proposals",
      sub: "Chats with applicants & pros",
      to: "/employer/inbox",
      testID: "profile-chats",
    },
    {
      icon: MapIcon,
      label: "Live Map",
      sub: "Pros & employers near you",
      to: "/map",
      testID: "profile-map",
    },
    {
      icon: LayoutGrid,
      label: "Browse Categories",
      sub: "All gigs & sub-disciplines",
      to: "/categories",
      testID: "profile-categories",
    },
    {
      icon: LifeBuoy,
      label: "Customer Support & FAQs",
      sub: "FAQs, help and reporting",
      to: "/support",
      testID: "profile-support",
    },
    {
      icon: FileText,
      label: "Legal & Policies",
      sub: "Terms, privacy — Bengaluru",
      to: "/legal",
      testID: "profile-legal",
    },
  ];

  return (
    <Shell>
      <div className="min-h-screen bg-[#F9F9F6] dark:bg-[#0a0a0a] text-ink dark:text-white selection:bg-[#E65A1E]">
        {/* ═══════════ TOP NAV BAR (MATCHING FREELANCER DASHBOARD) ═══════════ */}
        <div className="border-b border-[#e5e5e5] dark:border-[#1a1a1a] bg-white/90 dark:bg-[#111]/90 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
            <button
              onClick={() => nav("/employer")}
              data-testid="employer-dashboard-back-btn"
              className="flex items-center gap-2 text-sm text-[#E65A1E] hover:text-[#F06B2E] transition font-semibold"
            >
              <ChevronLeft size={16} />
              <span>Back to Directory</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="switch-to-freelancer-btn"
                onClick={handleSwitchToFreelancer}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#ddd] dark:border-[#333] bg-[#FFF3C4] px-3 py-1.5 text-xs font-black text-ink hover:bg-[#FFEAA0] transition shadow-xs"
                title="Switch to Freelancer Profile"
              >
                <ArrowRightLeft size={13} className="text-brand" />
                <span>FREELANCER VIEW</span>
              </button>

              <button
                type="button"
                data-testid="employer-post-btn-header"
                onClick={() => nav("/employer/post-job")}
                className="flex items-center gap-1.5 rounded-lg bg-[#E65A1E] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#F06B2E] transition shadow-sm active:translate-y-0.5"
              >
                <PlusCircle size={14} />
                <span>POST A GIG</span>
              </button>

              <button
                onClick={() => setMenuDrawerOpen(true)}
                data-testid="employer-top-menu-btn"
                className="flex items-center gap-2 rounded-lg border border-[#ddd] dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3.5 py-1.5 text-xs font-bold text-ink dark:text-white hover:bg-gray-100 dark:hover:bg-[#252525] hover:border-[#E65A1E] transition shadow-sm active:translate-y-0.5"
              >
                <Menu size={16} className="text-[#E65A1E]" />
                <span className="hidden sm:inline">MENU &amp; SETTINGS</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════ MAIN CONTENT CONTAINER (MATCHING FREELANCER DASHBOARD) ═══════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* ═══════════ LEFT SIDEBAR ═══════════ */}
            <aside className="lg:w-[320px] shrink-0 flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
              
              {/* Profile / Company Card */}
              <div
                data-testid="employer-profile-hero"
                className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative mb-3">
                    <div className="h-24 w-24 rounded-full bg-[#E65A1E] flex items-center justify-center text-3xl font-black text-white border-2 border-white dark:border-[#222] shadow-sm">
                      {(companyName || employerName || "E").slice(0, 1).toUpperCase()}
                    </div>
                    <span
                      className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#00A86B] text-white border-2 border-white dark:border-[#111] shadow-sm"
                      title="Verified Employer"
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-ink dark:text-white">{companyName}</h2>
                  <p className="text-xs text-inkmuted dark:text-[#888] mt-0.5">
                    Managed by <strong className="text-ink dark:text-stone-200">{employerName}</strong>
                  </p>
                  <p className="text-xs text-[#E65A1E] font-semibold mt-1">
                    {industry}
                  </p>

                  <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3C4] px-2.5 py-0.5 text-[10px] font-bold text-[#92400E]">
                      <ShieldCheck size={12} className="text-brand" /> Verified Hirer
                    </span>
                    {gstNumber ? (
                      <span
                        data-testid="employer-gst-badge"
                        className="inline-flex items-center gap-1 rounded-full bg-sand dark:bg-stone-800 px-2.5 py-0.5 text-[10px] font-mono font-bold text-ink dark:text-stone-300 border border-ink/10"
                      >
                        GST: {gstNumber}
                      </span>
                    ) : null}
                    {isAdmin && (
                      <span className="inline-flex items-center rounded-full bg-ok px-2.5 py-0.5 text-[10px] font-bold text-white">
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick stats counter (Matching Freelancer Jobs/Skills/Works pattern) */}
                <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">{activeJobsCount}</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Active Gigs</p>
                  </div>
                  <div className="w-px h-8 bg-[#e5e5e5] dark:bg-[#222]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">{totalApplicants}</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Applicants</p>
                  </div>
                  <div className="w-px h-8 bg-[#e5e5e5] dark:bg-[#222]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">{savedPros.length}</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Shortlisted</p>
                  </div>
                </div>
              </div>

              {/* Job Posting Hub & Quota Card (Matching Credits Card on Freelancer side) */}
              <div className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF3C4] text-[#E65A1E]">
                      <Coins size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase text-ink dark:text-white">Job Posting Hub</p>
                      <p className="text-[10px] text-inkmuted dark:text-[#888]">100% Free Unlimited Gigs</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-ok/10 text-ok px-2 py-0.5 text-[10px] font-bold">
                    Active
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between border-y border-[#e5e5e5] dark:border-[#222] py-3">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-inkmuted dark:text-[#888]">
                      AVAILABLE QUOTA
                    </span>
                    <p className="text-xl font-bold text-ink dark:text-white flex items-center gap-1.5 mt-0.5">
                      <Sparkles size={18} className="text-[#E65A1E]" /> Unlimited Free Posts
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => nav("/employer/post-job")}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#E65A1E] py-2 text-xs font-bold text-white hover:bg-[#F06B2E] transition shadow-sm active:translate-y-0.5"
                  >
                    <PlusCircle size={14} /> POST A NEW GIG
                  </button>
                </div>
              </div>

              {/* Hiring Contact & Location Info Card */}
              <div className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-inkmuted dark:text-[#888]">Hiring Contact</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({ companyName, employerName, area, phone, industry, bio, gstNumber });
                      setEditModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[#E65A1E] hover:underline flex items-center gap-1"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-ink dark:text-[#ccc]">
                  <MapPin size={15} className="text-[#E65A1E] shrink-0" />
                  <span>{area}, Bengaluru</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-ink dark:text-[#ccc]">
                  <Phone size={15} className="text-[#E65A1E] shrink-0" />
                  <span>+91 {phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-ink dark:text-[#ccc]">
                  <Mail size={15} className="text-[#E65A1E] shrink-0" />
                  <span className="truncate">{user?.email || "employer@workhop.local"}</span>
                </div>
                {gstNumber && (
                  <div className="flex items-center gap-2.5 text-xs text-ink dark:text-[#ccc] border-t border-[#e5e5e5] dark:border-[#222] pt-2">
                    <Building2 size={15} className="text-[#E65A1E] shrink-0" />
                    <span className="font-mono text-[11px]">GSTIN: {gstNumber}</span>
                  </div>
                )}
              </div>
            </aside>

            {/* ═══════════ MAIN CONTENT ═══════════ */}
            <main className="flex-1 flex flex-col gap-6 min-w-0">
              
              {/* 1. Header Card: Company Bio & Title */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-xl font-bold text-ink dark:text-white">{companyName}</h1>
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ companyName, employerName, area, phone, industry, bio, gstNumber });
                          setEditModalOpen(true);
                        }}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-[#E65A1E] hover:bg-[#E65A1E]/10 transition"
                        title="Edit Company Details"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                    <p className="text-[#E65A1E] font-semibold text-sm mt-0.5">
                      {industry} · Managed by {employerName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => nav("/employer/post-job")}
                      className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#E65A1E] px-4 py-2 text-xs font-bold text-white hover:bg-[#F06B2E] transition shadow-sm"
                    >
                      <PlusCircle size={14} /> POST A GIG
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                  <p className="text-sm text-ink dark:text-[#bbb] leading-relaxed whitespace-pre-wrap">
                    {bio}
                  </p>
                </div>
              </section>

              {/* 2. Key Performance Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F9F9FB] dark:bg-[#161618] border border-[#e5e5e5] dark:border-[#252528] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E65A1E]/10 text-[#E65A1E]">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink dark:text-white">{activeJobsCount}</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#888] uppercase tracking-wider">Active Gigs</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-l border-[#e5e5e5] dark:border-[#252528] pl-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink dark:text-white">{totalApplicants}</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#888] uppercase tracking-wider">Proposals</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-l border-[#e5e5e5] dark:border-[#252528] pl-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Coins size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink dark:text-white">Free</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#888] uppercase tracking-wider">Posting Fee</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-l border-[#e5e5e5] dark:border-[#252528] pl-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ok/10 text-ok">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink dark:text-white">100%</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#888] uppercase tracking-wider">Verified Talent</p>
                  </div>
                </div>
              </div>

              {/* 3. Gigs Posted by Employer */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Briefcase size={18} className="text-[#E65A1E]" />
                    <h2 className="text-base font-bold text-ink dark:text-white">Gigs Posted by You</h2>
                    <span className="text-xs font-bold text-[#E65A1E] bg-[#E65A1E]/10 px-2.5 py-0.5 rounded-full">
                      {jobs.length} Gigs
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => nav("/employer/post-job")}
                    className="flex items-center gap-1 text-xs font-bold text-[#E65A1E] hover:underline"
                  >
                    <Plus size={14} /> Post Another Gig
                  </button>
                </div>

                {jobs.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[#ddd] dark:border-[#333] rounded-xl p-6">
                    <Briefcase size={36} className="mx-auto text-inkmuted/40 mb-3" />
                    <h4 className="text-sm font-bold text-ink dark:text-white">No gigs posted yet</h4>
                    <p className="text-xs text-inkmuted dark:text-[#888] mt-1 max-w-sm mx-auto">
                      Post your first gig for free and connect with verified local Bengaluru talent within hours.
                    </p>
                    <button
                      type="button"
                      onClick={() => nav("/employer/post-job")}
                      className="mt-4 rounded-lg bg-[#E65A1E] px-4 py-2 text-xs font-bold text-white hover:bg-[#F06B2E] transition shadow-sm inline-flex items-center gap-1.5"
                    >
                      <PlusCircle size={14} /> Post a Free Gig Now
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {jobs.map((j) => (
                      <div
                        key={j.id}
                        className="bg-[#fcfcfc] dark:bg-[#151517] border border-[#e5e5e5] dark:border-[#26262a] rounded-xl p-5 transition hover:border-[#E65A1E]/40"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="rounded-full bg-[#E65A1E]/10 text-[#E65A1E] px-2.5 py-0.5 text-[10px] font-bold">
                                {j.category || j.bucket || "Creative"}
                              </span>
                              {j.is_boosted && (
                                <span className="rounded-full bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                                  <Flame size={11} className="fill-red-500" /> URGENT PINNED
                                </span>
                              )}
                              <span className="text-xs text-inkmuted dark:text-[#888]">
                                {j.area} · Posted {j.posted_minutes_ago || 10}m ago
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-ink dark:text-white mt-1.5">
                              {j.title}
                            </h3>

                            <div className="mt-2 flex items-center gap-3 text-xs text-inkmuted dark:text-[#888] flex-wrap">
                              <span className="text-ink dark:text-white font-bold text-sm">
                                ₹{Number(j.pay || 0).toLocaleString("en-IN")} Budget
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Coins size={12} className="text-[#E65A1E]" /> Requires {j.credits_to_apply || calculateHopsForJob(j.pay)} Hops
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-semibold text-ok">
                                <Users size={12} /> {j.applicants_count || 3} Applicants
                              </span>
                            </div>
                          </div>

                          {/* Quick Action Buttons for this Job */}
                          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
                            {j.is_completed || j.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-ok/30 bg-ok/10 text-ok px-3 py-2 text-xs font-bold">
                                <CheckCircle2 size={13} /> COMPLETED &amp; REVIEWED
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReviewJob(j)}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                                title="Mark gig complete and leave rating & feedback for the freelancer"
                              >
                                <CheckCircle2 size={13} className="text-ok" /> COMPLETE &amp; REVIEW
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setLeaderboardJob(j)}
                              className="flex-1 md:flex-initial flex items-center justify-center gap-1 rounded-lg bg-[#FFF3C4] border border-[#FFEAA0] px-3 py-2 text-xs font-bold text-[#92400E] hover:bg-[#FFEAA0] transition"
                              title="View Applicant Leaderboard & Bids"
                            >
                              <Trophy size={13} className="text-amber-500" /> BIDS ({j.applicants_count || 3})
                            </button>

                            {!j.is_boosted && !j.is_completed && (
                              <button
                                type="button"
                                onClick={() => handleBoostJob(j.id)}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                                title="Make this gig urgent & pin to top"
                              >
                                <Flame size={13} className="text-red-500 fill-red-500" /> MAKE URGENT
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => nav(`/employer/inbox`)}
                              className="flex-1 md:flex-initial flex items-center justify-center gap-1 rounded-lg bg-ink text-white dark:bg-white dark:text-black px-3 py-2 text-xs font-bold hover:bg-[#E65A1E] dark:hover:bg-[#E65A1E] dark:hover:text-white transition shadow-sm"
                            >
                              PROPOSALS <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 4. RECENT APPLICANTS & SHORTLISTED PROS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Box 1: Recent Applicants */}
                <div className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#222] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#E65A1E]" />
                      <h3 className="text-sm font-bold text-ink dark:text-white">Recent Candidate Proposals</h3>
                    </div>
                    <Link to="/employer/inbox" className="text-xs font-bold text-[#E65A1E] hover:underline">
                      View All ({chats.length})
                    </Link>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {chats.slice(0, 4).map((c, idx) => {
                      const dist = c.distance_km ?? 1.2;
                      const suit = getDistanceSuitability(dist);
                      const isBoosted = (c.boost_credits || 0) > 0;

                      return (
                        <div
                          key={c.id || idx}
                          onClick={() => nav(`/chat/${c.conversation_id || c.id}?role=employer`)}
                          className="cursor-pointer bg-[#f9f9f9] dark:bg-[#161618] border border-[#e5e5e5] dark:border-[#26262a] rounded-lg p-3 hover:border-[#E65A1E]/50 transition flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E65A1E] font-bold text-white text-sm">
                              {(c.freelancer_name || "P").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-ink dark:text-white truncate">{c.freelancer_name || "Verified Pro"}</p>
                                {isBoosted && (
                                  <span className="rounded bg-amber-500 text-white px-1.5 py-0.2 text-[8px] font-bold">
                                    ★ +{c.boost_credits} Hops Bid
                                  </span>
                                )}
                                <span className="text-[8px] font-bold text-white px-1.5 py-0.2 rounded" style={{ backgroundColor: suit.color }}>
                                  {suit.badge}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-[#E65A1E] truncate mt-0.5">{c.job_title}</p>
                              <p className="text-[10px] text-inkmuted dark:text-[#888] truncate">{c.last_message || "Application submitted"}</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-inkmuted shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Box 2: Saved / Bookmarked Pros */}
                <div className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#222] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-amber-500 fill-amber-500" />
                      <h3 className="text-sm font-bold text-ink dark:text-white">Shortlisted Top Pros</h3>
                    </div>
                    <Link to="/employer" className="text-xs font-bold text-[#E65A1E] hover:underline">
                      Browse More Pros
                    </Link>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {savedPros.map((pro) => (
                      <div
                        key={pro.id}
                        onClick={() => {
                          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                          nav(`/pro/${pro.id}`);
                        }}
                        className="cursor-pointer bg-[#f9f9f9] dark:bg-[#161618] border border-[#e5e5e5] dark:border-[#26262a] rounded-lg p-3 hover:border-[#E65A1E]/50 transition flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white dark:bg-white dark:text-black font-bold text-sm">
                            {(pro.name || "P").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-ink dark:text-white truncate">{pro.name}</p>
                              <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                                ⭐ {pro.rating || 4.9}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-[#E65A1E] truncate">{pro.skill}</p>
                            <p className="text-[10px] text-inkmuted dark:text-[#888]">₹{pro.rate_hr || 750}/hr · {pro.jobs_done || 12} jobs completed</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-inkmuted shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* ═══════════ SLIDE-OUT MENU & SETTINGS DRAWER ═══════════ */}
        {menuDrawerOpen && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMenuDrawerOpen(false);
            }}
          >
            <div
              data-testid="employer-menu-drawer"
              className="w-full max-w-md h-full bg-white dark:bg-[#111] border-l border-[#e5e5e5] dark:border-[#222] p-5 sm:p-6 overflow-y-auto flex flex-col justify-between shadow-2xl"
            >
              <div className="flex flex-col gap-4">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#222] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E65A1E]/15 text-[#E65A1E]">
                      <Menu size={18} />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-ink dark:text-white">Menu &amp; Settings</h3>
                      <p className="text-[11px] text-inkmuted dark:text-[#777]">Account, platform links &amp; preferences</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMenuDrawerOpen(false)}
                    data-testid="employer-menu-drawer-close"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ddd] dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-inkmuted dark:text-[#888] hover:text-ink dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252525] transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Quick Switch Role Card */}
                <div className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowRightLeft size={14} className="text-[#E65A1E]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">SWITCH ROLE VIEW</span>
                  </div>
                  <p className="text-xs text-inkmuted dark:text-[#888] mb-3">
                    Switch freely between your Employer Hiring Dashboard and Freelancer Pro Profile.
                  </p>
                  <button
                    type="button"
                    onClick={handleSwitchToFreelancer}
                    className="w-full flex items-center justify-center gap-1.5 bg-ink text-white dark:bg-white dark:text-black py-2 rounded-lg text-xs font-bold hover:bg-[#E65A1E] hover:text-white transition"
                  >
                    <ArrowRightLeft size={13} /> SWITCH TO FREELANCER VIEW
                  </button>
                </div>

                {/* Navigation Links list */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-inkmuted dark:text-[#777] px-2 mb-1">
                    EXPLORE PLATFORM
                  </p>
                  {navMenuItems.map((item, idx) => (
                    <button
                      key={idx}
                      data-testid={item.testID}
                      onClick={() => {
                        setMenuDrawerOpen(false);
                        nav(item.to);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-left transition group border border-transparent hover:border-[#e5e5e5] dark:hover:border-[#222]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E65A1E]/10 text-[#E65A1E] group-hover:bg-[#E65A1E] group-hover:text-white transition">
                          <item.icon size={18} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-ink dark:text-white group-hover:text-[#E65A1E] transition">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-inkmuted dark:text-[#777] line-clamp-1">{item.sub}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-inkmuted dark:text-[#666] group-hover:text-[#E65A1E] transition" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Drawer Footer with Logout */}
              <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#222] mt-4 flex items-center justify-between text-xs text-inkmuted">
                <span className="font-semibold">WorkHop Bengaluru</span>
                {logout && (
                  <button
                    onClick={() => {
                      logout();
                      nav("/");
                    }}
                    className="flex items-center gap-1.5 text-red-500 font-bold hover:underline"
                  >
                    <LogOut size={13} /> Log out
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ EDIT COMPANY PROFILE MODAL ═══════════ */}
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveProfile}
          title="Edit Employer & Company Profile"
          wide
        >
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company / Business Name</label>
                <input
                  type="text"
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  placeholder="e.g. Acme Tech Studio"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Manager / Hiring Lead Name</label>
                <input
                  type="text"
                  value={editForm.employerName}
                  onChange={(e) => setEditForm({ ...editForm, employerName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Bengaluru Area / Locality</label>
                <input
                  type="text"
                  value={editForm.area}
                  onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                  placeholder="e.g. Koramangala, Indiranagar, HSR"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Contact Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Industry / Sector</label>
              <input
                type="text"
                value={editForm.industry}
                onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                placeholder="e.g. Brand Design, SaaS & Web Apps, Cafe/F&B"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>About Your Company &amp; Hiring Goals</label>
              <textarea
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Brief description about your company, gigs you offer, and workplace style..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>GSTIN / GST Number (Optional)</label>
                <span className="text-[10px] text-inkmuted dark:text-[#777]">Optional for Tax Invoicing</span>
              </div>
              <input
                type="text"
                data-testid="employer-gst-input"
                value={editForm.gstNumber || ""}
                onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. 29AAAAA0000A1Z5 (Optional)"
                maxLength={15}
                className={`${inputCls} font-mono uppercase tracking-wider`}
              />
              <p className="text-[11px] text-inkmuted dark:text-[#777] mt-1">
                15-character GST identification number for claiming business tax credits on gig invoices.
              </p>
            </div>
          </form>
        </EditModal>

        {/* ═══════════ APPLICANT LEADERBOARD MODAL ═══════════ */}
        {leaderboardJob && (
          <ApplicantLeaderboardModal
            isOpen={Boolean(leaderboardJob)}
            onClose={() => setLeaderboardJob(null)}
            jobId={leaderboardJob.id}
            jobTitle={leaderboardJob.title}
          />
        )}

        {/* ═══════════ COMPLETE JOB & REVIEW MODAL ═══════════ */}
        {reviewJob && (
          <CompleteJobReviewModal
            isOpen={Boolean(reviewJob)}
            onClose={() => setReviewJob(null)}
            job={reviewJob}
            employerName={companyName || employerName}
            onSuccess={() => {
              loadDashboardData();
            }}
          />
        )}
      </div>
    </Shell>
  );
}
