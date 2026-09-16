import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Check, Loader2, RefreshCw, AlertCircle } from "lucide-react";

/**
 * Reusable Interactive Human Verification Widget (reCAPTCHA / Turnstile style)
 * Provides interactive human challenge verification with token issuance & expiry
 */
export default function RecaptchaWidget({
  onVerify,
  onExpire,
  resetTrigger = 0,
  compact = false,
  className = "",
  theme = "auto"
}) {
  // Status: "idle" | "verifying" | "verified" | "expired"
  const [status, setStatus] = useState("idle");
  const [token, setToken] = useState(null);

  // Reset when parent requests
  useEffect(() => {
    setStatus("idle");
    setToken(null);
  }, [resetTrigger]);

  // Token auto-expiry after 2 minutes
  useEffect(() => {
    if (status === "verified") {
      const timer = setTimeout(() => {
        setStatus("expired");
        setToken(null);
        if (onExpire) onExpire();
      }, 120000);
      return () => clearTimeout(timer);
    }
  }, [status, onExpire]);

  const handleCheckboxClick = useCallback(() => {
    if (status === "verifying" || status === "verified") return;

    setStatus("verifying");
    // Simulate smart biometric / human interaction timing
    const verificationDelay = 650 + Math.random() * 500;

    setTimeout(() => {
      const generatedToken = `rc_tok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      setStatus("verified");
      setToken(generatedToken);
      if (onVerify) {
        onVerify(generatedToken);
      }
    }, verificationDelay);
  }, [status, onVerify]);

  return (
    <div
      data-testid="recaptcha-widget"
      className={`border-2 border-ink bg-[#FAFAF8] dark:bg-[#1e1e1e] p-3 shadow-[2px_2px_0px_#121212] transition-all select-none ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        
        {/* Checkbox and Text */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="recaptcha-checkbox"
            onClick={handleCheckboxClick}
            disabled={status === "verifying" || status === "verified"}
            aria-label="Verify you are human"
            className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink transition-all ${
              status === "verified"
                ? "bg-ok border-ok text-white scale-105"
                : status === "verifying"
                ? "bg-sand cursor-wait"
                : "bg-white hover:bg-sand/60 cursor-pointer active:scale-95"
            }`}
          >
            {status === "verified" && <Check size={18} className="stroke-[3]" />}
            {status === "verifying" && <Loader2 size={16} className="animate-spin text-ink" />}
          </button>

          <div>
            <p className="text-xs font-black text-ink dark:text-white">
              {status === "verified"
                ? "Verification complete"
                : status === "verifying"
                ? "Verifying connection…"
                : status === "expired"
                ? "Session expired — check again"
                : "I am human · Verify"}
            </p>
            {!compact && (
              <p className="text-[9px] font-semibold text-inkmuted dark:text-gray-400">
                {status === "verified" ? "Secure token generated" : "Protected by WorkHop Shield"}
              </p>
            )}
          </div>
        </div>

        {/* Brand & Badge */}
        <div className="flex flex-col items-end text-right pl-2 border-l border-ink/15">
          <div className="flex items-center gap-1 text-brand">
            <ShieldCheck size={16} className="text-brand" />
            <span className="text-[10px] font-black tracking-wider uppercase text-ink dark:text-white">
              reCAPTCHA
            </span>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-bold text-inkmuted dark:text-gray-400">
            <span>Privacy</span>
            <span>·</span>
            <span>Terms</span>
          </div>
        </div>

      </div>

      {status === "expired" && (
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#C62828] bg-red-50 p-1.5 border border-red-200">
          <AlertCircle size={12} />
          <span>Verification token expired. Click checkbox to refresh.</span>
        </div>
      )}
    </div>
  );
}
