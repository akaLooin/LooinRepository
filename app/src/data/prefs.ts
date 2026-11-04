/**
 * Display preferences (설정 → 화면). Stored on this device. The server has a user_settings table for when these
 * should follow the account across devices; that is not wired yet.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { SYNCED } from "./prefsRow";

export type Prefs = {
  theme: "system" | "dark" | "light";
  weekStartsSunday: boolean;
  doubleTapToEdit: boolean;
  use24h: boolean;
  smallTodoText: boolean;
  smallTodoMemo: boolean;
  todoSort: "done_last" | "manual";
  uiScale: "auto" | number; // 화면 크기: auto fits the phone's width
  calendarCategoryIds: string[] | null; // categories the calendar clovers count; null = all
  calendarCategoryCount: number; // how many category colours one clover splits into
  collapsibleCategories: boolean;
  collapsedCategoryIds: string[];
  inputAtTop: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "dark", weekStartsSunday: true, doubleTapToEdit: true, use24h: true, smallTodoText: false, smallTodoMemo: false, todoSort: "done_last", uiScale: "auto",
  calendarCategoryIds: null, calendarCategoryCount: 2, collapsibleCategories: false, collapsedCategoryIds: [], inputAtTop: false,
};

const KEY = "todomate:prefs";
let prefs: Prefs = DEFAULT_PREFS;
/** Counter of unsynced changes to account-wide settings (0 = in step with the server). */
let dirty = 0;
const listeners = new Set<() => void>();

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      dirty = Number(saved.__dirty) || 0;
      delete saved.__dirty;
      prefs = { ...DEFAULT_PREFS, ...saved };
    }
  } catch {
    // keep defaults
  }
  listeners.forEach((l) => l());
}

function save() {
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify({ ...prefs, __dirty: dirty })).catch(() => {});
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  prefs = { ...prefs, [key]: value };
  if (SYNCED.includes(key)) dirty++;
  save();
}

export const getPrefs = () => prefs;
export const settingsDirty = () => dirty;

/** After a successful upload: clear the flag unless something changed while it was in flight. */
export function settingsSent(counter: number) {
  if (dirty === counter) { dirty = 0; save(); }
}

/** Settings from the server; ignored while local changes wait to be sent. */
export function applyRemoteSettings(patch: Partial<Prefs>) {
  if (dirty) return;
  const next = { ...prefs, ...patch };
  if (JSON.stringify(next) === JSON.stringify(prefs)) return;
  prefs = next;
  save();
}

export function usePrefs(): Prefs {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => prefs, () => prefs);
}

export function formatTime(d: Date, use24h: boolean) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  if (use24h) return `${String(h).padStart(2, "0")}:${m}`;
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${m}`;
}
