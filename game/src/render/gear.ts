// 장비 겉모습: 마네킹과 같은 1배 픽셀로 그린 모자·갑옷을 머리·몸통 칸에 맞춰 붙인다.
// 머리와 몸통은 동작 중에 돌지 않고 칸 단위로만 움직이므로(layout의 sway·lift) 같은 만큼만 옮기면 어긋나지 않는다.
import { HEAD_DROP, MIRROR, OUTLINE } from './mannequin';
import { CLASSES, ITEMS } from '../core/data';
import type { Character } from '../core/state';
import type { Gear } from '../net';

export type GearOn = 'head' | 'body';
export interface GearDef {
  on: GearOn;
  /** 시안 격자(BASE_PX, 21×27)에서 그림 왼쪽 위 칸 */
  at: [number, number];
  rows: string[];
  pal: Record<string, string>;
}

const MOSS = { L: '#8fde5d', G: '#5fb859', D: '#3b8c4f' };
const GOLD = { y: '#fbe48a', Y: '#f6c945', D: '#c98f2a' };
const WOOD = { L: '#e8c08a', B: '#b9824f', D: '#8a5a3c', K: '#6e4630', Y: '#f6c945' };

/** 아이템 id → 겉모습. 'o'는 검정 테두리 */
export const GEAR: Record<string, GearDef> = {
  // 이끼 모자: 머리 윗부분을 덮는 둥근 이끼 덮개
  hat_moss: { on: 'head', at: [4, -3], pal: MOSS, rows: [
    '....oooo....',
    '..ooLLGGoo..',
    '.oLLGGGGGGo.',
    '.oLGGGGGGDo.',
    'oLGGGGGGGGDo',
    'oDDDDDDDDDDo',
    '.oooooooooo.',
  ] },
  // 이끼 왕관: 세 갈래 금관에 붉은 보석과 이끼
  moss_crown: { on: 'head', at: [5, -3], pal: { ...GOLD, R: '#e84a5a', G: MOSS.G }, rows: [
    '.o..oo..o.',
    'oyooyyooyo',
    'oyYYYYYYYo',
    'oYYRYYGYDo',
    'oDDDDDDDDo',
    '.oooooooo.',
  ] },
  helm_blue: { on: 'head', at: [4, -2], pal: { L: '#c4dcff', M: '#6a9ae8', D: '#3a5a9a', G: '#f2f0e6' }, rows: [
    '...oooooo...',
    '..oLMMMMMo..',
    '.oLMMMMMMDo.',
    '.oLMMGMMMDo.',
    'oLMMMMMMMMDo',
    'oDDDDDDDDDDo',
    '.oooooooooo.',
  ] },
  plate_blue: { on: 'body', at: [6, 10], pal: { L: '#c4dcff', M: '#6a9ae8', D: '#3a5a9a', G: '#f2f0e6' }, rows: [
    '..oooo..',
    '.oLMMMo.',
    '.oLMMDo.',
    '.oLGMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    '.oLMMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    'oDDGDDDo',
    'oooooooo',
  ] },
  helm_gold: { on: 'head', at: [4, -2], pal: { L: '#fff1a8', M: '#f2c14e', D: '#a8782a', G: '#d9574a' }, rows: [
    '...oooooo...',
    '..oLMMMMMo..',
    '.oLMMMMMMDo.',
    '.oLMMGMMMDo.',
    'oLMMMMMMMMDo',
    'oDDDDDDDDDDo',
    '.oooooooooo.',
  ] },
  plate_gold: { on: 'body', at: [6, 10], pal: { L: '#fff1a8', M: '#f2c14e', D: '#a8782a', G: '#d9574a' }, rows: [
    '..oooo..',
    '.oLMMMo.',
    '.oLMMDo.',
    '.oLGMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    '.oLMMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    'oDDGDDDo',
    'oooooooo',
  ] },
  helm_amber: { on: 'head', at: [4, -2], pal: { L: '#ffd08a', M: '#f0902a', D: '#9a5420', G: '#4ec8c8' }, rows: [
    '...oooooo...',
    '..oLMMMMMo..',
    '.oLMMMMMMDo.',
    '.oLMMGMMMDo.',
    'oLMMMMMMMMDo',
    'oDDDDDDDDDDo',
    '.oooooooooo.',
  ] },
  plate_amber: { on: 'body', at: [6, 10], pal: { L: '#ffd08a', M: '#f0902a', D: '#9a5420', G: '#4ec8c8' }, rows: [
    '..oooo..',
    '.oLMMMo.',
    '.oLMMDo.',
    '.oLGMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    '.oLMMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    'oDDGDDDo',
    'oooooooo',
  ] },
  helm_frost: { on: 'head', at: [4, -2], pal: { L: '#e0f6ff', M: '#8ad0f0', D: '#3a7ab0', G: '#4a8ae8' }, rows: [
    '...oooooo...',
    '..oLMMMMMo..',
    '.oLMMMMMMDo.',
    '.oLMMGMMMDo.',
    'oLMMMMMMMMDo',
    'oDDDDDDDDDDo',
    '.oooooooooo.',
  ] },
  plate_frost: { on: 'body', at: [6, 10], pal: { L: '#e0f6ff', M: '#8ad0f0', D: '#3a7ab0', G: '#4a8ae8' }, rows: [
    '..oooo..',
    '.oLMMMo.',
    '.oLMMDo.',
    '.oLGMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    '.oLMMDo.',
    '.oDDDDo.',
    '.oLMMDo.',
    'oDDGDDDo',
    'oooooooo',
  ] },
  // 얼음 왕관: 다섯 갈래 얼음 가시
  frost_crown: { on: 'head', at: [4, -3], pal: { L: '#e0faff', M: '#a8e8ff', D: '#4a7ab8', G: '#4a8ae8' }, rows: [
    '.o.o.oo.o.o.',
    'oLoLoLLoLoLo',
    'oLMLMMMMLMMo',
    'oMMMMGMMMMDo',
    'oDDDDDDDDDDo',
    '.oooooooooo.',
  ] },
  // 통나무 갑옷: 가슴을 덮는 나무판과 허리띠(팔은 그대로 보이게 몸통 폭만)
  armor_log: { on: 'body', at: [6, 10], pal: WOOD, rows: [
    '..oooo..',
    '.oLBBBo.',
    '.oLBBDo.',
    '.oLBBDo.',
    '.oDDDDo.',
    '.oLBBDo.',
    '.oLBBDo.',
    '.oDDDDo.',
    '.oLBBDo.',
    'oKKYKKKo',
    'oooooooo',
  ] },
};

/** 겉모습 텍스처 key */
export const gearKey = (id: string) => `gear_${id}`;

/** 캔버스로 그린다 */
export function paintGear(g: GearDef): HTMLCanvasElement {
  const w = Math.max(...g.rows.map((r) => r.length)), h = g.rows.length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  g.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x], col = ch === 'o' ? OUTLINE : g.pal[ch];
      // 몸을 좌우로 뒤집었으므로 장비 그림도 함께 뒤집는다
      if (col) { ctx.fillStyle = col; ctx.fillRect(MIRROR ? w - 1 - x : x, y, 1, 1); }
    }
  });
  return cv;
}

/** 붙일 위치(발 기준, 1배 칸): 프레임의 윗몸 이동(off)만큼 따라간다 */
export function gearPos(g: GearDef, off: [number, number, number]): [number, number] {
  const at0 = MIRROR ? 20 - g.at[0] - Math.max(...g.rows.map((r) => r.length)) : g.at[0];
  return [at0 + off[0] + (g.on === 'head' ? off[2] : 0) - 10, g.at[1] + off[1] + (g.on === 'head' ? HEAD_DROP : 0) - 26];
}

/** 다른 플레이어가 보낸 장비 → 그릴 수 있는 것만(모르는 id·칸이 안 맞는 id는 버리고, 무기가 없으면 직업 기본 무기) */
export function remoteGear(g: Gear | undefined, cls: string): Character['equipment'] {
  const ok = (id: string | undefined, slot: string) => (id && ITEMS[id]?.slot === slot ? id : undefined);
  const b = CLASSES[cls as keyof typeof CLASSES]?.base ?? cls;
  const weapon = ok(g?.weapon, 'weapon') ?? (b === 'archer' ? 'bow_wood' : b === 'mage' ? 'wand_wood' : 'sword_wood');
  const hat = ok(g?.hat, 'hat'), body = ok(g?.body, 'body');
  return { weapon, ...(hat && GEAR[hat] ? { hat } : {}), ...(body && GEAR[body] ? { body } : {}) };
}
