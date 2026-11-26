// 작업판(계정 과제)과 공로 상점.
// 과제 진행도는 저장된 상태에서 바로 계산한다(따로 세지 않음) → 기기·서버가 같은 값으로 판단한다.
import type { Account } from './state';
import { MAPS, STAMPS, WORLDS, DEEP_MAPS } from './data';
import { hash } from './companions';

export type TaskGroup = 'fight' | 'skill' | 'life';
export interface TaskDef {
  id: string; group: TaskGroup; name: string; unit: string;
  /** 단계별 목표 */
  tiers: number[];
  /** 단계마다 주는 공로 포인트 */
  merit: number[];
  /** 진행도 */
  value: (acc: Account) => number;
  /** 이 단계를 받으면 열리는 레시피(아이템 id) */
  recipes?: Record<number, string>;
  /** 이 과제가 실린 월드 작업판(없으면 1) */
  w?: number;
}
const sum = (acc: Account, f: (c: Account['characters'][number]) => number) => acc.characters.reduce((n, c) => n + f(c), 0);
const best = (acc: Account, f: (c: Account['characters'][number]) => number) => Math.max(0, ...acc.characters.map(f));

export const TASKS: TaskDef[] = [
  { id: 'kill_meadow', group: 'fight', name: '이슬 풀밭 정리', unit: '마리', tiers: [50, 400, 2500], merit: [1, 2, 4], value: (a) => sum(a, (c) => c.kills.meadow ?? 0), recipes: { 2: 'moss_ring' } },
  { id: 'kill_hills', group: 'fight', name: '자갈 언덕 정리', unit: '마리', tiers: [50, 400, 2500], merit: [1, 2, 4], value: (a) => sum(a, (c) => c.kills.hills ?? 0), recipes: { 1: 'bag_leather' } },
  { id: 'kill_forest', group: 'fight', name: '속삭임 숲 정리', unit: '마리', tiers: [50, 400, 2500], merit: [2, 3, 5], value: (a) => sum(a, (c) => c.kills.forest ?? 0) },
  { id: 'boss', group: 'fight', name: '이끼왕 토벌', unit: '번', tiers: [1, 5, 25], merit: [3, 4, 6], value: (a) => a.bosses.mossking ?? 0 },
  { id: 'mining', group: 'skill', name: '광부의 길', unit: 'Lv', tiers: [5, 15, 30], merit: [1, 2, 4], value: (a) => best(a, (c) => c.skills.mining.lv), recipes: { 1: 'pick_red' } },
  { id: 'chopping', group: 'skill', name: '나무꾼의 길', unit: 'Lv', tiers: [5, 15, 30], merit: [1, 2, 4], value: (a) => best(a, (c) => c.skills.chopping.lv), recipes: { 1: 'axe_red' } },
  { id: 'fishing', group: 'skill', name: '강태공의 길', unit: 'Lv', tiers: [5, 15, 30], merit: [1, 2, 4], value: (a) => best(a, (c) => c.skills.fishing?.lv ?? 1), recipes: { 2: 'rod_amber' } },
  { id: 'catching', group: 'skill', name: '곤충학자의 길', unit: 'Lv', tiers: [5, 15, 30], merit: [1, 2, 4], value: (a) => best(a, (c) => c.skills.catching?.lv ?? 1), recipes: { 2: 'net_amber' } },
  { id: 'smithing', group: 'skill', name: '대장장이의 길', unit: 'Lv', tiers: [5, 15, 30], merit: [1, 2, 4], value: (a) => best(a, (c) => c.skills.smithing.lv), recipes: { 1: 'sword_red' } },
  { id: 'forge', group: 'skill', name: '불을 다루는 법', unit: '단계', tiers: [1, 10, 30], merit: [1, 2, 4], value: (a) => (a.forge.owned ? 1 : 0) + Object.values(a.forge.up).reduce((n, v) => n + v, 0) },
  { id: 'levels', group: 'life', name: '함께 자라기', unit: 'Lv 합', tiers: [20, 60, 150], merit: [1, 2, 4], value: (a) => sum(a, (c) => c.level) },
  { id: 'party', group: 'life', name: '동료 모으기', unit: '명', tiers: [2, 3, 4], merit: [1, 1, 2], value: (a) => a.characters.length },
  { id: 'stamps', group: 'life', name: '우표 수집가', unit: 'Lv 합', tiers: [3, 20, 60], merit: [1, 2, 4], value: (a) => STAMPS.reduce((n, s) => n + (a.stamps[s.id] ?? 0), 0) },
  { id: 'cards', group: 'life', name: '카드 수집가', unit: '장', tiers: [3, 15, 50], merit: [1, 2, 4], value: (a) => Object.values(a.cards).reduce((n, v) => n + v, 0) },
];
// ───────── 원작처럼 월드마다 작업판, 과제마다 10단계 ─────────
/** 목표를 10단계로 늘린다(앞 단계는 그대로, 뒤는 점점 커진다). 공로도 함께 */
function tenTiers(t: TaskDef) {
  while (t.tiers.length < 10) { const n = t.tiers.length, last = t.tiers[n - 1]; t.tiers.push(t.unit === 'Lv' ? last + Math.max(5, Math.round(last * 0.25)) : Math.ceil(last * (n < 5 ? 2.5 : 2))); t.merit.push(Math.min(10, (t.merit[n - 1] ?? 1) + (n % 2))); }
}
const skillT = (w: number, k: string, name: string, base: number): TaskDef => ({ id: `w${w}_${k}`, w, group: 'skill', name, unit: 'Lv', tiers: [base, base + 10, base + 20], merit: [2, 3, 4], value: (a) => best(a, (c) => c.skills[k as 'mining']?.lv ?? 1) });
const killT = (w: number, map: string): TaskDef => ({ id: `kill_${map}`, w, group: 'fight', name: `${MAPS[map].name} 정리`, unit: '마리', tiers: [100 * w, 800 * w, 5000 * w], merit: [1 + w, 2 + w, 4 + w], value: (a) => sum(a, (c) => c.kills[map] ?? 0) });
const BOSSES: [number, string, string][] = [[2, 'sandlord', '사막 거상 토벌'], [3, 'frostlord', '눈보라 군주 토벌'], [4, 'nebtitan', '성운 거신 토벌']];
for (const w of [1, 2, 3, 4]) {
  const hunts = WORLDS[w - 1].maps.filter((m) => MAPS[m].spawns.length && !TASKS.some((t) => t.id === `kill_${m}`) && !DEEP_MAPS[w - 1].includes(m));
  for (const m of hunts) TASKS.push(killT(w, m));
  TASKS.push({ id: `deep_w${w}`, w, group: 'fight', name: `${w}월드 깊은 지역`, unit: '마리', tiers: [500, 5000, 30000], merit: [3, 4, 6], value: (a) => DEEP_MAPS[w - 1].reduce((n, m) => n + sum(a, (c) => c.kills[m] ?? 0), 0) });
}
for (const [w, id, name] of BOSSES) TASKS.push({ id: `boss_${id}`, w, group: 'fight', name, unit: '번', tiers: [1, 5, 25], merit: [4, 5, 7], value: (a) => a.bosses[id] ?? 0 });
TASKS.push(
  skillT(2, 'alchemy', '연금술사의 길', 5), skillT(2, 'fishing', '오아시스 강태공', 20), skillT(2, 'catching', '사막 곤충학자', 20),
  { id: 'w2_post', w: 2, group: 'life', name: '성실한 배달부', unit: '일', tiers: [1, 5, 15], merit: [2, 3, 5], value: (a) => Math.max(0, ...Object.values(a.postOff?.streak ?? {})) },
  { id: 'w2_bubbles', w: 2, group: 'life', name: '거품 발견', unit: '개', tiers: [20, 40, 70], merit: [2, 3, 5], value: (a) => Object.values(a.alch?.found ?? {}).reduce((n, v) => n + v, 0) },
  { id: 'w2_arcade', w: 2, group: 'life', name: '오락실 단골', unit: '번', tiers: [10, 100, 500], merit: [2, 3, 5], value: (a) => a.arcade?.shots ?? 0 },
  skillT(3, 'trapping', '덫 사냥꾼의 길', 5), skillT(3, 'worship', '기도하는 자', 5), skillT(3, 'construction', '건축가의 길', 5),
  { id: 'w3_build', w: 3, group: 'life', name: '마을 짓기', unit: 'Lv 합', tiers: [5, 30, 100], merit: [2, 3, 5], value: (a) => Object.values(a.build?.levels ?? {}).reduce((n, v) => n + v, 0) },
  { id: 'w3_shiny', w: 3, group: 'life', name: '반짝이는 덫', unit: '마리', tiers: [1, 20, 100], merit: [2, 3, 5], value: (a) => Object.values(a.shinies ?? {}).reduce((n, v) => n + v, 0) },
  { id: 'w3_souls', w: 3, group: 'life', name: '영혼 모으기', unit: 'Lv 합', tiers: [5, 40, 150], merit: [2, 3, 5], value: (a) => Object.values(a.worship?.prayers ?? {}).reduce((n, v) => n + v, 0) },
  skillT(4, 'cooking', '요리사의 길', 5), skillT(4, 'lab', '연구원의 길', 5), skillT(4, 'breeding', '사육사의 길', 5),
  { id: 'w4_meals', w: 4, group: 'life', name: '요리 레시피', unit: '가지', tiers: [5, 20, 40], merit: [2, 3, 5], value: (a) => a.cook?.found.length ?? 0 },
  { id: 'w4_pets', w: 4, group: 'life', name: '펫 키우기', unit: '마리', tiers: [3, 12, 24], merit: [2, 3, 5], value: (a) => a.breed?.pets.length ?? 0 },
  { id: 'w4_rift', w: 4, group: 'life', name: '균열 너머', unit: '웨이브', tiers: [3, 8, 15], merit: [3, 4, 6], value: (a) => a.riftBest ?? 0 },
);
for (const t of TASKS) tenTiers(t);
export const TASK_BY_ID: Record<string, TaskDef> = Object.fromEntries(TASKS.map((t) => [t.id, t]));
export const tasksOf = (w: number) => TASKS.filter((t) => (t.w ?? 1) === w);

// ───────── 일일 과제: 하루 네 개, 계정 씨앗 + 날짜로 정해진다(그날 처음 볼 때 기준값을 잰다) ─────────
export interface DailyTask { map: string; n: number; base: number; done: boolean }
export interface Daily { day: string; list: DailyTask[] }
export const DAILY_COUNT = 4;
const mapKills = (a: Account, map: string) => sum(a, (c) => c.kills[map] ?? 0);
export function dailyRefresh(acc: Account, day: string) {
  acc.daily ??= { day: '', list: [] };
  if (acc.daily.day === day) return;
  const pool = WORLDS.flatMap((w) => w.maps).filter((m) => MAPS[m].spawns.length && acc.characters.some((c) => (c.kills[m] ?? 0) > 0));
  const seed = hash((acc.petSeed ^ [...day].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)) >>> 0);
  const list: DailyTask[] = [];
  const left = [...pool];
  for (let i = 0; i < DAILY_COUNT && left.length; i++) {
    const map = left.splice(hash((seed + i * 977) >>> 0) % left.length, 1)[0];
    list.push({ map, n: 100 + 50 * i, base: mapKills(acc, map), done: false });
  }
  acc.daily = { day, list };
}
export const dailyProgress = (acc: Account, t: DailyTask) => Math.max(0, mapKills(acc, t.map) - t.base);
/** 일일 과제 보상: 공로 1 + 코인(계정 최고 레벨 × 200) */
export function claimDaily(acc: Account, i: number, day: string): string | null {
  dailyRefresh(acc, day);
  const t = acc.daily!.list[i];
  if (!t) return '없는 과제';
  if (t.done) return '이미 받았습니다';
  if (dailyProgress(acc, t) < t.n) return '아직 목표에 못 미쳤습니다';
  t.done = true;
  acc.merit += 1;
  acc.coins += 200 * Math.max(1, ...acc.characters.map((c) => c.level));
  return null;
}
export const TASK_GROUP_NAMES: Record<TaskGroup, string> = { fight: '전투', skill: '기술', life: '생활' };

/** 받은 단계 수 */
export const taskDone = (acc: Account, id: string) => acc.tasks[id] ?? 0;

/** 다음 단계 보상 받기 */
export function claimTask(acc: Account, id: string): string | null {
  const t = TASK_BY_ID[id];
  if (!t) return '없는 과제';
  const done = taskDone(acc, id);
  if (done >= t.tiers.length) return '모두 마쳤습니다';
  if (t.value(acc) < t.tiers[done]) return '아직 목표에 못 미쳤습니다';
  acc.tasks[id] = done + 1;
  acc.merit += t.merit[done];
  return null;
}

/** 레시피가 작업판으로 잠겨 있으면 그 이유 */
export function recipeTaskLock(acc: Account, item: string): string | null {
  for (const t of TASKS) for (const [tier, it] of Object.entries(t.recipes ?? {})) {
    if (it === item && taskDone(acc, t.id) < +tier) return `작업판 "${t.name}" ${tier}단계 보상`;
  }
  return null;
}

// ───────── 공로 상점 ─────────
export type MeritEff = 'storage' | 'afk' | 'drop' | 'xp' | 'teleport' | 'coins' | 'bag' | 'card' | 'key' | 'mats' | 'skillxp' | 'stars';
export interface MeritDef { id: MeritEff; name: string; per: number; max: number; cost: number; grow: number; desc: (v: number) => string }
export const MERITS: MeritDef[] = [
  { id: 'storage', name: '창고 선반', per: 4, max: 10, cost: 1, grow: 1, desc: (v) => `계정 창고 +${v}칸` },
  { id: 'coins', name: '두둑한 지갑', per: 0.03, max: 10, cost: 1, grow: 1, desc: (v) => `코인 획득 +${Math.round(v * 100)}%` },
  { id: 'afk', name: '느긋한 마음', per: 0.01, max: 10, cost: 2, grow: 1, desc: (v) => `방치 효율 +${Math.round(v * 100)}%p` },
  { id: 'drop', name: '날카로운 눈', per: 0.02, max: 10, cost: 2, grow: 1, desc: (v) => `드롭률 +${Math.round(v * 100)}%` },
  { id: 'xp', name: '배움의 기쁨', per: 0.02, max: 10, cost: 2, grow: 1, desc: (v) => `경험치 +${Math.round(v * 100)}%` },
  { id: 'teleport', name: '길잡이 표지판', per: 2, max: 5, cost: 3, grow: 1, desc: (v) => `잡화점 순간이동 티켓 하루 구매 +${v}장` },
  { id: 'bag', name: '큰 배낭', per: 2, max: 10, cost: 3, grow: 1, desc: (v) => `모든 캐릭터 가방 +${v}칸` },
  { id: 'card', name: '카드 수집 요령', per: 0.03, max: 10, cost: 2, grow: 1, desc: (v) => `카드 드롭률 +${Math.round(v * 100)}%` },
  { id: 'key', name: '열쇠 냄새', per: 0.4, max: 5, cost: 3, grow: 1, desc: (v) => `보스 열쇠 드롭 +${Math.round(v * 100)}%` },
  { id: 'mats', name: '꼼꼼한 손질', per: 0.02, max: 10, cost: 2, grow: 1, desc: (v) => `몬스터 재료 드롭 +${Math.round(v * 100)}%` },
  { id: 'skillxp', name: '손에 익은 일', per: 0.03, max: 10, cost: 2, grow: 1, desc: (v) => `채집 효율 +${Math.round(v * 100)}%` },
  { id: 'stars', name: '별빛 공부', per: 1, max: 10, cost: 4, grow: 1, desc: (v) => `별빛 특성 포인트 +${v}` },
];
export const MERIT_BY_ID = Object.fromEntries(MERITS.map((m) => [m.id, m])) as Record<MeritEff, MeritDef>;
export const meritLv = (acc: Partial<Pick<Account, 'meritShop'>>, id: MeritEff) => acc.meritShop?.[id] ?? 0;
export const meritValue = (acc: Partial<Pick<Account, 'meritShop'>>, id: MeritEff) => meritLv(acc, id) * MERIT_BY_ID[id].per;
export const meritCost = (acc: Account, id: MeritEff) => MERIT_BY_ID[id].cost + meritLv(acc, id) * MERIT_BY_ID[id].grow;

export function buyMerit(acc: Account, id: MeritEff): string | null {
  const m = MERIT_BY_ID[id];
  if (!m) return '없는 항목';
  if (meritLv(acc, id) >= m.max) return '최대 단계입니다';
  const cost = meritCost(acc, id);
  if (acc.merit < cost) return '공로 포인트가 부족합니다';
  acc.merit -= cost;
  acc.meritShop[id] = meritLv(acc, id) + 1;
  if (id === 'bag') for (const c of acc.characters) c.meritBag = meritValue(acc, 'bag');
  return null;
}
