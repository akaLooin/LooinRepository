/**
 * 중요한 날 / 강조 (user's feature). Two looks, tried side by side (2026-11-20, user):
 * - usual app: a softer breathing glow (no swell), with a thin dark gap between the shape and the glow so a
 *   highlighted item still stands out when its colour is the glow colour (#00FF7F on #00FF7F)
 * - design trial: the first, brighter outline, plus embers rising from the item as if it were gently burning
 * Every glowing item shares one pulse and one ember clock, so they move together and only two animations run.
 */
import { Animated, Easing, View } from "react-native";
import { usePrefs } from "../data/prefs";
import { DESIGN_TRIAL } from "../lib/variant";
import { useTheme } from "../theme";

/** 강조 색 (설정 → 화면): #00FF7F unless changed. */
export const useGlowColor = () => usePrefs().glowColor || "#00FF7F";

/** How strongly the outline breathes: [faint, bright] opacity. */
export const GLOW_RANGE: [number, number] = DESIGN_TRIAL ? [0.35, 1] : [0.3, 0.75];

let pulse: Animated.Value | null = null;
export function usePulse() {
  if (!pulse) {
    pulse = new Animated.Value(0);
    const half = DESIGN_TRIAL ? 1400 : 1300;
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }
  return pulse;
}
export const useGlowOpacity = () => usePulse().interpolate({ inputRange: [0, 1], outputRange: GLOW_RANGE });

let clock: Animated.Value | null = null;
function useEmberClock() {
  if (!clock) {
    clock = new Animated.Value(0);
    Animated.loop(Animated.timing(clock, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })).start();
  }
  return clock;
}

// fixed "random" values per ember, so every glowing item burns the same way (and nothing changes between renders)
const R = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/**
 * Embers rising from the box it covers (position it over the item): small soft sparks in the glow colour, a few
 * whiter ones, drifting sideways and fading out above the item. Design trial only (returns nothing otherwise).
 */
export function Embers({ count = 6, rise = 22, size = 4, from = 0.15, to = 0.85, strength = 1, start = 30, seed = 0 }: {
  count?: number; rise?: number; size?: number;
  /** how bright at most (0–1), for the soft flame layer under the sparks */
  strength?: number;
  /** where sparks start, % from the bottom of the box (they vary up to 40% above this) */
  start?: number;
  /** another set of fixed values (two layers on one item should not move alike) */
  seed?: number;
  /** where along the width sparks start (0–1) */
  from?: number; to?: number;
}) {
  const color = useGlowColor();
  const t = useEmberClock();
  if (!DESIGN_TRIAL) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const j = i + seed * 17;
        const phase = (i + 0.5) / count; // spread over the cycle; never 0, so the ranges below stay increasing
        const p = t.interpolate({ inputRange: [0, 1 - phase, 1 - phase + 0.0001, 1], outputRange: [phase, 1, 0, phase] }); // (t + phase) % 1
        const s = size * (0.6 + R(j, 1) * 0.7);
        const x = from + (to - from) * R(j, 2);
        const drift = (R(j, 3) - 0.5) * size * 3;
        const white = strength >= 1 && R(j, 4) > 0.75;
        const flame = strength < 1;
        return (
          <Animated.View key={i} style={{
            position: "absolute", left: `${x * 100}%`, bottom: `${start + R(j, 5) * 40}%`, marginLeft: -s / 2,
            // sparks are small drops; the soft layer is flame tongues (a teardrop turned to point up)
            ...(flame ? { width: s, height: s, borderRadius: s / 2, borderTopLeftRadius: 0 } : { width: s, height: s * 1.5, borderRadius: s }),
            backgroundColor: white ? "#FFFFFF" : color,
            opacity: p.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, (white ? 0.7 : 0.9) * strength, 0.45 * strength, 0] }),
            transform: [
              { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -rise * (0.7 + R(j, 6) * 0.6)] }) },
              { translateX: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, drift * 0.4] }) },
              { scale: p.interpolate({ inputRange: [0, 1], outputRange: flame ? [0.7, 0.35] : [1, 0.25] }) },
              ...(flame ? [{ rotate: "45deg" }, { scaleY: 1.25 }] : []),
            ],
          }} />
        );
      })}
    </View>
  );
}

/** Design trial: soft flame tongues licking up from the item, with sparks flying higher. */
export function Fire({ size, count = 6, rise }: { size: number; count?: number; rise: number }) {
  if (!DESIGN_TRIAL) return null;
  return (
    <>
      <Embers count={Math.max(3, Math.round(count * 0.7))} rise={rise * 0.45} size={size * 2.2} strength={0.35} start={45} seed={1} />
      <Embers count={count} rise={rise} size={size} />
    </>
  );
}

/**
 * A glowing frame around a bar or block (event bars, event lines, timeline blocks): a dark gap, then the breathing
 * outline, then (design trial) embers. `inset` is how far the frame reaches past the item.
 */
export function GlowFrame({ radius, inset = 3, width = 2, left = 0, right = 0, embers }: {
  radius: number; inset?: number; width?: number; left?: number; right?: number;
  /** design trial: how many embers and how high they rise */
  embers?: { count: number; rise: number; size?: number };
}) {
  const { c } = useTheme();
  const color = useGlowColor();
  const opacity = useGlowOpacity();
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: -inset, bottom: -inset, left: left - inset, right: right - inset }}>
      {/* the gap keeps the item's own edge visible when it has the glow colour */}
      <View style={{ position: "absolute", top: inset - 1.5, bottom: inset - 1.5, left: inset - 1.5, right: inset - 1.5, borderRadius: radius + 1.5, borderWidth: 1.5, borderColor: c.bg }} />
      <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius + inset, borderWidth: width, borderColor: color, opacity }} />
      {embers && DESIGN_TRIAL ? (
        <View style={{ position: "absolute", top: inset, bottom: inset, left: inset, right: inset }}>
          <Embers count={Math.max(2, Math.round(embers.count * 0.6))} rise={embers.rise * 0.45} size={(embers.size ?? 3) * 2.2} strength={0.35} start={40} seed={1} from={0.05} to={0.95} />
          <Embers count={embers.count} rise={embers.rise} size={embers.size} from={0.05} to={0.95} />
        </View>
      ) : null}
    </View>
  );
}
