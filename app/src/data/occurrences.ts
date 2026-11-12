// Pure: which to-dos a day has, including routine occurrences without a row yet. No React Native imports.
import type { Day } from "../lib/dates";
import { occursOn } from "../lib/routines";
import { onDay } from "../lib/spans";
import type { DB, Todo } from "./types";

/** A routine's time on a given day as an alarm moment (the phone's local time), or undefined if it has no time. */
export function routineAlarm(timeOfDay: string | undefined, day: Day): string | undefined {
  if (!timeOfDay) return undefined;
  const [y, m, dd] = day.split("-").map(Number);
  const [hh, mm] = timeOfDay.split(":").map(Number);
  return new Date(y, m - 1, dd, hh, mm).toISOString();
}

/** Id of a routine occurrence that has no row yet. */
export const virtualId = (routineId: string, day: Day) => `r:${routineId}:${day}`;
export const isVirtual = (id: string) => id.startsWith("r:");

/**
 * To-dos for a day, including routine occurrences that have no row yet (shown as virtual rows).
 * A row exists once the user touches the occurrence (checks, edits, moves, skips).
 */
export function todosForDay(d: DB, day: Day): Todo[] {
  // a multi-day to-do is on every day from its start to its end
  const real = d.todos.filter((t) => onDay(t, day) && !t.isSkipped);
  const touched = new Set(d.todos.filter((t) => t.routineId && t.routineDate === day).map((t) => t.routineId));
  const virtual: Todo[] = d.routines
    .filter((r) => !r.manualAdd && !touched.has(r.id) && occursOn(r, day))
    .map((r) => ({
      id: virtualId(r.id, day), categoryId: r.categoryId, title: r.title, date: day, sortOrder: 1000 + r.sortOrder, isDone: false,
      memo: "", memoIsPrivate: false, timerSeconds: 0, routineId: r.id, routineDate: day, createdAt: day,
      remindAt: routineAlarm(r.timeOfDay, day),
    }));
  return [...real, ...virtual];
}

/** Routines that can be added by hand on this day (manual-add routines). */
export const manualRoutinesOn = (d: DB, day: Day, categoryId: string) =>
  d.routines.filter((r) => r.manualAdd && r.categoryId === categoryId && occursOn(r, day) && !d.todos.some((t) => t.routineId === r.id && t.routineDate === day));

