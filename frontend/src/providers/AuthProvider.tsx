import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import api from "../lib/api/client";

interface AuthState {
  token: string | null;
  isLoading: boolean;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync("auth_token")
      .then((stored) => {
        if (stored) setToken(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithToken = async (newToken: string) => {
    await SecureStore.setItemAsync("auth_token", newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("auth_token");
    setToken(null);
  };

  const deleteAccount = async () => {
    await api.delete("/auth/me");
    await SecureStore.deleteItemAsync("auth_token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, loginWithToken, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
