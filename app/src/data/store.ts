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
import { seed } from "./seed";
import { applyPull, emptyOutbox, pendingCount, push, settle, sinceFor, track, type Outbox, type Remote } from "./sync";
import { occursOn } from "../lib/routines";
import type { Category, DB, DDay, Profile, Routine, Todo, Visibility } from "./types";

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
}

const storageKey = () => (session.mode === "cloud" ? `todomate:${session.userId}` : "todomate:demo");
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    AsyncStorage.setItem(storageKey(), JSON.stringify({ v: 1, db, outbox, lastPulled })).catch(() => {});
  }, 300);
}

const emptyDB = (userId: string): DB => ({ profile: { id: userId, nickname: "", bio: "" }, categories: [], todos: [], routines: [], ddays: [] });

/** Loads this device's copy for the session, then (cloud) syncs. */
export async function startSession(next: Session) {
  stopSync();
  session = next;
  const saved = await AsyncStorage.getItem(storageKey()).catch(() => null);
  const parsed = saved ? JSON.parse(saved) : null;
  db = parsed?.db ?? (next.mode === "demo" ? seed() : emptyDB(next.userId));
  db = { ...db, routines: db.routines ?? [] };
  outbox = parsed?.outbox ?? emptyOutbox();
  lastPulled = parsed?.lastPulled ?? null;
  notify();
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
    const { sent, rejected } = await push({ db, outbox, lastPulled }, s.remote, s.userId);
    if (session !== s) return; // signed out meanwhile
    outbox = settle(outbox, sent);
    const pulled = await s.remote.pull(sinceFor(lastPulled));
    if (session !== s) return;
    db = applyPull(db, outbox, pulled);
    lastPulled = pulled.serverTime;
    notify();
    persistSoon();
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

/** Id of a routine occurrence that has no row yet. */
export const virtualId = (routineId: string, day: Day) => `r:${routineId}:${day}`;
export const isVirtual = (id: string) => id.startsWith("r:");

/**
 * To-dos for a day, including routine occurrences that have no row yet (shown as virtual rows).
 * A row exists once the user touches the occurrence (checks, edits, moves, skips).
 */
export function todosForDay(d: DB, day: Day): Todo[] {
  const real = d.todos.filter((t) => t.date === day && !t.isSkipped);
  const touched = new Set(d.todos.filter((t) => t.routineId && t.routineDate === day).map((t) => t.routineId));
  const virtual: Todo[] = d.routines
    .filter((r) => !r.manualAdd && !touched.has(r.id) && occursOn(r, day))
    .map((r) => ({
      id: virtualId(r.id, day), categoryId: r.categoryId, title: r.title, date: day, sortOrder: 1000 + r.sortOrder, isDone: false,
      memo: "", memoIsPrivate: false, timerSeconds: 0, routineId: r.id, routineDate: day, createdAt: day,
    }));
  return [...real, ...virtual];
}

/** Routines that can be added by hand on this day (manual-add routines). */
export const manualRoutinesOn = (d: DB, day: Day, categoryId: string) =>
  d.routines.filter((r) => r.manualAdd && r.categoryId === categoryId && occursOn(r, day) && !d.todos.some((t) => t.routineId === r.id && t.routineDate === day));

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

export function reorderCategories(ids: string[]) {
  set({ ...db, categories: db.categories.map((c) => ({ ...c, sortOrder: ids.indexOf(c.id) + 1 })) });
}

// ── to-dos ─────────────────────────────────────────────────
export class EndedCategoryError extends Error {}

export function addTodo(categoryId: string, date: Day, title: string) {
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
  if (t) copyTodo(id, addDays(t.date, 1));
};

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

export function moveDDay(id: string, dir: -1 | 1) {
  const list = [...db.ddays].sort(byOrder);
  const i = list.findIndex((d) => d.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  set({ ...db, ddays: db.ddays.map((d) => ({ ...d, sortOrder: list.findIndex((x) => x.id === d.id) + 1 })) });
}
export type { Category, DDay, Profile, Routine, Todo };
