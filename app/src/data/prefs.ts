/**
 * Display preferences (설정 → 화면). Stored on this device. The server has a user_settings table for when these
 * should follow the account across devices; that is not wired yet.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { SYNCED } from "./prefsRow";
import type { FontFace } from "../theme/fonts";
import type { PomodoroSession } from "../lib/pomodoro";

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
  checkColor: "white" | "black"; // the tick on a finished clover (user request: white by default, black as an option)
  cloverNumberColor: "white" | "black"; // the number left on a coloured calendar clover (user request: white by default)
  smallTodoPhoto: boolean; // 할 일 사진 작게 보기
  showLikesInFeed: boolean; // 피드에서 좋아요 보이기 (feed is phase 2)
  // 개인정보 보호 and 알림 (original's screens). They take effect with friends (phase 2); kept on this device until then.
  followApproval: boolean;
  likesTodo: Audience; likesDiary: Audience; chatFrom: Audience;
  searchable: boolean;
  notifyMarketing: boolean; notifyLikes: boolean; notifyFollowing: boolean;
  notifyChat: boolean; // 대화 메시지 푸시 (this app's own row)
  font: FontFace; // 설정 → 화면 → 폰트
  feedMemoLines: number; // 피드에서 메모 줄 제한: 0 = 무제한 (feed is phase 2)
  // 할 일 캘린더: how many to-dos one day shows before "+n" (0 = 무제한)
  monthCalendarMax: number; weekCalendarMax: number;
  // 타이머 ⋯ → 스톱워치 / 뽀모도로 (user's feature); this phone only
  timerMode: "stopwatch" | "pomodoro"; pomodoroMinutes: number; pomodoro: PomodoroSession | null;
  // 캘린더 종류 (home ▼, user's feature): "basic" = 할 일 캘린더, "span" = 일정 캘린더; this phone only
  calendarKind: "basic" | "span";
  // 일정 시간표: an hour's height, set by spreading or squeezing two fingers; this phone only
  timelineHourHeight: number;
  // 강조 색 (설정 → 화면): the glow of important days and events (user: #00FF7F by default)
  glowColor: string;
  // 강조 색 (메인 앱, user 2026-11-23): "follow" = each item glows in its own colour (the event's, the to-do's
  // category's); "custom" = a colour picked per to-do category and per 일정 카테고리 (glowColors, by category id;
  // "event:none" = events without a category); this phone only
  glowMode: "follow" | "custom";
  glowColors: Record<string, string>;
  // 구글 캘린더 (메인 앱): connected (the app then asks the server to sync with Google after its own sync); this phone
  googleLinked: boolean;
  // 강조 효과의 불씨·불꽃 (메인 앱): on by default; off keeps only the glow; this phone only
  glowParticles: boolean;
  // 구글 캘린더 (메인 앱): the picked, writable calendars, offered in the event editor (kept so it works offline)
  googleCalendars: { id: string; summary: string; color: string; categoryId?: string | null }[];
  // the connected Google account (shown as what an event can be put in)
  googleEmail: string | null;
  // the colours Google answers for this account: an event's own (by colorId) and how many calendar colours it has
  googleEventColors: { id: string; hex: string }[];
  googleCalendarColorCount: number;
  // each picked calendar's event labels (Google's newer colours): calendar id → label colours
  googleLabels: Record<string, { id: string; hex: string }[]>;
  // 일정 카테고리 of Google calendars that can only be read: never offered as a category (user, 2026-11-23)
  googleReadOnlyCategoryIds: string[];
  // Google calendars that can only be read: their events are shown, never changed in 립마크 (user, 2026-11-23)
  googleReadOnlyCalendarIds: string[];
  // every calendar of the connected account (all are synced, user 2026-11-23), for 보기 설정
  googleAllCalendars: { id: string; summary: string; color: string }[];
  // 보기 설정 (달력 탭): Google calendars whose events the 달력 tab hides; the editor still offers them; this phone
  hiddenGoogleCalendarIds: string[];
  // 오늘 (design app): the category the input bar adds to; this phone only
  quickAddCategory: string | null;
  // 홈 바로가기 (design app): ids in order, null = the default set; this phone only
  homeShortcuts: string[] | null;
  // 스킨 (메인 앱): the one in use and the ones owned (a shop adds more later); this phone only
  skin: "default" | "twilight" | "pixel" | "love" | "winter";
  ownedSkins: string[];
};

export type Audience = "all" | "followers" | "none";

export const DEFAULT_PREFS: Prefs = {
  theme: "dark", weekStartsSunday: true, doubleTapToEdit: true, use24h: true, smallTodoText: false, smallTodoMemo: false, todoSort: "done_last", uiScale: "auto",
  calendarCategoryIds: null, calendarCategoryCount: 2, collapsibleCategories: false, collapsedCategoryIds: [], inputAtTop: false, checkColor: "white", cloverNumberColor: "white",
  smallTodoPhoto: false, showLikesInFeed: true,
  followApproval: false, likesTodo: "all", likesDiary: "all", chatFrom: "all", searchable: true,
  notifyMarketing: false, notifyLikes: true, notifyFollowing: true, notifyChat: true,
  font: "pretendard", feedMemoLines: 0,
  timerMode: "stopwatch", pomodoroMinutes: 25, pomodoro: null, calendarKind: "basic", timelineHourHeight: 52, glowColor: "#00FF7F", glowMode: "follow", glowColors: {}, googleLinked: false, glowParticles: true, googleCalendars: [], googleEmail: null, googleEventColors: [], googleCalendarColorCount: 0, googleLabels: {}, googleReadOnlyCategoryIds: [], googleReadOnlyCalendarIds: [], googleAllCalendars: [], hiddenGoogleCalendarIds: [], quickAddCategory: null, homeShortcuts: null, skin: "default", ownedSkins: ["default", "twilight", "pixel", "love", "winter"],
  monthCalendarMax: 10, weekCalendarMax: 0, // the original's defaults (user's screenshot of 설정 → 화면)
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
