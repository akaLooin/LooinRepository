// Pure: which local notifications the phone should have scheduled right now. No React Native imports.
import { isVirtual, todosForDay } from "../data/occurrences";
import type { DB } from "../data/types";
import { addDays, toDay } from "./dates";

export type PlannedNotification = { key: string; at: Date; title: string; body: string };

const DAYS_AHEAD = 7; // reminders are re-planned whenever the app opens or data changes
const MAX = 60; // stay well under Android's limit on scheduled alarms

/**
 * Daily reminders (S22) for the next week, with that day's count in the text, plus each to-do alarm (S05 시간 알림)
 * that is in the future and not done. Re-run after every change; the scheduler replaces everything it scheduled before.
 */
export function planNotifications(db: DB, now: Date): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const todayDay = toDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(todayDay, i);
    const [y, m, d] = day.split("-").map(Number);
    const todos = todosForDay(db, day);
    const left = todos.filter((t) => !t.isDone).length;
    // routine occurrences with a time that have no row yet ring too (rows are covered below)
    for (const t of todos) {
      if (!isVirtual(t.id) || !t.remindAt) continue;
      const at = new Date(t.remindAt);
      if (at > now) out.push({ key: `todo:${t.id}`, at, title: t.title, body: "할 일 시간이에요" });
    }
    for (const r of db.reminders) {
      const [hh, mm] = r.timeOfDay.split(":").map(Number);
      const at = new Date(y, m - 1, d, hh, mm);
      if (at <= now) continue;
      const body = left > 0 ? `아직 ${left}개 남았어요` : todos.length ? "오늘 할 일을 모두 끝냈어요" : "오늘 할 일을 적어 볼까요?";
      out.push({ key: `reminder:${r.id}:${day}`, at, title: "오늘 할 일", body });
    }
  }
  for (const t of db.todos) {
    if (!t.remindAt || t.isDone || t.isSkipped) continue;
    const at = new Date(t.remindAt);
    if (at <= now) continue;
    out.push({ key: `todo:${t.id}`, at, title: t.title, body: "할 일 시간이에요" });
  }
  return out.sort((a, b) => +a.at - +b.at).slice(0, MAX);
}
