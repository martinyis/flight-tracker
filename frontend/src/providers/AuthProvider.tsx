import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import api from "../lib/api/client";
import { registerForPushNotifications } from "../lib/utils/notifications";

interface AuthState {
  token: string | null;
  userName: string | null;
  isLoading: boolean;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserName = async () => {
    try {
      const res = await api.get("/auth/me");
      setUserName(res.data.firstName || null);
    } catch {
      // ignore — name is optional
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
    SecureStore.getItemAsync("auth_token")
      .then((stored) => {
        if (stored) {
          setToken(stored);
          fetchUserName();
          registerPushToken();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithToken = async (newToken: string) => {
    await SecureStore.setItemAsync("auth_token", newToken);
    setToken(newToken);
    fetchUserName();
    registerPushToken();
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("auth_token");
    setToken(null);
    setUserName(null);
  };

  const deleteAccount = async () => {
    await api.delete("/auth/me");
    await SecureStore.deleteItemAsync("auth_token");
    setToken(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ token, userName, isLoading, loginWithToken, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
