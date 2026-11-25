// 우표(계정 공용 수집 보너스)와 후원 계약(코인으로 한 번 사는 효과)
import { BRIBES, BribeEff, ITEMS, STAMPS, STAMP_GROW, STAMP_LV, StampDef, StampEff } from './data';
import type { Account, Character } from './state';
import { countItem, haveMat, removeItem } from './state';

export const STAMP_BY_ID: Record<string, StampDef> = Object.fromEntries(STAMPS.map((s) => [s.id, s]));

/** 우표 효과 값(레벨 lv) */
export function stampValue(s: StampDef, lv: number): number {
  if (lv <= 0) return 0;
  return s.kind === 'lin' ? s.a * lv : (s.a * lv) / (lv + (s.b ?? 1));
}

/** 계정의 우표 효과 합(효과 종류별) */
export function stampBonus(acc: Partial<Pick<Account, 'stamps'>>): Record<StampEff, number> {
  const out = { dmg: 0, hp: 0, def: 0, acc: 0, crit: 0, mining: 0, chopping: 0, drop: 0, coins: 0, xp: 0, afk: 0, fishing: 0, catching: 0, str: 0, agi: 0, wis: 0, luk: 0, card: 0, hpPct: 0 } as Record<StampEff, number>;
  for (const s of STAMPS) out[s.eff] += stampValue(s, acc.stamps?.[s.id] ?? 0);
  return out;
}

/** 산 후원 계약 효과 합 */
export function bribeBonus(acc: Partial<Pick<Account, 'bribes'>>): Record<BribeEff, number> {
  const out = { stampCost: 0, drop: 0, forgeSpeed: 0, coins: 0, afk: 0, xp: 0 } as Record<BribeEff, number>;
  for (let i = 0; i < Math.min(acc.bribes ?? 0, BRIBES.length); i++) out[BRIBES[i].eff] += BRIBES[i].v;
  return out;
}

/** 다음 레벨로 올리는 값: 코인 + 재료 */
export function stampCost(acc: Account, s: StampDef): { coins: number; mat: string; qty: number } {
  const lv = acc.stamps[s.id] ?? 0;
  const disc = 1 - bribeBonus(acc).stampCost;
  return { coins: Math.round(s.cost * Math.pow(STAMP_GROW.coins, lv) * disc), mat: s.mat, qty: Math.ceil(s.matBase * Math.pow(STAMP_GROW.mats, lv)) };
}

/** 우표함을 쓸 수 있는가 */
export const stampsOpen = (c: Character) => c.level >= STAMP_LV;

/** 가방의 우표를 우표함에 넣는다(레벨 1로 수집) */
export function collectStamp(acc: Account, c: Character, id: string): string | null {
  if (!stampsOpen(c)) return `Lv.${STAMP_LV}부터 쓸 수 있습니다`;
  if (!STAMP_BY_ID[id]) return '없는 우표';
  if ((acc.stamps[id] ?? 0) > 0) return '이미 모은 우표입니다';
  if (countItem(c, id) < 1) return `${ITEMS[id].name}이(가) 없습니다`;
  removeItem(c, id, 1);
  acc.stamps[id] = 1;
  return null;
}

/** 우표 올리기: 재료는 가방에서 먼저, 모자라면 창고에서 */
export function upgradeStamp(acc: Account, c: Character, id: string): string | null {
  if (!stampsOpen(c)) return `Lv.${STAMP_LV}부터 쓸 수 있습니다`;
  const s = STAMP_BY_ID[id];
  if (!s || !(acc.stamps[id] > 0)) return '아직 모으지 않은 우표';
  const cost = stampCost(acc, s);
  if (acc.coins < cost.coins) return '코인이 부족합니다';
  if (haveMat(acc, c, cost.mat) < cost.qty) return `${ITEMS[cost.mat].name}이(가) 부족합니다`;
  acc.coins -= cost.coins;
  const fromBag = Math.min(cost.qty, countItem(c, cost.mat));
  removeItem(c, cost.mat, fromBag);
  if (cost.qty > fromBag) {
    const st = acc.storage.find((x) => x.id === cost.mat)!;
    st.qty -= cost.qty - fromBag;
    if (st.qty <= 0) acc.storage.splice(acc.storage.indexOf(st), 1);
  }
  acc.stamps[id]++;
  return null;
}

/** 다음 후원 계약 사기(차례대로). 세트는 그 월드에 간 캐릭터가 있어야 열린다 */
export function buyBribe(acc: Account): string | null {
  const b = BRIBES[acc.bribes];
  if (!b) return '모두 샀습니다';
  if (!acc.characters.some((c) => (c.maxWorld ?? 1) >= b.set)) return `${b.set}월드에 가야 열리는 세트입니다`;
  if (acc.coins < b.price) return '코인이 부족합니다';
  acc.coins -= b.price;
  acc.bribes++;
  return null;
}
