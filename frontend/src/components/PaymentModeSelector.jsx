import React from "react";
import { ShieldCheck, AlertTriangle, Check, Info } from "lucide-react";

/**
 * PaymentModeSelector
 * Allows freelancers to select between:
 * Mode A: Escrow (Protected Payment, Recommended) - 5% commission, full dispute arbitration & guaranteed payout
 * Mode B: Direct Payment (At Your Own Risk) - 0% fee, direct UPI/cash settlement, mandatory risk acknowledgement
 */
export default function PaymentModeSelector({
  quote = 0,
  selectedMode = "escrow",
  onChangeMode,
  acknowledged = false,
  onToggleAck,
  commissionRate = 0.05,
  disabled = false,
}) {
  const numericQuote = Math.max(0, Number(quote) || 0);
  const commissionAmount = Math.round(numericQuote * commissionRate);
  const netEarnings = Math.max(0, numericQuote - commissionAmount);

  return (
    <div className="flex flex-col gap-3 font-sans" data-testid="payment-mode-selector">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black tracking-wider uppercase text-ink dark:text-white flex items-center gap-1.5">
          Choose Payment Mode <span className="text-brand">*</span>
        </label>
        <span className="text-[10px] font-bold text-inkmuted dark:text-zinc-400">
          Selected: {selectedMode === "escrow" ? "Protected Escrow" : "Direct Settlement"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* MODE A: ESCROW PROTECTED (RECOMMENDED) */}
        <div
          onClick={() => !disabled && onChangeMode && onChangeMode("escrow")}
          data-testid="mode-escrow-card"
          className={`cursor-pointer relative flex flex-col justify-between p-3.5 border-2 transition-all rounded-md ${
            selectedMode === "escrow"
              ? "border-[#E65A1E] bg-[#FFF8F5] dark:bg-[#E65A1E]/10 shadow-[3px_3px_0px_#E65A1E]"
              : "border-ink/20 dark:border-white/20 bg-white dark:bg-zinc-900 hover:border-ink/50"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {/* Recommended badge */}
          <div className="absolute -top-2.5 right-3 bg-[#E65A1E] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm flex items-center gap-1">
            <ShieldCheck size={11} /> Recommended
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  selectedMode === "escrow"
                    ? "border-[#E65A1E] bg-[#E65A1E] text-white"
                    : "border-ink/30 dark:border-white/30"
                }`}
              >
                {selectedMode === "escrow" && <Check size={12} strokeWidth={3} />}
              </div>
              <h4 className="text-xs font-black uppercase tracking-wide text-ink dark:text-white">
                WorkHop Escrow
              </h4>
            </div>

            <p className="text-[11px] leading-relaxed text-ink/80 dark:text-zinc-300 font-medium">
              Funds held securely in platform escrow before work begins. 72h auto-release and guaranteed dispute arbitration.
            </p>
          </div>

          {/* Breakdown calculation */}
          <div className="mt-3 pt-2.5 border-t border-ink/10 dark:border-white/10 flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between text-inkmuted dark:text-zinc-400">
              <span>Agreed Quote:</span>
              <span className="font-bold text-ink dark:text-zinc-200">₹{numericQuote.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-inkmuted dark:text-zinc-400">
              <span>Platform Fee ({(commissionRate * 100).toFixed(0)}%):</span>
              <span className="font-bold text-[#E65A1E]">-₹{commissionAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-black text-ink dark:text-white pt-1 border-t border-dashed border-ink/10 dark:border-white/10">
              <span>Your Net Payout:</span>
              <span className="text-ok font-black text-xs">₹{netEarnings.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* MODE B: DIRECT SETTLEMENT (AT YOUR OWN RISK) */}
        <div
          onClick={() => !disabled && onChangeMode && onChangeMode("direct")}
          data-testid="mode-direct-card"
          className={`cursor-pointer relative flex flex-col justify-between p-3.5 border-2 transition-all rounded-md ${
            selectedMode === "direct"
              ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 shadow-[3px_3px_0px_#f59e0b]"
              : "border-ink/20 dark:border-white/20 bg-white dark:bg-zinc-900 hover:border-ink/50"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="absolute -top-2.5 right-3 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm flex items-center gap-1">
            <AlertTriangle size={11} /> 0% Fee · Self Settled
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  selectedMode === "direct"
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-ink/30 dark:border-white/30"
                }`}
              >
                {selectedMode === "direct" && <Check size={12} strokeWidth={3} />}
              </div>
              <h4 className="text-xs font-black uppercase tracking-wide text-ink dark:text-white">
                Direct Payment
              </h4>
            </div>

            <p className="text-[11px] leading-relaxed text-ink/80 dark:text-zinc-300 font-medium">
              You settle payments directly with the employer via UPI, Cash, or Bank. Zero platform commission fees.
            </p>
          </div>

          {/* Breakdown calculation */}
          <div className="mt-3 pt-2.5 border-t border-ink/10 dark:border-white/10 flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between text-inkmuted dark:text-zinc-400">
              <span>Agreed Quote:</span>
              <span className="font-bold text-ink dark:text-zinc-200">₹{numericQuote.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-inkmuted dark:text-zinc-400">
              <span>Platform Fee (0%):</span>
              <span className="font-bold text-ok">₹0</span>
            </div>
            <div className="flex justify-between font-black text-ink dark:text-white pt-1 border-t border-dashed border-ink/10 dark:border-white/10">
              <span>Direct Receipt:</span>
              <span className="text-ok font-black text-xs">₹{numericQuote.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DIRECT MODE MANDATORY ACKNOWLEDGEMENT CHECKBOX */}
      {selectedMode === "direct" && (
        <div
          data-testid="direct-mode-risk-warning"
          className="border-2 border-amber-500/80 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md flex flex-col gap-2.5 text-xs text-amber-950 dark:text-amber-200"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              <strong className="font-black uppercase tracking-wide block mb-0.5 text-amber-800 dark:text-amber-300">
                At Your Own Risk
              </strong>
              WorkHop acts only as an introduction channel. WorkHop does <strong>NOT</strong> escrow funds,
              cannot arbitrate payment disputes, and <strong>cannot recover lost funds</strong> if the client delays or fails to pay.
            </div>
          </div>

          <label
            data-testid="direct-mode-ack-label"
            className="flex items-start gap-2 pt-2 border-t border-amber-300/60 dark:border-amber-800/60 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              data-testid="direct-mode-ack-checkbox"
              checked={acknowledged}
              onChange={(e) => onToggleAck && onToggleAck(e.target.checked)}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-[11px] font-bold text-ink dark:text-zinc-200 leading-snug">
              I understand WorkHop does NOT protect this payment, cannot arbitrate disputes, and cannot recover lost funds. I accept full risk. <span className="text-danger">*</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
