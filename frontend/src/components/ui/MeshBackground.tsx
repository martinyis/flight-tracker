import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * MeshBackground -- Multi-layer gradient wash that creates the luminous sky feeling.
 * Used as the base layer on every main app screen.
 *
 * Colors aligned to DESIGN_SYSTEM.md Section 2 (Background System):
 *   Layer 1: #DCEEFB -> #EBF3FE -> #F4F8FF -> #FAFCFF (diagonal)
 *   Layer 2: rgba(143, 208, 250, 0.12) -> transparent (top-down blue)
 *   Layer 3: transparent -> rgba(165, 180, 252, 0.06) (warm bottom-right)
 *   Layer 4: transparent -> rgba(103, 232, 249, 0.05) -> transparent (cyan right)
 */
export default function MeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Layer 1: base diagonal wash */}
      <LinearGradient
        colors={["#DCEEFB", "#EBF3FE", "#F4F8FF", "#FAFCFF"]}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 2: subtle top-down blue tint */}
      <LinearGradient
        colors={["rgba(143, 208, 250, 0.12)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 3: soft warm shift from bottom-right corner */}
      <LinearGradient
        colors={["transparent", "rgba(165, 180, 252, 0.06)"]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 4: very faint cyan from right edge */}
      <LinearGradient
        colors={["transparent", "rgba(103, 232, 249, 0.05)", "transparent"]}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 0.2 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
