import { useId } from "react";
import { Animated, Pressable, View } from "react-native";
import { Fire, useGlowColor, usePulse } from "./Highlight";
import { usePrefs } from "../data/prefs";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from "react-native-svg";
import { DESIGN_TRIAL } from "../lib/variant";
/**
 * The four-point star (the design trial's look) is the shape in both apps since 2026-11-21 (user: "디자인 앱으로 정식
 * 픽스"). The clover drawing below stays only as a fallback for STAR = false.
 */
const STAR = true;
import { contrast, fontFamily, tokens, useTheme, visibleOn } from "../theme";
import { AppText } from "./AppText";

export type CloverState =
  | { kind: "empty" }
  | { kind: "count"; count: number }
  | { kind: "done"; color: string }
  | { kind: "doneCount"; color: string; count: number }
  | { kind: "partial"; color: string; ratio: number }
  | { kind: "todoOpen" }
  | { kind: "todoDone"; color: string }
  | { kind: "fill"; color: string }
  | { kind: "split"; colors: string[]; left: number }; // any done: bands by category order; number left, or tick when 0

/**
 * Four overlapping circles at the corners: a soft square with a small dip in the middle of each side, as the
 * original's calendar clover looks (measured on the user's screen recording: radius 31.4% of the width, centres at
 * 31.4% / 68.6%). Drawn here as plain circles; no image from the original.
 */
export const LOBE_R = 0.314;
const LOBE_AT = [[LOBE_R, LOBE_R], [1 - LOBE_R, LOBE_R], [LOBE_R, 1 - LOBE_R], [1 - LOBE_R, 1 - LOBE_R]] as const; // TL, TR, BL, BR

/**
 * Design trial (2026-11-18, user's picture): a four-point star with curved sides instead of the clover. One colour
 * fills it; several categories become a diagonal gradient in category order. `inset` keeps an outline inside the box.
 */
export const STAR_BLEED = 0.18; // drawn larger than the clover box on each side; turned, its points end inside the corners
/** Turned 45°, an "x" rather than a "+" (user, 2026-11-19); the points go to the corners. */
export function starPath(size: number, inset = 0) {
  inset -= size * STAR_BLEED;
  const k1 = 0.12, k2 = 0.33, s = size - 2 * inset; // the plumper curve the user liked better (2026-11-19)
  const c = size / 2, cos = Math.SQRT1_2;
  const p = (x: number, y: number) => {
    const dx = inset + x * s - c, dy = inset + y * s - c;
    return `${c + (dx - dy) * cos} ${c + (dx + dy) * cos}`;
  };
  return `M${p(0.5, 0)} C${p(0.5 + k1, k2)} ${p(1 - k2, 0.5 - k1)} ${p(1, 0.5)} C${p(1 - k2, 0.5 + k1)} ${p(0.5 + k1, 1 - k2)} ${p(0.5, 1)} `
    + `C${p(0.5 - k1, 1 - k2)} ${p(k2, 0.5 + k1)} ${p(0, 0.5)} C${p(k2, 0.5 - k1)} ${p(0.5 - k1, k2)} ${p(0.5, 0)}Z`;
}

function Lobes({ size, fill }: { size: number; fill: string }) {
  if (STAR) return <Path d={starPath(size)} fill={fill} />;
  return (
    <G fill={fill}>
      {LOBE_AT.map(([x, y], i) => <Circle key={i} cx={x * size} cy={y * size} r={LOBE_R * size} />)}
    </G>
  );
}

/** Several categories: each circle takes a category colour in order (top pair first), and the overlaps show through. */
export const lobeColors = (colors: string[]) => LOBE_AT.map((_, i) => colors[Math.floor((i * colors.length) / 4)]);
function SplitLobes({ size, colors, id }: { size: number; colors: string[]; id: string }) {
  if (new Set(colors).size <= 1) return <Lobes size={size} fill={colors[0]} />;
  if (STAR) {
    return (
      <>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {colors.map((col, i) => <Stop key={i} offset={colors.length === 1 ? 0 : i / (colors.length - 1)} stopColor={col} />)}
          </LinearGradient>
        </Defs>
        <Path d={starPath(size)} fill={`url(#${id})`} />
      </>
    );
  }
  return (
    <G>
      {lobeColors(colors).map((col, i) => (
        <Circle key={i} cx={LOBE_AT[i][0] * size} cy={LOBE_AT[i][1] * size} r={LOBE_R * size} fill={col} opacity={0.85} />
      ))}
    </G>
  );
}

function Tick({ size, color }: { size: number; color: string }) {
  // the star's middle is smaller than the clover's: a smaller tick, still centred
  const k = STAR ? 0.9 : 1;
  const s = (size / 24) * k, o = (size * (1 - k)) / 2;
  return (
    <Path
      d={`M${o + 7 * s} ${o + 12.5 * s} L${o + 10.5 * s} ${o + 16 * s} L${o + 17 * s} ${o + 8.5 * s}`}
      stroke={color}
      strokeWidth={2.6 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** 중요한 날: a glowing outline around the clover or star (see Highlight.tsx for the two looks being tried). */
function Glow({ size, bleed }: { size: number; bleed: number }) {
  const { c } = useTheme();
  const neon = useGlowColor();
  // to-dos glow a little brighter than events' bars (user)
  const opacity = usePulse().interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const m = size * 0.3 + bleed; // room for the soft outer line
  const outline = (w: number, o: number, color = neon) => (STAR
    ? <Path d={starPath(size)} fill="none" stroke={color} strokeWidth={w} strokeOpacity={o} strokeLinejoin="round" />
    : <G fill="none" stroke={color} strokeWidth={w} strokeOpacity={o}>{LOBE_AT.map(([x, y], i) => <Circle key={i} cx={x * size} cy={y * size} r={LOBE_R * size} />)}</G>);
  const widths = [0.36, 0.2, 0.1]; // the first, brighter outline, a touch wider for to-dos (user)
  return (
    <>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: -m, top: -m, width: size + 2 * m, height: size + 2 * m, opacity }}>
        <Svg width={size + 2 * m} height={size + 2 * m}>
          <G x={m} y={m}>
            {outline(size * widths[0], 0.24)}
            {outline(size * widths[1], 0.5)}
            {outline(size * widths[2], 1)}
          </G>
        </Svg>
      </Animated.View>
      {/* a thin dark gap right round the shape, so a clover in the glow colour still shows its edge */}
      <Svg pointerEvents="none" width={size + 2 * m} height={size + 2 * m} style={{ position: "absolute", left: -m, top: -m }}>
        <G x={m} y={m}>{outline(size * 0.13, 1, c.bg)}</G>
      </Svg>
    </>
  );
}

/**
 * 메인 앱 (user, 2026-11-23): only the outside glows, and the star's own edge is the bright line (no extra ring and
 * no dark gap). `under` sits below the star: the soft glow, masked so nothing shows inside the shape. `edge` sits
 * above it: the star's outline itself in the glow colour. Both pulse together.
 */
function OuterGlow({ size, bleed, part, id }: { size: number; bleed: number; part: "under" | "edge"; id: string }) {
  const neon = useGlowColor();
  const opacity = usePulse().interpolate({ inputRange: [0, 1], outputRange: part === "edge" ? [0.75, 1] : [0.45, 1] });
  const m = size * 0.3 + bleed;
  const w = size + 2 * m;
  const d = starPath(size);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: -m, top: -m, width: w, height: w, opacity }}>
      <Svg width={w} height={w}>
        {part === "under" ? (
          <>
            <Defs>
              <Mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={w}>
                <Rect x={0} y={0} width={w} height={w} fill="#fff" />
                <G x={m} y={m}><Path d={d} fill="#000" /></G>
              </Mask>
            </Defs>
            <G mask={`url(#${id})`}>
              <G x={m} y={m}>
                <Path d={d} fill="none" stroke={neon} strokeWidth={size * 0.42} strokeOpacity={0.22} strokeLinejoin="round" />
                <Path d={d} fill="none" stroke={neon} strokeWidth={size * 0.24} strokeOpacity={0.45} strokeLinejoin="round" />
                <Path d={d} fill="none" stroke={neon} strokeWidth={size * 0.12} strokeOpacity={0.85} strokeLinejoin="round" />
              </G>
            </G>
          </>
        ) : (
          <G x={m} y={m}><Path d={d} fill="none" stroke={neon} strokeWidth={size * 0.07} strokeLinejoin="round" /></G>
        )}
      </Svg>
    </Animated.View>
  );
}

export function Clover({
  state,
  size = tokens.size.cloverCalendar,
  onPress,
  onLongPress,
  label,
  glow,
}: {
  state: CloverState;
  size?: number;
  onPress?: () => void;
  /** to-do rows: a long press on the check marks the to-do as important (중요한 날) */
  onLongPress?: () => void;
  label?: string;
  /** 중요한 날: the neon outline */
  glow?: boolean;
}) {
  const { c } = useTheme();
  const { checkColor, cloverNumberColor } = usePrefs();
  // the tick is white unless the user picked black (설정 → 화면 → 체크 표시 색)
  const chosen = checkColor === "black" ? c.checkBlack : c.checkWhite;
  const other = checkColor === "black" ? c.checkWhite : c.checkBlack;
  // only when the category colour is almost the tick colour (white on a white category) use the other one;
  // bright greens keep the white tick, as in the original
  const tickOn = (bg: string) => (contrast(chosen, bg) < 1.15 ? other : chosen);
  // the number left on a coloured clover: white by default, black if picked (설정 → 화면 → 캘린더 숫자 색), with the
  // same fallback when the category colour is almost that colour
  const num = cloverNumberColor === "black" ? c.checkBlack : c.checkWhite;
  const numOther = cloverNumberColor === "black" ? c.checkWhite : c.checkBlack;
  const numberOn = (bg: string) => (contrast(num, bg) < 1.15 ? numOther : num);

  const clipId = "clip" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const bleed = STAR ? size * STAR_BLEED : 0;
  const empty = c.cloverEmpty;
  const fill = (col: string) => visibleOn(col, c.bg, c.text);
  let body: React.ReactNode;
  let count: number | null = null;
  let countColor = c.cloverNumber;

  switch (state.kind) {
    case "empty":
      body = <Lobes size={size} fill={empty} />;
      break;
    case "count":
      body = <Lobes size={size} fill={empty} />;
      count = state.count;
      break;
    case "split": {
      const cols = state.colors.length ? state.colors.map(fill) : [fill(c.text)];
      body = (
        <>
          <SplitLobes size={size} colors={cols} id={`${clipId}g`} />
          {state.left === 0 ? <Tick size={size} color={tickOn(cols[0])} /> : null}
        </>
      );
      if (state.left > 0) {
        count = state.left;
        countColor = numberOn(cols[0]);
      }
      break;
    }
    case "fill":
      body = <Lobes size={size} fill={fill(state.color)} />;
      break;
    case "todoOpen":
      // grey until done, as in the original; the copy app draws an outline star (the user's picture); the main app
      // a filled grey star (user, 2026-11-23)
      body = DESIGN_TRIAL ? <Lobes size={size} fill={empty} />
        : STAR ? <Path d={starPath(size, size * 0.04)} fill="none" stroke={empty} strokeWidth={size * 0.08} strokeLinejoin="round" />
        : <Lobes size={size} fill={empty} />;
      break;
    case "done":
    case "todoDone":
      body = (
        <>
          <Lobes size={size} fill={fill(state.color)} />
          <Tick size={size} color={tickOn(fill(state.color))} />
        </>
      );
      break;
    case "doneCount":
      body = <Lobes size={size} fill={fill(state.color)} />;
      count = state.count;
      countColor = numberOn(fill(state.color));
      break;
    case "partial": {
      const h = size * Math.max(0, Math.min(1, state.ratio));
      body = (
        <>
          <Defs>
            <ClipPath id={clipId}>
              <Rect x={-bleed} y={-bleed} width={size + 2 * bleed} height={h * (1 + 2 * STAR_BLEED * Number(STAR))} />
            </ClipPath>
          </Defs>
          <Lobes size={size} fill={empty} />
          <G clipPath={`url(#${clipId})`}>
            <Lobes size={size} fill={fill(state.color)} />
          </G>
          <Tick size={size} color={tickOn(fill(state.color))} />
        </>
      );
      break;
    }
  }

  const shape = (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {glow ? (DESIGN_TRIAL && STAR ? <OuterGlow size={size} bleed={bleed} part="under" id={`${clipId}m`} /> : <Glow size={size} bleed={bleed} />) : null}
      {/* main app: the sparks rise behind the star, so only the outside shines (user, 2026-11-23) */}
      {glow && DESIGN_TRIAL && STAR ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size }}>
          <Fire size={size * 0.16} count={7} rise={size * 1.1} />
        </View>
      ) : null}
      <Svg width={size + 2 * bleed} height={size + 2 * bleed} pointerEvents="none" style={{ position: "absolute", left: -bleed, top: -bleed }}>
        <G x={bleed} y={bleed}>{body}</G>
      </Svg>
      {glow && DESIGN_TRIAL && STAR ? <OuterGlow size={size} bleed={bleed} part="edge" id={`${clipId}e`} /> : null}
      {glow && !(DESIGN_TRIAL && STAR) ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size }}>
          <Fire size={size * 0.16} count={7} rise={size * 1.1} />
        </View>
      ) : null}
      {count !== null && (
        <AppText variant="date" raw={countColor} style={{ fontFamily: fontFamily(600), fontSize: size * (STAR ? 0.46 : 0.52), lineHeight: size }}>
          {count}
        </AppText>
      )}
    </View>
  );

  if (!onPress) return shape;
  const checked = state.kind === "todoDone" || state.kind === "done";
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      aria-checked={checked}
      accessibilityLabel={label}
      accessibilityHint={onLongPress ? "길게 누르면 중요한 날 표시를 켜고 꺼요" : undefined}
      // no press effect at all: the original just flips (user's check, 2026-11-07)
    >
      {shape}
    </Pressable>
  );
}
