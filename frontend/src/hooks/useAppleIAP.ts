import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  useIAP,
  type Purchase,
  type PurchaseError,
  type Product,
  ErrorCode,
  finishTransaction,
  getPendingTransactionsIOS,
} from "react-native-iap";
import api from "../lib/api/client";

const PRODUCT_SKUS = [
  "credits_starter_50",
  "credits_standard_150",
  "credits_pro_400",
  "credits_power_1000",
];

export type IAPState = "idle" | "purchasing" | "verifying" | "error";

// ---------------------------------------------------------------------------
// Friendly error messages for IAP error codes
// ---------------------------------------------------------------------------

function getFriendlyErrorMessage(code?: string, fallbackMessage?: string): string {
  switch (code) {
    case ErrorCode.UserCancelled:
      // Should never reach here -- caller handles silently
      return "";
    case ErrorCode.ItemUnavailable:
    case ErrorCode.SkuNotFound:
      return "This pack is currently unavailable.";
    case ErrorCode.NetworkError:
    case ErrorCode.ConnectionClosed:
    case ErrorCode.ServiceDisconnected:
      return "Network error. Check your connection and try again.";
    case ErrorCode.ServiceError:
    case ErrorCode.RemoteError:
    case ErrorCode.BillingUnavailable:
    case ErrorCode.IapNotAvailable:
      return "App Store is temporarily unavailable. Try again later.";
    case ErrorCode.DeveloperError:
      return "Store configuration error. Please contact support.";
    case ErrorCode.DeferredPayment:
    case ErrorCode.Pending:
      return "Purchase requires approval. You'll be notified when it's approved.";
    case ErrorCode.AlreadyOwned:
    case ErrorCode.AlreadyPrepared:
      return "This purchase is already being processed.";
    case ErrorCode.Unknown:
    default:
      return fallbackMessage || "Something went wrong. Please try again.";
  }
}

interface UseAppleIAPReturn {
  products: Product[];
  isReady: boolean;
  iapState: IAPState;
  error: string | null;
  friendlyError: string | null;
  storeUnavailable: boolean;
  buyProduct: (productId: string) => Promise<void>;
}

export function useAppleIAP(onCreditsRefresh: () => Promise<void>): UseAppleIAPReturn {
  const [iapState, setIapState] = useState<IAPState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [storeUnavailable, setStoreUnavailable] = useState(false);

  const resolveRef = useRef<(() => void) | null>(null);
  const rejectRef = useRef<((err: any) => void) | null>(null);

  const onPurchaseSuccess = useCallback(async (purchase: Purchase) => {
    try {
      setIapState("verifying");

      const transactionId = purchase.id;
      if (!transactionId) {
        throw new Error("No transaction ID in purchase");
      }

      // Verify with our backend
      await api.post("/credits/verify-purchase", {
        transactionId,
        productId: purchase.productId,
      });

      // CRITICAL: Only finish after backend confirms
      await finishTransaction({ purchase, isConsumable: true });

      await onCreditsRefresh();

      setIapState("idle");
      setError(null);
      setFriendlyError(null);
      resolveRef.current?.();
    } catch (err: any) {
      // Don't finish transaction if backend fails -- StoreKit will redeliver
      setIapState("error");
      const msg = err.response?.data?.error || err.message || "Purchase verification failed";
      setError(msg);
      setFriendlyError("Something went wrong verifying your purchase. Please try again.");
      rejectRef.current?.(err);
    } finally {
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, [onCreditsRefresh]);

  const onPurchaseError = useCallback((err: PurchaseError) => {
    console.error("[IAP] onPurchaseError:", err.code, err.message);
    if (err.code === ErrorCode.UserCancelled) {
      setIapState("idle");
      setFriendlyError(null);
    } else {
      setIapState("error");
      setError(err.message || "Purchase failed");
      setFriendlyError(getFriendlyErrorMessage(err.code, err.message));
    }
    rejectRef.current?.(err);
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  const onError = useCallback((err: Error) => {
    console.error("[IAP] onError (non-purchase):", err.message, err);
  }, []);

  const {
    connected,
    products,
    fetchProducts,
  } = useIAP({
    onPurchaseSuccess,
    onPurchaseError,
    onError,
  });

  // Log when products state actually changes
  useEffect(() => {
    console.log("[IAP] products state changed, count:", products.length, products.map(p => p.id));
  }, [products]);

  // Fetch products when connected
  useEffect(() => {
    if (connected && !isReady) {
      console.log("[IAP] Connected, fetching products:", PRODUCT_SKUS);
      fetchProducts({ skus: PRODUCT_SKUS, type: "in-app" })
        .then(() => {
          console.log("[IAP] fetchProducts resolved");
          setIsReady(true);
        })
        .catch((err) => {
          console.error("[IAP] fetchProducts failed:", err.message, err);
          setStoreUnavailable(true);
        });
    }
  }, [connected, isReady, fetchProducts]);

  // Process pending transactions on mount (recover from crashes)
  useEffect(() => {
    if (!connected || Platform.OS !== "ios") return;

    (async () => {
      try {
        const pending = await getPendingTransactionsIOS();
        console.log("[IAP] Pending transactions:", pending.length);
        for (const purchase of pending) {
          if (purchase.id) {
            try {
              await api.post("/credits/verify-purchase", { transactionId: purchase.id, productId: purchase.productId });
              await finishTransaction({ purchase, isConsumable: true });
            } catch {
              // Leave pending for next retry
            }
          }
        }
        await onCreditsRefresh();
      } catch {
        // getPendingTransactionsIOS can fail if not initialized
      }
    })();
  }, [connected, onCreditsRefresh]);

  const buyProduct = useCallback(async (productId: string) => {
    setError(null);
    setFriendlyError(null);
    setIapState("purchasing");

    console.log("[IAP] buyProduct called:", productId);
    console.log("[IAP] isReady:", isReady, "connected:", connected, "products:", products.map(p => p.id));

    // Import requestPurchase at call time to avoid issues
    const { requestPurchase } = await import("react-native-iap");

    try {
      await requestPurchase({
        request: { apple: { sku: productId } },
        type: "in-app",
      });
    } catch (err: any) {
      console.error("[IAP] requestPurchase error:", err.code, err.message, JSON.stringify(err));
      // requestPurchase may throw for cancellation before listener fires
      if (err?.code === ErrorCode.UserCancelled) {
        setIapState("idle");
        setFriendlyError(null);
        throw err;
      }
      // Set friendly error for non-cancellation throws
      setIapState("error");
      setFriendlyError(getFriendlyErrorMessage(err?.code, err?.message));
      throw err;
    }

    // Wait for listener callback to resolve/reject
    return new Promise<void>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
    });
  }, []);

  return { products, isReady, iapState, error, friendlyError, storeUnavailable, buyProduct };
}
