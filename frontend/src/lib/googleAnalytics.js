/**
 * Google Analytics 4 helper for tracking pageviews and custom events.
 * Measurement ID: G-VQ6Y8PTM43
 */

export const GA_MEASUREMENT_ID = "G-VQ6Y8PTM43";

let initialPageViewFired = false;

/**
 * Tracks a pageview in Google Analytics 4 on Single Page Application (SPA) route changes.
 */
export function trackGAPageView(path) {
  if (typeof window === "undefined") return;

  const pagePath = path || (window.location.pathname + window.location.search);
  const pageTitle = typeof document !== "undefined" ? document.title : "";

  // The inline snippet in index.html sends the very first pageview on initial HTML load
  if (!initialPageViewFired) {
    initialPageViewFired = true;
    return;
  }

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_title: pageTitle,
        page_location: window.location.href,
        send_to: GA_MEASUREMENT_ID,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("GA4 pageview tracking error:", err);
    }
  }
}

/**
 * Sends a custom event to Google Analytics 4.
 */
export function trackGAEvent(eventName, params = {}) {
  if (typeof window === "undefined" || !eventName) return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        ...params,
        send_to: GA_MEASUREMENT_ID,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("GA4 event tracking error:", err);
    }
  }
}
