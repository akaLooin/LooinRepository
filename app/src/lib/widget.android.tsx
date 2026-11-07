import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestWidgetUpdate } from "react-native-android-widget";
import type { DB } from "../data/types";
import { today } from "./dates";
import { ACTIVE_KEY, QUEUE_KEY, WIDGET_NAME, widgetModel } from "../widget/model";
import { TodayWidget } from "../widget/TodayWidget";

/** Tells the widget which saved copy to read (the signed-in account's), or none after signing out. */
export async function setWidgetSource(key: string | null) {
  if (key) await AsyncStorage.setItem(ACTIVE_KEY, key).catch(() => {});
  else await AsyncStorage.removeItem(ACTIVE_KEY).catch(() => {});
}

/** The to-dos checked on the widget since the app last looked; the queue is emptied. */
export async function takeWidgetChecks(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    await AsyncStorage.removeItem(QUEUE_KEY);
    const q = JSON.parse(raw);
    return Array.isArray(q) ? q.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Redraws widgets on the home screen after a change in the app (debounced; nothing happens if none is placed). */
export function refreshWidget(db: DB | null) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => <TodayWidget model={widgetModel(db, today(), [])} /> }).catch(() => {});
  }, 600);
}
