// 기도(기술): 원작의 흐름을 따른다. 첫 토템은 1월드 안개 늪에 있고, 토템은 월드마다 흩어져 있다.
//  · 기도력: 캐릭터마다 시간이 지나면 차오른다(한도까지). 기도 레벨이 오르면 더 빨리, 더 많이 찬다.
//  · 기도 토템: 1~4월드 맵 일곱 곳. 그 맵에서 기도력을 써서 토템 디펜스를 하면, 잡은 혼령만큼 그 토템의 영혼과 기도 경험치.
//    기도 레벨이 높을수록 토템이 스스로 혼령을 쏜다(원작의 방어탑 역할).
//  · 기도문: 영혼으로 올리는 계정 공용 강화. 캐릭터마다 몇 개를 골라 켜면 효과와 함께 저주(불이익)도 붙는다.
import { BonusKey, ITEMS, classSkillMult } from './data';
import type { Account, Character } from './state';
import { gainSkillXp } from './state';

export type SoulKind = 'moss' | 'sand' | 'snow' | 'water' | 'ice' | 'star' | 'void';
export const SOUL_NAMES: Record<SoulKind, string> = { moss: '이끼 영혼', sand: '모래 영혼', snow: '눈 영혼', water: '물 영혼', ice: '얼음 영혼', star: '별 영혼', void: '공허 영혼' };
export interface WTotemDef { id: string; name: string; map: string; x: number; lv: number; cost: number; soul: SoulKind; speed: number; maxKills: number; art: string; xp: number }
/** 기도 토템: 원작처럼 여러 월드에 흩어져 있다(1월드 안개 늪이 첫 토템) */
export const WTOTEMS: WTotemDef[] = [
  { id: 'wt_moss', name: '이끼 토템', map: 'swamp', x: 300, lv: 1, cost: 10, soul: 'moss', speed: 0.8, maxKills: 112, art: 'mob_glowbat', xp: 3 },
  { id: 'wt_sand', name: '모래 토템', map: 'tomb', x: 400, lv: 8, cost: 15, soul: 'sand', speed: 0.9, maxKills: 128, art: 'mob_scorpip', xp: 4 },
  { id: 'wt_snow', name: '눈꽃 토템', map: 'snowfield', x: 380, lv: 15, cost: 20, soul: 'snow', speed: 1, maxKills: 144, art: 'mob_snowpuff', xp: 6 },
  { id: 'wt_water', name: '물결 토템', map: 'frostlake', x: 240, lv: 25, cost: 30, soul: 'water', speed: 1.2, maxKills: 176, art: 'mob_penglet', xp: 14 },
  { id: 'wt_ice', name: '고드름 토템', map: 'glacier', x: 240, lv: 35, cost: 45, soul: 'ice', speed: 1.4, maxKills: 208, art: 'mob_icicle', xp: 28 },
  { id: 'wt_star', name: '별빛 토템', map: 'frostpeak', x: 520, lv: 45, cost: 60, soul: 'star', speed: 1.6, maxKills: 240, art: 'mob_aurowisp', xp: 50 },
  { id: 'wt_void', name: '공허 토템', map: 'asteroid', x: 400, lv: 60, cost: 80, soul: 'void', speed: 1.8, maxKills: 272, art: 'mob_voidimp', xp: 80 },
];
export const WTOTEM: Record<string, WTotemDef> = Object.fromEntries(WTOTEMS.map((t) => [t.id, t]));

/** 기도문: 효과는 레벨에 따라 오르고, 저주는 켜 두는 동안 고정 */
export interface PrayerDef { id: string; name: string; soul: SoulKind; lv: number; eff: BonusKey; base: number; per: number; unit: string; curse: BonusKey; cv: number; cunit: string }
export const PRAYERS: PrayerDef[] = [
  { id: 'p_valor', name: '용맹의 기도', soul: 'moss', lv: 1, eff: 'dmg', base: 6, per: 2, unit: '%', curse: 'hpPct', cv: -10, cunit: '%' },
  { id: 'p_harvest', name: '풍작의 기도', soul: 'moss', lv: 5, eff: 'mining', base: 8, per: 3, unit: '%', curse: 'dmg', cv: -10, cunit: '%' },
  { id: 'p_wisdom', name: '깨달음의 기도', soul: 'sand', lv: 8, eff: 'xp', base: 5, per: 2, unit: '%', curse: 'drop', cv: -8, cunit: '%' },
  { id: 'p_fortune', name: '행운의 기도', soul: 'sand', lv: 12, eff: 'drop', base: 5, per: 1.5, unit: '%', curse: 'xp', cv: -10, cunit: '%' },
  { id: 'p_slumber', name: '단잠의 기도', soul: 'snow', lv: 15, eff: 'afk', base: 1, per: 0.4, unit: '%p', curse: 'dmg', cv: -15, cunit: '%' },
  { id: 'p_shell', name: '껍데기의 기도', soul: 'snow', lv: 20, eff: 'def', base: 6, per: 2, unit: '', curse: 'coins', cv: -10, cunit: '%' },
  { id: 'p_greed', name: '탐욕의 기도', soul: 'water', lv: 25, eff: 'coins', base: 10, per: 3, unit: '%', curse: 'hpPct', cv: -15, cunit: '%' },
  { id: 'p_tide', name: '밀물의 기도', soul: 'water', lv: 30, eff: 'fishing', base: 10, per: 3, unit: '%', curse: 'drop', cv: -10, cunit: '%' },
  { id: 'p_iron', name: '강철의 기도', soul: 'ice', lv: 35, eff: 'hpPct', base: 8, per: 3, unit: '%', curse: 'afk', cv: -2, cunit: '%p' },
  { id: 'p_aim', name: '겨눔의 기도', soul: 'ice', lv: 40, eff: 'acc', base: 20, per: 6, unit: '', curse: 'xp', cv: -10, cunit: '%' },
  { id: 'p_starlit', name: '별빛의 기도', soul: 'star', lv: 45, eff: 'luk', base: 5, per: 2, unit: '', curse: 'coins', cv: -15, cunit: '%' },
  { id: 'p_cards', name: '수집가의 기도', soul: 'star', lv: 50, eff: 'card', base: 5, per: 1.5, unit: '%', curse: 'dmg', cv: -12, cunit: '%' },
  { id: 'p_void', name: '공허의 기도', soul: 'void', lv: 60, eff: 'dmg', base: 12, per: 3, unit: '%', curse: 'def', cv: -20, cunit: '' },
  { id: 'p_echo', name: '메아리의 기도', soul: 'void', lv: 65, eff: 'xp', base: 10, per: 2.5, unit: '%', curse: 'afk', cv: -3, cunit: '%p' },
  { id: 'p_might', name: '장사의 기도', soul: 'moss', lv: 10, eff: 'str', base: 5, per: 2, unit: '', curse: 'agi', cv: -10, cunit: '' },
  { id: 'p_wind', name: '바람의 기도', soul: 'sand', lv: 18, eff: 'agi', base: 5, per: 2, unit: '', curse: 'str', cv: -10, cunit: '' },
  { id: 'p_mind', name: '명상의 기도', soul: 'snow', lv: 22, eff: 'wis', base: 5, per: 2, unit: '', curse: 'luk', cv: -10, cunit: '' },
  { id: 'p_hunt', name: '사냥의 기도', soul: 'water', lv: 28, eff: 'catching', base: 10, per: 3, unit: '%', curse: 'fishing', cv: -15, cunit: '%' },
  { id: 'p_forge', name: '대장의 기도', soul: 'ice', lv: 42, eff: 'mining', base: 12, per: 3, unit: '%', curse: 'chopping', cv: -15, cunit: '%' },
  { id: 'p_grove', name: '숲의 기도', soul: 'star', lv: 52, eff: 'chopping', base: 12, per: 3, unit: '%', curse: 'mining', cv: -15, cunit: '%' },
];
export const PRAYER: Record<string, PrayerDef> = Object.fromEntries(PRAYERS.map((p) => [p.id, p]));
/** 기도문 최대 레벨(원작처럼 넉넉히) */
export const PRAYER_MAX = 50;
export const prayerCost = (lv: number) => Math.ceil(15 * Math.pow(1.22, lv));
export const prayerValue = (p: PrayerDef, lv: number) => (lv <= 0 ? 0 : p.base + (lv - 1) * p.per);
/** 켤 수 있는 기도문 수: 기도 Lv.1·20·40·60 */
export const prayerSlots = (lv: number) => Math.min(4, 1 + Math.floor(lv / 20));

export interface WorshipAcc { souls: Record<SoulKind, number>; prayers: Record<string, number>; /** 토템마다 최고 기록(혼령 수) */ best?: Record<string, number> }
export interface WorshipChar { charge: number; t: number; on: string[] }
export const newWorshipAcc = (): WorshipAcc => ({ souls: { moss: 0, sand: 0, snow: 0, water: 0, ice: 0, star: 0, void: 0 }, prayers: {} });
export const newWorshipChar = (): WorshipChar => ({ charge: 0, t: 0, on: [] });

const lvOf = (c: Character) => c.skills.worship?.lv ?? 1;
export const chargeRate = (c: Character) => (12 + lvOf(c) * 0.6) * classSkillMult(c, 'worship'); // 시간당
export const chargeCap = (c: Character) => 60 + lvOf(c) * 3;
/** 지금 기도력(저장값을 바꾸지 않는다: 화면은 이것만 본다). 처음엔 한도까지 찬 채로 시작 */
export function chargeNow(c: Character, now: number): number {
  const w = c.worship;
  if (!w.t) return chargeCap(c);
  return Math.min(chargeCap(c), w.charge + (chargeRate(c) * Math.max(0, now - w.t)) / 3_600_000);
}
/** 토템이 스스로 혼령을 쏘는 간격(초). 0이면 쏘지 않는다 */
/** 기도 탑이 있으면 기도 레벨이 낮아도 쏘고, 더 자주 쏜다 */
export const boltEvery = (c: Character, towers = 0) => (lvOf(c) < 5 && !towers ? 0 : Math.max(0.5, (4 - lvOf(c) * 0.05) * (1 - Math.min(0.5, towers * 0.03))));
/** 잡은 혼령 → 영혼(끝까지 지키면 절반 더, 기도 레벨마다 1%) */
/** 기도 탑(건설)마다 영혼 +4% */
export const runSouls = (c: Character, kills: number, survived: boolean, towers = 0) => Math.floor((kills / 2) * (survived ? 1.5 : 1) * (1 + lvOf(c) * 0.01) * classSkillMult(c, 'worship') * (1 + towers * 0.04));

export function worshipLock(c: Character, id: string): string | null {
  const t = WTOTEM[id];
  if (!t) return '없는 토템';
  if (lvOf(c) < t.lv) return `기도 Lv.${t.lv}`;
  return null;
}
/** 토템 디펜스 한 판 끝: 그 맵에 있어야 하고, 기도력을 쓴다 */
export function finishWorship(acc: Account, c: Character, id: string, kills: number, survived: boolean, now: number): number | string {
  const t = WTOTEM[id];
  const lock = worshipLock(c, id);
  if (lock || !t) return lock ?? '없는 토템';
  if (c.mapId !== t.map) return '그 토템이 있는 맵에서 할 수 있습니다';
  const ch = chargeNow(c, now);
  if (ch < t.cost) return '기도력이 부족합니다';
  c.worship.charge = ch - t.cost; c.worship.t = now;
  const k = Math.min(t.maxKills, Math.max(0, Math.floor(kills)));
  const souls = runSouls(c, k, survived, acc.build?.levels.b_prayertower ?? 0);
  acc.worship.souls[t.soul] += souls;
  acc.worship.best ??= {}; acc.worship.best[id] = Math.max(acc.worship.best[id] ?? 0, k);
  gainSkillXp(c, 'worship', k * t.xp * (survived ? 1.5 : 1));
  return souls;
}
export function upPrayer(acc: Account, c: Character, id: string): string | null {
  const p = PRAYER[id];
  if (!p) return '없는 기도문';
  if (lvOf(c) < p.lv) return `기도 Lv.${p.lv}에 배울 수 있습니다`;
  const lv = acc.worship.prayers[id] ?? 0;
  if (lv >= PRAYER_MAX) return '최대 레벨입니다';
  const cost = prayerCost(lv);
  if (acc.worship.souls[p.soul] < cost) return `${SOUL_NAMES[p.soul]}이 부족합니다`;
  acc.worship.souls[p.soul] -= cost;
  acc.worship.prayers[id] = lv + 1;
  return null;
}
export function togglePrayer(acc: Account, c: Character, id: string): string | null {
  const p = PRAYER[id];
  if (!p) return '없는 기도문';
  const on = c.worship.on, i = on.indexOf(id);
  if (i >= 0) { on.splice(i, 1); return null; }
  if (!(acc.worship.prayers[id] ?? 0)) return '먼저 영혼으로 배우세요';
  if (on.length >= prayerSlots(lvOf(c))) return `기도문은 ${prayerSlots(lvOf(c))}개까지 켤 수 있습니다`;
  on.push(id);
  return null;
}
/** 이 캐릭터가 켠 기도문의 효과와 저주 */
export function prayerBonus(c: Character, a: WorshipAcc | undefined, add: (k: BonusKey, v: number) => void) {
  if (!a || !c.worship) return;
  for (const id of c.worship.on) {
    const p = PRAYER[id], lv = a.prayers[id] ?? 0;
    if (!p || !lv) continue;
    add(p.eff, prayerValue(p, lv));
    add(p.curse, p.cv);
    // 풍작의 기도는 채집 네 기술 모두
    if (p.id === 'p_harvest') for (const k of ['chopping', 'fishing', 'catching'] as const) add(k, prayerValue(p, lv));
  }
  void ITEMS;
}
