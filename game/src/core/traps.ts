// 덫 사냥(3월드 기술, 캐릭터마다): 눈꽃 마을 덫 오두막에서 덫을 놓으면, 접속하지 않아도 시간이 지나 동물이 잡힌다.
//  · 덫을 놓는 순간 잡힐 수와 경험치가 정해진다(기기·서버가 같은 값). 시간이 다 되면 거둔다.
//  · 덫 상자마다 잡는 수·경험치·빛나는 동물 확률·시간이 다르다(원작처럼 골라 쓰는 재미). 덫 꾸러미와 레벨로 상자가 열린다.
//  · 빛나는 동물은 드물게 섞여 잡히고, 계정 전체 보너스가 된다. 덫은 원작과 달리 오두막에서 원격으로만 놓는다.
import { BonusKey, CRITTER, ITEMS, SHINY_BONUS, SHINY_CHANCE, TRAP_BOX, TRAP_BOXES, TRAP_TIMES, TrapBoxDef, classSkillMult, shinyLevel, trapSlots } from './data';
import { hash } from './companions';
import type { Account, Character } from './state';
import { addItemSome, gainSkillXp, mapUnlocked, storageSize } from './state';

export interface TrapSlot { critter: string; end: number; n: number; xp: number; box?: string; shiny?: number }
export interface Traps { tier: number; slots: (TrapSlot | null)[] }
export const newTraps = (): Traps => ({ tier: 0, slots: [] });

/** 이 캐릭터가 쓸 수 있는 덫 상자인가(없으면 null) */
export function boxLock(c: Character, b: TrapBoxDef): string | null {
  if (b.tier && (c.traps?.tier ?? 0) < b.tier) return `${['', '나무', '쇠', '서리'][b.tier]} 덫 꾸러미`;
  if (b.lv && (c.skills.trapping?.lv ?? 1) < b.lv) return `덫 사냥 Lv.${b.lv}`;
  return null;
}
export const openBoxes = (c: Character) => TRAP_BOXES.filter((b) => !boxLock(c, b));
/** 이 캐릭터가 이 동물에 이 상자로 덫을 놓으면 잡힐 수·경험치·빛나는 동물 기대치 */
export function trapYield(c: Character, critter: string, time: number, box = 'tb_card'): { n: number; xp: number; shinyExp: number } {
  const cr = CRITTER[critter], t = TRAP_TIMES[time], lv = c.skills.trapping?.lv ?? 1, b = TRAP_BOX[box] ?? TRAP_BOXES[0];
  const n = Math.max(1, Math.floor((t.min / cr.mins) * t.mult * b.qty * (1 + lv * 0.02) * classSkillMult(c, 'trapping')));
  return { n, xp: Math.round(n * cr.xp * t.mult * b.xp), shinyExp: n * SHINY_CHANCE * b.shiny };
}
/** 덫을 놓을 수 없는 이유(없으면 null) */
export function trapLock(c: Character, critter: string): string | null {
  const cr = CRITTER[critter];
  if (!cr) return '없는 동물';
  if ((c.skills.trapping?.lv ?? 1) < cr.lv) return `덫 사냥 Lv.${cr.lv}`;
  if (!mapUnlocked(c, cr.map)) return '아직 못 간 곳';
  return null;
}
export function setTrap(c: Character, idx: number, critter: string, time: number, now: number, box = 'tb_card', drone = 0): string | null {
  if (!Number.isInteger(idx) || idx < 0 || idx >= trapSlots(c.skills.trapping?.lv ?? 1, drone)) return '아직 열리지 않은 덫 칸입니다';
  if (!TRAP_TIMES[time]) return '없는 시간';
  const b = TRAP_BOX[box];
  if (!b) return '없는 덫 상자';
  const bl = boxLock(c, b);
  if (bl) return `아직 쓸 수 없는 상자입니다(${bl})`;
  if (!b.times.includes(time)) return `${b.name}은(는) 그 시간으로 놓을 수 없습니다`;
  const lock = trapLock(c, critter);
  if (lock) return `아직 덫을 놓을 수 없습니다(${lock})`;
  if (c.traps.slots[idx]) return '이미 덫이 놓여 있습니다';
  while (c.traps.slots.length <= idx) c.traps.slots.push(null);
  const y = trapYield(c, critter, time, box);
  // 빛나는 동물 수: 기대값의 정수 부분 + 소수 부분은 (캐릭터·시각·칸)으로 정해지는 확률(기기와 서버가 같다)
  const frac = (hash((c.id * 7919 + idx * 131 + Math.floor(now / 1000)) >>> 0) % 10000) / 10000;
  const shiny = Math.min(y.n, Math.floor(y.shinyExp) + (frac < y.shinyExp % 1 ? 1 : 0));
  c.traps.slots[idx] = { critter, end: now + TRAP_TIMES[time].min * 60_000, n: y.n, xp: y.xp, box, shiny };
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
  // 빛나는 동물은 계정 기록으로(처음 거둘 때 한 번에)
  if (t.shiny) { acc.shinies ??= {}; acc.shinies[t.critter] = (acc.shinies[t.critter] ?? 0) + t.shiny; t.shiny = 0; }
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

/** 빛나는 동물 보너스(계정 공용) */
export function shinyBonus(a: Partial<Pick<Account, 'shinies'>>, add: (k: BonusKey, v: number) => void) {
  for (const [id, n] of Object.entries(a.shinies ?? {})) { const b = SHINY_BONUS[id], lv = shinyLevel(n); if (b && lv) add(b.eff, lv * b.per); }
}
