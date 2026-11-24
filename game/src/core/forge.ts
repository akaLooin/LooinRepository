// 용광로(계정 공용): 광석을 칸에 넣어 두면 시간이 흘러 주괴가 된다.
// 진행은 시각(t0)으로 계산하므로 접속하지 않아도, 서버에서도 같은 식으로 흐른다.
import { FORGE, ITEMS, SMELTS } from './data';
import type { Account, Character } from './state';
import { addItemSome, countItem, removeItem, storageSize } from './state';

export interface ForgeSlot {
  /** 넣어 둔 광석(비면 null) */
  ore: string | null;
  /** 남은 광석 수 */
  qty: number;
  /** 다 녹아 꺼내기를 기다리는 주괴 */
  bars: number;
  /** 지금 녹이는 주괴가 시작된 시각(ms) */
  t0: number;
  /** 기름을 부었으면 이 광석을 다 녹일 때까지 빨라진다 */
  oil: boolean;
  /** 추가 주괴 확률의 남은 몫(기댓값으로 쌓아 정수만큼 준다 → 기기·서버가 같은 결과) */
  frac: number;
}
export type ForgeUp = 'slots' | 'cap' | 'speed' | 'bonus';
export interface Forge { owned: boolean; slots: ForgeSlot[]; up: Record<ForgeUp, number> }

export const newForge = (): Forge => ({ owned: false, slots: [], up: { slots: 0, cap: 0, speed: 0, bonus: 0 } });
const emptySlot = (): ForgeSlot => ({ ore: null, qty: 0, bars: 0, t0: 0, oil: false, frac: 0 });

export const forgeSlotsOpen = (f: Forge) => FORGE.slotsBase + f.up.slots;
export const forgeCap = (f: Forge) => FORGE.capBase + f.up.cap * FORGE.capPer;
export const forgeBonus = (f: Forge) => f.up.bonus * FORGE.bonusPer;
/** 주괴 하나 녹이는 시간(초) */
export function smeltSeconds(f: Forge, s: ForgeSlot): number {
  const d = SMELTS.find((x) => x.ore === s.ore);
  if (!d) return Infinity;
  return d.secs / (1 + f.up.speed * FORGE.speedPer) / (s.oil ? FORGE.oilSpeed : 1);
}
/** 업그레이드 값(코인) */
export const forgeUpCost = (f: Forge, k: ForgeUp) => Math.round(FORGE.upCost[k] * Math.pow(FORGE.upGrow, f.up[k]));
export const forgeUpMaxed = (f: Forge, k: ForgeUp) => f.up[k] >= FORGE.upMax[k];

/** now 까지 녹은 만큼 주괴로 옮긴다 */
export function forgeSettle(acc: Account, now: number) {
  const f = acc.forge;
  while (f.slots.length < forgeSlotsOpen(f)) f.slots.push(emptySlot());
  for (const s of f.slots) {
    const d = SMELTS.find((x) => x.ore === s.ore);
    if (!d || s.qty < d.need) continue;
    const sec = smeltSeconds(f, s);
    const made = Math.max(0, Math.min(Math.floor(s.qty / d.need), Math.floor((now - s.t0) / 1000 / sec)));
    if (!made) continue;
    s.qty -= made * d.need;
    s.t0 += made * sec * 1000;
    s.frac += made * forgeBonus(f);
    const extra = Math.floor(s.frac);
    s.frac -= extra;
    s.bars += made + extra;
    if (s.qty < d.need) { s.t0 = now; s.oil = false; }
  }
}

/** 지금 녹이는 주괴의 진행도(0~1) */
export function forgeProgress(acc: Account, s: ForgeSlot, now: number): number {
  const d = SMELTS.find((x) => x.ore === s.ore);
  if (!d || s.qty < d.need) return 0;
  return Math.min(1, (now - s.t0) / 1000 / smeltSeconds(acc.forge, s));
}

export function buyForge(acc: Account): string | null {
  if (acc.forge.owned) return '이미 있습니다';
  if (acc.coins < FORGE.price) return '코인이 부족합니다';
  acc.coins -= FORGE.price;
  acc.forge.owned = true;
  return null;
}

/** 광석 넣기: 가방에서 먼저, 모자라면 창고에서 칸 용량까지 */
export function forgeLoad(acc: Account, c: Character, slot: number, ore: string, now: number): string | null {
  const f = acc.forge;
  if (!f.owned) return '용광로가 없습니다';
  forgeSettle(acc, now);
  const s = f.slots[slot], d = SMELTS.find((x) => x.ore === ore);
  if (!s || slot >= forgeSlotsOpen(f)) return '없는 칸';
  if (!d) return '녹일 수 없는 광석';
  if (s.ore && s.ore !== ore) return '다른 광석이 들어 있습니다';
  const room = forgeCap(f) - s.qty;
  const st = acc.storage.find((x) => x.id === ore);
  const fromBag = Math.min(room, countItem(c, ore)), fromStore = Math.min(room - fromBag, st?.qty ?? 0);
  if (fromBag + fromStore <= 0) return room <= 0 ? '칸이 가득 찼습니다' : '광석이 없습니다';
  removeItem(c, ore, fromBag);
  if (st && fromStore) { st.qty -= fromStore; if (st.qty <= 0) acc.storage.splice(acc.storage.indexOf(st), 1); }
  if (!s.ore || s.qty < d.need) s.t0 = now;
  s.ore = ore; s.qty += fromBag + fromStore;
  return null;
}

/** 기름 붓기: 이 칸의 광석을 다 녹일 때까지 빨라진다 */
export function forgeOil(acc: Account, c: Character, slot: number, now: number): string | null {
  const f = acc.forge;
  forgeSettle(acc, now);
  const s = f.slots[slot];
  if (!s?.ore) return '광석을 먼저 넣으세요';
  if (s.oil) return '이미 기름을 부었습니다';
  if (countItem(c, FORGE.oilItem) < 1) return `${ITEMS[FORGE.oilItem].name}이 없습니다`;
  // 지금까지 진행한 몫은 그대로 두고 남은 시간만 줄인다
  const sec = smeltSeconds(f, s), done = Math.min(1, (now - s.t0) / 1000 / sec);
  removeItem(c, FORGE.oilItem, 1);
  s.oil = true;
  s.t0 = now - done * smeltSeconds(f, s) * 1000;
  return null;
}

/** 주괴 꺼내기. want: 기기가 본 개수(서버는 그만큼만 준다 → 기기·서버 결과가 같다) */
export function forgeCollect(acc: Account, c: Character, slot: number, toStorage: boolean, now: number, want = Infinity): number {
  forgeSettle(acc, now);
  const s = acc.forge.slots[slot];
  if (!s || s.bars <= 0) return 0;
  const d = SMELTS.find((x) => x.ore === s.ore);
  if (!d) return 0;
  const bar = d.bar;
  const n0 = Math.min(s.bars, want);
  let n: number;
  if (toStorage) {
    let st = acc.storage.find((x) => x.id === bar);
    if (!st) { if (acc.storage.length >= storageSize(acc)) return 0; st = { id: bar, qty: 0 }; acc.storage.push(st); }
    n = n0; st.qty += n;
  } else n = addItemSome(c, bar, n0);
  s.bars -= n;
  // 다 꺼냈고 더 녹일 광석이 없으면 칸을 비운다(주괴 하나에 못 미치는 광석은 가방으로 돌려준다)
  if (s.bars <= 0 && s.qty < d.need) {
    if (s.qty > 0) s.qty -= addItemSome(c, d.ore, s.qty);
    if (s.qty <= 0) Object.assign(s, emptySlot());
  }
  return n;
}

export function forgeUpgrade(acc: Account, k: ForgeUp, now: number): string | null {
  const f = acc.forge;
  if (!f.owned) return '용광로가 없습니다';
  if (forgeUpMaxed(f, k)) return '최대 단계입니다';
  const cost = forgeUpCost(f, k);
  if (acc.coins < cost) return '코인이 부족합니다';
  // 속도가 바뀌기 전까지의 진행을 먼저 정리한다
  forgeSettle(acc, now);
  const frac = f.slots.map((s) => forgeProgress(acc, s, now));
  acc.coins -= cost;
  f.up[k]++;
  f.slots.forEach((s, i) => { if (s.ore) s.t0 = now - frac[i] * smeltSeconds(f, s) * 1000; });
  forgeSettle(acc, now);
  return null;
}
