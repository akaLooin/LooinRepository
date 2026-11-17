import {
  CARDS, CLASSES, CLASS_LEVEL, ClassId, EquipSlot, INVENTORY_SIZE, cardTier, ITEMS, ItemStats, MAX_CHARACTERS, QUESTS, RECIPES, SkillKey, StatKey, TALENT,
} from './data';

export interface Look { hair: number; hairColor: string; skin: string; outfit: string }
export interface Stack { id: string; qty: number }
/** 마지막으로 지정한 대상. AUTO와 방치 보상이 이 활동을 이어간다 */
export type Activity = { k: 'none' } | { k: 'fight' } | { k: 'gather'; node: string };

export interface Character {
  id: number; name: string; look: Look;
  cls: ClassId;
  level: number; xp: number; statPoints: number;
  stats: Record<StatKey, number>;
  hp: number;
  mp: number;
  /** 음식 칸: 체력이 낮아지면 자동으로 하나씩 먹는다 */
  food: Stack | null;
  mapId: string; x: number;
  auto: boolean; activity: Activity;
  inventory: Stack[];
  equipment: Partial<Record<EquipSlot, string>>;
  skills: Record<SkillKey, { lv: number; xp: number }>;
  kills: Record<string, number>;
  talentPoints: number;
  talents: Record<string, number>;
  /** 진행 중인 퀘스트: QUESTS의 순번, 수락 여부, 처치 진행도 */
  quest: { idx: number; accepted: boolean; prog: number };
  /** 이 캐릭터를 마지막으로 직접 플레이한 시각(ms). 방치 보상 계산 기준. */
  lastActive: number;
}
export interface Account {
  version: 1;
  coins: number;
  /** 몬스터 카드 보유 수(계정 공용) */
  cards: Record<string, number>;
  characters: Character[];
  active: number;
  nextId: number;
}

export function newAccount(): Account {
  return { version: 1, coins: 0, cards: {}, characters: [], active: -1, nextId: 1 };
}

export function createCharacter(acc: Account, name: string, look: Look, now: number): Character | null {
  if (acc.characters.length >= MAX_CHARACTERS) return null;
  const c: Character = {
    id: acc.nextId++, name: name.trim().slice(0, 10) || '모험가', look,
    cls: 'beginner', level: 1, xp: 0, statPoints: 0,
    stats: { str: 1, agi: 1, wis: 1, luk: 1 },
    hp: 1, mp: 1, food: null, mapId: 'town', x: 120, auto: false, activity: { k: 'none' },
    inventory: [], equipment: { weapon: 'sword_wood' },
    skills: { mining: { lv: 1, xp: 0 }, chopping: { lv: 1, xp: 0 } },
    kills: {}, lastActive: now,
    talentPoints: 0, talents: {}, quest: { idx: 0, accepted: false, prog: 0 },
  };
  c.hp = derive(c).maxHp; c.mp = derive(c).maxMp;
  acc.characters.push(c);
  return c;
}

// ───────── 공식 ─────────
export const xpToNext = (lv: number) => Math.floor(18 * Math.pow(lv, 1.8) + 12 * lv);
export const skillXpToNext = (lv: number) => Math.floor(14 * Math.pow(lv, 1.6) + 6);

export interface Derived {
  str: number; agi: number; wis: number; luk: number;
  maxHp: number; dmg: number; def: number;
  maxMp: number; mpRegen: number;
  /** 명중 */
  acc: number;
  atkInterval: number; speed: number; crit: number; critMult: number;
  xpMult: number; dropMult: number; regen: number;
  mining: number; chopping: number;
  /** 공격 사거리. 원거리 직업은 발사체를 쏜다 */
  range: number; ranged: boolean;
}

export function equipStats(c: Character): Required<ItemStats> {
  const t: Required<ItemStats> = { dmg: 0, def: 0, hp: 0, str: 0, agi: 0, wis: 0, luk: 0, mining: 0, chopping: 0 };
  for (const id of Object.values(c.equipment)) {
    const s = id && ITEMS[id]?.stats;
    if (s) for (const k in s) t[k as keyof ItemStats] += s[k as keyof ItemStats]!;
  }
  return t;
}

export type Cards = Record<string, number>;
const NO_CARDS: Cards = {};

export function derive(c: Character, cards: Cards = NO_CARDS): Derived {
  const e = equipStats(c);
  const str = c.stats.str + e.str, agi = c.stats.agi + e.agi;
  const wis = c.stats.wis + e.wis, luk = c.stats.luk + e.luk;
  const tl = (id: string) => c.talents[id] ?? 0;
  const cls = CLASSES[c.cls] ?? CLASSES.beginner;
  const cb = { hp: 0, dmg: 0, drop: 0 };
  for (const cd of CARDS) cb[cd.bonus] += cardTier(cards[cd.monster] ?? 0) * cd.per;
  const main = { str, agi, wis, luk }[cls.main], accStat = { str, agi, wis, luk }[cls.acc];
  const maxMp = Math.floor(8 + wis * 1.5 + c.level);
  const work = 1 + tl('worker') * 0.05;
  const maxHp = Math.floor((40 + c.level * 8 + str * 3 + e.hp) * (1 + tl('tough') * 0.04) * (1 + cb.hp) * (c.cls === 'warrior' ? 1.15 : 1));
  return {
    str, agi, wis, luk, maxHp, maxMp, mpRegen: 0.5 + maxMp * 0.02,
    acc: 2 + accStat + c.level,
    dmg: (2 + e.dmg + main * 0.5 + c.level * 0.4) * (1 + tl('sharp') * 0.03) * (1 + cb.dmg),
    def: e.def + c.level * 0.3 + tl('ironskin') * 1.5,
    atkInterval: Math.max(0.3, (0.75 - agi * 0.004) * (1 - tl('swift') * 0.02)),
    speed: 80 + Math.min(40, agi * 0.6),
    crit: Math.min(0.6, 0.04 + luk * 0.004), critMult: 1.6,
    xpMult: 1 + wis * 0.005 + tl('insight') * 0.03, dropMult: (1 + luk * 0.004) * (1 + cb.drop),
    range: cls.range, ranged: cls.range > 40,
    regen: maxHp * 0.02,
    mining: (1 + e.mining + c.skills.mining.lv * 0.35 + wis * 0.05) * work,
    chopping: (1 + e.chopping + c.skills.chopping.lv * 0.35 + wis * 0.05) * work,
  };
}

/** 몬스터 공격을 방어력으로 경감한 피해 */
/** 받는 피해: 방어력이 몬스터의 기준치(defZero)에 가까울수록 줄고, 넘으면 0 */
export const dmgTaken = (m: { atk: number; defZero: number }, def: number, roll = 1) =>
  Math.max(0, Math.ceil(m.atk * roll * (1 - def / m.defZero)));
/** 명중률: 명중/요구치 비율이 0.5 이하면 0%, 1 이상이면 100% */
export const hitChance = (acc: number, need: number) => Math.max(0, Math.min(1, (acc / need - 0.5) * 2));
/** 음식 칸 넣기/빼기 */
export function setFood(c: Character, id: string | null): string | null {
  if (id && ITEMS[id]?.kind !== 'food') return '음식이 아닙니다';
  if (c.food) {
    if (!addItem(c, c.food.id, c.food.qty)) return '가방이 가득 찼습니다';
    c.food = null;
  }
  if (id) {
    const n = countItem(c, id);
    if (!n) return '가방에 없습니다';
    removeItem(c, id, n);
    c.food = { id, qty: n };
  }
  return null;
}

// ───────── 성장 ─────────
/** 경험치 지급. 오른 레벨 수를 반환 */
export function gainXp(c: Character, amount: number): number {
  c.xp += amount;
  let ups = 0;
  while (c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    c.level++; c.statPoints += 3; c.talentPoints++; ups++;
  }
  if (ups) { c.hp = derive(c).maxHp; c.mp = derive(c).maxMp; }
  return ups;
}
export function gainSkillXp(c: Character, skill: SkillKey, amount: number): number {
  const s = c.skills[skill];
  s.xp += amount;
  let ups = 0;
  while (s.xp >= skillXpToNext(s.lv)) { s.xp -= skillXpToNext(s.lv); s.lv++; ups++; }
  return ups;
}
export function spendStat(c: Character, k: StatKey, n = 1): boolean {
  n = Math.min(n, c.statPoints);
  if (n <= 0) return false;
  c.stats[k] += n; c.statPoints -= n;
  return true;
}

export function learnTalent(c: Character, id: string): boolean {
  const t = TALENT[id], lv = c.talents[id] ?? 0;
  if (!t || c.talentPoints <= 0 || lv >= t.max || (t.cls && t.cls !== c.cls)) return false;
  c.talents[id] = lv + 1; c.talentPoints--;
  return true;
}

/** 전직. 실패 사유 또는 null */
export function advanceClass(c: Character, cls: ClassId): string | null {
  const def = CLASSES[cls];
  if (!def || cls === 'beginner' || c.cls !== 'beginner') return '전직할 수 없습니다';
  if (c.level < CLASS_LEVEL) return `레벨 ${CLASS_LEVEL} 필요`;
  if (def.starter && c.inventory.length >= INVENTORY_SIZE) return '가방이 가득 찼습니다';
  c.cls = cls;
  if (def.starter) {
    // 새 무기를 쥐여 주고 쓰던 무기는 가방으로
    const prev = c.equipment.weapon;
    c.equipment.weapon = def.starter;
    if (prev) addItem(c, prev, 1);
  }
  c.hp = derive(c).maxHp;
  return null;
}

// ───────── 퀘스트 ─────────
export const currentQuest = (c: Character) => QUESTS[c.quest.idx] ?? null;
export function questProgress(c: Character): { have: number; need: number; done: boolean } | null {
  const q = currentQuest(c);
  if (!q) return null;
  const have = 'kill' in q.goal ? c.quest.prog : countItem(c, q.goal.item);
  return { have: Math.min(have, q.goal.n), need: q.goal.n, done: c.quest.accepted && have >= q.goal.n };
}
/** 처치를 퀘스트 진행도에 반영 */
export function noteKill(c: Character, monster: string, n = 1) {
  const q = currentQuest(c);
  if (q && c.quest.accepted && 'kill' in q.goal && q.goal.kill === monster) c.quest.prog += n;
}
export function acceptQuest(c: Character): boolean {
  if (!currentQuest(c) || c.quest.accepted) return false;
  c.quest.accepted = true; c.quest.prog = 0;
  return true;
}
/** 완료 처리. 실패 사유 문자열 또는 null(성공) */
export function completeQuest(acc: Account, c: Character): string | null {
  const q = currentQuest(c), p = questProgress(c);
  if (!q || !p?.done) return '아직 조건을 채우지 못했습니다';
  const r = q.reward;
  if (r.item && countItem(c, r.item) === 0 && c.inventory.length >= INVENTORY_SIZE
    && !('item' in q.goal && countItem(c, q.goal.item) === q.goal.n)) return '가방이 가득 찼습니다';
  if ('item' in q.goal) removeItem(c, q.goal.item, q.goal.n);
  if (r.item) addItem(c, r.item, 1);
  acc.coins += r.coins ?? 0;
  c.quest = { idx: c.quest.idx + 1, accepted: false, prog: 0 };
  if (r.xp) gainXp(c, r.xp);
  return null;
}

// ───────── 인벤토리 ─────────
export const countItem = (c: Character, id: string) => c.inventory.find((s) => s.id === id)?.qty ?? 0;

export function addItem(c: Character, id: string, qty = 1): boolean {
  if (qty <= 0) return true;
  const s = c.inventory.find((x) => x.id === id);
  if (s) { s.qty += qty; return true; }
  if (c.inventory.length >= INVENTORY_SIZE) return false;
  c.inventory.push({ id, qty });
  return true;
}
export function removeItem(c: Character, id: string, qty = 1): boolean {
  const i = c.inventory.findIndex((x) => x.id === id);
  if (i < 0 || c.inventory[i].qty < qty) return false;
  c.inventory[i].qty -= qty;
  if (c.inventory[i].qty === 0) c.inventory.splice(i, 1);
  return true;
}

export function equipItem(c: Character, id: string): string | null {
  const def = ITEMS[id];
  if (!def?.slot || countItem(c, id) < 1) return '장착할 수 없는 아이템';
  if ((def.reqLv ?? 1) > c.level) return `레벨 ${def.reqLv} 필요`;
  if (def.wtype && def.wtype !== CLASSES[c.cls].weapon) return '이 직업은 쓸 수 없는 무기';
  const prev = c.equipment[def.slot];
  removeItem(c, id, 1);
  c.equipment[def.slot] = id;
  if (prev) addItem(c, prev, 1); // 방금 한 칸을 비웠으므로 항상 성공
  c.hp = Math.min(c.hp, derive(c).maxHp);
  return null;
}
export function unequipItem(c: Character, slot: EquipSlot): string | null {
  const id = c.equipment[slot];
  if (!id) return null;
  if (!addItem(c, id, 1)) return '가방이 가득 찼습니다';
  delete c.equipment[slot];
  c.hp = Math.min(c.hp, derive(c).maxHp);
  return null;
}
export function sellItem(acc: Account, c: Character, id: string, qty: number): number {
  qty = Math.min(qty, countItem(c, id));
  if (qty <= 0 || !removeItem(c, id, qty)) return 0;
  const gain = ITEMS[id].sell * qty;
  acc.coins += gain;
  return gain;
}

export function canCraft(acc: Account, c: Character, idx: number): boolean {
  const r = RECIPES[idx];
  return !!r && acc.coins >= r.coins && r.mats.every(([id, n]) => countItem(c, id) >= n);
}
export function craft(acc: Account, c: Character, idx: number): string | null {
  const r = RECIPES[idx];
  if (!canCraft(acc, c, idx)) return '재료가 부족합니다';
  const freed = r.mats.some(([id, n]) => countItem(c, id) === n);
  if (!freed && countItem(c, r.item) === 0 && c.inventory.length >= INVENTORY_SIZE) return '가방이 가득 찼습니다';
  acc.coins -= r.coins;
  for (const [id, n] of r.mats) removeItem(c, id, n);
  addItem(c, r.item, 1);
  return null;
}

// ───────── 저장 ─────────
export function serialize(acc: Account): string { return JSON.stringify(acc); }
export function deserialize(json: string | null): Account | null {
  if (!json) return null;
  try {
    const a = JSON.parse(json) as Account;
    if (a?.version !== 1 || !Array.isArray(a.characters)) return null;
    // 이전 저장 데이터에 없는 필드 보충
    a.cards ??= {};
    for (const c of a.characters) {
      c.cls ??= 'beginner';
      c.food ??= null;
      c.mp ??= derive(c, a.cards).maxMp;
      c.activity ??= { k: 'none' };
      delete (c as unknown as { mode?: string }).mode;
      c.talents ??= {};
      c.talentPoints ??= c.level - 1;
      c.quest ??= { idx: 0, accepted: false, prog: 0 };
    }
    return a;
  } catch { return null; }
}
