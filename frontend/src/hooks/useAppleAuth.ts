import { useCallback } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import api from "../lib/api/client";

interface UseAppleAuthReturn {
  signIn: () => Promise<void>;
}

export function useAppleAuth(
  onSuccess: (token: string) => Promise<void>,
  onError: (message: string) => void
): UseAppleAuthReturn {
  const signIn = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        onError("No identity token received from Apple");
        return;
      }

      const res = await api.post("/auth/apple", { identityToken });
      await onSuccess(res.data.token);
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return;
      onError(e.response?.data?.error ?? e.message ?? "Apple sign-in failed");
    }
  }, [onSuccess, onError]);

  return { signIn };
}
