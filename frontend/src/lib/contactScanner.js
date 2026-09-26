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

// Social handles & external communication apps
const SOCIAL_REGEX = /(?:(?:whatsapp|wa\.me|wa|tg|telegram|t\.me|instagram|insta|ig|linkedin|twitter|x\.com)\s*[:=/@-]?\s*[\w.-]+)|(?:\b@[\w.-]{3,}\b)/gi;

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
      if (currentChunk.length >= 4) {
        chunks.push(currentChunk.join(""));
      }
      currentChunk = [];
    }
  }

  if (currentChunk.length >= 4) {
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

  // Layer 1: Check filename
  const filenameScan = scanText(file.name);
  if (filenameScan.hasViolations) {
    allViolations.push(...filenameScan.violations);
  }

  // Layer 2: Extract printable strings from file buffer (EXIF tags, PNG text chunks, SVG tags)
  try {
    const buffer = await file.arrayBuffer();
    const extractedText = extractPrintableStrings(buffer);
    if (extractedText) {
      const metadataScan = scanText(extractedText);
      if (metadataScan.hasViolations) {
        allViolations.push(...metadataScan.violations);
      }
    }
  } catch {
    /* ignore read errors */
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

        // Also check filename itself
        const filenameScan = scanText(file.name);
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
  const filenameScan = scanText(file.name);
  if (filenameScan.hasViolations) allViolations.push(...filenameScan.violations);

  try {
    const buffer = await file.arrayBuffer();
    const text = extractPrintableStrings(buffer);
    const contentScan = scanText(text);
    if (contentScan.hasViolations) allViolations.push(...contentScan.violations);
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
