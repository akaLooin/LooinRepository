// Local objects (camelCase) <-> Supabase rows (snake_case). Field lists follow supabase/migrations.
import type { Category, DDay, Diary, Profile, Reminder, Routine, Todo } from "./types";

export type Table = "categories" | "routines" | "todos" | "ddays" | "diaries" | "reminders";
export const TABLES: Table[] = ["categories", "routines", "todos", "ddays", "diaries", "reminders"]; // push order (parents first)

type Row = Record<string, unknown>;
const n = (v: unknown) => (v === undefined ? null : v);
const u = <T,>(v: T | null | undefined) => (v === null ? undefined : v) as T | undefined;

export const toRow = {
  // the newer columns (migration 20261107000000) are sent only once set, so a project without them keeps syncing
  profiles: (p: Profile): Row => ({
    id: p.id, nickname: p.nickname, bio: p.bio, avatar_path: n(p.avatarUri), status_emoji: n(p.statusEmoji),
    ...(p.handle !== undefined ? { handle: p.handle || null } : {}),
    ...(p.interests !== undefined ? { interests: p.interests } : {}),
    ...(p.gender !== undefined ? { gender: p.gender } : {}),
    ...(p.birthMonth !== undefined ? { birth_month: p.birthMonth || null } : {}),
  }),
  categories: (c: Category, user_id: string): Row => ({ id: c.id, user_id, title: c.title, color: c.color, visibility: c.visibility, sort_order: c.sortOrder, ended_at: n(c.endedAt) }),
  routines: (r: Routine, user_id: string): Row => ({
    id: r.id, user_id, category_id: r.categoryId, title: r.title, start_date: r.startDate, end_date: n(r.endDate), repeat_type: r.repeatType,
    interval_days: n(r.intervalDays), weekdays: n(r.weekdays), month_days: n(r.monthDays), year_month: n(r.yearMonth), year_day: n(r.yearDay),
    time_of_day: n(r.timeOfDay), memo: r.memo, manual_add: r.manualAdd, sort_order: r.sortOrder,
  }),
  todos: (t: Todo, user_id: string): Row => ({
    id: t.id, user_id, category_id: t.categoryId, title: t.title, date: t.date, sort_order: t.sortOrder, is_done: t.isDone, done_at: n(t.doneAt),
    memo: t.memo, memo_is_private: t.memoIsPrivate, remind_at: n(t.remindAt), photo_path: n(t.photoUri), timer_seconds: t.timerSeconds,
    timer_started_at: n(t.timerStartedAt), routine_id: n(t.routineId), routine_date: n(t.routineDate), is_skipped: t.isSkipped ?? false,
  }),
  reminders: (r: Reminder, user_id: string): Row => ({ id: r.id, user_id, time_of_day: r.timeOfDay }),
  diaries: (d: Diary, user_id: string): Row => ({
    id: d.id, user_id, date: d.date, emoji: n(d.emoji), body: d.body, visibility: d.visibility, background_color: n(d.backgroundColor), image_paths: d.imagePaths,
    // only once set: a server without the column (SQL 20261109000100 not run yet) still takes the diary
    ...(d.moodTemp !== undefined ? { mood_temp: d.moodTemp } : {}),
  }),
  ddays: (d: DDay, user_id: string): Row => ({ id: d.id, user_id, title: d.title, type: d.type, target_date: d.targetDate, repeat_unit: n(d.type === "repeat" ? d.repeatUnit ?? "yearly" : undefined), is_private: d.isPrivate, sort_order: d.sortOrder,
    // only once set: a server without the column (SQL 20261112000000 not run yet) still takes the D-day
    ...(d.includeToday !== undefined ? { include_today: d.includeToday } : {}) }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;
export const fromRow = {
  profiles: (r: R): Profile => ({
    id: r.id, nickname: r.nickname, bio: r.bio ?? "", avatarUri: u(r.avatar_path), statusEmoji: u(r.status_emoji),
    handle: u(r.handle), interests: Array.isArray(r.interests) ? r.interests.map(String) : undefined,
    gender: r.gender === "male" || r.gender === "female" || r.gender === "nonbinary" ? r.gender : undefined, birthMonth: u(r.birth_month),
  }),
  categories: (r: R): Category => ({ id: r.id, title: r.title, color: r.color, visibility: r.visibility, sortOrder: Number(r.sort_order), endedAt: u(r.ended_at) }),
  routines: (r: R): Routine => ({
    id: r.id, categoryId: r.category_id, title: r.title, startDate: r.start_date, endDate: u(r.end_date), repeatType: r.repeat_type,
    intervalDays: u(r.interval_days), weekdays: u(r.weekdays), monthDays: u(r.month_days), yearMonth: u(r.year_month), yearDay: u(r.year_day),
    timeOfDay: r.time_of_day ? String(r.time_of_day).slice(0, 5) : undefined, memo: r.memo ?? "", manualAdd: !!r.manual_add, sortOrder: Number(r.sort_order),
  }),
  todos: (r: R): Todo => ({
    id: r.id, categoryId: r.category_id, title: r.title, date: r.date, sortOrder: Number(r.sort_order), isDone: !!r.is_done, doneAt: u(r.done_at),
    memo: r.memo ?? "", memoIsPrivate: !!r.memo_is_private, remindAt: u(r.remind_at), photoUri: u(r.photo_path), timerSeconds: r.timer_seconds ?? 0,
    timerStartedAt: u(r.timer_started_at), routineId: u(r.routine_id), routineDate: u(r.routine_date), isSkipped: !!r.is_skipped, createdAt: r.created_at ?? "",
  }),
  reminders: (r: R): Reminder => ({ id: r.id, timeOfDay: String(r.time_of_day).slice(0, 5) }),
  diaries: (r: R): Diary => ({
    id: r.id, date: r.date, emoji: u(r.emoji), body: r.body ?? "", visibility: r.visibility, backgroundColor: u(r.background_color), imagePaths: r.image_paths ?? [],
    ...(typeof r.mood_temp === "number" ? { moodTemp: r.mood_temp } : {}),
  }),
  ddays: (r: R): DDay => ({ id: r.id, title: r.title, type: r.type, targetDate: r.target_date, repeatUnit: u(r.repeat_unit), isPrivate: !!r.is_private, sortOrder: Number(r.sort_order),
    ...(typeof r.include_today === "boolean" ? { includeToday: r.include_today } : {}) }),
};
