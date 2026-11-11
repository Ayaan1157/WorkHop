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
    if (!token) {
      clearToken();
      setUser(null);
      return;
    }
    try {
      const u = await apiGet("/auth/me", true);
      if (u && (u.email || u.user_id)) {
        saveStoredUser(u);
        setUser(u);
      } else {
        clearToken();
        setUser(null);
      }
    } catch {
      clearToken();
      setUser(null);
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

        // 1. Check for real active Supabase / Google OAuth session
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (session?.user && isMounted) {
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

  const login = useCallback(async () => {
    throw new Error("Password or Google authentication is required to access WorkHop.");
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
    const data = await apiPost("/auth/admin-login", { email, password });
    if (data?.session_token && data?.user) {
      setToken(data.session_token);
      saveStoredUser(data.user);
      setUser(data.user);
      return data;
    }
    throw new Error("Invalid admin credentials.");
  }, []);

  const passwordLoginAuth = useCallback(async (email, password, role = "freelancer") => {
    // 1. Try Supabase Auth password sign-in first
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: (email || "").trim().toLowerCase(),
        password,
      });
      if (!error && data?.session?.user) {
        if (!data.session.user.email_confirmed_at) {
          const err = new Error("Please verify your email before signing in.");
          err.code = "email_not_confirmed";
          throw err;
        }
        const userObj = {
          id: data.session.user.id,
          user_id: data.session.user.id,
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || email.split("@")[0],
          role: data.session.user.user_metadata?.role || role || "freelancer",
          email_verified: true,
        };
        setToken(data.session.access_token);
        saveStoredUser(userObj);
        setUser(userObj);
        return { user: userObj, session_token: data.session.access_token };
      }
      if (error && error.message && error.message.toLowerCase().includes("email not confirmed")) {
        const err = new Error("Please verify your email before signing in.");
        err.code = "email_not_confirmed";
        throw err;
      }
    } catch (sbErr) {
      if (sbErr.code === "email_not_confirmed" || sbErr.message?.includes("verify your email")) {
        throw sbErr;
      }
    }

    // 2. Try backend server /auth/login
    const data = await apiPost("/auth/login", { email, password });
    if (data?.session_token && data?.user) {
      setToken(data.session_token);
      saveStoredUser(data.user);
      setUser(data.user);
      return data;
    }
    throw new Error("Incorrect email or password.");
  }, []);

  const signupWithDetails = useCallback(async (details) => {
    try {
      await apiPost("/users", details, false);
    } catch (_) {}
    return { ok: true, details };
  }, []);

  const updateUserProfile = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...updates };
      saveStoredUser(next);
      if (next.phone) localStorage.setItem("workhop_pro_phone", next.phone);
      if (next.area) localStorage.setItem("workhop_user_area", next.area);
      if (next.role) localStorage.setItem("workhop_auth_role", next.role);
      if (next.email || next.phone || next.name) {
        try {
          saveRegisteredUser(next.email, "", next);
        } catch (_) {}
      }
      return next;
    });
  }, []);

  const switchActiveRole = useCallback((newRole) => {
    const targetRole = newRole === "employer" ? "employer" : "freelancer";
    setUser((prev) => {
      const nextRoles = Array.from(new Set([...(prev?.roles || [prev?.role || "freelancer"]), targetRole]));
      const next = {
        ...(prev || {}),
        role: targetRole,
        active_role: targetRole,
        roles: nextRoles,
      };
      saveStoredUser(next);
      localStorage.setItem("workhop_auth_role", targetRole);
      return next;
    });
    return targetRole;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, passwordLoginAuth, logout, deleteAccount, adoptSession, signupWithDetails, updateUserProfile, switchActiveRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
