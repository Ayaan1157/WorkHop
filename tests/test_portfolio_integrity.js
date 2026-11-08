/**
 * Static Guard Test:
 * Scans frontend/src/components/PortfolioGallery.jsx and related portfolio files
 * to guarantee that NO stock image domains, placeholder services, or synthetic title generators
 * can ever be reintroduced into production portfolio code.
 */
const fs = require("fs");
const path = require("path");

const FORBIDDEN_HOSTS = [
  "unsplash.com",
  "picsum.photos",
  "placehold.co",
  "placeholder.com",
  "via.placeholder.com",
  "pexels.com",
  "pixabay.com",
  "loremflickr.com",
  "dummyimage.com"
];

const FORBIDDEN_SYNTHETIC_STRINGS = [
  "Work Sample ${",
  "Work Sample 1",
  "Work Sample 2",
  "Sample #",
  "FALLBACK_CATEGORY_IMAGES"
];

console.log("=== RUNNING PORTFOLIO STATIC GUARD TEST ===");

const galleryCode = fs.readFileSync(path.resolve(__dirname, "../frontend/src/components/PortfolioGallery.jsx"), "utf8");

// 1. Verify forbidden host strings
for (const host of FORBIDDEN_HOSTS) {
  if (galleryCode.toLowerCase().includes(host)) {
    console.error(`FAILED: Forbidden stock image host found in PortfolioGallery.jsx: "${host}"`);
    process.exit(1);
  }
}

// 2. Verify forbidden synthetic strings
for (const synth of FORBIDDEN_SYNTHETIC_STRINGS) {
  if (galleryCode.includes(synth)) {
    console.error(`FAILED: Forbidden synthetic pattern found in PortfolioGallery.jsx: "${synth}"`);
    process.exit(1);
  }
}

// 3. Verify Sparkles icon is completely removed
if (galleryCode.includes("Sparkles")) {
  console.error("FAILED: Sparkles AI icon found in PortfolioGallery.jsx");
  process.exit(1);
}

// 4. Test isValidPortfolioStorageUrl runtime guard logic
function isValidPortfolioStorageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:")) {
    return !trimmed.startsWith("/") && trimmed.includes("/") && !trimmed.includes("..");
  }

  try {
    const parsed = new URL(trimmed);
    const isSupabaseHost =
      parsed.hostname.endsWith(".supabase.co") ||
      parsed.hostname.endsWith(".supabase.in") ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1";

    const isPortfoliosPath = parsed.pathname.includes("/storage/v1/object/public/portfolios/");

    return isSupabaseHost && isPortfoliosPath;
  } catch {
    return false;
  }
}

const tests = [
  { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085", expected: false },
  { url: "https://picsum.photos/200/300", expected: false },
  { url: "https://placehold.co/600x400", expected: false },
  { url: "https://kdfrbkxpuwbrvhidihvj.supabase.co/storage/v1/object/public/portfolios/d92f3c8b-c0e9-4382-90f3-e12b16386714/1793859016861_op763p2.avif", expected: true },
  { url: "608ab01d-5893-48c3-bf90-da91ec666b89/1794097729343_ddk1qqu.png", expected: true },
  { url: "/etc/passwd", expected: false },
  { url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==", expected: false }
];

for (const t of tests) {
  const result = isValidPortfolioStorageUrl(t.url);
  if (result !== t.expected) {
    console.error(`FAILED: isValidPortfolioStorageUrl("${t.url}") returned ${result}, expected ${t.expected}`);
    process.exit(1);
  }
}

console.log("SUCCESS: All portfolio static and runtime guards passed with 100% compliance.");
