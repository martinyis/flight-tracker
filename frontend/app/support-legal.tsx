import { View, Text, Pressable, StyleSheet, StatusBar, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  LifeBuoy,
  FileText,
  ScrollText,
} from "lucide-react-native";
import { useHaptics } from "../src/providers/HapticsProvider";
import MeshBackground from "../src/components/ui/MeshBackground";
import { fonts } from "../src/theme";

const C = {
  primary: "#2F9CF4",
  n900: "#0F172A",
  n500: "#64748B",
  n400: "#94A3B8",
  divider: "rgba(148, 163, 184, 0.15)",
};

function Row({
  icon,
  label,
  subtitle,
  onPress,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      >
        <View style={s.iconWrap}>{icon}</View>
        <View style={s.labelWrap}>
          <Text style={s.label}>{label}</Text>
          {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        </View>
        <ChevronRight size={18} color={C.n400} strokeWidth={2} />
      </Pressable>
      {!isLast && <View style={s.divider} />}
    </>
  );
}

export default function SupportLegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();

  const openLink = (url: string) => {
    haptics.light();
    Linking.openURL(url);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MeshBackground />

      <View style={[s.safe, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable
            onPress={() => { haptics.light(); router.back(); }}
            hitSlop={12}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          >
            <ArrowLeft size={22} color={C.n900} strokeWidth={2} />
          </Pressable>
          <Text style={s.headerTitle}>Support & Legal</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Support */}
        <Text style={s.sectionLabel}>SUPPORT</Text>
        <Row
          icon={<LifeBuoy size={18} color={C.n500} strokeWidth={2} />}
          label="Contact Support"
          subtitle="boromask@gmail.com"
          onPress={() => openLink("mailto:boromask@gmail.com")}
          isLast
        />

        {/* Legal */}
        <Text style={s.sectionLabel}>LEGAL</Text>
        <Row
          icon={<FileText size={18} color={C.n500} strokeWidth={2} />}
          label="Privacy Policy"
          onPress={() => openLink("https://airfareweb.vercel.app/privacy-policy")}
        />
        <Row
          icon={<ScrollText size={18} color={C.n500} strokeWidth={2} />}
          label="Terms of Service"
          onPress={() => openLink("https://airfareweb.vercel.app/terms-of-service")}
        />
        <Row
          icon={<FileText size={18} color={C.n500} strokeWidth={2} />}
          label="Acceptable Use"
          onPress={() => openLink("https://airfareweb.vercel.app/acceptable-use")}
        />
        <Row
          icon={<FileText size={18} color={C.n500} strokeWidth={2} />}
          label="Data Deletion"
          onPress={() => openLink("https://airfareweb.vercel.app/data-deletion")}
          isLast
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#DCEEFB" },
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: C.n900,
    letterSpacing: -0.4,
  },

  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: C.n400,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    gap: 14,
  },
  rowPressed: { backgroundColor: "rgba(47, 156, 244, 0.04)" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${C.n500}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: { flex: 1 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: C.n900,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: C.n500,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginLeft: 70,
    marginRight: 20,
  },
});
