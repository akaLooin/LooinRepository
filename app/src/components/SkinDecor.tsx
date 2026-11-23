import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, useWindowDimensions, View } from "react-native";
import { useTheme } from "../theme";

/**
 * A skin's decoration over the screen, never in the way of a tap. 황혼의 재즈: small stars over the top of the screen
 * that twinkle in three slow groups, as an evening sky over the city. (Our own drawing: dots only.)
 */
export function SkinDecor() {
  const { skin } = useTheme();
  if (skin.decor === "stars") return <Stars />;
  if (skin.decor === "hearts") return <Drift kind="hearts" />;
  if (skin.decor === "snow") return <Drift kind="snow" />;
  return null;
}

/**
 * 설레는 마음: small hearts rising slowly from the lower screen and fading. 첫눈 오는 날: snowflakes falling from the
 * top, swaying a little. Few and faint, behind nothing a finger needs (our own glyphs; native-driven loops).
 */
function Drift({ kind }: { kind: "hearts" | "snow" }) {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  const items = useMemo(() => {
    let seed = kind === "hearts" ? 11 : 29;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    return Array.from({ length: kind === "hearts" ? 9 : 16 }, () => ({ x: rnd() * 96, size: 9 + rnd() * 9, ms: (kind === "hearts" ? 9000 : 11000) + rnd() * 7000, delay: rnd() * 8000, sway: 6 + rnd() * 14 }));
  }, [kind]);
  const values = useRef(items.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = values.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(items[i].delay),
      Animated.timing(v, { toValue: 1, duration: items[i].ms, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [values, items]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden" }}>
      {items.map((it, i) => {
        const v = values[i];
        const y = kind === "hearts"
          ? v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.95, height * 0.35] })
          : v.interpolate({ inputRange: [0, 1], outputRange: [-30, height + 10] });
        const x = v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, it.sway, 0, -it.sway, 0] });
        const opacity = v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: kind === "hearts" ? [0, 0.5, 0.35, 0] : [0, 0.75, 0.75, 0] });
        return (
          <Animated.Text key={i} style={{ position: "absolute", left: `${it.x}%`, top: 0, fontSize: it.size, color: kind === "hearts" ? c.accent : c.grabber, opacity, transform: [{ translateY: y }, { translateX: x }] }}>
            {kind === "hearts" ? "♥" : "❄"}
          </Animated.Text>
        );
      })}
    </View>
  );
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
