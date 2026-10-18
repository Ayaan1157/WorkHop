// WorkHop Hyperlocal Push Notification Engine for Freelancers
// Handles browser permissions, Web Push Service Worker, preferences, and native OS notifications.
import { playNotificationSound } from "./notificationSound";

const PUSH_ENABLED_KEY = "workhop_push_enabled";
const PUSH_PREFS_KEY = "workhop_push_preferences";
const PUSH_SUBSCRIPTION_KEY = "workhop_push_subscription";

export const DEFAULT_PUSH_PREFERENCES = {
  featured_blasts: true, // 5km proximity urgent & featured gigs
  employer_messages: true, // direct employer messages
  hired_alerts: true, // application accepted / hired notifications
  escrow_updates: true, // milestone escrow release & payment alerts
  sound: true, // play audio chime with push
  email_alerts: true, // Outside notification: instant email alert when employer messages
  whatsapp_alerts: false, // Outside notification: WhatsApp ping when employer messages
  notification_email: "",
  notification_phone: "",
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
export function saveFreelancerPushPreferences(prefs, syncServer = true) {
  try {
    const updated = { ...getFreelancerPushPreferences(), ...prefs };
    localStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("workhop:push_prefs_changed", { detail: updated }));

    if (syncServer && typeof window !== "undefined") {
      const fId = localStorage.getItem("workhop_freelancer_id");
      if (fId) {
        syncNotificationPreferencesToServer(fId, updated).catch(() => {});
      }
    }
    return updated;
  } catch {
    return DEFAULT_PUSH_PREFERENCES;
  }
}

// Sync notification preferences to backend server for a freelancer
export async function syncNotificationPreferencesToServer(freelancerId, prefs) {
  if (!freelancerId) return;
  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
    await fetch(`${backendUrl}/api/freelancer/${freelancerId}/notifications/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
  } catch (err) {
    console.warn("Could not sync notification preferences to server:", err);
  }
}

// Fetch notification preferences from backend server
export async function fetchNotificationPreferencesFromServer(freelancerId) {
  if (!freelancerId) return null;
  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/freelancer/${freelancerId}/notifications/preferences`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok) {
        const local = getFreelancerPushPreferences();
        const merged = {
          ...local,
          email_alerts: data.email_alerts !== false,
          whatsapp_alerts: Boolean(data.whatsapp_alerts),
          notification_email: data.notification_email || local.notification_email || "",
          notification_phone: data.notification_phone || local.notification_phone || "",
        };
        saveFreelancerPushPreferences(merged, false);
        return merged;
      }
    }
  } catch (err) {
    console.warn("Could not fetch notification preferences from server:", err);
  }
  return null;
}

// Dispatch a test email alert so freelancer can verify delivery to their inbox
export async function sendTestEmailAlert(freelancerId, targetEmail) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${backendUrl}/api/freelancer/${freelancerId || "fl-preview"}/notifications/test-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: targetEmail }),
  });
  return await res.json();
}

// Play notification sound
export function playPushChime(options = {}) {
  return playNotificationSound({ type: "chime", ...options });
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
