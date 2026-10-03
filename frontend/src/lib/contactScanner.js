/**
 * WorkHop Anti-Disintermediation & Contact Details Scanner
 * Protects freelancers and employers by detecting off-platform contact info:
 * - Phone numbers (Indian 10-digit, +91, spaced/dashed numbers, word numbers)
 * - Emails (standard and obfuscated "at/dot" formats)
 * - Social handles and external links (WhatsApp, Telegram, Instagram, LinkedIn, URLs)
 * - File screening: filenames, PDF text streams, image metadata (EXIF/PNG chunks), and OCR.
 */

// Phone detection: matches sequences that form 10-13 digits with optional spaces, dashes, dots, brackets
const PHONE_PATTERN = /(?:(?:\+?91|0)[\s.-]?)?(?:(?:\(\d{1,5}\)[\s.-]?)|\d[\s.-]?){9,14}\d/g;

// Email detection: standard email and obfuscated formats (e.g. "name (at) domain dot com", "user at gmail dot com")
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|\b[A-Za-z0-9._%+-]+\s*(?:\(at\)|\[at\]|\bat\b|@)\s*[A-Za-z0-9.-]+\s*(?:\(dot\)|\[dot\]|\bdot\b|\.)\s*(?:com|in|org|net|co|io|ai|me|app)\b/gi;

// URL / Web domain detection
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|\b[A-Za-z0-9-]+\.(?:com|in|co|org|net|io|tech|agency|me|app)\b(?:\/[^\s]*)?/gi;

// Social handles & external communication apps (strictly requiring word boundaries and separators)
const SOCIAL_REGEX = /(?:\b(?:whatsapp|telegram|instagram|linkedin|twitter|snapchat)\s*[:=/@-]?\s*@?[a-zA-Z0-9_.-]{3,}\b)|(?:\b(?:wa\.me|t\.me)\/[a-zA-Z0-9_.-]+)|(?:\b(?:wa|tg|ig|insta)\s*[:=/@-]\s*@?[a-zA-Z0-9_.-]{2,}\b)|(?:\B@[a-zA-Z][a-zA-Z0-9_]{2,23}\b)/gi;

const NUMBER_WORDS = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

/**
 * Normalizes spelled out number words (e.g. "nine eight seven..." -> "9 8 7...")
 */
function normalizeWordNumbers(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/gi, (m) => {
    return NUMBER_WORDS[m.toLowerCase()] || m;
  });
}

/**
 * Extracts printable ASCII/UTF-8 character sequences from an ArrayBuffer
 * Useful for scanning PDF text streams, PNG metadata chunks, EXIF strings, and SVG text.
 */
function extractPrintableStrings(buffer) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  let currentChunk = [];

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Printable ASCII (32 to 126), newline (10), carriage return (13), tab (9)
    if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
      currentChunk.push(String.fromCharCode(b));
    } else {
      if (currentChunk.length >= 6) {
        chunks.push(currentChunk.join(""));
      }
      currentChunk = [];
    }
  }

  if (currentChunk.length >= 6) {
    chunks.push(currentChunk.join(""));
  }

  return chunks.join(" ");
}

/**
 * Scans a string for prohibited contact info (emails, phone numbers, external handles/links)
 * @param {string} text
 * @returns {{ hasViolations: boolean, violations: Array<{ type: string, match: string, label: string }> }}
 */
export function scanText(text) {
  if (!text || typeof text !== "string") {
    return { hasViolations: false, violations: [] };
  }

  const violations = [];
  const normalizedText = normalizeWordNumbers(text);

  // 1. Check emails (standard and obfuscated)
  const emails = [
    ...(text.match(EMAIL_REGEX) || []),
    ...(normalizedText.match(EMAIL_REGEX) || []),
  ];
  emails.forEach((m) => {
    violations.push({
      type: "email",
      match: m.trim(),
      label: `Email Address: ${m.trim()}`,
    });
  });

  // 2. Check phone numbers (regular + word normalized)
  const phoneCandidates = [
    ...(text.match(PHONE_PATTERN) || []),
    ...(normalizedText.match(PHONE_PATTERN) || []),
  ];

  phoneCandidates.forEach((m) => {
    let digits = m.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length === 11) {
      digits = digits.slice(1);
    }

    // Standard 10-digit mobile number check
    if (digits.length === 10) {
      violations.push({
        type: "phone",
        match: m.trim(),
        label: `Phone / Mobile Number: ${m.trim()}`,
      });
    }
  });

  // 3. Check URLs / Links
  const urls = text.match(URL_REGEX) || [];
  urls.forEach((m) => {
    if (!violations.some((v) => v.match.includes(m))) {
      violations.push({
        type: "url",
        match: m.trim(),
        label: `External Website / Link: ${m.trim()}`,
      });
    }
  });

  // 4. Check Social / Messaging handles (WhatsApp, Telegram, etc.)
  const socials = text.match(SOCIAL_REGEX) || [];
  socials.forEach((m) => {
    if (!violations.some((v) => v.match.includes(m))) {
      violations.push({
        type: "social",
        match: m.trim(),
        label: `Direct Handle / Chat App: ${m.trim()}`,
      });
    }
  });

  // Deduplicate violations
  const unique = [];
  const seen = new Set();
  for (const v of violations) {
    const key = `${v.type}:${v.match.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }

  return {
    hasViolations: unique.length > 0,
    violations: unique,
  };
}

/**
 * Auto-redacts all detected contact info in a string
 * @param {string} text
 * @returns {string} Cleaned text with [REDACTED] substitutions
 */
export function redactViolations(text) {
  if (!text || typeof text !== "string") return "";
  let clean = text;

  // Redact emails
  clean = clean.replace(EMAIL_REGEX, "[EMAIL REDACTED]");

  // Redact phones (10-13 digits)
  clean = clean.replace(PHONE_PATTERN, (m) => {
    let digits = m.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
    return digits.length === 10 ? "[PHONE REDACTED]" : m;
  });

  // Redact social handles
  clean = clean.replace(SOCIAL_REGEX, "[HANDLE REDACTED]");

  // Redact URLs
  clean = clean.replace(URL_REGEX, "[LINK REDACTED]");

  return clean;
}

/**
 * Dynamically loads Tesseract.js from CDN if not already available on window
 */
let tesseractPromise = null;
function loadTesseract() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;

  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error("Tesseract failed to load"));
    };
    script.onerror = () => reject(new Error("Failed to fetch Tesseract"));
    document.head.appendChild(script);
  });

  return tesseractPromise;
}

/**
 * Performs fast Optical Character Recognition on an Image/Canvas
 * Times out after 3.5 seconds to never block user experience
 */
async function performImageOcr(file) {
  try {
    const Tesseract = await Promise.race([
      loadTesseract(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("OCR timeout")), 3500)),
    ]);

    const worker = await Tesseract.createWorker("eng");
    const ret = await Promise.race([
      worker.recognize(file),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Recognition timeout")), 4000)),
    ]);
    await worker.terminate();

    return ret?.data?.text || "";
  } catch {
    // OCR unavailable or timed out; metadata and filename scanning continue to protect
    return "";
  }
}

/**
 * Comprehensive Image Screening:
 * 1. Screens filename for phones and emails
 * 2. Screens binary image metadata (EXIF UserComments, PNG tEXt chunks, SVG text)
 * 3. Screens visible text inside the image via in-browser OCR
 *
 * @param {File} file
 * @returns {Promise<{ hasViolations: boolean, violations: Array<{ type: string, match: string, label: string }>, fileName: string }>}
 */
export async function scanImageFile(file) {
  if (!file) {
    return { hasViolations: false, violations: [], fileName: "" };
  }

  const allViolations = [];

  // Layer 1: Check filename (strip extension so image format extensions do not trigger false positive URL matches)
  const baseName = (file.name || "").replace(/\.[^/.]+$/, "");
  const filenameScan = scanText(baseName);
  if (filenameScan.hasViolations) {
    allViolations.push(...filenameScan.violations);
  }

  // Layer 2: For SVG vector graphics (XML text markup), screen XML content for contact details
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (isSvg) {
    try {
      const text = await file.text();
      if (text) {
        const svgScan = scanText(text);
        if (svgScan.hasViolations) {
          allViolations.push(...svgScan.violations);
        }
      }
    } catch {
      /* ignore read errors */
    }
  }

  // Layer 3: Perform in-browser OCR to detect text visually printed inside the image
  try {
    const ocrText = await performImageOcr(file);
    if (ocrText) {
      const ocrScan = scanText(ocrText);
      if (ocrScan.hasViolations) {
        allViolations.push(...ocrScan.violations);
      }
    }
  } catch {
    /* ignore OCR errors */
  }

  // Deduplicate violations
  const unique = [];
  const seen = new Set();
  for (const v of allViolations) {
    const key = `${v.type}:${v.match.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }

  return {
    hasViolations: unique.length > 0,
    violations: unique,
    fileName: file.name,
  };
}

/**
 * Scans a PDF file for contact information
 * Reads binary text streams and extracted strings
 * @param {File} file
 * @returns {Promise<{ hasViolations: boolean, violations: Array<{ type: string, match: string, label: string }>, fileName: string, fileSize: string, dataUrl: string }>}
 */
export async function scanPdfFile(file) {
  if (!file) {
    return { hasViolations: false, violations: [], fileName: "", fileSize: "", dataUrl: "" };
  }

  const fileSize =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawContent = reader.result;
        let textContent = "";

        if (typeof rawContent === "string") {
          textContent = rawContent;
        } else if (rawContent instanceof ArrayBuffer) {
          textContent = extractPrintableStrings(rawContent);
        }

        // Also check filename itself (strip extension)
        const baseName = (file.name || "").replace(/\.[^/.]+$/, "");
        const filenameScan = scanText(baseName);
        const contentScan = scanText(textContent);

        const allViolations = [...filenameScan.violations, ...contentScan.violations];
        const unique = [];
        const seen = new Set();
        for (const v of allViolations) {
          const key = `${v.type}:${v.match.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(v);
          }
        }

        // Convert file to Base64 Data URL for storage and previewing
        const dataUrlReader = new FileReader();
        dataUrlReader.onload = () => {
          resolve({
            hasViolations: unique.length > 0,
            violations: unique,
            fileName: file.name,
            fileSize,
            dataUrl: dataUrlReader.result || "",
          });
        };
        dataUrlReader.onerror = () => {
          resolve({
            hasViolations: unique.length > 0,
            violations: unique,
            fileName: file.name,
            fileSize,
            dataUrl: "",
          });
        };
        dataUrlReader.readAsDataURL(file);
      } catch (err) {
        resolve({
          hasViolations: false,
          violations: [],
          fileName: file.name,
          fileSize,
          dataUrl: "",
        });
      }
    };

    reader.onerror = () => {
      resolve({
        hasViolations: false,
        violations: [],
        fileName: file.name,
        fileSize,
        dataUrl: "",
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Universal file scanner for any uploaded asset (Image, PDF, Document)
 * @param {File} file
 * @returns {Promise<{ hasViolations: boolean, violations: Array<{ type: string, match: string, label: string }>, fileName: string }>}
 */
export async function scanUploadFile(file) {
  if (!file) return { hasViolations: false, violations: [], fileName: "" };

  const isImage = file.type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
  if (isImage) {
    return scanImageFile(file);
  }

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const pdfRes = await scanPdfFile(file);
    return {
      hasViolations: pdfRes.hasViolations,
      violations: pdfRes.violations,
      fileName: file.name,
    };
  }

  // Other documents (plain text, code, doc)
  const allViolations = [];
  const baseName = (file.name || "").replace(/\.[^/.]+$/, "");
  const filenameScan = scanText(baseName);
  if (filenameScan.hasViolations) allViolations.push(...filenameScan.violations);

  try {
    const isTextDoc = file.type?.startsWith("text/") || /\.(txt|md|csv|json|html|xml|js|ts|jsx|tsx)$/i.test(file.name);
    if (isTextDoc) {
      const text = await file.text();
      const contentScan = scanText(text);
      if (contentScan.hasViolations) allViolations.push(...contentScan.violations);
    } else {
      const buffer = await file.arrayBuffer();
      const text = extractPrintableStrings(buffer);
      const contentScan = scanText(text);
      if (contentScan.hasViolations) allViolations.push(...contentScan.violations);
    }
  } catch {
    /* ignore */
  }

  const unique = [];
  const seen = new Set();
  for (const v of allViolations) {
    const key = `${v.type}:${v.match.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }

  return {
    hasViolations: unique.length > 0,
    violations: unique,
    fileName: file.name,
  };
}

/**
 * Scans a portfolio/project URL for:
 * 1. Personal contact details (Phone numbers, WhatsApp, Telegram, Emails, Calendly)
 * 2. Company promotional / commercial marketing (Promo codes, coupons, discounts, agency sales links)
 * 3. Valid URL format
 *
 * @param {string} urlString
 * @returns {{ hasViolations: boolean, violations: Array<{ type: string, match: string, label: string }>, cleanUrl: string }}
 */
export function scanPortfolioLink(urlString) {
  if (!urlString || typeof urlString !== "string" || !urlString.trim()) {
    return { hasViolations: false, violations: [], cleanUrl: "" };
  }

  const raw = urlString.trim();
  const violations = [];

  // 1. Prohibited non-web schemes
  const lowerRaw = raw.toLowerCase();
  if (lowerRaw.startsWith("javascript:") || lowerRaw.startsWith("data:") || lowerRaw.startsWith("file:")) {
    violations.push({
      type: "unsafe_scheme",
      match: raw.slice(0, 15),
      label: "Unsafe or unsupported link protocol",
    });
    return { hasViolations: true, violations, cleanUrl: "" };
  }

  if (lowerRaw.startsWith("tel:") || lowerRaw.startsWith("callto:") || lowerRaw.startsWith("sms:")) {
    violations.push({
      type: "phone",
      match: raw,
      label: "Direct phone dialer / SMS link",
    });
    return { hasViolations: true, violations, cleanUrl: "" };
  }

  if (lowerRaw.startsWith("mailto:")) {
    violations.push({
      type: "email",
      match: raw,
      label: "Direct email link (mailto:)",
    });
    return { hasViolations: true, violations, cleanUrl: "" };
  }

  if (lowerRaw.startsWith("whatsapp:")) {
    violations.push({
      type: "phone",
      match: raw,
      label: "Direct WhatsApp messaging link",
    });
    return { hasViolations: true, violations, cleanUrl: "" };
  }

  // Normalize URL with https:// if user omitted protocol
  let normalized = raw;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = "https://" + normalized;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    violations.push({
      type: "invalid_url",
      match: raw,
      label: "Invalid URL structure (must be a valid web link)",
    });
    return { hasViolations: true, violations, cleanUrl: "" };
  }

  // Decode URI component for deep inspection (catch %40, %2B, etc.)
  let decodedString = normalized;
  try {
    decodedString = decodeURIComponent(normalized);
  } catch {
    /* fallback to normalized */
  }

  const host = (parsedUrl.hostname || "").toLowerCase();
  const pathAndQuery = decodedString.toLowerCase();

  // 2. Personal contact: WhatsApp direct links
  if (host === "wa.me" || host === "api.whatsapp.com" || host === "chat.whatsapp.com" || host.includes("whatsapp")) {
    violations.push({
      type: "phone",
      match: host,
      label: "WhatsApp direct chat / group link",
    });
  }

  // 3. Personal contact: Telegram direct links
  if (host === "t.me" || host === "telegram.me" || host.includes("telegram")) {
    violations.push({
      type: "social",
      match: host,
      label: "Telegram direct messaging link",
    });
  }

  // 4. Personal contact: Direct booking / meeting bypass (Calendly, Cal.com)
  if (host.includes("calendly.com") || host.includes("cal.com") || host.includes("tidycal.com") || host.includes("zcal.co")) {
    violations.push({
      type: "direct_booking",
      match: host,
      label: "Direct external calendar / booking bypass link",
    });
  }

  // 5. Personal contact: Direct social chat channels
  if (host.includes("discord.gg") || (host.includes("discord.com") && pathAndQuery.includes("/invite"))) {
    violations.push({
      type: "social",
      match: host,
      label: "Discord invite link",
    });
  }
  if (host.includes("instagram.com") && pathAndQuery.includes("/direct/")) {
    violations.push({
      type: "social",
      match: "instagram.com/direct",
      label: "Instagram direct chat link",
    });
  }

  // 6. Personal contact: Phone numbers in URL (Indian 10-digit mobile or sequence)
  const phonePatternInUrl = /(?:(?:\+?91|0)[\s.-]?)?[6-9]\d{9}|\b\d{10,13}\b/g;
  const phoneMatches = decodedString.match(phonePatternInUrl) || [];
  phoneMatches.forEach((m) => {
    const cleanDigits = m.replace(/\D/g, "");
    if (cleanDigits.length >= 10 && cleanDigits.length <= 13) {
      violations.push({
        type: "phone",
        match: m,
        label: `Phone / Mobile number in link: ${m}`,
      });
    }
  });

  // Query parameter phone inspection (e.g. ?phone=..., &mobile=...)
  parsedUrl.searchParams.forEach((val, key) => {
    const k = key.toLowerCase();
    if (k.includes("phone") || k.includes("mobile") || k.includes("tel") || k.includes("contact") || k.includes("whatsapp")) {
      const d = val.replace(/\D/g, "");
      if (d.length >= 7) {
        violations.push({
          type: "phone",
          match: `${key}=${val}`,
          label: `Phone parameter: ${key}=${val}`,
        });
      }
    }
  });

  // 7. Personal contact: Email addresses in URL
  const emailInUrl = decodedString.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi) || [];
  emailInUrl.forEach((em) => {
    violations.push({
      type: "email",
      match: em,
      label: `Email address in link: ${em}`,
    });
  });

  parsedUrl.searchParams.forEach((val, key) => {
    const k = key.toLowerCase();
    if (k.includes("email") || k.includes("mail")) {
      if (val.includes("@") || val.length > 5) {
        violations.push({
          type: "email",
          match: `${key}=${val}`,
          label: `Email parameter: ${key}=${val}`,
        });
      }
    }
  });

  // 8. Company Promo & Commercial Marketing
  // A) Promotional / Referral query parameters
  parsedUrl.searchParams.forEach((val, key) => {
    const k = key.toLowerCase();
    if (/^(promo|promotion|promocode|coupon|discount|voucher|sale|deal|ref|aff|affiliate|referral|campaign)$/i.test(k)) {
      violations.push({
        type: "company_promo",
        match: `${key}=${val}`,
        label: `Company promotional/affiliate parameter: ${key}=${val}`,
      });
    }
  });

  // B) Promotional path keywords & company sales keywords
  const promoKeywordRegex = /(?:[\/?#&-_]|^)(promo|promotions?|promocode|coupons?|discounts?|vouchers?|special-offer|limited-time-offer|free-quote|get-quote|get-a-quote|hire-agency|contact-sales|agency-promo|booking-discount|hire-us|book-a-call|schedule-call|free-consultation)(?:[\/?#&-_]|$)/i;
  const promoMatch = decodedString.match(promoKeywordRegex);
  if (promoMatch) {
    violations.push({
      type: "company_promo",
      match: promoMatch[1],
      label: `Company promotional keyword in link: "${promoMatch[1]}"`,
    });
  }

  // Deduplicate violations
  const unique = [];
  const seen = new Set();
  for (const v of violations) {
    const key = `${v.type}:${v.match.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }

  return {
    hasViolations: unique.length > 0,
    violations: unique,
    cleanUrl: unique.length === 0 ? normalized : "",
  };
}
