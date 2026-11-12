/**
 * 여러 날 할 일 (user's feature): a to-do from `date` to `endDate` (both included). On the calendar it is a bar, not a
 * clover; these helpers say which days it covers and lay the bars of one calendar row into lanes. Pure, for tests.
 */
import { addDays, daysBetween, type Day } from "./dates";

type Dated = { date: Day | null; endDate?: Day | null };

export const isSpan = (t: Dated): t is { date: Day; endDate: Day } => !!t.date && !!t.endDate && t.endDate > t.date;

/** Is the to-do on this day (a span: any day from its start to its end)? */
export const onDay = (t: Dated, day: Day) => (isSpan(t) ? t.date <= day && day <= t.endDate : t.date === day);

/** Moving a span keeps its length: the new start and the matching end (null when it is a one-day to-do). */
export function moveSpan(t: Dated, start: Day | null): { date: Day | null; endDate?: Day | null } {
  if (!isSpan(t)) return { date: start };
  if (!start) return { date: null, endDate: null }; // 보관함 has no days
  return { date: start, endDate: addDays(start, daysBetween(t.date, t.endDate)) };
}

/** "11.3 – 11.7" (with the year when it is not this year's). */
export function spanLabel(t: Dated, thisYear: number) {
  if (!isSpan(t)) return "";
  const f = (d: Day) => { const [y, m, dd] = d.split("-").map(Number); return `${y !== thisYear ? `${y}.` : ""}${m}.${dd}`; };
  return `${f(t.date)} – ${f(t.endDate)}`;
}

export type SpanBar = { id: string; start: Day; end: Day; color: string; done: boolean; title: string };
export type RowSegment = SpanBar & { lane: number; from: number; to: number; opensLeft: boolean; opensRight: boolean };

/**
 * The bars in one calendar row (7 cells; null = a blank cell outside the month). Longer, earlier spans take the top
 * lanes; what does not fit in `lanes` is counted per cell in `more`.
 */
export function rowSegments(row: (Day | null)[], bars: SpanBar[], lanes: number): { segments: RowSegment[]; more: number[] } {
  const cols = row.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  const more = row.map(() => 0);
  if (!cols.length) return { segments: [], more };
  const first = row[cols[0]]!, last = row[cols[cols.length - 1]]!;
  const colOf = (d: Day) => row.indexOf(d);
  const inRow = bars
    .filter((b) => b.start <= last && b.end >= first)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0) || daysBetween(b.start, b.end) - daysBetween(a.start, a.end) || (a.id < b.id ? -1 : 1));
  const taken: boolean[][] = [];
  const segments: RowSegment[] = [];
  for (const b of inRow) {
    const from = colOf(b.start < first ? first : b.start), to = colOf(b.end > last ? last : b.end);
    let lane = 0;
    while (lane < lanes && (taken[lane] ?? []).slice(from, to + 1).some(Boolean)) lane++;
    if (lane >= lanes) { for (let i = from; i <= to; i++) more[i]++; continue; }
    taken[lane] = taken[lane] ?? [];
    for (let i = from; i <= to; i++) taken[lane][i] = true;
    segments.push({ ...b, lane, from, to, opensLeft: b.start < first, opensRight: b.end > last });
  }
  return { segments, more };
}
