/**
 * Sign Up screen — dark theme
 *
 * Two-step flow:
 *   Step 1: First name, last name, email → "Continue"
 *   Step 2: Password slides in → "Create Account"
 */

import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../src/context/AuthContext";
import { fonts } from "../src/utils/fonts";
import LogoHero from "../src/components/LogoHero";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Social icon helpers (proper SVG icons)
// ---------------------------------------------------------------------------

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#F8FAFC">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstFocused, setFirstFocused] = useState(false);
  const [lastFocused, setLastFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const passwordRef = useRef<TextInput>(null);

  const step1Valid = firstName.trim().length > 0 && email.includes("@");
  const step2Valid = password.length >= 6;

  const handleContinue = () => {
    setError("");
    if (!firstName.trim()) {
      setError("Please enter your first name");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(2);
    setTimeout(() => passwordRef.current?.focus(), 350);
  };

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      await register(email.trim(), password);
      router.replace("/");
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const onPressIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const isValid = step === 1 ? step1Valid : step2Valid;
  const handlePress = step === 1 ? handleContinue : handleRegister;
  const btnLabel = step === 1 ? "Continue" : "Create Account";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Dark mesh gradient background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={["#0B1120", "#111827", "#0F172A", "#0B1120"]}
          locations={[0, 0.3, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(59,130,246,0.08)", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["transparent", "rgba(99,102,241,0.06)"]}
          start={{ x: 0, y: 0.4 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          {step === 2 ? (
            <Pressable onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setStep(1);
              setError("");
            }}>
              <Text style={styles.topLink}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.topLink}>Sign in</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <LogoHero />
            <Text style={styles.title}>
              {step === 1
                ? <>Sign up for <Text style={styles.titleBrand}>Skylens</Text></>
                : "Set your password"}
            </Text>
            {step === 2 && (
              <Text style={styles.subtitle}>
                Almost there! Choose a secure password.
              </Text>
            )}

            {step === 1 ? (
              <>
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <Text style={styles.fieldLabel}>First name</Text>
                    <TextInput
                      style={[styles.input, firstFocused && styles.inputFocused]}
                      placeholder="Alex"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onFocus={() => setFirstFocused(true)}
                      onBlur={() => setFirstFocused(false)}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <Text style={styles.fieldLabel}>Last name</Text>
                    <TextInput
                      style={[styles.input, lastFocused && styles.inputFocused]}
                      placeholder="Smith"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onFocus={() => setLastFocused(true)}
                      onBlur={() => setLastFocused(false)}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, passwordFocused && styles.inputFocused]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={step2Valid ? handleRegister : undefined}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
              </>
            )}

            {error ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                style={[
                  styles.primaryBtn,
                  (!isValid || loading) && styles.primaryBtnDisabled,
                ]}
                onPress={handlePress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={!isValid || loading}
              >
                {(!isValid || loading) ? (
                  <View style={styles.disabledInner}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>{btnLabel}</Text>
                    )}
                  </View>
                ) : (
                  <LinearGradient
                    colors={["#6366F1", "#3B82F6", "#06B6D4"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.gradientInner}
                  >
                    <Text style={styles.primaryBtnText}>{btnLabel}</Text>
                  </LinearGradient>
                )}
              </Pressable>
            </Animated.View>

            {step === 1 && (
              <View style={styles.socialRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.socialBtn,
                    pressed && styles.socialBtnPressed,
                  ]}
                >
                  <AppleIcon />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.socialBtn,
                    pressed && styles.socialBtnPressed,
                  ]}
                >
                  <GoogleIcon />
                  <Text style={styles.socialBtnText}>Google</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B1120" },
  safe: { flex: 1 },
  flex: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "center",
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topLink: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#60A5FA",
  },

  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: "#F8FAFC",
    letterSpacing: -0.3,
    marginTop: 4,
    marginBottom: 24,
    textAlign: "center",
  },
  titleBrand: {
    color: "#60A5FA",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 28,
  },

  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },

  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#F8FAFC",
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.2,
  },

  input: {
    fontFamily: fonts.regular,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputFocused: {
    borderColor: "#3B82F6",
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  errorWrap: {
    backgroundColor: "rgba(220,38,38,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: fonts.regular,
    color: "#FCA5A5",
    fontSize: 14,
    textAlign: "center",
  },

  primaryBtn: {
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  gradientInner: {
    borderRadius: 10,
    paddingVertical: 17,
    alignItems: "center",
  },
  disabledInner: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingVertical: 17,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },

  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  socialBtnPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  socialBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#F8FAFC",
  },
});
