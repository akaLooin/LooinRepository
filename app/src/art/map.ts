// The realm map: a pop-up village island rising from the pages of an open book,
// floating in the Dimensional Library. Bright storybook palette, warm light from the top-left.
import { Raster, bayer, hex, mix, noise, shade, type RGB } from './raster';
import { buildingSprite, levelFor } from './buildings';

export const MAP_W = 360, MAP_H = 320;
const N = 10, TW = 16, TH = 8, LV = 6;      // island grid, half tile w/h, px per height level
const X0 = MAP_W / 2, Y0 = 92;               // screen position of grid corner (0,0) at z=0

const GRASS = [hex('#3f8f3a'), hex('#55a845'), hex('#6cbd50'), hex('#8ad15e')];
const DIRT = hex('#b08a58'), SOIL = hex('#7a5638'), ROCK = hex('#8a7e70'), WATER = hex('#3f8fd8'), PLAZA = hex('#d6caa8');
const PAGE = hex('#f1e6c8'), INK = hex('#8a7458'), COVER = hex('#3a2e6a'), GOLD = hex('#e2b85a');

type Kind = 'grass' | 'water' | 'path' | 'plaza' | 'bridge';
type Deco = 'pine' | 'oak' | 'blossom' | 'rock' | 'shroom' | 'lamp' | 'flowers';
interface Tile { h: number; kind: Kind; deco?: Deco }

export const PLOTS: Record<number, [number, number]> = {
  1: [5, 4], 2: [7, 3], 3: [3, 6], 4: [7, 6], 5: [3, 3], 6: [5, 1], 7: [2, 8], 8: [8, 1], 9: [1, 4], 10: [9, 6], 11: [1, 1],
};

function buildGrid(): Tile[][] {
  const g: Tile[][] = [];
  const plot = new Set(Object.values(PLOTS).map(([i, j]) => i + ',' + j));
  for (let i = 0; i < N; i++) {
    g.push([]);
    for (let j = 0; j < N; j++) {
      let h = 2 + (i + j < 6 ? 1 : 0) + (noise(i, j, 21) > 0.82 ? 1 : 0);
      let kind: Kind = 'grass';
      const river = j === 8 - Math.floor(i * 0.6);
      const path = (j === 5 && i >= 2 && i <= 8) || (i === 5 && j >= 1 && j <= 7);
      if (river) { kind = path ? 'bridge' : 'water'; h = path ? 2 : 1; }
      else if (plot.has(i + ',' + j)) { kind = 'plaza'; h = 2 + (i + j < 6 ? 1 : 0); }
      else if (path) { kind = 'path'; h = 2; }
      const t: Tile = { h, kind };
      if (kind === 'grass') {
        const r = noise(i, j, 77);
        t.deco = r > 0.8 ? 'pine' : r > 0.68 ? 'oak' : r > 0.6 ? 'blossom' : r > 0.54 ? 'flowers' : r > 0.5 ? 'shroom' : r > 0.47 ? 'rock' : undefined;
      }
      if (kind === 'path' && noise(i, j, 5) > 0.7) t.deco = 'lamp';
      g[i].push(t);
    }
  }
  return g;
}

const P = (i: number, j: number, z: number): [number, number] => [X0 + (i - j) * TW, Y0 + (i + j) * TH - z];
const center = (i: number, j: number, h: number): [number, number] => P(i + 0.5, j + 0.5, h * LV);

// ------------------------------------------------------------ library backdrop
function drawLibrary(r: Raster) {
  r.rect(0, 0, MAP_W, MAP_H, (x, y) => {
    const t = y / MAP_H;
    const c = mix(hex('#2a2258'), hex('#5a3f8a'), Math.min(1, t * 1.3));
    const glow = Math.max(0, 1 - Math.hypot((x - MAP_W * 0.5) / 220, (y - MAP_H * 0.45) / 170));
    return shade(mix(c, hex('#c8a8e8'), glow * 0.35), 1 + (bayer(x, y) - 0.5) * 0.05);
  });
  // god-rays from the top-left
  for (let k = 0; k < 4; k++) {
    const x0 = 30 + k * 55;
    r.poly([[x0, 0], [x0 + 18, 0], [x0 + 140, MAP_H], [x0 + 100, MAP_H]], (x, y) => (bayer(x, y) < 0.12 ? hex('#e8d8ff') : null));
  }
  // bookshelves on both sides
  for (const side of [0, 1]) {
    const x0 = side ? MAP_W - 46 : 0;
    r.rect(x0, 0, 46, MAP_H, (x, y) => shade(hex('#3a2a4a'), 0.8 + noise(x >> 2, y >> 3, 3) * 0.1));
    for (let shelf = 0; shelf < 7; shelf++) {
      const sy = 6 + shelf * 46;
      r.rect(x0, sy + 38, 46, 4, (x) => shade(hex('#6a4a3a'), 1 - (x - x0) * 0.004));
      let bx = x0 + 3;
      while (bx < x0 + 42) {
        const w = 3 + Math.floor(noise(bx, shelf, 9) * 4), hgt = 26 + Math.floor(noise(bx, shelf, 10) * 10);
        const col = [hex('#8a3a4a'), hex('#3a5a8a'), hex('#4a7a5a'), hex('#9a7a3a'), hex('#6a4a8a')][Math.floor(noise(bx, shelf, 11) * 5)];
        r.rect(bx, sy + 38 - hgt, w, hgt, (x, y) => shade(col, 0.75 + (x === bx ? 0.3 : 0) + ((y - sy) % 9 === 3 ? 0.35 : 0)));
        bx += w + (noise(bx, shelf, 12) > 0.85 ? 3 : 0);
      }
    }
    // shelf edge shadow towards the centre
    r.rect(side ? x0 - 6 : x0 + 46, 0, 6, MAP_H, (x, y) => (bayer(x, y) < (side ? (x - x0 + 6) / 6 : 1 - (x - x0 - 46) / 6) * 0.6 ? hex('#1a1430') : null));
  }
  // floating books
  for (let k = 0; k < 6; k++) {
    const bx = 60 + noise(k, 1, 31) * 240, by = 12 + noise(k, 2, 31) * 50 + (k > 3 ? 230 : 0);
    const col = [hex('#c8504a'), hex('#4a78c8'), hex('#5aa86a'), hex('#c89a3a')][k % 4];
    r.poly([[bx, by], [bx + 10, by - 4], [bx + 18, by], [bx + 8, by + 4]], () => shade(col, 1.1));
    r.poly([[bx, by], [bx + 8, by + 4], [bx + 8, by + 6], [bx, by + 2]], () => shade(PAGE, 0.95));
    r.poly([[bx + 8, by + 4], [bx + 18, by], [bx + 18, by + 2], [bx + 8, by + 6]], () => shade(PAGE, 0.75));
  }
  // motes
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(noise(k, 7, 41) * MAP_W), y = Math.floor(noise(k, 8, 41) * MAP_H);
    const c = noise(k, 9, 41) > 0.5 ? hex('#fff2b0') : hex('#d8c8ff');
    r.set(x, y, c, 200); if (noise(k, 10, 41) > 0.7) { r.set(x + 1, y, c, 120); r.set(x - 1, y, c, 120); r.set(x, y + 1, c, 120); r.set(x, y - 1, c, 120); }
  }
}

// ------------------------------------------------------------ open book
function drawBook(r: Raster) {
  const m = 1.6, a0 = -m, a1 = N + m; // page extends beyond the island
  const top = P(a0, a0, 0), right = P(a1, a0, 0), bottom = P(a1, a1, 0), left = P(a0, a1, 0);
  const T = 7; // page stack thickness
  // cover (slightly bigger, below)
  const cv = 3;
  r.poly([[top[0], top[1] - cv], [right[0] + cv * 2, right[1]], [bottom[0], bottom[1] + cv + T], [left[0] - cv * 2, left[1]]], (x, y) => {
    const edge = Math.abs(x - X0) / ((right[0] - left[0]) / 2 + cv * 2) + Math.abs(y - (top[1] + bottom[1]) / 2) / ((bottom[1] - top[1]) / 2 + cv);
    return edge > 0.97 ? GOLD : shade(COVER, 1 + (noise(x >> 1, y >> 1, 3) - 0.5) * 0.15);
  });
  // page stack (front faces)
  r.poly([[left[0], left[1]], [bottom[0], bottom[1]], [bottom[0], bottom[1] + T], [left[0], left[1] + T]], (x, y) => shade(PAGE, (y + (x >> 1)) % 2 ? 0.86 : 0.72));
  r.poly([[bottom[0], bottom[1]], [right[0], right[1]], [right[0], right[1] + T], [bottom[0], bottom[1] + T]], (x, y) => shade(PAGE, (y - (x >> 1)) % 2 ? 0.74 : 0.6));
  // page surface with faint lines of text and a centre gutter
  r.poly([top, right, bottom, left], (x, y) => {
    // page-local coords
    const u = (x - X0) / (2 * TW) + (y - Y0) / (2 * TH), v = (y - Y0) / (2 * TH) - (x - X0) / (2 * TW);
    const gutter = Math.abs(u - N / 2);
    const curl = Math.max(0, 1 - gutter / 1.4) * 0.25;
    const line = Math.floor(v * 3) % 2 === 0 && Math.abs(((v * 3) % 1) - 0.5) < 0.12 && noise(Math.floor(u * 6), Math.floor(v * 3), 8) > 0.25;
    const base = shade(PAGE, 1.02 - curl - Math.max(0, (u - N / 2)) * 0.008 + (noise(x, y, 6) - 0.5) * 0.05);
    return line ? mix(base, INK, 0.35) : base;
  });
}

// ------------------------------------------------------------ island tiles
function drawTile(r: Raster, i: number, j: number, t: Tile, g: Tile[][]) {
  const z = t.h * LV;
  const top: [number, number][] = [P(i, j, z), P(i + 1, j, z), P(i + 1, j + 1, z), P(i, j + 1, z)];
  const below = (di: number, dj: number) => { const n = g[i + di]?.[j + dj]; return n ? n.h * LV : 0; };
  // left face (towards +j)
  const zl = below(0, 1);
  if (zl < z) r.poly([P(i, j + 1, z), P(i + 1, j + 1, z), P(i + 1, j + 1, zl), P(i, j + 1, zl)], (x, y) => {
    if (t.kind === 'water') return shade(mix(WATER, hex('#d8f0ff'), ((y + x) % 4 === 0) ? 0.6 : 0.1), 0.95);
    const d = y - P(i, j + 1, z)[1] - (x - P(i, j + 1, z)[0]) / 2;
    const base = d < 2 ? shade(GRASS[1], 0.9) : d < 4 ? SOIL : mix(SOIL, ROCK, noise(x >> 1, y >> 2, 4) * 0.7);
    return shade(base, 0.98 + (noise(x, y, 5) - 0.5) * 0.14 + ((y + (x >> 2)) % 5 === 0 && d >= 4 ? -0.12 : 0));
  });
  // right face (towards +i)
  const zr = below(1, 0);
  if (zr < z) r.poly([P(i + 1, j + 1, z), P(i + 1, j, z), P(i + 1, j, zr), P(i + 1, j + 1, zr)], (x, y) => {
    if (t.kind === 'water') return shade(mix(WATER, hex('#d8f0ff'), ((y - x) % 4 === 0) ? 0.6 : 0.1), 0.8);
    const d = y - P(i + 1, j + 1, z)[1] + (x - P(i + 1, j + 1, z)[0]) / 2;
    const base = d < 2 ? shade(GRASS[1], 0.75) : d < 4 ? shade(SOIL, 0.85) : mix(SOIL, ROCK, noise(x >> 1, y >> 2, 6) * 0.7);
    return shade(base, 0.74 + (noise(x, y, 7) - 0.5) * 0.12 + ((y - (x >> 2)) % 5 === 0 && d >= 4 ? -0.1 : 0));
  });
  const [cx, cy] = center(i, j, t.h);
  r.poly(top, (x, y) => {
    const n = noise(x, y, 1), n2 = noise(x >> 2, y >> 1, 2);
    const edge = Math.abs(x - cx) / TW + Math.abs(y - cy) / TH;
    switch (t.kind) {
      case 'water': {
        const wave = (Math.floor(x / 3) + Math.floor(y / 2) * 2) % 7 === 0;
        return shade(mix(WATER, hex('#7ac8ff'), n2 * 0.5), 1.05 + (wave ? 0.45 : 0) - edge * 0.12);
      }
      case 'bridge': return shade(hex('#a8784a'), (x + y * 2) % 4 === 0 ? 0.75 : 1.05 + (n - 0.5) * 0.1);
      case 'path': return shade(mix(DIRT, hex('#e0c890'), n2), 1.04 + (n - 0.5) * 0.18 + (n > 0.94 ? -0.2 : 0));
      case 'plaza': return shade(mix(PLAZA, DIRT, edge > 0.82 ? 0.5 : 0.1), 1.05 + (((x >> 2) + (y >> 1)) % 3 === 0 ? -0.1 : 0) + (n - 0.5) * 0.1);
      default: {
        const lvl = Math.min(3, Math.floor(n2 * 2.2 + bayer(x, y) * 1.4 + (t.h - 2) * 0.5));
        let c = GRASS[Math.max(0, lvl)];
        if (n > 0.965) c = hex('#a8e070');
        if (n > 0.99) c = [hex('#ffe070'), hex('#ffffff'), hex('#ffa8c8'), hex('#a8c8ff')][Math.floor(noise(x, y, 9) * 4)];
        return shade(c, 1.04 - edge * 0.05);
      }
    }
  });
}

function drawDeco(r: Raster, i: number, j: number, t: Tile) {
  const [cx, cy] = center(i, j, t.h);
  const s = noise(i, j, 33);
  const ox = cx + Math.round((s - 0.5) * 8), oy = cy + 1;
  const ell = (x0: number, y0: number, rx: number, ry: number, f: (dx: number, dy: number) => RGB | null) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) { const c = f(x / rx, y / ry); if (c) r.set(x0 + x, y0 + y, c); }
  };
  const shadow = (w: number) => { for (let x = -w; x <= w; x++) for (let y = -2; y <= 2; y++) if (x * x / (w * w) + y * y / 4 <= 1) r.set(ox + x + 2, oy + y, [30, 60, 30], 80); };
  switch (t.deco) {
    case 'rock': ell(ox, oy - 2, 4, 3, (dx, dy) => shade(ROCK, 1.25 - dx * 0.25 - dy * 0.2)); break;
    case 'flowers': for (let k = 0; k < 6; k++) r.set(ox - 6 + Math.floor(noise(k, i, j) * 12), oy - 3 + Math.floor(noise(k, j, i) * 6), [hex('#ffe070'), hex('#ff90b0'), hex('#ffffff'), hex('#a0c8ff')][k % 4]); break;
    case 'shroom': {
      shadow(4);
      for (let k = 0; k < 2; k++) { const x = ox - 3 + k * 6, y = oy - k * 2; r.rect(x, y - 3, 1, 3, hex('#f0e8d8')); ell(x, y - 4, 2, 1, (dx) => shade(hex('#7ad8ff'), 1.3 - dx * 0.3)); r.set(x, y - 6, hex('#e8fbff'), 140); }
      break;
    }
    case 'lamp': {
      for (let y = 0; y < 9; y++) r.set(ox, oy - y, hex('#3a2a40'));
      ell(ox, oy - 10, 2, 2, () => hex('#fff0a0'));
      ell(ox, oy - 10, 4, 4, (dx, dy) => (Math.hypot(dx, dy) > 0.55 && bayer(ox + Math.round(dx * 4), oy + Math.round(dy * 4)) < 0.4 ? hex('#ffe890') : null));
      break;
    }
    case 'pine': {
      shadow(6);
      const H = 15 + Math.floor(s * 7);
      for (let y = 0; y < 4; y++) r.set(ox, oy - y, hex('#5a3a22'));
      for (let k = 0; k < 3; k++) {
        const top = oy - H + k * 5, w = 4 + k * 2;
        for (let y = 0; y < 8; y++) for (let x = -w * y / 8; x <= w * y / 8; x++)
          r.set(ox + Math.round(x), top + y, shade(hex('#2f7a4a'), 1.15 - (x > 0 ? 0.28 : 0) - y * 0.02 + (noise(ox + x, top + y, 3) - 0.5) * 0.2));
      }
      r.set(ox, oy - H - 1, hex('#fff6c0'));
      break;
    }
    case 'oak': case 'blossom': {
      shadow(6);
      const R = 6, H = 9, col = t.deco === 'blossom' ? hex('#f4a8c8') : hex('#4fa848');
      for (let y = 0; y < H - 2; y++) { r.set(ox, oy - y, hex('#6a4428')); r.set(ox + 1, oy - y, hex('#4a2c18')); }
      for (let y = -R; y <= R; y++) for (let x = -R - 1; x <= R + 1; x++) {
        const d = (x * x) / ((R + 1) * (R + 1)) + (y * y) / (R * R);
        if (d > 1 - noise(ox + x, oy + y, 8) * 0.25) continue;
        r.set(ox + x, oy - H - R + y + 2, shade(col, 1.18 - (x + y) * 0.045 + (noise((ox + x) >> 1, (oy + y) >> 1, 9) - 0.5) * 0.28));
      }
      if (t.deco === 'blossom') for (let k = 0; k < 3; k++) r.set(ox - 3 + k * 3, oy + 1 + (k % 2), hex('#ffd0e0'));
      break;
    }
  }
}

let grid: Tile[][] | null = null;

/** Draws the realm with the currently owned buildings (id, tier, count). */
/** Where each drawn building's name label goes (map pixels, top-centre of the sprite). Filled by renderMap. */
export const lastLabels: { id: string; x: number; y: number }[] = [];

export function renderMap(owned: { id: string; tier: number; count: number; unique?: boolean }[]): HTMLCanvasElement {
  lastLabels.length = 0;
  grid ??= buildGrid();
  const g = grid;
  const r = new Raster(MAP_W, MAP_H);
  drawLibrary(r);
  drawBook(r);
  const byPlot = new Map<string, { id: string; count: number; unique?: boolean }>();
  for (const o of owned) if (o.count > 0) { const p = PLOTS[o.tier]; if (p) byPlot.set(p[0] + ',' + p[1], o); }
  const cells: [number, number][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) cells.push([i, j]);
  cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
  // soft island shadow on the page
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const u = (x - X0 - 6) / (2 * TW) + (y - Y0 - 4) / (2 * TH), v = (y - Y0 - 4) / (2 * TH) - (x - X0 - 6) / (2 * TW);
    if (u > 0 && v > 0 && u < N + 0.4 && v < N + 0.4 && (u > N - 0.3 || v > N - 0.3) && bayer(x, y) < 0.5) r.set(x, y, [120, 90, 60], 90);
  }
  for (const [i, j] of cells) drawTile(r, i, j, g[i][j], g);
  // waterfall where the river leaves the island
  for (const [i, j] of cells) {
    const t = g[i][j];
    if (t.kind !== 'water') continue;
    if (i === N - 1 || j === N - 1) {
      const [x0, y0] = i === N - 1 ? P(i + 1, j + 0.5, t.h * LV) : P(i + 0.5, j + 1, t.h * LV);
      for (let y = 0; y < t.h * LV + 4; y++) for (let x = -3; x <= 3; x++)
        r.set(x0 + x, y0 + y, mix(WATER, hex('#e8f8ff'), ((y + x * 3) % 5 === 0 ? 0.8 : 0.25) + y / 40));
      for (let k = 0; k < 8; k++) r.set(x0 - 5 + Math.floor(noise(k, i, 3) * 10), y0 + t.h * LV + 3 + Math.floor(noise(k, j, 4) * 3), hex('#e8f8ff'));
    }
  }
  for (const [i, j] of cells) {
    const t = g[i][j], b = byPlot.get(i + ',' + j);
    if (b) {
      const spr = buildingSprite(b.id, levelFor(b.count));
      const [cx, cy] = center(i, j, t.h);
      for (let x = -13; x <= 13; x++) for (let y = -5; y <= 5; y++) if (x * x / 169 + y * y / 25 <= 1) r.set(cx + x + 3, cy + y + 2, [40, 60, 30], 70);
      r.draw(spr.r, cx - spr.ax, cy - spr.ay + 2);
      lastLabels.push({ id: b.id, x: cx, y: cy - spr.ay - 1 });
      if (b.unique) for (let k = 0; k < 14; k++) {   // unique building: ring of golden motes
        const a = (k / 14) * Math.PI * 2, x = Math.round(cx + Math.cos(a) * (spr.r.w / 2 + 3)), y = Math.round(cy - spr.ay / 2 + Math.sin(a) * (spr.ay / 2 + 3));
        r.set(x, y, hex('#fff2a0')); if (k % 2 === 0) { r.set(x + 1, y, hex('#ffd860'), 160); r.set(x, y - 1, hex('#ffd860'), 160); }
      }
    } else if (t.deco) drawDeco(r, i, j, t);
  }
  return r.toCanvas();
}
