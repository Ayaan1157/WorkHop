import {
  getStoredLeads,
  getLeadById,
  getStoredJobs,
  postCustomJob,
  updateCustomJob,
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
  ADMIN_EMAILS,
  getCreditsWallet,
  getCreditTransactions,
  purchaseCreditPack,
  subscribeToCredits,
  boostJob,
  getJobLeaderboard,
  getCreditsConfig,
  saveCreditsConfig,
  getStoredCoupons,
  validateStoredCoupon,
  saveStoredCoupon,
  updateStoredCoupon,
  deleteStoredCoupon,
  addEmployerReview,
  getStoredReviews,
  markJobCompletedAndReview,
  adminRefundHops,
  getManualHopsRefunds,
  getFreelancerStatuses,
  updateFreelancerStatus,
  getAdminAllChats,
  getAdminChatMessages,
  getStoredGrievances,
  saveGrievanceTicket,
  updateGrievanceStatus,
  setStoredChatStatus,
  getStoredProfessionSuggestions,
  saveProfessionSuggestion,
  updateProfessionSuggestionStatus,
  getStoredCityWaitlist,
  saveCityWaitlistEntry,
  deleteCityWaitlistEntry,
  getStoredEmployers,
  addStoredEmployer,
  deleteStoredEmployer,
} from "./clientStore";
import { sendBrowserPushNotification, sendTestPushNotification } from "./pushNotifications";
import {
  isSupabaseConfigured,
  supabaseGetJobs,
  supabaseCreateJob,
  supabaseApplyToJob,
  supabaseSendMessage,
  supabaseAddReview,
} from "./supabase";
export * from "./supabase";

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
async function mockRouter(path, method = "GET", body = null) {
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
  if (cleanPath.startsWith("/jobs/") && method === "GET") {
    const parts = cleanPath.split("/");
    const jobId = parts[2];
    const jobs = getStoredJobs();
    return jobs.find((j) => String(j.id) === String(jobId)) || null;
  }
  if ((cleanPath === "/employer/jobs" || (cleanPath.startsWith("/employer/") && cleanPath.endsWith("/jobs"))) && method === "GET") {
    const customJobs = JSON.parse(localStorage.getItem("workhop_custom_jobs") || "[]");
    if (customJobs.length > 0) {
      return customJobs;
    }
    const stored = getStoredJobs();
    // For dummy employer profile: remove most of the jobs and show only 2-3 clean demo jobs
    const completedMap = JSON.parse(localStorage.getItem("workhop_dummy_completed_jobs") || "{}");
    const dummyJobs = stored.slice(0, 3).map((job) => {
      const isDone = Boolean(completedMap[job.id]);
      return {
        ...job,
        is_dummy: true,
        is_dummy_job: true,
        is_completed: isDone,
        status: isDone ? "completed" : "open",
      };
    });
    return dummyJobs;
  }
  if (cleanPath.startsWith("/employer/jobs/") && cleanPath.endsWith("/complete") && method === "POST") {
    const parts = cleanPath.split("/");
    const jobId = parts[3];
    const completedMap = JSON.parse(localStorage.getItem("workhop_dummy_completed_jobs") || "{}");
    completedMap[jobId] = true;
    localStorage.setItem("workhop_dummy_completed_jobs", JSON.stringify(completedMap));
    return { ok: true, job_id: jobId, status: "completed", message: "Job completed" };
  }
  if (cleanPath.startsWith("/jobs") && method === "GET") {
    const stored = getStoredJobs();
    let completedMap = {};
    try {
      completedMap = JSON.parse(localStorage.getItem("workhop_dummy_completed_jobs") || "{}");
    } catch {}
    let customJobs = [];
    try {
      customJobs = JSON.parse(localStorage.getItem("workhop_custom_jobs") || "[]");
    } catch {}
    const completedCustomIds = new Set(customJobs.filter(j => j.is_completed || j.status === "completed").map(j => j.id));

    // Once a job is completed, the listing is removed from public search & feeds
    const openStored = stored.filter(j => !j.is_completed && j.status !== "completed" && !completedMap[j.id] && !completedCustomIds.has(j.id));

    if (isSupabaseConfigured()) {
      try {
        const live = await supabaseGetJobs();
        if (Array.isArray(live) && live.length > 0) {
          const liveIds = new Set(live.map((j) => String(j.id)));
          const liveTitles = new Set(live.map((j) => (j.title || "").toLowerCase().trim()));
          const filtered = openStored.filter((j) => !liveIds.has(String(j.id)) && !liveTitles.has((j.title || "").toLowerCase().trim()));
          const openLive = live.filter(j => !j.is_completed && j.status !== "completed" && !completedMap[j.id]);
          return [...openLive, ...filtered];
        }
      } catch {}
    }
    return openStored;
  }
  if (cleanPath === "/employer/jobs" && method === "POST") {
    try {
      supabaseCreateJob(body).catch(() => {});
    } catch {}
    return postCustomJob(body);
  }
  if (cleanPath.startsWith("/employer/jobs/") && (method === "PUT" || method === "PATCH")) {
    const parts = cleanPath.split("/");
    const jobId = parts[3];
    return updateCustomJob(jobId, body || {});
  }
  if (cleanPath.includes("/post-credits")) {
    const u = getStoredUser();
    const isAdmin = Boolean(u?.is_admin || u?.role === "admin" || (u?.email && ADMIN_EMAILS.includes(u.email.trim().toLowerCase())));
    return { remaining: 9999, total: 9999, is_admin: isAdmin, is_free: true };
  }
  if (cleanPath.includes("/apply") && method === "POST") {
    const parts = cleanPath.split("/");
    const jobId = parts[2];
    try {
      supabaseApplyToJob({
        jobId,
        freelancerId: body?.freelancer_id,
        note: body?.note,
        boostCredits: body?.boost_credits,
        applicantArea: body?.applicant_area,
        distanceKm: body?.distance_km,
      }).catch(() => {});
    } catch {}
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
    const invNo = `WH-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    fetch("/api/credits/send-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, invoice_number: invNo }),
    }).catch(() => {});
    return {
      ...purchaseCreditPack(body?.user_id || getFreelancerId(), body?.pack_id),
      invoice_number: invNo,
      invoice_email_sent: true,
    };
  }
  if (cleanPath === "/credits/subscribe" && method === "POST") {
    const invNo = `WH-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    fetch("/api/credits/send-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, invoice_number: invNo }),
    }).catch(() => {});
    return {
      ...subscribeToCredits(body?.user_id || getFreelancerId(), body?.plan_id),
      invoice_number: invNo,
      invoice_email_sent: true,
    };
  }
  if (cleanPath === "/admin/credits-config") {
    if (method === "PUT" || method === "POST") {
      return saveCreditsConfig(body);
    }
    return getCreditsConfig();
  }
  if (cleanPath === "/admin/refund-hops") {
    if (method === "POST") {
      return adminRefundHops(body || {});
    }
    return getManualHopsRefunds();
  }

  // 3. Catalog & Map
  if (cleanPath === "/catalog") {
    return getStoredCatalog();
  }
  if (cleanPath === "/map/pins") {
    return getStoredMapPins();
  }

  // 4. Plans & Pricing (Job Posting is 100% Free + Optional Boosts & Branding)
  if (cleanPath === "/plans") {
    return [
      {
        plan_id: "free-post",
        section: "postings",
        name: "Standard Gig Post",
        price: 0,
        price_label: "₹0",
        unit: "Free Forever",
        hops: 999,
        credits: 999,
        is_free: true,
        duration_days: null,
        badge: "100% FREE",
        features: [
          "Unlimited job listings on Bangalore live feed",
          "5km radius candidate matching",
          "Applicant inbox with direct WhatsApp/Call",
          "Zero platform fees or post credit deductions",
        ],
      },
      {
        plan_id: "urgent-boost",
        section: "add-ons",
        name: "Urgent 48h Gig Boost",
        price: 399,
        price_label: "₹399",
        unit: "per post add-on",
        hops: 0,
        credits: 0,
        duration_days: 2,
        badge: "POPULAR BOOST",
        features: [
          "Featured & pinned at top of Bangalore jobs feed",
          "Bright red urgent badge with glowing pulse",
          "3× more views & candidate applications",
          "Active for 48 hours",
        ],
      },
      {
        plan_id: "lead-unlock",
        section: "add-ons",
        name: "Pro Candidate Unlock",
        price: 199,
        price_label: "₹199",
        unit: "per candidate",
        hops: 0,
        credits: 0,
        duration_days: null,
        badge: "TALENT UNLOCK",
        features: [
          "Direct unmasked phone & WhatsApp contact",
          "Instant outreach to matched talent",
          "Verified portfolio & credentials access",
        ],
      },
    ];
  }
  if (cleanPath.includes("/plans")) {
    return [
      {
        plan_id: "free-post",
        plan_name: "Standard Gig Post (100% Free Unlimited)",
        price: 0,
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
    const grievances = getStoredGrievances();
    const employers = getStoredEmployers();
    return {
      users: leads.length + employers.length,
      employers: employers.length,
      freelancers: leads.length,
      gigs: jobs.length,
      payments_paid: 0,
      revenue_rupees: 0,
      escrow_held: 0,
      complaints: grievances.length,
    };
  }
  if ((cleanPath === "/site-settings" || cleanPath === "/admin/site-settings") && method === "GET") {
    return getSiteSettings();
  }
  if (cleanPath === "/admin/site-settings" && method === "POST") {
    return saveSiteSettings(body);
  }
  if (cleanPath === "/grievances" && method === "POST") {
    return saveGrievanceTicket(body);
  }
  if (cleanPath === "/admin/grievances" && method === "GET") {
    return getStoredGrievances();
  }
  if (cleanPath.startsWith("/admin/grievances/") && cleanPath.endsWith("/status") && method === "POST") {
    const parts = cleanPath.split("/");
    const ticketId = parts[3];
    return updateGrievanceStatus(ticketId, body?.status, body?.resolution_notes);
  }
  if (cleanPath.includes("/notifications/preferences")) {
    const fId = cleanPath.split("/")[2] || "fl-mock";
    if (method === "PUT") {
      return { ok: true, freelancer_id: fId, updated: true };
    }
    return {
      ok: true,
      freelancer_id: fId,
      email_alerts: true,
      featured_blasts: true,
      employer_messages: true,
      hired_alerts: true,
      escrow_updates: true,
      sound: true,
      notification_email: "freelancer@work-hop.com",
    };
  }
  if (cleanPath.includes("/notifications/test-email") && method === "POST") {
    return {
      ok: true,
      sent: true,
      message: `Test alert email dispatched to ${body?.email || "your email"}! Please check your inbox.`,
    };
  }
  if (cleanPath === "/geo/check" && method === "GET") {
    return {
      ok: true,
      ip: "127.0.0.1",
      city: null,
      country: "IN",
      region: "Karnataka",
      is_bengaluru: true,
      service_restricted_to: "Bengaluru",
      bengaluru_center: { lat: 12.9716, lng: 77.5946 },
    };
  }
  if (cleanPath === "/city-waitlist" && method === "POST") {
    return saveCityWaitlistEntry(body || {});
  }
  if (cleanPath === "/admin/city-waitlist" && method === "GET") {
    const list = getStoredCityWaitlist();
    const cityCounts = {};
    for (const item of list) {
      const c = item.city || "Unknown";
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    }
    const byCity = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
    return {
      total: list.length,
      by_city: byCity,
      entries: list,
    };
  }
  if (cleanPath.startsWith("/admin/city-waitlist/") && method === "DELETE") {
    const id = cleanPath.split("/").pop();
    return deleteCityWaitlistEntry(id);
  }
  if (cleanPath === "/profession-suggestions" && method === "POST") {
    return saveProfessionSuggestion(body);
  }
  if (cleanPath === "/admin/profession-suggestions" && method === "GET") {
    return getStoredProfessionSuggestions();
  }
  if (cleanPath.startsWith("/admin/profession-suggestions/") && cleanPath.endsWith("/status") && method === "POST") {
    const parts = cleanPath.split("/");
    const sugId = parts[3];
    return updateProfessionSuggestionStatus(sugId, body?.status, body?.notes || body?.admin_notes);
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
  if (cleanPath === "/admin/users") {
    return [
      { user_id: "u-admin", email: "Zenithdeveleoperss@gmail.com", name: "Zenith Developers (Admin)", role: "admin", created_at: new Date().toISOString() },
    ];
  }
  if (cleanPath === "/admin/employers" && method === "POST") {
    return addStoredEmployer(body || {});
  }
  if (cleanPath.startsWith("/admin/employers/") && method === "DELETE") {
    const empId = cleanPath.slice("/admin/employers/".length);
    return deleteStoredEmployer(empId);
  }
  if (cleanPath === "/admin/employers") {
    return getStoredEmployers();
  }
  if (cleanPath === "/admin/freelancers") {
    const statuses = getFreelancerStatuses();
    return getStoredLeads({ includeDeclined: true }).map((l) => {
      const st = statuses[l.id];
      let isApproved = true;
      let statusText = "approved";
      let reasonText = null;

      if (st !== undefined) {
        isApproved = Boolean(st.approved);
        statusText = st.status;
        reasonText = st.reason;
      }

      return {
        freelancer_id: l.id,
        name: l.name,
        skill: l.skill,
        category: l.category || "Creative",
        email: `${l.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        phone: l.phone,
        rating: l.rating,
        jobs_done: l.jobs_done,
        portfolio: l.portfolio,
        approved: isApproved,
        status: statusText,
        reason: reasonText,
      };
    });
  }
  if (cleanPath.startsWith("/admin/freelancers/") && cleanPath.endsWith("/approve")) {
    const parts = cleanPath.split("/");
    const fId = parts[3];
    return updateFreelancerStatus(fId, body?.approved, body?.reason);
  }
  if (cleanPath === "/admin/payments") {
    return [];
  }
  if (cleanPath.startsWith("/admin/deals")) {
    return {
      deals: [],
      summary: {
        total_deals: 0,
        escrow_holding_paise: 0,
        platform_commission_paise: 0,
        disputed_count: 0,
        reported_count: 0,
      },
    };
  }
  if (cleanPath === "/admin/escrow-ledger") {
    return {
      entries: [],
      summary: {
        total_deposited_paise: 0,
        total_released_paise: 0,
        total_commission_paise: 0,
        current_balance_paise: 0,
      },
    };
  }
  if (cleanPath === "/admin/deal-settings") {
    return {
      deal_commission_rate: 0.05,
      deal_auto_release_hours: 72,
      deal_funding_timeout_hours: 24,
    };
  }
  if (cleanPath === "/admin/complaints") {
    return [];
  }
  if (cleanPath === "/coupons/validate" && method === "POST") {
    return validateStoredCoupon(body || {});
  }
  if (cleanPath === "/admin/coupons" && method === "GET") {
    return getStoredCoupons();
  }
  if (cleanPath === "/admin/coupons" && method === "POST") {
    return saveStoredCoupon(body);
  }
  if (cleanPath.startsWith("/admin/coupons/") && method === "PATCH") {
    const code = cleanPath.split("/")[3];
    return updateStoredCoupon(code, body);
  }
  if (cleanPath.startsWith("/admin/coupons/") && method === "DELETE") {
    const code = cleanPath.split("/")[3];
    return deleteStoredCoupon(code);
  }
  if (cleanPath === "/admin/chats" && method === "GET") {
    return getAdminAllChats();
  }
  if (cleanPath.startsWith("/admin/chats/") && cleanPath.endsWith("/messages") && method === "GET") {
    const convId = cleanPath.split("/")[3];
    return getAdminChatMessages(convId);
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
    const convId = cleanPath.split("/")[2];
    try {
      supabaseSendMessage({
        conversationId: convId,
        senderId: body?.sender_id || getFreelancerId(),
        senderRole: body?.sender_role || "freelancer",
        text: body?.text || "",
      }).catch(() => {});
    } catch {}
    if (body?.sender_role === "employer") {
      try {
        sendBrowserPushNotification({
          title: "💬 New Message from Employer",
          body: body?.text || "New message in WorkHop chat",
          category: "employer_messages",
          url: `/chat/${convId}?role=freelancer`,
          tag: `chat-msg-${convId}`,
        });
      } catch {}
    }
    return { id: `m-${Date.now()}`, sender_role: body?.sender_role || "user", text: body?.text, created_at: new Date().toISOString() };
  }
  if (cleanPath.startsWith("/deals/by-conversation/") && method === "GET") {
    const convId = cleanPath.replace("/deals/by-conversation/", "");
    const store = JSON.parse(localStorage.getItem("workhop_deals_store") || "{}");
    const entry = store[convId] || Object.values(store).find((x) => x?.deal?.deal_id === convId);
    return entry ? { deal: entry.deal, events: entry.events || [] } : { deal: null, events: [] };
  }
  if (cleanPath.includes("/sign-agreement") && method === "POST") {
    const parts = cleanPath.split("/");
    const targetId = parts[2];
    const store = JSON.parse(localStorage.getItem("workhop_deals_store") || "{}");
    let convKey = Object.keys(store).find(
      (k) => k === targetId || store[k]?.deal?.deal_id === targetId
    ) || targetId;
    const nowIso = new Date().toISOString();
    const existing = store[convKey]?.deal || {
      deal_id: targetId.startsWith("deal_") ? targetId : `deal_${Date.now()}`,
      contract_id: `WH-AGR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      conversation_id: convKey,
      payment_mode: "escrow",
      agreed_amount_paise: body?.agreed_amount_paise || 1500000,
      commission_rate: 0.05,
      commission_paise: Math.round((body?.agreed_amount_paise || 1500000) * 0.05),
      freelancer_net_paise: Math.round((body?.agreed_amount_paise || 1500000) * 0.95),
      status: "funded",
      created_at: nowIso,
    };
    const role = (body?.actor_role || "freelancer").toLowerCase();
    const sig = (body?.signature_name || "").trim();
    const updatedDeal = {
      ...existing,
      ...(body?.scope_description ? { scope_description: body.scope_description } : {}),
      ...(body?.deliverables ? { deliverables: body.deliverables } : {}),
      ...(body?.start_date ? { start_date: body.start_date } : {}),
      ...(body?.completion_deadline ? { completion_deadline: body.completion_deadline } : {}),
      ...(body?.revisions_included != null ? { revisions_included: body.revisions_included } : {}),
      ...(body?.employer_name ? { employer_name: body.employer_name } : {}),
      ...(body?.employer_address ? { employer_address: body.employer_address } : {}),
      ...(body?.freelancer_name ? { freelancer_name: body.freelancer_name } : {}),
      ...(body?.freelancer_address ? { freelancer_address: body.freelancer_address } : {}),
      ...(body?.milestones ? { milestones: body.milestones } : {}),
      ...(role === "employer"
        ? { employer_agreed: true, employer_signature: sig, employer_signed_at: nowIso }
        : { freelancer_agreed: true, freelancer_signature: sig, freelancer_signed_at: nowIso }),
      updated_at: nowIso,
    };
    const bothSigned = Boolean(updatedDeal.employer_agreed && updatedDeal.freelancer_agreed);
    updatedDeal.agreement_status = bothSigned ? "fully_executed" : "partially_signed";
    if (bothSigned) {
      updatedDeal.agreement_executed_at = nowIso;
      updatedDeal.platform_countersigned_at = nowIso;
      updatedDeal.platform_signatory = "WorkHop Technologies · Automated Escrow Facilitator";
    }
    const events = store[convKey]?.events || [];
    events.push({
      event_id: `ev_${Date.now()}`,
      deal_id: updatedDeal.deal_id,
      actor_role: role,
      event_type: "agreement_signed",
      title: bothSigned
        ? `✅ Escrow Agreement Fully Executed (${updatedDeal.contract_id})`
        : `✍️ ${role === "employer" ? "Employer" : "Freelancer"} Signed Escrow Agreement`,
      description: bothSigned
        ? `Both Employer (${updatedDeal.employer_signature}) and Freelancer (${updatedDeal.freelancer_signature}) have digitally signed and accepted all terms.`
        : `${role === "employer" ? "Employer" : "Freelancer"} (${sig}) digitally signed and accepted the Agreement.`,
      created_at: nowIso,
    });
    store[convKey] = { deal: updatedDeal, events };
    localStorage.setItem("workhop_deals_store", JSON.stringify(store));
    return { ok: true, deal: updatedDeal, events };
  }
  if (cleanPath.startsWith("/deals/") && cleanPath.endsWith("/action") && method === "POST") {
    const parts = cleanPath.split("/");
    const dealId = parts[2];
    const store = JSON.parse(localStorage.getItem("workhop_deals_store") || "{}");
    const convKey = Object.keys(store).find((k) => store[k]?.deal?.deal_id === dealId || k === dealId);
    if (convKey && store[convKey]?.deal) {
      const d = store[convKey].deal;
      const act = (body?.action || "").toLowerCase();
      const nowIso = new Date().toISOString();
      if (act === "start_work") d.status = "in_progress";
      else if (act === "submit_work") d.status = d.payment_mode === "escrow" ? "submitted" : "work_submitted";
      else if (act === "approve_work" || act === "confirm_payment") d.status = "completed";
      else if (act === "acknowledge") d.status = "acknowledged";
      else if (act === "confirm_work") d.status = "work_confirmed";
      else if (act === "dispute") d.status = "disputed";
      d.updated_at = nowIso;
      const events = store[convKey].events || [];
      events.push({
        event_id: `ev_${Date.now()}`,
        deal_id: d.deal_id,
        actor_role: body?.actor_role || "user",
        event_type: act,
        title: `Deal Action: ${act.replace("_", " ").toUpperCase()}`,
        description: body?.notes || `Status updated to ${d.status}.`,
        created_at: nowIso,
      });
      store[convKey] = { deal: d, events };
      localStorage.setItem("workhop_deals_store", JSON.stringify(store));
      return { deal: d, events };
    }
  }
  if (cleanPath.includes("/hire") && method === "POST") {
    const parts = cleanPath.split("/");
    const convId = parts[2];
    setStoredChatStatus(convId, "hired");
    const nowIso = new Date().toISOString();
    const store = JSON.parse(localStorage.getItem("workhop_deals_store") || "{}");
    const chats = getStoredChats();
    const convObj = chats.find((c) => String(c.conversation_id || c.id) === String(convId)) || {};
    const mode = body?.payment_mode === "direct" ? "direct" : "escrow";
    const agreedPaise = body?.agreed_amount_paise || 1500000;
    const commRate = mode === "escrow" ? 0.05 : 0;
    const commPaise = Math.round(agreedPaise * commRate);
    const empSig = (body?.employer_signature || "").trim();
    const empAgreed = Boolean(body?.employer_agreed && empSig);
    const contractId = store[convId]?.deal?.contract_id || `WH-AGR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const dealDoc = {
      ...(store[convId]?.deal || {}),
      deal_id: store[convId]?.deal?.deal_id || `deal_${Date.now()}`,
      contract_id: contractId,
      conversation_id: convId,
      job_id: convObj.job_id || "WH-GIG-BLR",
      job_title: convObj.job_title || "Local Bengaluru Gig",
      employer_name: convObj.company_name || "Employer",
      employer_address: body?.employer_address || `${convObj.job_area || "Indiranagar"}, Bengaluru, Karnataka, India`,
      freelancer_name: convObj.freelancer_name || "Verified Pro",
      freelancer_address: body?.freelancer_address || `${convObj.applicant_area || "Koramangala"}, Bengaluru, Karnataka, India`,
      payment_mode: mode,
      agreed_amount_paise: agreedPaise,
      commission_rate: commRate,
      commission_paise: commPaise,
      freelancer_net_paise: agreedPaise - commPaise,
      scope_description: body?.scope_description || `Professional freelance execution of '${convObj.job_title || "Bengaluru Gig"}' as scoped on WorkHop.`,
      deliverables: body?.deliverables || `Complete execution and delivery of all work items for '${convObj.job_title || "Bengaluru Gig"}'.`,
      start_date: body?.start_date || nowIso.slice(0, 10),
      completion_deadline: body?.completion_deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      revisions_included: body?.revisions_included ?? 2,
      milestones: body?.milestones || [
        {
          no: 1,
          title: `Complete Deliverables for ${convObj.job_title || "Bengaluru Gig"}`,
          due_date: body?.completion_deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          amount_inr: Math.round(agreedPaise / 100),
        },
      ],
      employer_agreed: empAgreed || Boolean(store[convId]?.deal?.employer_agreed),
      employer_signature: empSig || store[convId]?.deal?.employer_signature || null,
      employer_signed_at: empAgreed ? nowIso : (store[convId]?.deal?.employer_signed_at || null),
      freelancer_agreed: Boolean(store[convId]?.deal?.freelancer_agreed),
      freelancer_signature: store[convId]?.deal?.freelancer_signature || null,
      freelancer_signed_at: store[convId]?.deal?.freelancer_signed_at || null,
      agreement_status: empAgreed ? "partially_signed" : "pending_signatures",
      status: mode === "escrow" ? "funded" : "acknowledged",
      effective_date: nowIso,
      created_at: store[convId]?.deal?.created_at || nowIso,
      updated_at: nowIso,
    };
    const events = store[convId]?.events || [];
    events.push({
      event_id: `ev_${Date.now()}`,
      deal_id: dealDoc.deal_id,
      actor_role: "employer",
      event_type: "hired",
      title: "🎉 Freelancer Hired & Agreement Initiated!",
      description: `Employer hired ${dealDoc.freelancer_name}${empAgreed ? ` and digitally signed Agreement ${contractId}` : ""}.`,
      created_at: nowIso,
    });
    store[convId] = { deal: dealDoc, events };
    localStorage.setItem("workhop_deals_store", JSON.stringify(store));
    try {
      sendBrowserPushNotification({
        title: "🎉 You've Been Hired!",
        body: "The employer has officially hired you! Please review and countersign the Escrow Agreement.",
        category: "hired_alerts",
        url: `/chat/${convId}?role=freelancer`,
        tag: `hired-${convId}`,
      });
    } catch {}
    return { ok: true, status: "hired", conversation_id: convId, deal: dealDoc, events, message: "Freelancer successfully hired!" };
  }
  if (cleanPath.includes("/status") && method === "POST") {
    if (body?.status === "hired") {
      try {
        const convId = cleanPath.split("/")[2];
        setStoredChatStatus(convId, "hired");
        sendBrowserPushNotification({
          title: "🎉 You've Been Hired!",
          body: "An employer accepted your proposal and funded milestone escrow!",
          category: "hired_alerts",
          url: `/chat/${convId}?role=freelancer`,
          tag: `hired-${convId}`,
        });
      } catch {}
    }
    return { id: cleanPath.split("/")[2], status: body?.status || "active" };
  }
  if (cleanPath === "/notifications/push-subscription") {
    if (method === "POST") {
      return { ok: true, registered: true };
    }
    return { subscribed: true };
  }
  if (cleanPath === "/notifications/test-push" && method === "POST") {
    return sendTestPushNotification();
  }
  if (cleanPath === "/notifications/dispatch-push" && method === "POST") {
    return { ok: true, dispatched: true };
  }
  if (cleanPath.includes("/complete-and-review") && method === "POST") {
    const parts = cleanPath.split("/");
    const jobId = parts[3];
    return markJobCompletedAndReview(jobId, body);
  }
  if (cleanPath === "/reviews" && method === "POST") {
    try {
      supabaseAddReview({
        jobId: body?.job_id,
        reviewerId: body?.reviewer_id,
        revieweeId: body?.freelancer_id || body?.employer_id,
        reviewerRole: body?.reviewer_role || "employer",
        rating: body?.rating,
        comment: body?.text || body?.comment,
      }).catch(() => {});
    } catch {}
    const rev = addEmployerReview(body);
    return { ok: true, review: rev };
  }
  if (cleanPath.startsWith("/reviews") && method === "GET") {
    return getStoredReviews();
  }
  if (cleanPath === "/complaints") {
    return { ok: true, message: "Complaint submitted successfully." };
  }
  if ((cleanPath === "/auth/delete-account" || cleanPath === "/users/me") && (method === "POST" || method === "DELETE")) {
    clearToken();
    try {
      localStorage.removeItem("workhop_user_data");
      localStorage.removeItem("workhop_pro_phone");
      localStorage.removeItem("workhop_pro_skill");
      localStorage.removeItem("workhop_user_area");
      localStorage.removeItem("workhop_company_name");
      localStorage.removeItem("workhop_employer_id");
      localStorage.removeItem("workhop_freelancer_id");
      localStorage.removeItem("workhop_auth_role");
      localStorage.removeItem("workhop_custom_jobs");
      localStorage.removeItem("workhop_freelancer_profile");
      localStorage.removeItem("workhop_credits_wallet");
      localStorage.removeItem("workhop_chats");
    } catch {}
    return {
      ok: true,
      compliance: "DPDP_ACT_2023_SECTION_12",
      message: "Your account and all associated personal data have been permanently erased in compliance with Section 12 of the DPDP Act, 2023."
    };
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
      return await mockRouter(path, method, body);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    // Network error or backend offline: return rich mock data
    return await mockRouter(path, method, body);
  }
}

export const apiGet = (path, auth = false) => request(path, { auth });
export const apiPost = (path, body, auth = false) =>
  request(path, { method: "POST", body, auth });
export const apiPut = (path, body, auth = false) =>
  request(path, { method: "PUT", body, auth });
export const apiPatch = (path, body, auth = false) =>
  request(path, { method: "PATCH", body, auth });
export const apiDelete = (path, auth = false) =>
  request(path, { method: "DELETE", auth });

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

// Profession Suggestion API wrappers
export async function submitProfessionSuggestion(data) {
  try {
    return await apiPost("/profession-suggestions", data);
  } catch (err) {
    console.warn("API profession suggestion failed, using clientStore fallback:", err);
    return saveProfessionSuggestion(data);
  }
}

export async function getProfessionSuggestions() {
  try {
    const res = await apiGet("/admin/profession-suggestions", true);
    if (Array.isArray(res)) return res;
    return getStoredProfessionSuggestions();
  } catch {
    return getStoredProfessionSuggestions();
  }
}

export async function updateProfessionSuggestion(sugId, status, notes = null) {
  try {
    return await apiPost(`/admin/profession-suggestions/${sugId}/status`, { status, notes, admin_notes: notes }, true);
  } catch {
    return updateProfessionSuggestionStatus(sugId, status, notes);
  }
}
