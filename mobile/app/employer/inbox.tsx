import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";

type Conversation = {
  conversation_id: string;
  job_title: string;
  company_name: string;
  freelancer_name: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};

export default function EmployerInbox() {
  const router = useRouter();
  const [chats, setChats] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/chats`);
      if (r.ok) setChats(await r.json());
    } catch (e) {
      console.log("inbox err", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar} testID="inbox-topbar">
        <Pressable onPress={() => router.back()} testID="inbox-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>APPLICANT INBOX</Text>
          <Text style={styles.topSub}>Verified pros who applied to your gigs</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.black} style={{ marginTop: 60 }} />
      ) : chats.length === 0 ? (
        <View style={styles.emptyWrap} testID="inbox-empty">
          <Ionicons name="mail-open" size={34} color={COLORS.black} />
          <Text style={styles.emptyTitle}>No applicants yet</Text>
          <Text style={styles.emptySub}>
            When a verified pro applies to one of your gigs, the chat shows up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        >
          {chats.map((c, i) => (
            <Pressable
              key={c.conversation_id}
              testID={`inbox-row-${i}`}
              onPress={() => router.push(`/chat/${c.conversation_id}?role=employer`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{c.freelancer_name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {c.freelancer_name}
                </Text>
                <Text style={styles.rowJob} numberOfLines={1}>
                  {c.job_title} · {c.company_name}
                </Text>
                <Text style={styles.rowLast} numberOfLines={1}>
                  {c.last_message || "New application received"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 1.5, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2 },
  list: { padding: SPACING.lg, gap: SPACING.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.white, fontWeight: "900", fontSize: 18 },
  rowTitle: { fontWeight: "900", fontSize: 14, color: COLORS.black },
  rowJob: { fontSize: 11, color: COLORS.brand, fontWeight: "700", marginTop: 1 },
  rowLast: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  emptyWrap: { alignItems: "center", gap: SPACING.md, padding: SPACING.xxl, marginTop: 40 },
  emptyTitle: { fontWeight: "900", fontSize: 17, color: COLORS.black },
  emptySub: { fontSize: 13, color: COLORS.onSurfaceMuted, textAlign: "center", lineHeight: 18 },
});
