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

/**
 * "D-3", "D-DAY", "D+5". With 당일 포함 (user's feature) the target day counts as the first day: D+1 on the day,
 * D+6 five days later; the countdown before it is unchanged.
 */
export function ddayLabel(target: Day | (Pick<DDay, "type" | "targetDate" | "repeatUnit"> & { includeToday?: boolean }), from: Day = today()) {
  const day = typeof target === "string" ? target : nextOccurrence(target, from);
  const n = Math.round((Date.parse(day) - Date.parse(from)) / 86400000);
  if (typeof target !== "string" && target.includeToday && n <= 0) return `D+${1 - n}`;
  return n === 0 ? "D-DAY" : n > 0 ? `D-${n}` : `D+${-n}`;
}

/** Is `day` one of this D-day's dates? (the red circle on the calendar) */
export function isDDayOn(d: Pick<DDay, "type" | "targetDate" | "repeatUnit">, day: Day): boolean {
  if (d.type !== "repeat") return d.targetDate === day;
  return day >= d.targetDate && nextOccurrence(d, day) === day;
}

