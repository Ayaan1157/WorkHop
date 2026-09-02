import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "@/src/theme";

const SECTIONS = [
  {
    title: "TERMS OF SERVICE",
    items: [
      ["1. About WorkHop", "WorkHop is a hyperlocal gig marketplace operated from Bengaluru, Karnataka, India, connecting local businesses (\"Employers\") with independent verified professionals (\"Pros\") within the Bengaluru metropolitan area."],
      ["2. Eligibility", "You must be 18+ and legally capable of entering contracts under the Indian Contract Act, 1872. Pros must complete email verification before applying to gigs."],
      ["3. Marketplace Role", "WorkHop is a venue, not an employer or contractor. Contracts for gigs are formed directly between Employers and Pros. WorkHop does not guarantee work quality, payment or outcomes."],
      ["4. Fees & Payments", "Platform fees (verification ₹99, lead unlock ₹199, apply boost ₹149, job posts from ₹299, branding plans) are processed via Razorpay. Fees are non-refundable except for failed/duplicate transactions."],
      ["5. Conduct", "No fake profiles, misleading job posts, harassment, off-platform payment solicitation to evade fees, or illegal services. Violations lead to suspension without refund."],
      ["6. Content & Reviews", "Reviews must reflect genuine completed gigs. WorkHop may moderate or remove content that is fraudulent, defamatory or violates law."],
      ["7. Liability", "To the maximum extent permitted by Indian law, WorkHop's aggregate liability is limited to fees paid by you in the preceding 3 months."],
      ["8. Governing Law", "These terms are governed by the laws of India. Courts at Bengaluru, Karnataka shall have exclusive jurisdiction."],
    ],
  },
  {
    title: "PRIVACY POLICY",
    items: [
      ["1. Data We Collect", "Account basics (name, email, photo) for sign-in; verified email address; portfolio links & work samples; payment metadata via Razorpay; chat messages; approximate location area within Bengaluru."],
      ["2. How We Use It", "Verification, matching Pros with nearby Employers, showing map pins, processing payments, resolving complaints and improving the service."],
      ["3. What We Never Do", "We never sell your personal data, never expose employer/pro phone numbers publicly, and never share your contact details without an unlock."],
      ["4. Storage & Security", "Data is stored on secured servers. Payments are handled by Razorpay (PCI-DSS compliant); we never store full card numbers."],
      ["5. Your Rights (DPDP Act, 2023)", "You may request access, correction or deletion of your personal data by writing to our grievance contact below."],
      ["6. Grievance Officer", "Email: manarastudio22@gmail.com · WorkHop, Bengaluru, Karnataka, India. We respond within 48 hours as required under Indian IT rules."],
    ],
  },
  {
    title: "REFUND & CANCELLATION",
    items: [
      ["1. Platform Fees", "Verification and unlock fees are consumed instantly on success and are non-refundable."],
      ["2. Failed Payments", "Amounts debited for failed transactions are auto-refunded by Razorpay within 5-7 working days."],
      ["3. Job Post Credits", "Unused post credits from bundles remain valid indefinitely and are non-transferable."],
    ],
  },
];

export default function Legal() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} testID="legal-back-btn" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>LEGAL & POLICIES</Text>
          <Text style={styles.topSub}>WorkHop · Bengaluru, Karnataka · Updated June 2026</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>
            {s.items.map(([h, body]) => (
              <View key={h} style={styles.item}>
                <Text style={styles.itemH}>{h}</Text>
                <Text style={styles.itemBody}>{body}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={styles.footer}>© 2026 WorkHop · Made in Bengaluru 🇮🇳</Text>
      </ScrollView>
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
  topTitle: { fontWeight: "900", fontSize: 15, letterSpacing: 1.5, color: COLORS.black },
  topSub: { fontSize: 10, color: COLORS.onSurfaceMuted, marginTop: 2 },
  content: { padding: SPACING.lg, gap: SPACING.xl, paddingBottom: SPACING.xxxl },
  section: { gap: SPACING.md },
  sectionHead: { backgroundColor: COLORS.black, alignSelf: "flex-start", paddingHorizontal: SPACING.md, paddingVertical: 6 },
  sectionTitle: { color: COLORS.white, fontWeight: "900", fontSize: 12, letterSpacing: 1.5 },
  item: { borderWidth: 2, borderColor: COLORS.black, padding: SPACING.md, gap: 4 },
  itemH: { fontWeight: "900", fontSize: 13, color: COLORS.black },
  itemBody: { fontSize: 12, color: COLORS.onSurfaceMuted, lineHeight: 18 },
  footer: { textAlign: "center", fontSize: 11, color: COLORS.onSurfaceMuted },
});
