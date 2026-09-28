import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock, X, Briefcase, MapPin, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function ProfileLockedModal({ isOpen, onClose, pro }) {
  const nav = useNavigate();

  if (!isOpen) return null;

  const handlePostGig = () => {
    onClose?.();
    nav("/employer/post-job", {
      state: {
        prefillTitle: pro?.skill ? `Need ${pro.skill}` : "",
        prefillCategory: pro?.category || "Graphics & Design",
        prefillArea: pro?.area || "Bengaluru",
      },
    });
  };

  return (
    <div
      data-testid="profile-locked-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="profile-locked-modal"
        className="relative w-full max-w-md border-2 border-ink bg-white dark:bg-[#161618] text-ink dark:text-white p-6 shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#333] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          data-testid="profile-locked-close"
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center border-2 border-ink bg-sand dark:bg-[#252525] text-ink dark:text-white hover:bg-brand hover:text-white transition"
          title="Close"
        >
          <X size={15} />
        </button>

        {/* Lock Icon & Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-[#FFF4EE] text-brand">
            <Lock size={20} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 border border-brand bg-brand/10 text-brand px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
              <ShieldCheck size={11} /> LAUNCH PHASE · PROFILE PRIVATE
            </span>
            <p className="text-[11px] font-bold text-inkmuted dark:text-stone-400">
              WorkHop Early Access Rollout
            </p>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-ink dark:text-white uppercase leading-snug">
          Freelancer Profile Protected
        </h3>

        {/* Selected Pro Summary */}
        {pro && (
          <div className="my-3 border border-ink/20 bg-sand/50 dark:bg-[#202020] p-3 text-xs flex items-center justify-between">
            <div>
              <p className="font-extrabold text-ink dark:text-white">{pro.name}</p>
              <p className="text-inkmuted dark:text-stone-400 font-semibold">{pro.skill}</p>
            </div>
            {pro.area && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-inkmuted bg-white dark:bg-[#141414] px-2 py-1 border border-ink/20">
                <MapPin size={10} className="text-ok" /> {pro.area}
              </span>
            )}
          </div>
        )}

        {/* Explanatory Body */}
        <p className="text-xs text-inkmuted dark:text-stone-300 leading-relaxed">
          To protect freelancer privacy and maintain verified quality during our initial Bengaluru rollout, direct contact numbers and portfolios cannot be viewed directly.
        </p>

        <div className="mt-3 rounded border border-brand/30 bg-[#FFF9F3] dark:bg-[#201510] p-3 text-xs text-brand">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="shrink-0" />
            <span>How to hire for this role:</span>
          </p>
          <p className="text-[11.5px] leading-snug text-ink dark:text-stone-200">
            Post your gig for free! Verified freelancers matching <strong>{pro?.skill || "your requirements"}</strong> within a 5km radius will be alerted immediately and submit proposals to you.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={handlePostGig}
            data-testid="profile-locked-post-btn"
            className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:bg-black transition active:translate-y-0.5"
          >
            <Briefcase size={14} />
            <span>POST A GIG FOR FREE (100% FREE)</span>
            <ArrowRight size={14} />
          </button>
          <button
            onClick={onClose}
            className="w-full border border-ink/30 bg-transparent py-2 text-xs font-bold text-inkmuted dark:text-stone-400 hover:text-ink dark:hover:text-white hover:bg-sand/30 transition"
          >
            Continue Browsing Directory
          </button>
        </div>
      </div>
    </div>
  );
}
