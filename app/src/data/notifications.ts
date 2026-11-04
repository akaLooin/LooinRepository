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
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const n of planNotifications(db, new Date())) {
        await Notifications.scheduleNotificationAsync({
          identifier: n.key,
          content: { title: n.title, body: n.body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL },
        });
      }
    } catch {
      // Scheduling is best effort; the next change or app start tries again.
    }
  }
}
