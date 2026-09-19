// Advanced Market Rate Intelligence Engine for Indian Freelance & Gig Economy (Bengaluru Benchmark)

const CATEGORY_BENCHMARKS = {
  "Graphics & Design": {
    baseRecommended: 12000,
    min: 4500,
    max: 28000,
    turnaround: "3–6 days",
    keywords: [
      { terms: ["logo", "branding", "brand identity", "brand kit", "wordmark"], rec: 14000, min: 6000, max: 28000, desc: "Brand Identity & Logo Design" },
      { terms: ["ui", "ux", "figma", "app design", "wireframe", "prototype", "redesign"], rec: 18000, min: 9000, max: 38000, desc: "UI/UX & App Wireframing" },
      { terms: ["landing page design", "web design", "website mock"], rec: 12000, min: 6000, max: 25000, desc: "Website UI & Landing Page Design" },
      { terms: ["flyer", "brochure", "poster", "banner", "social media post", "creative pack"], rec: 6500, min: 3000, max: 14000, desc: "Marketing Collateral & Social Creatives" },
      { terms: ["packaging", "label", "box", "pouch", "bottle design"], rec: 15000, min: 7500, max: 30000, desc: "Product Packaging & Label Design" },
      { terms: ["3d", "render", "autocad", "sketchup", "interior", "architectural"], rec: 18000, min: 8000, max: 40000, desc: "3D Visualization & Architectural CAD" },
      { terms: ["illustration", "character", "digital art", "icon set"], rec: 9000, min: 4000, max: 20000, desc: "Custom Digital Illustrations" },
      { terms: ["photo", "product photoshoot", "photography", "catalog shoot"], rec: 12000, min: 6000, max: 25000, desc: "Product & Catalog Photography" },
    ],
  },
  "Programming & Tech": {
    baseRecommended: 25000,
    min: 8000,
    max: 65000,
    turnaround: "5–12 days",
    keywords: [
      { terms: ["mvp", "full stack", "web app", "saas", "dashboard", "portal"], rec: 45000, min: 20000, max: 95000, desc: "Full-Stack Web App / MVP" },
      { terms: ["mobile app", "flutter", "react native", "ios", "android"], rec: 55000, min: 25000, max: 120000, desc: "Cross-Platform Mobile App" },
      { terms: ["landing page", "react", "next.js", "nextjs", "frontend", "tailwind"], rec: 16000, min: 8000, max: 32000, desc: "Responsive Frontend / Landing Page" },
      { terms: ["shopify", "ecommerce", "woocommerce", "store setup", "payment gateway"], rec: 22000, min: 10000, max: 48000, desc: "E-Commerce / Shopify Store" },
      { terms: ["nocode", "no-code", "bubble", "flutterflow", "airtable", "zapier"], rec: 24000, min: 12000, max: 50000, desc: "No-Code Application Development" },
      { terms: ["bug", "fix", "script", "scraping", "scraper", "api integration", "automation"], rec: 7500, min: 3500, max: 18000, desc: "API Integration, Scripting & Bug Fix" },
      { terms: ["qa", "testing", "automation test", "security audit", "penetration"], rec: 18000, min: 8000, max: 40000, desc: "QA Testing & Security Audit" },
    ],
  },
  "Digital Marketing": {
    baseRecommended: 16000,
    min: 6000,
    max: 38000,
    turnaround: "7–30 days",
    keywords: [
      { terms: ["seo", "backlinks", "keyword research", "on-page", "technical seo"], rec: 18000, min: 8000, max: 35000, desc: "Comprehensive SEO & Ranking Strategy" },
      { terms: ["social media", "instagram", "linkedin", "content calendar", "reels strategy"], rec: 18000, min: 9000, max: 38000, desc: "Monthly Social Media Management" },
      { terms: ["ads", "meta ads", "google ads", "performance marketing", "roas", "ppc"], rec: 20000, min: 10000, max: 45000, desc: "Paid Media & Performance Campaigns" },
      { terms: ["influencer", "outreach", "collab", "creator management"], rec: 15000, min: 7000, max: 32000, desc: "Influencer Marketing Campaign" },
      { terms: ["email marketing", "klaviyo", "mailchimp", "newsletter", "drip sequence"], rec: 12000, min: 5500, max: 26000, desc: "Email Marketing Sequences & Automation" },
    ],
  },
  "Writing & Translation": {
    baseRecommended: 6000,
    min: 2500,
    max: 18000,
    turnaround: "2–5 days",
    keywords: [
      { terms: ["blog", "article", "seo content", "1000 words", "1500 words", "post"], rec: 4500, min: 2000, max: 9000, desc: "SEO Articles & Long-Form Blog Content" },
      { terms: ["website copy", "landing page copy", "copywriting", "sales page"], rec: 14000, min: 6500, max: 28000, desc: "High-Converting Sales & Web Copy" },
      { terms: ["pitch deck", "investor deck", "business plan copy", "whitepaper"], rec: 20000, min: 9000, max: 40000, desc: "Investor Pitch Deck & Whitepaper" },
      { terms: ["technical writing", "documentation", "api docs", "user manual"], rec: 16000, min: 7000, max: 32000, desc: "Technical Documentation" },
      { terms: ["translation", "kannada", "hindi", "tamil", "telugu", "localization"], rec: 5500, min: 2500, max: 14000, desc: "Regional Language Translation & Localization" },
    ],
  },
  "Video & Animation": {
    baseRecommended: 14000,
    min: 5000,
    max: 36000,
    turnaround: "3–7 days",
    keywords: [
      { terms: ["reels", "shorts", "tiktok", "instagram video", "podcast edit", "caption"], rec: 9000, min: 4500, max: 20000, desc: "Short-Form Video Editing Pack" },
      { terms: ["youtube", "vlog", "long form", "documentary edit"], rec: 14000, min: 6000, max: 28000, desc: "YouTube / Long-Form Video Production" },
      { terms: ["explainer", "2d animation", "motion graphics", "infographic video"], rec: 26000, min: 12000, max: 55000, desc: "2D Explainer & Motion Graphics" },
      { terms: ["videography", "shoot", "cameraman", "director", "onsite shoot"], rec: 18000, min: 8000, max: 40000, desc: "On-Location Videography & Shoot" },
      { terms: ["intro", "logo animation", "outro", "lower thirds"], rec: 6500, min: 3000, max: 14000, desc: "Motion Logo Animation & Assets" },
    ],
  },
  "AI Services": {
    baseRecommended: 24000,
    min: 9000,
    max: 60000,
    turnaround: "4–10 days",
    keywords: [
      { terms: ["chatbot", "custom gpt", "openai", "claude", "langchain", "agent"], rec: 28000, min: 12000, max: 60000, desc: "AI Chatbot & Autonomous Agent Setup" },
      { terms: ["data extraction", "data cleaning", "scraper", "labeling"], rec: 10000, min: 4500, max: 22000, desc: "Data Annotation & Scraping Pipeline" },
      { terms: ["fine tuning", "rag", "embeddings", "vector db", "model train"], rec: 48000, min: 20000, max: 110000, desc: "RAG Pipeline & Custom Model Fine-Tuning" },
    ],
  },
  "Music & Audio": {
    baseRecommended: 9000,
    min: 3500,
    max: 24000,
    turnaround: "2–5 days",
    keywords: [
      { terms: ["voiceover", "voice over", "narration", "dubbing"], rec: 6500, min: 3000, max: 15000, desc: "Professional Voiceover & Dubbing" },
      { terms: ["mixing", "mastering", "podcast audio", "clean audio"], rec: 8000, min: 3500, max: 18000, desc: "Audio Mixing & Podcast Mastering" },
      { terms: ["jingle", "soundtrack", "bgm", "composition", "sound design"], rec: 16000, min: 7000, max: 35000, desc: "Original Jingle & Custom BGM" },
    ],
  },
  Business: {
    baseRecommended: 16000,
    min: 6000,
    max: 42000,
    turnaround: "3–8 days",
    keywords: [
      { terms: ["cfo", "accounting", "gst", "tax", "audit", "financial model", "valuation"], rec: 22000, min: 9000, max: 55000, desc: "Financial Modeling & Tax Advisory" },
      { terms: ["legal", "contract", "nda", "terms", "agreement", "trademark"], rec: 10000, min: 4500, max: 25000, desc: "Legal Contract & NDA Drafting" },
      { terms: ["recruitment", "hiring", "talent sourcing", "hr recruiter"], rec: 15000, min: 6500, max: 35000, desc: "Technical & Talent Recruitment" },
      { terms: ["virtual assistant", "ea", "data entry", "customer support"], rec: 8500, min: 4000, max: 18000, desc: "Executive Support & Operations" },
    ],
  },
  Consulting: {
    baseRecommended: 20000,
    min: 8000,
    max: 50000,
    turnaround: "3–7 days",
    keywords: [
      { terms: ["strategy", "growth", "business consulting", "advisor"], rec: 28000, min: 12000, max: 65000, desc: "Strategic Business Consulting" },
      { terms: ["corporate training", "workshop", "upskilling"], rec: 22000, min: 10000, max: 50000, desc: "Corporate Workshop & Training" },
    ],
  },
};

CATEGORY_BENCHMARKS["Tech & Code"] = CATEGORY_BENCHMARKS["Programming & Tech"];
CATEGORY_BENCHMARKS["Marketing"] = CATEGORY_BENCHMARKS["Digital Marketing"];
CATEGORY_BENCHMARKS["Writing"] = CATEGORY_BENCHMARKS["Writing & Translation"];
CATEGORY_BENCHMARKS["Video"] = CATEGORY_BENCHMARKS["Video & Animation"];
CATEGORY_BENCHMARKS["Hyperlocal Specialized (Bangalore Focus)"] = CATEGORY_BENCHMARKS["Graphics & Design"];
CATEGORY_BENCHMARKS["Hyperlocal Specialized"] = CATEGORY_BENCHMARKS["Graphics & Design"];

/**
 * Intelligent Market Price Estimation Algorithm for Indian Gig Economy
 * Evaluates category, title keywords, description scope, and location demand.
 */
export function getMarketPriceSuggestion({ category, title = "", description = "", area = "Bengaluru" }) {
  const normCat = category || "Graphics & Design";
  const benchmark = CATEGORY_BENCHMARKS[normCat] || CATEGORY_BENCHMARKS["Graphics & Design"];

  const textToScan = `${title} ${description}`.toLowerCase();

  let matchedDesc = null;
  let recommended = benchmark.baseRecommended;
  let minPrice = benchmark.min;
  let maxPrice = benchmark.max;
  let confidence = "medium";

  // Check matching specialized keyword benchmarks
  if (benchmark.keywords) {
    for (const item of benchmark.keywords) {
      if (item.terms.some((term) => textToScan.includes(term))) {
        recommended = item.rec;
        minPrice = item.min;
        maxPrice = item.max;
        matchedDesc = item.desc;
        confidence = "high";
        break;
      }
    }
  }

  // Adjust for scope/complexity signals in text
  let scopeMultiplier = 1.0;
  if (textToScan.includes("urgent") || textToScan.includes("immediate") || textToScan.includes("24 hours") || textToScan.includes("rush")) {
    scopeMultiplier += 0.25; // Rush premium
  }
  if (textToScan.includes("enterprise") || textToScan.includes("large scale") || textToScan.includes("multi-page") || textToScan.includes("10+") || textToScan.includes("advanced")) {
    scopeMultiplier += 0.35;
  }
  if (textToScan.includes("simple") || textToScan.includes("quick") || textToScan.includes("1 page") || textToScan.includes("minor") || textToScan.includes("basic")) {
    scopeMultiplier -= 0.20;
  }

  // Apply multiplier and round to clean human amounts (nearest ₹500)
  recommended = Math.round((recommended * scopeMultiplier) / 500) * 500;
  minPrice = Math.round((minPrice * scopeMultiplier) / 500) * 500;
  maxPrice = Math.round((maxPrice * scopeMultiplier) / 500) * 500;

  // Ensure logical hierarchy
  if (minPrice >= recommended) minPrice = Math.round((recommended * 0.6) / 500) * 500;
  if (maxPrice <= recommended) maxPrice = Math.round((recommended * 1.6) / 500) * 500;

  // Build Experience / Scope Tiers
  const entryAmount = Math.max(1500, Math.round((recommended * 0.6) / 500) * 500);
  const standardAmount = recommended;
  const seniorAmount = Math.round((recommended * 1.5) / 500) * 500;

  const tiers = {
    entry: {
      label: "Entry / Fast Turnaround",
      amount: entryAmount,
      desc: "Junior freelancers & quick turnaround",
    },
    standard: {
      label: "Market Recommended",
      amount: standardAmount,
      desc: "Experienced, verified mid-level pros",
    },
    premium: {
      label: "Senior / Top Pro",
      amount: seniorAmount,
      desc: "Top 5% veteran pros with guaranteed polish",
    },
  };

  return {
    category: normCat,
    recommended: standardAmount,
    min: minPrice,
    max: maxPrice,
    turnaround: benchmark.turnaround,
    confidence,
    deliverableName: matchedDesc || `${normCat} Project`,
    rationale: matchedDesc
      ? `Based on prevailing Bengaluru market rates for ${matchedDesc}.`
      : `Based on verified Bengaluru freelancer rates across ${normCat}.`,
    tiers,
  };
}

/**
 * Assesses an employer's currently typed pay against market expectations
 */
export function evaluateEmployerPay(typedPay, suggestion) {
  const num = parseInt(typedPay, 10);
  if (!num || isNaN(num) || num <= 0) return null;

  const { min, max, recommended } = suggestion;

  if (num < min * 0.7) {
    return {
      status: "below",
      badge: "⚡ BELOW MARKET AVERAGE",
      color: "#D97706", // Amber
      bgColor: "#FEF3C7",
      message: `Typical Bengaluru rate is ₹${recommended.toLocaleString("en-IN")}. Gigs with higher budgets attract 3x more senior applicants.`,
    };
  }

  if (num >= min * 0.7 && num <= max * 1.3) {
    return {
      status: "competitive",
      badge: "✅ COMPETITIVE MARKET RATE",
      color: "#059669", // Emerald
      bgColor: "#D1FAE5",
      message: `Well-calibrated budget! Matches typical rates for verified pros in ${suggestion.category}.`,
    };
  }

  return {
    status: "premium",
    badge: "🔥 PREMIUM BUDGET",
    color: "#7C3AED", // Purple
    bgColor: "#EDE9FE",
    message: `Top-tier budget! High priority listing that will attract senior, top-rated Bengaluru talent immediately.`,
  };
}
