// 연금술(2월드, 계정 공용): 오아시스 마을의 연금 솥.
//  · 연금 액체: 접속하지 않아도 시간에 따라 쌓인다(한도까지). 처음 솥을 찾은 순간부터.
//  · 거품: 솥 4개에 거품이 4개씩. 재료 + 액체로 레벨을 올리면 효과가 점점 줄어드는 곡선으로 오른다.
//  · 약병: 물고기·곤충·사막 자원을 부어 단계를 올린다(단계마다 고정 효과).
import { BonusKey, ITEMS } from './data';
import type { Account, Character } from './state';
import { haveMat, spendMat } from './state';

export type CauldronId = 'power' | 'quick' | 'wise' | 'luck';
export interface BubbleDef { id: string; name: string; eff: BonusKey; max: number; k: number; item: string; base: number; unit: string }
export interface CauldronDef { id: CauldronId; name: string; color: string; bubbles: BubbleDef[] }
const B = (id: string, name: string, eff: BonusKey, max: number, item: string, base = 10, unit = '%'): BubbleDef => ({ id, name, eff, max, k: 40, item, base, unit });
export const CAULDRONS: CauldronDef[] = [
  { id: 'power', name: '힘의 솥', color: '#e2574a', bubbles: [
    B('b_dmg', '불꽃 거품', 'dmg', 30, 'scorp_tail'), B('b_hp', '든든 거품', 'hpPct', 30, 'shell'),
    B('b_str', '근육 거품', 'str', 40, 'ore', 15, ''), B('b_mine', '광부 거품', 'mining', 40, 'ore_blue')] },
  { id: 'quick', name: '날램의 솥', color: '#5fb859', bubbles: [
    B('b_agi', '바람 거품', 'agi', 40, 'feather', 10, ''), B('b_chop', '나뭇결 거품', 'chopping', 40, 'log', 20),
    B('b_fish', '물결 거품', 'fishing', 40, 'fish_minnow'), B('b_drop', '반짝 거품', 'drop', 25, 'glowdust')] },
  { id: 'wise', name: '슬기의 솥', color: '#8a6fd1', bubbles: [
    B('b_wis', '생각 거품', 'wis', 40, 'sporecap', 10, ''), B('b_xp', '배움 거품', 'xp', 25, 'leaf', 15),
    B('b_catch', '날개 거품', 'catching', 40, 'bug_ant'), B('b_afk', '꿈결 거품', 'afk', 8, 'fish_salt', 8, '%p')] },
  { id: 'luck', name: '행운의 솥', color: '#f6c945', bubbles: [
    B('b_luk', '네잎 거품', 'luk', 40, 'moss', 20, ''), B('b_coins', '동전 거품', 'coins', 30, 'cactus_spine'),
    B('b_def', '껍질 거품', 'def', 30, 'runestone', 10, ''), B('b_acc', '과녁 거품', 'acc', 40, 'heat_feather', 10, '')] },
];
export const BUBBLES: Record<string, BubbleDef> = Object.fromEntries(CAULDRONS.flatMap((c) => c.bubbles.map((b) => [b.id, b])));
export const BUBBLE_MAX_LV = 100;

export interface VialDef { id: string; name: string; item: string; eff: BonusKey; per: number; unit: string }
export const VIALS: VialDef[] = [
  { id: 'v_minnow', name: '송사리 약병', item: 'fish_minnow', eff: 'hpPct', per: 2, unit: '%' },
  { id: 'v_salt', name: '가자미 약병', item: 'fish_salt', eff: 'def', per: 2, unit: '' },
  { id: 'v_star', name: '메기 약병', item: 'fish_star', eff: 'xp', per: 2, unit: '%' },
  { id: 'v_ant', name: '개미 약병', item: 'bug_ant', eff: 'drop', per: 1.5, unit: '%' },
  { id: 'v_firefly', name: '반딧불 약병', item: 'bug_firefly', eff: 'dmg', per: 2, unit: '%' },
  { id: 'v_beetle', name: '풍뎅이 약병', item: 'bug_beetle', eff: 'coins', per: 3, unit: '%' },
  { id: 'v_palm', name: '야자 약병', item: 'palmlog', eff: 'chopping', per: 3, unit: '%' },
  { id: 'v_amber', name: '호박 약병', item: 'ore_amber', eff: 'mining', per: 3, unit: '%' },
];
export const VIAL_BY_ID: Record<string, VialDef> = Object.fromEntries(VIALS.map((v) => [v.id, v]));
/** 약병 단계별로 붓는 개수(단계 n → n+1) */
export const VIAL_COST = [10, 25, 60, 150, 350, 800, 1800, 4000];
export const VIAL_MAX = VIAL_COST.length;

/** 액체: 시간당 생산·한도와 그 업그레이드(코인) */
export type LiquidUp = 'rate' | 'cap';
export const LIQUID = {
  rateBase: 20, ratePer: 6, capBase: 200, capPer: 100, max: 15,
  cost: { rate: 2000, cap: 1500 } as Record<LiquidUp, number>, grow: 1.6,
};

export interface Alch { liquid: number; t: number; bubbles: Record<string, number>; vials: Record<string, number>; up: Record<LiquidUp, number> }
export const newAlch = (): Alch => ({ liquid: 0, t: 0, bubbles: {}, vials: {}, up: { rate: 0, cap: 0 } });

export const liquidRate = (a: Alch) => LIQUID.rateBase + a.up.rate * LIQUID.ratePer;
export const liquidCap = (a: Alch) => LIQUID.capBase + a.up.cap * LIQUID.capPer;
/** now 까지 쌓인 액체를 더한다(처음 찾은 순간부터, 한도까지) */
export function alchSettle(acc: Pick<Account, 'alch'>, now: number) {
  const a = acc.alch;
  if (a.t > 0 && now > a.t) a.liquid = Math.min(liquidCap(a), a.liquid + (liquidRate(a) * (now - a.t)) / 3_600_000);
  a.t = Math.max(a.t, now);
}

export const bubbleLv = (a: Alch | undefined, id: string) => a?.bubbles[id] ?? 0;
/** 거품 효과: 레벨이 오를수록 최대치에 다가간다 */
export const bubbleValue = (b: BubbleDef, lv: number) => (lv <= 0 ? 0 : (b.max * lv) / (lv + b.k));
export const bubbleCost = (b: BubbleDef, lv: number) => ({ item: b.item, n: Math.ceil(b.base * Math.pow(1.17, lv)), liquid: Math.ceil(4 + lv * 2.5) });
export const vialValue = (v: VialDef, lv: number) => lv * v.per;

export function upBubble(acc: Account, c: Character, id: string, now: number): string | null {
  const b = BUBBLES[id];
  if (!b) return '없는 거품';
  alchSettle(acc, now);
  const a = acc.alch, lv = bubbleLv(a, id);
  if (lv >= BUBBLE_MAX_LV) return '최대 레벨입니다';
  const cost = bubbleCost(b, lv);
  if (a.liquid < cost.liquid) return '연금 액체가 부족합니다';
  if (haveMat(acc, c, cost.item) < cost.n) return `${ITEMS[cost.item].name}이(가) 부족합니다`;
  spendMat(acc, c, cost.item, cost.n);
  a.liquid -= cost.liquid;
  a.bubbles[id] = lv + 1;
  return null;
}
export function upVial(acc: Account, c: Character, id: string): string | null {
  const v = VIAL_BY_ID[id];
  if (!v) return '없는 약병';
  const lv = acc.alch.vials[id] ?? 0;
  if (lv >= VIAL_MAX) return '최대 단계입니다';
  const n = VIAL_COST[lv];
  if (haveMat(acc, c, v.item) < n) return `${ITEMS[v.item].name}이(가) 부족합니다`;
  spendMat(acc, c, v.item, n);
  acc.alch.vials[id] = lv + 1;
  return null;
}
export const liquidUpCost = (a: Alch, k: LiquidUp) => Math.round(LIQUID.cost[k] * Math.pow(LIQUID.grow, a.up[k]));
export function upLiquid(acc: Account, k: LiquidUp, now: number): string | null {
  if (!(k in LIQUID.cost)) return '없는 항목';
  alchSettle(acc, now);
  const a = acc.alch;
  if (a.up[k] >= LIQUID.max) return '최대 단계입니다';
  const cost = liquidUpCost(a, k);
  if (acc.coins < cost) return '코인이 부족합니다';
  acc.coins -= cost; a.up[k]++;
  return null;
}
/** 연금술이 주는 보너스(계정 공용) */
export function alchBonus(a: Alch | undefined, add: (k: BonusKey, v: number) => void) {
  if (!a) return;
  for (const b of Object.values(BUBBLES)) add(b.eff, bubbleValue(b, bubbleLv(a, b.id)));
  for (const v of VIALS) add(v.eff, vialValue(v, a.vials[v.id] ?? 0));
}
