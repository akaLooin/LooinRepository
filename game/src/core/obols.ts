// 오볼(2월드부터): 원작처럼 몬스터가 떨어뜨리는 작은 동전 모양 장비.
//  · 모양(동그라미·네모·육각·별빛)과 등급(동·은·금·별)이 있고, 같은 모양 칸에만 끼운다.
//  · 개인 오볼판: 캐릭터마다, 레벨이 오르면 칸이 열린다. 가족 오볼판: 계정 공용, 모든 캐릭터에게 효과(가족 레벨로 칸이 열린다).
import { BonusKey, FAMILY_OBOL_SLOTS, OBOL, OBOLS, OBOL_SHAPES, OBOL_THEMES, OBOL_TIERS, ObolDef, ObolShape, PERSONAL_SLOTS, SHAPE_MULT, SHAPE_NAMES, obolName } from './data';
export { FAMILY_OBOL_SLOTS, OBOL, OBOLS, OBOL_SHAPES, OBOL_THEMES, OBOL_TIERS, PERSONAL_SLOTS, SHAPE_MULT, SHAPE_NAMES, obolName };
export type { ObolDef, ObolShape };
import type { Account, Character } from './state';
import { addItem, countItem, removeItem } from './state';

const famLv = (acc: Pick<Account, 'characters'>) => acc.characters.reduce((n, c) => n + c.level, 0);
export const slotOpen = (acc: Pick<Account, 'characters'>, c: Character, fam: boolean, i: number) =>
  fam ? famLv(acc) >= FAMILY_OBOL_SLOTS[i].need : c.level >= PERSONAL_SLOTS[i].need;

/** 가방의 오볼을 칸에 끼운다(이미 있던 오볼은 가방으로) */
export function placeObol(acc: Account, c: Character, id: string, fam: boolean, i: number): string | null {
  const o = OBOL[id], slots = fam ? FAMILY_OBOL_SLOTS : PERSONAL_SLOTS, board = fam ? (acc.famObols ??= []) : (c.obols ??= []);
  if (!o) return '오볼이 아닙니다';
  if (!slots[i]) return '없는 칸';
  if (!slotOpen(acc, c, fam, i)) return fam ? `가족 레벨 ${slots[i].need}에 열립니다` : `Lv.${slots[i].need}에 열립니다`;
  if (slots[i].shape !== o.shape) return `${SHAPE_NAMES[slots[i].shape]} 칸에는 ${SHAPE_NAMES[slots[i].shape]} 오볼만 끼웁니다`;
  if (countItem(c, id) < 1) return '가방에 없습니다';
  const old = board[i];
  removeItem(c, id, 1);
  if (old && !addItem(c, old, 1)) { addItem(c, id, 1); return '가방이 가득 찼습니다'; }
  while (board.length <= i) board.push(null);
  board[i] = id;
  return null;
}
export function takeObol(acc: Account, c: Character, fam: boolean, i: number): string | null {
  const board = fam ? (acc.famObols ??= []) : (c.obols ??= []), id = board[i];
  if (!id) return '빈 칸입니다';
  if (!addItem(c, id, 1)) return '가방이 가득 찼습니다';
  board[i] = null;
  return null;
}
/** 오볼 보너스: 개인판(이 캐릭터)과 가족판(모두) */
export function obolBonus(c: Character, a: Partial<Pick<Account, 'famObols'>>, add: (k: BonusKey, v: number) => void) {
  for (const id of [...(c.obols ?? []), ...(a.famObols ?? [])]) { const o = id ? OBOL[id] : null; if (o) add(o.theme.eff, o.v); }
}
