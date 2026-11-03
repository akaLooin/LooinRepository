// Routine repeat rules. Pure functions, tested in scripts/test-routines.ts.
import { parseDay, weekday, type Day } from "./dates";

export type RepeatType = "daily" | "interval" | "weekly" | "biweekly" | "monthly" | "yearly";

export type RepeatRule = {
  repeatType: RepeatType;
  intervalDays?: number; // interval: every n days from the start
  weekdays?: number[]; // weekly/biweekly: 0 = Sun ... 6 = Sat
  monthDays?: number[]; // monthly: 1..31, months without that day are skipped
  yearMonth?: number; // yearly
  yearDay?: number;
};

export type RoutineSpan = RepeatRule & { startDate: Day; endDate?: Day };

const DAY_MS = 86400000;
const serial = (d: Day) => Math.round(Date.parse(d + "T00:00:00Z") / DAY_MS);

/** Sunday-based week number, so "every other week" counts from the week the routine starts in. */
const weekSerial = (d: Day) => Math.floor((serial(d) + 4) / 7); // 1970-01-01 was a Thursday

export function occursOn(r: RoutineSpan, day: Day): boolean {
  if (day < r.startDate) return false;
  if (r.endDate && day > r.endDate) return false;
  const { m, d } = parseDay(day);
  switch (r.repeatType) {
    case "daily":
      return true;
    case "interval":
      return (serial(day) - serial(r.startDate)) % Math.max(1, r.intervalDays ?? 1) === 0;
    case "weekly":
      return (r.weekdays ?? []).includes(weekday(day));
    case "biweekly":
      return (r.weekdays ?? []).includes(weekday(day)) && (weekSerial(day) - weekSerial(r.startDate)) % 2 === 0;
    case "monthly":
      return (r.monthDays ?? []).includes(d);
    case "yearly":
      return m === r.yearMonth && d === r.yearDay;
  }
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];

export function ruleLabel(r: RepeatRule): string {
  const days = (xs: number[] = []) => [...xs].sort((a, b) => a - b);
  switch (r.repeatType) {
    case "daily":
      return "매일";
    case "interval":
      return `${r.intervalDays ?? 2}일마다`;
    case "weekly":
    case "biweekly": {
      const w = days(r.weekdays);
      const names = w.length === 1 ? `${WD[w[0]]}요일` : w.map((x) => WD[x]).join(", ");
      return r.repeatType === "biweekly" ? `격주 ${names}` : names;
    }
    case "monthly":
      return `매월 ${days(r.monthDays).join(", ")}일`;
    case "yearly":
      return `매년 ${r.yearMonth}월 ${r.yearDay}일`;
  }
}

export function periodLabel(start: Day, end?: Day) {
  const f = (x: Day) => { const { y, m, d } = parseDay(x); return `${y}. ${m}. ${d}`; };
  return `${f(start)} ~${end ? " " + f(end) : ""}`;
}

export function routineStatus(r: { startDate: Day; endDate?: Day }, today: Day): "upcoming" | "active" | "finished" {
  if (today < r.startDate) return "upcoming";
  if (r.endDate && today > r.endDate) return "finished";
  return "active";
}
