// 기본 캐릭터: 얼굴과 옷이 없는 흰 마네킹(구체관절 인형 느낌).
// 뼈대 포즈를 키프레임으로 정하고, 동작마다 여러 장의 프레임으로 "구워서" 쓴다.
// 프레임마다 몸(뒤쪽) 층과 앞팔 층을 나눠 굽고, 손·머리 위치(붙임 지점)를 함께 기록한다.
// 장비(무기·모자 등)는 붙임 지점에 붙이고, 피부색은 흰 기본색에 연한 색을 섞어 바꾼다.

/** 프레임 크기(그림 픽셀, 화면에는 ART 배율) 와 발 기준점 */
export const FW = 44, FH = 48, ROOT_X = 22, ROOT_Y = 43;
/** 화면 배율: 마네킹은 1배 해상도(그림 1픽셀 = 월드 1칸)로 굵직한 2D 픽셀 느낌 */
export const MQ_SCALE = 1;

/** 각도: 0 = 아래로 곧게, +는 앞으로(바라보는 쪽) 돌아간다. 팔꿈치·무릎은 앞 마디에 더하는 값 */
export interface Pose {
  bx: number; by: number; // 골반 이동(px)
  lean: number; // 몸통 기울기(+ 앞으로)
  head: number; // 머리 추가 기울기
  armF: [number, number]; armB: [number, number]; // [어깨, 팔꿈치]
  legF: [number, number]; legB: [number, number]; // [엉덩이, 무릎(-는 뒤로 굽힘)]
  wpn: number; // 무기 각도(화면 기준, 0 = 날이 위, + 앞으로)
}
type Key = Partial<Pose> & { t: number; ease?: 'in' | 'out' | 'inout' | 'lin' };
interface ClipDef { frames: number; loop: boolean; keys: Key[] }

const BASE: Pose = { bx: 0, by: 0, lean: 0, head: 0, armF: [0, 0], armB: [0, 0], legF: [0, 0], legB: [0, 0], wpn: 0.55 };

// ───────── 동작 ─────────
// 원작의 "통통 튀는 작은 몸" 느낌은 살리되, 자세·타이밍은 새로 설계했다(구체관절 인형의 또렷한 관절 동작).
export const CLIPS: Record<string, ClipDef> = {
  idle: { frames: 12, loop: true, keys: [
    { t: 0, by: 0, armF: [0, 0], armB: [0, 0], head: 0, ease: 'inout' },
    { t: 0.5, by: 1.7, armF: [0.04, 0.06], armB: [-0.04, -0.06], head: 0, ease: 'inout' },
    { t: 1, by: 0, armF: [0, 0], armB: [0, 0], head: 0 },
  ] },
  // 걷기: 몸은 거의 정면을 본 채 다리만 앞뒤로 딛고, 팔은 몸 옆에서 작게 흔든다
  walk: { frames: 12, loop: true, keys: [
    { t: 0, legF: [0.42, -0.08], legB: [-0.38, -0.22], armF: [-0.15, 0.05], armB: [0.15, 0.05], by: 0.5, lean: 0.04, ease: 'out' },
    { t: 0.25, legF: [0.02, -0.05], legB: [0.12, -0.9], armF: [0, 0], armB: [0, 0], by: -1.7, lean: 0.05, ease: 'in' },
    { t: 0.5, legF: [-0.38, -0.22], legB: [0.42, -0.08], armF: [0.15, 0.05], armB: [-0.15, -0.05], by: 0.5, lean: 0.04, ease: 'out' },
    { t: 0.75, legF: [0.12, -0.9], legB: [0.02, -0.05], armF: [0, 0], armB: [0, 0], by: -1.7, lean: 0.05, ease: 'in' },
    { t: 1, legF: [0.42, -0.08], legB: [-0.38, -0.22], armF: [-0.15, 0.05], armB: [0.15, 0.05], by: 0.5, lean: 0.04 },
  ] },
  jump: { frames: 3, loop: false, keys: [
    { t: 0, legF: [0.5, -1.0], legB: [0.1, -0.8], armF: [0.45, 0.3], armB: [-0.45, -0.3], lean: -0.03, by: -1, head: -0.05, wpn: 0.4, ease: 'out' },
    { t: 1, legF: [0.4, -0.9], legB: [0.0, -0.6], armF: [0.5, 0.3], armB: [-0.5, -0.3], lean: -0.02, by: -1, head: -0.06, wpn: 0.4 },
  ] },
  fall: { frames: 3, loop: false, keys: [
    { t: 0, legF: [0.25, -0.3], legB: [-0.15, -0.4], armF: [0.6, 0.2], armB: [-0.6, -0.2], lean: 0.02, by: -1, head: 0.03, wpn: 0.6, ease: 'inout' },
    { t: 1, legF: [0.2, -0.2], legB: [-0.2, -0.3], armF: [0.65, 0.2], armB: [-0.65, -0.2], lean: 0.02, by: -1, head: 0.04, wpn: 0.7 },
  ] },
  // 휘두르기: 무게를 뒤로 실었다가(와인드업) 앞발을 디디며 내려친 뒤 천천히 돌아온다
  swing: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.3, 0.5], wpn: 0.6, ease: 'out' },
    { t: 0.3, armF: [2.85, 0.35], armB: [0, 0], wpn: -0.7, lean: -0.14, head: -0.1, legF: [0.2, -0.1], legB: [-0.2, -0.1], by: -0.5, ease: 'in' },
    { t: 0.55, armF: [0.95, 0.05], armB: [0, 0], wpn: 2.15, lean: 0.2, head: 0.1, legF: [0.45, -0.25], legB: [-0.45, -0.15], by: 1, ease: 'out' },
    { t: 1, armF: [0.45, 0.4], armB: [0, 0], wpn: 1.1, lean: 0.06, head: 0.02, legF: [0.25, -0.15], legB: [-0.25, -0.1], by: 0.3 },
  ] },
  // 활: 앞팔을 뻗어 활을 세우고 뒷손으로 시위를 당겼다가 놓는다
  shoot: { frames: 8, loop: false, keys: [
    { t: 0, armF: [0.9, 0.2], armB: [0, 0], wpn: 0.3, ease: 'out' },
    { t: 0.35, armF: [1.58, 0.0], armB: [0, 0], wpn: 0, lean: -0.04, legF: [0.3, -0.1], legB: [-0.3, -0.1], ease: 'lin' },
    { t: 0.5, armF: [1.58, 0.0], armB: [0, 0], wpn: 0, lean: -0.06, legF: [0.3, -0.1], legB: [-0.3, -0.1], ease: 'out' },
    { t: 0.6, armF: [1.55, 0.05], armB: [0, 0], wpn: 0, lean: -0.02, legF: [0.3, -0.1], legB: [-0.3, -0.1], ease: 'inout' },
    { t: 1, armF: [0.8, 0.3], armB: [0, 0], wpn: 0.2, legF: [0.15, -0.08], legB: [-0.15, -0.06] },
  ] },
  // 지팡이: 머리 위로 들어 기를 모았다가 앞으로 찌르듯 뻗는다
  cast: { frames: 8, loop: false, keys: [
    { t: 0, armF: [0.5, 0.4], wpn: 0.5, ease: 'out' },
    { t: 0.4, armF: [2.6, 0.1], armB: [0, 0], wpn: 0.1, lean: -0.1, head: -0.1, by: -1, ease: 'in' },
    { t: 0.6, armF: [1.5, -0.05], armB: [0, 0], wpn: 1.45, lean: 0.12, head: 0.05, legF: [0.35, -0.2], legB: [-0.35, -0.1], ease: 'out' },
    { t: 1, armF: [0.7, 0.3], armB: [0, 0], wpn: 0.8, lean: 0.04 },
  ] },
  // 곡괭이: 머리 위에서 아래로 크게 찍는다
  mine: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.4, 0.5], wpn: 0.6, ease: 'out' },
    { t: 0.32, armF: [3.0, 0.25], armB: [0, 0], wpn: -1.1, lean: -0.16, head: -0.12, by: -0.5, ease: 'in' },
    { t: 0.55, armF: [0.85, 0.3], armB: [0, 0], wpn: 1.95, lean: 0.28, head: 0.12, legF: [0.4, -0.35], legB: [-0.4, -0.2], by: 1.5, ease: 'out' },
    { t: 1, armF: [0.55, 0.45], armB: [0, 0], wpn: 1.2, lean: 0.1, legF: [0.2, -0.15], legB: [-0.2, -0.1], by: 0.5 },
  ] },
  // 도끼: 옆으로 크게 돌려 벤다
  chop: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.4, 0.5], wpn: 0.6, ease: 'out' },
    { t: 0.32, armF: [2.0, 0.6], armB: [0, 0], wpn: -1.2, lean: -0.18, head: -0.06, legF: [0.15, -0.1], legB: [-0.3, -0.2], ease: 'in' },
    { t: 0.55, armF: [1.45, 0.0], armB: [0, 0], wpn: 1.7, lean: 0.16, head: 0.06, legF: [0.4, -0.25], legB: [-0.4, -0.15], by: 1, ease: 'out' },
    { t: 1, armF: [0.6, 0.4], armB: [0, 0], wpn: 1.0, lean: 0.05, by: 0.3 },
  ] },
  climb: { frames: 8, loop: true, keys: [
    { t: 0, armF: [2.6, 0.2], armB: [-2.1, -0.5], legF: [0.55, -1.1], legB: [0.1, -0.3], by: -0.5, wpn: 0.4, ease: 'inout' },
    { t: 0.5, armF: [2.1, 0.5], armB: [-2.6, -0.2], legF: [0.1, -0.3], legB: [0.55, -1.1], by: 0.5, wpn: 0.4, ease: 'inout' },
    { t: 1, armF: [2.6, 0.2], armB: [-2.1, -0.5], legF: [0.55, -1.1], legB: [0.1, -0.3], by: -0.5, wpn: 0.4 },
  ] },
  hurt: { frames: 3, loop: false, keys: [
    { t: 0, lean: -0.22, head: -0.2, armF: [0.6, 0.3], armB: [-0.6, -0.3], legF: [0.35, -0.3], legB: [-0.2, -0.2], by: 0.5, wpn: -0.2, ease: 'out' },
    { t: 1, lean: -0.1, head: -0.08, armF: [0.15, 0.05], armB: [-0.15, -0.05], legF: [0.2, -0.2], legB: [-0.15, -0.1], wpn: 0.2 },
  ] },
  dead: { frames: 1, loop: false, keys: [
    { t: 0, lean: 0, head: 0.2, armF: [0.3, 0.2], armB: [-0.3, -0.2], legF: [0.2, -0.1], legB: [-0.2, -0.1], wpn: 1.4 },
  ] },
};

const ease = (e: Key['ease'], x: number) =>
  e === 'in' ? x * x : e === 'out' ? 1 - (1 - x) ** 2 : e === 'lin' ? x : x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 키프레임 보간(빠진 값은 바로 앞 키의 값, 첫 키는 BASE) */
export function samplePose(clip: ClipDef, t: number): Pose {
  // 각 키의 완성 포즈
  const full: Pose[] = [];
  let prev = BASE;
  for (const k of clip.keys) { prev = { ...prev, ...k } as Pose; full.push(prev); }
  if (clip.keys.length === 1) return full[0];
  let i = 0;
  while (i < clip.keys.length - 2 && t > clip.keys[i + 1].t) i++;
  const a = clip.keys[i], b = clip.keys[i + 1];
  const u = ease(a.ease, Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t))));
  const A = full[i], B = full[i + 1];
  const pair = (x: [number, number], y: [number, number]): [number, number] => [lerp(x[0], y[0], u), lerp(x[1], y[1], u)];
  return {
    bx: lerp(A.bx, B.bx, u), by: lerp(A.by, B.by, u), lean: lerp(A.lean, B.lean, u), head: lerp(A.head, B.head, u),
    armF: pair(A.armF, B.armF), armB: pair(A.armB, B.armB), legF: pair(A.legF, B.legF), legB: pair(A.legB, B.legB), wpn: lerp(A.wpn, B.wpn, u),
  };
}

// ───────── 기본 몸(손으로 찍은 픽셀) ─────────
// 사용자가 준 치비 픽셀 뼈대를 흰 피부·얼굴 없음·날씬한 비율로 다시 찍은 그림.
// 머리와 몸통은 이 픽셀을 그대로 쓰고, 팔다리는 같은 굵기(속 2칸)·색·테두리 규칙으로 관절을 따라 매 프레임 그린다.
// 글자: 3 짙은 선, 4 밝은 선, 5 그늘, 6 기본, 7 밝은 면
const HEAD_PX = [
  '...3333...',
  '.33776633.',
  '.37766663.',
  '3776666663',
  '3666666653',
  '3666666553',
  '3666665553',
  '.36665553.',
  '.33555533.',
  '...3333...',
];
const TORSO_PX = [
  '33777733',
  '37777763',
  '37777763',
  '37777763',
  '37777763',
  '37777763',
  '37777763',
  '37777763',
  '37777763',
  '37777653',
  '37747653',
];
// 그림 칸(열 c, 줄 r) ↔ 발 기준 좌표: x = c - 9.5, y = r - 25.5 (전체 그림 21×27칸, 몸 중심 9.5열, 발밑 26줄)
const HEAD_AT: V = [5, 0], TORSO_AT: V = [6, 10];
const SHOULDER_Y = -14.6, SHOULDER_X = 3.0, HIP_Y = -5.3, HIP_X = 2.0;
const UPPER_ARM = 2.9, FORE_ARM = 2.2, THIGH = 2.5, SHIN = 2.3;
const CH_TONE: Record<string, number> = { '7': 0, '6': 1, '5': 2, '4': 4, '3': 5 };

type V = [number, number];
const dir = (a: number): V => [Math.sin(a), Math.cos(a)]; // 0 = 아래
const add = (p: V, d: V, k: number): V => [p[0] + d[0] * k, p[1] + d[1] * k];

/** 붙임 지점(발 기준점으로부터 px, 화면 아래가 +y) */
export interface Anchors { hand: V; handB: V; wpn: number; head: V; headRot: number; chest: V; lean: number }

type Cap = { a: V; b: V; r: number };
type Limb = { g: Group; caps: Cap[]; hand?: { c: V; r: number } };
type Group = 'armB' | 'legB' | 'legF' | 'torso' | 'head' | 'armF';
const ORDER: Group[] = ['armB', 'legB', 'legF', 'torso', 'head', 'armF'];

function inCap(c: Cap, x: number, y: number) {
  const bx = c.b[0] - c.a[0], by = c.b[1] - c.a[1], L2 = bx * bx + by * by || 1e-6;
  const t = Math.max(0, Math.min(1, ((x - c.a[0]) * bx + (y - c.a[1]) * by) / L2));
  const dx = x - c.a[0] - bx * t, dy = y - c.a[1] - by * t;
  return dx * dx + dy * dy <= c.r * c.r;
}

/** 포즈 → 팔다리 도형, 머리·몸통 위치, 붙임 지점 */
function layout(p: Pose) {
  const lift = Math.round(p.by * 0.6); // 숨쉬기·튐: 윗몸만 위아래로
  const sway = Math.round(p.lean * 3); // 곧게 선 자세: 기울기는 1칸 정도 옮기는 것으로만
  const headDx = sway + Math.round(p.head * 2);
  const limb = (g: Group, root: V, a0: number, a1: number, l0: number, l1: number, r: number, hand: boolean): Limb => {
    const j = add(root, dir(a0), l0), e = add(j, dir(a0 + a1), l1);
    return { g, caps: [{ a: root, b: j, r }, { a: j, b: e, r }], hand: hand ? { c: add(e, dir(a0 + a1), 0.5), r: 1.75 } : undefined };
  };
  const sy = SHOULDER_Y + lift;
  const armB = limb('armB', [-SHOULDER_X + sway, sy], -0.38 + p.armB[0] - BASE.armB[0], p.armB[1] - BASE.armB[1], UPPER_ARM, FORE_ARM, 1.02, true);
  const armF = limb('armF', [SHOULDER_X + sway, sy], 0.38 + p.armF[0] - BASE.armF[0], p.armF[1] - BASE.armF[1], UPPER_ARM, FORE_ARM, 1.02, true);
  const legB = limb('legB', [-HIP_X, HIP_Y], p.legB[0], p.legB[1], THIGH, SHIN, 1.02, false);
  const legF = limb('legF', [HIP_X, HIP_Y], p.legF[0], p.legF[1], THIGH, SHIN, 1.02, false);
  const head: V = [HEAD_AT[0] + headDx, HEAD_AT[1] + lift], torso: V = [TORSO_AT[0] + sway, TORSO_AT[1] + lift];
  const hand = armF.hand!.c, handB = armB.hand!.c;
  const headC: V = [head[0] + 5 - 9.5, head[1] + 5 - 25.5];
  return { armB, armF, legB, legF, head, torso, anchors: { hand, handB, wpn: p.wpn, head: headC, headRot: 0, chest: [sway, -11 + lift] as V, lean: p.lean } };
}

// ───────── 색 ─────────
const toRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mixC = (a: string, b: string, t: number) => {
  const A = toRgb(a), B = toRgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
/** 흰 기본 피부 */
export const MANNEQUIN_WHITE = '#f4f2ee';

/** 톤: 0 밝은 면, 1 기본, 2 그늘, 3 짙은 그늘(뒤쪽 팔다리), 4 밝은 선, 5 짙은 선 */
export function tones(skin: string): string[] {
  return [mixC(skin, '#ffffff', 0.75), mixC(skin, '#dcd9e2', 0.35), mixC(skin, '#b9b4c6', 0.5), mixC(skin, '#9e98b0', 0.55), mixC(skin, '#8e8296', 0.6), mixC(skin, '#6a5e6c', 0.85)];
}

/** 한 포즈를 두 층(몸, 앞팔)으로 굽는다. 결과는 톤 번호 배열(-1 = 빈 칸) */
function bake(p: Pose): { body: Int8Array; front: Int8Array; anchors: Anchors } {
  const L = layout(p);
  const N = FW * FH, tone = new Int8Array(N).fill(-1), grp = new Int8Array(N).fill(-1);
  const put = (x: number, y: number, t: number, gi: number) => {
    if (x < 0 || y < 0 || x >= FW || y >= FH) return;
    tone[y * FW + x] = t; grp[y * FW + x] = gi;
  };
  const toPx = (c: number, r: number): V => [c + ROOT_X - 10, r + ROOT_Y - 26]; // 그림 칸 → 프레임 칸
  const grid = (rows: string[], at: V, gi: number) => rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    const [x, y] = toPx(at[0] + c, at[1] + r); put(x, y, CH_TONE[ch], gi);
  }));
  // 팔다리: 속은 2칸 굵기, 바라보는 반대쪽(왼쪽) 가장자리는 밝게, 오른쪽은 그늘, 둘레는 짙은 선
  const drawLimb = (lb: Limb) => {
    const gi = ORDER.indexOf(lb.g), back = lb.g === 'armB' || lb.g === 'legB', arm = lb.g.startsWith('arm');
    const inside = (x: number, y: number) => {
      const cx = x + 0.5 - ROOT_X, cy = y + 0.5 - ROOT_Y;
      if (lb.caps.some((c) => inCap(c, cx, cy))) return true;
      return !!lb.hand && (cx - lb.hand.c[0]) ** 2 + (cy - lb.hand.c[1]) ** 2 <= lb.hand.r ** 2;
    };
    const m = new Uint8Array(N);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (inside(x, y)) m[y * FW + x] = 1;
    const at = (x: number, y: number) => x >= 0 && y >= 0 && x < FW && y < FH && m[y * FW + x] === 1;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (at(x, y)) {
        // 다리는 시안처럼 그늘색(허벅지 위쪽만 조금 밝게)
        let t = arm ? (!at(x + 1, y) ? 2 : !at(x - 1, y) ? 0 : 1) : (y + 0.5 - ROOT_Y < HIP_Y + 1.5 && !at(x - 1, y) ? 1 : 2);
        if (back) t = Math.min(3, t + 1);
        put(x, y, t, gi);
      } else if (at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1)) put(x, y, 5, gi);
    }
  };
  drawLimb(L.armB); drawLimb(L.legB); drawLimb(L.legF);
  grid(TORSO_PX, L.torso, ORDER.indexOf('torso'));
  grid(HEAD_PX, L.head, ORDER.indexOf('head'));
  drawLimb(L.armF);
  const body = new Int8Array(N).fill(-1), front = new Int8Array(N).fill(-1), FRONT = ORDER.indexOf('armF');
  for (let i = 0; i < N; i++) if (tone[i] >= 0) (grp[i] === FRONT ? front : body)[i] = tone[i];
  return { body, front, anchors: L.anchors };
}

export interface BakedClip { frames: number; loop: boolean; anchors: Anchors[]; body: Int8Array[]; front: Int8Array[] }
const cache = new Map<string, BakedClip>();
/** 동작을 프레임으로 굽는다(톤 번호. 색은 그릴 때 입힌다 → 피부색이 달라도 다시 굽지 않음) */
export function bakeClip(name: string): BakedClip {
  let c = cache.get(name);
  if (c) return c;
  const def = CLIPS[name];
  c = { frames: def.frames, loop: def.loop, anchors: [], body: [], front: [] };
  for (let f = 0; f < def.frames; f++) {
    const t = def.loop ? f / def.frames : def.frames === 1 ? 0 : f / (def.frames - 1);
    const b = bake(samplePose(def, t));
    c.body.push(b.body); c.front.push(b.front); c.anchors.push(b.anchors);
  }
  cache.set(name, c);
  return c;
}

/** 톤 배열을 색으로 칠해 캔버스(가로로 프레임, 1줄 몸 / 2줄 앞팔)를 만든다 */
export function paintClip(name: string, skin: string): HTMLCanvasElement {
  const c = bakeClip(name), pal = tones(skin).map(toRgb);
  const cv = document.createElement('canvas');
  cv.width = FW * c.frames; cv.height = FH * 2;
  const ctx = cv.getContext('2d')!, img = ctx.createImageData(cv.width, cv.height), d = img.data;
  const put = (layer: Int8Array, ox: number, oy: number) => {
    for (let i = 0; i < layer.length; i++) {
      const t = layer[i];
      if (t < 0) continue;
      const x = ox + (i % FW), y = oy + Math.floor(i / FW), o = (y * cv.width + x) * 4, [r, g, b] = pal[t];
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
  };
  for (let f = 0; f < c.frames; f++) { put(c.body[f], f * FW, 0); put(c.front[f], f * FW, FH); }
  ctx.putImageData(img, 0, 0);
  return cv;
}
