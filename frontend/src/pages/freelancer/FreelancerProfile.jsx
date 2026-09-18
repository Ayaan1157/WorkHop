import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil, Plus, Trash2, ChevronLeft, Github, ExternalLink,
  Briefcase, GraduationCap, Award, Globe, Link2, Clock,
  MapPin, Star, ChevronDown, ChevronUp, X, User, DollarSign,
  Code2, Loader2, Menu, MessagesSquare, Map as MapIcon,
  LayoutGrid, Tag, LifeBuoy, FileText, Shield, ChevronRight,
  LogOut, Wallet, ShieldCheck, Camera, Upload, Coins, Sparkles, History, ArrowUpRight, Building2
} from "lucide-react";
import { Shell } from "@/components/kit";
import EditModal from "@/components/EditModal";
import EscrowWalletModal from "@/components/EscrowWalletModal";
import CreditsTopUpModal from "@/components/CreditsTopUpModal";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut, getFreelancerId } from "@/lib/api";
import { getFreelancerProfile, saveFreelancerProfile, getCreditsWallet, getCreditTransactions } from "@/lib/clientStore";

/* ═══════════ helpers ═══════════ */
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const PROFICIENCY_LEVELS = [
  "Native or Bilingual",
  "Fluent",
  "Conversational",
  "Basic",
];

const SKILL_SUGGESTIONS = [
  "Web Development", "Artificial Intelligence", "Web Application", "Web Design",
  "Automation", "API", "Stripe", "OpenAPI", "SaaS Development", "Responsive Design",
  "Web Application Development", "Website Redesign", "Next.js", "React", "Runway",
  "Node.js", "Python", "TypeScript", "MongoDB", "PostgreSQL", "AWS", "Docker",
  "GraphQL", "REST API", "UI/UX Design", "Figma", "Adobe XD", "Tailwind CSS",
  "Firebase", "Git", "CI/CD", "Linux", "Redis", "Elasticsearch",
];

/* ═══════════ main component ═══════════ */
export default function FreelancerProfile() {
  const nav = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const freelancerId = getFreelancerId();

  const [profile, setProfile] = useState(() => getFreelancerProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState(null);

  // Skill input
  const [skillInput, setSkillInput] = useState("");

  // Collapsible
  const [expandedEmployment, setExpandedEmployment] = useState(true);
  const [expandedCerts, setExpandedCerts] = useState(true);

  // Top-right Menu Drawer & Escrow Wallet states
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [txHistoryOpen, setTxHistoryOpen] = useState(false);
  const [creditsWallet, setCreditsWallet] = useState(() => getCreditsWallet(freelancerId));
  const [creditTxs, setCreditTxs] = useState(() => getCreditTransactions(freelancerId));
  const [proPhone, setProPhone] = useState(() => user?.phone || localStorage.getItem("workhop_pro_phone") || "");
  const [proSkill, setProSkill] = useState(() => user?.skill || localStorage.getItem("workhop_pro_skill") || "");
  const [proSaving, setProSaving] = useState(false);
  const [proSaveMsg, setProSaveMsg] = useState(null);

  const photoInputRef = useRef(null);

  const saveProDetails = async () => {
    const digits = proPhone.replace(/\D/g, "");
    if (digits.length !== 10) return setProSaveMsg({ ok: false, text: "Phone must be exactly 10 digits." });
    setProSaving(true);
    setProSaveMsg(null);
    try {
      localStorage.setItem("workhop_pro_phone", digits);
      if (proSkill) localStorage.setItem("workhop_pro_skill", proSkill);
      if (freelancerId) {
        await apiPut(`/freelancer/${freelancerId}/profile`, {
          phone: digits,
          skill: proSkill.trim() || null,
        });
        setProSaveMsg({ ok: true, text: "Saved pro details successfully!" });
      } else {
        setProSaveMsg({ ok: true, text: `Saved · phone set to +91 ${digits}` });
      }
    } catch (e) {
      setProSaveMsg({ ok: false, text: e?.message || "Could not save." });
    } finally {
      setProSaving(false);
    }
  };

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
      label: "My Messages",
      sub: "Chats with employers & pros",
      to: "/freelancer/chats",
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
      sub: "All gigs & sub-gigs",
      to: "/categories",
      testID: "profile-categories",
    },
    {
      icon: Tag,
      label: "Plans & Pricing",
      sub: "Job posts, boosts & branding",
      to: "/employer/plans",
      testID: "profile-plans",
    },
    {
      icon: LifeBuoy,
      label: "Support & Complaints",
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

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiGet(`/freelancer/${freelancerId}/full-profile`);
      if (data && typeof data === "object") {
        setProfile((prev) => ({ ...prev, ...data }));
      }
    } catch {
      /* use default */
    } finally {
      setLoading(false);
    }
  }, [freelancerId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const persist = useCallback(
    async (updated) => {
      setProfile(updated);
      saveFreelancerProfile(updated);
      try {
        await apiPut(`/freelancer/${freelancerId}/full-profile`, updated);
      } catch {
        /* saved locally */
      }
    },
    [freelancerId]
  );

  const openEdit = (section, data = null) => {
    setEditingSection(section);
    setEditData(data);
  };

  const closeEdit = () => {
    setEditingSection(null);
    setEditData(null);
  };

  /* ═══════════ save handlers ═══════════ */
  const saveTitle = (title, description, rateHr) => {
    persist({ ...profile, title, description, rate_hr: Number(rateHr) || 0 });
    closeEdit();
  };

  const saveName = (name, picture) => {
    if (updateUserProfile) {
      updateUserProfile({
        name: (name || "").trim() || (user?.name || "WorkHop User"),
        picture: picture !== undefined ? (picture || null) : (user?.picture || null),
      });
    }
    closeEdit();
  };

  const saveEmployment = (entry) => {
    const list = [...profile.employment_history];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    persist({ ...profile, employment_history: list });
    closeEdit();
  };

  const deleteEmployment = (id) => {
    persist({
      ...profile,
      employment_history: profile.employment_history.filter((e) => e.id !== id),
    });
  };

  const saveCertification = (entry) => {
    const list = [...profile.certifications];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    persist({ ...profile, certifications: list });
    closeEdit();
  };

  const deleteCertification = (id) => {
    persist({
      ...profile,
      certifications: profile.certifications.filter((e) => e.id !== id),
    });
  };

  const saveEducation = (entry) => {
    const list = [...profile.education];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    persist({ ...profile, education: list });
    closeEdit();
  };

  const deleteEducation = (id) => {
    persist({
      ...profile,
      education: profile.education.filter((e) => e.id !== id),
    });
  };

  const addSkill = (skill) => {
    if (!skill.trim() || profile.skills.includes(skill.trim())) return;
    persist({ ...profile, skills: [...profile.skills, skill.trim()] });
  };

  const removeSkill = (skill) => {
    persist({ ...profile, skills: profile.skills.filter((s) => s !== skill) });
  };

  const saveLanguages = (languages) => {
    persist({ ...profile, languages });
    closeEdit();
  };

  const saveLinkedAccounts = (github_url, github_username, upwork_url) => {
    persist({ ...profile, github_url, github_username, upwork_url });
    closeEdit();
  };

  const saveAvailability = (hours_per_week, availability) => {
    persist({ ...profile, hours_per_week, availability });
    closeEdit();
  };

  const addPortfolioItem = (item) => {
    persist({ ...profile, portfolio: [...profile.portfolio, { ...item, id: uid() }] });
    closeEdit();
  };

  const deletePortfolioItem = (id) => {
    persist({ ...profile, portfolio: profile.portfolio.filter((p) => p.id !== id) });
  };

  /* ═══════════ derived ═══════════ */
  const displayName = user?.name || "Your Name";
  const displayTitle = profile.title || "Your Professional Title";
  const displayRate = profile.rate_hr ? `$${profile.rate_hr}.00/hr` : "Set your rate";

  const inputCls =
    "w-full bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#ddd] dark:border-[#333] rounded-lg px-3 py-2.5 text-sm text-ink dark:text-white placeholder:text-[#999] dark:placeholder:text-[#555] focus:outline-none focus:border-[#E65A1E] transition";
  const labelCls = "text-xs font-semibold text-inkmuted dark:text-[#999] uppercase tracking-wider mb-1.5";

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh] bg-[#F9F9F6] dark:bg-[#0a0a0a]">
          <Loader2 size={32} className="animate-spin text-[#E65A1E]" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="min-h-screen bg-[#F9F9F6] dark:bg-[#0a0a0a] text-ink dark:text-white selection:bg-[#E65A1E]">
        {/* TOP NAV BAR WITH SETTINGS MENU ON THE RIGHT */}
        <div className="border-b border-[#e5e5e5] dark:border-[#1a1a1a] bg-white/90 dark:bg-[#111]/90 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
            <button
              onClick={() => nav("/freelancer/jobs")}
              data-testid="profile-back-btn"
              className="flex items-center gap-2 text-sm text-[#E65A1E] hover:text-[#F06B2E] transition font-semibold"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="profile-switch-employer-btn"
                onClick={() => {
                  localStorage.setItem("workhop_auth_role", "employer");
                  nav("/employer/dashboard");
                }}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#ddd] dark:border-[#333] bg-[#FFF3C4] px-3 py-1.5 text-xs font-black text-ink hover:bg-[#FFEAA0] transition shadow-xs"
                title="Switch to Employer Dashboard"
              >
                <Building2 size={14} className="text-brand" />
                <span>EMPLOYER DASHBOARD</span>
              </button>

              <button
                onClick={() => setMenuDrawerOpen(true)}
                data-testid="profile-top-menu-btn"
                className="flex items-center gap-2 rounded-lg border border-[#ddd] dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3.5 py-1.5 text-xs font-bold text-ink dark:text-white hover:bg-gray-100 dark:hover:bg-[#252525] hover:border-[#E65A1E] transition shadow-sm active:translate-y-0.5"
              >
                <Menu size={16} className="text-[#E65A1E]" />
                <span>MENU & SETTINGS</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ═══════════ LEFT SIDEBAR ═══════════ */}
            <aside className="lg:w-[320px] shrink-0 flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
              {/* Profile Card */}
              <div className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative group mb-4">
                    <button
                      type="button"
                      onClick={() => openEdit("name", { name: user?.name || "", picture: user?.picture || "" })}
                      className="relative block rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#E65A1E]/50"
                      title="Click to edit profile photo & name"
                      data-testid="avatar-edit-button"
                    >
                      {user?.picture ? (
                        <img
                          src={user.picture}
                          alt={displayName}
                          className="h-24 w-24 rounded-full object-cover border-2 border-white dark:border-[#222] shadow-sm group-hover:opacity-85 transition"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-[#E65A1E] flex items-center justify-center text-3xl font-bold text-white border-2 border-white dark:border-[#222] shadow-sm group-hover:brightness-105 transition">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition rounded-full text-white cursor-pointer">
                        <Camera size={22} className="drop-shadow" />
                        <span className="text-[10px] font-semibold mt-0.5">Edit</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit("name", { name: user?.name || "", picture: user?.picture || "" })}
                      className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-[#E65A1E] flex items-center justify-center text-white shadow-lg hover:bg-[#D44F17] transition"
                      title="Edit name and photo"
                      data-testid="avatar-pencil-button"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                  <h2 className="text-lg font-bold text-ink dark:text-white">{displayName}</h2>
                  <p className="text-sm text-inkmuted dark:text-[#888] mt-0.5">
                    {user?.area || "Your Location"} · {user?.email || ""}
                  </p>
                </div>

                {/* Quick stats */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">
                      {profile.employment_history.length}
                    </p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Jobs</p>
                  </div>
                  <div className="w-px h-8 bg-[#e5e5e5] dark:bg-[#222]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">{profile.skills.length}</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Skills</p>
                  </div>
                  <div className="w-px h-8 bg-[#e5e5e5] dark:bg-[#222]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">
                      {profile.portfolio.length}
                    </p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Works</p>
                  </div>
                </div>
              </div>

              {/* ═══════════ CONNECTS & CREDITS WALLET (UPWORK-STYLE) ═══════════ */}
              <div
                data-testid="credits-wallet-card"
                className="border-2 border-ink bg-white dark:bg-[#141414] p-5 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-[#FFF3C4] text-[#E65A1E]">
                      <Coins size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase text-ink dark:text-white">Connects & Credits</p>
                      <p className="text-[10px] text-inkmuted dark:text-stone-400">Bidding & Proposal Wallet</p>
                    </div>
                  </div>
                  {creditsWallet.subscription_status === "active" ? (
                    <span className="border border-ink bg-ok px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-[1px_1px_0px_#121212]">
                      Pro Pass Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                      Standard
                    </span>
                  )}
                </div>

                {/* Big Balance Number */}
                <div className="mt-4 flex items-baseline justify-between border-y-2 border-ink/20 py-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                      AVAILABLE BALANCE
                    </span>
                    <p className="text-2xl font-black text-ink dark:text-white flex items-center gap-1.5" data-testid="profile-credits-balance">
                      <Coins size={22} className="text-brand" /> {creditsWallet.balance} <span className="text-xs font-bold text-inkmuted">Credits</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="view-credit-history-btn"
                    onClick={() => {
                      setCreditTxs(getCreditTransactions(freelancerId));
                      setTxHistoryOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-black text-brand underline hover:opacity-80"
                  >
                    <History size={12} /> History
                  </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    data-testid="profile-topup-btn"
                    onClick={() => setCreditsModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1 border-2 border-ink bg-ink py-2 text-xs font-black text-white hover:bg-black transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
                  >
                    <Plus size={13} /> TOP UP
                  </button>
                  <button
                    type="button"
                    data-testid="profile-pro-pass-btn"
                    onClick={() => setCreditsModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1 border-2 border-ink bg-brand py-2 text-xs font-black text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
                  >
                    <Sparkles size={13} /> PRO PASS
                  </button>
                </div>
              </div>

              {/* Hours per week */}
              <SidebarSection
                icon={<Clock size={16} />}
                title="Hours per week"
                onEdit={() =>
                  openEdit("availability", {
                    hours_per_week: profile.hours_per_week,
                    availability: profile.availability,
                  })
                }
              >
                <p className="text-sm text-ink dark:text-[#ccc]">{profile.hours_per_week || "Not set"}</p>
                <p className="text-xs text-inkmuted dark:text-[#666] mt-0.5">
                  {profile.availability || ""}
                </p>
              </SidebarSection>

              {/* Languages */}
              <SidebarSection
                icon={<Globe size={16} />}
                title="Languages"
                onEdit={() => openEdit("languages", { languages: [...profile.languages] })}
                onAdd={() =>
                  openEdit("languages", {
                    languages: [
                      ...profile.languages,
                      { language: "", proficiency: "Conversational" },
                    ],
                  })
                }
              >
                {profile.languages.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {profile.languages.map((l, i) => (
                      <div key={i} className="flex items-baseline justify-between">
                        <span className="text-sm text-ink dark:text-[#ccc]">{l.language}</span>
                        <span className="text-xs text-inkmuted dark:text-[#666]">{l.proficiency}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-inkmuted dark:text-[#555] italic">Add your languages</p>
                )}
              </SidebarSection>

              {/* Linked Accounts */}
              <SidebarSection
                icon={<Link2 size={16} />}
                title="Linked accounts"
                onEdit={() =>
                  openEdit("linked", {
                    github_url: profile.github_url,
                    github_username: profile.github_username,
                    upwork_url: profile.upwork_url,
                  })
                }
              >
                {profile.github_url ? (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-ink dark:text-[#ccc] hover:text-[#E65A1E] transition"
                  >
                    <Github size={16} className="text-inkmuted dark:text-[#888]" />
                    <span>{profile.github_username || "GitHub"}</span>
                    <ExternalLink size={12} className="text-inkmuted dark:text-[#555]" />
                  </a>
                ) : null}
                {profile.upwork_url ? (
                  <a
                    href={profile.upwork_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-ink dark:text-[#ccc] hover:text-[#E65A1E] transition mt-1"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E65A1E] text-white text-[8px] font-bold">
                      U
                    </span>
                    <span>Upwork</span>
                    <ExternalLink size={12} className="text-inkmuted dark:text-[#555]" />
                  </a>
                ) : null}
                {!profile.github_url && !profile.upwork_url && (
                  <p className="text-xs text-inkmuted dark:text-[#555] italic">Link your accounts</p>
                )}
              </SidebarSection>
            </aside>

            {/* ═══════════ MAIN CONTENT ═══════════ */}
            <main className="flex-1 flex flex-col gap-6 min-w-0">
              {/* Title + Rate + Description */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-xl font-bold text-ink dark:text-white">{displayTitle}</h1>
                      <EditBtn
                        onClick={() =>
                          openEdit("title", {
                            title: profile.title,
                            description: profile.description,
                            rate_hr: profile.rate_hr,
                          })
                        }
                      />
                    </div>
                    <p className="text-[#E65A1E] font-semibold text-lg mt-1">
                      {displayRate}
                    </p>
                  </div>
                </div>
                {profile.description ? (
                  <div className="mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                    <p className="text-sm text-ink dark:text-[#bbb] leading-relaxed whitespace-pre-wrap">
                      {profile.description}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                    <p className="text-sm text-inkmuted dark:text-[#555] italic">
                      Write a professional description about yourself, your experience, and what you
                      can offer to clients...
                    </p>
                  </div>
                )}
              </section>

              {/* Portfolio */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Portfolio"
                  onAdd={() => openEdit("portfolio-add")}
                />
                {profile.portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {profile.portfolio.map((item) => (
                      <div
                        key={item.id}
                        className="group relative bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg overflow-hidden aspect-[4/3]"
                      >
                        {item.image_data ? (
                          <img
                            src={
                              item.image_data.startsWith("data:")
                                ? item.image_data
                                : `data:image/jpeg;base64,${item.image_data}`
                            }
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-inkmuted dark:text-[#333]">
                            <Code2 size={32} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white truncate">
                              {item.title}
                            </p>
                          </div>
                          <button
                            onClick={() => deletePortfolioItem(item.id)}
                            className="h-7 w-7 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-600 transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Showcase your best work — add portfolio items" />
                )}
              </section>

              {/* Employment History */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Employment history"
                  onAdd={() =>
                    openEdit("employment", {
                      id: uid(),
                      title: "",
                      company: "",
                      start_date: "",
                      end_date: "",
                      is_current: false,
                      description: "",
                    })
                  }
                  expanded={expandedEmployment}
                  onToggle={() => setExpandedEmployment((v) => !v)}
                />
                {expandedEmployment && (
                  <div className="mt-4 flex flex-col gap-4">
                    {profile.employment_history.length > 0 ? (
                      profile.employment_history.map((entry) => (
                        <HistoryCard
                          key={entry.id}
                          entry={entry}
                          onEdit={() => openEdit("employment", { ...entry })}
                          onDelete={() => deleteEmployment(entry.id)}
                        />
                      ))
                    ) : (
                      <EmptyState text="Add your work experience to build credibility" />
                    )}
                  </div>
                )}
              </section>

              {/* Certifications */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Certifications"
                  onAdd={() =>
                    openEdit("certification", {
                      id: uid(),
                      name: "",
                      issuer: "",
                      year: new Date().getFullYear(),
                      url: "",
                    })
                  }
                  expanded={expandedCerts}
                  onToggle={() => setExpandedCerts((v) => !v)}
                />
                {expandedCerts && (
                  <div className="mt-4 flex flex-col gap-3">
                    {profile.certifications.length > 0 ? (
                      profile.certifications.map((cert) => (
                        <div
                          key={cert.id}
                          className="flex items-start justify-between bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-[#E65A1E]/10 flex items-center justify-center shrink-0">
                              <Award size={18} className="text-[#E65A1E]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink dark:text-white">
                                {cert.name}
                              </p>
                              <p className="text-xs text-inkmuted dark:text-[#888] mt-0.5">
                                {cert.issuer}
                                {cert.year ? ` · ${cert.year}` : ""}
                              </p>
                              {cert.url && (
                                <a
                                  href={cert.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#E65A1E] hover:underline mt-1 inline-flex items-center gap-1"
                                >
                                  View credential <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <EditBtn
                              onClick={() => openEdit("certification", { ...cert })}
                            />
                            <DeleteBtn onClick={() => deleteCertification(cert.id)} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="Listing certifications helps prove your knowledge (+10%)" icon={<Award size={28} className="text-inkmuted dark:text-[#444]" />} />
                    )}
                  </div>
                )}
              </section>

              {/* Skills */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader title="Skills" onEdit={() => openEdit("skills")} />
                <div className="mt-4">
                  {profile.skills.length > 0 ? (
                    <>
                      <p className="text-xs text-inkmuted dark:text-[#666] mb-3">Self-reported</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <span
                            key={skill}
                            className="group relative px-3 py-1.5 text-xs font-medium text-ink dark:text-[#ccc] bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#ddd] dark:border-[#333] rounded-full hover:border-[#E65A1E] transition cursor-default"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <X size={8} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState text="Add skills to help clients find you" />
                  )}

                  {/* Quick add */}
                  <div className="mt-4 flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addSkill(skillInput);
                          setSkillInput("");
                        }
                      }}
                      placeholder="Type a skill and press Enter"
                      className={inputCls}
                    />
                    <button
                      onClick={() => {
                        addSkill(skillInput);
                        setSkillInput("");
                      }}
                      className="px-4 py-2 bg-[#E65A1E] text-white text-sm font-semibold rounded-lg hover:bg-[#D44F17] transition shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  {/* Suggestions */}
                  {profile.skills.length < 15 && (
                    <div className="mt-3">
                      <p className="text-xs text-inkmuted dark:text-[#555] mb-2">Suggested:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SKILL_SUGGESTIONS.filter(
                          (s) => !profile.skills.includes(s)
                        )
                          .slice(0, 8)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => addSkill(s)}
                              className="px-2.5 py-1 text-[11px] text-inkmuted dark:text-[#888] border border-[#ddd] dark:border-[#2a2a2a] rounded-full hover:border-[#E65A1E] hover:text-[#E65A1E] transition"
                            >
                              + {s}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Education */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Education"
                  onAdd={() =>
                    openEdit("education", {
                      id: uid(),
                      school: "",
                      degree: "",
                      field: "",
                      start_year: "",
                      end_year: "",
                      is_current: false,
                    })
                  }
                />
                <div className="mt-4 flex flex-col gap-3">
                  {profile.education.length > 0 ? (
                    profile.education.map((edu) => (
                      <div
                        key={edu.id}
                        className="flex items-start justify-between bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <GraduationCap size={18} className="text-blue-500 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink dark:text-white">
                              {edu.school}
                            </p>
                            <p className="text-xs text-inkmuted dark:text-[#888] mt-0.5">
                              {edu.degree}
                              {edu.field ? `, ${edu.field}` : ""}
                            </p>
                            <p className="text-xs text-inkmuted dark:text-[#555] mt-0.5">
                              {edu.start_year}
                              {" - "}
                              {edu.is_current
                                ? "Present"
                                : edu.end_year || ""}
                              {edu.is_current ? " (expected)" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <EditBtn
                            onClick={() => openEdit("education", { ...edu })}
                          />
                          <DeleteBtn onClick={() => deleteEducation(edu.id)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="Add your educational background" icon={<GraduationCap size={28} className="text-inkmuted dark:text-[#444]" />} />
                  )}
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Title & Rate & Description */}
      <EditModal
        isOpen={editingSection === "title"}
        onClose={closeEdit}
        title="Edit Title, Rate & Description"
        onSave={() =>
          saveTitle(
            editData?.title,
            editData?.description,
            editData?.rate_hr
          )
        }
        wide
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Your Professional Title</p>
            <input
              value={editData?.title || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="e.g. Full Stack Developer | React & Node.js Expert"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Hourly Rate ($)</p>
            <input
              type="number"
              value={editData?.rate_hr || ""}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  rate_hr: e.target.value,
                }))
              }
              placeholder="20"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Description</p>
            <textarea
              value={editData?.description || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Write about your experience, skills, and what makes you unique..."
              rows={6}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </EditModal>

      {/* Name & Profile Photo */}
      <EditModal
        isOpen={editingSection === "name"}
        onClose={closeEdit}
        title="Edit Profile Info"
        onSave={() => saveName(editData?.name, editData?.picture)}
      >
        <div className="flex flex-col gap-5">
          {/* Avatar upload / preview */}
          <div>
            <p className={labelCls}>Profile Photo</p>
            <div className="flex items-center gap-4 mt-2 p-3 bg-[#f9f9f9] dark:bg-[#0d0d0d] border border-[#ddd] dark:border-[#222] rounded-xl">
              <div className="relative shrink-0">
                {editData?.picture ? (
                  <img
                    src={editData.picture}
                    alt="Preview"
                    className="h-16 w-16 rounded-full object-cover border-2 border-[#E65A1E]"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-[#E65A1E] flex items-center justify-center text-2xl font-bold text-white border-2 border-white dark:border-[#333] shadow-sm">
                    {(editData?.name || displayName || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      alert("Image size should be under 5MB");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setEditData((d) => ({ ...d, picture: ev.target.result }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1f1f1f] hover:bg-gray-100 dark:hover:bg-[#282828] border border-[#ddd] dark:border-[#333] text-xs font-semibold text-ink dark:text-white flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Upload size={13} className="text-[#E65A1E]" />
                    {editData?.picture ? "Change Photo" : "Upload Photo"}
                  </button>

                  {editData?.picture && (
                    <button
                      type="button"
                      onClick={() => {
                        if (photoInputRef.current) photoInputRef.current.value = "";
                        setEditData((d) => ({ ...d, picture: "" }));
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-500 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5 transition"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-inkmuted dark:text-[#777]">
                  Supports JPG, PNG, WebP up to 5MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className={labelCls}>Full Name</p>
            <input
              value={editData?.name || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Your full name"
              className={inputCls}
            />
          </div>
        </div>
      </EditModal>

      {/* Employment */}
      <EditModal
        isOpen={editingSection === "employment"}
        onClose={closeEdit}
        title={
          editData?.title
            ? "Edit Employment"
            : "Add Employment History"
        }
        onSave={() => saveEmployment(editData)}
        wide
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Title / Role</p>
            <input
              value={editData?.title || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="e.g. Web Developer"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Company</p>
            <input
              value={editData?.company || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, company: e.target.value }))
              }
              placeholder="e.g. Wan Architects"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelCls}>Start Date</p>
              <input
                type="month"
                value={editData?.start_date || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, start_date: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <p className={labelCls}>End Date</p>
              <input
                type="month"
                value={editData?.end_date || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, end_date: e.target.value }))
                }
                disabled={editData?.is_current}
                className={`${inputCls} disabled:opacity-40`}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink dark:text-[#ccc] cursor-pointer">
            <input
              type="checkbox"
              checked={editData?.is_current || false}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  is_current: e.target.checked,
                  end_date: e.target.checked ? "" : d.end_date,
                }))
              }
              className="accent-[#E65A1E]"
            />
            I currently work here
          </label>
          <div>
            <p className={labelCls}>Description</p>
            <textarea
              value={editData?.description || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Describe your responsibilities and achievements..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </EditModal>

      {/* Certification */}
      <EditModal
        isOpen={editingSection === "certification"}
        onClose={closeEdit}
        title="Add Certification"
        onSave={() => saveCertification(editData)}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Certification Name</p>
            <input
              value={editData?.name || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="e.g. AWS Certified Developer"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Issuing Organization</p>
            <input
              value={editData?.issuer || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, issuer: e.target.value }))
              }
              placeholder="e.g. Amazon Web Services"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Year</p>
            <input
              type="number"
              value={editData?.year || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, year: e.target.value }))
              }
              placeholder="2026"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Credential URL (optional)</p>
            <input
              value={editData?.url || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, url: e.target.value }))
              }
              placeholder="https://..."
              className={inputCls}
            />
          </div>
        </div>
      </EditModal>

      {/* Education */}
      <EditModal
        isOpen={editingSection === "education"}
        onClose={closeEdit}
        title="Add Education"
        onSave={() => saveEducation(editData)}
        wide
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>School / University</p>
            <input
              value={editData?.school || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, school: e.target.value }))
              }
              placeholder="e.g. RV College of Engineering"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Degree</p>
            <input
              value={editData?.degree || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, degree: e.target.value }))
              }
              placeholder="e.g. Bachelor of Engineering (BEng)"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Field of Study</p>
            <input
              value={editData?.field || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, field: e.target.value }))
              }
              placeholder="e.g. Business Engineering"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelCls}>Start Year</p>
              <input
                type="number"
                value={editData?.start_year || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, start_year: e.target.value }))
                }
                placeholder="2025"
                className={inputCls}
              />
            </div>
            <div>
              <p className={labelCls}>End Year</p>
              <input
                type="number"
                value={editData?.end_year || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, end_year: e.target.value }))
                }
                placeholder="2029"
                disabled={editData?.is_current}
                className={`${inputCls} disabled:opacity-40`}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink dark:text-[#ccc] cursor-pointer">
            <input
              type="checkbox"
              checked={editData?.is_current || false}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  is_current: e.target.checked,
                  end_year: e.target.checked ? "" : d.end_year,
                }))
              }
              className="accent-[#E65A1E]"
            />
            Currently studying here
          </label>
        </div>
      </EditModal>

      {/* Languages */}
      <EditModal
        isOpen={editingSection === "languages"}
        onClose={closeEdit}
        title="Edit Languages"
        onSave={() => saveLanguages(editData?.languages?.filter((l) => l.language.trim()) || [])}
      >
        <div className="flex flex-col gap-3">
          {(editData?.languages || []).map((lang, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={lang.language}
                onChange={(e) => {
                  const updated = [...editData.languages];
                  updated[i] = { ...updated[i], language: e.target.value };
                  setEditData((d) => ({ ...d, languages: updated }));
                }}
                placeholder="Language"
                className={`${inputCls} flex-1`}
              />
              <select
                value={lang.proficiency}
                onChange={(e) => {
                  const updated = [...editData.languages];
                  updated[i] = { ...updated[i], proficiency: e.target.value };
                  setEditData((d) => ({ ...d, languages: updated }));
                }}
                className={`${inputCls} flex-1`}
              >
                {PROFICIENCY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const updated = editData.languages.filter((_, j) => j !== i);
                  setEditData((d) => ({ ...d, languages: updated }));
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-500/10 transition shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setEditData((d) => ({
                ...d,
                languages: [
                  ...(d.languages || []),
                  { language: "", proficiency: "Conversational" },
                ],
              }));
            }}
            className="flex items-center gap-2 text-sm text-[#E65A1E] hover:text-[#F06B2E] transition font-semibold"
          >
            <Plus size={14} /> Add another language
          </button>
        </div>
      </EditModal>

      {/* Linked Accounts */}
      <EditModal
        isOpen={editingSection === "linked"}
        onClose={closeEdit}
        title="Linked Accounts"
        onSave={() =>
          saveLinkedAccounts(
            editData?.github_url,
            editData?.github_username,
            editData?.upwork_url
          )
        }
      >
        <div className="flex flex-col gap-5">
          <div className="p-4 rounded-lg bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222]">
            <div className="flex items-center gap-2 mb-3">
              <Github size={18} className="text-ink dark:text-white" />
              <span className="text-sm font-semibold text-ink dark:text-white">GitHub</span>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className={labelCls}>GitHub Profile URL</p>
                <input
                  value={editData?.github_url || ""}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, github_url: e.target.value }))
                  }
                  placeholder="https://github.com/yourusername"
                  className={inputCls}
                />
              </div>
              <div>
                <p className={labelCls}>GitHub Username</p>
                <input
                  value={editData?.github_username || ""}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      github_username: e.target.value,
                    }))
                  }
                  placeholder="yourusername"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222]">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E65A1E] text-white text-[10px] font-bold">
                U
              </span>
              <span className="text-sm font-semibold text-ink dark:text-white">Upwork</span>
            </div>
            <div>
              <p className={labelCls}>Upwork Profile URL</p>
              <input
                value={editData?.upwork_url || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, upwork_url: e.target.value }))
                }
                placeholder="https://www.upwork.com/freelancers/~yourid"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </EditModal>

      {/* Availability */}
      <EditModal
        isOpen={editingSection === "availability"}
        onClose={closeEdit}
        title="Set Availability"
        onSave={() =>
          saveAvailability(editData?.hours_per_week, editData?.availability)
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Hours per week</p>
            <select
              value={editData?.hours_per_week || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, hours_per_week: e.target.value }))
              }
              className={inputCls}
            >
              <option value="Less than 10 hrs/week">Less than 10 hrs/week</option>
              <option value="10-20 hrs/week">10-20 hrs/week</option>
              <option value="20-30 hrs/week">20-30 hrs/week</option>
              <option value="More than 30 hrs/week">More than 30 hrs/week</option>
            </select>
          </div>
          <div>
            <p className={labelCls}>Availability</p>
            <select
              value={editData?.availability || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, availability: e.target.value }))
              }
              className={inputCls}
            >
              <option value="Open to contract to hire">Open to contract to hire</option>
              <option value="Open to short-term projects">Open to short-term projects</option>
              <option value="Open to long-term projects">Open to long-term projects</option>
              <option value="Not available">Not available</option>
            </select>
          </div>
        </div>
      </EditModal>

      {/* Portfolio Add */}
      <EditModal
        isOpen={editingSection === "portfolio-add"}
        onClose={closeEdit}
        title="Add Portfolio Item"
        onSave={() => {
          if (editData?.title) addPortfolioItem(editData);
        }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Project Title</p>
            <input
              value={editData?.title || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...(d || {}), title: e.target.value }))
              }
              placeholder="e.g. Brand Redesign"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Description (optional)</p>
            <textarea
              value={editData?.description || ""}
              onChange={(e) =>
                setEditData((d) => ({
                  ...(d || {}),
                  description: e.target.value,
                }))
              }
              placeholder="Brief description of the project..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <p className={labelCls}>Project Image</p>
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[#ddd] dark:border-[#333] rounded-lg cursor-pointer hover:border-[#E65A1E] transition bg-[#f9f9f9] dark:bg-[#1a1a1a]">
              {editData?.image_data ? (
                <img
                  src={editData.image_data}
                  alt="Preview"
                  className="h-full w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <Plus size={24} className="text-inkmuted dark:text-[#555] mx-auto mb-2" />
                  <p className="text-xs text-inkmuted dark:text-[#555]">Click to upload image</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setEditData((d) => ({
                      ...(d || {}),
                      image_data: reader.result,
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
        </div>
      </EditModal>

      {/* ═══════════ TOP RIGHT SLIDE-OVER DRAWER MENU ═══════════ */}
      {menuDrawerOpen && (
        <div
          data-testid="profile-menu-drawer-backdrop"
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenuDrawerOpen(false);
          }}
        >
          <div
            data-testid="profile-menu-drawer"
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
                    <h3 className="text-base font-bold text-ink dark:text-white">Menu & Settings</h3>
                    <p className="text-[11px] text-inkmuted dark:text-[#777]">Account, platform links & preferences</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuDrawerOpen(false)}
                  data-testid="profile-menu-drawer-close"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ddd] dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-inkmuted dark:text-[#888] hover:text-ink dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252525] transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* PRO PROFILE SETTINGS (Phone & Skill) */}
              <div className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl p-4" data-testid="pro-profile-card">
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase size={14} className="text-[#E65A1E]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">PRO PROFILE</span>
                </div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-inkmuted dark:text-[#888]">
                  Phone Number (shown to employers after unlock)
                </label>
                <input
                  data-testid="pro-phone-input"
                  value={proPhone}
                  onChange={(e) => setProPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full mt-1 bg-white dark:bg-[#111] border border-[#ddd] dark:border-[#333] rounded-lg px-3 py-2 text-sm text-ink dark:text-white placeholder:text-[#999] dark:placeholder:text-[#555] focus:outline-none focus:border-[#E65A1E] transition"
                />

                <label className="text-[10px] font-bold uppercase tracking-wider text-inkmuted dark:text-[#888] mt-3 block">
                  Primary Skill
                </label>
                <input
                  data-testid="pro-skill-input"
                  value={proSkill}
                  onChange={(e) => setProSkill(e.target.value)}
                  placeholder="e.g. Full Stack Pro"
                  className="w-full mt-1 bg-white dark:bg-[#111] border border-[#ddd] dark:border-[#333] rounded-lg px-3 py-2 text-sm text-ink dark:text-white placeholder:text-[#999] dark:placeholder:text-[#555] focus:outline-none focus:border-[#E65A1E] transition"
                />

                {proSaveMsg && (
                  <p
                    data-testid="pro-save-msg"
                    className="text-xs font-bold mt-2"
                    style={{ color: proSaveMsg.ok ? "#00A86B" : "#FF4D5A" }}
                  >
                    {proSaveMsg.text}
                  </p>
                )}

                <button
                  data-testid="pro-save-btn"
                  disabled={proSaving}
                  onClick={saveProDetails}
                  className="w-full mt-3 flex items-center justify-center bg-ink text-white dark:bg-white dark:text-black py-2.5 rounded-lg text-xs font-extrabold tracking-wider hover:bg-[#E65A1E] hover:text-white transition disabled:opacity-50"
                >
                  {proSaving ? <Loader2 size={16} className="animate-spin" /> : "SAVE PRO DETAILS"}
                </button>
              </div>

              {/* Escrow Wallet Quick Access */}
              <div className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF3C4] text-black">
                    <Wallet size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink dark:text-white">Escrow Wallet & Payouts</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#777]">Milestones & UPI withdrawal</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setWalletOpen(true);
                    setMenuDrawerOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-ink text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-[#E65A1E] hover:text-white transition"
                >
                  OPEN
                </button>
              </div>

              {/* Platform Navigation Cards */}
              <div className="flex flex-col gap-2">
                {user?.is_admin && (
                  <button
                    onClick={() => {
                      nav("/admin");
                      setMenuDrawerOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#1a1a1a] p-3 text-left transition hover:bg-gray-100 dark:hover:bg-[#252525] hover:border-[#E65A1E]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#222] text-[#E65A1E] shadow-sm">
                      <Shield size={18} />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-ink dark:text-white">Admin Dashboard</p>
                      <p className="text-[10px] text-inkmuted dark:text-[#777]">Users, payments, complaints & coupons</p>
                    </div>
                    <ChevronRight size={16} className="text-inkmuted dark:text-[#666]" />
                  </button>
                )}

                {navMenuItems.map((m) => (
                  <button
                    key={m.label}
                    data-testid={m.testID}
                    onClick={() => {
                      nav(m.to);
                      setMenuDrawerOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-[#e5e5e5] dark:border-[#2a2a2a] bg-[#f9f9f9] dark:bg-[#1a1a1a] p-3 text-left transition hover:bg-gray-100 dark:hover:bg-[#252525] hover:border-[#E65A1E]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#111] text-[#E65A1E] shadow-sm">
                      <m.icon size={18} />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-ink dark:text-white">{m.label}</p>
                      <p className="text-[10px] text-inkmuted dark:text-[#777]">{m.sub}</p>
                    </div>
                    <ChevronRight size={16} className="text-inkmuted dark:text-[#666]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#222] mt-4 flex flex-col gap-3">
              {user && (
                <button
                  data-testid="profile-drawer-logout-btn"
                  onClick={async () => {
                    await logout();
                    setMenuDrawerOpen(false);
                    nav("/");
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600/10 border border-red-500/20 py-3 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-600 hover:text-white transition"
                >
                  <LogOut size={16} /> LOG OUT
                </button>
              )}
              <p className="text-center text-[10px] text-inkmuted dark:text-[#666]">WorkHop v2 · Made in Bengaluru 🧡</p>
            </div>
          </div>
        </div>
      )}

      {/* Escrow Wallet Modal */}
      <EscrowWalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />

      {/* Credits / Connects Top Up & Subscription Modal */}
      <CreditsTopUpModal
        isOpen={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        freelancerId={freelancerId}
        onWalletUpdated={(w) => {
          setCreditsWallet(w);
          setCreditTxs(getCreditTransactions(freelancerId));
        }}
      />

      {/* Credit Transactions History Modal */}
      {txHistoryOpen && (
        <div
          data-testid="credit-tx-history-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTxHistoryOpen(false);
          }}
        >
          <div
            data-testid="credit-tx-history-modal"
            className="w-full max-w-lg border-2 border-ink bg-white p-6 shadow-[6px_6px_0px_#121212] dark:border-white dark:bg-[#141414] max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b-2 border-ink pb-4 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-[#FFF3C4] text-[#E65A1E]">
                  <History size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black uppercase text-ink dark:text-white">Credits Transaction History</h3>
                  <p className="text-xs text-inkmuted dark:text-stone-400">Balance: <strong className="text-ink dark:text-white">{creditsWallet.balance} credits</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTxHistoryOpen(false)}
                className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white font-black hover:bg-stone-200 dark:bg-stone-800 dark:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {creditTxs && creditTxs.length > 0 ? (
                creditTxs.map((tx) => {
                  const isPositive = tx.amount > 0;
                  const typeLabel = {
                    purchase: "Packs Purchase",
                    subscription: "Monthly Subscription",
                    spend: "Job Application",
                    boost: "Proposal Boost",
                  }[tx.type] || tx.type.toUpperCase();

                  return (
                    <div
                      key={tx.id}
                      className="border-2 border-ink/40 bg-stone-50 dark:bg-stone-900/60 p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase border border-ink ${
                            tx.type === "boost"
                              ? "bg-[#FFF3C4] text-ink"
                              : tx.type === "subscription"
                              ? "bg-brand text-white"
                              : tx.type === "purchase"
                              ? "bg-ok text-white"
                              : "bg-stone-200 text-ink dark:bg-stone-800 dark:text-white"
                          }`}>
                            {typeLabel}
                          </span>
                          <span className="text-[10px] text-inkmuted dark:text-stone-400">
                            {new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="mt-1 font-bold text-ink dark:text-white truncate">
                          {tx.description || (tx.related_job_id ? `Job Ref: ${tx.related_job_id}` : "Account adjustment")}
                        </p>
                        <p className="text-[10px] text-inkmuted dark:text-stone-400">
                          Balance after: {tx.balance_after} credits
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black ${isPositive ? "text-ok" : "text-bad"}`}>
                          {isPositive ? `+${tx.amount}` : tx.amount} credits
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-inkmuted dark:text-stone-400">
                  <Coins size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-xs">No credit transactions yet</p>
                  <p className="text-[11px]">Credits spent on applications or acquired will appear here.</p>
                </div>
              )}
            </div>

            <div className="border-t-2 border-ink pt-3 flex gap-2 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setTxHistoryOpen(false);
                  setCreditsModalOpen(true);
                }}
                className="flex-1 border-2 border-ink bg-brand py-2 text-xs font-black text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212]"
              >
                + TOP UP CREDITS
              </button>
              <button
                type="button"
                onClick={() => setTxHistoryOpen(false)}
                className="border-2 border-ink bg-white dark:bg-stone-800 px-4 py-2 text-xs font-black text-ink dark:text-white hover:bg-stone-100"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ═══════════ sub-components ═══════════ */

function SectionHeader({ title, onAdd, onEdit, expanded, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-ink dark:text-white">{title}</h2>
        {onToggle && (
          <button
            onClick={onToggle}
            className="h-6 w-6 rounded-full flex items-center justify-center text-inkmuted dark:text-[#666] hover:text-ink dark:hover:text-white transition"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onEdit && <EditBtn onClick={onEdit} />}
        {onAdd && (
          <button
            onClick={onAdd}
            className="h-8 w-8 rounded-full flex items-center justify-center text-[#E65A1E] hover:bg-[#E65A1E]/10 transition"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function SidebarSection({ icon, title, children, onEdit, onAdd }) {
  return (
    <div className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#E65A1E]">{icon}</span>
          <h3 className="text-sm font-semibold text-ink dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && <EditBtn onClick={onEdit} size={14} />}
          {onAdd && (
            <button
              onClick={onAdd}
              className="h-6 w-6 rounded-full flex items-center justify-center text-[#E65A1E] hover:bg-[#E65A1E]/10 transition"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function HistoryCard({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const formatDate = (d) => {
    if (!d) return "";
    const [y, m] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m, 10) - 1] || ""} ${y}`;
  };

  return (
    <div className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#E65A1E]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Briefcase size={18} className="text-[#E65A1E]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">
              {entry.title}
              {entry.company ? ` | ${entry.company}` : ""}
            </p>
            <p className="text-xs text-[#E65A1E] font-medium mt-0.5">
              {formatDate(entry.start_date)}
              {" - "}
              {entry.is_current ? "Present" : formatDate(entry.end_date)}
            </p>
            {entry.description && (
              <p className={`text-xs text-inkmuted dark:text-[#888] mt-2 leading-relaxed ${!expanded && entry.description.length > 200 ? "line-clamp-2" : ""}`}>
                {entry.description}
              </p>
            )}
            {entry.description && entry.description.length > 200 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-[#E65A1E] mt-1 hover:underline font-medium"
              >
                {expanded ? "less" : "more"}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <EditBtn onClick={onEdit} />
          <DeleteBtn onClick={onDelete} />
        </div>
      </div>
    </div>
  );
}

function EditBtn({ onClick, size = 16 }) {
  return (
    <button
      onClick={onClick}
      className="h-8 w-8 rounded-full flex items-center justify-center text-[#E65A1E] hover:bg-[#E65A1E]/10 transition"
    >
      <Pencil size={size} />
    </button>
  );
}

function DeleteBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-8 w-8 rounded-full flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-500/10 transition"
    >
      <Trash2 size={14} />
    </button>
  );
}

function EmptyState({ text, icon }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      {icon || <Plus size={28} className="text-[#333] mb-2" />}
      <p className="text-sm text-[#555] mt-2">{text}</p>
    </div>
  );
}
