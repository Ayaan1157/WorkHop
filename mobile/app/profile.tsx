import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [freelancerId, setFreelancerId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [skill, setSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadPro = useCallback(async () => {
    const fid = await AsyncStorage.getItem("workhop_freelancer_id");
    if (!fid) return;
    setFreelancerId(fid);
    try {
      const r = await fetch(`${BACKEND_URL}/api/freelancer/${fid}/profile`);
      if (r.ok) {
        const p = await r.json();
        setPhone((p.phone || "").replace(/\D/g, "").replace(/^91/, ""));
        setSkill(p.skill || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadPro();
  }, [loadPro]);

  const savePro = async () => {
    if (!freelancerId) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setSaveMsg({ ok: false, text: "Phone must be exactly 10 digits." });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/freelancer/${freelancerId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, skill: skill.trim() || null }),
      });
      const data = await r.json();
      if (r.ok) setSaveMsg({ ok: true, text: `Saved · employers see ${data.phone} after unlock` });
      else setSaveMsg({ ok: false, text: data?.detail || "Could not save." });
    } catch {
      setSaveMsg({ ok: false, text: "Network error. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const menu = [
    { icon: "chatbubbles", label: "My Messages", sub: "Chats with employers & pros", to: "/freelancer/chats", testID: "profile-chats" },
    { icon: "map", label: "Live Map", sub: "Pros & employers near you", to: "/map", testID: "profile-map" },
    { icon: "grid", label: "Browse Categories", sub: "All gigs & sub-gigs", to: "/categories", testID: "profile-categories" },
    { icon: "pricetag", label: "Plans & Pricing", sub: "Job posts, boosts & branding", to: "/employer/plans", testID: "profile-plans" },
    { icon: "help-buoy", label: "Support & Complaints", sub: "FAQs, help and reporting", to: "/support", testID: "profile-support" },
    { icon: "document-text", label: "Legal & Policies", sub: "Terms, privacy — Bengaluru", to: "/legal", testID: "profile-legal" },
  ] as const;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} testID="profile-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <Text style={styles.topTitle}>MY PROFILE</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero} testID="profile-hero">
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name || "Guest"}</Text>
          <Text style={styles.email}>{user?.email || "Not signed in"}</Text>
          <View style={styles.memberPill}>
            <Ionicons name="shield-checkmark" size={11} color={COLORS.white} />
            <Text style={styles.memberText}>WORKHOP MEMBER · BENGALURU</Text>
          </View>
        </View>

        {freelancerId && (
          <View style={styles.proCard} testID="pro-profile-card">
            <View style={styles.proHead}>
              <Ionicons name="briefcase" size={14} color={COLORS.brand} />
              <Text style={styles.proTitle}>PRO PROFILE</Text>
            </View>
            <Text style={styles.proLabel}>PHONE NUMBER (shown to employers after unlock)</Text>
            <TextInput
              testID="pro-phone-input"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              placeholderTextColor={COLORS.onSurfaceMuted}
              keyboardType="number-pad"
              style={styles.proInput}
            />
            <Text style={styles.proLabel}>PRIMARY SKILL</Text>
            <TextInput
              testID="pro-skill-input"
              value={skill}
              onChangeText={setSkill}
              placeholder="e.g. Logo Designer"
              placeholderTextColor={COLORS.onSurfaceMuted}
              style={styles.proInput}
            />
            {saveMsg && (
              <Text
                testID="pro-save-msg"
                style={[styles.proMsg, { color: saveMsg.ok ? COLORS.success : "#C62828" }]}
              >
                {saveMsg.text}
              </Text>
            )}
            <Pressable
              testID="pro-save-btn"
              disabled={saving}
              onPress={savePro}
              style={[styles.proSaveBtn, saving && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.proSaveText}>SAVE PRO DETAILS</Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.menu}>
          {user?.is_admin && (
            <Pressable
              testID="profile-admin"
              onPress={() => router.push("/admin" as any)}
              style={({ pressed }) => [styles.menuRow, styles.adminRow, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.menuIcon, { backgroundColor: COLORS.black }]}>
                <Ionicons name="shield" size={18} color={COLORS.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Admin Dashboard</Text>
                <Text style={styles.menuSub}>Users, payments, complaints & coupons</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceMuted} />
            </Pressable>
          )}
          {menu.map((m) => (
            <Pressable
              key={m.label}
              testID={m.testID}
              onPress={() => router.push(m.to as any)}
              style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={m.icon as any} size={18} color={COLORS.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{m.label}</Text>
                <Text style={styles.menuSub}>{m.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceMuted} />
            </Pressable>
          ))}
        </View>

        {user && (
          <Pressable
            testID="profile-logout-btn"
            onPress={async () => {
              await logout();
              router.replace("/");
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={16} color={COLORS.white} />
            <Text style={styles.logoutText}>LOG OUT</Text>
          </Pressable>
        )}
        <Text style={styles.version}>WorkHop v2 · Made in Bengaluru 🧡</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 2, borderBottomColor: COLORS.black,
  },
  iconBtn: { width: 40, height: 40, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center" },
  topTitle: { fontWeight: "900", fontSize: 15, letterSpacing: 1.5, color: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxxl },
  hero: { alignItems: "center", gap: SPACING.sm, borderWidth: 2, borderColor: COLORS.black, padding: SPACING.xl },
  avatar: { width: 72, height: 72, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 72, height: 72, borderWidth: 2, borderColor: COLORS.black },
  avatarText: { color: COLORS.white, fontWeight: "900", fontSize: 28 },
  name: { fontWeight: "900", fontSize: 20, color: COLORS.black },
  email: { fontSize: 12, color: COLORS.onSurfaceMuted },
  memberPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.black, paddingHorizontal: SPACING.md, paddingVertical: 5, marginTop: SPACING.xs },
  memberText: { color: COLORS.white, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  menu: { gap: SPACING.sm },
  proCard: { borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.surface },
  proHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  proTitle: { fontWeight: "900", fontSize: 12, letterSpacing: 1.4, color: COLORS.black },
  proLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: COLORS.onSurfaceMuted, marginTop: 2 },
  proInput: {
    borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.md,
    height: 44, fontSize: 14, fontWeight: "600", color: COLORS.black, backgroundColor: COLORS.surfaceSecondary,
  },
  proMsg: { fontSize: 11, fontWeight: "700" },
  proSaveBtn: {
    backgroundColor: COLORS.black, paddingVertical: SPACING.md,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  proSaveText: { color: COLORS.white, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, backgroundColor: COLORS.surface,
  },
  menuIcon: { width: 38, height: 38, borderWidth: 2, borderColor: COLORS.black, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceSecondary },
  adminRow: { backgroundColor: "#FFF3E9", borderBottomWidth: 2, borderBottomColor: COLORS.black },
  menuLabel: { fontWeight: "900", fontSize: 14, color: COLORS.black },
  menuSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 1 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm,
    backgroundColor: COLORS.black, paddingVertical: SPACING.lg, borderWidth: 2, borderColor: COLORS.black,
  },
  logoutText: { color: COLORS.white, fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  version: { textAlign: "center", fontSize: 11, color: COLORS.onSurfaceMuted },
});
