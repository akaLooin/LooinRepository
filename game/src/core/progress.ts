// 계정·캐릭터 성장 장치: 석상, 별 지도·별자리, 업적, 가족 보너스, 카드 세트·프리셋.
// 효과는 모두 BonusKey 로 모아 derive() 에서 한 번에 더한다.
import {
  ACHIEVEMENTS, BonusKey, CARD_PRESET_LV, CARD_SETS, CARD_SLOTS, CardSetDef, FAMILY, FAMILY_SLOTS, ITEMS, MAX_CHARACTERS, SIGNS, SIGN_LV, STAMPS, STATUES,
  baseClass, cardTier, statueNeed,
} from './data';
import type { Account, Character } from './state';
import { countItem, removeItem } from './state';

export type Bonus = Record<BonusKey, number>;
export const noBonus = (): Bonus => ({ str: 0, agi: 0, wis: 0, luk: 0, def: 0, hp: 0, hpPct: 0, drop: 0, dmg: 0, xp: 0, afk: 0, coins: 0, mining: 0, chopping: 0, acc: 0 });

// ───────── 석상 ─────────
/** 바친 조각 수 → 레벨과 다음 레벨까지 */
export function statueLevel(xp: number): { lv: number; into: number; need: number } {
  let lv = 0, left = xp;
  while (left >= statueNeed(lv)) { left -= statueNeed(lv); lv++; }
  return { lv, into: left, need: statueNeed(lv) };
}
/** 가방에 있는 그 석상의 조각을 모두 바친다 */
export function offerStatue(acc: Account, c: Character, id: string): number | string {
  if (!acc.statuesOpen) return '조각 도구가 필요합니다';
  const s = STATUES.find((x) => x.id === id);
  if (!s) return '없는 석상';
  const n = countItem(c, s.item);
  if (n <= 0) return `${ITEMS[s.item].name}이(가) 없습니다`;
  removeItem(c, s.item, n);
  c.statues[id] = (c.statues[id] ?? 0) + n;
  return n;
}
/** 조각 도구 사용 */
export function useSculptTools(acc: Account, c: Character): string | null {
  if (acc.statuesOpen) return '이미 석상 받침을 열었습니다';
  if (countItem(c, 'sculpt_tools') < 1) return '조각 도구가 없습니다';
  removeItem(c, 'sculpt_tools', 1);
  acc.statuesOpen = true;
  return null;
}

// ───────── 별 지도·별자리 ─────────
export interface StarDef { id: string; map: string; desc: string; check: (acc: Account, c: Character) => boolean }
export const STARS: StarDef[] = [
  { id: 'meadow1', map: 'meadow', desc: 'Lv.5 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 5 },
  { id: 'meadow2', map: 'meadow', desc: 'Lv.8 이상 캐릭터가 2명', check: (a) => a.characters.filter((x) => x.level >= 8).length >= 2 },
  { id: 'hills1', map: 'hills', desc: '채광 Lv.8 이상으로 서 있기', check: (_, c) => c.skills.mining.lv >= 8 },
  { id: 'hills2', map: 'hills', desc: '장비 칸 4곳 이상 채우기', check: (_, c) => Object.values(c.equipment).filter(Boolean).length >= 4 },
  { id: 'forest1', map: 'forest', desc: 'Lv.15 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 15 },
  { id: 'forest2', map: 'forest', desc: '카드 합계 5장 이상', check: (a) => Object.values(a.cards).reduce((n, v) => n + v, 0) >= 5 },
  { id: 'town1', map: 'town', desc: '우표 5종 수집', check: (a) => STAMPS.filter((s) => (a.stamps[s.id] ?? 0) > 0).length >= 5 },
  { id: 'lair1', map: 'lair', desc: '이끼왕 3번 처치', check: (a) => (a.bosses.mossking ?? 0) >= 3 },
];
export function claimStar(acc: Account, c: Character, id: string): string | null {
  const s = STARS.find((x) => x.id === id);
  if (!s) return '없는 별 지도';
  if (acc.stars[id]) return '이미 찾은 별입니다';
  if (c.level < SIGN_LV) return `Lv.${SIGN_LV}부터 별을 볼 수 있습니다`;
  if (c.mapId !== s.map) return '그 맵에서 올려다봐야 보입니다';
  if (!s.check(acc, c)) return '아직 조건을 채우지 못했습니다';
  acc.stars[id] = true;
  acc.starPoints++;
  return null;
}
export function unlockSign(acc: Account, id: string): string | null {
  const s = SIGNS.find((x) => x.id === id);
  if (!s) return '없는 별자리';
  if (acc.signs.includes(id)) return '이미 연 별자리';
  if (acc.starPoints < s.cost) return '별 포인트가 부족합니다';
  acc.starPoints -= s.cost;
  acc.signs.push(id);
  return null;
}
export function alignSign(acc: Account, c: Character, id: string | null): string | null {
  if (id && !acc.signs.includes(id)) return '아직 열지 않은 별자리';
  if (c.level < SIGN_LV) return `Lv.${SIGN_LV}부터 정렬할 수 있습니다`;
  c.sign = id;
  return null;
}

// ───────── 업적 ─────────
const ACH_CHECK: Record<string, (a: Account) => boolean> = {
  lv10: (a) => a.characters.some((c) => c.level >= 10),
  lv25: (a) => a.characters.some((c) => c.level >= 25),
  boss1: (a) => (a.bosses.mossking ?? 0) >= 1,
  boss10: (a) => (a.bosses.mossking ?? 0) >= 10,
  party4: (a) => a.characters.length >= 4,
  cards10: (a) => Object.values(a.cards).reduce((n, v) => n + v, 0) >= 10,
  stamps5: (a) => STAMPS.filter((s) => (a.stamps[s.id] ?? 0) > 0).length >= 5,
  forge: (a) => a.forge.owned,
  rich: (a) => a.coins >= 10_000,
  smith10: (a) => a.characters.some((c) => c.skills.smithing.lv >= 10),
  statue10: (a) => a.characters.some((c) => Object.values(c.statues ?? {}).some((xp) => statueLevel(xp).lv >= 10)),
  tasks10: (a) => Object.values(a.tasks).reduce((n, v) => n + v, 0) >= 10,
  stars5: (a) => Object.keys(a.stars).length >= 5,
};
export const achieveReady = (acc: Account, id: string) => !acc.achievements[id] && !!ACH_CHECK[id]?.(acc);
export function claimAchievement(acc: Account, id: string): string | null {
  const d = ACHIEVEMENTS.find((x) => x.id === id);
  if (!d) return '없는 업적';
  if (acc.achievements[id]) return '이미 받았습니다';
  if (!ACH_CHECK[id](acc)) return '아직 조건을 채우지 못했습니다';
  acc.achievements[id] = true;
  if (d.merit) acc.merit += d.merit;
  return null;
}

// ───────── 가족 ─────────
/** 직업별 최고 레벨 */
export function familyBest(chars: Character[]): Record<keyof typeof FAMILY, number> {
  const out = { beginner: 0, warrior: 0, archer: 0, mage: 0 };
  for (const c of chars) out[baseClass(c.cls)] = Math.max(out[baseClass(c.cls)], c.level);
  return out;
}
export const familyValue = (cls: keyof typeof FAMILY, lv: number) => (lv > 0 ? (FAMILY[cls].a * lv) / (lv + FAMILY[cls].b) : 0);
export const familyLevel = (acc: Pick<Account, 'characters'>) => acc.characters.reduce((n, c) => n + c.level, 0);
/** 지금 만들 수 있는 캐릭터 칸 수 */
export const charSlots = (acc: Pick<Account, 'characters'>) => Math.min(MAX_CHARACTERS, Math.max(acc.characters.length, 2 + FAMILY_SLOTS.filter((n) => familyLevel(acc) >= n).length));

// ───────── 카드 세트·프리셋 ─────────
export const setStars = (acc: Pick<Account, 'cards'>, s: CardSetDef) => s.cards.reduce((n, id) => n + cardTier(acc.cards[id] ?? 0), 0);
export const setTier = (acc: Pick<Account, 'cards'>, s: CardSetDef) => s.tiers.filter((t) => setStars(acc, s) >= t).length;
export function toggleCardSet(c: Character, id: string | null): string | null {
  if (id && !CARD_SETS.some((s) => s.id === id)) return '없는 세트';
  c.cardSet = id;
  return null;
}
/** 프리셋 바꾸기: 지금 장착을 현재 프리셋에 저장하고, 고른 프리셋을 불러온다(없는 카드는 빈칸) */
export function switchCardPreset(acc: Account, c: Character, i: number): string | null {
  if (c.level < CARD_PRESET_LV) return `Lv.${CARD_PRESET_LV}부터 쓸 수 있습니다`;
  if (i < 0 || i >= c.cardPresets.length) return '없는 프리셋';
  c.cardPresets[c.cardPreset] = c.cardSlots.slice();
  c.cardPreset = i;
  c.cardSlots = (c.cardPresets[i] ?? []).slice(0, CARD_SLOTS).map((id) => (id && (acc.cards[id] ?? 0) > 0 ? id : null));
  while (c.cardSlots.length < CARD_SLOTS) c.cardSlots.push(null);
  return null;
}

// ───────── 합계 ─────────
/** 이 캐릭터가 받는 석상·별자리·업적·가족·카드 세트 보너스 합 */
export function progressBonus(c: Character, a: Partial<Pick<Account, 'cards' | 'achievements' | 'characters'>>): Bonus {
  const b = noBonus();
  for (const s of STATUES) b[s.eff] += statueLevel(c.statues?.[s.id] ?? 0).lv * s.per;
  const sign = c.sign ? SIGNS.find((x) => x.id === c.sign) : null;
  if (sign) b[sign.eff] += sign.v;
  for (const d of ACHIEVEMENTS) if (a.achievements?.[d.id] && d.eff) b[d.eff] += d.v!;
  if (a.characters) { const best = familyBest(a.characters); for (const k of Object.keys(FAMILY) as (keyof typeof FAMILY)[]) b[FAMILY[k].eff] += familyValue(k, best[k]); }
  const set = c.cardSet ? CARD_SETS.find((s) => s.id === c.cardSet) : null;
  if (set && a.cards) { const t = setTier({ cards: a.cards }, set); if (t > 0) b[set.eff] += set.v[t - 1]; }
  return b;
}
