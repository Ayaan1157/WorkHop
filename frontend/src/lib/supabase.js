import { createClient } from "@supabase/supabase-js";

// WorkHop Supabase Configuration
// Project Ref: kdfrbkxpuwbrvhidihvj (Seoul, ap-northeast-2)
export const SUPABASE_URL =
  process.env.REACT_APP_SUPABASE_URL ||
  "https://kdfrbkxpuwbrvhidihvj.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZnJia3hwdXdicnZoaWRpaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDEwNzMsImV4cCI6MjEwNjY3NzA3M30.uaXuh0iPqiHezrWt5zJA_bV1EnhP-XFI59GIs9RH7sk";

let supabaseAvailable = true;

export const markSupabaseUnavailable = () => {
  supabaseAvailable = false;
};

export const isSupabaseConfigured = () => {
  if (!supabaseAvailable) return false;
  return Boolean(SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20);
};

export async function supabaseUploadPortfolioImage(file, userId = "anonymous", dataUrl = null) {
  if (!file && !dataUrl) return null;
  try {
    // 1. Convert file to base64 if not already provided
    let base64Data = dataUrl;
    if (!base64Data && file) {
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // 2. Upload via backend proxy (/api/upload) using service role key (bypasses RLS)
    try {
      const resp = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_data: base64Data,
          file_name: file?.name || "portfolio.jpg",
          file_type: file?.type || "image/jpeg",
          user_id: userId,
          folder: "portfolios",
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.public_url || data?.url) {
          return data.public_url || data.url;
        }
      }
    } catch (e) {
      console.warn("Backend /api/upload proxy failed, trying direct Supabase client:", e);
    }

    // 3. Fallback to direct client storage if backend proxy wasn't reachable
    if (isSupabaseConfigured() && file) {
      const fileExt = file.name ? file.name.split(".").pop().toLowerCase() : "jpg";
      const cleanExt = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(fileExt) ? fileExt : "jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
      const safeUserId = String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = `${safeUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolios")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from("portfolios").getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
      }
    }
    // 4. Guaranteed fallback: return base64 dataUrl so the image is never lost
    return dataUrl || null;
  } catch (err) {
    console.warn("supabaseUploadPortfolioImage failed:", err.message);
    return dataUrl || null;
  }
}


// Initialize Supabase Client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "workhop_supabase_auth_token",
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ══════════════════════════════════════════════════
// 1. AUTHENTICATION HELPERS
// ══════════════════════════════════════════════════

export async function supabaseSignInWithGoogle({ redirectTo = null, intent = "signin", role = null } = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Please ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set.");
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  // Keep redirectTo as exact /auth/callback so Supabase's allowlist matches without falling back to Site URL (/)
  const callbackUrl = redirectTo || `${origin}/auth/callback`;

  try {
    localStorage.setItem("workhop_auth_intent", intent);
    sessionStorage.setItem("workhop_auth_intent", intent);
    localStorage.setItem("workhop_oauth_pending", "1");
    sessionStorage.setItem("workhop_oauth_pending", "1");
    if (role) {
      localStorage.setItem("workhop_pending_role", role);
      sessionStorage.setItem("workhop_pending_role", role);
      document.cookie = `workhop_pending_role=${encodeURIComponent(role)}; path=/; max-age=3600`;
    }
    document.cookie = `workhop_auth_intent=${encodeURIComponent(intent)}; path=/; max-age=3600`;
    document.cookie = `workhop_oauth_pending=1; path=/; max-age=3600`;
  } catch {}

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
  if (data?.url && typeof window !== "undefined") {
    window.location.assign(data.url);
  }
  return data;
}

export async function supabaseGetSession() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session || null;
  } catch {
    return null;
  }
}

export function packProfilePortfolioJson(portfolioItems = [], meta = {}) {
  const cleanItems = Array.isArray(portfolioItems)
    ? portfolioItems.filter((item) => item && !item._workhop_meta)
    : [];
  const cleanMeta = {};
  if (meta && typeof meta === "object") {
    Object.entries(meta).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== "_workhop_meta") {
        cleanMeta[k] = v;
      }
    });
  }
  if (Object.keys(cleanMeta).length > 0) {
    return [...cleanItems, { _workhop_meta: true, ...cleanMeta }];
  }
  return cleanItems;
}

export function unpackProfilePortfolioJson(rawPortfolio) {
  let list = rawPortfolio;
  if (typeof rawPortfolio === "string" && rawPortfolio.trim()) {
    try {
      list = JSON.parse(rawPortfolio);
    } catch {}
  }
  if (!Array.isArray(list)) {
    return { portfolioItems: [], portfolioImages: [], meta: {} };
  }
  const metaObj = list.find((item) => item && item._workhop_meta) || {};
  const portfolioItems = list.filter((item) => item && !item._workhop_meta);
  const extractedImages = [];
  portfolioItems.forEach((item) => {
    if (typeof item === "string" && item.trim()) {
      extractedImages.push(item.trim());
    } else if (item && typeof item === "object") {
      if (Array.isArray(item.images) && item.images.length > 0) {
        item.images.forEach((img) => {
          const src = typeof img === "string" ? img : img?.data || img?.url || img?.src;
          if (src) extractedImages.push(src);
        });
      } else if (item.image_data || item.url || item.src) {
        extractedImages.push(item.image_data || item.url || item.src);
      }
    }
  });
  if (Array.isArray(metaObj.portfolio_images)) {
    metaObj.portfolio_images.forEach((img) => {
      const src = typeof img === "string" ? img : img?.data || img?.url || img?.src;
      if (src && !extractedImages.includes(src)) extractedImages.push(src);
    });
  }
  return {
    portfolioItems,
    portfolioImages: extractedImages,
    meta: metaObj,
  };
}

export async function supabaseUpsertProfile(profile) {
  if (!isSupabaseConfigured() || !profile?.id) return null;
  try {
    const safeProfile = {
      id: profile.id,
      email: profile.email || null,
      phone: profile.phone || null,
      name: profile.name || "WorkHop User",
      role: profile.role === "employer" ? "employer" : "freelancer",
      bio: profile.bio ?? null,
      skill: profile.skill ?? null,
      category: profile.category || "Graphics & Design",
      area: profile.area ?? null,
      portfolio: Array.isArray(profile.portfolio) ? profile.portfolio : [],
      hops_balance: profile.hops_balance !== undefined ? Number(profile.hops_balance) : 0,
      phone_verified: Boolean(profile.phone_verified),
      avatar_url: profile.avatar_url || profile.picture || null,
      updated_at: profile.updated_at || new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("profiles")
      .upsert(safeProfile, { onConflict: "id" })
      .select()
      .maybeSingle();
    if (error) {
      console.warn("Supabase profile upsert error:", error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("Supabase upsertProfile failed:", e.message);
    return null;
  }
}

export async function supabaseSyncCurrentUserProfile(updates = {}) {
  if (!isSupabaseConfigured()) return null;
  try {
    let targetId = updates.id || updates.user_id || null;
    let targetEmail = (updates.email || "").trim().toLowerCase();
    const isUuid = (val) =>
      typeof val === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (!isUuid(targetId)) {
      const session = await supabaseGetSession();
      if (session?.user?.id) {
        targetId = session.user.id;
        if (!targetEmail && session.user.email) {
          targetEmail = session.user.email.toLowerCase();
        }
      }
    }

    let existingRow = null;
    if (isUuid(targetId)) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();
      existingRow = data || null;
    } else if (targetEmail) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", targetEmail)
        .maybeSingle();
      if (data) {
        existingRow = data;
        targetId = data.id;
      }
    }

    if (!isUuid(targetId)) return null;

    const { portfolioItems: prevItems, meta: prevMeta } = unpackProfilePortfolioJson(
      existingRow?.portfolio
    );

    const nextPortfolioItems =
      updates.portfolio !== undefined
        ? Array.isArray(updates.portfolio)
          ? updates.portfolio.filter((item) => item && !item._workhop_meta)
          : prevItems
        : prevItems;

    const nextMeta = {
      ...prevMeta,
      ...(updates.rate_hr !== undefined ? { rate_hr: Number(updates.rate_hr) || 0 } : {}),
      ...(updates.languages !== undefined ? { languages: updates.languages } : {}),
      ...(updates.skills !== undefined ? { skills: updates.skills } : {}),
      ...(updates.experience !== undefined ? { experience: updates.experience } : {}),
      ...(updates.company_name !== undefined ? { company_name: updates.company_name } : {}),
      ...(updates.hiring_for !== undefined ? { hiring_for: updates.hiring_for } : {}),
      ...(updates.portfolio_images !== undefined ? { portfolio_images: updates.portfolio_images } : {}),
      ...(updates.portfolio_url !== undefined ? { portfolio_url: updates.portfolio_url } : {}),
      ...(updates.github_url !== undefined ? { github_url: updates.github_url } : {}),
      ...(updates.hours_per_week !== undefined ? { hours_per_week: updates.hours_per_week } : {}),
      ...(updates.availability !== undefined ? { availability: updates.availability } : {}),
      ...(updates.employment_history !== undefined ? { employment_history: updates.employment_history } : {}),
      ...(updates.education !== undefined ? { education: updates.education } : {}),
      ...(updates.certifications !== undefined ? { certifications: updates.certifications } : {}),
    };

    const packedPortfolio = packProfilePortfolioJson(nextPortfolioItems, nextMeta);

    const payload = {
      id: targetId,
      email: targetEmail || existingRow?.email || null,
      phone:
        updates.phone !== undefined
          ? updates.phone || null
          : existingRow?.phone || null,
      name:
        updates.name ||
        existingRow?.name ||
        (targetEmail ? targetEmail.split("@")[0] : "WorkHop User"),
      role:
        (updates.role || existingRow?.role) === "employer"
          ? "employer"
          : "freelancer",
      bio:
        updates.bio !== undefined
          ? updates.bio
          : updates.description !== undefined
          ? updates.description
          : existingRow?.bio ?? null,
      skill:
        updates.skill !== undefined
          ? updates.skill
          : updates.title !== undefined
          ? updates.title
          : existingRow?.skill ?? null,
      category:
        updates.category || existingRow?.category || "Design & Architecture",
      area:
        updates.area !== undefined
          ? updates.area
          : existingRow?.area ?? null,
      portfolio: packedPortfolio,
      hops_balance:
        updates.hops_balance !== undefined
          ? Number(updates.hops_balance)
          : existingRow?.hops_balance ?? 0,
      phone_verified:
        updates.phone_verified !== undefined
          ? Boolean(updates.phone_verified)
          : Boolean(existingRow?.phone_verified || updates.phone),
      avatar_url:
        updates.picture !== undefined
          ? updates.picture || null
          : updates.avatar_url !== undefined
          ? updates.avatar_url || null
          : existingRow?.avatar_url || null,
      updated_at: new Date().toISOString(),
    };

    let savedRow = null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();
      if (!error && data) {
        savedRow = data;
      }
    } catch {}

    // Companion sync via backend endpoint with service-role permissions (ensures cloud DB & cache always update)
    try {
      await fetch(`/api/freelancer/${encodeURIComponent(targetId)}/full-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          portfolio: nextPortfolioItems,
          portfolio_images: nextMeta.portfolio_images || [],
        }),
      });
    } catch {}

    return savedRow || payload;
  } catch (e) {
    console.warn("Supabase sync profile failed:", e.message);
    return null;
  }
}

export async function supabaseFetchAllProfiles() {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => {
      const { portfolioItems, portfolioImages, meta } = unpackProfilePortfolioJson(
        row.portfolio
      );
      return {
        ...row,
        picture: row.avatar_url || meta.picture || null,
        avatar_url: row.avatar_url || meta.picture || null,
        portfolio_items: portfolioItems,
        portfolio_images: portfolioImages,
        rate_hr: meta.rate_hr !== undefined ? Number(meta.rate_hr) || 0 : 0,
        languages: Array.isArray(meta.languages) ? meta.languages : [],
        skills: Array.isArray(meta.skills)
          ? meta.skills
          : row.skill
          ? [row.skill]
          : [],
        experience: meta.experience || "",
        company_name: meta.company_name || (row.role === "employer" ? row.skill || row.name : ""),
        hiring_for: meta.hiring_for || (row.role === "employer" ? row.category || "" : ""),
        portfolio_url: meta.portfolio_url || "",
        github_url: meta.github_url || "",
        hours_per_week: meta.hours_per_week || "",
        availability: meta.availability || "",
        employment_history: Array.isArray(meta.employment_history) ? meta.employment_history : [],
        education: Array.isArray(meta.education) ? meta.education : [],
        certifications: Array.isArray(meta.certifications) ? meta.certifications : [],
      };
    });
  } catch {
    return [];
  }
}


export async function supabaseSignUp({ email, password, name, role = "freelancer", phone = "" }) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          phone,
        },
      },
    });
    if (error) throw error;
    if (data?.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        name: name || email.split("@")[0],
        role,
        phone,
        updated_at: new Date().toISOString(),
      }).catch(() => {});
    }
    return data;
  } catch (err) {
    if (err?.message?.includes("fetch") || err?.message?.includes("network") || err?.code === "ENOTFOUND") {
      markSupabaseUnavailable();
    }
    console.warn("Supabase signup gracefully deferred to local store:", err?.message);
    return null;
  }
}

export async function supabaseSignIn({ email, password }) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    if (err?.message?.includes("fetch") || err?.message?.includes("network") || err?.code === "ENOTFOUND") {
      markSupabaseUnavailable();
    }
    console.warn("Supabase signin gracefully deferred to local store:", err?.message);
    return null;
  }
}

export async function supabaseSignInWithOtp({ email, phone }) {
  if (!isSupabaseConfigured()) return null;
  try {
    if (phone) {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`,
      });
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    if (err?.message?.includes("fetch") || err?.message?.includes("network") || err?.code === "ENOTFOUND") {
      markSupabaseUnavailable();
    }
    console.warn("Supabase OTP signin gracefully deferred:", err?.message);
    return null;
  }
}

export async function supabaseVerifyOtp({ email, phone, token, type = "email" }) {
  if (!isSupabaseConfigured()) return null;
  try {
    const params = {
      token,
      type: type === "sms" || phone ? "sms" : "email",
    };
    if (phone) params.phone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    if (email) params.email = email;

    const { data, error } = await supabase.auth.verifyOtp(params);
    if (error) throw error;
    return data;
  } catch (err) {
    if (err?.message?.includes("fetch") || err?.message?.includes("network") || err?.code === "ENOTFOUND") {
      markSupabaseUnavailable();
    }
    console.warn("Supabase verify OTP gracefully deferred:", err?.message);
    return null;
  }
}

export async function supabaseSignOut() {
  if (!isSupabaseConfigured()) return null;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Supabase signout gracefully deferred:", err?.message);
  }
}

export async function supabaseGetCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    let profile = null;
    try {
      const pRes = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = pRes?.data || null;
    } catch {
      profile = null;
    }

    return {
      ...user,
      ...(profile || {}),
    };
  } catch (err) {
    if (err?.message?.includes("fetch") || err?.message?.includes("network") || err?.code === "ENOTFOUND") {
      markSupabaseUnavailable();
    }
    return null;
  }
}

// ══════════════════════════════════════════════════
// 2. JOBS & GIGS HELPERS
// ══════════════════════════════════════════════════

export async function supabaseGetJobs({ category = null, limit = 100 } = {}) {
  if (!isSupabaseConfigured()) return null;
  let query = supabase
    .from("jobs")
    .select("*, employer:profiles!employer_id(id, name, rating, total_hires, total_spent_bucket)")
    .order("is_boosted", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category && category !== "ALL") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Supabase getJobs error:", error);
    return null;
  }
  return data;
}

export async function supabaseCreateJob(job) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("jobs")
    .insert([
      {
        title: job.title,
        description: job.description,
        category: job.category || "AI & Smart Automations",
        bucket: job.bucket || "Tech",
        pay: Number(job.pay) || 0,
        area: job.area || "Bengaluru",
        lat: Number(job.lat) || 12.9716,
        lng: Number(job.lng) || 77.5946,
        employer_name: job.employer_name || "Employer",
        employer_id: job.employer_id || null,
        company_name: job.company_name || "",
        keywords: Array.isArray(job.keywords) ? job.keywords : [],
        status: "open",
        is_boosted: Boolean(job.is_boosted),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function supabaseUpdateJob(jobId, updates) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function supabaseDeleteJob(jobId) {
  if (!isSupabaseConfigured()) return null;
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw error;
  return true;
}

// ══════════════════════════════════════════════════
// 3. PROFILES & FREELANCER LEADS
// ══════════════════════════════════════════════════

export async function supabaseGetProfiles({ role = "freelancer", category = null, limit = 50 } = {}) {
  if (!isSupabaseConfigured()) return null;
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", role)
    .limit(limit);

  if (category && category !== "ALL") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Supabase getProfiles error:", error);
    return null;
  }
  return data;
}

export async function supabaseGetProfile(id) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function supabaseUpdateProfile(id, updates) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ══════════════════════════════════════════════════
// 4. APPLICATIONS
// ══════════════════════════════════════════════════

export async function supabaseApplyToJob({ jobId, freelancerId, note, boostCredits = 0, applicantArea, distanceKm }) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("applications")
    .insert([
      {
        job_id: jobId,
        freelancer_id: freelancerId,
        note,
        boost_credits: Number(boostCredits) || 0,
        applicant_area: applicantArea || "Bengaluru",
        distance_km: Number(distanceKm) || 0,
        status: "submitted",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ══════════════════════════════════════════════════
// 5. REALTIME CHAT & MESSAGING
// ══════════════════════════════════════════════════

export async function supabaseGetMessages(conversationId) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return null;
  return data;
}

export async function supabaseSendMessage({ conversationId, senderId, senderRole, text }) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRole,
        text,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function supabaseSubscribeMessages(conversationId, onMessage) {
  if (!isSupabaseConfigured()) return () => {};

  const channel = supabase
    .channel(`chat_${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ══════════════════════════════════════════════════
// 6. REVIEWS & RATINGS
// ══════════════════════════════════════════════════

export async function supabaseAddReview({ jobId, reviewerId, revieweeId, reviewerRole, rating, comment }) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("reviews")
    .insert([
      {
        job_id: jobId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        reviewer_role: reviewerRole,
        rating: Number(rating) || 5,
        comment,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function supabaseGetReviews(userId) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("*, reviewer:profiles!reviewer_id(id, name, role)")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });

  if (error) return null;
  return data;
}

// ══════════════════════════════════════════════════
// 7. PROFESSION & TAB SUGGESTIONS (SUPABASE)
// ══════════════════════════════════════════════════

export async function supabaseSubmitProfessionSuggestion(suggestion) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("profession_suggestions")
      .insert([
        {
          profession: suggestion.profession,
          category_hint: suggestion.category_hint || "General",
          description: suggestion.details || suggestion.description || "",
          user_role: suggestion.user_role || "freelancer",
          user_email: suggestion.user_email || null,
          user_phone: suggestion.user_phone || null,
          area: suggestion.area || "Bengaluru",
          status: "pending",
          request_count: 1,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn("Supabase suggestion insert notice:", error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("Supabase profession suggestion failed:", e);
    return null;
  }
}

export async function supabaseGetProfessionSuggestions() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("profession_suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function supabaseGetEmployers() {
  if (!isSupabaseConfigured()) return [];
  try {
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ error: "timeout" }), 400));
    const query = supabase
      .from("profiles")
      .select("*")
      .eq("role", "employer")
      .limit(100);

    const res = await Promise.race([query, timeout]);
    if (res?.error) {
      markSupabaseUnavailable();
      return [];
    }
    return res?.data || [];
  } catch {
    markSupabaseUnavailable();
    return [];
  }
}
