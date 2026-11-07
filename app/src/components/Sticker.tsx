import { memo } from "react";
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { tokens } from "../theme";

/**
 * 클로버 친구들: our own sticker pack (drawn here in code; nothing from the original app). A round four-leaf clover
 * with a face, plus one prop per sticker. Used for reactions on friends' to-dos and in 대화.
 * A sticker is stored as its id ("clover.best"); an unknown id still draws the plain clover.
 */
const K = tokens.sticker;
type Eyes = "dot" | "happy" | "closed" | "heart" | "star" | "xd" | "big" | "wink";
type Mouth = "smile" | "grin" | "open" | "o" | "flat" | "frown" | "side" | "cat";
type Def = { label: string; eyes: Eyes; mouth: Mouth; cheeks?: boolean; prop?: (props: object) => React.ReactNode };

const heartPath = (x: number, y: number, s: number) =>
  `M${x} ${y + s * 0.3} C${x} ${y - s * 0.2} ${x - s} ${y - s * 0.2} ${x - s} ${y + s * 0.25} C${x - s} ${y + s * 0.6} ${x} ${y + s * 0.85} ${x} ${y + s} ` +
  `C${x} ${y + s * 0.85} ${x + s} ${y + s * 0.6} ${x + s} ${y + s * 0.25} C${x + s} ${y - s * 0.2} ${x} ${y - s * 0.2} ${x} ${y + s * 0.3}Z`;
const star = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} Q${cx + r * 0.15} ${cy - r * 0.15} ${cx + r} ${cy} Q${cx + r * 0.15} ${cy + r * 0.15} ${cx} ${cy + r} ` +
  `Q${cx - r * 0.15} ${cy + r * 0.15} ${cx - r} ${cy} Q${cx - r * 0.15} ${cy - r * 0.15} ${cx} ${cy - r}Z`;

export const STICKERS: Record<string, Def> = {
  "clover.love": { label: "좋아해", eyes: "heart", mouth: "grin", cheeks: true,
    prop: () => <><Path d={heartPath(84, 10, 9)} fill={K.heart} /><Path d={heartPath(16, 18, 6)} fill={K.heart} /></> },
  "clover.best": { label: "최고", eyes: "happy", mouth: "grin", cheeks: true,
    prop: () => <Polygon points="30,24 35,3 50,15 65,3 70,24" fill={K.gold} stroke={K.goldDark} strokeWidth={2.5} strokeLinejoin="round" /> },
  "clover.cheer": { label: "화이팅", eyes: "big", mouth: "open",
    prop: () => <><Rect x={18} y={26} width={64} height={9} rx={4} fill={K.band} /><Path d="M80 30 L95 22 M80 32 L94 40" stroke={K.band} strokeWidth={5} strokeLinecap="round" /></> },
  "clover.party": { label: "축하해", eyes: "happy", mouth: "open", cheeks: true,
    prop: () => <><Polygon points="50,0 38,26 62,26" fill={K.purple} /><Circle cx={50} cy={1} r={4} fill={K.gold} />
      <Rect x={10} y={14} width={6} height={6} fill={K.gold} transform="rotate(20 13 17)" /><Rect x={84} y={20} width={6} height={6} fill={K.heart} transform="rotate(-20 87 23)" />
      <Circle cx={88} cy={52} r={3} fill={K.tear} /><Circle cx={10} cy={46} r={3} fill={K.heart} /></> },
  "clover.fire": { label: "불타오르네", eyes: "big", mouth: "grin",
    prop: () => <><Path d="M84 46 C70 38 76 22 82 12 C84 22 96 26 94 40 C93 46 89 48 84 46Z" fill={K.fire} /><Path d="M85 44 C80 40 82 32 85 27 C87 33 92 36 90 41 C89 44 87 45 85 44Z" fill={K.fireCore} /></> },
  "clover.sparkle": { label: "반짝반짝", eyes: "star", mouth: "smile",
    prop: () => <><Path d={sparkle(86, 16, 9)} fill={K.gold} /><Path d={sparkle(14, 24, 6)} fill={K.gold} /><Path d={sparkle(90, 80, 5)} fill={K.gold} /></> },
  "clover.lol": { label: "웃겨", eyes: "xd", mouth: "open",
    prop: () => <><Path d="M28 46 C24 52 24 56 28 58 C32 56 32 52 28 46Z" fill={K.tear} /><Path d="M72 46 C68 52 68 56 72 58 C76 56 76 52 72 46Z" fill={K.tear} /></> },
  "clover.cry": { label: "슬퍼", eyes: "closed", mouth: "frown",
    prop: () => <Path d="M40 52 C36 60 35 66 40 68 C45 66 44 60 40 52Z" fill={K.tear} /> },
  "clover.wow": { label: "놀랐어", eyes: "big", mouth: "o",
    prop: () => <><Path d="M87 6 L85 24" stroke={K.purple} strokeWidth={6} strokeLinecap="round" /><Circle cx={84.5} cy={33} r={3.5} fill={K.purple} /></> },
  "clover.sweat": { label: "머쓱", eyes: "dot", mouth: "flat",
    prop: () => <Path d="M78 18 C72 28 72 34 78 36 C84 34 84 28 78 18Z" fill={K.tear} /> },
  "clover.sleep": { label: "졸려", eyes: "closed", mouth: "o",
    prop: () => <><SvgText x={74} y={22} fontSize={18} fontWeight="bold" fill={K.purple}>Z</SvgText><SvgText x={86} y={10} fontSize={12} fontWeight="bold" fill={K.purple}>z</SvgText></> },
  "clover.hundred": { label: "100점", eyes: "happy", mouth: "grin", cheeks: true,
    prop: () => <G transform="rotate(-12 80 16)"><SvgText x={60} y={22} fontSize={20} fontWeight="bold" fill={K.heart}>100</SvgText><Path d="M60 26 L98 26 M62 30 L96 30" stroke={K.heart} strokeWidth={2.5} /></G> },
  "clover.done": { label: "다 했다", eyes: "happy", mouth: "smile", cheeks: true,
    prop: () => <><Circle cx={82} cy={18} r={13} fill={K.leafDark} /><Path d="M75 18 L80 23 L89 13" stroke={K.white} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></> },
  "clover.thanks": { label: "고마워", eyes: "happy", mouth: "cat", cheeks: true,
    prop: () => <Path d={heartPath(50, 2, 8)} fill={K.heart} /> },
  "clover.coffee": { label: "커피 한잔", eyes: "wink", mouth: "smile",
    prop: () => <><Rect x={72} y={64} width={20} height={22} rx={4} fill={K.cream} stroke={K.brown} strokeWidth={2.5} />
      <Path d="M92 70 C99 70 99 80 92 80" stroke={K.brown} strokeWidth={2.5} fill="none" /><Path d="M78 58 C76 54 80 52 78 48 M86 58 C84 54 88 52 86 48" stroke={K.gray} strokeWidth={2} fill="none" strokeLinecap="round" /></> },
  "clover.study": { label: "공부 중", eyes: "dot", mouth: "side",
    prop: () => <><Path d="M58 74 L78 70 L98 74 L98 94 L78 90 L58 94Z" fill={K.white} stroke={K.purple} strokeWidth={2.5} strokeLinejoin="round" /><Path d="M78 70 L78 90" stroke={K.purple} strokeWidth={2} /></> },
  "clover.workout": { label: "운동 중", eyes: "big", mouth: "grin",
    prop: () => <><Rect x={64} y={80} width={30} height={4} rx={2} fill={K.gray} /><Rect x={60} y={72} width={7} height={20} rx={2} fill={K.purple} /><Rect x={91} y={72} width={7} height={20} rx={2} fill={K.purple} /></> },
  "clover.hmm": { label: "궁금해", eyes: "dot", mouth: "side",
    prop: () => <SvgText x={76} y={28} fontSize={28} fontWeight="bold" fill={K.purple}>?</SvgText> },
};
export const STICKER_IDS = Object.keys(STICKERS);
export const isSticker = (v: string) => v.startsWith("clover.");
export const stickerLabel = (id: string) => STICKERS[id]?.label ?? "스티커";

function EyesShape({ kind }: { kind: Eyes }) {
  const L = 41, R = 59, y = 48;
  const line = { stroke: K.ink, strokeWidth: 3.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "happy": return <><Path d={`M${L - 5} ${y + 2} Q${L} ${y - 5} ${L + 5} ${y + 2}`} {...line} /><Path d={`M${R - 5} ${y + 2} Q${R} ${y - 5} ${R + 5} ${y + 2}`} {...line} /></>;
    case "closed": return <><Path d={`M${L - 5} ${y} Q${L} ${y + 5} ${L + 5} ${y}`} {...line} /><Path d={`M${R - 5} ${y} Q${R} ${y + 5} ${R + 5} ${y}`} {...line} /></>;
    case "heart": return <><Path d={heartPath(L, y - 5, 5.5)} fill={K.heart} /><Path d={heartPath(R, y - 5, 5.5)} fill={K.heart} /></>;
    case "star": return <><Polygon points={star(L, y, 6)} fill={K.gold} /><Polygon points={star(R, y, 6)} fill={K.gold} /></>;
    case "xd": return <><Path d={`M${L - 4} ${y - 5} L${L + 4} ${y} L${L - 4} ${y + 5}`} {...line} /><Path d={`M${R + 4} ${y - 5} L${R - 4} ${y} L${R + 4} ${y + 5}`} {...line} /></>;
    case "big": return <><Circle cx={L} cy={y} r={5.5} fill={K.ink} /><Circle cx={R} cy={y} r={5.5} fill={K.ink} /><Circle cx={L + 2} cy={y - 2} r={1.8} fill={K.white} /><Circle cx={R + 2} cy={y - 2} r={1.8} fill={K.white} /></>;
    case "wink": return <><Circle cx={L} cy={y} r={4} fill={K.ink} /><Path d={`M${R - 5} ${y + 1} Q${R} ${y - 4} ${R + 5} ${y + 1}`} {...line} /></>;
    default: return <><Circle cx={L} cy={y} r={4} fill={K.ink} /><Circle cx={R} cy={y} r={4} fill={K.ink} /></>;
  }
}

function MouthShape({ kind }: { kind: Mouth }) {
  const line = { stroke: K.ink, strokeWidth: 3.5, fill: "none", strokeLinecap: "round" as const };
  switch (kind) {
    case "grin": return <Path d="M41 56 Q50 70 59 56 Z" fill={K.ink} stroke={K.ink} strokeWidth={2} strokeLinejoin="round" />;
    case "open": return <><Path d="M42 56 Q50 72 58 56 Z" fill={K.ink} stroke={K.ink} strokeWidth={2} strokeLinejoin="round" /><Ellipse cx={50} cy={63} rx={4} ry={2.5} fill={K.cheek} /></>;
    case "o": return <Ellipse cx={50} cy={60} rx={4} ry={5} fill={K.ink} />;
    case "flat": return <Path d="M45 60 L55 60" {...line} />;
    case "frown": return <Path d="M44 63 Q50 56 56 63" {...line} />;
    case "side": return <Path d="M46 60 Q52 62 56 57" {...line} />;
    case "cat": return <Path d="M43 57 Q46.5 62 50 57 Q53.5 62 57 57" {...line} />;
    default: return <Path d="M44 57 Q50 64 56 57" {...line} />;
  }
}

const LOBES: [number, number][] = [[36, 36], [64, 36], [36, 64], [64, 64]];

export const Sticker = memo(function Sticker({ id, size = 64 }: { id: string; size?: number }) {
  const d = STICKERS[id] ?? { label: "스티커", eyes: "dot" as const, mouth: "smile" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`${d.label} 스티커`}>
      <Path d="M60 80 Q66 90 72 96" stroke={K.leafDark} strokeWidth={6} strokeLinecap="round" fill="none" />
      {LOBES.map(([x, y], i) => <Circle key={`o${i}`} cx={x} cy={y} r={22} fill={K.leafDark} />)}
      <Circle cx={50} cy={50} r={24} fill={K.leafDark} />
      {LOBES.map(([x, y], i) => <Circle key={`f${i}`} cx={x} cy={y} r={19.5} fill={K.leaf} />)}
      <Circle cx={50} cy={50} r={21.5} fill={K.leaf} />
      {d.cheeks ? <><Ellipse cx={33} cy={56} rx={5} ry={3} fill={K.cheek} opacity={0.85} /><Ellipse cx={67} cy={56} rx={5} ry={3} fill={K.cheek} opacity={0.85} /></> : null}
      <EyesShape kind={d.eyes} />
      <MouthShape kind={d.mouth} />
      {d.prop?.({})}
    </Svg>
  );
});
