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
  important?: boolean; // 중요한 날 (강조): its bar and days glow on the calendars
  /** 일정 카테고리 (2026-11-23): separate from the to-dos' categories; null/undefined = none */
  categoryId?: string | null;
  /** 반복 (2026-11-23): the event comes back on these days; startDate is the first time */
  repeat?: EventRepeat | null;
  /** days taken out of the repeat (one time deleted, or changed on its own) */
  skipDates?: Day[];
  /** 장소 (2026-11-23, both ways with Google) and the video meeting Google made for it (read only) */
  location?: string;
  meetLink?: string;
  /** 구글 캘린더 (2026-11-23): the Google calendar it is kept in; null/undefined = only in 립마크 (picked per event) */
  googleCalendarId?: string | null;
  /** on a shown time of a repeating event: the stored event's id and the day this time starts */
  seriesId?: string;
  occurrence?: Day;
};

export type EventRepeat = {
  kind: "daily" | "weekly" | "monthly" | "yearly";
  /** weekly: 0 = Sunday … 6 = Saturday (empty: the first day's weekday) */
  weekdays?: number[];
  /** the last day it may start on (inclusive); none = keeps going */
  until?: Day | null;
  /** every n days / weeks / months / years (from Google Calendar; 1 when missing) */
  every?: number;
};

export type EventCategory = { id: string; title: string; color: string; sortOrder: number };

export const REPEAT_LABELS: Record<EventRepeat["kind"], string> = { daily: "매일", weekly: "매주", monthly: "매월", yearly: "매년" };
const WD = ["일", "월", "화", "수", "목", "금", "토"];
/** "반복 안 함", "매일", "매주 월·수", "매월 24일", "매년 11월 24일", with "~ 12월 31일" when it ends. */
export function repeatLabel(r: EventRepeat | null | undefined, start: Day): string {
  if (!r) return "반복 안 함";
  const [, m, d] = start.split("-").map(Number);
  const days = (r.weekdays?.length ? [...r.weekdays].sort() : [weekdayOf(start)]).map((x) => WD[x]).join("·");
  const n = r.every && r.every > 1 ? r.every : 0;
  const base = r.kind === "weekly" ? `${n ? `${n}주마다` : "매주"} ${days}` : r.kind === "monthly" ? `${n ? `${n}개월마다` : "매월"} ${d}일`
    : r.kind === "yearly" ? `${n ? `${n}년마다` : "매년"} ${m}월 ${d}일` : n ? `${n}일마다` : "매일";
  if (!r.until) return base;
  const [, um, ud] = r.until.split("-").map(Number);
  return `${base} · ${um}월 ${ud}일까지`;
}
const weekdayOf = (d: Day) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd).getDay(); };

/** Does a repeating event start a time on `day`? (Not looking at skipDates.) */
export function repeatsOn(e: Pick<CalEvent, "startDate" | "repeat">, day: Day): boolean {
  const r = e.repeat;
  if (!r || day < e.startDate || (r.until && day > r.until)) return false;
  const [sy, sm, sd] = e.startDate.split("-").map(Number);
  const [y, m, d] = day.split("-").map(Number);
  const n = Math.max(1, r.every ?? 1);
  if (r.kind === "daily") return daysBetween(e.startDate, day) % n === 0;
  if (r.kind === "weekly") {
    // weeks counted from the first day's week (Sunday start, as Google counts WKST=SU)
    const weeks = Math.floor((daysBetween(e.startDate, day) + weekdayOf(e.startDate)) / 7);
    return weeks % n === 0 && (r.weekdays?.length ? r.weekdays : [weekdayOf(e.startDate)]).includes(weekdayOf(day));
  }
  if (r.kind === "monthly") return d === sd && ((y - sy) * 12 + (m - sm)) % n === 0;
  return m === sm && d === sd && (y - sy) % n === 0;
}

/**
 * The events as shown from `from` to `to`: a repeating event becomes one event per time (id `series~day`, with
 * seriesId and occurrence); the others stay as they are. Times that started before `from` but still run are kept.
 */
export function expandEvents(events: CalEvent[], from: Day, to: Day): CalEvent[] {
  const out: CalEvent[] = [];
  for (const e of events) {
    if (!e.repeat) { out.push(e); continue; }
    const len = daysBetween(e.startDate, e.endDate);
    const skip = new Set(e.skipDates ?? []);
    const first = addDays(from, -len) > e.startDate ? addDays(from, -len) : e.startDate;
    const last = e.repeat.until && e.repeat.until < to ? e.repeat.until : to;
    for (let d = first; d <= last; d = addDays(d, 1)) {
      if (skip.has(d) || !repeatsOn(e, d)) continue;
      out.push({ ...e, id: `${e.id}~${d}`, seriesId: e.id, occurrence: d, startDate: d, endDate: addDays(d, len) });
    }
  }
  return out;
}

/** The stored id behind a shown event. */
export const seriesOf = (id: string) => id.split("~")[0];

/** 이 일정만 (this time only) or 모든 반복 일정 (the whole repeat). */
export type EventScope = "one" | "all";

/**
 * Saving an event (new, changed, or one time of a repeating one). For a time of a repeat:
 * - "one": that day is taken out of the repeat and the time kept as an event of its own;
 * - "all": the repeat changes; moving this time by n days moves the whole repeat by n days;
 * - "all" with the repeat turned off: the times before this day stay (the repeat ends the day before) and this one
 *   is kept on its own.
 */
export function saveEventIn(events: CalEvent[], input: Omit<CalEvent, "id"> & { id?: string }, scope: EventScope, newId: () => string): { events: CalEvent[]; id: string } {
  const clean = (e: CalEvent): CalEvent => {
    const { seriesId: _s, occurrence: _o, ...rest } = e;
    return rest.allDay ? { ...rest, startTime: undefined, endTime: undefined } : rest;
  };
  const series = input.seriesId ? events.find((x) => x.id === input.seriesId) : undefined;
  if (series && input.occurrence) {
    const day = input.occurrence;
    const { seriesId: _s, occurrence: _o, id: _i, ...fields } = input;
    if (scope === "one" || !input.repeat) {
      const id = newId();
      const rest = scope === "one"
        ? { ...series, skipDates: [...new Set([...(series.skipDates ?? []), day])] }
        : day <= series.startDate ? null : { ...series, repeat: { ...series.repeat!, until: addDays(day, -1) } };
      const lone = clean({ ...fields, id, repeat: undefined, skipDates: undefined } as CalEvent);
      delete lone.repeat; delete lone.skipDates;
      return { events: [...events.flatMap((x) => (x.id === series.id ? (rest ? [rest] : []) : [x])), lone], id };
    }
    const startDate = addDays(series.startDate, daysBetween(day, input.startDate));
    const next = clean({ ...series, ...fields, id: series.id, startDate, endDate: addDays(startDate, daysBetween(input.startDate, input.endDate)), skipDates: series.skipDates });
    return { events: events.map((x) => (x.id === series.id ? next : x)), id: series.id };
  }
  if (input.id && events.some((e) => e.id === input.id)) return { events: events.map((e) => (e.id === input.id ? clean({ ...e, ...input, id: e.id }) : e)), id: input.id };
  const id = newId();
  return { events: [...events, clean({ ...input, id } as CalEvent)], id };
}

/** Deleting an event; a time of a repeat with "one" only takes that day out. */
export function deleteEventIn(events: CalEvent[], id: string, scope: EventScope): CalEvent[] {
  const [sid, day] = id.split("~");
  if (day && scope === "one") return events.map((e) => (e.id === sid ? { ...e, skipDates: [...new Set([...(e.skipDates ?? []), day])] } : e));
  return events.filter((e) => e.id !== sid);
}

export const DAY_MINUTES = 24 * 60;
export const SNAP = 30; // a tap on the hour grid starts at the half hour under the finger

export const toMinutes = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
export const fromMinutes = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Does the event fall on this day? */
export const eventOn = (e: Pick<CalEvent, "startDate" | "endDate">, day: Day) => e.startDate <= day && day <= e.endDate;

/** Shown in the line above the hours (종일), not as a block in the hour grid. A timed event over midnight is a block
 * on each of its days (user, 2026-11-20). */
export const inBand = (e: CalEvent) => e.allDay;

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
export const eventBars = (events: CalEvent[], glow?: (e: CalEvent) => string, allDayFirst = false): SpanBar[] =>
  events.map((e) => ({ id: e.id, start: e.startDate, end: e.endDate, color: e.color, done: false, title: e.title, important: !!e.important, ...(glow && e.important ? { glow: glow(e) } : {}), ...(allDayFirst && e.allDay ? { allDay: true } : {}) }));

/**
 * 중요한 날: the days with an important to-do (not deleted) or within an important event, for the 할 일 캘린더's glow.
 * `from`..`to` limits the event days drawn out (a month and its neighbours).
 */
export function importantDays(todos: { date: Day | null; isImportant?: boolean; isSkipped?: boolean }[], events: CalEvent[], from: Day, to: Day): Set<Day> {
  const out = new Set<Day>();
  for (const t of todos) if (t.isImportant && t.date && !t.isSkipped) out.add(t.date);
  for (const e of events) {
    if (!e.important || e.endDate < from || e.startDate > to) continue;
    for (let d = e.startDate < from ? from : e.startDate; d <= e.endDate && d <= to; d = addDays(d, 1)) out.add(d);
  }
  return out;
}

/** The glow colour of each important day: that of its first important to-do (in category order). */
export function importantDayColors(
  todos: { date: Day | null; isImportant?: boolean; isSkipped?: boolean; categoryId: string; sortOrder: number }[],
  categories: { id: string; color: string }[], from: Day, to: Day, glowOf: (categoryId: string, own: string) => string,
): Map<Day, string> {
  const order = new Map(categories.map((x, i) => [x.id, i]));
  const out = new Map<Day, string>();
  const list = todos.filter((t) => t.isImportant && t.date && !t.isSkipped && t.date >= from && t.date <= to)
    .sort((a, b) => (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0) || a.sortOrder - b.sortOrder);
  for (const t of list) if (!out.has(t.date!)) out.set(t.date!, glowOf(t.categoryId, categories.find((x) => x.id === t.categoryId)?.color ?? "#00FF7F"));
  return out;
}

export type Block = { e: CalEvent; top: number; bottom: number; col: number; cols: number };

/**
 * Timed one-day events as blocks in the hour grid (minutes from midnight). Overlapping events share the width:
 * each cluster of events that overlap one another is split into as many columns as it needs.
 */
export function dayBlocks(events: CalEvent[], day: Day, minLength = 20): Block[] {
  const timed = events.filter((e) => eventOn(e, day) && !inBand(e) && e.startTime && e.endTime)
    .map((e) => {
      // over midnight: from its start to the end of the first day, whole middle days, then up to its end
      const top = e.startDate === day ? toMinutes(e.startTime!) : 0;
      const end = e.endDate === day ? toMinutes(e.endTime!) : DAY_MINUTES;
      return { e, top, bottom: Math.min(DAY_MINUTES, Math.max(end, top + minLength)) };
    })
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
