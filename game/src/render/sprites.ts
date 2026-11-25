// 모든 그래픽은 코드로 생성한 픽셀아트(임시 원화). 외부 이미지 파일 없음.
// 1 아트픽셀 = 1 월드 단위. 나중에 실제 스프라이트 시트로 교체할 때는 같은 key로 텍스처만 바꾸면 된다.
import { Look } from '../core/state';
import { OBOLS, OBOL_TIERS, STAMPS, TALENTS } from '../core/data';
import { CLIPS, FH, FW, MANNEQUIN_WHITE, ROOT_X, ROOT_Y, paintClip } from './mannequin';
import { GEAR, gearKey, paintGear } from './gear';

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
  sword('sword_red', '#e8836a', '#6a7480');
  sword('sword_blue', '#7fb4ff', '#3a5a9a');
  sword('sword_gold', '#f6d76a', '#b9824f');
  sword('sword_amber', '#f6a83a', '#8a5a2a');
  sword('sword_frost', '#a8e8ff', '#4a7ab8');
  sword('sword_nova', '#d8b8ff', '#f6c945');
  // 활(세로로 쥔다)
  for (const [id, a] of [['bow_wood', '#b9824f'], ['bow_leaf', '#7ccf52'], ['bow_blue', '#5a8ad8'], ['bow_gold', '#e8b84a'], ['bow_amber', '#e8902a'], ['bow_frost', '#7ac8f0'], ['bow_nova', '#b48aff']] as const) {
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
  for (const [id, gem] of [['wand_wood', '#5aa9e6'], ['wand_leaf', '#7ccf52'], ['wand_blue', '#7fb4ff'], ['wand_gold', '#f6d76a'], ['wand_amber', '#ff9a3a'], ['wand_frost', '#c4f0ff'], ['wand_nova', '#ff9ae0']] as const) {
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
  tool('wp_pick_red', '#d9674f', false); tool('wp_axe_red', '#d9674f', true);
  tool('wp_pick_blue', '#6a9ae8', false); tool('wp_axe_blue', '#6a9ae8', true);
  tool('wp_pick_gold', '#f2c14e', false); tool('wp_axe_gold', '#f2c14e', true);
  tool('wp_pick_amber', '#f0902a', false); tool('wp_axe_amber', '#f0902a', true);
  tool('wp_pick_frost', '#8ad0f0', false); tool('wp_axe_frost', '#8ad0f0', true);
  tool('wp_pick_nova', '#b48aff', false); tool('wp_axe_nova', '#b48aff', true);
  // 낚싯대: 긴 대 + 줄 + 찌 / 잠자리채: 자루 끝의 둥근 그물
  const rod = (key: string, pole: string, grip: string) => {
    const p = new Paint(14, 40);
    p.line(4, 38, 9, 2, pole); p.line(5, 38, 10, 2, mix(pole, '#ffffff', 0.25));
    p.rect(3, 30, 4, 6, grip); p.disc(7, 31, 2, 2, '#c9d1d9');
    p.line(10, 2, 12, 16, '#ece6f4'); p.disc(12, 18, 1.4, 1.8, '#e25d5d'); p.set(12, 17, '#ffffff');
    p.outline().save(hi(key));
  };
  const net = (key: string, pole: string, mesh: string) => {
    const p = new Paint(18, 36);
    p.rect(8, 12, 2, 23, pole); p.rect(9, 12, 1, 23, mix(pole, '#ffffff', 0.25));
    for (let x = 4; x <= 14; x += 3) p.line(x, 3, x, 11, mix(mesh, '#ffffff', 0.3));
    for (let y = 4; y <= 10; y += 3) p.line(3, y, 15, y, mix(mesh, '#ffffff', 0.3));
    for (let a = 0; a < 48; a++) { const t = (a / 48) * Math.PI * 2; p.set(Math.round(9 + Math.cos(t) * 6.6), Math.round(7 + Math.sin(t) * 5.6), mesh); }
    p.outline().save(hi(key));
  };
  rod('wp_rod', '#b9824f', '#6e4630'); rod('wp_rod_reed', '#c8b878', '#6e4630'); rod('wp_rod_palm', '#a87840', '#3a8a3a'); rod('wp_rod_amber', '#f0902a', '#8a4a18'); rod('wp_rod_frost', '#8ad0f0', '#3a6a9a'); rod('wp_rod_nova', '#b48aff', '#5a3aa8');
  net('wp_net', '#b9824f', '#e8e4f0'); net('wp_net_cloth', '#c8b878', '#f2f0e6'); net('wp_net_palm', '#a87840', '#a8e878'); net('wp_net_amber', '#f0902a', '#ffd08a'); net('wp_net_frost', '#8ad0f0', '#e0f6ff'); net('wp_net_nova', '#b48aff', '#f0d8ff');
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

  // 진흙거북: 무늬 있는 둥근 등딱지 + 앞으로 내민 머리
  p = new Paint(42, 32);
  p.rect(8, 24, 6, 6, '#8a9a5a'); p.rect(24, 24, 6, 6, '#8a9a5a');
  p.disc(34, 18, 7, 6, '#9aac62');
  p.disc(19, 17, 16, 11, '#7a6a48'); p.rect(3, 18, 32, 7, '#7a6a48');
  p.volume();
  for (const [x, y] of [[12, 13], [20, 10], [27, 14], [16, 19], [24, 20]] as const) { p.disc(x, y, 3, 2.2, '#5e5236'); p.disc(x - 0.5, y - 0.5, 1.6, 1, '#a89a70'); }
  p.rect(3, 24, 32, 2, '#a89a70');
  bigEye(p, 34, 16, 4, 5); p.rect(36, 21, 3, 1, '#3a4a20');
  p.selout().save(hi('mob_mudturtle'));

  // 반딧박쥐: 동그란 몸 + 큰 귀 + 빛나는 배
  p = new Paint(34, 30);
  p.disc(16.5, 17, 12, 11, '#5a4a7a'); p.disc(9, 6, 3.5, 5, '#5a4a7a'); p.disc(24, 6, 3.5, 5, '#5a4a7a');
  p.volume();
  p.disc(16.5, 21, 6, 5, '#f6e46a'); p.disc(15, 20, 2.5, 2, '#fffbd0');
  p.disc(9, 6, 1.5, 2.5, '#c48ac8'); p.disc(24, 6, 1.5, 2.5, '#c48ac8');
  bigEye(p, 13, 14, 4.5, 5); bigEye(p, 21, 14, 4.5, 5);
  p.rect(15, 18, 3, 1, '#2a2040'); p.set(14, 19, '#ffffff'); p.set(18, 19, '#ffffff');
  p.selout().save(hi('mob_glowbat'));
  p = new Paint(20, 16);
  p.disc(10, 6, 9, 5, '#4a3a6a'); for (const x of [3, 8, 13]) p.disc(x + 2, 11, 2.6, 2.4, null);
  p.line(2, 4, 17, 6, '#7a6a9a');
  p.volume(); p.selout().save(hi('mob_glowbat_wing'));

  // 바람메뚜기: 긴 몸 + 접힌 큰 뒷다리 + 더듬이
  p = new Paint(42, 34);
  p.line(28, 8, 36, 1, '#3b6a2a'); p.line(30, 8, 40, 3, '#3b6a2a');
  p.disc(18, 20, 15, 7, '#7ab84a'); p.disc(31, 14, 7, 7, '#8fd05a');
  p.line(10, 18, 4, 30, '#5a9a3a'); p.line(11, 18, 5, 30, '#5a9a3a'); p.line(6, 30, 1, 31, '#5a9a3a');
  p.rect(16, 25, 2, 6, '#5a9a3a'); p.rect(24, 25, 2, 6, '#5a9a3a');
  p.volume();
  p.disc(14, 17, 9, 3, '#c4e8a0'); p.line(6, 21, 26, 21, '#4f8a34');
  bigEye(p, 32, 12, 4.5, 5.5); p.rect(34, 18, 3, 1, '#2a4a1a');
  p.selout().save(hi('mob_gusthopper'));

  // 돌골렘: 각진 돌덩이 몸 + 빛나는 룬 + 작은 눈
  p = new Paint(44, 40);
  p.rect(8, 10, 28, 24, '#9a9488'); p.rect(4, 14, 6, 14, '#8a8478'); p.rect(34, 14, 6, 14, '#8a8478');
  p.rect(12, 33, 8, 6, '#7a7468'); p.rect(25, 33, 8, 6, '#7a7468'); p.rect(13, 4, 18, 8, '#aaa498');
  p.volume();
  p.rect(14, 18, 16, 1, '#4ec8c8'); p.rect(21, 18, 1, 9, '#4ec8c8'); p.rect(16, 26, 11, 1, '#4ec8c8'); p.set(14, 17, '#bff6f6');
  p.disc(18, 8, 1.6, 1.6, '#4ec8c8'); p.disc(26, 8, 1.6, 1.6, '#4ec8c8'); p.set(18, 7, '#ffffff'); p.set(26, 7, '#ffffff');
  p.line(10, 12, 14, 16, '#6a6458'); p.line(30, 28, 33, 31, '#6a6458');
  p.selout().save(hi('mob_golemite'));

  // 버섯도깨비: 점박이 큰 갓 + 짧은 몸통 + 몸통에 눈
  p = new Paint(40, 40);
  p.disc(20, 14, 18, 11, '#8a6fd1'); p.rect(2, 14, 36, 4, '#8a6fd1');
  p.rect(11, 18, 18, 18, '#f2e6d0'); p.rect(10, 34, 8, 4, '#d8c8a8'); p.rect(22, 34, 8, 4, '#d8c8a8');
  p.volume();
  for (const [x, y, r] of [[11, 10, 3], [21, 6, 2.6], [29, 11, 3.4], [17, 14, 2]] as const) p.disc(x, y, r, r * 0.8, '#e4d8ff');
  p.rect(4, 17, 32, 1, '#5a4a9a');
  bigEye(p, 16, 25, 4.5, 5.5); bigEye(p, 24, 25, 4.5, 5.5);
  p.rect(18, 31, 4, 1, '#6a4a3a'); p.set(13, 29, '#f29a9a'); p.set(27, 29, '#f29a9a');
  p.selout().save(hi('mob_shroomkin'));

  // ───── 2월드: 노을 사막 ─────
  // 선인장꼬마: 통통한 선인장 몸 + 짧은 팔 + 머리 꽃
  p = new Paint(36, 40);
  p.rect(10, 8, 16, 28, '#5aae4a'); p.disc(18, 9, 8, 6, '#5aae4a'); p.rect(3, 16, 7, 5, '#5aae4a'); p.rect(3, 10, 4, 8, '#5aae4a'); p.rect(26, 19, 7, 5, '#5aae4a'); p.rect(29, 13, 4, 8, '#5aae4a');
  p.rect(11, 35, 6, 4, '#c89058'); p.rect(19, 35, 6, 4, '#c89058');
  p.volume();
  for (const x of [13, 18, 23]) p.rect(x, 10, 1, 24, '#3e8a3a');
  for (const [x, y] of [[11, 14], [25, 20], [12, 28], [24, 30], [4, 12], [31, 15]] as const) p.set(x, y, '#f4f0d8');
  p.disc(18, 3, 3, 2.4, '#ff7aa8'); p.disc(18, 3, 1.2, 1, '#ffe06a');
  bigEye(p, 15, 18, 4.5, 5.5); bigEye(p, 22, 18, 4.5, 5.5);
  p.rect(17, 24, 3, 1, '#2a4a20'); p.set(12, 22, '#f29a9a'); p.set(25, 22, '#f29a9a');
  p.selout().save(hi('mob_cactling'));

  // 꼬마전갈: 납작한 몸 + 집게 + 말아 올린 꼬리
  p = new Paint(44, 34);
  p.disc(20, 24, 13, 7, '#c8703e'); p.rect(8, 28, 26, 3, '#a85a30');
  p.disc(36, 22, 5, 4, '#c8703e'); p.disc(40, 18, 3.5, 3, '#c8703e'); p.disc(39, 25, 3.4, 2.6, '#c8703e');
  p.disc(8, 18, 4, 4, '#c8703e'); p.disc(6, 12, 4, 4, '#c8703e'); p.disc(9, 6, 4, 3.5, '#c8703e'); p.disc(14, 4, 3, 3, '#d8804a');
  p.line(16, 4, 19, 8, '#3a2018'); p.line(17, 4, 20, 8, '#3a2018');
  for (const x of [12, 18, 24, 30]) p.rect(x, 30, 2, 3, '#8a4a28');
  p.volume();
  for (const x of [14, 20, 26]) p.rect(x, 20, 1, 8, '#a85a30');
  bigEye(p, 29, 20, 4, 5); bigEye(p, 34, 19, 3.6, 4.6);
  p.rect(30, 26, 3, 1, '#4a2010');
  p.selout().save(hi('mob_scorpip'));

  // 아지랑이새: 둥근 몸 + 불꽃 같은 볏과 꼬리
  p = new Paint(36, 32);
  p.disc(17, 18, 11, 10, '#f6c86a'); p.disc(17, 22, 7, 5, '#fff0b8');
  for (const [x, y, c2] of [[12, 6, '#ff8a3a'], [16, 4, '#ffb04a'], [20, 6, '#ff8a3a']] as const) p.disc(x, y, 2.4, 3.6, c2);
  p.disc(4, 20, 4, 2.4, '#ff8a3a'); p.disc(3, 16, 3, 2, '#ffb04a');
  p.volume();
  p.rect(26, 17, 5, 3, '#f0902a'); p.rect(26, 18, 5, 1, '#c8682a');
  bigEye(p, 19, 15, 4.5, 5); bigEye(p, 25, 15, 4, 5);
  p.set(14, 20, '#f29a9a');
  p.selout().save(hi('mob_mirabird'));
  p = new Paint(20, 14);
  p.disc(10, 7, 9, 5, '#ffb04a'); p.line(2, 8, 17, 5, '#ff8a3a'); p.line(6, 10, 16, 8, '#ff8a3a');
  p.volume(); p.selout().save(hi('mob_mirabird_wing'));

  // 붕대돌이: 둥근 몸에 붕대를 감고 한쪽 눈만
  p = new Paint(38, 40);
  p.disc(19, 21, 15, 15, '#e8dcc0'); p.rect(9, 30, 8, 8, '#e8dcc0'); p.rect(21, 30, 8, 8, '#e8dcc0');
  p.volume();
  for (const [y, d] of [[10, 1], [15, -1], [21, 1], [27, -1], [32, 1]] as const) p.line(5, y, 33, y + d * 2, '#b8a888');
  p.disc(20, 18, 4.5, 3, '#2a2028'); bigEye(p, 21, 18, 4, 4.6, '#2a2028'); p.disc(20.5, 18, 1.2, 1.2, '#ffd06a');
  p.rect(30, 30, 4, 7, '#e8dcc0'); p.rect(31, 36, 2, 3, '#b8a888');
  p.selout().save(hi('mob_mumbun'));

  // 소금게: 하얀 등딱지에 소금 결정, 큰 집게
  p = new Paint(44, 32);
  p.disc(22, 20, 14, 9, '#e8eef2'); p.rect(8, 22, 28, 5, '#c8d4dc');
  p.disc(5, 14, 5, 4, '#e8eef2'); p.disc(39, 14, 5, 4, '#e8eef2'); p.rect(4, 15, 3, 7, '#c8d4dc'); p.rect(37, 15, 3, 7, '#c8d4dc');
  for (const x of [10, 15, 28, 33]) p.line(x, 26, x + (x < 22 ? -3 : 3), 31, '#a8b8c4');
  p.volume();
  for (const [x, y] of [[16, 13], [22, 11], [28, 14]] as const) { p.rect(x, y - 2, 2, 4, '#ffffff'); p.set(x + 1, y - 3, '#d8f0ff'); }
  p.line(3, 11, 7, 13, '#8a9aa8'); p.line(37, 13, 41, 11, '#8a9aa8');
  bigEye(p, 18, 19, 4, 5); bigEye(p, 26, 19, 4, 5);
  p.rect(20, 24, 4, 1, '#5a6a78');
  p.selout().save(hi('mob_saltcrab'));

  // 모래벌레: 마디진 몸이 모래에서 솟아오름 + 큰 입
  p = new Paint(36, 44);
  for (const [y, r2] of [[36, 10], [28, 9], [20, 8.5], [12, 8]] as const) p.disc(18, y, r2, 5.5, '#d8b070');
  p.rect(4, 38, 28, 5, '#c8a462');
  p.volume();
  for (const y of [32, 24, 16]) p.rect(10, y, 16, 1, '#a8844e');
  p.disc(18, 9, 5, 3, '#8a3a3a'); for (const x of [14, 17, 20, 22]) p.set(x, 7, '#fff0d8');
  bigEye(p, 13, 13, 3.6, 4.4); bigEye(p, 23, 13, 3.6, 4.4);
  for (const x of [6, 11, 25, 30]) p.set(x, 41, '#e8cc90');
  p.selout().save(hi('mob_duneworm'));

  // 해불꽃: 둥근 불꽃 정령 + 위로 솟는 불길
  p = new Paint(34, 40);
  p.disc(17, 25, 12, 11, '#ff8a3a'); p.disc(17, 14, 8, 9, '#ff8a3a'); p.disc(11, 9, 3, 5, '#ff8a3a'); p.disc(23, 8, 3, 5.5, '#ff8a3a'); p.disc(17, 4, 2.4, 4, '#ffb04a');
  p.volume();
  p.disc(17, 26, 7, 7, '#ffc86a'); p.disc(17, 27, 4, 4, '#fff0b8');
  bigEye(p, 13, 22, 4, 5, '#5a1a0a'); bigEye(p, 21, 22, 4, 5, '#5a1a0a');
  p.rect(16, 29, 3, 1, '#8a2a0a');
  p.selout().save(hi('mob_sunwisp'));
  p = new Paint(16, 14);
  p.disc(8, 8, 6, 4, '#ff8a3a'); p.disc(5, 6, 3, 2, '#ffb04a'); p.disc(10, 9, 2.4, 1.6, '#ffd06a');
  p.volume(); p.selout().save(hi('mob_sunwisp_wing'));

  // 사막 거상: 사암 블록 몸 + 둥근 머리 + 빛나는 눈과 금 장식
  p = new Paint(60, 56);
  p.rect(12, 18, 36, 30, '#d8b070'); p.disc(30, 14, 13, 10, '#e2c482'); p.rect(2, 22, 11, 20, '#c8a462'); p.rect(47, 22, 11, 20, '#c8a462');
  p.rect(16, 46, 11, 9, '#b08a52'); p.rect(33, 46, 11, 9, '#b08a52');
  p.volume();
  p.rect(12, 30, 36, 2, '#a8844e'); p.rect(29, 18, 2, 28, '#a8844e'); p.line(4, 30, 11, 30, '#a8844e'); p.line(49, 30, 56, 30, '#a8844e');
  p.rect(17, 6, 26, 4, '#f2a83a'); for (const x of [18, 25, 32, 39]) p.rect(x, 3, 3, 4, '#f2a83a'); p.disc(30, 8, 1.6, 1.6, '#4ec8c8');
  p.disc(24, 15, 2.4, 2, '#ff7a2a'); p.disc(36, 15, 2.4, 2, '#ff7a2a'); p.set(24, 14, '#fff0b8'); p.set(36, 14, '#fff0b8');
  p.rect(26, 20, 8, 1, '#7a5a32');
  p.disc(30, 37, 3, 3, '#4ec8c8'); p.set(29, 36, '#c4ffff');
  p.selout().save(hi('mob_sandlord'));

  // ───── 3월드: 서리 고원 ─────
  // 눈뭉치: 둥근 눈덩이 몸 + 나뭇가지 팔 + 빨간 털모자
  p = new Paint(36, 34);
  p.disc(18, 21, 14, 12, '#f4f8fc'); p.disc(18, 12, 9, 6, '#f4f8fc');
  p.line(2, 17, 6, 20, '#6e4630'); p.line(1, 15, 3, 17, '#6e4630'); p.line(30, 20, 34, 17, '#6e4630'); p.line(33, 15, 35, 17, '#6e4630');
  p.volume();
  p.rect(12, 4, 12, 4, '#e25d4e'); p.rect(12, 7, 12, 2, '#f2f0e6'); p.disc(18, 3, 2, 2, '#f2f0e6');
  p.disc(12, 14, 3, 2, '#ffffff');
  bigEye(p, 14, 19, 4.2, 5); bigEye(p, 22, 19, 4.2, 5);
  p.rect(16, 25, 4, 1, '#5a6a8a'); p.set(10, 22, '#f2a0b0'); p.set(26, 22, '#f2a0b0');
  p.selout().save(hi('mob_snowpuff'));

  // 솔방울이: 비늘진 솔방울 몸 + 머리 위 솔잎
  p = new Paint(32, 40);
  p.disc(16, 24, 11, 13, '#a8743e'); p.disc(16, 12, 8, 6, '#a8743e');
  p.rect(10, 36, 4, 3, '#6e4630'); p.rect(18, 36, 4, 3, '#6e4630');
  p.volume();
  for (let y = 14; y < 36; y += 4) for (let x = 8 + ((y / 4) % 2) * 2; x < 25; x += 4) { p.set(x, y, '#6e4630'); p.set(x + 1, y - 1, '#d0a06a'); }
  p.disc(11, 5, 3.4, 2, '#3a8a4a'); p.disc(21, 5, 3.4, 2, '#3a8a4a'); p.disc(16, 3, 2, 3.4, '#5ab05a');
  bigEye(p, 12, 20, 4, 5); bigEye(p, 20, 20, 4, 5);
  p.rect(15, 27, 3, 1, '#3a2010');
  p.selout().save(hi('mob_pinekin'));

  // 꼬마펭귄: 검은 몸 + 흰 배 + 주황 부리 + 빨간 목도리
  p = new Paint(34, 38);
  p.disc(17, 22, 12, 14, '#2a3448'); p.disc(17, 24, 8, 10, '#f4f6fa');
  p.disc(5, 23, 3, 7, '#2a3448'); p.disc(29, 23, 3, 7, '#2a3448');
  p.rect(10, 35, 6, 2, '#f0902a'); p.rect(18, 35, 6, 2, '#f0902a');
  p.volume();
  bigEye(p, 13, 15, 3.6, 4.4); bigEye(p, 21, 15, 3.6, 4.4);
  p.rect(15, 19, 4, 2, '#f0902a'); p.rect(16, 21, 2, 1, '#c86a1a');
  p.set(10, 19, '#f2a0b0'); p.set(24, 19, '#f2a0b0');
  p.rect(9, 25, 16, 2, '#e25d4e'); p.rect(21, 27, 3, 4, '#e25d4e'); p.rect(9, 25, 16, 1, '#ff8a7a');
  p.selout().save(hi('mob_penglet'));

  // 고드름이: 아래로 뾰족한 얼음 몸 + 떠다니는 얼음 날개
  p = new Paint(30, 42);
  p.disc(15, 12, 12, 10, '#a8dcf4');
  for (let y = 14; y < 41; y++) { const w = Math.max(1, Math.round(11 - (y - 14) * 0.4)); p.rect(15 - w, y, w * 2, 1, '#a8dcf4'); }
  p.volume();
  p.line(9, 6, 9, 24, '#e8f8ff'); p.line(13, 22, 14, 36, '#e8f8ff'); p.line(20, 16, 18, 30, '#7ab8dc');
  bigEye(p, 11, 12, 4, 5, '#1a3a5a'); bigEye(p, 19, 12, 4, 5, '#1a3a5a');
  p.rect(13, 18, 4, 1, '#3a6a8a');
  p.selout().save(hi('mob_icicle'));
  p = new Paint(16, 12);
  p.disc(8, 6, 7, 4, '#d0f0ff'); p.line(2, 7, 14, 4, '#8ac8e8'); p.line(4, 9, 13, 7, '#8ac8e8');
  p.volume(); p.selout().save(hi('mob_icicle_wing'));

  // 아기 설인: 흰 털 몸 + 푸른 얼굴 + 작은 송곳니
  p = new Paint(38, 40);
  p.disc(19, 22, 15, 15, '#eef2f8'); p.rect(9, 32, 8, 7, '#eef2f8'); p.rect(21, 32, 8, 7, '#eef2f8');
  p.disc(4, 24, 4, 8, '#eef2f8'); p.disc(34, 24, 4, 8, '#eef2f8');
  for (let x = 8; x < 31; x += 3) p.rect(x, 6 + (x % 2), 2, 3, '#eef2f8');
  p.volume();
  p.disc(19, 20, 9, 7, '#8ab0d8');
  bigEye(p, 15, 19, 3.8, 4.6); bigEye(p, 23, 19, 3.8, 4.6);
  p.rect(16, 24, 6, 2, '#3a4a6a'); p.set(16, 24, '#ffffff'); p.set(21, 24, '#ffffff');
  for (const [x, y] of [[8, 30], [30, 30], [12, 12], [26, 12]] as const) p.set(x, y, '#c8d4e4');
  p.selout().save(hi('mob_yetiling'));

  // 오로라나비: 보랏빛 몸 + 빛나는 더듬이 + 오로라 색 날개
  p = new Paint(32, 32);
  p.disc(5, 14, 5, 7, '#7affc8'); p.disc(27, 14, 5, 7, '#ff9ae0'); p.disc(6, 24, 4, 4, '#9ad8ff'); p.disc(26, 24, 4, 4, '#c8a8ff');
  p.disc(16, 19, 7, 9, '#6a5ab8'); p.disc(16, 9, 6, 5, '#7a6ac8');
  p.line(13, 4, 10, 0, '#2a2048'); p.line(19, 4, 22, 0, '#2a2048');
  p.volume();
  p.set(10, 0, '#9affd8'); p.set(22, 0, '#ff9ae0');
  for (const y of [17, 21, 25]) p.rect(11, y, 10, 1, '#4a3a98');
  bigEye(p, 13, 9, 3, 3.6); bigEye(p, 19, 9, 3, 3.6);
  p.selout().save(hi('mob_aurowisp'));
  p = new Paint(20, 14);
  p.disc(10, 7, 9, 5, '#9affd8'); p.disc(12, 8, 5, 3, '#ff9ae0'); p.disc(6, 6, 3, 2, '#c8f8ff');
  p.volume(); p.selout().save(hi('mob_aurowisp_wing'));

  // 서리 골렘: 얼음 블록 몸 + 어깨 결정 + 빛나는 푸른 핵
  p = new Paint(44, 46);
  p.rect(10, 12, 24, 26, '#8aaed0'); p.disc(22, 10, 10, 8, '#a8c8e4'); p.rect(1, 16, 10, 16, '#7a9ec4'); p.rect(33, 16, 10, 16, '#7a9ec4');
  p.rect(12, 37, 8, 8, '#6a8eb4'); p.rect(24, 37, 8, 8, '#6a8eb4');
  p.volume();
  p.line(14, 20, 18, 30, '#5a7ea4'); p.line(30, 16, 27, 24, '#5a7ea4'); p.line(3, 24, 9, 26, '#5a7ea4');
  p.rect(2, 11, 3, 6, '#e0f6ff'); p.rect(6, 13, 2, 4, '#c0e8ff'); p.rect(39, 11, 3, 6, '#e0f6ff'); p.rect(36, 13, 2, 4, '#c0e8ff');
  p.disc(22, 27, 4, 4, '#4ad0ff'); p.disc(22, 27, 2, 2, '#e0faff');
  p.disc(18, 10, 2, 1.6, '#4ad0ff'); p.disc(26, 10, 2, 1.6, '#4ad0ff'); p.set(18, 9, '#ffffff'); p.set(26, 9, '#ffffff');
  p.rect(19, 15, 6, 1, '#3a5a7a');
  p.selout().save(hi('mob_frostgolem'));

  // 눈보라 군주: 망토처럼 퍼지는 눈구름 몸 + 얼음 왕관 + 빛나는 눈
  p = new Paint(60, 56);
  for (let y = 18; y < 50; y++) { const w = Math.round(9 + (y - 18) * 0.45); p.rect(30 - w, y, w * 2, 1, '#5a7ac8'); }
  p.disc(30, 46, 22, 8, '#8ab0e0'); p.disc(13, 47, 8, 6, '#c8dcf4'); p.disc(47, 47, 8, 6, '#c8dcf4'); p.disc(30, 51, 11, 4.6, '#e8f2fc');
  p.disc(8, 28, 6, 5, '#8ab0e0'); p.disc(52, 28, 6, 5, '#8ab0e0'); p.disc(4, 26, 3, 3, '#c8dcf4'); p.disc(56, 26, 3, 3, '#c8dcf4');
  p.disc(30, 16, 12, 11, '#e8f2fc');
  p.volume();
  p.rect(20, 4, 20, 4, '#a8e8ff'); for (const x of [20, 25, 30, 35]) p.rect(x + 1, 0, 3, 5, '#a8e8ff'); p.rect(20, 4, 20, 1, '#e0faff'); p.disc(30, 6, 1.6, 1.6, '#4a8ae8');
  p.disc(25, 16, 2.6, 2.2, '#4ad0ff'); p.disc(35, 16, 2.6, 2.2, '#4ad0ff'); p.set(24, 15, '#ffffff'); p.set(34, 15, '#ffffff');
  p.rect(27, 22, 6, 1, '#5a7aa8');
  for (const [x, y] of [[16, 30], [44, 32], [22, 40], [38, 38], [30, 32]] as const) { p.set(x, y, '#ffffff'); p.set(x - 1, y, '#c8e8ff'); p.set(x + 1, y, '#c8e8ff'); p.set(x, y - 1, '#c8e8ff'); p.set(x, y + 1, '#c8e8ff'); }
  p.selout().save(hi('mob_frostlord'));
  p = new Paint(22, 16);
  p.disc(11, 8, 10, 6, '#c8dcf4'); p.disc(7, 6, 5, 3, '#e8f2fc'); p.disc(15, 9, 4, 3, '#8ab0e0');
  p.volume(); p.selout().save(hi('mob_frostlord_wing'));

  // ───── 4월드: 별빛 성운 ─────
  // 별모래톨: 통통한 다섯 갈래 별
  p = new Paint(32, 30);
  for (let y = 0; y < 30; y++) for (let x = 0; x < 32; x++) {
    const dx = x - 16, dy = y - 16, a = Math.atan2(dy, dx) + Math.PI / 2, d = Math.hypot(dx, dy);
    if (d < 7.5 + 7 * Math.pow(Math.abs(Math.cos(a * 2.5)), 3)) p.set(x, y, '#f6cf5a');
  }
  p.volume();
  p.disc(12, 10, 3, 2, '#fff1a8');
  bigEye(p, 13, 16, 3.4, 4.2); bigEye(p, 20, 16, 3.4, 4.2);
  p.rect(15, 21, 3, 1, '#a8782a'); p.set(10, 20, '#f2a0b0'); p.set(23, 20, '#f2a0b0');
  p.selout().save(hi('mob_starling'));

  // 구덩이 진드기: 등딱지가 운석 껍데기인 여섯 다리 벌레
  p = new Paint(38, 30);
  for (const x of [6, 13, 24, 31]) p.line(x, 20, x + (x < 19 ? -4 : 4), 28, '#4a3e5a');
  p.disc(19, 17, 16, 10, '#8a7ca0'); p.disc(19, 13, 13, 7, '#a89cb8');
  p.volume();
  for (const [x, y, r] of [[12, 12, 2.6], [22, 10, 2], [27, 15, 1.8], [16, 17, 1.6]] as const) { p.disc(x, y, r, r * 0.7, '#6a5e7a'); p.set(x - 1, y - 1, '#d0c4e0'); }
  p.disc(6, 21, 5, 4, '#6a5e7a');
  bigEye(p, 5, 20, 2.4, 3, '#2a1a3a'); bigEye(p, 9, 20, 2.4, 3, '#2a1a3a');
  p.selout().save(hi('mob_cratermite'));

  // 성운해파리: 별이 비치는 반투명 갓 + 늘어진 촉수
  p = new Paint(30, 40);
  for (const [x, len] of [[8, 14], [12, 18], [16, 16], [20, 18], [23, 13]] as const) for (let t = 0; t < len; t++) p.set(x + Math.round(Math.sin(t / 2.4) * 1.2), 20 + t, t % 4 === 3 ? '#ffd0f4' : '#d89ae8');
  p.disc(15, 13, 13, 10, '#c88ae8'); p.rect(2, 13, 26, 7, '#c88ae8'); p.disc(15, 20, 13, 2.4, '#a86ad0');
  p.volume();
  p.disc(10, 8, 4, 2.6, '#f0d8ff');
  for (const [x, y] of [[7, 14], [21, 9], [24, 15], [15, 6]] as const) p.set(x, y, '#ffffff');
  bigEye(p, 11, 14, 3.2, 3.8, '#3a1a5a'); bigEye(p, 19, 14, 3.2, 3.8, '#3a1a5a');
  p.selout().save(hi('mob_nebjelly'));
  p = new Paint(14, 10);
  p.disc(7, 5, 6, 4, '#f0c8ff'); p.line(2, 6, 12, 4, '#c88ae8');
  p.volume(); p.selout().save(hi('mob_nebjelly_wing'));

  // 운석돌이: 불꽃 꼬리를 단 울퉁불퉁 바위
  p = new Paint(34, 38);
  for (const [x, h] of [[10, 10], [14, 14], [18, 12], [22, 9]] as const) { p.rect(x, 12 - h, 3, h, '#ff9a3a'); p.rect(x + 1, 12 - h + 2, 1, h - 2, '#ffe08a'); }
  p.disc(17, 24, 15, 13, '#7a6a64'); p.disc(12, 20, 8, 7, '#948480'); p.disc(24, 28, 7, 6, '#665650');
  p.volume();
  p.line(8, 28, 14, 24, '#ff7a2a'); p.line(22, 16, 26, 22, '#ff7a2a'); p.line(14, 32, 19, 30, '#ff7a2a');
  bigEye(p, 13, 23, 3.6, 4.2); bigEye(p, 21, 23, 3.6, 4.2);
  p.rect(15, 29, 4, 1, '#3a2a2a');
  p.selout().save(hi('mob_meteorite'));

  // 고리부엉이: 동그란 부엉이 + 몸을 두른 빛의 고리
  p = new Paint(34, 34);
  p.disc(17, 19, 12, 13, '#c89a5a'); p.rect(8, 3, 3, 5, '#c89a5a'); p.rect(23, 3, 3, 5, '#c89a5a');
  p.volume();
  p.disc(17, 23, 7, 7, '#f0d8a8');
  for (const y of [21, 25, 29]) p.rect(14, y, 6, 1, '#d8b47a');
  p.disc(12, 14, 5, 5, '#fff6e0'); p.disc(22, 14, 5, 5, '#fff6e0');
  p.disc(12, 14, 2.6, 2.6, '#2a1a10'); p.disc(22, 14, 2.6, 2.6, '#2a1a10'); p.set(11, 13, '#ffffff'); p.set(21, 13, '#ffffff');
  p.rect(16, 18, 2, 2, '#f0902a');
  for (let a = 0; a < 80; a++) { const t = (a / 80) * Math.PI * 2, x = Math.round(17 + Math.cos(t) * 16), y = Math.round(22 + Math.sin(t) * 3.4); if (Math.sin(t) > -0.2) p.set(x, y, '#fff0a8'); }
  p.selout().save(hi('mob_ringowl'));
  p = new Paint(18, 12);
  p.disc(9, 6, 8, 5, '#a8784a'); for (const x of [3, 7, 11, 15]) p.rect(x, 7, 2, 4, '#c89a5a');
  p.volume(); p.selout().save(hi('mob_ringowl_wing'));

  // 혜성여우: 푸른 여우 + 빛나는 긴 꼬리
  p = new Paint(42, 30);
  for (let x = 0; x < 16; x++) { const h = Math.round(3 + x * 0.35); p.rect(x, 14 - h, 1, h * 2, x < 6 ? '#ffffff' : '#c8f0ff'); }
  p.disc(24, 19, 11, 8, '#7ac0f0'); p.rect(16, 24, 4, 6, '#5a9ad8'); p.rect(28, 24, 4, 6, '#5a9ad8');
  p.disc(34, 12, 7, 6, '#7ac0f0'); p.rect(30, 2, 3, 6, '#7ac0f0'); p.rect(36, 2, 3, 6, '#7ac0f0');
  p.volume();
  p.disc(36, 15, 4, 2.6, '#e8f8ff'); p.set(40, 14, '#2a3a5a');
  bigEye(p, 32, 11, 2.6, 3.2, '#1a2a4a'); bigEye(p, 37, 11, 2.6, 3.2, '#1a2a4a');
  for (const [x, y] of [[4, 12], [9, 9], [12, 16]] as const) p.set(x, y, '#fff6c8');
  p.selout().save(hi('mob_cometfox'));

  // 공허 도깨비: 보랏빛 몸 + 뿔 + 빛나는 눈
  p = new Paint(30, 34);
  p.disc(15, 20, 11, 12, '#4a2a7a'); p.rect(6, 4, 3, 7, '#c87aff'); p.rect(21, 4, 3, 7, '#c87aff'); p.rect(7, 2, 1, 3, '#f0d8ff'); p.rect(22, 2, 1, 3, '#f0d8ff');
  p.volume();
  p.disc(15, 25, 6, 5, '#2a1648');
  p.disc(11, 17, 3, 2.4, '#ffe066'); p.disc(19, 17, 3, 2.4, '#ffe066'); p.set(11, 17, '#1a0a20'); p.set(19, 17, '#1a0a20');
  p.rect(12, 23, 6, 1, '#c87aff'); p.set(13, 24, '#ffffff'); p.set(16, 24, '#ffffff');
  for (const [x, y] of [[7, 26], [23, 22], [15, 12]] as const) p.set(x, y, '#e0c8ff');
  p.selout().save(hi('mob_voidimp'));
  p = new Paint(18, 12);
  for (let x = 1; x < 17; x++) { const h = Math.round(9 - Math.abs(x - 9) * 0.5 - (x % 4 === 0 ? 2 : 0)); p.rect(x, 1, 1, h, '#3a1a6a'); }
  p.line(1, 1, 16, 1, '#7a4ad8');
  p.volume(); p.selout().save(hi('mob_voidimp_wing'));

  // 성운 거신: 별이 박힌 거대한 몸 + 금빛 왕관 + 고리
  p = new Paint(64, 60);
  for (let y = 20; y < 56; y++) { const w = Math.round(12 + (y - 20) * 0.5); p.rect(32 - w, y, w * 2, 1, '#3a2a7a'); }
  p.disc(32, 52, 26, 7, '#5a3aa8'); p.disc(8, 30, 7, 9, '#4a3a8a'); p.disc(56, 30, 7, 9, '#4a3a8a');
  p.disc(32, 18, 14, 13, '#5a4ab8');
  p.volume();
  p.rect(21, 3, 22, 4, '#f6c945'); for (const x of [21, 27, 33, 39]) p.rect(x, 0, 3, 5, '#f6c945'); p.rect(21, 3, 22, 1, '#fff1a8'); p.disc(32, 5, 1.6, 1.6, '#e84a8a');
  p.disc(26, 18, 3, 2.6, '#7affe8'); p.disc(38, 18, 3, 2.6, '#7affe8'); p.set(25, 17, '#ffffff'); p.set(37, 17, '#ffffff');
  p.rect(29, 25, 6, 1, '#2a1a5a');
  for (let a = 0; a < 140; a++) { const t = (a / 140) * Math.PI * 2, x = Math.round(32 + Math.cos(t) * 30), y = Math.round(40 + Math.sin(t) * 5); if (Math.sin(t) > -0.1) p.set(x, y, '#ffd8a8'); }
  for (const [x, y] of [[18, 34], [44, 36], [26, 46], [40, 48], [32, 32], [12, 28], [52, 30]] as const) { p.set(x, y, '#ffffff'); p.set(x - 1, y, '#c8b8ff'); p.set(x + 1, y, '#c8b8ff'); p.set(x, y - 1, '#c8b8ff'); p.set(x, y + 1, '#c8b8ff'); }
  p.selout().save(hi('mob_nebtitan'));
  p = new Paint(24, 16);
  p.disc(12, 8, 11, 6, '#7a5ad8'); p.disc(8, 6, 5, 3, '#c8a8ff'); p.disc(16, 9, 4, 3, '#ff9ae0');
  p.volume(); p.selout().save(hi('mob_nebtitan_wing'));
}

// ───────── 배경/지형/오브젝트 ─────────
export const THEMES = {
  town: { sky: ['#f7c59f', '#fde8c9'], far: '#d9a084', mid: '#b97a6a', grass: ['#8fc45a', '#6aa84a', '#4f8a3e'], dirt: ['#a8744e', '#8a5a3c', '#74492f'] },
  meadow: { sky: ['#8fd3ff', '#e3f6ff'], far: '#a9dcc0', mid: '#7cc49a', grass: ['#8fde5d', '#5fb859', '#3b8c4f'], dirt: ['#b07a4e', '#8a5a3c', '#6e452e'] },
  hills: { sky: ['#b9c9ea', '#f1e9e2'], far: '#b4b3c9', mid: '#8f8fae', grass: ['#b9c26a', '#93a052', '#6f7c40'], dirt: ['#9a9088', '#7b736e', '#5f5955'] },
  forest: { sky: ['#3f6f7a', '#a8d8b9'], far: '#3f7f6d', mid: '#2f6258', grass: ['#5fb88a', '#3f9670', '#2c7358'], dirt: ['#6e5a4a', '#57463a', '#43362d'] },
  swamp: { sky: ['#7d8f7a', '#cfd9c0'], far: '#8a9a7c', mid: '#6a7d62', grass: ['#9aa85a', '#7a8a44', '#5c6a34'], dirt: ['#6a5e48', '#544a38', '#40382b'] },
  cave: { sky: ['#1f2433', '#46506a'], far: '#3a4256', mid: '#2c3344', grass: ['#7a8a9a', '#5c6a7a', '#44505e'], dirt: ['#4a4652', '#3a3642', '#2a2732'] },
  ridge: { sky: ['#a8d8ff', '#fff4e0'], far: '#c9d9e9', mid: '#a9b9cc', grass: ['#c9e08a', '#a3c066', '#7a9a4a'], dirt: ['#b0a08a', '#8f806c', '#6e6252'] },
  ruins: { sky: ['#e0b48a', '#f6e2c4'], far: '#c9a888', mid: '#a88868', grass: ['#a8b46a', '#86924e', '#66703a'], dirt: ['#a89880', '#887a64', '#6a5e4c'] },
  grove: { sky: ['#1e2450', '#5a5a9a'], far: '#3a3f7a', mid: '#2c3062', grass: ['#7ab8c8', '#5a96aa', '#3e7488'], dirt: ['#4a4466', '#3a3452', '#2a263e'] },
  arena: { sky: ['#f0c49a', '#fff0d8'], far: '#d8b08a', mid: '#b88a62', grass: ['#d8c49a', '#b8a47a', '#98845a'], dirt: ['#b89a7a', '#987a5a', '#7a5e44'] },
  mine: { sky: ['#2a2622', '#5a4e42'], far: '#4a4036', mid: '#3a322a', grass: ['#8a8a8a', '#6a6a6a', '#4e4e4e'], dirt: ['#6a5a4a', '#54463a', '#40352c'] },
  // 2월드: 노을 사막
  oasis: { sky: ['#f6a86a', '#ffe8b8'], far: '#e8b888', mid: '#c89060', grass: ['#9ad06a', '#74b052', '#548e3e'], dirt: ['#e0c088', '#c8a46a', '#a8844e'] },
  dunes: { sky: ['#8ac8f0', '#fff0c8'], far: '#f0d098', mid: '#e0b070', grass: ['#f2dca0', '#e2c482', '#c8a462'], dirt: ['#e0c088', '#c8a46a', '#a8844e'] },
  canyon: { sky: ['#f0905a', '#ffd8a8'], far: '#d87850', mid: '#b85a3a', grass: ['#e0905a', '#c87048', '#a85638'], dirt: ['#b8603e', '#984a30', '#783824'] },
  mirage: { sky: ['#c8e0f8', '#fff8e0'], far: '#f8e0b0', mid: '#e8c890', grass: ['#f6e2b0', '#e8cc90', '#d0b070'], dirt: ['#e8cc98', '#d0b07a', '#b0905a'] },
  tomb: { sky: ['#6a5a78', '#d8b898'], far: '#a88a70', mid: '#887058', grass: ['#c8b088', '#a8906a', '#88724e'], dirt: ['#a08868', '#806c50', '#62523c'] },
  saltlake: { sky: ['#a8d8f0', '#f4fbff'], far: '#e4eef4', mid: '#c8dce8', grass: ['#f4f8fa', '#dce8ee', '#bccdd8'], dirt: ['#d8d0c4', '#b8ae9e', '#988c7a'] },
  starfield: { sky: ['#2a2458', '#a86a8a'], far: '#5a4a7a', mid: '#3e3460', grass: ['#d8b888', '#b89868', '#98784e'], dirt: ['#8a6e58', '#6e5644', '#524034'] },
  sunspire: { sky: ['#f8b848', '#fff0b8'], far: '#e8a858', mid: '#c88848', grass: ['#e8c47a', '#d0a85e', '#b08a46'], dirt: ['#c8a070', '#a88258', '#866642'] },
  // 3월드: 서리 고원
  snowtown: { sky: ['#9ac8f0', '#eaf6ff'], far: '#c8dcef', mid: '#a8c4dc', grass: ['#f6faff', '#dce8f4', '#b8cce0'], dirt: ['#a88a70', '#8a6e58', '#6e5644'] },
  snowfield: { sky: ['#a8d4f8', '#f4faff'], far: '#d8e8f6', mid: '#b8d0e6', grass: ['#ffffff', '#e4eef8', '#c4d6e8'], dirt: ['#9aa4b4', '#7c8698', '#5e687a'] },
  pinewood: { sky: ['#7aa8c8', '#dceef8'], far: '#6a9a9a', mid: '#4a7a7a', grass: ['#f0f6fa', '#d4e2ec', '#aec4d4'], dirt: ['#7a6a5a', '#5e5044', '#463c34'] },
  frostlake: { sky: ['#b8e0f8', '#f4fcff'], far: '#c8e4f2', mid: '#9cc8e0', grass: ['#d8f0fc', '#b4dcf0', '#8cc0dc'], dirt: ['#8aa8c0', '#6c8aa4', '#506e88'] },
  icecave: { sky: ['#1a2a48', '#4a6a98'], far: '#2e4a72', mid: '#22385a', grass: ['#a8d8f0', '#7ab8dc', '#5292bc'], dirt: ['#3a4a68', '#2c3a54', '#1e2a40'] },
  glacier: { sky: ['#8ab8e8', '#e8f4ff'], far: '#b8d4ec', mid: '#88b0d4', grass: ['#eef6fc', '#cce0f0', '#a4c4de'], dirt: ['#7a9ac0', '#5e7ea6', '#46628a'] },
  aurora: { sky: ['#14183a', '#3a7a7a'], far: '#2a3a6a', mid: '#1e2a50', grass: ['#e4ecf8', '#bccce4', '#94a8c8'], dirt: ['#4a4a6a', '#383852', '#28283e'] },
  frostpeak: { sky: ['#6a88b8', '#d8e6f6'], far: '#9ab0cc', mid: '#7a92b4', grass: ['#f4f8fc', '#d4e0ec', '#aebed2'], dirt: ['#6a7488', '#545c6e', '#3e4454'] },
  // 4월드: 별빛 성운
  nebtown: { sky: ['#2a2458', '#6a5aa8'], far: '#4a3a7a', mid: '#3a2e66', grass: ['#c8c4d8', '#a8a4bc', '#88849c'], dirt: ['#6a6488', '#54506e', '#3e3a54'] },
  moondust: { sky: ['#0e0c24', '#3a3468'], far: '#5a5678', mid: '#46425e', grass: ['#e0dce8', '#c4c0d0', '#a4a0b4'], dirt: ['#8a8698', '#6e6a7c', '#545062'] },
  crater: { sky: ['#1a1438', '#4a3a6a'], far: '#5a4a6a', mid: '#463a56', grass: ['#b4a8c4', '#9488a8', '#74688a'], dirt: ['#6a5e7a', '#544a62', '#3e364a'] },
  nebula: { sky: ['#3a1a5a', '#c86ab8'], far: '#7a4a9a', mid: '#5a3a7a', grass: ['#e8b8f0', '#c898d8', '#a878b8'], dirt: ['#6a4a7a', '#543a62', '#3e2a4a'] },
  asteroid: { sky: ['#0a0a1a', '#2a2a4a'], far: '#3a3648', mid: '#2c2838', grass: ['#9a90a8', '#7a7088', '#5a5068'], dirt: ['#5a5262', '#46404e', '#322e3a'] },
  rings: { sky: ['#3a2a4a', '#e8a86a'], far: '#a8785a', mid: '#86604a', grass: ['#f0d8a0', '#d8bc80', '#b89a60'], dirt: ['#a8865a', '#8a6a46', '#6a5034'] },
  comet: { sky: ['#0e1a3a', '#4a8ac8'], far: '#3a5a8a', mid: '#2a4670', grass: ['#c8ecfa', '#a0d0ec', '#78b0d8'], dirt: ['#4a6a8a', '#3a5470', '#2a3e56'] },
  voidedge: { sky: ['#06040e', '#2a1648'], far: '#2a1a4a', mid: '#1e1238', grass: ['#8a6ab8', '#6a4a98', '#4a2e78'], dirt: ['#2e2248', '#221838', '#160e28'] },
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
      if (name === 'forest' || name === 'pinewood' || layer === 'mid') {
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
  for (const [id, leaf, trunk] of [['oak', ['#3b8c4f', '#5fb859', '#8fde5d'], ['#8a5a3c', '#6b4530']], ['silvertree', ['#7fa8b8', '#a9d3dc', '#e3f6f5'], ['#b8b0c8', '#8d86a3']], ['willow', ['#6a8a3a', '#8aac4a', '#b8d47a'], ['#6e5a40', '#54442f']], ['moonbirch', ['#4a5aa8', '#7a8ad8', '#c4ccff'], ['#e8e4f0', '#b4aec8']], ['palm', ['#3a9a4a', '#5ac05a', '#a8e878'], ['#b8864a', '#8a6034']], ['pine', ['#2e6a4a', '#3a7a54', '#f4f8fc'], ['#7a5a3c', '#5a4030']], ['startree', ['#3a2a7a', '#6a5ab8', '#f6e08a'], ['#4a3a6a', '#342a52']]] as const) {
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
  // 야자나무 잎: 둥근 수관 대신 늘어진 잎 다발로 다시 그린다
  {
    const q = new Paint(44, 36);
    for (const [dx, dy, len] of [[-1, 0.15, 19], [1, 0.15, 19], [-1, 0.6, 15], [1, 0.6, 15], [-0.45, -0.55, 12], [0.45, -0.55, 12]] as const) {
      for (let t = 0; t <= len; t++) {
        const x = 22 + dx * t, y = 16 + dy * t + (t * t) / (len * 1.3);
        q.disc(x, y, 2.6 - t / len * 1.2, 1.8 - t / len * 0.8, t % 3 ? '#4aaa4a' : '#3a8a3a');
        q.set(x, y - 1, '#8ade6a');
      }
    }
    q.disc(22, 17, 4, 3, '#3a8a3a'); q.disc(19, 21, 2, 2, '#8a5a2a'); q.disc(24, 21, 2, 2, '#8a5a2a');
    q.outline().save('node_palm_top');
  }
  // 전나무: 눈이 얹힌 세 겹 뾰족 수관
  {
    const q = new Paint(44, 36);
    for (const [top, hw] of [[19, 19], [9, 15], [0, 11]] as const) for (let y = 0; y < 13; y++) {
      const w = Math.max(1, Math.round(hw * (y + 1.5) / 13));
      q.rect(22 - w, top + y, w * 2, 1, y < 3 ? '#f4f8fc' : y % 3 ? '#2e6a4a' : '#3a7a54');
      if (y >= 3) q.set(22 - w, top + y, '#3a7a54');
    }
    for (const [x, y] of [[14, 27], [30, 29], [18, 17], [26, 15]] as const) q.rect(x, y, 3, 1, '#e4eef8');
    q.outline().save('node_pine_top');
  }
  // 광맥
  let p = new Paint(34, 24);
  p.disc(12, 15, 11, 8, '#8d97a3'); p.disc(23, 16, 9, 7, '#7b8591'); p.disc(16, 10, 8, 7, '#a6afb9');
  p.disc(13, 8, 4, 2.5, '#c9d1d9');
  p.rect(0, 22, 34, 2, null);
  for (const [x, y] of [[8, 14], [18, 12], [25, 15], [14, 18], [22, 9]]) { p.disc(x, y, 2, 1.6, '#d9574a'); p.set(x - 1, y - 1, '#f6a08a'); }
  p.outline().save('node_redrock');
  for (const [id, base, gem, hi2] of [['bluerock', ['#6a7480', '#5a636e', '#87909b'], '#4e8de2', '#a5d8ff'], ['goldrock', ['#7d7468', '#665e54', '#9a9184'], '#f2c14e', '#fff1a8'], ['amberrock', ['#a08468', '#806a52', '#bca084'], '#f0902a', '#ffd08a'], ['frostrock', ['#8aa0b8', '#6a809a', '#a8bed4'], '#7ae0ff', '#e0faff'], ['novarock', ['#6a6088', '#544a70', '#8a80a8'], '#c87aff', '#f0d8ff']] as const) {
    p = new Paint(34, 24);
    p.disc(12, 15, 11, 8, base[0]); p.disc(23, 16, 9, 7, base[1]); p.disc(16, 10, 8, 7, base[2]);
    p.disc(13, 8, 4, 2.5, mix(base[2], '#ffffff', 0.4)); p.rect(0, 22, 34, 2, null);
    for (const [x, y] of [[8, 14], [18, 12], [25, 15], [14, 18], [22, 9], [28, 19]]) { p.disc(x, y, 2, 1.6, gem); p.set(x - 1, y - 1, hi2); }
    p.outline().save(`node_${id}`);
  }

  // 낚시터: 땅에 고인 물(가장자리 돌·물결·물고기 그림자)
  for (const [id, water, deep, rim, glint] of [['spring', '#6ac0d8', '#3a8aa8', '#c8a878', '#ffffff'], ['saltpool', '#a8dcec', '#6aaac8', '#f0f4f6', '#ffffff'], ['starpool', '#4a4aa8', '#2a2a78', '#8a7aa8', '#fff6c8'], ['icehole', '#5ab0d8', '#1e5a88', '#eef6fc', '#ffffff'], ['nebpool', '#a86ad8', '#5a2a98', '#8a80a8', '#fff6c8']] as const) {
    p = new Paint(40, 14);
    p.disc(20, 8, 19, 6, rim); p.disc(20, 8, 16, 4.6, water); p.disc(20, 9, 11, 3, deep);
    p.line(8, 7, 13, 7, glint); p.line(25, 9, 29, 9, glint);
    p.disc(23, 9, 3, 1, mix(deep, '#000000', 0.3)); p.set(26, 9, mix(deep, '#000000', 0.3));
    if (id === 'starpool' || id === 'nebpool') for (const [x, y] of [[12, 9], [18, 6], [30, 8]]) p.set(x, y, glint);
    for (const x of [2, 7, 33, 37]) p.disc(x, 9, 2, 1.6, mix(rim, '#000000', 0.15));
    p.outline().save(`node_${id}`);
  }
  // 곤충 덤불: 둥근 덤불 + 그 위를 나는 벌레
  for (const [id, leaf, bug] of [['antbush', ['#7a9a4a', '#a8c46a'], '#3a2a20'], ['glowbush', ['#6a7a5a', '#94a87a'], '#ffb04a'], ['goldbush', ['#5a8a5a', '#8ab87a'], '#f6c945'], ['frostbush', ['#5a8aa0', '#e8f2fa'], '#c8e8ff'], ['cometbush', ['#3a5a8a', '#8ad0f0'], '#fff6c8']] as const) {
    p = new Paint(30, 26);
    p.disc(15, 18, 13, 8, leaf[0]); p.disc(9, 15, 6, 5, leaf[0]); p.disc(21, 14, 7, 6, leaf[0]);
    p.disc(13, 13, 4, 3, leaf[1]); p.disc(21, 11, 4, 3, leaf[1]); p.disc(15, 18, 5, 2.4, leaf[1]);
    p.volume();
    for (const [x, y] of [[6, 4], [16, 2], [25, 5], [11, 9]]) { p.disc(x, y, 1.4, 1, bug); p.set(x - 1, y - 1, '#ffffff'); p.set(x + 1, y - 1, '#ffffff'); }
    p.outline().save(`node_${id}`);
  }
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

  // 미니게임장: 깃발 달린 작은 천막
  p = new Paint(34, 30);
  for (let y = 0; y < 14; y++) p.rect(17 - y, 6 + y, y * 2 + 1, 1, y % 4 < 2 ? '#e25d4e' : '#f2f0e6');
  p.rect(4, 20, 27, 10, '#c9805a'); p.rect(14, 22, 7, 8, '#5a3a2a'); p.rect(17, 0, 1, 7, '#8a5a3c'); p.rect(18, 0, 6, 4, '#f6c945');
  p.outline().save('obj_games');
  // 오락실: 반짝이는 오락 기계
  p = new Paint(26, 40);
  p.rect(3, 4, 20, 36, '#8a4ab8'); p.rect(3, 4, 20, 3, '#c87aff'); p.rect(6, 9, 14, 11, '#1a1430'); p.rect(7, 10, 12, 9, '#4ad0ff');
  p.disc(10, 14, 1.6, 1.6, '#f6c945'); p.disc(15, 16, 1.4, 1.4, '#ff7ae0'); p.rect(5, 23, 16, 4, '#5a2a7a'); p.disc(10, 25, 1.5, 1.5, '#e25d4e'); p.disc(15, 25, 1.5, 1.5, '#5fb859');
  p.rect(9, 30, 8, 2, '#2a1a3a'); p.rect(4, 37, 18, 3, '#5a2a7a'); p.set(4, 5, '#ffffff'); p.set(21, 5, '#ffffff');
  p.volume(); p.outline().save('obj_arcade');
  // 낚시꾼 포피: 양동이 옆에 앉은 작은 낚시꾼 + 낚싯대
  p = new Paint(34, 30);
  p.rect(2, 22, 10, 8, '#7b8591'); p.rect(2, 22, 10, 2, '#9aa3ad'); p.disc(7, 21, 2, 1, '#4ab8f0');
  p.disc(20, 14, 4, 4, '#f6d8b8'); p.rect(15, 9, 10, 3, '#e8b24a'); p.rect(17, 6, 6, 3, '#e8b24a'); p.rect(16, 18, 9, 9, '#4e8de2'); p.rect(16, 27, 9, 3, '#3a5a8a');
  p.set(19, 14, '#2a2230'); p.set(22, 14, '#2a2230');
  p.line(25, 20, 33, 2, '#8a5a3c'); p.line(33, 2, 33, 14, '#e9e4f0');
  p.volume(); p.outline().save('obj_poppy');
  // 수호 토템: 새겨진 나무 기둥 + 빛나는 눈
  p = new Paint(22, 40);
  p.rect(5, 6, 12, 34, '#8a6a4a'); p.rect(2, 12, 18, 4, '#6a4a32'); p.rect(2, 26, 18, 4, '#6a4a32');
  p.disc(11, 5, 7, 5, '#5fb88a'); p.rect(7, 18, 3, 3, '#7ef0ff'); p.rect(12, 18, 3, 3, '#7ef0ff'); p.rect(8, 33, 6, 2, '#3a2a1a');
  p.rect(6, 7, 2, 30, '#a8885a');
  p.outline().save('obj_totem');

  // 동료 둥지: 짚 둥지 + 작은 나무 집
  p = new Paint(32, 26);
  p.rect(6, 6, 20, 12, '#c9805a'); for (let i = 0; i < 12; i++) p.rect(4 + i, 6 - Math.min(i, 11 - i) / 2, 24 - i * 2, 1, '#d9574a');
  p.rect(13, 10, 6, 8, '#5a3a2a'); p.disc(16, 9, 3, 2, '#5a3a2a');
  p.disc(16, 21, 15, 5, '#e8c08a'); p.disc(16, 20, 12, 3, '#f6dca8'); for (const x of [5, 11, 20, 27]) p.line(x, 22, x + 3, 19, '#c9a46a');
  p.outline().save('obj_pets');
  // 부엉이 횃대: 기둥 + 가로대 위 부엉이
  p = new Paint(26, 40);
  p.rect(11, 14, 4, 26, '#8a5a3c'); p.rect(3, 22, 20, 3, '#8a5a3c'); p.rect(3, 22, 20, 1, '#b9824f');
  p.disc(13, 12, 8, 9, '#9a7a5a'); p.disc(13, 15, 5, 5, '#e8d4b0'); p.disc(10, 9, 2.6, 2.6, '#ffffff'); p.disc(16, 9, 2.6, 2.6, '#ffffff');
  p.disc(10, 9, 1.2, 1.2, '#1e1420'); p.disc(16, 9, 1.2, 1.2, '#1e1420'); p.rect(12, 11, 2, 2, '#f6c945'); p.rect(6, 2, 2, 4, '#9a7a5a'); p.rect(18, 2, 2, 4, '#9a7a5a');
  p.outline().save('obj_owl');
  // 연금 솥: 세 발 달린 검은 솥 + 끓는 물약 + 떠오르는 거품
  p = new Paint(34, 34);
  p.rect(6, 28, 3, 5, '#3a3442'); p.rect(25, 28, 3, 5, '#3a3442'); p.rect(15, 29, 4, 4, '#3a3442');
  p.disc(17, 21, 14, 10, '#4a4456'); p.rect(3, 13, 28, 4, '#5a546a');
  p.volume();
  p.disc(17, 14, 12, 3, '#7a3ab8'); p.disc(14, 13, 4, 1.4, '#c48aff');
  for (const [x, y, r] of [[12, 8, 2.4], [20, 5, 3], [15, 1.6, 1.6], [25, 9, 1.8]] as const) { p.disc(x, y, r, r, '#b07aef'); p.set(x - 1, y - 1, '#ffffff'); }
  p.rect(3, 13, 28, 1, '#8a8498');
  p.outline().save('obj_alchemy');
  // 우체국: 소포가 쌓인 나무 카운터 + 깃발
  p = new Paint(36, 34);
  p.rect(2, 18, 32, 15, '#a8744e'); p.rect(2, 18, 32, 2, '#c8945e'); p.rect(4, 22, 28, 1, '#8a5a3c');
  p.rect(6, 10, 10, 8, '#d8b878'); p.rect(6, 13, 10, 1, '#a8844e'); p.rect(10, 10, 1, 8, '#a8844e');
  p.rect(18, 6, 12, 12, '#e8c888'); p.rect(18, 11, 12, 1, '#b89458'); p.rect(23, 6, 1, 12, '#b89458');
  p.rect(32, 2, 1, 16, '#6e4630'); p.rect(33, 2, 3, 3, '#e2574a');
  p.volume();
  p.outline().save('obj_post');
  // 덫 오두막: 눈 덮인 통나무 오두막 + 앞에 놓인 덫
  p = new Paint(38, 34);
  p.rect(4, 14, 26, 18, '#8a5a3c'); for (const y of [17, 21, 25, 29]) p.rect(4, y, 26, 1, '#6e4630');
  for (let y = 0; y < 12; y++) p.rect(17 - y - 2, 3 + y, (y + 2) * 2 + 1, 1, y < 3 ? '#f4f8fc' : '#a8744e');
  p.rect(2, 13, 30, 2, '#f4f8fc'); p.rect(13, 22, 7, 10, '#4a3020'); p.rect(22, 18, 5, 4, '#ffd06a'); p.rect(24, 18, 1, 4, '#8a5a3c');
  p.disc(33, 31, 4.6, 2, '#9aa3ad'); for (const x of [30, 32, 34, 36]) p.rect(x, 27, 1, 3, '#c9d1d9'); p.rect(29, 31, 9, 1, '#6a7480');
  p.volume();
  p.outline().save('obj_traps');
  // 공방 마당: 반쯤 지은 집 + 비계 + 작은 기중기
  p = new Paint(42, 40);
  p.rect(6, 20, 22, 19, '#c8a070'); for (const y of [24, 29, 34]) p.rect(6, y, 22, 1, '#a07a4e');
  for (let y = 0; y < 9; y++) p.rect(17 - y - 3, 11 + y, (y + 3) * 2 + 1, 1, y < 2 ? '#f4f8fc' : '#6a9ae8');
  p.rect(14, 29, 6, 10, '#5a3a24');
  for (const x of [2, 30]) p.rect(x, 12, 2, 27, '#8a6a4a'); p.rect(2, 22, 30, 1, '#8a6a4a'); p.rect(2, 31, 30, 1, '#8a6a4a');
  p.rect(36, 2, 2, 37, '#e8a83a'); p.rect(24, 2, 16, 2, '#e8a83a'); p.line(26, 4, 26, 14, '#3a3442'); p.rect(24, 14, 5, 4, '#9aa3ad');
  p.volume();
  p.outline().save('obj_build');
  // 별빛 식당: 은빛 화덕 + 김 나는 냄비 + 둥근 창(별)
  p = new Paint(40, 36);
  p.rect(4, 12, 32, 23, '#c8c4d8'); p.rect(4, 12, 32, 2, '#e8e4f0'); p.rect(4, 33, 32, 2, '#6a6488');
  p.disc(12, 22, 5, 5, '#3a2e66'); p.disc(12, 22, 3.6, 3.6, '#5a4ab8'); p.set(11, 21, '#fff6c8'); p.set(13, 23, '#fff6c8');
  p.rect(21, 18, 12, 9, '#3a3442'); p.rect(22, 21, 10, 5, '#ff7a3a'); p.rect(23, 22, 8, 2, '#ffd06a');
  p.disc(27, 9, 8, 4, '#8a80a8'); p.rect(19, 9, 16, 4, '#8a80a8'); p.rect(19, 9, 16, 1, '#b4aac8'); p.rect(17, 10, 2, 2, '#6a6488'); p.rect(35, 10, 2, 2, '#6a6488');
  for (const [x, h] of [[23, 5], [27, 7], [31, 4]] as const) p.rect(x, 7 - h, 1, h, '#f4f0fa');
  p.volume();
  p.outline().save('obj_kitchen');
  // 번식 둥지: 별빛 짚 둥지 + 알 세 개 + 작은 지붕 기둥
  p = new Paint(38, 32);
  p.rect(3, 4, 2, 24, '#8a6a4a'); p.rect(33, 4, 2, 24, '#8a6a4a');
  for (let x = 1; x < 37; x++) { const y = 2 + Math.round(Math.abs(x - 19) * 0.25); p.rect(x, y, 1, 3, '#7a5ab8'); }
  p.disc(19, 25, 16, 6, '#c8a060'); p.disc(19, 23, 13, 4, '#8a6a3a');
  for (const [x, c] of [[13, '#f4f0e6'], [19, '#ff9ae0'], [25, '#9ad8f6']] as const) { p.disc(x, 20, 3.4, 4.4, c); p.set(x - 1, 18, '#ffffff'); }
  for (const x of [6, 12, 26, 32]) p.line(x, 27, x + 3, 24, '#e0c080');
  p.volume();
  p.outline().save('obj_nest');
  // 연구실: 화면이 빛나는 기계 + 안테나 + 플라스크
  p = new Paint(36, 36);
  p.rect(3, 10, 26, 25, '#8a86a8'); p.rect(3, 10, 26, 2, '#c8c4d8'); p.rect(3, 33, 26, 2, '#54506e');
  p.rect(6, 14, 20, 11, '#1a3a4a'); for (const [x, y] of [[8, 18], [12, 16], [16, 20], [20, 17], [24, 19]] as const) p.rect(x, y, 2, 1, '#7affe8');
  p.line(8, 22, 23, 15, '#4ad0ff');
  for (const [x, c] of [[8, '#e25d4e'], [13, '#f6c945'], [18, '#5fb859']] as const) p.disc(x, 29, 1.6, 1.6, c);
  p.rect(15, 2, 1, 8, '#54506e'); p.disc(15.5, 2, 2, 2, '#ff6a8a');
  p.rect(30, 22, 4, 4, '#e8f4fa'); p.disc(32, 30, 4, 4, '#e8f4fa'); p.disc(32, 31, 3, 2.4, '#b48aff');
  p.volume();
  p.outline().save('obj_lab');
  // 기도 토템: 얼음 결정이 박힌 흰 돌기둥 + 빛나는 눈 + 위쪽 별
  p = new Paint(24, 44);
  p.rect(6, 10, 12, 34, '#c8d4e4'); p.rect(3, 16, 18, 4, '#8aa0b8'); p.rect(3, 30, 18, 4, '#8aa0b8');
  p.disc(12, 8, 7, 5, '#e8f2fc'); p.rect(8, 22, 3, 3, '#4ad0ff'); p.rect(13, 22, 3, 3, '#4ad0ff'); p.rect(9, 37, 6, 2, '#5a6a8a');
  p.rect(7, 11, 2, 31, '#f4f8fc'); p.disc(12, 2, 2, 2, '#fff0a8'); p.set(12, 0, '#ffffff');
  p.volume();
  p.outline().save('obj_shrine');
  // 연금술 거품(솥 색) · 약병(내용물 색)
  for (const [k, col] of [['power', '#e2574a'], ['quick', '#5fb859'], ['wise', '#8a6fd1'], ['luck', '#f6c945']] as const) {
    p = new Paint(14, 14); p.disc(7, 7, 6, 6, col); p.disc(7, 7, 4.4, 4.4, mix(col, '#ffffff', 0.35)); p.disc(5, 5, 1.6, 1.4, '#ffffff'); p.set(9, 9, mix(col, '#000000', 0.2));
    p.outline().save(`bub_${k}`);
  }
  // 오볼: 모양(동그라미·네모·육각·별빛) × 등급 색 × 효과 색 점
  const OB_EFF: Record<string, string> = { str: '#d9574a', agi: '#5fb859', wis: '#4e8de2', luk: '#8fde5d', dmg: '#ff7a3a', drop: '#c48aff' };
  for (const o of OBOLS) {
    const col = OBOL_TIERS[o.tier].col, dark = mix(col, '#000000', 0.3), hi = mix(col, '#ffffff', 0.4);
    p = new Paint(12, 12);
    if (o.shape === 'circle') { p.disc(5.5, 5.5, 5, 5, dark); p.disc(5.5, 5.5, 4, 4, col); }
    else if (o.shape === 'square') { p.rect(1, 1, 10, 10, dark); p.rect(2, 2, 8, 8, col); }
    else if (o.shape === 'hex') { p.rect(3, 0, 6, 12, dark); p.rect(1, 2, 10, 8, dark); p.rect(3, 1, 6, 10, col); p.rect(2, 3, 8, 6, col); }
    else { p.rect(5, 0, 2, 12, dark); p.rect(0, 5, 12, 2, dark); p.disc(5.5, 5.5, 3.6, 3.6, dark); p.disc(5.5, 5.5, 2.8, 2.8, col); p.rect(5, 1, 2, 10, col); p.rect(1, 5, 10, 2, col); }
    p.set(3, 3, hi); p.disc(5.5, 5.5, 1.6, 1.6, OB_EFF[o.theme.k] ?? '#ffffff');
    p.outline().save(`it_${o.id}`);
  }
  // 연금 액체 4종(물방울 모양)
  for (const [k, col] of [['water', '#4ab8f0'], ['nitro', '#c8f0ff'], ['trench', '#2a5ab8'], ['mercury', '#b8c0d0']] as const) {
    p = new Paint(12, 14); p.disc(6, 9, 4.6, 4.4, col); p.line(6, 1, 3, 7, col); p.line(6, 1, 9, 7, col); p.rect(5, 2, 2, 5, col); p.disc(4.5, 8.5, 1.2, 1.6, '#ffffff');
    p.outline().save(`liq_${k}`);
  }
  for (const [k, col] of [['v_minnow', '#7fc8e0'], ['v_salt', '#e8eef2'], ['v_star', '#5a5ac8'], ['v_ant', '#8a6a4a'], ['v_firefly', '#ffb04a'], ['v_beetle', '#f2c14e'], ['v_palm', '#6ac05a'], ['v_amber', '#f0902a'], ['v_hare', '#f4f6fa'], ['v_fox', '#8ad0f0']] as const) {
    p = new Paint(12, 15); p.rect(4, 1, 4, 3, '#c8a878'); p.rect(4, 4, 4, 2, '#d8e4ec'); p.disc(6, 10, 5, 4.5, '#d8e4ec'); p.disc(6, 10.5, 4, 3.4, col); p.set(4, 8, '#ffffff'); p.rect(5, 2, 2, 1, '#8a6a48');
    p.outline().save(`vial_${k}`);
  }
  // 동료 아이콘(동그란 얼굴 + 귀)
  for (const [id, col] of [['pup', '#f2e6d0'], ['kit', '#e8a03a'], ['frog', '#5fb859'], ['mole', '#8a6a4a'], ['squirrel', '#c9805a'], ['hedgehog', '#9a8a7a'], ['firefly', '#f6e46a'], ['sloth', '#a89a80'], ['owlet', '#9a7a5a'], ['fox', '#e8833a'], ['dragonling', '#d9574a']] as const) {
    p = new Paint(14, 13);
    p.disc(7, 7.5, 5.5, 4.8, col); p.disc(3, 3, 1.8, 1.8, col); p.disc(11, 3, 1.8, 1.8, col);
    p.set(5, 7, '#1e1420'); p.set(9, 7, '#1e1420'); p.rect(6, 9, 2, 1, '#8a3a3a'); p.set(3, 6, '#ffffff');
    p.outline().save(`pet_${id}`);
  }

  // 석상 받침: 돌 받침대 위 작은 석상 셋
  p = new Paint(34, 26);
  p.rect(1, 18, 32, 8, '#8d97a3'); p.rect(1, 18, 32, 2, '#b4bcc6'); p.rect(3, 23, 28, 1, '#6a7480');
  for (const [x, h] of [[5, 12], [14, 15], [24, 11]] as const) {
    p.disc(x + 3, 18 - h + 2, 2.6, 2.6, '#c9d1d9'); p.rect(x + 1, 18 - h + 4, 5, h - 4, '#b4bcc6'); p.rect(x + 1, 18 - h + 4, 1, h - 4, '#dfe5ea');
  }
  p.rect(15, 4, 4, 1, '#f6c945');
  p.outline().save('obj_statues');

  // 작업판: 나무 게시판 + 붙은 종이들
  p = new Paint(34, 30);
  p.rect(4, 14, 3, 16, '#8a5a3c'); p.rect(27, 14, 3, 16, '#8a5a3c');
  p.rect(1, 1, 32, 20, '#b9824f'); p.rect(1, 1, 32, 2, '#d9a066'); p.rect(1, 19, 32, 2, '#8a5a3c');
  for (const [x, y, w, h, col] of [[4, 5, 8, 9, '#f2f0e6'], [14, 4, 7, 7, '#f6e6a0'], [23, 6, 7, 10, '#f2f0e6'], [14, 13, 7, 5, '#cfe6ff']] as const) {
    p.rect(x, y, w, h, col); p.rect(x + 1, y + 2, w - 2, 1, '#9d96b3'); if (h > 6) p.rect(x + 1, y + 4, w - 3, 1, '#9d96b3');
    p.set(x + Math.floor(w / 2), y, '#d9574a');
  }
  p.outline().save('obj_tasks');

  // 우표함: 둥근 지붕의 우체통 + 투입구 + 작은 깃발
  p = new Paint(20, 30);
  p.rect(8, 20, 4, 10, '#6e4630');
  p.disc(10, 7, 8, 6, '#4e8de2'); p.rect(2, 7, 16, 13, '#4e8de2');
  p.rect(5, 9, 10, 2, '#1e2a44'); p.rect(4, 14, 12, 4, '#e9e4f0'); p.rect(6, 15, 8, 2, '#d9574a');
  p.rect(17, 3, 1, 8, '#6a7480'); p.rect(18, 3, 2, 3, '#f6c945');
  p.rect(3, 6, 2, 10, '#7fb4ff');
  p.outline().save('obj_stamps');

  // 용광로: 돌로 쌓은 화로 + 굴뚝 + 불빛 창
  p = new Paint(30, 34);
  p.rect(18, 0, 7, 12, '#7d8590'); p.rect(18, 0, 7, 2, '#9aa3ad');
  p.disc(14.5, 22, 13, 12, '#8d97a3'); p.rect(2, 22, 26, 12, '#8d97a3');
  for (const [x, y] of [[5, 15], [12, 12], [20, 14], [4, 25], [24, 24], [14, 30]]) p.rect(x, y, 4, 1, '#6a7480');
  p.disc(14.5, 24, 6, 5, '#3a2a2a'); p.rect(8.5, 24, 12, 6, '#3a2a2a');
  p.disc(14.5, 27, 4.5, 3.2, '#e8833a'); p.disc(14.5, 28, 2.6, 1.8, '#ffd84a');
  p.rect(1, 31, 28, 3, '#5d636e');
  p.outline().save('obj_forge');

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
  // 오로라 띠: 가로로 이어지는 물결 리본(색은 화면에서 물들인다)
  p = new Paint(128, 40);
  for (let x = 0; x < 128; x++) {
    const y = 20 + Math.sin((x / 128) * Math.PI * 4) * 7 + Math.sin((x / 128) * Math.PI * 2) * 4;
    p.rect(x, Math.round(y - 7), 1, 14, '#9a9a9a'); p.rect(x, Math.round(y - 4), 1, 8, '#d0d0d0'); p.rect(x, Math.round(y - 1), 1, 2, '#ffffff');
  }
  p.save('fx_aurora');
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
  // 우표: 톱니 모양 가장자리의 종이 + 효과별 색과 작은 무늬
  const stampArt: [string, string, (p: Paint) => void][] = [
    ['dmg', '#d9574a', (q) => { q.line(4, 9, 8, 5, '#f2f0e6'); q.set(4, 10, '#f6c945'); }],
    ['hp', '#e25d7a', (q) => { q.disc(5, 6.5, 1.3, 1.3, '#f2f0e6'); q.disc(7.5, 6.5, 1.3, 1.3, '#f2f0e6'); q.rect(5, 7, 3, 2, '#f2f0e6'); q.set(6, 9, '#f2f0e6'); }],
    ['def', '#6a7480', (q) => { q.rect(4, 4, 5, 4, '#c9d1d9'); q.rect(5, 8, 3, 1, '#c9d1d9'); q.set(6, 9, '#c9d1d9'); }],
    ['acc', '#e8833a', (q) => { q.disc(6.5, 6.5, 2.6, 2.6, '#f2f0e6'); q.disc(6.5, 6.5, 1.4, 1.4, '#d9574a'); }],
    ['crit', '#8a6fd1', (q) => { q.line(6, 3, 6, 9, '#f6c945'); q.line(3, 6, 9, 6, '#f6c945'); q.set(6, 6, '#ffffff'); }],
    ['mining', '#8d97a3', (q) => { q.line(3, 5, 9, 5, '#f2f0e6'); q.line(6, 5, 6, 10, '#b9824f'); }],
    ['chopping', '#5fb859', (q) => { q.rect(6, 4, 1, 6, '#b9824f'); q.rect(7, 4, 2, 3, '#f2f0e6'); }],
    ['drop', '#b9824f', (q) => { q.disc(6.5, 7, 2.6, 2.4, '#e8c08a'); q.rect(5, 3, 3, 2, '#e8c08a'); }],
    ['coins', '#c98f2a', (q) => { q.disc(6.5, 6.5, 2.6, 2.6, '#f6c945'); q.rect(6, 5, 1, 3, '#c98f2a'); }],
    ['xp', '#4e8de2', (q) => { q.rect(3, 4, 7, 5, '#f2f0e6'); q.rect(6, 4, 1, 5, '#4e8de2'); }],
    ['afk', '#3a9a8a', (q) => { q.rect(4, 3, 5, 1, '#f2f0e6'); q.rect(4, 9, 5, 1, '#f2f0e6'); q.line(4, 4, 8, 8, '#f6c945'); q.line(8, 4, 4, 8, '#f6c945'); }],
  ];
  stampArt.push(
    ['fishing', '#4e8de2', (q) => { q.line(4, 3, 9, 8, '#f2f0e6'); q.disc(9, 9, 1.2, 1.2, '#f6c945'); }],
    ['catching', '#5fb859', (q) => { q.disc(6.5, 6, 3, 2.4, '#f2f0e6'); q.line(6, 8, 6, 10, '#f2f0e6'); }],
    ['str', '#d9574a', (q) => { q.rect(4, 4, 5, 5, '#f2f0e6'); q.rect(5, 3, 3, 1, '#f2f0e6'); }],
    ['agi', '#5fb859', (q) => { q.line(3, 9, 9, 3, '#f2f0e6'); q.line(5, 9, 10, 4, '#f2f0e6'); }],
    ['wis', '#4e8de2', (q) => { q.disc(6.5, 6.5, 3, 3, '#f2f0e6'); q.disc(6.5, 6.5, 1.4, 1.4, '#4e8de2'); }],
    ['luk', '#c98f2a', (q) => { q.disc(5, 5, 1.6, 1.6, '#5fb859'); q.disc(8, 5, 1.6, 1.6, '#5fb859'); q.disc(5, 8, 1.6, 1.6, '#5fb859'); q.disc(8, 8, 1.6, 1.6, '#5fb859'); }],
    ['card', '#8a6fd1', (q) => { q.rect(4, 3, 5, 7, '#f2f0e6'); q.rect(5, 5, 3, 2, '#f6c945'); }],
    ['hpPct', '#e25d7a', (q) => { q.disc(5, 5, 1.8, 1.8, '#f2f0e6'); q.disc(8, 5, 1.8, 1.8, '#f2f0e6'); q.line(3, 6, 6, 10, '#f2f0e6'); q.line(10, 6, 7, 10, '#f2f0e6'); }],
  );
  for (const [k, col, art] of stampArt) {
    p = new Paint(13, 13);
    p.rect(1, 1, 11, 11, '#f2f0e6');
    for (let i = 1; i < 12; i += 2) { p.set(i, 0, '#f2f0e6'); p.set(i, 12, '#f2f0e6'); p.set(0, i, '#f2f0e6'); p.set(12, i, '#f2f0e6'); }
    p.rect(2, 2, 9, 9, col);
    art(p);
    p.outline().save(`it_stamp_${k}`);
  }
  // 광석·주괴·통나무(색만 다른 같은 모양)
  for (const [k, a, b, gem] of [['ore_blue', '#7b8591', '#5a636e', '#4e8de2'], ['ore_gold', '#8a8070', '#6a6254', '#f2c14e'], ['ore_amber', '#a08468', '#806a52', '#f0902a'], ['ore_frost', '#8aa0b8', '#6a809a', '#7ae0ff']] as const) {
    p = new Paint(12, 12); p.disc(5.5, 6.5, 4.4, 3.6, a); p.disc(4, 5.5, 1.8, 1.4, gem); p.disc(7.5, 7.5, 1.6, 1.3, gem); p.rect(3, 9, 6, 1, b); p.set(3, 5, '#ffffff');
    p.outline().save(`it_${k}`);
  }
  for (const [k, a, b, c2] of [['bar_blue', '#4e7ad0', '#a5c8ff', '#2a4a8a'], ['bar_gold', '#e0a83a', '#fff1a8', '#8a5a1e'], ['bar_amber', '#e8822a', '#ffd08a', '#8a4a18'], ['bar_frost', '#6ab8e8', '#e0faff', '#2a5a8a']] as const) {
    p = new Paint(13, 10); p.rect(1, 4, 11, 5, a); p.rect(3, 2, 7, 2, b); p.rect(2, 3, 9, 1, a); p.rect(3, 2, 4, 1, '#ffffff'); p.rect(1, 8, 11, 1, c2);
    p.outline().save(`it_${k}`);
  }
  for (const [k, a, b, c2] of [['willowlog', '#8a7a52', '#6a5a3a', '#c8b88a'], ['moonlog', '#d8d4e8', '#a49ec0', '#8a9ae8']] as const) {
    p = new Paint(13, 11); p.rect(2, 3, 9, 6, a); p.rect(2, 7, 9, 2, b); p.disc(10.5, 5.5, 2, 3, c2); p.set(10, 5, b); p.rect(4, 4, 3, 1, c2);
    p.outline().save(`it_${k}`);
  }
  // 콜로세움 입장권
  p = new Paint(13, 10); p.rect(1, 1, 11, 8, '#f6c945'); p.rect(4, 1, 1, 8, '#c98f2a'); p.disc(8.5, 5, 1.8, 1.8, '#d9574a'); p.set(0, 5, null); p.set(12, 5, null); p.rect(2, 2, 1, 6, '#fff1a8');
  p.outline().save('it_ticket');
  // 펫 크리스탈 조각: 분홍빛 결정
  p = new Paint(11, 13); p.line(5, 0, 1, 6, '#f29ad8'); p.line(5, 0, 9, 6, '#f29ad8'); p.rect(2, 5, 7, 4, '#f29ad8'); p.line(1, 7, 5, 12, '#d96ab8'); p.line(9, 7, 5, 12, '#d96ab8'); p.rect(3, 8, 5, 2, '#d96ab8'); p.rect(4, 2, 2, 4, '#ffffff');
  p.outline().save('it_petshard');
  // ───── 2월드 재료·음식·보상 ─────
  p = new Paint(12, 12); p.line(2, 10, 9, 2, '#6aa84a'); p.line(3, 10, 10, 2, '#4a8a3a'); p.set(10, 1, '#f4f0d8'); p.set(9, 1, '#f4f0d8'); p.set(4, 7, '#a8e878'); p.outline().save('it_cactus_spine');
  p = new Paint(12, 12); p.disc(4, 8, 3, 2.5, '#b8603e'); p.disc(7, 5, 2.4, 2, '#b8603e'); p.disc(9, 3, 1.8, 1.6, '#c8704a'); p.line(9, 3, 11, 1, '#3a2018'); p.set(3, 7, '#f0a07a'); p.outline().save('it_scorp_tail');
  p = new Paint(12, 12); p.line(2, 10, 9, 2, '#c8582a'); for (let i = 0; i < 6; i++) { p.line(3 + i, 9 - i, 1 + i, 6 - i, i % 2 ? '#ffb04a' : '#ff8a3a'); p.line(3 + i, 9 - i, 6 + i, 10 - i, '#ffd06a'); } p.outline().save('it_heat_feather');
  p = new Paint(12, 12); p.rect(2, 3, 8, 7, '#e8dcc0'); p.rect(2, 4, 8, 1, '#b8a888'); p.rect(2, 7, 8, 1, '#b8a888'); p.rect(9, 9, 2, 2, '#e8dcc0'); p.set(3, 3, '#ffffff'); p.outline().save('it_old_bandage');
  p = new Paint(12, 12); p.rect(4, 1, 4, 10, '#eef6fa'); p.rect(2, 3, 8, 6, '#eef6fa'); p.rect(5, 2, 1, 7, '#ffffff'); p.rect(7, 3, 1, 6, '#c8dce8'); p.outline().save('it_salt_crystal');
  p = new Paint(12, 12); p.disc(6, 6, 5, 4, '#c8a462'); p.disc(6, 6, 3.4, 2.6, '#e2c482'); p.line(2, 6, 10, 6, '#a8844e'); p.set(4, 4, '#fff0c8'); p.outline().save('it_worm_scale');
  p = new Paint(12, 12); p.disc(6, 7, 4, 4, '#ff7a2a'); p.disc(6, 6, 3, 3.4, '#ffb04a'); p.disc(6, 6, 1.6, 2, '#fff0a8'); p.set(6, 1, '#ffb04a'); p.set(5, 2, '#ff7a2a'); p.outline().save('it_sun_ember');
  p = new Paint(13, 11); p.rect(2, 3, 9, 6, '#b8864a'); p.rect(2, 7, 9, 2, '#8a6034'); p.disc(10.5, 5.5, 2, 3, '#e8c88a'); p.set(10, 5, '#8a6034'); p.rect(4, 4, 3, 1, '#e0b070'); p.outline().save('it_palmlog');
  p = new Paint(10, 13); p.rect(3, 1, 4, 2, '#3a8a3a'); p.rect(2, 3, 6, 9, '#6ac05a'); p.rect(3, 5, 4, 6, '#a8e878'); p.rect(2, 3, 6, 1, '#f4f0d8'); p.outline().save('it_cactus_juice');
  p = new Paint(13, 11); p.disc(6.5, 7, 6, 3.5, '#a86a3a'); p.disc(6.5, 5.5, 5, 2.4, '#f6e2b0'); for (const x of [3, 6, 9]) p.disc(x + 0.5, 4.5, 1, 0.8, '#7a3a1a'); p.outline().save('it_date_cake');
  p = new Paint(12, 12); p.disc(4, 4, 3.4, 3.4, '#f2a83a'); p.disc(4, 4, 1.4, 1.4, null); p.rect(6, 3, 5, 2, '#f2a83a'); p.rect(9, 5, 1, 2, '#f2a83a'); p.rect(7, 5, 1, 2, '#f2a83a'); p.disc(4, 4, 0.8, 0.8, '#ff7a2a'); p.outline().save('it_sunkey');
  p = new Paint(14, 11); p.rect(1, 4, 12, 6, '#d8b070'); for (const x of [1, 5, 9]) p.rect(x, 1, 3, 4, '#d8b070'); p.rect(1, 9, 12, 1, '#a07a46'); p.disc(7, 6.5, 1.5, 1.5, '#ff7a2a'); p.set(3, 5, '#fff0c8'); p.outline().save('it_sand_crown');
  p = new Paint(12, 14); p.rect(3, 10, 6, 3, '#a07a46'); p.rect(5, 7, 2, 3, '#d8b070'); p.disc(6, 4.5, 4.5, 4, '#f2a83a'); p.disc(6, 4.5, 2.4, 2, '#ffd08a'); p.set(4, 3, '#ffffff'); p.outline().save('it_trophy_sand');
  p = new Paint(13, 12); p.rect(1, 3, 11, 8, '#d8b878'); p.rect(1, 3, 11, 2, '#e8c888'); p.rect(6, 3, 1, 8, '#a8844e'); p.rect(1, 6, 11, 1, '#a8844e'); p.rect(4, 1, 5, 2, '#e2574a'); p.outline().save('it_parcel');
  // ───── 3월드 재료·음식·보상 ─────
  p = new Paint(12, 12); for (const [x, y, r] of [[4, 7, 3], [8, 6, 3], [6, 4, 2.6]] as const) p.disc(x, y, r, r * 0.9, '#f4f8fc'); p.set(4, 5, '#ffffff'); p.rect(3, 9, 6, 1, '#c8d6e8'); p.outline().save('it_snow_tuft');
  p = new Paint(12, 12); p.disc(6, 6.5, 4, 5, '#a8743e'); for (const [x, y] of [[5, 4], [7, 6], [5, 8], [7, 10]] as const) { p.set(x, y, '#6e4630'); p.set(x + 1, y - 1, '#d0a06a'); } p.rect(5, 0, 2, 2, '#3a8a4a'); p.outline().save('it_pine_cone');
  p = new Paint(12, 12); p.line(2, 10, 9, 2, '#2a3448'); for (let i = 0; i < 6; i++) { p.line(3 + i, 9 - i, 1 + i, 6 - i, '#3a4460'); p.line(3 + i, 9 - i, 6 + i, 10 - i, '#f4f6fa'); } p.outline().save('it_peng_feather');
  p = new Paint(12, 12); for (let y = 1; y < 11; y++) { const w = Math.max(1, Math.round((11 - y) / 2.4)); p.rect(6 - w, y, w * 2, 1, '#a8dcf4'); } p.line(5, 2, 5, 7, '#e8f8ff'); p.outline().save('it_icicle_shard');
  p = new Paint(12, 12); p.disc(6, 7, 5, 4, '#eef2f8'); for (const x of [2, 5, 8]) p.disc(x + 1, 3.5, 1.6, 2, '#eef2f8'); p.rect(3, 9, 6, 1, '#c8d4e4'); p.set(4, 5, '#ffffff'); p.outline().save('it_yeti_fur');
  p = new Paint(12, 12); for (const [x, y, r, c] of [[4, 5, 2.4, '#7affc8'], [8, 4, 1.8, '#ff9ae0'], [7, 8, 2, '#9ad8ff'], [3, 9, 1.2, '#c8a8ff']] as const) p.disc(x, y, r, r, c); p.set(4, 4, '#ffffff'); p.outline('#3a2a6a').save('it_aurora_dust');
  p = new Paint(12, 12); p.disc(6, 6, 5, 5, '#4a8ae8'); p.disc(6, 6, 3.4, 3.4, '#4ad0ff'); p.disc(6, 6, 1.6, 1.6, '#e0faff'); p.line(2, 6, 10, 6, '#2a5aa8'); p.set(4, 3, '#ffffff'); p.outline().save('it_frost_core');
  p = new Paint(13, 11); p.rect(2, 3, 9, 6, '#7a5a3c'); p.rect(2, 7, 9, 2, '#5a4030'); p.disc(10.5, 5.5, 2, 3, '#d8b88a'); p.set(10, 5, '#5a4030'); p.rect(4, 3, 5, 1, '#f4f8fc'); p.outline().save('it_pinelog');
  p = new Paint(12, 12); p.rect(3, 4, 7, 7, '#f2f0e6'); p.rect(9, 6, 2, 3, '#f2f0e6'); p.rect(4, 5, 5, 2, '#8a5a3a'); p.rect(4, 4, 5, 1, '#fff6e8'); p.line(5, 1, 5, 3, '#e8e4f0'); p.line(7, 0, 7, 2, '#e8e4f0'); p.outline().save('it_hot_cocoa');
  p = new Paint(13, 11); p.disc(6.5, 6, 6, 4, '#c8d4e4'); p.disc(6.5, 5, 5, 2, '#6aa84a'); p.set(4, 4, '#a8e878'); p.set(8, 5, '#3a7a3a'); p.rect(3, 9, 7, 1, '#8a9ab0'); p.outline().save('it_pine_soup');
  p = new Paint(12, 12); p.disc(4, 4, 3.4, 3.4, '#8ad0f0'); p.disc(4, 4, 1.4, 1.4, null); p.rect(6, 3, 5, 2, '#8ad0f0'); p.rect(9, 5, 1, 2, '#8ad0f0'); p.rect(7, 5, 1, 2, '#8ad0f0'); p.disc(4, 4, 0.8, 0.8, '#4a8ae8'); p.outline().save('it_frostkey');
  p = new Paint(14, 11); p.rect(1, 4, 12, 6, '#a8e8ff'); for (const x of [1, 5, 9]) p.rect(x, 1, 3, 4, '#a8e8ff'); p.rect(1, 9, 12, 1, '#4a7ab8'); p.disc(7, 6.5, 1.5, 1.5, '#4a8ae8'); p.set(3, 5, '#ffffff'); p.outline().save('it_frost_crown');
  p = new Paint(12, 14); p.rect(3, 10, 6, 3, '#4a7ab8'); p.rect(5, 7, 2, 3, '#a8c8e4'); p.disc(6, 4.5, 4.5, 4, '#8ad0f0'); p.disc(6, 4.5, 2.4, 2, '#e0faff'); p.set(4, 3, '#ffffff'); p.outline().save('it_trophy_frost');
  p = new Paint(12, 11); p.disc(6, 6, 1.4, 3.4, '#5a6a8a'); p.disc(3, 4, 2.6, 2.2, '#e8f2fa'); p.disc(9, 4, 2.6, 2.2, '#e8f2fa'); p.disc(3, 8, 2, 1.6, '#c8e8ff'); p.disc(9, 8, 2, 1.6, '#c8e8ff'); p.set(5, 2, '#5a6a8a'); p.set(7, 2, '#5a6a8a'); p.outline().save('it_bug_frost');
  // 덫 사냥 동물
  for (const [k, body, ear, eye] of [['cr_hare', '#f4f6fa', '#f2a0b0', '#1e1420'], ['cr_fox', '#e8f2fa', '#8ad0f0', '#1e1420'], ['cr_weasel', '#c8e4f4', '#6aa8d0', '#1e1420'], ['cr_marten', '#8a7ac8', '#7affc8', '#ffffff'], ['cr_reindeer', '#a8845a', '#fff0a8', '#1e1420']] as const) {
    p = new Paint(13, 12);
    p.disc(7, 8, 5, 3.4, body); p.disc(3.5, 5, 2.8, 2.6, body);
    if (k === 'cr_hare') { p.rect(2, 0, 1, 4, body); p.rect(4, 0, 1, 4, body); p.set(2, 1, ear); p.set(4, 1, ear); }
    else if (k === 'cr_reindeer') { p.line(2, 2, 1, 0, ear); p.line(4, 2, 6, 0, ear); p.set(0, 1, ear); p.set(6, 1, ear); }
    else { p.set(2, 2, body); p.set(5, 2, body); p.set(2, 1, ear); p.set(5, 1, ear); }
    if (k === 'cr_fox' || k === 'cr_marten') p.disc(11.5, 6, 1.6, 2.6, ear);
    p.set(2, 5, eye); p.set(1, 6, '#3a2a2a'); p.rect(4, 11, 1, 1, mix(body, '#000000', 0.3)); p.rect(9, 11, 1, 1, mix(body, '#000000', 0.3));
    p.outline().save(`it_${k}`);
  }
  for (const [k, col] of [['trap_wood', '#a8744e'], ['trap_iron', '#9aa3ad'], ['trap_frost', '#8ad0f0']] as const) {
    p = new Paint(13, 12); p.disc(6.5, 8, 6, 3, col); p.disc(6.5, 8, 3.6, 1.6, mix(col, '#000000', 0.35)); for (const x of [2, 4, 6, 8, 10]) p.rect(x, 4, 1, 3, mix(col, '#ffffff', 0.4)); p.rect(5, 1, 3, 2, '#c9a26a');
    p.outline().save(`it_${k}`);
  }
  p = new Paint(12, 12); p.rect(2, 2, 8, 4, '#e25d4e'); p.rect(2, 6, 3, 5, '#e25d4e'); for (const x of [3, 5, 7, 9]) p.set(x, 3, '#f4f6fa'); p.rect(2, 10, 3, 1, '#f4f6fa'); p.outline().save('it_fur_scarf');
  p = new Paint(12, 12); p.line(2, 1, 5, 6, '#e8d4a8'); p.line(9, 1, 6, 6, '#e8d4a8'); p.set(1, 3, '#e8d4a8'); p.set(10, 3, '#e8d4a8'); p.disc(5.5, 8, 2.6, 2.6, '#fff0a8'); p.set(5, 7, '#ffffff'); p.outline().save('it_antler_charm');
  // 물고기·곤충
  for (const [k, body, fin, eye] of [['fish_minnow', '#c8d8e0', '#8aa8b8', '#1e1420'], ['fish_salt', '#e8e4d8', '#b8ae9e', '#1e1420'], ['fish_star', '#4a4aa8', '#2a2a78', '#fff6c8'], ['fish_ice', '#b8e0f4', '#6aa8d0', '#1e1420']] as const) {
    p = new Paint(13, 10); p.disc(6, 5, 5, 3, body); p.line(10, 5, 12, 2, fin); p.line(10, 5, 12, 8, fin); p.rect(11, 3, 1, 5, fin); p.rect(4, 2, 3, 1, fin); p.set(3, 4, eye); p.rect(4, 6, 4, 1, mix(body, '#000000', 0.15));
    if (k === 'fish_star') { p.set(1, 6, '#fff6c8'); p.set(0, 7, '#fff6c8'); }
    p.outline().save(`it_${k}`);
  }
  p = new Paint(12, 10); p.disc(3, 5, 2, 1.8, '#3a2a20'); p.disc(6, 5, 1.4, 1.4, '#3a2a20'); p.disc(9, 5, 2.4, 2, '#3a2a20'); for (const x of [4, 6, 8]) { p.set(x, 8, '#3a2a20'); p.set(x, 2, '#3a2a20'); } p.set(9, 4, '#8a6a5a'); p.outline().save('it_bug_ant');
  p = new Paint(12, 11); p.disc(6, 4, 2, 2.4, '#4a3a2a'); p.disc(6, 8, 2.4, 2.4, '#ffb04a'); p.disc(6, 8, 1.2, 1.2, '#fff0b8'); p.disc(3, 3, 2, 1.4, '#e8e4f0'); p.disc(9, 3, 2, 1.4, '#e8e4f0'); p.outline().save('it_bug_firefly');
  p = new Paint(12, 12); p.disc(6, 7, 4.5, 4.5, '#f2c14e'); p.line(6, 3, 6, 11, '#a8782a'); p.disc(6, 2.5, 2, 1.4, '#3a2a20'); p.set(4, 5, '#fff1a8'); p.set(1, 6, '#3a2a20'); p.set(11, 6, '#3a2a20'); p.outline().save('it_bug_beetle');
  // 강화석: 둥근 돌에 색 무늬
  for (const [k, base, dark, mark] of [['atk', '#b8bcc8', '#7c8090', '#e2574a'], ['guard', '#b8bcc8', '#7c8090', '#4a8fe2'], ['stat', '#c8bca8', '#8c7c68', '#f6c945'], ['mine', '#a8a4a0', '#6c6864', '#7fd4ff'], ['chop', '#b4a88c', '#786c50', '#6fcf5a'], ['lure', '#a8b8c0', '#6a7a84', '#e25d5d']] as const) {
    p = new Paint(12, 11); p.disc(6, 5.5, 5.5, 5, base); p.rect(1, 6, 10, 4, dark); p.disc(6, 5, 4.5, 4, base);
    p.rect(3, 2, 2, 1, '#ffffff');
    if (k === 'atk') { p.line(4, 8, 8, 3, mark); p.set(8, 3, '#ffd0c8'); }
    else if (k === 'guard') { p.rect(4, 3, 4, 3, mark); p.rect(5, 6, 2, 2, mark); }
    else if (k === 'stat') { p.rect(5, 3, 2, 6, mark); p.rect(3, 5, 6, 2, mark); }
    else if (k === 'mine') { p.line(3, 4, 8, 7, mark); p.line(4, 7, 8, 4, mark); }
    else if (k === 'lure') { p.line(6, 2, 6, 7, mark); p.disc(6, 8, 1.6, 1.6, mark); p.set(7, 2, '#ece6f4'); }
    else { p.line(4, 3, 4, 8, mark); p.line(6, 3, 6, 8, mark); p.line(8, 4, 8, 7, mark); }
    p.outline().save(`it_stone_${k}`);
  }
  // 순간이동 티켓: 보라 표 + 소용돌이
  p = new Paint(13, 10); p.rect(1, 1, 11, 8, '#8a6fd1'); p.rect(4, 1, 1, 8, '#5a4a9a'); p.disc(8.5, 5, 2.2, 2.2, '#a5d8ff'); p.disc(8.5, 5, 1, 1, '#ffffff'); p.set(0, 5, null); p.set(12, 5, null); p.rect(2, 2, 1, 6, '#c4b4f0');
  p.outline().save('it_tpticket');
  // 몬스터 재료·음식
  p = new Paint(12, 12); p.disc(6, 7, 5, 4, '#7a6a48'); for (const [x, y] of [[4, 5], [8, 5], [6, 8]]) p.disc(x, y, 1.4, 1.2, '#a89a70'); p.outline().save('it_shell');
  p = new Paint(12, 12); for (const [x, y, r] of [[5, 6, 2.6], [8, 4, 1.6], [8, 8, 1.8], [3, 9, 1.2]] as const) p.disc(x, y, r, r, '#f6e46a'); p.set(5, 5, '#ffffff'); p.outline('#7a6a20').save('it_glowdust');
  p = new Paint(12, 12); p.line(2, 10, 9, 2, '#e9eef6'); p.line(3, 10, 10, 2, '#c4d4e8'); p.line(4, 9, 6, 5, '#ffffff'); p.line(1, 11, 3, 9, '#8a9ab0'); p.outline().save('it_feather');
  p = new Paint(12, 12); p.rect(2, 2, 8, 8, '#9a9488'); p.rect(3, 3, 6, 1, '#4ec8c8'); p.rect(5, 4, 1, 4, '#4ec8c8'); p.rect(3, 8, 6, 1, '#4ec8c8'); p.outline().save('it_runestone');
  p = new Paint(12, 12); p.disc(6, 5, 5, 3.5, '#8a6fd1'); p.rect(4, 7, 4, 4, '#f2e6d0'); p.set(4, 3, '#e4d8ff'); p.set(8, 4, '#e4d8ff'); p.outline().save('it_sporecap');
  p = new Paint(12, 12); p.disc(6, 7, 5, 3.5, '#8a6a4a'); p.disc(6, 6, 4, 2, '#a8864a'); p.disc(5, 5.5, 1.2, 0.8, '#6aa84a'); p.rect(1, 8, 10, 2, '#6a4a32'); p.outline().save('it_stew');
  p = new Paint(12, 12); p.disc(6, 7, 5, 3.5, '#d9a066'); p.disc(6, 6, 3.5, 2, '#a8b4ff'); p.set(5, 5, '#ffffff'); p.outline().save('it_moonpie');
  p = new Paint(12, 12); for (const [x, y] of [[4, 4], [8, 4], [4, 8], [8, 8]] as const) p.disc(x, y, 2.6, 2.6, '#5fb859'); p.disc(6, 6, 1.4, 1.4, '#8fde5d'); p.line(7, 9, 9, 11, '#3a7a30'); p.set(3, 3, '#a8e878'); p.outline().save('it_four_leaf');
  // 4월드 재료·음식
  p = new Paint(12, 12); for (const [x, y, r] of [[4, 8, 2.4], [8, 7, 2.6], [6, 4, 2]] as const) p.disc(x, y, r, r * 0.8, '#f6d76a'); p.set(5, 3, '#ffffff'); p.set(9, 6, '#ffffff'); p.outline('#8a6a20').save('it_star_sand');
  p = new Paint(12, 12); p.disc(6, 7, 5, 4, '#8a7ca0'); p.disc(5, 6, 2, 1.4, '#6a5e7a'); p.disc(8, 8, 1.4, 1, '#6a5e7a'); p.set(4, 4, '#d0c4e0'); p.outline().save('it_crater_shell');
  p = new Paint(12, 12); p.disc(6, 6, 5, 4.6, '#c88ae8'); p.disc(5, 5, 2, 1.6, '#f0d8ff'); p.set(8, 7, '#ffffff'); p.set(4, 8, '#ffffff'); p.outline().save('it_neb_jelly');
  p = new Paint(12, 12); p.disc(6, 7, 5, 4, '#7a6a64'); p.line(3, 7, 7, 5, '#ff7a2a'); p.line(6, 9, 9, 7, '#ff7a2a'); p.set(4, 5, '#a89a94'); p.outline().save('it_meteor_chip');
  p = new Paint(12, 12); p.line(2, 10, 9, 2, '#e8c88a'); p.line(3, 10, 10, 2, '#c89a5a'); p.line(4, 9, 6, 5, '#fff0c8'); p.set(10, 1, '#fff0a8'); p.outline().save('it_ring_plume');
  p = new Paint(12, 12); for (let i = 0; i < 9; i++) p.rect(1 + i, 6 - Math.round(i / 3), 2, 1 + Math.round(i / 3), i < 4 ? '#ffffff' : '#9ad8f6'); p.outline('#2a4a7a').save('it_comet_hair');
  p = new Paint(12, 12); p.rect(4, 1, 4, 10, '#3a1a6a'); p.rect(2, 4, 8, 4, '#3a1a6a'); p.rect(5, 3, 2, 6, '#c87aff'); p.set(5, 4, '#f0d8ff'); p.outline().save('it_void_shard');
  p = new Paint(13, 11); p.rect(2, 3, 9, 6, '#4a3a6a'); p.rect(2, 7, 9, 2, '#342a52'); p.disc(10.5, 5.5, 2, 3, '#c8b8e8'); p.set(10, 5, '#f6e08a'); p.set(5, 5, '#f6e08a'); p.set(7, 4, '#f6e08a'); p.outline().save('it_starlog');
  p = new Paint(12, 12); p.disc(6, 7, 5, 4, '#6a6088'); p.disc(5, 5, 3, 2, '#8a80a8'); for (const [x, y] of [[4, 7], [8, 6], [6, 9]]) p.set(x, y, '#c87aff'); p.outline().save('it_ore_nova');
  p = new Paint(13, 9); p.rect(1, 3, 11, 5, '#9a6ae8'); p.rect(3, 1, 7, 2, '#b48aff'); p.rect(3, 1, 7, 1, '#f0e0ff'); p.rect(1, 7, 11, 1, '#5a3aa8'); p.outline().save('it_bar_nova');
  p = new Paint(12, 12); p.disc(6, 4, 3, 3, '#ff9ae0'); p.rect(5, 6, 3, 4, '#ff9ae0'); p.disc(5, 10, 2, 1.4, '#ff9ae0'); p.set(5, 3, '#1a0a20'); p.rect(3, 6, 2, 1, '#d86ab8'); p.outline().save('it_fish_neb');
  p = new Paint(12, 12); p.disc(7, 6, 2.6, 2, '#fff6c8'); p.line(1, 9, 5, 7, '#9ad8f6'); p.line(1, 10, 4, 8, '#c8f0ff'); p.set(6, 5, '#ffffff'); p.outline().save('it_bug_neb');
  p = new Paint(12, 12); p.disc(6, 7, 5, 3.6, '#f4f0e6'); p.disc(6, 6, 3.4, 2, '#ffffff'); p.disc(6, 6, 1.4, 1, '#f6c945'); p.rect(1, 8, 10, 2, '#d8d0c0'); p.outline().save('it_moon_cake');
  p = new Paint(12, 12); p.disc(6, 7, 5, 3.5, '#5a3aa8'); p.disc(6, 6, 4, 2, '#c87aff'); p.set(5, 5, '#fff6c8'); p.set(8, 6, '#fff6c8'); p.rect(1, 8, 10, 2, '#3a2a6a'); p.outline().save('it_nova_stew');
  p = new Paint(12, 12); p.disc(4, 4, 3.4, 3.4, '#b48aff'); p.disc(4, 4, 1.4, 1.4, null); p.rect(6, 3, 5, 2, '#b48aff'); p.rect(9, 5, 1, 2, '#b48aff'); p.rect(7, 5, 1, 2, '#b48aff'); p.disc(4, 4, 0.8, 0.8, '#3a1a6a'); p.outline().save('it_voidkey');
  p = new Paint(12, 14); p.rect(3, 10, 6, 3, '#5a3aa8'); p.rect(5, 7, 2, 3, '#b48aff'); p.disc(6, 4.5, 4.5, 4, '#3a2a7a'); p.disc(6, 4.5, 2.4, 2, '#7affe8'); p.set(4, 3, '#ffffff'); p.outline().save('it_trophy_void');
  p = new Paint(13, 11); p.disc(6.5, 5.5, 6, 5, '#2a1648'); p.disc(4, 5, 1.8, 1.4, '#ffe066'); p.disc(9, 5, 1.8, 1.4, '#ffe066'); p.rect(1, 1, 2, 3, '#c87aff'); p.rect(10, 1, 2, 3, '#c87aff'); p.set(6, 8, '#c87aff'); p.outline().save('it_void_mask');
  // 투구·갑옷·다리 갑옷·장화(푸른쇠·금빛)
  for (const [k, a, b, c2] of [['blue', '#6a9ae8', '#3a5a9a', '#c4dcff'], ['gold', '#f2c14e', '#a8782a', '#fff1a8'], ['amber', '#f0902a', '#9a5420', '#ffd08a'], ['frost', '#8ad0f0', '#3a7ab0', '#e0f6ff'], ['nova', '#b48aff', '#5a3aa8', '#f0e0ff']] as const) {
    p = new Paint(13, 12); p.disc(6.5, 6.5, 5.5, 5, a); p.rect(1, 6, 11, 5, a); p.rect(5, 5, 3, 6, b); p.rect(3, 3, 2, 2, c2); p.rect(1, 10, 11, 1, b);
    p.outline().save(`it_helm_${k}`);
    p = new Paint(13, 12); p.rect(3, 1, 7, 10, a); p.rect(0, 1, 3, 5, a); p.rect(10, 1, 3, 5, a); p.rect(5, 1, 3, 1, null); p.rect(6, 3, 1, 7, b); p.rect(3, 5, 7, 1, b); p.rect(4, 2, 1, 3, c2);
    p.outline().save(`it_plate_${k}`);
    p = new Paint(12, 13); p.rect(2, 1, 8, 4, a); p.rect(2, 5, 3, 7, a); p.rect(7, 5, 3, 7, a); p.rect(2, 1, 8, 1, b); p.rect(2, 7, 3, 1, b); p.rect(7, 7, 3, 1, b); p.rect(3, 2, 2, 1, c2);
    p.outline().save(`it_legs_${k}`);
    p = new Paint(13, 11); p.rect(2, 1, 4, 6, a); p.rect(2, 6, 8, 3, a); p.disc(10, 7.5, 2, 1.5, a); p.rect(2, 9, 10, 1, b); p.rect(3, 2, 1, 4, c2);
    p.outline().save(`it_boots_${k}`);
  }
  // 바지·신발·트로피
  for (const [k, a, b] of [['pants_moss', '#5fb859', '#3b8c4f'], ['pants_red', '#d9674f', '#8a3328']] as const) {
    p = new Paint(12, 13);
    p.rect(2, 1, 8, 4, a); p.rect(2, 5, 3, 7, a); p.rect(7, 5, 3, 7, a); p.rect(2, 1, 8, 1, b); p.rect(4, 5, 1, 7, b); p.rect(9, 5, 1, 7, b); p.rect(3, 2, 2, 1, '#ffffff');
    p.outline().save(`it_${k}`);
  }
  for (const [k, a, b] of [['shoes_leaf', '#8fde5d', '#3b8c4f'], ['boots_red', '#d9674f', '#6a2a22']] as const) {
    p = new Paint(13, 11);
    p.rect(2, 1, 4, 6, a); p.rect(2, 6, 8, 3, a); p.disc(10, 7.5, 2, 1.5, a); p.rect(2, 9, 10, 1, b); p.rect(3, 2, 1, 4, '#ffffff');
    p.outline().save(`it_${k}`);
  }
  p = new Paint(13, 14);
  p.rect(3, 1, 7, 5, '#f6c945'); p.disc(6.5, 6, 3.5, 2.5, '#f6c945'); p.rect(0, 2, 3, 1, '#f6c945'); p.rect(10, 2, 3, 1, '#f6c945'); p.rect(0, 2, 1, 3, '#f6c945'); p.rect(12, 2, 1, 3, '#f6c945');
  p.rect(6, 8, 1, 3, '#c98f2a'); p.rect(3, 11, 7, 2, '#5fb859'); p.rect(4, 2, 2, 3, '#fff1a8'); p.disc(6.5, 3.5, 1.2, 1.2, '#5fb859');
  p.outline().save('it_trophy_moss');
  // 석상 조각: 깨진 돌 조각 + 석상별 색 결정
  for (const [k, gem] of [['str', '#d9574a'], ['agi', '#5fb859'], ['wis', '#4e8de2'], ['luk', '#f6c945'], ['guard', '#9aa3ad'], ['feast', '#e25d7a'], ['fortune', '#c98f2a']] as const) {
    p = new Paint(12, 12);
    p.rect(2, 3, 8, 7, '#b4bcc6'); p.rect(3, 2, 5, 1, '#b4bcc6'); p.rect(2, 9, 3, 2, '#b4bcc6'); p.set(10, 5, '#b4bcc6');
    p.rect(2, 3, 2, 6, '#dfe5ea'); p.rect(8, 6, 2, 4, '#8d97a3');
    p.disc(6, 6, 1.8, 1.8, gem); p.set(5, 5, '#ffffff');
    p.outline().save(`it_statue_${k}`);
    p = new Paint(12, 12);
    p.rect(2, 3, 8, 7, '#e8b830'); p.rect(3, 2, 5, 1, '#e8b830'); p.rect(2, 9, 3, 2, '#e8b830'); p.set(10, 5, '#e8b830');
    p.rect(2, 3, 2, 6, '#fff1a8'); p.rect(8, 6, 2, 4, '#b07a1a');
    p.disc(6, 6, 1.8, 1.8, gem); p.set(5, 5, '#ffffff'); p.set(9, 2, '#ffffff');
    p.outline().save(`it_gstatue_${k}`);
  }
  // 조각 도구: 끌 + 망치
  p = new Paint(13, 13);
  p.line(2, 11, 8, 5, '#8a5a3c'); p.rect(7, 2, 4, 3, '#9aa3ad'); p.rect(8, 1, 2, 1, '#c9d1d9');
  p.line(10, 11, 5, 6, '#c9d1d9'); p.rect(9, 10, 3, 2, '#8a5a3c');
  p.outline().save('it_sculpt');
  // 주괴: 사다리꼴 쇳덩이
  p = new Paint(13, 10);
  p.rect(1, 4, 11, 5, '#c9573f'); p.rect(3, 2, 7, 2, '#e8836a'); p.rect(2, 3, 9, 1, '#d9674f');
  p.rect(3, 2, 4, 1, '#ffc0a8'); p.rect(1, 8, 11, 1, '#8a3328');
  p.outline().save('it_bar_red');
  // 기름 단지
  p = new Paint(11, 13);
  p.disc(5, 8, 4.5, 4.5, '#5a4a3a'); p.rect(3, 1, 5, 4, '#5a4a3a'); p.rect(3, 1, 5, 1, '#c9a46a');
  p.disc(3.5, 7, 1.2, 1.8, '#8a7660'); p.rect(2, 9, 7, 2, '#f6c945');
  p.outline().save('it_oil');
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
  p = new Paint(12, 12); p.rect(1, 2, 3, 6, '#d9574a'); p.rect(8, 2, 3, 6, '#d9574a'); p.rect(1, 7, 10, 3, '#d9574a'); p.rect(1, 2, 3, 2, '#e8e8f0'); p.rect(8, 2, 3, 2, '#e8e8f0'); p.rect(2, 8, 8, 1, '#a03a30'); p.outline().save('it_magnet');
  // 모루 생산품(4~11번째)
  p = new Paint(12, 10); p.rect(1, 2, 10, 6, '#c2603e'); p.rect(1, 2, 10, 1, '#e08a62'); p.line(1, 5, 10, 5, '#8a3e28'); p.set(5, 3, '#8a3e28'); p.set(5, 4, '#8a3e28'); p.set(3, 6, '#8a3e28'); p.set(8, 6, '#8a3e28'); p.outline().save('it_brick');
  p = new Paint(12, 12); p.disc(4, 5, 3, 3, '#9aa3ad'); p.disc(4, 5, 1.4, 1.4, null); p.disc(7.5, 7.5, 3, 3, '#c9d1d9'); p.disc(7.5, 7.5, 1.4, 1.4, null); p.outline().save('it_chainlink');
  p = new Paint(12, 12); p.disc(5.5, 6, 4.6, 4, '#a8744e'); p.set(1, 2, '#a8744e'); p.set(10, 2, '#a8744e'); p.set(1, 10, '#a8744e'); p.set(10, 10, '#a8744e'); p.disc(5, 5, 1.6, 1.2, '#c9946a'); p.outline().save('it_hide');
  p = new Paint(12, 12); p.disc(5.5, 5.5, 4.6, 4.6, '#c9a26a'); for (const [x, y] of [[5, 0], [5, 10], [0, 5], [10, 5], [1, 1], [9, 1], [1, 9], [9, 9]]) p.set(x, y, '#c9a26a'); p.disc(5.5, 5.5, 1.6, 1.6, '#6b4a3a'); p.outline().save('it_gearwheel');
  p = new Paint(12, 12); p.rect(1, 8, 10, 2, '#6a7480'); p.rect(1, 2, 2, 7, '#6a7480'); p.rect(1, 2, 1, 7, '#9aa3ad'); p.set(6, 8, '#2f2a3a'); p.set(2, 4, '#2f2a3a'); p.outline().save('it_bracket');
  p = new Paint(12, 12); p.rect(3, 1, 6, 2, '#a07ad9'); p.rect(5, 3, 2, 8, '#8a6fd1'); p.set(5, 4, '#c9a8ff'); p.set(6, 6, '#c9a8ff'); p.set(5, 8, '#c9a8ff'); p.outline().save('it_screw');
  p = new Paint(12, 12); p.rect(2, 3, 8, 7, '#5fb8a8'); p.rect(3, 4, 3, 2, '#f6c945'); p.set(8, 4, '#d9574a'); p.set(8, 6, '#7fc4ff'); p.rect(4, 1, 1, 2, '#9aa3ad'); p.rect(7, 1, 1, 2, '#9aa3ad'); p.line(3, 8, 8, 8, '#2f6a5e'); p.outline().save('it_gizmo');
  p = new Paint(12, 12); p.disc(5.5, 6, 4, 3.6, '#2f2a3a'); p.line(2, 4, 9, 8, '#d9574a'); p.line(2, 8, 9, 3, '#f6c945'); p.line(3, 6, 9, 6, '#4e8de2'); p.outline().save('it_cord');
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
  twine: 'it_twine', nail: 'it_nail', plank: 'it_plank', ...Object.fromEntries(['brick', 'chainlink', 'hide', 'gearwheel', 'bracket', 'screw', 'gizmo', 'cord'].map((k) => [k, `it_${k}`])), bag_small: 'it_bag', bag_leather: 'it_bag2', pouch_mat: 'it_pouch', pouch_res: 'it_pouch2', pouch_food: 'it_pouch3',
  chest_small: 'obj_storage', forest_key: 'it_key', moss_crown: 'it_crown',
  ...Object.fromEntries(['dmg', 'hp', 'def', 'acc', 'crit', 'mining', 'chopping', 'drop', 'coins', 'xp', 'afk'].map((k) => [`stamp_${k}`, `it_stamp_${k}`])),
  ...Object.fromEntries(STAMPS.filter((st) => st.name).map((st) => [st.id, `it_stamp_${st.eff}`])),
  ...Object.fromEntries(OBOLS.map((o) => [o.id, `it_${o.id}`])),
  ...Object.fromEntries(['str', 'agi', 'wis', 'luk', 'guard', 'feast', 'fortune'].flatMap((k) => [[`statue_${k}`, `it_statue_${k}`], [`gstatue_${k}`, `it_gstatue_${k}`]])), sculpt_tools: 'it_sculpt', loot_magnet: 'it_magnet',
  ...Object.fromEntries(['ore_blue', 'ore_gold', 'bar_blue', 'bar_gold', 'willowlog', 'moonlog', 'shell', 'glowdust', 'feather', 'runestone', 'sporecap', 'stew', 'moonpie'].map((k) => [k, `it_${k}`])),
  arena_ticket: 'it_ticket', tp_ticket: 'it_tpticket', pet_shard: 'it_petshard', stone_atk: 'it_stone_atk', stone_guard: 'it_stone_guard', stone_stat: 'it_stone_stat', stone_mine: 'it_stone_mine', stone_chop: 'it_stone_chop',
  anvil_exp2: 'obj_craft', anvil_exp3: 'obj_craft',
  ...Object.fromEntries(['cactus_spine', 'scorp_tail', 'heat_feather', 'old_bandage', 'salt_crystal', 'worm_scale', 'sun_ember', 'palmlog', 'ore_amber', 'bar_amber', 'cactus_juice', 'date_cake', 'sand_crown', 'trophy_sand'].map((k) => [k, `it_${k}`])),
  sun_key: 'it_sunkey', stone_lure: 'it_stone_lure',
  ...Object.fromEntries(['snow_tuft', 'pine_cone', 'peng_feather', 'icicle_shard', 'yeti_fur', 'aurora_dust', 'frost_core', 'pinelog', 'ore_frost', 'bar_frost', 'hot_cocoa', 'pine_soup', 'frost_crown', 'trophy_frost', 'fish_ice', 'bug_frost'].map((k) => [k, `it_${k}`])),
  ...Object.fromEntries(['cr_hare', 'cr_fox', 'cr_weasel', 'cr_marten', 'cr_reindeer', 'trap_wood', 'trap_iron', 'trap_frost', 'fur_scarf', 'antler_charm'].map((k) => [k, `it_${k}`])),
  frost_key: 'it_frostkey', anvil_exp4: 'obj_craft', rod_frost: 'wp_rod_frost', net_frost: 'wp_net_frost',
  ...Object.fromEntries(['star_sand', 'crater_shell', 'neb_jelly', 'meteor_chip', 'ring_plume', 'comet_hair', 'void_shard', 'starlog', 'ore_nova', 'bar_nova', 'fish_neb', 'bug_neb', 'moon_cake', 'nova_stew', 'trophy_void', 'void_mask'].map((k) => [k, `it_${k}`])),
  four_leaf: 'it_four_leaf',   void_key: 'it_voidkey', anvil_exp5: 'obj_craft', rod_nova: 'wp_rod_nova', net_nova: 'wp_net_nova',
  ...Object.fromEntries(['fish_minnow', 'fish_salt', 'fish_star', 'bug_ant', 'bug_firefly', 'bug_beetle'].map((k) => [k, `it_${k}`])),
  ...Object.fromEntries(['rod_reed', 'rod_palm', 'rod_amber', 'net_cloth', 'net_palm', 'net_amber'].map((k) => [k, `wp_${k}`])),
  ...Object.fromEntries(['blue', 'gold', 'amber', 'frost', 'nova'].flatMap((k) => [[`sword_${k}`, `wp_sword_${k}`], [`bow_${k}`, `wp_bow_${k}`], [`wand_${k}`, `wp_wand_${k}`], [`pick_${k}`, `wp_pick_${k}`], [`axe_${k}`, `wp_axe_${k}`],
    [`helm_${k}`, `it_helm_${k}`], [`plate_${k}`, `it_plate_${k}`], [`legs_${k}`, `it_legs_${k}`], [`boots_${k}`, `it_boots_${k}`]])),
  pants_moss: 'it_pants_moss', pants_red: 'it_pants_red', shoes_leaf: 'it_shoes_leaf', boots_red: 'it_boots_red', trophy_moss: 'it_trophy_moss',
  bar_red: 'it_bar_red', forge_oil: 'it_oil', sword_red: 'wp_sword_red', pick_red: 'wp_pick_red', axe_red: 'wp_axe_red',
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
  icon('ui_star', (p) => { for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2 - Math.PI / 2; p.line(7.5, 8, 7.5 + Math.cos(t) * 7, 8 + Math.sin(t) * 7, C.gold); } p.disc(7.5, 8, 3.5, 3.5, C.gold); p.disc(6.5, 7, 1.2, 1.2, '#fff1a8'); });
  icon('ui_trophy', (p) => { p.rect(4, 1, 8, 7, C.gold); p.disc(8, 7, 4, 3, C.gold); p.rect(1, 2, 3, 1, C.gold); p.rect(12, 2, 3, 1, C.gold); p.rect(1, 2, 1, 4, C.gold); p.rect(14, 2, 1, 4, C.gold); p.rect(7, 10, 2, 3, C.gold); p.rect(4, 13, 8, 2, C.wood); p.rect(5, 2, 2, 4, '#fff1a8'); });
  icon('ui_family', (p) => { p.disc(5, 5, 2.6, 2.6, C.paper); p.rect(2, 8, 6, 7, C.paper); p.disc(11, 6.5, 2.2, 2.2, '#cfe6ff'); p.rect(8, 9, 6, 6, '#cfe6ff'); });
  icon('ui_skull', (p) => { p.disc(8, 7, 5, 4.6, C.paper); p.rect(5, 11, 6, 3, C.paper); p.disc(6, 7, 1.4, 1.6, '#2a2230'); p.disc(10, 7, 1.4, 1.6, '#2a2230'); p.set(7, 12, '#2a2230'); p.set(9, 12, '#2a2230'); });
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
  icon('eq_legs', (p) => { p.rect(3, 2, 10, 4, sil); p.rect(3, 6, 4, 9, sil); p.rect(9, 6, 4, 9, sil); });
  icon('eq_shoes', (p) => { p.rect(3, 4, 4, 7, sil); p.rect(3, 10, 9, 4, sil); p.disc(12, 12, 2, 2, sil); });
  icon('eq_trophy', (p) => { p.rect(4, 2, 8, 6, sil); p.disc(8, 7, 4, 3, sil); p.rect(7, 10, 2, 3, sil); p.rect(4, 13, 8, 2, sil); p.rect(1, 3, 3, 1, sil); p.rect(12, 3, 3, 1, sil); });
  icon('eq_ring', (p) => { p.disc(8, 9, 5, 5, sil); p.disc(8, 9, 3, 3, null); p.disc(8, 3.5, 2, 1.6, sil); });
  icon('eq_pickaxe', (p) => { p.rect(7, 4, 2, 11, sil); p.line(1, 5, 7, 2, sil); p.line(9, 2, 15, 5, sil); p.rect(6, 2, 4, 3, sil); });
  icon('eq_axe', (p) => { p.rect(7, 2, 2, 13, sil); p.disc(11, 6, 4, 4, sil); });
  icon('eq_rod', (p) => { p.line(3, 15, 12, 1, sil); p.line(4, 15, 13, 1, sil); p.line(13, 1, 14, 8, sil); p.disc(14, 10, 1.4, 1.6, sil); });
  icon('eq_net', (p) => { p.rect(7, 7, 2, 9, sil); p.disc(8, 5, 5.5, 4.5, sil); p.disc(8, 5, 3.6, 2.8, null); });
  icon('eq_food', (p) => { p.disc(8, 9, 5.5, 5, sil); p.line(8, 4, 10, 1, sil); p.disc(11, 3, 1.6, 1, sil); });
  // 능력치
  icon('st_str', (p) => { p.rect(3, 5, 10, 8, C.skin); p.rect(3, 3, 3, 3, C.skin); p.rect(6, 2, 3, 4, C.skin); p.rect(9, 3, 3, 3, C.skin); p.rect(12, 6, 2, 4, C.skin); p.rect(4, 12, 8, 3, C.red); });
  icon('st_agi', (p) => { p.rect(5, 1, 5, 9, C.green); p.rect(3, 9, 11, 4, C.green); p.rect(3, 12, 12, 2, C.woodD); p.line(1, 4, 4, 4, C.white); p.line(0, 7, 4, 7, C.white); });
  icon('st_wis', (p) => { p.rect(2, 2, 12, 12, C.blue); p.rect(3, 3, 10, 9, '#6fb0f0'); p.rect(2, 12, 12, 2, C.paper); p.disc(8, 7, 2.5, 2.5, C.white); p.disc(8, 7, 1, 1, C.blueD); });
  icon('st_luk', (p) => { for (const [x, y] of [[5, 4], [10, 4], [5, 9], [10, 9]]) p.disc(x, y, 3, 3, C.green); p.disc(7.5, 6.5, 1.5, 1.5, C.green); p.line(8, 9, 11, 15, C.greenD); });
  // 특성(틀 안에 들어가는 그림)
  // 2차 직업 특성: 직업 색 방패 + 상징
  const badge = (id: string, col: string, sym: (p: Paint) => void) => icon(`tl_${id}`, (p) => { p.rect(2, 1, 12, 9, col); for (let y = 10; y < 15; y++) p.rect(2 + (y - 10), y, 12 - (y - 10) * 2, 1, col); p.rect(3, 2, 2, 7, '#ffffff'); sym(p); });
  badge('bulwark', '#6a7480', (p) => { p.rect(5, 4, 6, 6, C.steel); p.rect(7, 4, 2, 6, C.white); });
  badge('vigil', '#6a7480', (p) => { p.disc(8, 7, 3, 2, C.white); p.disc(8, 7, 1.2, 1.2, '#1e2a44'); });
  badge('frenzy', '#c9573f', (p) => { p.line(5, 11, 11, 3, C.white); p.line(6, 11, 12, 3, C.gold); });
  badge('bloodlust', '#c9573f', (p) => { p.disc(8, 8, 2.6, 2.6, C.red); p.rect(7, 3, 2, 3, C.red); });
  badge('deadeye', '#3b8c4f', (p) => { p.disc(8, 7, 3.4, 3.4, C.white); p.disc(8, 7, 1.6, 1.6, C.red); });
  badge('steady', '#3b8c4f', (p) => { p.line(4, 7, 12, 7, C.white); p.line(8, 3, 8, 11, C.white); });
  badge('forager', '#5fb859', (p) => { p.disc(8, 8, 3, 2.6, C.wood); p.rect(7, 4, 2, 2, '#8fde5d'); });
  badge('trailblazer', '#5fb859', (p) => { p.line(4, 11, 8, 4, C.white); p.line(8, 4, 12, 11, C.white); });
  badge('attune', '#4e8de2', (p) => { p.disc(6, 6, 1.6, 1.6, C.red); p.disc(10, 6, 1.6, 1.6, '#8fde5d'); p.disc(8, 10, 1.6, 1.6, '#a7d8f0'); });
  badge('overflow', '#4e8de2', (p) => { p.disc(8, 8, 3, 3, '#a7d8f0'); p.rect(7, 3, 2, 3, '#a7d8f0'); });
  badge('patience', '#8a6fd1', (p) => { p.rect(5, 3, 6, 1, C.white); p.rect(5, 11, 6, 1, C.white); p.line(6, 4, 10, 10, C.gold); p.line(10, 4, 6, 10, C.gold); });
  badge('omen', '#8a6fd1', (p) => { p.disc(8, 7, 3, 3, C.gold); p.disc(9.5, 6, 2.4, 2.4, '#8a6fd1'); });
  // 자동으로 채운 패시브 특성: 효과마다 색과 무늬
  const GEN_COL: Record<string, string> = { str: '#d9574a', agi: '#5fb859', wis: '#4e8de2', luk: '#c98f2a', hp: '#e25d7a', hpPct: '#e25d7a', def: '#7b8591', dmg: '#d9574a', acc: '#3a9a8a', drop: '#8a6fd1', coins: '#c98f2a', xp: '#4e8de2', card: '#8a6fd1', afk: '#3a9a8a', mining: '#8a6a4a', chopping: '#5a8a3a', fishing: '#4a8ae8', catching: '#5fb859' };
  const GEN_SYM: Record<string, (p: Paint) => void> = {
    str: (p) => { p.rect(6, 4, 5, 5, C.white); }, agi: (p) => { p.line(5, 9, 11, 3, C.white); p.line(7, 9, 12, 4, C.white); }, wis: (p) => { p.disc(8.5, 6, 2.6, 2.6, C.white); },
    luk: (p) => { p.disc(7, 5, 1.4, 1.4, '#8fde5d'); p.disc(10, 5, 1.4, 1.4, '#8fde5d'); p.disc(7, 8, 1.4, 1.4, '#8fde5d'); p.disc(10, 8, 1.4, 1.4, '#8fde5d'); },
    hp: (p) => { p.disc(7, 5, 1.6, 1.6, C.white); p.disc(10, 5, 1.6, 1.6, C.white); p.line(6, 6, 8.5, 9, C.white); p.line(11, 6, 8.5, 9, C.white); },
    def: (p) => { p.rect(6, 3, 6, 4, C.white); p.line(6, 7, 9, 9, C.white); p.line(12, 7, 9, 9, C.white); }, dmg: (p) => { p.line(5, 9, 11, 3, C.white); p.rect(5, 8, 2, 2, C.gold); },
    acc: (p) => { p.disc(8.5, 6, 2.6, 2.6, C.white); p.disc(8.5, 6, 1, 1, '#3a9a8a'); }, drop: (p) => { p.rect(6, 4, 6, 5, C.gold); }, coins: (p) => { p.disc(8.5, 6, 2.6, 2.6, C.gold); },
    xp: (p) => { p.rect(5, 4, 7, 5, C.white); p.rect(8, 4, 1, 5, '#4e8de2'); }, card: (p) => { p.rect(6, 3, 5, 6, C.white); p.rect(7, 5, 3, 2, C.gold); },
    afk: (p) => { p.rect(6, 3, 5, 1, C.white); p.rect(6, 8, 5, 1, C.white); p.line(6, 4, 10, 7, C.gold); p.line(10, 4, 6, 7, C.gold); },
    mining: (p) => { p.line(5, 9, 11, 3, '#c9a26a'); p.line(8, 2, 12, 6, C.white); }, chopping: (p) => { p.line(5, 9, 10, 4, '#c9a26a'); p.rect(9, 3, 3, 3, C.white); },
    fishing: (p) => { p.line(6, 3, 11, 8, C.white); p.disc(11, 9, 1, 1, C.gold); }, catching: (p) => { p.disc(8.5, 5.5, 2.6, 2, C.white); p.line(8, 7, 8, 9, C.white); },
  };
  GEN_SYM.hpPct = GEN_SYM.hp;
  for (const t of TALENTS) {
    if (t.eff) badge(t.id, GEN_COL[t.eff] ?? '#7b8591', GEN_SYM[t.eff] ?? GEN_SYM.str);
    else if (t.skill) badge(t.id, '#b48a3a', (p) => { p.disc(8.5, 6, 3, 3, C.gold); p.disc(8.5, 6, 1.4, 1.4, '#b48a3a'); });
  }
  // 기도: 영혼(토템마다 색)
  for (const [k, col, hi2] of [['moss', '#8fde5d', '#e0ffc8'], ['sand', '#e8c47a', '#fff0c8'], ['void', '#6a4ac8', '#c8a8ff'], ['snow', '#e8f2fc', '#ffffff'], ['water', '#4a8ae8', '#a8d4ff'], ['ice', '#7ae0ff', '#e0faff'], ['star', '#c48aff', '#fff0a8']] as const) {
    icon(`soul_${k}`, (p) => { p.disc(8, 9, 5, 5, col); p.disc(8, 4, 3, 3.6, col); p.disc(7, 8, 2, 2, hi2); p.set(6, 8, '#1e1420'); p.set(10, 8, '#1e1420'); p.set(8, 0, hi2); });
  }
  // 요리: 향신료(작은 병) · 요리(접시 위 음식)
  for (const [id, col] of [['sp_dust', '#e0dce8'], ['sp_salt', '#b4a8c4'], ['sp_honey', '#ff9ae0'], ['sp_pepper', '#7a6a64'], ['sp_cinna', '#c8864a'], ['sp_mint', '#9ad8f6'], ['sp_vanilla', '#8a5ad8']] as const) {
    icon(id, (p) => { p.rect(5, 2, 6, 3, '#8a6a4a'); p.rect(4, 5, 8, 10, '#e8f4fa'); p.rect(5, 8, 6, 6, col); p.rect(5, 8, 6, 1, mix(col, '#ffffff', 0.5)); p.set(5, 6, '#ffffff'); });
  }
  for (const [i, [id, col]] of ([['m_bun', '#f4f0e6'], ['m_cookie', '#d8a86a'], ['m_soup', '#c88a4a'], ['m_pudding', '#ff9ae0'], ['m_steak', '#a8543a'], ['m_pie', '#e8b84a'], ['m_shaved', '#c8f0ff'], ['m_noodle', '#f6e08a'],
    ['m_curry', '#e8a83a'], ['m_tart', '#6a4aa8'], ['m_cake', '#b48aff'], ['m_bento', '#8ad06a'], ['m_feast', '#ff7a3a'], ['m_macaron', '#3a2a5a'], ['m_banquet', '#f6c945'], ['m_bbq', '#8a3a2a']] as const).entries()) {
    icon(`ml_${id}`, (p) => {
      p.disc(8, 12, 7, 2.6, '#e8e4f0'); p.disc(8, 12, 5, 1.6, '#c8c4d8');
      const shape = i % 4;
      if (shape === 0) { p.disc(8, 8, 5, 4, col); p.disc(7, 6, 2, 1.4, mix(col, '#ffffff', 0.5)); }
      else if (shape === 1) { for (const [x, y] of [[5, 9], [10, 9], [8, 6]]) p.disc(x, y, 2.6, 2, col); p.set(8, 5, '#ffffff'); }
      else if (shape === 2) { p.rect(3, 6, 10, 5, col); p.rect(3, 6, 10, 1, mix(col, '#ffffff', 0.45)); p.set(6, 4, '#ff6a6a'); p.set(7, 4, '#ff6a6a'); }
      else { p.disc(8, 9, 6, 3, col); p.disc(8, 8, 3, 1.4, mix(col, '#ffffff', 0.4)); p.line(4, 3, 6, 6, '#8a6a4a'); }
      if (i >= 8) p.set(12, 3, '#fff6c8');
      if (i >= 12) { p.set(3, 4, '#fff6c8'); p.set(13, 6, '#fff6c8'); }
    });
  }
  // 번식: 알(등급 색) · 펫 종
  for (const [r, col, spot] of [[0, '#f4f0e6', '#c8c4d8'], [1, '#9ad8a8', '#4a9a5a'], [2, '#b48aff', '#5a3aa8'], [3, '#f6c945', '#e25d4e']] as const) {
    icon(`egg_${r}`, (p) => { p.disc(8, 9, 5, 6.4, col); p.disc(6, 6, 1.6, 1.2, spot); p.disc(10, 11, 1.4, 1, spot); p.disc(7, 12, 1, 0.8, spot); p.set(6, 4, '#ffffff'); });
  }
  for (const [i, [id, col]] of ([['b_puff', '#f6e08a'], ['b_crab', '#a8543a'], ['b_jelly', '#ff9ae0'], ['b_owlet', '#c89a5a'], ['b_kit', '#7ac0f0'], ['b_imp', '#6a4aa8'],
    ['b_moss', '#58b552'], ['b_bean', '#4a9a3a'], ['b_peng', '#4e8de2'], ['b_golem', '#8aaed0'], ['b_drake', '#c87aff'], ['b_titan', '#5a4ab8']] as const).entries()) {
    icon(`bp_${id}`, (p) => {
      const shape = i % 6;
      if (shape === 0) { p.disc(8, 10, 6, 5, col); for (const x of [3, 8, 13]) p.set(x, 4, col); }
      else if (shape === 1) { p.disc(8, 10, 6, 4, col); p.rect(1, 6, 2, 3, col); p.rect(13, 6, 2, 3, col); for (const x of [3, 6, 10, 13]) p.set(x, 14, mix(col, '#000000', 0.3)); }
      else if (shape === 2) { p.disc(8, 7, 6, 5, col); for (const x of [4, 7, 10, 13]) p.rect(x, 11, 1, 4, mix(col, '#ffffff', 0.3)); }
      else if (shape === 3) { p.disc(8, 9, 6, 6, col); p.rect(3, 2, 2, 3, col); p.rect(11, 2, 2, 3, col); p.disc(8, 11, 3, 3, mix(col, '#ffffff', 0.5)); }
      else if (shape === 4) { p.disc(9, 10, 5, 4, col); p.disc(11, 6, 3.4, 3, col); p.rect(9, 2, 2, 3, col); p.rect(13, 2, 2, 3, col); p.rect(1, 8, 4, 2, mix(col, '#ffffff', 0.5)); }
      else { p.disc(8, 9, 6, 6, col); p.rect(3, 1, 2, 4, mix(col, '#ffffff', 0.4)); p.rect(11, 1, 2, 4, mix(col, '#ffffff', 0.4)); }
      p.set(6, 8, '#1e1420'); p.set(10, 8, '#1e1420'); p.set(6, 7, '#ffffff'); p.set(10, 7, '#ffffff');
      if (i >= 6) p.set(8, 11, '#e25d4e');
      if (i >= 10) { p.rect(5, 0, 6, 1, '#f6c945'); }
    });
  }
  // 연구실 장치·보석
  for (const [id, col] of [['n_xp', '#7affe8'], ['n_kitchen', '#ff9a3a'], ['n_drop', '#f6c945'], ['n_nest', '#ff9ae0'], ['n_link', '#4ad0ff'], ['n_dmg', '#e25d4e'], ['n_spice', '#b4a8c4'], ['n_afk', '#b48aff']] as const) {
    icon(`lab_${id}`, (p) => { p.rect(2, 3, 12, 11, '#8a86a8'); p.rect(2, 3, 12, 1, '#c8c4d8'); p.rect(4, 5, 8, 6, '#1a2a3a'); p.disc(8, 8, 2.4, 2.4, col); p.set(7, 7, '#ffffff'); p.rect(5, 12, 2, 1, col); p.rect(9, 12, 2, 1, '#5fb859'); });
  }
  for (const [id, col] of [['j_amethyst', '#b48aff'], ['j_ruby', '#e25d4e'], ['j_topaz', '#f6c945'], ['j_emerald', '#5fb859'], ['j_sapphire', '#4a8ae8'], ['j_pearl', '#f4f0fa']] as const) {
    icon(`lab_${id}`, (p) => { for (let y = 0; y < 13; y++) { const w = y < 4 ? 3 + y * 1.5 : Math.max(0, 9 - (y - 4)); p.rect(Math.round(8 - w), 2 + y, Math.round(w * 2), 1, y < 4 ? mix(col, '#ffffff', 0.35) : col); } p.set(6, 4, '#ffffff'); p.set(7, 5, '#ffffff'); });
  }
  // 건설: 건물 아이콘(지붕 색 + 상징)
  for (const [id, roof, sym] of [['b_woodshed', '#8a5a3c', '#e8c08a'], ['b_minehouse', '#6a7480', '#7ae0ff'], ['b_dock', '#4a8ae8', '#c8ecff'], ['b_greenhouse', '#5fb859', '#f6c945'], ['b_drill', '#d9574a', '#f2f0e6'], ['b_hearth', '#e8833a', '#ffd06a'], ['b_library', '#8a6fd1', '#f2f0e6'], ['b_market', '#f2c14e', '#a8782a'], ['b_tower', '#5a6a8a', '#fff0a8'], ['b_attic', '#3a4a7a', '#c4ccff']] as const) {
    icon(`bld_${id}`, (p) => {
      p.rect(3, 7, 10, 8, '#e8dcc0'); for (let y = 0; y < 6; y++) p.rect(8 - y - 1, 1 + y, (y + 1) * 2, 1, roof);
      p.rect(6, 10, 4, 5, sym); p.rect(3, 14, 10, 1, '#a8906a'); p.set(7, 2, '#f4f8fc'); p.set(8, 2, '#f4f8fc');
    });
  }
  // 3차 직업 특성
  badge('aegis', '#4a5868', (p) => { p.rect(5, 3, 6, 7, C.steel); p.rect(7, 3, 2, 7, C.gold); p.rect(5, 6, 6, 1, C.gold); });
  badge('stalwart', '#4a5868', (p) => { p.rect(7, 3, 2, 8, C.wood); p.line(4, 11, 7, 9, C.wood); p.line(12, 11, 9, 9, C.wood); p.disc(8, 4, 2.4, 2, '#8fde5d'); });
  badge('warcry', '#a83a2a', (p) => { p.disc(6, 7, 2, 3, C.white); for (const y of [4, 7, 10]) p.line(9, 7, 12, y, C.gold); });
  badge('carnage', '#a83a2a', (p) => { p.line(4, 11, 12, 3, C.white); p.line(4, 3, 12, 11, C.white); p.set(8, 7, C.red); });
  badge('eagle', '#2a6a3a', (p) => { p.disc(8, 7, 3.6, 3, C.gold); p.disc(8, 7, 1.4, 1.4, '#1e1420'); p.line(11, 5, 13, 4, C.gold); });
  badge('focus', '#2a6a3a', (p) => { p.disc(8, 7, 3.6, 3.6, C.white); p.disc(8, 7, 2.2, 2.2, '#2a6a3a'); p.disc(8, 7, 1, 1, C.red); });
  badge('scout', '#4a9a4a', (p) => { p.disc(6, 7, 2.4, 2.4, '#a7d8f0'); p.disc(10, 7, 2.4, 2.4, '#a7d8f0'); p.rect(7, 6, 2, 1, C.wood); });
  badge('harvest', '#4a9a4a', (p) => { p.rect(7, 4, 2, 7, C.gold); p.disc(6, 5, 1.6, 1, C.gold); p.disc(10, 6, 1.6, 1, C.gold); p.disc(6, 8, 1.6, 1, C.gold); });
  badge('arcana', '#2a5aa8', (p) => { p.disc(8, 7, 3.4, 3.4, '#c48aff'); p.disc(8, 7, 1.4, 1.4, C.white); });
  badge('manawell', '#2a5aa8', (p) => { p.disc(8, 8, 3.4, 2.4, '#a7d8f0'); p.rect(7, 3, 2, 4, '#a7d8f0'); p.set(8, 2, C.white); });
  badge('prophecy', '#6a4ab0', (p) => { p.disc(8, 7, 3.4, 3.4, '#e8e4f0'); p.disc(7, 6, 1.4, 1.4, '#c48aff'); });
  badge('dreamwalk', '#6a4ab0', (p) => { p.disc(8, 7, 3, 3, C.gold); p.disc(9.5, 6, 2.4, 2.4, '#6a4ab0'); p.set(4, 4, C.white); p.set(12, 10, C.white); });
  icon('tl_quake', (p) => { p.rect(1, 10, 14, 5, '#a8744e'); p.line(4, 10, 6, 15, '#4a2a1a'); p.line(10, 10, 8, 15, '#4a2a1a'); for (const x of [3, 8, 13]) p.rect(x, 4 + (x % 3), 2, 3, '#c8a46a'); });
  icon('tl_rampage', (p) => { p.disc(5, 8, 3.4, 3, C.skin); p.disc(11, 8, 3.4, 3, C.skin); for (const [x, y] of [[1, 2], [8, 1], [14, 3]]) p.rect(x, y, 2, 2, C.red); });
  icon('tl_pierce', (p) => { p.line(1, 8, 13, 8, C.wood); p.rect(12, 7, 3, 3, C.steel); p.rect(0, 6, 2, 5, C.red); p.disc(6, 8, 2.6, 2.6, null); p.disc(6, 8, 2.6, 2.6, '#8a3a3a'); p.line(1, 8, 13, 8, C.wood); });
  icon('tl_arrowrain', (p) => { for (const x of [2, 6, 10, 14]) { p.line(x - 1, 1 + (x % 4), x - 1, 9 + (x % 4), C.wood); p.rect(x - 2, 10 + (x % 4), 3, 2, C.steel); } });
  icon('tl_meteor', (p) => { p.line(1, 1, 8, 8, '#ffd06a'); p.line(2, 1, 9, 8, '#ff8a3a'); p.disc(10, 10, 4.4, 4.4, '#e25d2a'); p.disc(9, 9, 2, 2, '#ffd06a'); });
  icon('tl_starfall', (p) => { for (const [x, y, r] of [[4, 4, 2.4], [11, 6, 2], [7, 12, 2.6]] as const) { p.disc(x, y, r, r, '#fff0a8'); p.set(x, y, C.white); } p.line(1, 0, 3, 3, '#c48aff'); p.line(9, 1, 10, 4, '#c48aff'); });
  // 히든 계열: 초록 네잎 배지
  const clover = (p: Paint, x: number, y: number, c2 = '#6ac05a') => { for (const [dx, dy] of [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4]]) p.disc(x + dx, y + dy, 1.4, 1.4, c2); p.set(x, y, '#2a6a2a'); };
  badge('treasure', '#2f8a6a', (p) => { p.rect(5, 6, 6, 4, C.gold); p.rect(5, 5, 6, 1, C.wood); p.set(8, 8, C.white); });
  badge('roam', '#2f8a6a', (p) => { p.line(4, 11, 12, 3, C.white); p.disc(5, 4, 1.4, 1.4, C.white); p.disc(11, 10, 1.4, 1.4, C.white); });
  badge('jackpot', '#2f8a6a', (p) => { p.disc(6, 7, 2.4, 2.4, C.gold); p.disc(10, 8, 2.4, 2.4, C.gold); p.set(6, 7, C.wood); p.set(10, 8, C.wood); });
  badge('gatherluck', '#2f8a6a', (p) => { clover(p, 8, 7, '#a8e878'); });
  badge('narrate', '#2f8a6a', (p) => { p.rect(5, 4, 7, 6, C.white); p.rect(8, 4, 1, 6, '#2f8a6a'); });
  badge('plot', '#2f8a6a', (p) => { p.line(4, 10, 8, 4, C.gold); p.line(8, 4, 12, 10, C.gold); p.set(8, 7, C.white); });
  badge('chronicle', '#2f8a6a', (p) => { p.rect(5, 3, 6, 8, '#e8dcc0'); p.rect(5, 3, 6, 1, C.wood); p.rect(5, 10, 6, 1, C.wood); clover(p, 8, 7, '#6ac05a'); });
  badge('legacy', '#2f8a6a', (p) => { p.rect(4, 6, 8, 5, C.gold); p.rect(6, 4, 4, 2, C.gold); p.set(8, 8, C.white); });
  icon('tl_talestorm', (p) => { p.disc(7.5, 7.5, 7, 7, '#2f6a8a'); for (let i = 0; i < 3; i++) p.line(2 + i * 4, 3, 5 + i * 4, 12, '#e8dcc0'); clover(p, 7.5, 7.5, '#a8e878'); });
  icon('tl_lifesong', (p) => { p.disc(7.5, 7.5, 7, 7, '#2f8a6a'); p.rect(6, 3, 3, 9, C.white); p.rect(3, 6, 9, 3, C.white); p.disc(11, 4, 1.6, 1.6, C.gold); p.line(11, 4, 11, 1, C.gold); });
  icon('tl_fortune', (p) => { p.disc(7.5, 7.5, 7, 7, '#2f8a6a'); clover(p, 7.5, 7.5, '#a8e878'); for (const [x, y] of [[2, 2], [13, 3], [12, 13], [2, 12]]) p.set(x, y, C.gold); });
  icon('tl_destiny', (p) => { p.disc(7.5, 7.5, 7, 7, '#3a3a6a'); p.line(1, 12, 14, 3, C.gold); p.line(1, 3, 14, 12, '#c48aff'); p.disc(7.5, 7.5, 2, 2, C.white); });
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
  // 장비 겉모습(마네킹과 같은 1배 픽셀)
  for (const [id, g] of Object.entries(GEAR)) canvases.set(gearKey(id), paintGear(g));
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
