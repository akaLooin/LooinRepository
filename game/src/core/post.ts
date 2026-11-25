// 우체국(2월드): 원작처럼 계정 공용으로 여섯 회사의 배달 주문을 받는다.
//  · 회사마다 하루에 주문 하나(물건 1~2가지). 계정 씨앗값 + 날짜로 정해진다 → 기기와 서버가 같은 주문을 본다.
//  · 같은 회사의 주문을 날마다 이어서 채우면 연속 배달이 쌓여 보상이 커진다(하루를 거르면 처음부터).
//  · 배달한 캐릭터가 배달 포인트를 받아 자기 택배 상자를 올린다. 상자마다 효과가 셋(25·100단계에서 둘째·셋째가 열린다).
import { BonusKey, ITEMS, WORLDS, MAPS, MONSTERS, NODES, PRODUCTS, SMELTS } from './data';
import { hash } from './companions';
import type { Account, Character } from './state';
import { haveMat, mapUnlocked, spendMat, today } from './state';

export interface PostItem { item: string; n: number }
export interface PostOrder { company: string; items: PostItem[]; pts: number; coins: number; done: boolean }
/** 계정 공용 주문 */
export interface PostOffice { day: string; orders: PostOrder[]; streak: Record<string, number>; last: Record<string, string> }
/** 캐릭터마다: 배달 포인트와 택배 상자 */
export interface PostState { pts: number; boxes: Record<string, number> }
export const newPost = (): PostState => ({ pts: 0, boxes: {} });
export const newPostOffice = (): PostOffice => ({ day: '', orders: [], streak: {}, last: {} });

export type CompanyKind = 'beast' | 'ore' | 'wood' | 'water' | 'smith' | 'rare';
export interface CompanyDef { id: string; name: string; kind: CompanyKind; desc: string }
export const COMPANIES: CompanyDef[] = [
  { id: 'pc_beast', name: '들짐승 운송', kind: 'beast', desc: '몬스터 재료' },
  { id: 'pc_ore', name: '광맥 상회', kind: 'ore', desc: '광석·주괴' },
  { id: 'pc_wood', name: '나무꾼 조합', kind: 'wood', desc: '통나무' },
  { id: 'pc_water', name: '물가 택배', kind: 'water', desc: '물고기·곤충' },
  { id: 'pc_smith', name: '대장간 협회', kind: 'smith', desc: '모루 생산품' },
  { id: 'pc_rare', name: '수집가 상점', kind: 'rare', desc: '귀한 재료' },
];
export const POST_ORDERS = COMPANIES.length;
/** 연속 배달 보너스는 20일까지 쌓인다 */
export const STREAK_MAX = 20;

export interface BoxEff { eff: BonusKey; per: number; unit: string; at: number }
export interface BoxDef { id: string; name: string; effs: BoxEff[]; max: number }
const E = (eff: BonusKey, per: number, unit: string, at = 0): BoxEff => ({ eff, per, unit, at });
export const BOXES: BoxDef[] = [
  { id: 'x_str', name: '묵직한 상자', max: 150, effs: [E('str', 1, ''), E('hp', 4, '', 25), E('mining', 0.5, '%', 100)] },
  { id: 'x_agi', name: '날쌘 상자', max: 150, effs: [E('agi', 1, ''), E('acc', 1, '', 25), E('catching', 0.5, '%', 100)] },
  { id: 'x_wis', name: '책 상자', max: 150, effs: [E('wis', 1, ''), E('xp', 0.2, '%', 25), E('chopping', 0.5, '%', 100)] },
  { id: 'x_luk', name: '복주머니 상자', max: 150, effs: [E('luk', 1, ''), E('drop', 0.2, '%', 25), E('card', 0.3, '%', 100)] },
  { id: 'x_def', name: '단단한 상자', max: 150, effs: [E('def', 1, ''), E('hpPct', 0.2, '%', 25), E('fishing', 0.5, '%', 100)] },
  { id: 'x_drop', name: '선물 상자', max: 150, effs: [E('drop', 1, '%'), E('coins', 0.5, '%', 25), E('luk', 1, '', 100)] },
  { id: 'x_coins', name: '금고 상자', max: 150, effs: [E('coins', 2, '%'), E('drop', 0.3, '%', 25), E('str', 1, '', 100)] },
  { id: 'x_xp', name: '편지 상자', max: 150, effs: [E('xp', 1, '%'), E('wis', 0.5, '', 25), E('afk', 0.05, '%p', 100)] },
  { id: 'x_afk', name: '이불 상자', max: 100, effs: [E('afk', 0.25, '%p'), E('hp', 6, '', 25), E('xp', 0.5, '%', 100)] },
];
export const BOX_BY_ID: Record<string, BoxDef> = Object.fromEntries(BOXES.map((b) => [b.id, b]));
/** 다음 단계 비용(배달 포인트): 5단계마다 1씩 오른다 */
export const boxCost = (lv: number) => 1 + Math.floor(lv / 5);
/** 이 상자 효과의 지금 값(그 효과가 열리는 단계부터 오른다) */
export const boxValue = (e: BoxEff, lv: number) => (lv > e.at ? (lv - e.at) * e.per : 0);

/** 회사가 주문할 수 있는 물건: 계정의 캐릭터 누구라도 열어 둔 맵·기술 기준 */
export function companyPool(acc: Pick<Account, 'characters'>, kind: CompanyKind): string[] {
  const out = new Set<string>();
  const mapOpen = (id: string) => acc.characters.some((c) => mapUnlocked(c, id));
  const skill = (k: string) => Math.max(1, ...acc.characters.map((c) => c.skills[k as 'mining']?.lv ?? 1));
  for (const id of WORLDS.flatMap((w) => w.maps)) {
    if (!mapOpen(id)) continue;
    const m = MAPS[id];
    for (const s of m.spawns) {
      const dr = MONSTERS[s.monster]?.drops ?? [];
      const it = kind === 'beast' ? dr[0]?.item : kind === 'rare' ? dr.find((d, i) => i > 0 && ITEMS[d.item]?.kind === 'material')?.item : undefined;
      if (it && ITEMS[it]?.kind === 'material') out.add(it);
    }
    for (const n of m.nodes) {
      const nd = NODES[n.node];
      if (skill(nd.skill) < nd.reqLv) continue;
      if ((kind === 'ore' && nd.skill === 'mining') || (kind === 'wood' && nd.skill === 'chopping') || (kind === 'water' && (nd.skill === 'fishing' || nd.skill === 'catching'))) out.add(nd.item);
      if (kind === 'ore' && nd.skill === 'mining') { const sm = SMELTS.find((x) => x.ore === nd.item); if (sm) out.add(sm.bar); }
    }
  }
  if (kind === 'smith') for (const p of PRODUCTS) if (skill('smithing') >= p.lv) out.add(p.item);
  return [...out].filter((id) => ITEMS[id]).sort();
}
/** 예전 이름(테스트·화면): 이 캐릭터의 계정에서 나올 수 있는 모든 재료 */
export const orderPool = (c: Character) => [...new Set(COMPANIES.flatMap((co) => companyPool({ characters: [c] }, co.kind)))].sort();

const dayHash = (d: string) => [...d].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
/** 날이 바뀌었으면 회사마다 새 주문 */
export function postRefresh(acc: Account, _c: Character | null, now: number) {
  const p = acc.postOff, d = today(now);
  if (p.day === d) return;
  p.day = d;
  const seed = hash(acc.petSeed >>> 0) ^ dayHash(d);
  p.orders = [];
  COMPANIES.forEach((co, ci) => {
    const pool = companyPool(acc, co.kind);
    if (!pool.length) return;
    const items: PostItem[] = [];
    const k = pool.length > 3 ? 2 : 1;
    let pts = 0, coins = 0;
    for (let i = 0; i < k && pool.length; i++) {
      const r = hash((seed + ci * 7919 + i * 977) >>> 0);
      const item = pool.splice(r % pool.length, 1)[0], sell = Math.max(1, ITEMS[item].sell);
      const n = Math.max(10, Math.min(250, Math.round(500 / sell)));
      items.push({ item, n });
      pts += sell < 15 ? 1 : sell < 50 ? 2 : 3;
      coins += n * sell * 2;
    }
    p.orders.push({ company: co.id, items, pts, coins, done: false });
  });
}
/** 지금 이어지고 있는 연속 배달 날 수(어제나 오늘 배달했으면 이어짐) */
export function streakNow(acc: Account, company: string, now: number): number {
  const last = acc.postOff.last[company], d = today(now), y = today(now - 86_400_000);
  return last === d || last === y ? acc.postOff.streak[company] ?? 0 : 0;
}
/** 연속 배달을 반영한 보상 */
export function orderReward(acc: Account, o: PostOrder, now: number): { pts: number; coins: number } {
  const st = Math.min(STREAK_MAX, streakNow(acc, o.company, now) + (o.done ? 0 : 1));
  return { pts: o.pts + Math.floor(st / 4), coins: Math.round(o.coins * (1 + st * 0.05)) };
}
export function deliver(acc: Account, c: Character, idx: number, now: number): string | null {
  postRefresh(acc, c, now);
  const o = acc.postOff.orders[idx];
  if (!o) return '없는 주문';
  if (o.done) return '이미 배달했습니다';
  for (const it of o.items) if (haveMat(acc, c, it.item) < it.n) return `${ITEMS[it.item].name}이(가) 부족합니다`;
  const r = orderReward(acc, o, now);
  for (const it of o.items) spendMat(acc, c, it.item, it.n);
  const p = acc.postOff, d = today(now);
  p.streak[o.company] = streakNow(acc, o.company, now) + 1;
  p.last[o.company] = d;
  o.done = true;
  c.post.pts += r.pts;
  acc.coins += r.coins;
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
  for (const b of BOXES) { const lv = c.post?.boxes[b.id] ?? 0; if (lv) for (const e of b.effs) { const v = boxValue(e, lv); if (v) add(e.eff, v); } }
}
