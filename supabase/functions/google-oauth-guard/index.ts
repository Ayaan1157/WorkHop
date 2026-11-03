// Supabase Edge Function: google-oauth-guard
// Handles post-Google-OAuth registration checks, incomplete profile initialization,
// and service-role cleanup of unregistered OAuth attempts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function computeMissingFields(role: string, data: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const phone = String(data.phone || "").replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) missing.push("Phone Number");

  if (role === "employer") {
    if (!String(data.company_name || data.skill || "").trim()) missing.push("Business / Organization Name");
    if (!String(data.hiring_for || data.category || "").trim()) missing.push("Type of Work Hired For");
    if (!String(data.area || "").trim()) missing.push("Location");
  } else {
    if (!String(data.category || "").trim()) missing.push("Profession / Service Category");
    if (!String(data.skill || "").trim()) missing.push("Skills");
    if (!String(data.experience || "").trim()) missing.push("Experience");
    if (!String(data.bio || "").trim()) missing.push("Bio");
    if (!String(data.area || "").trim()) missing.push("Location");
  }
  return missing;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action = "oauth_check_or_init", access_token, intent = "signin", role = "freelancer" } = body;

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "Missing access_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(access_token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired OAuth session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUser = userData.user;
    const email = (authUser.email || "").toLowerCase().trim();
    const meta = authUser.user_metadata || {};

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .ilike("email", email);

    const existingProfile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;

    const isGenuineProfile = Boolean(
      existingProfile &&
        (existingProfile.phone ||
          existingProfile.skill ||
          existingProfile.bio ||
          Number(existingProfile.hops_balance) === 0 ||
          existingProfile.profile_status === "complete" ||
          existingProfile.profile_status === "incomplete")
    );

    const isRegistered =
      Boolean(meta.workhop_registered) ||
      isGenuineProfile ||
      PROTECTED_EMAILS.has(email);

    if (action === "cleanup_unregistered_oauth" || (intent === "signin" && !isRegistered)) {
      if (!PROTECTED_EMAILS.has(email)) {
        await supabaseAdmin.from("profiles").delete().eq("id", authUser.id);
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
      return new Response(
        JSON.stringify({ status: "not_registered", registered: false, cleaned_up: !PROTECTED_EMAILS.has(email) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (intent === "signup" && isRegistered) {
      return new Response(
        JSON.stringify({ status: "already_registered", registered: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveRole = (existingProfile?.role || meta.role || role || "freelancer") === "employer" ? "employer" : "freelancer";
    const missingFields = computeMissingFields(effectiveRole, {
      ...(existingProfile || {}),
      ...meta,
    });

    if (intent === "signup" && !isRegistered) {
      const displayName =
        meta.full_name || meta.name || email.split("@")[0] || "WorkHop User";
      const avatarUrl = meta.avatar_url || meta.picture || null;

      await supabaseAdmin.from("profiles").upsert(
        {
          id: authUser.id,
          email,
          name: displayName,
          role: effectiveRole,
          avatar_url: avatarUrl,
          hops_balance: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...meta,
          workhop_registered: true,
          role: effectiveRole,
          profile_status: "incomplete",
          missing_fields: missingFields,
        },
      });

      return new Response(
        JSON.stringify({
          status: "onboarding",
          registered: true,
          profile_status: "incomplete",
          role: effectiveRole,
          missing_fields: missingFields,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isComplete =
      meta.profile_status === "complete" ||
      existingProfile?.profile_status === "complete" ||
      missingFields.length === 0;

    return new Response(
      JSON.stringify({
        status: isComplete ? "complete" : "onboarding",
        registered: true,
        profile_status: isComplete ? "complete" : "incomplete",
        role: effectiveRole,
        missing_fields: isComplete ? [] : missingFields,
        profile: existingProfile,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
