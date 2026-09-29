import React, { useState, useEffect } from "react";
import { Bell, Zap, X, SlidersHorizontal, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  isPushSupported,
  getPushPermissionState,
  requestPushPermission,
} from "@/lib/pushNotifications";
import PushSettingsModal from "@/components/PushSettingsModal";

const DISMISSED_KEY = "workhop_push_banner_dismissed_until";

export default function PushNotificationPrompt({ className = "" }) {
  const [permission, setPermission] = useState("default");
  const [supported, setSupported] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    const state = getPushPermissionState();
    setPermission(state);

    // Check if user dismissed banner recently (suppress for 24 hours)
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    const isSuppressed = dismissedUntil && Number(dismissedUntil) > Date.now();
    setDismissed(Boolean(isSuppressed));

    const handleStatus = () => {
      setPermission(getPushPermissionState());
    };
    window.addEventListener("workhop:push_status_changed", handleStatus);
    return () => window.removeEventListener("workhop:push_status_changed", handleStatus);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    // Dismiss for 24h
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 86400000));
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await requestPushPermission();
      setPermission(getPushPermissionState());
      if (res.ok) {
        // Successfully granted
        setDismissed(true);
      } else if (res.permission === "denied") {
        setModalOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // If push is not supported, or already granted, or dismissed, do not render banner
  if (!supported || permission === "granted" || dismissed) {
    return (
      <>
        <PushSettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div
        className={`border-2 border-ink bg-[#FFF4EC] dark:bg-[#25150d] p-3.5 shadow-[3px_3px_0px_#121212] dark:shadow-[3px_3px_0px_#333] transition ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-[240px] flex-1">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-brand text-white shadow-[1px_1px_0px_#121212]">
              <Zap size={16} className="fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                  Get Instant Push Alerts for 5km Gigs &amp; Direct Messages
                </h4>
                <span className="border border-brand bg-brand px-1.5 py-0.2 text-[8px] font-black text-white uppercase rounded-[1px]">
                  RECOMMENDED
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-inkmuted dark:text-stone-300">
                Be the first to apply when employers post urgent or featured gigs near your location. Receive native desktop &amp; phone notifications the moment a client reaches out.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 border border-ink bg-white dark:bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-black text-ink dark:text-white hover:bg-sand transition"
              title="Notification Settings"
            >
              <SlidersHorizontal size={12} />
              <span>Options</span>
            </button>

            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:bg-brand/90 active:translate-y-0.5 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Bell size={13} className="fill-white" />
              )}
              <span>Turn On Push Alerts</span>
            </button>

            <button
              onClick={handleDismiss}
              className="flex h-7 w-7 items-center justify-center border border-ink bg-white dark:bg-[#1a1a1a] text-inkmuted hover:text-ink hover:bg-sand transition"
              title="Dismiss for now"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <PushSettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
