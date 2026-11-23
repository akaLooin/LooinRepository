import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { useTheme } from "../theme";

/**
 * A skin's decoration over the screen, never in the way of a tap. 황혼의 재즈: small stars over the top of the screen
 * that twinkle in three slow groups, as an evening sky over the city. (Our own drawing: dots only.)
 */
export function SkinDecor() {
  const { skin } = useTheme();
  if (skin.decor !== "stars") return null;
  return <Stars />;
}

function Stars() {
  const { c } = useTheme();
  const phases = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = phases.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 900),
      Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [phases]);
  // fixed positions (same every time), spread over the top part of the screen, thinning out downwards
  const stars = useMemo(() => {
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    return Array.from({ length: 34 }, (_, i) => ({ x: rnd() * 100, y: Math.pow(rnd(), 1.6) * 30, r: rnd() < 0.15 ? 2.2 : 1.3, g: i % 3 }));
  }, []);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {stars.map((s, i) => (
        <Animated.View key={i} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: i % 5 === 0 ? c.accent : c.text,
          opacity: phases[s.g].interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.7] }),
        }} />
      ))}
    </View>
  );
}

/** 8비트 모험: a black pixel frame for cards and bars; nothing for the other skins. */
export function useFrame(): { borderWidth?: number; borderColor?: string } {
  const { c, skin } = useTheme();
  return skin.square ? { borderWidth: 2, borderColor: c.text } : {};
}
/** A corner radius as the skin draws it (square for 8비트 모험). */
export function useRadius() {
  const { skin } = useTheme();
  return (r: number) => (skin.square ? Math.min(r, 3) : r);
}
