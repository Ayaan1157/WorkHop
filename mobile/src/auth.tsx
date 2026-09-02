import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { BACKEND_URL } from "./theme";

export type AuthUser = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  is_admin?: boolean;
};

const TOKEN_KEY = "workhop_session_token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  adoptSession: (token: string, user: AuthUser) => Promise<void>;
};

async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") localStorage.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  if (Platform.OS === "web") localStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

function parseSessionId(url: string): string | null {
  const m = url.match(/[#?&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  adoptSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const processSessionId = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      await setToken(data.session_token);
      setUser(data.user);
      return true;
    } catch (e) {
      console.log("auth session err", e);
      return false;
    }
  }, []);

  const checkStoredSession = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUser(await res.json());
      } else if (res.status === 401) {
        await clearToken();
      }
    } catch (e) {
      console.log("auth me err", e);
    }
  }, []);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    (async () => {
      try {
        if (Platform.OS === "web") {
          const url = window.location.href;
          const sid = parseSessionId(url);
          if (sid) {
            await processSessionId(sid);
            window.history.replaceState(null, "", window.location.pathname);
          } else {
            await checkStoredSession();
          }
        } else {
          const initialUrl = await Linking.getInitialURL();
          const sid = initialUrl ? parseSessionId(initialUrl) : null;
          if (sid) await processSessionId(sid);
          else await checkStoredSession();
          sub = Linking.addEventListener("url", async ({ url }) => {
            const s = parseSessionId(url);
            if (s) await processSessionId(s);
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => sub?.remove();
  }, [processSessionId, checkStoredSession]);

  const login = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? window.location.origin + "/"
        : Linking.createURL("auth");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success" && result.url) {
      const sid = parseSessionId(result.url);
      if (sid) await processSessionId(sid);
    }
  }, [processSessionId]);

  const logout = useCallback(async () => {
    const token = await getToken();
    if (token) {
      fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await clearToken();
    setUser(null);
  }, []);

  // Used by the email-OTP login flow: store a backend-issued session directly.
  const adoptSession = useCallback(async (token: string, u: AuthUser) => {
    await setToken(token);
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, adoptSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
