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
  Mail,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
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
  fetchNotificationPreferencesFromServer,
  sendTestEmailAlert,
} from "@/lib/pushNotifications";

export default function PushSettingsModal({ isOpen, onClose }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [prefs, setPrefs] = useState(() => getFreelancerPushPreferences());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [enabling, setEnabling] = useState(false);

  // Outside notifications (Email & WhatsApp)
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [savedContactNotice, setSavedContactNotice] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setSupported(isPushSupported());
    setPermission(getPushPermissionState());
    const current = getFreelancerPushPreferences();
    setPrefs(current);
    if (current.notification_email) setNotificationEmail(current.notification_email);
    if (current.notification_phone) setNotificationPhone(current.notification_phone);

    // Try fetching synced preferences from backend if freelancer ID is available
    if (typeof window !== "undefined") {
      const freelancerId = localStorage.getItem("workhop_freelancer_id");
      if (freelancerId) {
        fetchNotificationPreferencesFromServer(freelancerId).then((serverPrefs) => {
          if (serverPrefs) {
            setPrefs(serverPrefs);
            if (serverPrefs.notification_email) setNotificationEmail(serverPrefs.notification_email);
            if (serverPrefs.notification_phone) setNotificationPhone(serverPrefs.notification_phone);
          }
        });
      }
    }

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

  const handleSaveContactChannels = () => {
    const updated = {
      ...prefs,
      notification_email: notificationEmail.trim(),
      notification_phone: notificationPhone.trim(),
    };
    setPrefs(updated);
    saveFreelancerPushPreferences(updated);
    setSavedContactNotice(true);
    setTimeout(() => setSavedContactNotice(false), 3000);
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

  const handleSendTestEmail = async () => {
    const emailToSend = notificationEmail.trim() || prefs.notification_email;
    if (!emailToSend) {
      setEmailTestResult({
        ok: false,
        message: "Please enter your email address above before sending a test notification.",
      });
      return;
    }
    setEmailTesting(true);
    setEmailTestResult(null);
    try {
      const freelancerId = localStorage.getItem("workhop_freelancer_id") || "fl-test";
      const res = await sendTestEmailAlert(freelancerId, emailToSend);
      if (res && res.ok) {
        setEmailTestResult({
          ok: true,
          message: res.message || `Test alert email dispatched to ${emailToSend}! Check your inbox and spam folder.`,
        });
      } else {
        setEmailTestResult({
          ok: false,
          message: res?.detail || res?.message || "Could not dispatch test email. Please check the address.",
        });
      }
    } catch (err) {
      setEmailTestResult({ ok: false, message: err?.message || "Failed to trigger test alert email." });
    } finally {
      setEmailTesting(false);
    }
  };

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl border-2 border-ink bg-white dark:bg-[#161616] text-ink dark:text-white shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#333]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-ink bg-sand dark:bg-[#202020] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-brand text-white shadow-[1px_1px_0px_#121212]">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">
                Notification &amp; Alert Settings
              </h3>
              <p className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                Outside alerts (Email &amp; WhatsApp) + In-browser instant push notifications
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
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* ======================================================== */}
          {/* SECTION 1: OUTSIDE WEBSITE NOTIFICATIONS (EMAIL & WHATSAPP) */}
          {/* ======================================================== */}
          <div className="border-2 border-brand bg-[#FFF7F2] dark:bg-[#23150e] p-4 shadow-[3px_3px_0px_#FF5A00]">
            <div className="flex items-center justify-between gap-2 border-b border-brand/30 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand fill-brand" />
                <h4 className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                  Outside Website Alerts (When Away or Offline)
                </h4>
              </div>
              <span className="bg-brand text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border border-ink shadow-[1px_1px_0px_#121212]">
                STAY CONNECTED
              </span>
            </div>

            <p className="text-[11px] text-inkmuted dark:text-stone-300 font-medium mb-4 leading-relaxed">
              People are busy — you don't need to stay glued to the website. Turn on outside alerts so you get notified instantly when an employer messages you for a gig inquiry or active job.
            </p>

            <div className="space-y-4">
              {/* Channel 1: Email Alerts (Recommended) */}
              <div className="border-2 border-ink bg-white dark:bg-[#1a1a1a] p-3.5 shadow-[2px_2px_0px_#121212]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-ink bg-brand text-white shadow-[1px_1px_0px_#121212]">
                      <Mail size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-ink dark:text-white">
                          Email Message Alerts
                        </p>
                        <span className="bg-[#E5F7E0] dark:bg-[#14321a] text-[#0E6220] dark:text-[#6ee7b7] text-[8px] font-black uppercase px-1.5 py-0.5 border border-[#0E6220]/40">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium mt-1">
                        Receive an instant email with the employer's name, gig title, message snippet, and a 1-click button to reply directly from your phone.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2 mt-1">
                    <input
                      type="checkbox"
                      checked={prefs.email_alerts !== false}
                      onChange={() => handleTogglePref("email_alerts")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand border border-ink"></div>
                  </label>
                </div>

                {/* Email address field & test dispatch */}
                {prefs.email_alerts !== false && (
                  <div className="mt-3.5 pt-3 border-t border-ink/20 space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                      Destination Email Address:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="flex-1 border-2 border-ink bg-sand/30 dark:bg-[#252525] px-3 py-1.5 text-xs font-bold text-ink dark:text-white outline-none focus:bg-white"
                      />
                      <button
                        onClick={handleSaveContactChannels}
                        className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-black uppercase text-white shadow-[1.5px_1.5px_0px_#121212] hover:bg-brand transition shrink-0"
                      >
                        Save
                      </button>
                    </div>

                    {savedContactNotice && (
                      <p className="text-[10px] font-bold text-ok flex items-center gap-1">
                        <Check size={12} /> Contact channels saved successfully!
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] text-inkmuted dark:text-stone-400">
                        ⚡ Alerts are dispatched from <code className="font-bold text-brand">connect@work-hop.com</code>
                      </p>
                      <button
                        onClick={handleSendTestEmail}
                        disabled={emailTesting}
                        className="flex items-center gap-1 text-[10px] font-black uppercase text-brand hover:underline disabled:opacity-50"
                      >
                        {emailTesting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        <span>Send Test Email</span>
                      </button>
                    </div>

                    {emailTestResult && (
                      <div
                        className={`p-2 text-[11px] font-bold border border-ink ${
                          emailTestResult.ok
                            ? "bg-[#E5F7E0] dark:bg-[#132c18] text-[#0E6220] dark:text-[#6ee7b7]"
                            : "bg-[#FDE8E8] dark:bg-[#341717] text-[#9B1C1C] dark:text-[#fca5a5]"
                        }`}
                      >
                        {emailTestResult.message}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Channel 2: WhatsApp Alerts (Opt-in) */}
              <div className="border-2 border-ink bg-white dark:bg-[#1a1a1a] p-3.5 shadow-[2px_2px_0px_#121212]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-ink bg-[#25D366] text-white shadow-[1px_1px_0px_#121212]">
                      <MessageCircle size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-ink dark:text-white">
                          WhatsApp Message Alerts
                        </p>
                        <span className="bg-stone-100 dark:bg-stone-800 text-ink dark:text-stone-300 text-[8px] font-black uppercase px-1.5 py-0.5 border border-ink/30">
                          OPT-IN
                        </span>
                      </div>
                      <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium mt-1">
                        Get a WhatsApp ping on your mobile device when an employer messages you regarding a gig inquiry.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2 mt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(prefs.whatsapp_alerts)}
                      onChange={() => handleTogglePref("whatsapp_alerts")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366] border border-ink"></div>
                  </label>
                </div>

                {Boolean(prefs.whatsapp_alerts) && (
                  <div className="mt-3.5 pt-3 border-t border-ink/20 space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                      WhatsApp Mobile Number:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={notificationPhone}
                        onChange={(e) => setNotificationPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 border-2 border-ink bg-sand/30 dark:bg-[#252525] px-3 py-1.5 text-xs font-bold text-ink dark:text-white outline-none focus:bg-white"
                      />
                      <button
                        onClick={handleSaveContactChannels}
                        className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-black uppercase text-white shadow-[1.5px_1.5px_0px_#121212] hover:bg-brand transition shrink-0"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-[10px] text-inkmuted dark:text-stone-400">
                      Used strictly for employer gig alerts and payment notices. Never shared with third parties.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: BROWSER & DESKTOP / PHONE PUSH ALERTS */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
              In-Browser &amp; Device Push Notifications
            </p>

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
                          ? "Device Push: ACTIVE"
                          : isDenied
                          ? "Device Push: BLOCKED"
                          : "Device Push: DISABLED"}
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
                        ? "Notifications are blocked by your browser. Click the lock icon in your browser address bar and switch Notifications to 'Allow'."
                        : "Turn on browser push alerts to get notified even when WorkHop is minimized in background tabs."}
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

            {/* In-browser Notification Category Checkboxes */}
            <div className="space-y-2.5">
              {/* Category 1: 5km Radius Featured Gigs */}
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
                      Instant browser alert when an employer posts an urgent gig within 5km of your area.
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

              {/* Category 2: Direct Employer Messages */}
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
                      In-App Direct Chat Messages
                    </p>
                    <p className="text-[11px] text-inkmuted dark:text-stone-400 font-medium">
                      Browser notification when an employer replies to your proposal or contract inquiry.
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

              {/* Category 3: Hired & Application Status */}
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
                      Immediate notification when a hiring client accepts your proposal and hires you.
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

              {/* Category 4: Escrow & Payout Releases */}
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

              {/* Category 5: Audio Chime & Vibration */}
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
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-sand dark:bg-[#202020] px-5 py-3.5">
          <button
            onClick={handleTestNotification}
            disabled={testing}
            className="flex items-center gap-1.5 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3.5 py-2 text-xs font-black uppercase tracking-wider text-ink dark:text-white shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333] transition hover:bg-sand active:translate-y-0.5 disabled:opacity-50"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className="text-brand" />}
            <span>Test Browser Push</span>
          </button>

          <button
            onClick={onClose}
            className="border-2 border-ink bg-ink px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:bg-brand"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
