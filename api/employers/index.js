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

function calculateHops(payRupees) {
  const pay = Number(payRupees) || 0;
  if (pay <= 5000) return 2;
  if (pay <= 10000) return 4;
  if (pay <= 20000) return 6;
  if (pay <= 50000) return 8;
  return 12;
}

const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZnJia3hwdXdicnZoaWRpaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDEwNzMsImV4cCI6MjEwNjY3NzA3M30.uaXuh0iPqiHezrWt5zJA_bV1EnhP-XFI59GIs9RH7sk";

function unpackPortfolioMeta(rawPortfolio) {
  if (!Array.isArray(rawPortfolio)) {
    return { meta: {} };
  }
  const meta = rawPortfolio.find((item) => item && item._workhop_meta) || {};
  return { meta };
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

const deletedEmployerIds = new Set();
const deletedJobIds = new Set();
const employerProfileCache = {};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const isJobsRoute = (req.url || "").includes("/jobs");

  // ════════════════════════════════════════════════════
  // A. GIGS / JOBS ROUTING (/api/jobs or /api/employer/jobs)
  // ════════════════════════════════════════════════════
  if (isJobsRoute) {
    // 1. DELETE GIG
    if (req.method === "DELETE") {
      const authHeader = req.headers["authorization"] || req.headers["Authorization"];
      if (!authHeader) {
        return res.status(401).json({ detail: "Unauthorized: Admin authorization required." });
      }
      try {
        const urlParts = (req.url || "").split("?")[0].split("/");
        const lastPart = urlParts[urlParts.length - 1];
        const targetId = req.query?.id || (lastPart !== "jobs" && lastPart !== "index" ? lastPart : "");
        if (targetId) deletedJobIds.add(String(targetId));
        return res.status(200).json({ ok: true, deleted_id: targetId });
      } catch (e) {
        return res.status(400).json({ detail: e?.message || "Delete failed" });
      }
    }

    // 2. POST NEW GIG
    if (req.method === "POST") {
      try {
        const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
        const title = (body.title || "").trim();
        if (!title) return res.status(400).json({ detail: "Job title is required" });

        const pay = Number(body.pay) || 0;
        const company = body.company_name || body.employer_name || "Employer";
        const employerName = body.employer_name || `${company} HR`;
        const category = body.category || body.bucket || "Graphics & Design";
        const bucket = body.bucket || body.category || "Creative";
        const area = body.area || "Bengaluru";
        const description = body.description || "Looking for a top freelancer in Bengaluru.";
        const isBoosted = Boolean(body.is_boosted);
        const boostExpiresAt = isBoosted ? new Date(Date.now() + 48 * 3600000).toISOString() : null;

        const metadata = {
          company_name: company,
          employer_name: employerName,
          employer_id: body.employer_id || null,
          employer_email: (body.employer_email || body.email || "").trim().toLowerCase() || null,
          category: category,
          bucket: bucket,
          area: area,
          description: description,
          is_boosted: isBoosted,
          boost_expires_at: boostExpiresAt,
          lat: Number(body.lat) || 12.9716,
          lng: Number(body.lng) || 77.5946,
          distance_km: 0.8,
          applicants_count: 0,
          employer_rating: "5.0",
          employer_reviews: 1,
          verified_employer: true,
          created_at: new Date().toISOString(),
        };

        const itemRes = await rzpRequest("POST", "/items", {
          name: title,
          description: JSON.stringify(metadata),
          amount: Math.round(pay * 100),
          currency: "INR",
        }).catch((err) => {
          console.warn("Razorpay item create fallback:", err);
          return null;
        });

        const jobId = itemRes?.id || `job-cloud-${Date.now()}`;
        const savedJob = {
          id: jobId,
          title: title,
          pay: pay,
          pay_label: `₹${pay.toLocaleString("en-IN")}`,
          credits_to_apply: calculateHops(pay),
          ...metadata,
          keywords: [title, category, bucket, area],
        };

        return res.status(200).json(savedJob);
      } catch (e) {
        return res.status(500).json({ detail: e?.message || "Failed to post gig" });
      }
    }

    // 3. GET ALL GIGS IN REAL TIME (merged with latest Employer profile changes)
    try {
      const [itemsRes, customersRes, sbProfilesRes] = await Promise.all([
        rzpRequest("GET", "/items?count=100").catch(() => ({ items: [] })),
        rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] })),
        supabaseRequest("GET", "/rest/v1/profiles?select=*&role=eq.employer").catch(() => []),
      ]);
      const rawItems = Array.isArray(itemsRes?.items) ? itemsRes.items : [];
      const customers = Array.isArray(customersRes?.items) ? customersRes.items : [];
      const sbEmployers = Array.isArray(sbProfilesRes) ? sbProfilesRes : [];

      const empLookup = {};
      for (const c of customers) {
        if (c.notes?.role !== "employer" && c.notes?.source !== "workhop_employer_registration") continue;
        const em = (c.email || "").trim().toLowerCase();
        if (em && em.startsWith("archived.")) continue;
        const entry = {
          company_name: c.notes?.company_name || c.name || "",
          employer_name: c.name || c.notes?.company_name || "",
          area: c.notes?.area || "",
        };
        if (c.id && !empLookup[c.id]) empLookup[c.id] = entry;
        if (em && !empLookup[em]) empLookup[em] = entry;
      }
      for (const sb of sbEmployers) {
        const em = (sb.email || "").trim().toLowerCase();
        const { meta } = unpackPortfolioMeta(sb.portfolio);
        const entry = {
          company_name: meta?.company_name || sb.skill || sb.name || "",
          employer_name: sb.name || meta?.company_name || "",
          area: sb.area || "",
          picture: sb.avatar_url || null,
        };
        if (sb.id) empLookup[sb.id] = { ...(empLookup[sb.id] || {}), ...entry };
        if (em) empLookup[em] = { ...(empLookup[em] || {}), ...entry };
      }
      Object.entries(employerProfileCache).forEach(([k, v]) => {
        empLookup[k] = { ...(empLookup[k] || {}), ...v };
      });

      const jobs = [];
      const seenJobKeys = new Set();

      for (const it of rawItems) {
        if (it.type === "payment_page" && !it.description) continue;
        if (deletedJobIds.has(it.id)) continue;

        let meta = {};
        try {
          if (it.description && it.description.startsWith("{")) {
            meta = JSON.parse(it.description);
          } else {
            meta = { description: it.description || "" };
          }
        } catch {
          meta = { description: it.description || "" };
        }

        const liveEmp =
          (meta.employer_id && empLookup[meta.employer_id]) ||
          (meta.employer_email && empLookup[meta.employer_email.toLowerCase()]) ||
          null;

        const resolvedCompany = liveEmp?.company_name || meta.company_name || "Featured Employer";
        const resolvedEmployerName = liveEmp?.employer_name || meta.employer_name || resolvedCompany || "HR Lead";
        const resolvedArea = liveEmp?.area || meta.area || "Bengaluru";

        const key = `${(it.name || "").trim().toLowerCase()}_${resolvedCompany}`;
        if (seenJobKeys.has(key)) continue;
        seenJobKeys.add(key);

        const payRupees = it.amount ? it.amount / 100 : (Number(meta.pay) || 5000);
        const isBoosted = Boolean(meta.is_boosted && (!meta.boost_expires_at || new Date(meta.boost_expires_at) > new Date()));

        jobs.push({
          id: it.id,
          title: it.name,
          pay: payRupees,
          pay_label: `₹${payRupees.toLocaleString("en-IN")}`,
          credits_to_apply: calculateHops(payRupees),
          is_boosted: isBoosted,
          boost_expires_at: meta.boost_expires_at || null,
          company_name: resolvedCompany,
          employer_name: resolvedEmployerName,
          employer_id: meta.employer_id || null,
          employer_picture: liveEmp?.picture || null,
          description: meta.description || "",
          category: meta.category || meta.bucket || "Graphics & Design",
          bucket: meta.bucket || meta.category || "Creative",
          area: resolvedArea,
          distance_km: meta.distance_km || 0.8,
          posted_minutes_ago: Math.max(1, Math.round((Date.now() - it.created_at * 1000) / 60000)),
          applicants_count: meta.applicants_count || 0,
          employer_rating: meta.employer_rating || "5.0",
          employer_reviews: meta.employer_reviews || 1,
          verified_employer: true,
          created_at: new Date(it.created_at * 1000).toISOString(),
          lat: meta.lat || 12.9716,
          lng: meta.lng || 77.5946,
          keywords: [it.name, meta.category || "", meta.bucket || "", resolvedArea, resolvedCompany].filter(Boolean),
          status: "open",
          is_completed: false,
        });
      }

      // Default sample featured gig if list is empty
      if (jobs.length === 0 && !deletedJobIds.has("job-sample-1")) {
        jobs.unshift({
          id: "job-sample-1",
          title: "UI/UX Designer for Mobile App",
          pay: 25000,
          pay_label: "₹25,000",
          credits_to_apply: 8,
          is_boosted: true,
          boost_expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
          company_name: "Cobblestone Studios",
          employer_name: "Design Lead",
          employer_id: "emp-sample-1",
          description: "Looking for an experienced UI/UX designer to design clean mobile app screens and interactive Figma prototypes.",
          category: "Graphics & Design",
          bucket: "Creative",
          area: "Frazer Town",
          distance_km: 1.2,
          posted_minutes_ago: 15,
          applicants_count: 1,
          employer_rating: "5.0",
          employer_reviews: 3,
          verified_employer: true,
          created_at: new Date().toISOString(),
          lat: 12.9982,
          lng: 77.6158,
          keywords: ["UI/UX", "Mobile App", "Figma", "Design", "Frazer Town"],
          status: "open",
          is_completed: false,
        });
      }

      // Sort: Boosted gigs first, then newest
      jobs.sort((a, b) => {
        if (b.is_boosted !== a.is_boosted) return (b.is_boosted ? 1 : 0) - (a.is_boosted ? 1 : 0);
        return new Date(b.created_at) - new Date(a.created_at);
      });

      return res.status(200).json(jobs);
    } catch (err) {
      return res.status(500).json({ detail: err?.message || "Failed to load gigs" });
    }
  }

  // ════════════════════════════════════════════════════
  // B. EMPLOYERS ROUTING (/api/employers)
  // ════════════════════════════════════════════════════

  // 1. DELETE Employer(s)
  if (req.method === "DELETE") {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (!authHeader) {
      return res.status(401).json({ detail: "Unauthorized: Admin authorization required." });
    }
    try {
      const urlParts = (req.url || "").split("?")[0].split("/");
      const lastPart = urlParts[urlParts.length - 1];
      const targetId = req.query?.id || (lastPart !== "employers" && lastPart !== "index" ? lastPart : "");

      if (targetId === "all") {
        const custRes = await rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] }));
        const items = Array.isArray(custRes?.items) ? custRes.items : [];
        for (const c of items) {
          deletedEmployerIds.add(c.id);
          deletedEmployerIds.add((c.name || "").toLowerCase());
          deletedEmployerIds.add((c.notes?.company_name || "").toLowerCase());
        }
        return res.status(200).json({ ok: true, removed_employers: items.length });
      }

      if (targetId) {
        deletedEmployerIds.add(targetId);
        deletedEmployerIds.add(decodeURIComponent(targetId).toLowerCase());
        if (targetId.startsWith("cust_")) {
          await rzpRequest("PUT", `/customers/${targetId}`, {
            notes: { deleted: "true" }
          }).catch(() => {});
        }
        return res.status(200).json({ ok: true, removed_id: targetId });
      }
      return res.status(400).json({ detail: "Identifier required" });
    } catch (e) {
      return res.status(500).json({ detail: e?.message || "Delete failed" });
    }
  }

  // 2. POST / PUT Add or Update Employer Profile
  if (req.method === "POST" || req.method === "PUT") {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
      const {
        employer_id,
        id,
        company_name,
        contact_name,
        name,
        email,
        phone,
        area,
        hiring_for,
        industry,
        bio,
        picture,
        avatar_url,
        job_title,
        job_category,
        job_pay
      } = body;

      const compName = (company_name || name || contact_name || "").trim();
      if (!compName) return res.status(400).json({ detail: "Company name is required" });

      const cleanEmail = (email || `${compName.toLowerCase().replace(/[^a-z0-9]/g, "")}@workhop.in`).trim().toLowerCase();
      const phoneDigits = (phone || "").replace(/\D/g, "");
      const contactPerson = contact_name || name || `${compName} Lead`;
      const resolvedHiringFor = hiring_for || industry || job_category || "";

      const cachedEmp = {
        ...(employerProfileCache[cleanEmail] || {}),
        employer_id: employer_id || id,
        company_name: compName,
        employer_name: contactPerson,
        name: contactPerson,
        email: cleanEmail,
        phone: phoneDigits.length >= 10 ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}` : phone || "",
        area: area || "Bengaluru",
        hiring_for: resolvedHiringFor,
        bio: bio || "",
        picture: picture || avatar_url || null,
        avatar_url: avatar_url || picture || null,
        updated_at: new Date().toISOString(),
      };
      if (cleanEmail) employerProfileCache[cleanEmail] = cachedEmp;
      if (employer_id || id) employerProfileCache[employer_id || id] = cachedEmp;

      let customer = null;
      try {
        customer = await rzpRequest("POST", "/customers", {
          name: contactPerson,
          email: cleanEmail,
          contact: phoneDigits.slice(-10) || undefined,
          notes: {
            role: "employer",
            company_name: compName,
            hiring_for: resolvedHiringFor,
            bio: (bio || "").slice(0, 240),
            area: area || "Bengaluru",
            source: "workhop_employer_registration",
            registered_at: new Date().toISOString(),
            job_title: job_title || "",
            job_category: job_category || resolvedHiringFor || "Graphics & Design",
            job_pay: String(job_pay || ""),
          }
        });
      } catch (e) {
        const custRes = await rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] }));
        const match = (custRes?.items || []).find(
          (c) => (c.email || "").toLowerCase() === cleanEmail || (c.contact && phoneDigits.endsWith(c.contact))
        );
        if (match) {
          customer = await rzpRequest("PUT", `/customers/${match.id}`, {
            name: contactPerson,
            notes: {
              ...(match.notes || {}),
              role: "employer",
              company_name: compName,
              hiring_for: resolvedHiringFor || match.notes?.hiring_for || "",
              area: area || match.notes?.area || "Bengaluru",
              deleted: "false"
            }
          }).catch(() => match);
        }
      }

      if (job_title) {
        try {
          const payVal = Number(job_pay) || 12000;
          await rzpRequest("POST", "/items", {
            name: job_title,
            description: JSON.stringify({
              company_name: compName,
              employer_name: contactPerson,
              employer_id: customer?.id || employer_id || id || null,
              employer_email: cleanEmail,
              category: job_category || "Graphics & Design",
              bucket: job_category || "Creative",
              area: area || "Bengaluru",
              pay: payVal,
              description: `Gig posted by ${compName}`,
              is_boosted: false,
              created_at: new Date().toISOString(),
            }),
            amount: Math.round(payVal * 100),
            currency: "INR",
          });
        } catch {}
      }

      const employerObj = {
        employer_id: customer?.id || employer_id || id || `emp-${Date.now()}`,
        id: customer?.id || employer_id || id || `emp-${Date.now()}`,
        company_name: compName,
        name: contactPerson,
        email: cleanEmail,
        phone: phoneDigits.length >= 10 ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}` : phone,
        area: area || "Bengaluru",
        hiring_for: resolvedHiringFor,
        bio: bio || "",
        picture: picture || avatar_url || null,
        avatar_url: avatar_url || picture || null,
        spent_rupees: 0,
        jobs_posted: job_title ? 1 : 0,
        created_at: new Date().toISOString(),
        source: "cloud",
        role: "employer"
      };

      return res.status(200).json({ ok: true, employer: employerObj });
    } catch (err) {
      return res.status(400).json({ detail: err?.message || "Failed to add employer" });
    }
  }

  // 3. GET All Employers in Real Time (merged with Supabase profiles)
  try {
    const [customersRes, paymentsRes, itemsRes, sbProfilesRes] = await Promise.all([
      rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] })),
      rzpRequest("GET", "/payments?count=100").catch(() => ({ items: [] })),
      rzpRequest("GET", "/items?count=100").catch(() => ({ items: [] })),
      supabaseRequest("GET", "/rest/v1/profiles?select=*").catch(() => []),
    ]);

    const customers = Array.isArray(customersRes?.items) ? customersRes.items : [];
    const payments = Array.isArray(paymentsRes?.items) ? paymentsRes.items : [];
    const rawItems = Array.isArray(itemsRes?.items) ? itemsRes.items : [];
    const sbProfiles = Array.isArray(sbProfilesRes) ? sbProfilesRes : [];

    const sbByEmail = {};
    for (const sb of sbProfiles) {
      const em = (sb.email || "").trim().toLowerCase();
      if (em && !sbByEmail[em]) sbByEmail[em] = sb;
    }

    // Map live gigs count per employer from active items
    const gigsCountMap = {};
    for (const it of rawItems) {
      if (it.type === "payment_page" && !it.description) continue;
      if (deletedJobIds.has(it.id)) continue;
      let meta = {};
      try {
        if (it.description && it.description.startsWith("{")) {
          meta = JSON.parse(it.description);
        } else {
          meta = { description: it.description || "" };
        }
      } catch {
        meta = { description: it.description || "" };
      }
      const comp = (meta.company_name || meta.employer_name || it.name || "").toLowerCase().trim();
      const empId = (meta.employer_id || "").toLowerCase().trim();
      if (comp) {
        gigsCountMap[comp] = (gigsCountMap[comp] || 0) + 1;
      }
      if (empId) {
        gigsCountMap[empId] = (gigsCountMap[empId] || 0) + 1;
      }
    }

    const spendMap = {};
    for (const p of payments) {
      if (p.status !== "captured") continue;
      const em = (p.email || p.notes?.email || "").trim().toLowerCase();
      const ph = (p.contact || p.notes?.phone || "").replace(/\D/g, "").slice(-10);
      const amt = (p.amount || 0) / 100;
      if (em) spendMap[em] = (spendMap[em] || 0) + amt;
      if (ph) spendMap[ph] = (spendMap[ph] || 0) + amt;
    }

    const employers = [];
    const seenKeys = new Set();

    for (const c of customers) {
      const notes = c.notes || {};
      const email = (c.email || "").trim().toLowerCase();
      const sb = email ? sbByEmail[email] : null;
      const sbUnpacked = unpackPortfolioMeta(sb?.portfolio);
      const cached =
        (email && employerProfileCache[email]) ||
        employerProfileCache[c.id] ||
        null;

      const isEmployer =
        sb?.role === "employer" ||
        notes.role === "employer" ||
        notes.source === "workhop_employer_registration";

      if (!isEmployer) continue;
      if (
        (c.name || "").trim() === "Deleted Account" ||
        (c.name || "").startsWith("[DELETED]") ||
        email.startsWith("archived.") ||
        email.startsWith("deleted.") ||
        email.endsWith("@workhop.invalid") ||
        notes.deleted === "true" ||
        notes.oauth_unregistered === "true" ||
        deletedEmployerIds.has(c.id) ||
        deletedEmployerIds.has((c.name || "").toLowerCase())
      ) {
        continue;
      }

      const phoneRaw = cached?.phone || sb?.phone || c.contact || notes.phone || "";
      const phoneDigits = String(phoneRaw).replace(/\D/g, "");
      const compName = (
        cached?.company_name ||
        sbUnpacked.meta?.company_name ||
        notes.company_name ||
        sb?.skill ||
        sb?.name ||
        c.name ||
        "Employer"
      ).trim();
      const contactName = (
        cached?.name ||
        sb?.name ||
        c.name ||
        compName
      ).trim();
      const compLower = compName.toLowerCase();
      const key = (email || compName || c.id).toLowerCase();

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const resolvedHiringFor =
        cached?.hiring_for ||
        sbUnpacked.meta?.hiring_for ||
        notes.hiring_for ||
        notes.job_category ||
        sb?.category ||
        "";
      const resolvedArea = cached?.area || sb?.area || notes.area || "";
      const resolvedBio = cached?.bio || sb?.bio || notes.bio || "";
      const resolvedPicture =
        cached?.picture ||
        cached?.avatar_url ||
        sb?.avatar_url ||
        notes.avatar_url ||
        null;

      const isIncomplete =
        notes.profile_status === "incomplete" &&
        phoneDigits.length < 10 &&
        !compName;

      const missingFields = notes.missing_fields
        ? String(notes.missing_fields)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : isIncomplete
        ? [
            ...(phoneDigits.length < 10 ? ["Phone Number"] : []),
            ...(!compName ? ["Business / Organization Name"] : []),
            ...(!resolvedHiringFor ? ["Type of Work Hired For"] : []),
            ...(!resolvedArea ? ["Location"] : []),
          ]
        : [];

      const spend = spendMap[email] || spendMap[phoneDigits.slice(-10)] || 0;
      const liveGigs =
        gigsCountMap[c.id.toLowerCase()] ||
        (sb?.id && gigsCountMap[sb.id.toLowerCase()]) ||
        gigsCountMap[compLower] ||
        Number(notes.jobs_posted || (notes.job_title ? 1 : 0));

      employers.push({
        employer_id: sb?.id || c.id,
        id: sb?.id || c.id,
        company_name: compName || (isIncomplete ? "Pending Business Name" : "Employer"),
        name: contactName,
        email: email,
        phone: phoneDigits.length >= 10 ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}` : phoneRaw || "",
        area: resolvedArea || (isIncomplete ? "Not set" : "Bengaluru"),
        hiring_for: resolvedHiringFor,
        bio: resolvedBio,
        picture: resolvedPicture,
        avatar_url: resolvedPicture,
        profile_status: isIncomplete ? "incomplete" : "complete",
        missing_fields: missingFields,
        spent_rupees: spend,
        jobs_posted: liveGigs,
        created_at: sb?.created_at || new Date(c.created_at * 1000).toISOString(),
        source: "cloud",
        role: "employer",
      });
    }

    // Also include any Supabase employer profile not yet in Razorpay customers
    for (const sb of sbProfiles) {
      if (sb.role !== "employer") continue;
      const email = (sb.email || "").trim().toLowerCase();
      if (!email || seenKeys.has(email)) continue;
      if (email.startsWith("archived.") || email.startsWith("deleted.")) continue;
      seenKeys.add(email);

      const sbUnpacked = unpackPortfolioMeta(sb.portfolio);
      const cached = employerProfileCache[email] || employerProfileCache[sb.id] || null;
      const phoneRaw = cached?.phone || sb.phone || "";
      const phoneDigits = String(phoneRaw).replace(/\D/g, "");
      const compName = (
        cached?.company_name ||
        sbUnpacked.meta?.company_name ||
        sb.skill ||
        sb.name ||
        email.split("@")[0]
      ).trim();
      const contactName = (cached?.name || sb.name || compName).trim();
      const resolvedHiringFor =
        cached?.hiring_for || sbUnpacked.meta?.hiring_for || sb.category || "";
      const resolvedArea = cached?.area || sb.area || "Bengaluru";
      const resolvedBio = cached?.bio || sb.bio || "";
      const resolvedPicture = cached?.picture || cached?.avatar_url || sb.avatar_url || null;

      employers.push({
        employer_id: sb.id,
        id: sb.id,
        company_name: compName,
        name: contactName,
        email,
        phone: phoneDigits.length >= 10 ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}` : phoneRaw || "",
        area: resolvedArea,
        hiring_for: resolvedHiringFor,
        bio: resolvedBio,
        picture: resolvedPicture,
        avatar_url: resolvedPicture,
        profile_status: phoneDigits.length >= 10 ? "complete" : "incomplete",
        missing_fields: [],
        spent_rupees: spendMap[email] || spendMap[phoneDigits.slice(-10)] || 0,
        jobs_posted: gigsCountMap[sb.id.toLowerCase()] || gigsCountMap[compName.toLowerCase()] || 0,
        created_at: sb.created_at || new Date().toISOString(),
        source: "supabase",
        role: "employer",
      });
    }

    return res.status(200).json(employers);
  } catch (err) {
    return res.status(500).json({ detail: err?.message || "Failed to load employers" });
  }
};
