import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, supabaseSignInWithGoogle, supabaseUpsertProfile } from "@/lib/supabase";
import {
  linkOrUpdateGoogleUser,
  getRegisteredUserByEmail,
  saveRegisteredUser,
  updateProHourlyRate,
  isUserAdmin,
} from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";
import { apiPost, clearToken } from "@/lib/api";
import { BENGALURU_AREAS, findNearestArea, setSavedArea } from "@/lib/locationAreas";
import { DISCIPLINES_CATALOG } from "@/lib/catalogFilters";
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
  Mail,
  FileText,
  Clock,
  Navigation,
  LogIn,
} from "lucide-react";

const CATEGORY_OPTIONS = DISCIPLINES_CATALOG.map((d) => d.category);
const EXPERIENCE_OPTIONS = [
  "Fresher (< 1 Year)",
  "1–3 Years",
  "3–5 Years",
  "5–8 Years",
  "8+ Years",
];

function computeLocalMissingFields(role, data = {}) {
  const missing = [];
  const phoneDigits = String(data.phone || "").replace(/\D/g, "").slice(-10);
  if (phoneDigits.length !== 10) missing.push("Phone Number");

  if (role === "employer") {
    if (!String(data.company_name || "").trim()) missing.push("Business / Organization Name");
    if (!String(data.hiring_for || data.category || "").trim()) missing.push("Type of Work Hired For");
    if (!String(data.area || "").trim()) missing.push("Location");
  } else {
    if (!String(data.category || "").trim()) missing.push("Profession / Service Category");
    if (!String(data.skill || "").trim() || data.skill === "Pro") missing.push("Skills");
    if (!String(data.experience || "").trim()) missing.push("Experience");
    if (!String(data.bio || data.intro || "").trim()) missing.push("Bio");
    if (!String(data.area || "").trim()) missing.push("Location");
  }
  return missing;
}

function isProtectedEmail(email) {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return [
    "zenithdeveleoperss@gmail.com",
    "zenithdeveloperss@gmail.com",
    "manarastudio22@gmail.com",
    "alia.m@cobblestonedesigns.in",
    "aliamansoor@gmail.com",
    "ayaanwann@gmail.com",
    "ayaaan.vlogs@gmail.com",
    "shamanthnmurthy@gmail.com",
  ].includes(clean);
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adoptSession } = useAuth();
  const processedRef = useRef(false);

  // 'verifying' | 'not_registered' | 'already_registered' | 'onboarding' | 'error'
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [rejectedEmail, setRejectedEmail] = useState("");

  // Onboarding form states
  const [selectedRole, setSelectedRole] = useState(() => {
    const saved =
      localStorage.getItem("workhop_pending_role") ||
      sessionStorage.getItem("workhop_pending_role");
    return saved === "employer" ? "employer" : "freelancer";
  });
  const [roleLocked, setRoleLocked] = useState(() =>
    Boolean(
      localStorage.getItem("workhop_pending_role") ||
        sessionStorage.getItem("workhop_pending_role")
    )
  );
  const [fullNameInput, setFullNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedArea, setSelectedArea] = useState("Indiranagar");
  const [detectingLoc, setDetectingLoc] = useState(false);

  // Freelancer fields
  const [categoryInput, setCategoryInput] = useState("Graphics & Design");
  const [skillInput, setSkillInput] = useState("");
  const [experienceInput, setExperienceInput] = useState("1–3 Years");
  const [bioInput, setBioInput] = useState("");
  const [rateInput, setRateInput] = useState("500");

  // Employer fields
  const [companyInput, setCompanyInput] = useState("");
  const [hiringForInput, setHiringForInput] = useState("Graphics & Design");
  const [gstInput, setGstInput] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    let isMounted = true;

    function clearPendingFlags() {
      try {
        localStorage.removeItem("workhop_oauth_pending");
        sessionStorage.removeItem("workhop_oauth_pending");
        document.cookie = "workhop_oauth_pending=; path=/; max-age=0";
      } catch {}
    }

    async function handleAuth() {
      try {
        // 1. Check for OAuth error params in URL query or hash
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
          clearPendingFlags();
          if (error === "access_denied" || error.includes("cancel")) {
            throw new Error(
              "Google sign-in was cancelled. You did not grant permissions or closed the account picker."
            );
          }
          throw new Error(errorDesc || "Google authentication failed. Please try again.");
        }

        // 2. Read intent ('signup' | 'signin') and role ('freelancer' | 'employer')
        const intentParam = searchParams.get("intent") || hashParams.get("intent");
        const roleParam = searchParams.get("role") || hashParams.get("role");

        const cookieIntentMatch =
          typeof document !== "undefined" &&
          document.cookie.match(/workhop_auth_intent=([^;]+)/);
        const cookieRoleMatch =
          typeof document !== "undefined" &&
          document.cookie.match(/workhop_pending_role=([^;]+)/);

        const storedIntentRaw =
          intentParam ||
          sessionStorage.getItem("workhop_auth_intent") ||
          localStorage.getItem("workhop_auth_intent") ||
          (cookieIntentMatch ? decodeURIComponent(cookieIntentMatch[1]) : null) ||
          "signin";
        const storedIntent = storedIntentRaw === "signup" ? "signup" : "signin";

        const storedRoleRaw =
          roleParam ||
          sessionStorage.getItem("workhop_pending_role") ||
          localStorage.getItem("workhop_pending_role") ||
          (cookieRoleMatch ? decodeURIComponent(cookieRoleMatch[1]) : null);
        const chosenRole = storedRoleRaw === "employer" ? "employer" : "freelancer";

        if (storedRoleRaw) {
          setSelectedRole(chosenRole);
          setRoleLocked(true);
        }

        // 3. Retrieve or exchange Supabase session
        let session = null;
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        if (sessionData?.session) {
          session = sessionData.session;
        } else if (location.search.includes("code=")) {
          try {
            const { data, error: codeExErr } = await supabase.auth.exchangeCodeForSession(
              window.location.href
            );
            if (!codeExErr && data?.session) {
              session = data.session;
            }
          } catch (codeErr) {
            console.warn("Exchange code notice:", codeErr?.message);
          }
        }

        if (!session) {
          await new Promise((r) => setTimeout(r, 600));
          const retry = await supabase.auth.getSession();
          session = retry?.data?.session;
        }

        if (!session?.user) {
          clearPendingFlags();
          throw new Error(
            "Could not retrieve an authenticated Google session. Please click 'Try Again with Google' below."
          );
        }

        if (!isMounted) return;

        const user = session.user;
        const cleanEmail = (user.email || "").trim().toLowerCase();
        const googleName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          cleanEmail
            .split("@")[0]
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        const avatarUrl =
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

        setAuthUser(user);
        setRejectedEmail(cleanEmail);
        setFullNameInput(googleName);

        // 4. Check existing Supabase profile & local registration
        let existingSbProfile = null;
        try {
          const { data: sbByEmail } = await supabase
            .from("profiles")
            .select("*")
            .ilike("email", cleanEmail);
          if (Array.isArray(sbByEmail) && sbByEmail.length > 0) {
            existingSbProfile = sbByEmail[0];
          }
        } catch {}

        const existingLocal = getRegisteredUserByEmail(cleanEmail);
        const userMeta = user.user_metadata || {};

        const isGenuineSbProfile = Boolean(
          existingSbProfile &&
            (existingSbProfile.profile_status === "complete" ||
              existingSbProfile.profile_status === "incomplete" ||
              (existingSbProfile.phone &&
                String(existingSbProfile.phone).replace(/\D/g, "").length >= 10) ||
              (existingSbProfile.skill &&
                String(existingSbProfile.skill).trim() &&
                existingSbProfile.skill !== "Pro") ||
              (existingSbProfile.bio && String(existingSbProfile.bio).trim()) ||
              (existingSbProfile.hops_balance !== undefined &&
                existingSbProfile.hops_balance !== null &&
                Number(existingSbProfile.hops_balance) === 0))
        );

        const isGenuineLocal = Boolean(
          existingLocal &&
            (existingLocal.workhop_registered === true ||
              existingLocal.profile_status === "complete" ||
              existingLocal.profile_status === "incomplete" ||
              (existingLocal.phone &&
                String(existingLocal.phone).replace(/\D/g, "").length >= 10) ||
              (existingLocal.skill &&
                String(existingLocal.skill).trim() &&
                existingLocal.skill !== "Pro") ||
              existingLocal.company_name)
        );

        const isMetaRegistered = Boolean(
          userMeta.workhop_registered === true ||
            userMeta.profile_status === "complete" ||
            userMeta.profile_status === "incomplete"
        );

        // 5. Call server-side /api/users (action: oauth_check_or_init) for authoritative check + service_role cleanup
        let serverDecision = null;
        try {
          serverDecision = await apiPost("/users", {
            action: "oauth_check_or_init",
            access_token: session.access_token,
            intent: storedIntent,
            role: chosenRole,
            user_id: user.id,
            email: cleanEmail,
            name: googleName,
            avatar_url: avatarUrl,
            user_metadata: userMeta,
          });
        } catch (srvErr) {
          console.warn("Server OAuth check fallback to local check:", srvErr?.message);
        }

        // Also invoke Supabase Edge Function if deployed (non-blocking backup)
        if (storedIntent === "signin" && (!serverDecision || serverDecision.status === "not_registered")) {
          try {
            supabase.functions
              .invoke("google-oauth-guard", {
                body: {
                  action: "oauth_check_or_init",
                  access_token: session.access_token,
                  intent: storedIntent,
                  role: chosenRole,
                },
              })
              .catch(() => {});
          } catch {}
        }

        const isRegistered = Boolean(
          serverDecision?.registered === true ||
            isGenuineSbProfile ||
            isGenuineLocal ||
            isMetaRegistered ||
            isProtectedEmail(cleanEmail) ||
            isUserAdmin(cleanEmail)
        );

        clearPendingFlags();

        // ──────────────────────────────────────────────────────────────────
        // CASE A: User clicked "Log In" with a NEVER-REGISTERED Google account
        // ──────────────────────────────────────────────────────────────────
        if (
          storedIntent === "signin" &&
          (serverDecision?.status === "not_registered" || !isRegistered) &&
          !isProtectedEmail(cleanEmail) &&
          !isUserAdmin(cleanEmail)
        ) {
          try {
            await supabase.auth.signOut();
          } catch {}
          clearToken();
          localStorage.removeItem("workhop_user_data");
          localStorage.removeItem(`workhop_oauth_verified_${user.id}`);
          if (isMounted) {
            setStatus("not_registered");
          }
          return;
        }

        // ──────────────────────────────────────────────────────────────────
        // CASE B: User clicked "Sign Up" with an ALREADY-REGISTERED Google account
        // ──────────────────────────────────────────────────────────────────
        if (
          storedIntent === "signup" &&
          (serverDecision?.status === "already_registered" ||
            isGenuineSbProfile ||
            isGenuineLocal ||
            isMetaRegistered ||
            isProtectedEmail(cleanEmail) ||
            isUserAdmin(cleanEmail))
        ) {
          try {
            await supabase.auth.signOut();
          } catch {}
          clearToken();
          localStorage.removeItem("workhop_user_data");
          localStorage.removeItem(`workhop_oauth_verified_${user.id}`);
          if (isMounted) {
            setStatus("already_registered");
          }
          return;
        }

        // Determine effective role & merged profile data (ignore trigger-default 'freelancer' on uninitialized profiles)
        const srvProfile = serverDecision?.profile || {};
        const effectiveRole =
          (srvProfile.role ||
            (isGenuineSbProfile ? existingSbProfile?.role : null) ||
            (isGenuineLocal ? existingLocal?.role : null) ||
            (isMetaRegistered ? userMeta?.role : null) ||
            chosenRole) === "employer"
            ? "employer"
            : "freelancer";

        setSelectedRole(effectiveRole);

        // ──────────────────────────────────────────────────────────────────
        // CASE C: New Sign Up -> Immediately save Incomplete Profile & show Onboarding
        // ──────────────────────────────────────────────────────────────────
        if (storedIntent === "signup" && !isRegistered) {
          const initialMissing = computeLocalMissingFields(effectiveRole, {});

          // Ensure Supabase profile has hops_balance = 0 & role (distinguishing from trigger defaults)
          await supabaseUpsertProfile({
            id: user.id,
            email: cleanEmail,
            name: googleName,
            role: effectiveRole,
            avatar_url: avatarUrl,
            hops_balance: 0,
            updated_at: new Date().toISOString(),
          });

          try {
            await supabase.auth.updateUser({
              data: {
                workhop_registered: true,
                role: effectiveRole,
                profile_status: "incomplete",
                missing_fields: initialMissing,
              },
            });
          } catch {}

          // Save incomplete profile locally so Admin Dashboard shows "Incomplete profile" right away
          saveRegisteredUser(cleanEmail, "", {
            id: user.id,
            email: cleanEmail,
            name: googleName,
            picture: avatarUrl,
            role: effectiveRole,
            phone: "",
            area: "",
            skill: "",
            category: "",
            company_name: "",
            hiring_for: "",
            experience: "",
            bio: "",
            profile_status: "incomplete",
            missing_fields: initialMissing,
            workhop_registered: true,
            auth_provider: "google",
          });

          if (isMounted) {
            setStatus("onboarding");
          }
          return;
        }

        // ──────────────────────────────────────────────────────────────────
        // CASE D: Registered User Logging In -> Check if Complete or Incomplete
        // ──────────────────────────────────────────────────────────────────
        const mergedProfile = {
          name:
            srvProfile.name ||
            existingSbProfile?.name ||
            existingLocal?.name ||
            googleName,
          email: cleanEmail,
          phone:
            srvProfile.phone ||
            existingSbProfile?.phone ||
            existingLocal?.phone ||
            userMeta?.phone ||
            "",
          role: effectiveRole,
          area:
            srvProfile.area ||
            existingSbProfile?.area ||
            existingLocal?.area ||
            userMeta?.area ||
            "",
          category:
            srvProfile.category ||
            existingSbProfile?.category ||
            existingLocal?.category ||
            userMeta?.category ||
            "",
          skill:
            srvProfile.skill ||
            existingSbProfile?.skill ||
            existingLocal?.skill ||
            userMeta?.skill ||
            "",
          experience:
            srvProfile.experience ||
            existingLocal?.experience ||
            userMeta?.experience ||
            "",
          bio:
            srvProfile.bio ||
            existingSbProfile?.bio ||
            existingLocal?.bio ||
            existingLocal?.intro ||
            userMeta?.bio ||
            "",
          company_name:
            srvProfile.company_name ||
            existingLocal?.company_name ||
            userMeta?.company_name ||
            (effectiveRole === "employer" ? existingSbProfile?.skill || "" : ""),
          hiring_for:
            srvProfile.hiring_for ||
            existingLocal?.hiring_for ||
            userMeta?.hiring_for ||
            (effectiveRole === "employer" ? existingSbProfile?.category || "" : ""),
          rate_hr:
            srvProfile.rate_hr ||
            existingLocal?.rate_hr ||
            userMeta?.rate_hr ||
            500,
          profile_status:
            srvProfile.profile_status ||
            existingSbProfile?.profile_status ||
            existingLocal?.profile_status ||
            userMeta?.profile_status ||
            "",
        };

        // Pre-populate onboarding inputs with any already-saved fields
        if (mergedProfile.name) setFullNameInput(mergedProfile.name);
        const cleanDigits = String(mergedProfile.phone || "").replace(/\D/g, "");
        if (cleanDigits.length >= 10) setPhoneInput(cleanDigits.slice(-10));
        if (mergedProfile.area && mergedProfile.area !== "Not set") {
          setSelectedArea(mergedProfile.area);
        }
        if (mergedProfile.category) setCategoryInput(mergedProfile.category);
        if (mergedProfile.skill && mergedProfile.skill !== "Pro" && mergedProfile.skill !== "Incomplete Profile") {
          setSkillInput(mergedProfile.skill);
        }
        if (mergedProfile.experience) setExperienceInput(mergedProfile.experience);
        if (mergedProfile.bio) setBioInput(mergedProfile.bio);
        if (mergedProfile.company_name && mergedProfile.company_name !== "Pending Business Name") {
          setCompanyInput(mergedProfile.company_name);
        }
        if (mergedProfile.hiring_for) setHiringForInput(mergedProfile.hiring_for);
        if (mergedProfile.rate_hr) setRateInput(String(mergedProfile.rate_hr));

        const missingNow = computeLocalMissingFields(effectiveRole, mergedProfile);
        const isExplicitlyIncomplete =
          serverDecision?.status === "onboarding" ||
          mergedProfile.profile_status === "incomplete" ||
          userMeta?.profile_status === "incomplete";

        const isComplete =
          !isExplicitlyIncomplete &&
          (serverDecision?.status === "complete" ||
            mergedProfile.profile_status === "complete" ||
            isProtectedEmail(cleanEmail) ||
            isUserAdmin(cleanEmail) ||
            (cleanDigits.length === 10 &&
              (effectiveRole === "employer"
                ? Boolean(mergedProfile.company_name)
                : Boolean(mergedProfile.skill && mergedProfile.skill !== "Pro"))) ||
            missingNow.length === 0);

        if (isComplete) {
          localStorage.setItem(`workhop_oauth_verified_${user.id}`, "1");
          const finalArea = mergedProfile.area || "Bengaluru";
          const sessionUser = linkOrUpdateGoogleUser(user, effectiveRole, finalArea);
          sessionUser.role = effectiveRole;
          sessionUser.name = mergedProfile.name || googleName;
          sessionUser.phone = mergedProfile.phone || sessionUser.phone || "";
          sessionUser.profile_status = "complete";
          sessionUser.workhop_registered = true;
          if (effectiveRole === "employer") {
            sessionUser.company_name = mergedProfile.company_name || sessionUser.name;
            sessionUser.hiring_for = mergedProfile.hiring_for || "Graphics & Design";
          } else {
            sessionUser.skill = mergedProfile.skill || "Creative Pro";
            sessionUser.category = mergedProfile.category || "Graphics & Design";
            sessionUser.experience = mergedProfile.experience || "";
            sessionUser.bio = mergedProfile.bio || "";
          }

          saveRegisteredUser(cleanEmail, "", sessionUser);
          await adoptSession(session.access_token || `token_${Date.now()}`, sessionUser);

          localStorage.removeItem("workhop_pending_role");
          localStorage.removeItem("workhop_auth_intent");
          sessionStorage.removeItem("workhop_pending_role");
          sessionStorage.removeItem("workhop_auth_intent");

          if (sessionUser.is_admin || isUserAdmin(cleanEmail)) {
            navigate("/admin", { replace: true });
          } else if (effectiveRole === "employer") {
            navigate("/employer/dashboard", { replace: true });
          } else {
            navigate("/freelancer/jobs", { replace: true });
          }
          return;
        }

        // Registered user with incomplete profile -> send to mandatory profile completion!
        if (isMounted) {
          setStatus("onboarding");
        }
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

  const handleDetectLocation = async () => {
    setDetectingLoc(true);
    try {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const nearest = findNearestArea({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              if (nearest?.name) {
                setSelectedArea(nearest.name);
                setSavedArea(nearest.name);
              }
              resolve();
            },
            () => resolve(),
            { timeout: 6000 }
          );
        });
      }
    } catch {
      /* ignore */
    } finally {
      setDetectingLoc(false);
    }
  };

  // Handle mandatory profile completion submit
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
      setFormError("Please select your Bengaluru location.");
      return;
    }

    if (selectedRole === "freelancer") {
      if (!categoryInput) {
        setFormError("Please select your profession / service category.");
        return;
      }
      if (!skillInput.trim() || skillInput.trim().length < 2) {
        setFormError("Please enter your skills (e.g. Architecture, UI/UX Design, React, Video Editing).");
        return;
      }
      if (!experienceInput) {
        setFormError("Please select your years of experience.");
        return;
      }
      if (!bioInput.trim() || bioInput.trim().length < 10) {
        setFormError("Please write a short bio (at least 10 characters) describing your work.");
        return;
      }
    } else {
      if (!companyInput.trim() || companyInput.trim().length < 2) {
        setFormError("Please enter your business or organization name.");
        return;
      }
      if (!hiringForInput) {
        setFormError("Please select the type of work you hire for.");
        return;
      }
    }

    if (!termsAccepted) {
      setFormError("Please agree to the Terms of Service and confirm you are 18+ years of age.");
      return;
    }

    setSubmitting(true);

    try {
      const cleanEmail = (authUser.email || "").trim().toLowerCase();
      const avatarUrl =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null;
      const cleanSkill = skillInput.trim();
      const cleanBio = bioInput.trim();
      const cleanCompany = companyInput.trim();
      const cleanGst = gstInput.trim().toUpperCase();
      const numRate = selectedRole === "freelancer" ? (Math.max(50, Number(rateInput)) || 500) : 500;
      const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;

      // 1. Save complete profile to Supabase profiles table
      await supabaseUpsertProfile({
        id: authUser.id,
        email: cleanEmail,
        name: cleanName,
        avatar_url: avatarUrl,
        role: selectedRole,
        area: selectedArea,
        phone: formattedPhone,
        phone_verified: true,
        bio: selectedRole === "freelancer" ? cleanBio : `Hiring for ${hiringForInput} at ${cleanCompany}`,
        skill: selectedRole === "freelancer" ? cleanSkill : cleanCompany,
        category: selectedRole === "freelancer" ? categoryInput : hiringForInput,
        hops_balance: 0,
        updated_at: new Date().toISOString(),
      });

      // 2. Save extended onboarding metadata to Supabase Auth user_metadata
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: cleanName,
            name: cleanName,
            workhop_registered: true,
            role: selectedRole,
            profile_status: "complete",
            missing_fields: [],
            phone: formattedPhone,
            area: selectedArea,
            category: selectedRole === "freelancer" ? categoryInput : hiringForInput,
            skill: selectedRole === "freelancer" ? cleanSkill : "",
            experience: selectedRole === "freelancer" ? experienceInput : "",
            bio: selectedRole === "freelancer" ? cleanBio : "",
            rate_hr: numRate,
            company_name: selectedRole === "employer" ? cleanCompany : "",
            hiring_for: selectedRole === "employer" ? hiringForInput : "",
            gst_number: selectedRole === "employer" ? cleanGst : "",
          },
        });
      } catch {}

      // 3. Sync complete profile to /api/users for Admin Dashboard
      await apiPost("/users", {
        user_id: authUser.id,
        id: authUser.id,
        email: cleanEmail,
        role: selectedRole,
        name: cleanName,
        phone: cleanPhone,
        area: selectedArea,
        profile_status: "complete",
        missing_fields: [],
        category: selectedRole === "freelancer" ? categoryInput : hiringForInput,
        skill: selectedRole === "freelancer" ? cleanSkill : undefined,
        experience: selectedRole === "freelancer" ? experienceInput : undefined,
        bio: selectedRole === "freelancer" ? cleanBio : undefined,
        rate_hr: selectedRole === "freelancer" ? numRate : undefined,
        company_name: selectedRole === "employer" ? cleanCompany : undefined,
        hiring_for: selectedRole === "employer" ? hiringForInput : undefined,
        gst_number: selectedRole === "employer" && cleanGst ? cleanGst : undefined,
        avatar_url: avatarUrl,
      }).catch(() => {});

      // 4. Save complete profile in local clientStore
      const completedProfile = {
        id: authUser.id,
        email: cleanEmail,
        name: cleanName,
        picture: avatarUrl,
        role: selectedRole,
        area: selectedArea,
        phone: formattedPhone,
        category: selectedRole === "freelancer" ? categoryInput : hiringForInput,
        skill: selectedRole === "freelancer" ? cleanSkill : "",
        experience: selectedRole === "freelancer" ? experienceInput : "",
        bio: selectedRole === "freelancer" ? cleanBio : "",
        intro: selectedRole === "freelancer" ? cleanBio : "",
        rate_hr: numRate,
        company_name: selectedRole === "employer" ? cleanCompany : "",
        hiring_for: selectedRole === "employer" ? hiringForInput : "",
        gst_number: selectedRole === "employer" ? cleanGst : "",
        profile_status: "complete",
        missing_fields: [],
        workhop_registered: true,
        email_verified: true,
        auth_provider: "google",
      };

      saveRegisteredUser(cleanEmail, "", completedProfile);

      localStorage.setItem(`workhop_oauth_verified_${authUser.id}`, "1");
      localStorage.setItem("workhop_auth_role", selectedRole);
      localStorage.setItem("workhop_user_area", selectedArea);
      localStorage.setItem("workhop_pro_phone", formattedPhone);
      localStorage.setItem("workhop_pro_name", cleanName);

      if (selectedRole === "freelancer") {
        localStorage.removeItem("workhop_company_name");
        localStorage.removeItem("workhop_employer_gst");
        localStorage.setItem("workhop_pro_skill", cleanSkill);
        localStorage.setItem("workhop_pro_rate_hr", String(numRate));
        updateProHourlyRate(authUser.id, numRate);
        updateProHourlyRate(cleanEmail, numRate);
      } else {
        localStorage.setItem("workhop_company_name", cleanCompany);
        if (cleanGst) localStorage.setItem("workhop_employer_gst", cleanGst);
      }

      const sessionUser = linkOrUpdateGoogleUser(authUser, selectedRole, selectedArea);
      Object.assign(sessionUser, completedProfile);

      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token || `token_${Date.now()}`;
      await adoptSession(token, sessionUser);

      // Clear temporary OAuth flags
      localStorage.removeItem("workhop_pending_role");
      localStorage.removeItem("workhop_auth_intent");
      sessionStorage.removeItem("workhop_pending_role");
      sessionStorage.removeItem("workhop_auth_intent");
      document.cookie = "workhop_auth_intent=; path=/; max-age=0";
      document.cookie = "workhop_pending_role=; path=/; max-age=0";

      // 5. Redirect to role dashboard
      if (selectedRole === "employer") {
        navigate("/employer/dashboard", { replace: true });
      } else {
        navigate("/freelancer/jobs", { replace: true });
      }
    } catch (err) {
      console.warn("Failed to complete onboarding:", err);
      setFormError(err.message || "Failed to save profile details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartGoogleWithIntent = async (newIntent, roleOverride = null) => {
    setStatus("verifying");
    setErrorMessage("");
    try {
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, "/auth/callback");
      }
      await supabaseSignInWithGoogle({
        intent: newIntent,
        role: roleOverride || selectedRole || "freelancer",
      });
    } catch (err) {
      setErrorMessage(err.message || "Failed to initiate Google OAuth.");
      setStatus("error");
    }
  };

  // ══════════════════════════════════════════════════
  // UI 1: NOT REGISTERED (User clicked "Log In" with a never-registered Google account)
  // ══════════════════════════════════════════════════
  if (status === "not_registered") {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md border-4 border-white bg-[#1A1A1A] p-6 sm:p-8 shadow-[8px_8px_0px_#FF5500]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-white bg-amber-950 text-amber-400 shrink-0">
              <UserX size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#FF5500] uppercase">
                Account Not Found
              </span>
              <h1 className="text-xl font-black uppercase text-white">Not Registered</h1>
            </div>
          </div>

          <div className="bg-[#242424] p-4 border-2 border-amber-500/60 mb-6">
            <p className="text-sm text-white font-extrabold leading-relaxed" data-testid="not-registered-message">
              No WorkHop account found for this email. Please sign up first.
            </p>
            {rejectedEmail && (
              <p className="text-xs text-zinc-400 font-mono mt-2">
                Email checked: <span className="text-zinc-200 font-bold">{rejectedEmail}</span>
              </p>
            )}
          </div>

          {/* Choose Role & Sign Up */}
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
              Select your role to Sign Up:
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <button
                type="button"
                onClick={() => setSelectedRole("freelancer")}
                className={`p-2.5 text-left border-2 transition ${
                  selectedRole === "freelancer"
                    ? "border-[#FF5500] bg-[#FF5500]/15 text-white"
                    : "border-zinc-700 bg-[#242424] text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <div className="text-xs font-black uppercase">Freelancer</div>
                <div className="text-[10px] text-zinc-400">I want to work</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("employer")}
                className={`p-2.5 text-left border-2 transition ${
                  selectedRole === "employer"
                    ? "border-[#FF5500] bg-[#FF5500]/15 text-white"
                    : "border-zinc-700 bg-[#242424] text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <div className="text-xs font-black uppercase">Employer</div>
                <div className="text-[10px] text-zinc-400">I want to hire</div>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleStartGoogleWithIntent("signup", selectedRole)}
              data-testid="oauth-go-to-signup-btn"
              className="flex w-full items-center justify-center gap-2 border-2 border-white bg-[#FF5500] text-white py-3.5 px-4 text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_#FFFFFF] hover:bg-[#E04B00] active:translate-y-0.5 transition"
            >
              <ArrowRight size={16} />
              Sign Up as {selectedRole === "employer" ? "Employer" : "Freelancer"}
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex w-full items-center justify-center gap-2 border-2 border-zinc-700 bg-transparent text-zinc-300 py-2.5 px-4 text-xs font-bold tracking-wider uppercase hover:text-white transition"
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
  // UI 2: ALREADY REGISTERED (User clicked "Sign Up" with an existing email)
  // ══════════════════════════════════════════════════
  if (status === "already_registered") {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md border-4 border-white bg-[#1A1A1A] p-6 sm:p-8 shadow-[8px_8px_0px_#FF5500]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-white bg-amber-950 text-amber-400 shrink-0">
              <AlertTriangle size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#FF5500] uppercase">
                Duplicate Sign-Up
              </span>
              <h1 className="text-xl font-black uppercase text-white">Account Already Exists</h1>
            </div>
          </div>

          <div className="bg-[#242424] p-4 border-2 border-amber-500/60 mb-6">
            <p className="text-sm text-white font-extrabold leading-relaxed" data-testid="already-registered-message">
              An account with this email already exists. Please log in instead.
            </p>
            {rejectedEmail && (
              <p className="text-xs text-zinc-400 font-mono mt-2">
                Registered email: <span className="text-zinc-200 font-bold">{rejectedEmail}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleStartGoogleWithIntent("signin")}
              data-testid="oauth-go-to-login-btn"
              className="flex w-full items-center justify-center gap-2 border-2 border-white bg-[#FF5500] text-white py-3.5 px-4 text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_#FFFFFF] hover:bg-[#E04B00] active:translate-y-0.5 transition"
            >
              <LogIn size={16} />
              Log In Instead
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex w-full items-center justify-center gap-2 border-2 border-zinc-700 bg-transparent text-zinc-300 py-2.5 px-4 text-xs font-bold tracking-wider uppercase hover:text-white transition"
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
  // UI 3: ERROR VIEW (Cancelled consent, invalid code, network failure)
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
              onClick={() =>
                handleStartGoogleWithIntent(
                  localStorage.getItem("workhop_auth_intent") || "signin",
                  selectedRole
                )
              }
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
  // UI 4: MANDATORY PROFILE COMPLETION (New Sign Up or Incomplete Profile)
  // ══════════════════════════════════════════════════
  if (status === "onboarding" && authUser) {
    const userEmail = authUser.email;
    const userAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;

    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-white font-sans py-10">
        <div className="w-full max-w-xl border-4 border-white bg-[#1A1A1A] p-6 sm:p-8 shadow-[10px_10px_0px_#FF5500]">
          {/* Header with Google Avatar & Verified Badge */}
          <div className="flex items-center gap-3.5 pb-5 border-b-2 border-zinc-700">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={fullNameInput || "User"}
                className="h-14 w-14 rounded-full border-2 border-[#FF5500] object-cover shrink-0"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center border-2 border-white bg-[#FF5500] font-black text-white text-xl shrink-0">
                {(fullNameInput || "U")[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-emerald-400 uppercase">
                <CheckCircle2 size={13} />
                <span>Google Account Connected · Mandatory Onboarding</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Complete Your {selectedRole === "employer" ? "Employer" : "Freelancer"} Profile
              </h2>
              <p className="text-xs text-zinc-400 font-semibold truncate">
                Please fill in your details below to activate your WorkHop account.
              </p>
            </div>
          </div>

          {formError && (
            <div className="mt-4 p-3 border-2 border-red-500 bg-red-950/40 text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCompleteOnboarding} className="mt-6 space-y-4">
            {/* Role Indicator / Switcher */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                  Account Role: *
                </label>
                {roleLocked && (
                  <button
                    type="button"
                    onClick={() => setRoleLocked(false)}
                    className="text-[10px] font-bold text-[#FF5500] underline cursor-pointer"
                  >
                    Change Role
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole("freelancer")}
                  className={`p-3.5 text-left border-2 transition ${
                    selectedRole === "freelancer"
                      ? "border-[#FF5500] bg-[#FF5500]/15 shadow-[4px_4px_0px_#FF5500]"
                      : "border-zinc-700 bg-[#242424] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <UserCheck
                      size={18}
                      className={selectedRole === "freelancer" ? "text-[#FF5500]" : "text-zinc-400"}
                    />
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-zinc-600 bg-black/40 text-zinc-300">
                      Freelancer
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-white uppercase">I Want to Work</h3>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole("employer")}
                  className={`p-3.5 text-left border-2 transition ${
                    selectedRole === "employer"
                      ? "border-[#FF5500] bg-[#FF5500]/15 shadow-[4px_4px_0px_#FF5500]"
                      : "border-zinc-700 bg-[#242424] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Briefcase
                      size={18}
                      className={selectedRole === "employer" ? "text-[#FF5500]" : "text-zinc-400"}
                    />
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-zinc-600 bg-black/40 text-zinc-300">
                      Employer
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-white uppercase">I Want to Hire</h3>
                </button>
              </div>
            </div>

            {/* Prefilled Google Name & Read-Only Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                  Full Name: *
                </label>
                <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                  <User size={15} className="text-zinc-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                  Google Email (Read-Only):
                </label>
                <div className="flex items-center border-2 border-zinc-800 bg-zinc-900/80 px-3 py-2.5 opacity-80">
                  <Mail size={15} className="text-emerald-400 mr-2 shrink-0" />
                  <input
                    type="email"
                    value={userEmail || ""}
                    readOnly
                    disabled
                    className="w-full bg-transparent text-xs font-bold text-zinc-300 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                  Phone / WhatsApp Number: *
                </label>
                <span className="text-[10px] text-zinc-400 font-bold">10-Digit Indian Mobile</span>
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
                  data-testid="onboarding-phone-input"
                  className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* Location Picker + GPS Auto-Detect */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                  Bengaluru Location / Neighborhood: *
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLoc}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-[#FF5500] hover:underline cursor-pointer"
                >
                  <Navigation size={11} />
                  {detectingLoc ? "Detecting..." : "Use My GPS"}
                </button>
              </div>
              <div className="flex items-center border-2 border-white bg-[#242424] px-3 py-2.5">
                <MapPin size={16} className="text-[#FF5500] mr-2 shrink-0" />
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  data-testid="onboarding-location-select"
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

            {/* Role-Specific Mandatory Fields */}
            {selectedRole === "freelancer" ? (
              <div className="space-y-4 pt-1">
                {/* Profession / Service Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                      Profession / Service Category: *
                    </label>
                    <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white">
                      <Briefcase size={15} className="text-[#FF5500] mr-2 shrink-0" />
                      <select
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        data-testid="onboarding-category-select"
                        className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat} className="bg-[#242424] text-white">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                      Experience Level: *
                    </label>
                    <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white">
                      <Clock size={15} className="text-[#FF5500] mr-2 shrink-0" />
                      <select
                        value={experienceInput}
                        onChange={(e) => setExperienceInput(e.target.value)}
                        data-testid="onboarding-experience-select"
                        className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                      >
                        {EXPERIENCE_OPTIONS.map((exp) => (
                          <option key={exp} value={exp} className="bg-[#242424] text-white">
                            {exp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                    Primary Profession &amp; Skills: *
                  </label>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                    <Sparkles size={16} className="text-[#FF5500] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="e.g. Architecture & Interior Design, Figma, React, Video Editing"
                      data-testid="onboarding-skills-input"
                      className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                    Short Professional Bio: *
                  </label>
                  <div className="flex items-start border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                    <FileText size={16} className="text-[#FF5500] mr-2 mt-0.5 shrink-0" />
                    <textarea
                      rows={3}
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      placeholder="Briefly describe your expertise, notable work, and turnaround speed..."
                      data-testid="onboarding-bio-input"
                      className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Starting Hourly Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                      Starting Rate per Hour (₹ INR):
                    </label>
                    <span className="text-[10px] text-[#FF5500] font-bold">Changeable anytime</span>
                  </div>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2 focus-within:border-white transition">
                    <span className="text-sm font-black text-[#FF5500] mr-2">₹</span>
                    <input
                      type="number"
                      min={50}
                      max={50000}
                      step={50}
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-white outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400 ml-1">/ hr</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* Business / Organization Name */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                    Business / Organization Name: *
                  </label>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white transition">
                    <Building size={16} className="text-[#FF5500] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      placeholder="e.g. Cobblestone Studio, Zenith Tech Pvt Ltd"
                      data-testid="onboarding-company-input"
                      className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                {/* Type of Work They Hire For */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1">
                    Type of Work You Hire For: *
                  </label>
                  <div className="flex items-center border-2 border-zinc-700 bg-[#242424] px-3 py-2.5 focus-within:border-white">
                    <Briefcase size={16} className="text-[#FF5500] mr-2 shrink-0" />
                    <select
                      value={hiringForInput}
                      onChange={(e) => setHiringForInput(e.target.value)}
                      data-testid="onboarding-hiring-for-select"
                      className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#242424] text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional GSTIN */}
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
              </div>
            )}

            {/* Terms & 18+ Age Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  data-testid="onboarding-terms-checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#FF5500] border-zinc-600 bg-[#242424]"
                />
                <span className="leading-snug text-[11px]">
                  I agree to the{" "}
                  <a
                    href="/legal"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#FF5500] underline font-bold"
                  >
                    Terms of Service
                  </a>{" "}
                  &amp; confirm that I am 18+ years of age.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="onboarding-submit-btn"
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
  // UI 5: DEFAULT VERIFYING SPINNER
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
          Checking registration status with WorkHop. Please wait a moment.
        </p>
      </div>
    </div>
  );
}
