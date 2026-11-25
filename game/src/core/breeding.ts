// 번식(4월드): 성운 정거장의 번식 둥지. 원작처럼 번식은 캐릭터 기술(사육사)이다.
//  · 사육사: 성운 정거장에 머무는 캐릭터를 둥지에 세우면 번식 레벨만큼 알이 빨리 나오고 번식 경험치를 얻는다. 열리는 종·영역은 가장 높은 번식 레벨 기준.
//  · 알 등급 11가지, 알은 약 2시간마다. 놓아준 펫은 DNA가 되고, 둥지 개량은 DNA와 요리로 한다.
//  · 영역: 한 바퀴마다 그 영역의 적과 싸워 이기면 향신료(질 수도 있다). 펫 아레나: 팀으로 몇 웨이브까지 버티는지 겨뤄 계정 보너스.
//  · 둥지: 시간이 지나면 알을 낳는다(칸이 차면 멈춤). 알은 등급(일반·희귀·영웅·전설)이 있고, 깨면 펫이 나온다.
//  · 펫: 종(번식 레벨로 열림)·힘·유전자. 같은 종이라도 힘과 유전자가 다르다.
//  · 울타리: 펫을 넣어 두면 그 종의 '반짝임'이 시간에 따라 오르고, 반짝임 레벨이 계정 전체 보너스가 된다.
//  · 영역: 영역마다 펫을 최대 4마리 보내면 팀의 힘만큼 빨리 영역을 돌고, 한 바퀴마다 그 맵의 향신료(요리)를 가져온다.
//  · 번식 레벨: 알을 깨고 영역을 돌 때마다 오르고, 새 종과 영역이 열린다.
//  · 결과는 계정에 저장된 씨앗으로 정해져 기기와 서버가 같다.
import { BonusKey, classSkillMult } from './data';
import type { Account, Character } from './state';
import { gainSkillXp } from './state';
import { atStation, labMult, STATION_MAP } from './lab';

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

export const RARITY_MULT = [1, 1.6, 2.6, 4.2, 6.5, 10, 15, 22, 32, 46, 65];
export const RAR_NAMES = ['일반', '희귀', '영웅', '전설', '신화', '별빛', '은하', '초월', '영원', '태초', '절대'];
export const BREED = {
  eggSecs: 7200, nestBase: 3, fenceBase: 3, petMax: 24, teamMax: 4,
  /** 영역 한 바퀴(초): 팀 힘이 요구 힘과 같을 때 */
  lapSecs: 1800,
  shinyMax: 20,
  /** 개량: DNA(놓아준 펫) + 요리 접시 */
  up: {
    nest: { max: 7, dna: 30, grow: 2.0, meal: 'm_bun' },
    speed: { max: 20, dna: 20, grow: 1.4, meal: 'm_cookie' },
    rarity: { max: 20, dna: 40, grow: 1.45, meal: 'm_cake' },
    fence: { max: 5, dna: 80, grow: 2.4, meal: 'm_steak' },
  },
};
export type BreedUp = keyof typeof BREED.up;

export interface BPet { uid: number; sp: string; power: number; gene: GeneId; rar: number }
export interface Breed {
  t: number; seed: number; lv: number; xp: number; eggs: number[]; eggFrac: number; next: number;
  pets: BPet[]; fence: number[]; shiny: Record<string, { lv: number; h: number }>;
  terr: Record<string, { team: number[]; prog: number; laps: number; wins?: number }>;
  up: Record<BreedUp, number>;
  /** 놓아준 펫에서 얻은 DNA, 사육사, 펫 아레나 */
  dna: number; keepers: number[]; kxp: Record<number, number>; arena: { team: number[]; best: number; t: number };
}
export const newBreed = (seed = 12345): Breed => ({ t: 0, seed: seed >>> 0 || 1, lv: 1, xp: 0, eggs: [], eggFrac: 0, next: 1, pets: [], fence: [], shiny: {}, terr: {}, up: { nest: 0, speed: 0, rarity: 0, fence: 0 },
  dna: 0, keepers: [], kxp: {}, arena: { team: [], best: 0, t: 0 } });
export function fixBreed(b: Breed) { b.dna ??= 0; b.keepers ??= []; b.kxp ??= {}; b.arena ??= { team: [], best: 0, t: 0 }; }
type BAcc = Pick<Account, 'breed'> & Partial<Pick<Account, 'characters' | 'lab' | 'cook'>>;
/** 열리는 종·영역의 기준: 캐릭터 가운데 가장 높은 번식 레벨(예전 저장의 계정 번식 레벨도 존중) */
export const breedLevel = (acc: BAcc) => Math.max(acc.breed.lv, ...(acc.characters ?? []).map((c) => c.skills.breeding?.lv ?? 1));
const keepersOf = (acc: BAcc) => (acc.characters ?? []).filter((c) => acc.breed.keepers?.includes(c.id) && atStation(acc, c.id));
/** 사육사 배율: 사육사마다 번식 레벨 × 2% (직업 연결 반영) */
export const keeperMult = (acc: BAcc) => 1 + keepersOf(acc).reduce((s, c) => s + (c.skills.breeding?.lv ?? 1) * 0.02 * classSkillMult(c, 'breed'), 0);
/** 번식 경험치: 사육사에게 나눠 주고, 없으면 행동한 캐릭터에게 */
function giveXp(acc: BAcc, n: number, actor?: Character) {
  const ks = keepersOf(acc), to = ks.length ? ks : actor ? [actor] : [];
  for (const c of to) {
    const x = n / to.length * classSkillMult(c, 'breed') + (acc.breed.kxp[c.id] ?? 0), whole = Math.floor(x);
    acc.breed.kxp[c.id] = x - whole;
    if (whole > 0) gainSkillXp(c, 'breeding', whole);
  }
}

/** 씨앗을 한 칸 굴린 0~1 값 */
function rand(b: Breed): number {
  let t = (b.seed = (b.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const breedXpToNext = (lv: number) => Math.floor(30 * Math.pow(lv, 1.4));

export const nestCap = (b: Breed) => BREED.nestBase + b.up.nest;
export const fenceCap = (b: Breed) => BREED.fenceBase + b.up.fence;
const petOf = (b: Breed, uid: number) => b.pets.find((p) => p.uid === uid);
/** 시간당 알 수 */
export const eggRate = (b: Breed) => (3600 / BREED.eggSecs) * (1 + b.up.speed * 0.1) * (1 + 0.15 * b.fence.filter((u) => petOf(b, u)?.gene === 'nester').length);
/** 알 등급 확률(등급 1~10, 0은 일반): 등급마다 3분의 1씩 드물어진다 */
export const rarityOdds = (b: Breed) => { const k = 1 + b.up.rarity * 0.1; return Array.from({ length: RARITY_MULT.length - 1 }, (_, i) => 0.2 * Math.pow(0.33, i) * k); };
export const upCost = (b: Breed, k: BreedUp) => { const d = BREED.up[k], lv = b.up[k]; return { dna: Math.round(d.dna * Math.pow(d.grow, lv)), meal: d.meal, n: Math.ceil(5 * Math.pow(1.5, lv)) }; };
export const shinyNeed = (lv: number) => 4 * Math.pow(1.6, lv);
/** 펫이 어디 있는지: 'fence' | 영역 id | null */
export function placeOf(b: Breed, uid: number): string | null {
  if (b.fence.includes(uid)) return 'fence';
  for (const [id, t] of Object.entries(b.terr)) if (t.team.includes(uid)) return id;
  return null;
}
/** 영역 싸움에서 이길 확률 */
export const winChance = (power: number, need: number) => Math.min(0.95, power / (power + need * 0.5));
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
  fixBreed(b);
  if (!b.t) { b.t = now; return; }
  if (now <= b.t) return;
  const h = (now - b.t) / 3_600_000;
  b.t = now;
  // 알
  b.eggFrac += eggRate(b) * labMult(acc, 'nest') * keeperMult(acc) * h;
  const odds = rarityOdds(b);
  while (b.eggFrac >= 1 && b.eggs.length < nestCap(b)) {
    b.eggFrac -= 1;
    // 높은 등급부터 굴린다
    const r = rand(b);
    let rar = 0, acc2 = 0;
    for (let i = odds.length - 1; i >= 0; i--) { acc2 += odds[i]; if (r < acc2) { rar = i + 1; break; } }
    b.eggs.push(rar);
  }
  // 사육사: 시간마다 번식 경험치
  giveXp(acc, h * 10);
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
      // 한 바퀴마다 영역의 적과 싸운다: 팀 힘이 셀수록 잘 이긴다(진 바퀴는 빈손)
      const p = winChance(teamPower(b, t.id), t.need);
      let wins = 0;
      for (let k = 0; k < Math.min(laps, 500); k++) if (rand(b) < p) wins++;
      if (laps > 500) wins += Math.round((laps - 500) * p);
      st.wins = (st.wins ?? 0) + wins;
      acc.cook.spices[t.spice] = (acc.cook.spices[t.spice] ?? 0) + Math.floor(wins * spicePerLap(b, t.id) * labMult(acc, 'spice'));
      giveXp(acc, wins * (10 + i * 10));
    }
  });
}

export function hatchEgg(acc: Account, now: number, actor?: Character): string | null {
  breedSettle(acc, now);
  const b = acc.breed;
  if (!b.eggs.length) return '깰 알이 없습니다';
  if (b.pets.length >= BREED.petMax) return '펫 자리가 가득 찼습니다(놓아주기)';
  const rar = b.eggs.sort((x, y) => y - x).shift()!; // 좋은 알부터
  const lv = breedLevel(acc), open = SPECIES.filter((s) => s.lv <= lv);
  const sp = open[Math.floor(rand(b) * open.length)];
  const power = Math.round(sp.power * RARITY_MULT[rar] * (0.7 + rand(b) * 0.6));
  const gene = GENE_IDS[Math.floor(rand(b) * GENE_IDS.length)];
  b.pets.push({ uid: b.next++, sp: sp.id, power, gene, rar });
  giveXp(acc, 5 * (rar + 1) * (rar + 1), actor);
  return null;
}
export const dnaOf = (p: BPet) => Math.ceil((p.power * (p.rar + 1)) / 10);
const unplace = (b: Breed, uid: number) => {
  b.arena.team = b.arena.team.filter((u) => u !== uid);
  b.fence = b.fence.filter((u) => u !== uid);
  for (const t of Object.values(b.terr)) t.team = t.team.filter((u) => u !== uid);
};
export function releasePet(acc: Account, uid: number, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed;
  const p = petOf(b, uid);
  if (!p) return '없는 펫';
  unplace(b, uid);
  b.pets = b.pets.filter((x) => x.uid !== uid);
  // 놓아준 펫은 DNA가 된다(힘과 등급이 높을수록 많이)
  b.dna += dnaOf(p);
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
  if (breedLevel(acc) < t.lv) return `번식 Lv.${t.lv}에 열립니다`;
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
  const cost = upCost(b, k), meal = acc.cook.meals[cost.meal];
  if (b.dna < cost.dna) return 'DNA가 부족합니다(펫을 놓아주면 얻습니다)';
  if ((meal?.n ?? 0) < cost.n) return '요리가 부족합니다';
  b.dna -= cost.dna; meal!.n -= cost.n; b.up[k]++;
  return null;
}
// ───────── 사육사·펫 아레나 ─────────
/** 이 캐릭터를 사육사로 세우거나 빼기(성운 정거장에 있어야, 요리사·연구원과 겸하지 못함) */
export function toggleKeeper(acc: Account, c: Character, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed, i = b.keepers.indexOf(c.id);
  if (i >= 0) { b.keepers.splice(i, 1); return null; }
  if (c.mapId !== STATION_MAP) return '성운 정거장에 있어야 사육사로 설 수 있습니다';
  b.keepers.push(c.id);
  acc.cook.chefs = acc.cook.chefs.filter((x) => x !== c.id);
  acc.lab.members = acc.lab.members.filter((m) => m.id !== c.id);
  return null;
}
export const ARENA_TEAM = 4, ARENA_COOLDOWN = 3_600_000;
export const arenaWave = (w: number) => Math.round(30 * Math.pow(1.3, w));
export function toggleArena(acc: Account, uid: number, now: number): string | null {
  breedSettle(acc, now);
  const b = acc.breed;
  if (!petOf(b, uid)) return '없는 펫';
  if (b.arena.team.includes(uid)) { b.arena.team = b.arena.team.filter((u) => u !== uid); return null; }
  if (b.arena.team.length >= ARENA_TEAM) return `아레나 팀은 ${ARENA_TEAM}마리까지`;
  b.arena.team.push(uid);
  return null;
}
export const arenaPower = (b: Breed) => { const team = b.arena.team.map((u) => petOf(b, u)).filter((p): p is BPet => !!p); return team.reduce((s, p) => s + p.power * (p.gene === 'fighter' ? 1.5 : 1), 0) * (team.some((p) => p.gene === 'swift') ? 1.2 : 1); };
/** 아레나 한 판: 웨이브마다 운을 섞어 겨루고, 진 웨이브 전까지가 기록. 한 시간에 한 번 */
export function fightArena(acc: Account, now: number): number | string {
  breedSettle(acc, now);
  const b = acc.breed;
  if (!b.arena.team.length) return '아레나 팀을 먼저 꾸리세요';
  if (b.arena.t && now - b.arena.t < ARENA_COOLDOWN) return '펫들이 쉬는 중입니다(한 시간에 한 번)';
  b.arena.t = now;
  const pw = arenaPower(b);
  let w = 0;
  while (w < 200 && pw * (0.8 + rand(b) * 0.4) >= arenaWave(w)) w++;
  b.arena.best = Math.max(b.arena.best, w);
  return w;
}
export function breedBonus(b: Breed | undefined, add: (k: BonusKey, v: number) => void) {
  if (!b) return;
  for (const s of SPECIES) { const lv = b.shiny[s.id]?.lv ?? 0; if (lv) add(s.eff, lv * s.per); }
  // 펫 아레나 최고 기록: 웨이브마다 공격력 +0.5%, 방어력 +0.5
  if (b.arena?.best) { add('dmg', b.arena.best * 0.5); add('def', b.arena.best * 0.5); }
}
