import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WifiOff, Wifi } from "lucide-react-native";
import { useNetwork } from "../../providers/NetworkProvider";
import { colors } from "../../theme";
import { fonts } from "../../theme";

export default function OfflineBanner() {
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const [visible, setVisible] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      wasOffline.current = true;
      setShowReconnected(false);
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline.current) {
      // Came back online — show "Back online" briefly
      wasOffline.current = false;
      setShowReconnected(true);
      // Keep banner visible, swap content, then slide out
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          setShowReconnected(false);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  if (!visible) return null;

  const bg = showReconnected ? colors.success : colors.error;
  const label = showReconnected ? "Back online" : "No internet connection";
  const Icon = showReconnected ? Wifi : WifiOff;

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 4, backgroundColor: bg, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.row}>
        <Icon size={16} color="#fff" strokeWidth={2.5} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
