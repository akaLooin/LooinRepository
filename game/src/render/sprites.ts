// 모든 그래픽은 코드로 생성한 픽셀아트(임시 원화). 외부 이미지 파일 없음.
// 1 아트픽셀 = 1 월드 단위. 나중에 실제 스프라이트 시트로 교체할 때는 같은 key로 텍스처만 바꾸면 된다.
import { Look } from '../core/state';
import { CLIPS, FH, FW, MANNEQUIN_WHITE, ROOT_X, ROOT_Y, paintClip } from './mannequin';

const OUT = '#2b1d2e';
const PAL: Record<string, string> = {
  o: OUT, e: OUT, w: '#ffffff', b: '#f4a3a0', m: '#b5525c',
  p: '#4a5a8a', P: '#39466e', f: '#6b4a3a', F: '#553828',
  g: '#5fb859', G: '#8fde5d', j: '#3b8c4f',
  n: '#8a5a3c', N: '#b9824f', u: '#5e3b2c',
  a: '#9aa3ad', A: '#c9d1d9', z: '#6a7480',
  r: '#d9574a', R: '#f08a6a', t: '#9c3a3a',
  y: '#f6c945', Y: '#ffe98a', l: '#5aa9e6', L: '#a5d8ff', v: '#8a6fd1', V: '#b9a5f0',
};

export const canvases = new Map<string, HTMLCanvasElement>();
const mk = (key: string, w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  canvases.set(key, c);
  return c.getContext('2d')!;
};

/** 문자 격자 → 캔버스 */
function grid(key: string, rows: string[], over: Record<string, string> = {}) {
  const w = Math.max(...rows.map((r) => r.length));
  const ctx = mk(key, w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = over[row[x]] ?? PAL[row[x]];
      if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
    }
  });
}

/** 도형으로 그리는 픽셀 페인터. 마지막에 외곽선을 자동으로 두른다. */
class Paint {
  px: (string | null)[];
  constructor(readonly w: number, readonly h: number) { this.px = new Array(w * h).fill(null); }
  set(x: number, y: number, c: string | null) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string | null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  disc(cx: number, cy: number, rx: number, ry: number, c: string | null) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, c);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  /** 입체 음영: 빛이 왼쪽 위에서 온다고 보고 가장자리를 밝게/어둡게. 이미 칠한 색을 기준으로 단계만 더한다 */
  shadeAll() {
    const src = this.px.slice();
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? src[y * this.w + x] : null);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = src[y * this.w + x];
      if (!c || c === OUT || c === '#000000') continue;
      if (!at(x - 1, y) || !at(x, y - 1)) this.px[y * this.w + x] = shade(c, 1.22);
      else if (!at(x + 1, y) || !at(x, y + 1)) this.px[y * this.w + x] = shade(c, 0.68);
      else if (!at(x + 2, y) || !at(x, y + 2)) this.px[y * this.w + x] = shade(c, 0.86);
    }
    return this;
  }
  /** 부피 음영(새 화풍): 위·왼쪽 가장자리 밝게, 아래·오른쪽 두 단계 그림자. 색상을 튼다 */
  volume(keep: string[] = []) {
    const src = this.px.slice();
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? src[y * this.w + x] : null);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = src[y * this.w + x];
      if (!c || keep.includes(c)) continue;
      const i = y * this.w + x;
      if (!at(x - 1, y) || !at(x, y - 1)) this.px[i] = ramp(c, 2);
      else if (!at(x - 2, y) || !at(x, y - 2)) this.px[i] = ramp(c, 1);
      else if (!at(x + 1, y) || !at(x, y + 1)) this.px[i] = ramp(c, -2);
      else if (!at(x + 2, y) || !at(x, y + 2) || !at(x + 3, y + 1)) this.px[i] = ramp(c, -1);
    }
    return this;
  }
  /** 짙은 색 외곽선: 빈 칸 중 옆에 색이 있으면 그 색의 가장 어두운 단계로 */
  selout() {
    const src = this.px.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src[y * this.w + x]) continue;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const n = nx >= 0 && ny >= 0 && nx < this.w && ny < this.h ? src[ny * this.w + nx] : null;
        if (n) { this.px[y * this.w + x] = lineOf(n); break; }
      }
    }
    return this;
  }
  outline(c = OUT, shaded = true) {
    if (shaded) this.shadeAll();
    const src = this.px.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src[y * this.w + x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < this.w && ny < this.h && src[ny * this.w + nx];
      });
      if (near) this.px[y * this.w + x] = c;
    }
    return this;
  }
  save(key: string) {
    const ctx = mk(key, this.w, this.h);
    this.px.forEach((c, i) => { if (c) { ctx.fillStyle = c; ctx.fillRect(i % this.w, Math.floor(i / this.w), 1, 1); } });
  }
}

// ───────── 색 도구 ─────────
const toRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : mx === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return toHex(f(0), f(8), f(4));
}
/** 음영 단계: step<0 은 그림자(색상을 붉은·보라 쪽으로, 채도↑), step>0 은 밝은 쪽(노란 쪽으로) */
export function ramp(hex: string, step: number): string {
  const [r, g, b] = toRgb(hex);
  let [h, sa, l] = rgbToHsl(r, g, b);
  if (step < 0) {
    h = (h + (h > 0.12 && h < 0.75 ? 0.035 : -0.025) * -step + 1) % 1; // 노랑~파랑은 보라 쪽, 빨강 근처는 더 붉게
    sa = Math.min(1, sa + 0.06 * -step); l = Math.max(0.03, l * Math.pow(0.78, -step));
  } else if (step > 0) {
    h = (h + (h > 0.17 && h < 0.66 ? -0.02 : 0.015) * step + 1) % 1; // 노란 쪽으로
    sa = Math.max(0, sa - 0.03 * step); l = Math.min(0.97, l + (1 - l) * 0.22 * step);
  }
  return hslToHex(h, sa, l);
}
/** 짙은 색 외곽선: 이웃 색을 아주 어둡고 붉게 */
export const lineOf = (hex: string) => mixHex(ramp(hex, -2), '#22121c', 0.62);
function mixHex(a: string, b: string, t: number) {
  const A = toRgb(a), B = toRgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// 간단한 결정적 난수(텍스처 무늬용)
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** 고해상도 그림의 표시 배율: 그림 2픽셀이 월드 1칸 */
export const ART = 0.5;
/** 고해상도(2배)로 만든 그림 목록. 화면에서는 ART 배율로 줄여 쓴다 */
export const HI = new Set<string>();

/** 두 색 섞기 */
export const mix = mixHex;

/** 여러 프레임을 담은 캔버스의 프레임 목록(텍스처 key → [이름, x, y, w, h]) */
export const frameDefs = new Map<string, [string, number, number, number, number][]>();

/** 기본 캐릭터(흰 마네킹)의 동작 프레임을 피부색으로 칠해 등록한다. 반환값은 텍스처 key 접두사 */
export function buildLook(l: Look): string {
  const skin = /^#[0-9a-f]{6}$/i.test(l.skin) ? l.skin : MANNEQUIN_WHITE;
  const k = `mq_${skin.slice(1)}`;
  if (canvases.has(`${k}_idle`)) return k;
  for (const clip of Object.keys(CLIPS)) {
    const key = `${k}_${clip}`, cv = paintClip(clip, skin), n = CLIPS[clip].frames;
    canvases.set(key, cv);
    const defs: [string, number, number, number, number][] = [];
    for (let f = 0; f < n; f++) { defs.push([`b${f}`, f * FW, 0, FW, FH]); defs.push([`f${f}`, f * FW, FH, FW, FH]); }
    frameDefs.set(key, defs);
  }
  return k;
}

function buildWeapons() {
  const hi = (key: string) => { HI.add(key); return key; };
  // 검(2배 해상도): 날 가운데 빛줄, 가드, 감은 손잡이, 둥근 폼멜. 손잡이가 높이의 82% 지점
  const sword = (id: string, blade: string, guard: string) => {
    const p = new Paint(14, 34);
    for (let y = 2; y < 23; y++) p.rect(5, y, 4, 1, blade);
    p.set(6, 1, blade); p.set(7, 1, blade); p.set(6, 0, blade);
    p.volume();
    p.rect(6, 3, 1, 19, mix(blade, '#ffffff', 0.55)); p.set(6, 1, mix(blade, '#ffffff', 0.7));
    p.rect(1, 22, 12, 3, guard); p.rect(1, 22, 12, 1, mix(guard, '#ffffff', 0.35)); p.rect(1, 24, 12, 1, mix(guard, '#2a1430', 0.35));
    p.rect(6, 22, 2, 3, '#e84a5a'); // 보석
    for (let y = 25; y < 31; y++) p.rect(5, y, 4, 1, y % 2 ? '#6e4630' : '#8a5a3c');
    p.disc(6.5, 32, 2, 1.6, guard); p.set(6, 31, mix(guard, '#ffffff', 0.4));
    p.selout().save(hi(`wp_${id}`));
  };
  sword('sword_wood', '#c9925a', '#8a5a3c');
  sword('sword_stone', '#c9d1d9', '#b9824f');
  sword('sword_leaf', '#8fde5d', '#f6c945');
  // 활(세로로 쥔다)
  for (const [id, a] of [['bow_wood', '#b9824f'], ['bow_leaf', '#7ccf52']] as const) {
    const p = new Paint(16, 36);
    for (let y = 2; y < 34; y++) {
      const x = 4 + Math.round(Math.sin(((y - 2) / 31) * Math.PI) * 8);
      p.rect(x - 1, y, 3, 1, a);
    }
    p.volume();
    p.rect(8, 16, 4, 4, '#6e4630'); p.rect(8, 16, 4, 1, '#8a5a3c'); // 손잡이
    p.line(3, 2, 3, 33, '#ece6f4');
    p.selout().save(hi(`wp_${id}`));
  }
  // 지팡이: 위에 보석 구슬과 받침
  for (const [id, gem] of [['wand_wood', '#5aa9e6'], ['wand_leaf', '#7ccf52']] as const) {
    const p = new Paint(12, 32);
    p.rect(5, 9, 2, 22, '#8a5a3c'); p.disc(5.5, 5, 4, 4, gem);
    p.volume();
    p.rect(3, 9, 6, 2, '#e8b84a'); p.rect(3, 9, 6, 1, '#ffe08a'); p.rect(5, 13, 2, 1, '#6e4630'); p.rect(5, 20, 2, 1, '#6e4630');
    p.set(4, 3, '#ffffff'); p.set(3, 4, mix(gem, '#ffffff', 0.6)); p.set(4, 4, mix(gem, '#ffffff', 0.6));
    p.selout().save(hi(`wp_${id}`));
  }
  // 곡괭이·도끼
  const tool = (key: string, metal: string, axe: boolean) => {
    const p = new Paint(22, 28);
    p.rect(10, 4, 3, 24, '#a0703f');
    if (axe) { p.disc(15, 7, 6, 6, metal); p.rect(9, 3, 5, 8, metal); }
    else { for (let x = 1; x < 21; x++) { const y = 3 + Math.round(((x - 10.5) / 10) ** 2 * 5); p.rect(x, y, 1, 3, metal); } p.rect(8, 2, 7, 5, metal); }
    p.volume();
    p.rect(10, 18, 3, 1, '#6e4630'); p.rect(10, 22, 3, 1, '#6e4630');
    if (axe) p.rect(19, 3, 1, 9, mix(metal, '#ffffff', 0.6)); else { p.set(1, 9, mix(metal, '#ffffff', 0.6)); p.set(20, 9, mix(metal, '#ffffff', 0.6)); }
    p.selout().save(hi(key));
  };
  tool('wp_pick', '#a9b2bd', false); tool('wp_axe', '#a9b2bd', true);
  tool('wp_pick_stone', '#e0d2b8', false); tool('wp_axe_stone', '#e0d2b8', true);
  // 발사체
  let p = new Paint(11, 5);
  p.rect(1, 2, 8, 1, '#b9824f'); p.set(9, 2, '#c9d1d9'); p.set(8, 1, '#c9d1d9'); p.set(8, 3, '#c9d1d9'); p.set(1, 1, '#e9e4f0'); p.set(1, 3, '#e9e4f0');
  p.outline().save('shot_arrow');
  p = new Paint(9, 9);
  p.disc(4, 4, 3.2, 3.2, '#5aa9e6'); p.disc(3.6, 3.6, 2, 2, '#a5d8ff'); p.set(3, 3, '#ffffff');
  p.outline('#3a5a9a').save('shot_orb');
}

// ───────── 몬스터 ─────────
/** 큰 눈(흰자 + 동공 + 하이라이트) */
function bigEye(p: Paint, x: number, y: number, w = 5, h = 6.5, pupil = '#1e1420') {
  // 귀여운 몬스터 눈: 진한 타원 + 위 큰 하이라이트 + 아래 반사광
  p.disc(x, y, w / 2, h / 2, pupil);
  p.rect(Math.round(x - w / 4), Math.round(y - h / 4), 2, 2, '#ffffff');
  p.set(x + w / 4, y + h / 4, mix(pupil, '#9fd8ff', 0.6));
}
function buildMonsters() {
  const hi = (key: string) => { HI.add(key); return key; };
  // 이끼방울: 반질반질한 젤리 몸 + 이끼 덮개 + 새싹
  let p = new Paint(40, 34);
  p.disc(19.5, 22, 17, 11.5, '#58b552');
  p.rect(3, 26, 34, 6, '#58b552');
  p.volume();
  p.disc(13, 15, 5, 2.4, '#c8f59a'); p.disc(11, 14, 2, 1, '#ffffff');
  for (const [x, y, r] of [[8, 13, 4], [15, 11, 5], [24, 11, 5], [31, 14, 4]] as const) p.disc(x, y, r, r * 0.6, '#3f8c3f');
  for (const [x, y] of [[9, 11], [16, 9], [25, 9], [31, 12]] as const) p.set(x, y, '#7fd06a');
  p.line(20, 10, 20, 4, '#3f8c3f'); p.disc(23, 3, 3, 2, '#9be36f'); p.disc(17, 4, 2.4, 1.6, '#7fd06a');
  bigEye(p, 23, 21); bigEye(p, 31, 21);
  p.rect(26, 27, 4, 1, '#2a5a30'); p.set(25, 26, '#2a5a30'); p.set(30, 26, '#2a5a30');
  p.set(21, 25, '#f29a9a'); p.set(34, 25, '#f29a9a');
  p.selout().save(hi('mob_mossblob'));

  // 이끼왕: 더 크고 진한 이끼, 보석 왕관, 수염 같은 이끼
  p = new Paint(56, 50);
  p.disc(27.5, 33, 25, 16.5, '#4aa246'); p.rect(4, 38, 48, 10, '#4aa246');
  p.volume();
  p.disc(19, 24, 7, 3, '#bdf090'); p.disc(16, 23, 2.5, 1.2, '#ffffff');
  for (let i = 0; i < 7; i++) p.disc(8 + i * 6.5, 20 + (i % 2) * 2, 4.5, 2.6, '#2f7a35');
  for (let i = 0; i < 6; i++) p.rect(16 + i * 4, 41, 2, 4 + (i % 3), '#2f7a35');
  const gold = '#f2c14e';
  p.rect(14, 10, 26, 6, gold); for (const x of [14, 20, 26, 32, 38]) p.disc(x + 1, 8, 1.6, 3, gold);
  p.volume([]);
  p.disc(21, 13, 1.6, 1.6, '#d94a3e'); p.disc(27.5, 13, 2, 2, '#4a9ae0'); p.disc(34, 13, 1.6, 1.6, '#d94a3e');
  bigEye(p, 31, 30, 6, 7); bigEye(p, 42, 30, 5.5, 7);
  p.rect(33, 37, 7, 1, '#1f4a26'); p.rect(34, 38, 5, 1, '#c84a4a');
  p.selout().save(hi('mob_mossking'));

  // 돌콩이: 금 간 바위 몸, 이끼 얹은 머리, 짧은 발
  p = new Paint(40, 34);
  p.disc(19, 17, 15, 12, '#9aa3ad'); p.disc(14, 13, 8, 6, '#aeb7c0');
  p.rect(7, 27, 8, 5, '#6f7884'); p.rect(23, 27, 8, 5, '#6f7884');
  p.volume();
  p.disc(12, 7, 6, 2.4, '#5fae58'); p.disc(10, 6, 2, 1, '#9be36f');
  p.line(25, 9, 22, 14, '#5e6772'); p.line(22, 14, 24, 18, '#5e6772'); p.line(9, 20, 13, 23, '#5e6772');
  bigEye(p, 21, 16); bigEye(p, 29, 16);
  p.rect(23, 23, 5, 1, '#2a2430');
  p.selout().save(hi('mob_pebbler'));

  // 잎새깨비: 잎맥이 보이는 단풍 몸, 꼭지, 볼
  p = new Paint(40, 40);
  p.disc(19.5, 20, 13, 12, '#e8a03a');
  for (const [x, y] of [[9, 10], [30, 10], [7, 24], [32, 24], [19.5, 33]] as const) p.disc(x, y, 4, 4, '#e8a03a');
  p.volume();
  p.line(19, 8, 19, 32, '#c06a22'); for (const s2 of [-1, 1]) { p.line(19, 14, 19 + s2 * 9, 9, '#c06a22'); p.line(19, 22, 19 + s2 * 10, 22, '#c06a22'); }
  p.line(19, 7, 24, 1, '#7a4a2a'); p.line(20, 7, 25, 1, '#7a4a2a');
  bigEye(p, 23, 18); bigEye(p, 30, 18);
  p.rect(25, 25, 3, 1, '#8a3a22');
  p.set(20, 23, '#f29a9a'); p.set(33, 23, '#f29a9a');
  p.selout().save(hi('mob_leafling'));
  p = new Paint(20, 16);
  p.disc(9.5, 7.5, 8.5, 5.5, '#8fde5d'); p.line(2, 9, 17, 6, '#4f9a3c'); p.line(8, 8, 11, 4, '#4f9a3c');
  p.volume(); p.selout().save(hi('mob_leafling_wing'));
}

// ───────── 배경/지형/오브젝트 ─────────
export const THEMES = {
  town: { sky: ['#f7c59f', '#fde8c9'], far: '#d9a084', mid: '#b97a6a', grass: ['#8fc45a', '#6aa84a', '#4f8a3e'], dirt: ['#a8744e', '#8a5a3c', '#74492f'] },
  meadow: { sky: ['#8fd3ff', '#e3f6ff'], far: '#a9dcc0', mid: '#7cc49a', grass: ['#8fde5d', '#5fb859', '#3b8c4f'], dirt: ['#b07a4e', '#8a5a3c', '#6e452e'] },
  hills: { sky: ['#b9c9ea', '#f1e9e2'], far: '#b4b3c9', mid: '#8f8fae', grass: ['#b9c26a', '#93a052', '#6f7c40'], dirt: ['#9a9088', '#7b736e', '#5f5955'] },
  forest: { sky: ['#3f6f7a', '#a8d8b9'], far: '#3f7f6d', mid: '#2f6258', grass: ['#5fb88a', '#3f9670', '#2c7358'], dirt: ['#6e5a4a', '#57463a', '#43362d'] },
} as const;
export type ThemeKey = keyof typeof THEMES;

function buildTheme(name: ThemeKey) {
  const t = THEMES[name];
  // 지면 타일 96x48: 위쪽 풀(들쭉날쭉한 끝), 아래 흙(깊을수록 어둡게), 돌은 무작위로 흩어 반복이 덜 보이게
  const TW = 96;
  let p = new Paint(TW, 48);
  for (let y = 0; y < 48; y++) p.rect(0, y, TW, 1, y < 26 ? t.dirt[1] : mix(t.dirt[1], t.dirt[2], Math.min(1, (y - 26) / 30)));
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(hash(i + 1) * TW), y = 9 + Math.floor(hash(i + 77) * 39);
    p.rect(x, y, hash(i + 5) > 0.6 ? 2 : 1, 1, hash(i + 9) > 0.55 ? mix(t.dirt[1], t.dirt[0], 0.6) : t.dirt[2]);
  }
  // 돌: 겹치지 않게 무작위 배치(좌우는 이어지도록 가장자리 피함)
  const stones: [number, number, number][] = [];
  for (let i = 0; stones.length < 9 && i < 200; i++) {
    const r = 1.6 + hash(i * 3 + 400) * 2.6, x = 4 + hash(i * 7 + 300) * (TW - 8), y = 14 + hash(i * 11 + 500) * 30;
    if (stones.every(([sx, sy, sr]) => Math.hypot(sx - x, (sy - y) * 1.4) > sr + r + 5)) stones.push([x, y, r]);
  }
  for (const [x, y, r] of stones) {
    const rock = mix(t.dirt[0], '#b8b0a4', 0.35);
    p.disc(x, y, r + 1, r * 0.75 + 1, mix(t.dirt[2], OUT, 0.5)); p.disc(x, y, r, r * 0.75, rock);
    p.disc(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.3, mix(rock, '#ffffff', 0.3));
    p.rect(Math.round(x - r + 1), Math.round(y + r * 0.45), Math.max(1, Math.round(r * 2 - 1)), 1, mix(rock, t.dirt[2], 0.6));
  }
  // 풀: 윗단 + 아래로 늘어진 들쭉날쭉한 끝
  p.rect(0, 0, TW, 6, t.grass[1]);
  p.rect(0, 0, TW, 2, t.grass[0]);
  for (let x = 0; x < TW; x++) {
    const d = Math.floor(hash(x + 31) * 3) + (hash(Math.floor(x / 5) + 90) > 0.6 ? 2 : 0);
    p.rect(x, 6, 1, d, t.grass[1]); p.set(x, 6 + d, t.grass[2]); p.set(x, 7 + d, mix(t.dirt[2], OUT, 0.3));
    if (hash(x + 200) > 0.8) p.set(x, 2, t.grass[2]);
    if (hash(x + 260) > 0.85) p.set(x, 3, mix(t.grass[0], '#ffffff', 0.3));
  }
  p.save(`tile_${name}`);

  // 발판 조각: 왼끝/가운데/오른끝 (각 16x12)
  for (const part of ['l', 'm', 'r'] as const) {
    p = new Paint(16, 12);
    const x0 = part === 'l' ? 2 : 0, x1 = part === 'r' ? 14 : 16;
    p.rect(x0, 1, x1 - x0, 9, t.dirt[1]);
    p.rect(x0 + (part === 'l' ? 1 : 0), 9, x1 - x0 - (part === 'm' ? 0 : 1), 2, t.dirt[2]);
    p.rect(x0 - (part === 'l' ? 1 : 0), 0, x1 - x0 + (part === 'm' ? 0 : 1), 4, t.grass[1]);
    p.rect(x0 - (part === 'l' ? 1 : 0), 0, x1 - x0 + (part === 'm' ? 0 : 1), 2, t.grass[0]);
    for (let x = x0; x < x1; x++) if (hash(x + 50) > 0.5) p.set(x, 4, t.grass[2]);
    for (let i = 0; i < 4; i++) p.set(x0 + 1 + Math.floor(hash(i + 60) * (x1 - x0 - 2)), 6 + Math.floor(hash(i + 70) * 3), t.dirt[0]);
    if (part === 'm') {
      // 가운데 조각은 이어 붙이므로 외곽선을 위아래만
      for (let x = 0; x < 16; x++) p.set(x, 11, OUT);
      p.save(`plat_${name}_m`);
    } else {
      p.outline();
      // 가운데와 맞닿는 쪽 외곽선 제거
      p.save(`plat_${name}_${part}`);
    }
  }

  // 원경 언덕 (가로 반복 가능: 사인 합성)
  for (const [layer, col, amp, base] of [['far', t.far, 14, 34], ['mid', t.mid, 20, 30]] as const) {
    const W = 256, H = 90;
    p = new Paint(W, H);
    for (let x = 0; x < W; x++) {
      const a = (x / W) * Math.PI * 2;
      const k = layer === 'far' ? 1 : 2;
      const y = base - Math.sin(a * (1 + k) + k) * amp * 0.6 - Math.sin(a * (3 + k) + 1.7 * k) * amp * 0.4;
      p.rect(x, Math.round(y), 1, H, col);
      if (name === 'forest' || layer === 'mid') {
        // 나무 실루엣
        if (x % (layer === 'far' ? 9 : 13) === 0) {
          const h = 8 + hash(x + (layer === 'far' ? 5 : 40)) * 12;
          p.disc(x, y - h * 0.5, 4 + hash(x) * 3, h * 0.6, col);
        }
      }
    }
    p.save(`hill_${name}_${layer}`);
  }
}

function buildObjects() {
  // 나무(참나무 / 은빛나무): 줄기와 수관을 분리해 수관만 흔든다
  for (const [id, leaf, trunk] of [['oak', ['#3b8c4f', '#5fb859', '#8fde5d'], ['#8a5a3c', '#6b4530']], ['silvertree', ['#7fa8b8', '#a9d3dc', '#e3f6f5'], ['#b8b0c8', '#8d86a3']]] as const) {
    let p = new Paint(18, 30);
    p.rect(6, 0, 6, 28, trunk[0]); p.rect(10, 0, 2, 28, trunk[1]);
    p.rect(4, 26, 10, 3, trunk[0]); p.rect(12, 26, 2, 3, trunk[1]);
    p.set(7, 8, trunk[1]); p.set(8, 15, trunk[1]); p.set(7, 21, trunk[1]);
    p.outline().save(`node_${id}_trunk`);
    p = new Paint(44, 36);
    p.disc(21.5, 21, 19, 12, leaf[0]);
    p.disc(13, 14, 10, 9, leaf[0]); p.disc(30, 13, 11, 10, leaf[0]);
    p.disc(21, 17, 16, 10, leaf[1]); p.disc(14, 12, 8, 7, leaf[1]); p.disc(29, 11, 9, 8, leaf[1]);
    p.disc(13, 9, 5, 3.5, leaf[2]); p.disc(28, 8, 6, 3.5, leaf[2]); p.disc(21, 15, 5, 2.5, leaf[2]);
    p.outline().save(`node_${id}_top`);
  }
  // 광맥
  let p = new Paint(34, 24);
  p.disc(12, 15, 11, 8, '#8d97a3'); p.disc(23, 16, 9, 7, '#7b8591'); p.disc(16, 10, 8, 7, '#a6afb9');
  p.disc(13, 8, 4, 2.5, '#c9d1d9');
  p.rect(0, 22, 34, 2, null);
  for (const [x, y] of [[8, 14], [18, 12], [25, 15], [14, 18], [22, 9]]) { p.disc(x, y, 2, 1.6, '#d9574a'); p.set(x - 1, y - 1, '#f6a08a'); }
  p.outline().save('node_redrock');

  // 포탈: 고리와 안쪽 소용돌이
  p = new Paint(30, 44);
  p.disc(14.5, 22, 13, 20, '#8a6fd1'); p.disc(14.5, 22, 10, 17, null);
  p.disc(8, 8, 2, 3, '#b9a5f0');
  p.outline().save('portal_ring');
  p = new Paint(24, 38);
  p.disc(11.5, 18.5, 10.5, 17.5, '#a5d8ff');
  p.disc(11.5, 18.5, 7.5, 13, '#d6f0ff'); p.disc(11.5, 18.5, 3.5, 7, '#ffffff');
  p.save('portal_glow');
  p = new Paint(30, 44);
  p.disc(14.5, 22, 13, 20, '#6a7480'); p.disc(14.5, 22, 10, 17, '#3d4450');
  p.rect(13, 16, 4, 8, '#9aa3ad'); p.rect(12, 19, 6, 6, '#c9d1d9'); p.set(14, 21, OUT); p.set(15, 21, OUT); p.set(14, 22, OUT);
  p.outline().save('portal_locked');

  // 제작대(모루 + 작업대)
  p = new Paint(34, 22);
  p.rect(2, 10, 30, 4, '#b9824f'); p.rect(2, 13, 30, 1, '#8a5a3c');
  p.rect(4, 14, 4, 8, '#8a5a3c'); p.rect(26, 14, 4, 8, '#8a5a3c');
  p.rect(12, 4, 12, 3, '#6a7480'); p.rect(10, 3, 5, 2, '#9aa3ad'); p.rect(15, 7, 6, 3, '#555e69'); p.rect(13, 3, 10, 1, '#c9d1d9');
  p.outline().save('obj_craft');

  // 창고 상자
  p = new Paint(24, 18);
  p.rect(1, 5, 22, 12, '#a8744e'); p.rect(1, 1, 22, 5, '#c98a5e'); p.rect(1, 5, 22, 1, '#74492f');
  p.rect(0, 1, 1, 16, '#74492f'); p.rect(23, 1, 1, 16, '#74492f');
  p.rect(1, 10, 22, 1, '#8a5a3c'); p.rect(10, 4, 4, 5, '#f6c945'); p.set(11, 6, '#8a6a1e'); p.set(12, 6, '#8a6a1e');
  p.rect(3, 2, 6, 1, '#e8b88a');
  p.outline().save('obj_storage');

  // 잡화점 노점: 줄무늬 차양 + 진열대
  p = new Paint(40, 34);
  for (let x = 0; x < 40; x++) p.rect(x, 0, 1, 7, Math.floor(x / 5) % 2 ? '#f2f0e6' : '#d9574a');
  for (let x = 0; x < 40; x += 5) p.disc(x + 2.5, 7, 2.5, 1.5, Math.floor(x / 5) % 2 ? '#f2f0e6' : '#d9574a');
  p.rect(3, 9, 2, 25, '#8a5a3c'); p.rect(35, 9, 2, 25, '#8a5a3c');
  p.rect(2, 22, 36, 4, '#b9824f'); p.rect(2, 25, 36, 1, '#8a5a3c'); p.rect(4, 26, 32, 8, '#a8744e');
  p.disc(10, 20, 2.5, 2, '#d9574a'); p.disc(16, 20, 2.5, 2, '#f6c945'); p.disc(24, 20, 3, 2, '#8fde5d'); p.disc(31, 20, 2.5, 2, '#7fc4ff');
  p.outline().save('obj_shop');

  // 모닥불 장작
  p = new Paint(20, 8);
  p.line(2, 6, 17, 2, '#8a5a3c'); p.line(2, 2, 17, 6, '#6b4530'); p.line(2, 5, 17, 1, '#8a5a3c'); p.line(2, 3, 17, 7, '#6b4530');
  p.outline().save('obj_logs');
  p = new Paint(8, 10);
  p.disc(3.5, 6, 3, 3.5, '#f6c945'); p.disc(3.5, 2.5, 1.4, 2.5, '#f6c945'); p.disc(3.5, 7, 1.6, 2, '#fff3b0');
  p.save('fx_flame');

  // 로프(세로로 반복)와 대상 강조 화살표
  p = new Paint(5, 8);
  p.rect(1, 0, 3, 8, '#c9a26a'); p.rect(3, 0, 1, 8, '#a07c48'); p.rect(1, 3, 3, 1, '#8a6a3c'); p.rect(1, 7, 3, 1, '#8a6a3c');
  p.rect(0, 0, 1, 8, OUT); p.rect(4, 0, 1, 8, OUT);
  p.save('rope');
  p = new Paint(9, 5);
  p.rect(1, 1, 7, 3, '#8a6a3c'); p.outline().save('rope_knot');
  p = new Paint(11, 9);
  for (let y = 0; y < 5; y++) p.rect(1 + y, 1 + y, 9 - y * 2, 1, y < 2 ? '#ffe98a' : '#f6c945');
  p.rect(4, 0, 3, 2, '#ffe98a');
  p.outline().save('ui_arrow');

  // 장식: 풀/꽃, 구름, 파티클, 그림자, 코인
  p = new Paint(9, 7);
  p.line(4, 6, 4, 2, '#3b8c4f'); p.line(3, 6, 1, 3, '#5fb859'); p.line(5, 6, 7, 3, '#5fb859');
  p.save('deco_grass');
  for (const [i, col] of [[0, '#ffffff'], [1, '#f6c945'], [2, '#f2a0c8']] as const) {
    p = new Paint(7, 10);
    p.line(3, 9, 3, 4, '#3b8c4f'); p.set(2, 7, '#5fb859');
    p.disc(3, 2.5, 2.4, 2.4, col); p.set(3, 2, '#e8a23c'); p.set(3, 3, '#e8a23c');
    p.outline().save(`deco_flower${i}`);
  }
  p = new Paint(48, 16);
  p.disc(14, 10, 10, 5, '#ffffff'); p.disc(26, 7, 10, 6.5, '#ffffff'); p.disc(36, 10, 9, 5, '#ffffff'); p.rect(6, 11, 36, 4, '#ffffff');
  p.save('cloud');
  p = new Paint(4, 4); p.rect(0, 0, 4, 4, '#ffffff'); p.save('fx_px');
  p = new Paint(7, 7); p.disc(3, 3, 3, 3, '#ffffff'); p.save('fx_puff');
  p = new Paint(18, 5); p.disc(8.5, 2, 8.5, 2, '#000000'); p.save('shadow');
  p = new Paint(9, 9);
  p.disc(4, 4, 3.4, 3.4, '#f6c945'); p.disc(3.4, 3.4, 2, 2, '#ffe98a'); p.rect(4, 3, 1, 3, '#c9972a');
  p.outline().save('it_coin');
}

function buildItems() {
  let p = new Paint(12, 12);
  p.disc(5.5, 6.5, 4.5, 3.5, '#5fb859'); p.disc(4.5, 5.5, 2.5, 1.8, '#8fde5d'); p.set(8, 8, '#3b8c4f'); p.set(3, 8, '#3b8c4f');
  p.outline().save('it_moss');
  p = new Paint(12, 12);
  p.disc(5.5, 6.5, 4.2, 3.4, '#9aa3ad'); p.disc(4.5, 5.5, 2.2, 1.5, '#c9d1d9'); p.rect(7, 8, 2, 1, '#6a7480');
  p.outline().save('it_pebble');
  p = new Paint(12, 12);
  p.disc(5.5, 5.5, 3.6, 4.4, '#e8a23c'); p.line(5, 2, 6, 9, '#c77f2a'); p.line(6, 9, 8, 11, '#8a5a3c'); p.set(4, 4, '#f6c95a');
  p.outline().save('it_leaf');
  for (const [id, a, b, c] of [['log', '#b9824f', '#8a5a3c', '#e8c08a'], ['silverlog', '#cfc8dc', '#9d96b3', '#f1eef8']] as const) {
    p = new Paint(13, 11);
    p.rect(2, 3, 9, 6, a); p.rect(2, 7, 9, 2, b); p.disc(10.5, 5.5, 2, 3, c); p.set(10, 5, b); p.rect(4, 4, 3, 1, c);
    p.outline().save(`it_${id}`);
  }
  p = new Paint(12, 12);
  p.disc(5.5, 6.5, 4.4, 3.6, '#8d97a3'); p.disc(4, 5.5, 1.8, 1.4, '#d9574a'); p.disc(7.5, 7.5, 1.6, 1.3, '#d9574a'); p.set(3, 5, '#f6a08a'); p.set(6, 3, '#c9d1d9');
  p.outline().save('it_ore');
  p = new Paint(13, 11);
  p.disc(6, 6, 5, 4, '#5fb859'); p.rect(0, 7, 13, 4, null); p.rect(1, 7, 11, 2, '#3b8c4f'); p.disc(5, 4, 2, 1.2, '#8fde5d'); p.set(6, 1, '#8fde5d');
  p.outline().save('it_hat_moss');
  p = new Paint(12, 12);
  p.rect(2, 2, 8, 9, '#b9824f'); p.rect(4, 2, 4, 2, null); p.rect(2, 8, 8, 1, '#8a5a3c'); p.rect(2, 5, 8, 1, '#8a5a3c'); p.rect(5, 4, 1, 7, '#8a5a3c');
  p.outline().save('it_armor_log');
  // 장신구
  p = new Paint(12, 12); p.disc(5.5, 6.5, 4, 4, '#f6c945'); p.disc(5.5, 6.5, 2.4, 2.4, null); p.disc(5.5, 2.5, 2, 1.6, '#5fb859'); p.set(5, 2, '#b4f08a'); p.outline().save('it_ring');
  p = new Paint(12, 12); p.line(2, 0, 5, 4, '#8a5a3c'); p.line(9, 0, 6, 4, '#8a5a3c'); p.disc(5.5, 7, 3.6, 3.6, '#9aa3ad'); p.disc(5, 6, 1.6, 1.6, '#c9d1d9'); p.outline().save('it_charm');
  // 음식
  p = new Paint(12, 12); p.disc(4, 7, 2.6, 2.6, '#d9574a'); p.disc(7.5, 7.5, 2.6, 2.6, '#e25d4e'); p.disc(5.8, 4.8, 2.4, 2.2, '#f06a5a');
  p.set(3, 6, '#ffb0a0'); p.set(7, 7, '#ffb0a0'); p.line(6, 2, 7, 0, '#3b8c4f'); p.set(5, 1, '#5fb859'); p.outline().save('it_berry');
  p = new Paint(12, 12); p.disc(5.5, 5, 5, 3.4, '#c9805a'); p.rect(4, 6, 3, 5, '#f2e6d0'); p.set(3, 3, '#f2e6d0'); p.set(7, 4, '#f2e6d0'); p.set(5, 2, '#f2e6d0');
  p.outline().save('it_mushroom');
  // 모루 생산품·가방·주머니·열쇠·왕관 아이콘
  p = new Paint(12, 12); p.disc(5.5, 6, 4, 3.6, '#c9a26a'); p.line(2, 5, 9, 7, '#8a6a3c'); p.line(2, 8, 9, 4, '#8a6a3c'); p.outline().save('it_twine');
  p = new Paint(12, 12); p.rect(2, 2, 7, 2, '#c9d1d9'); p.rect(5, 4, 2, 7, '#9aa3ad'); p.set(5, 10, '#6a7480'); p.outline().save('it_nail');
  p = new Paint(13, 11); p.rect(1, 3, 11, 5, '#d9a066'); p.rect(1, 6, 11, 2, '#b07a4e'); p.set(4, 4, '#8a5a3c'); p.set(9, 5, '#8a5a3c'); p.outline().save('it_plank');
  for (const [k, col] of [['it_bag', '#a8744e'], ['it_bag2', '#6b4a3a']] as const) {
    p = new Paint(12, 12); p.rect(2, 4, 8, 7, col); p.line(4, 4, 4, 2, col); p.line(7, 4, 7, 2, col); p.line(4, 1, 7, 1, col); p.rect(5, 6, 2, 2, '#f6c945'); p.outline().save(k);
  }
  for (const [k, col] of [['it_pouch', '#8fde5d'], ['it_pouch2', '#c9a26a'], ['it_pouch3', '#f2a0c8']] as const) {
    p = new Paint(12, 12); p.disc(5.5, 7, 4, 3.6, col); p.rect(4, 2, 3, 2, col); p.line(3, 4, 8, 4, '#6b4a3a'); p.outline().save(k);
  }
  p = new Paint(12, 12); p.disc(3.5, 4, 2.6, 2.6, '#f6c945'); p.set(3, 4, null); p.rect(5, 4, 6, 1, '#f6c945'); p.rect(9, 5, 1, 2, '#f6c945'); p.rect(7, 5, 1, 2, '#f6c945'); p.outline().save('it_key');
  p = new Paint(12, 10); p.rect(1, 4, 10, 5, '#f6c945'); p.set(1, 2, '#f6c945'); p.set(1, 3, '#f6c945'); p.set(5, 1, '#f6c945'); p.rect(5, 2, 2, 2, '#f6c945'); p.set(10, 2, '#f6c945'); p.set(10, 3, '#f6c945'); p.set(3, 6, '#d9574a'); p.set(8, 6, '#7fc4ff'); p.rect(2, 5, 8, 1, '#5fb859'); p.outline().save('it_crown');
}

export const ITEM_ICON: Record<string, string> = {
  moss: 'it_moss', pebble: 'it_pebble', leaf: 'it_leaf', log: 'it_log', ore: 'it_ore', silverlog: 'it_silverlog',
  sword_wood: 'wp_sword_wood', sword_stone: 'wp_sword_stone', sword_leaf: 'wp_sword_leaf',
  bow_wood: 'wp_bow_wood', bow_leaf: 'wp_bow_leaf', wand_wood: 'wp_wand_wood', wand_leaf: 'wp_wand_leaf',
  hat_moss: 'it_hat_moss', armor_log: 'it_armor_log', pick_stone: 'wp_pick_stone', axe_stone: 'wp_axe_stone',
  moss_ring: 'it_ring', pebble_charm: 'it_charm', anvil_exp: 'obj_craft',
  coin: 'it_coin', berry: 'it_berry', mushroom: 'it_mushroom',
  twine: 'it_twine', nail: 'it_nail', plank: 'it_plank', bag_small: 'it_bag', bag_leather: 'it_bag2', pouch_mat: 'it_pouch', pouch_res: 'it_pouch2', pouch_food: 'it_pouch3',
  chest_small: 'obj_storage', forest_key: 'it_key', moss_crown: 'it_crown',
};

// ───────── 아이콘 세트 ─────────
function icon(key: string, draw: (p: Paint) => void, size = 16) { const p = new Paint(size, size); draw(p); p.outline().save(key); }
const C = {
  steel: '#a9b1bd', steelD: '#6f7887', gold: '#f2c14e', goldD: '#c08a2a', red: '#e0483e', redD: '#a52a2a', blue: '#4a90e2', blueD: '#2c5ea8',
  green: '#5cc25a', greenD: '#3a8a3c', wood: '#b07a4a', woodD: '#7a4f2e', paper: '#f1e3c0', paperD: '#cdb788', purple: '#9b6ad8', white: '#f4f4f4', skin: '#f2c9a0',
};
function buildIcons() {
  // 메뉴
  icon('ui_auto', (p) => { p.disc(7.5, 7.5, 7, 7, C.green); p.disc(7.5, 7.5, 4.5, 4.5, null); p.rect(6, 0, 4, 4, null); p.line(9, 0, 12, 3, C.green); p.line(10, 1, 12, 1, C.green); p.rect(5, 5, 6, 6, C.white); p.rect(6, 6, 4, 4, C.green); });
  icon('ui_attacks', (p) => { p.line(2, 13, 13, 2, C.steel); p.line(3, 13, 14, 2, C.steel); p.line(2, 2, 13, 13, C.steel); p.line(2, 3, 13, 14, C.steel); p.rect(1, 12, 3, 3, C.wood); p.rect(12, 12, 3, 3, C.wood); p.line(3, 10, 6, 13, C.gold); p.line(10, 13, 13, 10, C.gold); });
  icon('ui_items', (p) => { p.disc(7.5, 9.5, 6.5, 5.5, C.wood); p.rect(5, 2, 6, 4, C.wood); p.rect(6, 3, 4, 2, null); p.rect(3, 8, 10, 2, C.woodD); p.rect(7, 8, 2, 3, C.gold); });
  icon('ui_talents', (p) => { p.rect(2, 1, 12, 14, C.purple); p.rect(3, 2, 10, 12, '#7d4fb8'); p.disc(8, 8, 3.5, 3.5, C.gold); p.disc(8, 8, 1.5, 1.5, '#fff1a8'); p.rect(2, 13, 12, 2, C.paper); });
  icon('ui_codex', (p) => { p.rect(1, 3, 7, 11, C.paper); p.rect(8, 3, 7, 11, C.paper); p.rect(7, 2, 2, 13, C.woodD); for (const y of [5, 7, 9, 11]) { p.rect(2, y, 4, 1, C.paperD); p.rect(10, y, 4, 1, C.paperD); } });
  icon('ui_map', (p) => { p.rect(1, 2, 14, 12, C.paper); p.rect(1, 2, 1, 12, C.paperD); p.rect(14, 2, 1, 12, C.paperD); p.line(3, 11, 7, 7, C.redD); p.line(7, 7, 11, 9, C.redD); p.disc(12, 5, 1.6, 1.6, C.red); p.disc(4, 5, 1.5, 1, C.green); });
  icon('ui_chat', (p) => { p.rect(1, 2, 14, 9, C.white); p.rect(2, 1, 12, 11, C.white); p.rect(3, 11, 3, 2, C.white); p.set(3, 13, C.white); for (const x of [4, 7, 10]) p.rect(x, 5, 2, 2, C.steelD); });
  icon('ui_menu', (p) => { p.disc(7.5, 7.5, 6.5, 6.5, C.steel); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.rect(7 + Math.round(Math.cos(a) * 6.5), 7 + Math.round(Math.sin(a) * 6.5), 2, 2, C.steel); } p.disc(7.5, 7.5, 2.5, 2.5, '#3a3f48'); });
  // HUD·기타
  icon('ui_heart', (p) => { p.disc(5, 6, 3.5, 3.5, C.red); p.disc(10.5, 6, 3.5, 3.5, C.red); for (let y = 7; y < 14; y++) p.rect(2 + (y - 7), y, 12 - (y - 7) * 2 + 1, 1, C.red); });
  icon('ui_mana', (p) => { p.disc(7.5, 10, 5, 4.5, C.blue); for (let y = 2; y < 8; y++) p.rect(7 - Math.floor((y - 2) / 2), y, 1 + Math.floor((y - 2) / 2) * 2 + 1, 1, C.blue); });
  icon('ui_xp', (p) => { for (let y = 0; y < 16; y++) { const w = y < 6 ? y : y < 9 ? 15 - (y - 6) * 2 : (15 - y) ; if (w > 0) p.rect(8 - Math.ceil(w / 2), y, w, 1, C.gold); } p.disc(7.5, 8, 3, 3, C.gold); });
  icon('ui_afk', (p) => { p.rect(3, 1, 10, 2, C.wood); p.rect(3, 13, 10, 2, C.wood); for (let y = 3; y < 13; y++) { const w = Math.abs(y - 8) + 1; p.rect(8 - w, y, w * 2, 1, '#a7d8f0'); } p.rect(6, 10, 4, 3, C.gold); });
  icon('ui_options', (p) => { p.rect(2, 3, 12, 2, C.steel); p.rect(2, 7, 12, 2, C.steel); p.rect(2, 11, 12, 2, C.steel); p.rect(4, 2, 3, 4, C.gold); p.rect(9, 6, 3, 4, C.gold); p.rect(5, 10, 3, 4, C.gold); });
  icon('ui_swap', (p) => { p.disc(5, 5, 3, 3, C.skin); p.rect(2, 9, 6, 5, C.blue); p.disc(11, 6, 3, 3, C.skin); p.rect(8, 10, 6, 5, C.red); p.line(6, 1, 10, 1, C.gold); p.set(9, 0, C.gold); p.set(9, 2, C.gold); });
  icon('ui_quest', (p) => { p.rect(3, 1, 10, 14, C.paper); p.rect(2, 1, 12, 2, C.paperD); p.rect(2, 13, 12, 2, C.paperD); p.rect(7, 4, 2, 5, C.red); p.rect(7, 10, 2, 2, C.red); });
  icon('ui_card', (p) => { p.rect(3, 1, 10, 14, C.steel); p.rect(4, 2, 8, 9, '#5a7fb8'); p.disc(8, 6, 2.5, 2.5, C.green); p.rect(4, 12, 8, 2, C.paper); });
  icon('ui_quick', (p) => { p.rect(2, 4, 12, 10, C.wood); p.rect(2, 4, 12, 3, C.woodD); p.rect(7, 6, 2, 3, C.gold); p.disc(11.5, 3.5, 3, 3, '#a7d8f0'); p.disc(11.5, 3.5, 1.6, 1.6, null); p.line(13, 6, 15, 8, C.steelD); });
  icon('ui_teleport', (p) => { p.disc(7.5, 8, 6, 7, C.purple); p.disc(7.5, 8, 4, 5, '#c8b2f0'); p.disc(7.5, 8, 2, 3, C.white); });
  icon('ui_assign', (p) => { p.rect(3, 0, 2, 16, C.woodD); p.rect(5, 1, 10, 8, C.red); p.rect(12, 3, 3, 4, null); p.rect(13, 4, 2, 2, C.red); p.line(7, 3, 9, 5, C.gold); p.line(9, 5, 7, 7, C.gold); });
  icon('ui_trash', (p) => { p.rect(3, 4, 10, 11, C.steel); p.rect(2, 2, 12, 2, C.steelD); p.rect(6, 1, 4, 1, C.steelD); for (const x of [5, 8, 11]) p.rect(x, 6, 1, 7, C.steelD); });
  icon('ui_up', (p) => { for (let y = 2; y < 9; y++) p.rect(8 - (y - 1), y, (y - 1) * 2, 1, C.green); p.rect(5, 9, 6, 5, C.green); });
  icon('ui_lock', (p) => { p.disc(8, 5, 4, 4, C.steel); p.disc(8, 5, 2, 2, null); p.rect(3, 7, 10, 8, C.gold); p.rect(7, 9, 2, 3, C.woodD); });
  icon('ui_coin', (p) => { p.disc(7.5, 7.5, 6.5, 6.5, C.gold); p.disc(7.5, 7.5, 4, 4, '#ffd76e'); p.rect(7, 4, 2, 7, C.goldD); });
  icon('ui_sound', (p) => { p.rect(2, 5, 4, 6, C.steel); for (let y = 2; y < 14; y++) p.rect(6, y, Math.max(1, 5 - Math.abs(y - 8) / 2), 1, C.steel); p.line(12, 5, 13, 8, C.white); p.line(13, 8, 12, 11, C.white); p.line(14, 3, 15, 8, C.white); p.line(15, 8, 14, 13, C.white); });
  icon('ui_music', (p) => { p.rect(5, 2, 2, 10, C.gold); p.rect(11, 1, 2, 10, C.gold); p.rect(5, 1, 8, 2, C.gold); p.disc(4.5, 12, 2.5, 2, C.gold); p.disc(10.5, 11, 2.5, 2, C.gold); });
  // 빈 장비 칸 실루엣(회색)
  const sil = '#5a606b';
  icon('eq_weapon', (p) => { p.line(3, 12, 12, 3, sil); p.line(4, 12, 13, 3, sil); p.rect(2, 11, 4, 2, sil); p.rect(2, 12, 2, 3, sil); });
  icon('eq_hat', (p) => { p.disc(8, 8, 5, 4, sil); p.rect(1, 10, 14, 2, sil); });
  icon('eq_body', (p) => { p.rect(4, 3, 8, 10, sil); p.rect(1, 3, 3, 5, sil); p.rect(12, 3, 3, 5, sil); p.rect(6, 2, 4, 1, null); });
  icon('eq_ring', (p) => { p.disc(8, 9, 5, 5, sil); p.disc(8, 9, 3, 3, null); p.disc(8, 3.5, 2, 1.6, sil); });
  icon('eq_pickaxe', (p) => { p.rect(7, 4, 2, 11, sil); p.line(1, 5, 7, 2, sil); p.line(9, 2, 15, 5, sil); p.rect(6, 2, 4, 3, sil); });
  icon('eq_axe', (p) => { p.rect(7, 2, 2, 13, sil); p.disc(11, 6, 4, 4, sil); });
  icon('eq_food', (p) => { p.disc(8, 9, 5.5, 5, sil); p.line(8, 4, 10, 1, sil); p.disc(11, 3, 1.6, 1, sil); });
  // 능력치
  icon('st_str', (p) => { p.rect(3, 5, 10, 8, C.skin); p.rect(3, 3, 3, 3, C.skin); p.rect(6, 2, 3, 4, C.skin); p.rect(9, 3, 3, 3, C.skin); p.rect(12, 6, 2, 4, C.skin); p.rect(4, 12, 8, 3, C.red); });
  icon('st_agi', (p) => { p.rect(5, 1, 5, 9, C.green); p.rect(3, 9, 11, 4, C.green); p.rect(3, 12, 12, 2, C.woodD); p.line(1, 4, 4, 4, C.white); p.line(0, 7, 4, 7, C.white); });
  icon('st_wis', (p) => { p.rect(2, 2, 12, 12, C.blue); p.rect(3, 3, 10, 9, '#6fb0f0'); p.rect(2, 12, 12, 2, C.paper); p.disc(8, 7, 2.5, 2.5, C.white); p.disc(8, 7, 1, 1, C.blueD); });
  icon('st_luk', (p) => { for (const [x, y] of [[5, 4], [10, 4], [5, 9], [10, 9]]) p.disc(x, y, 3, 3, C.green); p.disc(7.5, 6.5, 1.5, 1.5, C.green); p.line(8, 9, 11, 15, C.greenD); });
  // 특성(틀 안에 들어가는 그림)
  icon('tl_smash', (p) => { p.rect(6, 6, 3, 10, C.wood); p.rect(2, 1, 11, 6, C.steel); p.rect(2, 1, 11, 2, C.white); for (const [x, y] of [[1, 9], [13, 10], [12, 13]]) p.rect(x, y, 2, 2, C.gold); });
  icon('tl_heal', (p) => { p.disc(7.5, 9, 6, 6, C.red); p.rect(6, 1, 4, 4, C.paper); p.rect(6, 6, 4, 8, C.white); p.rect(3, 8, 10, 4, C.white); });
  icon('tl_sharp', (p) => { p.line(3, 13, 12, 4, C.steel); p.line(4, 13, 13, 4, C.steel); p.line(4, 12, 13, 3, C.white); p.rect(1, 12, 4, 3, C.wood); p.set(13, 1, C.gold); p.set(14, 2, C.gold); p.set(12, 0, C.gold); });
  icon('tl_tough', (p) => { p.disc(7.5, 7, 6.5, 6.5, C.steel); for (let y = 10; y < 15; y++) p.rect(2 + (y - 10), y, 12 - (y - 10) * 2, 1, C.steel); p.disc(5.5, 6, 2, 2, C.red); p.disc(9.5, 6, 2, 2, C.red); p.rect(5, 7, 6, 2, C.red); p.rect(6, 9, 4, 1, C.red); });
  icon('tl_idler', (p) => { p.rect(3, 1, 10, 2, C.wood); p.rect(3, 13, 10, 2, C.wood); for (let y = 3; y < 13; y++) { const w = Math.abs(y - 8) + 1; p.rect(8 - w, y, w * 2, 1, '#a7d8f0'); } p.rect(6, 4, 4, 2, C.gold); p.rect(5, 11, 6, 2, C.gold); });
  icon('tl_worker', (p) => { p.rect(7, 4, 2, 11, C.wood); p.line(1, 4, 7, 1, C.steel); p.line(9, 1, 15, 4, C.steel); p.rect(6, 1, 4, 3, C.steelD); p.disc(4, 12, 3, 2.5, C.gold); });
  icon('tl_cleave', (p) => { p.rect(7, 2, 2, 14, C.wood); p.disc(10, 5, 5, 4.5, C.steel); p.rect(7, 0, 2, 10, C.wood); p.line(1, 12, 5, 8, C.red); p.line(2, 14, 6, 10, C.red); });
  icon('tl_ironskin', (p) => { p.rect(2, 1, 12, 8, C.steel); for (let y = 9; y < 16; y++) p.rect(2 + (y - 9), y, 12 - (y - 9) * 2, 1, C.steel); p.rect(7, 2, 2, 11, C.steelD); p.rect(3, 5, 10, 2, C.steelD); });
  icon('tl_volley', (p) => { for (const o of [0, 4, 8]) { p.line(1, 12 - o, 11, 2 + o / 2, C.wood); p.rect(11, 1 + o / 2, 3, 2, C.steel); p.rect(0, 11 - o, 2, 3, C.red); } });
  icon('tl_swift', (p) => { p.line(1, 14, 13, 2, C.wood); p.rect(12, 1, 3, 3, C.steel); p.rect(1, 11, 3, 4, C.green); for (const y of [5, 8, 11]) p.line(4, y, 8, y - 4, '#d8f0ff'); });
  icon('tl_nova', (p) => { p.disc(7.5, 7.5, 3, 3, C.white); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 5 : 7; p.line(7.5, 7.5, 7.5 + Math.cos(a) * r, 7.5 + Math.sin(a) * r, i % 2 ? '#a7d8f0' : C.gold); } });
  icon('tl_insight', (p) => { p.disc(7.5, 8, 7, 4.5, C.white); p.disc(7.5, 8, 3.5, 3.5, C.blue); p.disc(7.5, 8, 1.5, 1.5, '#1a2a4a'); p.set(6, 6, C.white); });
}

/** 기존 그림을 2배 해상도로: Scale2x(대각선을 매끄럽게) 후 검정 외곽선을 짙은 색 외곽선으로 */
function upscale(key: string, wrap = false) {
  const src = canvases.get(key);
  if (!src || HI.has(key)) return;
  const w = src.width, h = src.height, sd = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const P = (x: number, y: number) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); }
    const i = (y * w + x) * 4;
    return ((sd[i] << 24) | (sd[i + 1] << 16) | (sd[i + 2] << 8) | sd[i + 3]) >>> 0;
  };
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d')!, od = ctx.createImageData(w * 2, h * 2), o = od.data;
  const put = (x: number, y: number, v: number) => { const i = (y * w * 2 + x) * 4; o[i] = v >>> 24; o[i + 1] = (v >>> 16) & 255; o[i + 2] = (v >>> 8) & 255; o[i + 3] = v & 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const E = P(x, y), B = P(x, y - 1), D = P(x - 1, y), F = P(x + 1, y), H = P(x, y + 1);
    put(x * 2, y * 2, D === B && B !== F && D !== H ? D : E);
    put(x * 2 + 1, y * 2, B === F && B !== D && F !== H ? F : E);
    put(x * 2, y * 2 + 1, D === H && D !== B && H !== F ? D : E);
    put(x * 2 + 1, y * 2 + 1, H === F && D !== H && B !== F ? F : E);
  }
  // 검정에 가까운 외곽선 → 이웃 색의 가장 어두운 단계
  const [or, og, ob] = toRgb(OUT), W2 = w * 2, H2 = h * 2;
  const isOut = (i: number) => o[i + 3] > 0 && Math.abs(o[i] - or) < 6 && Math.abs(o[i + 1] - og) < 6 && Math.abs(o[i + 2] - ob) < 6;
  const copy = new Uint8ClampedArray(o);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const i = (y * W2 + x) * 4;
    if (!isOut(i)) continue;
    let found: string | null = null;
    for (let r = 1; r <= 3 && !found; r++) for (const [dx, dy] of [[0, -r], [r, 0], [-r, 0], [0, r]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W2 || ny >= H2) continue;
      const j = (ny * W2 + nx) * 4;
      if (copy[j + 3] > 0 && !(Math.abs(copy[j] - or) < 6 && Math.abs(copy[j + 1] - og) < 6 && Math.abs(copy[j + 2] - ob) < 6)) { found = lineOf(toHex(copy[j], copy[j + 1], copy[j + 2])); break; }
    }
    if (found) { const [r2, g2, b2] = toRgb(found); o[i] = r2; o[i + 1] = g2; o[i + 2] = b2; }
  }
  ctx.putImageData(od, 0, 0);
  canvases.set(key, c);
  HI.add(key);
}
/** 화면 속 물건·지형을 새 해상도로(아이콘 칸에 쓰는 작은 아이템 그림은 그대로) */
function upscaleWorld() {
  for (const key of [...canvases.keys()]) {
    if (/^(wp_|node_|obj_|portal_|deco_|plat_)/.test(key) || key === 'rope' || key === 'rope_knot') upscale(key);
    else if (key.startsWith('tile_')) upscale(key, true);
  }
}

let built = false;
export function buildAll() {
  if (built) return;
  built = true;
  buildWeapons(); buildMonsters(); buildObjects(); buildItems(); buildIcons();
  (Object.keys(THEMES) as ThemeKey[]).forEach(buildTheme);
  upscaleWorld();
}

/** DOM UI용 아이콘 URL */
const urls = new Map<string, string>();
export function iconUrl(key: string): string {
  let u = urls.get(key);
  if (!u) { u = canvases.get(key)?.toDataURL() ?? ''; urls.set(key, u); }
  return u;
}

/** 캐릭터 초상(머리+몸)을 한 장으로 합성 — 캐릭터 선택/HUD용 */
export function portraitUrl(l: Look): string {
  const k = buildLook(l), key = `${k}_portrait`;
  if (!canvases.has(key)) {
    // 대기 첫 프레임(몸 + 앞팔)을 잘라 붙인다. 발이 아래 끝에 오도록
    const src = canvases.get(`${k}_idle`)!, W = 22, H = 34, sx = ROOT_X - W / 2, sy = ROOT_Y + 2 - H;
    const ctx = mk(key, W, H);
    ctx.drawImage(src, sx, sy, W, H, 0, 0, W, H);
    ctx.drawImage(src, sx, FH + sy, W, H, 0, 0, W, H);
  }
  return iconUrl(key);
}
