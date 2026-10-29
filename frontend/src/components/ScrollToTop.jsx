import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPixelPageView } from "@/lib/metaPixel";

/**
 * ScrollToTop
 * Automatically resets the window scroll position to the top
 * and tracks Meta Pixel pageviews on route changes.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Scroll window and document elements to top instantly
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
    // Track pageview on SPA route transition
    trackPixelPageView();
  }, [pathname, search]);

  return null;
}
