import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import api from "../lib/api/client";
import { useAuth } from "./AuthProvider";

interface CreditTransaction {
  id: number;
  amount: number;
  type: string;
  note: string | null;
  searchId: number | null;
  createdAt: string;
}

interface CreditsState {
  balance: number | null;
  transactions: CreditTransaction[];
  isLoading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const CreditsContext = createContext<CreditsState | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(false);
    try {
      const res = await api.get("/credits/balance");
      setBalance(res.data.balance);
      setTransactions(res.data.transactions);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refresh();
    } else {
      setBalance(null);
      setTransactions([]);
    }
  }, [token, refresh]);

  return (
    <CreditsContext.Provider value={{ balance, transactions, isLoading, error, refresh }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits(): CreditsState {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used inside CreditsProvider");
  return ctx;
}
