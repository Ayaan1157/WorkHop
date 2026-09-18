/**
 * WorkHop Anti-Disintermediation & Contact Details Scanner
 * Protects freelancers and employers by detecting off-platform contact info:
 * - Phone numbers (Indian 10-digit, +91, spaced/dashed numbers)
 * - Emails (standard and obfuscated "at/dot" formats)
 * - Social handles and external links (WhatsApp, Telegram, Instagram, LinkedIn, URLs)
 */

// Phone detection: matches +91, 10-digit mobile numbers with optional dashes/spaces
const PHONE_REGEX = /(?:(?:\+?91[\s-]?)?[6-9]\d{9})|(?:\b\d{3,5}[\s-]?\d{3,5}[\s-]?\d{3,5}\b)/g;

// Email detection: standard email and obfuscated formats (e.g. "name (at) domain dot com")
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|\b[A-Za-z0-9._%+-]+\s*(?:\(at\)|\[at\]|@)\s*[A-Za-z0-9.-]+\s*(?:\(dot\)|\[dot\]|\.)\s*(?:com|in|org|net|co|io|ai)\b/gi;

// URL / Web domain detection
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|\b[A-Za-z0-9-]+\.(?:com|in|co|org|net|io|tech|agency|me|app)\b(?:\/[^\s]*)?/gi;

// Social handles & external communication apps
const SOCIAL_REGEX = /(?:(?:whatsapp|wa\.me|wa|tg|telegram|t\.me|instagram|insta|ig|linkedin|twitter|x\.com)\s*[:=/@-]?\s*[\w.-]+)|(?:\b@[\w.-]{3,}\b)/gi;

/**
 * Scans a string for prohibited contact info
 * @param {string} text
 * @returns {{ hasViolations: boolean, violations: Array<{ type: string, match: string, label: string }> }}
 */
export function scanText(text) {
  if (!text || typeof text !== "string") {
    return { hasViolations: false, violations: [] };
  }

  const violations = [];

  // Check emails
  const emails = text.match(EMAIL_REGEX) || [];
  emails.forEach((m) => {
    violations.push({
      type: "email",
      match: m.trim(),
      label: `Email Address: ${m.trim()}`,
    });
  });

  // Check phone numbers
  const phones = text.match(PHONE_REGEX) || [];
  phones.forEach((m) => {
    // Exclude simple small numbers or prices (e.g. 1000, 18000)
    const digitsOnly = m.replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
      violations.push({
        type: "phone",
        match: m.trim(),
        label: `Phone / Mobile Number: ${m.trim()}`,
      });
    }
  });

  // Check URLs
  const urls = text.match(URL_REGEX) || [];
  urls.forEach((m) => {
    // Avoid double counting if already captured in email
    if (!violations.some((v) => v.match.includes(m))) {
      violations.push({
        type: "url",
        match: m.trim(),
        label: `External Website / Link: ${m.trim()}`,
      });
    }
  });

  // Check Social / Messaging handles
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

  // Remove duplicates
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
  clean = clean.replace(PHONE_REGEX, (m) => {
    const digits = m.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13 ? "[PHONE REDACTED]" : m;
  });

  // Redact social handles
  clean = clean.replace(SOCIAL_REGEX, "[HANDLE REDACTED]");

  // Redact URLs
  clean = clean.replace(URL_REGEX, "[LINK REDACTED]");

  return clean;
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

  const fileSize = file.size > 1024 * 1024 
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
          const bytes = new Uint8Array(rawContent);
          // Extract printable ASCII characters from PDF stream
          const chunks = [];
          for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
              chunks.push(String.fromCharCode(b));
            } else if (chunks.length && chunks[chunks.length - 1] !== " ") {
              chunks.push(" ");
            }
          }
          textContent = chunks.join("");
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
