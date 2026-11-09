// Renders the launcher icon (64x64 pixel art) for export. Used by scripts only.
import { Raster, hex, mix, noise, shade } from './art/raster';
import { buildingSprite } from './art/buildings';

function icon(round: boolean, foregroundOnly = false): HTMLCanvasElement {
  const S = 64, r = new Raster(S, S);
  if (!foregroundOnly) r.rect(0, 0, S, S, (x, y) => {
    if (round && Math.hypot(x - 31.5, y - 31.5) > 31.5) return null;
    const glow = Math.max(0, 1 - Math.hypot(x - 32, y - 30) / 34);
    const c = mix(hex('#2a2258'), hex('#6a4aa0'), glow);
    return noise(x, y, 4) > 0.975 ? hex('#fff2b0') : shade(c, 1);
  });
  const ox = 32, oy = 44; // open book
  const page = hex('#f1e6c8');
  r.poly([[ox - 24, oy - 8], [ox, oy - 2], [ox, oy + 6], [ox - 24, oy]], (x, y) => shade(page, 1 - (ox - x) * 0.004 + (y % 3 === 0 ? -0.06 : 0)));
  r.poly([[ox + 24, oy - 8], [ox, oy - 2], [ox, oy + 6], [ox + 24, oy]], (x, y) => shade(page, 0.85 + (y % 3 === 0 ? -0.06 : 0)));
  r.poly([[ox - 25, oy], [ox, oy + 6], [ox + 25, oy], [ox + 25, oy + 2], [ox, oy + 9], [ox - 25, oy + 2]], () => hex('#3a2e6a'));
  r.line(ox - 25, oy + 2, ox, oy + 9, hex('#e2b85a')); r.line(ox, oy + 9, ox + 25, oy + 2, hex('#e2b85a'));
  const b = buildingSprite('c1', 0);
  r.draw(b.r, ox - b.ax, oy - 2 - b.ay);
  for (const [x, y] of [[12, 14], [50, 10], [54, 30], [10, 34]]) { r.set(x, y, hex('#fff6c0')); r.set(x + 1, y, hex('#fff6c0'), 140); r.set(x - 1, y, hex('#fff6c0'), 140); r.set(x, y + 1, hex('#fff6c0'), 140); r.set(x, y - 1, hex('#fff6c0'), 140); }
  r.outline(hex('#140c16'));
  return r.toCanvas();
}
function scaled(c: HTMLCanvasElement, size: number, inset = 0) {
  const o = document.createElement('canvas'); o.width = o.height = size;
  const ctx = o.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, inset, inset, size - inset * 2, size - inset * 2);
  return o.toDataURL('image/png');
}
(window as unknown as { icons: Record<string, string> }).icons = {
  square512: scaled(icon(false), 512), round512: scaled(icon(true), 512),
  sq48: scaled(icon(false), 48), sq72: scaled(icon(false), 72), sq96: scaled(icon(false), 96), sq144: scaled(icon(false), 144), sq192: scaled(icon(false), 192),
  rd48: scaled(icon(true), 48), rd72: scaled(icon(true), 72), rd96: scaled(icon(true), 96), rd144: scaled(icon(true), 144), rd192: scaled(icon(true), 192),
  // adaptive foreground: 108dp canvas, art in the safe 72dp centre
  fg108: scaled(icon(false, true), 108, 18), fg162: scaled(icon(false, true), 162, 27), fg216: scaled(icon(false, true), 216, 36), fg324: scaled(icon(false, true), 324, 54), fg432: scaled(icon(false, true), 432, 72),
};
document.body.append(icon(true));
/** splash: navy library background with the icon art centred at an integer scale */
(window as unknown as { splash: (w: number, h: number) => string }).splash = (w, h) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  // pixel-style banded radial gradient (8px blocks, ordered dither) — small PNGs
  const B = 8, sw = Math.ceil(w / B), sh = Math.ceil(h / B), small = new Raster(sw, sh);
  const bands = ['#1d1830', '#2a2250', '#3a2c6a', '#4a3580', '#5a3f8a'].map(hex);
  small.rect(0, 0, sw, sh, (x, y) => {
    const d = 1 - Math.min(1, Math.hypot(x - sw / 2, y - sh / 2) / (Math.max(sw, sh) / 1.3));
    const t = d * (bands.length - 1), i = Math.floor(t);
    const th = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16;
    return bands[Math.min(bands.length - 1, i + (t - i > th ? 1 : 0))];
  });
  ctx.drawImage(small.toCanvas(), 0, 0, sw * B, sh * B);
  const art = icon(false, true), k = Math.max(1, Math.floor(Math.min(w, h) / 3 / 64));
  ctx.drawImage(art, Math.floor((w - 64 * k) / 2), Math.floor((h - 64 * k) / 2), 64 * k, 64 * k);
  return c.toDataURL('image/png');
};
