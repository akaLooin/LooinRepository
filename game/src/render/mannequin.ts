// 기본 캐릭터: 얼굴과 옷이 없는 흰 마네킹(구체관절 인형 느낌).
// 뼈대 포즈를 키프레임으로 정하고, 동작마다 여러 장의 프레임으로 "구워서" 쓴다.
// 프레임마다 몸(뒤쪽) 층과 앞팔 층을 나눠 굽고, 손·머리 위치(붙임 지점)를 함께 기록한다.
// 장비(무기·모자 등)는 붙임 지점에 붙이고, 피부색은 흰 기본색에 연한 색을 섞어 바꾼다.

/** 프레임 크기(그림 픽셀, 화면에는 ART 배율) 와 발 기준점 */
export const FW = 44, FH = 44, ROOT_X = 22, ROOT_Y = 41;
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

const BASE: Pose = { bx: 0, by: 0, lean: 0, head: 0, armF: [0.12, 0.12], armB: [-0.12, -0.12], legF: [0.08, -0.06], legB: [-0.08, -0.04], wpn: 0.55 };

// ───────── 동작 ─────────
// 원작의 "통통 튀는 작은 몸" 느낌은 살리되, 자세·타이밍은 새로 설계했다(구체관절 인형의 또렷한 관절 동작).
export const CLIPS: Record<string, ClipDef> = {
  idle: { frames: 12, loop: true, keys: [
    { t: 0, by: 0, armF: [0.12, 0.12], armB: [-0.12, -0.12], head: 0, ease: 'inout' },
    { t: 0.5, by: 1, armF: [0.2, 0.2], armB: [-0.2, -0.2], head: 0.04, ease: 'inout' },
    { t: 1, by: 0, armF: [0.12, 0.12], armB: [-0.12, -0.12], head: 0 },
  ] },
  walk: { frames: 12, loop: true, keys: [
    { t: 0, legF: [0.55, -0.12], legB: [-0.5, -0.3], armF: [-0.4, 0.45], armB: [0.45, 0.55], by: 0.5, lean: 0.08, head: -0.03, ease: 'out' },
    { t: 0.25, legF: [0.02, -0.08], legB: [0.18, -1.15], armF: [0.02, 0.4], armB: [0.02, 0.4], by: -1.5, lean: 0.1, head: 0.02, ease: 'in' },
    { t: 0.5, legF: [-0.5, -0.3], legB: [0.55, -0.12], armF: [0.45, 0.55], armB: [-0.4, 0.45], by: 0.5, lean: 0.08, head: -0.03, ease: 'out' },
    { t: 0.75, legF: [0.18, -1.15], legB: [0.02, -0.08], armF: [0.02, 0.4], armB: [0.02, 0.4], by: -1.5, lean: 0.1, head: 0.02, ease: 'in' },
    { t: 1, legF: [0.55, -0.12], legB: [-0.5, -0.3], armF: [-0.4, 0.45], armB: [0.45, 0.55], by: 0.5, lean: 0.08, head: -0.03 },
  ] },
  jump: { frames: 3, loop: false, keys: [
    { t: 0, legF: [0.7, -1.2], legB: [0.1, -0.9], armF: [2.3, 0.35], armB: [1.7, 0.4], lean: -0.06, by: -2, head: -0.08, wpn: 0.2, ease: 'out' },
    { t: 1, legF: [0.55, -1.0], legB: [0.0, -0.7], armF: [2.5, 0.3], armB: [1.9, 0.35], lean: -0.04, by: -2, head: -0.1, wpn: 0.1 },
  ] },
  fall: { frames: 3, loop: false, keys: [
    { t: 0, legF: [0.35, -0.4], legB: [-0.15, -0.6], armF: [1.6, 0.25], armB: [1.2, 0.3], lean: 0.06, by: -1, head: 0.06, wpn: 0.3, ease: 'inout' },
    { t: 1, legF: [0.25, -0.2], legB: [-0.25, -0.5], armF: [1.4, 0.2], armB: [1.0, 0.3], lean: 0.08, by: -1, head: 0.08, wpn: 0.4 },
  ] },
  // 휘두르기: 무게를 뒤로 실었다가(와인드업) 앞발을 디디며 내려친 뒤 천천히 돌아온다
  swing: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.3, 0.5], wpn: 0.6, ease: 'out' },
    { t: 0.3, armF: [2.85, 0.35], armB: [-0.5, 0.4], wpn: -0.7, lean: -0.14, head: -0.1, legF: [0.2, -0.1], legB: [-0.2, -0.1], by: -0.5, ease: 'in' },
    { t: 0.55, armF: [0.95, 0.05], armB: [0.5, 0.6], wpn: 2.15, lean: 0.2, head: 0.1, legF: [0.45, -0.25], legB: [-0.45, -0.15], by: 1, ease: 'out' },
    { t: 1, armF: [0.45, 0.4], armB: [0.0, 0.4], wpn: 1.1, lean: 0.06, head: 0.02, legF: [0.25, -0.15], legB: [-0.25, -0.1], by: 0.3 },
  ] },
  // 활: 앞팔을 뻗어 활을 세우고 뒷손으로 시위를 당겼다가 놓는다
  shoot: { frames: 8, loop: false, keys: [
    { t: 0, armF: [0.9, 0.2], armB: [0.6, 0.8], wpn: 0.3, ease: 'out' },
    { t: 0.35, armF: [1.58, 0.0], armB: [1.45, 1.9], wpn: 0, lean: -0.04, legF: [0.3, -0.1], legB: [-0.3, -0.1], ease: 'lin' },
    { t: 0.5, armF: [1.58, 0.0], armB: [1.2, 2.35], wpn: 0, lean: -0.06, legF: [0.3, -0.1], legB: [-0.3, -0.1], ease: 'out' },
    { t: 0.6, armF: [1.55, 0.05], armB: [0.4, 0.5], wpn: 0, lean: -0.02, legF: [0.3, -0.1], legB: [-0.3, -0.1], ease: 'inout' },
    { t: 1, armF: [0.8, 0.3], armB: [0.0, 0.4], wpn: 0.2, legF: [0.15, -0.08], legB: [-0.15, -0.06] },
  ] },
  // 지팡이: 머리 위로 들어 기를 모았다가 앞으로 찌르듯 뻗는다
  cast: { frames: 8, loop: false, keys: [
    { t: 0, armF: [0.5, 0.4], wpn: 0.5, ease: 'out' },
    { t: 0.4, armF: [2.6, 0.1], armB: [1.4, 0.5], wpn: 0.1, lean: -0.1, head: -0.1, by: -1, ease: 'in' },
    { t: 0.6, armF: [1.5, -0.05], armB: [0.8, 0.4], wpn: 1.45, lean: 0.12, head: 0.05, legF: [0.35, -0.2], legB: [-0.35, -0.1], ease: 'out' },
    { t: 1, armF: [0.7, 0.3], armB: [0.1, 0.4], wpn: 0.8, lean: 0.04 },
  ] },
  // 곡괭이: 머리 위에서 아래로 크게 찍는다
  mine: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.4, 0.5], wpn: 0.6, ease: 'out' },
    { t: 0.32, armF: [3.0, 0.25], armB: [2.6, 0.3], wpn: -1.1, lean: -0.16, head: -0.12, by: -0.5, ease: 'in' },
    { t: 0.55, armF: [0.85, 0.3], armB: [0.7, 0.4], wpn: 1.95, lean: 0.28, head: 0.12, legF: [0.4, -0.35], legB: [-0.4, -0.2], by: 1.5, ease: 'out' },
    { t: 1, armF: [0.55, 0.45], armB: [0.2, 0.45], wpn: 1.2, lean: 0.1, legF: [0.2, -0.15], legB: [-0.2, -0.1], by: 0.5 },
  ] },
  // 도끼: 옆으로 크게 돌려 벤다
  chop: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.4, 0.5], wpn: 0.6, ease: 'out' },
    { t: 0.32, armF: [2.0, 0.6], armB: [1.6, 0.6], wpn: -1.2, lean: -0.18, head: -0.06, legF: [0.15, -0.1], legB: [-0.3, -0.2], ease: 'in' },
    { t: 0.55, armF: [1.45, 0.0], armB: [1.3, 0.2], wpn: 1.7, lean: 0.16, head: 0.06, legF: [0.4, -0.25], legB: [-0.4, -0.15], by: 1, ease: 'out' },
    { t: 1, armF: [0.6, 0.4], armB: [0.2, 0.4], wpn: 1.0, lean: 0.05, by: 0.3 },
  ] },
  climb: { frames: 8, loop: true, keys: [
    { t: 0, armF: [2.95, 0.15], armB: [2.35, 0.7], legF: [0.55, -1.1], legB: [0.1, -0.3], by: -0.5, wpn: 0.4, ease: 'inout' },
    { t: 0.5, armF: [2.35, 0.7], armB: [2.95, 0.15], legF: [0.1, -0.3], legB: [0.55, -1.1], by: 0.5, wpn: 0.4, ease: 'inout' },
    { t: 1, armF: [2.95, 0.15], armB: [2.35, 0.7], legF: [0.55, -1.1], legB: [0.1, -0.3], by: -0.5, wpn: 0.4 },
  ] },
  hurt: { frames: 3, loop: false, keys: [
    { t: 0, lean: -0.3, head: -0.25, armF: [-0.5, 0.9], armB: [0.9, 0.8], legF: [0.35, -0.3], legB: [-0.2, -0.2], by: 0.5, wpn: -0.2, ease: 'out' },
    { t: 1, lean: -0.15, head: -0.1, armF: [-0.2, 0.6], armB: [0.5, 0.6], legF: [0.2, -0.2], legB: [-0.15, -0.1], wpn: 0.2 },
  ] },
  dead: { frames: 1, loop: false, keys: [
    { t: 0, lean: 0, head: 0.2, armF: [0.6, 0.3], armB: [-0.5, 0.3], legF: [0.2, -0.1], legB: [-0.2, -0.1], wpn: 1.4 },
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

// ───────── 뼈대 치수(px) ─────────
// 비율: 키 약 30, 머리는 키의 1/3 정도인 세로로 긴 타원, 가는 팔다리
const PELVIS_Y = -11.5, TORSO = 8.5, HEAD_R: [number, number] = [4.6, 5.2], HEAD_UP = 5.2;
const UPPER_ARM = 4.2, FORE_ARM = 3.6, THIGH = 5, SHIN = 4.8;

type V = [number, number];
const dir = (a: number): V => [Math.sin(a), Math.cos(a)]; // 0 = 아래
const add = (p: V, d: V, k: number): V => [p[0] + d[0] * k, p[1] + d[1] * k];

/** 붙임 지점(발 기준점으로부터 px, 화면 아래가 +y) */
export interface Anchors { hand: V; handB: V; wpn: number; head: V; headRot: number; chest: V; lean: number }

type Shape =
  | { k: 'cap'; a: V; b: V; r0: number; r1: number }
  | { k: 'ell'; c: V; rx: number; ry: number; rot: number };
type Group = 'armB' | 'legB' | 'torso' | 'legF' | 'head' | 'armF';
const ORDER: Group[] = ['armB', 'legB', 'legF', 'torso', 'head', 'armF'];
const T_IDX = 3; // 몸통은 다리 위를 덮는다(다리와 몸통 사이엔 선을 긋지 않아 매끈하게)

/** 포즈 → 도형 목록과 붙임 지점 */
function layout(p: Pose): { parts: { g: Group; s: Shape }[]; anchors: Anchors } {
  const pelvis: V = [p.bx, PELVIS_Y + p.by];
  const up: V = [Math.sin(p.lean), -Math.cos(p.lean)];
  const neck = add(pelvis, up, TORSO);
  const hd: V = [Math.sin(p.lean + p.head), -Math.cos(p.lean + p.head)];
  const headC = add(neck, hd, HEAD_UP);
  const parts: { g: Group; s: Shape }[] = [];
  const limb = (g: Group, root: V, a0: number, a1: number, l0: number, l1: number, r: [number, number, number], end: 'hand' | 'foot') => {
    const j = add(root, dir(a0), l0), e = add(j, dir(a0 + a1), l1);
    parts.push({ g, s: { k: 'cap', a: root, b: j, r0: r[0], r1: r[1] } });
    parts.push({ g, s: { k: 'cap', a: j, b: e, r0: r[1], r1: r[2] } });
    if (end === 'hand') { const h = add(e, dir(a0 + a1), 0.6); parts.push({ g, s: { k: 'ell', c: h, rx: 1.75, ry: 1.75, rot: 0 } }); return h; }
    const f: V = [e[0] + 0.8, e[1] + 0.6];
    parts.push({ g, s: { k: 'ell', c: f, rx: 2.4, ry: 1.4, rot: 0 } });
    return f;
  };
  const shoulder = add(neck, up, -1.6);
  const handB = limb('armB', [shoulder[0] - 3.4, shoulder[1] + 0.5], p.lean + p.armB[0], p.armB[1], UPPER_ARM, FORE_ARM, [1.4, 1.3, 1.2], 'hand');
  limb('legB', [pelvis[0] - 1.3, pelvis[1]], p.legB[0], p.legB[1], THIGH, SHIN, [1.75, 1.55, 1.4], 'foot');
  limb('legF', [pelvis[0] + 1.3, pelvis[1]], p.legF[0], p.legF[1], THIGH, SHIN, [1.75, 1.55, 1.4], 'foot');
  // 몸통: 아래가 조금 넓은 둥근 콩 모양
  parts.push({ g: 'torso', s: { k: 'cap', a: add(pelvis, up, 2.2), b: add(neck, up, -2.2), r0: 3.4, r1: 3.6 } });
  parts.push({ g: 'head', s: { k: 'ell', c: headC, rx: HEAD_R[0], ry: HEAD_R[1], rot: p.lean + p.head } });
  const hand = limb('armF', [shoulder[0] + 3.4, shoulder[1] + 0.5], p.lean + p.armF[0], p.armF[1], UPPER_ARM, FORE_ARM, [1.4, 1.3, 1.2], 'hand');
  return { parts, anchors: { hand, handB, wpn: p.wpn, head: headC, headRot: p.lean + p.head, chest: add(pelvis, up, 9), lean: p.lean } };
}

/** 도형 안이면 [법선x, 법선y, 법선z] */
function hit(s: Shape, x: number, y: number): [number, number, number] | null {
  if (s.k === 'ell') {
    const dx = x - s.c[0], dy = y - s.c[1], c = Math.cos(-s.rot), sn = Math.sin(-s.rot);
    const u = (dx * c - dy * sn) / s.rx, v = (dx * sn + dy * c) / s.ry, d2 = u * u + v * v;
    if (d2 > 1) return null;
    const c2 = Math.cos(s.rot), s2 = Math.sin(s.rot);
    return [u * c2 - v * s2, u * s2 + v * c2, Math.sqrt(1 - d2)];
  }
  const [ax, ay] = s.a, bx = s.b[0] - ax, by = s.b[1] - ay, L2 = bx * bx + by * by || 1e-6;
  const t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / L2));
  const cx = ax + bx * t, cy = ay + by * t, r = s.r0 + (s.r1 - s.r0) * t;
  const dx = x - cx, dy = y - cy, d2 = (dx * dx + dy * dy) / (r * r);
  if (d2 > 1) return null;
  return [dx / r, dy / r, Math.sqrt(1 - d2)];
}

// ───────── 색 ─────────
const toRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mixC = (a: string, b: string, t: number) => {
  const A = toRgb(a), B = toRgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
/** 흰 기본 피부와 연한 색 피부 */
export const MANNEQUIN_WHITE = '#f4f2ee';

/** 톤: 0 하이라이트, 1 기본, 2 중간, 3 그늘, 4 안쪽 선, 5 외곽선 */
export function tones(skin: string): string[] {
  // 평면 2D: 기본색 한 가지 + 가장자리 그늘 + 뒤쪽 팔다리용 어두운 그늘 + 짙은 선
  return [skin, skin, mixC(skin, '#a4b4c8', 0.42), mixC(skin, '#7c8aa4', 0.55), '#231c2a', '#1c1622'];
}

/** 한 포즈를 두 층(몸, 앞팔)으로 굽는다. 결과는 톤 번호 배열(-1 = 빈 칸) */
function bake(p: Pose): { body: Int8Array; front: Int8Array; anchors: Anchors } {
  const { parts, anchors } = layout(p);
  const N = FW * FH, tone = new Int8Array(N).fill(-1), grp = new Int8Array(N).fill(-1);
  for (const { g, s } of parts) {
    const gi = ORDER.indexOf(g), back = g === 'armB' || g === 'legB';
    for (let py = 0; py < FH; py++) for (let px = 0; px < FW; px++) {
      const n = hit(s, px + 0.5 - ROOT_X, py + 0.5 - ROOT_Y);
      if (!n) continue;
      // 평면 칠: 오른쪽(바라보는 쪽 반대편이 아닌 빛 반대편) 가장자리 한 줄만 그늘
      const rim = !hit(s, px + 1.5 - ROOT_X, py + 0.5 - ROOT_Y) || (s.k === 'ell' && !hit(s, px + 0.5 - ROOT_X, py + 1.5 - ROOT_Y) && n[1] > 0.6);
      let t = rim ? 2 : 1;
      if (back) t = rim ? 3 : 2;
      const i = py * FW + px;
      tone[i] = t; grp[i] = gi;
    }
  }
  // 외톨이 픽셀 정리: 같은 덩어리 안에서 네 이웃과 모두 다른 톤이면 가장 많은 이웃 톤으로
  const t2 = tone.slice();
  for (let y = 1; y < FH - 1; y++) for (let x = 1; x < FW - 1; x++) {
    const i = y * FW + x;
    if (tone[i] < 0) continue;
    const nb = [i - 1, i + 1, i - FW, i + FW].filter((j) => grp[j] === grp[i]).map((j) => tone[j]);
    if (nb.length === 4 && nb.every((v) => v !== tone[i])) {
      const cnt = new Map<number, number>(); nb.forEach((v) => cnt.set(v, (cnt.get(v) ?? 0) + 1));
      t2[i] = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  // 안쪽 선: 뒤에 있는 다른 덩어리와 맞닿은 앞 덩어리의 가장자리
  const t3 = t2.slice();
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = y * FW + x;
    if (grp[i] < 0) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= FW || ny >= FH) continue;
      const j = ny * FW + nx;
      if (grp[j] >= 0 && grp[j] < grp[i] && !(grp[i] === T_IDX && grp[j] >= 1 && grp[j] <= 2)) { t3[i] = 4; break; }
    }
  }
  // 외곽선: 빈 칸 중 옆에 그림이 있으면(앞팔 옆이면 앞팔 층으로)
  const body = new Int8Array(N).fill(-1), front = new Int8Array(N).fill(-1), FRONT = ORDER.indexOf('armF');
  for (let i = 0; i < N; i++) if (grp[i] >= 0) (grp[i] === FRONT ? front : body)[i] = t3[i];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = y * FW + x;
    if (grp[i] >= 0) continue;
    let near = -1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= FW || ny >= FH) continue;
      const g = grp[ny * FW + nx];
      if (g >= 0) near = Math.max(near, g);
    }
    if (near >= 0) (near === FRONT ? front : body)[i] = 5;
  }
  return { body, front, anchors };
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
