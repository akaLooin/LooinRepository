import {
  AFK_BASE, ANVIL, MAPS, TELEPORTS_MAX, TELEPORTS_PER_DAY, WORLD1, ATTACK_BARS, ATTACK_SLOTS, CARD_SLOTS, CARDS, NPCS, CLASSES, CLASS_LEVEL, ClassId, EquipSlot, INVENTORY_SIZE, PRODUCTS, SHOP, STACK_BASE, STORAGE_SIZE, StackGroup, cardTier, stackGroup, ITEMS, ItemStats, MAX_CHARACTERS, RECIPES, SkillKey, StatKey, TALENT,
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
  /** 서 있던 높이(발판). 없으면 지면 */
  y?: number;
  /** 사용한 가방·주머니 아이템(종류마다 한 번) */
  bags: string[];
  pouches: string[];
  /** 모루 생산: 칸마다 품목·보관량. 포인트는 칸 공용 */
  anvil: { slots: AnvilSlot[]; pts: { cap: number; spd: number; xp: number } };
  /** 공격 바: [장][칸] = 특성 ID. 자동은 지금 장의 왼쪽부터 시전 */
  attackBars: (string | null)[][];
  attackPage: number;
  /** 장착한 카드(몬스터 ID). 장착한 카드만 효과가 있다 */
  cardSlots: (string | null)[];
  auto: boolean; activity: Activity;
  inventory: Stack[];
  equipment: Partial<Record<EquipSlot, string>>;
  skills: Record<SkillKey, { lv: number; xp: number }>;
  kills: Record<string, number>;
  talentPoints: number;
  talents: Record<string, number>;
  /** NPC별 퀘스트 진행: 그 NPC 퀘스트 목록의 순번, 수락 여부, 처치 진행도 */
  quests: Record<string, QuestState>;
  /** 이 캐릭터를 마지막으로 직접 플레이한 시각(ms). 방치 보상 계산 기준. */
  lastActive: number;
}
export interface AnvilSlot { prod: string | null; stored: number; frac: number }
export interface QuestState { idx: number; accepted: boolean; prog: number }

export interface Account {
  version: 1;
  coins: number;
  /** 몬스터 카드 보유 수(계정 공용) */
  cards: Record<string, number>;
  /** 계정 공용 창고(한 칸에 개수 제한 없음) */
  storage: Stack[];
  /** 사용한 창고 확장 아이템 */
  chests: string[];
  /** 잡화점 오늘 구매 수(날짜가 바뀌면 초기화) */
  shop: { day: string; bought: Record<string, number> };
  /** 보스 처치 수 */
  bosses: Record<string, number>;
  /** 모루 단계(모루 확장으로 오른다, 계정 공용) */
  anvilTier: number;
  /** 옵션(원작처럼 모든 캐릭터 공용) */
  options: { autoAttacks: boolean };
  /** 지도 순간이동 남은 횟수와 마지막으로 채운 날 */
  teleports: { n: number; day: string };
  characters: Character[];
  active: number;
  nextId: number;
}

export const emptyBars = () => Array.from({ length: ATTACK_BARS }, () => new Array<string | null>(ATTACK_SLOTS).fill(null));

export function newAccount(): Account {
  return { version: 1, coins: 0, cards: {}, storage: [], chests: [], shop: { day: '', bought: {} }, bosses: {}, anvilTier: 1, options: { autoAttacks: true }, teleports: { n: 5, day: '' }, characters: [], active: -1, nextId: 1 };
}

export function createCharacter(acc: Account, name: string, look: Look, now: number): Character | null {
  if (acc.characters.length >= MAX_CHARACTERS) return null;
  const c: Character = {
    id: acc.nextId++, name: name.trim().slice(0, 10) || '모험가', look,
    cls: 'beginner', level: 1, xp: 0, statPoints: 0,
    stats: { str: 1, agi: 1, wis: 1, luk: 1 },
    hp: 1, mp: 1, food: null, mapId: 'town', x: 120, auto: false, activity: { k: 'none' },
    inventory: [], equipment: { weapon: 'sword_wood' }, bags: [], pouches: [],
    anvil: { slots: [{ prod: null, stored: 0, frac: 0 }], pts: { cap: 0, spd: 0, xp: 0 } }, cardSlots: new Array(CARD_SLOTS).fill(null),
    skills: { mining: { lv: 1, xp: 0 }, chopping: { lv: 1, xp: 0 }, smithing: { lv: 1, xp: 0 } },
    kills: {}, lastActive: now,
    talentPoints: 0, talents: {}, quests: {},
    attackBars: emptyBars(), attackPage: 0,
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
  /** 방치 효율(0~1): 전투, 채집 */
  afkFight: number; afkSkill: number;
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
  const cb = { hp: 0, dmg: 0, drop: 0, afk: 0, mining: 0, chopping: 0, afkSkill: 0 };
  // 카드는 장착한 것만 효과가 있다
  for (const cd of CARDS) if (c.cardSlots?.includes(cd.id)) cb[cd.bonus] += cardTier(cards[cd.id] ?? 0) * cd.per;
  const main = { str, agi, wis, luk }[cls.main], accStat = { str, agi, wis, luk }[cls.acc];
  const maxMp = Math.floor(8 + wis * 1.5 + c.level);
  const work = 1 + tl('worker') * 0.05;
  const maxHp = Math.floor((40 + c.level * 8 + str * 3 + e.hp) * (1 + tl('tough') * 0.04) * (1 + cb.hp) * (c.cls === 'warrior' ? 1.15 : 1));
  return {
    str, agi, wis, luk, maxHp, maxMp, mpRegen: 0.5 + maxMp * 0.02,
    acc: 2 + accStat + c.level,
    afkFight: Math.min(1, AFK_BASE + luk * 0.002 + tl('idler') * 0.02 + cb.afk),
    afkSkill: Math.min(1, AFK_BASE + wis * 0.002 + tl('idler') * 0.02 + cb.afk + cb.afkSkill),
    dmg: (2 + e.dmg + main * 0.5 + c.level * 0.4) * (1 + tl('sharp') * 0.03) * (1 + cb.dmg),
    def: e.def + c.level * 0.3 + tl('ironskin') * 1.5,
    atkInterval: Math.max(0.3, (0.75 - agi * 0.004) * (1 - tl('swift') * 0.02)),
    speed: 80 + Math.min(40, agi * 0.6),
    crit: Math.min(0.6, 0.04 + luk * 0.004), critMult: 1.6,
    xpMult: 1 + wis * 0.005 + tl('insight') * 0.03, dropMult: (1 + luk * 0.004) * (1 + cb.drop),
    range: cls.range, ranged: cls.range > 40,
    regen: maxHp * 0.02,
    mining: (1 + e.mining + c.skills.mining.lv * 0.35 + wis * 0.05) * work * (1 + cb.mining),
    chopping: (1 + e.chopping + c.skills.chopping.lv * 0.35 + wis * 0.05) * work * (1 + cb.chopping),
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
  // 액티브를 처음 배우면 지금 공격 바의 빈 칸에 놓아 준다(옮기는 것은 특성 화면에서)
  if (lv === 0 && t.active && !c.attackBars.some((b) => b.includes(id))) {
    const bar = c.attackBars[c.attackPage], free = bar.indexOf(null);
    if (free >= 0) bar[free] = id;
  }
  return true;
}

/** 공격 바 칸에 특성을 놓거나(같은 장에 이미 있으면 옮김) 비운다 */
export function setBarSlot(c: Character, bar: number, slot: number, id: string | null): string | null {
  const b = c.attackBars[bar];
  if (!b || slot < 0 || slot >= b.length) return '없는 칸';
  if (id) {
    const t = TALENT[id];
    if (!t?.active) return '액티브 특성만 놓을 수 있습니다';
    if (!(c.talents[id] > 0)) return '아직 배우지 않은 특성';
    if (t.cls && t.cls !== c.cls) return '이 직업의 특성이 아닙니다';
    const prev = b.indexOf(id);
    if (prev >= 0) b[prev] = b[slot]; // 자리 바꾸기
  }
  b[slot] = id;
  return null;
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

// ───────── 퀘스트(NPC별) ─────────
const qs = (c: Character, npc: string): QuestState => (c.quests[npc] ??= { idx: 0, accepted: false, prog: 0 });
export const currentQuest = (c: Character, npc = 'elder') => NPCS[npc]?.quests[qs(c, npc).idx] ?? null;
export function questProgress(c: Character, npc = 'elder'): { have: number; need: number; done: boolean } | null {
  const q = currentQuest(c, npc), st = qs(c, npc);
  if (!q) return null;
  const have = 'kill' in q.goal ? st.prog : countItem(c, q.goal.item);
  return { have: Math.min(have, q.goal.n), need: q.goal.n, done: st.accepted && have >= q.goal.n };
}
/** 처치를 모든 NPC의 진행 중인 처치 퀘스트에 반영 */
export function noteKill(c: Character, monster: string, n = 1) {
  for (const npc of Object.keys(NPCS)) {
    const q = currentQuest(c, npc), st = qs(c, npc);
    if (q && st.accepted && 'kill' in q.goal && q.goal.kill === monster) st.prog += n;
  }
}
export function acceptQuest(c: Character, npc = 'elder'): boolean {
  const st = qs(c, npc);
  if (!currentQuest(c, npc) || st.accepted) return false;
  st.accepted = true; st.prog = 0;
  return true;
}
/** 완료 처리. 실패 사유 문자열 또는 null(성공) */
export function completeQuest(acc: Account, c: Character, npc = 'elder'): string | null {
  const q = currentQuest(c, npc), p = questProgress(c, npc);
  if (!q || !p?.done) return '아직 조건을 채우지 못했습니다';
  const r = q.reward;
  if (r.item && countItem(c, r.item) === 0 && c.inventory.length >= invSize(c)
    && !('item' in q.goal && countItem(c, q.goal.item) === q.goal.n)) return '가방이 가득 찼습니다';
  if ('item' in q.goal) removeItem(c, q.goal.item, q.goal.n);
  if (r.item) addItem(c, r.item, 1);
  acc.coins += r.coins ?? 0;
  c.quests[npc] = { idx: qs(c, npc).idx + 1, accepted: false, prog: 0 };
  if (r.xp) gainXp(c, r.xp);
  return null;
}

// ───────── 카드 장착 ─────────
export function equipCard(acc: Account, c: Character, card: string, slot: number): string | null {
  if (!(acc.cards[card] > 0)) return '아직 없는 카드입니다';
  if (slot < 0 || slot >= c.cardSlots.length) return '없는 칸';
  const prev = c.cardSlots.indexOf(card);
  if (prev >= 0) c.cardSlots[prev] = null;
  c.cardSlots[slot] = card;
  c.hp = Math.min(c.hp, derive(c, acc.cards).maxHp);
  return null;
}
export function unequipCard(acc: Account, c: Character, slot: number) {
  if (slot >= 0 && slot < c.cardSlots.length) c.cardSlots[slot] = null;
  c.hp = Math.min(c.hp, derive(c, acc.cards).maxHp);
}

// ───────── 인벤토리 ─────────
/** 가방 칸 수 */
export const invSize = (c: Character) => INVENTORY_SIZE + c.bags.reduce((n, id) => n + (ITEMS[id]?.bagSlots ?? 0), 0);
/** 가방 한 칸에 이 아이템을 몇 개까지 쌓을 수 있는가 */
export function stackCap(c: Character, id: string): number {
  const g: StackGroup = stackGroup(id);
  let cap = STACK_BASE;
  for (const p of c.pouches) { const d = ITEMS[p]?.pouch; if (d && d.group === g) cap = Math.max(cap, d.cap); }
  return cap;
}
export const countItem = (c: Character, id: string) => c.inventory.find((s) => s.id === id)?.qty ?? 0;

/** 들어가는 만큼 넣고 넣은 개수를 돌려준다 */
export function addItemSome(c: Character, id: string, qty = 1): number {
  if (qty <= 0) return 0;
  const cap = stackCap(c, id);
  let s = c.inventory.find((x) => x.id === id);
  if (!s) {
    if (c.inventory.length >= invSize(c)) return 0;
    s = { id, qty: 0 };
    c.inventory.push(s);
  }
  const n = Math.min(qty, cap - s.qty);
  s.qty += Math.max(0, n);
  if (s.qty === 0) c.inventory.splice(c.inventory.indexOf(s), 1);
  return Math.max(0, n);
}
/** 전부 들어가면 true. 들어가지 않으면 아무것도 넣지 않는다 */
export function addItem(c: Character, id: string, qty = 1): boolean {
  if (qty <= 0) return true;
  const s = c.inventory.find((x) => x.id === id);
  const room = s ? stackCap(c, id) - s.qty : c.inventory.length < invSize(c) ? stackCap(c, id) : 0;
  if (room < qty) return false;
  addItemSome(c, id, qty);
  return true;
}
export function removeItem(c: Character, id: string, qty = 1): boolean {
  const i = c.inventory.findIndex((x) => x.id === id);
  if (i < 0 || c.inventory[i].qty < qty) return false;
  c.inventory[i].qty -= qty;
  if (c.inventory[i].qty === 0) c.inventory.splice(i, 1);
  return true;
}

/** 가방·주머니·보관함 아이템 사용 */
export function useItem(acc: Account, c: Character, id: string): string | null {
  const it = ITEMS[id];
  if (!it || countItem(c, id) < 1) return '가방에 없습니다';
  if (it.kind === 'bag') { if (c.bags.includes(id)) return '이미 사용한 가방입니다'; c.bags.push(id); }
  else if (it.kind === 'pouch') { if (c.pouches.includes(id)) return '이미 사용한 주머니입니다'; c.pouches.push(id); }
  else if (it.kind === 'chest') { if (acc.chests.includes(id)) return '이미 사용한 보관함입니다'; acc.chests.push(id); }
  else return '사용할 수 없는 아이템';
  removeItem(c, id, 1);
  return null;
}

// ───────── 계정 창고 ─────────
export const storageSize = (acc: Account) => STORAGE_SIZE + acc.chests.reduce((n, id) => n + (ITEMS[id]?.chestSlots ?? 0), 0);
export const storageCount = (acc: Account, id: string) => acc.storage.find((s) => s.id === id)?.qty ?? 0;
/** 가방 → 창고. 넣은 개수 */
export function deposit(acc: Account, c: Character, id: string, qty = Infinity): number {
  qty = Math.min(qty, countItem(c, id));
  if (qty <= 0) return 0;
  let s = acc.storage.find((x) => x.id === id);
  if (!s) {
    if (acc.storage.length >= storageSize(acc)) return 0;
    s = { id, qty: 0 };
    acc.storage.push(s);
  }
  s.qty += qty;
  removeItem(c, id, qty);
  return qty;
}
/** 창고 → 가방(가방 한도까지). 꺼낸 개수 */
export function withdraw(acc: Account, c: Character, id: string, qty = Infinity): number {
  const s = acc.storage.find((x) => x.id === id);
  if (!s) return 0;
  const n = addItemSome(c, id, Math.min(qty, s.qty));
  s.qty -= n;
  if (s.qty <= 0) acc.storage.splice(acc.storage.indexOf(s), 1);
  return n;
}
/** 재료·자원·음식을 전부 창고로. 넣은 종류 수 */
export function depositAll(acc: Account, c: Character): number {
  let kinds = 0;
  for (const s of [...c.inventory]) {
    const g = stackGroup(s.id);
    if ((g === 'material' || g === 'resource' || g === 'food') && deposit(acc, c, s.id) > 0) kinds++;
  }
  return kinds;
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

/** 제작 재료는 가방과 계정 창고를 합쳐서 센다 */
export const haveMat = (acc: Account, c: Character, id: string) => countItem(c, id) + storageCount(acc, id);
/** 레시피가 잠겨 있으면 그 이유 */
export function recipeLock(acc: Account, c: Character, idx: number): string | null {
  const r = RECIPES[idx];
  if (!r) return '없는 레시피';
  if ((r.tier ?? 1) > acc.anvilTier) return `모루 ${r.tier}단계 필요`;
  if (r.unlock && acc.anvilTier >= r.unlock) return '이미 확장했습니다';
  if (r.smithLv && c.skills.smithing.lv < r.smithLv) return `대장 Lv.${r.smithLv} 필요`;
  return null;
}
export function canCraft(acc: Account, c: Character, idx: number): boolean {
  const r = RECIPES[idx];
  return !!r && !recipeLock(acc, c, idx) && acc.coins >= r.coins && r.mats.every(([id, n]) => haveMat(acc, c, id) >= n);
}
export function craft(acc: Account, c: Character, idx: number): string | null {
  const r = RECIPES[idx];
  const lock = recipeLock(acc, c, idx);
  if (lock) return lock;
  if (!canCraft(acc, c, idx)) return '재료가 부족합니다';
  const freed = r.mats.some(([id, n]) => countItem(c, id) > 0 && countItem(c, id) <= n);
  const s = c.inventory.find((x) => x.id === r.item);
  if (!r.unlock && (s ? s.qty >= stackCap(c, r.item) : !freed && c.inventory.length >= invSize(c))) return '가방이 가득 찼습니다';
  acc.coins -= r.coins;
  for (const [id, n] of r.mats) {
    // 가방에서 먼저 쓰고 모자라면 창고에서
    const fromBag = Math.min(n, countItem(c, id));
    removeItem(c, id, fromBag);
    if (n > fromBag) {
      const st = acc.storage.find((x) => x.id === id)!;
      st.qty -= n - fromBag;
      if (st.qty <= 0) acc.storage.splice(acc.storage.indexOf(st), 1);
    }
  }
  if (r.unlock) acc.anvilTier = Math.max(acc.anvilTier, r.unlock);
  else addItem(c, r.item, 1);
  return null;
}

// ───────── 모루 생산 ─────────
/** 대장 레벨마다 1 포인트 */
export const anvilPointsFree = (c: Character) => c.skills.smithing.lv - 1 - (c.anvil.pts.cap + c.anvil.pts.spd + c.anvil.pts.xp);
export const anvilCap = (c: Character) => ANVIL.capBase + c.anvil.pts.cap * ANVIL.capPer;
/** 열려 있는 생산 칸 수(대장 레벨로 열린다) */
export const anvilSlotsOpen = (c: Character) => ANVIL.slotLv.filter((lv) => c.skills.smithing.lv >= lv).length;
/** 칸 수가 대장 레벨을 따라가도록 맞춘다 */
function syncSlots(c: Character) {
  while (c.anvil.slots.length < anvilSlotsOpen(c)) c.anvil.slots.push({ prod: null, stored: 0, frac: 0 });
}
export const anvilRate = (c: Character, slot = 0) => {
  const p = PRODUCTS.find((x) => x.item === c.anvil.slots[slot]?.prod);
  return p ? p.perHour * (1 + c.anvil.pts.spd * ANVIL.spdPer) : 0;
};
export function setProduct(c: Character, item: string | null, slot = 0): string | null {
  syncSlots(c);
  const sl = c.anvil.slots[slot];
  if (!sl) return '아직 열리지 않은 칸';
  if (item) {
    const p = PRODUCTS.find((x) => x.item === item);
    if (!p) return '만들 수 없는 품목';
    if (c.skills.smithing.lv < p.lv) return `대장 Lv.${p.lv} 필요`;
  }
  if (sl.prod !== item && sl.stored > 0) return '먼저 만든 것을 받아 가세요';
  sl.prod = item; sl.frac = 0;
  return null;
}
export function spendAnvilPoint(c: Character, k: 'cap' | 'spd' | 'xp'): boolean {
  if (anvilPointsFree(c) <= 0) return false;
  c.anvil.pts[k]++;
  return true;
}
/** 시간이 흐른 만큼 모든 칸에서 생산. 만든 개수(칸별)와 오른 대장 레벨 */
export function anvilTick(c: Character, seconds: number): { made: number; levels: number; bySlot: { item: string; made: number }[] } {
  const out = { made: 0, levels: 0, bySlot: [] as { item: string; made: number }[] };
  if (seconds <= 0) return out;
  syncSlots(c);
  c.anvil.slots.forEach((sl, i) => {
    const p = PRODUCTS.find((x) => x.item === sl.prod);
    if (!p) return;
    const room = anvilCap(c) - sl.stored;
    if (room <= 0) { sl.frac = 0; return; }
    const exact = sl.frac + (anvilRate(c, i) * seconds) / 3600;
    const made = Math.min(room, Math.floor(exact));
    sl.frac = made === room ? 0 : exact - made;
    sl.stored += made;
    if (made) {
      out.made += made; out.bySlot.push({ item: p.item, made });
      out.levels += gainSkillXp(c, 'smithing', made * p.xp * (1 + c.anvil.pts.xp * ANVIL.xpPer));
      syncSlots(c);
    }
  });
  return out;
}
/** 만든 것 받기: toStorage면 창고로, 아니면 가방으로(들어가는 만큼) */
export function collectAnvil(acc: Account, c: Character, toStorage: boolean, slot = 0): number {
  const sl = c.anvil.slots[slot];
  const id = sl?.prod;
  if (!sl || !id || sl.stored <= 0) return 0;
  let n: number;
  if (toStorage) {
    let s = acc.storage.find((x) => x.id === id);
    if (!s) { if (acc.storage.length >= storageSize(acc)) return 0; s = { id, qty: 0 }; acc.storage.push(s); }
    n = sl.stored; s.qty += n;
  } else n = addItemSome(c, id, sl.stored);
  sl.stored -= n;
  return n;
}

// ───────── 지도 순간이동 ─────────
/** 이 캐릭터가 열어 둔 맵: 앞 맵에서 다음 맵 포탈 조건을 채웠으면 열림 */
export function mapUnlocked(c: Character, id: string): boolean {
  const i = WORLD1.indexOf(id);
  if (i < 0) return false;
  for (let k = 1; k <= i; k++) {
    const prev = MAPS[WORLD1[k - 1]], gate = prev.portals.find((p) => p.to === WORLD1[k]);
    if ((c.kills[prev.id] ?? 0) < (gate?.reqKills ?? 0)) return false;
  }
  return true;
}
/** 날이 바뀌었으면 무료 횟수를 채운다(쌓이되 최대치까지) */
export function refillTeleports(acc: Account, now: number) {
  const d = today(now);
  if (acc.teleports.day === d) return;
  const days = acc.teleports.day ? Math.max(1, Math.round((new Date(d).getTime() - new Date(acc.teleports.day).getTime()) / 864e5)) : 1;
  acc.teleports = { n: Math.min(TELEPORTS_MAX, acc.teleports.n + days * TELEPORTS_PER_DAY), day: d };
}
export function teleport(acc: Account, c: Character, id: string, now: number): string | null {
  if (!MAPS[id] || !mapUnlocked(c, id)) return '아직 열리지 않은 맵';
  if (c.mapId === id) return '이미 이 맵에 있습니다';
  refillTeleports(acc, now);
  if (id !== 'town') {
    if (acc.teleports.n <= 0) return '오늘 순간이동을 다 썼습니다';
    acc.teleports.n--;
  }
  c.mapId = id; c.x = id === 'town' ? 120 : 50; c.y = 0;
  return null;
}

// ───────── 잡화점 ─────────
export const today = (now: number) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function shopLeft(acc: Account, idx: number, now: number): number {
  if (acc.shop.day !== today(now)) acc.shop = { day: today(now), bought: {} };
  const e = SHOP[idx];
  return e ? e.daily - (acc.shop.bought[e.item] ?? 0) : 0;
}
export function buy(acc: Account, c: Character, idx: number, qty: number, now: number): string | null {
  const e = SHOP[idx];
  if (!e) return '없는 상품';
  qty = Math.min(qty, shopLeft(acc, idx, now));
  if (qty <= 0) return '오늘은 다 팔렸습니다';
  if (acc.coins < e.price * qty) return '코인이 부족합니다';
  if (!addItem(c, e.item, qty)) return '가방이 가득 찼습니다';
  acc.coins -= e.price * qty;
  acc.shop.bought[e.item] = (acc.shop.bought[e.item] ?? 0) + qty;
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
    a.storage ??= []; a.chests ??= []; a.bosses ??= {};
    a.shop ??= { day: '', bought: {} };
    a.anvilTier ??= 1;
    a.options ??= { autoAttacks: true };
    a.teleports ??= { n: 5, day: '' };
    for (const c of a.characters) {
      c.cls ??= 'beginner';
      c.bags ??= []; c.pouches ??= [];
      // 공격 바가 없던 형식: 이미 배운 액티브 특성을 첫 장에 차례로
      if (!c.attackBars) {
        c.attackBars = emptyBars(); c.attackPage = 0;
        Object.keys(c.talents ?? {}).filter((id) => TALENT[id]?.active && c.talents[id] > 0).slice(0, ATTACK_SLOTS).forEach((id, i) => (c.attackBars[0][i] = id));
      }
      c.anvil ??= { slots: [], pts: { cap: 0, spd: 0, xp: 0 } } as Character['anvil'];
      // 생산 칸이 하나뿐이던 저장 형식 → 칸 목록
      const old = c.anvil as unknown as { prod?: string | null; stored?: number; frac?: number };
      if (!c.anvil.slots) { c.anvil.slots = [{ prod: old.prod ?? null, stored: old.stored ?? 0, frac: old.frac ?? 0 }]; delete old.prod; delete old.stored; delete old.frac; }
      // 퀘스트가 촌장 하나뿐이던 형식 → NPC별
      const oq = (c as unknown as { quest?: QuestState }).quest;
      c.quests ??= oq ? { elder: oq } : {};
      delete (c as unknown as { quest?: QuestState }).quest;
      // 카드 장착 칸이 없던 형식: 가진 카드를 자동으로 장착
      if (!c.cardSlots) {
        c.cardSlots = new Array(CARD_SLOTS).fill(null);
        Object.keys(a.cards).filter((k) => a.cards[k] > 0).slice(0, CARD_SLOTS).forEach((k, i) => (c.cardSlots[i] = k));
      }
      c.skills.smithing ??= { lv: 1, xp: 0 };
      c.food ??= null;
      c.mp ??= derive(c, a.cards).maxMp;
      c.activity ??= { k: 'none' };
      delete (c as unknown as { mode?: string }).mode;
      c.talents ??= {};
      c.talentPoints ??= c.level - 1;
    }
    return a;
  } catch { return null; }
}
