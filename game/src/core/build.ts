// 건설(3월드): 눈꽃 마을 공방 마당. 원작의 흐름을 따른다.
//  · 일꾼: 캐릭터를 공방 마당에 세우면(눈꽃 마을에 머무는 동안) 그 캐릭터의 건설 레벨만큼 건설 속도가 오르고, 건설 경험치와 톱니를 얻는다.
//  · 공사: 재료를 넣어 시작하면 건설 속도만큼 시간이 지나며 지어진다(접속하지 않아도). 다 지어지면 건물 레벨 +1.
//  · 톱니판: 일꾼이 만든 톱니를 판에 끼우면 건설 속도가 오른다.
//  · 특수 건물: 정제소(소금) · 3D 프린터(자원 복사) · 특성 도서관(특성 최대 레벨) · 덫 드론(덫 칸) · 원자 충돌기(원자) · 기도 탑(기도 토템).
import { BonusKey, ITEMS, classSkillMult } from './data';
import type { Account, Character } from './state';
import { gainSkillXp, haveMat, spendMat } from './state';
import { hash } from './companions';

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
// 특수 건물: 효과 대신 기능을 연다(레벨이 오를수록 커진다)
BUILDINGS.push(
  { id: 'b_refinery', name: '정제소', eff: 'coins', per: 0, unit: '', max: 10, mats: [['bar_frost', 15], ['brick', 60], ['icicle_shard', 20]], pts: 800 },
  { id: 'b_printer', name: '3D 프린터', eff: 'coins', per: 0, unit: '', max: 5, mats: [['bar_frost', 20], ['gearwheel', 40], ['aurora_dust', 10]], pts: 1200 },
  { id: 'b_library', name: '특성 도서관', eff: 'coins', per: 0, unit: '', max: 10, mats: [['plank', 200], ['pine_cone', 60], ['runestone', 40]], pts: 1500 },
  { id: 'b_drone', name: '덫 드론', eff: 'coins', per: 0, unit: '', max: 3, mats: [['bracket', 30], ['cr_fox', 60], ['bar_frost', 20]], pts: 1800 },
  { id: 'b_collider', name: '원자 충돌기', eff: 'coins', per: 0, unit: '', max: 10, mats: [['bar_nova', 10], ['screw', 30], ['frost_core', 20]], pts: 3000 },
  { id: 'b_tower', name: '기도 탑', eff: 'coins', per: 0, unit: '', max: 15, mats: [['icicle_shard', 30], ['snow_tuft', 60], ['brick', 40]], pts: 700 },
);
export const SPECIAL = new Set(['b_refinery', 'b_printer', 'b_library', 'b_drone', 'b_collider', 'b_tower']);
export const BUILDING: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
export const BUILD = { rateBase: 120, ratePerLv: 0.12, rateUp: 0.15, rateUpMax: 10, rateUpCost: 5000, grow: 1.6, slotsBase: 2, slotCost: [60000, 250000] };

export interface BuildJob { id: string; need: number; prog: number }
export interface Build {
  t: number; lv: number; xp: number; levels: Record<string, number>; jobs: (BuildJob | null)[]; up: { rate: number; slots: number };
  /** 일꾼(공방 마당에 선 캐릭터) */
  staff: number[]; cogFrac: Record<number, number>; xpFrac: Record<number, number>;
  /** 톱니: 판(12칸)과 아직 끼우지 않은 것(힘) */
  cogs: (number | null)[]; cogBag: number[]; cogSeq: number;
  /** 정제소: 소금과 진행 */
  salts: Record<string, number>; refine: Record<string, { on: boolean; rank: number; prog: number }>;
  /** 3D 프린터: 칸마다 복사할 자원과 진행 */
  printer: ({ item: string; frac: number } | null)[];
  /** 특성 도서관: 책과 진행, 특성마다 늘린 최대 레벨 */
  books: number; bookFrac: number; talentMax: Record<string, number>;
  /** 원자 충돌기: 입자와 원자 레벨 */
  particles: number; atoms: Record<string, number>;
}
export const newBuild = (): Build => ({ t: 0, lv: 1, xp: 0, levels: {}, jobs: [], up: { rate: 0, slots: 0 }, staff: [], cogFrac: {}, xpFrac: {}, cogs: [], cogBag: [], cogSeq: 0,
  salts: {}, refine: {}, printer: [], books: 0, bookFrac: 0, talentMax: {}, particles: 0, atoms: {} });
export function fixBuild(b: Build) {
  const d = newBuild();
  for (const k of Object.keys(d) as (keyof Build)[]) if (b[k] === undefined) (b as unknown as Record<string, unknown>)[k] = d[k];
}
/** 일꾼은 눈꽃 마을에 머물러야 일한다 */
export const BUILD_MAP = 'snowtown';
const lvOf = (c: Character) => c.skills.construction?.lv ?? 1;
const staffOf = (acc: Pick<Account, 'build' | 'characters'>) => acc.characters.filter((c) => acc.build.staff?.includes(c.id) && c.mapId === BUILD_MAP);
export const COG_SLOTS = 12;
export const cogPower = (b: Build) => (b.cogs ?? []).reduce((s: number, x) => s + (x ?? 0), 0);
/** 일꾼 한 명의 건설 포인트(시간당) */
export const staffRate = (c: Character) => 40 * (1 + lvOf(c) * 0.1) * classSkillMult(c, 'build');

export const buildXpToNext = (lv: number) => Math.floor(50 * Math.pow(lv, 1.5));
export const buildRate = (b: Build, acc?: Pick<Account, 'build' | 'characters'>) =>
  (BUILD.rateBase + (acc ? staffOf(acc).reduce((s, c) => s + staffRate(c), 0) : 0)) * (1 + (b.lv - 1) * BUILD.ratePerLv) * (1 + b.up.rate * BUILD.rateUp) * (1 + cogPower(b) * 0.02);
export const buildSlots = (b: Build) => BUILD.slotsBase + b.up.slots;
/** 다음 레벨 공사: 재료와 건설 포인트 */
export function buildCost(d: BuildingDef, lv: number) {
  return { mats: d.mats.map(([id, n]) => [id, Math.ceil(n * Math.pow(1.25, lv))] as [string, number]), need: Math.ceil(d.pts * Math.pow(1.3, lv)) };
}
const gainXp = (b: Build, n: number) => { b.xp += n; while (b.xp >= buildXpToNext(b.lv)) { b.xp -= buildXpToNext(b.lv); b.lv++; } };

/** now 까지 공사를 진행한다(처음 찾은 순간부터). 속도는 이번 정산 시작 시점 값으로 */
export function buildSettle(acc: Pick<Account, 'build' | 'characters'>, now: number) {
  const b = acc.build;
  fixBuild(b);
  if (!b.t) { b.t = now; return; }
  if (now <= b.t) return;
  const h = (now - b.t) / 3_600_000;
  const add = buildRate(b, acc) * h;
  b.t = now;
  specialSettle(acc, h);
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
  for (const d of BUILDINGS) if (d.per) add(d.eff, (b.levels[d.id] ?? 0) * d.per);
  atomBonus(b, add);
}

// ───────── 일꾼·톱니 ─────────
/** 이 캐릭터를 공방 마당 일꾼으로 세우거나 빼기(눈꽃 마을에 있어야 설 수 있다) */
export function toggleStaff(acc: Account, c: Character, now: number): string | null {
  buildSettle(acc, now);
  const b = acc.build, i = b.staff.indexOf(c.id);
  if (i >= 0) { b.staff.splice(i, 1); return null; }
  if (c.mapId !== BUILD_MAP) return '눈꽃 마을에 있어야 일꾼으로 설 수 있습니다';
  b.staff.push(c.id);
  return null;
}
/** 톱니 하나 만드는 데 걸리는 시간(시간) */
export const COG_HOURS = 4;
/** 톱니를 판에 끼우기(가방의 i번째 톱니 → 판의 slot 칸, 있던 톱니는 가방으로) */
export function placeCog(acc: Account, bagIdx: number, slot: number): string | null {
  const b = acc.build;
  fixBuild(b);
  if (slot < 0 || slot >= COG_SLOTS) return '없는 칸';
  const p = b.cogBag[bagIdx];
  if (p === undefined) return '없는 톱니';
  b.cogBag.splice(bagIdx, 1);
  while (b.cogs.length < COG_SLOTS) b.cogs.push(null);
  const old = b.cogs[slot];
  if (old) b.cogBag.push(old);
  b.cogs[slot] = p;
  b.cogBag.sort((x, y) => y - x);
  return null;
}
export function trashCog(acc: Account, bagIdx: number): string | null {
  fixBuild(acc.build);
  if (acc.build.cogBag[bagIdx] === undefined) return '없는 톱니';
  acc.build.cogBag.splice(bagIdx, 1);
  return null;
}

// ───────── 정제소(소금) ─────────
export interface SaltDef { id: string; name: string; item: string; per: number; hours: number; color: string; need?: string }
export const SALTS: SaltDef[] = [
  { id: 'salt_red', name: '붉은 소금', item: 'ore_frost', per: 20, hours: 2, color: '#e25d4e' },
  { id: 'salt_green', name: '초록 소금', item: 'pinelog', per: 40, hours: 3, color: '#5fb859', need: 'salt_red' },
  { id: 'salt_blue', name: '푸른 소금', item: 'icicle_shard', per: 30, hours: 5, color: '#4e8de2', need: 'salt_green' },
  { id: 'salt_violet', name: '보랏빛 소금', item: 'star_sand', per: 30, hours: 8, color: '#a07ad9', need: 'salt_blue' },
];
export const SALT: Record<string, SaltDef> = Object.fromEntries(SALTS.map((x) => [x.id, x]));
/** 정제 등급: 한 번에 만드는 소금 수(등급 + 1), 등급 올리기 비용(그 소금) */
export const rankCost = (rank: number) => Math.ceil(10 * Math.pow(1.6, rank));
export const refineSlots = (b: Build) => Math.min(SALTS.length, b.levels.b_refinery ?? 0);
export function toggleRefine(acc: Account, id: string, now: number): string | null {
  buildSettle(acc, now);
  const b = acc.build, d = SALT[id];
  if (!d) return '없는 소금';
  const i = SALTS.indexOf(d);
  if (i >= refineSlots(b)) return '정제소 레벨을 올려야 열립니다';
  const r = (b.refine[id] ??= { on: false, rank: 0, prog: 0 });
  r.on = !r.on;
  return null;
}
export function rankUpSalt(acc: Account, id: string, now: number): string | null {
  buildSettle(acc, now);
  const b = acc.build, r = b.refine[id];
  if (!r) return '먼저 정제를 시작하세요';
  const cost = rankCost(r.rank);
  if ((b.salts[id] ?? 0) < cost) return `${SALT[id].name}이(가) 부족합니다`;
  b.salts[id] -= cost; r.rank++;
  return null;
}

// ───────── 3D 프린터 ─────────
/** 복사할 수 있는 자원(채집 자원) */
export const PRINTABLE = ['log', 'ore', 'willowlog', 'ore_blue', 'moonlog', 'ore_gold', 'palmlog', 'ore_amber', 'pinelog', 'ore_frost', 'starlog', 'ore_nova', 'fish_minnow', 'fish_salt', 'fish_ice', 'bug_ant', 'bug_firefly', 'bug_frost'];
export const printerSlots = (b: Build) => (b.levels.b_printer ?? 0) ? 1 + (b.levels.b_printer ?? 0) : 0;
/** 프린터 한 칸이 시간당 복사하는 개수: 그 자원을 많이 가진 캐릭터의 가방 기준(본보기) */
export const printRate = (acc: Pick<Account, 'characters' | 'storage'>, item: string) =>
  Math.max(1, Math.floor(Math.sqrt(Math.max(...acc.characters.map((c) => c.inventory.reduce((n, s) => n + (s.id === item ? s.qty : 0), 0)), acc.storage.find((s) => s.id === item)?.qty ?? 0)))) * 2;
export function setPrint(acc: Account, slot: number, item: string, now: number): string | null {
  buildSettle(acc, now);
  const b = acc.build;
  if (slot < 0 || slot >= printerSlots(b)) return '프린터 칸이 없습니다';
  if (item && !PRINTABLE.includes(item)) return '복사할 수 없는 자원';
  while (b.printer.length <= slot) b.printer.push(null);
  b.printer[slot] = item ? { item, frac: 0 } : null;
  return null;
}

// ───────── 특성 도서관 ─────────
/** 책 하나로 특성 하나의 최대 레벨 +1(특성마다 최대 +20) */
export const LIBRARY_MAX = 20;
export const bookHours = (b: Build) => Math.max(1, 12 - (b.levels.b_library ?? 0));
export function useBook(acc: Account, talent: string, valid: boolean): string | null {
  const b = acc.build;
  fixBuild(b);
  if (!valid) return '없는 특성';
  if (b.books < 1) return '책이 없습니다';
  if ((b.talentMax[talent] ?? 0) >= LIBRARY_MAX) return '이 특성은 더 늘릴 수 없습니다';
  b.books--; b.talentMax[talent] = (b.talentMax[talent] ?? 0) + 1;
  return null;
}

// ───────── 원자 충돌기 ─────────
export interface AtomDef { id: string; name: string; eff: BonusKey; per: number; unit: string; cost: number }
export const ATOMS: AtomDef[] = [
  { id: 'a_h', name: '수소', eff: 'xp', per: 1, unit: '%', cost: 10 },
  { id: 'a_he', name: '헬륨', eff: 'drop', per: 0.8, unit: '%', cost: 15 },
  { id: 'a_li', name: '리튬', eff: 'dmg', per: 1, unit: '%', cost: 20 },
  { id: 'a_c', name: '탄소', eff: 'hpPct', per: 1, unit: '%', cost: 25 },
  { id: 'a_n', name: '질소', eff: 'coins', per: 2, unit: '%', cost: 30 },
  { id: 'a_o', name: '산소', eff: 'card', per: 0.8, unit: '%', cost: 40 },
];
export const ATOM_MAX = 30;
export const atomCost = (d: AtomDef, lv: number) => Math.ceil(d.cost * Math.pow(1.35, lv));
export function upAtom(acc: Account, id: string, now: number): string | null {
  buildSettle(acc, now);
  const b = acc.build, d = ATOMS.find((x) => x.id === id);
  if (!d) return '없는 원자';
  if (!(b.levels.b_collider ?? 0)) return '원자 충돌기를 먼저 지으세요';
  const lv = b.atoms[id] ?? 0;
  if (lv >= ATOM_MAX) return '최대 레벨입니다';
  const cost = atomCost(d, lv);
  if (b.particles < cost) return '입자가 부족합니다';
  b.particles -= cost; b.atoms[id] = lv + 1;
  return null;
}
function atomBonus(b: Build, add: (k: BonusKey, v: number) => void) {
  for (const d of ATOMS) { const lv = b.atoms?.[d.id] ?? 0; if (lv) add(d.eff, lv * d.per); }
}

/** 특수 건물과 일꾼의 시간 진행 */
function specialSettle(acc: Pick<Account, 'build' | 'characters'> & Partial<Pick<Account, 'storage'>>, h: number) {
  const b = acc.build;
  // 일꾼: 건설 경험치와 톱니
  for (const c of staffOf(acc)) {
    const x = h * 15 * classSkillMult(c, 'build') + (b.xpFrac[c.id] ?? 0), whole = Math.floor(x);
    b.xpFrac[c.id] = x - whole;
    if (whole > 0) gainSkillXp(c, 'construction', whole);
    b.cogFrac[c.id] = (b.cogFrac[c.id] ?? 0) + h / COG_HOURS;
    while (b.cogFrac[c.id] >= 1 && b.cogBag.length < 30) {
      b.cogFrac[c.id] -= 1; b.cogSeq++;
      // 톱니 힘: 건설 레벨이 높을수록 센 톱니가 나온다(씨앗으로 정해져 기기와 서버가 같다)
      const r = hash((c.id * 7919 + b.cogSeq * 131) >>> 0) % 100;
      b.cogBag.push(1 + Math.floor((r / 100) * (2 + lvOf(c) / 10)));
    }
    if (b.cogBag.length >= 30) b.cogFrac[c.id] = Math.min(b.cogFrac[c.id], 1);
  }
  b.cogBag.sort((x, y) => y - x);
  // 정제소: 켜 둔 소금은 그 재료를 창고에서 쓰며 만든다(재료가 없으면 멈춤)
  for (const d of SALTS) {
    const r = b.refine[d.id];
    if (!r?.on || SALTS.indexOf(d) >= refineSlots(b)) continue;
    r.prog += h / d.hours;
    const cycles = Math.floor(r.prog);
    if (cycles <= 0) continue;
    r.prog -= cycles;
    const st = acc.storage?.find((x) => x.id === d.item);
    const can = Math.min(cycles, st ? Math.floor(st.qty / d.per) : 0);
    if (st && can > 0) { st.qty -= can * d.per; if (st.qty <= 0) acc.storage!.splice(acc.storage!.indexOf(st), 1); }
    if (d.need) { const pv = Math.min(can, b.salts[d.need] ?? 0); b.salts[d.need] = (b.salts[d.need] ?? 0) - pv; b.salts[d.id] = (b.salts[d.id] ?? 0) + pv * (r.rank + 1); }
    else b.salts[d.id] = (b.salts[d.id] ?? 0) + can * (r.rank + 1);
  }
  // 3D 프린터: 자원을 창고로 복사
  b.printer.forEach((p, i) => {
    if (!p || i >= printerSlots(b) || !acc.storage) return;
    const x = printRate(acc as Pick<Account, 'characters' | 'storage'>, p.item) * h + p.frac, whole = Math.floor(x);
    p.frac = x - whole;
    if (whole > 0) { let st = acc.storage.find((s) => s.id === p.item); if (!st) { st = { id: p.item, qty: 0 }; acc.storage.push(st); } st.qty += whole; }
  });
  // 특성 도서관: 책
  if (b.levels.b_library) { b.bookFrac += h / bookHours(b); const n = Math.floor(b.bookFrac); if (n > 0) { b.books = Math.min(50, b.books + n); b.bookFrac -= n; } }
  // 원자 충돌기: 입자(소금 종류마다 더 빨리)
  if (b.levels.b_collider) b.particles += h * (b.levels.b_collider ?? 0) * (1 + Object.values(b.salts).filter((v) => v > 0).length * 0.5);
}
