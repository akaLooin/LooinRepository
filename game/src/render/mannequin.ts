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
  // 걷기(정면에 가까운 몸): 다리를 번갈아 2칸 들어 올리며 디딘다. 든 다리 반대쪽 팔을 살짝 앞으로, 다리를 들 때 몸이 1칸 오른다
  walk: { frames: 12, loop: true, keys: [
    { t: 0, legF: [0.1, 0], legB: [-0.1, 0], armF: [0, 0], armB: [0, 0], by: 0, ease: 'out' },
    { t: 0.25, legF: [0.06, -1.2], legB: [-0.06, 0], armF: [-0.14, 0], armB: [0.14, 0], by: -1.7, lean: 0.03, ease: 'in' },
    { t: 0.5, legF: [0.1, 0], legB: [-0.1, 0], armF: [0, 0], armB: [0, 0], by: 0, ease: 'out' },
    { t: 0.75, legF: [0.06, 0], legB: [-0.06, -1.2], armF: [0.14, 0], armB: [-0.14, 0], by: -1.7, lean: 0.03, ease: 'in' },
    { t: 1, legF: [0.1, 0], legB: [-0.1, 0], armF: [0, 0], armB: [0, 0], by: 0 },
  ] },
  // 점프: 두 무릎을 접어 올리고(앞다리를 더 높이) 팔을 살짝 벌려 위로
  jump: { frames: 3, loop: false, keys: [
    { t: 0, legF: [0.06, -1.6], legB: [-0.06, -0.9], armF: [0.55, 0], armB: [-0.55, 0], by: -1, lean: -0.03, wpn: 0.4, ease: 'out' },
    { t: 1, legF: [0.06, -1.4], legB: [-0.06, -0.8], armF: [0.7, 0], armB: [-0.7, 0], by: -1, lean: -0.02, wpn: 0.4 },
  ] },
  // 낙하: 다리를 곧게 펴 내리고 팔을 더 벌려 균형을 잡는다
  fall: { frames: 3, loop: false, keys: [
    { t: 0, legF: [0.1, -0.4], legB: [-0.1, 0], armF: [0.9, 0], armB: [-0.9, 0], by: -0.5, wpn: 0.6, ease: 'inout' },
    { t: 1, legF: [0.12, 0], legB: [-0.12, 0], armF: [1.05, 0], armB: [-1.05, 0], by: 0, wpn: 0.7 },
  ] },
  // 휘두르기: 무게를 뒤로 실었다가(와인드업) 앞발을 디디며 내려친 뒤 천천히 돌아온다
  swing: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.3, 0], wpn: 0.6, ease: 'out' },
    // 와인드업: 팔을 머리 오른쪽 위로, 칼은 머리 뒤로 젖힌다
    { t: 0.3, armF: [2.2, 0], wpn: -0.8, lean: -0.1, legF: [0.05, 0], legB: [-0.05, 0], by: -0.5, ease: 'in' },
    // 내려치기(타격 판정 시점): 앞발을 살짝 내딛으며 앞쪽 아래로
    { t: 0.48, armF: [1.0, 0], wpn: 2.2, lean: 0.15, legF: [0.18, 0], legB: [-0.12, 0], by: 0.8, ease: 'out' },
    // 마무리: 칼끝이 아래로 따라 내려간 뒤 쉬는 자세로
    { t: 0.7, armF: [0.7, 0], wpn: 2.6, lean: 0.08, legF: [0.15, 0], legB: [-0.1, 0], by: 0.5, ease: 'inout' },
    { t: 1, armF: [0.2, 0], wpn: 0.8, lean: 0, legF: [0.05, 0], legB: [-0.05, 0], by: 0 },
  ] },
  // 활: 앞팔을 뻗어 활을 세우고 뒷손으로 시위를 당겼다가 놓는다
  shoot: { frames: 8, loop: false, keys: [
    { t: 0, armF: [0.6, 0], armB: [0, 0], wpn: 0.2, ease: 'out' },
    // 겨누기: 앞팔로 활을 세워 든다(뒷팔은 몸을 가로지르지 않게 옆에서 살짝만 당긴다)
    { t: 0.3, armF: [1.55, 0], armB: [0.3, 0], wpn: 0, legF: [0.12, 0], legB: [-0.12, 0], ease: 'inout' },
    { t: 0.45, armF: [1.5, 0], armB: [-0.15, 0], wpn: 0.03, lean: -0.05, legF: [0.12, 0], legB: [-0.12, 0], ease: 'out' },
    // 놓은 뒤 반동: 활이 위로 살짝 튄다
    { t: 0.6, armF: [1.75, 0], armB: [0, 0], wpn: -0.12, lean: -0.02, legF: [0.1, 0], legB: [-0.1, 0], ease: 'inout' },
    { t: 1, armF: [0.3, 0], armB: [0, 0], wpn: 0.3, legF: [0, 0], legB: [0, 0] },
  ] },
  // 지팡이: 머리 위로 들어 기를 모았다가 앞으로 찌르듯 뻗는다
  cast: { frames: 8, loop: false, keys: [
    { t: 0, armF: [0.3, 0], wpn: 0.5, ease: 'out' },
    // 기 모으기: 머리를 가리지 않게 머리 오른쪽 앞 위로 든다(뒷팔은 살짝 벌림)
    { t: 0.35, armF: [1.9, 0], armB: [-0.4, 0], wpn: -0.2, lean: -0.06, by: -0.8, ease: 'in' },
    // 뻗기(마법이 나가는 시점): 앞으로 찌르듯
    { t: 0.5, armF: [1.45, 0], armB: [0, 0], wpn: 1.4, lean: 0.12, legF: [0.15, 0], legB: [-0.1, 0], by: 0.5, ease: 'out' },
    { t: 0.7, armF: [1.4, 0], wpn: 1.5, lean: 0.06, legF: [0.12, 0], legB: [-0.08, 0], by: 0.3, ease: 'inout' },
    { t: 1, armF: [0.3, 0], armB: [0, 0], wpn: 0.6, lean: 0, legF: [0, 0], legB: [0, 0], by: 0 },
  ] },
  // 곡괭이: 머리 위에서 아래로 크게 찍는다
  mine: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.3, 0], wpn: 0.6, ease: 'out' },
    // 곡괭이: 머리 위로 높이 들었다가 바로 앞 땅을 찍는다
    { t: 0.32, armF: [2.6, 0], wpn: -1.1, lean: -0.12, by: -0.8, ease: 'in' },
    { t: 0.48, armF: [0.9, 0], wpn: 1.95, lean: 0.2, legF: [0.15, 0], legB: [-0.1, 0], by: 1.2, ease: 'out' },
    { t: 0.7, armF: [0.75, 0], wpn: 2.1, lean: 0.12, legF: [0.12, 0], legB: [-0.08, 0], by: 0.8, ease: 'inout' },
    { t: 1, armF: [0.2, 0], wpn: 0.8, lean: 0, by: 0 },
  ] },
  // 도끼: 옆으로 크게 돌려 벤다
  chop: { frames: 10, loop: false, keys: [
    { t: 0, armF: [0.3, 0], wpn: 0.6, ease: 'out' },
    // 도끼: 어깨 높이로 뒤로 젖혔다가 옆으로 크게 벤다
    { t: 0.32, armF: [1.7, 0], wpn: -1.0, lean: -0.12, legF: [0.05, 0], legB: [-0.08, 0], ease: 'in' },
    { t: 0.48, armF: [1.35, 0], wpn: 1.75, lean: 0.14, legF: [0.15, 0], legB: [-0.1, 0], by: 0.8, ease: 'out' },
    { t: 0.7, armF: [1.0, 0], wpn: 2.1, lean: 0.08, legF: [0.12, 0], legB: [-0.08, 0], by: 0.4, ease: 'inout' },
    { t: 1, armF: [0.2, 0], wpn: 0.8, lean: 0, by: 0 },
  ] },
  // 로프 오르기: 한 팔씩 번갈아 머리 옆으로 뻗어 잡고, 반대쪽 다리를 들어 올린다(두 팔이 동시에 머리를 가리지 않게)
  climb: { frames: 8, loop: true, keys: [
    { t: 0, armF: [2.3, 0], armB: [-0.3, 0], legF: [0.04, 0], legB: [-0.04, -1.3], by: -0.6, wpn: 0.4, ease: 'inout' },
    { t: 0.25, armF: [0.45, 0], armB: [-0.45, 0], legF: [0.04, -0.6], legB: [-0.04, -0.6], by: 0, wpn: 0.4, ease: 'inout' },
    { t: 0.5, armF: [0.3, 0], armB: [-2.3, 0], legF: [0.04, -1.3], legB: [-0.04, 0], by: 0.6, wpn: 0.4, ease: 'inout' },
    { t: 0.75, armF: [0.45, 0], armB: [-0.45, 0], legF: [0.04, -0.6], legB: [-0.04, -0.6], by: 0, wpn: 0.4, ease: 'inout' },
    { t: 1, armF: [2.3, 0], armB: [-0.3, 0], legF: [0.04, 0], legB: [-0.04, -1.3], by: -0.6, wpn: 0.4 },
  ] },
  // 피격: 몸이 뒤로 젖혀지며 팔이 들리고, 한 발이 떨어진다
  hurt: { frames: 3, loop: false, keys: [
    { t: 0, lean: -0.2, armF: [0.9, 0], armB: [-0.75, 0], legF: [0.06, -1.0], legB: [-0.08, 0], by: 1, wpn: -0.2, ease: 'out' },
    { t: 1, lean: -0.08, armF: [0.3, 0], armB: [-0.25, 0], legF: [0.06, 0], legB: [-0.06, 0], by: 0.5, wpn: 0.2 },
  ] },
  // 쓰러짐: 장면에서 몸 전체를 눕히므로 팔다리는 힘없이 늘어뜨린다
  dead: { frames: 1, loop: false, keys: [
    { t: 0, armF: [0.2, 0], armB: [-0.15, 0], legF: [0.05, 0], legB: [-0.05, 0], by: 1, wpn: 1.4 },
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
// 사용자가 준 치비 픽셀 뼈대를 흰 피부·얼굴 없음·날씬한 비율로 다시 찍은 확정 시안(replica/design/mannequin-base.txt).
// 이 그림을 그대로 쓴다: 대기 자세는 시안과 똑같고, 다른 동작은 시안에서 잘라낸 팔·다리 조각을
// 어깨·엉덩이를 축으로 돌려 붙인다(조각 자체는 다시 그리지 않는다).
// 글자: 3 테두리, 4 밝은 선, 5 그늘, 6 기본, 7 밝은 면. 머리는 대각선 모서리의 튀어나온 칸을 깎아 둥글게(반투명 없음)
const BASE_PX = [
  '........3333.........',
  '.......377663........',
  '......37766663.......',
  '.....3776666663......',
  '.....3666666653......',
  '.....3666666553......',
  '.....3666665553......',
  '......36665553.......',
  '.......355553........',
  '........3333.........',
  '......33777733.......',
  '.....3777766753......',
  '.....3777766753......',
  '....375777667653.....',
  '....365777753763.....',
  '...36637777537763....',
  '...36537777637763....',
  '....353777763553.....',
  '....333777763333.....',
  '......37777653.......',
  '......37747653.......',
  '......37637653.......',
  '......36636653.......',
  '......35533553.......',
  '......35533553.......',
  '......35533553.......',
  '.......33..33........',
];
/** 게임에서 쓰는 몸: 시안을 좌우로 뒤집는다(밝은 면이 앞=오른쪽에 오도록. 시안은 밝은 면이 왼쪽이라 왼쪽을 보는 듯 읽혔다).
 *  칸 c → 19-c(가운데 축 고정), 연속 좌표 x → 20-x. 팔·다리의 앞/뒤는 자리가 바뀌므로 역할을 맞바꾼다(앞=오른쪽 유지) */
export const MIRROR = true;
/** 머리를 몸통 쪽으로 내리는 칸 수: 머리 아래 테두리와 어깨 위 테두리가 두 겹으로 겹쳐 검은 목처럼 보이던 것을 없앤다 */
export const HEAD_DROP = 1;
const mx = (x: number) => (MIRROR ? 20 - x : x);
const BODY_PX = MIRROR ? BASE_PX.map((row) => [...row.slice(0, 20)].reverse().join('') + row.slice(20)) : BASE_PX;
const CH_TONE: Record<string, number> = { '7': 0, '6': 1, '5': 2, '4': 4, '3': 5, a: 6 };

type V = [number, number];
/** 붙임 지점(발 기준점으로부터 px, 화면 아래가 +y) */
export interface Anchors { hand: V; handB: V; wpn: number; head: V; headRot: number; chest: V; lean: number;
  /** 윗몸 이동 칸 [좌우, 위아래, 머리 좌우] — 장비 겉모습을 같은 만큼 옮긴다 */
  off: [number, number, number] }

/** 조각: 칸 목록(열, 줄, 글자)과 회전축 */
type Piece = { px: [number, number, string][]; pivot: V };
type PartName = 'head' | 'torso' | 'armB' | 'armF' | 'legB' | 'legF';
/** 시안을 조각으로 나눈다. 팔(11~18줄의 바깥쪽), 다리(21줄 아래), 머리(0~9줄), 나머지는 몸통.
 *  팔을 떼어낸 자리에서 몸통 가장자리가 비지 않도록 맞닿은 칸은 테두리로 메운다(대기 자세에선 팔 조각이 그대로 덮는다). */
const PIECES: Record<PartName, Piece> = (() => {
  const part0 = (c: number, r: number): PartName =>
    r <= 9 ? 'head' : r >= 21 ? (c <= 9 ? 'legB' : 'legF') : r >= 11 && r <= 18 && c <= 6 ? 'armB' : r >= 11 && r <= 18 && c >= 12 ? 'armF' : 'torso';
  const swap: Record<PartName, PartName> = { head: 'head', torso: 'torso', armB: 'armF', armF: 'armB', legB: 'legF', legF: 'legB' };
  const part = (c: number, r: number): PartName => (MIRROR ? swap[part0(19 - c, r)] : part0(c, r));
  const out: Record<PartName, Piece> = {
    head: { px: [], pivot: [mx(9.5), 8] }, torso: { px: [], pivot: [mx(9.5), 20] },
    armB: { px: [], pivot: MIRROR ? [mx(12.5), 11.5] : [6.5, 11.5] }, armF: { px: [], pivot: MIRROR ? [mx(6.5), 11.5] : [12.5, 11.5] },
    legB: { px: [], pivot: MIRROR ? [mx(11), 21] : [8, 21] }, legF: { px: [], pivot: MIRROR ? [mx(8), 21] : [11, 21] },
  };
  const BASE_PX = BODY_PX;
  const filled = (c: number, r: number) => BASE_PX[r]?.[c] !== undefined && BASE_PX[r][c] !== '.';
  BASE_PX.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') out[part(c, r)].px.push([c, r, ch]); }));
  // 팔 자리 메우기: 팔 칸 중 몸통 칸과 맞닿은 곳 → 몸통 테두리
  for (const arm of ['armB', 'armF'] as const) for (const [c, r] of out[arm].px) {
    const touch = [[1, 0], [-1, 0]].some(([dx]) => filled(c + dx, r) && part(c + dx, r) === 'torso' && BASE_PX[r][c + dx] !== '3');
    if (touch) out.torso.px.push([c, r, '3']);
  }
  return out;
})();
// 쉬는 자세에서 손의 중심(그림 칸)
const HAND_REST: Record<'armB' | 'armF', V> = MIRROR ? { armB: [mx(14.5), 16], armF: [mx(4.5), 16] } : { armB: [4.5, 16], armF: [14.5, 16] };
const LEG_PARTS: PartName[] = ['legB', 'legF'];

/** 조각을 축 기준으로 돌려(가장 가까운 칸) 옮긴 칸 목록 */
/** Scale2x: 계단을 매끄럽게 하며 2배로 키운다(글자 격자) */
function scale2x(g: string[][]): string[][] {
  const h = g.length, w = g[0].length, at = (c: number, r: number) => (r >= 0 && r < h && c >= 0 && c < w ? g[r][c] : '.');
  const o: string[][] = Array.from({ length: h * 2 }, () => new Array(w * 2).fill('.'));
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const E = at(c, r), B = at(c, r - 1), D = at(c - 1, r), F = at(c + 1, r), H = at(c, r + 1);
    o[r * 2][c * 2] = D === B && B !== F && D !== H ? D : E;
    o[r * 2][c * 2 + 1] = B === F && B !== D && F !== H ? F : E;
    o[r * 2 + 1][c * 2] = D === H && D !== B && H !== F ? D : E;
    o[r * 2 + 1][c * 2 + 1] = H === F && D !== H && B !== F ? F : E;
  }
  return o;
}
/** 조각을 축 기준으로 돌려 옮긴 칸 목록.
 *  픽셀 그림을 그냥 돌리면 가장자리가 들쭉날쭉하므로, 8배로 매끄럽게 키운 뒤 돌려서 칸 중심을 샘플한다(RotSprite 방식). */
const BIG = new Map<Piece, { g: string[][]; x0: number; y0: number }>();
function place(pc: Piece, ang: number, dx: number, dy: number): [number, number, string][] {
  if (Math.abs(ang) < 0.04) return pc.px.map(([c, r, ch]) => [c + dx, r + dy, ch]);
  let big = BIG.get(pc);
  if (!big) {
    const xs = pc.px.map((p) => p[0]), ys = pc.px.map((p) => p[1]);
    const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1, w = Math.max(...xs) - x0 + 2, h = Math.max(...ys) - y0 + 2;
    let g: string[][] = Array.from({ length: h }, () => new Array(w).fill('.'));
    for (const [c, r, ch] of pc.px) g[r - y0][c - x0] = ch;
    g = scale2x(scale2x(scale2x(g)));
    big = { g, x0, y0 };
    BIG.set(pc, big);
  }
  const cs = Math.cos(ang), sn = Math.sin(ang), [px, py] = pc.pivot;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [c, r] of pc.px) {
    const ox = c + 0.5 - px, oy = r + 0.5 - py, nx = px + ox * cs - oy * sn, ny = py + ox * sn + oy * cs;
    x0 = Math.min(x0, nx); x1 = Math.max(x1, nx); y0 = Math.min(y0, ny); y1 = Math.max(y1, ny);
  }
  const res: [number, number, string][] = [];
  for (let y = Math.floor(y0 - 1); y <= Math.ceil(y1 + 1); y++) for (let x = Math.floor(x0 - 1); x <= Math.ceil(x1 + 1); x++) {
    // 칸 중심을 거꾸로 돌려 8배 그림에서 찾는다
    const ox = x + 0.5 - px, oy = y + 0.5 - py, sx = px + ox * cs + oy * sn, sy = py - ox * sn + oy * cs;
    const bx = Math.floor((sx - big.x0) * 8), by = Math.floor((sy - big.y0) * 8);
    const ch = big.g[by]?.[bx];
    if (ch && ch !== '.') res.push([x + dx, y + dy, ch]);
  }
  return res;
}
const rot = (p: V, pv: V, a: number): V => {
  const ox = p[0] - pv[0], oy = p[1] - pv[1];
  return [pv[0] + ox * Math.cos(a) - oy * Math.sin(a), pv[1] + ox * Math.sin(a) + oy * Math.cos(a)];
};

/** 포즈 → 조각마다 놓인 칸, 붙임 지점 */
function layout(p: Pose) {
  const lift = Math.round(p.by * 0.6); // 숨쉬기·튐: 윗몸만 위아래로
  const sway = Math.round(p.lean * 3); // 곧게 선 자세: 기울기는 1칸 정도 옮기는 것으로만
  const legLift = Math.min(0, lift);
  const legUp = (knee: number) => Math.round(Math.max(0, -knee - 0.2) * 2);
  // 화면 회전 각: 팔·다리를 앞(+x)으로 a 만큼 들면 시계 반대 방향 = -a
  const armAng = (v: [number, number]) => -(v[0] + v[1] * 0.5);
  const placed: Record<PartName, [number, number, string][]> = {
    // 다리: 회전은 엉덩이 각도만, 무릎을 굽히는 값(-)은 다리를 그만큼 들어 올리는 것으로(정면 몸에서 다리가 옆으로 꺾이지 않게)
    legB: place(PIECES.legB, -p.legB[0], 0, legLift - legUp(p.legB[1])),
    legF: place(PIECES.legF, -p.legF[0], 0, legLift - legUp(p.legF[1])),
    torso: place(PIECES.torso, 0, sway, lift),
    head: place(PIECES.head, 0, sway + Math.round(p.head * 2), lift + HEAD_DROP),
    armB: place(PIECES.armB, armAng(p.armB), sway, lift),
    armF: place(PIECES.armF, armAng(p.armF), sway, lift),
  };
  const toRoot = (c: number, r: number): V => [c - 9.5, r - 25.5]; // 그림 칸 중심 → 발 기준 좌표
  const hand = rot(HAND_REST.armF, PIECES.armF.pivot, armAng(p.armF)), handB = rot(HAND_REST.armB, PIECES.armB.pivot, armAng(p.armB));
  const anchors: Anchors = {
    hand: toRoot(hand[0] + sway, hand[1] + lift), handB: toRoot(handB[0] + sway, handB[1] + lift), wpn: p.wpn,
    head: toRoot(mx(9.5) + sway, 4.5 + lift + HEAD_DROP), headRot: 0, chest: toRoot(mx(9.5) + sway, 14 + lift), lean: p.lean,
    off: [sway, lift, Math.round(p.head * 2)],
  };
  return { placed, anchors };
}

// ───────── 색 ─────────
const toRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mixC = (a: string, b: string, t: number) => {
  const A = toRgb(a), B = toRgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
/** 흰 기본 피부 */
export const MANNEQUIN_WHITE = '#f4f2ee';

/** 캐릭터 테두리(검정) */
export const OUTLINE = '#141016';
/** 톤: 0 밝은 면, 1 기본, 2 그늘, 3 짙은 그늘(뒤쪽 팔다리), 4 밝은 선, 5 테두리(검정), 6 반투명 테두리(모서리 다듬기) */
export function tones(skin: string): string[] {
  return [mixC(skin, '#ffffff', 0.75), mixC(skin, '#dcd9e2', 0.35), mixC(skin, '#b9b4c6', 0.5), mixC(skin, '#9e98b0', 0.55), mixC(skin, '#8e8296', 0.6), OUTLINE, OUTLINE];
}
/** 톤별 불투명도(255 = 불투명) */
const TONE_ALPHA = [255, 255, 255, 255, 255, 255, 105];

/** 한 포즈를 두 층(몸, 앞팔)으로 굽는다. 결과는 톤 번호 배열(-1 = 빈 칸) */
function bake(p: Pose): { body: Int8Array; front: Int8Array; anchors: Anchors } {
  const { placed, anchors } = layout(p);
  const N = FW * FH, body = new Int8Array(N).fill(-1), front = new Int8Array(N).fill(-1);
  const draw = (layer: Int8Array, cells: [number, number, string][]) => {
    for (const [c, r, ch] of cells) {
      const x = c + ROOT_X - 10, y = r + ROOT_Y - 26; // 그림 칸 → 프레임 칸
      if (x < 0 || y < 0 || x >= FW || y >= FH) continue;
      layer[y * FW + x] = CH_TONE[ch];
    }
  };
  // 시안과 같은 겹침 순서: 다리 → 몸통 → 머리 → 뒷팔 / 앞팔은 따로(무기 위에 그린다)
  for (const k of [...LEG_PARTS, 'torso', 'head'] as PartName[]) draw(body, placed[k]);
  // 팔이 쉬는 자세에서 벗어나 머리·몸 위로 겹치면 같은 흰색이라 경계가 사라진다 → 겹친 가장자리에 테두리
  const overlay = (dst: Int8Array, cells: [number, number, string][], moved: boolean) => {
    const own = new Int8Array(N).fill(-1);
    draw(own, cells);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const i = y * FW + x;
      if (own[i] < 0) continue;
      let t = own[i];
      if (moved && t !== CH_TONE['3']) {
        const under = (j: number) => own[j] < 0 && (body[j] >= 0 || dst[j] >= 0);
        if ((x > 0 && under(i - 1)) || (x < FW - 1 && under(i + 1)) || (y > 0 && under(i - FW)) || (y < FH - 1 && under(i + FW))) t = CH_TONE['3'];
      }
      dst[i] = t;
    }
  };
  overlay(body, placed.armB, Math.abs(p.armB[0] + p.armB[1] * 0.5) > 0.3);
  overlay(front, placed.armF, Math.abs(p.armF[0] + p.armF[1] * 0.5) > 0.3);
  // 돌린 팔다리는 몸에 붙어 있던 쪽이 바깥으로 드러난다 → 합친 윤곽에서 빈 칸과 닿은 칸은 테두리로 닫는다(대기 자세는 그대로)
  const filled = (i: number) => body[i] >= 0 || front[i] >= 0;
  const edge: number[] = [];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = y * FW + x;
    if (filled(i) && ((x > 0 && !filled(i - 1)) || (x < FW - 1 && !filled(i + 1)) || (y > 0 && !filled(i - FW)) || (y < FH - 1 && !filled(i + FW)))) edge.push(i);
  }
  for (const i of edge) { if (front[i] >= 0) front[i] = CH_TONE['3']; else body[i] = CH_TONE['3']; }
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
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = TONE_ALPHA[t];
    }
  };
  for (let f = 0; f < c.frames; f++) { put(c.body[f], f * FW, 0); put(c.front[f], f * FW, FH); }
  ctx.putImageData(img, 0, 0);
  return cv;
}
