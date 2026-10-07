import { useEffect } from "react";

/**
 * usePageMeta hook
 * Dynamically updates document title, description, canonical link,
 * OpenGraph tags, and optional Schema.org JSON-LD structured data.
 */
export function usePageMeta({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  jsonLd,
} = {}) {
  const jsonLdStr = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    // 1. Document title
    if (title) {
      document.title = title.includes("WorkHop") ? title : `${title} | WorkHop`;
    }

    // 2. Helper to set or create meta tag
    const setMetaTag = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (description) {
      setMetaTag("name", "description", description);
    }
    if (ogTitle || title) {
      setMetaTag("property", "og:title", ogTitle || title);
    }
    if (ogDescription || description) {
      setMetaTag("property", "og:description", ogDescription || description);
    }
    if (ogImage) {
      setMetaTag("property", "og:image", ogImage);
    }
    if (ogType) {
      setMetaTag("property", "og:type", ogType);
    }

    // 3. Canonical link
    if (canonical) {
      let linkEl = document.querySelector('link[rel="canonical"]');
      if (!linkEl) {
        linkEl = document.createElement("link");
        linkEl.setAttribute("rel", "canonical");
        document.head.appendChild(linkEl);
      }
      linkEl.setAttribute("href", canonical);
      setMetaTag("property", "og:url", canonical);
    }

    // 4. Schema.org JSON-LD structured data
    let scriptEl = null;
    if (jsonLdStr) {
      const scriptId = "workhop-dynamic-jsonld";
      scriptEl = document.getElementById(scriptId);
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = jsonLdStr;
    }

    return () => {
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
  }, [title, description, canonical, ogTitle, ogDescription, ogImage, ogType, jsonLdStr]);
}

export default usePageMeta;
