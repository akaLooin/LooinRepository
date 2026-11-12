/**
 * Schedules the planned local notifications on the phone (no server involved).
 * Everything this app scheduled is replaced on each run, so the phone always matches the plan.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { planNotifications } from "../lib/notificationPlan";
import { isOpenChat } from "../lib/push";
import type { DB } from "./types";

const CHANNEL = "todo-reminders";
const supported = Platform.OS === "android" || Platform.OS === "ios";

if (supported) {
  Notifications.setNotificationHandler({
    // a chat message for the conversation that is open on screen does not pop up (it is already showing)
    handleNotification: async (n) => {
      const quiet = isOpenChat((n.request.content.data as { url?: unknown } | null)?.url);
      return { shouldPlaySound: !quiet, shouldSetBadge: false, shouldShowBanner: !quiet, shouldShowList: !quiet };
    },
  });
}

/**
 * Creates the Android channel. In Expo Go the phone creates it, then fails while sending its description back
 * (a NullPointerException on empty fields), so that error is ignored: it used to stop the permission request and
 * every scheduled alarm.
 */
let channelOk = false;
let lastError: string | null = null;

let channelChecked = false;

async function ensureChannel(force = false) {
  if (Platform.OS !== "android") return;
  // once per app run: in Expo Go the call fails with an exception every time, which is slow, and it ran after every change
  if (channelChecked && !force) return;
  channelChecked = true;
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
  // like the original, a to-do alarm is just the to-do's text under the app name (no title line)
  const content = { ...(title ? { title } : {}), body, sound: "default" as const };
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
/** What this app has scheduled on the phone: key → time|title|body ("?" until known). */
const scheduled = new Map<string, string>();
let scheduledKnown = false;
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
      // Only touch what changed since the last run. Re-scheduling everything after every tap, drag or check kept the
      // phone busy for a moment after each change (user: a moved to-do could not be opened right away).
      const plan = planNotifications(db, new Date());
      const want = new Map(plan.map((n) => [n.key, `${+n.at}|${n.title}|${n.body}`]));
      if (!scheduledKnown) {
        scheduled.clear();
        for (const r of await Notifications.getAllScheduledNotificationsAsync()) {
          if (!r.identifier.startsWith("test:") && !r.identifier.startsWith(POMODORO)) scheduled.set(r.identifier, "?");
        }
        scheduledKnown = true;
      }
      for (const [key, sig] of [...scheduled]) {
        if (want.get(key) !== sig) {
          await Notifications.cancelScheduledNotificationAsync(key).catch(() => {});
          scheduled.delete(key);
        }
      }
      // one at a time, so a single failure cannot drop the rest
      for (const n of plan) {
        const sig = want.get(n.key)!;
        if (scheduled.get(n.key) === sig) continue;
        try {
          await scheduleOne(n.key, n.title, n.body, { date: n.at });
          scheduled.set(n.key, sig);
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
  await ensureChannel(true);
  let list: Notifications.NotificationRequest[] = [];
  try { list = await Notifications.getAllScheduledNotificationsAsync(); } catch (e) { lastError = String(e); }
  const times = list
    .map((r) => (r.trigger && "value" in r.trigger ? Number((r.trigger as { value: number }).value) : r.trigger && "date" in r.trigger ? Number((r.trigger as { date: number }).date) : NaN))
    .filter((x) => Number.isFinite(x) && x > Date.now())
    .sort((a, b) => a - b);
  return { allowed: perm.granted, scheduled: list.length, next: times.length ? new Date(times[0]) : null, channel: channelOk, error: lastError };
}

const POMODORO = "pomodoro:";
/** The bell at the end of a 뽀모도로, so it rings with the app closed. Replaces any earlier one. */
export async function schedulePomodoroEnd(at: Date, body: string) {
  await cancelPomodoroEnd();
  if (!(await ensurePermission())) return;
  await scheduleOne(`${POMODORO}end`, "뽀모도로 끝", body, { date: at }).catch((e) => { lastError = String(e); });
}
export async function cancelPomodoroEnd() {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(`${POMODORO}end`).catch(() => {});
}

/** Sends a test notification in a few seconds (close the app to see it arrive in the background). */
export async function sendTestNotification(seconds = 10): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await scheduleOne(`test:${Date.now()}`, "알림 테스트", "알림이 잘 와요", { seconds });
  return true;
}
