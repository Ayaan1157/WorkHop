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
  const isUnlocked = localStorage.getItem("workhop_employer_unlocked") === "1";
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
  const base = jobsSeed.map((j, idx) => ({
    id: j.id || `job-${idx + 1}`,
    title: j.title,
    pay: j.pay,
    pay_label: j.pay_label || `${(j.pay || 0).toLocaleString("en-IN")}`,
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
  }));
  return [...custom, ...base];
}

export function postCustomJob(jobData) {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) || "[]");
  const newJob = {
    id: `job-custom-${Date.now()}`,
    title: jobData.title,
    pay: Number(jobData.pay) || 0,
    pay_label: `${(Number(jobData.pay) || 0).toLocaleString("en-IN")}`,
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
    lat: 12.9716,
    lng: 77.5946,
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

export function createMockSession(email = "user@workhop.local", details = {}) {
  const fallbackName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const role = details.role || localStorage.getItem("workhop_auth_role") || "freelancer";
  const phone = details.phone || localStorage.getItem("workhop_pro_phone") || "9876543210";
  const area = details.area || localStorage.getItem("workhop_user_area") || "Koramangala";
  const skill = details.skill || localStorage.getItem("workhop_pro_skill") || (role === "employer" ? "Business Owner" : "UI/UX & Brand Designer");
  const company_name = details.company_name || localStorage.getItem("workhop_company_name") || "Hyperlocal Co.";

  const user = {
    id: `usr_${Math.random().toString(36).slice(2, 10)}`,
    email,
    name: details.name || fallbackName || "Verified User",
    picture: details.picture || null,
    role: role === "employer" ? "employer" : "freelancer",
    phone: phone,
    area: area,
    skill: skill,
    company_name: company_name,
    email_verified: true,
    id_verified: true,
    portfolio_uploaded: true,
    created_at: new Date().toISOString(),
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
  const checks = [
    { key: "email", label: "Email Address Verified", completed: true, weight: 25 },
    { key: "phone", label: "Contact Phone Added", completed: !!(user?.phone || localStorage.getItem("workhop_pro_phone")), weight: 25 },
    { key: "portfolio", label: "Work Samples / Portfolio Linked", completed: true, weight: 25 },
    { key: "skill", label: "Primary Skill & Bio Defined", completed: !!(user?.skill || localStorage.getItem("workhop_pro_skill")), weight: 25 },
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

// 10. Job Applications & Chat
export function applyToJob(jobId, freelancerId, note = "", applicantArea = "Indiranagar", distKm = null) {
  const jobs = getStoredJobs();
  const job = jobs.find((j) => j.id === jobId) || jobs[0];
  const apps = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
  
  const app = {
    id: `app-${Date.now()}`,
    job_id: jobId,
    freelancer_id: freelancerId || "freelancer-demo",
    note,
    applicant_area: applicantArea || "Indiranagar",
    distance_km: distKm != null ? distKm : (job.distance_km || 1.2),
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([app, ...apps]));

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
  return { ok: true, application: app, conversation_id: convId };
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
