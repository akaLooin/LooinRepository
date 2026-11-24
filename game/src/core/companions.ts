// 동료(주 1회 무작위)와 부엉이 깃털(시간 기준으로 쌓이는 깃털로 올리는 보너스). 둘 다 계정 공용.
import { OWL, OwlUp, PETS, PET_MAX_LV } from './data';
import type { Account } from './state';

// ───────── 동료 ─────────
/** 주 번호(월요일 시작, 현지 시각). 같은 주에는 기기와 서버가 같은 동료를 받는다 */
export function weekKey(now: number): number {
  const d = new Date(now), day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return Math.round(monday.getTime() / 604_800_000);
}
const hash = (n: number) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x >>> 0; };
/** 이번 주에 찾아올 동료: 아직 없는 동료 중에서 먼저, 모두 있으면 레벨이 덜 오른 동료 */
export function petOfWeek(acc: Pick<Account, 'pets'>, now: number): string {
  const wk = weekKey(now);
  const fresh = PETS.filter((p) => !acc.pets[p.id]);
  const pool = fresh.length ? fresh : PETS.filter((p) => (acc.pets[p.id] ?? 0) < PET_MAX_LV);
  const list = pool.length ? pool : PETS;
  return list[hash(wk) % list.length].id;
}
export const petReady = (acc: Pick<Account, 'petWeek'>, now: number) => acc.petWeek !== weekKey(now);
export function claimPet(acc: Account, now: number): string | null {
  if (!petReady(acc, now)) return '이번 주 동료는 이미 받았습니다';
  const id = petOfWeek(acc, now);
  acc.pets[id] = Math.min(PET_MAX_LV, (acc.pets[id] ?? 0) + 1);
  acc.petWeek = weekKey(now);
  return null;
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
