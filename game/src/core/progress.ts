// 계정·캐릭터 성장 장치: 석상, 별 지도·별자리, 업적, 가족 보너스, 카드 세트·프리셋.
// 효과는 모두 BonusKey 로 모아 derive() 에서 한 번에 더한다.
import {
  ACHIEVEMENTS, BonusKey, CARD_PRESET_LV, CARD_SETS, CARD_SLOTS, CardSetDef, FAMILY, FAMILY_MIN, FAMILY_SLOTS, ITEMS, MAX_CHARACTERS, SIGNS, SIGN_LV, signSlots, STAMPS, STATUES,
  MAPS, PETS, baseClass, classLine, cardTier, statueNeed,
} from './data';
import type { Account, Character } from './state';
import { countItem, removeItem } from './state';
import { owlValue, petValue } from './companions';
import { alchBonus } from './alchemy';
import { buildBonus } from './build';
import { cookBonus } from './cooking';
import { breedBonus } from './breeding';
import { labBonus , chipBonus, labMult } from './lab';
import { prayerBonus } from './worship';
import { postBonus } from './post';
import { shinyBonus } from './traps';
import { shrineBonus } from './shrines';
import { obolBonus } from './obols';
import { arcadeBonus, poppyBonus } from './arcade';

export type Bonus = Record<BonusKey, number>;
export const noBonus = (): Bonus => ({ str: 0, agi: 0, wis: 0, luk: 0, def: 0, hp: 0, hpPct: 0, drop: 0, dmg: 0, xp: 0, afk: 0, coins: 0, mining: 0, chopping: 0, fishing: 0, catching: 0, acc: 0, card: 0 });

// ───────── 석상 ─────────
/** 바친 조각 수 → 레벨과 다음 레벨까지 */
export function statueLevel(xp: number): { lv: number; into: number; need: number } {
  let lv = 0, left = xp;
  while (left >= statueNeed(lv)) { left -= statueNeed(lv); lv++; }
  return { lv, into: left, need: statueNeed(lv) };
}
/** 이 캐릭터에게 적용되는 석상 레벨: 황금 석상이면 계정에서 가장 높은 레벨 */
export function statueLv(a: Partial<Pick<Account, 'characters' | 'goldStatues'>>, c: Character, id: string): number {
  const own = statueLevel(c.statues?.[id] ?? 0).lv;
  if (!a.goldStatues?.includes(id) || !a.characters) return own;
  return Math.max(own, ...a.characters.map((x) => statueLevel(x.statues?.[id] ?? 0).lv));
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
  // 2월드
  { id: 'oasis1', map: 'oasis', desc: 'Lv.35 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 35 },
  { id: 'dunes1', map: 'dunes', desc: '낚시 Lv.10 이상으로 서 있기', check: (_, c) => (c.skills.fishing?.lv ?? 1) >= 10 },
  { id: 'canyon1', map: 'canyon', desc: '곤충 채집 Lv.10 이상으로 서 있기', check: (_, c) => (c.skills.catching?.lv ?? 1) >= 10 },
  { id: 'mirage1', map: 'mirage', desc: '카드 합계 40장 이상', check: (a) => Object.values(a.cards).reduce((n, v) => n + v, 0) >= 40 },
  { id: 'tomb1', map: 'tomb', desc: '연금 거품 5개 이상 Lv.1', check: (a) => Object.values(a.alch?.bubbles ?? {}).filter((v) => v > 0).length >= 5 },
  { id: 'sunspire1', map: 'sunspire', desc: '사막 거상 3번 처치', check: (a) => (a.bosses.sandlord ?? 0) >= 3 },
  // 3월드
  { id: 'snowtown1', map: 'snowtown', desc: 'Lv.65 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 65 },
  { id: 'pinewood1', map: 'pinewood', desc: '덫 사냥 Lv.10 이상으로 서 있기', check: (_, c) => (c.skills.trapping?.lv ?? 1) >= 10 },
  { id: 'icecave1', map: 'icecave', desc: '건설 Lv.10 이상', check: (a) => (a.build?.lv ?? 1) >= 10 },
  { id: 'aurora1', map: 'aurora', desc: '기도 Lv.10 이상으로 서 있기', check: (_, c) => (c.skills.worship?.lv ?? 1) >= 10 },
  { id: 'frostpeak1', map: 'frostpeak', desc: '눈보라 군주 3번 처치', check: (a) => (a.bosses.frostlord ?? 0) >= 3 },
  // 4월드
  { id: 'nebtown1', map: 'nebtown', desc: 'Lv.95 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 95 },
  { id: 'crater1', map: 'crater', desc: '요리 Lv.10 이상으로 서 있기', check: (_, c) => (c.skills.cooking?.lv ?? 1) >= 10 },
  { id: 'rings1', map: 'rings', desc: '펫 10마리 이상 기르기', check: (a) => (a.breed?.pets?.length ?? 0) >= 10 },
  { id: 'comet1', map: 'comet', desc: '연구 Lv.10 이상으로 서 있기', check: (_, c) => (c.skills.lab?.lv ?? 1) >= 10 },
  { id: 'voidedge1', map: 'voidedge', desc: '성운 거신 3번 처치', check: (a) => (a.bosses.nebtitan ?? 0) >= 3 },
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
/** 별자리 정렬/해제(칸 수만큼). id가 null이면 모두 해제 */
export function alignSign(acc: Account, c: Character, id: string | null): string | null {
  if (c.level < SIGN_LV) return `Lv.${SIGN_LV}부터 정렬할 수 있습니다`;
  if (!id) { c.aligned = []; return null; }
  const i = c.aligned.indexOf(id);
  if (i >= 0) { c.aligned.splice(i, 1); return null; }
  if (!acc.signs.includes(id)) return '아직 열지 않은 별자리';
  const s = SIGNS.find((x) => x.id === id);
  if (!s || s.w > (c.maxWorld ?? 1)) return '아직 가 보지 않은 월드의 별자리';
  if (c.aligned.length >= signSlots(c)) return `별자리 칸이 가득 찼습니다(${signSlots(c)}칸)`;
  c.aligned.push(id);
  return null;
}

// ───────── 업적 ─────────
/** 업적 진행도: [지금, 목표] */
const best = (a: Account, f: (c: Account['characters'][number]) => number) => Math.max(0, ...a.characters.map(f));
const ACH_PROG: Record<string, (a: Account) => [number, number]> = {
  lv10: (a) => [best(a, (c) => c.level), 10],
  lv25: (a) => [best(a, (c) => c.level), 25],
  boss1: (a) => [a.bosses.mossking ?? 0, 1],
  boss10: (a) => [a.bosses.mossking ?? 0, 10],
  party4: (a) => [a.characters.length, 4],
  cards10: (a) => [Object.values(a.cards).reduce((n, v) => n + v, 0), 10],
  stamps5: (a) => [STAMPS.filter((s) => (a.stamps[s.id] ?? 0) > 0).length, 5],
  forge: (a) => [a.forge.owned ? 1 : 0, 1],
  rich: (a) => [a.coins, 10_000],
  smith10: (a) => [best(a, (c) => c.skills.smithing.lv), 10],
  statue10: (a) => [best(a, (c) => Math.max(0, ...Object.values(c.statues ?? {}).map((xp) => statueLevel(xp).lv))), 10],
  tasks10: (a) => [Object.values(a.tasks).reduce((n, v) => n + v, 0), 10],
  stars5: (a) => [Object.keys(a.stars).length, 5],
};
export const achieveProgress = (acc: Account, id: string): [number, number] => ACH_PROG[id]?.(acc) ?? [0, 1];
const ACH_CHECK: Record<string, (a: Account) => boolean> = Object.fromEntries(Object.entries(ACH_PROG).map(([k, f]) => [k, (a: Account) => { const [h, n] = f(a); return h >= n; }]));
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
  // 원작처럼 지금 직업뿐 아니라 거쳐 온 모든 직업이 가족 보너스를 준다. 그 단계가 열리는 레벨(9·29·69·129)부터 센다
  const out = Object.fromEntries(Object.keys(FAMILY).map((k) => [k, 0])) as Record<keyof typeof FAMILY, number>;
  for (const c of chars) classLine(c.cls).forEach((k, tier) => {
    const lv = c.level - FAMILY_MIN[tier] + 1;
    if (lv > 0) out[k] = Math.max(out[k], lv);
  });
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
export function progressBonus(c: Character, a: Partial<Pick<Account, 'cards' | 'achievements' | 'characters' | 'goldStatues' | 'shinies' | 'shrines' | 'famObols' | 'arcade' | 'poppy' | 'pets' | 'owl' | 'totem' | 'alch' | 'build' | 'worship' | 'cook' | 'breed' | 'lab'>>): Bonus {
  const b = noBonus();
  for (const s of STATUES) b[s.eff] += statueLv(a, c, s.id) * s.per;
  for (const id of new Set([...(c.aligned ?? []), ...(c.birth ? [c.birth] : [])])) { const sg = SIGNS.find((x) => x.id === id); if (sg) b[sg.eff] += sg.v; }
  for (const d of ACHIEVEMENTS) if (a.achievements?.[d.id] && d.eff) b[d.eff] += d.v!;
  if (a.characters) { const best = familyBest(a.characters); for (const k of Object.keys(FAMILY) as (keyof typeof FAMILY)[]) b[FAMILY[k].eff] += familyValue(k, best[k]); }
  // 동료(레벨 × 효과)와 부엉이 보너스
  for (const p of PETS) b[p.eff] += petValue(a, p);
  if (a.owl) { b.dmg += owlValue(a.owl, 'dmg'); b.xp += owlValue(a.owl, 'xp'); b.drop += owlValue(a.owl, 'drop'); b.afk += owlValue(a.owl, 'afk'); }
  // 우체국 택배 상자(캐릭터마다)
  postBonus(c, (k, v) => { b[k] += v; });
  shinyBonus(a, (k, v) => { b[k] += v; });
  { const m = labMult(a, 'shrines'); shrineBonus(c, a, (k, v) => { b[k] += v * m; }); }
  chipBonus(c, a, (k, v) => { b[k] += v; });
  arcadeBonus(a.arcade, (k, v) => { b[k] += v; });
  poppyBonus(a.poppy, (k, v) => { b[k] += v; });
  b.dmg += deathBonus(a);
  obolBonus(c, a, (k, v) => { b[k] += v; });
  // 연금술(거품·약병)
  { const m = labMult(a, 'bubbles'); alchBonus(a.alch, (k, v) => { b[k] += v * m; }, c); }
  buildBonus(a.build, (k, v) => { b[k] += v; });
  cookBonus(a.cook, (k, v) => { b[k] += v; });
  breedBonus(a.breed, (k, v) => { b[k] += v; });
  labBonus(a, (k, v) => { b[k] += v; });
  // 기도문(이 캐릭터가 켠 것: 효과 + 저주)
  prayerBonus(c, a.worship, (k, v) => { b[k] += v; });
  // 토템 축복
  const set = c.cardSet ? CARD_SETS.find((s) => s.id === c.cardSet) : null;
  if (set && a.cards) { const t = setTier({ cards: a.cards }, set); if (t > 0) b[set.eff] += set.v[t - 1]; }
  return b;
}

// ───────── 처치 기록(데스노트)·멀티킬 ─────────
/** 처치 기록 단계: 그 맵의 계정 전체 처치 수가 이만큼이면 한 단계씩 */
export const DEATH_TIERS = [1000, 5000, 20000, 75000, 250000, 1000000];
/** 처치 기록에 오르는 맵(사냥터만, 콜로세움 제외) */
let DEATH_MAPS: string[] | null = null;
export const deathMaps = () => (DEATH_MAPS ??= Object.values(MAPS).filter((m) => m.spawns.length && !m.arena).map((m) => m.id));
export const deathKills = (a: Pick<Account, 'characters'>, map: string) => a.characters.reduce((n, c) => n + (c.kills[map] ?? 0), 0);
export const deathRank = (n: number) => DEATH_TIERS.filter((t) => n >= t).length;
/** 처치 기록 보너스: 모든 맵의 단계 합마다 공격력 +0.5% */
export function deathBonus(a: Partial<Pick<Account, 'characters'>>): number {
  if (!a.characters) return 0;
  const acc = a as Pick<Account, 'characters'>;
  return deathMaps().reduce((s, m) => s + deathRank(deathKills(acc, m)), 0) * 0.5;
}
/** 멀티킬(3월드에 간 계정부터): 한 번 잡을 때 그 맵 처치 수가 (1 + 처치 기록 단계)만큼 오른다 */
export function multiKill(a: Pick<Account, 'characters'>, map: string): number {
  if (!a.characters.some((c) => (c.maxWorld ?? 1) >= 3)) return 1;
  return 1 + deathRank(deathKills(a, map));
}
