import leadsSeed from "@/data/leads.json";
import jobsSeed from "@/data/jobs.json";

const CUSTOM_JOBS_KEY = "workhop_custom_jobs";
const USER_KEY = "workhop_user_data";
const APPLICATIONS_KEY = "workhop_applications";
const CHATS_KEY = "workhop_chats";
const SAVED_JOBS_KEY = "workhop_saved_jobs";
const SAVED_PROS_KEY = "workhop_saved_pros";
const NOTIFICATIONS_KEY = "workhop_notifications";
const WALLET_KEY = "workhop_wallet";
const FREELANCER_PROFILE_KEY = "workhop_freelancer_profile";

// ═══════════ CONNECTS & CREDITS SYSTEM KEYS ═══════════
const CREDITS_WALLET_KEY = "workhop_credits_wallet";
const CREDITS_TRANSACTIONS_KEY = "workhop_credits_transactions";
const SUBSCRIPTIONS_KEY = "workhop_subscriptions";
const APPLICATION_BOOSTS_KEY = "workhop_application_boosts";
const JOB_BOOSTS_KEY = "workhop_job_boosts";
const CREDITS_CONFIG_KEY = "workhop_credits_config";

export const DEFAULT_CREDITS_CONFIG = {
  per_credit_rate_inr: 10,
  credit_packs: [
    { id: "pack-10", credits: 10, price_inr: 100, label: "10 Hops", discount_label: "Standard Rate", popular: false },
    { id: "pack-25", credits: 25, price_inr: 225, label: "25 Hops", discount_label: "Save 10%", popular: true },
    { id: "pack-50", credits: 50, price_inr: 400, label: "50 Hops", discount_label: "Save 20%", popular: false },
    { id: "pack-100", credits: 100, price_inr: 750, label: "100 Hops", discount_label: "Save 25% (Best Value)", popular: false },
  ],
  subscription_plans: [
    {
      id: "starter_pass",
      name: "Starter Hops Pass",
      credits_per_cycle: 30,
      price_inr: 249,
      billing_cycle: "monthly",
      badge: "STARTER",
      effective_per_credit: "₹8.30",
      features: ["30 Hops delivered monthly", "Unused Hops roll over", "Zero platform fee on gigs", "Priority applicant badge"],
    },
    {
      id: "pro_pass",
      name: "Pro Hops Pass",
      credits_per_cycle: 60,
      price_inr: 449,
      billing_cycle: "monthly",
      badge: "MOST POPULAR",
      effective_per_credit: "₹7.48",
      features: ["60 Hops delivered monthly", "Unused Hops roll over", "1 free proposal boost monthly", "Verified Pro gold badge", "Early access to high-budget gigs"],
    },
    {
      id: "power_pass",
      name: "Power Freelancer Pass",
      credits_per_cycle: 120,
      price_inr: 799,
      billing_cycle: "monthly",
      badge: "MAX SAVINGS",
      effective_per_credit: "₹6.65",
      features: ["120 Hops delivered monthly", "Unlimited rollover cap", "3 free proposal boosts monthly", "Top-tier leaderboard priority", "Direct WhatsApp employer unlocks"],
    },
  ],
  rollover_unused_credits: true,
  job_boost_price_inr: 299,
  job_boost_duration_hours: 48,
  welcome_credits: 20,
};

// Helper for masking phone numbers server-side/client-side safely
export function maskPhone(phone) {
  if (!phone) return "+91 98XXX XX000";
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 10) return "+91 98XXX XX000";
  const last10 = cleaned.slice(-10);
  return `+91 ${last10.slice(0, 2)}XXX XX${last10.slice(7)}`;
}

// 1. Leads / Verified Pros
export function getStoredLeads() {
  const currentUser = getStoredUser();
  const isAdmin = Boolean(currentUser?.is_admin || currentUser?.role === "admin" || (currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.trim().toLowerCase())));
  const isUnlocked = isAdmin || localStorage.getItem("workhop_employer_unlocked") === "1";
  return leadsSeed.map((lead, idx) => ({
    id: lead.id || `lead-${idx + 1}`,
    name: lead.name,
    initials: lead.initials || lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    skill: lead.skill,
    distance_km: lead.distance_km ?? (Math.round((0.3 + (idx % 10) * 0.4) * 10) / 10),
    rating: lead.rating ?? 4.9,
    jobs_done: lead.jobs_done ?? (30 + (idx * 7) % 150),
    phone: isUnlocked ? lead.phone : maskPhone(lead.phone),
    is_unlocked: isUnlocked,
    portfolio: lead.portfolio || `portfolio-${idx + 1}.design`,
    keywords: lead.keywords || [lead.skill],
    bucket: lead.bucket || "Creative",
    category: lead.category || lead.bucket || "Graphics & Design",
    lat: lead.lat || (12.9716 + (idx % 5 - 2) * 0.02),
    lng: lead.lng || (77.5946 + (idx % 7 - 3) * 0.02),
    rate_hr: 750 + (idx % 5) * 250,
    delivery_days: 2 + (idx % 3),
    reviews_count: 14 + (idx * 3) % 40,
    intro: `${lead.skill} based in Bengaluru with ${lead.jobs_done ?? 45}+ completed local projects. Specializing in high-turnaround verified deliveries with zero middlemen.`,
    languages: ["English", "Kannada", "Hindi"],
    verifications: {
      id: true,
      email: true,
      portfolio: true,
      phone: isUnlocked,
    },
    samples: [
      { title: "Brand Redesign 2026", type: "Visual Identity", tag: "Figma" },
      { title: "Mobile App MVP", type: "Product Design", tag: "React/Next" },
      { title: "Festive Campaign Launch", type: "Marketing Creative", tag: "Photoshop" },
    ],
  }));
}

export function getLeadById(id) {
  const leads = getStoredLeads();
  const pro = leads.find((l) => l.id === id) || leads[0];
  const reviews = [
    { reviewer_name: "Anita J. · LedgerLite", rating: 5, date: "3 days ago", text: "Delivered our 5-screen flow ahead of schedule. Flawless communication and clean design." },
    { reviewer_name: "Karan S. · BrewBlock", rating: 5, date: "1 week ago", text: "Super responsive and understands local Bengaluru market aesthetic perfectly." },
    { reviewer_name: "Siddharth R. · UrbanKrafts", rating: 4.8, date: "2 weeks ago", text: "Great quality assets, fast turnaround on revisions." },
  ];
  return { pro, reviews };
}

// 2. Gigs / Jobs
export function getStoredJobs() {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) || "[]");
  const now = new Date();
  const base = jobsSeed.map((j, idx) => {
    const pay = Number(j.pay) || 1000;
    // Requirement 1: credits_required = floor(job_budget / 1000), minimum 1 credit
    const creditsToApply = j.credits_to_apply || Math.max(1, Math.floor(pay / 1000));
    // Sample some jobs with active boosts for testing
    const sampleBoost = idx === 0 || idx === 3;
    const isBoosted = j.is_boosted !== undefined
      ? Boolean(j.is_boosted && (!j.boost_expires_at || new Date(j.boost_expires_at) > now))
      : sampleBoost;
    const boostExpiresAt = j.boost_expires_at || (sampleBoost ? new Date(Date.now() + 36 * 3600000).toISOString() : null);

    return {
      id: j.id || `job-${idx + 1}`,
      title: j.title,
      pay: pay,
      pay_label: j.pay_label || `${pay.toLocaleString("en-IN")}`,
      credits_to_apply: creditsToApply,
      is_boosted: isBoosted,
      boost_expires_at: boostExpiresAt,
      employer_name: j.employer_name || `${j.company_name || "Company"} HR`,
      company_name: j.company_name || "Hyperlocal Co.",
      description: j.description,
      category: j.category || j.bucket || "Graphics & Design",
      bucket: j.bucket || "Creative",
      area: j.area || "Bengaluru",
      distance_km: j.distance_km ?? (Math.round((0.4 + (idx % 8) * 0.3) * 10) / 10),
      posted_minutes_ago: j.posted_minutes_ago ?? (15 + (idx * 35) % 1440),
      applicants_count: j.applicants_count ?? (2 + (idx % 9)),
      employer_rating: (4.8 + (idx % 3) * 0.1).toFixed(1),
      employer_reviews: 8 + (idx % 12),
      verified_employer: true,
      created_at: j.created_at || new Date(Date.now() - (idx * 3600000 * 4)).toISOString(),
      lat: j.lat || (12.9716 + (idx % 6 - 3) * 0.015),
      lng: j.lng || (77.5946 + (idx % 5 - 2) * 0.015),
      keywords: j.keywords || [],
    };
  });

  const allJobs = [...custom, ...base];
  // Requirement 4: Boosted jobs appear higher in job listing/search results
  return allJobs.sort((a, b) => {
    const aBoost = a.is_boosted && (!a.boost_expires_at || new Date(a.boost_expires_at) > now) ? 1 : 0;
    const bBoost = b.is_boosted && (!b.boost_expires_at || new Date(b.boost_expires_at) > now) ? 1 : 0;
    if (bBoost !== aBoost) return bBoost - aBoost;
    return 0;
  });
}

export function postCustomJob(jobData) {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) || "[]");
  const pay = Number(jobData.pay) || 0;
  // Requirement 1: credits_required = floor(job_budget / 1000), minimum 1 credit
  // Store this value on the job record at creation time (credits_to_apply field), don't recompute it dynamically later.
  const creditsToApply = Math.max(1, Math.floor(pay / 1000));
  const isBoosted = Boolean(jobData.is_boosted);
  const boostExpiresAt = isBoosted ? new Date(Date.now() + 48 * 3600000).toISOString() : null;

  const newJob = {
    id: `job-custom-${Date.now()}`,
    title: jobData.title,
    pay: pay,
    pay_label: `${pay.toLocaleString("en-IN")}`,
    credits_to_apply: creditsToApply,
    is_boosted: isBoosted,
    boost_expires_at: boostExpiresAt,
    company_name: jobData.company_name,
    employer_name: jobData.employer_name || `${jobData.company_name} Lead`,
    description: jobData.description,
    bucket: jobData.bucket || "Creative",
    category: jobData.bucket || "Graphics & Design",
    area: jobData.area || "Bengaluru",
    distance_km: 0.2,
    posted_minutes_ago: 1,
    applicants_count: 0,
    employer_rating: "5.0",
    employer_reviews: 1,
    verified_employer: true,
    created_at: new Date().toISOString(),
    lat: jobData.lat || 12.9716,
    lng: jobData.lng || 77.5946,
    keywords: [jobData.title, jobData.bucket],
  };
  localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify([newJob, ...custom]));
  return newJob;
}

// 3. Bookmarking / Saved Items
export function getSavedJobIds() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_JOBS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleSaveJob(id) {
  const saved = getSavedJobIds();
  const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(next));
  return next;
}

export function getSavedProIds() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_PROS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleSavePro(id) {
  const saved = getSavedProIds();
  const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
  localStorage.setItem(SAVED_PROS_KEY, JSON.stringify(next));
  return next;
}

// 4. Catalog
export function getStoredCatalog() {
  const jobs = getStoredJobs();
  const categories = [
    { category: "Graphics & Design", subcategories: ["Logo Design", "Brand Identity", "Packaging", "Flyers & Brochures", "UI/UX Design"] },
    { category: "Programming & Tech", subcategories: ["Web Development", "React / Next.js", "Flutter & Mobile Apps", "Shopify Setup", "Bug Fixing"] },
    { category: "Digital Marketing", subcategories: ["Instagram Reels & Ads", "Google SEO", "Influencer Outreach", "Local Business Ads"] },
    { category: "Writing & Translation", subcategories: ["Content Writing", "Copywriting", "Translations", "Scriptwriting"] },
    { category: "Video & Animation", subcategories: ["Video Editing", "Reels & Shorts", "Motion Graphics", "Product Demos"] },
    { category: "AI Services", subcategories: ["ChatGPT / LLM Prompts", "AI Image Generation", "AI Automation Workflows"] },
    { category: "Music & Audio", subcategories: ["Voice Over", "Audio Mixing", "Podcast Editing", "Sound Design"] },
    { category: "Business", subcategories: ["Pitch Decks", "Financial Modeling", "Market Research", "GST & Legal Filings"] },
    { category: "Consulting", subcategories: ["Startup Strategy", "Career Coaching", "Design Consulting", "Tech Architecture"] },
  ];

  return categories.map((c) => ({
    category: c.category,
    subcategories: c.subcategories,
    count: jobs.filter((j) => (j.category || "").toLowerCase().includes(c.category.toLowerCase()) || (j.bucket || "").toLowerCase().includes(c.category.toLowerCase())).length || 5,
  }));
}

// 5. Live Map Pins
export function getStoredMapPins() {
  const leads = getStoredLeads().slice(0, 30);
  const jobs = getStoredJobs().slice(0, 30);

  const candidates = leads.map((l) => ({
    id: l.id,
    kind: "candidate",
    title: l.name,
    subtitle: `${l.skill} · ${l.distance_km}km away`,
    lat: l.lat,
    lng: l.lng,
  }));

  const employers = jobs.map((j) => ({
    id: j.id,
    kind: "employer",
    title: j.company_name,
    subtitle: `${j.title} · ₹${j.pay?.toLocaleString?.("en-IN") || j.pay}`,
    lat: j.lat,
    lng: j.lng,
  }));

  return {
    candidates,
    employers,
    center: { lat: 12.9716, lng: 77.5946 },
  };
}

// 6. Auth & Sessions
export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredUser(u) {
  if (!u) {
    localStorage.removeItem(USER_KEY);
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }
}

export const ADMIN_EMAILS = [
  "zenithdeveleoperss@gmail.com",
  "zenithdeveloperss@gmail.com",
  "manarastudio22@gmail.com",
];

const REGISTERED_USERS_KEY = "workhop_registered_users";

export function getRegisteredUsers() {
  const raw = localStorage.getItem(REGISTERED_USERS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function saveRegisteredUser(email, password, profile = {}) {
  if (!email) return;
  const users = getRegisteredUsers();
  users[email.trim().toLowerCase()] = {
    ...profile,
    email: email.trim().toLowerCase(),
    password: password || "123456",
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export function isUserAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function passwordLogin(email, password, fallbackRole = "freelancer") {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) {
    const err = new Error("Please enter your email address.");
    err.status = 400;
    throw err;
  }
  if (!password) {
    const err = new Error("Please enter your password to sign in.");
    err.status = 400;
    throw err;
  }

  // Admin check
  if (isUserAdmin(cleanEmail)) {
    if (password === "123456789") {
      const session = createMockSession(cleanEmail, {
        name: "Zenith Developers (Admin)",
        role: "employer",
        is_admin: true,
      });
      return session;
    } else {
      const err = new Error("Invalid admin password. Please try again.");
      err.status = 401;
      throw err;
    }
  }

  // Registered user check
  const regUsers = getRegisteredUsers();
  const existing = regUsers[cleanEmail];
  if (existing && existing.password && existing.password !== password) {
    const err = new Error("Incorrect password. Please check your credentials.");
    err.status = 401;
    throw err;
  }

  // Determine user's saved role: if they registered as freelancer, use freelancer!
  const actualRole = existing?.role || fallbackRole || "freelancer";

  // Save/Update registered user
  saveRegisteredUser(cleanEmail, password, {
    ...(existing || {}),
    role: actualRole,
  });

  const session = createMockSession(cleanEmail, {
    ...(existing || {}),
    role: actualRole,
  });
  return session;
}

export function createMockSession(email = "user@workhop.local", details = {}) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const regUsers = getRegisteredUsers();
  const existing = regUsers[cleanEmail] || {};

  const role = details.role || existing.role || localStorage.getItem("workhop_auth_role") || "freelancer";
  const fallbackName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const name = details.name || existing.name || fallbackName || (isUserAdmin(cleanEmail) ? "Zenith Developers (Admin)" : "Verified User");
  const phone = details.phone || existing.phone || localStorage.getItem("workhop_pro_phone") || "9876543210";
  const area = details.area || existing.area || localStorage.getItem("workhop_user_area") || "Koramangala";
  const skill = details.skill || existing.skill || localStorage.getItem("workhop_pro_skill") || (role === "employer" ? "Business Owner" : "UI/UX & Brand Designer");
  const company_name = details.company_name || existing.company_name || localStorage.getItem("workhop_company_name") || "Hyperlocal Co.";
  const isAdmin = isUserAdmin(cleanEmail) || !!details.is_admin || !!existing.is_admin;

  const user = {
    id: details.id || existing.id || `usr_${Math.random().toString(36).slice(2, 10)}`,
    email: cleanEmail,
    name: name,
    picture: details.picture || existing.picture || null,
    role: role === "employer" ? "employer" : "freelancer",
    phone: phone,
    area: area,
    skill: skill,
    company_name: company_name,
    email_verified: true,
    id_verified: true,
    portfolio_uploaded: true,
    is_admin: isAdmin,
    created_at: existing.created_at || new Date().toISOString(),
  };

  // Sync specific helper keys
  localStorage.setItem("workhop_auth_role", user.role);
  if (user.phone) localStorage.setItem("workhop_pro_phone", user.phone);
  if (user.area) localStorage.setItem("workhop_user_area", user.area);
  if (user.skill) localStorage.setItem("workhop_pro_skill", user.skill);
  if (user.company_name) localStorage.setItem("workhop_company_name", user.company_name);

  saveStoredUser(user);
  return {
    session_token: `token_${Math.random().toString(36).slice(2, 14)}`,
    user,
  };
}

// 7. Profile Completion Calculation (Upwork Pattern)
export function getProfileCompletion(user) {
  const profile = getFreelancerProfile();
  const checks = [
    { key: "email", label: "Email Address Verified", completed: true, weight: 12 },
    { key: "phone", label: "Contact Phone Added", completed: !!(user?.phone || localStorage.getItem("workhop_pro_phone")), weight: 12 },
    { key: "portfolio", label: "Work Samples / Portfolio Linked", completed: profile.portfolio.length > 0, weight: 12 },
    { key: "skill", label: "Primary Skill & Bio Defined", completed: !!(user?.skill || localStorage.getItem("workhop_pro_skill")), weight: 10 },
    { key: "employment", label: "Employment History Added", completed: profile.employment_history.length > 0, weight: 10 },
    { key: "education", label: "Education Added", completed: profile.education.length > 0, weight: 10 },
    { key: "skills", label: "Skills Listed (3+ recommended)", completed: profile.skills.length >= 3, weight: 10 },
    { key: "description", label: "Professional Bio Written", completed: !!(profile.description && profile.description.length > 20), weight: 10 },
    { key: "languages", label: "Languages Added", completed: profile.languages.length > 0, weight: 7 },
    { key: "linked", label: "Linked Accounts (GitHub/Upwork)", completed: !!(profile.github_url || profile.upwork_url), weight: 7 },
  ];
  const percentage = checks.reduce((acc, curr) => (curr.completed ? acc + curr.weight : acc), 0);
  return { percentage, checks };
}


// 8. Notifications (In-App Bell & Dropdown)
export function getStoredNotifications() {
  const raw = localStorage.getItem(NOTIFICATIONS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  const defaults = [
    {
      id: "notif-1",
      type: "message",
      title: "New message from BrewBox Cafe",
      description: "Can you review our updated packaging brief?",
      time: "10m ago",
      read: false,
      to: "/freelancer/chats",
    },
    {
      id: "notif-2",
      type: "gig",
      title: "New Gig Matched: UI/UX Redesign",
      description: "LedgerLite posted a ₹18,000 gig 0.4km away from you.",
      time: "1h ago",
      read: false,
      to: "/freelancer/jobs",
    },
    {
      id: "notif-3",
      type: "payment",
      title: "Escrow Milestone Funded · ₹7,500",
      description: "Payment safely held in WorkHop Escrow for Festive Campaign.",
      time: "3h ago",
      read: true,
      to: "/profile",
    },
  ];
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(defaults));
  return defaults;
}

export function markNotificationRead(id) {
  const notifs = getStoredNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  return notifs;
}

export function markAllNotificationsRead() {
  const notifs = getStoredNotifications().map((n) => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  return notifs;
}

// 9. Escrow Wallet & Transaction History
export function getStoredWallet() {
  const raw = localStorage.getItem(WALLET_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  const defaultWallet = {
    available_balance: 14500,
    in_escrow: 7500,
    lifetime_earnings: 48000,
    transactions: [
      { id: "tx-1", title: "Milestone Released (Fintech MVP)", type: "credit", amount: 18000, status: "completed", date: "Yesterday, 4:30 PM" },
      { id: "tx-2", title: "Escrow Holding (BrewBlock Flyers)", type: "holding", amount: 7500, status: "in_escrow", date: "12 Sep 2026" },
      { id: "tx-3", title: "Bank Withdrawal to HDFC **4812", type: "debit", amount: 15000, status: "completed", date: "08 Sep 2026" },
    ],
  };
  localStorage.setItem(WALLET_KEY, JSON.stringify(defaultWallet));
  return defaultWallet;
}

// ═══════════ CONNECTS & CREDITS SYSTEM (UPWORK-STYLE) ═══════════

export function getCreditsConfig() {
  try {
    const raw = localStorage.getItem(CREDITS_CONFIG_KEY);
    if (raw) return { ...DEFAULT_CREDITS_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_CREDITS_CONFIG;
}

export function saveCreditsConfig(newConfig) {
  const merged = { ...getCreditsConfig(), ...newConfig };
  localStorage.setItem(CREDITS_CONFIG_KEY, JSON.stringify(merged));
  return merged;
}

export function getCreditsWallet(userId) {
  const id = userId || "freelancer-demo";
  const allWallets = JSON.parse(localStorage.getItem(CREDITS_WALLET_KEY) || "{}");
  if (allWallets[id]) {
    return allWallets[id];
  }
  // Initialize with welcome credits (default 20)
  const config = getCreditsConfig();
  const initBalance = config.welcome_credits ?? 20;
  const newWallet = {
    user_id: id,
    balance: initBalance,
    subscription_status: "none", // 'none' | 'active' | 'cancelled' | 'expired'
    subscription_plan_id: null,
    subscription_renews_at: null,
    updated_at: new Date().toISOString(),
  };
  allWallets[id] = newWallet;
  localStorage.setItem(CREDITS_WALLET_KEY, JSON.stringify(allWallets));

  // Record initial welcome bonus transaction
  if (initBalance > 0) {
    addCreditTransaction(id, {
      type: "bonus",
      amount: initBalance,
      balance_after: initBalance,
      description: "Welcome Gift: 20 Free Bidding Hops",
    });
  }
  return newWallet;
}

export function getCreditTransactions(userId) {
  const id = userId || "freelancer-demo";
  const allTx = JSON.parse(localStorage.getItem(CREDITS_TRANSACTIONS_KEY) || "{}");
  return allTx[id] || [];
}

export function addCreditTransaction(userId, { type, amount, related_job_id, job_title, description, balance_after }) {
  const id = userId || "freelancer-demo";
  const allTx = JSON.parse(localStorage.getItem(CREDITS_TRANSACTIONS_KEY) || "{}");
  const userTx = allTx[id] || [];

  const tx = {
    id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: id,
    type: type || "spend", // 'purchase' | 'subscription' | 'spend' | 'boost' | 'bonus' | 'refund'
    amount: Number(amount) || 0,
    balance_after: balance_after !== undefined ? balance_after : 0,
    related_job_id: related_job_id || null,
    job_title: job_title || null,
    description: description || "Hops transaction",
    created_at: new Date().toISOString(),
  };

  allTx[id] = [tx, ...userTx];
  localStorage.setItem(CREDITS_TRANSACTIONS_KEY, JSON.stringify(allTx));
  return tx;
}

export function addCredits(userId, amount, { type = "purchase", related_job_id, job_title, description } = {}) {
  const id = userId || "freelancer-demo";
  const allWallets = JSON.parse(localStorage.getItem(CREDITS_WALLET_KEY) || "{}");
  const wallet = getCreditsWallet(id);
  const newBalance = wallet.balance + amount;

  wallet.balance = newBalance;
  wallet.updated_at = new Date().toISOString();
  allWallets[id] = wallet;
  localStorage.setItem(CREDITS_WALLET_KEY, JSON.stringify(allWallets));

  addCreditTransaction(id, {
    type,
    amount: +amount,
    balance_after: newBalance,
    related_job_id,
    job_title,
    description: description || `Added ${amount} Hops`,
  });

  return wallet;
}

export function deductCredits(userId, amount, { type = "spend", related_job_id, job_title, description } = {}) {
  const id = userId || "freelancer-demo";
  const allWallets = JSON.parse(localStorage.getItem(CREDITS_WALLET_KEY) || "{}");
  const wallet = getCreditsWallet(id);

  if (wallet.balance < amount) {
    const err = new Error(`Insufficient credits. Required: ${amount}, Available: ${wallet.balance}`);
    err.code = "INSUFFICIENT_CREDITS";
    err.status = 402;
    err.required = amount;
    err.balance = wallet.balance;
    throw err;
  }

  const newBalance = wallet.balance - amount;
  wallet.balance = newBalance;
  wallet.updated_at = new Date().toISOString();
  allWallets[id] = wallet;
  localStorage.setItem(CREDITS_WALLET_KEY, JSON.stringify(allWallets));

  addCreditTransaction(id, {
    type,
    amount: -amount,
    balance_after: newBalance,
    related_job_id,
    job_title,
    description: description || `Spent ${amount} Hops`,
  });

  return wallet;
}

// 2. Top-Up Packs & Subscriptions
export function purchaseCreditPack(userId, packId) {
  const config = getCreditsConfig();
  const pack = config.credit_packs.find((p) => p.id === packId) || config.credit_packs[1];
  return addCredits(userId, pack.credits, {
    type: "purchase",
    description: `Purchased ${pack.label} (₹${pack.price_inr})`,
  });
}

export function subscribeToCredits(userId, planId) {
  const id = userId || "freelancer-demo";
  const config = getCreditsConfig();
  const plan = config.subscription_plans.find((p) => p.id === planId) || config.subscription_plans[1];

  const allWallets = JSON.parse(localStorage.getItem(CREDITS_WALLET_KEY) || "{}");
  const wallet = getCreditsWallet(id);

  // Rollover / Expiry rule check
  const renewsAt = new Date(Date.now() + 30 * 24 * 3600000).toISOString();
  wallet.subscription_status = "active";
  wallet.subscription_plan_id = plan.id;
  wallet.subscription_renews_at = renewsAt;

  // Add subscription credit bundle
  wallet.balance += plan.credits_per_cycle;
  wallet.updated_at = new Date().toISOString();
  allWallets[id] = wallet;
  localStorage.setItem(CREDITS_WALLET_KEY, JSON.stringify(allWallets));

  // Save subscription record
  const allSubs = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || "[]");
  allSubs.unshift({
    id: `sub-${Date.now()}`,
    user_id: id,
    plan_id: plan.id,
    plan_name: plan.name,
    credits_per_cycle: plan.credits_per_cycle,
    price_inr: plan.price_inr,
    status: "active",
    renews_at: renewsAt,
    created_at: new Date().toISOString(),
    rollover_enabled: config.rollover_unused_credits,
  });
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(allSubs));

  addCreditTransaction(id, {
    type: "subscription",
    amount: plan.credits_per_cycle,
    balance_after: wallet.balance,
    description: `Subscribed to ${plan.name} (+${plan.credits_per_cycle} credits, ₹${plan.price_inr}/mo)`,
  });

  return wallet;
}

// 3. Employer Job Boosting
export function boostJob(jobId, employerId, amountPaid = 299) {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) || "[]");
  const config = getCreditsConfig();
  const durationHours = config.job_boost_duration_hours || 48;
  const expiresAt = new Date(Date.now() + durationHours * 3600000).toISOString();

  let found = false;
  const updatedCustom = custom.map((j) => {
    if (j.id === jobId) {
      found = true;
      return { ...j, is_boosted: true, boost_expires_at: expiresAt };
    }
    return j;
  });

  if (found) {
    localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify(updatedCustom));
  }

  // Record job boost
  const allJobBoosts = JSON.parse(localStorage.getItem(JOB_BOOSTS_KEY) || "[]");
  allJobBoosts.push({
    id: `jboost-${Date.now()}`,
    job_id: jobId,
    boosted_by: employerId || "employer-demo",
    amount_paid: amountPaid,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(JOB_BOOSTS_KEY, JSON.stringify(allJobBoosts));

  return { ok: true, is_boosted: true, boost_expires_at: expiresAt };
}

// 4. Job Leaderboard (Upwork-style ranking of boosted applications)
export function getJobLeaderboard(jobId) {
  const apps = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
  const jobApps = apps.filter((a) => a.job_id === jobId);

  // Pre-seed sample applicants if none exist so leaderboard is visually demonstrable
  const defaultSeeds = [
    {
      id: `seed-app-1-${jobId}`,
      freelancer_id: "pro-karthik",
      freelancer_name: "Karthik Raja",
      freelancer_skill: "UI/UX & React Specialist",
      rating: 4.9,
      note: "Specialized in responsive interfaces with immediate availability.",
      boost_credits: 6,
      applied_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: `seed-app-2-${jobId}`,
      freelancer_id: "pro-sneha",
      freelancer_name: "Sneha Rao",
      freelancer_skill: "Full-Stack Dev",
      rating: 5.0,
      note: "Experienced in hyperlocal gig marketplaces and quick turnarounds.",
      boost_credits: 4,
      applied_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: `seed-app-3-${jobId}`,
      freelancer_id: "pro-rahul",
      freelancer_name: "Rahul Verma",
      freelancer_skill: "Creative Designer",
      rating: 4.8,
      note: "Local Bengaluru resident in Indiranagar. Fast delivery.",
      boost_credits: 0,
      applied_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ];

  const merged = [...jobApps];
  for (const s of defaultSeeds) {
    if (!merged.some((m) => m.freelancer_id === s.freelancer_id)) {
      merged.push(s);
    }
  }

  // Requirement 3: "show a leaderboard ranking applicants by boost amount, with the top 3 boosted applicants highlighted/pinned at the top — similar to Upwork's 'featured proposals'. Ties should break by application timestamp (earliest first)."
  merged.sort((a, b) => {
    const boostA = a.boost_credits || 0;
    const boostB = b.boost_credits || 0;
    if (boostB !== boostA) return boostB - boostA; // Higher boost first
    // Earliest timestamp first
    const timeA = new Date(a.applied_at || a.created_at || 0).getTime();
    const timeB = new Date(b.applied_at || b.created_at || 0).getTime();
    return timeA - timeB;
  });

  return merged.map((app, index) => ({
    ...app,
    rank: index + 1,
    is_top_boosted: index < 3 && (app.boost_credits || 0) > 0,
  }));
}

// 10. Job Applications & Chat (Credit-Deducted & Boosted)
export function applyToJob(
  jobId,
  freelancerId,
  note = "",
  applicantArea = "Indiranagar",
  distKm = null,
  boostCredits = 0,
  extra = {}
) {
  const jobs = getStoredJobs();
  const job = jobs.find((j) => j.id === jobId) || jobs[0];
  const boost = Math.max(0, parseInt(boostCredits, 10) || 0);
  const baseCost = job.credits_to_apply || Math.max(1, Math.floor((job.pay || 1000) / 1000));
  const totalCost = baseCost + boost;

  const fId = freelancerId || "freelancer-demo";
  const wallet = getCreditsWallet(fId);

  // Requirement 1: Block application if balance is insufficient
  if (wallet.balance < totalCost) {
    const err = new Error(
      `Insufficient credits. This job requires ${totalCost} credits (base: ${baseCost}${boost > 0 ? `, boost: ${boost}` : ""}), but your wallet balance is only ${wallet.balance} credits.`
    );
    err.code = "INSUFFICIENT_CREDITS";
    err.status = 402;
    err.balance = wallet.balance;
    err.required = totalCost;
    throw err;
  }

  // Deduct credits from wallet
  deductCredits(fId, totalCost, {
    type: boost > 0 ? "boost" : "spend",
    related_job_id: job.id,
    job_title: job.title,
    description: boost > 0
      ? `Applied to "${job.title}" (${baseCost} base + ${boost} boost credits)`
      : `Applied to "${job.title}" (${baseCost} credits)`,
  });

  const apps = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
  const appId = `app-${Date.now()}`;
  const appliedAt = new Date().toISOString();

  const proposedRateType = extra?.proposed_rate_type || extra?.proposedRateType || "fixed";
  const proposedQuote = extra?.proposed_quote != null ? extra.proposed_quote : (extra?.proposedQuote != null ? extra.proposedQuote : job.pay);

  const app = {
    id: appId,
    application_id: appId,
    job_id: jobId,
    freelancer_id: fId,
    note,
    boost_credits: boost,
    applicant_area: applicantArea || "Indiranagar",
    distance_km: distKm != null ? distKm : (job.distance_km || 1.2),
    proposed_rate_type: proposedRateType,
    proposed_quote: proposedQuote,
    pdf_attachment: extra?.pdf_attachment || extra?.pdfAttachment || null,
    portfolio_items: extra?.portfolio_items || extra?.portfolioItems || [],
    scan_status: "verified_clean",
    created_at: appliedAt,
    applied_at: appliedAt,
  };
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([app, ...apps]));

  // Record application boost if extra credits paid
  if (boost > 0) {
    const appBoosts = JSON.parse(localStorage.getItem(APPLICATION_BOOSTS_KEY) || "[]");
    appBoosts.push({
      id: `aboost-${Date.now()}`,
      application_id: appId,
      freelancer_id: fId,
      job_id: jobId,
      credits_spent: boost,
      created_at: appliedAt,
    });
    localStorage.setItem(APPLICATION_BOOSTS_KEY, JSON.stringify(appBoosts));
  }

  // Create chat conversation
  const chats = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
  const convId = `conv-${job.id}`;
  let conv = chats.find((c) => c.id === convId);
  if (!conv) {
    conv = {
      id: convId,
      job_id: job.id,
      job_title: job.title,
      company_name: job.company_name,
      freelancer_name: "You",
      employer_name: job.employer_name,
      applicant_area: applicantArea || "Indiranagar",
      job_area: job.area || "Bengaluru",
      distance_km: distKm != null ? distKm : (job.distance_km || 1.2),
      status: "applied",
      milestone_step: 2, // Applied
      updated_at: new Date().toISOString(),
      last_message: note || `Applied from ${applicantArea || "Indiranagar"} (${distKm != null ? distKm : 1.2} km away)`,
    };
    localStorage.setItem(CHATS_KEY, JSON.stringify([conv, ...chats]));
  }

  const updatedWallet = getCreditsWallet(fId);
  return {
    ok: true,
    application: app,
    conversation_id: convId,
    credits_spent: totalCost,
    remaining_balance: updatedWallet.balance,
  };
}

export function getStoredChats() {
  const chats = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
  if (chats.length > 0) return chats;
  return [
    {
      id: "conv-demo-1",
      job_title: "Brand Logo & Style Guide",
      company_name: "BrewBox Cafe",
      freelancer_name: "You",
      employer_name: "Anita Joshi",
      status: "hired",
      milestone_step: 3, // Hired
      updated_at: new Date().toISOString(),
      last_message: "Hi! Can you share your recent coffee brand designs?",
    },
    {
      id: "conv-demo-2",
      job_title: "Next.js E-Commerce Landing Page",
      company_name: "UrbanKrafts",
      freelancer_name: "You",
      employer_name: "Siddharth Rao",
      status: "completed",
      milestone_step: 6, // Completed
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      last_message: "Great work on the prototype. Let's schedule the kickoff call.",
    },
  ];
}

// 11. Full Freelancer Profile (Upwork-style)
export function getDefaultFreelancerProfile() {
  return {
    // Header
    title: "",
    rate_hr: 0,
    description: "",

    // Employment History
    employment_history: [],

    // Certifications
    certifications: [],

    // Skills
    skills: [],

    // Portfolio
    portfolio: [],

    // Education
    education: [],

    // Languages
    languages: [],

    // Linked Accounts
    github_url: "",
    github_username: "",
    upwork_url: "",

    // Availability
    hours_per_week: "More than 30 hrs/week",
    availability: "Open to contract to hire",
  };
}

export function getFreelancerProfile() {
  const raw = localStorage.getItem(FREELANCER_PROFILE_KEY);
  if (raw) {
    try {
      return { ...getDefaultFreelancerProfile(), ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
  }
  return getDefaultFreelancerProfile();
}

export function saveFreelancerProfile(profile) {
  localStorage.setItem(FREELANCER_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

// 12. Site Settings & Broadcast Banner
const SITE_SETTINGS_KEY = "workhop_site_settings";
const ADMIN_LOGS_KEY = "workhop_admin_logs";
const ESCROW_ORDERS_KEY = "workhop_escrow_orders";

export function getDefaultSiteSettings() {
  return {
    broadcast_banner_active: true,
    broadcast_banner_text: "⚡ Bengaluru Hyperlocal Live: Verified local creators & engineers available within 5km!",
    broadcast_banner_tone: "brand", // "brand" | "green" | "black" | "alert"
    broadcast_banner_link: "/freelancer/jobs",
    broadcast_banner_cta: "EXPLORE GIGS",
    maintenance_mode: false,
    maintenance_message: "WorkHop is performing a scheduled infrastructure upgrade. We'll be back shortly.",
    onboarding_fee: 99,
    lead_unlock_fee: 199,
    quota_boost_fee: 149,
    auto_approve_pros: false,
    direct_chat_enabled: true,
  };
}

export function getSiteSettings() {
  const raw = localStorage.getItem(SITE_SETTINGS_KEY);
  if (raw) {
    try { return { ...getDefaultSiteSettings(), ...JSON.parse(raw) }; } catch { /* ignore */ }
  }
  return getDefaultSiteSettings();
}

export function saveSiteSettings(updates) {
  const current = getSiteSettings();
  const next = { ...current, ...updates };
  localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(next));
  addAdminLog("UPDATED_SITE_SETTINGS", "Site configuration and broadcast banner updated");
  return next;
}

// 13. Audit Logs
export function getAdminLogs() {
  const raw = localStorage.getItem(ADMIN_LOGS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  return [
    { id: "log-1", action: "SYSTEM_INITIALIZED", details: "Admin command center initialized", admin: "Zenith Developers", timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: "log-2", action: "SECURITY_SYNC", details: "Updated admin access credentials and session token", admin: "Zenith Developers", timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: "log-3", action: "COUPON_CREATED", details: "Generated WELCOME50 promotion for ₹99 onboarding", admin: "Zenith Developers", timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  ];
}

export function addAdminLog(action, details, target = null) {
  const logs = getAdminLogs();
  const newLog = {
    id: `log-${Date.now()}`,
    action,
    details,
    target,
    admin: "Zenith Developers (Admin)",
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 100)));
  return newLog;
}

// 14. Admin Gig Moderation
export function toggleBoostGig(jobId) {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) || "[]");
  let found = false;
  const updatedCustom = custom.map((j) => {
    if (j.id === jobId) {
      found = true;
      return { ...j, is_boosted: !j.is_boosted, boosted_at: new Date().toISOString() };
    }
    return j;
  });
  if (found) {
    localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify(updatedCustom));
  } else {
    // If it's a seed job, add an override
    const allJobs = getStoredJobs();
    const job = allJobs.find((j) => j.id === jobId);
    if (job) {
      const newJob = { ...job, is_boosted: !job.is_boosted, boosted_at: new Date().toISOString() };
      localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify([newJob, ...custom]));
    }
  }
  addAdminLog("GIG_BOOST_TOGGLED", `Boost status toggled for gig ID ${jobId}`, jobId);
  return { ok: true, jobId };
}

export function deleteGigAdmin(jobId) {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) || "[]");
  const filtered = custom.filter((j) => j.id !== jobId);
  localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify(filtered));
  addAdminLog("GIG_DELETED", `Removed gig listing ID ${jobId}`, jobId);
  return { ok: true, jobId };
}

export function addAdminGig(jobData) {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) || "[]");
  const newJob = {
    id: `job-admin-${Date.now()}`,
    title: jobData.title,
    pay: Number(jobData.pay) || 15000,
    pay_label: `₹${(Number(jobData.pay) || 15000).toLocaleString("en-IN")}`,
    employer_name: jobData.employer_name || "WorkHop Verified Partner",
    company_name: jobData.company_name || "Featured Employer",
    description: jobData.description || "High-priority gig curated directly by WorkHop administrators.",
    category: jobData.category || "Programming & Tech",
    bucket: jobData.category || "Programming & Tech",
    area: jobData.area || "Indiranagar",
    distance_km: 0.5,
    posted_minutes_ago: 1,
    applicants_count: 0,
    employer_rating: "5.0",
    employer_reviews: 24,
    verified_employer: true,
    is_featured: true,
    is_boosted: true,
    created_at: new Date().toISOString(),
    lat: 12.9716,
    lng: 77.5946,
    keywords: [jobData.category || "General", "Verified"],
  };
  localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify([newJob, ...custom]));
  addAdminLog("GIG_CREATED_BY_ADMIN", `Posted official featured gig: "${newJob.title}"`, newJob.id);
  return newJob;
}

// 15. Escrow & Disputes
export function getEscrowOrders() {
  const raw = localStorage.getItem(ESCROW_ORDERS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  return [
    {
      order_id: "esc_9901",
      job_title: "Brand Logo & Packaging Identity",
      freelancer_name: "Karthik Sharma",
      freelancer_email: "karthik.sharma@gmail.com",
      employer_name: "Anita J. · BrewBox Cafe",
      employer_email: "anita.j@ledgerlite.com",
      amount_rupees: 18500,
      status: "held_in_escrow",
      milestone: "Final Packaging Assets Delivery",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      dispute_reason: null,
    },
    {
      order_id: "esc_9902",
      job_title: "React / Tailwind SaaS Dashboard Redesign",
      freelancer_name: "Priya Nair",
      freelancer_email: "priya.nair@craftly.in",
      employer_name: "Vikram Mehta · Urban Bites",
      employer_email: "vikram@urbanbites.com",
      amount_rupees: 35000,
      status: "under_review",
      milestone: "Responsive Mobile Breakpoints",
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      dispute_reason: "Client requested minor revision before final sign-off.",
    },
    {
      order_id: "esc_9903",
      job_title: "Product Video Reels & Social Cut",
      freelancer_name: "Rohan V.",
      freelancer_email: "rohan.v@gmail.com",
      employer_name: "Studio Luxe",
      employer_email: "contact@studioluxe.in",
      amount_rupees: 12000,
      status: "released",
      milestone: "Full 4K Video Exports Released",
      created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
      dispute_reason: null,
    },
  ];
}

export function resolveEscrowOrder(orderId, action) {
  const orders = getEscrowOrders();
  const updated = orders.map((o) => {
    if (o.order_id === orderId) {
      return {
        ...o,
        status: action === "release" ? "released" : action === "refund" ? "refunded" : "held_in_escrow",
        resolved_at: new Date().toISOString(),
        resolved_by: "Zenith Developers (Admin)",
      };
    }
    return o;
  });
  localStorage.setItem(ESCROW_ORDERS_KEY, JSON.stringify(updated));
  addAdminLog(action === "release" ? "ESCROW_FORCE_RELEASED" : "ESCROW_REFUNDED", `Escrow Order ${orderId} marked as ${action === "release" ? "RELEASED to Freelancer" : "REFUNDED to Client"}`, orderId);
  return { ok: true, orderId, action };
}

