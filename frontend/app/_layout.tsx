import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, View, StatusBar } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import {
  Outfit_100Thin,
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { CreditsProvider } from "../src/providers/CreditsProvider";
import { PendingSearchProvider } from "../src/providers/PendingSearchProvider";
import { HapticsProvider } from "../src/providers/HapticsProvider";
import { NetworkProvider } from "../src/providers/NetworkProvider";
import { ToastProvider } from "../src/providers/ToastProvider";
import OfflineBanner from "../src/components/ui/OfflineBanner";
import AnimatedSplashGate from "../src/components/splash/AnimatedSplashGate";
import ErrorBoundary from "../src/components/ErrorBoundary";

import { fonts } from "../src/theme";

SplashScreen.preventAutoHideAsync();

// Fade transition config for tab-like screens
const fadeTransition = {
  animation: "fade" as const,
  gestureEnabled: false,
};

function RootLayoutNav() {
  const { token, isLoading, isNewUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "welcome";
    const inOnboarding = segments[0] === "onboarding";

    if (!token && !inAuthGroup) {
      router.replace("/welcome");
    } else if (token && inAuthGroup) {
      if (isNewUser) {
        router.replace("/onboarding");
      } else {
        router.replace("/");
      }
    } else if (token && !inOnboarding && isNewUser) {
      // Resumed from killed app with pending onboarding
      router.replace("/onboarding");
    }
  }, [token, isLoading, segments, isNewUser]);

  // Navigate to search detail when user taps a notification
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.searchId) {
          router.push(`/search/${data.searchId}`);
        }
      }
    );
    return () => subscription.remove();
  }, [router]);

  // Handle cold-start notification tap (app was killed)
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        if (data?.searchId) {
          setTimeout(() => router.push(`/search/${data.searchId}`), 500);
        }
      }
    });
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#DCEEFB",
        }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color="#2F9CF4" />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#DCEEFB",
          },
          headerShadowVisible: false,
        }}
      >
        {/* Auth screen */}
        <Stack.Screen name="welcome" />

        {/* Onboarding: shown once for new users, no swipe-back */}
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" as const }} />

        {/* Tab-like screens: fade transition, no swipe-back gesture */}
        <Stack.Screen name="index" options={fadeTransition} />
        <Stack.Screen name="credits" options={fadeTransition} />
        <Stack.Screen name="settings" options={fadeTransition} />

        {/* Normal stack screens: default iOS slide */}
        <Stack.Screen name="add-search" />
        <Stack.Screen name="search/[id]" />
        <Stack.Screen name="activity-preferences" />
        <Stack.Screen name="support-legal" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_100Thin,
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  const [splashDone, setSplashDone] = useState(false);

  // Once fonts are ready, hide native splash so our animated one takes over
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <NetworkProvider>
        <HapticsProvider>
          <AuthProvider>
            <CreditsProvider>
              <PendingSearchProvider>
                <ToastProvider>
                  <BottomSheetModalProvider>
                    <RootLayoutNav />
                    {!splashDone && (
                      <AnimatedSplashGate onFinish={handleSplashFinish} />
                    )}
                  </BottomSheetModalProvider>
                </ToastProvider>
              </PendingSearchProvider>
            </CreditsProvider>
          </AuthProvider>
        </HapticsProvider>
      </NetworkProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
