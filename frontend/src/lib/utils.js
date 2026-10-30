import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a raw phone string into a clean WhatsApp wa.me URL
 * Avoids duplicate country code (e.g. +91 91...)
 * @param {string} rawPhone - Raw phone string (e.g., "+91 72046 65071", "7204665071", "07204665071")
 * @param {string} [defaultMessage] - Optional pre-filled WhatsApp message
 * @returns {string} - Clean wa.me link
 */
export function formatWhatsAppUrl(rawPhone, defaultMessage = "") {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";

  // If phone has duplicated 91 (e.g. 91917204665071 -> 14 digits starting with 9191), strip one 91
  if (digits.length >= 14 && digits.startsWith("9191")) {
    digits = digits.slice(2);
  }

  // If 11 digits starting with 0 (e.g. 07204665071), strip the 0
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // If exactly 10 digits (standard Indian mobile number without country code), prefix with 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    // Already has standard 91 country code (e.g. 917204665071)
    // Keep as is!
  } else if (digits.length > 10 && !digits.startsWith("91")) {
    // If it has extra prefixes, take the last 10 digits and prefix with 91
    digits = `91${digits.slice(-10)}`;
  }

  const query = defaultMessage ? `?text=${encodeURIComponent(defaultMessage)}` : "";
  return `https://wa.me/${digits}${query}`;
}

/**
 * Checks whether a freelancer profile has paid the ₹299 verification fee.
 * Profiles only display the "VERIFIED PRO" badge if they have paid ₹299 for onboarding/verification.
 * Freelancers who only purchased bidding hops (e.g. ₹150 hops pack) or free signups are not verified.
 * @param {Object} pro - The freelancer object
 * @returns {boolean} - true only if verified badge fee was paid
 */
export function isVerifiedPro(pro) {
  if (!pro) return false;
  // If explicitly flagged as not verified
  if (pro.is_verified === false || pro.verified_badge === false) return false;

  const paidAmount = Number(pro.paid_amount || 0);
  const plan = typeof pro.paid_plan === "string" ? pro.paid_plan.toLowerCase() : "";

  // If the pro only purchased bidding hops (e.g. ₹150 for 20 Hops Pack), they did NOT buy the verified badge
  if (plan.includes("hops") || plan.includes("top-up")) {
    if (!plan.includes("verified") && !plan.includes("onboarding") && pro.is_verified !== true) {
      return false;
    }
  }

  // If paid amount is specified and below 299, they did NOT pay the 299 verification fee
  if (paidAmount > 0 && paidAmount < 299 && pro.is_verified !== true) {
    return false;
  }

  // If paid amount is 299 or more
  if (paidAmount >= 299) {
    return true;
  }

  // Explicit verification flag
  if (pro.is_verified === true || pro.verified_badge === true) {
    return true;
  }

  // Plan name explicitly confirms ₹299 verified badge
  if (plan.includes("299") || plan.includes("verified pro badge") || plan.includes("verified pro onboarding")) {
    return true;
  }

  return false;
}

