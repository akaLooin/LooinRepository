/**
 * 중요한 날 / 강조 (user's feature). The look the user chose (2026-11-20, "2안"), in both apps: a bright breathing
 * outline, a thin dark gap between the item and its glow (so a #00FF7F item highlighted in #00FF7F still shows),
 * and the item gently burning: flame tongues licking up and sparks rising. Bars and blocks get a soft neon halo
 * (several fading rings) rather than one hard line.
 * Every glowing item shares one pulse and one ember clock, so they move together and only two animations run.
 */
import { createContext, useContext, useEffect } from "react";
import { Animated, AppState, Easing, View } from "react-native";
import { usePrefs, type Prefs } from "../data/prefs";
import { DESIGN_TRIAL } from "../lib/variant";
import { useTheme, type ColorName } from "../theme";
import { AppText } from "./AppText";

const Tint = createContext<string | null>(null);
/** 강조 색 (설정 → 화면): the item's own glow when it is inside a GlowTint (메인 앱), else the one colour (#00FF7F unless changed). */
export const useGlowColor = () => { const tint = useContext(Tint); const p = usePrefs(); return tint ?? (p.glowColor || "#00FF7F"); };
/** Everything glowing inside glows in `color` (none: the usual 강조 색). */
export function GlowTint({ color, children }: { color?: string | null; children: React.ReactNode }) {
  return color ? <Tint.Provider value={color}>{children}</Tint.Provider> : <>{children}</>;
}
/** The glow colour of an item: its category (a to-do category, a 일정 카테고리, or none for an event) and its own colour. */
export const glowOf = (p: Pick<Prefs, "glowColor" | "glowMode" | "glowColors">, categoryId: string | null | undefined, own: string) =>
  !DESIGN_TRIAL ? p.glowColor || "#00FF7F" : p.glowMode === "custom" ? p.glowColors[categoryId || "event:none"] ?? own : own;
export const useGlowOf = () => { const p = usePrefs(); return (categoryId: string | null | undefined, own: string) => glowOf(p, categoryId, own); };

/** How strongly the outline breathes: [faint, bright] opacity. */
export const GLOW_RANGE: [number, number] = [0.35, 1];

/**
 * A looping animation shared by everything on screen that uses it. It runs while at least one item uses it and
 * is started again whenever a new item appears and when the app comes back to the front: a native-driven loop
 * stops for good once the views it drove are gone (calendar pages swiped away), which is why the flames froze
 * after a while (user, 2026-11-20).
 */
function sharedLoop(build: (v: Animated.Value) => Animated.CompositeAnimation) {
  const v = new Animated.Value(0);
  let users = 0;
  let anim: Animated.CompositeAnimation | null = null;
  let lastStart = 0;
  const start = () => {
    lastStart = Date.now();
    anim?.stop();
    anim = build(v);
    anim.start();
  };
  AppState.addEventListener("change", (st) => { if (st === "active" && users > 0) start(); });
  return function useLoop() {
    useEffect(() => {
      users++;
      // a new item: make sure the loop is running (not more than once a second, so paging does not stutter it)
      if (!anim || Date.now() - lastStart > 1000) start();
      return () => { users--; if (users === 0) { anim?.stop(); anim = null; } };
    }, []);
    return v;
  };
}

export const usePulse = sharedLoop((v) => Animated.loop(Animated.sequence([
  Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
  Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
])));
export const useGlowOpacity = () => usePulse().interpolate({ inputRange: [0, 1], outputRange: GLOW_RANGE });

const useEmberClock = sharedLoop((v) => { v.setValue(0); return Animated.loop(Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })); });

// fixed "random" values per ember, so every glowing item burns the same way (and nothing changes between renders)
const R = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/**
 * Embers rising from the box it covers (position it over the item): small soft sparks in the glow colour, a few
 * whiter ones, drifting sideways and fading out above the item.
 */
export function Embers(props: Parameters<typeof SparksOn>[0]) {
  // 메인 앱: sparks and flames can be turned off in 설정 → 화면 (user, 2026-11-23); the glow stays
  const on = usePrefs().glowParticles;
  return DESIGN_TRIAL && !on ? null : <SparksOn {...props} />;
}

function SparksOn({ count = 6, rise = 22, size = 4, from = 0.15, to = 0.85, strength = 1, start = 30, seed = 0 }: {
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

/** Soft flame tongues licking up from the item, with sparks flying higher. */
export function Fire({ size, count = 6, rise }: { size: number; count?: number; rise: number }) {
  return (
    <>
      <Embers count={Math.max(3, Math.round(count * 0.7))} rise={rise * 0.45} size={size * 2.2} strength={0.35} start={45} seed={1} />
      <Embers count={count} rise={rise} size={size} />
    </>
  );
}

/**
 * A glowing frame around a bar, chip or block (event bars, event lines, timeline blocks, 종일 chips): a dark gap,
 * then a neon halo that fades outwards (as bright as the first outline at most, user), then flames and sparks.
 * `inset` is how far the halo reaches past the item.
 */
export function GlowFrame({ radius, inset = 5, left = 0, right = 0, embers }: {
  radius: number; inset?: number; left?: number; right?: number;
  /** how many sparks and how high they rise (flame tongues are added to match) */
  embers?: { count: number; rise: number; size?: number };
}) {
  const { c } = useTheme();
  const color = useGlowColor();
  const opacity = useGlowOpacity();
  // rings from the item's edge outwards, each wider and fainter: reads as a soft neon spread, not a line
  const rings = [
    { at: 1.5, w: 1.5, o: 1 },
    { at: 3, w: 1.5, o: 0.5 },
    { at: 4.5, w: 1.5, o: 0.25 },
    { at: 6, w: 1.5, o: 0.1 },
  ].filter((r) => r.at <= inset + 1.5);
  const outer = Math.max(...rings.map((r) => r.at));
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: -outer, bottom: -outer, left: left - outer, right: right - outer }}>
      {/* the gap keeps the item's own edge visible when it has the glow colour */}
      <View style={{ position: "absolute", top: outer - 1.5, bottom: outer - 1.5, left: outer - 1.5, right: outer - 1.5, borderRadius: radius + 1.5, borderWidth: 1.5, borderColor: c.bg }} />
      <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity }}>
        {rings.map((r) => (
          <View key={r.at} style={{ position: "absolute", top: outer - r.at - r.w / 2 + 0.75, bottom: outer - r.at - r.w / 2 + 0.75, left: outer - r.at - r.w / 2 + 0.75, right: outer - r.at - r.w / 2 + 0.75,
            borderRadius: radius + r.at, borderWidth: r.w, borderColor: color, opacity: r.o }} />
        ))}
      </Animated.View>
      {embers ? (
        <View style={{ position: "absolute", top: outer, bottom: outer, left: outer, right: outer }}>
          <Embers count={Math.max(2, Math.round(embers.count * 0.6))} rise={embers.rise * 0.45} size={(embers.size ?? 3) * 2.2} strength={0.4} start={40} seed={1} from={0.05} to={0.95} />
          <Embers count={embers.count} rise={embers.rise} size={embers.size} from={0.05} to={0.95} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Text that glows like a red neon sign, breathing with the shared pulse; no flames (user: the D-day label on the day
 * itself). A blurred copy behind the text brightens and fades; the text on top stays sharp.
 */
export function NeonText({ children, variant = "body", weight = 700, color = "dday" }: {
  children: string; variant?: "body" | "bodyLg"; weight?: 400 | 500 | 600 | 700; color?: ColorName;
}) {
  const { c } = useTheme();
  const col = c[color];
  const opacity = usePulse().interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const blur = (r: number) => ({ textShadowColor: col, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } });
  return (
    <View>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity }}>
        <AppText variant={variant} weight={weight} raw={col} style={blur(14)}>{children}</AppText>
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity }}>
        <AppText variant={variant} weight={weight} raw={col} style={blur(6)}>{children}</AppText>
      </Animated.View>
      <AppText variant={variant} weight={weight} raw={col} style={blur(2)}>{children}</AppText>
    </View>
  );
}
