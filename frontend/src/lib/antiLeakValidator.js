/**
 * WorkHop Anti-Leak Name & Contact Information Validator
 * Enforces the strict rule: Employers must NEVER include business names, links,
 * phone numbers, emails, handles or contact details in free-text fields.
 */

// Suffixes that signify corporate entities or brand names when preceded by a proper noun
const CORPORATE_SUFFIXES = [
  "pvt ltd", "pvt. ltd", "pvt. ltd.", "private limited", "ltd", "ltd.", "llp",
  "inc", "inc.", "corp", "corp.", "enterprises", "solutions pvt"
];

// Patterns that indicate naming declarations
const BRAND_DECLARATION_PATTERNS = [
  /\b(?:we are called|called|known as|named)\s+([A-Z0-9][A-Za-z0-9'&.\s]{2,30})/i,
  /\b(?:our brand is|our company is called|our shop is called|our studio is named)\s+([A-Z0-9][A-Za-z0-9'&.\s]{2,30})/i,
  /\b(?:welcome to)\s+([A-Z0-9][A-Za-z0-9'&.\s]{2,30})/i,
];

// Normalize Unicode characters, remove zero-width chars and homoglyphs
export function normalizeLeakCheckText(text = "") {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFKD")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // strip zero-width chars
    .replace(/[_\-*~`]/g, " ") // strip markdown formatting chars
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates text against URLs, emails, phone numbers, handles, and explicit brand name declarations.
 * @param {string} text The text to inspect
 * @param {object} [context] Context of the current user to prevent self-leaks
 * @param {string} [context.userEmail] User's email
 * @param {string} [context.userName] User's display name
 * @param {string} [context.phone] User's phone number
 * @returns {{ valid: boolean, reason?: string, detectedType?: string }}
 */
export function validateNoBusinessNameOrContact(text = "", context = {}) {
  const clean = normalizeLeakCheckText(text);
  if (!clean) return { valid: true };

  const lower = clean.toLowerCase();

  // 1. URLs and Domains (including obfuscated like "google dot com", "mysite[dot]in")
  const urlRegex = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/i;
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|in|co|org|io|net|ai|app|dev|biz|info|xyz|online|me)\b/i;
  const obfuscatedDomainRegex = /\b[a-z0-9-]+\s*(?:\.|\[dot\]|\(dot\)|\s+dot\s+)\s*(?:com|in|co|org|io|net|ai|app|dev)\b/i;

  if (urlRegex.test(clean) || domainRegex.test(clean) || obfuscatedDomainRegex.test(clean)) {
    return {
      valid: false,
      detectedType: "url",
      reason: "Links, websites, and domain names are not allowed. Please describe what your business does without external URLs."
    };
  }

  // 2. Email Addresses (including spaced and obfuscated variants)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const obfuscatedEmailRegex = /\b[A-Za-z0-9._%+-]+\s*(?:@|\[at\]|\(at\)|\s+at\s+)\s*[A-Za-z0-9.-]+\s*(?:\.|\[dot\]|\s+dot\s+)\s*(?:com|in|org|net|co)\b/i;

  if (emailRegex.test(clean) || obfuscatedEmailRegex.test(clean)) {
    return {
      valid: false,
      detectedType: "email",
      reason: "Email addresses cannot be shared in public descriptions. Contact details are securely shared after hiring."
    };
  }

  // 3. Phone & WhatsApp Numbers (Indian 10-digit mobile, with or without +91 / 0)
  const strippedDigits = clean.replace(/\D/g, "");
  const phonePattern = /(?:\+91[\s-]?)?(?:[6789]\d{9}|[6789]\d{4}[\s-]?\d{5}|[6789]\d{2}[\s-]?\d{3}[\s-]?\d{4})/;
  if (phonePattern.test(clean) || strippedDigits.length >= 10) {
    const match = clean.match(/(?:(?:\+91|0)?\s*[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4})/);
    if (match || (strippedDigits.length === 10 && /^[6-9]/.test(strippedDigits))) {
      return {
        valid: false,
        detectedType: "phone",
        reason: "Phone numbers and WhatsApp numbers cannot be shared before a hire is started."
      };
    }
  }

  // 4. Social Handles (@instagram, @telegram, t.me, wa.me, etc.)
  const handleRegex = /(?:@[\w.]{3,30}|(?:t\.me|wa\.me|instagram\.com|linkedin\.com)\/[\w.]+)/i;
  if (handleRegex.test(clean)) {
    return {
      valid: false,
      detectedType: "social_handle",
      reason: "Social handles and messaging links (@username, wa.me, t.me) cannot be included in public text."
    };
  }

  // 5. Explicit Brand Declarations ("we are called X", "our shop is called X")
  for (const pattern of BRAND_DECLARATION_PATTERNS) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      return {
        valid: false,
        detectedType: "brand_name",
        reason: `It looks like you included a business name ("${candidate}"). Please describe what your business does without naming it (e.g. "a specialty coffee roastery in Koramangala").`
      };
    }
  }

  // Corporate suffix declaration check: e.g. "Acme Pvt Ltd", "XYZ LLP"
  for (const suffix of CORPORATE_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b([A-Z0-9][a-zA-Z0-9'&.-]+\\s+${suffix})\\b`, "i");
    const match = clean.match(suffixRegex);
    if (match && match[1]) {
      return {
        valid: false,
        detectedType: "brand_name",
        reason: `Please remove company suffixes like "${suffix}". Describe the type of business instead (e.g. "tech startup" or "design studio").`
      };
    }
  }

  // 6. User Account Self-Leak Check: prevent typing user's own company domain
  if (context.userEmail) {
    const parts = context.userEmail.toLowerCase().split("@");
    const domain = (parts[1] || "").split(".")[0];
    if (domain && domain.length >= 4 && !["gmail", "yahoo", "outlook", "hotmail", "workhop", "icloud"].includes(domain)) {
      if (lower.includes(domain)) {
        return {
          valid: false,
          detectedType: "user_domain_leak",
          reason: `Please do not include your business domain name ("${domain}"). Your identity remains protected until a hire.`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Generates an anonymous, compliant public label for an employer.
 * e.g. "Specialty café in Koramangala"
 */
export function generateEmployerPublicLabel(businessType = "", area = "Bengaluru", category = "") {
  const cleanType = (businessType || "").trim();
  const cleanArea = (area || "Bengaluru").trim();
  const cleanCat = (category || "").trim();

  if (cleanType && cleanArea) {
    return `${cleanType} in ${cleanArea}`;
  }
  if (cleanType) {
    return `${cleanType} in Bengaluru`;
  }
  if (cleanCat && cleanArea) {
    return `${cleanCat} Business in ${cleanArea}`;
  }
  return `Verified Business in ${cleanArea || "Bengaluru"}`;
}
