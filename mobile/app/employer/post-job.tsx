import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL, COLORS, SPACING } from "@/src/theme";
import { CATALOG_CATEGORY_NAMES } from "@/src/catalogFilters";
import { getEmployerId, useRazorpay } from "@/src/payments";

export default function PostJob() {
  const router = useRouter();
  const { startPayment, checkoutModal } = useRazorpay();
  const [credits, setCredits] = useState<{ remaining: number } | null>(null);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState("Graphics & Design");
  const [pay, setPay] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);

  const loadCredits = useCallback(async () => {
    const eid = await getEmployerId();
    const r = await fetch(`${BACKEND_URL}/api/employer/${eid}/post-credits`);
    if (r.ok) setCredits(await r.json());
  }, []);

  useEffect(() => {
    loadCredits().catch(() => {});
  }, [loadCredits]);

  const submit = async (retryAfterPay = true) => {
    setError("");
    if (!company.trim() || !title.trim() || !description.trim() || !pay) {
      setError("Fill in company, title, pay and description.");
      return;
    }
    setSubmitting(true);
    try {
      const eid = await getEmployerId();
      const res = await fetch(`${BACKEND_URL}/api/employer/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employer_id: eid,
          company_name: company,
          title,
          bucket,
          pay: parseInt(pay, 10) || 0,
          description,
          area: area || "Bengaluru",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosted(true);
        loadCredits();
        return;
      }
      if (res.status === 402 && retryAfterPay) {
        // Buy a Single Post (₹299) via Razorpay, then retry
        const pr = await startPayment(
          { product: "plan", plan_id: "single-post", employer_id: eid },
          "Single Post · ₹299",
        );
        if (pr?.purchase) {
          await submit(false);
          return;
        }
      }
      setError(data?.detail || "Could not post the job.");
    } catch (e: any) {
      if (e?.message !== "PAYMENT_CANCELLED") setError("Could not post the job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} testID="postjob-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>POST A JOB</Text>
          <Text style={styles.topSub}>
            {credits ? `${credits.remaining} post credit${credits.remaining === 1 ? "" : "s"} left` : "…"}
          </Text>
        </View>
        <View style={styles.pricePill}>
          <Text style={styles.pricePillText}>₹299/POST</Text>
        </View>
      </View>

      {posted ? (
        <View style={styles.successWrap} testID="postjob-success">
          <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
          <Text style={styles.successTitle}>Job is live!</Text>
          <Text style={styles.successSub}>
            Verified pros in Bengaluru can now see and apply to your gig.
          </Text>
          <Pressable
            testID="postjob-done-btn"
            onPress={() => router.back()}
            style={styles.submitBtn}
          >
            <Text style={styles.submitBtnText}>DONE</Text>
          </Pressable>
          <Pressable
            testID="postjob-another-btn"
            onPress={() => {
              setPosted(false);
              setTitle("");
              setDescription("");
              setPay("");
            }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>POST ANOTHER</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Field label="COMPANY NAME" value={company} onChange={setCompany} placeholder="e.g. BrewBox Cafe" testID="postjob-company" />
            <Field label="JOB TITLE" value={title} onChange={setTitle} placeholder="e.g. Design our menu & flyers" testID="postjob-title" />

            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.bucketRow}>
              {CATALOG_CATEGORY_NAMES.map((b) => (
                <Pressable
                  key={b}
                  testID={`postjob-cat-${b.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  onPress={() => setBucket(b)}
                  style={[styles.bucketChip, bucket === b && styles.bucketChipActive]}
                >
                  <Text style={[styles.bucketText, bucket === b && styles.bucketTextActive]}>{b.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <Field label="PAY (₹ FIXED)" value={pay} onChange={(t: string) => setPay(t.replace(/[^0-9]/g, ""))} placeholder="e.g. 8000" keyboardType="number-pad" testID="postjob-pay" />
            <Field label="AREA" value={area} onChange={setArea} placeholder="e.g. Koramangala" testID="postjob-area" />

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              testID="postjob-description"
              value={description}
              onChangeText={setDescription}
              placeholder="Scope, deliverables, timeline…"
              placeholderTextColor={COLORS.onSurfaceMuted}
              style={[styles.input, styles.textarea]}
              multiline
            />

            {!!error && (
              <Text style={styles.errorText} testID="postjob-error">
                {error}
              </Text>
            )}

            <Pressable
              testID="postjob-submit-btn"
              disabled={submitting}
              onPress={() => submit(true)}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {credits && credits.remaining > 0 ? "PUBLISH JOB (1 CREDIT)" : "PAY ₹299 & PUBLISH"}
                </Text>
              )}
            </Pressable>
            <Text style={styles.footnote}>
              🔒 Razorpay Test Mode · UPI (GPay/PhonePe), cards & netbanking
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      {checkoutModal}
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, testID }: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.onSurfaceMuted}
        style={styles.input}
        keyboardType={keyboardType}
      />
    </View>
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
  pricePill: { backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  pricePillText: { color: COLORS.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  form: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  label: { fontSize: 10, letterSpacing: 1.5, fontWeight: "900", color: COLORS.black },
  input: {
    borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: SPACING.md,
    height: 48, fontSize: 14, fontWeight: "600", color: COLORS.black, backgroundColor: COLORS.surface,
  },
  textarea: { height: 110, paddingTop: SPACING.md, textAlignVertical: "top" },
  bucketRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  bucketChip: { borderWidth: 2, borderColor: COLORS.black, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, alignItems: "center" },
  bucketChipActive: { backgroundColor: COLORS.black },
  bucketText: { fontWeight: "900", fontSize: 10, color: COLORS.black },
  bucketTextActive: { color: COLORS.white },
  errorText: { color: "#C62828", fontSize: 12, fontWeight: "700" },
  submitBtn: {
    backgroundColor: COLORS.black, paddingVertical: SPACING.lg,
    alignItems: "center", borderWidth: 2, borderColor: COLORS.black, marginTop: SPACING.sm,
  },
  submitBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  secondaryBtn: { borderWidth: 2, borderColor: COLORS.black, paddingVertical: SPACING.md, alignItems: "center", alignSelf: "stretch" },
  secondaryBtnText: { color: COLORS.black, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  footnote: { fontSize: 11, color: COLORS.onSurfaceMuted, textAlign: "center" },
  successWrap: { alignItems: "center", gap: SPACING.md, padding: SPACING.xxl, marginTop: 40 },
  successTitle: { fontWeight: "900", fontSize: 22, color: COLORS.black },
  successSub: { fontSize: 13, color: COLORS.onSurfaceMuted, textAlign: "center" },
});
