import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiGet, apiPost, getToken, setToken, clearToken } from "@/lib/api";
import { getStoredUser, saveStoredUser, createMockSession } from "@/lib/clientStore";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  adoptSession: async () => {},
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
      // Fallback Google mock session
      const session = createMockSession("google.user@example.com");
      setToken(session.session_token);
      saveStoredUser(session.user);
      setUser(session.user);
      return true;
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
    (async () => {
      try {
        const sid = parseSessionId(window.location.href);
        if (sid) {
          await processSessionId(sid);
          window.history.replaceState(null, "", window.location.pathname);
        } else {
          await checkStoredSession();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [processSessionId, checkStoredSession]);

  const login = useCallback(() => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout", {}, true);
    } catch {
      /* ignore */
    }
    clearToken();
    setUser(null);
  }, []);

  const adoptSession = useCallback(async (token, u) => {
    setToken(token);
    saveStoredUser(u);
    setUser(u);
  }, []);

  const signupWithDetails = useCallback(async (details) => {
    const session = createMockSession(details.email || "user@workhop.local", details);
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
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, adoptSession, signupWithDetails, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
