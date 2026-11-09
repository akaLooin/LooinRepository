// Generated UI textures (stone, leather, wood, parchment) and framed icons for upgrades/spells.
import { Raster, bayer, hex, mix, noise, shade, type RGB } from './raster';
import { PALETTE, SPRITES } from './sprites';

function tile(w: number, h: number, f: (x: number, y: number) => RGB): string {
  const r = new Raster(w, h);
  r.rect(0, 0, w, h, f);
  return r.toCanvas().toDataURL();
}

export function installTextures(root: HTMLElement = document.documentElement) {
  // parchment page with faint ruled lines and fibres
  const page = tile(64, 64, (x, y) => {
    const fib = (noise(x >> 2, y, 3) - 0.5) * 0.06 + (noise(x, y, 4) - 0.5) * 0.05;
    const blot = noise(x >> 4, y >> 4, 5) * 0.06;
    return shade(hex('#efe3c4'), 1 + fib - blot + (y % 16 === 15 ? -0.035 : 0));
  });
  // navy velvet with tiny star specks
  const velvet = tile(48, 48, (x, y) => {
    const n = (noise(x >> 1, y >> 1, 7) - 0.5) * 0.18;
    const star = noise(x, y, 11) > 0.985 ? 1.9 : 1;
    return shade(hex('#2c2350'), (1 + n) * star);
  });
  // book-spine band: navy leather with gold tooling lines
  const spine = tile(16, 60, (x, y) => {
    if (y === 6 || y === 9 || y === 50 || y === 53) return hex('#e2b85a');
    if (y === 7 || y === 51) return hex('#8a6420');
    return shade(hex('#30265a'), 1 + (noise(x >> 1, y >> 1, 2) - 0.5) * 0.2);
  });
  const parchment = tile(32, 32, (x, y) => shade(hex('#3a3026'), 1 + (noise(x >> 2, y >> 2, 9) - 0.5) * 0.2 + (noise(x, y, 10) - 0.5) * 0.08));
  root.style.setProperty('--tex-stone', `url(${page})`);
  root.style.setProperty('--tex-leather', `url(${velvet})`);
  root.style.setProperty('--tex-wood', `url(${spine})`);
  root.style.setProperty('--tex-parchment', `url(${parchment})`);
  void bayer; void mix;
}

const FRAME: Record<string, [string, string, string]> = {
  plain: ['#5a4a3a', '#8a7458', '#2a2018'],
  bronze: ['#8a5a2a', '#d8975a', '#3a2010'],
  silver: ['#8a8a96', '#e0e0ea', '#34343c'],
  gold: ['#b8902a', '#ffe07a', '#4a3608'],
};

const iconCache = new Map<string, string>();
/** 20x20 framed icon (render at x2 => 40px). */
export function framedIcon(sprite: string, bg: string, frame: keyof typeof FRAME = 'plain'): string {
  const key = sprite + bg + frame;
  const hit = iconCache.get(key); if (hit) return hit;
  const r = new Raster(20, 20);
  const [mid, hi, lo] = FRAME[frame].map(hex);
  const b = hex(bg);
  r.rect(0, 0, 20, 20, (x, y) => {
    if (x === 0 || y === 0 || x === 19 || y === 19) return lo;
    if (x === 1 || y === 1) return hi;
    if (x === 18 || y === 18) return shade(mid, 0.7);
    if (x === 2 || y === 2 || x === 17 || y === 17) return mid;
    const d = Math.hypot(x - 8, y - 7) / 12;
    return shade(b, 1.1 - d * 0.6 + (bayer(x, y) - 0.5) * 0.08);
  });
  const rows = SPRITES[sprite];
  if (rows) rows.forEach((row, y) => { for (let x = 0; x < 16; x++) { const c = PALETTE[row[x]]; if (c) r.set(x + 2, y + 2, hex(c)); } });
  // corner studs
  for (const [x, y] of [[1, 1], [18, 1], [1, 18], [18, 18]]) r.set(x, y, mix(hi, [255, 255, 255], 0.4));
  const url = r.toCanvas().toDataURL();
  iconCache.set(key, url);
  return url;
}
