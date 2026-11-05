/**
 * Data layer. Screens use only the hooks and actions exported here.
 * Every change lands in this device's copy first (saved to AsyncStorage) and, when signed in, is pushed to
 * Supabase in the background; changes from other devices are pulled in. See ./sync.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { addDays, today, type Day } from "../lib/dates";
import { isUploaded, rememberLocal } from "../lib/photoPaths";
import { rescheduleNotifications } from "./notifications";
import { applyRemoteSettings, getPrefs, settingsDirty, settingsSent } from "./prefs";
import { fromSettingsRow, toSettingsRow } from "./prefsRow";
import { seed } from "./seed";
import { applyPull, emptyOutbox, pendingCount, push, settle, sinceFor, track, upgradeOutbox, type Outbox, type Remote } from "./sync";
import type { Category, DB, DDay, Diary, Profile, Reminder, Routine, Todo, Visibility } from "./types";

// ── session: demo (sample data, this device only) or cloud (signed in, synced) ──
type Session = { mode: "demo" } | { mode: "cloud"; userId: string; remote: Remote };
let session: Session = { mode: "demo" };
let db: DB = seed();
let outbox: Outbox = emptyOutbox();
let lastPulled: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function set(next: DB) {
  if (session.mode === "cloud") outbox = track(db, next, outbox);
  db = next;
  notify();
  persistSoon();
  syncSoon();
  notificationsSoon();
}

let notifTimer: ReturnType<typeof setTimeout> | null = null;
function notificationsSoon() {
  if (notifTimer) clearTimeout(notifTimer);
  notifTimer = setTimeout(() => rescheduleNotifications(db), 1000);
}

const storageKey = () => (session.mode === "cloud" ? `todomate:${session.userId}` : "todomate:demo");
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    AsyncStorage.setItem(storageKey(), JSON.stringify({ v: 1, db, outbox, lastPulled })).catch(() => {});
  }, 300);
}

const emptyDB = (userId: string): DB => ({ profile: { id: userId, nickname: "", bio: "" }, categories: [], todos: [], routines: [], ddays: [], diaries: [], reminders: [] });

/** Loads this device's copy for the session, then (cloud) syncs. */
export async function startSession(next: Session) {
  stopSync();
  session = next;
  const saved = await AsyncStorage.getItem(storageKey()).catch(() => null);
  const parsed = saved ? JSON.parse(saved) : null;
  db = parsed?.db ?? (next.mode === "demo" ? seed() : emptyDB(next.userId));
  db = { ...db, routines: db.routines ?? [], diaries: db.diaries ?? [], reminders: db.reminders ?? [] }; // copies saved by older versions
  outbox = upgradeOutbox(parsed?.outbox);
  lastPulled = parsed?.lastPulled ?? null;
  notify();
  notificationsSoon();
  if (next.mode === "cloud") startSync();
}

/** Signing out forgets this device's copy (the server keeps everything). */
export async function endSession() {
  stopSync();
  if (session.mode === "cloud") await AsyncStorage.removeItem(storageKey()).catch(() => {});
  session = { mode: "demo" };
  db = emptyDB("signed-out");
  outbox = emptyOutbox();
  lastPulled = null;
  notify();
}

// ── sync runner ────────────────────────────────────────────
export type SyncStatus = { state: "idle" | "syncing" | "offline"; pending: number; lastSyncedAt?: string; rejected: { table: string; id: string; error: string }[] };
let status: SyncStatus = { state: "idle", pending: 0, rejected: [] };
const statusListeners = new Set<() => void>();
function setStatus(s: Partial<SyncStatus>) {
  status = { ...status, ...s, pending: pendingCount(outbox) };
  statusListeners.forEach((l) => l());
}
export function useSyncStatus() {
  return useSyncExternalStore((l) => { statusListeners.add(l); return () => statusListeners.delete(l); }, () => status, () => status);
}

let running = false;
let again = false;
export async function syncNow() {
  if (session.mode !== "cloud") return;
  if (running) { again = true; return; }
  running = true;
  const s = session;
  setStatus({ state: "syncing" });
  try {
    await uploadPendingPhotos(s.remote, s.userId);
    if (session !== s) return;
    const pending = settingsDirty();
    if (pending && s.remote.upsertSettings && (await s.remote.upsertSettings(toSettingsRow(getPrefs(), s.userId)))) settingsSent(pending);
    const { sent, rejected } = await push({ db, outbox, lastPulled }, s.remote, s.userId);
    if (session !== s) return; // signed out meanwhile
    outbox = settle(outbox, sent);
    const pulled = await s.remote.pull(sinceFor(lastPulled));
    if (session !== s) return;
    db = applyPull(db, outbox, pulled);
    const remoteSettings = (pulled.tables as Record<string, Record<string, unknown>[] | undefined>).user_settings?.[0];
    if (remoteSettings) applyRemoteSettings(fromSettingsRow(remoteSettings));
    lastPulled = pulled.serverTime;
    notify();
    persistSoon();
    notificationsSoon();
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), rejected: [...status.rejected, ...rejected].slice(-20) });
  } catch {
    setStatus({ state: "offline" });
  } finally {
    running = false;
    if (again) { again = false; syncSoon(); }
  }
}

let soon: ReturnType<typeof setTimeout> | null = null;
function syncSoon() {
  if (session.mode !== "cloud") return;
  if (soon) clearTimeout(soon);
  soon = setTimeout(syncNow, 2000);
}
let interval: ReturnType<typeof setInterval> | null = null;
let appState: { remove: () => void } | null = null;
function startSync() {
  syncNow();
  interval = setInterval(syncNow, 60000);
  appState = AppState.addEventListener("change", (s) => { if (s === "active") syncNow(); });
}
function stopSync() {
  if (interval) clearInterval(interval);
  if (soon) clearTimeout(soon);
  appState?.remove();
  interval = null; soon = null; appState = null;
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const snapshot = () => db;
export function useDB<T>(select: (db: DB) => T): T {
  return select(useSyncExternalStore(subscribe, snapshot, snapshot));
}

export function newId() {
  return Crypto.randomUUID();
}

const now = () => new Date().toISOString();
const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;
const nextOrder = (xs: { sortOrder: number }[]) => (xs.length ? Math.max(...xs.map((x) => x.sortOrder)) + 1 : 1);

// ── selectors ──────────────────────────────────────────────
export const selectCategories = (d: DB) => [...d.categories].sort(byOrder);
export const selectActiveCategories = (d: DB) => selectCategories(d).filter((c) => !c.endedAt);
export const selectTodosOn = (day: Day) => (d: DB) => d.todos.filter((t) => t.date === day).sort(byOrder);
export const selectDDays = (d: DB) => [...d.ddays].sort(byOrder);
export const selectRoutines = (d: DB) => [...d.routines].sort(byOrder);

export { isVirtual, manualRoutinesOn, todosForDay, virtualId } from "./occurrences";
import { isVirtual, todosForDay } from "./occurrences";

// ── profile ────────────────────────────────────────────────
export function updateProfile(patch: Partial<Profile>) {
  set({ ...db, profile: { ...db.profile, ...patch } });
}

// ── categories ─────────────────────────────────────────────
export function saveCategory(input: { id?: string; title: string; color: string; visibility: Visibility }) {
  if (input.id && db.categories.some((c) => c.id === input.id)) {
    set({ ...db, categories: db.categories.map((c) => (c.id === input.id ? { ...c, ...input } : c)) });
    return input.id;
  }
  const id = input.id ?? newId();
  set({ ...db, categories: [...db.categories, { id, title: input.title, color: input.color, visibility: input.visibility, sortOrder: nextOrder(db.categories) }] });
  return id;
}

export function endCategory(id: string, ended: boolean) {
  set({ ...db, categories: db.categories.map((c) => (c.id === id ? { ...c, endedAt: ended ? now() : undefined } : c)) });
}

/** Deletes the category and every to-do in it (the original's stated behaviour). */
export function deleteCategory(id: string) {
  set({ ...db, categories: db.categories.filter((c) => c.id !== id), todos: db.todos.filter((t) => t.categoryId !== id), routines: db.routines.filter((r) => r.categoryId !== id) });
}

/** Moves every to-do to another category. */
export function moveCategoryTodos(fromId: string, toId: string) {
  set({ ...db, todos: db.todos.map((t) => (t.categoryId === fromId ? { ...t, categoryId: toId } : t)), routines: db.routines.map((r) => (r.categoryId === fromId ? { ...r, categoryId: toId } : r)) });
}

/** New sortOrder for the listed ids (1, 2, 3…); rows not listed keep theirs. Unchanged rows keep their object, so sync sends only what moved. */
function reorderRows<T extends { id: string; sortOrder: number }>(rows: T[], ids: string[]): T[] {
  return rows.map((r) => { const i = ids.indexOf(r.id); return i < 0 || r.sortOrder === i + 1 ? r : { ...r, sortOrder: i + 1 }; });
}

export function reorderCategories(ids: string[]) {
  set({ ...db, categories: reorderRows(db.categories, ids) });
}

export function reorderRoutines(ids: string[]) {
  set({ ...db, routines: reorderRows(db.routines, ids) });
}

export function reorderDDays(ids: string[]) {
  set({ ...db, ddays: reorderRows(db.ddays, ids) });
}

/** To-dos within one category on one day. Routine occurrences become real rows first so their place sticks. */
export function reorderTodos(ids: string[]) {
  const real = ids.map((id) => materialize(id));
  set({ ...db, todos: reorderRows(db.todos, real) });
}

/**
 * After a drag across the day's list: each to-do takes the category it now sits under and its place there.
 * An ended category takes no new to-dos (as with adding), so a to-do dropped there stays where it was.
 * Returns false if a move was refused.
 */
export function arrangeTodos(entries: { id: string; categoryId: string }[]): boolean {
  const real = entries.map((e) => ({ ...e, id: materialize(e.id) }));
  const ended = new Set(db.categories.filter((c) => c.endedAt).map((c) => c.id));
  let ok = true;
  const target = new Map<string, string>();
  for (const e of real) {
    const cur = db.todos.find((t) => t.id === e.id);
    if (!cur) continue;
    if (cur.categoryId !== e.categoryId && ended.has(e.categoryId)) { ok = false; target.set(e.id, cur.categoryId); }
    else target.set(e.id, e.categoryId);
  }
  const order = new Map<string, number>();
  const counters = new Map<string, number>();
  for (const e of real) {
    const cat = target.get(e.id);
    if (!cat) continue;
    const n = (counters.get(cat) ?? 0) + 1;
    counters.set(cat, n);
    order.set(e.id, n);
  }
  set({
    ...db,
    todos: db.todos.map((t) => {
      const cat = target.get(t.id);
      const o = order.get(t.id);
      if (cat === undefined || o === undefined || (t.categoryId === cat && t.sortOrder === o)) return t;
      return { ...t, categoryId: cat, sortOrder: o };
    }),
  });
  return ok;
}

// ── to-dos ─────────────────────────────────────────────────
export class EndedCategoryError extends Error {}

export function addTodo(categoryId: string, date: Day | null, title: string) {
  const cat = db.categories.find((c) => c.id === categoryId);
  if (cat?.endedAt) throw new EndedCategoryError("종료한 카테고리에는 할 일을 추가할 수 없어요.");
  const same = db.todos.filter((t) => t.categoryId === categoryId && t.date === date);
  const todo: Todo = {
    id: newId(), categoryId, title: title.trim(), date, sortOrder: nextOrder(same), isDone: false,
    memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: now(),
  };
  set({ ...db, todos: [...db.todos, todo] });
  return todo.id;
}

/** Turns a virtual routine occurrence into a real row and returns its id. Real ids pass through. */
export function materialize(id: string): string {
  if (!isVirtual(id)) return id;
  const [, routineId, day] = id.split(":");
  const existing = db.todos.find((t) => t.routineId === routineId && t.routineDate === day);
  if (existing) return existing.id;
  const v = todosForDay(db, day).find((t) => t.id === id);
  if (!v) return id;
  const row: Todo = { ...v, id: newId(), createdAt: now() };
  set({ ...db, todos: [...db.todos, row] });
  return row.id;
}

export function updateTodo(id: string, patch: Partial<Todo>) {
  set({ ...db, todos: db.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

export function toggleTodo(id: string) {
  id = materialize(id);
  const t = db.todos.find((x) => x.id === id);
  if (!t) return;
  updateTodo(id, t.isDone ? { isDone: false, doneAt: undefined } : { isDone: true, doneAt: now() });
}

export function deleteTodo(id: string) {
  const t = db.todos.find((x) => x.id === id);
  // A routine occurrence is kept as a skipped row so the routine does not bring it back.
  if (t?.routineId) set({ ...db, todos: db.todos.map((x) => (x.id === id ? { ...x, isSkipped: true } : x)) });
  else set({ ...db, todos: db.todos.filter((x) => x.id !== id) });
}

/** Add a manual-add routine as that day's to-do, titled like the routine (the user can edit it after, e.g. "운동하기: 어깨"). */
export function addRoutineTodo(routineId: string, day: Day, title?: string) {
  const r = db.routines.find((x) => x.id === routineId);
  if (!r) return;
  const row: Todo = { id: newId(), categoryId: r.categoryId, title: title ?? r.title, date: day, sortOrder: nextOrder(db.todos.filter((x) => x.date === day)), isDone: false,
    memo: "", memoIsPrivate: false, timerSeconds: 0, routineId, routineDate: day, createdAt: now() };
  set({ ...db, todos: [...db.todos, row] });
}

// ── routines ───────────────────────────────────────────────
export function saveRoutine(input: Omit<Routine, "id" | "sortOrder"> & { id?: string }) {
  if (input.id && db.routines.some((r) => r.id === input.id)) {
    set({ ...db, routines: db.routines.map((r) => (r.id === input.id ? { ...r, ...input, id: r.id } : r)) });
    return input.id;
  }
  const id = newId();
  const same = db.routines.filter((r) => r.categoryId === input.categoryId);
  set({ ...db, routines: [...db.routines, { ...input, id, sortOrder: nextOrder(same) }] });
  return id;
}

/** Past rows stay (they keep their title and state); only the rule goes away. */
export function deleteRoutine(id: string) {
  set({ ...db, routines: db.routines.filter((r) => r.id !== id), todos: db.todos.map((t) => (t.routineId === id ? { ...t, routineId: undefined, routineDate: undefined } : t)) });
}

/** 날짜 바꾸기 */
export function moveTodo(id: string, date: Day) {
  id = materialize(id);
  const t = db.todos.find((x) => x.id === id);
  if (!t) return;
  const same = db.todos.filter((x) => x.categoryId === t.categoryId && x.date === date);
  updateTodo(id, { date, sortOrder: nextOrder(same) });
}

/** 내일 또 하기 / 다른 날 또 하기: a fresh, unchecked copy on another day. */
export function copyTodo(id: string, date: Day) {
  id = materialize(id);
  const t = db.todos.find((x) => x.id === id);
  if (!t) return;
  const same = db.todos.filter((x) => x.categoryId === t.categoryId && x.date === date);
  const copy: Todo = { ...t, id: newId(), date, isDone: false, doneAt: undefined, timerSeconds: 0, timerStartedAt: undefined,
    photoUri: undefined, routineId: undefined, routineDate: undefined, sortOrder: nextOrder(same), createdAt: now() };
  set({ ...db, todos: [...db.todos, copy] });
}

// ── timer ──────────────────────────────────────────────────
/** Seconds recorded so far, including a running session. Survives the app being closed (only the start time is stored). */
export function timerTotal(t: Pick<Todo, "timerSeconds" | "timerStartedAt">, nowMs = Date.now()) {
  const running = t.timerStartedAt ? Math.max(0, Math.floor((nowMs - Date.parse(t.timerStartedAt)) / 1000)) : 0;
  return t.timerSeconds + running;
}

/** Starts this to-do's timer and stops any other running one (one timer at a time). */
export function startTimer(id: string) {
  id = materialize(id);
  const stamp = now();
  set({
    ...db,
    todos: db.todos.map((t) =>
      t.id === id ? { ...t, timerStartedAt: stamp } : t.timerStartedAt ? { ...t, timerSeconds: timerTotal(t), timerStartedAt: undefined } : t,
    ),
  });
}

export function pauseTimer(id: string) {
  set({ ...db, todos: db.todos.map((t) => (t.id === id && t.timerStartedAt ? { ...t, timerSeconds: timerTotal(t), timerStartedAt: undefined } : t)) });
}

export function resetTimer(id: string) {
  updateTodo(id, { timerSeconds: 0, timerStartedAt: undefined });
}

export const copyTodoTomorrow = (id: string) => {
  id = materialize(id);
  const t = db.todos.find((x) => x.id === id);
  if (t) copyTodo(id, addDays(t.date ?? today(), 1));
};

// ── photos ─────────────────────────────────────────────────
export function setTodoPhoto(id: string, uri: string | null) {
  id = materialize(id);
  updateTodo(id, { photoUri: uri ?? undefined });
}

/**
 * Uploads photos that are still only on this device and swaps their local URI for the stored path, so other devices
 * can show them. Runs at the start of each sync; a failed upload is retried next time.
 */
async function uploadPendingPhotos(remote: Remote, userId: string) {
  if (!remote.uploadImage) return;
  const up = remote.uploadImage;
  const stamp = Date.now();
  for (const t of db.todos.filter((x) => x.photoUri && !isUploaded(x.photoUri))) {
    const path = `${userId}/${t.id}-${stamp}.jpg`;
    if (await up("todo-photos", path, t.photoUri!)) {
      const cur = db.todos.find((x) => x.id === t.id);
      rememberLocal(`todo-photos/${path}`, t.photoUri!);
      if (cur?.photoUri === t.photoUri) updateTodo(t.id, { photoUri: `todo-photos/${path}` });
    }
  }
  const avatar = db.profile.avatarUri;
  if (avatar && !isUploaded(avatar)) {
    const path = `${userId}/avatar-${stamp}.jpg`;
    if (await up("avatars", path, avatar) && db.profile.avatarUri === avatar && rememberLocal(`avatars/${path}`, avatar)) updateProfile({ avatarUri: `avatars/${path}` });
  }
  for (const d of db.diaries.filter((x) => x.imagePaths.some((u) => !isUploaded(u)))) {
    const next: string[] = [];
    for (const [i, u] of d.imagePaths.entries()) {
      if (isUploaded(u)) { next.push(u); continue; }
      const path = `${userId}/${d.id}-${stamp}-${i}.jpg`;
      const ok = await up("diary-images", path, u);
      if (ok) rememberLocal(`diary-images/${path}`, u);
      next.push(ok ? `diary-images/${path}` : u);
    }
    const cur = db.diaries.find((x) => x.id === d.id);
    if (cur && cur.imagePaths.join() === d.imagePaths.join()) set({ ...db, diaries: db.diaries.map((x) => (x.id === d.id ? { ...x, imagePaths: next } : x)) });
  }
}

// ── many at once (리스트 메뉴, 할 일 선택) ─────────────────
/** 보관함: to-dos without a date. */
export const selectInbox = (d: DB) => d.todos.filter((t) => t.date === null && !t.isSkipped);

/** Moves to-dos to a day (null = 보관함). Routine occurrences become real rows first. */
export function moveTodos(ids: string[], date: Day | null) {
  const real = new Set(ids.map((id) => materialize(id)));
  let order = nextOrder(db.todos.filter((x) => x.date === date));
  set({ ...db, todos: db.todos.map((t) => (real.has(t.id) ? { ...t, date, sortOrder: order++ } : t)) });
}

/** Fresh, unchecked copies on another day. */
export function copyTodos(ids: string[], date: Day) {
  const real = ids.map((id) => materialize(id));
  let order = nextOrder(db.todos.filter((x) => x.date === date));
  const copies: Todo[] = db.todos.filter((t) => real.includes(t.id)).map((t) => ({
    ...t, id: newId(), date, isDone: false, doneAt: undefined, timerSeconds: 0, timerStartedAt: undefined, photoUri: undefined,
    routineId: undefined, routineDate: undefined, isSkipped: undefined, sortOrder: order++, createdAt: now(),
  }));
  set({ ...db, todos: [...db.todos, ...copies] });
}

export function deleteTodos(ids: string[]) {
  for (const id of ids) deleteTodo(materialize(id));
}

// ── d-days ─────────────────────────────────────────────────
export { ddayLabel, nextOccurrence } from "./dday";

export function saveDDay(input: Omit<DDay, "id" | "sortOrder"> & { id?: string }) {
  if (input.id && db.ddays.some((d) => d.id === input.id)) {
    set({ ...db, ddays: db.ddays.map((d) => (d.id === input.id ? { ...d, ...input, id: d.id } : d)) });
    return input.id;
  }
  const id = newId();
  set({ ...db, ddays: [...db.ddays, { ...input, id, sortOrder: nextOrder(db.ddays) }] });
  return id;
}

export function deleteDDay(id: string) {
  set({ ...db, ddays: db.ddays.filter((d) => d.id !== id) });
}

// ── diary ──────────────────────────────────────────────────
export const selectDiary = (day: Day) => (d: DB) => d.diaries.find((x) => x.date === day);

/** One diary per day: creates it on first save, updates it after. Saving an empty one removes it. */
export function saveDiary(day: Day, patch: Partial<Omit<Diary, "id" | "date">>) {
  const existing = db.diaries.find((x) => x.date === day);
  const next: Diary = { id: existing?.id ?? newId(), date: day, body: "", visibility: "private", imagePaths: [], ...existing, ...patch };
  const empty = !next.body.trim() && !next.emoji && !next.imagePaths.length;
  if (empty) {
    if (existing) set({ ...db, diaries: db.diaries.filter((x) => x.id !== existing.id) });
    return;
  }
  set({ ...db, diaries: existing ? db.diaries.map((x) => (x.id === existing.id ? next : x)) : [...db.diaries, next] });
}

// ── reminders and alarms ───────────────────────────────────
export const selectReminders = (d: DB) => [...d.reminders].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));

export function addReminder(timeOfDay: string) {
  if (db.reminders.some((r) => r.timeOfDay === timeOfDay)) return false;
  set({ ...db, reminders: [...db.reminders, { id: newId(), timeOfDay }] });
  return true;
}

export function deleteReminder(id: string) {
  set({ ...db, reminders: db.reminders.filter((r) => r.id !== id) });
}

/** Alarm at a time on the to-do's own day; null clears it. */
export function setTodoAlarm(id: string, timeOfDay: string | null) {
  id = materialize(id);
  const t = db.todos.find((x) => x.id === id);
  if (!t) return;
  if (!timeOfDay) return updateTodo(id, { remindAt: undefined });
  const [y, m, d] = (t.date ?? today()).split("-").map(Number);
  const [hh, mm] = timeOfDay.split(":").map(Number);
  updateTodo(id, { remindAt: new Date(y, m - 1, d, hh, mm).toISOString() });
}

export type { Category, DDay, Diary, Profile, Reminder, Routine, Todo };
