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
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://kdfrbkxpuwbrvhidihvj.supabase.co";
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

const PROTECTED_EMAILS = new Set([
  "zenithdeveleoperss@gmail.com",
  "zenithdeveloperss@gmail.com",
  "manarastudio22@gmail.com",
  "alia.m@cobblestonedesigns.in",
  "aliamansoor@gmail.com",
  "ayaanwann@gmail.com",
  "ayaaan.vlogs@gmail.com",
  "shamanthnmurthy@gmail.com",
]);

function computeMissingFields(role, data = {}) {
  const missing = [];
  const phoneDigits = String(data.phone || "").replace(/\D/g, "").slice(-10);
  if (phoneDigits.length !== 10) missing.push("Phone Number");

  if (role === "employer") {
    const comp = String(data.company_name || "").trim();
    const hiring = String(data.hiring_for || data.category || "").trim();
    const area = String(data.area || "").trim();
    if (!comp) missing.push("Business / Organization Name");
    if (!hiring) missing.push("Type of Work Hired For");
    if (!area) missing.push("Location");
  } else {
    const category = String(data.category || "").trim();
    const skill = String(data.skill || "").trim();
    const experience = String(data.experience || "").trim();
    const bio = String(data.bio || data.intro || "").trim();
    const area = String(data.area || "").trim();
    if (!category) missing.push("Profession / Service Category");
    if (!skill || skill === "Pro") missing.push("Skills");
    if (!experience) missing.push("Experience");
    if (!bio) missing.push("Bio");
    if (!area) missing.push("Location");
  }
  return missing;
}

function isGenuineCloudCustomer(cust) {
  if (!cust) return false;
  const em = (cust.email || "").trim().toLowerCase();
  const nm = (cust.name || "").trim();
  if (
    nm === "Deleted Account" ||
    nm.startsWith("[DELETED]") ||
    em.startsWith("archived.") ||
    em.startsWith("deleted.") ||
    em.endsWith("@workhop.invalid")
  ) {
    return false;
  }
  const notes = cust.notes || {};
  if (notes.deleted === "true" || notes.oauth_unregistered === "true") return false;
  if (notes.workhop_registered === "true") return true;
  if (notes.profile_status === "complete" || notes.profile_status === "incomplete") return true;
  const phoneDigits = String(cust.contact || "").replace(/\D/g, "");
  if (phoneDigits.length >= 10) return true;
  if (notes.role === "employer" && notes.company_name && notes.company_name !== cust.name) return true;
  if (notes.skill && notes.skill !== "Pro") return true;
  const email = (cust.email || "").trim().toLowerCase();
  if (PROTECTED_EMAILS.has(email)) return true;
  return false;
}

function isGenuineSupabaseProfile(prof) {
  if (!prof) return false;
  if (prof.profile_status === "complete" || prof.profile_status === "incomplete") return true;
  if (prof.phone && String(prof.phone).replace(/\D/g, "").length >= 10) return true;
  if (prof.skill && String(prof.skill).trim() && prof.skill !== "Pro") return true;
  if (prof.bio && String(prof.bio).trim()) return true;
  if (prof.hops_balance !== undefined && prof.hops_balance !== null && Number(prof.hops_balance) === 0) return true;
  const email = (prof.email || "").trim().toLowerCase();
  if (PROTECTED_EMAILS.has(email)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 1. POST: OAuth Check / Init OR Real-Time Profile Sync
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");

      // ──────────────────────────────────────────────────────────────────
      // A. Post-Google-OAuth Registration Check & Initialization
      // ──────────────────────────────────────────────────────────────────
      if (body.action === "oauth_check_or_init" || body.action === "cleanup_unregistered_oauth") {
        const intent = body.intent === "signup" ? "signup" : "signin";
        const requestedRole = body.role === "employer" ? "employer" : "freelancer";
        const accessToken = body.access_token || "";

        let authUser = null;
        if (accessToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://kdfrbkxpuwbrvhidihvj.supabase.co";
          const urlObj = new URL("/auth/v1/user", supabaseUrl);
          authUser = await new Promise((resolve) => {
            const r = https.request(
              {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: "GET",
                headers: {
                  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${accessToken}`,
                },
              },
              (resp) => {
                let d = "";
                resp.on("data", (c) => (d += c));
                resp.on("end", () => {
                  try {
                    const parsed = JSON.parse(d);
                    resolve(parsed?.id ? parsed : null);
                  } catch {
                    resolve(null);
                  }
                });
              }
            );
            r.on("error", () => resolve(null));
            r.end();
          });
        }

        const cleanEmail = (authUser?.email || body.email || "").trim().toLowerCase();
        const userId = authUser?.id || body.user_id || "";
        const userMeta = authUser?.user_metadata || body.user_metadata || {};

        if (!cleanEmail) {
          return res.status(400).json({ detail: "Email is required for OAuth verification" });
        }

        // 1. Check Razorpay Cloud Customers
        const custRes = await rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] }));
        const customers = Array.isArray(custRes?.items) ? custRes.items : [];
        const cloudMatch = customers.find((c) => (c.email || "").trim().toLowerCase() === cleanEmail);
        const hasCloudAccount = isGenuineCloudCustomer(cloudMatch);

        // 2. Check Supabase profiles (if service role key is configured)
        let sbProfile = null;
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const profRes = await supabaseRequest(
            "GET",
            `/rest/v1/profiles?email=ilike.${encodeURIComponent(cleanEmail)}&select=*`
          );
          if (Array.isArray(profRes) && profRes.length > 0) {
            sbProfile = profRes[0];
          }
        }
        const hasSbProfile = isGenuineSupabaseProfile(sbProfile);
        const hasMetaRegistered =
          Boolean(userMeta?.workhop_registered) ||
          userMeta?.profile_status === "complete" ||
          userMeta?.profile_status === "incomplete";

        const isRegistered =
          hasCloudAccount ||
          hasSbProfile ||
          hasMetaRegistered ||
          PROTECTED_EMAILS.has(cleanEmail);

        // CASE 1: Unregistered user attempting Log In (or explicit cleanup)
        if (body.action === "cleanup_unregistered_oauth" || (intent === "signin" && !isRegistered)) {
          let cleanedUp = false;
          if (!PROTECTED_EMAILS.has(cleanEmail)) {
            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
              if (userId) {
                await supabaseRequest("DELETE", `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`);
                await supabaseRequest("DELETE", `/auth/v1/admin/users/${encodeURIComponent(userId)}`);
              }
              await supabaseRequest("DELETE", `/rest/v1/profiles?email=ilike.${encodeURIComponent(cleanEmail)}`);
              cleanedUp = true;
            }
            const matchingCustomers = customers.filter(
              (c) => (c.email || "").trim().toLowerCase() === cleanEmail
            );
            for (const mc of matchingCustomers) {
              if (body.action === "cleanup_unregistered_oauth" || !hasCloudAccount) {
                const cleanMcId = String(mc.id || "").replace(/[^a-zA-Z0-9]/g, "");
                await rzpRequest("PUT", `/customers/${mc.id}`, {
                  name: "Deleted Account",
                  email: `deleted.${cleanMcId}@workhop.in`,
                }).catch(() => {});
                cleanedUp = true;
              }
            }
          }
          return res.status(200).json({
            ok: true,
            status: "not_registered",
            registered: false,
            cleaned: cleanedUp,
            cleaned_up: cleanedUp,
          });
        }

        // Determine effective role & existing data (only use sbProfile.role when hasSbProfile is true)
        const notes = cloudMatch?.notes || {};
        const effectiveRole =
          ((hasCloudAccount ? notes.role : null) ||
            (hasSbProfile ? sbProfile?.role : null) ||
            (hasMetaRegistered ? userMeta?.role : null) ||
            requestedRole) === "employer"
            ? "employer"
            : "freelancer";

        const mergedData = {
          name:
            sbProfile?.name ||
            cloudMatch?.name ||
            userMeta?.full_name ||
            userMeta?.name ||
            body.name ||
            cleanEmail.split("@")[0],
          email: cleanEmail,
          phone: sbProfile?.phone || cloudMatch?.contact || notes.phone || userMeta?.phone || "",
          role: effectiveRole,
          area: sbProfile?.area || notes.area || userMeta?.area || "",
          company_name: notes.company_name || userMeta?.company_name || (effectiveRole === "employer" ? sbProfile?.skill || "" : ""),
          hiring_for: notes.hiring_for || notes.job_category || userMeta?.hiring_for || (effectiveRole === "employer" ? sbProfile?.category || "" : ""),
          category: notes.category || userMeta?.category || (effectiveRole !== "employer" ? sbProfile?.category || "" : ""),
          skill: notes.skill || sbProfile?.skill || userMeta?.skill || "",
          experience: notes.experience || userMeta?.experience || "",
          bio: sbProfile?.bio || notes.bio || notes.intro || userMeta?.bio || "",
          rate_hr: notes.rate_hr || userMeta?.rate_hr || 500,
          avatar_url: sbProfile?.avatar_url || userMeta?.avatar_url || userMeta?.picture || body.avatar_url || "",
        };

        const missingFields = computeMissingFields(effectiveRole, mergedData);

        const explicitIncomplete =
          notes.profile_status === "incomplete" ||
          sbProfile?.profile_status === "incomplete" ||
          userMeta?.profile_status === "incomplete";
        const explicitComplete =
          notes.profile_status === "complete" ||
          sbProfile?.profile_status === "complete" ||
          userMeta?.profile_status === "complete" ||
          PROTECTED_EMAILS.has(cleanEmail);

        const isComplete = !explicitIncomplete && (explicitComplete || missingFields.length === 0);

        // CASE 2: Already registered user attempting Sign Up
        if (intent === "signup" && isRegistered) {
          return res.status(200).json({
            ok: true,
            status: "already_registered",
            registered: true,
            role: effectiveRole,
            profile: {
              ...mergedData,
              id: userId || sbProfile?.id || cloudMatch?.id || `user-${Date.now()}`,
              user_id: userId || sbProfile?.id || cloudMatch?.id || `user-${Date.now()}`,
              profile_status: isComplete ? "complete" : "incomplete",
              missing_fields: isComplete ? [] : missingFields,
            },
          });
        }

        // CASE 3: New Sign Up -> Immediately create Incomplete Profile so Admin sees it right away
        if (intent === "signup" && !isRegistered) {
          const initialMissing = computeMissingFields(effectiveRole, { role: effectiveRole });
          const displayName =
            userMeta?.full_name ||
            userMeta?.name ||
            body.name ||
            cleanEmail.split("@")[0] ||
            "WorkHop User";
          const avatarUrl = userMeta?.avatar_url || userMeta?.picture || body.avatar_url || "";

          // Save to Razorpay customer for immediate Admin visibility (max 15 keys in Razorpay notes)
          let customer = null;
          const rzpNotes = {
            role: effectiveRole,
            workhop_registered: "true",
            profile_status: "incomplete",
            missing_fields: initialMissing.join(", "),
            phone: "",
            company_name: "",
            hiring_for: "",
            category: "",
            skill: "",
            experience: "",
            bio: "",
            area: "",
            rate_hr: "500",
            source: "google_oauth_signup",
          };

          if (cloudMatch) {
            const cleanCloudId = String(cloudMatch.id || "").replace(/[^a-zA-Z0-9]/g, "");
            await rzpRequest("PUT", `/customers/${cloudMatch.id}`, {
              name: "Deleted Account",
              email: `archived.${cleanCloudId}@workhop.in`,
            }).catch(() => {});
          }
          customer = await rzpRequest("POST", "/customers", {
            name: displayName,
            email: cleanEmail,
            notes: rzpNotes,
          }).catch(() => null);

          // Save to Supabase profiles & user_metadata if service role key is available
          if (process.env.SUPABASE_SERVICE_ROLE_KEY && userId) {
            await supabaseRequest(
              "POST",
              "/rest/v1/profiles?on_conflict=id",
              {
                id: userId,
                email: cleanEmail,
                name: displayName,
                role: effectiveRole,
                phone: null,
                skill: null,
                bio: null,
                area: null,
                hops_balance: 0,
                avatar_url: avatarUrl || null,
                updated_at: new Date().toISOString(),
              },
              { Prefer: "resolution=merge-duplicates,return=representation" }
            );
            await supabaseRequest("PUT", `/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
              user_metadata: {
                ...userMeta,
                workhop_registered: true,
                role: effectiveRole,
                profile_status: "incomplete",
                missing_fields: initialMissing,
              },
            });
          }

          return res.status(200).json({
            ok: true,
            status: "onboarding",
            registered: false,
            created_incomplete: true,
            profile_status: "incomplete",
            role: effectiveRole,
            missing_fields: initialMissing,
            profile: {
              id: userId || customer?.id || `user-${Date.now()}`,
              user_id: userId || customer?.id || `user-${Date.now()}`,
              name: displayName,
              email: cleanEmail,
              role: effectiveRole,
              avatar_url: avatarUrl,
              profile_status: "incomplete",
              missing_fields: initialMissing,
            },
          });
        }

        // CASE 4: Registered user logging in -> Check if profile is complete or incomplete
        return res.status(200).json({
          ok: true,
          status: isComplete ? "complete" : "onboarding",
          registered: true,
          profile_status: isComplete ? "complete" : "incomplete",
          role: effectiveRole,
          missing_fields: isComplete ? [] : missingFields,
          profile: {
            ...mergedData,
            id: userId || sbProfile?.id || cloudMatch?.id || `user-${Date.now()}`,
            user_id: userId || sbProfile?.id || cloudMatch?.id || `user-${Date.now()}`,
            profile_status: isComplete ? "complete" : "incomplete",
            missing_fields: isComplete ? [] : missingFields,
          },
        });
      }

      // ──────────────────────────────────────────────────────────────────
      // B. Standard User Registration / Profile Completion Sync
      // ──────────────────────────────────────────────────────────────────
      const {
        user_id,
        id,
        email,
        name,
        phone,
        role,
        area,
        company_name,
        hiring_for,
        category,
        skill,
        skills,
        experience,
        bio,
        intro,
        description,
        rate_hr,
        hourly_rate,
        gst_number,
        avatar_url,
        picture,
        languages,
        portfolio,
        portfolio_images,
        profile_status,
      } = body;

      const cleanEmail = (email || "").trim().toLowerCase();

      const [custRes, sbRows] = await Promise.all([
        rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] })),
        cleanEmail
          ? supabaseRequest(
              "GET",
              `/rest/v1/profiles?select=*&email=ilike.${encodeURIComponent(cleanEmail)}`
            ).catch(() => [])
          : Promise.resolve([]),
      ]);

      const existingCustomers = Array.isArray(custRes?.items) ? custRes.items : [];
      const emailMatches = cleanEmail
        ? existingCustomers.filter((c) => (c.email || "").trim().toLowerCase() === cleanEmail)
        : [];
      const latestExisting = emailMatches[0] || null;
      const existingNotes = latestExisting?.notes || {};
      const sbExisting = Array.isArray(sbRows) && sbRows.length > 0 ? sbRows[0] : null;
      const sbUnpacked = unpackPortfolioMeta(sbExisting?.portfolio);

      const rawPhone =
        phone !== undefined
          ? phone
          : existingNotes.phone || latestExisting?.contact || sbExisting?.phone || "";
      const phoneDigits = String(rawPhone || "").replace(/\D/g, "");
      const resolvedRole = (
        role ||
        existingNotes.role ||
        sbExisting?.role ||
        "freelancer"
      ).toLowerCase() === "employer"
        ? "employer"
        : "freelancer";

      const resolvedCompanyName =
        company_name !== undefined
          ? company_name
          : existingNotes.company_name || sbUnpacked.meta?.company_name || "";

      const userName = (
        name ||
        sbExisting?.name ||
        latestExisting?.name ||
        (resolvedRole === "employer" ? resolvedCompanyName : cleanEmail.split("@")[0]) ||
        "WorkHop Member"
      ).trim();

      const skillStr =
        Array.isArray(skills) && skills.length > 0
          ? skills.join(", ")
          : skill !== undefined
          ? skill || ""
          : existingNotes.skill || sbExisting?.skill || "";

      const bioStr =
        bio !== undefined
          ? bio
          : intro !== undefined
          ? intro
          : description !== undefined
          ? description
          : existingNotes.bio || existingNotes.intro || sbExisting?.bio || "";

      const categoryStr =
        resolvedRole === "employer"
          ? hiring_for || category || existingNotes.hiring_for || existingNotes.category || sbExisting?.category || ""
          : category || existingNotes.category || sbExisting?.category || "";

      const hiringForStr =
        hiring_for ||
        (resolvedRole === "employer"
          ? category || existingNotes.hiring_for || existingNotes.category || ""
          : "");

      const effectiveRate =
        rate_hr !== undefined
          ? Number(rate_hr) || 0
          : hourly_rate !== undefined
          ? Number(hourly_rate) || 0
          : sbUnpacked.meta?.rate_hr !== undefined
          ? Number(sbUnpacked.meta.rate_hr) || 0
          : Number(existingNotes.rate_hr) || 0;

      const resolvedArea =
        area !== undefined ? area : existingNotes.area || sbExisting?.area || "";
      const resolvedExperience =
        experience !== undefined
          ? experience
          : existingNotes.experience || sbUnpacked.meta?.experience || "";
      const resolvedAvatar =
        picture || avatar_url || sbExisting?.avatar_url || existingNotes.avatar_url || "";

      const resolvedLanguagesList = Array.isArray(languages)
        ? languages
            .map((l) => (typeof l === "string" ? l : l?.language || ""))
            .filter(Boolean)
        : Array.isArray(sbUnpacked.meta?.languages)
        ? sbUnpacked.meta.languages
            .map((l) => (typeof l === "string" ? l : l?.language || ""))
            .filter(Boolean)
        : existingNotes.languages
        ? String(existingNotes.languages)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const computedMissing = computeMissingFields(resolvedRole, {
        phone: phoneDigits,
        company_name: resolvedCompanyName,
        hiring_for: hiringForStr,
        category: categoryStr,
        skill: skillStr,
        experience: resolvedExperience,
        bio: bioStr,
        area: resolvedArea,
      });

      const finalStatus =
        profile_status === "incomplete"
          ? "incomplete"
          : profile_status === "complete" || computedMissing.length === 0
          ? "complete"
          : "incomplete";
      const finalMissing = finalStatus === "complete" ? [] : computedMissing;

      // Max 15 keys in Razorpay notes
      const rzpNotes = {
        role: resolvedRole,
        workhop_registered: "true",
        profile_status: finalStatus,
        missing_fields: finalMissing.join(", ").slice(0, 240),
        phone: phoneDigits.slice(-10) || "",
        company_name:
          resolvedCompanyName ||
          (resolvedRole === "employer" && finalStatus === "complete" ? userName : ""),
        hiring_for: hiringForStr,
        category: categoryStr,
        skill: String(skillStr || "").slice(0, 240),
        experience: resolvedExperience || "",
        bio: bioStr ? String(bioStr).slice(0, 240) : "",
        area: resolvedArea || "",
        rate_hr: effectiveRate ? String(effectiveRate) : "",
        avatar_url:
          resolvedAvatar && resolvedAvatar.startsWith("http")
            ? resolvedAvatar.slice(0, 245)
            : "",
        languages: resolvedLanguagesList.join(", ").slice(0, 240),
      };

      let customer = null;
      if (emailMatches.length > 0) {
        // Archive old record(s) and create fresh customer record with updated notes
        for (const em of emailMatches) {
          const cleanEmId = String(em.id || "").replace(/[^a-zA-Z0-9]/g, "");
          await rzpRequest("PUT", `/customers/${em.id}`, {
            name: "Deleted Account",
            email: `archived.${cleanEmId}@workhop.in`,
          }).catch(() => {});
        }
      }

      customer = await rzpRequest("POST", "/customers", {
        name: userName,
        email: cleanEmail || `${phoneDigits || Date.now()}@workhop.in`,
        contact: phoneDigits.slice(-10) || undefined,
        notes: rzpNotes,
      }).catch(() => null);

      if (!customer || customer?.error) {
        customer = await rzpRequest("POST", "/customers", {
          name: userName,
          email: cleanEmail || `${phoneDigits || Date.now()}@workhop.in`,
          notes: rzpNotes,
        }).catch(() => null);
      }

      // Sync to Supabase if service role key is present
      const targetUuid = user_id || id || sbExisting?.id;
      const isUuid =
        typeof targetUuid === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUuid);
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && isUuid) {
        const nextPortfolioItems = Array.isArray(portfolio)
          ? portfolio.filter((item) => item && !item._workhop_meta)
          : sbUnpacked.portfolioItems;
        const nextMeta = {
          ...(sbUnpacked.meta || {}),
          rate_hr: effectiveRate,
          languages: Array.isArray(languages) ? languages : resolvedLanguagesList,
          skills: Array.isArray(skills) ? skills : skillStr ? skillStr.split(",").map((s) => s.trim()).filter(Boolean) : [],
          experience: resolvedExperience,
          company_name: resolvedCompanyName,
          hiring_for: hiringForStr,
          ...(Array.isArray(portfolio_images) ? { portfolio_images } : {}),
        };
        const packedPortfolio = [...nextPortfolioItems, { _workhop_meta: true, ...nextMeta }];

        await supabaseRequest(
          "POST",
          "/rest/v1/profiles?on_conflict=id",
          {
            id: targetUuid,
            email: cleanEmail,
            name: userName,
            phone: phoneDigits.length >= 10 ? phoneDigits.slice(-10) : null,
            role: resolvedRole,
            bio: bioStr || null,
            skill: resolvedRole === "employer" ? (resolvedCompanyName || null) : (skillStr || null),
            category: categoryStr || "Design & Architecture",
            area: resolvedArea || null,
            portfolio: packedPortfolio,
            hops_balance: sbExisting?.hops_balance ?? 0,
            phone_verified: phoneDigits.length >= 10,
            avatar_url: resolvedAvatar || null,
            updated_at: new Date().toISOString(),
          },
          { Prefer: "resolution=merge-duplicates,return=representation" }
        );
        await supabaseRequest("PUT", `/auth/v1/admin/users/${encodeURIComponent(targetUuid)}`, {
          user_metadata: {
            full_name: userName,
            name: userName,
            workhop_registered: true,
            role: resolvedRole,
            profile_status: finalStatus,
            missing_fields: finalMissing,
            phone: phoneDigits.slice(-10),
            company_name: resolvedCompanyName || "",
            hiring_for: hiringForStr,
            category: categoryStr,
            skill: skillStr,
            experience: resolvedExperience || "",
            bio: bioStr,
            area: resolvedArea || "",
            rate_hr: effectiveRate,
            gst_number: gst_number || "",
          },
        });
      }

      return res.status(200).json({
        ok: true,
        user: {
          user_id: targetUuid || customer?.id || `user-${Date.now()}`,
          id: targetUuid || customer?.id || `user-${Date.now()}`,
          name: userName,
          email: cleanEmail,
          phone:
            phoneDigits.length >= 10
              ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}`
              : phone || "",
          role: resolvedRole,
          company_name: resolvedCompanyName || "",
          hiring_for: hiringForStr,
          category: categoryStr,
          skill: skillStr,
          experience: resolvedExperience || "",
          bio: bioStr,
          area: resolvedArea || "",
          rate_hr: effectiveRate,
          picture: resolvedAvatar || null,
          avatar_url: resolvedAvatar || null,
          languages: Array.isArray(languages) ? languages : resolvedLanguagesList,
          profile_status: finalStatus,
          missing_fields: finalMissing,
          workhop_registered: true,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      return res.status(400).json({ detail: err?.message || "Failed to register user" });
    }
  }

  // 2. GET: List all real-time registered users (merged with Supabase profiles)
  try {
    const [custRes, sbProfilesRes] = await Promise.all([
      rzpRequest("GET", "/customers?count=100").catch(() => ({ items: [] })),
      supabaseRequest("GET", "/rest/v1/profiles?select=*").catch(() => []),
    ]);
    const customers = Array.isArray(custRes?.items) ? custRes.items : [];
    const sbProfiles = Array.isArray(sbProfilesRes) ? sbProfilesRes : [];

    const sbByEmail = new Map();
    sbProfiles.forEach((p) => {
      const em = (p.email || "").trim().toLowerCase();
      if (em && !sbByEmail.has(em)) sbByEmail.set(em, p);
    });

    const users = [
      {
        user_id: "u-admin",
        id: "u-admin",
        name: "Zenith Developers (Admin)",
        email: "Zenithdeveleoperss@gmail.com",
        phone: "+91 80530 827",
        role: "admin",
        area: "Bengaluru",
        profile_status: "complete",
        missing_fields: [],
        workhop_registered: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    const seenEmails = new Set(["zenithdeveleoperss@gmail.com"]);

    for (const c of customers) {
      const notes = c.notes || {};
      if (notes.deleted === "true" || notes.oauth_unregistered === "true") continue;
      if (!isGenuineCloudCustomer(c)) continue;

      const email = (c.email || "").trim().toLowerCase();
      if (email && seenEmails.has(email)) continue;
      if (email) seenEmails.add(email);

      const sb = email ? sbByEmail.get(email) : null;
      const sbUnpacked = unpackPortfolioMeta(sb?.portfolio);

      const phoneRaw = sb?.phone || c.contact || notes.phone || "";
      const phoneDigits = String(phoneRaw).replace(/\D/g, "");
      const isEmp = (sb?.role || notes.role) === "employer";
      const roleStr = isEmp ? "employer" : (sb?.role || notes.role || "freelancer");

      const status =
        notes.profile_status === "incomplete" && !sb?.phone
          ? "incomplete"
          : notes.profile_status === "complete" || phoneDigits.length >= 10
          ? "complete"
          : "incomplete";

      const resolvedName =
        sb?.name && sb.name !== "WorkHop User" && sb.name !== email.split("@")[0]
          ? sb.name
          : c.name && c.name !== email.split("@")[0]
          ? c.name
          : sb?.name || c.name || (email ? email.split("@")[0] : "WorkHop Member");

      const resolvedCompany =
        sbUnpacked.meta?.company_name ||
        notes.company_name ||
        (isEmp && sb?.skill ? sb.skill : "") ||
        (isEmp && status === "complete" ? resolvedName : "");

      const resolvedHiringFor =
        sbUnpacked.meta?.hiring_for ||
        notes.hiring_for ||
        notes.job_category ||
        (isEmp ? sb?.category || "" : "");

      const resolvedCategory = sb?.category || notes.category || "";
      const rawSkill = !isEmp ? sb?.skill || notes.skill || "" : notes.skill || "";
      const resolvedSkill =
        rawSkill && !["Pro", "Freelancer Pro", "Creative Pro", "Creative & Tech Pro"].includes(rawSkill)
          ? rawSkill
          : "";
      const resolvedBio = sb?.bio || notes.bio || notes.intro || "";
      const resolvedArea = sb?.area || notes.area || (status === "complete" ? "Bengaluru" : "");
      const resolvedRate =
        sbUnpacked.meta?.rate_hr !== undefined
          ? Number(sbUnpacked.meta.rate_hr) || 0
          : Number(notes.rate_hr) || 0;
      const resolvedPicture = sb?.avatar_url || notes.avatar_url || null;
      const resolvedLanguages = Array.isArray(sbUnpacked.meta?.languages)
        ? sbUnpacked.meta.languages
        : notes.languages
        ? String(notes.languages)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const missingList = notes.missing_fields
        ? String(notes.missing_fields)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : status === "incomplete"
        ? computeMissingFields(roleStr, {
            phone: phoneDigits,
            company_name: resolvedCompany,
            hiring_for: resolvedHiringFor,
            category: resolvedCategory,
            skill: resolvedSkill,
            experience: sbUnpacked.meta?.experience || notes.experience,
            bio: resolvedBio,
            area: resolvedArea,
          })
        : [];

      users.push({
        user_id: sb?.id || c.id,
        id: sb?.id || c.id,
        name: resolvedName,
        email: email,
        phone:
          phoneDigits.length >= 10
            ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}`
            : phoneRaw || "",
        role: roleStr,
        company_name: resolvedCompany,
        hiring_for: resolvedHiringFor,
        category: resolvedCategory,
        skill: resolvedSkill,
        skills: Array.isArray(sbUnpacked.meta?.skills)
          ? sbUnpacked.meta.skills
          : resolvedSkill
          ? [resolvedSkill]
          : [],
        experience: sbUnpacked.meta?.experience || notes.experience || "",
        bio: resolvedBio,
        area: resolvedArea,
        rate_hr: resolvedRate,
        picture: resolvedPicture,
        avatar_url: resolvedPicture,
        languages: resolvedLanguages,
        portfolio_items: sbUnpacked.portfolioItems,
        portfolio_images: sbUnpacked.portfolioImages,
        profile_status: status,
        missing_fields: missingList,
        workhop_registered: true,
        created_at: sb?.created_at || new Date(c.created_at * 1000).toISOString(),
        source: "cloud",
      });
    }

    // Also include any Supabase profile not yet in Razorpay customers
    for (const sb of sbProfiles) {
      const email = (sb.email || "").trim().toLowerCase();
      if (!email || seenEmails.has(email)) continue;
      if (email.startsWith("archived.") || email.startsWith("deleted.")) continue;
      seenEmails.add(email);

      const sbUnpacked = unpackPortfolioMeta(sb.portfolio);
      const phoneRaw = sb.phone || "";
      const phoneDigits = String(phoneRaw).replace(/\D/g, "");
      const isEmp = sb.role === "employer";
      const roleStr = isEmp ? "employer" : "freelancer";
      const rawSkill = !isEmp ? sb.skill || "" : "";
      const resolvedSkill =
        rawSkill && !["Pro", "Freelancer Pro", "Creative Pro", "Creative & Tech Pro"].includes(rawSkill)
          ? rawSkill
          : "";

      users.push({
        user_id: sb.id,
        id: sb.id,
        name: sb.name || email.split("@")[0],
        email,
        phone:
          phoneDigits.length >= 10
            ? `+91 ${phoneDigits.slice(-10, -5)} ${phoneDigits.slice(-5)}`
            : phoneRaw || "",
        role: roleStr,
        company_name:
          sbUnpacked.meta?.company_name || (isEmp ? sb.skill || sb.name || "" : ""),
        hiring_for:
          sbUnpacked.meta?.hiring_for || (isEmp ? sb.category || "" : ""),
        category: sb.category || "",
        skill: resolvedSkill,
        skills: Array.isArray(sbUnpacked.meta?.skills)
          ? sbUnpacked.meta.skills
          : resolvedSkill
          ? [resolvedSkill]
          : [],
        experience: sbUnpacked.meta?.experience || "",
        bio: sb.bio || "",
        area: sb.area || "Bengaluru",
        rate_hr:
          sbUnpacked.meta?.rate_hr !== undefined
            ? Number(sbUnpacked.meta.rate_hr) || 0
            : 0,
        picture: sb.avatar_url || null,
        avatar_url: sb.avatar_url || null,
        languages: Array.isArray(sbUnpacked.meta?.languages)
          ? sbUnpacked.meta.languages
          : [],
        portfolio_items: sbUnpacked.portfolioItems,
        portfolio_images: sbUnpacked.portfolioImages,
        profile_status: phoneDigits.length >= 10 ? "complete" : "incomplete",
        missing_fields: [],
        workhop_registered: true,
        created_at: sb.created_at || new Date().toISOString(),
        source: "supabase",
      });
    }

    return res.status(200).json(users);
  } catch (err) {
    return res.status(200).json([
      {
        user_id: "u-admin",
        id: "u-admin",
        name: "Zenith Developers (Admin)",
        email: "Zenithdeveleoperss@gmail.com",
        role: "admin",
        profile_status: "complete",
        missing_fields: [],
        workhop_registered: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
  }
};
