// WorkHop Hyperlocal Push Notification Engine for Freelancers
// Handles browser permissions, Web Push Service Worker, preferences, and native OS notifications.

const PUSH_ENABLED_KEY = "workhop_push_enabled";
const PUSH_PREFS_KEY = "workhop_push_preferences";
const PUSH_SUBSCRIPTION_KEY = "workhop_push_subscription";

export const DEFAULT_PUSH_PREFERENCES = {
  featured_blasts: true, // 5km proximity urgent & featured gigs
  employer_messages: true, // direct employer messages
  hired_alerts: true, // application accepted / hired notifications
  escrow_updates: true, // milestone escrow release & payment alerts
  sound: true, // play audio chime with push
};

// Check if Notification API is supported
export function isPushSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

// Get current permission: "granted" | "denied" | "default" | "unsupported"
export function getPushPermissionState() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

// Check if push notifications are fully active
export function isPushEnabled() {
  if (!isPushSupported()) return false;
  const permission = Notification.permission;
  const userPref = localStorage.getItem(PUSH_ENABLED_KEY);
  return permission === "granted" && userPref !== "0";
}

// Get freelancer push notification preferences
export function getFreelancerPushPreferences() {
  try {
    const raw = localStorage.getItem(PUSH_PREFS_KEY);
    if (raw) return { ...DEFAULT_PUSH_PREFERENCES, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PUSH_PREFERENCES };
}

// Save freelancer push notification preferences
export function saveFreelancerPushPreferences(prefs) {
  try {
    const updated = { ...getFreelancerPushPreferences(), ...prefs };
    localStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("workhop:push_prefs_changed", { detail: updated }));
    return updated;
  } catch {
    return DEFAULT_PUSH_PREFERENCES;
  }
}

// Play notification sound
export function playPushChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Upbeat two-tone chime (F5 -> C6)
    osc.frequency.setValueAtTime(698.46, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.38);
  } catch {
    // Autoplay fallback
  }
}

// Register service worker for background web push
let swRegistrationPromise = null;
export function registerPushServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Attempt immediate update
        reg.update().catch(() => {});
        return reg;
      })
      .catch((err) => {
        console.warn("WorkHop Service Worker registration error:", err);
        return null;
      });
  }
  return swRegistrationPromise;
}

// Request notification permission and subscribe
export async function requestPushPermission() {
  if (!isPushSupported()) {
    return { ok: false, permission: "unsupported", message: "Push notifications are not supported in this browser." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(PUSH_ENABLED_KEY, "1");
      await registerPushServiceWorker();

      // Trigger event
      window.dispatchEvent(
        new CustomEvent("workhop:push_status_changed", {
          detail: { enabled: true, permission: "granted" },
        })
      );

      // Send initial welcome push notification so the freelancer knows it's active
      sendBrowserPushNotification({
        title: "⚡ WorkHop Push Alerts Active!",
        body: "You're all set! You'll now receive instant push alerts for 5km featured gigs and employer messages on this device.",
        url: "/freelancer/jobs",
        tag: "workhop-welcome",
        category: "system",
      });

      return { ok: true, permission: "granted" };
    } else {
      localStorage.setItem(PUSH_ENABLED_KEY, "0");
      window.dispatchEvent(
        new CustomEvent("workhop:push_status_changed", {
          detail: { enabled: false, permission },
        })
      );
      return {
        ok: false,
        permission,
        message: permission === "denied"
          ? "Notification permission was blocked in your browser settings. Please enable notifications for WorkHop in your browser address bar."
          : "Permission request was dismissed.",
      };
    }
  } catch (err) {
    console.error("Error requesting push permission:", err);
    return { ok: false, permission: "error", message: err.message };
  }
}

// Disable push notifications
export function disablePushNotifications() {
  localStorage.setItem(PUSH_ENABLED_KEY, "0");
  window.dispatchEvent(
    new CustomEvent("workhop:push_status_changed", {
      detail: { enabled: false, permission: getPushPermissionState() },
    })
  );
  return { ok: true, enabled: false };
}

// Core method to dispatch a push notification to the freelancer
export async function sendBrowserPushNotification({
  title,
  body,
  icon = "/favicon.svg",
  badge = "/favicon.svg",
  tag,
  url = "/freelancer/jobs",
  category = "featured_blasts",
  data = {},
  actions = null,
  requireInteraction = false,
}) {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }

  // Check category preferences
  const prefs = getFreelancerPushPreferences();
  if (category && category !== "system") {
    if (prefs[category] === false) {
      return false; // User disabled this specific notification category
    }
  }

  // Play subtle sound if enabled
  if (prefs.sound) {
    playPushChime();
  }

  const notificationOptions = {
    body,
    icon,
    badge,
    tag: tag || `workhop-alert-${Date.now()}`,
    data: {
      url,
      category,
      timestamp: Date.now(),
      ...data,
    },
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction,
    actions: actions || [
      { action: "open", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  try {
    // 1. First try ServiceWorker registration (works across background/desktop/mobile PWA)
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }
  } catch (swErr) {
    console.warn("ServiceWorker push showNotification fallback:", swErr);
  }

  // 2. Fallback to standard Window Notification constructor
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
      if (url && typeof window !== "undefined") {
        window.location.href = url;
      }
    };
    return true;
  } catch (err) {
    console.error("Window Notification fallback error:", err);
    return false;
  }
}

// Send an interactive test push notification so the freelancer can test their device
export async function sendTestPushNotification() {
  if (Notification.permission !== "granted") {
    const res = await requestPushPermission();
    if (!res.ok) return res;
  }

  const success = await sendBrowserPushNotification({
    title: "⚡ [TEST] New ₹22,000 Gig in Koramangala!",
    body: 'BrewBox Cafe posted "Full Stack Next.js Dev" (1.2km away). Push notifications are working perfectly on your device!',
    url: "/freelancer/jobs?featured=1",
    tag: "test-push-" + Date.now(),
    category: "system",
    requireInteraction: false,
  });

  return { ok: success, tested: true };
}
