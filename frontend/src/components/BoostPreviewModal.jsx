import React from "react";
import { Flame, Check, X } from "lucide-react";

export default function BoostPreviewModal({ isOpen, onClose, onConfirmBoost }) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="boost-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl border-2 border-ink bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-[#FF3B30] text-white shadow-[2px_2px_0px_#121212]">
              <Flame size={22} fill="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-ink">URGENT JOB BOOST PREVIEW</p>
                <span className="border border-ink bg-[#FF3B30] px-1.5 py-0.2 text-[9px] font-black text-white uppercase shadow-[1px_1px_0px_#121212] animate-pulse">
                  🔥 URGENT
                </span>
              </div>
              <p className="text-[11px] text-inkmuted font-semibold">Make your gig urgent to get discovered first and hired 3.5x faster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white hover:bg-sand transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Standard Listing Preview */}
          <div className="flex flex-col border-2 border-ink/40 bg-sand p-4 opacity-75">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-inkmuted">STANDARD LISTING</span>
              <span className="text-[10px] text-inkmuted">Regular Rank</span>
            </div>
            <div className="border border-ink/30 bg-white p-3">
              <span className="border border-ink/30 bg-sand px-1.5 py-0.5 text-[9px] font-bold text-inkmuted uppercase">
                UI/UX DESIGN
              </span>
              <p className="mt-1.5 text-xs font-black text-ink">Redesign fintech flow</p>
              <p className="text-[10px] text-inkmuted">₹18,000 · Indiranagar · 0.4km</p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-[11px] text-inkmuted">
              <li>• Standard search position</li>
              <li>• Normal feed discovery</li>
              <li>• 3 daily apply cap</li>
              <li>• Default card styling</li>
            </ul>
          </div>

          {/* Urgent Boosted Listing Preview */}
          <div className="flex flex-col border-2 border-ink bg-[#FFF5F5] p-4 shadow-[3px_3px_0px_#FF3B30]">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 border border-ink bg-[#FF3B30] px-2 py-0.5 text-[10px] font-black text-white shadow-[1.5px_1.5px_0px_#121212]">
                <Flame size={11} fill="white" /> URGENT BOOST
              </span>
              <span className="text-[10px] font-black text-[#FF3B30]">3.5x Fast Hires · Pinned</span>
            </div>
            <div className="border-2 border-[#FF3B30] bg-white p-3 shadow-md">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="border border-ink bg-[#FF3B30] px-2 py-0.5 text-[9px] font-black text-white uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0px_#121212] animate-pulse">
                    <Flame size={10} fill="currentColor" /> URGENT
                  </span>
                  <span className="border border-ink bg-brand px-2 py-0.5 text-[9px] font-black text-white uppercase">
                    UI/UX DESIGN
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-black text-[#FF3B30]">
                  <Flame size={11} fill="currentColor" /> PRIORITY
                </span>
              </div>
              <p className="mt-1.5 text-xs font-black text-ink">Redesign fintech flow</p>
              <p className="text-[10px] font-bold text-ink">₹18,000 · Indiranagar · 0.4km</p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-[11px] font-extrabold text-ink">
              <li className="flex items-center gap-1.5 text-ink">
                <Flame size={13} className="text-[#FF3B30] fill-[#FF3B30] shrink-0" />
                <span>Glowing <strong>URGENT</strong> flame badge on searches &amp; map</span>
              </li>
              <li className="flex items-center gap-1.5 text-ink">
                <Check size={13} className="text-ok shrink-0 stroke-[3]" />
                <span>Pinned to top of 5km searches &amp; radar feed</span>
              </li>
              <li className="flex items-center gap-1.5 text-ink">
                <Check size={13} className="text-ok shrink-0 stroke-[3]" />
                <span>Instant notifications sent to nearby verified pros</span>
              </li>
              <li className="flex items-center gap-1.5 text-ink">
                <Check size={13} className="text-ok shrink-0 stroke-[3]" />
                <span>Priority applicant inbox &amp; instant direct chat</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t-2 border-ink pt-4">
          <div>
            <p className="text-sm font-black text-ink">₹149 <span className="text-xs font-bold text-inkmuted">/ 24 hours</span></p>
            <p className="text-[10px] text-inkmuted font-semibold">Instant urgent boost activation with Razorpay</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="border-2 border-ink bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-sand"
            >
              CANCEL
            </button>
            <button
              onClick={() => { onClose(); if (onConfirmBoost) onConfirmBoost(); }}
              className="flex items-center gap-1.5 border-2 border-ink bg-[#FF3B30] hover:bg-[#E02B20] px-5 py-2.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <Flame size={15} fill="white" />
              <span>MAKE IT URGENT · ₹149</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
