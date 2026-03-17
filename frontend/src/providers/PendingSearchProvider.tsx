import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "expo-router";
import api from "../lib/api/client";
import { useCredits } from "./CreditsProvider";
import { useHaptics } from "./HapticsProvider";

type PendingStatus = "searching" | "completed" | "error";

interface PendingSearch {
  status: PendingStatus;
  origin: string;
  destination: string;
  searchId?: number;
  errorMessage?: string;
}

interface StartSearchResult {
  ok: boolean;
  fastError?: string;
}

interface PendingSearchState {
  pending: PendingSearch | null;
  startSearch: (
    body: any,
    origin: string,
    destination: string,
  ) => Promise<StartSearchResult>;
  viewResult: () => void;
  dismiss: () => void;
  isSearching: boolean;
}

const PendingSearchContext = createContext<PendingSearchState | null>(null);

export function PendingSearchProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingSearch | null>(null);
  const { refresh: refreshCredits } = useCredits();
  const haptics = useHaptics();
  const router = useRouter();

  const startSearch = useCallback(
    async (
      body: any,
      origin: string,
      destination: string,
    ): Promise<StartSearchResult> => {
      if (pending?.status === "searching") {
        return { ok: false, fastError: "A search is already in progress." };
      }

      setPending({ status: "searching", origin, destination });

      try {
        const res = await api.post("/search", body, { timeout: 120_000 });
        await refreshCredits();
        haptics.success();
        setPending({
          status: "completed",
          origin,
          destination,
          searchId: res.data.search.id,
        });
        return { ok: true };
      } catch (e: any) {
        haptics.error();
        const status = e.response?.status;
        const code = e.response?.data?.code;

        // Fast errors — server responds instantly, user is still on the form
        let fastError: string | undefined;
        if (status === 402 && code === "INSUFFICIENT_CREDITS") {
          fastError = `Not enough credits (have ${e.response.data.balance}, need ${e.response.data.needed}). Buy more credits to search.`;
        } else if (status === 409) {
          fastError =
            "Duplicate search — you searched this exact route within 24 hours.";
        } else if (status === 429) {
          fastError =
            e.response?.data?.error ?? "Rate limited. Try again later.";
        }

        if (fastError) {
          setPending(null);
          return { ok: false, fastError };
        }

        // Slow error — user may have navigated away, show as banner
        setPending({
          status: "error",
          origin,
          destination,
          errorMessage:
            e.response?.data?.error ??
            e.message ??
            "Search failed. Please try again.",
        });
        return { ok: false };
      }
    },
    [pending, refreshCredits, haptics],
  );

  const viewResult = useCallback(() => {
    if (pending?.searchId) {
      router.push(`/search/${pending.searchId}`);
    }
    setPending(null);
  }, [pending, router]);

  const dismiss = useCallback(() => {
    setPending(null);
  }, []);

  const isSearching = pending?.status === "searching";

  return (
    <PendingSearchContext.Provider
      value={{ pending, startSearch, viewResult, dismiss, isSearching }}
    >
      {children}
    </PendingSearchContext.Provider>
  );
}

export function usePendingSearch(): PendingSearchState {
  const ctx = useContext(PendingSearchContext);
  if (!ctx)
    throw new Error(
      "usePendingSearch must be used inside PendingSearchProvider",
    );
  return ctx;
}
