// 덫 사냥(3월드 기술, 캐릭터마다): 눈꽃 마을 덫 오두막에서 덫을 놓으면, 접속하지 않아도 시간이 지나 동물이 잡힌다.
//  · 덫을 놓는 순간 잡힐 수와 경험치가 정해진다(기기·서버가 같은 값). 시간이 다 되면 거둔다.
//  · 길게 놓을수록 시간당 효율이 조금 오른다. 덫 도구(나무·쇠·서리)로 잡는 수가 늘고, 덫 칸은 덫 사냥 레벨로 늘어난다.
import { CRITTER, ITEMS, TRAP_MULT, TRAP_TIMES, trapSlots } from './data';
import type { Account, Character } from './state';
import { addItemSome, gainSkillXp, mapUnlocked, storageSize } from './state';

export interface TrapSlot { critter: string; end: number; n: number; xp: number }
export interface Traps { tier: number; slots: (TrapSlot | null)[] }
export const newTraps = (): Traps => ({ tier: 0, slots: [] });

/** 이 캐릭터가 이 동물에 덫을 놓으면 잡힐 수 */
export function trapYield(c: Character, critter: string, time: number): { n: number; xp: number } {
  const cr = CRITTER[critter], t = TRAP_TIMES[time], lv = c.skills.trapping?.lv ?? 1;
  const n = Math.max(1, Math.floor((t.min / cr.mins) * t.mult * TRAP_MULT[c.traps?.tier ?? 0] * (1 + lv * 0.02)));
  return { n, xp: Math.round(n * cr.xp * t.mult) };
}
/** 덫을 놓을 수 없는 이유(없으면 null) */
export function trapLock(c: Character, critter: string): string | null {
  const cr = CRITTER[critter];
  if (!cr) return '없는 동물';
  if ((c.skills.trapping?.lv ?? 1) < cr.lv) return `덫 사냥 Lv.${cr.lv}`;
  if (!mapUnlocked(c, cr.map)) return '아직 못 간 곳';
  return null;
}
export function setTrap(c: Character, idx: number, critter: string, time: number, now: number): string | null {
  if (!Number.isInteger(idx) || idx < 0 || idx >= trapSlots(c.skills.trapping?.lv ?? 1)) return '아직 열리지 않은 덫 칸입니다';
  if (!TRAP_TIMES[time]) return '없는 시간';
  const lock = trapLock(c, critter);
  if (lock) return `아직 덫을 놓을 수 없습니다(${lock})`;
  if (c.traps.slots[idx]) return '이미 덫이 놓여 있습니다';
  while (c.traps.slots.length <= idx) c.traps.slots.push(null);
  c.traps.slots[idx] = { critter, end: now + TRAP_TIMES[time].min * 60_000, ...trapYield(c, critter, time) };
  return null;
}
/** 다 된 덫을 거둔다: 가방 먼저, 넘치면 창고. 둘 다 가득이면 남은 만큼 덫에 그대로 */
export function collectTrap(acc: Account, c: Character, idx: number, now: number): string | null {
  const t = c.traps.slots[idx];
  if (!t) return '빈 덫입니다';
  if (now < t.end) return '아직 기다리는 중입니다';
  let left = t.n - addItemSome(c, t.critter, t.n);
  if (left > 0) {
    let s = acc.storage.find((x) => x.id === t.critter);
    if (!s && acc.storage.length < storageSize(acc)) { s = { id: t.critter, qty: 0 }; acc.storage.push(s); }
    if (s) { s.qty += left; left = 0; }
  }
  const got = t.n - left;
  if (got <= 0) return '가방과 창고가 가득 찼습니다';
  // 경험치는 거둔 몫만큼
  const xp = Math.round((t.xp * got) / t.n);
  gainSkillXp(c, 'trapping', xp);
  if (left > 0) { t.xp -= xp; t.n = left; } else c.traps.slots[idx] = null;
  void ITEMS;
  return null;
}
export function cancelTrap(c: Character, idx: number): string | null {
  if (!c.traps.slots[idx]) return '빈 덫입니다';
  c.traps.slots[idx] = null;
  return null;
}
