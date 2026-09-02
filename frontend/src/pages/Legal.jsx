import { Shell, TopBar } from "@/components/kit";

const SECTIONS = [
  {
    title: "TERMS OF SERVICE",
    items: [
      ["1. About WorkHop", 'WorkHop is a hyperlocal gig marketplace operated from Bengaluru, Karnataka, India, connecting local businesses ("Employers") with independent verified professionals ("Pros") within the Bengaluru metropolitan area.'],
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
  return (
    <Shell>
      <TopBar title="LEGAL & POLICIES" sub="WorkHop · Bengaluru, Karnataka · Updated June 2026" backTestID="legal-back-btn" />
      <div className="flex flex-col gap-8 p-4 pb-16">
        {SECTIONS.map((s) => (
          <div key={s.title} className="flex flex-col gap-3">
            <div className="self-start bg-ink px-3 py-1.5">
              <span className="text-xs font-black tracking-[0.15em] text-white">{s.title}</span>
            </div>
            {s.items.map(([h, body]) => (
              <div key={h} className="border-2 border-ink p-3">
                <p className="text-[13px] font-black text-ink">{h}</p>
                <p className="mt-1 text-xs leading-[1.5] text-inkmuted">{body}</p>
              </div>
            ))}
          </div>
        ))}
        <p className="text-center text-[11px] text-inkmuted">© 2026 WorkHop · Made in Bengaluru 🇮🇳</p>
      </div>
    </Shell>
  );
}
