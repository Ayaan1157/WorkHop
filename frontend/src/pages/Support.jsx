import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";

const SUPPORT_EMAIL = "manarastudio22@gmail.com";

const FAQS = [
  { q: "How do I get verified as a Pro?", a: "Complete the 4-step wizard: pay the one-time ₹99 fee, verify your email with an OTP, add portfolio links and upload work samples." },
  { q: "Why can't I see employer phone numbers?", a: "For safety, employer contact details stay private. Apply to a gig and chat in-app — employers share contacts in chat when ready." },
  { q: "How many gigs can I apply to per day?", a: "3 free applications every 24 hours. Need more? The ₹149 Boost adds 5 extra applies for the day (max 8 total)." },
  { q: "How do employer job posts work?", a: "Buy a Single Post (₹299) or Starter Bundle (5 posts, ₹999), then publish from the Post a Job form. Your gig goes live instantly." },
  { q: "How do refunds work?", a: "Payments are processed by Razorpay. For billing issues, raise a complaint below and we'll resolve within 48 hours." },
];

export default function Support() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!subject.trim() || !message.trim()) return setError("Add a subject and describe the issue.");
    setSending(true);
    try {
      await apiPost("/complaints", {
        name: user?.name || "WorkHop user",
        email: user?.email || "not-signed-in",
        role: "user",
        subject,
        message,
      });
      setSent(true);
      setSubject("");
      setMessage("");
    } catch {
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
            <button data-testid="complaint-submit-btn" disabled={sending} onClick={submit} className="flex items-center justify-center bg-ink py-4 text-[13px] font-black tracking-wider text-white disabled:opacity-60">
              {sending ? <Loader2 size={18} className="animate-spin" /> : "SUBMIT COMPLAINT"}
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}
