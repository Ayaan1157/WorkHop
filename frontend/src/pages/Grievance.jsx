import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Scale,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Send,
  Loader2,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import { getSiteSettings } from "@/lib/clientStore";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import { sanitizeInput, checkSpamKeywords, checkRateLimit } from "@/lib/security";

const GRIEVANCE_CATEGORIES = [
  "Impersonation or Fake Profile",
  "Content / Copyright / Intellectual Property Infringement",
  "Escrow, Payment or Milestone Dispute",
  "Defamatory, Obscene or Unlawful Content (Rule 3(1)(b))",
  "DPDP Act: Data Protection, Erasure or Privacy Rights",
  "Harassment, Threats or Inappropriate Behavior",
  "Fraudulent Gig Posting or Unfair Terms",
  "Other Intermediary Mandate Violation",
];

export default function Grievance() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(getSiteSettings());
  const [copiedKey, setCopiedKey] = useState(null);

  // Form State
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "freelancer");
  const [category, setCategory] = useState(GRIEVANCE_CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState(null);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => {
    let mounted = true;
    apiGet("/site-settings")
      .then((data) => {
        if (mounted && data) {
          setSettings(data);
        }
      })
      .catch(() => {
        // Fall back to stored client settings
        setSettings(getSiteSettings());
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanName = sanitizeInput(name);
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = sanitizeInput(phone);
    const cleanSubject = sanitizeInput(subject);
    const cleanDesc = sanitizeInput(description);
    const cleanTargetUrl = sanitizeInput(targetUrl);

    if (!cleanName || !cleanEmail || !cleanSubject || !cleanDesc) {
      return setError("Please complete all required fields (Name, Email, Subject, and Description).");
    }

    // Rate limiting: max 2 grievances per 5 minutes per user
    const rateKey = `grv_${cleanEmail || "guest"}`;
    const rate = checkRateLimit(rateKey, 2, 300000);
    if (!rate.allowed) {
      return setError(`Rate limit reached: Please wait ${rate.waitSeconds}s before submitting another grievance.`);
    }

    // Safety spam filter
    const spamCheck = checkSpamKeywords(`${cleanSubject} ${cleanDesc}`);
    if (spamCheck.isSpam) {
      return setError(`Content flag: Your submission contains restricted keywords (${spamCheck.matched.join(", ")}).`);
    }

    if (!captchaToken) {
      return setError("Please complete the reCAPTCHA human verification check before submitting.");
    }

    setSubmitting(true);
    try {
      const result = await apiPost("/grievances", {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role,
        category,
        subject: cleanSubject,
        description: cleanDesc,
        target_url: cleanTargetUrl,
        attachment_name: attachmentName ? sanitizeInput(attachmentName) : null,
      });

      setTicketResult(result || { ticket_id: `WH-GRV-2026-${Math.floor(1000 + Math.random() * 9000)}` });
      setSubject("");
      setDescription("");
      setTargetUrl("");
      setAttachmentName("");
      setCaptchaToken(null);
    } catch (err) {
      setError(err?.message || "Failed to submit grievance. Please try again or email the Grievance Officer directly.");
      setCaptchaReset((prev) => prev + 1);
      setCaptchaToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  const officerName = settings.grievance_officer_name || "Alia Mansoor";
  const designation = settings.grievance_officer_designation || "Nodal officer";
  const officerEmail = settings.grievance_officer_email || "grievance@workhop.in";
  const officerPhone = settings.grievance_officer_phone || "+91 9180169739";
  const officerAddress =
    settings.grievance_officer_address ||
    "Smart Plaza, Coles Road, Frazer Town, Bangalore - 560005";
  const workingHours =
    settings.grievance_working_hours ||
    "Monday to Friday, 10:00 AM – 6:00 PM IST (Excluding Public Holidays)";
  const nodalEmail = settings.grievance_nodal_email || "nodal@workhop.in";
  const ackHours = settings.grievance_ack_hours || 48;
  const resolutionDays = settings.grievance_resolution_days || 30;

  return (
    <Shell>
      <TopBar
        title="GRIEVANCE REDRESSAL"
        sub="Statutory Intermediary Compliance · IT Rules, 2021 & DPDP Act, 2023"
        backTestID="grievance-back-btn"
        right={
          <Link
            to="/legal"
            className="flex items-center gap-1 border-2 border-ink bg-white px-2.5 py-1 text-[11px] font-black text-ink shadow-[2px_2px_0px_#121212] hover:bg-sand transition"
          >
            <Scale size={13} />
            <span className="hidden sm:inline">LEGAL & TERMS</span>
          </Link>
        }
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6 pb-24 font-sans text-ink">
        {/* Statutory Compliance Masthead */}
        <div className="border-2 border-ink bg-[#FFF4ED] p-5 sm:p-6 shadow-[5px_5px_0px_#121212]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-brand text-white shadow-[2px_2px_0px_#121212] shrink-0">
                <Scale size={26} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-ink px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                    RULE 3(2) IT RULES, 2021 COMPLIANT
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                    DPDP ACT 2023 APPOINTED
                  </span>
                </div>
                <h1 className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-ink">
                  Statutory Grievance Redressal &amp; Nodal Mechanism
                </h1>
                <p className="mt-1 text-xs text-ink/80 leading-relaxed max-w-2xl font-medium">
                  In accordance with the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong> and the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>, WorkHop Technologies has appointed a dedicated <strong>Resident Grievance Officer &amp; Nodal Contact</strong> residing in India to address user grievances, rights requests, and law enforcement inquiries.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t sm:border-t-0 sm:border-l-2 border-ink/20 pt-3 sm:pt-0 sm:pl-4 text-[11px] font-bold text-inkmuted shrink-0">
              <span>Jurisdiction: <strong>Bengaluru, Karnataka</strong></span>
              <span>Acknowledgment SLA: <strong>Within {ackHours} Hours</strong></span>
              <span>Resolution SLA: <strong>Within {resolutionDays} Calendar Days</strong></span>
            </div>
          </div>
        </div>

        {/* Resident Grievance Officer Contact Card */}
        <div className="border-2 border-ink bg-white p-5 sm:p-6 shadow-[5px_5px_0px_#121212]">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <UserCheck size={20} className="text-brand" />
              <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-ink">
                Official Contact Details of Resident Grievance Officer
              </h2>
            </div>
            <span className="border border-ink bg-sand px-2 py-0.5 text-[10px] font-black uppercase text-ink">
              INDIAN RESIDENT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Officer Name & Designation */}
            <div className="border-2 border-ink/30 bg-[#FAFAF8] p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                Name of Resident Grievance Officer
              </span>
              <p className="mt-0.5 text-base font-black text-ink">{officerName}</p>
              <p className="text-xs font-bold text-brand mt-0.5">{designation}</p>
              <p className="mt-1 text-[11px] text-inkmuted">Resident Citizen of India</p>
            </div>

            {/* Email Address with Copy Button */}
            <div className="border-2 border-ink/30 bg-[#FAFAF8] p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Official Grievance Email Address
                </span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${officerEmail}?subject=WorkHop Grievance Ticket Inquiry`}
                    className="text-sm font-black text-ink hover:text-brand transition truncate underline underline-offset-2"
                  >
                    {officerEmail}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(officerEmail, "email")}
                    className="flex items-center gap-1 border border-ink bg-white px-2 py-1 text-[10px] font-black hover:bg-sand transition shrink-0"
                    title="Copy Email"
                  >
                    {copiedKey === "email" ? <Check size={12} className="text-ok" /> : <Copy size={12} />}
                    <span>{copiedKey === "email" ? "COPIED" : "COPY"}</span>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-inkmuted">
                Send formal legal notices, takedown requests, or escalated complaints directly.
              </p>
            </div>

            {/* Telephone & Helpline with Click-to-Call */}
            <div className="border-2 border-ink/30 bg-[#FAFAF8] p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Telephone &amp; Virtual Helpline Number
                </span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${officerPhone.replace(/\s+/g, "")}`}
                    className="text-sm font-black text-ink hover:text-brand transition"
                  >
                    {officerPhone}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(officerPhone, "phone")}
                    className="flex items-center gap-1 border border-ink bg-white px-2 py-1 text-[10px] font-black hover:bg-sand transition shrink-0"
                    title="Copy Telephone"
                  >
                    {copiedKey === "phone" ? <Check size={12} className="text-ok" /> : <Copy size={12} />}
                    <span>{copiedKey === "phone" ? "COPIED" : "COPY"}</span>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-inkmuted">
                Staffed by authorized personnel during business operating hours.
              </p>
            </div>

            {/* Business Working Hours */}
            <div className="border-2 border-ink/30 bg-[#FAFAF8] p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted flex items-center gap-1">
                <Clock size={12} /> Operating / Working Hours
              </span>
              <p className="mt-1 text-xs font-bold text-ink leading-relaxed">
                {workingHours}
              </p>
              <p className="mt-2 text-[10px] text-inkmuted">
                Statutory {ackHours}-hour acknowledgment clock initiates upon receipt regardless of business day.
              </p>
            </div>

            {/* Registered Physical Office Address */}
            <div className="border-2 border-ink/30 bg-[#FAFAF8] p-3.5 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted flex items-center gap-1">
                <MapPin size={12} /> Physical Registered Office Address in India
              </span>
              <p className="mt-1 text-xs font-bold text-ink leading-relaxed">
                {officerAddress}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-2 text-[10px] text-inkmuted">
                <span>Entity: <strong>WorkHop Technologies Pvt. Ltd. (CIN Reg.)</strong></span>
                <span className="text-ink">
                  Nodal Officer (Law Enforcement Inquiries):{" "}
                  <a href={`mailto:${nodalEmail}`} className="font-bold underline text-brand">
                    {nodalEmail}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statutory SLA Tracker (3-Step Redressal Flow) */}
        <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212]">
          <h3 className="text-xs font-black uppercase tracking-wider text-ink mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-ok" />
            Statutory Redressal Timeline Mandated under Rule 3(2) IT Rules 2021
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border-2 border-ink bg-[#FAFAF8] p-4 flex flex-col justify-between">
              <div>
                <span className="inline-block bg-ink text-white px-2 py-0.5 text-[10px] font-black uppercase">
                  STEP 1 · IMMEDIATE
                </span>
                <h4 className="mt-2 text-sm font-black text-ink">Ticket Generation</h4>
                <p className="mt-1 text-xs text-inkmuted leading-relaxed">
                  Upon submission, you receive an official Grievance Ticket Number (e.g. <code className="bg-sand px-1 font-mono font-bold text-ink">WH-GRV-2026-XXXX</code>) for tracking and legal records.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-black text-brand uppercase">Instant System Dispatch</div>
            </div>

            <div className="border-2 border-ink bg-[#FFF9E6] p-4 flex flex-col justify-between">
              <div>
                <span className="inline-block bg-amber-800 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                  STEP 2 · WITHIN {ackHours} HOURS
                </span>
                <h4 className="mt-2 text-sm font-black text-ink">Formal Acknowledgment</h4>
                <p className="mt-1 text-xs text-inkmuted leading-relaxed">
                  The Grievance Officer reviews your ticket, confirms receipt to your email, and assigns an investigator.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-black text-amber-800 uppercase">Statutory {ackHours}h Legal Deadline</div>
            </div>

            <div className="border-2 border-ink bg-[#E8F8F0] p-4 flex flex-col justify-between">
              <div>
                <span className="inline-block bg-emerald-800 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                  STEP 3 · WITHIN {resolutionDays} DAYS
                </span>
                <h4 className="mt-2 text-sm font-black text-ink">Investigation &amp; Disposal</h4>
                <p className="mt-1 text-xs text-inkmuted leading-relaxed">
                  Complete inquiry, corrective action (content takedown, account restriction, escrow resolution), and written decision provided.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-black text-emerald-800 uppercase">Statutory {resolutionDays}-Day Final Resolution</div>
            </div>
          </div>
        </div>

        {/* Grievance Submission Form or Success View */}
        {ticketResult ? (
          <div className="border-2 border-ink bg-[#EBFBF3] p-6 sm:p-8 shadow-[5px_5px_0px_#121212] text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-ok bg-white text-ok shadow-[2px_2px_0px_#121212]">
              <CheckCircle2 size={32} />
            </div>

            <span className="mt-4 inline-block bg-ok px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              GRIEVANCE REGISTRATION SUCCESSFUL
            </span>

            <h3 className="mt-2 text-xl font-black text-ink">
              Grievance Ticket #{ticketResult.ticket_id || ticketResult.id} Registered
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-ink/80 leading-relaxed font-medium">
              Your grievance has been formally filed with the <strong>Resident Grievance Officer</strong>. A confirmation email and statutory acknowledgement will be dispatched to your email within <strong>{ackHours} hours</strong>.
            </p>

            <div className="mx-auto mt-5 max-w-md border-2 border-ink bg-white p-4 text-left shadow-[3px_3px_0px_#121212]">
              <div className="flex justify-between border-b border-ink/10 pb-2 text-xs">
                <span className="font-bold text-inkmuted">Ticket ID:</span>
                <span className="font-mono font-black text-brand">{ticketResult.ticket_id || ticketResult.id}</span>
              </div>
              <div className="flex justify-between border-b border-ink/10 py-2 text-xs">
                <span className="font-bold text-inkmuted">Status:</span>
                <span className="font-black uppercase text-amber-700">OPEN / PENDING ACKNOWLEDGMENT</span>
              </div>
              <div className="flex justify-between border-b border-ink/10 py-2 text-xs">
                <span className="font-bold text-inkmuted">Mandatory Acknowledgment:</span>
                <span className="font-bold text-ink">Within {ackHours} Hours</span>
              </div>
              <div className="flex justify-between pt-2 text-xs">
                <span className="font-bold text-inkmuted">Statutory Resolution Deadline:</span>
                <span className="font-bold text-ink">Within {resolutionDays} Calendar Days</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setTicketResult(null)}
                className="border-2 border-ink bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-ink shadow-[2px_2px_0px_#121212] hover:bg-sand transition"
              >
                File Another Grievance
              </button>
              <a
                href={`mailto:${officerEmail}?subject=Follow-up on Grievance Ticket ${ticketResult.ticket_id || ticketResult.id}`}
                className="border-2 border-ink bg-brand px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:bg-ink transition"
              >
                Email Officer with Additional Evidence
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="border-2 border-ink bg-white p-5 sm:p-6 shadow-[5px_5px_0px_#121212]">
            <div className="border-b-2 border-ink/10 pb-3 mb-5">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-ink">
                File a Formal Statutory Grievance Ticket
              </h3>
              <p className="text-xs text-inkmuted mt-0.5">
                All submissions are securely logged, assigned a legally binding SLA, and handled directly by the Grievance Cell.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Complainant Role */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  I am filing this grievance as a *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                >
                  <option value="freelancer">Registered Freelancer</option>
                  <option value="employer">Registered Employer / Business</option>
                  <option value="third_party">Third-Party Rights Holder / Copyright Owner</option>
                  <option value="data_principal">Data Principal (DPDP Privacy Inquiry)</option>
                  <option value="visitor">Platform Visitor / Other Party</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Grievance Category (IT Rules / DPDP) *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                >
                  {GRIEVANCE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Complainant Full Legal Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Official Email Address (For 24h Acknowledgment) *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                  required
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Contact Mobile / Telephone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98450 00000"
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                />
              </div>

              {/* Target Gig or Profile Reference URL */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Relevant WorkHop Profile / Gig URL or ID (If Applicable)
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="e.g. https://workhop.in/pro/wh-lead-12 or Gig ID"
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                />
              </div>

              {/* Subject */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Brief Summary / Grievance Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Urgent: Infringement of copyrighted logo design sample on freelancer profile"
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                  required
                />
              </div>

              {/* Detailed Description */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Comprehensive Statement of Facts &amp; Requested Redressal *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please state dates, transaction/gig identifiers, the specific nature of your grievance, rights violated under Indian law, and the exact corrective action sought..."
                  rows={5}
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] p-3 text-xs font-medium text-ink focus:border-brand outline-none"
                  required
                />
              </div>

              {/* Supporting Document / Evidence Name */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                  Supporting Evidence / Document Title (Provide Cloud Link or Document Name)
                </label>
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. Trademark_Reg_Certificate.pdf or Google Drive link"
                  className="mt-1 w-full border-2 border-ink bg-[#FAFAF8] px-3 py-2 text-xs font-bold text-ink focus:border-brand outline-none"
                />
                <p className="mt-1 text-[10px] text-inkmuted">
                  You may also reply to the automated {ackHours}-hour acknowledgment email with original PDF / PNG attachments.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 flex items-center gap-2 border-2 border-[#C62828] bg-red-50 p-3 text-xs font-bold text-[#C62828]">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Human Verification (reCAPTCHA) */}
            <div className="mt-4">
              <RecaptchaWidget
                onVerify={(tok) => {
                  setCaptchaToken(tok);
                  setError("");
                }}
                onExpire={() => setCaptchaToken(null)}
                resetTrigger={captchaReset}
              />
            </div>

            {/* Legal Submission Declaration & Submit Button */}
            <div className="mt-5 border-t border-ink/10 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-[10px] text-inkmuted max-w-lg leading-relaxed">
                By clicking <strong>Submit Formal Grievance</strong>, you solemnly declare that the facts stated herein are true to the best of your knowledge and that you are authorized to submit this complaint under applicable Indian statutes.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 border-2 border-ink bg-brand px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-60 shrink-0 w-full sm:w-auto"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>{submitting ? "RECORDING TICKET..." : "SUBMIT FORMAL GRIEVANCE"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Appellate Redressal Mechanism & Grievance Appellate Committee (GAC) */}
        <div className="border-2 border-ink bg-[#FAFAF8] p-5 shadow-[4px_4px_0px_#121212]">
          <h3 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-2 mb-2">
            <Scale size={16} className="text-brand" />
            Appellate Escalation Mechanism &amp; Grievance Appellate Committee (GAC)
          </h3>
          <p className="text-xs text-ink/80 leading-relaxed font-medium">
            Under <strong>Rule 3A of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, if you are dissatisfied with an order or resolution passed by WorkHop&apos;s Resident Grievance Officer, or if no decision is communicated within the statutory {resolutionDays}-day window, you have the right to prefer an appeal before the central <strong>Grievance Appellate Committee (GAC)</strong> established by the Ministry of Electronics and Information Technology (MeitY), Government of India, within thirty (30) days from the date of receipt of the decision.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold">
            <a
              href="https://gac.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand underline underline-offset-2 hover:text-ink transition"
            >
              <span>MeitY Grievance Appellate Committee Portal (gac.gov.in)</span>
              <ExternalLink size={12} />
            </a>
            <span className="text-inkmuted">·</span>
            <Link to="/legal" className="text-ink underline underline-offset-2 hover:text-brand transition">
              Review Full Platform Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
