import { useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, View, type GestureResponderEvent, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";

const native = Platform.OS !== "web";

/**
 * Touch feedback on list rows, as in the original (user's screen recordings of 설정): no grey box, only a faint
 * circle that spreads from the finger across the whole row, edge to edge of the screen, and fades away.
 * `bleed` widens the ripple past the row by the page's side margin, so it is not cut off at the icon.
 *
 * Use: const r = useRipple(color, bleed); <Pressable onPressIn={r.onPressIn} onPressOut={r.onPressOut}>{r.layer}…</Pressable>
 */
export function useRipple(color: string, bleed = 0) {
  const [spot, setSpot] = useState<{ x: number; y: number; n: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const down = useRef(0);

  const onPressIn = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    down.current = Date.now();
    setSpot((s) => ({ x: locationX + bleed, y: locationY, n: (s?.n ?? 0) + 1 }));
    scale.setValue(0.1);
    opacity.setValue(1);
    Animated.timing(scale, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  };
  const onPressOut = () => {
    // a quick tap still shows the ripple for a moment before it fades
    const wait = Math.max(0, 140 - (Date.now() - down.current));
    Animated.timing(opacity, { toValue: 0, duration: 320, delay: wait, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  };
  // big enough to reach the farthest corner from the finger
  const R = spot ? Math.hypot(Math.max(spot.x, box.w - spot.x), Math.max(spot.y, box.h - spot.y)) : 0;
  const layer = (
    <View pointerEvents="none" onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ position: "absolute", top: 0, bottom: 0, left: -bleed, right: -bleed, overflow: "hidden" }}>
      {spot && R ? (
        <Animated.View key={spot.n} style={{
          position: "absolute", left: spot.x - R, top: spot.y - R, width: R * 2, height: R * 2, borderRadius: R,
          backgroundColor: color, opacity, transform: [{ scale }],
        }} />
      ) : null}
    </View>
  );
  return { onPressIn, onPressOut, layer };
}

/** A Pressable with that ripple (for rows built outside ListRow). `style` is a plain style, not a function. */
export function RipplePressable({ bleed = 0, color, children, style, onPressIn, onPressOut, ...rest }:
  Omit<PressableProps, "style" | "children"> & { bleed?: number; color?: string; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const { c } = useTheme();
  const r = useRipple(color ?? c.pressRipple, bleed);
  return (
    <Pressable {...rest} onPressIn={(e) => { r.onPressIn(e); onPressIn?.(e); }} onPressOut={(e) => { r.onPressOut(); onPressOut?.(e); }} style={style}>
      {r.layer}
      {children}
    </Pressable>
  );
}
