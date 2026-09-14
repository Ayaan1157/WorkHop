import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessagesSquare, Map as MapIcon, LayoutGrid, Tag, LifeBuoy, FileText,
  Shield, ChevronRight, LogOut, Briefcase, ShieldCheck, Loader2, Wallet,
  Sparkles, ArrowRightLeft, UserCheck
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import ProfileProgressBar from "@/components/ProfileProgressBar";
import EscrowWalletModal from "@/components/EscrowWalletModal";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut, getFreelancerId } from "@/lib/api";

export default function Profile() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [freelancerId, setFid] = useState(null);
  const [phone, setPhone] = useState("");
  const [skill, setSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [walletOpen, setWalletOpen] = useState(false);

  const loadPro = useCallback(async () => {
    const fid = getFreelancerId();
    if (!fid) return;
    setFid(fid);
    try {
      const p = await apiGet(`/freelancer/${fid}/profile`);
      setPhone((p.phone || "").replace(/\D/g, "").replace(/^91/, ""));
      setSkill(p.skill || "");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadPro();
  }, [loadPro]);

  const savePro = async () => {
    if (!freelancerId) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) return setSaveMsg({ ok: false, text: "Phone must be exactly 10 digits." });
    setSaving(true);
    setSaveMsg(null);
    try {
      const data = await apiPut(`/freelancer/${freelancerId}/profile`, {
        phone: digits,
        skill: skill.trim() || null,
      });
      setSaveMsg({ ok: true, text: `Saved · employers see ${data.phone} after unlock` });
    } catch (e) {
      setSaveMsg({ ok: false, text: e?.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const menu = [
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

  return (
    <Shell>
      <TopBar title="MY PROFILE" backTestID="profile-back-btn" />
      <div className="flex flex-col gap-4 p-4 pb-16">
        {/* PROFILE HERO */}
        <div className="flex flex-col items-center gap-2 border-2 border-ink p-6 bg-white" data-testid="profile-hero">
          {user?.picture ? (
            <img src={user.picture} alt="" className="h-[72px] w-[72px] border-2 border-ink object-cover" />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center border-2 border-ink bg-brand text-[28px] font-black text-white">
              {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="text-xl font-black text-ink">{user?.name || "Guest"}</p>
          <p className="text-xs text-inkmuted font-semibold">{user?.email || "Not signed in"}</p>
          <div className="mt-1 flex items-center gap-1.5 bg-ink px-3 py-1.5">
            <ShieldCheck size={11} className="text-white" />
            <span className="text-[9px] font-black tracking-wider text-white">
              WORKHOP MEMBER · BENGALURU
            </span>
          </div>
        </div>

        {/* UPWORK-STYLE PROFILE COMPLETION PROGRESS BAR */}
        <ProfileProgressBar
          user={user}
          proDetails={{ phone, skill, verified: true, portfolioUploaded: Boolean(skill) }}
        />

        {/* ESCROW WALLET & PAYMENTS CARD */}
        <div className="border-2 border-ink bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-[#FFF3C4]">
                <Wallet size={18} className="text-ink" />
              </span>
              <div>
                <p className="text-sm font-black text-ink">Escrow Wallet &amp; Payouts</p>
                <p className="text-[11px] text-inkmuted font-semibold">
                  Secure milestones &amp; UPI withdrawal
                </p>
              </div>
            </div>
            <button
              onClick={() => setWalletOpen(true)}
              className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-black text-white hover:bg-brand transition active:translate-y-0.5"
            >
              OPEN WALLET
            </button>
          </div>
        </div>

        {/* PRO EDIT DETAILS */}
        {freelancerId && (
          <div className="flex flex-col gap-2 border-2 border-ink bg-white p-4" data-testid="pro-profile-card">
            <div className="flex items-center gap-1.5">
              <Briefcase size={14} className="text-brand" />
              <span className="text-xs font-black tracking-[0.12em] text-ink">PRO PROFILE</span>
            </div>
            <label className="mt-1 text-[9px] font-black tracking-wider text-inkmuted">
              PHONE NUMBER (shown to employers after unlock)
            </label>
            <input
              data-testid="pro-phone-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              className="wh-input h-11 border-2 border-ink bg-sand px-3 text-sm font-semibold text-ink"
            />
            <label className="text-[9px] font-black tracking-wider text-inkmuted">PRIMARY SKILL</label>
            <input
              data-testid="pro-skill-input"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. Logo Designer"
              className="wh-input h-11 border-2 border-ink bg-sand px-3 text-sm font-semibold text-ink"
            />
            {saveMsg && (
              <p
                data-testid="pro-save-msg"
                className="text-[11px] font-bold"
                style={{ color: saveMsg.ok ? "#00A86B" : "#C62828" }}
              >
                {saveMsg.text}
              </p>
            )}
            <button
              data-testid="pro-save-btn"
              disabled={saving}
              onClick={savePro}
              className="mt-1 flex items-center justify-center bg-ink py-3 text-xs font-black tracking-wider text-white disabled:opacity-60 hover:bg-brand transition"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : "SAVE PRO DETAILS"}
            </button>
          </div>
        )}

        {/* NAVIGATION LINKS */}
        <div className="flex flex-col gap-2">
          {user?.is_admin && (
            <button
              data-testid="profile-admin"
              onClick={() => nav("/admin")}
              className="flex items-center gap-3 border-2 border-ink bg-[#FFF3E9] p-3 text-left transition active:translate-y-0.5"
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center border-2 border-ink bg-ink">
                <Shield size={18} className="text-brand" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-black text-ink">Admin Dashboard</p>
                <p className="text-[11px] text-inkmuted">Users, payments, complaints &amp; coupons</p>
              </div>
              <ChevronRight size={16} className="text-inkmuted" />
            </button>
          )}
          {menu.map((m) => (
            <button
              key={m.label}
              data-testid={m.testID}
              onClick={() => nav(m.to)}
              className="flex items-center gap-3 border-2 border-ink bg-white p-3 text-left transition hover:bg-sand active:translate-y-0.5"
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center border-2 border-ink bg-sand">
                <m.icon size={18} className="text-brand" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-black text-ink">{m.label}</p>
                <p className="text-[11px] text-inkmuted font-semibold">{m.sub}</p>
              </div>
              <ChevronRight size={16} className="text-inkmuted" />
            </button>
          ))}
        </div>

        {user && (
          <button
            data-testid="profile-logout-btn"
            onClick={async () => {
              await logout();
              nav("/");
            }}
            className="flex items-center justify-center gap-2 border-2 border-ink bg-ink py-4 text-[13px] font-black tracking-wider text-white hover:bg-danger transition"
          >
            <LogOut size={16} /> LOG OUT
          </button>
        )}
        <p className="text-center text-[11px] text-inkmuted">WorkHop v2 · Made in Bengaluru 🧡</p>
      </div>

      {/* ESCROW WALLET MODAL */}
      <EscrowWalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
    </Shell>
  );
}
