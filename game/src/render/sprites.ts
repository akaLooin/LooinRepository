// 모든 그래픽은 코드로 생성한 픽셀아트(임시 원화). 외부 이미지 파일 없음.
// 1 아트픽셀 = 1 월드 단위. 나중에 실제 스프라이트 시트로 교체할 때는 같은 key로 텍스처만 바꾸면 된다.
import { HAIR_STYLES } from '../core/data';
import { Look } from '../core/state';

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
  outline(c = OUT) {
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

// 간단한 결정적 난수(텍스처 무늬용)
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// ───────── 캐릭터 파츠 ─────────
// 둥글둥글한 체형: 동그란 머리, 모서리를 굴린 몸통, 끝이 둥근 팔다리. 도형으로 그리고 외곽선을 자동으로 두른다.
const SWORD = [
  '..o..', '.oBo.', '.oBqo', '.oBqo', '.oBqo', '.oBqo', '.oBqo', '.oBqo', '.oBqo', '.oBqo',
  'ooooooo', 'onnnnno', 'ooooooo', '..ouo..', '..ouo..', '..ooo..',
];
const PICK = [
  '..ooooooo..', '.oAAAAAAAo.', 'oAAoonooAAo', 'oAo.oNo.oao', '.o..oNo..o.', '....oNo....',
  '....oNo....', '....oNo....', '....oNo....', '....oNo....', '....oNo....', '....ooo....',
];
const AXE = [
  '..oooo...', '.oAAaoo..', 'oAAAaoNo.', 'oAAAaoNo.', 'oAAAaoNo.', '.oAAaoNo.', '..ooooNo.',
  '.....oNo.', '.....oNo.', '.....oNo.', '.....oNo.', '.....oNo.', '.....ooo.',
];

export const lookKey = (l: Look) => `${l.hair}_${l.hairColor}_${l.skin}_${l.outfit}`.replace(/#/g, '');
/** 머리 텍스처에서 목(회전축)의 위치 비율 */
export const HEAD_ORIGIN: [number, number] = [0.5, 0.86];

/** 외형별 캐릭터 파츠 텍스처 생성(이미 있으면 재사용). 반환값은 텍스처 key 접두사 */
export function buildLook(l: Look): string {
  const k = `r_${lookKey(l)}`;
  if (canvases.has(`${k}_head`)) return k;
  const hair = l.hairColor, hairL = shade(hair, 1.3), hairD = shade(hair, 0.72);
  const skin = l.skin, skinD = shade(skin, 0.86);
  const cloth = l.outfit, clothL = shade(cloth, 1.25), clothD = shade(cloth, 0.75);
  const style = l.hair % HAIR_STYLES;
  for (const blink of [false, true]) {
    const p = new Paint(22, 22);
    if (style === 1) { p.disc(4.5, 14, 2.6, 5, hair); p.disc(4, 16, 1.6, 3, hairD); } // 긴 머리
    p.disc(10.5, 10, 7.2, 6.8, hair);                 // 머리카락(뒤통수 포함)
    p.disc(11.2, 12.2, 5.8, 4.9, skin);               // 얼굴
    p.disc(11.2, 15.4, 3.6, 1.2, skinD);              // 턱 그늘
    p.rect(6, 7, 9, 2, hair); p.rect(8, 9, 2, 1, hair); p.rect(13, 9, 2, 1, hair); // 앞머리
    p.disc(8, 5.5, 2.4, 1.2, hairL);                  // 윤기
    p.disc(5, 11, 1.2, 2.5, hairD);
    if (style === 2) for (const [x, y] of [[6, 3], [10, 1], [14, 3]]) { p.line(x, y + 2, x + 1, y, hair); p.line(x + 1, y + 2, x + 1, y, hair); p.set(x + 2, y + 2, hair); }
    for (const ex of [9, 13]) {
      if (blink) p.set(ex, 13, OUT);
      else { p.rect(ex, 11, 1, 3, OUT); p.set(ex, 11, '#5a4a6a'); }
    }
    p.set(7, 14, '#f4a3a0'); p.set(8, 14, '#f4a3a0'); p.set(14, 14, '#f4a3a0'); p.set(15, 14, '#f4a3a0');
    p.set(11, 15, '#b5525c');
    p.outline().save(`${k}_head${blink ? '_b' : ''}`);
  }
  let p = new Paint(12, 11);
  p.rect(2, 1, 8, 8, cloth); p.rect(1, 2, 10, 6, cloth);       // 모서리를 굴린 몸통
  p.rect(2, 2, 2, 3, clothL); p.rect(9, 3, 2, 5, clothD);
  p.rect(1, 7, 10, 1, clothD); p.rect(5, 7, 2, 1, '#f6c945');   // 허리띠
  p.rect(2, 8, 8, 2, '#4a5a8a'); p.rect(3, 9, 6, 1, '#39466e');
  p.rect(1, 9, 1, 1, null); p.rect(10, 9, 1, 1, null);
  p.outline().save(`${k}_torso`);
  p = new Paint(5, 11);
  p.rect(1, 1, 3, 6, cloth); p.set(3, 4, clothD); p.set(3, 5, clothD); p.set(3, 6, clothD);
  p.disc(2, 8, 1.4, 1.4, skin); p.set(3, 9, skinD);            // 동그란 손
  p.outline().save(`${k}_arm`);
  p = new Paint(7, 10);
  p.rect(1, 0, 4, 6, '#4a5a8a'); p.rect(4, 0, 1, 6, '#39466e');
  p.disc(3, 7.4, 2.4, 1.6, '#6b4a3a'); p.rect(1, 7, 5, 2, '#6b4a3a'); p.set(5, 8, '#553828'); // 둥근 신발
  p.outline().save(`${k}_leg`);
  return k;
}

function buildWeapons() {
  grid('wp_sword_wood', SWORD, { B: '#c9925a', q: '#a06f42' });
  grid('wp_sword_stone', SWORD, { B: '#c9d1d9', q: '#8d97a3' });
  grid('wp_sword_leaf', SWORD, { B: '#a8ee6a', q: '#5fb859', n: '#f6c945' });
  // 활(세로로 쥔다)과 지팡이, 발사체
  for (const [id, a, b] of [['bow_wood', '#c9925a', '#8a5a3c'], ['bow_leaf', '#a8ee6a', '#5fb859']] as const) {
    const p = new Paint(9, 19);
    for (let y = 1; y < 18; y++) { const x = 2 + Math.round(Math.sin(((y - 1) / 16) * Math.PI) * 4); p.set(x, y, a); p.set(x - 1, y, b); }
    p.line(2, 1, 2, 17, '#e9e4f0');
    p.outline().save(`wp_${id}`);
  }
  for (const [id, a, b] of [['wand_wood', '#a5d8ff', '#5aa9e6'], ['wand_leaf', '#b4f08a', '#5fb859']] as const) {
    const p = new Paint(7, 17);
    p.rect(3, 5, 1, 12, '#8a5a3c'); p.disc(3, 3, 2.3, 2.3, b); p.set(2, 2, a); p.set(3, 2, a); p.set(2, 3, a);
    p.outline().save(`wp_${id}`);
  }
  let p = new Paint(11, 5);
  p.rect(1, 2, 8, 1, '#b9824f'); p.set(9, 2, '#c9d1d9'); p.set(8, 1, '#c9d1d9'); p.set(8, 3, '#c9d1d9'); p.set(1, 1, '#e9e4f0'); p.set(1, 3, '#e9e4f0');
  p.outline().save('shot_arrow');
  p = new Paint(9, 9);
  p.disc(4, 4, 3.2, 3.2, '#5aa9e6'); p.disc(3.6, 3.6, 2, 2, '#a5d8ff'); p.set(3, 3, '#ffffff');
  p.outline('#3a5a9a').save('shot_orb');
  grid('wp_pick', PICK);
  grid('wp_axe', AXE);
  grid('wp_pick_stone', PICK, { A: '#e8dcc8', a: '#b5a78e' });
  grid('wp_axe_stone', AXE, { A: '#e8dcc8', a: '#b5a78e' });
}

// ───────── 몬스터 ─────────
function eyes(p: Paint, x: number, y: number, gap: number) {
  for (const ex of [x, x + gap]) { p.rect(ex, y, 2, 3, OUT); p.set(ex, y, '#ffffff'); }
}
function buildMonsters() {
  // 이끼방울: 새싹 달린 둥근 방울
  let p = new Paint(20, 18);
  p.disc(9.5, 11, 8, 5.6, '#5fb859');
  p.disc(9.5, 9.5, 6.5, 4, '#7fd063');
  p.disc(6, 8, 2, 1, '#b4f08a');
  p.rect(2, 14, 16, 3, '#3b8c4f'); p.rect(1, 16, 18, 1, null); p.rect(3, 16, 14, 1, '#3b8c4f');
  eyes(p, 10, 9, 4);
  p.rect(12, 13, 2, 1, '#2f6e3e');
  p.line(9, 5, 9, 2, '#3b8c4f'); p.disc(11, 2, 1.6, 1.2, '#b4f08a'); p.disc(7, 3, 1.2, 1, '#8fde5d');
  p.outline().save('mob_mossblob');

  // 돌콩이: 발 달린 돌멩이
  p = new Paint(20, 18);
  p.disc(9.5, 8.5, 7.5, 6, '#9aa3ad');
  p.disc(8, 6.5, 5, 3.2, '#b7c0c9');
  p.rect(4, 3, 3, 1, '#dfe6ec');
  p.rect(13, 10, 3, 2, '#6a7480'); p.rect(5, 12, 2, 1, '#6a7480');
  eyes(p, 9, 7, 4);
  p.rect(10, 11, 3, 1, OUT);
  p.rect(4, 15, 4, 2, '#6a7480'); p.rect(11, 15, 4, 2, '#6a7480');
  p.outline().save('mob_pebbler');

  // 잎새깨비: 떠다니는 잎사귀 정령 (날개는 별도 텍스처)
  p = new Paint(20, 20);
  p.disc(9.5, 10, 6.5, 6, '#e8a23c');
  p.disc(8.5, 8.5, 4.5, 3.5, '#f6c95a');
  p.line(9, 3, 12, 0, '#8a5a3c');
  p.disc(9.5, 15.5, 3, 1.5, '#c77f2a');
  eyes(p, 9, 8, 4);
  p.set(11, 12, '#9c4a2a'); p.set(12, 12, '#9c4a2a');
  p.set(6, 11, '#f4a3a0'); p.set(15, 11, '#f4a3a0');
  p.outline().save('mob_leafling');
  p = new Paint(10, 8);
  p.disc(4.5, 3.5, 4, 2.6, '#8fde5d'); p.line(1, 4, 8, 3, '#5fb859');
  p.outline().save('mob_leafling_wing');
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
  // 지면 타일 32x48: 위쪽 풀, 아래 흙
  let p = new Paint(32, 48);
  p.rect(0, 0, 32, 48, t.dirt[1]);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(hash(i + 1) * 32), y = 8 + Math.floor(hash(i + 77) * 40);
    p.rect(x, y, hash(i + 5) > 0.6 ? 2 : 1, 1, hash(i + 9) > 0.5 ? t.dirt[0] : t.dirt[2]);
  }
  p.rect(0, 0, 32, 5, t.grass[1]);
  p.rect(0, 0, 32, 2, t.grass[0]);
  for (let x = 0; x < 32; x++) {
    const d = hash(x + 31) > 0.55 ? 2 : hash(x + 3) > 0.5 ? 1 : 0;
    p.rect(x, 5, 1, d, t.grass[2]);
    if (hash(x + 200) > 0.8) p.set(x, 1, t.grass[2]);
  }
  p.rect(0, 5 + 2, 32, 1, t.dirt[2]);
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
}

export const ITEM_ICON: Record<string, string> = {
  moss: 'it_moss', pebble: 'it_pebble', leaf: 'it_leaf', log: 'it_log', ore: 'it_ore', silverlog: 'it_silverlog',
  sword_wood: 'wp_sword_wood', sword_stone: 'wp_sword_stone', sword_leaf: 'wp_sword_leaf',
  bow_wood: 'wp_bow_wood', bow_leaf: 'wp_bow_leaf', wand_wood: 'wp_wand_wood', wand_leaf: 'wp_wand_leaf',
  hat_moss: 'it_hat_moss', armor_log: 'it_armor_log', pick_stone: 'wp_pick_stone', axe_stone: 'wp_axe_stone',
  coin: 'it_coin',
};

let built = false;
export function buildAll() {
  if (built) return;
  built = true;
  buildWeapons(); buildMonsters(); buildObjects(); buildItems();
  (Object.keys(THEMES) as ThemeKey[]).forEach(buildTheme);
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
    const ctx = mk(key, 22, 38);
    const d = (part: string, x: number, y: number) => ctx.drawImage(canvases.get(`${k}_${part}`)!, x, y);
    d('leg', 5, 28); d('leg', 10, 28); d('arm', 2, 19); d('arm', 15, 19); d('torso', 5, 18); d('head', 0, 0);
  }
  return iconUrl(key);
}
