import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, RADIUS, SPACING } from "@/src/theme";

type Conversation = {
  conversation_id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  freelancer_name: string;
  status?: string;
};

type Message = {
  message_id: string;
  sender_role: "freelancer" | "employer";
  text: string;
  created_at: string;
};

export default function ChatThread() {
  const router = useRouter();
  const { id, role } = useLocalSearchParams<{ id: string; role?: string }>();
  const myRole = role === "employer" ? "employer" : "freelancer";
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [myReviewDone, setMyReviewDone] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const status = conv?.status || "applied";

  const setStatus = async (next: "hired" | "completed") => {
    setBusy(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/chats/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (r.ok) setConv(await r.json());
    } catch (e) {
      console.log("status err", e);
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (rating < 1) return;
    setBusy(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: id,
          reviewer_role: myRole,
          rating,
          text: reviewText,
        }),
      });
      if (r.ok || r.status === 409) {
        setMyReviewDone(true);
        setReviewOpen(false);
      }
    } catch (e) {
      console.log("review err", e);
    } finally {
      setBusy(false);
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/chats/${id}/messages`);
      if (r.ok) setMessages(await r.json());
    } catch (e) {
      console.log("msgs err", e);
    }
  }, [id]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/chats/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setConv)
      .catch(() => {});
    loadMessages().finally(() => setLoading(false));
    fetch(`${BACKEND_URL}/api/reviews?conversation_id=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rev: { reviewer_role: string }[]) => {
        if (rev.some((x) => x.reviewer_role === myRole)) setMyReviewDone(true);
      })
      .catch(() => {});
    const timer = setInterval(loadMessages, 3000);
    return () => clearInterval(timer);
  }, [id, loadMessages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const r = await fetch(`${BACKEND_URL}/api/chats/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_role: myRole, text: body }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages((m) => [...m, msg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
      }
    } catch (e) {
      console.log("send err", e);
    } finally {
      setSending(false);
    }
  };

  const otherName =
    myRole === "freelancer" ? conv?.company_name : conv?.freelancer_name;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar} testID="chat-topbar">
        <Pressable onPress={() => router.back()} testID="chat-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(otherName || "?").slice(0, 1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {otherName || "Chat"}
          </Text>
          <Text style={styles.topSub} numberOfLines={1}>
            {conv?.job_title || ""}
          </Text>
        </View>
      </View>

      {/* Job lifecycle bar */}
      <View style={styles.statusBar} testID="chat-status-bar">
        <View
          style={[
            styles.statusPill,
            status === "hired" && { backgroundColor: COLORS.brand },
            status === "completed" && { backgroundColor: COLORS.success },
          ]}
        >
          <Text style={styles.statusPillText}>
            {status === "applied" ? "APPLIED" : status === "hired" ? "HIRED" : "COMPLETED"}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {myRole === "employer" && status === "applied" && (
          <Pressable testID="chat-hire-btn" disabled={busy} onPress={() => setStatus("hired")} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>HIRE PRO</Text>
          </Pressable>
        )}
        {myRole === "employer" && status === "hired" && (
          <Pressable testID="chat-complete-btn" disabled={busy} onPress={() => setStatus("completed")} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>MARK COMPLETED</Text>
          </Pressable>
        )}
        {status === "completed" &&
          (myReviewDone ? (
            <View style={styles.reviewedPill} testID="chat-reviewed-pill">
              <Ionicons name="star" size={11} color={COLORS.white} />
              <Text style={styles.reviewedText}>REVIEWED</Text>
            </View>
          ) : (
            <Pressable
              testID="chat-review-btn"
              onPress={() => setReviewOpen(true)}
              style={[styles.actionBtn, { backgroundColor: COLORS.brand }]}
            >
              <Text style={styles.actionBtnText}>★ RATE {myRole === "employer" ? "PRO" : "EMPLOYER"}</Text>
            </Pressable>
          ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.black} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            <View style={styles.noticeCard} testID="chat-privacy-notice">
              <Ionicons name="shield-checkmark" size={14} color={COLORS.black} />
              <Text style={styles.noticeText}>
                Employer details stay private until they choose to share them here.
              </Text>
            </View>
            {messages.length === 0 && (
              <Text style={styles.emptyText} testID="chat-empty">
                Say hello — pitch why you&apos;re the right pro for this gig.
              </Text>
            )}
            {messages.map((m) => {
              const mine = m.sender_role === myRole;
              return (
                <View
                  key={m.message_id}
                  style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
                >
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && { color: COLORS.white }]}>
                      {m.text}
                    </Text>
                    <Text style={[styles.bubbleTime, mine && { color: "#FFD9C2" }]}>
                      {new Date(m.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
            <View style={{ height: SPACING.lg }} />
          </ScrollView>
        )}

        <View style={styles.composer} testID="chat-composer">
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={COLORS.onSurfaceMuted}
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <Pressable
            testID="chat-send-btn"
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          >
            <Ionicons name="paper-plane" size={18} color={COLORS.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {reviewOpen && (
        <View style={styles.modalOverlay} testID="review-modal">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Rate {myRole === "employer" ? conv?.freelancer_name : conv?.company_name}
            </Text>
            <Text style={styles.modalSub}>{conv?.job_title}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} testID={`star-${s}`} onPress={() => setRating(s)}>
                  <Ionicons
                    name={s <= rating ? "star" : "star-outline"}
                    size={34}
                    color={COLORS.brand}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="review-text"
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Share your experience (optional)…"
              placeholderTextColor={COLORS.onSurfaceMuted}
              style={styles.reviewInput}
              multiline
              maxLength={600}
            />
            <Pressable
              testID="review-submit-btn"
              disabled={rating < 1 || busy}
              onPress={submitReview}
              style={[styles.reviewSubmit, (rating < 1 || busy) && { opacity: 0.5 }]}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.reviewSubmitText}>SUBMIT REVIEW</Text>
              )}
            </Pressable>
            <Pressable testID="review-cancel-btn" onPress={() => setReviewOpen(false)}>
              <Text style={styles.reviewCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
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
  avatar: {
    width: 38,
    height: 38,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  topTitle: { fontWeight: "900", fontSize: 15, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 1 },
  msgList: { padding: SPACING.lg, gap: SPACING.sm },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    backgroundColor: COLORS.surfaceSecondary,
  },
  statusPill: {
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  statusPillText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  actionBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  actionBtnText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  reviewedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  reviewedText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  modalCard: {
    alignSelf: "stretch",
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.xl,
    gap: SPACING.md,
    alignItems: "center",
  },
  modalTitle: { fontWeight: "900", fontSize: 18, color: COLORS.black, textAlign: "center" },
  modalSub: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center" },
  starsRow: { flexDirection: "row", gap: SPACING.sm, marginVertical: SPACING.sm },
  reviewInput: {
    alignSelf: "stretch",
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.md,
    minHeight: 80,
    fontSize: 13,
    color: COLORS.black,
    textAlignVertical: "top",
  },
  reviewSubmit: {
    alignSelf: "stretch",
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  reviewSubmitText: { color: COLORS.white, fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  reviewCancel: { fontSize: 12, color: COLORS.onSurfaceMuted, fontWeight: "700" },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  noticeText: { fontSize: 11, color: COLORS.black, flex: 1 },
  emptyText: {
    textAlign: "center",
    color: COLORS.onSurfaceMuted,
    fontSize: 12,
    marginVertical: SPACING.xl,
  },
  bubbleRow: { flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  bubbleMine: { backgroundColor: COLORS.brand },
  bubbleTheirs: { backgroundColor: COLORS.surface },
  bubbleText: { fontSize: 14, color: COLORS.black, lineHeight: 19 },
  bubbleTime: { fontSize: 9, color: COLORS.onSurfaceMuted, marginTop: 3, alignSelf: "flex-end" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.black,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLORS.black,
    maxHeight: 110,
    minHeight: 44,
    backgroundColor: COLORS.surface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.black,
  },
});
