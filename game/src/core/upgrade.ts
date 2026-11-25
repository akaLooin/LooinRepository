// 장비 강화석: 장착한 장비의 강화 칸에 붙인다. 성공하면 능력치가 더해지고, 실패해도 칸은 쓰인다.
// 성공 여부는 계정 씨앗값 + 강화 시도 횟수로 정한다 → 기기와 서버가 같은 결과를 낸다
import { EquipSlot, ItemStats, SLOT_NAMES, STONE_BY_ID, upSlotsOf } from './data';
import { hash } from './companions';
import type { Account, Character } from './state';
import { countItem, derive, removeItem } from './state';

export const upRoll = (acc: Pick<Account, 'petSeed' | 'upTries'>) => hash((acc.petSeed ^ (acc.upTries * 48271 + 0x5bd1e995)) >>> 0) / 4294967296;
/** 남은 강화 칸 */
export const upLeft = (c: Character, slot: EquipSlot) => {
  const id = c.equipment[slot];
  return id ? upSlotsOf(id) - (c.equipUp[slot]?.n ?? 0) : 0;
};
/** 강화석 붙이기. 성공 여부 또는 실패 이유 */
export function applyStone(acc: Account, c: Character, stone: string, slot: EquipSlot): { ok: boolean } | string {
  const st = STONE_BY_ID[stone];
  if (!st) return '강화석이 아닙니다';
  const id = c.equipment[slot];
  if (!id) return '장착한 장비가 없습니다';
  if (!st.slots.includes(slot)) return `${SLOT_NAMES[slot]}에는 쓸 수 없는 강화석입니다`;
  if (upLeft(c, slot) <= 0) return '강화 칸이 남지 않았습니다';
  if (countItem(c, stone) < 1) return '강화석이 없습니다';
  removeItem(c, stone, 1);
  const ok = upRoll(acc) < st.chance;
  acc.upTries++;
  const up = c.equipUp[slot] ?? { n: 0, s: {} };
  up.n++;
  if (ok) for (const k in st.stats) { const key = k as keyof ItemStats; up.s[key] = (up.s[key] ?? 0) + st.stats[key]!; }
  c.equipUp[slot] = up;
  c.hp = Math.min(c.hp, derive(c).maxHp);
  return { ok };
}
