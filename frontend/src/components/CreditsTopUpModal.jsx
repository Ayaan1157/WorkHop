import { useState, useEffect } from "react";
import {
  Coins, Sparkles, Check, ArrowRight, Loader2, X,
  ShieldCheck, Zap, RefreshCw, Star, Info
} from "lucide-react";
import {
  getCreditsWallet,
  getCreditsConfig,
  purchaseCreditPack,
  subscribeToCredits,
} from "@/lib/clientStore";
import { getFreelancerId } from "@/lib/api";

export default function CreditsTopUpModal({ open, onClose, onUpdated, requiredCredits = null }) {
  const [tab, setTab] = useState("packs"); // "packs" | "subscriptions"
  const [selectedPackId, setSelectedPackId] = useState("pack-25");
  const [selectedPlanId, setSelectedPlanId] = useState("pro_pass");
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const freelancerId = getFreelancerId();
  const [wallet, setWallet] = useState(() => getCreditsWallet(freelancerId));
  const config = getCreditsConfig();

  useEffect(() => {
    if (open) {
      setWallet(getCreditsWallet(freelancerId));
      setSuccessMsg(null);
    }
  }, [open, freelancerId]);

  if (!open) return null;

  const handlePurchasePack = async (packId) => {
    setProcessing(true);
    setSuccessMsg(null);
    try {
      await new Promise((r) => setTimeout(r, 600)); // Smooth checkout feel
      const updated = purchaseCreditPack(freelancerId, packId);
      setWallet({ ...updated });
      const pack = config.credit_packs.find((p) => p.id === packId);
      setSuccessMsg(`✓ Successfully added ${pack?.credits || 25} Hops to your wallet!`);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      alert("Failed to purchase pack. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setProcessing(true);
    setSuccessMsg(null);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const updated = subscribeToCredits(freelancerId, planId);
      setWallet({ ...updated });
      const plan = config.subscription_plans.find((p) => p.id === planId);
      setSuccessMsg(`✓ Welcome to ${plan?.name || "Pro"}! +${plan?.credits_per_cycle} Hops added.`);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      alert("Failed to activate subscription. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl border-4 border-ink bg-white dark:bg-[#141414] p-5 sm:p-7 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#E65A1E] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="credits-topup-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          data-testid="credits-modal-close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border-2 border-ink bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-sand transition"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-[#FFF3C4] text-[#E65A1E] shadow-[2px_2px_0px_#121212]">
            <Coins size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wide text-ink dark:text-white">
              Connects & Bidding Hops
            </h3>
            <p className="text-xs text-inkmuted dark:text-stone-400">
              Apply to local gigs, unlock employer direct chats, and boost proposals
            </p>
          </div>
        </div>

        {/* Required Credits Warning (if opened from apply flow) */}
        {requiredCredits && wallet.balance < requiredCredits && (
          <div
            data-testid="insufficient-alert-banner"
            className="mt-4 border-2 border-ink bg-[#FFEBEE] dark:bg-[#321315] p-3 text-xs font-black text-[#C62828] dark:text-[#FF8A8A] flex items-center gap-2 shadow-[2px_2px_0px_#C62828]"
          >
            <Info size={16} className="shrink-0" />
            <span>
              This gig requires <strong>{requiredCredits} Hops</strong>. Your current balance is <strong>{wallet.balance} Hops</strong>. Top up below to apply immediately.
            </span>
          </div>
        )}

        {/* Current Balance Bar */}
        <div className="mt-4 flex items-center justify-between border-2 border-ink bg-sand dark:bg-[#202020] p-3 shadow-[2px_2px_0px_#121212]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
              Current Balance:
            </span>
            <span className="flex items-center gap-1 text-base font-black text-ink dark:text-white" data-testid="modal-current-balance">
              <Coins size={16} className="text-brand" /> {wallet.balance} Hops
            </span>
          </div>
          {wallet.subscription_status === "active" ? (
            <span className="border border-ink bg-ok px-2 py-0.5 text-[9px] font-black text-white uppercase">
              Pro Active (Rollover On)
            </span>
          ) : (
            <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
              Pay-as-you-go
            </span>
          )}
        </div>

        {/* Success Message Flash */}
        {successMsg && (
          <div
            data-testid="credits-success-flash"
            className="mt-3 flex items-center gap-2 border-2 border-ink bg-[#E5F7E0] dark:bg-[#16301A] p-3 text-xs font-black text-[#1E4620] dark:text-[#7AE582] shadow-[2px_2px_0px_#121212]"
          >
            <Check size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Switch Tabs: One-Time Packs vs Monthly Subscription */}
        <div className="mt-5 flex border-2 border-ink bg-sand dark:bg-[#1a1a1a] p-1">
          <button
            type="button"
            data-testid="tab-credit-packs"
            onClick={() => setTab("packs")}
            className={`flex-1 py-2 text-xs font-black tracking-wider uppercase transition ${
              tab === "packs"
                ? "bg-ink text-white shadow-[2px_2px_0px_#121212]"
                : "text-ink dark:text-stone-300 hover:bg-white dark:hover:bg-[#252525]"
            }`}
          >
            🪙 One-Time Packs
          </button>
          <button
            type="button"
            data-testid="tab-subscriptions"
            onClick={() => setTab("subscriptions")}
            className={`flex-1 py-2 text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-1 ${
              tab === "subscriptions"
                ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                : "text-ink dark:text-stone-300 hover:bg-white dark:hover:bg-[#252525]"
            }`}
          >
            <Sparkles size={14} /> Monthly Pass (Save 35%)
          </button>
        </div>

        {/* Tab 1: One-Time Credit Packs */}
        {tab === "packs" && (
          <div className="mt-4 flex flex-col gap-2.5">
            <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400 tracking-wider">
              Select a Hop Pack (Hops Never Expire)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {config.credit_packs.map((pack) => {
                const selected = selectedPackId === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    data-testid={`pack-btn-${pack.id}`}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`relative flex flex-col justify-between border-2 border-ink p-3 text-left transition hover:translate-x-0.5 hover:translate-y-0.5 ${
                      selected
                        ? "bg-[#FFF3E9] dark:bg-[#2a170d] shadow-[3px_3px_0px_#E65A1E]"
                        : "bg-white dark:bg-[#1c1c1c] shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333]"
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2.5 right-2 border border-ink bg-brand px-1.5 py-0.2 text-[8px] font-black text-white uppercase">
                        POPULAR
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-black text-ink dark:text-white flex items-center gap-1">
                        <Coins size={14} className="text-brand" /> {pack.credits} Hops
                      </p>
                      <p className="text-[10px] font-bold text-inkmuted dark:text-stone-400 mt-0.5">
                        {pack.discount_label}
                      </p>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between border-t border-ink/20 pt-2">
                      <span className="text-base font-black text-ink dark:text-white">
                        ₹{pack.price_inr}
                      </span>
                      <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                        ₹{(pack.price_inr / pack.credits).toFixed(1)}/hop
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={processing}
              data-testid="purchase-pack-submit"
              onClick={() => handlePurchasePack(selectedPackId)}
              className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-3 text-xs font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] transition hover:bg-black hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60"
            >
              {processing ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <>
                  <span>TOP UP NOW WITH RAZORPAY / UPI</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Monthly Subscriptions */}
        {tab === "subscriptions" && (
          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400 tracking-wider">
                Select Monthly Membership Pass
              </span>
              <span className="border border-ink bg-[#D8F3DC] px-1.5 py-0.5 text-[8px] font-black text-[#1B4332] uppercase">
                {config.rollover_unused_credits ? "✓ Rollover Enabled" : "Monthly Expiry"}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {config.subscription_plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    data-testid={`sub-plan-${plan.id}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`cursor-pointer border-2 border-ink p-3.5 transition hover:translate-x-0.5 hover:translate-y-0.5 ${
                      selected
                        ? "bg-[#FFF3E9] dark:bg-[#251710] shadow-[3px_3px_0px_#E65A1E]"
                        : "bg-white dark:bg-[#1c1c1c] shadow-[2px_2px_0px_#121212]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-ink dark:text-white">
                          {plan.name}
                        </span>
                        {plan.badge && (
                          <span className="border border-ink bg-brand px-1.5 py-0.2 text-[8px] font-black text-white uppercase">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-ink dark:text-white">₹{plan.price_inr}</span>
                        <span className="text-[9px] text-inkmuted dark:text-stone-400">/mo</span>
                      </div>
                    </div>

                    <p className="mt-1 text-[11px] font-bold text-brand">
                      {plan.credits_per_cycle} Hops/month ({plan.effective_per_credit} per Hop)
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-semibold text-ink dark:text-stone-300">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Check size={11} className="text-ok shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 rounded border border-ink/30 bg-sand dark:bg-[#1e1e1e] p-2 text-[10px] text-inkmuted dark:text-stone-400">
              <p>
                <strong>Renewal & Rollover Policy:</strong> Subscriptions renew automatically every 30 days. Unused subscription Hops roll over to the following month (up to 2x monthly allocation). Cancel anytime from settings with zero penalty.
              </p>
            </div>

            <button
              type="button"
              disabled={processing}
              data-testid="subscribe-submit"
              onClick={() => handleSubscribe(selectedPlanId)}
              className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] transition hover:bg-brand/95 hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60"
            >
              {processing ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>ACTIVATE MONTHLY PASS</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
