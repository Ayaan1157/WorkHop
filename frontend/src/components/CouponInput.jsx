import { useState } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import { API } from "@/lib/api";

// "Apply coupon" row for any payment window (web port of mobile CouponInput).
export default function CouponInput({ product, amount, onApplied, testIDPrefix = "coupon" }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(null);

  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${API}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), product, amount: amount ?? null }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.detail || "Invalid coupon.");
        return;
      }
      const c = {
        code: data.code,
        description: data.description,
        discount_amount: data.discount_amount,
        final_amount: data.final_amount,
      };
      setApplied(c);
      onApplied(c);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    setApplied(null);
    setCode("");
    setError(null);
    onApplied(null);
  };

  if (applied) {
    return (
      <div
        data-testid={`${testIDPrefix}-applied`}
        className="flex items-center gap-2 border-2 border-ok bg-[#E5F7E0] px-3 py-2"
      >
        <Tag size={15} className="text-ok shrink-0" />
        <p className="flex-1 text-xs text-ink">
          <span className="font-black">{applied.code}</span> applied
          {applied.discount_amount != null
            ? ` · you save ₹${applied.discount_amount} — pay ₹${applied.final_amount}`
            : ` · ${applied.description}`}
        </p>
        <button data-testid={`${testIDPrefix}-remove-btn`} onClick={remove} className="text-ink hover:text-brand">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-1.5 border-2 border-ink bg-sand px-3 h-[42px]">
          <Tag size={14} className="text-inkmuted" />
          <input
            data-testid={`${testIDPrefix}-input`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Have a coupon code?"
            className="wh-input flex-1 bg-transparent text-[13px] font-bold text-ink placeholder:text-inkmuted"
          />
        </div>
        <button
          data-testid={`${testIDPrefix}-apply-btn`}
          onClick={apply}
          disabled={busy || !code.trim()}
          className="flex h-[42px] items-center justify-center bg-ink px-4 text-[11px] font-black tracking-wider text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : "APPLY"}
        </button>
      </div>
      {error && (
        <p data-testid={`${testIDPrefix}-error`} className="mt-1 text-[11px] font-bold text-[#C62828]">
          {error}
        </p>
      )}
    </div>
  );
}
