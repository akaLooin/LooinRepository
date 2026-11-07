import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import type { DB } from "../data/types";
import { today } from "../lib/dates";
import { ACTIVE_KEY, QUEUE_KEY, toggleQueued, widgetModel } from "./model";
import { TodayWidget } from "./TodayWidget";

/** Reads what the app saved on the phone (the widget runs on its own, the app may be closed). */
export async function loadWidgetModel() {
  const [key, queueRaw] = await Promise.all([AsyncStorage.getItem(ACTIVE_KEY), AsyncStorage.getItem(QUEUE_KEY)]);
  const saved = key ? await AsyncStorage.getItem(key) : null;
  let db: DB | null = null;
  try { db = saved ? (JSON.parse(saved).db as DB) : null; } catch { db = null; }
  let queue: string[] = [];
  try { queue = queueRaw ? JSON.parse(queueRaw) : []; } catch { queue = []; }
  return { db, queue };
}

/**
 * Runs when the widget is added, refreshed (every 30 minutes, for the date) or tapped. A tapped clover goes into a
 * queue the app applies when it next opens (so syncing stays in one place); the widget shows the check at once.
 */
export async function widgetTaskHandler({ widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === "WIDGET_DELETED") return;
  let { db, queue } = await loadWidgetModel();
  if (widgetAction === "WIDGET_CLICK" && clickAction === "TOGGLE" && typeof clickActionData?.id === "string") {
    queue = toggleQueued(queue, clickActionData.id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
  renderWidget(<TodayWidget model={widgetModel(db, today(), queue)} />);
}
