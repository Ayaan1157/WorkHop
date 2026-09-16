import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, X, ArrowRight } from "lucide-react";
import { getSiteSettings } from "@/lib/clientStore";

export default function BroadcastBanner() {
  const [settings, setSettings] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const s = getSiteSettings();
      setSettings(s);
    } catch {
      /* ignore */
    }
  }, []);

  if (!settings || !settings.broadcast_banner_active || dismissed) return null;

  const toneBg = {
    brand: "#FF5A00",
    black: "#121212",
    green: "#00A86B",
    alert: "#C62828",
  }[settings.broadcast_banner_tone || "brand"] || "#FF5A00";

  return (
    <div
      data-testid="broadcast-banner"
      className="relative z-50 flex items-center justify-between gap-3 px-4 py-2 text-xs font-black text-white shadow-sm transition-all"
      style={{ background: toneBg }}
    >
      <div className="mx-auto flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="flex items-center gap-1.5">
          <Megaphone size={14} className="animate-bounce" />
          <span>{settings.broadcast_banner_text}</span>
        </span>
        {settings.broadcast_banner_cta && (
          <Link
            to={settings.broadcast_banner_link || "/freelancer/jobs"}
            className="inline-flex items-center gap-1 border border-white bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-white hover:text-ink transition"
          >
            <span>{settings.broadcast_banner_cta}</span>
            <ArrowRight size={10} />
          </Link>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="text-white/80 hover:text-white focus:outline-none shrink-0"
        title="Dismiss announcement"
      >
        <X size={14} />
      </button>
    </div>
  );
}
