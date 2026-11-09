// Building art specs (original designs). Level 0/1/2 grows the building as you own more.
import { renderSpec, type Spec } from './iso';
import type { Raster } from './raster';

const BRIGHT = '#3f6fc0', DARK = '#a8322e', LEGEND = '#6b6656';

type Maker = (lv: number) => Spec;
const lvH = (lv: number, h: number) => h + lv * 6;

export const BUILDING_ART: Record<string, Maker> = {
  // tier 1: storyteller's cottage
  c1: (lv) => ({
    parts: [
      { a: 7, b: 6, h: lvH(lv, 8), mat: 'timber', wall: '#d8c49a', roof: 'gable', roofH: 9, roofColor: '#8a4a2a', windows: 1, door: true },
      ...(lv >= 1 ? [{ x: -12, y: 2, a: 5, b: 5, h: 6, mat: 'plank' as const, wall: '#9a6a3a', roof: 'gable' as const, roofH: 6, roofColor: '#7a4228' }] : []),
    ],
    extras: [{ kind: 'chimney', x: -3, y: -2, z: lvH(lv, 8) + 7 }],
  }),
  // tier 2: mushroom inn
  c2: (lv) => ({
    parts: [{ a: 7, b: 7, h: lvH(lv, 9), mat: 'plaster', wall: '#e2d4b0', roof: 'none', windows: 1 + (lv > 1 ? 1 : 0), door: true }],
    extras: [{ kind: 'mushroom', x: 0, y: 0, z: lvH(lv, 9) - 2, color: '#b8342c', size: 1.1 + lv * 0.15 }],
  }),
  // tier 3: candy workshop with oven
  c3: (lv) => ({
    parts: [
      { a: 9, b: 7, h: lvH(lv, 10), mat: 'brick', wall: '#b86a4a', roof: 'gable', roofH: 9, roofColor: '#e0a0b8', windows: 1, door: true },
      { x: 4, y: -9, a: 3, b: 3, h: lvH(lv, 10) + 10, mat: 'brick', wall: '#8a4a3a', roof: 'flat' },
    ],
    extras: [{ kind: 'banner', x: -9, y: 7, z: 0, color: '#e070a0' }],
  }),
  // ---- bright (blue banners, pale stone, slate roofs)
  b4: (lv) => ({ parts: [{ a: 8, b: 6, h: 8, mat: 'plank', wall: '#a0784a', roof: 'gable', roofH: 8, roofColor: '#5a7a3a', door: true }], extras: [{ kind: 'vine', x: 10, y: -6, z: 0, size: 0.8 + lv * 0.2 }] }),
  b5: (lv) => ({ parts: [
      { a: 11, b: 8, h: lvH(lv, 12), mat: 'plaster', wall: '#e8e0d0', roof: 'hip', roofH: 10, roofColor: '#3a5a9a', windows: 1 + lv, door: true },
      { x: 12, y: -6, a: 3, b: 3, h: lvH(lv, 20), mat: 'plaster', wall: '#e8e0d0', roof: 'hip', roofH: 10, roofColor: '#3a5a9a' }],
    extras: [{ kind: 'banner', x: -11, y: 8, color: BRIGHT }] }),
  b6: (lv) => ({ parts: [
      { a: 9, b: 9, h: lvH(lv, 14), mat: 'stone', wall: '#c8c0b0', roof: 'hip', roofH: 12, roofColor: '#2f4f8a', windows: 2, door: true },
      { x: -10, y: 8, a: 4, b: 4, h: lvH(lv, 26), mat: 'stone', wall: '#c8c0b0', roof: 'hip', roofH: 14, roofColor: '#2f4f8a', windows: 2 }],
    extras: [{ kind: 'orb', x: -10, y: 8, z: lvH(lv, 26) + 18, color: '#7cc0ff' }] }),
  b7: (lv) => ({ parts: [{ a: 12, b: 7, h: 6, mat: 'plank', wall: '#8a6a4a', roof: 'flat' }, { x: 2, a: 7, b: 5, h: lvH(lv, 8), z: 6, mat: 'plaster', wall: '#e8e0d0', roof: 'gable', roofH: 7, roofColor: '#3a5a9a', windows: 1 }],
    extras: [{ kind: 'mast', x: -8, y: 4, z: 6, color: '#f0ece0', size: 1 + lv * 0.15 }] }),
  b8: (lv) => ({ parts: [
      { a: 12, b: 10, h: lvH(lv, 14), mat: 'crystal', wall: '#9ad0e8', roof: 'flat', crenel: true, windows: 1, door: true },
      { x: -12, y: 10, a: 4, b: 4, h: lvH(lv, 28), mat: 'crystal', wall: '#9ad0e8', roof: 'hip', roofH: 16, roofColor: '#4f78c8' },
      { x: 12, y: -10, a: 4, b: 4, h: lvH(lv, 28), mat: 'crystal', wall: '#9ad0e8', roof: 'hip', roofH: 16, roofColor: '#4f78c8' }],
    extras: [{ kind: 'banner', x: 0, y: 0, z: lvH(lv, 14), color: BRIGHT }] }),
  b9: (lv) => ({ parts: [{ a: 13, b: 9, h: lvH(lv, 16), mat: 'stone', wall: '#d8d0c0', roof: 'hip', roofH: 14, roofColor: '#2a3a7a', windows: 2, door: true }],
    extras: [{ kind: 'orb', x: 0, y: 0, z: lvH(lv, 16) + 18, color: '#ffe080', size: 0.8 }, { kind: 'banner', x: 13, y: 9, color: BRIGHT }, { kind: 'banner', x: -13, y: 9, color: BRIGHT }] }),
  b10: (lv) => ({ parts: [
      { a: 14, b: 14, h: 6, mat: 'stone', wall: '#e8e4d8', roof: 'flat' },
      { z: 6, a: 8, b: 8, h: lvH(lv, 18), mat: 'plaster', wall: '#f0ece0', roof: 'hip', roofH: 18, roofColor: '#c8a040', windows: 2 }],
    extras: [{ kind: 'tree', x: -11, y: 10, z: 6, color: '#6ab85a', size: 0.45 }, { kind: 'orb', x: 0, y: 0, z: lvH(lv, 18) + 30, color: '#fff0a0' }] }),
  // ---- dark (red banners, black timber, bone)
  d4: (lv) => ({ parts: [{ a: 8, b: 7, h: lvH(lv, 10), mat: 'plank', wall: '#4a3a30', roof: 'gable', roofH: 10, roofColor: '#3a2a2a', windows: 1, lit: true, door: true }],
    extras: [{ kind: 'wheel', x: 10, y: 0, z: 6, size: 1 }] }),
  d5: (lv) => ({ parts: [{ a: 7, b: 6, h: lvH(lv, 8), mat: 'rock', wall: '#5a5048', roof: 'gable', roofH: 8, roofColor: '#3a3028', door: true }],
    extras: [{ kind: 'tree', x: -10, y: 8, color: '#2f4a32', size: 0.4 }, { kind: 'tree', x: 10, y: -6, color: '#2a3f2c', size: 0.35 }, { kind: 'banner', x: 7, y: 6, color: DARK }] }),
  d6: (lv) => ({ parts: [{ a: 7, b: 7, h: lvH(lv, 10), mat: 'timber', wall: '#5a4a5a', roof: 'hip', roofH: 16, roofColor: '#2a2030', windows: 1, door: true }],
    extras: [{ kind: 'orb', x: 9, y: 8, z: 3, color: '#7ae06a', size: 0.8 }, { kind: 'chimney', x: -2, y: -3, z: lvH(lv, 10) + 9 }] }),
  d7: (lv) => ({ parts: [{ a: 12, b: 7, h: 6, mat: 'plank', wall: '#3a2e28', roof: 'flat' }, { x: 2, z: 6, a: 6, b: 5, h: lvH(lv, 8), mat: 'bone', wall: '#d8d0b8', roof: 'gable', roofH: 7, roofColor: '#2a2028' }],
    extras: [{ kind: 'mast', x: -8, y: 4, z: 6, color: '#3a3038' }, { kind: 'banner', x: 8, y: 5, z: 6, color: DARK }] }),
  d8: (lv) => ({ parts: [{ a: 12, b: 10, h: lvH(lv, 12), mat: 'stone', wall: '#4a4458', roof: 'flat', crenel: true, windows: 1, lit: true, door: true }],
    extras: [{ kind: 'crystal', x: 0, y: 0, z: lvH(lv, 12), color: '#b080e0', size: 1 + lv * 0.2 }] }),
  d9: (lv) => ({ parts: [{ a: 13, b: 9, h: lvH(lv, 16), mat: 'stone', wall: '#3a3040', roof: 'hip', roofH: 16, roofColor: '#5a1a1a', windows: 2, lit: true, door: true }],
    extras: [{ kind: 'banner', x: 13, y: 9, color: DARK }, { kind: 'banner', x: -13, y: 9, color: DARK }] }),
  d10: (lv) => ({ parts: [
      { a: 10, b: 10, h: 8, mat: 'rock', wall: '#3a3038', roof: 'flat' },
      { z: 8, a: 6, b: 6, h: lvH(lv, 34), mat: 'stone', wall: '#2e2836', roof: 'hip', roofH: 18, roofColor: '#6a1a1a', windows: 3, lit: true }],
    extras: [{ kind: 'orb', x: 0, y: 0, z: lvH(lv, 34) + 30, color: '#ff6040', size: 0.9 }] }),
  // ---- legend (grey stone, sand, bronze)
  l4: (lv) => ({ parts: [{ a: 9, b: 8, h: lvH(lv, 7), mat: 'rock', wall: '#7a6a58', roof: 'flat' }],
    extras: [{ kind: 'mine', x: 9, y: 0, z: 0 }, { kind: 'crystal', x: -4, y: -2, z: lvH(lv, 7), color: '#e0c060', size: 0.7 }] }),
  l5: (lv) => ({ parts: [
      { a: 12, b: 4, h: lvH(lv, 8), mat: 'stone', wall: '#8a8478', roof: 'flat', crenel: true },
      { x: -12, a: 4, b: 5, h: lvH(lv, 16), mat: 'stone', wall: '#8a8478', roof: 'flat', crenel: true },
      { x: 12, a: 4, b: 5, h: lvH(lv, 16), mat: 'stone', wall: '#8a8478', roof: 'flat', crenel: true }],
    extras: [{ kind: 'banner', x: 12, y: 5, z: lvH(lv, 16), color: LEGEND }] }),
  l6: (lv) => ({ parts: [{ a: 8, b: 7, h: lvH(lv, 10), mat: 'brick', wall: '#9a8a6a', roof: 'hip', roofH: 10, roofColor: '#4a6a5a', windows: 1, door: true }],
    extras: [{ kind: 'chimney', x: -2, y: -2, z: lvH(lv, 10) + 6 }, { kind: 'orb', x: 10, y: 8, z: 2, color: '#a0f0c0', size: 0.7 }] }),
  l7: (lv) => ({ parts: [
      { a: 10, b: 8, h: lvH(lv, 12), mat: 'stone', wall: '#b0a890', roof: 'gable', roofH: 12, roofColor: '#6a5040', windows: 1, door: true },
      { x: -11, y: 7, a: 4, b: 4, h: lvH(lv, 26), mat: 'stone', wall: '#b0a890', roof: 'hip', roofH: 10, roofColor: '#6a5040' }],
    extras: [{ kind: 'orb', x: -11, y: 7, z: lvH(lv, 26) + 13, color: '#c0a0ff', size: 0.6 }] }),
  l8: (lv) => ({ parts: [
      { a: 13, b: 13, h: 5, mat: 'stone', wall: '#7a7464', roof: 'flat' },
      { z: 5, a: 9, b: 9, h: 5, mat: 'stone', wall: '#8a8474', roof: 'flat' },
      { z: 10, a: 5, b: 5, h: lvH(lv, 6), mat: 'stone', wall: '#9a9484', roof: 'flat' }],
    extras: [{ kind: 'crystal', x: 0, y: 0, z: lvH(lv, 16), color: '#80e0d0', size: 0.6 }] }),
  l9: (lv) => ({ parts: [{ a: 12, b: 10, h: lvH(lv, 10), mat: 'rock', wall: '#6a6058', roof: 'flat' }],
    extras: [{ kind: 'crystal', x: -4, y: 2, z: lvH(lv, 10), color: '#ffd040', size: 0.9 }, { kind: 'crystal', x: 5, y: -3, z: lvH(lv, 10), color: '#ffb030', size: 0.7 }, { kind: 'mine', x: 12, y: 0 }] }),
  l10: (lv) => ({ parts: [{ a: 9, b: 9, h: 6, mat: 'stone', wall: '#8a8474', roof: 'flat' }],
    extras: [{ kind: 'statue', x: 0, y: 0, z: 6, size: 1 + lv * 0.2 }] }),
  // tier 11: great tale tree
  c11: (lv) => ({ parts: [{ a: 9, b: 9, h: 4, mat: 'stone', wall: '#8a7a5a', roof: 'flat' }],
    extras: [{ kind: 'tree', x: 0, y: 0, z: 4, color: '#4f9a4a', size: 0.9 + lv * 0.15 }] }),
};

export function levelFor(count: number) { return count >= 100 ? 2 : count >= 25 ? 1 : 0; }

const cache = new Map<string, { r: Raster; ax: number; ay: number }>();
export function buildingSprite(id: string, lv: number) {
  const key = id + ':' + lv;
  let v = cache.get(key);
  if (!v) { v = renderSpec(BUILDING_ART[id](lv), id.charCodeAt(0) * 31 + id.length * 7 + (id.charCodeAt(1) || 0)); cache.set(key, v); }
  return v;
}

const thumbs = new Map<string, string>();
/** Data URL thumbnail (fits in size x size, integer scale) for cards. */
export function buildingThumb(id: string, size = 32): string {
  const k = id + '@' + size;
  const hit = thumbs.get(k); if (hit) return hit;
  const { r } = buildingSprite(id, 1);
  const scale = Math.max(1, Math.floor(size / Math.max(r.w, r.h)) || 1);
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  const fit = Math.min(size / r.w, size / r.h, scale);
  const w = Math.round(r.w * fit), h = Math.round(r.h * fit);
  ctx.drawImage(r.toCanvas(), Math.floor((size - w) / 2), size - h, w, h);
  const url = c.toDataURL(); thumbs.set(k, url); return url;
}
