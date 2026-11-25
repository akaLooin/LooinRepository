// 우체국(2월드, 캐릭터마다): 하루 3건의 배달 주문을 채워 배달 포인트를 모으고, 택배 상자를 올린다.
// 주문은 계정 씨앗값 + 캐릭터 + 날짜로 정해진다 → 기기와 서버가 같은 주문을 본다.
import { BonusKey, ITEMS, WORLD1, WORLD2, MAPS, MONSTERS, NODES } from './data';
import { hash } from './companions';
import type { Account, Character } from './state';
import { haveMat, mapUnlocked, spendMat, today } from './state';

export interface PostOrder { item: string; n: number; pts: number; coins: number; done: boolean }
export interface PostState { day: string; orders: PostOrder[]; pts: number; boxes: Record<string, number> }
export const newPost = (): PostState => ({ day: '', orders: [], pts: 0, boxes: {} });
export const POST_ORDERS = 3;

export interface BoxDef { id: string; name: string; eff: BonusKey; per: number; max: number; unit: string }
export const BOXES: BoxDef[] = [
  { id: 'x_str', name: '묵직한 상자', eff: 'str', per: 1, max: 50, unit: '' },
  { id: 'x_agi', name: '날쌘 상자', eff: 'agi', per: 1, max: 50, unit: '' },
  { id: 'x_wis', name: '책 상자', eff: 'wis', per: 1, max: 50, unit: '' },
  { id: 'x_luk', name: '복주머니 상자', eff: 'luk', per: 1, max: 50, unit: '' },
  { id: 'x_def', name: '단단한 상자', eff: 'def', per: 1, max: 40, unit: '' },
  { id: 'x_drop', name: '선물 상자', eff: 'drop', per: 1, max: 40, unit: '%' },
  { id: 'x_coins', name: '금고 상자', eff: 'coins', per: 2, max: 40, unit: '%' },
  { id: 'x_xp', name: '편지 상자', eff: 'xp', per: 1, max: 40, unit: '%' },
  { id: 'x_afk', name: '이불 상자', eff: 'afk', per: 0.25, max: 20, unit: '%p' },
];
export const BOX_BY_ID: Record<string, BoxDef> = Object.fromEntries(BOXES.map((b) => [b.id, b]));
/** 다음 단계 비용(배달 포인트): 5단계마다 1씩 오른다 */
export const boxCost = (lv: number) => 1 + Math.floor(lv / 5);

/** 이 캐릭터가 모을 수 있는 재료: 열어 둔 맵의 몬스터 재료(첫 드롭)와 자원 */
export function orderPool(c: Character): string[] {
  const out = new Set<string>();
  for (const id of [...WORLD1, ...WORLD2]) {
    if (!mapUnlocked(c, id)) continue;
    const m = MAPS[id];
    for (const s of m.spawns) { const it = MONSTERS[s.monster]?.drops[0]?.item; if (it && ITEMS[it]?.kind === 'material') out.add(it); }
    for (const n of m.nodes) if (c.skills[NODES[n.node].skill].lv >= NODES[n.node].reqLv) out.add(NODES[n.node].item);
  }
  return [...out].sort();
}
/** 날이 바뀌었으면 새 주문 3건 */
export function postRefresh(acc: Account, c: Character, now: number) {
  const p = c.post, d = today(now);
  if (p.day === d) return;
  p.day = d;
  const pool = orderPool(c);
  const seed = hash((acc.petSeed ^ (c.id * 2654435761)) >>> 0) ^ [...d].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  p.orders = [];
  for (let i = 0; i < POST_ORDERS && pool.length; i++) {
    const r = hash((seed + i * 977) >>> 0);
    const item = pool[r % pool.length], sell = Math.max(1, ITEMS[item].sell);
    const n = Math.max(10, Math.min(250, Math.round(600 / sell)));
    const pts = sell < 15 ? 1 : sell < 50 ? 2 : 3;
    p.orders.push({ item, n, pts, coins: n * sell * 2, done: false });
  }
}
export function deliver(acc: Account, c: Character, idx: number, now: number): string | null {
  postRefresh(acc, c, now);
  const o = c.post.orders[idx];
  if (!o) return '없는 주문';
  if (o.done) return '이미 배달했습니다';
  if (haveMat(acc, c, o.item) < o.n) return `${ITEMS[o.item].name}이(가) 부족합니다`;
  spendMat(acc, c, o.item, o.n);
  o.done = true;
  c.post.pts += o.pts;
  acc.coins += o.coins;
  return null;
}
export function upBox(c: Character, id: string): string | null {
  const b = BOX_BY_ID[id];
  if (!b) return '없는 상자';
  const lv = c.post.boxes[id] ?? 0;
  if (lv >= b.max) return '최대 단계입니다';
  const cost = boxCost(lv);
  if (c.post.pts < cost) return '배달 포인트가 부족합니다';
  c.post.pts -= cost;
  c.post.boxes[id] = lv + 1;
  return null;
}
/** 택배 상자 보너스(이 캐릭터만) */
export function postBonus(c: Character, add: (k: BonusKey, v: number) => void) {
  for (const b of BOXES) { const lv = c.post?.boxes[b.id] ?? 0; if (lv) add(b.eff, lv * b.per); }
}
