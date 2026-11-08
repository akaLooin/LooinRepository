// Generated UI textures (stone, leather, wood, parchment) and framed icons for upgrades/spells.
import { Raster, bayer, hex, mix, noise, shade, type RGB } from './raster';
import { PALETTE, SPRITES } from './sprites';

function tile(w: number, h: number, f: (x: number, y: number) => RGB): string {
  const r = new Raster(w, h);
  r.rect(0, 0, w, h, f);
  return r.toCanvas().toDataURL();
}

export function installTextures(root: HTMLElement = document.documentElement) {
  const stone = tile(48, 48, (x, y) => {
    const row = Math.floor(y / 12), off = row % 2 ? 8 : 0, col = Math.floor((x + off) / 16);
    const mortar = y % 12 === 0 || (x + off) % 16 === 0;
    const base = hex('#221d22');
    if (mortar) return shade(base, 0.6);
    const n = noise(x, y, 3) * 0.12 + (noise(col, row, 5) - 0.5) * 0.18;
    const edge = y % 12 === 1 || (x + off) % 16 === 1 ? 0.12 : 0;
    return shade(base, 1 + n + edge);
  });
  const leather = tile(32, 32, (x, y) => shade(hex('#2e1e19'), 1 + (noise(x >> 1, y >> 1, 7) - 0.5) * 0.25 + (noise(x, y, 8) - 0.5) * 0.1));
  const wood = tile(64, 16, (x, y) => {
    const grain = Math.sin((x + noise(0, y, 2) * 30) / 5 + y * 0.3) * 0.08;
    return shade(hex('#4a3020'), 1 + grain + (y % 8 === 0 ? -0.3 : 0) + (noise(x, y, 4) - 0.5) * 0.1);
  });
  const parchment = tile(32, 32, (x, y) => shade(hex('#3a3026'), 1 + (noise(x >> 2, y >> 2, 9) - 0.5) * 0.2 + (noise(x, y, 10) - 0.5) * 0.08));
  root.style.setProperty('--tex-stone', `url(${stone})`);
  root.style.setProperty('--tex-leather', `url(${leather})`);
  root.style.setProperty('--tex-wood', `url(${wood})`);
  root.style.setProperty('--tex-parchment', `url(${parchment})`);
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
