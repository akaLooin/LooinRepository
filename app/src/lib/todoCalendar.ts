// Pure helpers for the 할 일 캘린더 (no device imports, so tests can load them).

/** The first `max` items of a day and how many more there are (max 0 = 무제한). */
export function cellItems<T>(items: T[], max: number): { shown: T[]; more: number } {
  if (!max || items.length <= max) return { shown: items, more: 0 };
  // when cut, "+n" takes the last line, so one fewer item shows
  const keep = Math.max(1, max - 1);
  return { shown: items.slice(0, keep), more: items.length - keep };
}

// ── "open home on this day", asked by the 할 일 캘린더 and answered by the home screen ──
let wanted: string | null = null;
const listeners = new Set<() => void>();
export function requestHomeDay(day: string) { wanted = day; listeners.forEach((l) => l()); }
export function takeHomeDay(): string | null { const d = wanted; wanted = null; return d; }
export function subscribeHomeDay(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export const peekHomeDay = () => wanted;
