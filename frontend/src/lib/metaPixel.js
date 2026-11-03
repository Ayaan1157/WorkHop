/**
 * Meta Pixel helper for tracking conversions and pageviews.
 * Pixel ID: 2367533987392256
 */

export const META_PIXEL_ID = "2367533987392256";

let initialPageViewFired = false;

export function ensureMetaPixelInitialized() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    if (!window.fbq) {
      const f = window;
      const b = document;
      const e = "script";
      const v = "https://connect.facebook.net/en_US/fbevents.js";
      let n;
      let t;
      let s;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      if (s && s.parentNode) {
        s.parentNode.insertBefore(t, s);
      } else if (b.head) {
        b.head.appendChild(t);
      }
      window.fbq("init", META_PIXEL_ID);
    }
  } catch (err) {
    console.debug("[Meta Pixel] Init suppressed:", err);
  }
}

export function trackPixelEvent(eventName, params = {}) {
  try {
    ensureMetaPixelInitialized();
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", eventName, params);
    }
  } catch (err) {
    // Graceful fallback if ad-blocker is present
    console.debug("[Meta Pixel] Event track suppressed:", eventName, err);
  }
}

export function trackPixelPageView() {
  try {
    ensureMetaPixelInitialized();
    // Skip duplicate PageView on the very first mount since index.html <head> already fires fbq('track', 'PageView')
    if (!initialPageViewFired) {
      initialPageViewFired = true;
      return;
    }
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  } catch (err) {
    console.debug("[Meta Pixel] PageView track suppressed:", err);
  }
}

/**
 * Fires when a user completes registration (Freelancer or Employer)
 */
export function trackPixelRegistration(role = "freelancer", details = {}) {
  trackPixelEvent("CompleteRegistration", {
    content_name: role,
    status: "registered",
    ...details,
  });
}

/**
 * Fires when a payment succeeds (e.g. ₹150 verification / Hops pack / lead unlock)
 */
export function trackPixelPurchase(amount = 150, details = {}) {
  trackPixelEvent("Purchase", {
    value: Number(amount) || 150,
    currency: "INR",
    content_type: "product",
    ...details,
  });
}

/**
 * Fires when an employer posts a job or initiates contact
 */
export function trackPixelLead(leadType = "job_post", details = {}) {
  trackPixelEvent("Lead", {
    content_category: leadType,
    ...details,
  });
}
