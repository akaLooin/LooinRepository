import { today, type Day } from "../lib/dates";
import type { DDay } from "./types";

/** For a repeating D-day, the next date on or after `from` (yearly: same month and day; monthly: same day; short months use their last day). */
export function nextOccurrence(d: Pick<DDay, "type" | "targetDate" | "repeatUnit">, from: Day = today()): Day {
  if (d.type !== "repeat" || d.targetDate >= from) return d.targetDate;
  const [, tm, td] = d.targetDate.split("-").map(Number);
  const [fy, fm] = from.split("-").map(Number);
  const make = (y: number, m: number) => {
    const yy = y + Math.floor((m - 1) / 12), mm = ((m - 1) % 12) + 1;
    return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(td, new Date(yy, mm, 0).getDate())).padStart(2, "0")}`;
  };
  if (d.repeatUnit === "monthly") { const c = make(fy, fm); return c >= from ? c : make(fy, fm + 1); }
  const c = make(fy, tm);
  return c >= from ? c : make(fy + 1, tm);
}

export function ddayLabel(target: Day | Pick<DDay, "type" | "targetDate" | "repeatUnit">, from: Day = today()) {
  const day = typeof target === "string" ? target : nextOccurrence(target, from);
  const n = Math.round((Date.parse(day) - Date.parse(from)) / 86400000);
  return n === 0 ? "D-DAY" : n > 0 ? `D-${n}` : `D+${-n}`;
}

