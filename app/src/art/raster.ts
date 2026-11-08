// Tiny pixel raster: polygons with per-pixel shaders, silhouette outlines, export to canvas.
export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

export function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
export function shade(c: RGB, f: number): RGB {
  return f >= 1 ? mix(c, [255, 244, 220], Math.min(1, f - 1)) : mix([12, 8, 20], c, Math.max(0, f));
}

/** Deterministic hash noise in [0,1). */
export function noise(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

/** 4x4 Bayer threshold for dithered gradients. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

export class Raster {
  data: Uint8ClampedArray<ArrayBuffer>;
  constructor(public w: number, public h: number) { this.data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4)); }

  set(x: number, y: number, c: RGB, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255) { this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = 255; return; }
    const t = a / 255, o = this.data[i + 3] / 255;
    this.data[i] = c[0] * t + this.data[i] * (1 - t);
    this.data[i + 1] = c[1] * t + this.data[i + 1] * (1 - t);
    this.data[i + 2] = c[2] * t + this.data[i + 2] * (1 - t);
    this.data[i + 3] = Math.min(255, (t + o * (1 - t)) * 255);
  }
  alpha(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[(y * this.w + x) * 4 + 3]; }
  get(x: number, y: number): RGB { const i = (y * this.w + x) * 4; return [this.data[i], this.data[i + 1], this.data[i + 2]]; }

  /** Fill a polygon; shader returns a colour or null (skip) for each pixel centre. */
  poly(pts: [number, number][], shader: (x: number, y: number) => RGB | null) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
      const cy = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
          const c = shader(x, y); if (c) this.set(x, y, c);
        }
      }
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB | ((x: number, y: number) => RGB | null)) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const v = typeof c === 'function' ? c(i, j) : c; if (v) this.set(i, j, v); }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  /** Dark 1px outline around the opaque silhouette. */
  outline(c: RGB) {
    const out: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y)) continue;
      if (this.alpha(x - 1, y) > 128 || this.alpha(x + 1, y) > 128 || this.alpha(x, y - 1) > 128 || this.alpha(x, y + 1) > 128) out.push(x, y);
    }
    for (let i = 0; i < out.length; i += 2) this.set(out[i], out[i + 1], c);
  }
  draw(src: Raster, dx: number, dy: number) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const a = src.alpha(x, y); if (a) this.set(dx + x, dy + y, src.get(x, y), a);
    }
  }
  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    c.getContext('2d')!.putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return c;
  }
}
