import React from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Briefcase, MapPin, IndianRupee, ShieldCheck, ArrowRight,
  Sparkles, CheckCircle2, Clock, Building2
} from "lucide-react";

export default function JobDetailsModal({ isOpen, onClose, job }) {
  const nav = useNavigate();

  if (!isOpen || !job) return null;

  const handleApply = () => {
    onClose?.();
    nav(`/freelancer/jobs?q=${encodeURIComponent(job.title || "")}`);
  };

  return (
    <div
      data-testid="job-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="job-details-modal"
        className="relative flex flex-col w-full max-w-lg max-h-[90vh] border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#161618] text-ink dark:text-white shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#000] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-ink dark:border-zinc-700 bg-[#E6F4EA] dark:bg-[#11291E] p-4 sm:p-5">
          <div className="flex items-start gap-3 min-w-0 pr-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-[#059669] text-xl font-black text-white shadow-[1px_1px_0px_#121212]">
              💼
            </div>
            <div className="flex flex-col min-w-0">
              <span className="inline-flex items-center gap-1 bg-[#059669]/15 text-[#059669] dark:text-emerald-300 border border-[#059669] px-1.5 py-0.2 text-[9px] font-black w-fit uppercase">
                <ShieldCheck size={10} /> VERIFIED OPEN GIG
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-ink dark:text-white mt-0.5 truncate">
                {job.title}
              </h2>
              <p className="text-xs font-bold text-inkmuted dark:text-zinc-300">
                🏢 {job.company_name || job.employer_name || "WorkHop Partner"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-[#2a2a2a] text-ink dark:text-white hover:bg-black hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="text-sm font-black text-[#059669]">
                ₹{Number(job.pay || 15000).toLocaleString("en-IN")}
              </span>
              <span className="text-[9px] font-black uppercase text-inkmuted dark:text-zinc-400">
                Gig Budget (Fixed)
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="text-sm font-black text-ink dark:text-white">
                {job.distance_km || 1.2} km
              </span>
              <span className="text-[9px] font-black uppercase text-inkmuted dark:text-zinc-400">
                {job.area || "Bengaluru"}
              </span>
            </div>
          </div>

          <div className="border border-ink/20 dark:border-zinc-700 bg-sand/30 dark:bg-zinc-900/60 p-3.5">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-1">
              Gig Scope &amp; Details
            </h3>
            <p className="text-xs sm:text-[13px] leading-relaxed text-ink dark:text-zinc-200">
              {job.description || "Exciting gig opportunity with immediate onboarding and direct payment protection."}
            </p>
          </div>

          <div className="border border-[#059669]/30 bg-[#E6F4EA] dark:bg-[#11291E] p-2.5 text-xs text-[#059669] dark:text-emerald-300 flex items-center gap-2">
            <Sparkles size={15} className="shrink-0" />
            <span className="text-[11px] font-bold">
              0% Platform Fees on Completed Gigs · Direct UPI Escrow Protection
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-ink dark:border-zinc-700 p-3.5 sm:p-4 bg-white dark:bg-[#1a1a1c]">
          <button
            onClick={handleApply}
            className="flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-[#059669] py-3 text-xs sm:text-sm font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:bg-black transition active:translate-y-0.5 uppercase"
          >
            <span>VIEW ON GIGS PAGE &amp; APPLY</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
