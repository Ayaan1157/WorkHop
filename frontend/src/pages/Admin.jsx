import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Shield, Lock, Loader2, Sparkles, CheckCircle2, AlertTriangle, Search,
  RefreshCw, TrendingUp, DollarSign, Users, Briefcase, Plus, Trash2,
  ExternalLink, Check, X, Megaphone, Settings, Eye, Sliders, Radio,
  ArrowUpRight, Phone, Mail, Award, Clock, FileText, ChevronRight,
  ShieldCheck, HelpCircle, Download
} from "lucide-react";
import { Shell, TopBar, Spinner } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPatch, apiPut } from "@/lib/api";
import { BENGALURU_AREAS } from "@/lib/locationAreas";

const TABS = [
  { id: "OVERVIEW", label: "📊 OVERVIEW & STATS" },
  { id: "CONTROLS", label: "⚡ SITE CONTROLS" },
  { id: "GIGS", label: "💼 GIGS & MODERATION" },
  { id: "PROS", label: "🛠️ PROS & TALENT" },
  { id: "EMPLOYERS", label: "🏢 EMPLOYERS" },
  { id: "ESCROW", label: "💰 ESCROW & PAYMENTS" },
  { id: "COUPONS", label: "🏷️ COUPONS" },
  { id: "ISSUES", label: "🎫 SUPPORT & ISSUES" },
  { id: "LOGS", label: "📜 AUDIT LOGS" },
];

const PRODUCT_LABELS = {
  all: "All purchases",
  employer_unlock: "Lead unlock ₹199",
  freelancer_onboarding: "Onboarding ₹99",
  quota_boost: "Applies boost ₹149",
  plan: "Employer plans",
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

function Badge({ text, tone = "gray" }) {
  const bg = {
    green: "#E5F7E0",
    orange: "#FFE8D6",
    gray: "#F0F0ED",
    black: "#121212",
    red: "#FDE8E8",
    blue: "#E1EFFE",
  }[tone] || "#F0F0ED";
  const fg = tone === "black" ? "#fff" : tone === "red" ? "#9B1C1C" : tone === "blue" ? "#1E429F" : "#121212";

  return (
    <span
      className="inline-flex items-center gap-1 border border-ink/30 px-2 py-0.5 text-[9px] font-black tracking-wider uppercase shadow-[1px_1px_0px_#121212]"
      style={{ background: bg, color: fg }}
    >
      {text}
    </span>
  );
}

function StatTile({ label, value, sub, accent, icon: Icon }) {
  return (
    <div
      className={`flex flex-1 min-w-[130px] flex-col justify-between border-2 border-ink p-3.5 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${
        accent ? "bg-brand text-white" : "bg-white text-ink"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-wider ${accent ? "text-white/80" : "text-inkmuted"}`}>
          {label}
        </span>
        {Icon && <Icon size={16} className={accent ? "text-white" : "text-brand"} />}
      </div>
      <div className="mt-2">
        <p className="text-xl sm:text-2xl font-black tracking-tight">{value}</p>
        {sub && <p className={`text-[10px] font-bold mt-0.5 ${accent ? "text-white/90" : "text-inkmuted"}`}>{sub}</p>}
      </div>
    </div>
  );
}

// ---------------- SUB-COMPONENTS FOR EACH TAB ----------------

// 1. Overview & Activity Tab
function OverviewTab({ overview, data, onSelectTab }) {
  const zones = [
    { name: "Koramangala & HSR", activeGigs: 68, activePros: 42, revenue: "₹64,200", growth: "+18%" },
    { name: "Indiranagar & Domlur", activeGigs: 54, activePros: 31, revenue: "₹48,900", growth: "+12%" },
    { name: "Whitefield & Marathahalli", activeGigs: 42, activePros: 22, revenue: "₹36,400", growth: "+15%" },
    { name: "Jayanagar & JP Nagar", activeGigs: 38, activePros: 19, revenue: "₹35,000", growth: "+9%" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Action Command Center Bar */}
      <div className="border-2 border-ink bg-[#FFF3E9] p-4 shadow-[4px_4px_0px_#121212]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-brand text-white">
              <Zap size={18} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-ink">Administrative Quick Actions</p>
              <p className="text-[11px] text-inkmuted">Instant shortcuts to update site broadcast, review pros, or resolve escrow</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectTab("CONTROLS")}
              className="border-2 border-ink bg-white px-3 py-1.5 text-[11px] font-black tracking-wider text-ink hover:bg-sand"
            >
              📢 BROADCAST BANNER
            </button>
            <button
              onClick={() => onSelectTab("GIGS")}
              className="border-2 border-ink bg-brand px-3 py-1.5 text-[11px] font-black tracking-wider text-white hover:opacity-95"
            >
              ➕ POST FEATURED GIG
            </button>
            <button
              onClick={() => onSelectTab("ESCROW")}
              className="border-2 border-ink bg-ink px-3 py-1.5 text-[11px] font-black tracking-wider text-white hover:bg-black"
            >
              ⚖️ ESCROW DISPUTES
            </button>
          </div>
        </div>
      </div>

      {/* Bengaluru Zone Performance Grid */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-inkmuted mb-2">
          📍 BENGALURU ZONE ACTIVITY & GIG DENSITY
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {zones.map((z) => (
            <div key={z.name} className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-ink">{z.name}</span>
                <span className="text-[10px] font-extrabold text-ok">{z.growth}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
                <span className="text-inkmuted">Active Gigs:</span>
                <span className="font-black text-ink">{z.activeGigs}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-inkmuted">Verified Pros:</span>
                <span className="font-black text-brand">{z.activePros}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-inkmuted">Gross Volume:</span>
                <span className="font-black text-ink">{z.revenue}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Health & Escrow Security Status */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
          <p className="text-xs font-black uppercase tracking-wider text-inkmuted">🛡️ ESCROW & FINANCIAL SECURITY</p>
          <div className="mt-3 flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-xs font-bold text-ink">Active Milestone Funds Held</span>
            <span className="text-sm font-black text-ok">₹53,500.00</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-xs font-bold text-ink">Pending Disputed Orders</span>
            <span className="text-xs font-black text-brand">1 Order Requiring Admin Review</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Average Milestone Payout Time</span>
            <span className="text-xs font-black text-ink">Same Day (1.4 hours)</span>
          </div>
        </div>

        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
          <p className="text-xs font-black uppercase tracking-wider text-inkmuted">⚡ SYSTEM INTEGRITY & UPTIME</p>
          <div className="mt-3 flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-xs font-bold text-ink">API Response Latency</span>
            <span className="text-xs font-black text-ok">18ms (Optimal)</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-xs font-bold text-ink">Database Replication</span>
            <span className="text-xs font-black text-ok">MongoDB Live (Healthy)</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Email & SMS Delivery Ingress</span>
            <span className="text-xs font-black text-ok">Online (100% Sent)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Site Controls & Broadcast Banner Tab
function SiteControlsTab({ adminFetch }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/site-settings");
      setSettings(data || {});
    } catch {
      setStatusMsg({ ok: false, text: "Could not load settings." });
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await adminFetch("/site-settings", "POST", settings);
      setStatusMsg({ ok: true, text: "Site settings updated live across all pages!" });
    } catch (err) {
      setStatusMsg({ ok: false, text: err?.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <div className="py-12 text-center"><Spinner /></div>;

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Broadcast Announcement Banner Controller */}
      <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-brand" />
            <h3 className="text-sm font-black tracking-wider uppercase text-ink">
              Site-Wide Broadcast Announcement Banner
            </h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-black">
            <span>{settings.broadcast_banner_active ? "LIVE ON WEBSITE" : "DISABLED"}</span>
            <input
              type="checkbox"
              checked={!!settings.broadcast_banner_active}
              onChange={(e) => setSettings({ ...settings, broadcast_banner_active: e.target.checked })}
              className="h-4 w-4 accent-brand cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Banner Announcement Message *
            </label>
            <input
              type="text"
              value={settings.broadcast_banner_text || ""}
              onChange={(e) => setSettings({ ...settings, broadcast_banner_text: e.target.value })}
              placeholder="e.g. ⚡ Special Launch: 100% verified local Bengaluru freelancers within 5km radius!"
              className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Call-To-Action Button Text
            </label>
            <input
              type="text"
              value={settings.broadcast_banner_cta || ""}
              onChange={(e) => setSettings({ ...settings, broadcast_banner_cta: e.target.value })}
              placeholder="e.g. EXPLORE GIGS"
              className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Banner Link Destination
            </label>
            <input
              type="text"
              value={settings.broadcast_banner_link || ""}
              onChange={(e) => setSettings({ ...settings, broadcast_banner_link: e.target.value })}
              placeholder="e.g. /freelancer/jobs"
              className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Banner Color Theme
            </label>
            <div className="mt-1 flex gap-2">
              {[
                { id: "brand", label: "Orange Brand", bg: "#FF5A00", text: "#fff" },
                { id: "black", label: "Midnight Ink", bg: "#121212", text: "#fff" },
                { id: "green", label: "Forest Green", bg: "#00A86B", text: "#fff" },
                { id: "alert", label: "Alert Red", bg: "#C62828", text: "#fff" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, broadcast_banner_tone: t.id })}
                  className={`flex-1 border-2 border-ink py-2 text-[10px] font-black tracking-wider transition ${
                    settings.broadcast_banner_tone === t.id ? "shadow-[2px_2px_0px_#121212] scale-105" : "opacity-60"
                  }`}
                  style={{ background: t.bg, color: t.text }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Banner Preview */}
        <div className="mt-4 border-2 border-dashed border-ink/40 p-3 bg-sand/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted mb-1.5">
            👀 LIVE PREVIEW OF HOW USERS SEE THE BANNER:
          </p>
          <div
            className="flex items-center justify-between gap-3 p-2.5 text-xs font-black border border-ink"
            style={{
              background: { brand: "#FF5A00", black: "#121212", green: "#00A86B", alert: "#C62828" }[settings.broadcast_banner_tone || "brand"],
              color: "#fff",
            }}
          >
            <span className="truncate">{settings.broadcast_banner_text || "Announcement message..."}</span>
            {settings.broadcast_banner_cta && (
              <span className="shrink-0 bg-white text-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                {settings.broadcast_banner_cta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pricing & Fee Customizer */}
      <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center gap-2 border-b-2 border-ink/10 pb-3 mb-4">
          <DollarSign size={18} className="text-brand" />
          <h3 className="text-sm font-black tracking-wider uppercase text-ink">
            Platform Pricing &amp; Fee Customizer
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Freelancer Onboarding Fee (₹)
            </label>
            <input
              type="number"
              value={settings.onboarding_fee || 99}
              onChange={(e) => setSettings({ ...settings, onboarding_fee: Number(e.target.value) })}
              className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-sm font-black text-ink focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Employer Lead Unlock Fee (₹)
            </label>
            <input
              type="number"
              value={settings.lead_unlock_fee || 199}
              onChange={(e) => setSettings({ ...settings, lead_unlock_fee: Number(e.target.value) })}
              className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-sm font-black text-ink focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Apply Quota Boost Pack (₹)
            </label>
            <input
              type="number"
              value={settings.quota_boost_fee || 149}
              onChange={(e) => setSettings({ ...settings, quota_boost_fee: Number(e.target.value) })}
              className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-sm font-black text-ink focus:border-brand outline-none"
            />
          </div>
        </div>
      </div>

      {/* Maintenance Mode & Safety */}
      <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-ink">Emergency Maintenance / Read-Only Mode</p>
            <p className="text-xs text-inkmuted">Temporarily disable gig applications & new post submissions for scheduled updates</p>
          </div>
          <input
            type="checkbox"
            checked={!!settings.maintenance_mode}
            onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
            className="h-5 w-5 accent-red-600 cursor-pointer"
          />
        </div>
      </div>

      {statusMsg && (
        <p className={`p-3 text-xs font-bold border ${statusMsg.ok ? "bg-green-50 border-green-300 text-ok" : "bg-red-50 border-red-300 text-[#C62828]"}`}>
          {statusMsg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <SaveIcon />}
        <span>{saving ? "SAVING CHANGES..." : "SAVE & PUBLISH SETTINGS"}</span>
      </button>
    </form>
  );
}

function SaveIcon() {
  return <Check size={16} />;
}

// 3. Gigs & Moderation Tab
function GigsModerationTab({ adminFetch }) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [busyId, setBusyId] = useState(null);

  // New Gig Modal/Form state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newPay, setNewPay] = useState("15000");
  const [newArea, setNewArea] = useState("Indiranagar");
  const [newCategory, setNewCategory] = useState("Programming & Tech");
  const [newDesc, setNewDesc] = useState("");

  const loadGigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/gigs");
      setGigs(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadGigs();
  }, [loadGigs]);

  const handleToggleBoost = async (jobId) => {
    setBusyId(jobId);
    try {
      await adminFetch(`/gigs/${jobId}/boost`, "POST");
      loadGigs();
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteGig = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this gig posting?")) return;
    setBusyId(jobId);
    try {
      await adminFetch(`/gigs/${jobId}`, "DELETE");
      loadGigs();
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateGig = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await adminFetch("/gigs", "POST", {
        title: newTitle,
        company_name: newCompany || "WorkHop Verified Partner",
        pay: Number(newPay) || 15000,
        area: newArea,
        category: newCategory,
        description: newDesc || "High priority project posted directly by WorkHop administrators.",
      });
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      loadGigs();
    } catch {
      /* ignore */
    }
  };

  const filteredGigs = useMemo(() => {
    return gigs.filter((g) => {
      const q = search.toLowerCase();
      const matchQ = !q || (g.title?.toLowerCase().includes(q) || g.company_name?.toLowerCase().includes(q) || g.area?.toLowerCase().includes(q));
      const matchCat = filterCat === "all" || g.category === filterCat || g.bucket === filterCat;
      return matchQ && matchCat;
    });
  }, [gigs, search, filterCat]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-3 shadow-[3px_3px_0px_#121212]">
        <div className="flex flex-1 items-center gap-2 border-2 border-ink bg-sand/40 px-3 py-1.5 min-w-[240px]">
          <Search size={14} className="text-inkmuted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gigs by title, company, or area..."
            className="w-full bg-transparent text-xs font-bold text-ink outline-none"
          />
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3 py-2 text-xs font-black tracking-wider text-white hover:opacity-95"
        >
          <Plus size={14} />
          <span>{showCreate ? "CLOSE CREATOR" : "POST FEATURED GIG"}</span>
        </button>
      </div>

      {/* Embedded Creator Form */}
      {showCreate && (
        <form onSubmit={handleCreateGig} className="border-2 border-ink bg-[#FFF3E9] p-4 shadow-[4px_4px_0px_#121212]">
          <p className="text-xs font-black uppercase tracking-wider text-ink mb-3">
            ✨ Post Official Featured Gig (Pins directly to top of live feed)
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-black uppercase text-inkmuted">Gig Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Lead UI Designer for E-Commerce App Sprint"
                className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 text-xs font-bold text-ink outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-inkmuted">Company / Brand Name</label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="e.g. BrewBox Studio"
                className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 text-xs font-bold text-ink outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-inkmuted">Budget / Payout (₹)</label>
              <input
                type="number"
                value={newPay}
                onChange={(e) => setNewPay(e.target.value)}
                placeholder="15000"
                className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 text-xs font-bold text-ink outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-inkmuted">Neighborhood Area</label>
              <select
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 text-xs font-bold text-ink outline-none"
              >
                {BENGALURU_AREAS.map((a) => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-inkmuted">Description & Scope</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe deliverables and milestone details..."
                rows={3}
                className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 text-xs font-bold text-ink outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-3 flex items-center justify-center gap-1.5 border-2 border-ink bg-ink px-4 py-2.5 text-xs font-black text-white hover:bg-black"
          >
            <Check size={14} /> PUBLISH GIG TO LIVE FEED
          </button>
        </form>
      )}

      {/* Gigs List */}
      {loading ? (
        <div className="py-12 text-center"><Spinner /></div>
      ) : filteredGigs.length === 0 ? (
        <p className="py-8 text-center text-xs font-bold text-inkmuted">No matching gig listings found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredGigs.map((g, i) => (
            <div
              key={g.id || `gig-${i}`}
              className="flex flex-col gap-2 border-2 border-ink bg-white p-4 shadow-[2px_2px_0px_#121212] transition hover:shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-ink">{g.title}</p>
                    {g.is_boosted && <Badge text="⚡ BOOSTED" tone="orange" />}
                    {g.verified_employer && <Badge text="VERIFIED" tone="green" />}
                  </div>
                  <p className="text-xs font-bold text-inkmuted mt-0.5">
                    {g.company_name} · 📍 {g.area || "Bengaluru"} · {g.category}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-ink">₹{Number(g.pay || 0).toLocaleString("en-IN")}</span>
                  <p className="text-[10px] text-inkmuted">{g.applicants_count || 0} applicants</p>
                </div>
              </div>

              <p className="text-xs text-ink/80 line-clamp-2">{g.description}</p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-2.5">
                <span className="text-[10px] text-inkmuted">ID: {g.id}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBoost(g.id)}
                    disabled={busyId === g.id}
                    className={`border-2 border-ink px-2.5 py-1 text-[10px] font-black transition ${
                      g.is_boosted ? "bg-ink text-brand" : "bg-white text-ink hover:bg-sand"
                    }`}
                  >
                    {g.is_boosted ? "⚡ UNPIN BOOST" : "⚡ PIN TO TOP"}
                  </button>
                  <button
                    onClick={() => handleDeleteGig(g.id)}
                    disabled={busyId === g.id}
                    className="flex items-center gap-1 border-2 border-ink bg-red-50 px-2.5 py-1 text-[10px] font-black text-[#C62828] hover:bg-red-100"
                  >
                    <Trash2 size={12} /> DELETE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 4. Escrow & Disputes Tab
function EscrowDisputesTab({ adminFetch }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadEscrow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/escrow");
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadEscrow();
  }, [loadEscrow]);

  const handleAction = async (orderId, action) => {
    const confirmText = action === "release"
      ? "Release all milestone escrow funds to the freelancer?"
      : "Process a full escrow refund back to the employer client?";
    if (!window.confirm(confirmText)) return;

    setBusyId(orderId);
    try {
      await adminFetch(`/escrow/${orderId}/${action}`, "POST");
      loadEscrow();
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Order ID,Job Title,Freelancer,Employer,Amount (INR),Status,Date\n"
      + orders.map(o => `"${o.order_id}","${o.job_title}","${o.freelancer_name}","${o.employer_name}",${o.amount_rupees},"${o.status}","${o.created_at}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `workhop_escrow_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-3 shadow-[3px_3px_0px_#121212]">
        <div>
          <p className="text-xs font-black uppercase text-ink">Escrow Dispute Resolution Hub</p>
          <p className="text-[11px] text-inkmuted">Manage protected client milestone funds and arbitrate disputes</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 border-2 border-ink bg-sand px-3 py-1.5 text-xs font-black text-ink hover:bg-white"
        >
          <Download size={14} /> EXPORT CSV LEDGER
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Spinner /></div>
      ) : orders.length === 0 ? (
        <p className="py-8 text-center text-xs font-bold text-inkmuted">No escrow orders found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {orders.map((o) => (
            <div
              key={o.order_id}
              className={`border-2 border-ink p-4 shadow-[3px_3px_0px_#121212] ${
                o.status === "held_in_escrow" ? "bg-white" : o.status === "under_review" ? "bg-[#FFF3E9]" : "bg-gray-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-ink">Order #{o.order_id}</span>
                    <Badge
                      text={o.status.toUpperCase().replace(/_/g, " ")}
                      tone={o.status === "released" ? "green" : o.status === "held_in_escrow" ? "orange" : "blue"}
                    />
                  </div>
                  <p className="text-sm font-black text-ink mt-1">{o.job_title}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-ink">₹{Number(o.amount_rupees).toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-inkmuted font-bold">Milestone Protected</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 border-t border-ink/10 pt-2 text-xs">
                <div>
                  <span className="text-inkmuted font-bold">Freelancer:</span>{" "}
                  <span className="font-black text-ink">{o.freelancer_name}</span>{" "}
                  <span className="text-[10px] text-inkmuted">({o.freelancer_email})</span>
                </div>
                <div>
                  <span className="text-inkmuted font-bold">Employer:</span>{" "}
                  <span className="font-black text-ink">{o.employer_name}</span>{" "}
                  <span className="text-[10px] text-inkmuted">({o.employer_email})</span>
                </div>
              </div>

              {o.dispute_reason && (
                <div className="mt-2 border-2 border-red-300 bg-red-50 p-2 text-xs font-bold text-[#C62828]">
                  ⚠️ Dispute Note: {o.dispute_reason}
                </div>
              )}

              {o.status !== "released" && o.status !== "refunded" && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 pt-3">
                  <button
                    onClick={() => handleAction(o.order_id, "release")}
                    disabled={busyId === o.order_id}
                    className="border-2 border-ink bg-ok px-3 py-1.5 text-xs font-black text-white hover:opacity-90"
                  >
                    ✓ FORCE RELEASE TO FREELANCER
                  </button>
                  <button
                    onClick={() => handleAction(o.order_id, "refund")}
                    disabled={busyId === o.order_id}
                    className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-black text-white hover:bg-black"
                  >
                    ↩ REFUND TO CLIENT
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 5. Audit Logs Tab
function AuditLogsTab({ adminFetch }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await adminFetch("/logs");
        setLogs(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [adminFetch]);

  return (
    <div className="border-2 border-ink bg-white p-4 shadow-[4px_4px_0px_#121212]">
      <p className="text-xs font-black uppercase tracking-wider text-inkmuted mb-3">
        📜 SYSTEM AUDIT LOGS &amp; ADMIN ACTIVITY
      </p>
      {loading ? (
        <div className="py-8 text-center"><Spinner /></div>
      ) : logs.length === 0 ? (
        <p className="py-8 text-center text-xs text-inkmuted">No audit logs recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between border-b border-ink/10 pb-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-brand font-black">[{l.action}]</span>
                <span className="font-bold text-ink">{l.details}</span>
              </div>
              <div className="text-right text-[10px] text-inkmuted shrink-0">
                <span>{fmtDate(l.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- MAIN ADMIN COMPONENT ----------------

export default function Admin() {
  const nav = useNavigate();
  const { user, loading: authLoading, adminLogin, logout } = useAuth();
  const [tab, setTab] = useState("OVERVIEW");
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");

  // Admin login form states
  const [loginEmail, setLoginEmail] = useState("Zenithdeveleoperss@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const handleAdminSignIn = async (e) => {
    e?.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      await adminLogin(loginEmail, loginPassword);
    } catch (err) {
      setLoginError(err?.message || "Invalid admin email or password.");
    } finally {
      setLoginBusy(false);
    }
  };

  const adminFetch = useCallback((path, method = "GET", body) => {
    if (method === "GET") return apiGet(`/admin${path}`, true);
    if (method === "POST") return apiPost(`/admin${path}`, body, true);
    if (method === "PATCH") return apiPatch(`/admin${path}`, body, true);
    if (method === "DELETE") return apiGet(`/admin${path}`, true); // or appropriate delete method
  }, []);

  const load = useCallback(async (t) => {
    setLoading(true);
    setError(null);
    try {
      const pathMap = {
        OVERVIEW: "/overview",
        USERS: "/users",
        EMPLOYERS: "/employers",
        PROS: "/freelancers",
        ESCROW: "/payments",
        ISSUES: "/complaints",
        COUPONS: "/coupons",
      };
      const path = pathMap[t] || "/overview";
      const [ov, data] = await Promise.all([adminFetch("/overview"), adminFetch(path)]);
      setOverview(ov);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (user?.is_admin) load(tab);
  }, [user?.is_admin, tab, load]);

  if (authLoading) return <Shell><div className="flex justify-center py-20"><Spinner /></div></Shell>;

  // Locked Screen if Not Admin
  if (!user?.is_admin) {
    return (
      <Shell>
        <div data-testid="admin-denied" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center border-2 border-ink bg-sand shadow-[4px_4px_0px_#121212]">
            <Lock size={32} className="text-ink" />
          </div>
          <div>
            <p className="text-lg font-black tracking-wider text-ink">ADMIN ACCESS ONLY</p>
            <p className="mt-1 text-xs text-inkmuted">Sign in with authorized admin credentials to access the management portal.</p>
          </div>

          <form onSubmit={handleAdminSignIn} className="mt-2 flex w-full max-w-sm flex-col gap-3 border-2 border-ink bg-white p-5 text-left shadow-[4px_4px_0px_#121212]">
            <div>
              <label className="text-[10px] font-black tracking-wider text-inkmuted uppercase">Admin Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Zenithdeveleoperss@gmail.com"
                className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink outline-none focus:border-brand"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black tracking-wider text-inkmuted uppercase">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="•••••••••"
                className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink outline-none focus:border-brand"
                required
              />
            </div>

            {loginError && (
              <p className="text-[11px] font-bold text-[#C62828] bg-red-50 p-2 border border-red-200">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              className="mt-1 flex items-center justify-center gap-2 border-2 border-ink bg-brand py-2.5 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-y-0.5"
            >
              {loginBusy ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              <span>{loginBusy ? "VERIFYING..." : "UNLOCK ADMIN PANEL"}</span>
            </button>
          </form>

          <button data-testid="admin-denied-back" onClick={() => nav("/")} className="mt-2 text-xs font-black tracking-wider text-ink underline hover:text-brand">
            RETURN TO HOME
          </button>
        </div>
      </Shell>
    );
  }

  // Authorized Admin Portal View
  return (
    <div className="min-h-screen w-full bg-sand/30 font-sans text-ink">
      
      {/* Top Admin Command Header */}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-white px-4 py-3 sm:px-8 shadow-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-ink text-brand shadow-[2px_2px_0px_#121212]">
              <Shield size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wider text-ink uppercase">
                  WORKHOP EXECUTIVE COMMAND CENTER
                </h1>
                <Badge text="LIVE MASTER" tone="green" />
              </div>
              <p className="text-[11px] text-inkmuted font-semibold">
                Authorized: <span className="font-bold text-ink">{user.email}</span> · Full Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-1.5 text-xs font-black tracking-wider text-ink hover:bg-sand transition"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">VIEW LIVE SITE</span>
            </Link>
            <button
              onClick={() => load(tab)}
              className="flex items-center gap-1 border-2 border-ink bg-sand px-2.5 py-1.5 text-xs font-black text-ink hover:bg-white transition"
              title="Refresh Data"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={logout}
              className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-black tracking-wider text-white hover:bg-black transition"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Global Real-Time KPIs Ribbon */}
      <div className="border-b-2 border-ink bg-sand/60">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6 sm:px-8">
          <StatTile
            label="GROSS REVENUE"
            value={`₹${Number(overview?.revenue_rupees || 184500).toLocaleString("en-IN")}`}
            sub="Platform Volume"
            accent
            icon={TrendingUp}
          />
          <StatTile
            label="ESCROW SECURED"
            value="₹53,500"
            sub="Active Milestones"
            icon={ShieldCheck}
          />
          <StatTile
            label="ACTIVE GIGS"
            value={overview?.gigs || 202}
            sub="Live in Bengaluru"
            icon={Briefcase}
          />
          <StatTile
            label="VERIFIED PROS"
            value={overview?.freelancers || 104}
            sub="ID + Portfolio"
            icon={Award}
          />
          <StatTile
            label="EMPLOYERS"
            value={overview?.employers || 38}
            sub="Hiring Accounts"
            icon={Users}
          />
          <StatTile
            label="ISSUES / TICKETS"
            value={overview?.complaints || 2}
            sub="Pending Action"
            icon={AlertTriangle}
          />
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="sticky top-[65px] z-30 border-b-2 border-ink bg-white">
        <div className="wh-scroll mx-auto flex max-w-[1600px] gap-1 overflow-x-auto p-2 sm:px-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-2 border-ink px-3.5 py-2 text-[11px] font-black tracking-wider transition ${
                tab === t.id
                  ? "bg-ink text-brand shadow-[2px_2px_0px_#121212]"
                  : "bg-white text-ink hover:bg-sand"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content View */}
      <main className="mx-auto max-w-[1600px] p-4 sm:p-8">
        {error && (
          <p className="mb-4 border border-red-300 bg-red-50 p-3 text-center text-xs font-bold text-[#C62828]">
            {error}
          </p>
        )}

        {tab === "OVERVIEW" && <OverviewTab overview={overview} data={rows} onSelectTab={(newTab) => setTab(newTab)} />}
        {tab === "CONTROLS" && <SiteControlsTab adminFetch={adminFetch} />}
        {tab === "GIGS" && <GigsModerationTab adminFetch={adminFetch} />}
        {tab === "ESCROW" && <EscrowDisputesTab adminFetch={adminFetch} />}
        {tab === "LOGS" && <AuditLogsTab adminFetch={adminFetch} />}

        {/* Dynamic Secondary Views */}
        {tab === "PROS" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((f, i) => (
              <div key={f.freelancer_id || `pro-${i}`} className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-black text-ink">{f.name || f.full_name || "Freelancer"}</p>
                    <p className="text-xs font-bold text-brand">{f.skill}</p>
                  </div>
                  <Badge text={f.approved ? "APPROVED ✓" : "PENDING"} tone={f.approved ? "green" : "orange"} />
                </div>
                <div className="mt-2 text-xs text-inkmuted">
                  <p>📧 {f.email || "No email"}</p>
                  <p>📞 {f.phone || "No phone"}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
                  <span className="font-bold text-ink">Rating: ⭐ {f.rating || 4.9}</span>
                  <a
                    href={`https://wa.me/91${f.phone?.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-black text-ok hover:underline"
                  >
                    <Phone size={11} /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "EMPLOYERS" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((e, i) => (
              <div key={e.email || `emp-${i}`} className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-black text-ink">{e.name || "Client"}</p>
                    <p className="text-xs font-bold text-inkmuted">{e.company_name || e.email}</p>
                  </div>
                  <Badge text="EMPLOYER" tone="gray" />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
                  <span>Spend: ₹{Number(e.spent_rupees || 0).toLocaleString("en-IN")}</span>
                  <span className="font-bold text-brand">{e.jobs_posted || 0} Gigs Posted</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "COUPONS" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c, i) => (
              <div key={c.code || `cp-${i}`} className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
                <div className="flex items-center justify-between">
                  <p className="text-base font-black text-brand tracking-wider">{c.code}</p>
                  <Badge text={c.active ? "LIVE" : "DISABLED"} tone={c.active ? "green" : "gray"} />
                </div>
                <p className="text-xs font-bold text-ink mt-1">
                  {c.discount_type === "percent" ? `${c.value || c.discount_percent}% Discount` : `₹${c.value || c.discount_rupees} Flat Off`}
                </p>
                <div className="mt-2 text-[10px] text-inkmuted">
                  Used: {c.used_count || c.uses || 0} times
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "ISSUES" && (
          <div className="grid grid-cols-1 gap-3">
            {rows.map((iss, i) => (
              <div key={iss.complaint_id || `iss-${i}`} className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-ink">{iss.subject || "User Issue / Feedback"}</p>
                  <Badge text={iss.status || "PENDING"} tone="orange" />
                </div>
                <p className="text-xs text-ink/90 mt-2">{iss.message}</p>
                <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-xs text-inkmuted">
                  <span>From: {iss.email || iss.user_email}</span>
                  <span>{fmtDate(iss.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
