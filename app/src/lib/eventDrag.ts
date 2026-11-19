/** Moving and stretching an event on the hour grid (user's feature, 2026-11-19). Minutes from midnight; pure. */
import { DAY_MINUTES } from "./events";

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
