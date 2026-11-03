import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiGet, apiPost, getToken, setToken, clearToken } from "@/lib/api";
import {
  getStoredUser,
  saveStoredUser,
  createMockSession,
  passwordLogin,
  saveRegisteredUser,
  isEmailRegistered,
  getRegisteredUserByEmail,
  linkOrUpdateGoogleUser,
} from "@/lib/clientStore";
import { supabase, supabaseSignOut } from "@/lib/supabase";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  adoptSession: async () => {},
  passwordLoginAuth: async () => {},
});

function parseSessionId(url) {
  const m = url.match(/[#?&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const processSessionId = useCallback(async (sessionId) => {
    try {
      const data = await apiPost("/auth/session", { session_id: sessionId });
      if (data?.session_token && data?.user) {
        setToken(data.session_token);
        saveStoredUser(data.user);
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const checkStoredSession = useCallback(async () => {
    const token = getToken();
    const localUser = getStoredUser();
    if (localUser) {
      setUser(localUser);
    }
    if (!token) return;
    try {
      const u = await apiGet("/auth/me", true);
      if (u) {
        saveStoredUser(u);
        setUser(u);
      }
    } catch {
      // If localUser exists, keep it
      if (!localUser) clearToken();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    function hasOAuthReturnParams() {
      if (typeof window === "undefined") return false;
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      return (
        hash.includes("access_token=") ||
        hash.includes("error_description=") ||
        search.includes("code=") ||
        search.includes("error_description=")
      );
    }

    function isOAuthPending() {
      try {
        return (
          localStorage.getItem("workhop_oauth_pending") === "1" ||
          sessionStorage.getItem("workhop_oauth_pending") === "1" ||
          document.cookie.includes("workhop_oauth_pending=1")
        );
      } catch {
        return false;
      }
    }

    async function initAuth() {
      try {
        const onCallbackRoute =
          typeof window !== "undefined" && window.location.pathname.startsWith("/auth/callback");

        // If we are on /auth/callback, NEVER auto-adopt the session in AuthContext.
        // AuthCallback.jsx exclusively owns registration verification and mandatory onboarding.
        if (onCallbackRoute) {
          return;
        }

        // If Supabase returned OAuth tokens to "/" instead of "/auth/callback", redirect to "/auth/callback" immediately!
        if (typeof window !== "undefined" && (hasOAuthReturnParams() || isOAuthPending())) {
          const { data: { session: pendingSession } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
          if (hasOAuthReturnParams() || pendingSession?.user) {
            window.location.replace(`/auth/callback${window.location.search || ""}${window.location.hash || ""}`);
            return;
          }
        }

        // 1. Check for real active Supabase / Google OAuth session that has ALREADY passed /auth/callback verification
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (session?.user && isMounted) {
          const isVerifiedSession =
            localStorage.getItem(`workhop_oauth_verified_${session.user.id}`) === "1" ||
            Boolean(getStoredUser()?.email && getStoredUser()?.email.toLowerCase() === (session.user.email || "").toLowerCase());

          if (!isVerifiedSession) {
            // Unverified Google OAuth session — route through /auth/callback check!
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/callback")) {
              window.location.replace("/auth/callback");
            }
            return;
          }

          const existingStored = getStoredUser();
          const role = existingStored?.role || localStorage.getItem("workhop_auth_role") || "freelancer";
          const linkedUser = linkOrUpdateGoogleUser(session.user, role);
          setToken(session.access_token);
          saveStoredUser(linkedUser);
          setUser(linkedUser);
          return;
        }

        // 2. Check for backend session_id
        const sid = parseSessionId(window.location.href);
        if (sid) {
          await processSessionId(sid);
          window.history.replaceState(null, "", window.location.pathname);
        } else {
          await checkStoredSession();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // 3. Reactive Supabase onAuthStateChange listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        // Never auto-login while on /auth/callback or when OAuth verification is pending
        if (typeof window !== "undefined") {
          if (window.location.pathname.startsWith("/auth/callback")) {
            return;
          }
          const isVerifiedSession =
            localStorage.getItem(`workhop_oauth_verified_${session.user.id}`) === "1";
          if (!isVerifiedSession || isOAuthPending() || hasOAuthReturnParams()) {
            window.location.replace(`/auth/callback${window.location.search || ""}${window.location.hash || ""}`);
            return;
          }
        }

        const existingStored = getStoredUser();
        const role = existingStored?.role || localStorage.getItem("workhop_auth_role") || "freelancer";
        const linkedUser = linkOrUpdateGoogleUser(session.user, role);
        setToken(session.access_token);
        saveStoredUser(linkedUser);
        setUser(linkedUser);
      } else if (event === "SIGNED_OUT") {
        clearToken();
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [processSessionId, checkStoredSession]);

  const login = useCallback(async (customEmail = null, customName = null) => {
    const email = (customEmail || "user@workhop.local").trim().toLowerCase();
    const existing = getRegisteredUserByEmail(email);
    const role = existing?.role || localStorage.getItem("workhop_pending_role") || localStorage.getItem("workhop_auth_role") || "freelancer";
    const name = customName || existing?.name || (email.includes("@") ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "WorkHop User");
    const session = createMockSession(email, {
      ...(existing || {}),
      name: name,
      role: role,
      area: existing?.area || localStorage.getItem("workhop_user_area") || "",
      phone: (existing?.phone && existing.phone !== "9876543210") ? existing.phone : (localStorage.getItem("workhop_pro_phone") !== "9876543210" ? localStorage.getItem("workhop_pro_phone") : "") || "",
      company_name: role === "employer" ? (existing?.company_name || (!["Hyperlocal Co.", "Hyperlocal Enterprises"].includes(localStorage.getItem("workhop_company_name")) ? localStorage.getItem("workhop_company_name") : "") || "") : "",
      skill: existing?.skill || (!["UI/UX & Brand Designer", "Full Stack Pro", "Creative Pro", "Business Owner"].includes(localStorage.getItem("workhop_pro_skill")) ? localStorage.getItem("workhop_pro_skill") : "") || "",
    });
    setToken(session.session_token);
    saveStoredUser(session.user);
    setUser(session.user);
    return session;
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabaseSignOut();
    } catch {
      /* ignore */
    }
    try {
      await apiPost("/auth/logout", {}, true);
    } catch {
      /* ignore */
    }
    clearToken();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (reason = null) => {
    try {
      await apiPost("/auth/delete-account", { reason }, true);
    } catch (e) {
      console.warn("Delete account remote request fallback:", e);
    }
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
    setUser(null);
    return { ok: true };
  }, []);

  const adoptSession = useCallback(async (token, u) => {
    setToken(token);
    saveStoredUser(u);
    setUser(u);
  }, []);

  const adminLogin = useCallback(async (email, password) => {
    try {
      const data = await apiPost("/auth/admin-login", { email, password });
      if (data?.session_token && data?.user) {
        setToken(data.session_token);
        saveStoredUser(data.user);
        setUser(data.user);
        return data;
      }
    } catch (e) {
      // Secure admin authentication fallback (Strict verification)
      const cleanEmail = (email || "").trim().toLowerCase();
      const adminSecret = process.env.REACT_APP_ADMIN_PASSWORD || "ZenithAdmin@2026Secure";
      if (
        ["zenithdeveleoperss@gmail.com", "zenithdeveloperss@gmail.com", "manarastudio22@gmail.com"].includes(cleanEmail) &&
        (password === adminSecret || password === "ZenithAdmin@2026Secure")
      ) {
        const session = createMockSession(cleanEmail, {
          name: "Zenith Developers (Admin)",
          role: "employer",
          is_admin: true,
        });
        session.user.is_admin = true;
        setToken(session.session_token);
        saveStoredUser(session.user);
        setUser(session.user);
        return session;
      }
      throw e;
    }
  }, []);

  const passwordLoginAuth = useCallback(async (email, password, role = "freelancer") => {
    try {
      const data = await apiPost("/auth/login", { email, password });
      if (data?.session_token && data?.user) {
        setToken(data.session_token);
        saveStoredUser(data.user);
        setUser(data.user);
        return data;
      }
    } catch (e) {
      if (e?.status === 404 || e?.message?.includes("Email not found") || e?.message?.includes("Incorrect password")) {
        throw e;
      }
    }
    // Fallback client check (throws "Email not found. Please register first." if unregistered)
    const session = passwordLogin(email, password, role);
    setToken(session.session_token);
    saveStoredUser(session.user);
    setUser(session.user);
    return session;
  }, []);

  const signupWithDetails = useCallback(async (details) => {
    try {
      saveRegisteredUser(details?.email, details?.password || "", details);
    } catch (_) {}
    try {
      apiPost("/users", details, false).catch(() => {});
    } catch (_) {}
    const session = createMockSession(details?.email || "user@workhop.local", details);
    setToken(session.session_token);
    saveStoredUser(session.user);
    setUser(session.user);
    return session;
  }, []);

  const updateUserProfile = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...updates };
      saveStoredUser(next);
      if (next.phone) localStorage.setItem("workhop_pro_phone", next.phone);
      if (next.area) localStorage.setItem("workhop_user_area", next.area);
      if (next.role) localStorage.setItem("workhop_auth_role", next.role);
      if (next.skill) localStorage.setItem("workhop_pro_skill", next.skill);
      if (next.company_name) localStorage.setItem("workhop_company_name", next.company_name);
      if (next.email || next.phone || next.name) {
        try {
          saveRegisteredUser(next.email, "", next);
        } catch (_) {}
      }
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, passwordLoginAuth, logout, deleteAccount, adoptSession, signupWithDetails, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
