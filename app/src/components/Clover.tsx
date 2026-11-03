import { useId } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { fontFamily, onColor, tokens, useTheme, visibleOn } from "../theme";
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

/** Four overlapping circles: our own four-leaf shape (drawn fresh, not taken from the original). */
function Lobes({ size, fill }: { size: number; fill: string }) {
  const r = size * 0.32;
  const m = size / 2;
  const d = size * 0.18;
  return (
    <G fill={fill}>
      <Circle cx={m - d} cy={m} r={r} />
      <Circle cx={m + d} cy={m} r={r} />
      <Circle cx={m} cy={m - d} r={r} />
      <Circle cx={m} cy={m + d} r={r} />
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
  const { c, scheme } = useTheme();
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
      const n = Math.max(1, state.colors.length);
      const band = size / n;
      body = (
        <>
          <Defs>
            {state.colors.map((_, i) => (
              <ClipPath key={i} id={`${clipId}b${i}`}>
                <Rect x={0} y={i * band} width={size} height={i === n - 1 ? size - i * band : band} />
              </ClipPath>
            ))}
          </Defs>
          {state.colors.map((col, i) => (
            <G key={i} clipPath={`url(#${clipId}b${i})`}>
              <Lobes size={size} fill={fill(col)} />
            </G>
          ))}
          {state.left === 0 ? <Tick size={size} color={onColor(fill(state.colors[0]))} /> : null}
        </>
      );
      if (state.left > 0) {
        count = state.left;
        countColor = onColor(fill(state.colors[0]));
      }
      break;
    }
    case "fill":
      body = <Lobes size={size} fill={fill(state.color)} />;
      break;
    case "todoOpen":
      body = <Lobes size={size} fill={scheme === "dark" ? c.text : empty} />;
      break;
    case "done":
    case "todoDone":
      body = (
        <>
          <Lobes size={size} fill={fill(state.color)} />
          <Tick size={size} color={onColor(fill(state.color))} />
        </>
      );
      break;
    case "doneCount":
      body = <Lobes size={size} fill={fill(state.color)} />;
      count = state.count;
      countColor = onColor(fill(state.color));
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
          <Tick size={size} color={onColor(fill(state.color))} />
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
        <AppText variant="date" raw={countColor} style={{ fontFamily: fontFamily(600), fontSize: size * 0.62, lineHeight: size }}>
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
      accessibilityLabel={label}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}
    >
      {shape}
    </Pressable>
  );
}
