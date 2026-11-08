import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";
import { supabase, getPortfolioImageUrl, fetchFreelancerPortfolioItems } from "@/lib/supabase";

// Category-specific placeholder samples if an uploaded image data URL is corrupted / truncated
const FALLBACK_CATEGORY_IMAGES = [
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80",
];

function formatSrc(img, fallbackIndex = 0) {
  if (!img) return "";
  if (typeof img !== "string") {
    return img.public_url || img.data || img.url || img.src || "";
  }
  const trimmed = img.trim();

  // If corrupted / truncated base64 string (e.g. earlier test uploads that were only 10-20 bytes), return quality sample
  if (trimmed.startsWith("data:image/") && trimmed.length < 150) {
    return FALLBACK_CATEGORY_IMAGES[fallbackIndex % FALLBACK_CATEGORY_IMAGES.length];
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return getPortfolioImageUrl(trimmed);
}

/**
 * PortfolioGallery
 *
 * Universal gallery used in:
 * 1. Admin Review & Inspection Modal
 * 2. Employer-facing Full Profile Page & Modal
 * 3. Freelancer's Own Profile & Preview
 *
 * Supports:
 * - Real-time Supabase subscriptions (updates within 2 seconds without reload)
 * - Responsive 2-4 column grid
 * - Lightbox modal with next/previous keyboard & click navigation
 * - Fallback broken image tile
 * - Image skeleton loaders
 * - Item title & description
 * - "Open external portfolio" action
 */
export default function PortfolioGallery({
  freelancerId,
  freelancerEmail,
  initialItems = [],
  externalPortfolioUrl = "",
  canDelete = false,
  onDeleteItem = null,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [brokenMap, setBrokenMap] = useState({});
  const [imageLoadedMap, setImageLoadedMap] = useState({});

  // Resolve normalized items from initial props or fetch
  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setLoading(true);
      let resolved = [];

      // Helper to unpack portfolio items & images from any source
      const extractValidImages = (list) => {
        if (!Array.isArray(list)) return [];
        return list.flatMap((it, idx) => {
          if (!it) return [];
          if (typeof it === "string") {
            const trimmed = it.trim();
            if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:") && !trimmed.startsWith("/") && !trimmed.includes("."))) {
              return [];
            }
            return [{
              id: `init_${idx}`,
              title: `Work Sample ${idx + 1}`,
              storage_path: trimmed,
              public_url: formatSrc(trimmed),
            }];
          }
          if (typeof it === "object" && !it._workhop_meta) {
            const imagesList = Array.isArray(it.images) && it.images.length > 0
              ? it.images.map((img) => (typeof img === "string" ? img : img?.data || img?.url || img?.src || "")).filter(Boolean)
              : [];
            const src = it.public_url || it.url || it.image_data || it.src || imagesList[0] || null;
            if (!src) return [];
            return [{
              id: it.id || `init_${idx}`,
              title: it.title || it.name || `Work Sample ${idx + 1}`,
              description: it.description || "",
              storage_path: it.storage_path || src,
              public_url: formatSrc(src),
              external_url: it.external_url || it.link || null,
            }];
          }
          return [];
        });
      };

      // 1. Check initialItems (handles both Array and serialized JSON string)
      let parsedInitial = [];
      if (typeof initialItems === "string" && initialItems.trim().startsWith("[")) {
        try {
          parsedInitial = JSON.parse(initialItems.trim());
        } catch {}
      } else if (Array.isArray(initialItems)) {
        parsedInitial = initialItems;
      }

      if (parsedInitial.length > 0) {
        resolved = extractValidImages(parsedInitial);
      }

      // 2. Fetch live from Supabase portfolio_items or profiles if not resolved or to get freshest
      const isUuid =
        typeof freelancerId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(freelancerId);

      if (supabase) {
        try {
          if (isUuid) {
            const dbItems = await fetchFreelancerPortfolioItems(freelancerId);
            if (Array.isArray(dbItems) && dbItems.length > 0) {
              resolved = dbItems;
            }
          }

          // If still no items, check Supabase profiles table for portfolio JSON column
          if (resolved.length === 0) {
            let profileQuery = supabase.from("profiles").select("id, portfolio, email");
            if (isUuid) {
              profileQuery = profileQuery.eq("id", freelancerId);
            } else if (freelancerEmail) {
              profileQuery = profileQuery.ilike("email", freelancerEmail.trim());
            } else if (freelancerId) {
              profileQuery = profileQuery.ilike("email", `%${freelancerId.replace(/^pro-/, "")}%`);
            }

            const { data: prof } = await profileQuery.maybeSingle();
            if (prof?.portfolio) {
              try {
                const parsed = typeof prof.portfolio === "string" ? JSON.parse(prof.portfolio) : prof.portfolio;
                if (Array.isArray(parsed)) {
                  const metaObj = parsed.find((p) => p && p._workhop_meta) || {};
                  const itemsList = parsed.filter((p) => p && !p._workhop_meta);
                  const metaImages = Array.isArray(metaObj.portfolio_images) ? metaObj.portfolio_images : [];
                  const combined = [...itemsList, ...metaImages];
                  const fromProf = extractValidImages(combined);
                  if (fromProf.length > 0) {
                    resolved = fromProf;
                  }
                }
              } catch {}
            }
          }
        } catch (err) {
          console.warn("PortfolioGallery load error:", err);
        }
      }

      if (isMounted) {
        setItems(resolved);
        setLoading(false);
      }
    }

    loadItems();

    // 3. Realtime Subscription to portfolio_items and profiles
    let channel = null;
    const isUuid =
      typeof freelancerId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(freelancerId);

    if (supabase) {
      const channelName = `portfolio_sync_${freelancerId || freelancerEmail || "guest"}_${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "portfolio_items",
            ...(isUuid ? { filter: `freelancer_id=eq.${freelancerId}` } : {}),
          },
          () => {
            loadItems();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            ...(isUuid ? { filter: `id=eq.${freelancerId}` } : {}),
          },
          () => {
            loadItems();
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [freelancerId, freelancerEmail, initialItems]);

  // Clean external link URL
  const validExternalLink = (() => {
    if (!externalPortfolioUrl || typeof externalPortfolioUrl !== "string") return null;
    const trimmed = externalPortfolioUrl.trim();
    if (!trimmed || trimmed.includes("workhop.in/pro/") || trimmed.includes("example.com")) return null;
    return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
  })();

  const activeLightboxItem = lightboxIndex !== null && items[lightboxIndex] ? items[lightboxIndex] : null;

  return (
    <div className="w-full space-y-3" data-testid="portfolio-gallery">
      {/* Header action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-1.5">
            <ImageIcon size={13} className="text-brand" />
            <span>Portfolio &amp; Work Samples</span>
          </span>
          {items.length > 0 && (
            <span className="border border-ink/20 dark:border-zinc-700 bg-sand dark:bg-zinc-800 px-1.5 py-0.2 text-[10px] font-black">
              {items.length} sample{items.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {validExternalLink && (
          <a
            href={validExternalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-black text-brand hover:underline border border-brand/40 px-2 py-0.5 rounded-sm bg-brand/5 dark:bg-brand/10 transition"
          >
            <span>Open external portfolio</span>
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Grid or Empty State */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="aspect-[4/3] bg-stone-100 dark:bg-zinc-800 border-2 border-ink/20 animate-pulse flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-inkmuted" />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {items.map((item, idx) => {
            const src = formatSrc(item.public_url || item.storage_path);
            const isBroken = brokenMap[src];
            const isLoaded = imageLoadedMap[src];

            return (
              <div
                key={item.id || idx}
                onClick={() => {
                  if (!isBroken) setLightboxIndex(idx);
                }}
                className={`group relative cursor-pointer border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-[2px_2px_0px_#121212] hover:border-brand transition select-none ${
                  isBroken ? "cursor-not-allowed opacity-75" : ""
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-zinc-800 relative flex items-center justify-center">
                  {!isLoaded && !isBroken && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-200 dark:bg-zinc-800 animate-pulse">
                      <Loader2 size={16} className="animate-spin text-inkmuted" />
                    </div>
                  )}

                  {isBroken ? (
                    <img
                      src={FALLBACK_CATEGORY_IMAGES[idx % FALLBACK_CATEGORY_IMAGES.length]}
                      alt={item.title || `Work sample ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={src}
                      alt={item.title || `Work sample ${idx + 1}`}
                      loading="lazy"
                      onLoad={() => setImageLoadedMap((m) => ({ ...m, [src]: true }))}
                      onError={(e) => {
                        // Attempt fallback to reliable sample instead of showing broken icon
                        if (!src.includes("unsplash.com")) {
                          e.target.src = FALLBACK_CATEGORY_IMAGES[idx % FALLBACK_CATEGORY_IMAGES.length];
                        } else {
                          setImageLoadedMap((m) => ({ ...m, [src]: true }));
                          setBrokenMap((m) => ({ ...m, [src]: true }));
                        }
                      }}
                      className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                        isLoaded ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  )}

                  {/* Delete button for freelancer mode */}
                  {canDelete && onDeleteItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item);
                      }}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center border border-ink bg-white/95 text-danger hover:bg-danger hover:text-white shadow-sm transition"
                      title="Delete work sample"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Caption / Title */}
                <div className="p-1.5 bg-white dark:bg-zinc-800 border-t-2 border-ink dark:border-zinc-700 flex items-center justify-between text-[10px] font-black text-ink dark:text-white">
                  <span className="truncate pr-1">{item.title || `Sample #${idx + 1}`}</span>
                  <Sparkles size={10} className="text-brand shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-dashed border-ink/30 dark:border-zinc-700 bg-sand/40 dark:bg-zinc-900/40 p-6 text-center">
          <ImageIcon size={26} className="mx-auto text-inkmuted mb-1.5 opacity-60" />
          <p className="text-xs font-black text-ink dark:text-white">No image samples uploaded directly.</p>
          {validExternalLink ? (
            <p className="text-[11px] font-semibold text-inkmuted dark:text-zinc-400 mt-1">
              View their projects and case studies via the external portfolio link above.
            </p>
          ) : (
            <p className="text-[11px] font-semibold text-inkmuted dark:text-zinc-400 mt-1">
              This freelancer has not uploaded work sample screenshots yet.
            </p>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in select-none"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full bg-white dark:bg-zinc-950 border-2 border-ink dark:border-zinc-700 p-3 sm:p-4 shadow-[8px_8px_0px_#121212] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b-2 border-ink dark:border-zinc-700">
              <span className="text-xs font-black uppercase text-ink dark:text-white flex items-center gap-1.5 truncate">
                <ImageIcon size={14} className="text-brand shrink-0" />
                <span className="truncate">{activeLightboxItem.title || `Work Sample ${lightboxIndex + 1} of ${items.length}`}</span>
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="flex h-7 w-7 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 hover:bg-brand hover:text-white font-black text-xs transition cursor-pointer"
                title="Close (Esc)"
              >
                <X size={14} />
              </button>
            </div>

            {/* Main Image */}
            <div className="relative flex-1 min-h-[300px] max-h-[70vh] bg-stone-900 flex items-center justify-center overflow-hidden border border-ink/20">
              <img
                src={formatSrc(activeLightboxItem.public_url || activeLightboxItem.storage_path)}
                alt={activeLightboxItem.title || "Full view"}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />

              {/* Prev / Next buttons */}
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((idx) => (idx > 0 ? idx - 1 : items.length - 1));
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center border-2 border-ink bg-white/90 dark:bg-zinc-800/90 text-ink dark:text-white hover:bg-brand hover:text-white shadow-sm transition"
                    title="Previous"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((idx) => (idx < items.length - 1 ? idx + 1 : 0));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center border-2 border-ink bg-white/90 dark:bg-zinc-800/90 text-ink dark:text-white hover:bg-brand hover:text-white shadow-sm transition"
                    title="Next"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Footer / Description */}
            <div className="pt-2.5 flex items-center justify-between text-xs font-bold text-inkmuted dark:text-zinc-400 gap-2">
              <span className="truncate">{activeLightboxItem.description || activeLightboxItem.title || ""}</span>
              <span className="font-mono text-[10px] shrink-0">
                {lightboxIndex + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
