import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Loader2 } from "lucide-react";
import { Shell, TopBar, Spinner } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

const TABS = ["USERS", "EMPLOYERS", "PROS", "PAYMENTS", "ISSUES", "COUPONS"];
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
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
};

function Badge({ text, tone }) {
  const bg = { green: "#E5F7E0", orange: "#FFE8D6", gray: "#F9F9F6", black: "#121212" }[tone];
  const fg = tone === "black" ? "#fff" : "#121212";
  return (
    <span className="border-[1.5px] border-ink px-2 py-0.5 text-[9px] font-black tracking-wide" style={{ background: bg, color: fg }}>
      {text}
    </span>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`flex min-w-[84px] flex-col items-center border-2 border-ink px-3 py-2 ${accent ? "bg-brand" : "bg-sand"}`}>
      <span className={`text-base font-black ${accent ? "text-white" : "text-ink"}`}>{value}</span>
      <span className={`text-[9px] font-extrabold tracking-wide ${accent ? "text-white" : "text-inkmuted"}`}>{label}</span>
    </div>
  );
}

const Card = ({ children, testID }) => (
  <div data-testid={testID} className="flex flex-col gap-1 border-2 border-ink bg-white p-3">{children}</div>
);
const CardHead = ({ children }) => <div className="flex items-center justify-between gap-2">{children}</div>;
const CardTitle = ({ children }) => <p className="flex-1 truncate text-sm font-black text-ink">{children}</p>;
const CardMeta = ({ children }) => <p className="text-xs text-inkmuted">{children}</p>;
const CardFoot = ({ children }) => <div className="mt-1 flex items-center justify-between gap-2">{children}</div>;
const Micro = ({ children }) => <span className="min-w-0 truncate text-[10px] text-inkmuted">{children}</span>;
const Empty = ({ children }) => <p className="mt-8 text-center text-[13px] text-inkmuted">{children}</p>;

const ApproveBtn = ({ onClick, busy, active, on, testID }) => (
  <button data-testid={testID} onClick={onClick} disabled={busy} className={`min-w-[84px] border-2 border-ink px-3 py-1.5 text-[10px] font-black tracking-wider text-white ${active ? "bg-ink" : "bg-ok"} disabled:opacity-50`}>
    {busy ? <Loader2 size={12} className="mx-auto animate-spin" /> : on}
  </button>
);

function UsersTab({ rows }) {
  if (!rows.length) return <Empty>No registered users yet.</Empty>;
  return rows.map((u, i) => (
    <Card key={u.user_id || `u-${i}`} testID={`admin-user-${u.user_id}`}>
      <CardHead>
        <CardTitle>{u.name || u.email}</CardTitle>
        <Badge text={u.role === "freelancer" ? "FREELANCER" : "EMPLOYER"} tone={u.role === "freelancer" ? "orange" : "gray"} />
      </CardHead>
      <CardMeta>{u.email}</CardMeta>
      <CardFoot>
        <Micro>Joined {fmtDate(u.created_at)}</Micro>
        {u.role === "freelancer" && <Badge text={u.approved ? "APPROVED ✓" : "NOT APPROVED"} tone={u.approved ? "green" : "gray"} />}
      </CardFoot>
    </Card>
  ));
}

function EmployersTab({ data }) {
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  const devices = Array.isArray(data?.devices) ? data.devices : [];
  if (!accounts.length && !devices.length) return <Empty>No employers yet.</Empty>;
  return (
    <>
      <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">EMPLOYER ACCOUNTS ({accounts.length})</p>
      {accounts.length === 0 && <p className="text-xs text-inkmuted">No signed-in employer accounts yet.</p>}
      {accounts.map((e, i) => (
        <Card key={e.email || `emp-${i}`} testID={`admin-employer-${i}`}>
          <CardHead><CardTitle>{e.name || e.email || "Employer"}</CardTitle><Badge text="EMPLOYER" tone="gray" /></CardHead>
          <CardMeta>{e.email}</CardMeta>
          <CardFoot><Micro>Joined {fmtDate(e.created_at)}</Micro><span /></CardFoot>
        </Card>
      ))}

      <p className="mt-3 text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">HIRING ACTIVITY ({devices.length})</p>
      {devices.length === 0 && <p className="text-xs text-inkmuted">No lead unlocks, plans or job posts yet.</p>}
      {devices.map((d, i) => (
        <Card key={d.employer_id || `dev-${i}`} testID={`admin-employer-device-${i}`}>
          <CardHead>
            <CardTitle>₹{Number(d.spent_rupees || 0).toLocaleString("en-IN")} spent</CardTitle>
            <Badge text={`${d.jobs_posted} JOBS`} tone={d.jobs_posted ? "green" : "gray"} />
          </CardHead>
          <div className="flex flex-wrap gap-1.5">
            <Badge text={`${d.unlocks} UNLOCKS`} tone="orange" />
            <Badge text={`${d.plans} PLANS`} tone="gray" />
            <Badge text={`${d.jobs_posted} POSTS`} tone="gray" />
          </div>
          <CardFoot><Micro>{d.employer_id}</Micro><Micro>Active {fmtDate(d.last_active)}</Micro></CardFoot>
        </Card>
      ))}
    </>
  );
}

function ProsTab({ rows, onChanged, adminFetch }) {
  const [busyId, setBusyId] = useState(null);
  const toggle = async (f) => {
    setBusyId(f.freelancer_id);
    try {
      await adminFetch(`/freelancers/${f.freelancer_id}/approve`, "POST", { approved: !f.approved });
      onChanged();
    } catch { /* ignore */ } finally { setBusyId(null); }
  };
  if (!rows.length) return <Empty>No freelancer profiles yet.</Empty>;
  return rows.map((f, i) => (
    <Card key={f.freelancer_id || `f-${i}`} testID={`admin-pro-${f.freelancer_id}`}>
      <CardHead>
        <CardTitle>{f.full_name || "Unnamed"}</CardTitle>
        <Badge text={f.approved ? "APPROVED ✓" : "PENDING"} tone={f.approved ? "green" : "orange"} />
      </CardHead>
      <CardMeta>{[f.skill, f.category, f.rate_hr ? `₹${f.rate_hr}/hr` : null].filter(Boolean).join(" · ") || "No skill details"}</CardMeta>
      <CardMeta>{[f.email, f.phone].filter(Boolean).join(" · ") || "No contact yet"}</CardMeta>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <Badge text={f.paid ? "PAID ₹99" : "UNPAID"} tone={f.paid ? "green" : "gray"} />
        <Badge text={f.email_verified ? "EMAIL ✓" : "UNVERIFIED"} tone={f.email_verified ? "green" : "gray"} />
        <Badge text={(f.status || "new").toUpperCase().replace("_", " ")} tone="gray" />
      </div>
      <CardFoot>
        <Micro>Joined {fmtDate(f.created_at)}</Micro>
        <ApproveBtn testID={`admin-approve-${f.freelancer_id}`} onClick={() => toggle(f)} busy={busyId === f.freelancer_id} active={f.approved} on={f.approved ? "REVOKE" : "APPROVE"} />
      </CardFoot>
    </Card>
  ));
}

function PaymentsTab({ rows }) {
  if (!rows.length) return <Empty>No payments yet.</Empty>;
  return rows.map((p, i) => (
    <Card key={p.order_id || `p-${i}`} testID={`admin-payment-${p.order_id}`}>
      <CardHead>
        <CardTitle>₹{Number(p.amount_rupees).toLocaleString("en-IN")}</CardTitle>
        <Badge text={(p.status || "created").toUpperCase()} tone={p.status === "paid" ? "green" : "gray"} />
      </CardHead>
      <CardMeta>{(PRODUCT_LABELS[p.product] || p.product)}{p.plan_id ? ` · ${p.plan_id}` : ""}</CardMeta>
      {!!p.coupon_code && <p className="text-[11px] font-extrabold text-brand">🏷 {p.coupon_code} · saved ₹{p.discount_rupees}</p>}
      <CardFoot><Micro>{p.payer || "—"}</Micro><Micro>{fmtDate(p.created_at)}</Micro></CardFoot>
    </Card>
  ));
}

function IssuesTab({ rows }) {
  if (!rows.length) return <Empty>No complaints — all clear! 🧡</Empty>;
  return rows.map((c, i) => (
    <Card key={c.complaint_id || `c-${i}`} testID={`admin-complaint-${c.complaint_id}`}>
      <CardHead><CardTitle>{c.subject || "Complaint"}</CardTitle><Badge text={(c.role || "user").toUpperCase()} tone="gray" /></CardHead>
      <p className="text-xs leading-[1.4] text-ink">{c.message}</p>
      <CardFoot><Micro>{[c.name, c.email].filter(Boolean).join(" · ")}</Micro><Micro>{fmtDate(c.created_at)}</Micro></CardFoot>
    </Card>
  ));
}

function CouponsTab({ rows, onChanged, adminFetch }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [appliesTo, setAppliesTo] = useState("all");
  const [maxUses, setMaxUses] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busyCode, setBusyCode] = useState(null);

  const inputCls = "wh-input h-[42px] border-2 border-ink bg-white px-3 text-[13px] font-bold text-ink";

  const create = async () => {
    setMsg(null);
    if (!code.trim() || !value.trim()) return setMsg({ ok: false, text: "Enter a code and a discount value." });
    setCreating(true);
    try {
      await adminFetch("/coupons", "POST", {
        code: code.trim(), discount_type: type, value: parseInt(value, 10), applies_to: appliesTo,
        max_uses: maxUses.trim() ? parseInt(maxUses, 10) : 0,
        expires_in_days: expiryDays.trim() ? parseInt(expiryDays, 10) : null,
      });
      setMsg({ ok: true, text: `${code.trim().toUpperCase()} created and live.` });
      setCode(""); setValue(""); setMaxUses(""); setExpiryDays("");
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: e?.message || "Could not create coupon." });
    } finally { setCreating(false); }
  };

  const toggleActive = async (c) => {
    setBusyCode(c.code);
    try { await adminFetch(`/coupons/${c.code}`, "PATCH", { active: !c.active }); onChanged(); }
    catch { /* ignore */ } finally { setBusyCode(null); }
  };

  return (
    <>
      <div data-testid="admin-coupon-form" className="flex flex-col gap-2 border-2 border-ink bg-[#FFF3E9] p-3">
        <p className="text-xs font-black tracking-wider text-ink">CREATE NEW COUPON</p>
        <input data-testid="coupon-code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="CODE e.g. DIWALI25" className={inputCls} />
        <div className="flex items-center gap-2">
          <div className="flex border-2 border-ink">
            {["percent", "flat"].map((t) => (
              <button key={t} data-testid={`coupon-type-${t}`} onClick={() => setType(t)} className={`h-[38px] px-3 text-[11px] font-black ${type === t ? "bg-ink text-white" : "bg-white text-ink"}`}>
                {t === "percent" ? "% OFF" : "₹ OFF"}
              </button>
            ))}
          </div>
          <input data-testid="coupon-value-input" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))} placeholder={type === "percent" ? "e.g. 25" : "e.g. 100"} className={`${inputCls} flex-1`} />
        </div>
        <p className="mt-0.5 text-[9px] font-black tracking-wider text-inkmuted">APPLIES TO</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PRODUCT_LABELS).map(([k, label]) => (
            <button key={k} data-testid={`coupon-applies-${k}`} onClick={() => setAppliesTo(k)} className={`border-2 border-ink px-2.5 py-1.5 text-[10px] font-extrabold ${appliesTo === k ? "bg-brand text-white" : "bg-white text-ink"}`}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input data-testid="coupon-maxuses-input" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Max uses (blank = ∞)" className={`${inputCls} flex-1`} />
          <input data-testid="coupon-expiry-input" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Expiry days (blank = never)" className={`${inputCls} flex-1`} />
        </div>
        {msg && <p data-testid="coupon-create-msg" className="text-[11px] font-bold" style={{ color: msg.ok ? "#00A86B" : "#C62828" }}>{msg.text}</p>}
        <button data-testid="coupon-create-btn" onClick={create} disabled={creating} className="flex h-[46px] items-center justify-center bg-ink text-xs font-black tracking-wider text-white disabled:opacity-60">
          {creating ? <Loader2 size={16} className="animate-spin" /> : "CREATE COUPON"}
        </button>
      </div>

      {rows.map((c, i) => (
        <Card key={c.code || `cp-${i}`} testID={`admin-coupon-${c.code}`}>
          <CardHead><CardTitle>{c.code}</CardTitle><Badge text={c.active ? "LIVE" : "DISABLED"} tone={c.active ? "green" : "gray"} /></CardHead>
          <CardMeta>{c.discount_type === "percent" ? `${c.value}% off` : `₹${c.value} off`} · {PRODUCT_LABELS[c.applies_to] || c.applies_to}</CardMeta>
          <CardFoot>
            <Micro>Used {c.used_count}{c.max_uses ? ` of ${c.max_uses}` : "×"}{c.expires_at ? ` · expires ${fmtDate(new Date(c.expires_at * 1000).toISOString())}` : ""}</Micro>
            <ApproveBtn testID={`admin-coupon-toggle-${c.code}`} onClick={() => toggleActive(c)} busy={busyCode === c.code} active={c.active} on={c.active ? "DISABLE" : "ENABLE"} />
          </CardFoot>
        </Card>
      ))}
    </>
  );
}

export default function Admin() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState("USERS");
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const adminFetch = useCallback((path, method = "GET", body) => {
    if (method === "GET") return apiGet(`/admin${path}`, true);
    if (method === "POST") return apiPost(`/admin${path}`, body, true);
    if (method === "PATCH") return apiPatch(`/admin${path}`, body, true);
  }, []);

  const load = useCallback(async (t) => {
    setLoading(true);
    setError(null);
    try {
      const path = { USERS: "/users", EMPLOYERS: "/employers", PROS: "/freelancers", PAYMENTS: "/payments", ISSUES: "/complaints", COUPONS: "/coupons" }[t];
      const [ov, data] = await Promise.all([adminFetch("/overview"), adminFetch(path)]);
      setOverview(ov);
      setRows(data);
    } catch (e) {
      setError(e?.message || "Could not load data.");
    } finally { setLoading(false); }
  }, [adminFetch]);

  useEffect(() => { if (user?.is_admin) load(tab); }, [user?.is_admin, tab, load]);

  if (authLoading) return <Shell><div className="flex justify-center py-20"><Spinner /></div></Shell>;

  if (!user?.is_admin) {
    return (
      <Shell>
        <div data-testid="admin-denied" className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
          <Lock size={40} className="text-ink" />
          <p className="text-base font-black tracking-wider text-ink">ADMIN ACCESS ONLY</p>
          <p className="text-xs text-inkmuted">Sign in with the WorkHop admin account to open this dashboard.</p>
          <button data-testid="admin-denied-back" onClick={() => nav(-1)} className="mt-1 bg-ink px-6 py-3 text-xs font-black tracking-wider text-white">GO BACK</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBar
        title="ADMIN DASHBOARD"
        sub={user.email}
        backTestID="admin-back-btn"
        right={<span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-ink"><Shield size={18} className="text-brand" /></span>}
      />
      {overview && (
        <div className="border-b-2 border-ink">
          <div className="wh-scroll mx-auto flex max-w-[1600px] gap-2 overflow-x-auto p-3 sm:px-8">
            <Stat label="USERS" value={overview.users} />
            <Stat label="EMPLOYERS" value={overview.employers ?? 0} />
            <Stat label="PROS" value={overview.freelancers} />
            <Stat label="PAID ORDERS" value={overview.payments_paid} />
            <Stat label="REVENUE" value={`₹${Number(overview.revenue_rupees).toLocaleString("en-IN")}`} accent />
            <Stat label="ISSUES" value={overview.complaints} />
          </div>
        </div>
      )}
      <div className="border-b-2 border-ink bg-white">
        <div className="mx-auto flex max-w-[1600px] sm:px-8">
          {TABS.map((t) => (
            <button key={t} data-testid={`admin-tab-${t.toLowerCase()}`} onClick={() => setTab(t)} className={`flex-1 py-3 text-[10px] font-black tracking-wide ${tab === t ? "bg-ink text-brand" : "bg-white text-ink"}`}>{t}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : error ? (
        <p data-testid="admin-error" className="mt-8 text-center text-[13px] font-bold text-[#C62828]">{error}</p>
      ) : (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 p-4 sm:p-8 pb-16">
          {tab === "USERS" && <UsersTab rows={rows} />}
          {tab === "EMPLOYERS" && <EmployersTab data={rows} />}
          {tab === "PROS" && <ProsTab rows={rows} onChanged={() => load(tab)} adminFetch={adminFetch} />}
          {tab === "PAYMENTS" && <PaymentsTab rows={rows} />}
          {tab === "ISSUES" && <IssuesTab rows={rows} />}
          {tab === "COUPONS" && <CouponsTab rows={rows} onChanged={() => load(tab)} adminFetch={adminFetch} />}
        </div>
      )}
    </Shell>
  );
}
