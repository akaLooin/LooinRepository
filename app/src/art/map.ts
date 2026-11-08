// The realm map: an isometric plateau with cliffs, a river, paths, trees and building plots.
import { Raster, bayer, hex, mix, noise, shade, type RGB } from './raster';
import { buildingSprite, levelFor } from './buildings';

export const MAP_W = 320, MAP_H = 300;
const N = 24, TW = 16, TH = 8, LV = 7; // grid size, half tile w/h, px per height level
const X0 = MAP_W / 2, Y0 = -48;

const GRASS = [hex('#2f5a2a'), hex('#3b6e31'), hex('#4b8238'), hex('#5e9642')];
const DIRT = hex('#8a6a44'), DIRT_D = hex('#5e4630'), ROCK = hex('#6e6458'), WATER = hex('#2c5e8a'), PLAZA = hex('#9a9282');

type Kind = 'grass' | 'water' | 'path' | 'plaza';
interface Tile { h: number; kind: Kind; tree?: 'pine' | 'oak' | 'rock' | 'bush' }

// building plots by tier (tile coords). Same plot for the tier regardless of alignment.
export const PLOTS: Record<number, [number, number]> = {
  1: [13, 14], 2: [15, 12], 3: [11, 15], 4: [16, 15], 5: [10, 11], 6: [13, 10], 7: [8, 15], 8: [16, 9], 9: [10, 8], 10: [13, 7], 11: [7, 11],
};

function smooth(i: number, j: number, seed: number, scale: number) {
  const x = i / scale, y = j / scale, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const a = noise(xi, yi, seed), b = noise(xi + 1, yi, seed), c = noise(xi, yi + 1, seed), d = noise(xi + 1, yi + 1, seed);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function buildGrid(): Tile[][] {
  const g: Tile[][] = [];
  const plot = new Set(Object.values(PLOTS).map(([i, j]) => i + ',' + j));
  for (let i = 0; i < N; i++) {
    g.push([]);
    for (let j = 0; j < N; j++) {
      let h = 2 + Math.round(smooth(i, j, 11, 4) * 1.4);
      if (i + j < 18) h += 1;                       // higher ground at the back
      if (i + j > 33) h -= 1;                      // falls away at the front
      const riverJ = 21 - Math.round(i * 0.3 + Math.sin(i / 2.5) * 1.5);
      let kind: Kind = 'grass';
      if (Math.abs(j - riverJ) < 1 && i > 0) { kind = 'water'; h = 1; }
      const isPlot = plot.has(i + ',' + j);
      if (isPlot) kind = 'plaza';
      else if (kind === 'grass' && (j === 12 && i > 6 && i < 18) || (kind === 'grass' && i === 14 && j > 5 && j < 14)) kind = 'path';
      const t: Tile = { h, kind };
      if (kind === 'grass' && !isPlot) {
        const r = noise(i, j, 77);
        if (r > 0.78) t.tree = 'pine'; else if (r > 0.66) t.tree = 'oak'; else if (r > 0.6) t.tree = 'bush'; else if (r > 0.56) t.tree = 'rock';
      }
      g[i].push(t);
    }
  }
  // flatten plots to their neighbours' level so buildings sit nicely
  for (const [i, j] of Object.values(PLOTS)) g[i][j].h = Math.max(2, g[i][j].h);
  return g;
}

const center = (i: number, j: number, h: number): [number, number] => [X0 + (i - j) * TW, Y0 + (i + j) * TH - h * LV + TH];

function drawTile(r: Raster, i: number, j: number, t: Tile) {
  const [cx, cy] = center(i, j, t.h);
  const top: [number, number][] = [[cx, cy - TH], [cx + TW, cy], [cx, cy + TH], [cx - TW, cy]];
  const depth = t.h * LV + 30;
  // left side face
  r.poly([[cx - TW, cy], [cx, cy + TH], [cx, cy + TH + depth], [cx - TW, cy + depth]], (x, y) => {
    const d = y - (cy + (x - (cx - TW)) / 2);
    if (t.kind === 'water') return shade(WATER, 0.6);
    const base = d < 3 ? shade(DIRT, 0.95) : mix(ROCK, DIRT_D, noise(x >> 1, y >> 2, 4) * 0.6);
    return shade(base, 0.9 - Math.min(0.45, d / 80) + (noise(x, y, 5) - 0.5) * 0.12 + ((y + (x >> 2)) % 5 === 0 ? -0.12 : 0));
  });
  // right side face (darker)
  r.poly([[cx, cy + TH], [cx + TW, cy], [cx + TW, cy + depth], [cx, cy + TH + depth]], (x, y) => {
    const d = y - (cy + TH - (x - cx) / 2);
    if (t.kind === 'water') return shade(WATER, 0.45);
    const base = d < 3 ? shade(DIRT, 0.8) : mix(ROCK, DIRT_D, noise(x >> 1, y >> 2, 6) * 0.6);
    return shade(base, 0.62 - Math.min(0.35, d / 90) + (noise(x, y, 7) - 0.5) * 0.1 + ((y - (x >> 2)) % 5 === 0 ? -0.1 : 0));
  });
  // top face
  r.poly(top, (x, y) => {
    const n = noise(x, y, 1), n2 = noise(x >> 2, y >> 1, 2);
    const edge = Math.abs(x - cx) / TW + Math.abs(y - cy) / TH;
    switch (t.kind) {
      case 'water': {
        const wave = (Math.floor(x / 3) + Math.floor(y / 2) * 2) % 7 === 0;
        return shade(WATER, 1 + (wave ? 0.35 : 0) + (n - 0.5) * 0.08 - edge * 0.1);
      }
      case 'path': return shade(mix(DIRT, hex('#a8885a'), n2), 1 + (n - 0.5) * 0.2 + (n > 0.93 ? -0.25 : 0));
      case 'plaza': return shade(mix(PLAZA, DIRT, edge > 0.8 ? 0.6 : 0.15), 1 + (((x >> 2) + (y >> 1)) % 3 === 0 ? -0.12 : 0) + (n - 0.5) * 0.12);
      default: {
        const lvl = Math.min(3, Math.floor(n2 * 2.2 + bayer(x, y) * 1.4 + (t.h - 2) * 0.3));
        let c = GRASS[Math.max(0, lvl)];
        if (n > 0.965) c = hex('#7ab04e');
        if (n > 0.992) c = noise(x, y, 9) > 0.5 ? hex('#e8d86a') : hex('#d8e0f0');
        return shade(c, 1.02 - edge * 0.04);
      }
    }
  });
}

function drawTree(r: Raster, i: number, j: number, t: Tile) {
  const [cx, cy] = center(i, j, t.h);
  const s = noise(i, j, 33);
  const ox = cx + Math.round((s - 0.5) * 8), oy = cy + 1;
  if (t.tree === 'rock') {
    for (let y = -4; y <= 0; y++) for (let x = -4; x <= 4; x++) if (x * x / 16 + (y + 2) * (y + 2) / 6 <= 1) r.set(ox + x, oy + y, shade(ROCK, 1.2 - (x + 4) * 0.08 + (y < -2 ? 0.15 : 0)));
    return;
  }
  // shadow
  for (let x = -6; x <= 6; x++) for (let y = -2; y <= 2; y++) if (x * x / 36 + y * y / 4 <= 1) r.set(ox + x + 2, oy + y, [10, 20, 10], 90);
  if (t.tree === 'pine') {
    const H = 16 + Math.floor(s * 8);
    for (let y = 0; y < 4; y++) r.set(ox, oy - y, hex('#4a3020'));
    for (let k = 0; k < 3; k++) {
      const top = oy - H + k * 5, w = 4 + k * 2;
      for (let y = 0; y < 8; y++) for (let x = -w * y / 8; x <= w * y / 8; x++) {
        const c = shade(hex('#2a5a34'), 1.05 - (x > 0 ? 0.28 : 0) - y * 0.02 + (noise(ox + x, top + y, 3) - 0.5) * 0.2);
        r.set(ox + Math.round(x), top + y, c);
      }
    }
    // outline
    return;
  }
  const R = t.tree === 'bush' ? 4 : 6, H = t.tree === 'bush' ? 4 : 10;
  if (t.tree === 'oak') for (let y = 0; y < H - 2; y++) { r.set(ox, oy - y, hex('#5a3a22')); r.set(ox + 1, oy - y, hex('#3a2416')); }
  for (let y = -R; y <= R; y++) for (let x = -R - 1; x <= R + 1; x++) {
    const d = (x * x) / ((R + 1) * (R + 1)) + (y * y) / (R * R);
    if (d > 1 - noise(ox + x, oy + y, 8) * 0.25) continue;
    const c = shade(hex('#3f7a34'), 1.12 - (x + y) * 0.04 + (noise((ox + x) >> 1, (oy + y) >> 1, 9) - 0.5) * 0.3);
    r.set(ox + x, oy - H - R + y + 2, c);
  }
}

let grid: Tile[][] | null = null;

/** Draws the map with the currently owned buildings. `owned` maps building id -> count, `tierOf` id -> tier. */
export function renderMap(owned: { id: string; tier: number; count: number }[]): HTMLCanvasElement {
  grid ??= buildGrid();
  const r = new Raster(MAP_W, MAP_H);
  r.rect(0, 0, MAP_W, MAP_H, (x, y) => shade(hex('#1a2a1e'), 0.9 + noise(x >> 2, y >> 2, 1) * 0.15));
  const byPlot = new Map<string, { id: string; count: number }>();
  for (const o of owned) if (o.count > 0) { const p = PLOTS[o.tier]; if (p) byPlot.set(p[0] + ',' + p[1], o); }
  // painter's order: back to front
  const cells: [number, number][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) cells.push([i, j]);
  cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
  for (const [i, j] of cells) drawTile(r, i, j, grid[i][j]);
  for (const [i, j] of cells) {
    const t = grid[i][j];
    const b = byPlot.get(i + ',' + j);
    if (b) {
      const spr = buildingSprite(b.id, levelFor(b.count));
      const [cx, cy] = center(i, j, t.h);
      // soft contact shadow
      for (let x = -14; x <= 14; x++) for (let y = -5; y <= 5; y++) if (x * x / 196 + y * y / 25 <= 1) r.set(cx + x + 3, cy + y + 2, [8, 14, 8], 70);
      r.draw(spr.r, cx - spr.ax, cy - spr.ay + 2);
    } else if (t.tree) drawTree(r, i, j, t);
  }
  // vignette
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const dx = (x - MAP_W / 2) / (MAP_W / 2), dy = (y - MAP_H / 2) / (MAP_H / 2);
    const v = Math.max(0, dx * dx + dy * dy - 0.55);
    if (v > 0 && bayer(x, y) < v * 1.2) r.set(x, y, [10, 8, 18], 110);
  }
  return r.toCanvas();
}

export function _palette(): RGB[] { return GRASS; }
