import { useState, useEffect } from "react";
import {
  Trophy, Star, Rocket, Clock, MapPin, X, Award, ChevronRight,
  ShieldCheck, Coins, Sparkles, FileText
} from "lucide-react";
import { getJobLeaderboard } from "@/lib/clientStore";

export default function ApplicantLeaderboardModal({ open, onClose, job, onOpenApply }) {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (open && job) {
      const data = getJobLeaderboard(job.id);
      setLeaderboard(data);
    }
  }, [open, job]);

  if (!open || !job) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl border-4 border-ink bg-white dark:bg-[#141414] p-5 sm:p-7 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#E65A1E] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="applicant-leaderboard-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          data-testid="leaderboard-modal-close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border-2 border-ink bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-sand transition"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-[#FFEAA0] text-ink shadow-[2px_2px_0px_#121212]">
            <Trophy size={22} className="text-[#E65A1E]" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wide text-ink dark:text-white">
              Proposal Leaderboard
            </h3>
            <p className="text-xs text-inkmuted dark:text-stone-400">
              {job.title} · {job.company_name}
            </p>
          </div>
        </div>

        {/* Explain Banner */}
        <div className="mt-3 border-2 border-ink bg-sand dark:bg-[#1f1f1f] p-3 text-xs text-ink dark:text-stone-300">
          <div className="flex items-center gap-1.5 font-black text-brand uppercase text-[10px]">
            <Sparkles size={13} /> HOW PROPOSAL BOOSTING WORKS
          </div>
          <p className="mt-1 text-[11px] leading-relaxed">
            Applicants bid extra Hops to rank higher on the employer's dashboard. The <strong>top 3 boosted proposals</strong> are highlighted as <strong>Featured Proposals</strong>. Ties are broken strictly by application timestamp (earliest submitted proposal wins).
          </p>
        </div>

        {/* Leaderboard List */}
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 px-1">
            <span>Rank & Candidate</span>
            <span>Boost Amount</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="border-2 border-dashed border-ink p-8 text-center text-xs text-inkmuted">
              No proposals submitted yet. Be the first to apply and take the #1 spot!
            </div>
          ) : (
            leaderboard.map((applicant, idx) => {
              const isTop = applicant.is_top_boosted;
              const rank = applicant.rank || idx + 1;
              const medalColors = {
                1: "bg-[#FFE082] text-ink border-[#FFA000]",
                2: "bg-[#E0E0E0] text-ink border-[#9E9E9E]",
                3: "bg-[#FFCCBC] text-ink border-[#FF7043]",
              };

              return (
                <div
                  key={applicant.id || idx}
                  data-testid={`leaderboard-row-${rank}`}
                  className={`relative border-2 border-ink p-3 transition ${
                    isTop
                      ? "bg-[#FFF9E6] dark:bg-[#282012] shadow-[3px_3px_0px_#121212]"
                      : "bg-white dark:bg-[#1b1b1b] shadow-[1.5px_1.5px_0px_#121212]"
                  }`}
                >
                  {isTop && (
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 border border-ink bg-brand px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-[1px_1px_0px_#121212]">
                        <Star size={10} /> FEATURED PROPOSAL · TOP #{rank}
                      </span>
                      <span className="text-[9px] font-bold text-inkmuted dark:text-stone-400">
                        {applicant.applied_at ? new Date(applicant.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink text-xs font-black shadow-[1px_1px_0px_#121212] ${
                          medalColors[rank] || "bg-sand dark:bg-[#333] text-ink dark:text-white"
                        }`}
                      >
                        #{rank}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="truncate text-xs font-black text-ink dark:text-white">
                            {applicant.freelancer_name || "Verified Freelancer"}
                          </p>
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                            <Star size={10} fill="currentColor" /> {applicant.rating || 4.9}
                          </span>
                        </div>
                        <p className="text-[10px] text-inkmuted dark:text-stone-400 truncate">
                          {applicant.freelancer_skill || "Verified Pro"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end font-black text-xs text-ink dark:text-white">
                        <Coins size={14} className="text-brand" />
                        <span>+{applicant.boost_credits || 0}</span>
                        <span className="text-[10px] text-inkmuted dark:text-stone-400">boost</span>
                      </div>
                      <span className="text-[9px] font-semibold text-inkmuted dark:text-stone-400">
                        {(applicant.boost_credits || 0) > 0 ? "Non-refundable" : "Standard apply"}
                      </span>
                    </div>
                  </div>

                  {/* Proposal Details (Rate, PDF, Portfolio) */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-ink/10 pt-2">
                    {applicant.proposed_quote && (
                      <span className="border border-ink bg-[#E5F8EE] dark:bg-[#133020] px-1.5 py-0.5 text-[9px] font-black text-[#00875A] dark:text-[#4ade80]">
                        Quote: ₹{Number(applicant.proposed_quote).toLocaleString("en-IN")}{applicant.proposed_rate_type === "hourly" ? "/hr" : ""}
                      </span>
                    )}

                    {applicant.portfolio_items?.length > 0 && (
                      <span className="border border-ink bg-sand dark:bg-[#252525] px-1.5 py-0.5 text-[9px] font-bold text-ink dark:text-stone-300 flex items-center gap-1">
                        <Sparkles size={9} className="text-brand" /> {applicant.portfolio_items.length} Samples
                      </span>
                    )}

                    {applicant.pdf_attachment && (
                      <a
                        href={applicant.pdf_attachment.dataUrl || "#"}
                        download={applicant.pdf_attachment.fileName || "Proposal.pdf"}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-ink bg-sand dark:bg-[#252525] hover:bg-white dark:hover:bg-[#333] px-1.5 py-0.5 text-[9px] font-bold text-ink dark:text-stone-300 flex items-center gap-1 transition"
                        onClick={(e) => {
                          if (!applicant.pdf_attachment.dataUrl) e.preventDefault();
                        }}
                      >
                        <FileText size={9} className="text-brand" />
                        <span>{applicant.pdf_attachment.fileName || "Proposal.pdf"}</span>
                      </a>
                    )}

                    <span className="text-[9px] font-bold text-[#00A86B] flex items-center gap-0.5 ml-auto">
                      <ShieldCheck size={10} /> Safe &amp; Verified
                    </span>
                  </div>

                  {applicant.note && (
                    <p className="mt-1.5 text-[10px] text-inkmuted dark:text-stone-300 italic line-clamp-2">
                      "{applicant.note}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action Button: Apply or Boost to Top */}
        <div className="mt-5 border-t-2 border-ink pt-3 flex flex-col gap-2">
          {onOpenApply && (
            <button
              type="button"
              data-testid="leaderboard-apply-now-btn"
              onClick={() => {
                onClose();
                onOpenApply(job);
              }}
              className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] transition hover:bg-brand/95 hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <Rocket size={15} />
              <span>APPLY</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
