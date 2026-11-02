import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, supabaseSignInWithGoogle, supabaseUpsertProfile } from "@/lib/supabase";
import { linkOrUpdateGoogleUser, getRegisteredUserByEmail } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";
import { BENGALURU_AREAS } from "@/lib/locationAreas";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Briefcase,
  UserCheck,
  MapPin,
  Phone,
  ArrowRight,
  RefreshCw,
  Home
} from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adoptSession } = useAuth();

  const [status, setStatus] = useState("verifying"); // 'verifying' | 'error' | 'onboarding'
  const [errorMessage, setErrorMessage] = useState("");
  const [authUser, setAuthUser] = useState(null);

  // First-time onboarding states
  const [selectedRole, setSelectedRole] = useState(
    () => localStorage.getItem("workhop_pending_role") || "freelancer"
  );
  const [selectedArea, setSelectedArea] = useState(
    () => localStorage.getItem("workhop_user_area") || "Indiranagar"
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      try {
        // 1. Check for error params in URL query or hash
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(
          location.hash ? location.hash.replace(/^#/, "") : ""
        );

        const error = searchParams.get("error") || hashParams.get("error");
        const errorDesc =
          searchParams.get("error_description") ||
          hashParams.get("error_description") ||
          searchParams.get("message");

        if (error) {
          if (error === "access_denied" || error.includes("cancel")) {
            throw new Error(
              "Google sign-in was cancelled. You did not grant permissions or closed the account picker."
            );
          }
          throw new Error(errorDesc || "Google authentication failed. Please try again.");
        }

        // 2. Fetch or exchange session
        let session = null;
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        
        if (sessionErr) throw sessionErr;

        if (sessionData?.session) {
          session = sessionData.session;
        } else if (location.search.includes("code=")) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          session = data?.session;
        }

        // Wait brief delay if hash token is being parsed by client
        if (!session) {
          await new Promise((r) => setTimeout(r, 600));
          const retry = await supabase.auth.getSession();
          session = retry?.data?.session;
        }

        if (!session?.user) {
          throw new Error(
            "Could not retrieve an authenticated Google session. Please click 'Try Again' below."
          );
        }

        if (!isMounted) return;

        const user = session.user;
        setAuthUser(user);

        // 3. Check for existing profile in Supabase
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()
          .catch(() => ({ data: null }));

        // Also check existing local user by email
        const existingLocal = getRegisteredUserByEmail(user.email);
        const hasExistingRole = Boolean(existingProfile?.role || existingLocal?.role);
        const pendingRole = localStorage.getItem("workhop_pending_role");

        // If user already has an established role, treat as returning user
        if (hasExistingRole) {
          const finalRole = existingProfile?.role || existingLocal?.role || pendingRole || "freelancer";
          const finalArea = existingProfile?.area || existingLocal?.area || "Bengaluru";

          // Link Google user to existing account
          const sessionUser = linkOrUpdateGoogleUser(user, finalRole, finalArea);
          await adoptSession(session.access_token || `token_${Date.now()}`, sessionUser);

          // Redirect to appropriate dashboard
          if (finalRole === "employer") {
            navigate("/employer/dashboard", { replace: true });
          } else {
            navigate("/freelancer/jobs", { replace: true });
          }
          return;
        }

        // If brand new user with no established role, prompt role & location selection
        setStatus("onboarding");
      } catch (err) {
        if (!isMounted) return;
        console.warn("OAuth Callback processing failed:", err.message);
        setErrorMessage(
          err.message || "An unexpected error occurred during Google authentication."
        );
        setStatus("error");
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [location, adoptSession, navigate]);

  // Handle first-time onboarding completion
  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    if (!authUser) return;
    setSubmitting(true);

    try {
      const cleanPhone = phoneInput.replace(/\D/g, "");
      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const avatarUrl =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null;

      // 1. Reliably save profile to Supabase database
      await supabaseUpsertProfile({
        id: authUser.id,
        email: authUser.email,
        name: fullName,
        avatar_url: avatarUrl,
        role: selectedRole,
        area: selectedArea,
        phone: cleanPhone ? `+91 ${cleanPhone.slice(-10)}` : null,
        hops_balance: selectedRole === "freelancer" ? 50 : 0,
        phone_verified: false,
        updated_at: new Date().toISOString(),
      });

      // 2. Link & register locally in clientStore
      const sessionUser = linkOrUpdateGoogleUser(authUser, selectedRole, selectedArea);
      if (cleanPhone) {
        sessionUser.phone = `+91 ${cleanPhone.slice(-10)}`;
        localStorage.setItem("workhop_pro_phone", sessionUser.phone);
      }

      // 3. Adopt session in AuthContext
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token || `token_${Date.now()}`;
      await adoptSession(token, sessionUser);

      // Clean up temporary role flag
      localStorage.removeItem("workhop_pending_role");

      // 4. Redirect to appropriate destination
      if (selectedRole === "employer") {
        navigate("/employer/dashboard", { replace: true });
      } else {
        navigate("/freelancer/jobs", { replace: true });
      }
    } catch (err) {
      console.warn("Failed to complete onboarding:", err);
      // Fallback navigation
      navigate(selectedRole === "employer" ? "/employer/dashboard" : "/freelancer/jobs", {
        replace: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryGoogle = async () => {
    setStatus("verifying");
    setErrorMessage("");
    try {
      await supabaseSignInWithGoogle();
    } catch (err) {
      setErrorMessage(err.message || "Failed to initiate Google OAuth.");
      setStatus("error");
    }
  };

  // ══════════════════════════════════════════════════
  // UI: ERROR VIEW (Cancelled consent, invalid code, denied access)
  // ══════════════════════════════════════════════════
  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md border-4 border-white bg-[#1A1A1A] p-6 sm:p-8 shadow-[8px_8px_0px_#FF5500]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-white bg-rose-950 text-rose-400 shrink-0">
              <AlertTriangle size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#FF5500] uppercase">
                Authentication Error
              </span>
              <h1 className="text-xl font-black uppercase text-white">Sign-In Failed</h1>
            </div>
          </div>

          <p className="text-xs text-zinc-300 font-semibold mb-6 leading-relaxed bg-[#242424] p-3.5 border border-zinc-700">
            {errorMessage}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetryGoogle}
              className="flex w-full items-center justify-center gap-2 border-2 border-white bg-[#FF5500] text-white py-3 px-4 text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_#FFFFFF] hover:bg-[#E04B00] active:translate-y-0.5 transition"
            >
              <RefreshCw size={15} />
              Try Again with Google
            </button>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="flex w-full items-center justify-center gap-2 border-2 border-zinc-700 bg-transparent text-zinc-300 py-3 px-4 text-xs font-bold tracking-wider uppercase hover:bg-zinc-800 transition"
            >
              <Home size={15} />
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // UI: ONBOARDING VIEW (First-time user choosing role & location)
  // ══════════════════════════════════════════════════
  if (status === "onboarding" && authUser) {
    const userEmail = authUser.email;
    const userName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      userEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const userAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;

    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-lg border-4 border-white bg-[#1A1A1A] p-6 sm:p-8 shadow-[10px_10px_0px_#FF5500]">
          {/* Header */}
          <div className="flex items-center gap-3.5 pb-5 border-b-2 border-zinc-700">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="h-12 w-12 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center border-2 border-white bg-[#FF5500] font-black text-white text-lg">
                {userName[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-emerald-400 uppercase">
                <CheckCircle2 size={13} />
                <span>Google Verified Account</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Welcome, {userName}!
              </h2>
              <p className="text-xs text-zinc-400 font-semibold">{userEmail}</p>
            </div>
          </div>

          <form onSubmit={handleCompleteOnboarding} className="mt-6 space-y-5">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-2">
                1. Select Your Role on WorkHop:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Freelancer Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("freelancer")}
                  className={`p-4 text-left border-2 transition ${
                    selectedRole === "freelancer"
                      ? "border-[#FF5500] bg-[#FF5500]/15 shadow-[4px_4px_0px_#FF5500]"
                      : "border-zinc-700 bg-[#242424] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <UserCheck
                      size={20}
                      className={
                        selectedRole === "freelancer" ? "text-[#FF5500]" : "text-zinc-400"
                      }
                    />
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-zinc-600 bg-black/40 text-zinc-300">
                      50 Free Hops
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase">I Want to Work</h3>
                  <p className="text-[11px] text-zinc-300 font-medium mt-1 leading-snug">
                    Discover local gigs in Bengaluru and apply directly within 5km.
                  </p>
                </button>

                {/* Employer Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("employer")}
                  className={`p-4 text-left border-2 transition ${
                    selectedRole === "employer"
                      ? "border-[#FF5500] bg-[#FF5500]/15 shadow-[4px_4px_0px_#FF5500]"
                      : "border-zinc-700 bg-[#242424] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Briefcase
                      size={20}
                      className={
                        selectedRole === "employer" ? "text-[#FF5500]" : "text-zinc-400"
                      }
                    />
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-zinc-600 bg-black/40 text-zinc-300">
                      Instant Post
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase">I Want to Hire</h3>
                  <p className="text-[11px] text-zinc-300 font-medium mt-1 leading-snug">
                    Post gigs and connect with verified creators &amp; engineers.
                  </p>
                </button>
              </div>
            </div>

            {/* Neighborhood / Area Picker */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5">
                2. Your Bengaluru Neighborhood:
              </label>
              <div className="flex items-center border-2 border-white bg-[#242424] px-3 py-2.5">
                <MapPin size={16} className="text-[#FF5500] mr-2 shrink-0" />
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full bg-transparent text-xs font-black text-white outline-none cursor-pointer"
                >
                  {BENGALURU_AREAS.map((a) => (
                    <option key={a} value={a} className="bg-[#242424] text-white">
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Phone */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5">
                3. WhatsApp / Contact Phone (Optional):
              </label>
              <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                <Phone size={16} className="text-zinc-400 mr-2 shrink-0" />
                <span className="text-xs font-bold text-zinc-400 mr-1.5">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-white bg-[#FF5500] py-3.5 px-4 text-xs font-black tracking-wider text-white uppercase shadow-[4px_4px_0px_#FFFFFF] hover:bg-[#E04B00] active:translate-y-0.5 transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Setting Up Your Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup &amp; Enter WorkHop</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // UI: DEFAULT VERIFYING SPINNER
  // ══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-sm border-4 border-white bg-[#1A1A1A] p-8 text-center shadow-[8px_8px_0px_#FF5500]">
        <div className="flex justify-center mb-4">
          <Loader2 size={36} className="text-[#FF5500] animate-spin" />
        </div>
        <span className="text-[10px] font-black tracking-widest text-[#FF5500] uppercase">
          Google OAuth
        </span>
        <h2 className="text-lg font-black uppercase text-white mt-1">Verifying Account...</h2>
        <p className="text-xs text-zinc-400 font-semibold mt-2">
          Exchanging secure session with Supabase. Please wait a moment.
        </p>
      </div>
    </div>
  );
}
