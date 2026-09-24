import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Shield, Lock, Loader2, Sparkles, CheckCircle2, AlertTriangle, Search,
  RefreshCw, TrendingUp, DollarSign, Users, Briefcase, Plus, Trash2,
  ExternalLink, Check, X, Megaphone, Settings, Eye, Sliders, Radio,
  ArrowUpRight, Phone, Mail, Award, Clock, FileText, ChevronRight,
  ShieldCheck, HelpCircle, Download, Zap, Coins, RotateCcw,
  Tag, Percent, Edit3, Copy, Calendar
} from "lucide-react";
import { TopBar, Spinner } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "@/lib/api";
import { BENGALURU_AREAS } from "@/lib/locationAreas";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import { checkRateLimit, resetRateLimit } from "@/lib/security";

const TABS = [
  { id: "CREDITS", label: "🪙 CREDITS & PRICING" },
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

// 5B. Coupons Management Tab
function CouponsTab({ adminFetch }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [copiedCode, setCopiedCode] = useState(null);
  const [toast, setToast] = useState(null);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent",
    value: 50,
    applies_to: "all",
    max_uses: 0,
    expires_in_days: "",
    description: "",
    active: true,
  });
  const [formError, setFormError] = useState(null);

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/coupons", "GET");
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err?.message || "Failed to load coupons", "error");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleToggleActive = async (c) => {
    try {
      const newStatus = !c.active;
      setCoupons((prev) =>
        prev.map((item) =>
          item.code === c.code ? { ...item, active: newStatus } : item
        )
      );
      await adminFetch(`/coupons/${c.code}`, "PATCH", { active: newStatus });
      showToast(`Coupon ${c.code} is now ${newStatus ? "LIVE" : "DISABLED"}.`);
    } catch (err) {
      showToast(err?.message || "Could not update coupon status", "error");
      loadCoupons();
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setForm({
      code: "",
      discount_type: "percent",
      value: 50,
      applies_to: "all",
      max_uses: 0,
      expires_in_days: "",
      description: "",
      active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setIsEditing(true);
    const daysLeft = c.expires_at ? Math.max(1, Math.round((c.expires_at - Date.now() / 1000) / 86400)) : "";
    setForm({
      code: c.code,
      discount_type: c.discount_type || (c.discount_percent ? "percent" : "flat"),
      value: c.value ?? c.discount_percent ?? c.discount_rupees ?? 10,
      applies_to: c.applies_to || "all",
      max_uses: c.max_uses || 0,
      expires_in_days: daysLeft,
      description: c.description || "",
      active: c.active !== false,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = (form.code || "").trim().toUpperCase();
    if (!cleanCode) {
      setFormError("Coupon code is required.");
      return;
    }
    if (!/^[A-Z0-9_-]{2,20}$/.test(cleanCode)) {
      setFormError("Coupon code must be 2-20 uppercase letters or numbers.");
      return;
    }
    const numVal = Number(form.value);
    if (isNaN(numVal) || numVal <= 0) {
      setFormError("Discount value must be greater than 0.");
      return;
    }
    if (form.discount_type === "percent" && numVal > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: cleanCode,
        discount_type: form.discount_type,
        value: numVal,
        applies_to: form.applies_to,
        max_uses: Number(form.max_uses) || 0,
        expires_in_days: form.expires_in_days ? Number(form.expires_in_days) : null,
        description: form.description.trim() || (form.discount_type === "percent" ? `${numVal}% off` : `₹${numVal} flat off`),
        active: form.active,
      };

      if (isEditing) {
        await adminFetch(`/coupons/${cleanCode}`, "PATCH", payload);
        showToast(`Coupon ${cleanCode} updated successfully!`);
      } else {
        await adminFetch("/coupons", "POST", payload);
        showToast(`Coupon ${cleanCode} created successfully!`);
      }
      setModalOpen(false);
      loadCoupons();
    } catch (err) {
      setFormError(err?.message || "Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/coupons/${deleteTarget.code}`, "DELETE");
      showToast(`Coupon ${deleteTarget.code} deleted permanently.`);
      setDeleteTarget(null);
      loadCoupons();
    } catch (err) {
      showToast(err?.message || "Failed to delete coupon.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = (code) => {
    try {
      navigator.clipboard?.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const getDiscountDisplay = (c) => {
    const isPercent = c.discount_type === "percent" || Boolean(c.discount_percent);
    const val = c.value ?? c.discount_percent ?? c.discount_rupees ?? 0;
    return isPercent ? `${val}% OFF` : `₹${val} FLAT OFF`;
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchSearch =
        !search.trim() ||
        c.code.toUpperCase().includes(search.trim().toUpperCase()) ||
        (c.description || "").toLowerCase().includes(search.trim().toLowerCase());
      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "LIVE" && c.active) ||
        (filterStatus === "DISABLED" && !c.active);
      return matchSearch && matchStatus;
    });
  }, [coupons, search, filterStatus]);

  const stats = useMemo(() => {
    const total = coupons.length;
    const live = coupons.filter((c) => c.active).length;
    const used = coupons.reduce((sum, c) => sum + (c.used_count || c.uses || 0), 0);
    return { total, live, used };
  }, [coupons]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`flex items-center justify-between border-2 border-ink p-3 text-xs font-black shadow-[3px_3px_0px_#121212] ${
            toast.type === "error" ? "bg-red-100 text-red-900" : "bg-emerald-100 text-emerald-950"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted">TOTAL COUPONS</span>
            <Tag size={16} className="text-brand" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{stats.total}</p>
          <p className="text-[10px] font-bold text-inkmuted mt-0.5">Configured promo codes</p>
        </div>
        <div className="border-2 border-ink bg-[#E5F8EE] p-4 shadow-[3px_3px_0px_#121212]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">LIVE & ACTIVE</span>
            <CheckCircle2 size={16} className="text-ok" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{stats.live}</p>
          <p className="text-[10px] font-bold text-emerald-700 mt-0.5">Ready for checkout redemption</p>
        </div>
        <div className="border-2 border-ink bg-[#FFF3C4] p-4 shadow-[3px_3px_0px_#121212]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">TOTAL REDEEMED</span>
            <TrendingUp size={16} className="text-amber-800" />
          </div>
          <p className="mt-2 text-2xl font-black text-black">{stats.used} times</p>
          <p className="text-[10px] font-bold text-amber-800 mt-0.5">Lifetime customer savings claimed</p>
        </div>
      </div>

      {/* Header & Controls Toolbar */}
      <div className="border-2 border-ink bg-white p-4 shadow-[4px_4px_0px_#121212]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-brand text-white shadow-[1px_1px_0px_#121212]">
                <Tag size={16} />
              </span>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-ink">
                PROMOTIONAL COUPONS & DISCOUNT ENGINE
              </h2>
            </div>
            <p className="text-xs text-inkmuted font-semibold mt-0.5">
              Add, edit, activate, or permanently remove promo codes across unlocks, onboarding, boosts, and plans
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadCoupons}
              className="flex items-center gap-1.5 border-2 border-ink bg-sand px-3 py-2 text-xs font-black text-ink hover:bg-white transition"
              title="Refresh coupons"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>REFRESH</span>
            </button>
            <button
              data-testid="admin-create-coupon-btn"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3.5 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <Plus size={14} />
              <span>+ CREATE NEW COUPON</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3">
          <div className="flex items-center gap-2 border-2 border-ink bg-[#FAFAF8] px-3 py-1.5 w-full sm:w-80">
            <Search size={14} className="text-inkmuted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or description..."
              className="w-full bg-transparent text-xs font-bold text-ink outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-inkmuted hover:text-ink">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {["ALL", "LIVE", "DISABLED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`border-2 border-ink px-2.5 py-1 text-[10px] font-black tracking-wider uppercase transition ${
                  filterStatus === status
                    ? "bg-ink text-white shadow-[1px_1px_0px_#121212]"
                    : "bg-white text-ink hover:bg-sand"
                }`}
              >
                {status === "ALL" ? `ALL (${stats.total})` : status === "LIVE" ? `LIVE (${stats.live})` : `DISABLED (${stats.total - stats.live})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coupons Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-ink bg-white">
          <Spinner />
          <p className="text-xs font-black uppercase text-inkmuted">Loading promotional coupons…</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-ink/30 bg-sand/40 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-white shadow-[2px_2px_0px_#121212]">
            <Tag size={24} className="text-ink" />
          </div>
          <h3 className="text-sm font-black uppercase text-ink">No Coupons Found</h3>
          <p className="text-xs text-inkmuted max-w-sm">
            {search ? `No coupon matched "${search}". Try clearing your search filter.` : "No coupons are currently configured. Click below to add your first promotion."}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 flex items-center gap-1.5 border-2 border-ink bg-brand px-3.5 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212]"
          >
            <Plus size={14} />
            <span>CREATE FIRST COUPON</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCoupons.map((c) => {
            const isPercent = c.discount_type === "percent" || Boolean(c.discount_percent);
            const maxUses = c.max_uses || 0;
            const usedCount = c.used_count || c.uses || 0;
            const progressPercent = maxUses > 0 ? Math.min(100, Math.round((usedCount / maxUses) * 100)) : 0;
            const isCopied = copiedCode === c.code;

            return (
              <div
                key={c.code}
                data-testid={`admin-coupon-card-${c.code.toLowerCase()}`}
                className={`flex flex-col justify-between border-2 border-ink p-4 shadow-[4px_4px_0px_#121212] transition ${
                  c.active ? "bg-white" : "bg-[#F7F7F5] opacity-90"
                }`}
              >
                <div>
                  {/* Card Header: Code & Live Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-black tracking-wider text-brand">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="flex h-6 w-6 items-center justify-center border border-ink bg-sand hover:bg-white text-ink transition"
                          title="Copy coupon code"
                        >
                          {isCopied ? <Check size={11} className="text-ok font-black" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="text-xs text-ink font-semibold mt-1">
                        {c.description || (isPercent ? `${c.value}% discount promo` : `₹${c.value} flat discount`)}
                      </p>
                    </div>

                    <Badge
                      text={c.active ? "LIVE" : "DISABLED"}
                      tone={c.active ? "green" : "gray"}
                    />
                  </div>

                  {/* Discount & Product Scope Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 border-2 border-ink bg-ink px-2.5 py-1 text-[11px] font-black text-white">
                      {isPercent ? <Percent size={12} className="text-brand" /> : <Tag size={12} className="text-brand" />}
                      <span>{getDiscountDisplay(c)}</span>
                    </span>
                    <span className="inline-flex items-center border border-ink/40 bg-sand px-2 py-1 text-[10px] font-bold text-ink uppercase">
                      {PRODUCT_LABELS[c.applies_to] || c.applies_to || "All Purchases"}
                    </span>
                  </div>

                  {/* Usage Progress & Expiry Info */}
                  <div className="mt-4 border-t border-ink/10 pt-3 flex flex-col gap-2 text-[11px]">
                    <div className="flex items-center justify-between text-inkmuted font-semibold">
                      <span>Redemptions:</span>
                      <span className="font-bold text-ink">
                        {usedCount} {maxUses > 0 ? `/ ${maxUses} max` : "(Unlimited)"}
                      </span>
                    </div>

                    {maxUses > 0 && (
                      <div className="h-1.5 w-full border border-ink/40 bg-sand overflow-hidden">
                        <div
                          className="h-full bg-brand transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-inkmuted font-semibold">
                      <span>Validity:</span>
                      <span className="font-bold text-ink">
                        {c.expires_at
                          ? fmtDate(typeof c.expires_at === "number" ? new Date(c.expires_at * 1000).toISOString() : c.expires_at)
                          : "Never expires"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 flex items-center justify-between border-t-2 border-ink/15 pt-3 gap-2">
                  <button
                    data-testid={`toggle-coupon-${c.code.toLowerCase()}`}
                    onClick={() => handleToggleActive(c)}
                    className={`flex-1 border-2 border-ink py-1.5 text-[10px] font-black tracking-wider uppercase transition ${
                      c.active
                        ? "bg-sand hover:bg-stone text-ink"
                        : "bg-[#E5F8EE] hover:bg-[#D0F2E0] text-emerald-950"
                    }`}
                  >
                    {c.active ? "DISABLE" : "ENABLE"}
                  </button>

                  <button
                    data-testid={`edit-coupon-${c.code.toLowerCase()}`}
                    onClick={() => openEditModal(c)}
                    className="flex items-center justify-center gap-1 border-2 border-ink bg-white px-3 py-1.5 text-[10px] font-black tracking-wider uppercase text-ink hover:bg-sand transition"
                    title="Edit coupon settings"
                  >
                    <Edit3 size={11} />
                    <span>EDIT</span>
                  </button>

                  <button
                    data-testid={`delete-coupon-${c.code.toLowerCase()}`}
                    onClick={() => setDeleteTarget(c)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-white hover:bg-red-50 text-red-600 transition"
                    title="Delete coupon"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            data-testid="admin-coupon-modal"
            className="w-full max-w-lg border-2 border-ink bg-white p-6 shadow-[8px_8px_0px_#121212] max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-brand text-white">
                  {isEditing ? <Edit3 size={14} /> : <Plus size={14} />}
                </span>
                <h3 className="text-sm sm:text-base font-black uppercase text-ink">
                  {isEditing ? `Edit Coupon: ${form.code}` : "Create New Promotional Coupon"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white text-ink hover:bg-sand"
              >
                <X size={14} />
              </button>
            </div>

            {/* Error message */}
            {formError && (
              <div className="mt-4 border-2 border-red-400 bg-red-50 p-2.5 text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveCoupon} className="mt-4 flex flex-col gap-3.5">
              {/* Code */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  data-testid="coupon-code-input"
                  disabled={isEditing}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER50, BLRFLAT200"
                  className={`mt-1 w-full border-2 border-ink p-2.5 font-mono text-sm font-black uppercase tracking-wider outline-none ${
                    isEditing ? "bg-sand text-inkmuted cursor-not-allowed" : "bg-white text-ink focus:border-brand"
                  }`}
                  required
                />
                <p className="mt-0.5 text-[10px] text-inkmuted">
                  {isEditing ? "Coupon codes cannot be renamed. Delete and recreate to change code." : "Uppercase letters, numbers, hyphens only (2-20 characters)."}
                </p>
              </div>

              {/* Discount Type Toggle */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Discount Type *
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, discount_type: "percent" })}
                    className={`flex items-center justify-center gap-1.5 border-2 border-ink py-2 text-xs font-black transition ${
                      form.discount_type === "percent"
                        ? "bg-ink text-white shadow-[2px_2px_0px_#121212]"
                        : "bg-white text-ink hover:bg-sand"
                    }`}
                  >
                    <Percent size={13} />
                    <span>PERCENTAGE (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, discount_type: "flat" })}
                    className={`flex items-center justify-center gap-1.5 border-2 border-ink py-2 text-xs font-black transition ${
                      form.discount_type === "flat"
                        ? "bg-ink text-white shadow-[2px_2px_0px_#121212]"
                        : "bg-white text-ink hover:bg-sand"
                    }`}
                  >
                    <Tag size={13} />
                    <span>FLAT RUPEES (₹)</span>
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  {form.discount_type === "percent" ? "Discount Percentage (1% - 100%) *" : "Flat Discount Value (₹) *"}
                </label>
                <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2">
                  <span className="font-bold text-inkmuted mr-2">
                    {form.discount_type === "percent" ? "%" : "₹"}
                  </span>
                  <input
                    type="number"
                    data-testid="coupon-value-input"
                    min="1"
                    max={form.discount_type === "percent" ? 100 : 99999}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full bg-transparent text-sm font-black text-ink outline-none"
                    required
                  />
                </div>
              </div>

              {/* Scope (Applies To) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Eligible Checkout Products *
                </label>
                <select
                  data-testid="coupon-applies-to-select"
                  value={form.applies_to}
                  onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
                  className="mt-1 w-full border-2 border-ink bg-white p-2.5 text-xs font-bold text-ink outline-none"
                >
                  <option value="all">All purchases (Unlocks, Plans, Boosts)</option>
                  <option value="employer_unlock">Lead Unlock (₹199 only)</option>
                  <option value="quota_boost">Freelancer Applies Quota Boost (₹149 only)</option>
                  <option value="plan">Employer Credit Plans / Hops Packages only</option>
                </select>
              </div>

              {/* Limits: Max Uses & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    data-testid="coupon-max-uses-input"
                    min="0"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="0 = Unlimited"
                    className="mt-1 w-full border-2 border-ink bg-white p-2 text-xs font-bold text-ink outline-none"
                  />
                  <p className="text-[9px] text-inkmuted mt-0.5">0 means unlimited usages</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                    Valid For (Days)
                  </label>
                  <input
                    type="number"
                    data-testid="coupon-expiry-days-input"
                    min="1"
                    value={form.expires_in_days}
                    onChange={(e) => setForm({ ...form, expires_in_days: e.target.value })}
                    placeholder="e.g. 7, 30, 90"
                    className="mt-1 w-full border-2 border-ink bg-white p-2 text-xs font-bold text-ink outline-none"
                  />
                  <p className="text-[9px] text-inkmuted mt-0.5">Leave blank for no expiration</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Campaign Description
                </label>
                <input
                  type="text"
                  data-testid="coupon-desc-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Special launch discount for Bengaluru founders"
                  className="mt-1 w-full border-2 border-ink bg-white p-2 text-xs font-bold text-ink outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 border-t border-ink/10 pt-2">
                <input
                  type="checkbox"
                  id="coupon-active-checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 accent-brand cursor-pointer"
                />
                <label htmlFor="coupon-active-checkbox" className="text-xs font-bold text-ink cursor-pointer">
                  Activate immediately for live customer checkout
                </label>
              </div>

              {/* Live Preview Box */}
              <div className="border-2 border-dashed border-ink/30 bg-[#FFF9E6] p-3 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block mb-1">
                  👀 CUSTOMER PREVIEW:
                </span>
                <p className="font-bold text-ink">
                  Code <span className="font-mono text-brand uppercase font-black">{form.code || "YOURCODE"}</span> gives{" "}
                  <span className="font-black">
                    {form.discount_type === "percent" ? `${form.value || 0}% OFF` : `₹${form.value || 0} FLAT OFF`}
                  </span>{" "}
                  on {PRODUCT_LABELS[form.applies_to] || "all purchases"}.
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-2 flex items-center justify-end gap-2 border-t-2 border-ink pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border-2 border-ink bg-white px-4 py-2 text-xs font-black uppercase text-ink hover:bg-sand"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  data-testid="coupon-save-submit-btn"
                  disabled={saving}
                  className="flex items-center gap-1.5 border-2 border-ink bg-brand px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isEditing ? "SAVE CHANGES" : "CREATE COUPON"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            data-testid="delete-coupon-modal"
            className="w-full max-w-md border-2 border-ink bg-white p-6 shadow-[8px_8px_0px_#121212] text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-ink bg-red-50 text-red-600 shadow-[2px_2px_0px_#121212]">
              <Trash2 size={24} />
            </div>
            <h3 className="mt-3 text-base font-black uppercase text-ink">Delete Coupon?</h3>
            <p className="mt-1 text-xs text-inkmuted font-semibold">
              Are you sure you want to permanently remove coupon{" "}
              <span className="font-mono font-black text-brand">{deleteTarget.code}</span>?
              Customers will no longer be able to redeem this promotion.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="border-2 border-ink bg-white px-4 py-2 text-xs font-black uppercase text-ink hover:bg-sand"
              >
                CANCEL
              </button>
              <button
                data-testid="confirm-delete-coupon-btn"
                disabled={deleting}
                onClick={handleDeleteCoupon}
                className="flex items-center gap-1.5 border-2 border-ink bg-red-600 px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:bg-red-700"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>DELETE PERMANENTLY</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 6. Connects & Credits Pricing Engine Tab
function CreditsConfigTab({ adminFetch }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/credits-config", "GET");
      if (data) setConfig(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMsg({ text: "", type: "" });
    try {
      const updated = await adminFetch("/credits-config", "PUT", config);
      if (updated) {
        setConfig(updated);
        setMsg({ text: "Credits pricing and bidding configuration saved successfully!", type: "success" });
      }
    } catch (e) {
      setMsg({ text: e?.message || "Failed to save configuration.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updatePack = (index, field, value) => {
    const updated = [...(config.credit_packs || [])];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, credit_packs: updated });
  };

  const updatePlan = (index, field, value) => {
    const updated = [...(config.subscription_plans || [])];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, subscription_plans: updated });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0px_#121212]">
        <p className="text-xs font-bold text-inkmuted">Could not load credits configuration.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-credits-config">
      {/* Header Banner */}
      <div className="border-2 border-ink bg-[#FFF3C4] p-5 shadow-[4px_4px_0px_#121212] flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Coins size={22} className="text-brand" />
            <h2 className="text-base font-black uppercase text-ink">
              Connects &amp; Credits Bidding Engine Configuration
            </h2>
          </div>
          <p className="text-xs text-inkmuted font-semibold mt-1">
            Configure dynamic credit calculation formulas, top-up pack rates, subscription bundles, rollover policy, and employer urgent job boost pricing.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          data-testid="admin-save-credits-btn"
          className="flex items-center gap-2 border-2 border-ink bg-brand px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:bg-brand/90 active:translate-y-0.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          <span>{saving ? "SAVING..." : "SAVE & APPLY CONFIG"}</span>
        </button>
      </div>

      {msg.text && (
        <div
          className={`border-2 border-ink p-3 text-xs font-bold ${
            msg.type === "success" ? "bg-[#E5F7E0] text-ok" : "bg-[#FFEBEE] text-bad"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Grid: Conversion Rates & Formula Rules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Conversion Rate & Application Formula */}
        <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212] flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b-2 border-ink/10 pb-2">
            <Sliders size={16} className="text-brand" />
            <h3 className="text-xs font-black uppercase text-ink">
              Application Cost Formula &amp; Exchange Rate
            </h3>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Base Rate (₹ Per Credit)
            </label>
            <input
              type="number"
              value={config.rupees_per_credit || 15}
              onChange={(e) =>
                setConfig({ ...config, rupees_per_credit: Number(e.target.value) || 15 })
              }
              className="border-2 border-ink bg-stone-50 px-3 py-2 text-sm font-bold text-ink outline-none"
            />
            <p className="text-[10px] text-inkmuted">Standard baseline value of 1 credit in INR.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Job Budget Divisor (Default: ₹1,000)
            </label>
            <input
              type="number"
              value={config.job_apply_budget_divisor || 1000}
              onChange={(e) =>
                setConfig({
                  ...config,
                  job_apply_budget_divisor: Math.max(100, Number(e.target.value) || 1000),
                })
              }
              className="border-2 border-ink bg-stone-50 px-3 py-2 text-sm font-bold text-ink outline-none"
            />
            <p className="text-[10px] text-inkmuted">
              Upwork Tiered Connects Model: 2–16 Hops based on job budget tier (e.g. ₹5,000 = 4 Hops, ₹15,000 = 6 Hops, ₹50,000 = 10 Hops, ₹80,000+ = 16 Hops).
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Minimum Credits to Apply
            </label>
            <input
              type="number"
              value={config.job_apply_min_credits || 1}
              onChange={(e) =>
                setConfig({ ...config, job_apply_min_credits: Math.max(1, Number(e.target.value) || 1) })
              }
              className="border-2 border-ink bg-stone-50 px-3 py-2 text-sm font-bold text-ink outline-none"
            />
            <p className="text-[10px] text-inkmuted">Floor applied to any job post regardless of low budget.</p>
          </div>
        </div>

        {/* Card 2: Employer Job Boost Pricing & Rollover Decision Point */}
        <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212] flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b-2 border-ink/10 pb-2">
            <Zap size={16} className="text-brand" />
            <h3 className="text-xs font-black uppercase text-ink">
              Employer Urgent Job Boost &amp; Rollover Policy
            </h3>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Job Urgent Boost Fee (₹)
            </label>
            <input
              type="number"
              value={config.employer_job_boost_price_inr || 399}
              onChange={(e) =>
                setConfig({ ...config, employer_job_boost_price_inr: Number(e.target.value) || 399 })
              }
              className="border-2 border-ink bg-stone-50 px-3 py-2 text-sm font-bold text-ink outline-none"
            />
            <p className="text-[10px] text-inkmuted">Amount paid by employer to mark job Urgent and pin to top.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
              Job Boost Duration (Hours)
            </label>
            <input
              type="number"
              value={config.employer_job_boost_duration_hours || 48}
              onChange={(e) =>
                setConfig({
                  ...config,
                  employer_job_boost_duration_hours: Number(e.target.value) || 48,
                })
              }
              className="border-2 border-ink bg-stone-50 px-3 py-2 text-sm font-bold text-ink outline-none"
            />
            <p className="text-[10px] text-inkmuted">Time before urgent badge and top-pin automatically expire.</p>
          </div>

          {/* Decision point flag: Rollover policy */}
          <div className="border-2 border-dashed border-ink/40 bg-sand/40 p-3 mt-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-ink">
                  Subscription Rollover Policy
                </p>
                <p className="text-[10px] text-inkmuted font-semibold">
                  {config.rollover_unused_credits
                    ? "Active: Unused monthly credits roll over to next billing month"
                    : "Active: Unused monthly credits expire at end of 30-day billing cycle"}
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(config.rollover_unused_credits)}
                onChange={(e) =>
                  setConfig({ ...config, rollover_unused_credits: e.target.checked })
                }
                className="h-5 w-5 accent-brand cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* One-Time Credit Packs Table */}
      <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-black uppercase text-ink">
              One-Time Freelancer Credit Top-Up Packs
            </h3>
            <p className="text-[10px] text-inkmuted">Fixed bundle packs sold on freelancer profile.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-ink bg-sand/50 text-[10px] font-black uppercase">
                <th className="p-2.5">Pack ID</th>
                <th className="p-2.5">Credits Count</th>
                <th className="p-2.5">Price (₹)</th>
                <th className="p-2.5">Effective Rate</th>
                <th className="p-2.5">Badge / Discount Label</th>
              </tr>
            </thead>
            <tbody>
              {(config.credit_packs || []).map((pack, idx) => (
                <tr key={pack.id || idx} className="border-b border-ink/10 hover:bg-stone-50">
                  <td className="p-2.5 font-mono font-bold text-inkmuted">{pack.id}</td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      value={pack.credits}
                      onChange={(e) => updatePack(idx, "credits", Number(e.target.value) || 0)}
                      className="w-24 border border-ink px-2 py-1 font-bold text-ink"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      value={pack.price_inr}
                      onChange={(e) => updatePack(idx, "price_inr", Number(e.target.value) || 0)}
                      className="w-24 border border-ink px-2 py-1 font-bold text-ink"
                    />
                  </td>
                  <td className="p-2.5 font-bold text-brand">
                    ₹{pack.credits > 0 ? (pack.price_inr / pack.credits).toFixed(1) : 0}/credit
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={pack.discount_label || ""}
                      onChange={(e) => updatePack(idx, "discount_label", e.target.value)}
                      className="w-48 border border-ink px-2 py-1 text-xs text-ink"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Subscription Plans Table */}
      <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-black uppercase text-ink">
              Monthly Credit Subscription Plans (Pro Pass)
            </h3>
            <p className="text-[10px] text-inkmuted">Recurring monthly credit bundles at discounted per-credit rates.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-ink bg-sand/50 text-[10px] font-black uppercase">
                <th className="p-2.5">Plan Name</th>
                <th className="p-2.5">Credits / Cycle</th>
                <th className="p-2.5">Monthly Price (₹)</th>
                <th className="p-2.5">Effective Rate</th>
                <th className="p-2.5">Badge</th>
              </tr>
            </thead>
            <tbody>
              {(config.subscription_plans || []).map((plan, idx) => (
                <tr key={plan.id || idx} className="border-b border-ink/10 hover:bg-stone-50">
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updatePlan(idx, "name", e.target.value)}
                      className="w-44 border border-ink px-2 py-1 font-bold text-ink"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      value={plan.credits_per_cycle}
                      onChange={(e) => updatePlan(idx, "credits_per_cycle", Number(e.target.value) || 0)}
                      className="w-24 border border-ink px-2 py-1 font-bold text-ink"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      value={plan.price_inr}
                      onChange={(e) => updatePlan(idx, "price_inr", Number(e.target.value) || 0)}
                      className="w-24 border border-ink px-2 py-1 font-bold text-ink"
                    />
                  </td>
                  <td className="p-2.5 font-bold text-ok">
                    ₹{plan.credits_per_cycle > 0 ? (plan.price_inr / plan.credits_per_cycle).toFixed(1) : 0}/credit
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={plan.badge || ""}
                      onChange={(e) => updatePlan(idx, "badge", e.target.value)}
                      className="w-36 border border-ink px-2 py-1 text-xs text-ink"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- MAIN ADMIN COMPONENT ----------------

export default function Admin() {
  const nav = useNavigate();
  const { user, loading: authLoading, adminLogin, logout } = useAuth();
  const [tab, setTab] = useState("CREDITS");
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
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    setOverview(null);
    setRows([]);
    setLoginPassword("");
    setCaptchaToken(null);
    setCaptchaReset((prev) => prev + 1);
    setLoginError(null);
    setLoading(false);
  };

  const handleAdminSignIn = async (e) => {
    e?.preventDefault();

    // Anti-Brute-Force Rate Limiting
    const rate = checkRateLimit(`admin_auth_${loginEmail.trim().toLowerCase()}`, 5, 60000);
    if (!rate.allowed) {
      setLoginError(`Admin portal locked: Too many failed unlock attempts. Please wait ${rate.waitSeconds}s.`);
      return;
    }

    // Human Verification Check
    if (!captchaToken) {
      setLoginError("Please complete the reCAPTCHA human verification check before unlocking.");
      return;
    }

    setLoginBusy(true);
    setLoginError(null);
    try {
      await adminLogin(loginEmail, loginPassword);
      resetRateLimit(`admin_auth_${loginEmail.trim().toLowerCase()}`);
    } catch (err) {
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
      setLoginError(err?.message || "Invalid admin email or password.");
    } finally {
      setLoginBusy(false);
    }
  };

  const adminFetch = useCallback((path, method = "GET", body) => {
    if (method === "GET") return apiGet(`/admin${path}`, true);
    if (method === "POST") return apiPost(`/admin${path}`, body, true);
    if (method === "PUT") return apiPut(`/admin${path}`, body, true);
    if (method === "PATCH") return apiPatch(`/admin${path}`, body, true);
    if (method === "DELETE") return apiDelete(`/admin${path}`, true);
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

  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-white text-ink">
        <Spinner />
        <p className="text-xs font-black tracking-wider uppercase text-inkmuted">Authenticating Admin Session...</p>
      </div>
    );
  }

  // Locked Screen if Not Admin
  if (!user?.is_admin) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F7F7F5] dark:bg-[#121212] p-4 text-ink dark:text-white">
        <div data-testid="admin-denied" className="w-full max-w-md border-2 border-ink dark:border-[#333] bg-white dark:bg-[#1a1a1a] p-6 sm:p-8 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#000] text-center">
          
          <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-ink bg-brand text-white shadow-[3px_3px_0px_#121212]">
            <Shield size={32} />
          </div>

          <div className="mt-4">
            <span className="inline-block bg-ink dark:bg-[#2a2a2a] px-2.5 py-0.5 text-[10px] font-black tracking-widest text-white uppercase">
              RESTRICTED PORTAL
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink dark:text-white">
              Admin Access Only
            </h2>
            <p className="mt-1 text-xs text-inkmuted dark:text-gray-400 font-semibold">
              Enter authorized administrator credentials to unlock the Executive Command Center.
            </p>
          </div>

          <form onSubmit={handleAdminSignIn} className="mt-6 flex flex-col gap-3.5 text-left border-t-2 border-ink dark:border-[#333] pt-5">
            <div>
              <label className="text-[10px] font-black tracking-wider text-inkmuted dark:text-gray-400 uppercase">Admin Email</label>
              <div className="mt-1 flex items-center border-2 border-ink dark:border-[#444] bg-[#FAFAF8] dark:bg-[#222] px-3 py-2">
                <Mail size={16} className="text-inkmuted dark:text-gray-400 mr-2 shrink-0" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Zenithdeveleoperss@gmail.com"
                  className="w-full bg-transparent text-xs font-bold text-ink dark:text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black tracking-wider text-inkmuted dark:text-gray-400 uppercase">Password</label>
                <button
                  type="button"
                  onClick={() => setLoginPassword("123456789")}
                  className="text-[10px] font-extrabold text-brand hover:underline"
                >
                  Fill Default Password
                </button>
              </div>
              <div className="mt-1 flex items-center border-2 border-ink dark:border-[#444] bg-[#FAFAF8] dark:bg-[#222] px-3 py-2">
                <KeyRound size={16} className="text-inkmuted dark:text-gray-400 mr-2 shrink-0" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-transparent text-xs font-bold text-ink dark:text-white outline-none"
                  required
                />
              </div>
            </div>

            {loginError && (
              <p className="text-[11px] font-bold text-[#C62828] bg-red-50 p-2.5 border border-red-200">
                ⚠️ {loginError}
              </p>
            )}

            {/* Recaptcha Verification */}
            <RecaptchaWidget
              onVerify={(tok) => {
                setCaptchaToken(tok);
                setLoginError(null);
              }}
              onExpire={() => setCaptchaToken(null)}
              resetTrigger={captchaReset}
              className="my-1"
            />

            <button
              type="submit"
              disabled={loginBusy}
              className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-y-0.5"
            >
              {loginBusy ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              <span>{loginBusy ? "VERIFYING CREDENTIALS..." : "UNLOCK ADMIN COMMAND CENTER"}</span>
            </button>
          </form>

          <div className="mt-6 border-t border-ink/10 dark:border-white/10 pt-3">
            <button
              data-testid="admin-denied-back"
              onClick={() => nav("/")}
              className="text-xs font-black tracking-wider text-ink dark:text-white hover:text-brand hover:underline"
            >
              ← Return to Live Website
            </button>
          </div>

        </div>
      </div>
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
                Authorized: <span className="font-bold text-ink">{user?.email || "Zenith Admin"}</span> · Full Control
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/employer"
              className="flex items-center gap-1.5 border-2 border-ink bg-[#FFF3C4] px-3 py-1.5 text-xs font-black tracking-wider text-ink hover:bg-[#FFEAA0] transition shadow-[1.5px_1.5px_0px_#121212]"
              title="Switch to Employer view (explore pros, plans, post jobs)"
            >
              <Users size={13} className="text-brand" />
              <span>EMPLOYER SITE</span>
            </Link>
            <Link
              to="/freelancer/jobs"
              className="flex items-center gap-1.5 border-2 border-ink bg-[#E5F8EE] px-3 py-1.5 text-xs font-black tracking-wider text-ink hover:bg-[#D0F2E0] transition shadow-[1.5px_1.5px_0px_#121212]"
              title="Switch to Freelancer view (find gigs, apply, chats)"
            >
              <Briefcase size={13} className="text-ok" />
              <span>FREELANCER SITE</span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-1.5 text-xs font-black tracking-wider text-ink hover:bg-sand transition"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">HOME</span>
            </Link>
            <button
              onClick={() => load(tab)}
              className="flex items-center gap-1 border-2 border-ink bg-sand px-2.5 py-1.5 text-xs font-black text-ink hover:bg-white transition"
              title="Refresh Data"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={handleLogout}
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

        {tab === "CREDITS" && <CreditsConfigTab adminFetch={adminFetch} />}
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

        {tab === "COUPONS" && <CouponsTab adminFetch={adminFetch} />}

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
