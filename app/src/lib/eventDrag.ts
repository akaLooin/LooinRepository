/** Moving and stretching an event on the hour grid (user's feature, 2026-11-19). Minutes from midnight; pure. */
import { addDays, daysBetween, type Day } from "./dates";
import { DAY_MINUTES, fromMinutes, toMinutes } from "./events";

export const DRAG_STEP = 5; // stretched times land on 5-minute marks
export const MOVE_STEP = 15; // a held event moves in quarter hours (user)
export const MIN_LENGTH = 15;

const snap = (n: number, step = DRAG_STEP) => Math.round(n / step) * step;

/** The event moved by `delta` minutes: its start on a quarter hour, same length, kept within its day. */
export function moveBlock(start: number, end: number, delta: number): { top: number; bottom: number } {
  const len = end - start;
  const top = Math.min(Math.max(0, snap(start + delta, MOVE_STEP)), DAY_MINUTES - len);
  return { top, bottom: top + len };
}

/** One edge dragged by `delta` minutes: at least MIN_LENGTH long, within the day. */
export function resizeBlock(start: number, end: number, edge: "top" | "bottom", delta: number): { top: number; bottom: number } {
  if (edge === "top") return { top: Math.min(Math.max(0, snap(start + delta)), end - MIN_LENGTH), bottom: end };
  return { top: start, bottom: Math.max(Math.min(DAY_MINUTES, snap(end + delta)), start + MIN_LENGTH) };
}

/**
 * An event over midnight held and moved on one of its days: the part on this day slides by quarter hours (drawn
 * within the day), and on letting go the whole event moves by the same amount, across midnight if need be.
 */
export function moveSpanBlock(top: number, bottom: number, delta: number): { top: number; bottom: number; delta: number } {
  const d = snap(delta, MOVE_STEP);
  const clamp = (n: number) => Math.min(DAY_MINUTES, Math.max(0, n));
  return { top: clamp(top + d), bottom: clamp(bottom + d), delta: d };
}

/** The event's start and end moved by `delta` minutes, dates included. */
export function shiftEvent<T extends { startDate: Day; endDate: Day; startTime?: string; endTime?: string }>(e: T, delta: number): T {
  const move = (day: Day, hm: string) => {
    const total = daysBetween("2000-01-01", day) * DAY_MINUTES + toMinutes(hm) + delta;
    const days = Math.floor(total / DAY_MINUTES);
    return { day: addDays("2000-01-01", days), hm: fromMinutes(total - days * DAY_MINUTES) };
  };
  const s = move(e.startDate, e.startTime ?? "00:00"), t = move(e.endDate, e.endTime ?? "00:00");
  // an end exactly at midnight reads as 24:00 of the day before
  const end = t.hm === "00:00" && t.day > s.day ? { day: addDays(t.day, -1), hm: "24:00" } : t;
  return { ...e, startDate: s.day, startTime: s.hm, endDate: end.day, endTime: end.hm };
}
