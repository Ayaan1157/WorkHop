import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Mail, CheckCircle2, Loader2, Scale } from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import { sanitizeInput, checkSpamKeywords, checkRateLimit } from "@/lib/security";

const SUPPORT_EMAIL = "manarastudio22@gmail.com";

const FAQS = [
  {
    q: "How does the Freelancer Bidding Hops system work?",
    a: "WorkHop uses a transparent bidding credit system called Hops, where 1 Hop = ₹15 INR. You only pay when you pitch on client requirements, with 0% platform commission on your earnings. Local Bangalore gigs require between 2 to 16 Hops depending on the project budget (e.g. a ₹5,000 gig needs 4 Hops / ₹60). Every newly verified freelancer starts with 20 welcome Hops. Unused Hops roll over forever and never expire.",
  },
  {
    q: "How much do Hops Top-Up Packs cost?",
    a: "Hops can be topped up anytime at the fixed rate of 1 Hop = ₹15 INR: 10 Hops (₹150), 20 Hops (₹300), 40 Hops (₹600 · Most Popular), 60 Hops (₹900), 80 Hops (₹1,200), and 100 Hops (₹1,500). Packs are credited instantly to your wallet with zero platform deductions on your client payments.",
  },
  {
    q: "What Monthly Freelancer Passes are available?",
    a: "For freelancers pitching weekly, WorkHop offers discounted monthly passes: (1) Starter Hops Pass at ₹399/mo (30 Hops, effective ₹13.30/Hop); (2) Freelancer Plus Pass at ₹999/mo (80 Hops, effective ₹12.48/Hop with competitor bid visibility & Verified Pro gold badge); and (3) Power Freelancer Pass at ₹1,899/mo (160 Hops, effective ₹11.86/Hop, unlimited rollover & 3 free proposal boosts).",
  },
  {
    q: "How do employer job posts work and how much does it cost?",
    a: "Job posting is 100% Free on WorkHop! Employers can post unlimited gigs with zero platform posting fees. Requirements go live instantly across a 5km radius in Bangalore with direct WhatsApp and candidate chats. Optional performance upgrades include an Urgent 48h Gig Boost for ₹399 (pinned top-of-feed placement) and Pro Candidate Unlocks for ₹199 per candidate.",
  },
  {
    q: "How do I get verified as a Pro?",
    a: "Complete the 4-step wizard at /freelancer: pay the one-time ₹99 verification fee (covers identity tethering, anti-fraud checks, and live profile hosting), verify your email with an OTP, import your Fiverr/Upwork reputation or add portfolio links, and publish your profile live across Bangalore.",
  },
  {
    q: "Why can't I see employer phone numbers immediately?",
    a: "For safety and privacy, employer contact details stay protected. Submit a proposal using Hops to chat in-app—employers can share phone and WhatsApp numbers directly in chat, or unlock direct contact.",
  },
  {
    q: "How do refunds and billing disputes work?",
    a: "All payments are processed securely via RBI-authorized payment partner Razorpay. Unused Hops roll over indefinitely. If you encounter any billing discrepancy, duplicate transaction, or technical issue, raise a ticket below or email support at manarastudio22@gmail.com, and we resolve it within 24 to 48 hours.",
  },
];

export default function Support() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const submit = async () => {
    setError("");
    const cleanSubject = sanitizeInput(subject);
    const cleanMsg = sanitizeInput(message);

    if (!cleanSubject || !cleanMsg) return setError("Add a subject and describe the issue.");

    // Rate limiting: max 3 complaints every 2 minutes
    const senderKey = user?.email || "guest_support";
    const rate = checkRateLimit(`support_${senderKey}`, 3, 120000);
    if (!rate.allowed) {
      return setError(`Limit reached: Please wait ${rate.waitSeconds}s before submitting another ticket.`);
    }

    // Safety spam filter
    const spamCheck = checkSpamKeywords(`${cleanSubject} ${cleanMsg}`);
    if (spamCheck.isSpam) {
      return setError(`Safety filter: Message contains flagged content (${spamCheck.matched.join(", ")}).`);
    }

    // Human Verification Check
    if (!captchaToken) {
      return setError("Please complete the reCAPTCHA human verification check before submitting.");
    }

    setSending(true);
    try {
      await apiPost("/complaints", {
        name: user?.name || "WorkHop user",
        email: user?.email || "not-signed-in",
        role: user?.role || "user",
        subject: cleanSubject,
        message: cleanMsg,
      });
      setSent(true);
      setSubject("");
      setMessage("");
      setCaptchaToken(null);
    } catch {
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
      setError("Could not submit. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell>
      <TopBar title="SUPPORT" sub="WorkHop · Bengaluru" backTestID="support-back-btn" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-4 sm:p-6 pb-16">
        <p className="mb-0.5 text-[11px] font-black tracking-[0.15em] text-ink">FREQUENTLY ASKED</p>
        {FAQS.map((f, i) => (
          <button key={f.q} data-testid={`faq-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="border-2 border-ink p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="flex-1 text-[13px] font-extrabold text-ink">{f.q}</span>
              {openFaq === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {openFaq === i && <p className="mt-2 text-xs leading-[1.4] text-inkmuted">{f.a}</p>}
          </button>
        ))}

        {/* Statutory Grievance Redressal Banner (IT Rules 2021 & DPDP Act 2023) */}
        <div className="border-2 border-ink bg-[#FFF4ED] p-3.5 shadow-[2px_2px_0px_#121212] my-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-mono text-[9px] font-black text-brand uppercase flex items-center gap-1">
                <Scale size={12} /> STATUTORY INTERMEDIARY COMPLIANCE
              </span>
              <p className="text-xs font-black text-ink">Need to file with the Resident Grievance Officer?</p>
              <p className="text-[11px] text-inkmuted font-medium">Governed under Rule 3(2) IT Rules 2021 &amp; DPDP Act 2023 with mandatory 24h ack &amp; 15-day resolution SLAs.</p>
            </div>
            <Link
              to="/grievance"
              className="inline-flex items-center justify-center gap-1 border-2 border-ink bg-brand px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-[1px_1px_0px_#121212] hover:bg-ink transition shrink-0"
            >
              <span>Grievance Cell →</span>
            </Link>
          </div>
        </div>

        <p className="mb-0.5 mt-4 text-[11px] font-black tracking-[0.15em] text-ink">RAISE A COMPLAINT</p>
        <div className="flex items-center gap-2 border-2 border-ink bg-sand p-3">
          <Mail size={16} className="text-brand" />
          <span className="flex-1 text-xs font-extrabold text-ink">{SUPPORT_EMAIL}</span>
          <a data-testid="support-mailto-btn" href={`mailto:${SUPPORT_EMAIL}?subject=WorkHop Complaint`} className="border border-ink bg-brand px-3 py-1.5 text-[10px] font-black text-white">EMAIL US</a>
        </div>

        {sent ? (
          <div data-testid="complaint-sent" className="flex flex-col items-center gap-2 border-2 border-ok bg-[#E5F8EE] p-6 text-center">
            <CheckCircle2 size={28} className="text-ok" />
            <p className="text-base font-black text-ink">Complaint registered</p>
            <p className="text-xs text-inkmuted">Our team at {SUPPORT_EMAIL} will get back within 48 hours.</p>
            <button data-testid="complaint-another-btn" onClick={() => setSent(false)} className="mt-1 border-2 border-ink px-4 py-2 text-[11px] font-black tracking-wider text-ink">RAISE ANOTHER</button>
          </div>
        ) : (
          <>
            <input data-testid="complaint-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject — e.g. Payment issue" className="wh-input h-12 border-2 border-ink bg-white px-3 text-sm font-semibold text-ink" />
            <textarea data-testid="complaint-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue in detail…" className="wh-input h-28 border-2 border-ink bg-white p-3 text-sm font-semibold text-ink" />
            {!!error && <p className="text-xs font-bold text-[#C62828]">{error}</p>}
            
            {/* Human Verification reCAPTCHA */}
            <RecaptchaWidget
              onVerify={(tok) => {
                setCaptchaToken(tok);
                setError("");
              }}
              onExpire={() => setCaptchaToken(null)}
              resetTrigger={captchaReset}
              className="my-1"
            />

            <button data-testid="complaint-submit-btn" disabled={sending} onClick={submit} className="flex items-center justify-center bg-ink py-4 text-[13px] font-black tracking-wider text-white disabled:opacity-60 shadow-[2px_2px_0px_#121212] hover:bg-brand transition">
              {sending ? <Loader2 size={18} className="animate-spin" /> : "SUBMIT COMPLAINT"}
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}
