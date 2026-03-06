import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import api from "../api/client";

interface AuthState {
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: newToken } = res.data;
    await SecureStore.setItemAsync("auth_token", newToken);
    setToken(newToken);
  };

  const register = async (email: string, password: string) => {
    const res = await api.post("/auth/register", { email, password });
    const { token: newToken } = res.data;
    await SecureStore.setItemAsync("auth_token", newToken);
    setToken(newToken);
  };

  const loginWithToken = async (newToken: string) => {
    await SecureStore.setItemAsync("auth_token", newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("auth_token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, register, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
