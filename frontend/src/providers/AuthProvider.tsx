import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import api from "../lib/api/client";
import { registerForPushNotifications } from "../lib/utils/notifications";

interface AuthState {
  token: string | null;
  userName: string | null;
  isLoading: boolean;
  hasUsedFreeSearch: boolean;
  isNewUser: boolean;
  loginWithTokens: (accessToken: string, refreshToken: string, isNewUser?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  markFreeSearchUsed: () => void;
  clearOnboarding: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUsedFreeSearch, setHasUsedFreeSearch] = useState(true); // default true (safe)
  const [isNewUser, setIsNewUser] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setUserName(res.data.firstName || null);
      setHasUsedFreeSearch(res.data.hasUsedFreeSearch ?? true);
    } catch {
      // ignore — profile fetch is best-effort
    }
  };

  const registerPushToken = async () => {
    try {
      console.log("[Push] Registering push token...");
      const pushToken = await registerForPushNotifications();
      console.log("[Push] Token result:", pushToken);
      if (pushToken) {
        await api.post("/auth/push-token", { pushToken });
        console.log("[Push] Token saved to backend");
      }
    } catch (err) {
      console.error("[Push] Registration failed:", err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Check if onboarding was interrupted
        const onboardingPending = await SecureStore.getItemAsync("onboarding_pending");
        if (onboardingPending === "true") {
          setIsNewUser(true);
        }

        const storedAccess = await SecureStore.getItemAsync("auth_token");
        const storedRefresh = await SecureStore.getItemAsync("refresh_token");

        if (storedAccess) {
          setToken(storedAccess);
          fetchUserProfile();
          registerPushToken();
        } else if (storedRefresh) {
          // Access token expired/missing but refresh token exists — try to refresh
          try {
            const { data } = await axios.post(
              `${api.defaults.baseURL}/auth/refresh`,
              { refreshToken: storedRefresh },
              { headers: { "Content-Type": "application/json" } }
            );
            await SecureStore.setItemAsync("auth_token", data.accessToken);
            await SecureStore.setItemAsync("refresh_token", data.refreshToken);
            setToken(data.accessToken);
            fetchUserProfile();
            registerPushToken();
          } catch {
            await SecureStore.deleteItemAsync("refresh_token");
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loginWithTokens = async (accessToken: string, refreshToken: string, newUser?: boolean) => {
    await SecureStore.setItemAsync("auth_token", accessToken);
    await SecureStore.setItemAsync("refresh_token", refreshToken);
    if (newUser) {
      await SecureStore.setItemAsync("onboarding_pending", "true");
      setIsNewUser(true);
    }
    setToken(accessToken);
    fetchUserProfile();
    registerPushToken();
  };

  const markFreeSearchUsed = () => {
    setHasUsedFreeSearch(true);
  };

  const clearOnboarding = () => {
    setIsNewUser(false);
    SecureStore.deleteItemAsync("onboarding_pending");
  };

  const logout = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Best-effort — still log out locally
    }
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("onboarding_pending");
    setToken(null);
    setUserName(null);
    setIsNewUser(false);
    setHasUsedFreeSearch(true);
  };

  const deleteAccount = async () => {
    await api.delete("/auth/me");
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("onboarding_pending");
    setToken(null);
    setUserName(null);
    setIsNewUser(false);
    setHasUsedFreeSearch(true);
  };

  return (
    <AuthContext.Provider value={{
      token, userName, isLoading,
      hasUsedFreeSearch, isNewUser,
      loginWithTokens, logout, deleteAccount,
      markFreeSearchUsed, clearOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
