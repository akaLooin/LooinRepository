// 동료(원작의 펫: 무료 뽑기·크리스탈 간식 뽑기·'+' 강화)와 부엉이 깃털. 둘 다 계정 공용.
import { CRYSTAL_ITEM, CRYSTAL_PER_ITEM, OWL, OwlUp, PETS, PET_PITY, PET_PLUS, PET_RECYCLE, PetDef, PetRarity, TREATS } from './data';
import type { Account, Character } from './state';
import { countItem, removeItem, today } from './state';

// ───────── 동료(원작의 펫) ─────────
// 결과는 계정의 씨앗값 + 뽑은 횟수로 정한다 → 기기와 서버가 같은 동료를 뽑는다
export const hash = (n: number) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16; return x >>> 0; };
const rand = (acc: Pick<Account, 'petSeed' | 'petPulls'>, salt: number) => hash((acc.petSeed ^ (acc.petPulls * 7919 + salt * 104729)) >>> 0) / 4294967296;

export const petFreeReady = (acc: Pick<Account, 'petDaily'>, now: number) => acc.petDaily !== today(now);
export const petOwned = (acc: Pick<Account, 'pets'>, id: string) => (acc.pets[id] ?? 0) > 0;
export const petPlus = (acc: Pick<Account, 'pets'>, id: string) => (acc.pets[id] ?? 0) >= 2;
/** 동료 효과(가지고 있으면 그대로, '+'면 2배) */
export const petValue = (acc: Partial<Pick<Account, 'pets'>>, p: PetDef) => (acc.pets?.[p.id] ? p.per * (acc.pets[p.id] >= 2 ? 2 : 1) : 0);

export interface PullResult { id: string; rarity: PetRarity; isNew: boolean; crystals: number }
/** 뽑기: tier -1 은 하루 한 번 무료(첫 간식 확률), 0~ 은 펫 크리스탈로 간식을 산다 */
export function pullPet(acc: Account, tier: number, now: number): PullResult | string {
  const free = tier < 0, treat = TREATS[free ? 0 : tier];
  if (!treat) return '없는 간식';
  if (free) { if (!petFreeReady(acc, now)) return '오늘의 무료 뽑기는 이미 했습니다'; }
  else if (acc.petCrystals < treat.cost) return '펫 크리스탈이 부족합니다';
  // 등급 정하기(산 간식은 보장 계수를 센다)
  let rarity: PetRarity = 0;
  const r = rand(acc, 1);
  let acc0 = 0;
  for (let k = 3; k >= 0; k--) { acc0 += treat.odds[k]; if (r < acc0) { rarity = k as PetRarity; break; } }
  if (!free) {
    // 보장: 영웅 계수(30회)와 희귀 계수(10회)를 따로 센다. 그 등급 이상이 나오면 그 계수는 처음부터
    acc.petPity.epic++; acc.petPity.rare++;
    if (acc.petPity.epic >= PET_PITY.epic && rarity < 2) rarity = 2;
    else if (acc.petPity.rare >= PET_PITY.rare && rarity < 1) rarity = 1;
    if (rarity >= 2) acc.petPity.epic = 0;
    if (rarity >= 1) acc.petPity.rare = 0;
  }
  const pool = PETS.filter((p) => p.rarity === rarity);
  const pet = pool[Math.floor(rand(acc, 2) * pool.length)];
  acc.petPulls++;
  if (free) acc.petDaily = today(now); else acc.petCrystals -= treat.cost;
  const isNew = !petOwned(acc, pet.id);
  let crystals = 0;
  if (isNew) acc.pets[pet.id] = 1;
  else { crystals = free ? Math.floor(PET_RECYCLE[rarity] / 2) : PET_RECYCLE[rarity]; acc.petCrystals += crystals; }
  return { id: pet.id, rarity, isNew, crystals };
}
/** '+' 강화: 효과 2배 */
export function plusPet(acc: Account, id: string): string | null {
  const p = PETS.find((x) => x.id === id);
  if (!p || !petOwned(acc, id)) return '아직 없는 동료입니다';
  if (petPlus(acc, id)) return '이미 강화했습니다';
  const cost = PET_PLUS[p.rarity];
  if (acc.petCrystals < cost) return '펫 크리스탈이 부족합니다';
  acc.petCrystals -= cost; acc.pets[id] = 2;
  return null;
}
/** 가방의 펫 크리스탈 조각을 모두 크리스탈로 */
export function depositShards(acc: Account, c: Character): number {
  const n = countItem(c, CRYSTAL_ITEM);
  if (!n) return 0;
  removeItem(c, CRYSTAL_ITEM, n);
  acc.petCrystals += n * CRYSTAL_PER_ITEM;
  return n * CRYSTAL_PER_ITEM;
}

// ───────── 부엉이 깃털 ─────────
export interface Owl { f: number; t: number; up: Record<OwlUp, number> }
export const newOwl = (): Owl => ({ f: 0, t: 0, up: { rate: 0, dmg: 0, xp: 0, drop: 0, afk: 0 } });
export const owlPerHour = (o: Owl) => OWL.basePerHour * (1 + o.up.rate * OWL.ups.rate.per);
export const owlValue = (o: Owl | undefined, k: OwlUp) => (o ? o.up[k] * OWL.ups[k].per : 0);
export const owlCost = (o: Owl, k: OwlUp) => Math.round(OWL.ups[k].cost * Math.pow(OWL.ups[k].grow, o.up[k]));
/** now 까지 쌓인 깃털을 더한다(처음 찾아온 순간부터 쌓이기 시작) */
export function owlSettle(acc: Account, now: number) {
  const o = acc.owl;
  if (o.t > 0 && now > o.t) o.f += (owlPerHour(o) * (now - o.t)) / 3_600_000;
  o.t = Math.max(o.t, now);
}
export function owlUpgrade(acc: Account, k: OwlUp, now: number): string | null {
  const def = OWL.ups[k];
  if (!def) return '없는 항목';
  owlSettle(acc, now);
  const o = acc.owl;
  if (o.up[k] >= def.max) return '최대 단계입니다';
  const cost = owlCost(o, k);
  if (o.f < cost) return '깃털이 부족합니다';
  o.f -= cost; o.up[k]++;
  return null;
}
