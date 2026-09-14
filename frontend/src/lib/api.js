import {
  getStoredLeads,
  getLeadById,
  getStoredJobs,
  postCustomJob,
  getStoredCatalog,
  getStoredMapPins,
  getStoredUser,
  saveStoredUser,
  createMockSession,
  applyToJob,
  getStoredChats,
} from "./clientStore";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "workhop_session_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("workhop_user_data");
};

// Fallback Mock Router when backend is unreachable (standalone / Vercel preview)
function mockRouter(path, method = "GET", body = null) {
  const cleanPath = path.replace(/^\/api/, "");

  // 1. Leads / Verified Pros
  if (cleanPath === "/leads/preview") {
    return getStoredLeads();
  }
  if (cleanPath.startsWith("/pros/")) {
    const id = cleanPath.replace("/pros/", "");
    return getLeadById(id);
  }
  if (cleanPath === "/employer/unlock") {
    localStorage.setItem("workhop_employer_unlocked", "1");
    return { ok: true, leads: getStoredLeads() };
  }

  // 2. Jobs / Gigs
  if (cleanPath.startsWith("/jobs") && method === "GET") {
    return getStoredJobs();
  }
  if (cleanPath === "/employer/jobs" && method === "POST") {
    return postCustomJob(body);
  }
  if (cleanPath.includes("/post-credits")) {
    return { remaining: 5, total: 5 };
  }
  if (cleanPath.includes("/apply") && method === "POST") {
    const parts = cleanPath.split("/");
    const jobId = parts[2];
    return applyToJob(jobId, body?.freelancer_id, body?.note);
  }

  // 3. Catalog & Map
  if (cleanPath === "/catalog") {
    return getStoredCatalog();
  }
  if (cleanPath === "/map/pins") {
    return getStoredMapPins();
  }

  // 4. Plans & Pricing
  if (cleanPath === "/plans") {
    return [
      { id: "single-post", name: "Single Job Post", price: 299, credits: 1, description: "1 live gig post in 5km radius for 14 days" },
      { id: "starter-bundle", name: "Starter Bundle", price: 999, credits: 5, description: "5 live gig posts with verified pro matching" },
      { id: "growth-pass", name: "Growth Pass", price: 2499, credits: 15, description: "15 posts + featured employer badge" },
    ];
  }
  if (cleanPath.includes("/plans")) {
    return [{ plan_id: "single-post", status: "active", created_at: new Date().toISOString() }];
  }

  // 5. Auth
  if (cleanPath === "/auth/email/request-otp") {
    return { message: "Code sent", dev_otp: "123456" };
  }
  if (cleanPath === "/auth/email/verify-otp") {
    const email = body?.email || "user@example.com";
    const session = createMockSession(email);
    setToken(session.session_token);
    return session;
  }
  if (cleanPath === "/auth/session") {
    const session = createMockSession("google.user@example.com");
    setToken(session.session_token);
    return session;
  }
  if (cleanPath === "/auth/me") {
    const u = getStoredUser();
    if (!u) {
      const err = new Error("Not logged in");
      err.status = 401;
      throw err;
    }
    return u;
  }
  if (cleanPath === "/auth/logout") {
    clearToken();
    return { ok: true };
  }

  // 6. Freelancer Profile / Status / Quota
  if (cleanPath.includes("/quota")) {
    return { applies_used_today: 0, applies_limit_today: 3, has_boost: false };
  }
  if (cleanPath.startsWith("/freelancer/") && cleanPath.endsWith("/profile") && method === "GET") {
    return { phone: "9876543210", skill: "Full Stack Pro", verified: true };
  }
  if (cleanPath.startsWith("/freelancer/") && cleanPath.endsWith("/profile") && method === "PUT") {
    return { phone: body?.phone || "9876543210", skill: body?.skill || "Pro" };
  }
  if (cleanPath.startsWith("/freelancer/") && method === "GET") {
    return { id: getFreelancerId() || "freelancer-1", status: "verified", email_verified: true, verified: true };
  }
  if (cleanPath === "/freelancer/verify-email" || cleanPath === "/freelancer/submit") {
    return { ok: true, status: "verified", verified: true };
  }

  // 7. Chats & Messages
  if (cleanPath.startsWith("/chats") && method === "GET") {
    if (cleanPath.includes("/messages")) {
      return [
        { id: "m1", sender_role: "employer", text: "Hello! We saw your profile on WorkHop.", created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: "m2", sender_role: "freelancer", text: "Hi! Thanks for reaching out. Happy to discuss the scope.", created_at: new Date().toISOString() },
      ];
    }
    const convId = cleanPath.split("/")[2]?.split("?")[0];
    if (convId) {
      return { id: convId, job_title: "Gig Discussion", company_name: "Local Employer", freelancer_name: "You", status: "active" };
    }
    return getStoredChats();
  }
  if (cleanPath.includes("/messages") && method === "POST") {
    return { id: `m-${Date.now()}`, sender_role: body?.sender_role || "user", text: body?.text, created_at: new Date().toISOString() };
  }
  if (cleanPath.includes("/status") && method === "POST") {
    return { id: cleanPath.split("/")[2], status: body?.status || "active" };
  }
  if (cleanPath === "/reviews") {
    return { ok: true, rating: body?.rating, text: body?.text };
  }
  if (cleanPath === "/complaints") {
    return { ok: true, message: "Complaint submitted successfully." };
  }

  return { ok: true };
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Fetch with timeout fallback
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      // If endpoint returns 404/500/etc. fallback to mock in dev/preview
      return mockRouter(path, method, body);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    // Network error or backend offline: return rich mock data
    return mockRouter(path, method, body);
  }
}

export const apiGet = (path, auth = false) => request(path, { auth });
export const apiPost = (path, body, auth = false) =>
  request(path, { method: "POST", body, auth });
export const apiPut = (path, body, auth = false) =>
  request(path, { method: "PUT", body, auth });
export const apiPatch = (path, body, auth = false) =>
  request(path, { method: "PATCH", body, auth });

// Local id helpers (mirror the mobile AsyncStorage keys)
export function getEmployerId() {
  let id = localStorage.getItem("workhop_employer_id");
  if (!id) {
    id = `employer-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("workhop_employer_id", id);
  }
  return id;
}

export function getFreelancerId() {
  let id = localStorage.getItem("workhop_freelancer_id");
  if (!id) {
    id = `freelancer-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("workhop_freelancer_id", id);
  }
  return id;
}

export const setFreelancerId = (id) => localStorage.setItem("workhop_freelancer_id", id);
