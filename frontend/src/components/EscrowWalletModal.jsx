import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowUpRight, ArrowDownLeft, Lock, CheckCircle2, X, AlertCircle, Loader2 } from "lucide-react";
import { getStoredWallet } from "@/lib/clientStore";

export default function EscrowWalletModal({ isOpen, onClose }) {
  const [wallet, setWallet] = useState(getStoredWallet());
  const [actionType, setActionType] = useState(null); // 'withdraw' | 'deposit' | null
  const [amountInput, setAmountInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setWallet(getStoredWallet());
      setActionType(null);
      setSuccessMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = () => {
    const val = Number(amountInput);
    if (!val || val <= 0) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccessMsg(
        actionType === "withdraw"
          ? `₹${val.toLocaleString("en-IN")} payout requested. Transferring to linked UPI / bank within 24 hours.`
          : `₹${val.toLocaleString("en-IN")} deposited into Escrow Reserve.`
      );
      setAmountInput("");
      setActionType(null);
    }, 800);
  };

  return (
    <div
      data-testid="escrow-wallet-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl border-2 border-ink bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-brand text-white">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-base font-black text-ink">WORKHOP ESCROW WALLET</p>
              <p className="text-[11px] text-inkmuted">100% Secured by Razorpay &amp; Milestone Releases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white hover:bg-sand transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Balance Cards Grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border-2 border-ink bg-sand p-3.5">
            <span className="text-[10px] font-black uppercase text-inkmuted">Available Balance</span>
            <p className="mt-1 text-xl font-black text-ink">
              ₹{wallet.available_balance.toLocaleString("en-IN")}
            </p>
            <span className="mt-1 inline-block text-[9px] font-bold text-ok">Ready to withdraw</span>
          </div>

          <div className="border-2 border-ink bg-[#FFF9F3] p-3.5">
            <div className="flex items-center gap-1">
              <Lock size={11} className="text-brand" />
              <span className="text-[10px] font-black uppercase text-inkmuted">In Escrow</span>
            </div>
            <p className="mt-1 text-xl font-black text-brand">
              ₹{wallet.in_escrow.toLocaleString("en-IN")}
            </p>
            <span className="mt-1 inline-block text-[9px] font-bold text-inkmuted">Milestone protected</span>
          </div>

          <div className="border-2 border-ink bg-white p-3.5">
            <span className="text-[10px] font-black uppercase text-inkmuted">Total Earnings</span>
            <p className="mt-1 text-xl font-black text-ink">
              ₹{wallet.lifetime_earnings.toLocaleString("en-IN")}
            </p>
            <span className="mt-1 inline-block text-[9px] font-bold text-inkmuted">Zero platform commission</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => { setActionType("withdraw"); setSuccessMsg(""); }}
            className="flex flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-ink py-2.5 text-xs font-black text-white hover:bg-black transition active:translate-y-0.5"
          >
            <ArrowUpRight size={15} />
            <span>WITHDRAW FUNDS</span>
          </button>
          <button
            onClick={() => { setActionType("deposit"); setSuccessMsg(""); }}
            className="flex flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-brand py-2.5 text-xs font-black text-white hover:opacity-90 transition active:translate-y-0.5"
          >
            <ArrowDownLeft size={15} />
            <span>ADD ESCROW DEPOSIT</span>
          </button>
        </div>

        {/* Inline Action Confirmation Form */}
        {actionType && (
          <div className="mt-4 border-2 border-ink bg-sand p-4">
            <p className="text-xs font-black uppercase text-ink">
              {actionType === "withdraw" ? "Withdraw to Linked Account" : "Add Funds to Escrow Deposit"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Enter amount in ₹"
                className="wh-input h-10 flex-1 border-2 border-ink bg-white px-3 text-sm font-bold text-ink"
              />
              <button
                onClick={handleAction}
                disabled={processing || !amountInput}
                className="flex h-10 items-center justify-center border-2 border-ink bg-ink px-4 text-xs font-black text-white hover:bg-black disabled:opacity-50"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : "CONFIRM"}
              </button>
              <button
                onClick={() => setActionType(null)}
                className="flex h-10 items-center justify-center border-2 border-ink bg-white px-3 text-xs font-bold text-ink hover:bg-sand"
              >
                CANCEL
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-inkmuted">
              {actionType === "withdraw"
                ? "Payouts are transferred via IMPS / UPI within 24 hours with zero deduction."
                : "Deposits are held in Razorpay Escrow until you approve the gig delivery."}
            </p>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 flex items-center gap-2 border border-ok bg-[#E8F8F0] p-3">
            <CheckCircle2 size={16} className="text-ok shrink-0" />
            <p className="text-xs font-bold text-ink">{successMsg}</p>
          </div>
        )}

        {/* Transaction History Ledger */}
        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-wider text-ink mb-2">
            RECENT ESCROW &amp; PAYMENT ACTIVITY
          </p>
          <div className="divide-y divide-ink/10 border-2 border-ink bg-white">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-xs font-black text-ink">{tx.title}</p>
                  <p className="text-[10px] text-inkmuted">{tx.date}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-black ${
                      tx.type === "credit" ? "text-ok" : tx.type === "holding" ? "text-brand" : "text-ink"
                    }`}
                  >
                    {tx.type === "credit" ? "+" : tx.type === "debit" ? "-" : "🔒 "}₹
                    {tx.amount.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[9px] font-bold uppercase text-inkmuted">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
