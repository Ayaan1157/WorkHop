import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  Zap,
  MessageSquare,
  Briefcase,
  CreditCard,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  isPushSupported,
  getPushPermissionState,
  isPushEnabled,
  getFreelancerPushPreferences,
  saveFreelancerPushPreferences,
  requestPushPermission,
  disablePushNotifications,
  sendTestPushNotification,
} from "@/lib/pushNotifications";

export default function PushSettingsModal({ isOpen, onClose }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [prefs, setPrefs] = useState(() => getFreelancerPushPreferences());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    setPermission(getPushPermissionState());
    setPrefs(getFreelancerPushPreferences());

    const handleStatus = () => {
      setPermission(getPushPermissionState());
    };
    window.addEventListener("workhop:push_status_changed", handleStatus);
    return () => window.removeEventListener("workhop:push_status_changed", handleStatus);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePref = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveFreelancerPushPreferences(updated);
  };

  const handleEnablePush = async () => {
    setEnabling(true);
    setTestResult(null);
    try {
      const res = await requestPushPermission();
      setPermission(getPushPermissionState());
      if (res.ok) {
        setTestResult({ ok: true, message: "Push notifications successfully enabled on this device!" });
      } else {
        setTestResult({ ok: false, message: res.message || "Could not enable push notifications." });
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleDisablePush = () => {
    disablePushNotifications();
    setPermission(getPushPermissionState());
    setTestResult({ ok: true, message: "Push notifications paused for WorkHop on this browser." });
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestPushNotification();
      if (res.ok) {
        setTestResult({
          ok: true,
          message: "Test push notification dispatched! Check your desktop/phone notification shade.",
        });
      } else {
        setTestResult({
          ok: false,
          message: res.message || "Failed to trigger test push notification. Make sure permissions are allowed.",
        });
      }
    } catch (err) {
      setTestResult({ ok: false, message: err?.message || "Failed to send test push." });
    } finally {
      setTesting(false);
    }
  };

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg border-2 border-ink bg-white dark:bg-[#161616] text-ink dark:text-white shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#333]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-ink bg-sand dark:bg-[#202020] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-brand text-white shadow-[1px_1px_0px_#121212]">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">
                Push Notification Settings
              </h3>
              <p className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                Instant desktop &amp; phone alerts for 5km gigs and client messages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border border-ink bg-white dark:bg-[#2a2a2a] text-ink dark:text-white hover:bg-sand dark:hover:bg-stone-700 transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Permission Status Banner */}
          <div
            className={`border-2 border-ink p-4 shadow-[2px_2px_0px_#121212] ${
              !supported
                ? "bg-stone-100 dark:bg-stone-800 text-ink dark:text-white"
                : isGranted
                ? "bg-[#E5F7E0] dark:bg-[#132c18] text-[#0E6220] dark:text-[#6ee7b7]"
                : isDenied
                ? "bg-[#FDE8E8] dark:bg-[#341717] text-[#9B1C1C] dark:text-[#fca5a5]"
                : "bg-[#FFF4EC] dark:bg-[#2e1c12] text-ink dark:text-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {isGranted ? (
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                ) : isDenied ? (
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                ) : (
                  <Zap size={18} className="shrink-0 mt-0.5 text-brand" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-wider">
                      {!supported
                        ? "Browser Push Unsupported"
                        : isGranted
                        ? "Push Notifications: ACTIVE"
                        : isDenied
                        ? "Push Notifications: BLOCKED"
                        : "Push Notifications: DISABLED"}
                    </p>
                    <span
                      className={`border border-ink/30 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider ${
                        isGranted
                          ? "bg-[#0E6220] text-white"
                          : isDenied
                          ? "bg-[#9B1C1C] text-white"
                          : "bg-brand text-white"
                      }`}
                    >
                      {isGranted ? "READY" : isDenied ? "DENIED" : "PROMPT"}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium mt-1 leading-normal opacity-90">
                    {!supported
                      ? "Your current browser does not support HTML5 / Web Push notifications."
                      : isGranted
                      ? "Your browser is authorized. You will receive native notifications when employers post gigs or message you."
                      : isDenied
                      ? "Notifications are blocked by your browser. To unblock: click the lock/settings icon beside the URL in your browser address bar and switch Notifications to 'Allow'."
                      : "Turn on browser push alerts to get notified even when WorkHop is minimized or backgrounded."}
                  </p>
                </div>
              </div>

              {supported && (
                <div className="shrink-0">
                  {isGranted ? (
                    <button
                      onClick={handleDisablePush}
                      className="border border-ink bg-white dark:bg-[#222] px-2.5 py-1 text-[10px] font-bold text-ink dark:text-white hover:bg-sand transition"
                    >
                      Pause Alerts
                    </button>
                  ) : isDenied ? null : (
                    <button
                      onClick={handleEnablePush}
                      disabled={enabling}
                      className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3 py-1.5 text-xs font-black uppercase text-white shadow-[1.5px_1.5px_0px_#121212] transition hover:bg-brand/90 disabled:opacity-50"
                    >
                      {enabling && <Loader2 size={12} className="animate-spin" />}
                      <span>Allow Alerts</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Test Push Result Alert */}
          {testResult && (
            <div
              className={`border border-ink p-3 text-xs font-bold ${
                testResult.ok
                  ? "bg-[#E5F7E0] dark:bg-[#132c18] text-[#0E6220] dark:text-[#6ee7b7]"
                  : "bg-[#FDE8E8] dark:bg-[#341717] text-[#9B1C1C] dark:text-[#fca5a5]"
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Notification Category Preferences */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
              Notification Preferences
            </p>

            {/* Preference 1: 5km Radius Featured Gigs */}
            <div
              onClick={() => handleTogglePref("featured_blasts")}
              className="flex items-center justify-between border-2 border-ink bg-sand/20 dark:bg-[#1c1c1c] p-3 cursor-pointer transition hover:bg-sand/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-ink bg-white dark:bg-[#252525]">
                  <Zap size={14} className="text-brand fill-brand" />
                </div>
                <div>
                  <p className="text-xs font-black text-ink dark:text-white">
                    5km Featured &amp; Urgent Gig Blasts
                  </p>
                  <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium">
                    Instant alerts when an employer posts an urgent or boosted gig within 5km of your area.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.featured_blasts}
                onChange={() => {}}
                className="h-4 w-4 accent-brand cursor-pointer shrink-0 ml-3"
              />
            </div>

            {/* Preference 2: Direct Employer Messages */}
            <div
              onClick={() => handleTogglePref("employer_messages")}
              className="flex items-center justify-between border-2 border-ink bg-sand/20 dark:bg-[#1c1c1c] p-3 cursor-pointer transition hover:bg-sand/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-ink bg-white dark:bg-[#252525]">
                  <MessageSquare size={14} className="text-brand" />
                </div>
                <div>
                  <p className="text-xs font-black text-ink dark:text-white">
                    Employer Direct Messages
                  </p>
                  <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium">
                    Push notification when an employer messages you regarding a gig inquiry or active contract.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.employer_messages}
                onChange={() => {}}
                className="h-4 w-4 accent-brand cursor-pointer shrink-0 ml-3"
              />
            </div>

            {/* Preference 3: Hired & Application Status */}
            <div
              onClick={() => handleTogglePref("hired_alerts")}
              className="flex items-center justify-between border-2 border-ink bg-sand/20 dark:bg-[#1c1c1c] p-3 cursor-pointer transition hover:bg-sand/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-ink bg-white dark:bg-[#252525]">
                  <Briefcase size={14} className="text-ok" />
                </div>
                <div>
                  <p className="text-xs font-black text-ink dark:text-white">
                    Hired &amp; Proposal Acceptance Alerts
                  </p>
                  <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium">
                    Immediate notification when a hiring client accepts your proposal and funds milestone escrow.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.hired_alerts}
                onChange={() => {}}
                className="h-4 w-4 accent-brand cursor-pointer shrink-0 ml-3"
              />
            </div>

            {/* Preference 4: Escrow & Payout Releases */}
            <div
              onClick={() => handleTogglePref("escrow_updates")}
              className="flex items-center justify-between border-2 border-ink bg-sand/20 dark:bg-[#1c1c1c] p-3 cursor-pointer transition hover:bg-sand/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-ink bg-white dark:bg-[#252525]">
                  <CreditCard size={14} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs font-black text-ink dark:text-white">
                    Escrow Milestones &amp; Payout Releases
                  </p>
                  <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium">
                    Alerts when job payments are released to your wallet or processed via UPI.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.escrow_updates}
                onChange={() => {}}
                className="h-4 w-4 accent-brand cursor-pointer shrink-0 ml-3"
              />
            </div>

            {/* Preference 5: Audio Chime & Vibration */}
            <div
              onClick={() => handleTogglePref("sound")}
              className="flex items-center justify-between border-2 border-ink bg-sand/20 dark:bg-[#1c1c1c] p-3 cursor-pointer transition hover:bg-sand/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-ink bg-white dark:bg-[#252525]">
                  {prefs.sound ? (
                    <Volume2 size={14} className="text-brand" />
                  ) : (
                    <VolumeX size={14} className="text-inkmuted" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-ink dark:text-white">
                    Alert Sound &amp; Phone Haptic Vibration
                  </p>
                  <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium">
                    Play audio chime on desktop and vibrate phone when high-priority notifications arrive.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.sound}
                onChange={() => {}}
                className="h-4 w-4 accent-brand cursor-pointer shrink-0 ml-3"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-sand dark:bg-[#202020] px-5 py-3.5">
          <button
            onClick={handleTestNotification}
            disabled={testing}
            className="flex items-center gap-1.5 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3.5 py-2 text-xs font-black uppercase tracking-wider text-ink dark:text-white shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333] transition hover:bg-sand active:translate-y-0.5 disabled:opacity-50"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className="text-brand" />}
            <span>Send Test Push Notification</span>
          </button>

          <button
            onClick={onClose}
            className="border-2 border-ink bg-ink px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:bg-brand"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
