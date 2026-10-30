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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .catch(() => ({ data: null }));

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
