/**
 * Display preferences (설정 → 화면). Stored on this device. The server has a user_settings table for when these
 * should follow the account across devices; that is not wired yet.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

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
  hideDone: boolean; // 리스트 메뉴: hide finished to-dos on home
};

export const DEFAULT_PREFS: Prefs = {
  theme: "dark", weekStartsSunday: true, doubleTapToEdit: true, use24h: true, smallTodoText: false, smallTodoMemo: false, todoSort: "done_last", uiScale: "auto",
  calendarCategoryIds: null, calendarCategoryCount: 2, collapsibleCategories: false, collapsedCategoryIds: [], inputAtTop: false, hideDone: false,
};

const KEY = "todomate:prefs";
let prefs: Prefs = DEFAULT_PREFS;
const listeners = new Set<() => void>();

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) prefs = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    // keep defaults
  }
  listeners.forEach((l) => l());
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  prefs = { ...prefs, [key]: value };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
}

export function usePrefs(): Prefs {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => prefs, () => prefs);
}

export function formatTime(d: Date, use24h: boolean) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  if (use24h) return `${String(h).padStart(2, "0")}:${m}`;
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${m}`;
}
