import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";
import { getToken, useAuth } from "@/src/auth";

const TABS = ["USERS", "EMPLOYERS", "PROS", "PAYMENTS", "ISSUES", "COUPONS"] as const;
type Tab = (typeof TABS)[number];

const PRODUCT_LABELS: Record<string, string> = {
  all: "All purchases",
  employer_unlock: "Lead unlock ₹199",
  freelancer_onboarding: "Onboarding ₹99",
  quota_boost: "Applies boost ₹149",
  plan: "Employer plans",
};

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/api/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Request failed");
  return data;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("USERS");
  const [overview, setOverview] = useState<any>(null);
  const [rows, setRows] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const path = { USERS: "/users", EMPLOYERS: "/employers", PROS: "/freelancers", PAYMENTS: "/payments", ISSUES: "/complaints", COUPONS: "/coupons" }[t];
      const [ov, data] = await Promise.all([adminFetch("/overview"), adminFetch(path)]);
      setOverview(ov);
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin) load(tab);
  }, [user?.is_admin, tab, load]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator color={COLORS.black} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!user?.is_admin) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.deniedWrap} testID="admin-denied">
          <Ionicons name="lock-closed" size={40} color={COLORS.black} />
          <Text style={styles.deniedTitle}>ADMIN ACCESS ONLY</Text>
          <Text style={styles.deniedSub}>Sign in with the WorkHop admin account to open this dashboard.</Text>
          <Pressable testID="admin-denied-back" onPress={() => router.back()} style={styles.deniedBtn}>
            <Text style={styles.deniedBtnText}>GO BACK</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} testID="admin-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>ADMIN DASHBOARD</Text>
          <Text style={styles.topSub}>{user.email}</Text>
        </View>
        <View style={[styles.iconBtn, { backgroundColor: COLORS.black }]}>
          <Ionicons name="shield" size={18} color={COLORS.brand} />
        </View>
      </View>

      {overview && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsStrip} contentContainerStyle={styles.statsContent}>
          <Stat label="USERS" value={overview.users} />
          <Stat label="EMPLOYERS" value={overview.employers ?? 0} />
          <Stat label="PROS" value={overview.freelancers} />
          <Stat label="PAID ORDERS" value={overview.payments_paid} />
          <Stat label="REVENUE" value={`₹${Number(overview.revenue_rupees).toLocaleString("en-IN")}`} accent />
          <Stat label="ISSUES" value={overview.complaints} />
        </ScrollView>
      )}

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            testID={`admin-tab-${t.toLowerCase()}`}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.black} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText} testID="admin-error">{error}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(tab)} />}
        >
          {tab === "USERS" && <UsersTab rows={rows} />}
          {tab === "EMPLOYERS" && <EmployersTab data={rows} />}
          {tab === "PROS" && <ProsTab rows={rows} onChanged={() => load(tab)} />}
          {tab === "PAYMENTS" && <PaymentsTab rows={rows} />}
          {tab === "ISSUES" && <IssuesTab rows={rows} />}
          {tab === "COUPONS" && <CouponsTab rows={rows} onChanged={() => load(tab)} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <View style={[styles.statCard, accent && { backgroundColor: COLORS.brand }]}>
      <Text style={[styles.statValue, accent && { color: COLORS.white }]}>{value}</Text>
      <Text style={[styles.statLabel, accent && { color: COLORS.white }]}>{label}</Text>
    </View>
  );
}

function Badge({ text, tone }: { text: string; tone: "green" | "orange" | "gray" | "black" }) {
  const bg = { green: "#E5F7E0", orange: "#FFE8D6", gray: COLORS.surfaceSecondary, black: COLORS.black }[tone];
  const fg = tone === "black" ? COLORS.white : COLORS.black;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

function UsersTab({ rows }: { rows: any[] }) {
  if (!rows.length) return <Text style={styles.emptyText}>No registered users yet.</Text>;
  return (
    <>
      {rows.map((u, i) => (
        <View key={u.user_id || `u-${i}`} style={styles.card} testID={`admin-user-${u.user_id}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>{u.name || u.email}</Text>
            <Badge text={u.role === "freelancer" ? "FREELANCER" : "EMPLOYER"} tone={u.role === "freelancer" ? "orange" : "gray"} />
          </View>
          <Text style={styles.cardMeta}>{u.email}</Text>
          <View style={styles.cardFoot}>
            <Text style={styles.cardMicro}>Joined {fmtDate(u.created_at)}</Text>
            {u.role === "freelancer" && (
              <Badge text={u.approved ? "APPROVED ✓" : "NOT APPROVED"} tone={u.approved ? "green" : "gray"} />
            )}
          </View>
        </View>
      ))}
    </>
  );
}

function EmployersTab({ data }: { data: any }) {
  const accounts: any[] = Array.isArray(data?.accounts) ? data.accounts : [];
  const devices: any[] = Array.isArray(data?.devices) ? data.devices : [];
  if (!accounts.length && !devices.length) return <Text style={styles.emptyText}>No employers yet.</Text>;
  return (
    <>
      <Text style={styles.sectionLabel}>EMPLOYER ACCOUNTS ({accounts.length})</Text>
      {accounts.length === 0 && <Text style={styles.cardMeta}>No signed-in employer accounts yet.</Text>}
      {accounts.map((e, i) => (
        <View key={e.email || `emp-${i}`} style={styles.card} testID={`admin-employer-${i}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>{e.name || e.email || "Employer"}</Text>
            <Badge text="EMPLOYER" tone="gray" />
          </View>
          <Text style={styles.cardMeta}>{e.email}</Text>
          <View style={styles.cardFoot}>
            <Text style={styles.cardMicro}>Joined {fmtDate(e.created_at)}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>HIRING ACTIVITY ({devices.length})</Text>
      {devices.length === 0 && <Text style={styles.cardMeta}>No lead unlocks, plans or job posts yet.</Text>}
      {devices.map((d, i) => (
        <View key={d.employer_id || `dev-${i}`} style={styles.card} testID={`admin-employer-device-${i}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>₹{Number(d.spent_rupees || 0).toLocaleString("en-IN")} spent</Text>
            <Badge text={`${d.jobs_posted} JOBS`} tone={d.jobs_posted ? "green" : "gray"} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            <Badge text={`${d.unlocks} UNLOCKS`} tone="orange" />
            <Badge text={`${d.plans} PLANS`} tone="gray" />
            <Badge text={`${d.jobs_posted} POSTS`} tone="gray" />
          </View>
          <View style={styles.cardFoot}>
            <Text style={styles.cardMicro} numberOfLines={1}>{d.employer_id}</Text>
            <Text style={styles.cardMicro}>Active {fmtDate(d.last_active)}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function ProsTab({ rows, onChanged }: { rows: any[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleApprove = async (f: any) => {
    setBusyId(f.freelancer_id);
    try {
      await adminFetch(`/freelancers/${f.freelancer_id}/approve`, {
        method: "POST",
        body: JSON.stringify({ approved: !f.approved }),
      });
      onChanged();
    } catch (e) {
      console.log("approve err", e);
    } finally {
      setBusyId(null);
    }
  };

  if (!rows.length) return <Text style={styles.emptyText}>No freelancer profiles yet.</Text>;
  return (
    <>
      {rows.map((f, i) => (
        <View key={f.freelancer_id || `f-${i}`} style={styles.card} testID={`admin-pro-${f.freelancer_id}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>{f.full_name || "Unnamed"}</Text>
            <Badge text={f.approved ? "APPROVED ✓" : "PENDING"} tone={f.approved ? "green" : "orange"} />
          </View>
          <Text style={styles.cardMeta}>
            {[f.skill, f.category, f.rate_hr ? `₹${f.rate_hr}/hr` : null].filter(Boolean).join(" · ") || "No skill details"}
          </Text>
          <Text style={styles.cardMeta}>{[f.email, f.phone].filter(Boolean).join(" · ") || "No contact yet"}</Text>
          <View style={styles.chipRow}>
            <Badge text={f.paid ? "PAID ₹99" : "UNPAID"} tone={f.paid ? "green" : "gray"} />
            <Badge text={f.email_verified ? "EMAIL ✓" : "UNVERIFIED"} tone={f.email_verified ? "green" : "gray"} />
            <Badge text={(f.status || "new").toUpperCase().replace("_", " ")} tone="gray" />
          </View>
          <View style={styles.cardFoot}>
            <Text style={styles.cardMicro}>Joined {fmtDate(f.created_at)}</Text>
            <Pressable
              testID={`admin-approve-${f.freelancer_id}`}
              onPress={() => toggleApprove(f)}
              disabled={busyId === f.freelancer_id}
              style={[styles.approveBtn, f.approved && styles.revokeBtn, busyId === f.freelancer_id && { opacity: 0.5 }]}
            >
              {busyId === f.freelancer_id ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.approveBtnText}>{f.approved ? "REVOKE" : "APPROVE"}</Text>
              )}
            </Pressable>
          </View>
        </View>
      ))}
    </>
  );
}

function PaymentsTab({ rows }: { rows: any[] }) {
  if (!rows.length) return <Text style={styles.emptyText}>No payments yet.</Text>;
  return (
    <>
      {rows.map((p, i) => (
        <View key={p.order_id || `p-${i}`} style={styles.card} testID={`admin-payment-${p.order_id}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>₹{Number(p.amount_rupees).toLocaleString("en-IN")}</Text>
            <Badge text={(p.status || "created").toUpperCase()} tone={p.status === "paid" ? "green" : "gray"} />
          </View>
          <Text style={styles.cardMeta}>
            {PRODUCT_LABELS[p.product] || p.product}
            {p.plan_id ? ` · ${p.plan_id}` : ""}
          </Text>
          {!!p.coupon_code && (
            <Text style={styles.couponUsed}>
              🏷 {p.coupon_code} · saved ₹{p.discount_rupees}
            </Text>
          )}
          <View style={styles.cardFoot}>
            <Text style={styles.cardMicro} numberOfLines={1}>{p.payer || "—"}</Text>
            <Text style={styles.cardMicro}>{fmtDate(p.created_at)}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function IssuesTab({ rows }: { rows: any[] }) {
  if (!rows.length) return <Text style={styles.emptyText}>No complaints — all clear! 🧡</Text>;
  return (
    <>
      {rows.map((c, i) => (
        <View key={c.complaint_id || `c-${i}`} style={styles.card} testID={`admin-complaint-${c.complaint_id}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>{c.subject || "Complaint"}</Text>
            <Badge text={(c.role || "user").toUpperCase()} tone="gray" />
          </View>
          <Text style={styles.complaintMsg}>{c.message}</Text>
          <View style={styles.cardFoot}>
            <Text style={styles.cardMicro} numberOfLines={1}>{[c.name, c.email].filter(Boolean).join(" · ")}</Text>
            <Text style={styles.cardMicro}>{fmtDate(c.created_at)}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function CouponsTab({ rows, onChanged }: { rows: any[]; onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [appliesTo, setAppliesTo] = useState("all");
  const [maxUses, setMaxUses] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const create = async () => {
    setMsg(null);
    if (!code.trim() || !value.trim()) {
      setMsg({ ok: false, text: "Enter a code and a discount value." });
      return;
    }
    setCreating(true);
    try {
      await adminFetch("/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          discount_type: type,
          value: parseInt(value, 10),
          applies_to: appliesTo,
          max_uses: maxUses.trim() ? parseInt(maxUses, 10) : 0,
          expires_in_days: expiryDays.trim() ? parseInt(expiryDays, 10) : null,
        }),
      });
      setMsg({ ok: true, text: `${code.trim().toUpperCase()} created and live.` });
      setCode(""); setValue(""); setMaxUses(""); setExpiryDays("");
      onChanged();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Could not create coupon." });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (c: any) => {
    setBusyCode(c.code);
    try {
      await adminFetch(`/coupons/${c.code}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !c.active }),
      });
      onChanged();
    } catch (e) {
      console.log("coupon toggle err", e);
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <>
      <View style={styles.createCard} testID="admin-coupon-form">
        <Text style={styles.createTitle}>CREATE NEW COUPON</Text>
        <TextInput
          testID="coupon-code-input"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="CODE e.g. DIWALI25"
          placeholderTextColor={COLORS.onSurfaceMuted}
          style={styles.input}
          autoCapitalize="characters"
        />
        <View style={styles.rowSplit}>
          <View style={styles.typeToggle}>
            {(["percent", "flat"] as const).map((t) => (
              <Pressable
                key={t}
                testID={`coupon-type-${t}`}
                onPress={() => setType(t)}
                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
              >
                <Text style={[styles.typeText, type === t && { color: COLORS.white }]}>
                  {t === "percent" ? "% OFF" : "₹ OFF"}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            testID="coupon-value-input"
            value={value}
            onChangeText={(t) => setValue(t.replace(/[^0-9]/g, ""))}
            placeholder={type === "percent" ? "e.g. 25" : "e.g. 100"}
            placeholderTextColor={COLORS.onSurfaceMuted}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
          />
        </View>
        <Text style={styles.fieldLabel}>APPLIES TO</Text>
        <View style={styles.chipRow}>
          {Object.entries(PRODUCT_LABELS).map(([k, label]) => (
            <Pressable
              key={k}
              testID={`coupon-applies-${k}`}
              onPress={() => setAppliesTo(k)}
              style={[styles.applyChip, appliesTo === k && styles.applyChipActive]}
            >
              <Text style={[styles.applyChipText, appliesTo === k && { color: COLORS.white }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.rowSplit}>
          <TextInput
            testID="coupon-maxuses-input"
            value={maxUses}
            onChangeText={(t) => setMaxUses(t.replace(/[^0-9]/g, ""))}
            placeholder="Max uses (blank = ∞)"
            placeholderTextColor={COLORS.onSurfaceMuted}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
          />
          <TextInput
            testID="coupon-expiry-input"
            value={expiryDays}
            onChangeText={(t) => setExpiryDays(t.replace(/[^0-9]/g, ""))}
            placeholder="Expiry days (blank = never)"
            placeholderTextColor={COLORS.onSurfaceMuted}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
          />
        </View>
        {msg && (
          <Text testID="coupon-create-msg" style={[styles.createMsg, { color: msg.ok ? COLORS.success : "#C62828" }]}>
            {msg.text}
          </Text>
        )}
        <Pressable
          testID="coupon-create-btn"
          onPress={create}
          disabled={creating}
          style={[styles.createBtn, creating && { opacity: 0.6 }]}
        >
          {creating ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.createBtnText}>CREATE COUPON</Text>
          )}
        </Pressable>
      </View>

      {rows.map((c, i) => (
        <View key={c.code || `cp-${i}`} style={styles.card} testID={`admin-coupon-${c.code}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{c.code}</Text>
            <Badge text={c.active ? "LIVE" : "DISABLED"} tone={c.active ? "green" : "gray"} />
          </View>
          <Text style={styles.cardMeta}>
            {c.discount_type === "percent" ? `${c.value}% off` : `₹${c.value} off`} · {PRODUCT_LABELS[c.applies_to] || c.applies_to}
          </Text>
          <View style={styles.cardFoot}>
            <Text style={styles.cardMicro}>
              Used {c.used_count}{c.max_uses ? ` of ${c.max_uses}` : "×"}
              {c.expires_at ? ` · expires ${fmtDate(new Date(c.expires_at * 1000).toISOString())}` : ""}
            </Text>
            <Pressable
              testID={`admin-coupon-toggle-${c.code}`}
              onPress={() => toggleActive(c)}
              disabled={busyCode === c.code}
              style={[styles.approveBtn, c.active && styles.revokeBtn, busyCode === c.code && { opacity: 0.5 }]}
            >
              {busyCode === c.code ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.approveBtnText}>{c.active ? "DISABLE" : "ENABLE"}</Text>
              )}
            </Pressable>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 2, borderBottomColor: COLORS.black,
  },
  iconBtn: { width: 40, height: 40, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center" },
  topTitle: { fontWeight: "900", fontSize: 15, letterSpacing: 1.5, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted },
  statsStrip: { flexGrow: 0, borderBottomWidth: 2, borderBottomColor: COLORS.black },
  statsContent: { padding: SPACING.md, gap: SPACING.sm },
  statCard: {
    borderWidth: 2, borderColor: COLORS.black, backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minWidth: 84, alignItems: "center",
  },
  statValue: { fontWeight: "900", fontSize: 16, color: COLORS.black },
  statLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5, color: COLORS.onSurfaceMuted },
  tabRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: COLORS.black },
  tabBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: "center", backgroundColor: COLORS.surface },
  tabBtnActive: { backgroundColor: COLORS.black },
  tabText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5, color: COLORS.black },
  tabTextActive: { color: COLORS.brand },
  listContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 60 },
  emptyText: { textAlign: "center", color: COLORS.onSurfaceMuted, marginTop: 30, fontSize: 13 },
  sectionLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, color: COLORS.onSurfaceMuted },
  errorText: { textAlign: "center", color: "#C62828", marginTop: 30, fontSize: 13, fontWeight: "700" },
  card: { borderWidth: 2, borderColor: COLORS.black, backgroundColor: COLORS.white, padding: SPACING.md, gap: 4 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  cardTitle: { fontWeight: "900", fontSize: 14, color: COLORS.black, flex: 1 },
  cardMeta: { fontSize: 12, color: COLORS.onSurfaceMuted },
  cardMicro: { fontSize: 10, color: COLORS.onSurfaceMuted, flexShrink: 1 },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: SPACING.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1.5, borderColor: COLORS.black },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  approveBtn: { backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.md, paddingVertical: 7, minWidth: 84, alignItems: "center" },
  revokeBtn: { backgroundColor: COLORS.black },
  approveBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  couponUsed: { fontSize: 11, fontWeight: "800", color: COLORS.brand },
  complaintMsg: { fontSize: 12, color: COLORS.black, lineHeight: 17 },
  deniedWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl, gap: SPACING.md },
  deniedTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 1, color: COLORS.black },
  deniedSub: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center" },
  deniedBtn: { backgroundColor: COLORS.black, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  deniedBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  createCard: { borderWidth: 2, borderColor: COLORS.black, backgroundColor: "#FFF3E9", padding: SPACING.md, gap: SPACING.sm },
  createTitle: { fontWeight: "900", fontSize: 12, letterSpacing: 1, color: COLORS.black },
  input: {
    borderWidth: 2, borderColor: COLORS.black, backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md, height: 42, fontSize: 13, fontWeight: "700", color: COLORS.black,
  },
  rowSplit: { flexDirection: "row", gap: SPACING.sm, alignItems: "center" },
  typeToggle: { flexDirection: "row", borderWidth: 2, borderColor: COLORS.black },
  typeBtn: { paddingHorizontal: SPACING.md, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  typeBtnActive: { backgroundColor: COLORS.black },
  typeText: { fontSize: 11, fontWeight: "900", color: COLORS.black },
  fieldLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: COLORS.onSurfaceMuted, marginTop: 2 },
  applyChip: { borderWidth: 2, borderColor: COLORS.black, backgroundColor: COLORS.white, paddingHorizontal: 10, paddingVertical: 6 },
  applyChipActive: { backgroundColor: COLORS.brand },
  applyChipText: { fontSize: 10, fontWeight: "800", color: COLORS.black },
  createMsg: { fontSize: 11, fontWeight: "700" },
  createBtn: { backgroundColor: COLORS.black, height: 46, alignItems: "center", justifyContent: "center", marginTop: 2 },
  createBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
});
