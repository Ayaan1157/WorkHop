import React from "react";
import { Rocket, Zap, ShieldCheck, Sparkles, Check, X } from "lucide-react";

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
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-brand text-white">
              <Rocket size={20} />
            </div>
            <div>
              <p className="text-base font-black text-ink">LOCAL LISTING BOOST PREVIEW</p>
              <p className="text-[11px] text-inkmuted">See how your gig stands out to 50+ nearby verified pros</p>
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
              <span className="text-[9px] font-bold text-inkmuted uppercase">UI/UX Design</span>
              <p className="mt-1 text-xs font-black text-ink">Redesign fintech flow</p>
              <p className="text-[10px] text-inkmuted">₹18,000 · Indiranagar · 0.4km</p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-[11px] text-inkmuted">
              <li>• Standard search position</li>
              <li>• 3 daily apply cap</li>
              <li>• Default card styling</li>
            </ul>
          </div>

          {/* Boosted Listing Preview */}
          <div className="flex flex-col border-2 border-ink bg-[#FFF9F3] p-4 shadow-[3px_3px_0px_#E65A1E]">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 bg-brand px-2 py-0.5 text-[10px] font-black text-white">
                <Sparkles size={11} /> BOOSTED LISTING
              </span>
              <span className="text-[10px] font-black text-brand">2.4x Discovery</span>
            </div>
            <div className="border-2 border-brand bg-white p-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="bg-brand px-1.5 py-0.5 text-[9px] font-black text-white uppercase">
                  FEATURED 5KM
                </span>
                <span className="flex items-center gap-1 text-[9px] font-black text-brand">
                  <Zap size={11} /> PRIORITY
                </span>
              </div>
              <p className="mt-1 text-xs font-black text-ink">Redesign fintech flow</p>
              <p className="text-[10px] font-bold text-ink">₹18,000 · Indiranagar · 0.4km</p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-[11px] font-extrabold text-ink">
              <li className="flex items-center gap-1 text-ok"><Check size={13} /> Pinned to top of 5km searches</li>
              <li className="flex items-center gap-1 text-ok"><Check size={13} /> +5 Extra instant applies (max 8)</li>
              <li className="flex items-center gap-1 text-ok"><Check size={13} /> Direct instant chat badge</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t-2 border-ink pt-4">
          <div>
            <p className="text-sm font-black text-ink">₹149 <span className="text-xs font-bold text-inkmuted">/ 24 hours</span></p>
            <p className="text-[10px] text-inkmuted">Instant activation with Razorpay</p>
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
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-5 py-2.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <Rocket size={15} />
              <span>ACTIVATE BOOST ₹149</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
