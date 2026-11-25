// 번식(4월드, 계정 공용): 성운 정거장의 번식 둥지.
//  · 둥지: 시간이 지나면 알을 낳는다(칸이 차면 멈춤). 알은 등급(일반·희귀·영웅·전설)이 있고, 깨면 펫이 나온다.
//  · 펫: 종(번식 레벨로 열림)·힘·유전자. 같은 종이라도 힘과 유전자가 다르다.
//  · 울타리: 펫을 넣어 두면 그 종의 '반짝임'이 시간에 따라 오르고, 반짝임 레벨이 계정 전체 보너스가 된다.
//  · 영역: 영역마다 펫을 최대 4마리 보내면 팀의 힘만큼 빨리 영역을 돌고, 한 바퀴마다 그 맵의 향신료(요리)를 가져온다.
//  · 번식 레벨: 알을 깨고 영역을 돌 때마다 오르고, 새 종과 영역이 열린다.
//  · 결과는 계정에 저장된 씨앗으로 정해져 기기와 서버가 같다.
import { BonusKey } from './data';
import type { Account } from './state';
import { labMult } from './lab';

export interface SpeciesDef { id: string; name: string; lv: number; power: number; eff: BonusKey; per: number; unit: string; color: string }
export const SPECIES: SpeciesDef[] = [
  { id: 'b_puff', name: '별솜뭉치', lv: 1, power: 10, eff: 'hpPct', per: 1, unit: '%', color: '#f6e08a' },
  { id: 'b_crab', name: '운석게', lv: 3, power: 14, eff: 'mining', per: 2, unit: '%', color: '#a8543a' },
  { id: 'b_jelly', name: '아기해파리', lv: 6, power: 18, eff: 'fishing', per: 2, unit: '%', color: '#ff9ae0' },
  { id: 'b_owlet', name: '고리올빼미', lv: 10, power: 24, eff: 'xp', per: 1, unit: '%', color: '#c89a5a' },
  { id: 'b_kit', name: '꼬마혜성여우', lv: 14, power: 30, eff: 'drop', per: 1, unit: '%', color: '#7ac0f0' },
  { id: 'b_imp', name: '공허 꼬마', lv: 18, power: 38, eff: 'afk', per: 0.2, unit: '%p', color: '#6a4aa8' },
  { id: 'b_moss', name: '이끼 젤리', lv: 23, power: 48, eff: 'chopping', per: 2, unit: '%', color: '#58b552' },
  { id: 'b_bean', name: '선인장콩', lv: 28, power: 60, eff: 'catching', per: 2, unit: '%', color: '#4a9a3a' },
  { id: 'b_peng', name: '눈펭이', lv: 33, power: 75, eff: 'coins', per: 2, unit: '%', color: '#4e8de2' },
  { id: 'b_golem', name: '작은 골렘', lv: 40, power: 95, eff: 'def', per: 3, unit: '', color: '#8aaed0' },
  { id: 'b_drake', name: '성운 용', lv: 47, power: 120, eff: 'dmg', per: 1, unit: '%', color: '#c87aff' },
  { id: 'b_titan', name: '꼬마 거신', lv: 55, power: 150, eff: 'luk', per: 4, unit: '', color: '#5a4ab8' },
];
export const SPEC: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export type GeneId = 'fighter' | 'forager' | 'shiny' | 'swift' | 'nester';
export const GENES: Record<GeneId, { name: string; desc: string }> = {
  fighter: { name: '싸움꾼', desc: '영역에서 힘 ×1.5' },
  forager: { name: '채집꾼', desc: '이 펫이 있는 영역은 향신료 ×2' },
  shiny: { name: '반짝이', desc: '울타리에서 반짝임 ×2' },
  swift: { name: '날쌘돌이', desc: '이 펫이 있는 영역은 팀 전체 힘 +20%' },
  nester: { name: '둥지지기', desc: '울타리에 있으면 알 낳는 속도 +15%' },
};
const GENE_IDS = Object.keys(GENES) as GeneId[];

export interface TerritoryDef { id: string; name: string; lv: number; need: number; spice: string }
export const TERRITORIES: TerritoryDef[] = [
  { id: 't_dust', name: '달먼지 평원', lv: 1, need: 30, spice: 'sp_dust' },
  { id: 't_crater', name: '운석 구덩이', lv: 5, need: 70, spice: 'sp_salt' },
  { id: 't_nebula', name: '성운 안개', lv: 10, need: 140, spice: 'sp_honey' },
  { id: 't_rock', name: '소행성 띠', lv: 16, need: 260, spice: 'sp_pepper' },
  { id: 't_rings', name: '고리 행성', lv: 24, need: 450, spice: 'sp_cinna' },
  { id: 't_comet', name: '혜성 꼬리', lv: 32, need: 750, spice: 'sp_mint' },
  { id: 't_void', name: '공허의 끝', lv: 40, need: 1200, spice: 'sp_vanilla' },
];
export const TERR: Record<string, TerritoryDef> = Object.fromEntries(TERRITORIES.map((t) => [t.id, t]));

export const RARITY_MULT = [1, 1.6, 2.6, 4.2];
export const BREED = {
  eggSecs: 3600, nestBase: 3, fenceBase: 3, petMax: 24, teamMax: 4,
  /** 영역 한 바퀴(초): 팀 힘이 요구 힘과 같을 때 */
  lapSecs: 1800,
  shinyMax: 20,
  up: {
    nest: { max: 7, cost: 20000, grow: 2.2 },
    speed: { max: 20, cost: 15000, grow: 1.45 },
    rarity: { max: 20, cost: 25000, grow: 1.5 },
    fence: { max: 5, cost: 50000, grow: 2.6 },
  },
};
export type BreedUp = keyof typeof BREED.up;

export interface BPet { uid: number; sp: string; power: number; gene: GeneId; rar: number }
export interface Breed {
  t: number; seed: number; lv: number; xp: number; eggs: number[]; eggFrac: number; next: number;
  pets: BPet[]; fence: number[]; shiny: Record<string, { lv: number; h: number }>;
  terr: Record<string, { team: number[]; prog: number; laps: number }>;
  up: Record<BreedUp, number>;
}
export const newBreed = (seed = 12345): Breed => ({ t: 0, seed: seed >>> 0 || 1, lv: 1, xp: 0, eggs: [], eggFrac: 0, next: 1, pets: [], fence: [], shiny: {}, terr: {}, up: { nest: 0, speed: 0, rarity: 0, fence: 0 } });

/** 씨앗을 한 칸 굴린 0~1 값 */
function rand(b: Breed): number {
  let t = (b.seed = (b.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const breedXpToNext = (lv: number) => Math.floor(30 * Math.pow(lv, 1.4));
const gainXp = (b: Breed, n: number) => { b.xp += n; while (b.xp >= breedXpToNext(b.lv)) { b.xp -= breedXpToNext(b.lv); b.lv++; } };

export const nestCap = (b: Breed) => BREED.nestBase + b.up.nest;
export const fenceCap = (b: Breed) => BREED.fenceBase + b.up.fence;
const petOf = (b: Breed, uid: number) => b.pets.find((p) => p.uid === uid);
/** 시간당 알 수 */
export const eggRate = (b: Breed) => (3600 / BREED.eggSecs) * (1 + b.up.speed * 0.1) * (1 + 0.15 * b.fence.filter((u) => petOf(b, u)?.gene === 'nester').length);
/** 알 등급 확률(희귀·영웅·전설) */
export const rarityOdds = (b: Breed) => { const k = 1 + b.up.rarity * 0.1; return [0.15 * k, 0.04 * k, 0.008 * k]; };
export const shinyNeed = (lv: number) => 4 * Math.pow(1.6, lv);
export const upCostOf = (b: Breed, k: BreedUp) => Math.round(BREED.up[k].cost * Math.pow(BREED.up[k].grow, b.up[k]));
/** 펫이 어디 있는지: 'fence' | 영역 id | null */
export function placeOf(b: Breed, uid: number): string | null {
  if (b.fence.includes(uid)) return 'fence';
  for (const [id, t] of Object.entries(b.terr)) if (t.team.includes(uid)) return id;
  return null;
}
/** 팀 힘(유전자 반영) */
export function teamPower(b: Breed, tid: string): number {
  const team = (b.terr[tid]?.team ?? []).map((u) => petOf(b, u)).filter((p): p is BPet => !!p);
  const base = team.reduce((s, p) => s + p.power * (p.gene === 'fighter' ? 1.5 : 1), 0);
  return base * (team.some((p) => p.gene === 'swift') ? 1.2 : 1);
}
/** 한 바퀴에 가져오는 향신료(원작처럼 향신료는 영역에서만 나므로 넉넉히) */
export const spicePerLap = (b: Breed, tid: string) => ((b.terr[tid]?.team ?? []).some((u) => petOf(b, u)?.gene === 'forager') ? 2 : 1) * 5 * (1 + Math.floor(TERRITORIES.findIndex((t) => t.id === tid) / 2));

export function breedSettle(acc: Pick<Account, 'breed' | 'cook'> & Partial<Pick<Account, 'lab' | 'characters'>>, now: number) {
  const b = acc.breed;
  if (!b.t) { b.t = now; return; }
  if (now <= b.t) return;
  const h = (now - b.t) / 3_600_000;
  b.t = now;
  // 알
  b.eggFrac += eggRate(b) * labMult(acc, 'nest') * h;
  const odds = rarityOdds(b);
  while (b.eggFrac >= 1 && b.eggs.length < nestCap(b)) {
    b.eggFrac -= 1;
    const r = rand(b);
    b.eggs.push(r < odds[2] ? 3 : r < odds[2] + odds[1] ? 2 : r < odds[2] + odds[1] + odds[0] ? 1 : 0);
  }
  if (b.eggs.length >= nestCap(b)) b.eggFrac = Math.min(b.eggFrac, 1);
  // 울타리: 종마다 반짝임
  for (const uid of b.fence) {
    const p = petOf(b, uid);
    if (!p) continue;
    const s = (b.shiny[p.sp] ??= { lv: 0, h: 0 });
    if (s.lv >= BREED.shinyMax) continue;
    s.h += h * (p.gene === 'shiny' ? 2 : 1);
    while (s.lv < BREED.shinyMax && s.h >= shinyNeed(s.lv)) { s.h -= shinyNeed(s.lv); s.lv++; }
  }
  // 영역
  TERRITORIES.forEach((t, i) => {
    const st = b.terr[t.id];
    if (!st || !st.team.length) return;
    st.prog += (h * 3600 * teamPower(b, t.id)) / t.need;
    const laps = Math.floor(st.prog / BREED.lapSecs);
    if (laps > 0) {
      st.prog -= laps * BREED.lapSecs; st.laps += laps;
      acc.cook.spices[t.spice] = (acc.cook.spices[t.spice] ?? 0) + Math.floor(laps * spicePerLap(b, t.id) * labMult(acc, 'spice'));
      gainXp(b, laps * (10 + i * 10));
    }
  });
}

export function hatchEgg(acc: Account, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed;
  if (!b.eggs.length) return '깰 알이 없습니다';
  if (b.pets.length >= BREED.petMax) return '펫 자리가 가득 찼습니다(놓아주기)';
  const rar = b.eggs.sort((x, y) => y - x).shift()!; // 좋은 알부터
  const open = SPECIES.filter((s) => s.lv <= b.lv);
  const sp = open[Math.floor(rand(b) * open.length)];
  const power = Math.round(sp.power * RARITY_MULT[rar] * (0.7 + rand(b) * 0.6));
  const gene = GENE_IDS[Math.floor(rand(b) * GENE_IDS.length)];
  b.pets.push({ uid: b.next++, sp: sp.id, power, gene, rar });
  gainXp(b, 5 * (rar + 1) * (rar + 1));
  return null;
}
const unplace = (b: Breed, uid: number) => {
  b.fence = b.fence.filter((u) => u !== uid);
  for (const t of Object.values(b.terr)) t.team = t.team.filter((u) => u !== uid);
};
export function releasePet(acc: Account, uid: number, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed;
  if (!petOf(b, uid)) return '없는 펫';
  unplace(b, uid);
  b.pets = b.pets.filter((p) => p.uid !== uid);
  gainXp(b, 2);
  return null;
}
export function toggleFence(acc: Account, uid: number, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed;
  if (!petOf(b, uid)) return '없는 펫';
  if (b.fence.includes(uid)) { b.fence = b.fence.filter((u) => u !== uid); return null; }
  if (b.fence.length >= fenceCap(b)) return '울타리가 가득 찼습니다';
  unplace(b, uid); b.fence.push(uid);
  return null;
}
export function toggleTeam(acc: Account, uid: number, tid: string, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed, t = TERR[tid];
  if (!petOf(b, uid) || !t) return '없는 펫';
  if (b.lv < t.lv) return `번식 Lv.${t.lv}에 열립니다`;
  const st = (b.terr[tid] ??= { team: [], prog: 0, laps: 0 });
  if (st.team.includes(uid)) { st.team = st.team.filter((u) => u !== uid); return null; }
  if (st.team.length >= BREED.teamMax) return `한 영역에는 ${BREED.teamMax}마리까지`;
  unplace(b, uid); st.team.push(uid);
  return null;
}
export function upBreed(acc: Account, k: BreedUp, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed, d = BREED.up[k];
  if (!d) return '없는 항목';
  if (b.up[k] >= d.max) return '최대 단계입니다';
  const cost = upCostOf(b, k);
  if (acc.coins < cost) return '코인이 부족합니다';
  acc.coins -= cost; b.up[k]++;
  return null;
}
export function breedBonus(b: Breed | undefined, add: (k: BonusKey, v: number) => void) {
  if (!b) return;
  for (const s of SPECIES) { const lv = b.shiny[s.id]?.lv ?? 0; if (lv) add(s.eff, lv * s.per); }
}
