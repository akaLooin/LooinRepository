// 건설(3월드, 계정 공용): 눈꽃 마을 공방 마당.
//  · 재료를 넣어 건물 공사를 시작하면, 건설 속도(시간당 건설 포인트)만큼 시간이 지나며 지어진다. 접속하지 않아도 진행.
//  · 공사 칸마다 따로 진행되고, 다 지어지면 건물 레벨 +1(계정 전체 보너스)과 건설 경험치.
//  · 건설 레벨이 오르면 속도가 빨라지고, 코인으로 비계(속도)·공사 칸을 늘린다.
import { BonusKey, ITEMS } from './data';
import type { Account, Character } from './state';
import { haveMat, spendMat } from './state';

export interface BuildingDef { id: string; name: string; eff: BonusKey; per: number; unit: string; max: number; mats: [string, number][]; pts: number }
export const BUILDINGS: BuildingDef[] = [
  { id: 'b_woodshed', name: '장작 창고', eff: 'chopping', per: 3, unit: '%', max: 25, mats: [['pinelog', 20], ['plank', 30]], pts: 200 },
  { id: 'b_minehouse', name: '광부 숙소', eff: 'mining', per: 3, unit: '%', max: 25, mats: [['ore_frost', 20], ['nail', 40]], pts: 200 },
  { id: 'b_dock', name: '얼음 낚시터', eff: 'fishing', per: 3, unit: '%', max: 25, mats: [['fish_ice', 20], ['pinelog', 10]], pts: 250 },
  { id: 'b_greenhouse', name: '눈 속 온실', eff: 'catching', per: 3, unit: '%', max: 25, mats: [['bug_frost', 20], ['salt_crystal', 10]], pts: 250 },
  { id: 'b_drill', name: '훈련장', eff: 'dmg', per: 2, unit: '%', max: 25, mats: [['icicle_shard', 15], ['bar_amber', 5]], pts: 300 },
  { id: 'b_hearth', name: '난롯가 집', eff: 'hpPct', per: 2, unit: '%', max: 25, mats: [['snow_tuft', 20], ['pinelog', 15]], pts: 300 },
  { id: 'b_library', name: '눈꽃 도서관', eff: 'xp', per: 2, unit: '%', max: 25, mats: [['pine_cone', 20], ['plank', 40]], pts: 400 },
  { id: 'b_market', name: '설원 시장', eff: 'coins', per: 3, unit: '%', max: 25, mats: [['peng_feather', 15], ['bar_frost', 3]], pts: 400 },
  { id: 'b_tower', name: '망루', eff: 'drop', per: 1.5, unit: '%', max: 25, mats: [['yeti_fur', 12], ['pinelog', 30]], pts: 500 },
  { id: 'b_attic', name: '꿈다락', eff: 'afk', per: 0.3, unit: '%p', max: 20, mats: [['aurora_dust', 10], ['cr_hare', 20]], pts: 600 },
];
export const BUILDING: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
export const BUILD = { rateBase: 120, ratePerLv: 0.12, rateUp: 0.15, rateUpMax: 10, rateUpCost: 5000, grow: 1.6, slotsBase: 2, slotCost: [60000, 250000] };

export interface BuildJob { id: string; need: number; prog: number }
export interface Build { t: number; lv: number; xp: number; levels: Record<string, number>; jobs: (BuildJob | null)[]; up: { rate: number; slots: number } }
export const newBuild = (): Build => ({ t: 0, lv: 1, xp: 0, levels: {}, jobs: [], up: { rate: 0, slots: 0 } });

export const buildXpToNext = (lv: number) => Math.floor(50 * Math.pow(lv, 1.5));
export const buildRate = (b: Build) => BUILD.rateBase * (1 + (b.lv - 1) * BUILD.ratePerLv) * (1 + b.up.rate * BUILD.rateUp);
export const buildSlots = (b: Build) => BUILD.slotsBase + b.up.slots;
/** 다음 레벨 공사: 재료와 건설 포인트 */
export function buildCost(d: BuildingDef, lv: number) {
  return { mats: d.mats.map(([id, n]) => [id, Math.ceil(n * Math.pow(1.25, lv))] as [string, number]), need: Math.ceil(d.pts * Math.pow(1.3, lv)) };
}
const gainXp = (b: Build, n: number) => { b.xp += n; while (b.xp >= buildXpToNext(b.lv)) { b.xp -= buildXpToNext(b.lv); b.lv++; } };

/** now 까지 공사를 진행한다(처음 찾은 순간부터). 속도는 이번 정산 시작 시점 값으로 */
export function buildSettle(acc: Pick<Account, 'build'>, now: number) {
  const b = acc.build;
  if (!b.t) { b.t = now; return; }
  if (now <= b.t) return;
  const add = (buildRate(b) * (now - b.t)) / 3_600_000;
  b.t = now;
  b.jobs.forEach((j, i) => {
    if (!j) return;
    j.prog = Math.min(j.need, j.prog + add);
    if (j.prog >= j.need) { b.levels[j.id] = (b.levels[j.id] ?? 0) + 1; gainXp(b, Math.round(j.need / 5)); b.jobs[i] = null; }
  });
}
export function startBuild(acc: Account, c: Character, id: string, now: number): string | null {
  const d = BUILDING[id];
  if (!d) return '없는 건물';
  buildSettle(acc, now);
  const b = acc.build, lv = b.levels[id] ?? 0;
  if (lv >= d.max) return '최대 레벨입니다';
  if (b.jobs.some((j) => j?.id === id)) return '이미 짓고 있습니다';
  let slot = b.jobs.findIndex((j) => !j);
  if (slot < 0) slot = b.jobs.length;
  if (slot >= buildSlots(b)) return '빈 공사 칸이 없습니다';
  const cost = buildCost(d, lv);
  for (const [m, n] of cost.mats) if (haveMat(acc, c, m) < n) return `${ITEMS[m].name}이(가) 부족합니다`;
  for (const [m, n] of cost.mats) spendMat(acc, c, m, n);
  b.jobs[slot] = { id, need: cost.need, prog: 0 };
  return null;
}
export function cancelBuild(acc: Account, slot: number, now: number): string | null {
  buildSettle(acc, now);
  if (!acc.build.jobs[slot]) return '빈 공사 칸입니다';
  acc.build.jobs[slot] = null; // 넣은 재료는 돌려받지 못한다
  return null;
}
export const rateUpCost = (b: Build) => Math.round(BUILD.rateUpCost * Math.pow(BUILD.grow, b.up.rate));
export function upBuild(acc: Account, k: 'rate' | 'slots', now: number): string | null {
  buildSettle(acc, now);
  const b = acc.build;
  if (k === 'rate') {
    if (b.up.rate >= BUILD.rateUpMax) return '최대 단계입니다';
    const cost = rateUpCost(b);
    if (acc.coins < cost) return '코인이 부족합니다';
    acc.coins -= cost; b.up.rate++;
    return null;
  }
  if (k !== 'slots') return '없는 항목';
  const cost = BUILD.slotCost[b.up.slots];
  if (cost === undefined) return '최대 단계입니다';
  if (acc.coins < cost) return '코인이 부족합니다';
  acc.coins -= cost; b.up.slots++;
  return null;
}
export function buildBonus(b: Build | undefined, add: (k: BonusKey, v: number) => void) {
  if (!b) return;
  for (const d of BUILDINGS) add(d.eff, (b.levels[d.id] ?? 0) * d.per);
}
