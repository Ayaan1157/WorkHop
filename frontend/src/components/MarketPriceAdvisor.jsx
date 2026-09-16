import { useState, useMemo } from "react";
import { Sparkles, TrendingUp, CheckCircle, Info, ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";
import { getMarketPriceSuggestion, evaluateEmployerPay } from "@/lib/pricingIntelligence";

export default function MarketPriceAdvisor({
  category = "Graphics & Design",
  title = "",
  description = "",
  area = "Bengaluru",
  currentPay = "",
  onApplyRate = () => {},
  className = "",
}) {
  const [showDetails, setShowDetails] = useState(false);

  // Compute market suggestion reactively as user types title, description, or changes category
  const suggestion = useMemo(() => {
    return getMarketPriceSuggestion({ category, title, description, area });
  }, [category, title, description, area]);

  // Compute live assessment of currently entered amount
  const payAssessment = useMemo(() => {
    return evaluateEmployerPay(currentPay, suggestion);
  }, [currentPay, suggestion]);

  const currentPayNum = parseInt(currentPay, 10) || 0;

  return (
    <div
      data-testid="market-price-advisor-card"
      className={`border-2 border-ink bg-[#FFFDF9] dark:bg-[#191919] p-3.5 shadow-[2px_2px_0px_#121212] transition-all ${className}`}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-ink/20 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-brand text-white shadow-sm">
            <Sparkles size={12} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-white">
            Market Price Advisor · {suggestion.deliverableName}
          </span>
        </div>

        <span className="border border-ink bg-brand/10 dark:bg-brand/20 px-2 py-0.5 text-[9px] font-black text-brand uppercase rounded">
          {suggestion.confidence === "high" ? "🎯 Precise Match" : "⚡ City Benchmark"}
        </span>
      </div>

      {/* Main Pricing Advice Banner */}
      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-ink dark:text-white">
              ₹{suggestion.recommended.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] font-bold text-inkmuted dark:text-stone-400">
              (Market Avg)
            </span>
          </div>
          <p className="text-[11px] font-semibold text-inkmuted dark:text-stone-400 mt-0.5">
            Typical Range: <strong className="text-ink dark:text-stone-200">₹{suggestion.min.toLocaleString("en-IN")} – ₹{suggestion.max.toLocaleString("en-IN")}</strong>
          </p>
        </div>

        {/* Turnaround Pill */}
        <div className="flex items-center gap-1 text-[10px] font-bold text-inkmuted dark:text-stone-400 border border-ink/20 bg-sand/60 dark:bg-[#222] px-2 py-1 rounded">
          <Clock size={11} className="text-brand" />
          <span>Est. Delivery: {suggestion.turnaround}</span>
        </div>
      </div>

      {/* 3 Quick 1-Click Fill Tiers */}
      <div className="mt-3">
        <span className="text-[9px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 block mb-1.5">
          Quick-Fill Budget Options (1-Click Apply):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Tier 1: Entry / Fast */}
          <button
            type="button"
            data-testid="apply-rate-entry"
            onClick={() => onApplyRate(String(suggestion.tiers.entry.amount))}
            className={`flex flex-col items-start p-2 border-2 border-ink text-left transition hover:scale-[1.02] active:scale-[0.98] ${
              currentPayNum === suggestion.tiers.entry.amount
                ? "bg-[#FFE8D6] dark:bg-[#332211] shadow-[2px_2px_0px_#E65A1E]"
                : "bg-white dark:bg-[#222] hover:bg-sand/60"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black text-ink dark:text-white uppercase">
                ⚡ Entry / Fast
              </span>
              <span className="text-[11px] font-black text-ink dark:text-white">
                ₹{suggestion.tiers.entry.amount.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-[9px] text-inkmuted dark:text-stone-400 mt-0.5 leading-tight">
              Fast turnaround
            </span>
          </button>

          {/* Tier 2: Recommended */}
          <button
            type="button"
            data-testid="apply-rate-recommended"
            onClick={() => onApplyRate(String(suggestion.tiers.standard.amount))}
            className={`flex flex-col items-start p-2 border-2 border-ink text-left transition hover:scale-[1.02] active:scale-[0.98] ${
              currentPayNum === suggestion.tiers.standard.amount
                ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                : "bg-[#FFF4E8] dark:bg-[#2B1B12] hover:bg-brand/10 border-brand"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-[10px] font-black uppercase ${currentPayNum === suggestion.tiers.standard.amount ? "text-white" : "text-brand"}`}>
                ✨ Recommended
              </span>
              <span className={`text-[11px] font-black ${currentPayNum === suggestion.tiers.standard.amount ? "text-white" : "text-brand"}`}>
                ₹{suggestion.tiers.standard.amount.toLocaleString("en-IN")}
              </span>
            </div>
            <span className={`text-[9px] mt-0.5 leading-tight ${currentPayNum === suggestion.tiers.standard.amount ? "text-white/90" : "text-inkmuted dark:text-stone-300"}`}>
              Optimal pro response
            </span>
          </button>

          {/* Tier 3: Senior / Top Pro */}
          <button
            type="button"
            data-testid="apply-rate-senior"
            onClick={() => onApplyRate(String(suggestion.tiers.premium.amount))}
            className={`flex flex-col items-start p-2 border-2 border-ink text-left transition hover:scale-[1.02] active:scale-[0.98] ${
              currentPayNum === suggestion.tiers.premium.amount
                ? "bg-[#E9D5FF] dark:bg-[#3B1754] shadow-[2px_2px_0px_#7C3AED]"
                : "bg-white dark:bg-[#222] hover:bg-sand/60"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black text-ink dark:text-white uppercase">
                👑 Top Senior
              </span>
              <span className="text-[11px] font-black text-ink dark:text-white">
                ₹{suggestion.tiers.premium.amount.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-[9px] text-inkmuted dark:text-stone-400 mt-0.5 leading-tight">
              Top 5% rated experts
            </span>
          </button>
        </div>
      </div>

      {/* Live Budget Assessment Tag (If employer has typed a value) */}
      {payAssessment && (
        <div
          data-testid="pay-assessment-banner"
          className="mt-3 flex items-start gap-2 border border-ink/40 p-2.5 rounded text-xs animate-in fade-in"
          style={{ backgroundColor: payAssessment.bgColor }}
        >
          <div
            className="px-1.5 py-0.5 text-[9px] font-black rounded shrink-0 border border-ink/20"
            style={{ color: "#fff", backgroundColor: payAssessment.color }}
          >
            {payAssessment.badge}
          </div>
          <p className="text-[11px] font-semibold text-ink leading-tight">
            {payAssessment.message}
          </p>
        </div>
      )}

      {/* Expandable Benchmark Insights */}
      <div className="mt-2.5 pt-2 border-t border-dashed border-ink/20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-between text-[10px] font-black text-inkmuted dark:text-stone-400 hover:text-ink transition"
        >
          <span className="flex items-center gap-1">
            <Info size={11} />
            <span>Why this market rate?</span>
          </span>
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showDetails && (
          <div className="text-[10px] text-inkmuted dark:text-stone-300 leading-relaxed bg-sand/40 dark:bg-[#202020] p-2 border border-ink/10 rounded animate-in fade-in">
            <p className="font-bold text-ink dark:text-white mb-1">
              📊 {suggestion.rationale}
            </p>
            <p>
              WorkHop continuously tracks over 4,000+ completed local projects and verified freelancer rates in Koramangala, Indiranagar, HSR Layout, and Bengaluru hubs to help you budget competitively.
            </p>
          </div>
        )}

        {/* Non-binding Notice */}
        <p className="text-[9px] text-inkmuted dark:text-stone-400 italic">
          💡 This is a market rate suggestion. You are free to enter any custom budget you prefer.
        </p>
      </div>
    </div>
  );
}
