import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable } from "react-native";
import { useTheme } from "../theme";
import { ChevronDown } from "./icons";

/**
 * The fold button at the right end of a category's title row (user's screenshot of the original: a thin ∨).
 * Folded, it turns over to ∧ (the folded look is not in the screenshots; our guess).
 */
export function CollapseChevron({ collapsed, onPress, label }: { collapsed: boolean; onPress: () => void; label: string }) {
  const { c } = useTheme();
  const turn = useRef(new Animated.Value(collapsed ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(turn, { toValue: collapsed ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [collapsed, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${label} ${collapsed ? "펼치기" : "접기"}`}
      accessibilityState={{ expanded: !collapsed }} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <ChevronDown size={22} color={c.textMuted} strokeWidth={1.6} />
      </Animated.View>
    </Pressable>
  );
}
