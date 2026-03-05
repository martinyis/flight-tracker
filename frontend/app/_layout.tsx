import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, StatusBar } from "react-native";
import * as SplashScreen from "expo-splash-screen";
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
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { fonts } from "../src/utils/fonts";

// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup =
      segments[0] === "welcome" ||
      segments[0] === "login" ||
      segments[0] === "register";

    if (!token && !inAuthGroup) {
      router.replace("/welcome");
    } else if (token && inAuthGroup) {
      router.replace("/");
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F0F6FF",
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F0F6FF" />
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F6FF" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#F0F6FF",
          },
          headerTintColor: "#3B82F6",
          headerTitleStyle: {
            fontFamily: fonts.bold,
            color: "#0F172A",
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: "#F0F6FF",
          },
        }}
      >
        <Stack.Screen
          name="welcome"
          options={{ title: "Welcome", headerShown: false }}
        />
        <Stack.Screen
          name="login"
          options={{ title: "Sign In", headerShown: false }}
        />
        <Stack.Screen
          name="register"
          options={{ title: "Sign Up", headerShown: false }}
        />
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="add-search"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="search/[id]"
          options={{ headerShown: false }}
        />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Wait for fonts before rendering anything
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
