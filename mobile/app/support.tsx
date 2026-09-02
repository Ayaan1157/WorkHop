import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";
import { useAuth } from "@/src/auth";

const SUPPORT_EMAIL = "manarastudio22@gmail.com";

const FAQS = [
  { q: "How do I get verified as a Pro?", a: "Complete the 4-step wizard: pay the one-time ₹99 fee, verify your email with an OTP, add portfolio links and upload work samples." },
  { q: "Why can't I see employer phone numbers?", a: "For safety, employer contact details stay private. Apply to a gig and chat in-app — employers share contacts in chat when ready." },
  { q: "How many gigs can I apply to per day?", a: "3 free applications every 24 hours. Need more? The ₹149 Boost adds 5 extra applies for the day (max 8 total)." },
  { q: "How do employer job posts work?", a: "Buy a Single Post (₹299) or Starter Bundle (5 posts, ₹999), then publish from the Post a Job form. Your gig goes live instantly." },
  { q: "How do refunds work?", a: "Payments are processed by Razorpay. For billing issues, raise a complaint below and we'll resolve within 48 hours." },
];

export default function Support() {
  const router = useRouter();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submitComplaint = async () => {
    setError("");
    if (!subject.trim() || !message.trim()) {
      setError("Add a subject and describe the issue.");
      return;
    }
    setSending(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.name || "WorkHop user",
          email: user?.email || "not-signed-in",
          role: "user",
          subject,
          message,
        }),
      });
      if (r.ok) {
        setSent(true);
        setSubject("");
        setMessage("");
      } else {
        setError("Could not submit. Try again.");
      }
    } catch {
      setError("Could not submit. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} testID="support-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>SUPPORT</Text>
          <Text style={styles.topSub}>WorkHop · Bengaluru</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>FREQUENTLY ASKED</Text>
          {FAQS.map((f, i) => (
            <Pressable
              key={f.q}
              testID={`faq-${i}`}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              style={styles.faqCard}
            >
              <View style={styles.faqHead}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Ionicons name={openFaq === i ? "chevron-up" : "chevron-down"} size={16} color={COLORS.black} />
              </View>
              {openFaq === i && <Text style={styles.faqA}>{f.a}</Text>}
            </Pressable>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>RAISE A COMPLAINT</Text>
          <View style={styles.emailCard}>
            <Ionicons name="mail" size={16} color={COLORS.brand} />
            <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
            <Pressable
              testID="support-mailto-btn"
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=WorkHop Complaint`)}
              style={styles.mailBtn}
            >
              <Text style={styles.mailBtnText}>EMAIL US</Text>
            </Pressable>
          </View>

          {sent ? (
            <View style={styles.sentCard} testID="complaint-sent">
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              <Text style={styles.sentTitle}>Complaint registered</Text>
              <Text style={styles.sentSub}>
                Our team at {SUPPORT_EMAIL} will get back within 48 hours.
              </Text>
              <Pressable testID="complaint-another-btn" onPress={() => setSent(false)} style={styles.anotherBtn}>
                <Text style={styles.anotherText}>RAISE ANOTHER</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                testID="complaint-subject"
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject — e.g. Payment issue"
                placeholderTextColor={COLORS.onSurfaceMuted}
                style={styles.input}
              />
              <TextInput
                testID="complaint-message"
                value={message}
                onChangeText={setMessage}
                placeholder="Describe the issue in detail…"
                placeholderTextColor={COLORS.onSurfaceMuted}
                style={[styles.input, styles.textarea]}
                multiline
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <Pressable
                testID="complaint-submit-btn"
                disabled={sending}
                onPress={submitComplaint}
                style={[styles.submitBtn, sending && { opacity: 0.6 }]}
              >
                {sending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitText}>SUBMIT COMPLAINT</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  topTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 1.5, color: COLORS.black },
  topSub: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2 },
  content: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxxl },
  sectionTitle: { fontSize: 11, letterSpacing: 1.5, fontWeight: "900", color: COLORS.black, marginBottom: 2 },
  faqCard: { borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, backgroundColor: COLORS.surface },
  faqHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.sm },
  faqQ: { fontWeight: "800", fontSize: 13, color: COLORS.black, flex: 1 },
  faqA: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.sm, lineHeight: 17 },
  emailCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary,
  },
  emailText: { fontWeight: "800", fontSize: 12, color: COLORS.black, flex: 1 },
  mailBtn: { backgroundColor: COLORS.brand, paddingHorizontal: SPACING.md, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.black },
  mailBtnText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  input: {
    borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.md,
    height: 48, fontSize: 14, fontWeight: "600", color: COLORS.black, backgroundColor: COLORS.surface,
  },
  textarea: { height: 110, paddingTop: SPACING.md, textAlignVertical: "top" },
  errorText: { color: "#C62828", fontSize: 12, fontWeight: "700" },
  submitBtn: { backgroundColor: COLORS.black, paddingVertical: SPACING.lg, alignItems: "center", borderWidth: 2, borderColor: COLORS.black },
  submitText: { color: COLORS.white, fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  sentCard: { alignItems: "center", gap: SPACING.sm, borderWidth: 2, borderColor: COLORS.success, backgroundColor: "#E5F8EE", padding: SPACING.xl },
  sentTitle: { fontWeight: "900", fontSize: 16, color: COLORS.black },
  sentSub: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center" },
  anotherBtn: { borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  anotherText: { fontWeight: "900", fontSize: 11, color: COLORS.black, letterSpacing: 1 },
});
