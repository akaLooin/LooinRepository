/**
 * 일정 (user's feature, 2026-11-18): calendar events, apart from to-dos. They have a time (or 종일) and a colour, no
 * check box and no category. The 할 일 캘린더 shows them as thin lines under the dates; the 일정 캘린더 shows them as
 * labelled bars, and a tapped date opens that day as an hour grid. Pure helpers, for tests.
 */
import { addDays, daysBetween, type Day } from "./dates";
import type { SpanBar } from "./spans";

export type CalEvent = {
  id: string;
  title: string;
  startDate: Day;
  endDate: Day; // the same day for a one-day event
  allDay: boolean;
  startTime?: string; // "HH:MM" (not for 종일)
  endTime?: string; // "HH:MM"; "24:00" = until midnight
  color: string; // #RRGGBB
  memo: string;
  alarmMinutes?: number | null; // minutes before the start (종일: before 9:00 of the first day); null = none
};

export const DAY_MINUTES = 24 * 60;
export const SNAP = 30; // a tap on the hour grid starts at the half hour under the finger

export const toMinutes = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
export const fromMinutes = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Does the event fall on this day? */
export const eventOn = (e: Pick<CalEvent, "startDate" | "endDate">, day: Day) => e.startDate <= day && day <= e.endDate;

/** Shown in the band at the top of the day (종일, or longer than one day), not as a block in the hour grid. */
export const inBand = (e: CalEvent) => e.allDay || e.startDate !== e.endDate;

/** The day's events: band events first (longest first), then by start time. */
export function eventsOn(events: CalEvent[], day: Day): CalEvent[] {
  return events.filter((e) => eventOn(e, day)).sort((a, b) =>
    Number(inBand(b)) - Number(inBand(a))
    || (inBand(a) ? daysBetween(b.startDate, b.endDate) - daysBetween(a.startDate, a.endDate) : 0)
    || (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0)
    || toMinutes(a.startTime ?? "00:00") - toMinutes(b.startTime ?? "00:00")
    || (a.title < b.title ? -1 : 1));
}

/** Bars for the month calendar (the same shape the 긴 할 일 bars had). Events have no check, so never "done". */
export const eventBars = (events: CalEvent[]): SpanBar[] =>
  events.map((e) => ({ id: e.id, start: e.startDate, end: e.endDate, color: e.color, done: false, title: e.title }));

export type Block = { e: CalEvent; top: number; bottom: number; col: number; cols: number };

/**
 * Timed one-day events as blocks in the hour grid (minutes from midnight). Overlapping events share the width:
 * each cluster of events that overlap one another is split into as many columns as it needs.
 */
export function dayBlocks(events: CalEvent[], day: Day, minLength = 20): Block[] {
  const timed = events.filter((e) => eventOn(e, day) && !inBand(e) && e.startTime && e.endTime)
    .map((e) => ({ e, top: toMinutes(e.startTime!), bottom: Math.max(toMinutes(e.endTime!), toMinutes(e.startTime!) + minLength) }))
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom);
  const out: Block[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -1;
  const close = () => { const n = Math.max(0, ...cluster.map((b) => b.col + 1)); for (const b of cluster) b.cols = n; cluster = []; };
  for (const t of timed) {
    if (t.top >= clusterEnd) { close(); clusterEnd = -1; }
    let col = 0;
    while (cluster.some((b) => b.col === col && b.bottom > t.top)) col++;
    const b: Block = { ...t, col, cols: 1 };
    cluster.push(b);
    out.push(b);
    clusterEnd = Math.max(clusterEnd, t.bottom);
  }
  close();
  return out;
}

/** The first slot of a tap at `minutes`: snapped to the half hour, one hour long, within the day. */
export function slotAt(minutes: number): { startTime: string; endTime: string } {
  const start = Math.min(Math.max(0, Math.floor(minutes / SNAP) * SNAP), DAY_MINUTES - 60);
  return { startTime: fromMinutes(start), endTime: fromMinutes(start + 60) };
}

/** "오전 8:30" or "08:30". */
export function clock(hm: string, use24h: boolean) {
  const n = toMinutes(hm);
  if (use24h) return n >= DAY_MINUTES ? "24:00" : hm;
  const h = Math.floor(n / 60) % 24, m = n % 60;
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
}

const md = (d: Day, year: number) => { const [y, m, dd] = d.split("-").map(Number); return `${y !== year ? `${y}년 ` : ""}${m}월 ${dd}일`; };

/** "오전 8:30~9:30", "종일", "11월 3일 ~ 11월 7일", "11월 3일 오후 10:00 ~ 11월 4일 오전 2:00". */
export function eventTimeLabel(e: CalEvent, use24h: boolean, year: number) {
  const multi = e.startDate !== e.endDate;
  if (e.allDay) return multi ? `${md(e.startDate, year)} ~ ${md(e.endDate, year)}` : "종일";
  const s = clock(e.startTime ?? "00:00", use24h), t = clock(e.endTime ?? "00:00", use24h);
  if (multi) return `${md(e.startDate, year)} ${s} ~ ${md(e.endDate, year)} ${t}`;
  // "오전 8:30~오전 9:30" reads as "오전 8:30~9:30" when both are in the morning (or both in the afternoon)
  const same = !use24h && s.slice(0, 2) === t.slice(0, 2);
  return `${s}~${same ? t.slice(3) : t}`;
}

/** What is wrong with the event, or null. */
export function eventProblem(e: Pick<CalEvent, "title" | "startDate" | "endDate" | "allDay" | "startTime" | "endTime">): string | null {
  if (!e.title.trim()) return "제목을 적어 주세요";
  if (e.endDate < e.startDate) return "끝나는 날이 시작하는 날보다 빨라요";
  if (!e.allDay) {
    if (!e.startTime || !e.endTime) return "시간을 골라 주세요";
    if (e.startDate === e.endDate && toMinutes(e.endTime) <= toMinutes(e.startTime)) return "끝나는 시간이 시작 시간보다 빨라요";
  }
  return null;
}

/** Moving the start keeps the length (days, and minutes for a timed event). */
export function shiftStart(e: Pick<CalEvent, "startDate" | "endDate">, start: Day): { startDate: Day; endDate: Day } {
  return { startDate: start, endDate: addDays(start, daysBetween(e.startDate, e.endDate)) };
}

/** When the alarm rings, or null. 종일 events ring at 9:00 of the first day minus the minutes. */
export function alarmAt(e: CalEvent): Date | null {
  if (e.alarmMinutes == null) return null;
  const [y, m, d] = e.startDate.split("-").map(Number);
  const start = e.allDay ? 9 * 60 : toMinutes(e.startTime ?? "00:00");
  return new Date(y, m - 1, d, 0, start - e.alarmMinutes);
}

export const ALARM_CHOICES: { minutes: number | null; label: string }[] = [
  { minutes: null, label: "알림 없음" },
  { minutes: 0, label: "시작할 때" },
  { minutes: 10, label: "10분 전" },
  { minutes: 30, label: "30분 전" },
  { minutes: 60, label: "1시간 전" },
  { minutes: 24 * 60, label: "1일 전" },
];
export const alarmLabel = (m: number | null | undefined) => ALARM_CHOICES.find((a) => a.minutes === (m ?? null))?.label ?? `${m}분 전`;

/**
 * 여러 날 할 일 made before 일정 existed become 일정 (all day, in their category's colour) with the same id, so
 * doing it on two phones, or on the server (SQL 20261118000000), gives one event, not two.
 */
export function liftSpans<T extends { id: string; title: string; date: Day | null; endDate?: Day | null; categoryId: string; memo: string; isSkipped?: boolean }>(
  todos: T[], colorOf: (categoryId: string) => string,
): { events: CalEvent[]; lifted: Set<string> } {
  const events: CalEvent[] = [];
  const lifted = new Set<string>();
  for (const t of todos) {
    if (!t.date || !t.endDate || t.endDate <= t.date) continue;
    lifted.add(t.id);
    if (t.isSkipped) continue;
    events.push({ id: t.id, title: t.title, startDate: t.date, endDate: t.endDate, allDay: true, color: colorOf(t.categoryId), memo: t.memo, alarmMinutes: null });
  }
  return { events, lifted };
}
