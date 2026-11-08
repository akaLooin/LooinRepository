// Isometric pixel buildings, generated from specs. 2:1 dimetric, light from the left.
import { Raster, hex, mix, noise, shade, type RGB } from './raster';

export type Mat = 'brick' | 'stone' | 'plank' | 'plaster' | 'timber' | 'crystal' | 'bone' | 'rock';
export type RoofKind = 'gable' | 'hip' | 'flat' | 'none';

export interface Part {
  x?: number; y?: number; z?: number;  // offset (world px)
  a: number; b: number; h: number;     // half-length along x, half-depth along y, wall height
  mat: Mat; wall: string;
  roof: RoofKind; roofH?: number; roofColor?: string;
  windows?: number; door?: boolean; lit?: boolean; crenel?: boolean;
}
export interface Extra { kind: 'banner' | 'chimney' | 'mushroom' | 'vine' | 'wheel' | 'tree' | 'statue' | 'mast' | 'orb' | 'crystal' | 'mine'; x?: number; y?: number; z?: number; color?: string; size?: number }
export interface Spec { parts: Part[]; extras?: Extra[] }

const OUTLINE: RGB = hex('#140c16');
const WINDOW_LIT: RGB = hex('#ffd477');
const WINDOW_DARK: RGB = hex('#2a2238');
const DOOR: RGB = hex('#4a2c1a');

function tex(m: Mat, base: RGB, u: number, v: number, seed: number): RGB {
  const n = noise(u, v, seed) * 0.14 - 0.07;
  const fu = Math.floor(u), fv = Math.floor(v);
  switch (m) {
    case 'brick': {
      const row = Math.floor(fv / 3);
      if (fv % 3 === 0 || (fu + (row % 2) * 3) % 6 === 0) return shade(base, 0.62);
      return shade(base, 1 + n + (noise(Math.floor((fu + (row % 2) * 3) / 6), row, seed) - 0.5) * 0.16);
    }
    case 'stone': {
      const row = Math.floor(fv / 4), w = 5 + Math.floor(noise(row, 7, seed) * 3);
      if (fv % 4 === 0 || (fu + row * 3) % w === 0) return shade(base, 0.6);
      return shade(base, 1 + n * 1.4 + (noise(Math.floor((fu + row * 3) / w), row, seed + 3) - 0.5) * 0.2);
    }
    case 'plank': return fu % 3 === 0 ? shade(base, 0.7) : shade(base, 1 + n + (fv % 7 === 0 ? -0.08 : 0));
    case 'plaster': return shade(base, 1 + n * 0.6);
    case 'timber': return (fu % 7 === 0 || fv % 9 === 0 || fv % 9 === 8) ? hex('#4a3020') : shade(base, 1 + n * 0.5);
    case 'crystal': return shade(base, 1 + ((fu + fv) % 9 < 2 ? 0.35 : 0) + n);
    case 'bone': return shade(base, 1 + n * 1.2 + (noise(fu >> 1, fv >> 1, seed) > 0.93 ? -0.3 : 0));
    case 'rock': return shade(base, 1 + n * 2 + (noise(fu >> 2, fv >> 2, seed) - 0.5) * 0.3);
  }
}

function windowAt(p: Part, u: number, v: number, len: number): RGB | null {
  if (!p.windows) return null;
  const fu = Math.floor(u), fv = Math.floor(v);
  for (let k = 0; k < p.windows; k++) {
    const v0 = 4 + k * 8;
    if (fv < v0 || fv > v0 + 3) continue;
    for (let s = 3; s + 2 <= len - 2; s += 6) {
      if (fu >= s && fu < s + 2) {
        if (fv === v0 + 3) return shade(hex(p.wall), 0.55);
        return p.lit === false ? WINDOW_DARK : (fv === v0 ? mix(WINDOW_LIT, [255, 255, 255], 0.4) : WINDOW_LIT);
      }
    }
  }
  return null;
}

export class IsoCanvas {
  r: Raster;
  constructor(w: number, h: number, public ox: number, public oy: number) { this.r = new Raster(w, h); }
  p(x: number, y: number, z: number): [number, number] { return [this.ox + (x - y), this.oy + (x + y) / 2 - z]; }

  part(pt: Part, seed: number) {
    const X = pt.x ?? 0, Y = pt.y ?? 0, Z = pt.z ?? 0, { a, b, h } = pt, base = hex(pt.wall);
    const P = (x: number, y: number, z: number) => this.p(X + x, Y + y, Z + z);
    const ox = this.ox, oy = this.oy;
    // left face (y = +b): u = x + a, v = z
    this.r.poly([P(-a, b, 0), P(a, b, 0), P(a, b, h), P(-a, b, h)], (sx, sy) => {
      const x = sx + 0.5 - ox + (Y + b) - X, u = x + a;
      const v = oy + (X + x + Y + b) / 2 - (sy + 0.5) - Z;
      return windowAt(pt, u, v, 2 * a) ?? shade(tex(pt.mat, base, u, v, seed), 1.0 - (v < 1.5 ? 0.15 : 0));
    });
    // right face (x = +a): u = b - y, v = z
    this.r.poly([P(a, b, 0), P(a, -b, 0), P(a, -b, h), P(a, b, h)], (sx, sy) => {
      const y = ox + (X + a) - (sx + 0.5) - Y, u = b - y;
      const v = oy + (X + a + Y + y) / 2 - (sy + 0.5) - Z;
      if (pt.door && Math.abs(u - b) < 2 && v < 6) return Math.floor(v) === 5 ? shade(DOOR, 0.6) : shade(DOOR, 1 + noise(u | 0, v | 0, 9) * 0.1);
      return shade(windowAt(pt, u, v, 2 * b) ?? tex(pt.mat, base, u + 31, v, seed), 0.68 - (v < 1.5 ? 0.1 : 0));
    });
    const roofC = hex(pt.roofColor ?? '#7a2f2a');
    const rh = pt.roofH ?? Math.max(b, a) * 1.1;
    if (pt.roof === 'flat' || pt.roof === 'none') {
      this.r.poly([P(-a, -b, h), P(a, -b, h), P(a, b, h), P(-a, b, h)], (sx, sy) => shade(tex(pt.mat === 'crystal' ? 'crystal' : 'stone', shade(base, 0.9), sx, sy, seed + 5), 1.08));
      if (pt.crenel) {
        for (let x = -a; x < a; x += 4) this.part({ x: X + x + 1, y: Y + b - 1, z: Z + h, a: 1, b: 1, h: 3, mat: pt.mat, wall: pt.wall, roof: 'flat' }, seed);
        for (let y = -b; y < b; y += 4) this.part({ x: X + a - 1, y: Y + y + 1, z: Z + h, a: 1, b: 1, h: 3, mat: pt.mat, wall: pt.wall, roof: 'flat' }, seed);
      }
    } else if (pt.roof === 'gable') {
      const o = 1.5, B = b + o;
      // gable end (x = +a), wall material
      this.r.poly([P(a, -b, h), P(a, b, h), P(a, 0, h + rh)], (sx, sy) => shade(tex(pt.mat, base, sx, sy, seed), 0.62));
      // front slope (faces +y)
      this.r.poly([P(-a - o, B, h - o * rh / B), P(a + o, B, h - o * rh / B), P(a + o, 0, h + rh), P(-a - o, 0, h + rh)], (sx, sy) => {
        const slope = (rh + (o * rh) / B) / B;
        const k = sy + 0.5 - oy - (sx + 0.5 - ox) / 2 + Z + h + rh;
        const y = (k - Y) / (1 + slope);
        const x = sx + 0.5 - ox + y + Y - X;
        const row = Math.floor(y / 2);
        const seam = Math.floor(x + row * 2) % 4 === 0;
        const edge = y > B - 1.2;
        return shade(roofC, (edge ? 0.7 : 1.0) + (seam ? -0.18 : 0) + (row % 2 ? -0.05 : 0.04) + noise(x | 0, row, seed) * 0.08);
      });
      // ridge cap
      const [r1x, r1y] = P(-a - o, 0, h + rh), [r2x, r2y] = P(a + o, 0, h + rh);
      this.r.line(r1x, r1y, r2x, r2y, shade(roofC, 1.35));
    } else if (pt.roof === 'hip') {
      const o = 1.5, apex = P(0, 0, h + rh);
      this.r.poly([P(a + o, -b - o, h - 1), P(a + o, b + o, h - 1), apex], (sx, sy) =>
        shade(roofC, 0.66 + (Math.floor(sy) % 3 === 0 ? -0.1 : 0) + noise(sx, sy, seed) * 0.08));
      this.r.poly([P(-a - o, b + o, h - 1), P(a + o, b + o, h - 1), apex], (sx, sy) =>
        shade(roofC, 1.0 + (Math.floor(sy) % 3 === 0 ? -0.14 : 0) + noise(sx, sy, seed) * 0.08));
      this.r.line(...P(a + o, b + o, h - 1), ...apex, shade(roofC, 1.3));
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, f: (dx: number, dy: number) => RGB | null) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) { const c = f(dx, dy); if (c) this.r.set(x, y, c); }
    }
  }

  extra(e: Extra, seed: number) {
    const [sx, sy] = this.p(e.x ?? 0, e.y ?? 0, e.z ?? 0);
    const col = hex(e.color ?? '#c03a3a'), s = e.size ?? 1;
    switch (e.kind) {
      case 'banner': {
        for (let i = 0; i < 12 * s; i++) this.r.set(sx, sy - i, hex('#3b2a1e'));
        this.r.rect(sx + 1, sy - 12 * s, 5, 6, (x, y) => shade(col, (x - sx) % 2 ? 0.85 : 1.05 + (y === sy - 12 * s ? 0.2 : 0)));
        this.r.set(sx, sy - 12 * s - 1, hex('#e8c860'));
        break;
      }
      case 'chimney': {
        this.r.rect(sx - 1, sy - 6, 3, 6, (x, y) => tex('brick', hex('#8a4a3a'), x, y, seed));
        this.r.set(sx, sy - 8, hex('#9a9aa8'), 140); this.r.set(sx + 1, sy - 10, hex('#9a9aa8'), 100);
        break;
      }
      case 'mushroom': {
        this.r.rect(sx - 2 * s, sy - 10 * s, 4 * s, 10 * s, (x, y) => shade(hex('#e8dcc0'), 0.95 + noise(x, y, seed) * 0.1 - (x > sx ? 0.2 : 0)));
        this.ellipse(sx, sy - 11 * s, 9 * s, 5 * s, (dx, dy) => {
          if (dy > 0.55) return shade(hex('#d8c8a8'), 0.7);
          const spot = noise(Math.floor((dx + 1) * 3), Math.floor((dy + 1) * 2), seed) > 0.72;
          return spot ? hex('#fff2dc') : shade(col, 1.1 - dy * 0.3 - (dx > 0.3 ? 0.25 : 0));
        });
        break;
      }
      case 'vine': {
        const H = 34 * s;
        for (let i = 0; i < H; i++) {
          const wx = Math.round(Math.sin(i / 5) * 3);
          for (let k = -1; k <= 1; k++) this.r.set(sx + wx + k, sy - i, shade(hex('#3f8a3a'), 1 + k * 0.2 - i / H * 0.2));
          if (i % 6 === 3) { const d = (i / 6) % 2 ? 1 : -1; this.ellipse(sx + wx + d * 4, sy - i, 3, 2, (dx) => shade(hex('#5fb84a'), 1 + dx * d * -0.2)); }
        }
        this.ellipse(sx, sy - H - 4, 7, 5, (dx, dy) => shade(hex('#f4f0e0'), 1 - dy * 0.15 - (dx > 0.3 ? 0.15 : 0)));
        break;
      }
      case 'wheel': {
        this.ellipse(sx, sy, 8 * s, 8 * s, (dx, dy) => {
          const r = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx);
          if (r > 0.8) return shade(hex('#5a3a22'), 1 - dx * 0.2);
          if (Math.abs(Math.sin(ang * 4)) < 0.25) return hex('#4a2c1a');
          return null;
        });
        break;
      }
      case 'tree': {
        const H = 26 * s;
        this.r.rect(sx - 3, sy - H, 7, H, (x, y) => shade(hex('#5a3a22'), 1 + (x < sx ? 0.15 : -0.2) + noise(x, y >> 1, seed) * 0.15));
        for (let i = 0; i < 6; i++) {
          const ax = sx + (i % 3 - 1) * 9 * s, ay = sy - H - (i < 3 ? 0 : 9) * s;
          this.ellipse(ax, ay, 11 * s, 9 * s, (dx, dy) => shade(col, 1.05 - dy * 0.25 - dx * 0.2 + (noise(Math.floor(dx * 6), Math.floor(dy * 6), seed + i) - 0.5) * 0.25));
        }
        if (s >= 0.8) for (let i = 0; i < 9; i++) this.ellipse(sx + (noise(i, 1, seed) - 0.5) * 30 * s, sy - H - 8 * s + (noise(i, 2, seed) - 0.5) * 18 * s, 1.6, 1.6, () => hex('#ffd25a'));
        break;
      }
      case 'statue': {
        this.r.rect(sx - 4 * s, sy - 26 * s, 8 * s, 18 * s, (x, y) => tex('stone', hex('#8f8a7a'), x, y, seed));
        this.ellipse(sx, sy - 30 * s, 4 * s, 5 * s, (dx) => shade(hex('#9a9584'), 1 - dx * 0.3));
        break;
      }
      case 'mast': {
        for (let i = 0; i < 26 * s; i++) this.r.set(sx, sy - i, hex('#4a3020'));
        this.r.poly([[sx + 1, sy - 24 * s], [sx + 10 * s, sy - 16 * s], [sx + 1, sy - 8 * s]], (x, y) => shade(col, 1.05 - (x - sx) * 0.02 + noise(x, y, seed) * 0.06));
        break;
      }
      case 'orb': {
        this.ellipse(sx, sy, 5 * s, 5 * s, (dx, dy) => mix(col, [255, 255, 255], Math.max(0, 0.6 - Math.hypot(dx + 0.4, dy + 0.4))));
        break;
      }
      case 'crystal': {
        this.r.poly([[sx, sy - 18 * s], [sx + 5 * s, sy - 6 * s], [sx, sy], [sx - 5 * s, sy - 6 * s]], (x, y) => shade(col, x < sx ? 1.25 : 0.8 + noise(x, y, seed) * 0.1));
        break;
      }
      case 'mine': {
        this.ellipse(sx, sy - 4, 7 * s, 6 * s, (dx, dy) => (dy > 0.6 ? null : Math.hypot(dx, dy) > 0.75 ? hex('#5a3a22') : hex('#0e0a10')));
        break;
      }
    }
  }
}

/** Render a building spec to a trimmed raster with outline. Returns raster and anchor (footprint centre). */
export function renderSpec(spec: Spec, seed = 1): { r: Raster; ax: number; ay: number } {
  const W = 96, H = 110, ox = 48, oy = 86;
  const c = new IsoCanvas(W, H, ox, oy);
  const order = [...spec.parts].sort((p, q) => ((p.x ?? 0) + (p.y ?? 0)) - ((q.x ?? 0) + (q.y ?? 0)));
  order.forEach((p, i) => c.part(p, seed + i));
  for (const e of spec.extras ?? []) c.extra(e, seed);
  c.r.outline(OUTLINE);
  // trim
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (c.r.alpha(x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (maxX < minX) return { r: new Raster(1, 1), ax: 0, ay: 0 };
  const out = new Raster(maxX - minX + 1, maxY - minY + 1);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) { const a = c.r.alpha(x, y); if (a) out.set(x - minX, y - minY, c.r.get(x, y), a); }
  return { r: out, ax: ox - minX, ay: oy - minY };
}
