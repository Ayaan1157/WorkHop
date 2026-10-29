/**
 * Meta Pixel helper for tracking conversions and pageviews.
 * Pixel ID: 309500390459765
 */

export const META_PIXEL_ID = "309500390459765";

export function trackPixelEvent(eventName, params = {}) {
  try {
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
