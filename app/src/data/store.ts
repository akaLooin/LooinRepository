/**
 * Fake data layer: in-memory, seeded, same function names the real one (SQLite + Supabase sync) will have.
 * Screens only use the hooks and actions exported here, so replica-backend can swap the inside without
 * touching screen code.
 */
import { useSyncExternalStore } from "react";
import { addDays, today, type Day } from "../lib/dates";
import { seed } from "./seed";
import type { Category, DB, DDay, Profile, Todo, Visibility } from "./types";

let db: DB = seed();
const listeners = new Set<() => void>();
function set(next: DB) {
  db = next;
  listeners.forEach((l) => l());
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
  // Placeholder until expo-crypto is added with the real data layer.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const now = () => new Date().toISOString();
const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;
const nextOrder = (xs: { sortOrder: number }[]) => (xs.length ? Math.max(...xs.map((x) => x.sortOrder)) + 1 : 1);

// ── selectors ──────────────────────────────────────────────
export const selectCategories = (d: DB) => [...d.categories].sort(byOrder);
export const selectActiveCategories = (d: DB) => selectCategories(d).filter((c) => !c.endedAt);
export const selectTodosOn = (day: Day) => (d: DB) => d.todos.filter((t) => t.date === day).sort(byOrder);
export const selectDDays = (d: DB) => [...d.ddays].sort(byOrder);

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
  set({ ...db, categories: db.categories.filter((c) => c.id !== id), todos: db.todos.filter((t) => t.categoryId !== id) });
}

/** Moves every to-do to another category. */
export function moveCategoryTodos(fromId: string, toId: string) {
  set({ ...db, todos: db.todos.map((t) => (t.categoryId === fromId ? { ...t, categoryId: toId } : t)) });
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

export function updateTodo(id: string, patch: Partial<Todo>) {
  set({ ...db, todos: db.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

export function toggleTodo(id: string) {
  const t = db.todos.find((x) => x.id === id);
  if (!t) return;
  updateTodo(id, t.isDone ? { isDone: false, doneAt: undefined } : { isDone: true, doneAt: now() });
}

export function deleteTodo(id: string) {
  set({ ...db, todos: db.todos.filter((t) => t.id !== id) });
}

/** 날짜 바꾸기 */
export function moveTodo(id: string, date: Day) {
  const t = db.todos.find((x) => x.id === id);
  if (!t) return;
  const same = db.todos.filter((x) => x.categoryId === t.categoryId && x.date === date);
  updateTodo(id, { date, sortOrder: nextOrder(same) });
}

/** 내일 또 하기 / 다른 날 또 하기: a fresh, unchecked copy on another day. */
export function copyTodo(id: string, date: Day) {
  const t = db.todos.find((x) => x.id === id);
  if (!t) return;
  const same = db.todos.filter((x) => x.categoryId === t.categoryId && x.date === date);
  const copy: Todo = { ...t, id: newId(), date, isDone: false, doneAt: undefined, timerSeconds: 0, timerStartedAt: undefined,
    photoUri: undefined, routineId: undefined, routineDate: undefined, sortOrder: nextOrder(same), createdAt: now() };
  set({ ...db, todos: [...db.todos, copy] });
}

export const copyTodoTomorrow = (id: string) => {
  const t = db.todos.find((x) => x.id === id);
  if (t) copyTodo(id, addDays(t.date, 1));
};

// ── d-days ─────────────────────────────────────────────────
export function ddayLabel(target: Day, from: Day = today()) {
  const ms = Date.parse(target) - Date.parse(from);
  const n = Math.round(ms / 86400000);
  return n === 0 ? "D-DAY" : n > 0 ? `D-${n}` : `D+${-n}`;
}
export type { Category, DDay, Profile, Todo };
