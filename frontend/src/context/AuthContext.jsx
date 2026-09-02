import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API, getToken, setToken, clearToken } from "@/lib/api";

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
      const res = await fetch(`${API}/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.session_token);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const checkStoredSession = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUser(await res.json());
      else if (res.status === 401) clearToken();
    } catch {
      /* ignore */
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
    const token = getToken();
    if (token) {
      fetch(`${API}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearToken();
    setUser(null);
  }, []);

  const adoptSession = useCallback(async (token, u) => {
    setToken(token);
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, adoptSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
