// Pure: what the home-screen widget shows. No React Native imports, so tests can load it.
import { todosForDay } from "../data/occurrences";
import type { DB } from "../data/types";
import { parseDay, weekday, type Day } from "../lib/dates";

export const WIDGET_NAME = "Today";
/** AsyncStorage keys shared by the app and the widget */
export const ACTIVE_KEY = "todomate:active"; // which saved copy is the signed-in one (todomate:<uid> or todomate:demo)
export const QUEUE_KEY = "todomate:widget-queue"; // to-do ids checked on the widget, applied by the app when it opens

export type WidgetRow = { id: string; title: string; done: boolean; color: string };
export type WidgetModel = { dateLabel: string; rows: WidgetRow[]; left: number; signedOut: boolean };

/** A tap on the widget flips a to-do; a second tap before the app opens cancels the first. */
export function toggleQueued(queue: string[], id: string): string[] {
  return queue.includes(id) ? queue.filter((x) => x !== id) : [...queue, id];
}

/** Today's to-dos in category order, with the checks made on the widget already shown. */
export function widgetModel(db: DB | null, day: Day, queue: string[]): WidgetModel {
  const { m, d } = parseDay(day);
  const dateLabel = `${m}월 ${d}일 ${"일월화수목금토"[weekday(day)]}요일`;
  if (!db) return { dateLabel, rows: [], left: 0, signedOut: true };
  const order = new Map(db.categories.filter((c) => !c.endedAt).map((c) => [c.id, c.sortOrder]));
  const color = new Map(db.categories.map((c) => [c.id, c.color]));
  const rows = todosForDay(db, day)
    .filter((t) => order.has(t.categoryId))
    .sort((a, b) => (order.get(a.categoryId)! - order.get(b.categoryId)!) || a.sortOrder - b.sortOrder)
    .map((t) => ({ id: t.id, title: t.title, done: queue.includes(t.id) ? !t.isDone : t.isDone, color: color.get(t.categoryId) ?? "#00FF7F" }));
  return { dateLabel, rows, left: rows.filter((r) => !r.done).length, signedOut: false };
}
