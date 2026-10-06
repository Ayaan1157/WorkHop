import React from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ShieldCheck, MapPin, Star, IndianRupee, Clock, CheckCheck,
  Globe, Tag, Briefcase, ExternalLink, MessageSquare, PlusCircle,
  ArrowRight, User, CheckCircle2, Lock
} from "lucide-react";
import { getOrCreateChatWithCandidate } from "@/lib/clientStore";

export default function FreelancerProfileModal({ isOpen, onClose, pro }) {
  const nav = useNavigate();

  if (!isOpen || !pro) return null;

  const firstName = pro.name?.split(" ")?.[0] || pro.name || "Freelancer";
  const initials =
    pro.initials ||
    pro.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "PRO";

  const handlePostGig = () => {
    onClose?.();
    nav("/employer/post-job", {
      state: {
        prefillTitle: `Need ${pro.skill}`,
        prefillCategory: pro.category || pro.bucket || "Graphics & Design",
        prefillArea: pro.area || "Bengaluru",
        hireCandidateId: pro.id,
        hireCandidateName: pro.name,
      },
    });
  };

  const handleStartChat = () => {
    onClose?.();
    const convId = getOrCreateChatWithCandidate(pro);
    nav(`/chat/${convId}?role=employer`);
  };

  const handleViewFullProfile = () => {
    onClose?.();
    nav(`/pro/${pro.id}`);
  };

  return (
    <div
      data-testid="freelancer-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="freelancer-profile-modal"
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#161618] text-ink dark:text-white shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#000] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Close button & Profile Banner */}
        <div className="flex items-start justify-between border-b-2 border-ink dark:border-zinc-700 bg-sand/70 dark:bg-[#1f1f22] p-4 sm:p-5">
          <div className="flex items-start gap-3.5 min-w-0 pr-6">
            {/* Avatar Initials with live active dot */}
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand text-lg sm:text-xl font-black text-white shadow-[2px_2px_0px_#121212]">
              {initials}
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#10B981] border-2 border-white dark:border-[#161618]"
                title="Available Now"
              />
            </div>

            {/* Name, Title, Badges */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  data-testid="modal-pro-name"
                  className="text-base sm:text-lg font-black tracking-tight text-ink dark:text-white truncate"
                >
                  {pro.name}
                </h2>
                <span className="inline-flex items-center gap-0.5 bg-ok/15 text-ok border border-ok px-1.5 py-0.2 text-[9px] font-black shrink-0">
                  <ShieldCheck size={11} /> VERIFIED PRO
                </span>
              </div>

              <p className="text-xs sm:text-sm font-bold text-inkmuted dark:text-zinc-300 line-clamp-1 mt-0.5">
                {pro.skill}
              </p>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] font-bold">
                <span className="flex items-center gap-1 text-ink dark:text-zinc-200">
                  <MapPin size={12} className="text-brand shrink-0" />
                  <span>
                    {pro.area || "Bengaluru"} ·{" "}
                    <strong className="text-brand">{pro.distance_km || 0.8} km away</strong>
                  </span>
                </span>
                <span className="border border-ink/20 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.2 text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400">
                  {pro.category || pro.bucket || "Creative"}
                </span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            data-testid="modal-pro-close-btn"
            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-[#2a2a2a] text-ink dark:text-white hover:bg-brand hover:text-white transition shadow-[1px_1px_0px_#121212]"
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body Details */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-ink dark:text-white">
                <Star size={12} className="fill-brand text-brand" />
                {pro.rating || "4.9"}
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                {pro.reviews_count || 16} Reviews
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-ok">
                <CheckCheck size={13} />
                {pro.jobs_done || 22}
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                Jobs Done
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-brand">
                ₹{pro.rate_hr || 550}/hr
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                Rate / Hour
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-ink dark:text-white">
                <Clock size={12} className="text-brand" />
                {pro.delivery_days || 1}d
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                Turnaround
              </span>
            </div>
          </div>

          {/* About / Bio */}
          <div className="border border-ink/20 dark:border-zinc-700 bg-sand/30 dark:bg-zinc-900/60 p-3.5">
            <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-1.5">
              <User size={13} className="text-brand" />
              <span>About {firstName}</span>
            </h3>
            <p className="text-xs sm:text-[13px] leading-relaxed text-ink dark:text-zinc-200 font-medium">
              {pro.intro ||
                `${pro.name} is a verified professional specializing in ${pro.skill} in Bengaluru. Experienced in fast delivery, clear communication, and high quality deliverables.`}
            </p>
          </div>

          {/* Core Skills & Keywords */}
          {Array.isArray(pro.keywords) && pro.keywords.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-2">
                <Tag size={13} className="text-brand" />
                <span>Specialized Skills</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {pro.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="border border-ink/30 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-200 capitalize shadow-[1px_1px_0px_#121212] dark:shadow-none"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages Spoken */}
          {Array.isArray(pro.languages) && pro.languages.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-1.5">
                <Globe size={13} className="text-brand" />
                <span>Languages</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {pro.languages.map((lang, i) => (
                  <span
                    key={i}
                    className="border border-ink/20 dark:border-zinc-700 bg-sand dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-black text-ink dark:text-zinc-200"
                  >
                    🗣️ {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work Samples / Portfolio Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                <Briefcase size={13} className="text-brand" />
                <span>Portfolio &amp; Work Samples</span>
              </h3>
              {pro.portfolio && (
                <span className="text-[10px] font-bold text-brand flex items-center gap-1">
                  <ExternalLink size={10} />
                  <span>{pro.portfolio}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(pro.samples || [
                { title: `${pro.skill} Deliverables`, type: "Client Project", tag: "Completed" },
                { title: "Verified Past Work Milestone", type: "Portfolio Work", tag: "Bengaluru" },
              ]).slice(0, 2).map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border border-ink/20 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-xs shadow-sm"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-black text-ink dark:text-white truncate">{s.title}</p>
                    <p className="text-[10px] text-inkmuted dark:text-zinc-400">{s.type}</p>
                  </div>
                  <span className="border border-ink/20 bg-sand dark:bg-zinc-700 px-1.5 py-0.5 text-[9px] font-black uppercase shrink-0">
                    {s.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Contact Policy Notice Banner */}
          <div className="border border-ok/40 bg-[#E6F4EA] dark:bg-[#11291E] p-2.5 text-xs text-[#059669] dark:text-emerald-300 flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug">
              <strong>Verified Hyperlocal Hire:</strong> Direct WhatsApp &amp; phone details are
              safely unlocked once the gig is initiated or hired to ensure platform escrow protection.
            </p>
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="flex flex-col gap-2 border-t-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#1a1a1c] p-3.5 sm:p-4">
          {/* Main Hire CTA */}
          <button
            onClick={handlePostGig}
            data-testid="modal-post-gig-hire-btn"
            className="flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-brand py-3 text-xs sm:text-sm font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:bg-black transition active:translate-y-0.5 uppercase"
          >
            <PlusCircle size={15} />
            <span>POST GIG TO HIRE {firstName} (0% PLATFORM FEE)</span>
            <ArrowRight size={15} />
          </button>

          {/* Secondary Actions Row: Chat & View Full Profile */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStartChat}
              data-testid="modal-chat-pro-btn"
              className="flex items-center justify-center gap-1.5 border border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 py-2 text-xs font-black text-ink dark:text-white hover:bg-stone/30 transition"
            >
              <MessageSquare size={13} className="text-brand" />
              <span>Chat / Message</span>
            </button>

            <button
              onClick={handleViewFullProfile}
              data-testid="modal-view-full-profile-btn"
              className="flex items-center justify-center gap-1.5 border border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 text-xs font-black text-ink dark:text-white hover:bg-sand transition"
            >
              <span>Full Profile Page</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
