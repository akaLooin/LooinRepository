// Calendar days are plain local dates ("YYYY-MM-DD"), never times. See replica/architecture.md.
export type Day = string;

export function toDay(y: number, m: number, d: number): Day {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDay(day: Day) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
}

export function today(): Day {
  const n = new Date();
  return toDay(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

export function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(day: Day) {
  const { y, m, d } = parseDay(day);
  return new Date(y, m - 1, d).getDay();
}

export function addDays(day: Day, n: number): Day {
  const { y, m, d } = parseDay(day);
  const t = new Date(y, m - 1, d + n);
  return toDay(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

/** Whole days from a to b (b later = positive). Counted on UTC dates, so summer time cannot shift it. */
export function daysBetween(a: Day, b: Day) {
  const t = (d: Day) => { const p = parseDay(d); return Date.UTC(p.y, p.m - 1, p.d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

/** Weeks of a month as rows of 7 cells; cells outside the month are null. */
export function monthGrid(y: number, m: number, weekStartsSunday = true): (Day | null)[][] {
  const first = toDay(y, m, 1);
  const lead = (weekday(first) - (weekStartsSunday ? 0 : 1) + 7) % 7;
  const cells: (Day | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(toDay(y, m, d));
  while (cells.length % 7) cells.push(null);
  const rows: (Day | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayLabels(weekStartsSunday = true) {
  return weekStartsSunday ? WEEKDAY_LABELS : [...WEEKDAY_LABELS.slice(1), WEEKDAY_LABELS[0]];
}

/** Months since year 0 (for paging the calendar): 2026-11 → 2026*12 + 10. */
export const monthIndex = (y: number, m: number) => y * 12 + (m - 1);
export const fromMonthIndex = (i: number) => ({ y: Math.floor(i / 12), m: (i % 12) + 1 });

/** First day of the week that holds `day`. */
export function weekStart(day: Day, weekStartsSunday = true): Day {
  const back = (weekday(day) - (weekStartsSunday ? 0 : 1) + 7) % 7;
  return addDays(day, -back);
}

/** The day the calendar picks after paging, as in the original: forward → the 1st, back → the month's last day. */
export function pickAfterPaging(y: number, m: number, dir: 1 | -1): Day {
  return toDay(y, m, dir === 1 ? 1 : daysInMonth(y, m));
}
