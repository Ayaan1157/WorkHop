import leadsSeed from "@/data/leads.json";
import jobsSeed from "@/data/jobs.json";

const CUSTOM_JOBS_KEY = "workhop_custom_jobs";
const USER_KEY = "workhop_user_data";
const APPLICATIONS_KEY = "workhop_applications";
const CHATS_KEY = "workhop_chats";

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
  }));
}

export function getLeadById(id) {
  const leads = getStoredLeads();
  return leads.find((l) => l.id === id) || leads[0];
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
    company_name: jobData.company_name,
    employer_name: jobData.employer_name || `${jobData.company_name} Lead`,
    description: jobData.description,
    bucket: jobData.bucket || "Creative",
    category: jobData.bucket || "Graphics & Design",
    area: jobData.area || "Bengaluru",
    distance_km: 0.2,
    applicants_count: 0,
    created_at: new Date().toISOString(),
    lat: 12.9716,
    lng: 77.5946,
    keywords: [jobData.title, jobData.bucket],
  };
  localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify([newJob, ...custom]));
  return newJob;
}

// 3. Catalog
export function getStoredCatalog() {
  const jobs = getStoredJobs();
  const categoryMap = {};
  
  jobs.forEach((j) => {
    const cat = j.category || "Graphics & Design";
    if (!categoryMap[cat]) categoryMap[cat] = new Set();
    if (j.title) categoryMap[cat].add(j.title.split(" ").slice(0, 3).join(" "));
  });

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

// 4. Live Map Pins
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

// 5. Auth & Sessions
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

export function createMockSession(email = "user@workhop.local") {
  const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const user = {
    id: `usr_${Math.random().toString(36).slice(2, 10)}`,
    email,
    name: name || "Verified User",
    picture: null,
    role: "user",
    created_at: new Date().toISOString(),
  };
  saveStoredUser(user);
  return {
    session_token: `token_${Math.random().toString(36).slice(2, 14)}`,
    user,
  };
}

// 6. Job Applications & Chat
export function applyToJob(jobId, freelancerId, note = "") {
  const jobs = getStoredJobs();
  const job = jobs.find((j) => j.id === jobId) || jobs[0];
  const apps = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
  
  const app = {
    id: `app-${Date.now()}`,
    job_id: jobId,
    freelancer_id: freelancerId || "freelancer-demo",
    note,
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
      status: "applied",
      updated_at: new Date().toISOString(),
      last_message: note || "Applied to gig",
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
      status: "in_review",
      updated_at: new Date().toISOString(),
      last_message: "Hi! Can you share your recent coffee brand designs?",
    },
    {
      id: "conv-demo-2",
      job_title: "Next.js E-Commerce Landing Page",
      company_name: "UrbanKrafts",
      freelancer_name: "You",
      employer_name: "Siddharth Rao",
      status: "hired",
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      last_message: "Great work on the prototype. Let's schedule the kickoff call.",
    },
  ];
}
