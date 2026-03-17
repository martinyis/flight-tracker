import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "haptics_enabled";

interface HapticsState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  light: () => void;
  medium: () => void;
  heavy: () => void;
  selection: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;
}

const HapticsContext = createContext<HapticsState | null>(null);

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "false") setEnabledState(false);
    });
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    AsyncStorage.setItem(STORAGE_KEY, String(v));
  }, []);

  const light = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [enabled]);

  const medium = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [enabled]);

  const heavy = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [enabled]);

  const selection = useCallback(() => {
    if (!enabled) return;
    Haptics.selectionAsync();
  }, [enabled]);

  const success = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [enabled]);

  const warning = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [enabled]);

  const error = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [enabled]);

  return (
    <HapticsContext.Provider
      value={{ enabled, setEnabled, light, medium, heavy, selection, success, warning, error }}
    >
      {children}
    </HapticsContext.Provider>
  );
}

const noop = () => {};
const fallback: HapticsState = {
  enabled: false,
  setEnabled: noop,
  light: noop,
  medium: noop,
  heavy: noop,
  selection: noop,
  success: noop,
  warning: noop,
  error: noop,
};

export function useHaptics(): HapticsState {
  const ctx = useContext(HapticsContext);
  return ctx ?? fallback;
}
