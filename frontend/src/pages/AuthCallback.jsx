import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, supabaseSignInWithGoogle, supabaseUpsertProfile } from "@/lib/supabase";
import { linkOrUpdateGoogleUser, getRegisteredUserByEmail, saveRegisteredUser, updateProHourlyRate } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import { BENGALURU_AREAS } from "@/lib/locationAreas";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Briefcase,
  UserCheck,
  UserX,
  MapPin,
  Phone,
  ArrowRight,
  RefreshCw,
  Home,
  User,
  Sparkles,
  Building,
  ShieldCheck,
  IndianRupee
} from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adoptSession } = useAuth();

  const [status, setStatus] = useState("verifying"); // 'verifying' | 'not_registered' | 'onboarding' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [authUser, setAuthUser] = useState(null);

  // First-time onboarding states
  const [selectedRole, setSelectedRole] = useState(
    () => localStorage.getItem("workhop_pending_role") || "freelancer"
  );
  const [selectedArea, setSelectedArea] = useState(
    () => localStorage.getItem("workhop_user_area") || "Indiranagar"
  );
  const [fullNameInput, setFullNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [rateInput, setRateInput] = useState("500");
  const [gstInput, setGstInput] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState("");
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
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (!error && data?.session) {
              session = data.session;
            }
          } catch (codeErr) {
            console.warn("Manual exchange code notice:", codeErr?.message);
          }
        }

        // Wait brief delay if hash token is being parsed by client
        if (!session) {
          await new Promise((r) => setTimeout(r, 600));
          const retry = await supabase.auth.getSession();
          session = retry?.data?.session;
        }

        if (!session?.user) {
          throw new Error(
            "Could not retrieve an authenticated Google session. Please click 'Try Again with Google' below."
          );
        }

        if (!isMounted) return;

        const user = session.user;
        setAuthUser(user);

        const googleName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        setFullNameInput((prev) => prev || googleName);

        // 3. Check for existing profile in Supabase
        let existingProfile = null;
        try {
          const profileRes = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          existingProfile = profileRes?.data || null;
        } catch (profileErr) {
          console.warn("Supabase profile fetch notice:", profileErr?.message);
        }

        // Also check by email in Supabase if id didn't match
        if (!existingProfile && user.email) {
          try {
            const emailRes = await supabase
              .from("profiles")
              .select("*")
              .eq("email", user.email)
              .maybeSingle();
            if (emailRes?.data) {
              existingProfile = emailRes.data;
            }
          } catch (e) {
            console.warn("Supabase email lookup notice:", e?.message);
          }
        }

        const intentParam = searchParams.get("intent") || hashParams.get("intent");
        const roleParam = searchParams.get("role") || hashParams.get("role");

        // Read stored intent from storage / cookie
        const cookieMatch = typeof document !== "undefined" && document.cookie.match(/workhop_auth_intent=([^;]+)/);
        const cookieIntent = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        const storedIntent =
          intentParam ||
          localStorage.getItem("workhop_auth_intent") ||
          sessionStorage.getItem("workhop_auth_intent") ||
          cookieIntent ||
          "signup"; // Default to signup so new signups are ALWAYS prompted for details!

        // Also check existing local user by email
        const existingLocal = getRegisteredUserByEmail(user.email);
        const pendingRole = roleParam || localStorage.getItem("workhop_pending_role");

        // Determine if account actually exists
        const hasRegisteredAccount = Boolean(
          (existingProfile && (existingProfile.phone || existingProfile.skill || existingProfile.company_name)) ||
          (existingLocal && (existingLocal.phone || existingLocal.skill || existingLocal.company_name))
        );

        // Check if profile is complete (has valid 10-digit phone AND profession/company)
        const cleanExistingPhone = (existingProfile?.phone || existingLocal?.phone || "").replace(/\D/g, "");
        const hasValidPhone = cleanExistingPhone.length === 10;
        const targetRole = roleParam || existingProfile?.role || existingLocal?.role || pendingRole || "freelancer";
        const hasSkillOrCompany = Boolean(
          targetRole === "employer"
            ? (existingProfile?.company_name || existingLocal?.company_name)
            : (existingProfile?.skill || existingLocal?.skill)
        );
        const isProfileComplete = hasValidPhone && hasSkillOrCompany;

        // Populate known fields for onboarding form
        if (cleanExistingPhone.length >= 10) {
          setPhoneInput(cleanExistingPhone.slice(-10));
        }
        if (existingProfile?.skill || existingLocal?.skill) {
          setSkillInput(existingProfile?.skill || existingLocal?.skill || "");
        }
        if (existingProfile?.company_name || existingLocal?.company_name) {
          setCompanyInput(existingProfile?.company_name || existingLocal?.company_name || "");
        }
        if (existingProfile?.area || existingLocal?.area) {
          setSelectedArea(existingProfile?.area || existingLocal?.area || "Indiranagar");
        }
        if (targetRole) {
          setSelectedRole(targetRole);
        }
        if (existingProfile?.rate_hr) {
          setRateInput(String(existingProfile.rate_hr));
        }

        // Case 1: If user said SIGN IN and is NOT registered:
        if (storedIntent === "signin" && !hasRegisteredAccount) {
          setStatus("not_registered");
          return;
        }

        // Case 2: If user said SIGN IN and has a COMPLETE profile (phone + profession):
        if (storedIntent === "signin" && hasRegisteredAccount && isProfileComplete) {
          const finalRole = existingProfile?.role || existingLocal?.role || targetRole;
          const finalArea = existingProfile?.area || existingLocal?.area || "Bengaluru";

          const sessionUser = linkOrUpdateGoogleUser(user, finalRole, finalArea);
          await adoptSession(session.access_token || `token_${Date.now()}`, sessionUser);

          if (finalRole === "employer") {
            navigate("/employer/dashboard", { replace: true });
          } else {
            navigate("/freelancer/jobs", { replace: true });
          }
          return;
        }

        // Case 3: User clicked SIGN UP (or profile details are missing):
        // ALWAYS prompt them to complete their full profile (Name, Role, Area, Phone, Profession, Rate, Terms)!
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
    setFormError("");

    const cleanName = fullNameInput.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError("Please enter your full name.");
      return;
    }

    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFormError("Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).");
      return;
    }

    if (!selectedArea) {
      setFormError("Please select your Bengaluru neighborhood.");
      return;
    }

    const cleanSkill = skillInput.trim();
    if (selectedRole === "freelancer" && (!cleanSkill || cleanSkill.length < 2)) {
      setFormError("Please enter your primary profession / skill (e.g. Logo Designer, Developer, Electrician).");
      return;
    }

    const cleanCompany = companyInput.trim();
    if (selectedRole === "employer" && (!cleanCompany || cleanCompany.length < 2)) {
      setFormError("Please enter your company or business name.");
      return;
    }

    if (!termsAccepted) {
      setFormError("Please agree to the Terms of Service and confirm you are 18+ years of age.");
      return;
    }

    setSubmitting(true);

    try {
      const avatarUrl =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null;
      const cleanGst = gstInput.trim().toUpperCase();
      const numRate = selectedRole === "freelancer" ? (Math.max(50, Number(rateInput)) || 500) : null;

      // 1. Reliably save profile to Supabase database
      await supabaseUpsertProfile({
        id: authUser.id,
        email: authUser.email,
        name: cleanName,
        avatar_url: avatarUrl,
        role: selectedRole,
        area: selectedArea,
        phone: `+91 ${cleanPhone}`,
        phone_verified: true,
        email_verified: true,
        skill: selectedRole === "freelancer" ? cleanSkill : null,
        company_name: selectedRole === "employer" ? cleanCompany : null,
        gst_number: selectedRole === "employer" && cleanGst ? cleanGst : null,
        rate_hr: numRate,
        hops_balance: 0,
        updated_at: new Date().toISOString(),
      });

      // 2. Real-time sync to /api/users for Admin dashboard
      await apiPost("/users", {
        email: authUser.email,
        role: selectedRole,
        name: cleanName,
        phone: cleanPhone,
        area: selectedArea,
        company_name: selectedRole === "employer" ? cleanCompany : undefined,
        skill: selectedRole !== "employer" ? cleanSkill : undefined,
        gst_number: selectedRole === "employer" && cleanGst ? cleanGst : undefined,
        rate_hr: numRate || undefined,
      }).catch(() => {});

      // 3. Link & register locally in clientStore
      saveRegisteredUser(authUser.email, "", {
        id: authUser.id,
        email: authUser.email,
        name: cleanName,
        role: selectedRole,
        area: selectedArea,
        phone: `+91 ${cleanPhone}`,
        skill: selectedRole === "freelancer" ? cleanSkill : "",
        company_name: selectedRole === "employer" ? cleanCompany : "",
        rate_hr: numRate || undefined,
      });

      localStorage.setItem("workhop_auth_role", selectedRole);
      localStorage.setItem("workhop_user_area", selectedArea);
      localStorage.setItem("workhop_pro_phone", `+91 ${cleanPhone}`);
      localStorage.setItem("workhop_pro_name", cleanName);
      if (selectedRole === "freelancer") {
        localStorage.setItem("workhop_pro_skill", cleanSkill);
        if (numRate) {
          localStorage.setItem("workhop_pro_rate_hr", String(numRate));
          updateProHourlyRate(authUser.id, numRate);
          updateProHourlyRate(authUser.email, numRate);
        }
      } else {
        localStorage.setItem("workhop_company_name", cleanCompany);
        if (cleanGst) localStorage.setItem("workhop_employer_gst", cleanGst);
      }

      const sessionUser = linkOrUpdateGoogleUser(authUser, selectedRole, selectedArea);
      sessionUser.name = cleanName;
      sessionUser.phone = `+91 ${cleanPhone}`;
      if (selectedRole === "freelancer") sessionUser.skill = cleanSkill;
      if (selectedRole === "employer") sessionUser.company_name = cleanCompany;

      // 4. Adopt session in AuthContext
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token || `token_${Date.now()}`;
      await adoptSession(token, sessionUser);

      // Clean up temporary role flag & intent
      localStorage.removeItem("workhop_pending_role");
      localStorage.removeItem("workhop_auth_intent");

      // 5. Redirect: freelancers go to Onboarding flow (/freelancer), employers go to /employer/dashboard
      if (selectedRole === "employer") {
        navigate("/employer/dashboard", { replace: true });
      } else {
        navigate("/freelancer", { replace: true });
      }
    } catch (err) {
      console.warn("Failed to complete onboarding:", err);
      // Fallback navigation
      navigate(selectedRole === "employer" ? "/employer/dashboard" : "/freelancer", {
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
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      await supabaseSignInWithGoogle();
    } catch (err) {
      setErrorMessage(err.message || "Failed to initiate Google OAuth.");
      setStatus("error");
    }
  };

  // ══════════════════════════════════════════════════
  // UI: NOT REGISTERED SCREEN (User said "Sign In" but account not found)
  // ══════════════════════════════════════════════════
  if (status === "not_registered") {
    const userEmail = authUser?.email || "this email";
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md border-4 border-white bg-[#1A1A1A] p-6 sm:p-8 shadow-[8px_8px_0px_#FF5500]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-white bg-amber-950 text-amber-400 shrink-0">
              <UserX size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#FF5500] uppercase">
                Account Status
              </span>
              <h1 className="text-xl font-black uppercase text-white">Not Registered</h1>
            </div>
          </div>

          <div className="bg-[#242424] p-4 border border-zinc-700 mb-6">
            <p className="text-xs text-zinc-300 font-semibold leading-relaxed">
              No WorkHop account was found associated with <span className="text-white font-mono font-bold">{userEmail}</span>.
            </p>
            <p className="text-xs text-amber-300 font-bold mt-2.5">
              Not registered. Please register first to create your profile and start using WorkHop.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                localStorage.setItem("workhop_auth_intent", "signup");
                setStatus("onboarding");
              }}
              className="flex w-full items-center justify-center gap-2 border-2 border-white bg-[#FF5500] text-white py-3.5 px-4 text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_#FFFFFF] hover:bg-[#E04B00] active:translate-y-0.5 transition"
            >
              <ArrowRight size={16} />
              Register Profile with This Account
            </button>
            <button
              onClick={handleRetryGoogle}
              className="flex w-full items-center justify-center gap-2 border-2 border-zinc-600 bg-[#242424] text-zinc-200 py-3 px-4 text-xs font-bold tracking-wider uppercase hover:bg-zinc-700 transition"
            >
              <RefreshCw size={15} />
              Sign In with a Different Account
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex w-full items-center justify-center gap-2 border-2 border-zinc-800 bg-transparent text-zinc-400 py-2.5 px-4 text-xs font-bold tracking-wider uppercase hover:text-white transition"
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
              onClick={() => {
                window.location.href = "/";
              }}
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
  // UI: ONBOARDING VIEW (Fill in details to complete profile)
  // ══════════════════════════════════════════════════
  if (status === "onboarding" && authUser) {
    const userEmail = authUser.email;
    const userAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;

    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans py-10">
        <div className="w-full max-w-lg border-4 border-white bg-[#1A1A1A] p-6 sm:p-8 shadow-[10px_10px_0px_#FF5500]">
          {/* Header */}
          <div className="flex items-center gap-3.5 pb-5 border-b-2 border-zinc-700">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={fullNameInput || "User"}
                className="h-12 w-12 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center border-2 border-white bg-[#FF5500] font-black text-white text-lg">
                {(fullNameInput || "U")[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-emerald-400 uppercase">
                <CheckCircle2 size={13} />
                <span>Google Verified Account</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Complete Your Profile
              </h2>
              <p className="text-xs text-zinc-400 font-semibold">{userEmail}</p>
            </div>
          </div>

          {formError && (
            <div className="mt-4 p-3 border-2 border-red-500 bg-red-950/40 text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCompleteOnboarding} className="mt-6 space-y-4">
            {/* 1. Role Selection */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-2">
                1. Select Your Role on WorkHop: *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Freelancer Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("freelancer")}
                  className={`p-3.5 text-left border-2 transition ${
                    selectedRole === "freelancer"
                      ? "border-[#FF5500] bg-[#FF5500]/15 shadow-[4px_4px_0px_#FF5500]"
                      : "border-zinc-700 bg-[#242424] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <UserCheck
                      size={20}
                      className={
                        selectedRole === "freelancer" ? "text-[#FF5500]" : "text-zinc-400"
                      }
                    />
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-zinc-600 bg-black/40 text-zinc-300">
                      0% Commission
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase">I Want to Work</h3>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5 leading-snug">
                    Discover local gigs in Bengaluru and apply directly within 5km.
                  </p>
                </button>

                {/* Employer Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("employer")}
                  className={`p-3.5 text-left border-2 transition ${
                    selectedRole === "employer"
                      ? "border-[#FF5500] bg-[#FF5500]/15 shadow-[4px_4px_0px_#FF5500]"
                      : "border-zinc-700 bg-[#242424] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Briefcase
                      size={20}
                      className={
                        selectedRole === "employer" ? "text-[#FF5500]" : "text-zinc-400"
                      }
                    />
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-zinc-600 bg-black/40 text-zinc-300">
                      Direct Hire
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase">I Want to Hire</h3>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5 leading-snug">
                    Post gigs and connect with verified creators &amp; engineers.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Full Name */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                2. Full Name: *
              </label>
              <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                <User size={16} className="text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* 3. Bengaluru Neighborhood Picker */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                3. Your Bengaluru Neighborhood: *
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

            {/* 4. WhatsApp / Mobile Phone */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                  4. WhatsApp / Contact Phone: *
                </label>
                <span className="text-[10px] text-zinc-400 font-bold">10-Digit Mobile Number</span>
              </div>
              <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                <Phone size={16} className="text-[#FF5500] mr-2 shrink-0" />
                <span className="text-xs font-bold text-zinc-300 mr-1.5">+91</span>
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

            {/* 5. Role-Specific Details */}
            {selectedRole === "freelancer" ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                    5. Primary Skill / Profession: *
                  </label>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                    <Sparkles size={16} className="text-[#FF5500] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="e.g. Logo Designer, React Developer, Videographer"
                      className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                      6. Starting Rate per Hour (₹ INR): *
                    </label>
                    <span className="text-[10px] text-[#FF5500] font-bold">You can change this anytime</span>
                  </div>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                    <span className="text-sm font-black text-[#FF5500] mr-2">₹</span>
                    <input
                      type="number"
                      min={50}
                      max={50000}
                      step={50}
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      placeholder="500"
                      className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400 ml-1">/ hr</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[350, 500, 750, 1000, 1500, 2500].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setRateInput(String(preset))}
                        className={`px-2 py-0.5 text-[10px] font-black border transition cursor-pointer ${
                          Number(rateInput) === preset
                            ? "border-white bg-[#FF5500] text-white"
                            : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
                        }`}
                      >
                        ₹{preset}/hr
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                    5. Company / Business Name: *
                  </label>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                    <Building size={16} className="text-[#FF5500] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      placeholder="e.g. Acme Tech Studio, Freelance Recruiter"
                      className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                      GSTIN / GST Number (Optional):
                    </label>
                    <span className="text-[10px] text-zinc-400 font-bold">Optional</span>
                  </div>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                    <input
                      type="text"
                      maxLength={15}
                      value={gstInput}
                      onChange={(e) => setGstInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      className="w-full bg-transparent text-xs font-mono font-bold text-white placeholder-zinc-500 outline-none uppercase"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 6. Terms & 18+ Age Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#FF5500] border-zinc-600 bg-[#242424]"
                />
                <span className="leading-snug text-[11px]">
                  I agree to the <a href="/legal" target="_blank" rel="noreferrer" className="text-[#FF5500] underline font-bold">Terms of Service</a> &amp; confirm that I am 18+ years of age.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 border-2 border-white bg-[#FF5500] py-3.5 px-4 text-xs font-black tracking-wider text-white uppercase shadow-[4px_4px_0px_#FFFFFF] hover:bg-[#E04B00] active:translate-y-0.5 transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Your Profile...</span>
                </>
              ) : (
                <>
                  <span>Complete Profile &amp; Enter WorkHop</span>
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
