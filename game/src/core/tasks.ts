// 작업판(계정 과제)과 공로 상점.
// 과제 진행도는 저장된 상태에서 바로 계산한다(따로 세지 않음) → 기기·서버가 같은 값으로 판단한다.
import type { Account } from './state';
import { STAMPS } from './data';

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
}
const sum = (acc: Account, f: (c: Account['characters'][number]) => number) => acc.characters.reduce((n, c) => n + f(c), 0);
const best = (acc: Account, f: (c: Account['characters'][number]) => number) => Math.max(0, ...acc.characters.map(f));

export const TASKS: TaskDef[] = [
  { id: 'kill_meadow', group: 'fight', name: '이슬 풀밭 정리', unit: '마리', tiers: [50, 400, 2500], merit: [1, 2, 4], value: (a) => sum(a, (c) => c.kills.meadow ?? 0), recipes: { 2: 'moss_ring' } },
  { id: 'kill_hills', group: 'fight', name: '돌무더기 언덕 정리', unit: '마리', tiers: [50, 400, 2500], merit: [1, 2, 4], value: (a) => sum(a, (c) => c.kills.hills ?? 0), recipes: { 1: 'bag_leather' } },
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
export const TASK_BY_ID: Record<string, TaskDef> = Object.fromEntries(TASKS.map((t) => [t.id, t]));
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
export type MeritEff = 'storage' | 'afk' | 'drop' | 'xp' | 'teleport' | 'coins';
export interface MeritDef { id: MeritEff; name: string; per: number; max: number; cost: number; grow: number; desc: (v: number) => string }
export const MERITS: MeritDef[] = [
  { id: 'storage', name: '창고 선반', per: 4, max: 10, cost: 1, grow: 1, desc: (v) => `계정 창고 +${v}칸` },
  { id: 'coins', name: '두둑한 지갑', per: 0.03, max: 10, cost: 1, grow: 1, desc: (v) => `코인 획득 +${Math.round(v * 100)}%` },
  { id: 'afk', name: '느긋한 마음', per: 0.01, max: 10, cost: 2, grow: 1, desc: (v) => `방치 효율 +${Math.round(v * 100)}%p` },
  { id: 'drop', name: '날카로운 눈', per: 0.02, max: 10, cost: 2, grow: 1, desc: (v) => `드롭률 +${Math.round(v * 100)}%` },
  { id: 'xp', name: '배움의 기쁨', per: 0.02, max: 10, cost: 2, grow: 1, desc: (v) => `경험치 +${Math.round(v * 100)}%` },
  { id: 'teleport', name: '길잡이 표지판', per: 2, max: 5, cost: 3, grow: 1, desc: (v) => `잡화점 순간이동 티켓 하루 구매 +${v}장` },
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
  return null;
}
