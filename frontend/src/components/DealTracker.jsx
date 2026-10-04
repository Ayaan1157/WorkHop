import React, { useState, useMemo } from "react";
import {
  ShieldCheck, AlertTriangle, Clock, CheckCircle2, ChevronDown, ChevronUp,
  ExternalLink, Loader2, ArrowRight, X, AlertCircle, Sparkles, Send, Flag
} from "lucide-react";
import { apiPost } from "@/lib/api";
import { fundDealEscrow } from "@/hooks/usePayments";

/**
 * DealTracker
 * Pinned sticky panel at top of chat showing real-time deal state,
 * agreed milestone amount, dual-mode stepper, "What happens now?" guidance,
 * dynamic role actions, and expandable immutable activity log.
 */
export default function DealTracker({
  deal,
  events = [],
  myRole = "freelancer",
  onDealUpdated,
  onOpenReview,
}) {
  const [expandedLog, setExpandedLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Modals state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submissionNote, setSubmissionNote] = useState("");
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [employerDirectAck, setEmployerDirectAck] = useState(false);

  if (!deal) return null;

  const mode = deal.payment_mode || "escrow";
  const status = deal.status || "created";
  const agreedRupees = Math.round((deal.agreed_amount_paise || 0) / 100);
  const commissionRupees = Math.round((deal.commission_paise || 0) / 100);
  const netRupees = Math.round((deal.freelancer_net_paise || 0) / 100);

  // Calculate active step index for the 5-step stepper
  const stepIndex = useMemo(() => {
    if (mode === "escrow") {
      switch (status) {
        case "created": return 0;
        case "funded": return 1;
        case "in_progress": return 2;
        case "submitted": return 3;
        case "approved":
        case "completed": return 4;
        default: return 0;
      }
    } else {
      switch (status) {
        case "created": return 0;
        case "acknowledged": return 1;
        case "in_progress": return 2;
        case "work_submitted": return 2.5;
        case "work_confirmed": return 3;
        case "completed": return 4;
        default: return 0;
      }
    }
  }, [mode, status]);

  const escrowSteps = [
    { label: "Agreed", sub: "Deal created" },
    { label: "Funded", sub: "Escrow secured" },
    { label: "In Progress", sub: "Work started" },
    { label: "Submitted", sub: "72h review" },
    { label: "Released", sub: "Payment settled" },
  ];

  const directSteps = [
    { label: "Agreed", sub: "Deal created" },
    { label: "Acknowledged", sub: "Risk accepted" },
    { label: "In Progress", sub: "Work started" },
    { label: "Delivered", sub: "Work confirmed" },
    { label: "Settled", sub: "Direct receipt" },
  ];

  const currentSteps = mode === "escrow" ? escrowSteps : directSteps;

  // Contextual "What happens now?" guidance
  const guidance = useMemo(() => {
    if (status === "disputed") {
      return "⚠️ Escrow funds are frozen. WorkHop Admin is reviewing the chat logs and will arbitrate a release, refund, or split payout.";
    }
    if (status === "refunded") {
      return "Funds were fully refunded to the employer client by Admin decision.";
    }
    if (status === "reported") {
      return "⚠️ Issue reported to Admin review queue. Note: WorkHop cannot arbitrate or recover direct settlements.";
    }
    if (status === "completed") {
      return "🎉 Deal successfully completed and payment settled! Leave a review to build your WorkHop reputation.";
    }

    if (mode === "escrow") {
      if (status === "created") {
        return myRole === "employer"
          ? `Deposit ₹${agreedRupees.toLocaleString("en-IN")} into WorkHop Escrow below. Funds are held safely until you approve the delivered work.`
          : `Waiting for employer to fund ₹${agreedRupees.toLocaleString("en-IN")} into Escrow. Do not start work until funds are deposited.`;
      }
      if (status === "funded") {
        return myRole === "freelancer"
          ? "₹" + agreedRupees.toLocaleString("en-IN") + " is safely locked in escrow! Click 'Start Work' below to begin."
          : "Escrow funded! Freelancer has been notified to commence work.";
      }
      if (status === "in_progress") {
        return myRole === "freelancer"
          ? "You are actively working on this gig. Once finished, submit your deliverables for client review."
          : "Freelancer is actively working on your deliverables. They will submit work here when ready.";
      }
      if (status === "submitted") {
        const autoReleaseStr = deal.auto_release_at
          ? `Auto-releases on ${new Date(deal.auto_release_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`
          : "72-hour review SLA countdown active.";
        return myRole === "employer"
          ? `Freelancer submitted work for review. Verify deliverables and click 'Approve Work & Release' to complete payout. ${autoReleaseStr}`
          : `Deliverables submitted! Client is reviewing. ${autoReleaseStr} If approved or clock expires, your net ₹${netRupees.toLocaleString("en-IN")} will release automatically.`;
      }
    } else {
      // Direct Mode
      if (status === "created") {
        return myRole === "employer"
          ? "Freelancer chose Direct Payment mode. Please read the risk disclaimer and acknowledge terms to begin."
          : "You chose Direct Payment (0% fee). Waiting for employer to acknowledge direct settlement terms.";
      }
      if (status === "acknowledged") {
        return myRole === "freelancer"
          ? "Employer acknowledged direct terms. You may now start work and settle payment directly (UPI/Cash)."
          : "Direct terms acknowledged. Freelancer will deliver work directly.";
      }
      if (status === "in_progress") {
        return myRole === "freelancer"
          ? "Work in progress. Once complete, click 'Mark Work Delivered'."
          : "Freelancer is working on your gig. You will settle payment directly upon delivery.";
      }
      if (status === "work_submitted") {
        return myRole === "employer"
          ? "Freelancer delivered work! Review deliverables, confirm receipt below, and pay freelancer directly via UPI."
          : "Work marked delivered. Awaiting employer to confirm delivery and transfer payment.";
      }
      if (status === "work_confirmed") {
        return myRole === "freelancer"
          ? "Employer confirmed work delivery! Confirm here once you have received your direct UPI/Cash payment."
          : "Delivery confirmed. Please complete the direct payment transfer (UPI/Bank) to the freelancer.";
      }
    }
    return "Deal in progress.";
  }, [mode, status, myRole, agreedRupees, netRupees, deal.auto_release_at]);

  // Handler for deal actions
  const handleAction = async (action, notes = "") => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiPost(`/deals/${deal.deal_id}/action`, {
        action,
        actor_role: myRole,
        notes,
      });
      if (res?.deal) {
        onDealUpdated && onDealUpdated(res.deal, res.events);
      }
      setSubmitModalOpen(false);
      setDisputeModalOpen(false);
      setReportModalOpen(false);
    } catch (err) {
      setActionError(err?.message || "Failed to perform deal action.");
    } finally {
      setBusy(false);
    }
  };

  // Handler for employer funding escrow
  const handleFundEscrow = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fundDealEscrow(deal.deal_id, `WorkHop Escrow: ${deal.job_title || "Gig Payment"}`);
      if (res?.deal) {
        onDealUpdated && onDealUpdated(res.deal, res.events);
      }
    } catch (err) {
      if (err?.message !== "PAYMENT_CANCELLED") {
        setActionError(err?.message || "Failed to complete escrow deposit.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="deal-tracker"
      className="border-b-2 border-ink bg-white dark:bg-zinc-900 transition-all font-sans"
    >
      {/* 1. TOP HEADER BAR: Mode Badge, Status Pill, Financial Breakdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 bg-[#FAF7F2] dark:bg-zinc-950 border-b border-ink/10 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          {mode === "escrow" ? (
            <span
              data-testid="deal-mode-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-[#E65A1E] text-white rounded shadow-sm"
            >
              <ShieldCheck size={14} /> Escrow Protected
            </span>
          ) : (
            <span
              data-testid="deal-mode-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-500 text-white rounded shadow-sm"
            >
              <AlertTriangle size={14} /> Direct Settlement (At Your Own Risk)
            </span>
          )}

          {/* Status Badge */}
          <span
            data-testid="deal-status-badge"
            className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border rounded ${
              status === "completed"
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                : status === "disputed" || status === "reported"
                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-white text-ink border-ink/30 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
          >
            {status.replace("_", " ")}
          </span>
        </div>

        {/* Amount Breakdown */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-[10px] text-inkmuted dark:text-zinc-400 block uppercase font-bold">
              Agreed Amount
            </span>
            <span className="font-black text-ink dark:text-white text-sm">
              ₹{agreedRupees.toLocaleString("en-IN")}
            </span>
          </div>

          {mode === "escrow" && (
            <>
              <div className="hidden sm:block border-l border-ink/15 dark:border-white/15 pl-3">
                <span className="text-[10px] text-inkmuted dark:text-zinc-400 block uppercase font-bold">
                  Fee (5%)
                </span>
                <span className="font-bold text-[#E65A1E] text-xs">
                  -₹{commissionRupees.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="border-l border-ink/15 dark:border-white/15 pl-3">
                <span className="text-[10px] text-inkmuted dark:text-zinc-400 block uppercase font-bold">
                  Net Payout
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{netRupees.toLocaleString("en-IN")}
                </span>
              </div>
            </>
          )}

          {mode === "direct" && (
            <div className="border-l border-ink/15 dark:border-white/15 pl-3">
              <span className="text-[10px] text-inkmuted dark:text-zinc-400 block uppercase font-bold">
                Platform Fee
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                ₹0 (0%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. RESPONSIVE 5-STEP STEPPER */}
      <div className="px-2 py-3 sm:px-6 overflow-x-auto">
        <div className="flex items-center justify-between w-full min-w-0">
          {currentSteps.map((s, idx) => {
            const isCompleted = idx < stepIndex || (idx === 4 && status === "completed");
            const isCurrent = (idx === stepIndex && status !== "completed") || (idx === Math.floor(stepIndex) && stepIndex % 1 !== 0);

            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center text-center px-0.5 sm:px-1 flex-1 min-w-0">
                  <div
                    className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-xs font-black transition-all border-2 shrink-0 ${
                      isCompleted
                        ? "bg-ok text-white border-ok"
                        : isCurrent
                        ? mode === "escrow"
                          ? "bg-[#E65A1E] text-white border-[#E65A1E] ring-2 ring-[#E65A1E]/30"
                          : "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-500/30"
                        : "bg-sand text-inkmuted border-ink/20 dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={13} className="sm:w-[15px] sm:h-[15px]" /> : idx + 1}
                  </div>
                  <span
                    className={`mt-1 sm:mt-1.5 text-[8.5px] sm:text-[11px] font-black uppercase tracking-tight max-w-[56px] sm:max-w-none truncate sm:whitespace-normal ${
                      isCurrent
                        ? mode === "escrow"
                          ? "text-[#E65A1E]"
                          : "text-amber-600 dark:text-amber-400"
                        : isCompleted
                        ? "text-ink dark:text-white"
                        : "text-inkmuted dark:text-zinc-500"
                    }`}
                    title={s.label}
                  >
                    {s.label}
                  </span>
                  <span className="text-[9px] text-inkmuted dark:text-zinc-400 hidden sm:block">
                    {s.sub}
                  </span>
                </div>
                {idx < currentSteps.length - 1 && (
                  <div
                    className={`h-[2px] sm:h-[3px] flex-1 -mt-3.5 sm:-mt-4 transition-all min-w-[6px] sm:min-w-[12px] ${
                      idx < stepIndex
                        ? "bg-ok"
                        : "bg-ink/15 dark:bg-white/10"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. CONTEXTUAL "WHAT HAPPENS NOW?" + DYNAMIC ACTIONS */}
      <div className="px-4 py-2.5 sm:px-6 bg-sand/40 dark:bg-zinc-900 border-t border-ink/10 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <Clock size={16} className="text-[#E65A1E] shrink-0 mt-0.5" />
          <p
            data-testid="deal-guidance-text"
            className="text-xs text-ink dark:text-zinc-200 font-semibold leading-relaxed"
          >
            {guidance}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actionError && (
            <span className="text-[11px] text-danger font-bold flex items-center gap-1">
              <AlertCircle size={13} /> {actionError}
            </span>
          )}

          {/* ESCROW ACTIONS */}
          {mode === "escrow" && (
            <>
              {/* Employer fund button */}
              {myRole === "employer" && status === "created" && (
                <button
                  data-testid="fund-escrow-btn"
                  disabled={busy}
                  onClick={handleFundEscrow}
                  className="flex items-center gap-1.5 bg-[#E65A1E] text-white px-3.5 py-1.5 rounded text-xs font-black tracking-wide hover:bg-[#d04e17] transition shadow-sm disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                  FUND ESCROW (₹{agreedRupees.toLocaleString("en-IN")})
                </button>
              )}

              {/* Freelancer start work */}
              {myRole === "freelancer" && status === "funded" && (
                <button
                  data-testid="start-work-btn"
                  disabled={busy}
                  onClick={() => handleAction("start_work")}
                  className="flex items-center gap-1.5 bg-ink text-white dark:bg-white dark:text-black px-3.5 py-1.5 rounded text-xs font-black tracking-wide hover:bg-brand hover:text-white transition shadow-sm disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={14} />}
                  START WORK
                </button>
              )}

              {/* Freelancer submit work */}
              {myRole === "freelancer" && (status === "in_progress" || status === "funded") && (
                <button
                  data-testid="submit-work-modal-btn"
                  disabled={busy}
                  onClick={() => setSubmitModalOpen(true)}
                  className="flex items-center gap-1.5 bg-ok text-white px-3.5 py-1.5 rounded text-xs font-black tracking-wide hover:bg-ok/90 transition shadow-sm disabled:opacity-50"
                >
                  <Send size={14} /> SUBMIT WORK DELIVERY
                </button>
              )}

              {/* Employer approve work */}
              {myRole === "employer" && status === "submitted" && (
                <button
                  data-testid="approve-work-btn"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Release ₹${netRupees.toLocaleString("en-IN")} from escrow to the freelancer?`)) {
                      handleAction("approve_work");
                    }
                  }}
                  className="flex items-center gap-1.5 bg-ok text-white px-3.5 py-1.5 rounded text-xs font-black tracking-wide hover:bg-ok/90 transition shadow-sm disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  APPROVE & RELEASE FUNDS
                </button>
              )}

              {/* Dispute button */}
              {(status === "funded" || status === "in_progress" || status === "submitted") && (
                <button
                  data-testid="raise-dispute-btn"
                  disabled={busy}
                  onClick={() => setDisputeModalOpen(true)}
                  className="flex items-center gap-1 text-danger border border-danger/40 px-2.5 py-1.5 rounded text-xs font-bold hover:bg-danger/10 transition disabled:opacity-50"
                >
                  <AlertTriangle size={13} /> RAISE DISPUTE
                </button>
              )}
            </>
          )}

          {/* DIRECT MODE ACTIONS */}
          {mode === "direct" && (
            <>
              {/* Employer Acknowledge */}
              {myRole === "employer" && status === "created" && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-ink dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={employerDirectAck}
                      onChange={(e) => setEmployerDirectAck(e.target.checked)}
                      className="rounded border-amber-500 text-amber-600"
                    />
                    I accept direct risk
                  </label>
                  <button
                    data-testid="direct-ack-btn"
                    disabled={!employerDirectAck || busy}
                    onClick={() => handleAction("acknowledge")}
                    className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-black tracking-wide hover:bg-amber-700 transition disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    START DIRECT DEAL
                  </button>
                </div>
              )}

              {/* Freelancer start work */}
              {myRole === "freelancer" && status === "acknowledged" && (
                <button
                  data-testid="direct-start-work-btn"
                  disabled={busy}
                  onClick={() => handleAction("start_work")}
                  className="flex items-center gap-1.5 bg-ink text-white dark:bg-white dark:text-black px-3.5 py-1.5 rounded text-xs font-black tracking-wide hover:bg-brand hover:text-white transition shadow-sm disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={14} />}
                  START WORK
                </button>
              )}

              {/* Freelancer deliver work */}
              {myRole === "freelancer" && (status === "in_progress" || status === "acknowledged") && (
                <button
                  data-testid="direct-submit-work-btn"
                  disabled={busy}
                  onClick={() => setSubmitModalOpen(true)}
                  className="flex items-center gap-1 bg-ok text-white px-3 py-1.5 rounded text-xs font-black hover:bg-ok/90 transition disabled:opacity-50"
                >
                  <Send size={13} /> MARK WORK DELIVERED
                </button>
              )}

              {/* Employer confirm work received */}
              {myRole === "employer" && status === "work_submitted" && (
                <button
                  data-testid="direct-confirm-work-btn"
                  disabled={busy}
                  onClick={() => handleAction("confirm_work")}
                  className="flex items-center gap-1 bg-ink text-white dark:bg-white dark:text-black px-3 py-1.5 rounded text-xs font-black hover:bg-brand hover:text-white transition disabled:opacity-50"
                >
                  <CheckCircle2 size={13} /> CONFIRM WORK RECEIVED
                </button>
              )}

              {/* Freelancer confirm direct payment received */}
              {myRole === "freelancer" && (status === "work_confirmed" || status === "work_submitted") && (
                <button
                  data-testid="direct-confirm-payment-btn"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Confirm receipt of ₹${agreedRupees.toLocaleString("en-IN")} via direct UPI/Cash settlement?`)) {
                      handleAction("confirm_payment");
                    }
                  }}
                  className="flex items-center gap-1 bg-ok text-white px-3.5 py-1.5 rounded text-xs font-black hover:bg-ok/90 transition shadow-sm disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  CONFIRM PAYMENT RECEIVED
                </button>
              )}

              {/* Report issue button */}
              {status !== "completed" && status !== "cancelled" && status !== "reported" && (
                <button
                  data-testid="direct-report-btn"
                  disabled={busy}
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center gap-1 text-inkmuted hover:text-danger text-xs font-bold px-2 py-1.5 transition"
                >
                  <Flag size={13} /> REPORT ISSUE
                </button>
              )}
            </>
          )}

          {/* Rate Button when completed */}
          {status === "completed" && onOpenReview && (
            <button
              data-testid="rate-partner-btn"
              onClick={onOpenReview}
              className="flex items-center gap-1.5 bg-[#E65A1E] text-white px-3.5 py-1.5 rounded text-xs font-black tracking-wide hover:bg-[#d04e17] transition shadow-sm"
            >
              ★ RATE {myRole === "employer" ? "PRO" : "CLIENT"}
            </button>
          )}

          {/* Activity Log Toggle */}
          <button
            data-testid="toggle-deal-log-btn"
            onClick={() => setExpandedLog(!expandedLog)}
            className="flex items-center gap-1 text-[11px] font-bold text-inkmuted dark:text-zinc-400 hover:text-ink dark:hover:text-white ml-2 py-1"
          >
            <span>Timeline ({events.length})</span>
            {expandedLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 4. EXPANDABLE ACTIVITY TIMELINE LOG */}
      {expandedLog && (
        <div
          data-testid="deal-events-timeline"
          className="px-4 py-3 sm:px-6 bg-[#FAF7F2] dark:bg-zinc-950 border-t border-ink/10 dark:border-white/10"
        >
          <h5 className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-2.5">
            Deal Milestone Log
          </h5>
          {events.length === 0 ? (
            <p className="text-xs text-inkmuted">No events recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {events.map((evt, i) => (
                <div
                  key={evt.event_id || i}
                  className="flex items-start gap-2.5 text-xs text-ink dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-ink/10 dark:border-white/10 p-2.5 rounded"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-sand dark:bg-zinc-800 text-inkmuted dark:text-zinc-300 shrink-0">
                    {evt.actor_role}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-xs text-ink dark:text-white">{evt.title}</p>
                    <p className="text-[11px] text-inkmuted dark:text-zinc-400 mt-0.5">{evt.description}</p>
                  </div>
                  <span className="text-[10px] text-inkmuted dark:text-zinc-400 shrink-0">
                    {new Date(evt.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: SUBMIT DELIVERABLES */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-[4px_4px_0px_#121212]">
            <div className="flex items-center justify-between pb-3 border-b border-ink/10 dark:border-white/10">
              <h3 className="text-sm font-black uppercase text-ink dark:text-white flex items-center gap-1.5">
                <Send size={16} className="text-brand" /> Submit Work Delivery
              </h3>
              <button onClick={() => setSubmitModalOpen(false)} className="text-ink dark:text-zinc-300 hover:text-black dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-inkmuted dark:text-zinc-400 mt-2 leading-relaxed">
              Include links to Google Drive, Figma, GitHub, or any completion notes for your client.
              {mode === "escrow" && " Once submitted, the 72-hour review clock begins."}
            </p>
            <textarea
              rows={4}
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
              placeholder="e.g. Completed all flyer designs and exported print-ready 4K PDFs: https://drive.google.com/..."
              className="w-full mt-3 p-2.5 text-xs border border-ink/30 dark:border-white/20 dark:bg-zinc-800 text-ink dark:text-white rounded focus:outline-none focus:border-brand"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold border border-ink/30 dark:border-white/20 text-ink dark:text-zinc-300 hover:bg-sand dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => handleAction("submit_work", submissionNote)}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-black bg-ok text-white hover:bg-ok/90"
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                CONFIRM SUBMISSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: RAISE DISPUTE */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border-2 border-danger bg-white dark:bg-zinc-900 p-5 shadow-[4px_4px_0px_#dc2626]">
            <div className="flex items-center justify-between pb-3 border-b border-danger/20">
              <h3 className="text-sm font-black uppercase text-danger flex items-center gap-1.5">
                <AlertTriangle size={16} /> Open Escrow Dispute
              </h3>
              <button onClick={() => setDisputeModalOpen(false)} className="text-danger hover:opacity-75">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-ink/80 dark:text-zinc-300 mt-2 leading-relaxed">
              Escrow funds will be immediately frozen. A WorkHop arbitrator will review your conversation history and project deliverables to rule on a release, refund, or split.
            </p>
            <textarea
              rows={4}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain the reason for opening this dispute..."
              className="w-full mt-3 p-2.5 text-xs border border-ink/30 dark:border-white/20 dark:bg-zinc-800 text-ink dark:text-white rounded focus:outline-none focus:border-danger"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDisputeModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold border border-ink/30 dark:border-white/20 text-ink dark:text-zinc-300 hover:bg-sand dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                disabled={busy || !disputeReason.trim()}
                onClick={() => handleAction("dispute", disputeReason)}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-black bg-danger text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                FREEZE FUNDS & OPEN DISPUTE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: REPORT DIRECT DEAL ISSUE */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border-2 border-amber-600 bg-white dark:bg-zinc-900 p-5 shadow-[4px_4px_0px_#d97706]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <h3 className="text-sm font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Flag size={16} /> Report Direct Deal Issue
              </h3>
              <button onClick={() => setReportModalOpen(false)} className="text-amber-700 dark:text-amber-400 hover:opacity-75">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-ink/80 dark:text-zinc-300 mt-2 leading-relaxed">
              <strong>Note:</strong> WorkHop does not escrow funds for direct deals and cannot recover lost money. Reporting will alert the WorkHop safety team for bad actor investigations.
            </p>
            <textarea
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue with the client or freelancer..."
              className="w-full mt-3 p-2.5 text-xs border border-ink/30 dark:border-white/20 dark:bg-zinc-800 text-ink dark:text-white rounded focus:outline-none focus:border-amber-600"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold border border-ink/30 dark:border-white/20 text-ink dark:text-zinc-300 hover:bg-sand dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                disabled={busy || !reportReason.trim()}
                onClick={() => handleAction("report", reportReason)}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-black bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                SUBMIT REPORT TO ADMIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
