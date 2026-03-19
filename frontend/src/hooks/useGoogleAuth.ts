import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import api from "../lib/api/client";

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!;

// iOS native builds need the reversed client ID as the redirect URI scheme
// e.g. "X.apps.googleusercontent.com" → "com.googleusercontent.apps.X:/oauthredirect"
const IOS_REVERSED_CLIENT_ID = GOOGLE_IOS_CLIENT_ID.split(".").reverse().join(".");
const IOS_REDIRECT_URI = `${IOS_REVERSED_CLIENT_ID}:/oauthredirect`;

interface UseGoogleAuthReturn {
  promptAsync: () => Promise<void>;
  isReady: boolean;
}

export function useGoogleAuth(
  onSuccess: (accessToken: string, refreshToken: string, isNewUser: boolean) => Promise<void>,
  onError: (message: string) => void
): UseGoogleAuthReturn {
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    ...(Platform.OS === "ios" && { redirectUri: IOS_REDIRECT_URI }),
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleGoogleToken(idToken, onSuccessRef.current, onErrorRef.current);
      } else {
        onErrorRef.current("No ID token received from Google");
      }
    } else if (response.type === "error") {
      onErrorRef.current(
        response.error?.message ?? "Google sign-in failed"
      );
    }
  }, [response]);

  const trigger = useCallback(async () => {
    if (!request) return;
    console.log("[GoogleAuth] request URL:", request.url);
    await promptAsync();
  }, [request, promptAsync]);

  return {
    promptAsync: trigger,
    isReady: !!request,
  };
}

async function handleGoogleToken(
  idToken: string,
  onSuccess: (accessToken: string, refreshToken: string, isNewUser: boolean) => Promise<void>,
  onError: (message: string) => void
): Promise<void> {
  try {
    const res = await api.post("/auth/google", { idToken });
    await onSuccess(res.data.accessToken, res.data.refreshToken, res.data.isNewUser ?? false);
  } catch (e: any) {
    onError(
      e.response?.data?.error ?? e.message ?? "Google sign-in failed"
    );
  }
}
