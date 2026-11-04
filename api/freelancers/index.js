const https = require("https");

function rzpRequest(method, path, data = null) {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_Tran4lUkI8SdOr";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "TTx70SMHAYmm9rONUAxbYOjV";
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : "";
    const req = https.request(
      {
        hostname: "api.razorpay.com",
        port: 443,
        path: `/v1${path}`,
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          ...(data
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
              }
            : {}),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZnJia3hwdXdicnZoaWRpaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDEwNzMsImV4cCI6MjEwNjY3NzA3M30.uaXuh0iPqiHezrWt5zJA_bV1EnhP-XFI59GIs9RH7sk";

function unpackPortfolioMeta(rawPortfolio) {
  if (!Array.isArray(rawPortfolio)) {
    return { portfolioItems: [], portfolioImages: [], meta: {} };
  }
  const meta = rawPortfolio.find((item) => item && item._workhop_meta) || {};
  const portfolioItems = rawPortfolio.filter((item) => item && !item._workhop_meta);
  const portfolioImages = [];
  portfolioItems.forEach((item) => {
    if (typeof item === "string" && item.trim()) {
      portfolioImages.push(item.trim());
    } else if (item && typeof item === "object") {
      if (Array.isArray(item.images) && item.images.length > 0) {
        item.images.forEach((img) => {
          const src = typeof img === "string" ? img : img?.data || img?.url || img?.src;
          if (src) portfolioImages.push(src);
        });
      } else if (item.image_data || item.url || item.src) {
        portfolioImages.push(item.image_data || item.url || item.src);
      }
    }
  });
  if (Array.isArray(meta.portfolio_images)) {
    meta.portfolio_images.forEach((img) => {
      const src = typeof img === "string" ? img : img?.data || img?.url || img?.src;
      if (src && !portfolioImages.includes(src)) portfolioImages.push(src);
    });
  }
  return { portfolioItems, portfolioImages, meta };
}

function supabaseRequest(method, path, data = null, extraHeaders = {}) {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    "https://kdfrbkxpuwbrvhidihvj.supabase.co";
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  if (!apiKey) return Promise.resolve(null);

  const urlObj = new URL(path, supabaseUrl);
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : "";
    const req = https.request(
      {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          ...(data
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
              }
            : {}),
          ...extraHeaders,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (!body) return resolve({ status: res.statusCode });
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ raw: body, status: res.statusCode });
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    if (postData) req.write(postData);
    req.end();
  });
}

const freelancerStatusOverrides = {};
const freelancerRateOverrides = {};
const freelancerProfileCache = {};
const orderPortfolioCache = {};

async function fetchOrderPortfolio(orderId) {
  if (!orderId) return null;
  if (orderPortfolioCache[orderId]) return orderPortfolioCache[orderId];
  try {
    const o = await rzpRequest("GET", `/orders/${orderId}`);
    if (!o || !o.notes) return null;
    const { notes } = o;
    let rawJson = notes.payload_json;
    if (!rawJson) {
      const chunkKeys = Object.keys(notes)
        .filter((k) => k.startsWith("c_"))
        .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
      if (chunkKeys.length > 0) {
        rawJson = chunkKeys.map((k) => notes[k]).join("");
      }
    }
    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      orderPortfolioCache[orderId] = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

async function persistFreelancerPortfolioToCloud(email, portfolio, portfolioImages) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  try {
    const pruned = (portfolio || []).map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return null;
      const images = (Array.isArray(item.images) ? item.images : [])
        .map((img) => (typeof img === "string" ? img : img?.data || img?.url || img?.src || ""))
        .filter(Boolean);
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        link: item.link || item.url || undefined,
        images: images.length > 0 ? images : (item.image_data ? [item.image_data] : []),
      };
    }).filter(Boolean);

    const fullPayload = JSON.stringify({
      portfolio: pruned,
      portfolio_images: portfolioImages || [],
    });

    const notes = {
      workhop_data: "portfolio",
      owner_email: cleanEmail,
    };

    if (fullPayload.length < 3500) {
      notes.payload_json = fullPayload;
    } else {
      const CHUNK_SIZE = 3500;
      const maxChunks = 4; // up to 14KB
      for (let i = 0; i < maxChunks && i * CHUNK_SIZE < fullPayload.length; i++) {
        notes[`c_${i}`] = fullPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      }
    }

    const orderRes = await rzpRequest("POST", "/orders", {
      amount: 100,
      currency: "INR",
      notes,
    });

    if (orderRes?.id) {
      orderPortfolioCache[orderRes.id] = { portfolio: pruned, portfolio_images: portfolioImages || [] };

      const custRes = await rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] }));
      const activeCust = (custRes?.items || []).find(
        (c) => (c.email || "").trim().toLowerCase() === cleanEmail && !c.email.startsWith("archived.") && !c.email.startsWith("deleted.")
      );

      if (activeCust) {
        const cleanId = String(activeCust.id || "").replace(/[^a-zA-Z0-9]/g, "");
        await rzpRequest("PUT", `/customers/${activeCust.id}`, {
          name: "Deleted Account",
          email: `archived.${cleanId}@workhop.in`,
        }).catch(() => {});

        await rzpRequest("POST", "/customers", {
          name: activeCust.name,
          email: activeCust.email,
          contact: activeCust.contact,
          notes: {
            ...(activeCust.notes || {}),
            portfolio_order: orderRes.id,
          },
        }).catch(() => {});
      }
      return orderRes.id;
    }
  } catch (e) {
    console.warn("persistFreelancerPortfolioToCloud error", e);
  }
  return null;
}

const PLACEHOLDER_SKILLS = new Set([
  "freelancer pro",
  "creative pro",
  "creative & tech pro",
  "pro",
  "brand identity, digital design & creative pro",
  "incomplete profile",
  "full stack pro",
  "ui/ux & brand designer",
]);

function cleanFreelancerSkill(val) {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (PLACEHOLDER_SKILLS.has(trimmed.toLowerCase())) return "";
  return trimmed;
}

function normalizeLanguageArray(langs) {
  if (!langs) return [];
  if (Array.isArray(langs)) {
    return langs
      .map((l) => {
        if (typeof l === "string") return l.trim();
        if (l && typeof l === "object" && l.language) {
          return l.proficiency ? `${l.language.trim()} (${l.proficiency})` : l.language.trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof langs === "string") {
    return langs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const reqUrl = req.url || "";

  // Handle GET /api/freelancer/:id/full-profile
  if (req.method === "GET" && reqUrl.includes("full-profile")) {
    const urlClean = reqUrl.split("?")[0].replace(/\/full-profile\/?$/, "");
    const parts = urlClean.split("/");
    const fId = decodeURIComponent(parts[parts.length - 1] || "");
    const cached = freelancerProfileCache[fId] || freelancerProfileCache[fId.toLowerCase()] || null;
    if (cached) {
      return res.status(200).json(cached);
    }
    return res.status(200).json({});
  }

  // Handle Freelancer Profile Submission: POST /api/freelancer/submit
  if (req.method === "POST" && reqUrl.includes("submit")) {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
      const {
        freelancer_id,
        name,
        phone,
        email,
        skill,
        category,
        rate_hr,
        intro,
        portfolio_url,
        portfolio,
        portfolio_images,
        languages,
        delivery_days,
        picture,
        avatar_url,
        area,
      } = body;

      const cleanEmail = (email || "").trim().toLowerCase();
      const contactPhone = (phone || "").replace(/\D/g, "");
      const fId = freelancer_id || (cleanEmail ? `pro-${cleanEmail.split("@")[0].replace(/[^a-z0-9]/gi, "")}` : `freelancer-${Date.now()}`);

      const cacheEntry = {
        ...(freelancerProfileCache[cleanEmail] || freelancerProfileCache[fId] || {}),
        id: fId,
        freelancer_id: fId,
        name: name || undefined,
        email: cleanEmail || undefined,
        phone: contactPhone || undefined,
        skill: cleanFreelancerSkill(skill) || undefined,
        category: category || undefined,
        area: area || undefined,
        rate_hr: rate_hr !== undefined ? Number(rate_hr) || 0 : undefined,
        intro: intro || undefined,
        bio: intro || undefined,
        portfolio_url: portfolio_url || undefined,
        portfolio: Array.isArray(portfolio) ? portfolio : undefined,
        portfolio_images: Array.isArray(portfolio_images) ? portfolio_images : undefined,
        languages: languages !== undefined ? normalizeLanguageArray(languages) : undefined,
        picture: picture || avatar_url || undefined,
        avatar_url: avatar_url || picture || undefined,
        updated_at: new Date().toISOString(),
      };
      if (cleanEmail) freelancerProfileCache[cleanEmail] = cacheEntry;
      if (fId) freelancerProfileCache[fId] = cacheEntry;

      try {
        await rzpRequest("POST", "/customers", {
          name: name || "WorkHop Freelancer",
          email: cleanEmail || `${contactPhone || "pro"}@workhop.in`,
          contact: contactPhone.slice(-10),
          notes: {
            freelancer_id: fId,
            skill: cleanFreelancerSkill(skill),
            category: category || "",
            rate_hr: rate_hr ? String(rate_hr) : "",
            delivery_days: String(delivery_days || 2),
            portfolio_url: portfolio_url || "",
            source: "workhop_onboarding",
            status: "pending",
          },
        });
      } catch {}

      return res.status(200).json({
        ok: true,
        status: "pending",
        verified: false,
        under_review: true,
        message: "Profile submitted for verification. WorkHop admin will review and approve your profile.",
        profile: {
          freelancer_id: fId,
          name,
          phone,
          email: cleanEmail,
          skill,
          category,
          rate_hr: Number(rate_hr) || 0,
          intro,
          portfolio_url,
          approved: false,
          status: "pending",
        },
      });
    } catch (err) {
      return res.status(400).json({ detail: err?.message || "Failed to submit profile." });
    }
  }

  // Handle Freelancer Profile Real-Time Sync: PUT /api/freelancer/:id/profile or /full-profile or POST /api/freelancers/sync
  const isAdminApprovalAction =
    reqUrl.includes("approve") ||
    reqUrl.includes("decline");

  if ((req.method === "POST" || req.method === "PUT") && !isAdminApprovalAction) {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
      // If caller explicitly sent { approved: true/false } for admin status toggle without /profile in URL
      if (body?.approved !== undefined && !reqUrl.includes("profile") && !reqUrl.includes("sync")) {
        // Fall through to admin approval handler below
      } else {
        const urlClean = reqUrl
          .split("?")[0]
          .replace(/\/full-profile\/?$/, "")
          .replace(/\/profile\/?$/, "")
          .replace(/\/sync\/?$/, "");
        const urlParts = urlClean.split("/");
        const urlId = decodeURIComponent(urlParts[urlParts.length - 1] || "");
        const fId =
          body?.freelancer_id ||
          body?.owner_id ||
          body?.id ||
          (urlId && urlId !== "freelancers" && urlId !== "freelancer" && urlId !== "index" ? urlId : "");
        const cleanEmail = (body?.email || body?.owner_email || "").trim().toLowerCase();
        const prev =
          (cleanEmail && freelancerProfileCache[cleanEmail]) ||
          (fId && freelancerProfileCache[fId]) ||
          {};

        const portfolioList = Array.isArray(body?.portfolio)
          ? body.portfolio.filter((item) => item && !item._workhop_meta)
          : prev.portfolio || [];
        const extractedImgs = [];
        portfolioList.forEach((item) => {
          if (typeof item === "string" && item.trim()) extractedImgs.push(item.trim());
          else if (item && typeof item === "object") {
            if (Array.isArray(item.images)) {
              item.images.forEach((img) => {
                const src = typeof img === "string" ? img : img?.data || img?.url;
                if (src) extractedImgs.push(src);
              });
            } else if (item.image_data) {
              extractedImgs.push(item.image_data);
            }
          }
        });
        if (Array.isArray(body?.portfolio_images)) {
          body.portfolio_images.forEach((src) => {
            if (typeof src === "string" && src && !extractedImgs.includes(src)) {
              extractedImgs.push(src);
            }
          });
        }

        const resolvedRate =
          body?.rate_hr !== undefined
            ? Number(body.rate_hr) || 0
            : prev.rate_hr !== undefined
            ? Number(prev.rate_hr) || 0
            : undefined;

        const resolvedSkill =
          cleanFreelancerSkill(body?.skill || body?.title) || prev.skill || "";

        const updatedEntry = {
          ...prev,
          ...body,
          id: fId || prev.id,
          freelancer_id: fId || prev.freelancer_id,
          email: cleanEmail || prev.email,
          name: body?.name || body?.owner_name || prev.name,
          phone: body?.phone !== undefined ? body.phone : prev.phone,
          skill: resolvedSkill,
          title: resolvedSkill,
          skills: Array.isArray(body?.skills)
            ? body.skills
            : prev.skills || (resolvedSkill ? [resolvedSkill] : []),
          category: body?.category || prev.category,
          area: body?.area || prev.area,
          rate_hr: resolvedRate,
          description:
            body?.description !== undefined
              ? body.description
              : body?.bio !== undefined
              ? body.bio
              : body?.intro !== undefined
              ? body.intro
              : prev.description,
          bio:
            body?.bio !== undefined
              ? body.bio
              : body?.description !== undefined
              ? body.description
              : body?.intro !== undefined
              ? body.intro
              : prev.bio,
          languages:
            body?.languages !== undefined
              ? normalizeLanguageArray(body.languages)
              : prev.languages,
          portfolio: portfolioList,
          portfolio_items: portfolioList,
          portfolio_images: extractedImgs.length > 0 ? extractedImgs : prev.portfolio_images || [],
          picture: body?.picture || body?.avatar_url || prev.picture || null,
          avatar_url: body?.avatar_url || body?.picture || prev.avatar_url || null,
          updated_at: new Date().toISOString(),
        };

        if (fId) {
          freelancerProfileCache[fId] = updatedEntry;
          freelancerProfileCache[fId.toLowerCase()] = updatedEntry;
        }
        if (cleanEmail) {
          freelancerProfileCache[cleanEmail] = updatedEntry;
          const prefix = cleanEmail.split("@")[0].replace(/[^a-z0-9]/gi, "");
          if (prefix) freelancerProfileCache[`pro-${prefix}`] = updatedEntry;
        }
        if (resolvedRate !== undefined) {
          if (fId) freelancerRateOverrides[fId] = resolvedRate;
          if (cleanEmail) freelancerRateOverrides[cleanEmail] = resolvedRate;
        }

        if (cleanEmail && (portfolioList.length > 0 || extractedImgs.length > 0)) {
          persistFreelancerPortfolioToCloud(cleanEmail, portfolioList, extractedImgs).catch(() => {});
        }

        return res.status(200).json({
          ok: true,
          profile: updatedEntry,
        });
      }
    } catch (err) {
      return res.status(200).json({ ok: true });
    }
  }

  // Admin approval/decline endpoint: POST /api/admin/freelancers/:id/approve or /api/freelancers/:id/approve
  if (req.method === "POST" || req.method === "PUT") {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
      const urlClean = (req.url || "").split("?")[0].replace(/\/approve\/?$/, "").replace(/\/decline\/?$/, "");
      const urlParts = urlClean.split("/");
      const urlId = urlParts[urlParts.length - 1];
      const fId = body?.freelancer_id || body?.id || req.query?.id || (urlId !== "freelancers" && urlId !== "index" ? urlId : "");
      const isApproved = Boolean(body?.approved);
      const status = isApproved ? "approved" : "declined";
      const reason = body?.reason || (isApproved ? "Approved by admin" : "Declined by admin");
      const email = (body?.email || "").trim().toLowerCase();
      const cleanTarget = String(fId).toLowerCase().replace(/^pro-/, "");

      // 1. Cache in memory
      if (fId) {
        freelancerStatusOverrides[fId] = { approved: isApproved, status, reason, updated_at: new Date().toISOString() };
      }
      if (cleanTarget) {
        freelancerStatusOverrides[cleanTarget] = { approved: isApproved, status, reason, updated_at: new Date().toISOString() };
      }
      if (email) {
        freelancerStatusOverrides[email] = { approved: isApproved, status, reason, updated_at: new Date().toISOString() };
      }
      if (body?.rate_hr) {
        const numR = Math.max(50, Number(body.rate_hr));
        if (fId) freelancerRateOverrides[fId] = numR;
        if (cleanTarget) freelancerRateOverrides[cleanTarget] = numR;
        if (email) freelancerRateOverrides[email] = numR;
      }

      // 2. Persist directly to Razorpay payment notes in the cloud!
      const paymentsRes = await rzpRequest("GET", "/payments?count=100").catch(() => ({ items: [] }));
      const payments = Array.isArray(paymentsRes?.items) ? paymentsRes.items : [];
      for (const p of payments) {
        const pEmail = (p.email || p.notes?.email || "").trim().toLowerCase();
        const pPhone = (p.contact || p.notes?.phone || "").replace(/\D/g, "");
        const pId = p.id;
        const match = pId === fId ||
                      (body?.payment_id && pId === body.payment_id) ||
                      (pEmail && (pEmail === email || pEmail.includes(cleanTarget) || cleanTarget.includes(pEmail.split("@")[0]))) ||
                      (pPhone && cleanTarget.includes(pPhone));
        if (match) {
          await rzpRequest("PATCH", `/payments/${p.id}`, {
            notes: {
              ...(p.notes || {}),
              status: status,
              approved_by_admin: String(isApproved),
              reason: reason,
              updated_at: new Date().toISOString(),
            }
          }).catch(() => {});
        }
      }

      // 3. Match and cache customer ID
      const custRes = await rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] }));
      const customers = Array.isArray(custRes?.items) ? custRes.items : [];
      for (const c of customers) {
        const cEmail = (c.email || "").toLowerCase();
        const cPhone = (c.contact || "").replace(/\D/g, "");
        const cName = (c.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const match = c.id === fId ||
                      (cEmail && (cEmail === email || cEmail.includes(cleanTarget) || cleanTarget.includes(cEmail.split("@")[0]))) ||
                      (cPhone && cleanTarget.includes(cPhone)) ||
                      (cName && cleanTarget.includes(cName));
        if (match) {
          freelancerStatusOverrides[c.id] = { approved: isApproved, status, reason };
          await rzpRequest("PUT", `/customers/${c.id}`, {
            notes: {
              ...(c.notes || {}),
              status: status,
              approved: String(isApproved),
              approved_by_admin: String(isApproved),
              reason: reason,
              updated_at: new Date().toISOString(),
            }
          }).catch(() => {});
        }
      }

      return res.status(200).json({
        ok: true,
        freelancer_id: fId,
        approved: isApproved,
        status,
        reason,
        updated_at: new Date().toISOString(),
      });
    } catch {
      return res.status(200).json({ ok: true, approved: true, status: "approved" });
    }
  }

  try {
    const [paymentsRes, customersRes, sbProfilesRes] = await Promise.all([
      rzpRequest("GET", "/payments?count=100").catch(() => ({ items: [] })),
      rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] })),
      supabaseRequest("GET", "/rest/v1/profiles?select=*").catch(() => []),
    ]);

    const payments = Array.isArray(paymentsRes?.items) ? paymentsRes.items : [];
    const customers = Array.isArray(customersRes?.items) ? customersRes.items : [];
    const sbProfiles = Array.isArray(sbProfilesRes) ? sbProfilesRes : [];

    const sbByEmail = {};
    for (const sb of sbProfiles) {
      const em = (sb.email || "").trim().toLowerCase();
      if (em && !sbByEmail[em]) sbByEmail[em] = sb;
    }

    // Also load platform directory talent (from leads.json)
    let leadsSeed = [];
    try {
      leadsSeed = require("./leads.json");
    } catch {}

    const seedMap = {};
    for (const s of leadsSeed) {
      if (s.email) seedMap[s.email.trim().toLowerCase()] = s;
      if (s.id) seedMap[s.id.toLowerCase()] = s;
      if (s.phone) seedMap[s.phone.replace(/\D/g, "")] = s;
    }

    // Map customers by email or phone (customers are newest-first, so keep first match)
    const customerMap = {};
    const orderPortfolioMap = {};
    for (const c of customers) {
      const em = (c.email || "").trim().toLowerCase();
      if (em && !em.startsWith("archived.") && !em.startsWith("deleted.") && !customerMap[em]) {
        customerMap[em] = c;
      }
      const ph = (c.contact || "").replace(/\D/g, "");
      if (ph && !customerMap[ph]) customerMap[ph] = c;
    }

    // Pre-fetch portfolios stored in Razorpay order notes for customers
    const portfolioOrderPromises = Object.entries(customerMap).map(async ([em, c]) => {
      const pOrderId = c?.notes?.portfolio_order;
      if (pOrderId) {
        const pData = await fetchOrderPortfolio(pOrderId);
        if (pData) {
          orderPortfolioMap[em] = pData;
          if (c.contact) orderPortfolioMap[c.contact.replace(/\D/g, "")] = pData;
        }
      }
    });
    await Promise.all(portfolioOrderPromises);

    const paidFreelancers = [];
    const seenEmails = new Set();

    for (const p of payments) {
      if (p.status !== "captured") continue;

      const email = (p.email || p.notes?.email || "").trim().toLowerCase();
      const sb = email ? sbByEmail[email] : null;
      const sbUnpacked = unpackPortfolioMeta(sb?.portfolio);
      const cached =
        (email && freelancerProfileCache[email]) ||
        freelancerProfileCache[p.id] ||
        null;

      const phoneRaw = cached?.phone || sb?.phone || p.contact || p.notes?.phone || "";
      const phoneDigits = String(phoneRaw).replace(/\D/g, "");

      if (email && seenEmails.has(email)) continue;
      if (email) seenEmails.add(email);

      const cust = customerMap[email] || customerMap[phoneDigits] || null;
      const notes = { ...(cust?.notes || {}), ...(p.notes || {}) };

      const rawName =
        cached?.name ||
        (sb?.name && sb.name !== "WorkHop User" && sb.name !== email.split("@")[0] ? sb.name : null) ||
        notes.full_name ||
        notes.name ||
        cust?.name ||
        sb?.name ||
        (email ? email.split("@")[0] : "Verified Pro");
      const initials = rawName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "VP";

      const amountInr = (p.amount || 0) / 100;
      const isVerifiedProUser = Boolean(
        amountInr >= 299 ||
        (p.notes?.product === "freelancer_onboarding" && amountInr >= 299) ||
        (p.notes?.plan_id === "verification-badge" && amountInr >= 299) ||
        (p.description || "").includes("₹299") ||
        (p.notes?.verified_badge === "true")
      );
      const planName =
        p.description ||
        (amountInr === 150 ? "20 Bidding Hops Pack · ₹150" : (amountInr >= 299) ? "Verified Pro Onboarding · ₹299" : `₹${amountInr} Top-Up Pack`);

      const isCobblestone =
        (email && email.toLowerCase().includes("cobblestone")) ||
        (rawName && rawName.toLowerCase().includes("cobblestone")) ||
        p.id === "pay_TvGwKVJe2U6Qf2" ||
        (phoneDigits && phoneDigits.endsWith("9739463546"));

      const proId = isCobblestone
        ? "pro-cobblestonedesigns"
        : `pro-${email ? email.split("@")[0].replace(/[^a-z0-9]/gi, "") : phoneDigits || p.id}`;
      const seed = seedMap[email] || seedMap[proId.toLowerCase()] || (phoneDigits && seedMap[phoneDigits]);

      const skill = isCobblestone
        ? "Architecture & Interior Design"
        : (cleanFreelancerSkill(cached?.skill || cached?.title) ||
           cleanFreelancerSkill(sb?.skill) ||
           cleanFreelancerSkill(notes.skill) ||
           cleanFreelancerSkill(seed?.skill) ||
           "");
      const category = isCobblestone
        ? "Graphics & Design"
        : (cached?.category || sb?.category || (skill ? (notes.category || seed?.category || "") : (notes.category && notes.category !== "Graphics & Design" ? notes.category : "")));

      const resolvedPicture =
        cached?.picture ||
        cached?.avatar_url ||
        sb?.avatar_url ||
        notes.avatar_url ||
        seed?.picture ||
        null;

      const resolvedLanguages = normalizeLanguageArray(
        cached?.languages !== undefined
          ? cached.languages
          : Array.isArray(sbUnpacked.meta?.languages) && sbUnpacked.meta.languages.length > 0
          ? sbUnpacked.meta.languages
          : notes.languages || []
      );

      const orderPortfolio = (email && orderPortfolioMap[email]) || (phoneDigits && orderPortfolioMap[phoneDigits]) || null;
      const orderItems = Array.isArray(orderPortfolio?.portfolio) ? orderPortfolio.portfolio : [];
      const orderImages = Array.isArray(orderPortfolio?.portfolio_images) ? orderPortfolio.portfolio_images : [];

      const resolvedPortfolioItems =
        Array.isArray(cached?.portfolio) && cached.portfolio.length > 0
          ? cached.portfolio
          : orderItems.length > 0
          ? orderItems
          : sbUnpacked.portfolioItems;

      const itemExtractedImages = orderItems.flatMap((it) => {
        if (!it) return [];
        if (typeof it === "string") return [it];
        if (Array.isArray(it.images)) return it.images.map((img) => (typeof img === "string" ? img : img?.data || img?.url || ""));
        if (it.image_data || it.url || it.src) return [it.image_data || it.url || it.src];
        return [];
      }).filter(Boolean);

      const resolvedPortfolioImages =
        Array.isArray(cached?.portfolio_images) && cached.portfolio_images.length > 0
          ? cached.portfolio_images
          : orderImages.length > 0
          ? orderImages
          : itemExtractedImages.length > 0
          ? itemExtractedImages
          : sbUnpacked.portfolioImages;

      const resolvedBio = isCobblestone
        ? "Bengaluru-based architectural and spatial design studio specializing in architecture, space planning, AutoCAD floor plans, 3D visualization, and interior design."
        : (cached?.description || cached?.bio || sb?.bio || notes.bio || notes.intro || seed?.intro || "");

      paidFreelancers.push({
        id: proId,
        freelancer_id: proId,
        supabase_id: sb?.id || null,
        name: isCobblestone ? "Cobblestone Designs" : rawName,
        full_name: isCobblestone ? "Cobblestone Designs" : rawName,
        initials: isCobblestone ? "CD" : initials,
        picture: resolvedPicture,
        avatar_url: resolvedPicture,
        skill: skill,
        skills: Array.isArray(cached?.skills) && cached.skills.length > 0
          ? cached.skills
          : Array.isArray(sbUnpacked.meta?.skills) && sbUnpacked.meta.skills.length > 0
          ? sbUnpacked.meta.skills
          : (skill ? [skill] : []),
        category: category,
        bucket: category ? "Creative" : "",
        area: cached?.area || sb?.area || notes.area || "Bengaluru",
        distance_km: 1.2,
        rating: null,
        jobs_done: 0,
        rate_hr: (() => {
          const cleanEmPrefix = (email || "").toLowerCase().split("@")[0];
          const ovr = freelancerRateOverrides[proId] || freelancerRateOverrides[p.id] || freelancerRateOverrides[cleanEmPrefix] || freelancerRateOverrides[email];
          if (ovr !== undefined) return Number(ovr) || 0;
          if (cached?.rate_hr !== undefined) return Number(cached.rate_hr) || 0;
          if (sbUnpacked.meta?.rate_hr !== undefined) return Number(sbUnpacked.meta.rate_hr) || 0;
          if (isCobblestone) return 1200;
          return Number(notes.rate_hr) || 0;
        })(),
        languages: resolvedLanguages,
        email: email,
        phone: phoneDigits.length >= 10 ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}` : phoneRaw || "",
        portfolio: cached?.portfolio_url || sbUnpacked.meta?.portfolio_url || notes.portfolio_url || "",
        portfolio_url: cached?.portfolio_url || sbUnpacked.meta?.portfolio_url || notes.portfolio_url || "",
        portfolio_items: resolvedPortfolioItems,
        portfolio_images: resolvedPortfolioImages,
        bio: resolvedBio,
        intro: resolvedBio,
        keywords: isCobblestone
          ? [
            "architecture", "architect", "interior design", "floor plan", "spatial design",
            "autocad", "3d rendering", "Graphics & Design", "design", "cobblestone", "elevation", "space planning"
          ]
          : (skill ? [skill] : []),
        paid: true,
        paid_amount: amountInr,
        paid_plan: planName,
        payment_id: p.id,
        is_verified: isVerifiedProUser,
        verified: isVerifiedProUser,
        created_at: sb?.created_at || new Date(p.created_at * 1000).toISOString(),
        approved: (() => {
          const cleanEmPrefix = (email || "").toLowerCase().split("@")[0];
          const ovr = freelancerStatusOverrides[proId] || freelancerStatusOverrides[p.id] || freelancerStatusOverrides[cleanEmPrefix] || freelancerStatusOverrides[email];
          if (ovr) return Boolean(ovr.approved);
          if (notes.status === "approved" || p.notes?.status === "approved" || p.notes?.approved_by_admin === "true") return true;
          const seed = seedMap[email] || seedMap[proId.toLowerCase()] || (phoneDigits && seedMap[phoneDigits]);
          if (seed && seed.approved !== undefined) return Boolean(seed.approved);
          if (notes.status === "declined" || p.notes?.status === "declined") return false;
          return false;
        })(),
        status: (() => {
          const cleanEmPrefix = (email || "").toLowerCase().split("@")[0];
          const ovr = freelancerStatusOverrides[proId] || freelancerStatusOverrides[p.id] || freelancerStatusOverrides[cleanEmPrefix] || freelancerStatusOverrides[email];
          if (ovr) return ovr.status || (ovr.approved ? "approved" : "declined");
          if (notes.status === "approved" || p.notes?.status === "approved" || p.notes?.approved_by_admin === "true") return "approved";
          const seed = seedMap[email] || seedMap[proId.toLowerCase()] || (phoneDigits && seedMap[phoneDigits]);
          if (seed && seed.status) return seed.status;
          if (notes.status === "declined" || p.notes?.status === "declined") return "declined";
          return "pending";
        })(),
        reason: (() => {
          const cleanEmPrefix = (email || "").toLowerCase().split("@")[0];
          const ovr = freelancerStatusOverrides[proId] || freelancerStatusOverrides[p.id] || freelancerStatusOverrides[cleanEmPrefix] || freelancerStatusOverrides[email];
          if (ovr) return ovr.reason || null;
          return notes.reason || p.notes?.reason || null;
        })(),
        verifications: {
          id: isVerifiedProUser,
          email: true,
          phone: Boolean(phoneDigits),
          portfolio: Boolean(resolvedPortfolioItems.length > 0 || resolvedPortfolioImages.length > 0 || notes.portfolio_url),
          payment: isVerifiedProUser,
        },
        is_dummy: false,
      });
    }

    // Also include registered freelancers from customers who haven't paid yet
    for (const c of customers) {
      const email = (c.email || "").trim().toLowerCase();
      const notes = c.notes || {};
      const sb = email ? sbByEmail[email] : null;
      const sbUnpacked = unpackPortfolioMeta(sb?.portfolio);
      const cached =
        (email && freelancerProfileCache[email]) ||
        freelancerProfileCache[c.id] ||
        null;

      const phoneRaw = cached?.phone || sb?.phone || c.contact || notes.phone || "";
      const phoneDigits = String(phoneRaw).replace(/\D/g, "");

      const isEmployer = (sb?.role || notes.role) === "employer";
      if (isEmployer) continue;
      if (
        (c.name || "").trim() === "Deleted Account" ||
        (c.name || "").startsWith("[DELETED]") ||
        email.startsWith("archived.") ||
        email.startsWith("deleted.") ||
        email.endsWith("@workhop.invalid") ||
        notes.deleted === "true" ||
        notes.oauth_unregistered === "true"
      ) {
        continue;
      }

      const isFreelancer =
        sb?.role === "freelancer" ||
        notes.role === "freelancer" ||
        notes.workhop_registered === "true" ||
        notes.profile_status === "incomplete" ||
        notes.profile_status === "complete" ||
        Boolean(notes.skill) ||
        Boolean(sb?.skill) ||
        notes.source?.includes("onboarding") ||
        notes.source?.includes("signup") ||
        notes.source?.includes("registration");
      if (!isFreelancer) continue;

      if (email && seenEmails.has(email)) continue;
      if (email) seenEmails.add(email);

      const rawName =
        cached?.name ||
        (sb?.name && sb.name !== "WorkHop User" && sb.name !== email.split("@")[0] ? sb.name : null) ||
        notes.full_name ||
        notes.name ||
        (c.name && c.name !== email.split("@")[0] ? c.name : null) ||
        sb?.name ||
        c.name ||
        (email ? email.split("@")[0] : "Registered Freelancer");
      const initials = rawName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "RF";

      const isCobblestone =
        (email && email.toLowerCase().includes("cobblestone")) ||
        (rawName && rawName.toLowerCase().includes("cobblestone")) ||
        c.id === "pay_TvGwKVJe2U6Qf2" ||
        (phoneDigits && phoneDigits.endsWith("9739463546"));

      const proId = isCobblestone
        ? "pro-cobblestonedesigns"
        : `pro-${email ? email.split("@")[0].replace(/[^a-z0-9]/gi, "") : phoneDigits || c.id}`;
      const ovr = freelancerStatusOverrides[proId] || freelancerStatusOverrides[c.id] || (email ? freelancerStatusOverrides[email] : null);

      const cleanedCustSkill = isCobblestone
        ? "Architecture & Interior Design"
        : (cleanFreelancerSkill(cached?.skill || cached?.title) ||
           cleanFreelancerSkill(sb?.skill) ||
           cleanFreelancerSkill(notes.skill));

      const resolvedCategory = isCobblestone
        ? "Graphics & Design"
        : (cached?.category || sb?.category || (cleanedCustSkill ? (notes.category || "") : ""));

      const resolvedBio = isCobblestone
        ? "Bengaluru-based architectural and spatial design studio specializing in architecture, space planning, AutoCAD floor plans, 3D visualization, and interior design."
        : (cached?.description || cached?.bio || sb?.bio || notes.bio || notes.intro || "");

      const resolvedArea = cached?.area || sb?.area || notes.area || "";

      const isIncomplete =
        !isCobblestone &&
        notes.profile_status === "incomplete" &&
        phoneDigits.length < 10 &&
        !cleanedCustSkill;

      const missingFields = notes.missing_fields
        ? String(notes.missing_fields)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : isIncomplete
        ? [
            ...(phoneDigits.length < 10 ? ["Phone Number"] : []),
            ...(!resolvedCategory ? ["Profession / Service Category"] : []),
            ...(!cleanedCustSkill ? ["Skills"] : []),
            ...(!(cached?.experience || sbUnpacked.meta?.experience || notes.experience) ? ["Experience"] : []),
            ...(!resolvedBio ? ["Bio"] : []),
            ...(!resolvedArea ? ["Location"] : []),
          ]
        : [];

      const resolvedPicture =
        cached?.picture ||
        cached?.avatar_url ||
        sb?.avatar_url ||
        notes.avatar_url ||
        null;

      const resolvedLanguages = normalizeLanguageArray(
        cached?.languages !== undefined
          ? cached.languages
          : Array.isArray(sbUnpacked.meta?.languages) && sbUnpacked.meta.languages.length > 0
          ? sbUnpacked.meta.languages
          : notes.languages || []
      );

      const orderPortfolio = (email && orderPortfolioMap[email]) || (phoneDigits && orderPortfolioMap[phoneDigits]) || null;
      const orderItems = Array.isArray(orderPortfolio?.portfolio) ? orderPortfolio.portfolio : [];
      const orderImages = Array.isArray(orderPortfolio?.portfolio_images) ? orderPortfolio.portfolio_images : [];

      const resolvedPortfolioItems =
        Array.isArray(cached?.portfolio) && cached.portfolio.length > 0
          ? cached.portfolio
          : orderItems.length > 0
          ? orderItems
          : sbUnpacked.portfolioItems;

      const itemExtractedImages = orderItems.flatMap((it) => {
        if (!it) return [];
        if (typeof it === "string") return [it];
        if (Array.isArray(it.images)) return it.images.map((img) => (typeof img === "string" ? img : img?.data || img?.url || ""));
        if (it.image_data || it.url || it.src) return [it.image_data || it.url || it.src];
        return [];
      }).filter(Boolean);

      const resolvedPortfolioImages =
        Array.isArray(cached?.portfolio_images) && cached.portfolio_images.length > 0
          ? cached.portfolio_images
          : orderImages.length > 0
          ? orderImages
          : itemExtractedImages.length > 0
          ? itemExtractedImages
          : sbUnpacked.portfolioImages;

      const resolvedRate = (() => {
        const cleanEmPrefix = (email || "").toLowerCase().split("@")[0];
        const rOvr = freelancerRateOverrides[proId] || freelancerRateOverrides[c.id] || freelancerRateOverrides[cleanEmPrefix] || freelancerRateOverrides[email];
        if (rOvr !== undefined) return Number(rOvr) || 0;
        if (cached?.rate_hr !== undefined) return Number(cached.rate_hr) || 0;
        if (sbUnpacked.meta?.rate_hr !== undefined) return Number(sbUnpacked.meta.rate_hr) || 0;
        if (isCobblestone) return 1200;
        return Number(notes.rate_hr) || 0;
      })();

      paidFreelancers.push({
        id: proId,
        freelancer_id: proId,
        supabase_id: sb?.id || null,
        name: isCobblestone ? "Cobblestone Designs" : rawName,
        full_name: isCobblestone ? "Cobblestone Designs" : rawName,
        initials: isCobblestone ? "CD" : initials,
        picture: resolvedPicture,
        avatar_url: resolvedPicture,
        skill: cleanedCustSkill,
        skills: Array.isArray(cached?.skills) && cached.skills.length > 0
          ? cached.skills
          : Array.isArray(sbUnpacked.meta?.skills) && sbUnpacked.meta.skills.length > 0
          ? sbUnpacked.meta.skills
          : (cleanedCustSkill ? [cleanedCustSkill] : []),
        category: resolvedCategory,
        bucket: isCobblestone ? "Creative" : (resolvedCategory ? "Creative" : ""),
        area: resolvedArea || (isIncomplete ? "Not set" : "Bengaluru"),
        distance_km: 1.2,
        rating: null,
        jobs_done: 0,
        reviews_count: 0,
        rate_hr: resolvedRate,
        delivery_days: Number(notes.delivery_days) || 3,
        languages: resolvedLanguages,
        email: email,
        phone: phoneDigits.length >= 10 ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}` : phoneRaw,
        portfolio: cached?.portfolio_url || sbUnpacked.meta?.portfolio_url || notes.portfolio_url || "",
        portfolio_url: cached?.portfolio_url || sbUnpacked.meta?.portfolio_url || notes.portfolio_url || "",
        portfolio_items: resolvedPortfolioItems,
        portfolio_images: resolvedPortfolioImages,
        experience: cached?.experience || sbUnpacked.meta?.experience || notes.experience || "",
        bio: resolvedBio,
        intro: resolvedBio,
        keywords: isCobblestone
          ? [
            "architecture", "architect", "interior design", "floor plan", "spatial design",
            "autocad", "3d rendering", "Graphics & Design", "design", "cobblestone", "elevation", "space planning"
          ]
          : (cleanedCustSkill ? [cleanedCustSkill] : []),
        paid: false,
        paid_amount: 0,
        paid_plan: "Free Signup",
        created_at: sb?.created_at || new Date(c.created_at * 1000).toISOString(),
        approved: ovr ? Boolean(ovr.approved) : (notes.status === "approved"),
        status: ovr ? (ovr.status || (ovr.approved ? "approved" : "declined")) : (notes.status || "pending"),
        profile_status: isIncomplete ? "incomplete" : "complete",
        missing_fields: missingFields,
        reason: ovr ? ovr.reason : (notes.reason || null),
        verifications: {
          id: false,
          email: true,
          phone: Boolean(phoneDigits),
          portfolio: Boolean(resolvedPortfolioItems.length > 0 || resolvedPortfolioImages.length > 0 || notes.portfolio_url),
          payment: false,
        },
        is_dummy: false,
        is_unlocked: true,
      });
    }

    // Also include any Supabase freelancer profiles not yet in Razorpay customers
    for (const sb of sbProfiles) {
      if (sb.role === "employer") continue;
      const email = (sb.email || "").trim().toLowerCase();
      if (!email || seenEmails.has(email)) continue;
      if (email.startsWith("archived.") || email.startsWith("deleted.")) continue;
      seenEmails.add(email);

      const sbUnpacked = unpackPortfolioMeta(sb.portfolio);
      const cached = freelancerProfileCache[email] || freelancerProfileCache[sb.id] || null;
      const phoneRaw = cached?.phone || sb.phone || "";
      const phoneDigits = String(phoneRaw).replace(/\D/g, "");
      const rawName = cached?.name || sb.name || email.split("@")[0];
      const initials = rawName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "RF";

      const proId = `pro-${email.split("@")[0].replace(/[^a-z0-9]/gi, "") || sb.id}`;
      const ovr = freelancerStatusOverrides[proId] || freelancerStatusOverrides[sb.id] || freelancerStatusOverrides[email];
      const cleanedSkill = cleanFreelancerSkill(cached?.skill || cached?.title) || cleanFreelancerSkill(sb.skill);
      const resolvedCategory = cached?.category || sb.category || "";
      const resolvedBio = cached?.description || cached?.bio || sb.bio || "";
      const resolvedPicture = cached?.picture || cached?.avatar_url || sb.avatar_url || null;
      const resolvedLanguages = normalizeLanguageArray(
        cached?.languages !== undefined ? cached.languages : sbUnpacked.meta?.languages || []
      );
      const resolvedPortfolioItems =
        Array.isArray(cached?.portfolio) && cached.portfolio.length > 0
          ? cached.portfolio
          : sbUnpacked.portfolioItems;
      const resolvedPortfolioImages =
        Array.isArray(cached?.portfolio_images) && cached.portfolio_images.length > 0
          ? cached.portfolio_images
          : sbUnpacked.portfolioImages;
      const resolvedRate =
        cached?.rate_hr !== undefined
          ? Number(cached.rate_hr) || 0
          : sbUnpacked.meta?.rate_hr !== undefined
          ? Number(sbUnpacked.meta.rate_hr) || 0
          : 0;

      paidFreelancers.push({
        id: proId,
        freelancer_id: proId,
        supabase_id: sb.id,
        name: rawName,
        full_name: rawName,
        initials,
        picture: resolvedPicture,
        avatar_url: resolvedPicture,
        skill: cleanedSkill,
        skills: Array.isArray(cached?.skills) && cached.skills.length > 0
          ? cached.skills
          : Array.isArray(sbUnpacked.meta?.skills) && sbUnpacked.meta.skills.length > 0
          ? sbUnpacked.meta.skills
          : (cleanedSkill ? [cleanedSkill] : []),
        category: resolvedCategory,
        bucket: resolvedCategory ? "Creative" : "",
        area: cached?.area || sb.area || "Bengaluru",
        distance_km: 1.2,
        rating: null,
        jobs_done: 0,
        reviews_count: 0,
        rate_hr: resolvedRate,
        delivery_days: 3,
        languages: resolvedLanguages,
        email,
        phone: phoneDigits.length >= 10 ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}` : phoneRaw,
        portfolio: cached?.portfolio_url || sbUnpacked.meta?.portfolio_url || "",
        portfolio_url: cached?.portfolio_url || sbUnpacked.meta?.portfolio_url || "",
        portfolio_items: resolvedPortfolioItems,
        portfolio_images: resolvedPortfolioImages,
        experience: cached?.experience || sbUnpacked.meta?.experience || "",
        bio: resolvedBio,
        intro: resolvedBio,
        keywords: cleanedSkill ? [cleanedSkill] : [],
        paid: false,
        paid_amount: 0,
        paid_plan: "Free Signup",
        created_at: sb.created_at || new Date().toISOString(),
        approved: ovr ? Boolean(ovr.approved) : false,
        status: ovr ? (ovr.status || (ovr.approved ? "approved" : "declined")) : "pending",
        profile_status: phoneDigits.length >= 10 || cleanedSkill ? "complete" : "incomplete",
        missing_fields: [],
        reason: ovr ? ovr.reason : null,
        verifications: {
          id: false,
          email: true,
          phone: Boolean(phoneDigits),
          portfolio: Boolean(resolvedPortfolioItems.length > 0 || resolvedPortfolioImages.length > 0),
          payment: false,
        },
        is_dummy: false,
        is_unlocked: true,
      });
    }

    // Also merge all platform directory talent (from leads.json) so the admin sees ALL freelancers on the website!
    for (const lead of leadsSeed) {
      const email = (lead.email || "").trim().toLowerCase();
      const leadId = lead.id || lead.freelancer_id;
      if (email && seenEmails.has(email)) continue;
      if (leadId && paidFreelancers.some((p) => p.id === leadId || p.freelancer_id === leadId)) continue;
      if (email) seenEmails.add(email);

      const ovr = freelancerStatusOverrides[leadId] || (email ? freelancerStatusOverrides[email] : null);
      const isLeadVerified = Boolean(
        lead.is_verified === true ||
        (Number(lead.paid_amount || 0) >= 299 && !(lead.paid_plan || "").toLowerCase().includes("hops")) ||
        (lead.paid_plan && typeof lead.paid_plan === "string" && (lead.paid_plan.includes("299") || lead.paid_plan.toLowerCase().includes("verified pro badge") || lead.paid_plan.toLowerCase().includes("verified pro onboarding")))
      );
      paidFreelancers.push({
        ...lead,
        id: leadId,
        freelancer_id: leadId,
        name: lead.name,
        full_name: lead.name,
        initials: lead.initials || lead.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
        paid: Boolean(lead.paid),
        paid_amount: Number(lead.paid_amount || 0),
        paid_plan: lead.paid_plan || null,
        approved: ovr ? Boolean(ovr.approved) : (lead.approved !== undefined ? lead.approved : true),
        status: ovr ? ovr.status : (lead.status || "approved"),
        reason: ovr ? ovr.reason : null,
        is_verified: isLeadVerified,
        verified: isLeadVerified,
        verifications: lead.verifications || {
          id: isLeadVerified,
          email: true,
          phone: true,
          portfolio: true,
          payment: isLeadVerified,
        },
        is_dummy: lead.is_dummy !== undefined ? lead.is_dummy : false,
        is_unlocked: true,
      });
    }

    return res.status(200).json(paidFreelancers);
  } catch (err) {
    try {
      const fallbackLeads = require("./leads.json");
      return res.status(200).json(fallbackLeads.map((l) => ({
        ...l,
        freelancer_id: l.id || l.freelancer_id,
        id: l.id || l.freelancer_id,
        approved: l.approved !== undefined ? l.approved : true,
        status: l.status || "approved",
        is_verified: Boolean(l.is_verified),
        verified: Boolean(l.is_verified),
      })));
    } catch {}
    return res.status(200).json([
      {
        id: "pro-shamanthnmurthy",
        freelancer_id: "pro-shamanthnmurthy",
        name: "Shamanthnmurthy",
        full_name: "Shamanthnmurthy",
        initials: "SM",
        skill: "",
        category: "",
        bucket: "",
        area: "Bengaluru",
        distance_km: 1.2,
        rating: null,
        jobs_done: 0,
        reviews_count: 0,
        rate_hr: freelancerRateOverrides["pro-shamanthnmurthy"] || freelancerRateOverrides["shamanthnmurthy"] || freelancerRateOverrides["shamanthnmurthy@gmail.com"] || 500,
        delivery_days: 2,
        languages: ["English", "Kannada", "Hindi"],
        email: "shamanthnmurthy@gmail.com",
        phone: "+91 72046 65071",
        portfolio: "",
        intro: "",
        keywords: [],
        paid: true,
        paid_amount: 150,
        paid_plan: "20 Bidding Hops Pack · ₹150",
        payment_id: "pay_TtdIJpjtCetICU",
        created_at: "2026-10-29T06:56:39.000Z",
        approved: true,
        status: "approved",
        is_verified: false,
        verified: false,
        verifications: {
          id: false,
          email: true,
          phone: true,
          portfolio: true,
          payment: false,
        },
        is_dummy: false,
        is_unlocked: true,
      },
      {
        id: "pro-cobblestonedesigns",
        freelancer_id: "pro-cobblestonedesigns",
        name: "Cobblestone Designs",
        full_name: "Cobblestone Designs",
        initials: "CD",
        skill: "Architecture & Interior Design",
        category: "Graphics & Design",
        bucket: "Creative",
        area: "Bengaluru",
        distance_km: 1.2,
        rating: null,
        jobs_done: 0,
        reviews_count: 0,
        rate_hr: freelancerRateOverrides["pro-cobblestonedesigns"] || freelancerRateOverrides["cobblestone"] || 1200,
        delivery_days: 3,
        languages: ["English", "Kannada", "Hindi"],
        email: "alia.m@cobblestonedesigns.in",
        phone: "+91 97394 63546",
        portfolio: "",
        intro: "Bengaluru-based architectural and spatial design studio specializing in architecture, space planning, AutoCAD floor plans, 3D visualization, and interior design.",
        keywords: [
          "architecture", "architect", "interior design", "floor plan", "spatial design", "autocad", "3d rendering", "Graphics & Design", "design", "cobblestone", "elevation", "space planning"
        ],
        paid: true,
        paid_amount: 149,
        paid_plan: "Verified Pro onboarding · ₹149",
        payment_id: "pay_TvGwKVJe2U6Qf2",
        created_at: "2026-11-03T00:00:00.000Z",
        approved: true,
        status: "approved",
        is_verified: false,
        verified: false,
        verifications: {
          id: false,
          email: true,
          phone: true,
          portfolio: true,
          payment: false,
        },
        is_dummy: false,
        is_unlocked: true,
      },
    ]);
  }
};
