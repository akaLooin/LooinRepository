/**
 * Schedules the planned local notifications on the phone (no server involved).
 * Everything this app scheduled is replaced on each run, so the phone always matches the plan.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { planNotifications } from "../lib/notificationPlan";
import type { DB } from "./types";

const CHANNEL = "todo-reminders";
const supported = Platform.OS === "android" || Platform.OS === "ios";

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

/**
 * Creates the Android channel. In Expo Go the phone creates it, then fails while sending its description back
 * (a NullPointerException on empty fields), so that error is ignored: it used to stop the permission request and
 * every scheduled alarm.
 */
let channelOk = false;
let lastError: string | null = null;

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "할 일 알림",
      description: "할 일 시간 알림과 리마인더",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {
    // see above
  }
  // Only use our channel if the phone really has it: a notification sent to a missing channel is dropped silently.
  try {
    channelOk = !!(await Notifications.getNotificationChannelAsync(CHANNEL));
  } catch {
    channelOk = false;
  }
}

/** Schedules one notification; falls back to Expo's default channel if ours is missing or refused. */
async function scheduleOne(key: string, title: string, body: string, trigger: { date: Date } | { seconds: number }) {
  const base = "date" in trigger
    ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger.date }
    : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: trigger.seconds };
  const content = { title, body, sound: "default" as const };
  if (channelOk) {
    try {
      await Notifications.scheduleNotificationAsync({ identifier: key, content, trigger: { ...base, channelId: CHANNEL } as Notifications.NotificationTriggerInput });
      return;
    } catch (e) {
      lastError = String(e);
    }
  }
  await Notifications.scheduleNotificationAsync({ identifier: key, content, trigger: base as Notifications.NotificationTriggerInput });
}

/** Asks once, when the user first sets a reminder or alarm. Returns whether notifications can be shown. */
export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  // The plan was skipped while permission was missing; schedule it now that it is allowed.
  if (asked.granted && last) rescheduleNotifications(last);
  return asked.granted;
}

let running: Promise<void> | null = null;
let pending: DB | null = null;
let last: DB | null = null;

export function rescheduleNotifications(db: DB) {
  if (!supported) return;
  pending = db;
  last = db;
  if (!running) running = drain().finally(() => { running = null; });
}

async function drain() {
  while (pending) {
    const db = pending;
    pending = null;
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) return;
      await ensureChannel();
      // replace only what the plan made (a pending test notification survives)
      for (const r of await Notifications.getAllScheduledNotificationsAsync()) {
        if (!r.identifier.startsWith("test:")) await Notifications.cancelScheduledNotificationAsync(r.identifier);
      }
      // one at a time, so a single failure cannot drop the rest
      for (const n of planNotifications(db, new Date())) {
        try {
          await scheduleOne(n.key, n.title, n.body, { date: n.at });
        } catch (e) {
          lastError = String(e);
        }
      }
    } catch (e) {
      // Scheduling is best effort; the next change or app start tries again.
      lastError = String(e);
    }
  }
}

/** For the check on the reminder screen: is everything in place, and what is waiting to ring. */
export async function notificationStatus(): Promise<{ allowed: boolean; scheduled: number; next: Date | null; channel: boolean; error: string | null }> {
  if (!supported) return { allowed: false, scheduled: 0, next: null, channel: false, error: null };
  const perm = await Notifications.getPermissionsAsync();
  await ensureChannel();
  let list: Notifications.NotificationRequest[] = [];
  try { list = await Notifications.getAllScheduledNotificationsAsync(); } catch (e) { lastError = String(e); }
  const times = list
    .map((r) => (r.trigger && "value" in r.trigger ? Number((r.trigger as { value: number }).value) : r.trigger && "date" in r.trigger ? Number((r.trigger as { date: number }).date) : NaN))
    .filter((x) => Number.isFinite(x) && x > Date.now())
    .sort((a, b) => a - b);
  return { allowed: perm.granted, scheduled: list.length, next: times.length ? new Date(times[0]) : null, channel: channelOk, error: lastError };
}

/** Sends a test notification in a few seconds (close the app to see it arrive in the background). */
export async function sendTestNotification(seconds = 10): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await scheduleOne(`test:${Date.now()}`, "알림 테스트", "알림이 잘 와요", { seconds });
  return true;
}
