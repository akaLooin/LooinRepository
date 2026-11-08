import { useId } from "react";
import { Pressable, View } from "react-native";
import { usePrefs } from "../data/prefs";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
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

function Lobes({ size, fill }: { size: number; fill: string }) {
  return (
    <G fill={fill}>
      {LOBE_AT.map(([x, y], i) => <Circle key={i} cx={x * size} cy={y * size} r={LOBE_R * size} />)}
    </G>
  );
}

/** Several categories: each circle takes a category colour in order (top pair first), and the overlaps show through. */
export const lobeColors = (colors: string[]) => LOBE_AT.map((_, i) => colors[Math.floor((i * colors.length) / 4)]);
function SplitLobes({ size, colors }: { size: number; colors: string[] }) {
  if (new Set(colors).size <= 1) return <Lobes size={size} fill={colors[0]} />;
  return (
    <G>
      {lobeColors(colors).map((col, i) => (
        <Circle key={i} cx={LOBE_AT[i][0] * size} cy={LOBE_AT[i][1] * size} r={LOBE_R * size} fill={col} opacity={0.85} />
      ))}
    </G>
  );
}

function Tick({ size, color }: { size: number; color: string }) {
  const s = size / 24;
  return (
    <Path
      d={`M${7 * s} ${12.5 * s} L${10.5 * s} ${16 * s} L${17 * s} ${8.5 * s}`}
      stroke={color}
      strokeWidth={2.6 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

export function Clover({
  state,
  size = tokens.size.cloverCalendar,
  onPress,
  label,
}: {
  state: CloverState;
  size?: number;
  onPress?: () => void;
  label?: string;
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
          <SplitLobes size={size} colors={cols} />
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
      body = <Lobes size={size} fill={empty} />; // grey until done, as in the original
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
              <Rect x={0} y={0} width={size} height={h} />
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
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {body}
      </Svg>
      {count !== null && (
        <AppText variant="date" raw={countColor} style={{ fontFamily: fontFamily(600), fontSize: size * 0.52, lineHeight: size }}>
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
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      aria-checked={checked}
      accessibilityLabel={label}
      // no press effect at all: the original just flips (user's check, 2026-11-07)
    >
      {shape}
    </Pressable>
  );
}
