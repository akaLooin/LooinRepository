import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

/** Our own four-leaf shape: four round lobes around the middle. */
function Leaf({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M12 11C9 11 5 10 5 6.5S9 1 12 5c3-4 7-2 7 1.5S15 11 12 11Zm0 2c3 0 7 1 7 4.5S15 23 12 19c-3 4-7 2-7-1.5S9 13 12 13Zm-1-1c0 3-1 7-4.5 7S1 15 5 12c-4-3-2-7 1.5-7S11 9 11 12Zm2 0c0-3 1-7 4.5-7S23 9 19 12c4 3 2 7-1.5 7S13 15 13 12Z" />
    </Svg>
  );
}

/**
 * Clovers popping up all over the sheet when you follow someone (original: green clovers appear and fade).
 * Runs once per `run` change; draws nothing when idle and never takes touches.
 */
export function CloverBurst({ run, color }: { run: number; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  const spots = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ left: `${(i * 37 + run * 13) % 90}%`, top: `${(i * 53 + run * 29) % 85}%`, size: 34 + ((i * 7) % 4) * 8, delay: (i % 4) * 0.12 })),
    [run],
  );
  useEffect(() => {
    if (!run) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }).start();
  }, [run, t]);
  if (!run) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {spots.map((s, i) => {
        const a = s.delay, b = Math.min(a + 0.25, 0.99);
        return (
          <Animated.View key={i} style={{
            position: "absolute", left: s.left as `${number}%`, top: s.top as `${number}%`,
            opacity: t.interpolate({ inputRange: [0, a, b, 0.8, 1], outputRange: [0, 0, 1, 1, 0] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, a, b, 1], outputRange: [0.2, 0.2, 1.1, 1] }) }],
          }}>
            <Leaf size={s.size} color={color} />
          </Animated.View>
        );
      })}
    </View>
  );
}
