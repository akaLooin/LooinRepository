// 계정·캐릭터 성장 장치: 석상, 별 지도·별자리, 업적, 가족 보너스, 카드 세트·프리셋.
// 효과는 모두 BonusKey 로 모아 derive() 에서 한 번에 더한다.
import {
  ACHIEVEMENTS, BonusKey, CARD_PRESET_LV, CARD_SETS, CARD_SLOTS, CardSetDef, FAMILY, FAMILY_MIN, FAMILY_SLOTS, ITEMS, MAX_CHARACTERS, SIGNS, SIGN_LV, signSlots, STAMPS, STATUES,
  MAPS, PETS, RIFT_BONUS, WORLDS, baseClass, classLine, cardTier, statueNeed,
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
import { miniBonus } from './minigames';

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
  // 더 많은 별(맵마다 두세 개)
  { id: 'meadow3', map: 'meadow', desc: '코인 1,000 이상 지니기', check: (a) => a.coins >= 1000 },
  { id: 'hills3', map: 'hills', desc: '대장 Lv.5 이상으로 서 있기', check: (_, c) => c.skills.smithing.lv >= 5 },
  { id: 'forest3', map: 'forest', desc: '벌목 Lv.12 이상으로 서 있기', check: (_, c) => c.skills.chopping.lv >= 12 },
  { id: 'swamp1', map: 'swamp', desc: 'Lv.20 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 20 },
  { id: 'swamp2', map: 'swamp', desc: '석상 3종 Lv.1 이상', check: (a, c) => STATUES.filter((st) => statueLv(a, c, st.id) > 0).length >= 3 },
  { id: 'cave1', map: 'cave', desc: '채광 Lv.15 이상으로 서 있기', check: (_, c) => c.skills.mining.lv >= 15 },
  { id: 'cave2', map: 'cave', desc: '우표 12종 수집', check: (a) => STAMPS.filter((s) => (a.stamps[s.id] ?? 0) > 0).length >= 12 },
  { id: 'ridge1', map: 'ridge', desc: 'Lv.25 이상 캐릭터가 2명', check: (a) => a.characters.filter((x) => x.level >= 25).length >= 2 },
  { id: 'ruins1', map: 'ruins', desc: '카드 합계 20장 이상', check: (a) => Object.values(a.cards).reduce((n, v) => n + v, 0) >= 20 },
  { id: 'grove1', map: 'grove', desc: '코인 50,000 이상 지니기', check: (a) => a.coins >= 50000 },
  { id: 'grove2', map: 'grove', desc: 'Lv.30 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 30 },
  { id: 'dunes2', map: 'dunes', desc: 'Lv.40 이상 캐릭터가 2명', check: (a) => a.characters.filter((x) => x.level >= 40).length >= 2 },
  { id: 'canyon2', map: 'canyon', desc: '채광 Lv.30 이상으로 서 있기', check: (_, c) => c.skills.mining.lv >= 30 },
  { id: 'saltlake1', map: 'saltlake', desc: '낚시 Lv.20 이상으로 서 있기', check: (_, c) => (c.skills.fishing?.lv ?? 1) >= 20 },
  { id: 'starfield1', map: 'starfield', desc: '연금 Lv.15 이상으로 서 있기', check: (_, c) => (c.skills.alchemy?.lv ?? 1) >= 15 },
  { id: 'starfield2', map: 'starfield', desc: '카드 합계 80장 이상', check: (a) => Object.values(a.cards).reduce((n, v) => n + v, 0) >= 80 },
  { id: 'snowfield1', map: 'snowfield', desc: 'Lv.70 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 70 },
  { id: 'frostlake1', map: 'frostlake', desc: '낚시 Lv.35 이상으로 서 있기', check: (_, c) => (c.skills.fishing?.lv ?? 1) >= 35 },
  { id: 'glacier1', map: 'glacier', desc: 'Lv.60 이상 캐릭터가 3명', check: (a) => a.characters.filter((x) => x.level >= 60).length >= 3 },
  { id: 'aurora2', map: 'aurora', desc: '코인 1,000만 이상 지니기', check: (a) => a.coins >= 1e7 },
  { id: 'frostpeak2', map: 'frostpeak', desc: '채광 Lv.50 이상으로 서 있기', check: (_, c) => c.skills.mining.lv >= 50 },
  { id: 'moondust1', map: 'moondust', desc: '번식 Lv.10 이상으로 서 있기', check: (_, c) => (c.skills.breeding?.lv ?? 1) >= 10 },
  { id: 'nebula1', map: 'nebula', desc: 'Lv.110 이상 캐릭터로 서 있기', check: (_, c) => c.level >= 110 },
  { id: 'asteroid1', map: 'asteroid', desc: '카드 합계 200장 이상', check: (a) => Object.values(a.cards).reduce((n, v) => n + v, 0) >= 200 },
  { id: 'rings2', map: 'rings', desc: 'Lv.100 이상 캐릭터가 3명', check: (a) => a.characters.filter((x) => x.level >= 100).length >= 3 },
  { id: 'comet2', map: 'comet', desc: '벌목 Lv.60 이상으로 서 있기', check: (_, c) => c.skills.chopping.lv >= 60 },
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
// ───────── 원작처럼 월드마다 많은 업적(조건과 보상을 표로 만든다) ─────────
{
  type P = (a: Account) => number;
  const add = (id: string, name: string, desc: string, f: P, need: number, reward: { eff?: BonusKey; v?: number; merit?: number; label: string }) => {
    ACHIEVEMENTS.push({ id, name, desc, ...reward }); ACH_PROG[id] = (a) => [f(a), need];
  };
  const R: { eff: BonusKey; v: number; unit: string }[] = [
    { eff: 'dmg', v: 2, unit: '%' }, { eff: 'xp', v: 2, unit: '%' }, { eff: 'drop', v: 2, unit: '%' }, { eff: 'coins', v: 3, unit: '%' }, { eff: 'hpPct', v: 3, unit: '%' },
    { eff: 'mining', v: 4, unit: '%' }, { eff: 'chopping', v: 4, unit: '%' }, { eff: 'card', v: 2, unit: '%' }, { eff: 'luk', v: 5, unit: '' }, { eff: 'afk', v: 0.5, unit: '%p' },
  ];
  const NAME: Record<string, string> = { dmg: '공격력', xp: '경험치', drop: '드롭률', coins: '코인', hpPct: '최대 체력', mining: '채광 효율', chopping: '벌목 효율', card: '카드 드롭률', luk: '행운', afk: '방치 효율' };
  let ri = 0;
  const rw = (merit = 0) => { const r = R[ri++ % R.length]; return merit && ri % 3 === 0 ? { merit, label: `공로 +${merit}` } : { eff: r.eff, v: r.v, label: `${NAME[r.eff]} +${r.v}${r.unit}` }; };
  const sum = (o: Record<string, number> | undefined) => Object.values(o ?? {}).reduce((n, v) => n + v, 0);
  for (const lv of [50, 75, 100, 125, 150, 200]) add(`lv${lv}`, `Lv.${lv}의 벽`, `캐릭터 하나가 Lv.${lv}`, (a) => best(a, (c) => c.level), lv, rw(2));
  for (const [boss, nm] of [['mossking', '이끼왕'], ['sandlord', '사막 거상'], ['frostlord', '눈보라 군주'], ['nebtitan', '성운 거신']] as const)
    for (const n of boss === 'mossking' ? [100] : [1, 10, 100]) add(`boss_${boss}_${n}`, n === 1 ? `${nm} 토벌` : `${nm} ${n}번`, `${nm} ${n}번 처치`, (a) => a.bosses[boss] ?? 0, n, rw(3));
  for (const w of WORLDS) for (const n of [1000, 10000, 100000]) add(`kills_w${w.n}_${n}`, `${w.n}월드 사냥꾼 ${n.toLocaleString()}`, `${w.n}월드 맵에서 계정 처치 ${n.toLocaleString()}`, (a) => w.maps.reduce((s, m) => s + a.characters.reduce((t, c) => t + (c.kills[m] ?? 0), 0), 0), n, rw(2));
  const SK: [string, string][] = [['mining', '채광'], ['chopping', '벌목'], ['smithing', '대장'], ['fishing', '낚시'], ['catching', '곤충 채집'], ['trapping', '덫 사냥'], ['worship', '기도'], ['cooking', '요리'], ['lab', '연구'], ['alchemy', '연금'], ['construction', '건설'], ['breeding', '번식']];
  for (const [k, nm] of SK) for (const lv of [25, 50]) add(`sk_${k}_${lv}`, `${nm} 장인 ${lv}`, `${nm} Lv.${lv}`, (a) => best(a, (c) => c.skills[k as 'mining']?.lv ?? 1), lv, rw(2));
  for (const n of [50, 200, 500]) add(`cards_${n}`, `카드 수집가 ${n}`, `카드 합계 ${n}장`, (a) => sum(a.cards), n, rw());
  for (const n of [3, 8]) add(`cardsets_${n}`, `세트 완성 ${n}`, `카드 세트 ${n}개를 1단계 이상`, (a) => CARD_SETS.filter((s) => setTier(a, s) > 0).length, n, rw());
  for (const n of [15, 30, 50]) add(`stamps_${n}`, `우표 수집가 ${n}`, `우표 ${n}종 수집`, (a) => STAMPS.filter((s) => (a.stamps[s.id] ?? 0) > 0).length, n, rw(2));
  for (const n of [8, 11]) add(`party_${n}`, `대가족 ${n}`, `캐릭터 ${n}명`, (a) => a.characters.length, n, rw(3));
  for (const n of [1e6, 1e8, 1e10]) add(`rich_${n}`, `큰손 ${n >= 1e8 ? `${n / 1e8}억` : `${n / 1e4}만`}`, `코인 ${n.toLocaleString()} 보유`, (a) => a.coins, n, rw());
  for (const w of WORLDS) { const last = w.maps[w.maps.length - 1]; add(`deep_${w.n}`, `${w.n}월드 끝까지`, `${w.n}월드 깊은 지역의 마지막 맵에 닿기`, (a) => (a.characters.some((c) => (c.kills[last] ?? 0) > 0) ? 1 : 0), 1, rw(3)); }
  for (const n of [5, 15]) add(`obols_${n}`, `오볼 ${n}개`, `개인·가족 오볼판에 오볼 ${n}개`, (a) => (a.famObols ?? []).filter(Boolean).length + Math.max(0, ...a.characters.map((c) => (c.obols ?? []).filter(Boolean).length)), n, rw());
  for (const n of [10, 100]) add(`shiny_${n}`, `빛나는 덫 ${n}`, `빛나는 동물 ${n}마리`, (a) => sum(a.shinies), n, rw());
  for (const n of [10, 30, 52]) add(`meals_${n}`, `미식가 ${n}`, `요리 ${n}가지 발견`, (a) => a.cook?.found.length ?? 0, n, rw());
  for (const n of [5, 20]) add(`pets_${n}`, `펫 친구 ${n}`, `번식 펫 ${n}마리`, (a) => a.breed?.pets.length ?? 0, n, rw());
  for (const n of [5, 15]) add(`rift_${n}`, `균열 ${n}`, `별의 균열 웨이브 ${n}`, (a) => a.riftBest ?? 0, n, rw(3));
  for (const n of [25, 100]) add(`arcade_${n}`, `오락실 단골 ${n}`, `오락실 보너스 합계 ${n}`, (a) => sum(a.arcade?.up), n, rw());
  for (const n of [1, 7]) add(`gold_${n}`, `황금 석상 ${n}`, `황금 석상 ${n}개`, (a) => a.goldStatues?.length ?? 0, n, rw(2));
  for (const n of [10, 40]) add(`bubbles_${n}`, `거품 발견 ${n}`, `연금 거품 ${n}개 발견`, (a) => Object.values(a.alch?.found ?? {}).reduce((s, v) => s + v, 0), n, rw());
  for (const n of [3, 10]) add(`builds_${n}`, `건축가 ${n}`, `건물 ${n}종 짓기`, (a) => Object.values(a.build?.levels ?? {}).filter((v) => v > 0).length, n, rw(2));
  for (const n of [5, 20]) add(`post_${n}`, `연속 배달 ${n}`, `한 회사의 연속 배달 ${n}일`, (a) => Math.max(0, ...Object.values(a.postOff?.streak ?? {})), n, rw());
}
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
export function progressBonus(c: Character, a: Partial<Pick<Account, 'cards' | 'achievements' | 'characters' | 'goldStatues' | 'shinies' | 'shrines' | 'famObols' | 'arcade' | 'poppy' | 'riftBest' | 'mini' | 'pets' | 'owl' | 'totem' | 'alch' | 'build' | 'worship' | 'cook' | 'breed' | 'lab'>>): Bonus {
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
  miniBonus(a.mini, (k, v) => { b[k] += v; });
  for (const r of RIFT_BONUS) if ((a.riftBest ?? 0) >= r.waves) b[r.eff] += r.v;
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
