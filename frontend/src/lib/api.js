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
  passwordLogin,
  saveRegisteredUser,
  applyToJob,
  getStoredChats,
  getFreelancerProfile,
  saveFreelancerProfile,
  getSiteSettings,
  saveSiteSettings,
  getAdminLogs,
  addAdminGig,
  toggleBoostGig,
  deleteGigAdmin,
  getEscrowOrders,
  resolveEscrowOrder,
  ADMIN_EMAILS,
  getCreditsWallet,
  getCreditTransactions,
  purchaseCreditPack,
  subscribeToCredits,
  boostJob,
  getJobLeaderboard,
  getCreditsConfig,
  saveCreditsConfig,
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
    const u = getStoredUser();
    const isAdmin = Boolean(u?.is_admin || u?.role === "admin" || (u?.email && ADMIN_EMAILS.includes(u.email.trim().toLowerCase())));
    return { remaining: isAdmin ? 9999 : 5, total: isAdmin ? 9999 : 5, is_admin: isAdmin };
  }
  if (cleanPath.includes("/apply") && method === "POST") {
    const parts = cleanPath.split("/");
    const jobId = parts[2];
    return applyToJob(
      jobId,
      body?.freelancer_id,
      body?.note,
      body?.applicant_area,
      body?.distance_km,
      body?.boost_credits,
      body
    );
  }
  if (cleanPath.includes("/leaderboard") || (cleanPath.includes("/applications") && method === "GET")) {
    const parts = cleanPath.split("/");
    const jobId = parts[2];
    return getJobLeaderboard(jobId);
  }
  if (cleanPath.includes("/boost") && method === "POST") {
    const parts = cleanPath.split("/");
    const jobId = parts[3] || parts[2];
    return boostJob(jobId, body?.employer_id, body?.amount_paid);
  }

  // 2.5 Credits & Connects Wallet
  if (cleanPath.includes("/credits-wallet")) {
    const parts = cleanPath.split("/");
    const uid = parts[2] === "credits-wallet" ? (parts[1] || getFreelancerId()) : (parts[2] || getFreelancerId());
    return {
      wallet: getCreditsWallet(uid),
      transactions: getCreditTransactions(uid),
    };
  }
  if (cleanPath === "/credits/purchase-pack" && method === "POST") {
    return purchaseCreditPack(body?.user_id || getFreelancerId(), body?.pack_id);
  }
  if (cleanPath === "/credits/subscribe" && method === "POST") {
    return subscribeToCredits(body?.user_id || getFreelancerId(), body?.plan_id);
  }
  if (cleanPath === "/admin/credits-config") {
    if (method === "PUT" || method === "POST") {
      return saveCreditsConfig(body);
    }
    return getCreditsConfig();
  }

  // 3. Catalog & Map
  if (cleanPath === "/catalog") {
    return getStoredCatalog();
  }
  if (cleanPath === "/map/pins") {
    return getStoredMapPins();
  }

  // 4. Plans & Pricing (Job Hops + Branding)
  if (cleanPath === "/plans") {
    return [
      {
        plan_id: "single-post",
        section: "postings",
        name: "Single Post",
        price: 299,
        price_label: "₹299",
        unit: "1 Hop",
        hops: 1,
        credits: 1,
        duration_days: null,
        badge: null,
        features: ["1 job listing on the live feed (1 Hop)", "5km radius candidate matching", "Applicant inbox with direct WhatsApp/Call"],
      },
      {
        plan_id: "starter-bundle",
        section: "postings",
        name: "Starter Bundle",
        price: 999,
        price_label: "₹999",
        unit: "5 Hops",
        hops: 5,
        credits: 5,
        duration_days: null,
        badge: "SAVE 33%",
        features: ["5 job post Hops (₹200/Hop)", "Use anytime — no expiry", "Verified candidate SMS alerts", "Applicant inbox included"],
      },
      {
        plan_id: "growth-bundle",
        section: "postings",
        name: "Growth Pack",
        price: 1999,
        price_label: "₹1,999",
        unit: "12 Hops",
        hops: 12,
        credits: 12,
        duration_days: null,
        badge: "BEST VALUE · SAVE 45%",
        features: ["12 job post Hops (₹166/Hop)", "Use anytime — no expiry", "Priority applicant matching", "Direct contact unlock on 3 leads"],
      },
      {
        plan_id: "scale-bundle",
        section: "postings",
        name: "Scale Pack",
        price: 3799,
        price_label: "₹3,799",
        unit: "25 Hops",
        hops: 25,
        credits: 25,
        duration_days: null,
        badge: "PRO · SAVE 50%",
        features: ["25 job post Hops (₹152/Hop)", "Use anytime — no expiry", "Priority applicant matching", "Featured employer badge on feed"],
      },
      {
        plan_id: "premium-boost",
        section: "postings",
        name: "Premium Listing Boost",
        price: 299,
        price_label: "₹299",
        unit: "per post add-on",
        hops: 0,
        credits: 0,
        duration_days: null,
        badge: "ADD-ON",
        features: ["Featured at top of jobs feed", "Golden border with highlighted badge", "3× more freelancer views & applications"],
      },
      {
        plan_id: "brand-spotlight",
        section: "branding",
        name: "Brand Spotlight",
        price: 4999,
        price_label: "₹4,999",
        unit: "7 days",
        duration_days: 7,
        badge: null,
        features: ["Logo banner on the jobs feed", "Runs for 7 days", "Impression & click report on request"],
      },
      {
        plan_id: "classified-ad",
        section: "branding",
        name: "Classified Ad Slot",
        price: 9999,
        price_label: "₹9,999",
        unit: "30 days",
        duration_days: 30,
        badge: null,
        features: ["Dedicated classified ad slot", "Runs for 30 days", "Custom creative & call to action supported"],
      },
      {
        plan_id: "enterprise-suite",
        section: "branding",
        name: "Enterprise Branding Suite",
        price: 24999,
        price_label: "₹24,999",
        unit: "30 days",
        duration_days: 30,
        badge: "ENTERPRISE",
        features: ["Feed banner + featured company page", "Runs for 30 days", "Priority placement across whole platform", "Dedicated account support"],
      },
    ];
  }
  if (cleanPath.includes("/plans")) {
    return [
      {
        plan_id: "starter-bundle",
        plan_name: "Starter Bundle (5 Job Hops)",
        price: 999,
        expires_at: null,
        status: "active",
      },
    ];
  }

  // 5. Auth
  if (cleanPath === "/auth/mobile/request-otp") {
    const phone = body?.phone || "9876543210";
    const devOtp = String(Math.floor(100000 + Math.random() * 900000));
    return { message: "Mobile OTP sent via SMS / WhatsApp", dev_otp: devOtp, phone };
  }
  if (cleanPath === "/auth/mobile/verify-otp") {
    const email = body?.email || "user@example.com";
    const session = createMockSession(email, { ...(body || {}), phone_verified: true });
    setToken(session.session_token);
    saveStoredUser(session.user);
    return session;
  }
  if (cleanPath === "/auth/email/request-otp") {
    return { message: "Code sent", dev_otp: "123456" };
  }
  if (cleanPath === "/auth/email/verify-otp") {
    const email = body?.email || "user@example.com";
    const session = createMockSession(email, body || {});
    setToken(session.session_token);
    return session;
  }
  if (cleanPath === "/auth/login" || cleanPath === "/auth/admin-login") {
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";
    const session = passwordLogin(email, password, body?.role || "freelancer");
    setToken(session.session_token);
    saveStoredUser(session.user);
    return session;
  }
  if (cleanPath === "/auth/signup") {
    const email = body?.email || "user@example.com";
    if (body?.password) {
      saveRegisteredUser(email, body.password, body);
    }
    const session = createMockSession(email, body || {});
    setToken(session.session_token);
    saveStoredUser(session.user);
    return session;
  }
  if (cleanPath === "/auth/session") {
    const session = createMockSession("google.user@example.com", body || {});
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

  // Admin Dashboard endpoints
  if (cleanPath === "/admin/overview") {
    const jobs = getStoredJobs();
    const leads = getStoredLeads();
    return {
      users: 142,
      employers: 38,
      freelancers: leads.length || 104,
      gigs: jobs.length || 202,
      payments_paid: 29,
      revenue_rupees: 184500,
      escrow_held: 53500,
      complaints: 2,
    };
  }
  if (cleanPath === "/admin/site-settings" && method === "GET") {
    return getSiteSettings();
  }
  if (cleanPath === "/admin/site-settings" && method === "POST") {
    return saveSiteSettings(body);
  }
  if (cleanPath === "/admin/logs" && method === "GET") {
    return getAdminLogs();
  }
  if (cleanPath === "/admin/gigs" && method === "GET") {
    return getStoredJobs();
  }
  if (cleanPath === "/admin/gigs" && method === "POST") {
    return addAdminGig(body);
  }
  if (cleanPath.startsWith("/admin/gigs/") && cleanPath.endsWith("/boost") && method === "POST") {
    const jobId = cleanPath.split("/")[3];
    return toggleBoostGig(jobId);
  }
  if (cleanPath.startsWith("/admin/gigs/") && method === "DELETE") {
    const jobId = cleanPath.split("/")[3];
    return deleteGigAdmin(jobId);
  }
  if (cleanPath === "/admin/escrow" && method === "GET") {
    return getEscrowOrders();
  }
  if (cleanPath.startsWith("/admin/escrow/") && cleanPath.endsWith("/release") && method === "POST") {
    const orderId = cleanPath.split("/")[3];
    return resolveEscrowOrder(orderId, "release");
  }
  if (cleanPath.startsWith("/admin/escrow/") && cleanPath.endsWith("/refund") && method === "POST") {
    const orderId = cleanPath.split("/")[3];
    return resolveEscrowOrder(orderId, "refund");
  }
  if (cleanPath === "/admin/users") {
    return [
      { user_id: "u-admin", email: "Zenithdeveleoperss@gmail.com", name: "Zenith Developers (Admin)", role: "employer", created_at: new Date().toISOString() },
      { user_id: "u-1", email: "karthik.sharma@gmail.com", name: "Karthik Sharma", role: "freelancer", created_at: new Date().toISOString() },
      { user_id: "u-2", email: "priya.nair@craftly.in", name: "Priya Nair", role: "employer", created_at: new Date().toISOString() },
    ];
  }
  if (cleanPath === "/admin/employers") {
    return [
      { email: "priya.nair@craftly.in", name: "Priya Nair", company_name: "Craftly Studios", jobs_posted: 6, spent_rupees: 45000 },
      { email: "vikram@urbanbites.com", name: "Vikram Mehta", company_name: "Urban Bites Cafe", jobs_posted: 4, spent_rupees: 28000 },
    ];
  }
  if (cleanPath === "/admin/freelancers") {
    return getStoredLeads().map((l) => ({
      freelancer_id: l.id,
      name: l.name,
      skill: l.skill,
      email: `${l.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      phone: l.phone,
      rating: l.rating,
      approved: true,
      status: "approved",
    }));
  }
  if (cleanPath === "/admin/payments") {
    return [
      { order_id: "ord_101", amount_rupees: 999, status: "paid", created_at: "2 hours ago", user_email: "priya.nair@craftly.in", plan_name: "Starter Bundle" },
      { order_id: "ord_102", amount_rupees: 1999, status: "paid", created_at: "5 hours ago", user_email: "vikram@urbanbites.com", plan_name: "Growth Pack" },
    ];
  }
  if (cleanPath === "/admin/complaints") {
    return [
      { complaint_id: "cmp_1", user_email: "anita.j@ledgerlite.com", message: "Need clarification on milestone escrow release time.", status: "resolved", created_at: "Yesterday" },
    ];
  }
  if (cleanPath === "/admin/coupons") {
    return [
      { code: "WELCOME50", discount_percent: 50, active: true, uses: 45, max_uses: 100 },
      { code: "FLAT100", discount_rupees: 100, active: true, uses: 12, max_uses: 50 },
    ];
  }

  // 6. Freelancer Profile / Status / Quota
  if (cleanPath.includes("/quota")) {
    const u = getStoredUser();
    const isAdmin = Boolean(u?.is_admin || u?.role === "admin" || (u?.email && ADMIN_EMAILS.includes(u.email.trim().toLowerCase())));
    return {
      applies_used_today: 0,
      applies_limit_today: isAdmin ? 9999 : 3,
      quota_used: 0,
      quota_limit: isAdmin ? 9999 : 3,
      has_boost: isAdmin,
      is_admin: isAdmin,
    };
  }
  if (cleanPath.startsWith("/freelancer/") && cleanPath.endsWith("/full-profile") && method === "GET") {
    return getFreelancerProfile();
  }
  if (cleanPath.startsWith("/freelancer/") && cleanPath.endsWith("/full-profile") && method === "PUT") {
    return saveFreelancerProfile(body);
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
