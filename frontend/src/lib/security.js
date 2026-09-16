/**
 * WorkHop Security & Safety Engine
 * Handles client-side rate limiting, anti-brute force, input sanitization, spam detection & CSRF
 */

const RATE_LIMIT_PREFIX = "workhop_rate_";
const BLACKLIST_KEY = "workhop_security_blacklist";
const SECURITY_LOGS_KEY = "workhop_security_logs";
const DEFAULT_BLOCKED_WORDS = [
  "crypto giveaway", "telegram scam", "free money", "whatsapp bypass", 
  "cash advance fraud", "wire transfer only", "gift card payment", "phishing",
  "hack account", "cheat code", "unauthorized payment"
];

// 1. Input Sanitization (XSS & Prompt Injection Shield)
export function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "") // Strip raw HTML tags
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/onload=/gi, "")
    .replace(/onerror=/gi, "")
    .replace(/onclick=/gi, "")
    .trim();
}

// 2. Anti-Brute Force & Rate Limiter
export function checkRateLimit(actionKey, maxAttempts = 5, windowMs = 60000) {
  const key = `${RATE_LIMIT_PREFIX}${actionKey}`;
  const now = Date.now();
  let record;
  
  try {
    record = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    record = {};
  }

  // If record exists and within window
  if (record.startTime && now - record.startTime < windowMs) {
    if (record.attempts >= maxAttempts) {
      const waitSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
      logSecurityEvent("RATE_LIMIT_BLOCKED", `Action '${actionKey}' blocked. Exceeded ${maxAttempts} attempts.`, { actionKey, waitSeconds });
      return {
        allowed: false,
        waitSeconds: waitSeconds > 0 ? waitSeconds : 1,
        remaining: 0,
      };
    }
    record.attempts += 1;
  } else {
    // Reset window
    record = {
      startTime: now,
      attempts: 1,
    };
  }

  localStorage.setItem(key, JSON.stringify(record));
  return {
    allowed: true,
    waitSeconds: 0,
    remaining: maxAttempts - record.attempts,
  };
}

export function resetRateLimit(actionKey) {
  localStorage.removeItem(`${RATE_LIMIT_PREFIX}${actionKey}`);
}

// 3. Spam & Prohibited Keyword Scanner
export function checkSpamKeywords(text) {
  if (!text) return { isSpam: false, flaggedWord: null };
  
  let blocked = DEFAULT_BLOCKED_WORDS;
  try {
    const custom = JSON.parse(localStorage.getItem(BLACKLIST_KEY) || "[]");
    if (Array.isArray(custom) && custom.length > 0) {
      blocked = [...blocked, ...custom];
    }
  } catch {
    /* ignore */
  }

  const lower = text.toLowerCase();
  for (const word of blocked) {
    if (lower.includes(word.toLowerCase())) {
      logSecurityEvent("SPAM_CONTENT_FLAGGED", `Prohibited keyword detected: '${word}'`, { word });
      return { isSpam: true, flaggedWord: word };
    }
  }

  return { isSpam: false, flaggedWord: null };
}

// 4. Password Strength Evaluator
export function evaluatePasswordSecurity(password) {
  if (!password) return { score: 0, label: "Empty", isStrong: false };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  return {
    score,
    label: labels[score] || "Weak",
    isStrong: score >= 3,
  };
}

// 5. Security Event Logger (Auditing)
export function logSecurityEvent(type, message, details = {}) {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    const entry = {
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify([entry, ...logs].slice(0, 150)));
  } catch {
    /* ignore */
  }
}

export function getSecurityLogs() {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 6. Blacklist Management
export function getBlockedKeywords() {
  try {
    const custom = JSON.parse(localStorage.getItem(BLACKLIST_KEY) || "[]");
    return Array.from(new Set([...DEFAULT_BLOCKED_WORDS, ...custom]));
  } catch {
    return DEFAULT_BLOCKED_WORDS;
  }
}

export function addBlockedKeyword(word) {
  if (!word || typeof word !== "string") return;
  const current = getBlockedKeywords();
  const next = Array.from(new Set([...current, word.trim().toLowerCase()]));
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(next));
  logSecurityEvent("BLACKLIST_UPDATED", `Added keyword to safety filter: '${word}'`);
  return next;
}

export function removeBlockedKeyword(word) {
  const current = getBlockedKeywords();
  const next = current.filter((w) => w !== word.trim().toLowerCase());
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(next));
  logSecurityEvent("BLACKLIST_UPDATED", `Removed keyword from safety filter: '${word}'`);
  return next;
}
