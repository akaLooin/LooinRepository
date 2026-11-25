// 연금술(2월드, 계정 공용): 오아시스 마을의 연금 솥. 원작의 흐름을 따른다.
//  · 캐릭터 배치: 캐릭터를 솥이나 액체에 맡기면(어디에 있든) 그 캐릭터의 연금 레벨만큼 일하고 연금 경험치를 얻는다.
//  · 솥: 맡긴 캐릭터가 끓일수록 새 거품을 발견한다(솥마다 30개). 거품은 재료 + 그 거품이 쓰는 액체로 레벨을 올린다.
//  · 큰 거품: 몇몇 거품은 크다. 캐릭터마다 장착한 큰 거품만 효과가 있고, 대신 효과가 크다.
//  · 액체 4종: 물방울(2월드) · 질소 거품(3월드) · 심해수(3월드) · 수은(4월드). 시간에 따라 쌓이고, 맡긴 캐릭터가 많을수록 빨리 찬다.
//  · 약병: 처음엔 주사위를 굴려 발견해야 한다(실패하면 재료만 쓴다). 발견한 뒤엔 재료를 부어 단계를 올린다.
//  · 시길: 캐릭터를 시길에 맡기면 그 시길에 기운이 모이고, 기운이 정해진 양에 닿으면 시길 단계가 오른다(단계마다 보너스).
import { BonusKey, ITEMS, classSkillMult } from './data';
import type { Account, Character } from './state';
import { gainSkillXp, haveMat, spendMat } from './state';
import { hash } from './companions';

export type CauldronId = 'power' | 'quick' | 'wise' | 'luck';
export type LiquidId = 'water' | 'nitro' | 'trench' | 'mercury';
export interface BubbleDef { id: string; name: string; eff: BonusKey; max: number; k: number; item: string; base: number; unit: string; liquid: LiquidId; big?: boolean }
export interface CauldronDef { id: CauldronId; name: string; color: string; bubbles: BubbleDef[] }
export const BUBBLES_PER = 30;
/** 거품 순서에 따라 쓰는 액체(앞쪽은 물방울, 뒤로 갈수록 귀한 액체) */
const liquidOf = (i: number): LiquidId => (i < 8 ? 'water' : i < 16 ? 'nitro' : i < 24 ? 'trench' : 'mercury');
const B = (id: string, name: string, eff: BonusKey, max: number, item: string, base = 10, unit = '%', i = 0): BubbleDef => ({ id, name, eff, max, k: 40, item, base, unit, liquid: liquidOf(i) });
const UNIT: Record<string, string> = { str: '', agi: '', wis: '', luk: '', def: '', acc: '', hp: '', afk: '%p' };
const MAXV: Record<string, number> = { dmg: 30, hpPct: 30, str: 40, agi: 40, wis: 40, luk: 40, mining: 40, chopping: 40, fishing: 40, catching: 40, drop: 25, xp: 25, coins: 30, def: 30, acc: 40, afk: 8, card: 25, hp: 400 };
const WORD: Record<string, string> = { dmg: '불꽃', hpPct: '든든', str: '근육', agi: '바람', wis: '생각', luk: '네잎', mining: '광부', chopping: '나뭇결', fishing: '물결', catching: '날개', drop: '반짝', xp: '배움', coins: '동전', def: '껍질', acc: '과녁', afk: '꿈결', card: '카드', hp: '심장' };
const ADJ: Record<CauldronId, string[]> = {
  power: ['붉은', '뜨거운', '거친', '단단한', '용암', '강철', '천둥', '거인의'],
  quick: ['초록', '날쌘', '가벼운', '산들', '잎사귀', '번개', '여울', '사냥꾼의'],
  wise: ['보라', '깊은', '고요한', '별빛', '안개', '꿈꾸는', '오래된', '현자의'],
  luck: ['노란', '반짝이는', '동그란', '황금', '무지개', '행운의', '보물', '도박사의'],
};
const THEME: Record<CauldronId, BonusKey[]> = {
  power: ['dmg', 'hpPct', 'str', 'mining', 'def', 'hp', 'acc', 'card'],
  quick: ['agi', 'chopping', 'fishing', 'drop', 'catching', 'coins', 'acc', 'afk'],
  wise: ['wis', 'xp', 'catching', 'afk', 'card', 'fishing', 'drop', 'hpPct'],
  luck: ['luk', 'coins', 'def', 'acc', 'drop', 'card', 'xp', 'mining'],
};
const MATS = ['ore', 'log', 'moss', 'leaf', 'shell', 'glowdust', 'feather', 'runestone', 'sporecap', 'ore_blue', 'fish_minnow', 'bug_ant', 'cactus_spine', 'scorp_tail', 'heat_feather', 'salt_crystal',
  'fish_salt', 'bug_firefly', 'palmlog', 'ore_amber', 'snow_tuft', 'pine_cone', 'pinelog', 'ore_frost', 'icicle_shard', 'yeti_fur', 'star_sand', 'starlog', 'neb_jelly', 'ore_nova'];
const FIRST: Record<CauldronId, BubbleDef[]> = {
  power: [B('b_dmg', '불꽃 거품', 'dmg', 30, 'scorp_tail'), B('b_hp', '든든 거품', 'hpPct', 30, 'shell'), B('b_str', '근육 거품', 'str', 40, 'ore', 15, ''), B('b_mine', '광부 거품', 'mining', 40, 'ore_blue')],
  quick: [B('b_agi', '바람 거품', 'agi', 40, 'feather', 10, ''), B('b_chop', '나뭇결 거품', 'chopping', 40, 'log', 20), B('b_fish', '물결 거품', 'fishing', 40, 'fish_minnow'), B('b_drop', '반짝 거품', 'drop', 25, 'glowdust')],
  wise: [B('b_wis', '생각 거품', 'wis', 40, 'sporecap', 10, ''), B('b_xp', '배움 거품', 'xp', 25, 'leaf', 15), B('b_catch', '날개 거품', 'catching', 40, 'bug_ant'), B('b_afk', '꿈결 거품', 'afk', 8, 'fish_salt', 8, '%p')],
  luck: [B('b_luk', '네잎 거품', 'luk', 40, 'moss', 20, ''), B('b_coins', '동전 거품', 'coins', 30, 'cactus_spine'), B('b_def', '껍질 거품', 'def', 30, 'runestone', 10, ''), B('b_acc', '과녁 거품', 'acc', 40, 'heat_feather', 10, '')],
};
const makeCauldron = (id: CauldronId, name: string, color: string): CauldronDef => {
  const bubbles = [...FIRST[id]];
  for (let i = bubbles.length; i < BUBBLES_PER; i++) {
    const eff = THEME[id][i % THEME[id].length], big = i % 6 === 5, adj = ADJ[id][Math.floor(i / THEME[id].length) % ADJ[id].length];
    const b = B(`b_${id}_${i}`, `${adj} ${WORD[eff]} ${big ? '큰 ' : ''}거품`, eff, Math.round((MAXV[eff] ?? 30) * (1 + i / 30) * (big ? 3 : 1)), MATS[(i + id.length * 3) % MATS.length], 10 + i, UNIT[eff] ?? '%', i);
    if (big) b.big = true;
    bubbles.push(b);
  }
  return { id, name, color, bubbles };
};
export const CAULDRONS: CauldronDef[] = [
  makeCauldron('power', '힘의 솥', '#e2574a'), makeCauldron('quick', '날램의 솥', '#5fb859'),
  makeCauldron('wise', '슬기의 솥', '#8a6fd1'), makeCauldron('luck', '행운의 솥', '#f6c945'),
];
export const BUBBLES: Record<string, BubbleDef> = Object.fromEntries(CAULDRONS.flatMap((c) => c.bubbles.map((b) => [b.id, b])));
export const BUBBLE_MAX_LV = 100;

export interface LiquidDef { id: LiquidId; name: string; w: number; rate: number; cap: number }
export const LIQUIDS: LiquidDef[] = [
  { id: 'water', name: '물방울', w: 2, rate: 20, cap: 200 },
  { id: 'nitro', name: '질소 거품', w: 3, rate: 12, cap: 150 },
  { id: 'trench', name: '심해수', w: 3, rate: 8, cap: 120 },
  { id: 'mercury', name: '수은', w: 4, rate: 5, cap: 100 },
];
export const LIQUID_BY: Record<LiquidId, LiquidDef> = Object.fromEntries(LIQUIDS.map((l) => [l.id, l])) as Record<LiquidId, LiquidDef>;

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
  { id: 'v_hare', name: '토끼털 약병', item: 'cr_hare', eff: 'hpPct', per: 2, unit: '%' },
  { id: 'v_fox', name: '여우털 약병', item: 'cr_fox', eff: 'drop', per: 2, unit: '%' },
];
export const VIAL_BY_ID: Record<string, VialDef> = Object.fromEntries(VIALS.map((v) => [v.id, v]));
/** 약병 단계별로 붓는 개수(단계 n → n+1). 0 → 1 은 발견 주사위 한 번에 드는 개수 */
export const VIAL_COST = [10, 25, 60, 150, 350, 800, 1800, 4000];
export const VIAL_MAX = VIAL_COST.length;
/** 약병 발견 확률(주사위 한 번) */
export const VIAL_FIND = 0.3;

/** 액체 업그레이드(코인): 모든 액체의 생산·한도에 함께 */
export type LiquidUp = 'rate' | 'cap';
export const LIQUID = {
  rateBase: 20, ratePer: 6, capBase: 200, capPer: 100, max: 15,
  cost: { rate: 2000, cap: 1500 } as Record<LiquidUp, number>, grow: 1.6,
};

export interface Alch {
  /** 예전 저장(물방울) */
  liquid: number; t: number; bubbles: Record<string, number>; vials: Record<string, number>; up: Record<LiquidUp, number>;
  liquids: Record<LiquidId, number>;
  /** 솥마다 발견한 거품 수와 끓인 양 */
  found: Record<CauldronId, number>; brew: Record<CauldronId, number>;
  /** 캐릭터 배치: 캐릭터 id → 'c:솥' 또는 'l:액체' */
  assign: Record<number, string>;
  /** 캐릭터마다 장착한 큰 거품 */
  big: Record<number, string[]>;
  /** 약병 주사위 횟수(결과를 정하는 씨앗) */
  tries: number; xpFrac: Record<number, number>;
  /** 시길마다 모인 기운 */
  sigils: Record<string, number>;
}
const zeroC = () => ({ power: 4, quick: 4, wise: 4, luck: 4 });
// ───────── 시길 ─────────
export interface SigilDef { id: string; name: string; eff: BonusKey; v: [number, number, number]; unit: string; need: [number, number, number] }
export const SIGILS: SigilDef[] = [
  { id: 'sg_dmg', name: '칼날 시길', eff: 'dmg', v: [3, 7, 12], unit: '%', need: [20, 400, 8000] },
  { id: 'sg_hp', name: '심장 시길', eff: 'hpPct', v: [3, 7, 12], unit: '%', need: [20, 400, 8000] },
  { id: 'sg_xp', name: '책장 시길', eff: 'xp', v: [3, 6, 10], unit: '%', need: [30, 600, 12000] },
  { id: 'sg_drop', name: '눈동자 시길', eff: 'drop', v: [2, 5, 9], unit: '%', need: [40, 800, 16000] },
  { id: 'sg_coins', name: '동전 시길', eff: 'coins', v: [4, 9, 15], unit: '%', need: [30, 600, 12000] },
  { id: 'sg_card', name: '카드 시길', eff: 'card', v: [3, 6, 10], unit: '%', need: [50, 1000, 20000] },
  { id: 'sg_afk', name: '모래시계 시길', eff: 'afk', v: [1, 2, 4], unit: '%p', need: [60, 1200, 24000] },
  { id: 'sg_luk', name: '클로버 시길', eff: 'luk', v: [10, 25, 50], unit: '', need: [40, 800, 16000] },
  { id: 'sg_mine', name: '곡괭이 시길', eff: 'mining', v: [5, 12, 20], unit: '%', need: [25, 500, 10000] },
  { id: 'sg_chop', name: '도끼 시길', eff: 'chopping', v: [5, 12, 20], unit: '%', need: [25, 500, 10000] },
  { id: 'sg_fish', name: '낚싯바늘 시길', eff: 'fishing', v: [5, 12, 20], unit: '%', need: [25, 500, 10000] },
  { id: 'sg_bug', name: '날개 시길', eff: 'catching', v: [5, 12, 20], unit: '%', need: [25, 500, 10000] },
];
export const SIGIL: Record<string, SigilDef> = Object.fromEntries(SIGILS.map((x) => [x.id, x]));
export const sigilLv = (a: Alch, id: string) => { const d = SIGIL[id], ch = a.sigils?.[id] ?? 0; return d ? d.need.filter((n) => ch >= n).length : 0; };
export const newAlch = (): Alch => ({ liquid: 0, t: 0, bubbles: {}, vials: {}, up: { rate: 0, cap: 0 }, liquids: { water: 0, nitro: 0, trench: 0, mercury: 0 },
  found: zeroC(), brew: { power: 0, quick: 0, wise: 0, luck: 0 }, assign: {}, big: {}, tries: 0, xpFrac: {}, sigils: {} });
/** 예전 저장을 새 구조로 */
export function fixAlch(a: Alch) {
  a.liquids ??= { water: a.liquid ?? 0, nitro: 0, trench: 0, mercury: 0 };
  a.found ??= zeroC(); a.brew ??= { power: 0, quick: 0, wise: 0, luck: 0 }; a.assign ??= {}; a.big ??= {}; a.tries ??= 0; a.xpFrac ??= {}; a.sigils ??= {};
}

type AlchAcc = Pick<Account, 'alch' | 'characters'>;
const lvOf = (c: Character) => c.skills.alchemy?.lv ?? 1;
const charsAt = (acc: AlchAcc, slot: string) => acc.characters.filter((c) => acc.alch.assign[c.id] === slot);
/** 이 캐릭터 한 명이 솥·액체에서 일하는 힘 */
export const workPower = (c: Character) => (1 + lvOf(c) * 0.1) * classSkillMult(c, 'alchemy');
export const liquidOpen = (acc: Pick<Account, 'characters'>, l: LiquidDef) => acc.characters.some((c) => (c.maxWorld ?? 1) >= l.w);
export const liquidRate = (a: Alch, l: LiquidDef = LIQUIDS[0], acc?: AlchAcc) =>
  l.rate * (1 + a.up.rate * 0.3) + (acc ? charsAt(acc, `l:${l.id}`).reduce((s, c) => s + 4 * workPower(c), 0) : 0);
export const liquidCap = (a: Alch, l: LiquidDef = LIQUIDS[0]) => Math.round(l.cap * (1 + a.up.cap * 0.5));
/** 솥이 시간당 끓이는 양 */
export const brewRate = (acc: AlchAcc, cid: CauldronId) => charsAt(acc, `c:${cid}`).reduce((s, c) => s + 10 * workPower(c), 0);
/** 다음 거품을 발견하는 데 필요한 양 */
export const brewNeed = (found: number) => Math.ceil(100 * Math.pow(1.25, Math.max(0, found - 4)));
export const bigSlots = (c: Character) => Math.min(4, 1 + Math.floor(lvOf(c) / 30));

/** now 까지: 액체가 쌓이고, 솥이 끓어 거품을 발견하고, 맡은 캐릭터가 연금 경험치를 얻는다 */
export function alchSettle(acc: AlchAcc, now: number) {
  const a = acc.alch;
  fixAlch(a);
  if (!a.t) { a.t = now; return; }
  if (now <= a.t) return;
  const h = (now - a.t) / 3_600_000;
  a.t = now;
  for (const l of LIQUIDS) if (liquidOpen(acc, l)) a.liquids[l.id] = Math.min(liquidCap(a, l), a.liquids[l.id] + liquidRate(a, l, acc) * h);
  a.liquid = a.liquids.water;
  for (const cd of CAULDRONS) {
    if (a.found[cd.id] >= BUBBLES_PER) continue;
    a.brew[cd.id] += brewRate(acc, cd.id) * h;
    while (a.found[cd.id] < BUBBLES_PER && a.brew[cd.id] >= brewNeed(a.found[cd.id])) { a.brew[cd.id] -= brewNeed(a.found[cd.id]); a.found[cd.id]++; }
    if (a.found[cd.id] >= BUBBLES_PER) a.brew[cd.id] = 0;
  }
  // 시길: 맡은 캐릭터가 시간마다 그 시길에 기운을 모은다
  for (const c of acc.characters) { const sl = a.assign[c.id]; if (sl?.startsWith('g:') && SIGIL[sl.slice(2)]) a.sigils[sl.slice(2)] = (a.sigils[sl.slice(2)] ?? 0) + h * workPower(c); }
  for (const c of acc.characters) {
    if (!a.assign[c.id]) continue;
    const x = h * 12 * classSkillMult(c, 'alchemy') + (a.xpFrac[c.id] ?? 0), whole = Math.floor(x);
    a.xpFrac[c.id] = x - whole;
    if (whole > 0) gainSkillXp(c, 'alchemy', whole);
  }
}

export const bubbleLv = (a: Alch | undefined, id: string) => a?.bubbles[id] ?? 0;
export const bubbleFound = (a: Alch, id: string) => { const cd = CAULDRONS.find((x) => x.bubbles.some((b) => b.id === id)); return !!cd && cd.bubbles.findIndex((b) => b.id === id) < (a.found?.[cd.id] ?? 4); };
/** 거품 효과: 레벨이 오를수록 최대치에 다가간다 */
export const bubbleValue = (b: BubbleDef, lv: number) => (lv <= 0 ? 0 : (b.max * lv) / (lv + b.k));
export const bubbleCost = (b: BubbleDef, lv: number) => ({ item: b.item, n: Math.ceil(b.base * Math.pow(1.17, lv)), liquid: Math.ceil(4 + lv * 2.5), liq: b.liquid });
export const vialValue = (v: VialDef, lv: number) => lv * v.per;

export function upBubble(acc: Account, c: Character, id: string, now: number): string | null {
  const b = BUBBLES[id];
  if (!b) return '없는 거품';
  alchSettle(acc, now);
  const a = acc.alch, lv = bubbleLv(a, id);
  if (!bubbleFound(a, id)) return '아직 발견하지 못한 거품입니다';
  if (lv >= BUBBLE_MAX_LV) return '최대 레벨입니다';
  const cost = bubbleCost(b, lv);
  if (a.liquids[cost.liq] < cost.liquid) return `${LIQUID_BY[cost.liq].name}이(가) 부족합니다`;
  if (haveMat(acc, c, cost.item) < cost.n) return `${ITEMS[cost.item].name}이(가) 부족합니다`;
  spendMat(acc, c, cost.item, cost.n);
  a.liquids[cost.liq] -= cost.liquid; a.liquid = a.liquids.water;
  a.bubbles[id] = lv + 1;
  return null;
}
/** 약병: 발견 전이면 주사위(실패해도 재료를 쓴다), 발견한 뒤엔 단계 올리기. 성공하면 1 */
export function upVial(acc: Account, c: Character, id: string): string | null {
  const v = VIAL_BY_ID[id];
  if (!v) return '없는 약병';
  fixAlch(acc.alch);
  const lv = acc.alch.vials[id] ?? 0;
  if (lv >= VIAL_MAX) return '최대 단계입니다';
  const n = VIAL_COST[lv];
  if (haveMat(acc, c, v.item) < n) return `${ITEMS[v.item].name}이(가) 부족합니다`;
  spendMat(acc, c, v.item, n);
  if (lv === 0) {
    const roll = (hash((acc.petSeed ^ (acc.alch.tries * 2654435761)) >>> 0) ^ [...id].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) >>> 0;
    acc.alch.tries++;
    if ((roll % 10000) / 10000 >= VIAL_FIND) return null; // 실패(재료만 씀) — 화면이 단계를 보고 알린다
  }
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
/** 캐릭터를 솥('c:power')·액체('l:water')에 맡기거나(같은 곳이면) 빼기 */
export function assignAlch(acc: Account, c: Character, slot: string, now: number): string | null {
  alchSettle(acc, now);
  const a = acc.alch;
  if (a.assign[c.id] === slot || !slot) { delete a.assign[c.id]; return null; }
  const [k, id] = slot.split(':');
  if (k === 'c' && !CAULDRONS.some((x) => x.id === id)) return '없는 솥';
  if (k === 'l') { const l = LIQUID_BY[id as LiquidId]; if (!l) return '없는 액체'; if (!liquidOpen(acc, l)) return `${l.w}월드에 가야 쓸 수 있는 액체입니다`; }
  if (k === 'g' && !SIGIL[id]) return '없는 시길';
  if (k !== 'c' && k !== 'l' && k !== 'g') return '없는 자리';
  a.assign[c.id] = slot;
  return null;
}
/** 큰 거품 장착/해제(캐릭터마다) */
export function toggleBig(acc: Account, c: Character, id: string): string | null {
  fixAlch(acc.alch);
  const b = BUBBLES[id];
  if (!b?.big) return '큰 거품이 아닙니다';
  const list = (acc.alch.big[c.id] ??= []), i = list.indexOf(id);
  if (i >= 0) { list.splice(i, 1); return null; }
  if (!bubbleLv(acc.alch, id)) return '먼저 1레벨 이상 올리세요';
  if (list.length >= bigSlots(c)) return `큰 거품은 ${bigSlots(c)}개까지 장착합니다(연금 Lv.30마다 한 칸)`;
  list.push(id);
  return null;
}
/** 연금술이 주는 보너스: 일반 거품·약병은 계정 공용, 큰 거품은 장착한 캐릭터만 */
export function alchBonus(a: Alch | undefined, add: (k: BonusKey, v: number) => void, c?: Character) {
  if (!a) return;
  const mine = c ? a.big?.[c.id] ?? [] : [];
  for (const b of Object.values(BUBBLES)) if (!b.big || mine.includes(b.id)) add(b.eff, bubbleValue(b, bubbleLv(a, b.id)));
  for (const v of VIALS) add(v.eff, vialValue(v, a.vials[v.id] ?? 0));
  for (const d of SIGILS) { const lv = sigilLv(a, d.id); if (lv) add(d.eff, d.v[lv - 1]); }
}
