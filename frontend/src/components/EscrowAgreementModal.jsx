import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, CheckCircle2, FileText, X, Printer, Edit3,
  Check, AlertCircle, Lock, Sparkles, Calendar, UserCheck,
  Building2, Scale, Plus, Trash2, Loader2, PenTool
} from "lucide-react";
import { apiPost } from "@/lib/api";

/**
 * Converts a positive integer INR amount into English words (Indian numbering system).
 */
export function inrToWords(n) {
  const num = Math.round(Number(n) || 0);
  if (num <= 0) return "Zero Rupees Only";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const twoDigits = (v) => {
    if (v < 20) return ones[v];
    return `${tens[Math.floor(v / 10)]}${v % 10 ? " " + ones[v % 10] : ""}`;
  };

  const threeDigits = (v) => {
    const h = Math.floor(v / 100);
    const rem = v % 100;
    const parts = [];
    if (h > 0) parts.push(`${ones[h]} Hundred`);
    if (rem > 0) parts.push(twoDigits(rem));
    return parts.join(" ");
  };

  let rem = num;
  const parts = [];
  const crores = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakhs = Math.floor(rem / 100000);
  rem %= 100000;
  const thousands = Math.floor(rem / 1000);
  rem %= 1000;

  if (crores > 0) parts.push(`${threeDigits(crores)} Crore`);
  if (lakhs > 0) parts.push(`${twoDigits(lakhs)} Lakh`);
  if (thousands > 0) parts.push(`${twoDigits(thousands)} Thousand`);
  if (rem > 0) parts.push(threeDigits(rem));

  return `${parts.join(" ").trim()} Rupees Only`;
}

function formatDateDMY(isoOrDate) {
  try {
    const d = isoOrDate ? new Date(isoOrDate) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString("en-GB");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd} / ${mm} / ${yyyy}`;
  } catch {
    return "24 / 10 / 2026";
  }
}

export default function EscrowAgreementModal({
  isOpen,
  onClose,
  deal,
  conv,
  job,
  myRole = "freelancer",
  defaultPay = 15000,
  paymentMode = "escrow",
  onAgreementSigned,
  isHireFlow = false,
  onConfirmHireWithAgreement,
}) {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultDeadlineIso = useMemo(
    () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    []
  );

  const resolvedJobTitle =
    deal?.job_title || conv?.job_title || job?.title || "Local Bengaluru Freelance Engagement";
  const resolvedJobId =
    deal?.job_id || conv?.job_id || job?.id || "WH-JOB-BLR-01";

  const autoScope = useMemo(() => {
    if (deal?.scope_description) return deal.scope_description;
    if (job?.description) {
      return `${resolvedJobTitle}: ${job.description}`;
    }
    return `Professional execution of "${resolvedJobTitle}" (${job?.category || conv?.category || "Verified Specialist Services"}) within Bengaluru as scoped between Employer and Freelancer on the WorkHop Platform.`;
  }, [deal?.scope_description, job?.description, job?.category, conv?.category, resolvedJobTitle]);

  const autoDeliverables = useMemo(() => {
    if (deal?.deliverables) return deal.deliverables;
    return `1. Complete execution and delivery of all scope items for "${resolvedJobTitle}".\n2. Final source/working files, completion proof, and quality verification handover via WorkHop chat.`;
  }, [deal?.deliverables, resolvedJobTitle]);

  // Editable form state (auto-filled from deal/conv/job)
  const [editingScope, setEditingScope] = useState(false);
  const [employerName, setEmployerName] = useState("");
  const [employerAddress, setEmployerAddress] = useState("");
  const [freelancerName, setFreelancerName] = useState("");
  const [freelancerAddress, setFreelancerAddress] = useState("");
  const [scopeDescription, setScopeDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [startDate, setStartDate] = useState(todayIso);
  const [completionDeadline, setCompletionDeadline] = useState(defaultDeadlineIso);
  const [projectFee, setProjectFee] = useState(15000);
  const [revisionsIncluded, setRevisionsIncluded] = useState(2);
  const [milestones, setMilestones] = useState([]);

  // Signature state for the active party
  const [activeSignerRole, setActiveSignerRole] = useState(myRole);
  const [signatureInput, setSignatureInput] = useState("");
  const [agreedChecked, setAgreedChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveSignerRole(myRole);
    setErrorMsg(null);
    setSuccessBanner(null);

    const empName =
      deal?.employer_name || conv?.company_name || job?.company_name || "Verified Bengaluru Employer";
    const empAddr =
      deal?.employer_address ||
      `${conv?.job_area || job?.area || "Indiranagar"}, Bengaluru, Karnataka, India`;
    const freeName =
      deal?.freelancer_name || conv?.freelancer_name || "Verified Bengaluru Freelancer";
    const freeAddr =
      deal?.freelancer_address ||
      `${conv?.applicant_area || "Koramangala"}, Bengaluru, Karnataka, India`;

    const feeRupees = deal?.agreed_amount_paise
      ? Math.round(deal.agreed_amount_paise / 100)
      : Number(defaultPay || conv?.pay || job?.pay || 15000);

    const sDate = deal?.start_date || todayIso;
    const eDate = deal?.completion_deadline || defaultDeadlineIso;

    setEmployerName(empName);
    setEmployerAddress(empAddr);
    setFreelancerName(freeName);
    setFreelancerAddress(freeAddr);
    setScopeDescription(autoScope);
    setDeliverables(autoDeliverables);
    setStartDate(sDate);
    setCompletionDeadline(eDate);
    setProjectFee(feeRupees);
    setRevisionsIncluded(deal?.revisions_included ?? 2);

    if (Array.isArray(deal?.milestones) && deal.milestones.length > 0) {
      setMilestones(deal.milestones);
    } else {
      setMilestones([
        {
          no: 1,
          title: `Complete Deliverables & Final Handover for "${resolvedJobTitle}"`,
          due_date: eDate,
          amount_inr: feeRupees,
        },
      ]);
    }

    // Pre-populate signature input if not yet signed
    if (myRole === "employer") {
      setSignatureInput(deal?.employer_signature || empName);
      setAgreedChecked(Boolean(deal?.employer_agreed));
    } else {
      setSignatureInput(deal?.freelancer_signature || freeName);
      setAgreedChecked(Boolean(deal?.freelancer_agreed));
    }
  }, [
    isOpen,
    deal,
    conv,
    job,
    myRole,
    defaultPay,
    todayIso,
    defaultDeadlineIso,
    autoScope,
    autoDeliverables,
    resolvedJobTitle,
  ]);

  // Keep single milestone synced with projectFee and completionDeadline if not manually split
  useEffect(() => {
    if (milestones.length === 1) {
      setMilestones([
        {
          ...milestones[0],
          due_date: completionDeadline,
          amount_inr: Number(projectFee) || 0,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFee, completionDeadline]);

  if (!isOpen) return null;

  const mode = (deal?.payment_mode || paymentMode || "escrow").toLowerCase();
  const commissionPercent = mode === "escrow" ? 5 : 0;
  const feeNum = Number(projectFee) || 0;
  const commissionInr = Math.round(feeNum * (commissionPercent / 100));
  const netFreelancerInr = feeNum - commissionInr;
  const contractId =
    deal?.contract_id ||
    `WH-AGR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(resolvedJobId)
      .slice(-4)
      .toUpperCase()}`;
  const effectiveDateStr = formatDateDMY(deal?.effective_date || deal?.created_at);

  const employerSigned = Boolean(deal?.employer_agreed && deal?.employer_signature);
  const freelancerSigned = Boolean(deal?.freelancer_agreed && deal?.freelancer_signature);
  const bothSigned = employerSigned && freelancerSigned;

  const isAlreadySignedByActiveRole =
    activeSignerRole === "employer" ? employerSigned : freelancerSigned;

  const handleRoleSwitch = (role) => {
    setActiveSignerRole(role);
    setErrorMsg(null);
    if (role === "employer") {
      setSignatureInput(deal?.employer_signature || employerName);
      setAgreedChecked(Boolean(deal?.employer_agreed));
    } else {
      setSignatureInput(deal?.freelancer_signature || freelancerName);
      setAgreedChecked(Boolean(deal?.freelancer_agreed));
    }
  };

  const handleAddMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        no: prev.length + 1,
        title: `Milestone ${prev.length + 1} Deliverable`,
        due_date: completionDeadline,
        amount_inr: 0,
      },
    ]);
  };

  const handleUpdateMilestone = (idx, field, val) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m))
    );
  };

  const handleRemoveMilestone = (idx) => {
    if (milestones.length <= 1) return;
    setMilestones((prev) =>
      prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, no: i + 1 }))
    );
  };

  const handleSignSubmit = async () => {
    setErrorMsg(null);
    const cleanSig = (signatureInput || "").trim();
    if (!agreedChecked) {
      setErrorMsg(
        "Please check the 'I have read, understood, and fully agree' checkbox before signing."
      );
      return;
    }
    if (cleanSig.length < 2) {
      setErrorMsg(
        "Please type your full legal name in the signature box to execute this agreement."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        actor_role: activeSignerRole,
        signature_name: cleanSig,
        agreed: true,
        scope_description: scopeDescription,
        deliverables,
        start_date: startDate,
        completion_deadline: completionDeadline,
        revisions_included: Number(revisionsIncluded) || 2,
        employer_name: employerName,
        employer_address: employerAddress,
        freelancer_name: freelancerName,
        freelancer_address: freelancerAddress,
        agreed_amount_paise: Math.round(feeNum * 100),
        milestones,
      };

      // If opened inside the Employer's initial Hire Pro flow before a deal exists
      if (isHireFlow && onConfirmHireWithAgreement) {
        await onConfirmHireWithAgreement({
          ...payload,
          employer_signature: cleanSig,
          employer_agreed: true,
        });
        return;
      }

      const targetId = deal?.deal_id || conv?.conversation_id || conv?.id || "deal_default";
      const res = await apiPost(`/deals/${targetId}/sign-agreement`, payload);
      if (res?.deal) {
        setSuccessBanner(
          res.deal.employer_agreed && res.deal.freelancer_agreed
            ? "🎉 Agreement is now FULLY EXECUTED by both Employer and Freelancer!"
            : `✓ Digitally signed by ${
                activeSignerRole === "employer" ? "Employer" : "Freelancer"
              } (${cleanSig})!`
        );
        if (onAgreementSigned) {
          onAgreementSigned(res.deal, res.events);
        }
      }
    } catch (err) {
      setErrorMsg(err?.message || "Could not record signature. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      data-testid="escrow-agreement-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative my-auto flex max-h-[94vh] w-full max-w-4xl flex-col border-4 border-ink bg-white dark:bg-[#141416] text-ink dark:text-zinc-100 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#E65A1E]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════════════════
            1. STICKY TOP BAR: CONTRACT STATUS, ID & PRINT / EDIT CONTROLS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-ink bg-[#121212] px-4 py-3.5 sm:px-6 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-white bg-[#E65A1E] text-white shadow-[2px_2px_0px_#FFFFFF]">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Freelance Services &amp; Escrow Agreement
                </h2>
                <span className="border border-white/30 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                  {contractId}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-medium">
                WorkHop Platform (workhop.in) &middot; Upwork-Standard Escrow Protection &middot; Bengaluru, KA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Execution Status Badge */}
            {bothSigned ? (
              <span
                data-testid="agreement-status-executed"
                className="flex items-center gap-1.5 border-2 border-emerald-400 bg-emerald-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300"
              >
                <CheckCircle2 size={13} /> Fully Executed (2/2 Signed)
              </span>
            ) : employerSigned || freelancerSigned ? (
              <span
                data-testid="agreement-status-partial"
                className="flex items-center gap-1.5 border-2 border-amber-400 bg-amber-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300"
              >
                <PenTool size={12} /> 1/2 Signed (Awaiting Countersignature)
              </span>
            ) : (
              <span
                data-testid="agreement-status-pending"
                className="flex items-center gap-1.5 border border-white/40 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white"
              >
                <FileText size={12} /> Auto-Filled &middot; Awaiting Signatures (0/2)
              </span>
            )}

            {!bothSigned && (
              <button
                type="button"
                data-testid="toggle-edit-scope-btn"
                onClick={() => setEditingScope((v) => !v)}
                className={`flex items-center gap-1 border border-white/40 px-2.5 py-1 text-[10px] font-black uppercase transition ${
                  editingScope
                    ? "bg-[#E65A1E] text-white border-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Edit3 size={12} />
                <span>{editingScope ? "Done Editing" : "Customize Scope"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1 border border-white/40 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-white hover:bg-white/20 transition"
              title="Print or Save Agreement as PDF"
            >
              <Printer size={12} />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              data-testid="close-agreement-modal-btn"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center border border-white/40 bg-white/10 text-white hover:bg-rose-600 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            2. SCROLLABLE CONTRACT DOCUMENT & AUTO-FILLED FORM
        ══════════════════════════════════════════════════════════════════ */}
        <div className="wh-scroll flex-1 overflow-y-auto p-4 sm:p-7 space-y-6">
          {/* Auto-Filled Summary Banner */}
          <div className="border-2 border-ink bg-[#FFF9E6] dark:bg-zinc-900 p-3.5 shadow-[3px_3px_0px_#121212]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/20 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#E65A1E] shrink-0" />
                <span className="text-xs font-black uppercase tracking-wide text-ink dark:text-white">
                  Auto-Filled from Job Scope, Parties &amp; Agreed Pricing
                </span>
              </div>
              <span className="text-[11px] font-bold text-inkmuted dark:text-zinc-400">
                Effective Date: <strong className="text-ink dark:text-white">{effectiveDateStr}</strong>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="border border-ink/20 bg-white dark:bg-zinc-800 p-2.5">
                <span className="text-[10px] font-extrabold uppercase text-inkmuted dark:text-zinc-400 block">
                  1. Employer (Client)
                </span>
                <span className="font-black text-ink dark:text-white block truncate mt-0.5">
                  {employerName}
                </span>
                <span className="text-[10px] text-inkmuted dark:text-zinc-400 block truncate">
                  {employerAddress}
                </span>
              </div>

              <div className="border border-ink/20 bg-white dark:bg-zinc-800 p-2.5">
                <span className="text-[10px] font-extrabold uppercase text-inkmuted dark:text-zinc-400 block">
                  2. Freelancer (Pro)
                </span>
                <span className="font-black text-ink dark:text-white block truncate mt-0.5">
                  {freelancerName}
                </span>
                <span className="text-[10px] text-inkmuted dark:text-zinc-400 block truncate">
                  {freelancerAddress}
                </span>
              </div>

              <div className="border border-ink/20 bg-white dark:bg-zinc-800 p-2.5">
                <span className="text-[10px] font-extrabold uppercase text-inkmuted dark:text-zinc-400 block">
                  3. Project Fee (Escrow)
                </span>
                <span className="font-black text-[#E65A1E] text-sm block mt-0.5">
                  ₹{feeNum.toLocaleString("en-IN")} INR
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                  Net Payout: ₹{netFreelancerInr.toLocaleString("en-IN")} ({100 - commissionPercent}%)
                </span>
              </div>

              <div className="border border-ink/20 bg-white dark:bg-zinc-800 p-2.5">
                <span className="text-[10px] font-extrabold uppercase text-inkmuted dark:text-zinc-400 block">
                  4. Signatures Status
                </span>
                <div className="mt-1 flex flex-col gap-0.5 text-[10px] font-bold">
                  <span className={employerSigned ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
                    Employer: {employerSigned ? `✓ Signed (${deal.employer_signature})` : "⏳ Pending"}
                  </span>
                  <span className={freelancerSigned ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
                    Freelancer: {freelancerSigned ? `✓ Signed (${deal.freelancer_signature})` : "⏳ Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Scope & Terms Customizer Drawer */}
          {editingScope && !bothSigned && (
            <div
              data-testid="agreement-scope-editor"
              className="border-2 border-brand bg-[#FFF3E9] dark:bg-zinc-900 p-4 space-y-3 shadow-[3px_3px_0px_#E65A1E]"
            >
              <div className="flex items-center justify-between border-b border-brand/30 pb-2">
                <p className="text-xs font-black uppercase text-brand flex items-center gap-1.5">
                  <Edit3 size={14} /> Customize Auto-Filled Contract Fields
                </p>
                <span className="text-[10px] font-bold text-inkmuted dark:text-zinc-400">
                  Changes update the live agreement text below immediately
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Employer Legal / Business Name
                  </label>
                  <input
                    type="text"
                    value={employerName}
                    onChange={(e) => setEmployerName(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Employer Address (Bengaluru)
                  </label>
                  <input
                    type="text"
                    value={employerAddress}
                    onChange={(e) => setEmployerAddress(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Freelancer Legal Name
                  </label>
                  <input
                    type="text"
                    value={freelancerName}
                    onChange={(e) => setFreelancerName(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Freelancer Address (Bengaluru)
                  </label>
                  <input
                    type="text"
                    value={freelancerAddress}
                    onChange={(e) => setFreelancerAddress(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    2.1 Scope of Work / Description of Services
                  </label>
                  <textarea
                    rows={2}
                    value={scopeDescription}
                    onChange={(e) => setScopeDescription(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    2.2 Concrete Deliverables
                  </label>
                  <textarea
                    rows={2}
                    value={deliverables}
                    onChange={(e) => setDeliverables(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 p-2 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Start Date (2.3)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Completion Deadline (2.3)
                  </label>
                  <input
                    type="date"
                    value={completionDeadline}
                    onChange={(e) => setCompletionDeadline(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Total Project Fee (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={projectFee}
                    onChange={(e) => setProjectFee(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-black text-brand"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] block mb-1">
                    Revisions Included (6.1)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={revisionsIncluded}
                    onChange={(e) => setRevisionsIncluded(e.target.value)}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              3. OFFICIAL LEGAL AGREEMENT LETTER BODY
          ══════════════════════════════════════════════════════════════════ */}
          <div
            data-testid="agreement-legal-document"
            className="border-2 border-ink bg-[#FCFBF9] dark:bg-zinc-900/90 p-5 sm:p-8 shadow-inner text-xs sm:text-[13px] leading-relaxed text-ink dark:text-zinc-200 space-y-5 font-serif"
          >
            {/* Document Header */}
            <div className="border-b-2 border-ink pb-4 text-center font-sans">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E65A1E]">
                WORKHOP PLATFORM OFFICIAL CONTRACT &middot; {contractId}
              </p>
              <h1 className="mt-1 text-base sm:text-xl font-black uppercase tracking-wide text-ink dark:text-white">
                FREELANCE SERVICES AND ESCROW AGREEMENT
              </h1>
              <p className="text-xs font-bold text-inkmuted dark:text-zinc-400 mt-0.5">
                (Escrow-Mode Engagement on the WorkHop Platform &ndash; workhop.in)
              </p>
            </div>

            {/* Effective Date & Parties */}
            <div className="space-y-2.5">
              <p>
                This Agreement is made on{" "}
                <span className="inline-block border-b-2 border-ink bg-[#FFF3C4] dark:bg-amber-950/70 px-2 py-0.5 font-sans font-black text-ink dark:text-amber-200">
                  {effectiveDateStr}
                </span>{" "}
                (the <strong>&ldquo;Effective Date&rdquo;</strong>) at{" "}
                <strong>Bengaluru, Karnataka</strong>, between:
              </p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <span className="border-b-2 border-ink bg-[#FFF3C4] dark:bg-amber-950/70 px-1.5 py-0.5 font-sans font-black text-ink dark:text-amber-200">
                    {employerName}
                  </span>
                  , of{" "}
                  <span className="border-b border-ink/60 bg-sand/70 dark:bg-zinc-800 px-1.5 py-0.5 font-sans font-bold">
                    {employerAddress}
                  </span>{" "}
                  (the <strong>&ldquo;Employer&rdquo;</strong>); and
                </li>
                <li>
                  <span className="border-b-2 border-ink bg-[#FFF3C4] dark:bg-amber-950/70 px-1.5 py-0.5 font-sans font-black text-ink dark:text-amber-200">
                    {freelancerName}
                  </span>
                  , of{" "}
                  <span className="border-b border-ink/60 bg-sand/70 dark:bg-zinc-800 px-1.5 py-0.5 font-sans font-bold">
                    {freelancerAddress}
                  </span>{" "}
                  (the <strong>&ldquo;Freelancer&rdquo;</strong>); and
                </li>
                <li>
                  <strong>WorkHop Technologies</strong>, of{" "}
                  <span className="font-sans font-semibold">
                    12th Main Road, Indiranagar, Bengaluru, Karnataka 560038, India
                  </span>
                  , operator of the WorkHop hyperlocal platform at{" "}
                  <strong>workhop.in</strong> (the <strong>&ldquo;Platform&rdquo;</strong>),
                  acting as facilitator of the escrow arrangement.
                </li>
              </ol>

              <p>
                The Employer and the Freelancer are each a <strong>&ldquo;Party&rdquo;</strong> and
                together the <strong>&ldquo;Parties&rdquo;</strong>.
              </p>
            </div>

            {/* Background */}
            <div className="space-y-1.5">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                Background
              </h3>
              <p>
                <strong>A.</strong> The Platform connects verified local professionals (
                <strong>&ldquo;Freelancers&rdquo;</strong>) with individuals and businesses (
                <strong>&ldquo;Employers&rdquo;</strong>) for gigs within a 5 km radius in Bengaluru
                and any other areas the Platform serves.
              </p>
              <p>
                <strong>B.</strong> The Employer has posted a job on the Platform (Job ID:{" "}
                <span className="border-b-2 border-ink bg-[#FFF3C4] dark:bg-amber-950/70 px-1.5 py-0.5 font-mono font-black text-ink dark:text-amber-200">
                  {resolvedJobId} &mdash; {resolvedJobTitle}
                </span>
                ), and the Freelancer has applied for or accepted it and elected the{" "}
                <strong>{mode === "escrow" ? "Escrow Payment Mode" : "Direct Payment Mode"}</strong>.
              </p>
            </div>

            {/* Clause 1 */}
            <div className="space-y-1.5">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                1. Purpose and Escrow Mode
              </h3>
              <p>
                <strong>1.1</strong> Under the Platform, payment may be made either through{" "}
                <strong>Escrow Mode</strong> (governed by this Agreement) or{" "}
                <strong>Direct Payment Mode</strong> (made directly between the Parties at their own
                risk, outside this Agreement). This Agreement governs engagements where Escrow Mode
                has been selected (and records the mutual risk acknowledgement if Direct Payment
                Mode is selected).
              </p>
              <p>
                <strong>1.2</strong> The Parties select the payment mode when applying for, offering,
                or accepting the job. By signing and checking the acceptance box below, the Employer
                and the Freelancer both agree to be legally bound by this Agreement.
              </p>
              <p>
                <strong>1.3</strong> The Employer engages the Freelancer, and the Freelancer agrees
                to provide services, on the terms of this Agreement. The Employer&apos;s payment will
                be held in the Platform&apos;s designated escrow account (processed via RBI-authorized
                payment aggregator Razorpay) and released as set out below.
              </p>
            </div>

            {/* Clause 2: Auto-filled Scope of Work */}
            <div className="space-y-2">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                2. Scope of Work
              </h3>
              <div className="border-l-4 border-[#E65A1E] bg-white dark:bg-zinc-800/90 p-3 font-sans space-y-2 shadow-sm">
                <p>
                  <strong>2.1 Description of services:</strong>{" "}
                  <span className="font-semibold text-ink dark:text-zinc-100">
                    {scopeDescription}
                  </span>
                </p>
                <p className="whitespace-pre-line">
                  <strong>2.2 Deliverables:</strong>{" "}
                  <span className="font-semibold text-ink dark:text-zinc-100">
                    {deliverables}
                  </span>
                </p>
                <p>
                  <strong>2.3 Start date:</strong>{" "}
                  <span className="bg-[#FFF3C4] dark:bg-amber-950 px-2 py-0.5 font-black text-ink dark:text-amber-200 border border-ink/30">
                    {formatDateDMY(startDate)}
                  </span>{" "}
                  &nbsp;&bull;&nbsp; <strong>Completion deadline:</strong>{" "}
                  <span className="bg-[#FFF3C4] dark:bg-amber-950 px-2 py-0.5 font-black text-ink dark:text-amber-200 border border-ink/30">
                    {formatDateDMY(completionDeadline)}
                  </span>
                </p>
                <p>
                  <strong>2.4 Milestones (if any):</strong> as listed in the Schedule at the end of
                  this Agreement.
                </p>
              </div>
            </div>

            {/* Clause 3: Auto-filled Fees and Escrow Deposit */}
            <div className="space-y-1.5">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                3. Fees and Escrow Deposit
              </h3>
              <p>
                <strong>3.1</strong> Total fee payable by the Employer:{" "}
                <span className="border-b-2 border-ink bg-[#FFF3C4] dark:bg-amber-950/70 px-2 py-0.5 font-sans font-black text-[#E65A1E] dark:text-amber-300">
                  INR ₹{feeNum.toLocaleString("en-IN")}.00 ({inrToWords(feeNum)})
                </span>{" "}
                (the <strong>&ldquo;Project Fee&rdquo;</strong>), inclusive of applicable taxes.
              </p>
              <p>
                <strong>3.2</strong> Before work begins, the Employer shall deposit the Project Fee
                (or the relevant milestone amount) into the escrow account. The Freelancer is not
                required to start work until the deposit is confirmed on the Platform.
              </p>
              <p>
                <strong>3.3</strong> Funds are paid in through the Platform&apos;s payment gateway
                and held in the designated escrow account. Funds held in escrow remain the
                Employer&apos;s property until released under this Agreement and shall not be used
                by the Platform for any other purpose.
              </p>
            </div>

            {/* Clause 4: Release of Funds */}
            <div className="space-y-1.5">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                4. Release of Funds
              </h3>
              <p>
                <strong>4.1</strong> The Freelancer shall submit the deliverable (or milestone)
                through the Platform. The Employer has{" "}
                <span className="border-b border-ink bg-[#FFF3C4] dark:bg-amber-950 px-1.5 font-sans font-black">
                  3 days (72 hours)
                </span>{" "}
                (the <strong>&ldquo;Review Period&rdquo;</strong>) to accept it or request
                reasonable revisions in writing.
              </p>
              <p>
                <strong>4.2</strong> Funds are released to the Freelancer when (a) the Employer
                accepts the work; (b) the Review Period (72 hours) ends without any response from
                the Employer, in which case the work is deemed accepted (Upwork-style Auto-Release
                Protection); (c) both Parties jointly instruct release; or (d) a dispute is resolved
                under Clause 7.
              </p>
              <p>
                <strong>4.3</strong> Upon release, the Platform shall deduct its commission (Clause
                5) and any taxes required by law, and transfer the net balance of{" "}
                <strong className="font-sans text-emerald-700 dark:text-emerald-400">
                  INR ₹{netFreelancerInr.toLocaleString("en-IN")}.00
                </strong>{" "}
                to the Freelancer&apos;s verified bank account, UPI, or wallet.
              </p>
            </div>

            {/* Clause 5: Platform Commission */}
            <div className="space-y-1.5">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                5. Platform Commission
              </h3>
              <p>
                The Platform charges a commission of{" "}
                <span className="border-b border-ink bg-[#FFF3C4] dark:bg-amber-950 px-1.5 font-sans font-black">
                  {commissionPercent}% (INR ₹{commissionInr.toLocaleString("en-IN")}.00)
                </span>{" "}
                of the total Project Fee, deducted from the amount released to the Freelancer. No
                commission (0%) applies to jobs completed under Direct Payment Mode. No other fee is
                charged unless disclosed in writing.
              </p>
            </div>

            {/* Clause 6: Revisions, Cancellation and Refunds */}
            <div className="space-y-1.5">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                6. Revisions, Cancellation and Refunds
              </h3>
              <p>
                <strong>6.1</strong> The Freelancer shall provide up to{" "}
                <span className="border-b border-ink bg-[#FFF3C4] dark:bg-amber-950 px-1.5 font-sans font-black">
                  {revisionsIncluded}
                </span>{" "}
                rounds of revisions within the agreed scope at no additional cost.
              </p>
              <p>
                <strong>6.2</strong> If the Employer cancels before work starts, the full escrow
                deposit is refunded, less any non-refundable payment-gateway charges.
              </p>
              <p>
                <strong>6.3</strong> If the Employer cancels after work starts, the Freelancer is
                entitled to payment for work completed up to the date of cancellation, as agreed by
                the Parties or determined under Clause 7.
              </p>
              <p>
                <strong>6.4</strong> If the Freelancer fails to deliver by the deadline (and no
                extension is agreed), the Employer may cancel and receive a refund of the
                undelivered portion held in escrow.
              </p>
            </div>

            {/* Clause 7: Dispute Resolution */}
            <div className="space-y-1.5">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white border-b border-ink/20 pb-1">
                7. Dispute Resolution
              </h3>
              <p>
                <strong>7.1</strong> The Parties shall first try to resolve any dispute through the
                Platform&apos;s dispute process within{" "}
                <span className="border-b border-ink bg-[#FFF3C4] dark:bg-amber-950 px-1.5 font-sans font-black">
                  7
                </span>{" "}
                days of notice. Disputed funds stay frozen in escrow meanwhile.
              </p>
              <p>
                <strong>7.2</strong> The Platform may review evidence submitted by both Parties
                (Platform chat history, the job details and process pinned in the chat, files and
                delivery proof) and recommend or decide on a release, refund, or split payout, as
                the Parties hereby authorise.
              </p>
              <p>
                <strong>7.3</strong> If a Party does not accept the outcome, the dispute shall be
                referred to arbitration under the{" "}
                <strong>Arbitration and Conciliation Act, 1996</strong>, before a sole arbitrator
                appointed by mutual consent. The seat of arbitration is{" "}
                <strong>Bengaluru, Karnataka</strong>, and the language is <strong>English</strong>.
              </p>
            </div>

            {/* Clauses 8 to 16 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  8. Independent Contractor
                </h4>
                <p className="text-xs">
                  The Freelancer is an independent contractor. Nothing in this Agreement creates an
                  employment, partnership, agency or joint-venture relationship. The Freelancer
                  controls the manner and means of work and is responsible for their own tools,
                  taxes, insurance and statutory dues.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  9. Intellectual Property
                </h4>
                <p className="text-xs">
                  Upon full payment, all rights in the deliverables transfer to the Employer, except
                  for the Freelancer&apos;s pre-existing materials and general tools, which remain
                  with the Freelancer (the Employer receiving a perpetual, non-exclusive licence to
                  use them as part of the deliverables). The Freelancer warrants that the
                  deliverables are original and do not knowingly infringe third-party rights.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  10. Confidentiality &amp; DPDP Act 2023
                </h4>
                <p className="text-xs">
                  Each Party shall keep the other&apos;s confidential information private, comply
                  with the Digital Personal Data Protection (DPDP) Act, 2023, use it only for this
                  engagement, and not disclose it to others except as required by law. This
                  obligation continues for{" "}
                  <strong className="font-sans underline">2 years</strong> after the Agreement ends.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  11. Taxes
                </h4>
                <p className="text-xs">
                  Each Party is responsible for its own taxes. The Platform may deduct TDS/TCS or
                  collect GST where required by law and shall provide the relevant certificates or
                  invoices.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  12. Term and Termination
                </h4>
                <p className="text-xs">
                  This Agreement runs until the services are delivered and all funds are released or
                  refunded. Either Party may terminate for material breach if the breach is not
                  cured within <strong className="font-sans underline">5 days</strong> of written
                  notice. Clauses on payment, IP, confidentiality, liability and dispute resolution
                  survive termination.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  13. Limitation of Liability
                </h4>
                <p className="text-xs">
                  The Platform acts only as technology intermediary (u/s 79 of the IT Act, 2000) and
                  escrow facilitator and is not responsible for the quality of the Freelancer&apos;s
                  work or the Employer&apos;s conduct. Except for fraud, wilful misconduct or breach
                  of confidentiality, each Party&apos;s total liability under this Agreement is
                  limited to the Project Fee.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  14. Anti-Money-Laundering and KYC
                </h4>
                <p className="text-xs">
                  Each Party confirms that the funds and information provided are lawful and
                  accurate, and agrees to complete any KYC verification required by the Platform or
                  its banking partner. The Platform may withhold or return funds where required by
                  law or the bank.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-sans text-xs font-black uppercase text-ink dark:text-white">
                  15. Platform Use and Off-Platform Dealings
                </h4>
                <p className="text-xs">
                  The Parties shall use the Platform chat and tools for communication about this
                  job, so that records are available for dispute resolution. If the Parties move
                  this job to Direct Payment Mode or deal outside the Platform, the Platform&apos;s
                  escrow protection under this Agreement ends for that part of the work and the
                  Platform has no liability for it. Each Party&apos;s Platform profile information
                  and verification status must be true and current.
                </p>
              </div>
            </div>

            {/* Clause 16 */}
            <div className="space-y-1.5 border-t border-ink/20 pt-3">
              <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                16. General &amp; Electronic Execution
              </h3>
              <p className="text-xs">
                <strong>16.1 Governing law:</strong> the laws of India (including the Indian
                Contract Act, 1872 and Information Technology Act, 2000). Subject to Clause 7.3, the
                courts at <strong>Bengaluru, Karnataka</strong> have exclusive jurisdiction.{" "}
                <strong>16.2</strong> This Agreement is the entire agreement on its subject and may
                be changed only in writing signed (or accepted electronically) by all Parties.{" "}
                <strong>16.3</strong> Neither Party may assign this Agreement without the
                other&apos;s written consent. <strong>16.4</strong> If any clause is held invalid,
                the rest remains in force. <strong>16.5 Electronic Execution:</strong> Under Section
                10A of the Information Technology Act, 2000, this Agreement may be executed in
                counterparts and electronically by typing full legal name and checking the{" "}
                <em>&ldquo;I Agree&rdquo;</em> acceptance box below.
              </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                4. SCHEDULE: MILESTONES AND PAYMENT TABLE
            ══════════════════════════════════════════════════════════════════ */}
            <div className="pt-2 font-sans">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                  Schedule: Milestones and Payment
                </h3>
                {editingScope && !bothSigned && (
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="flex items-center gap-1 border border-ink bg-brand px-2 py-0.5 text-[10px] font-black uppercase text-white"
                  >
                    <Plus size={11} /> Add Milestone
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border-2 border-ink">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-ink text-white">
                      <th className="p-2.5 font-black uppercase w-12">No.</th>
                      <th className="p-2.5 font-black uppercase">Milestone / Deliverable</th>
                      <th className="p-2.5 font-black uppercase w-36">Due Date</th>
                      <th className="p-2.5 font-black uppercase text-right w-36">Amount (INR)</th>
                      {editingScope && !bothSigned && milestones.length > 1 && (
                        <th className="p-2.5 w-10" />
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/20 bg-white dark:bg-zinc-800">
                    {milestones.map((m, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-black">{idx + 1}</td>
                        <td className="p-2.5 font-semibold">
                          {editingScope && !bothSigned ? (
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) => handleUpdateMilestone(idx, "title", e.target.value)}
                              className="w-full border border-ink/40 bg-sand/30 px-2 py-1 text-xs font-bold"
                            />
                          ) : (
                            m.title
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-bold">
                          {editingScope && !bothSigned ? (
                            <input
                              type="date"
                              value={m.due_date}
                              onChange={(e) =>
                                handleUpdateMilestone(idx, "due_date", e.target.value)
                              }
                              className="w-full border border-ink/40 bg-sand/30 px-1.5 py-1 text-xs font-bold"
                            />
                          ) : (
                            formatDateDMY(m.due_date)
                          )}
                        </td>
                        <td className="p-2.5 text-right font-black text-ink dark:text-white">
                          {editingScope && !bothSigned ? (
                            <input
                              type="number"
                              value={m.amount_inr}
                              onChange={(e) =>
                                handleUpdateMilestone(idx, "amount_inr", Number(e.target.value))
                              }
                              className="w-full border border-ink/40 bg-sand/30 px-2 py-1 text-right text-xs font-black"
                            />
                          ) : (
                            `₹${Number(m.amount_inr || 0).toLocaleString("en-IN")}.00`
                          )}
                        </td>
                        {editingScope && !bothSigned && milestones.length > 1 && (
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveMilestone(idx)}
                              className="text-rose-600 hover:text-rose-800"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-sand/60 dark:bg-zinc-900 font-black border-t-2 border-ink">
                      <td colSpan={3} className="p-2.5 text-right uppercase text-[11px]">
                        Total Gross Project Fee (Escrow Deposit):
                      </td>
                      <td className="p-2.5 text-right text-brand text-sm">
                        ₹{feeNum.toLocaleString("en-IN")}.00
                      </td>
                      {editingScope && !bothSigned && milestones.length > 1 && <td />}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                5. SIGNATURES SUMMARY TABLE IN THE DOCUMENT
            ══════════════════════════════════════════════════════════════════ */}
            <div className="pt-3 font-sans">
              <h3 className="text-xs font-black uppercase tracking-wider text-ink dark:text-white mb-2">
                SIGNATURES &amp; ELECTRONIC EXECUTION RECORD
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Party 1: Employer Signature Box */}
                <div
                  data-testid="employer-signature-card"
                  className={`border-2 p-3.5 ${
                    employerSigned
                      ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30"
                      : "border-ink bg-white dark:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-ink/15 pb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-white">
                      1. EMPLOYER
                    </span>
                    {employerSigned ? (
                      <span className="bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                        ✓ SIGNED &amp; AGREED
                      </span>
                    ) : (
                      <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 text-[9px] font-black uppercase">
                        PENDING SIGNATURE
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] text-inkmuted dark:text-zinc-400 block uppercase font-bold">
                        Electronic Signature:
                      </span>
                      {employerSigned ? (
                        <p className="font-serif italic text-base font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-600/40 pb-0.5">
                          /s/ {deal.employer_signature}
                        </p>
                      ) : (
                        <p className="text-inkmuted italic">______________________</p>
                      )}
                    </div>
                    <p>
                      <strong>Name:</strong> {employerName}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {employerSigned ? formatDateDMY(deal.employer_signed_at) : effectiveDateStr}
                    </p>
                    {employerSigned && (
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-1">
                        <CheckCircle2 size={12} /> Checked &ldquo;I fully agree&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Party 2: Freelancer Signature Box */}
                <div
                  data-testid="freelancer-signature-card"
                  className={`border-2 p-3.5 ${
                    freelancerSigned
                      ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30"
                      : "border-ink bg-white dark:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-ink/15 pb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-white">
                      2. FREELANCER
                    </span>
                    {freelancerSigned ? (
                      <span className="bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                        ✓ SIGNED &amp; AGREED
                      </span>
                    ) : (
                      <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 text-[9px] font-black uppercase">
                        PENDING SIGNATURE
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] text-inkmuted dark:text-zinc-400 block uppercase font-bold">
                        Electronic Signature:
                      </span>
                      {freelancerSigned ? (
                        <p className="font-serif italic text-base font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-600/40 pb-0.5">
                          /s/ {deal.freelancer_signature}
                        </p>
                      ) : (
                        <p className="text-inkmuted italic">______________________</p>
                      )}
                    </div>
                    <p>
                      <strong>Name:</strong> {freelancerName}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {freelancerSigned
                        ? formatDateDMY(deal.freelancer_signed_at)
                        : effectiveDateStr}
                    </p>
                    {freelancerSigned && (
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-1">
                        <CheckCircle2 size={12} /> Checked &ldquo;I fully agree&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Party 3: Platform Facilitator Box */}
                <div className="border-2 border-ink bg-sand/50 dark:bg-zinc-800/80 p-3.5">
                  <div className="flex items-center justify-between border-b border-ink/15 pb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-white">
                      3. PLATFORM (WORKHOP)
                    </span>
                    <span className="bg-ink px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300">
                      ESCROW FACILITATOR
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] text-inkmuted dark:text-zinc-400 block uppercase font-bold">
                        Digital Seal:
                      </span>
                      <p className="font-serif italic text-sm font-bold text-ink dark:text-white border-b border-ink/20 pb-0.5">
                        /s/ WorkHop Automated Escrow
                      </p>
                    </div>
                    <p>
                      <strong>Name &amp; Designation:</strong> WorkHop Technologies (Escrow System)
                    </p>
                    <p>
                      <strong>Date:</strong> {effectiveDateStr}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-1">
                      <ShieldCheck size={12} /> Verified Platform Seal
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            6. STICKY BOTTOM EXECUTION BAR: SIGN & CHECK "I FULLY AGREE"
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t-3 border-ink bg-[#FAF7F2] dark:bg-zinc-950 p-4 sm:px-6 shrink-0">
          {successBanner && (
            <div
              data-testid="agreement-signed-banner"
              className="mb-3 flex items-center justify-between border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 text-xs font-black text-emerald-800 dark:text-emerald-200"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                {successBanner}
              </span>
              {!bothSigned && (
                <button
                  type="button"
                  onClick={() =>
                    handleRoleSwitch(activeSignerRole === "employer" ? "freelancer" : "employer")
                  }
                  className="underline text-[11px] font-black text-brand ml-3"
                >
                  Switch to {activeSignerRole === "employer" ? "Freelancer" : "Employer"} Signer &rarr;
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div
              data-testid="agreement-error-banner"
              className="mb-3 flex items-center gap-2 border-2 border-rose-600 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-xs font-black text-rose-700 dark:text-rose-300"
            >
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {bothSigned ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center bg-emerald-600 text-white border-2 border-ink">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-black uppercase text-emerald-700 dark:text-emerald-400">
                    Agreement Fully Executed by Both Parties ({contractId})
                  </p>
                  <p className="text-[11px] text-inkmuted dark:text-zinc-400 font-semibold">
                    Signed by Employer ({deal.employer_signature}) &amp; Freelancer (
                    {deal.freelancer_signature}) &middot; Legally binding under IT Act, 2000.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 border-2 border-ink bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs font-black uppercase text-ink dark:text-white shadow-[2px_2px_0px_#121212] hover:bg-sand transition"
                >
                  <Printer size={14} /> Print / Download PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="border-2 border-ink bg-ink px-4 py-2 text-xs font-black uppercase text-white hover:bg-brand transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Role Switcher Pill (so user can sign as their role or test both parties) */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                    Signing Party:
                  </span>
                  <div className="inline-flex border-2 border-ink bg-white dark:bg-zinc-900">
                    <button
                      type="button"
                      data-testid="signer-tab-employer"
                      onClick={() => handleRoleSwitch("employer")}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase transition ${
                        activeSignerRole === "employer"
                          ? "bg-ink text-white"
                          : "text-ink dark:text-zinc-300 hover:bg-sand/50"
                      }`}
                    >
                      1. Employer {employerSigned ? "✓" : ""}
                    </button>
                    <button
                      type="button"
                      data-testid="signer-tab-freelancer"
                      onClick={() => handleRoleSwitch("freelancer")}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase transition ${
                        activeSignerRole === "freelancer"
                          ? "bg-ink text-white"
                          : "text-ink dark:text-zinc-300 hover:bg-sand/50"
                      }`}
                    >
                      2. Freelancer {freelancerSigned ? "✓" : ""}
                    </button>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-inkmuted dark:text-zinc-400">
                  Both Employer &amp; Freelancer must check &ldquo;I Agree&rdquo; and sign
                </span>
              </div>

              {/* Mandatory "I Agree" Checkbox */}
              <label
                data-testid="agreement-i-agree-label"
                className="flex items-start gap-2.5 cursor-pointer select-none border-2 border-ink bg-white dark:bg-zinc-900 p-3 shadow-[2px_2px_0px_#121212]"
              >
                <input
                  type="checkbox"
                  data-testid="agreement-i-agree-checkbox"
                  checked={agreedChecked}
                  onChange={(e) => setAgreedChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#E65A1E] shrink-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-ink dark:text-zinc-100 leading-snug">
                  <strong>I AGREE:</strong> I have read, understood, and fully agree to all terms
                  and conditions of this{" "}
                  <strong>Freelance Services and Escrow Agreement</strong>, including the auto-filled
                  Scope of Work, Deliverables, Timeline, and Project Fee of{" "}
                  <strong className="text-[#E65A1E]">
                    ₹{feeNum.toLocaleString("en-IN")} INR
                  </strong>
                  . I understand that my electronic signature below is legally binding.
                </span>
              </label>

              {/* Digital Signature Input + Submit Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400">
                    Sign (/s/):
                  </span>
                  <input
                    type="text"
                    data-testid="agreement-signature-input"
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                    placeholder={`Type full legal name (${
                      activeSignerRole === "employer" ? employerName : freelancerName
                    })`}
                    className="w-full border-2 border-ink bg-white dark:bg-zinc-900 py-2.5 pl-20 pr-24 font-serif italic text-sm font-bold text-ink dark:text-white outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSignatureInput(
                        activeSignerRole === "employer" ? employerName : freelancerName
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 border border-ink/30 bg-sand/70 dark:bg-zinc-800 px-2 py-0.5 text-[9px] font-black uppercase text-ink dark:text-zinc-200 hover:bg-brand hover:text-white transition"
                  >
                    Auto-Fill Name
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="agreement-sign-submit-btn"
                  disabled={submitting || !agreedChecked || !signatureInput.trim()}
                  onClick={handleSignSubmit}
                  className="flex items-center justify-center gap-2 border-2 border-ink bg-[#E65A1E] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:bg-black transition disabled:opacity-50 shrink-0"
                >
                  {submitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <PenTool size={14} />
                  )}
                  <span>
                    {isHireFlow
                      ? `SIGN & HIRE PRO (₹${feeNum.toLocaleString("en-IN")})`
                      : isAlreadySignedByActiveRole
                      ? `UPDATE ${activeSignerRole.toUpperCase()} SIGNATURE`
                      : `SIGN AGREEMENT AS ${activeSignerRole.toUpperCase()}`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
