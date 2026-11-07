/**
 * Push notifications from the server (chat messages, follows, reactions), as opposed to the local to-do alarms in
 * data/notifications.ts. This phone's Expo push address is saved to the account after sign-in and removed on sign-out;
 * the server function supabase/functions/push sends to it. Works in the installed app (APK) once Firebase is set up
 * (replica/backend.md 13); in Expo Go and on the web there is no push, and the reason is shown in 설정 → 알림.
 */
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { ensurePermission } from "../data/notifications";
import { supabase } from "./supabase";

export type PushStatus = { state: "off" | "working" | "on"; reason?: string };
let status: PushStatus = { state: "off", reason: "로그인하면 켜져요" };
let token: string | null = null;
const listeners = new Set<() => void>();
const set = (s: PushStatus) => { status = s; listeners.forEach((l) => l()); };
export const usePushStatus = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => status, () => status);

async function channels() {
  if (Platform.OS !== "android") return;
  const make = (id: string, name: string, description: string) =>
    Notifications.setNotificationChannelAsync(id, { name, description, importance: Notifications.AndroidImportance.HIGH, sound: "default" }).catch(() => {});
  await make("messages", "대화", "친구가 보낸 메시지");
  await make("social", "친구 소식", "팔로우와 반응");
}

/** Saves this phone's push address to the signed-in account (safe to call again; it just refreshes). */
export async function registerPush(): Promise<PushStatus> {
  if (Platform.OS === "web") { set({ state: "off", reason: "웹에서는 푸시 알림을 받지 않아요" }); return status; }
  if (Constants.executionEnvironment === "storeClient") { set({ state: "off", reason: "Expo Go에서는 받을 수 없어요. 설치한 앱(APK)에서 돼요" }); return status; }
  if (!supabase) { set({ state: "off", reason: "서버가 설정되지 않았어요" }); return status; }
  set({ state: "working" });
  if (!(await ensurePermission().catch(() => false))) { set({ state: "off", reason: "폰 설정에서 알림이 꺼져 있어요" }); return status; }
  await channels();
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  try {
    token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch {
    set({ state: "off", reason: "푸시 설정(Firebase)이 아직 앱에 없어요 (backend.md 13번)" });
    return status;
  }
  const { error } = await supabase.rpc("save_push_token", { token, platform: Platform.OS });
  if (error) {
    set({ state: "off", reason: /could not find|does not exist/i.test(error.message) ? "서버에 푸시 SQL을 먼저 실행해 주세요 (backend.md 13번)" : "인터넷 연결을 확인해 주세요" });
    return status;
  }
  set({ state: "on" });
  return status;
}

/** Before signing out: this phone stops getting the account's pushes. */
export async function unregisterPush() {
  if (supabase && token) await supabase.rpc("remove_push_token", { token }).then(() => {}, () => {});
  token = null;
  set({ state: "off", reason: "로그인하면 켜져요" });
}

// ── the chat on screen: its own messages do not pop up while it is open ──
let openChat: string | null = null;
export const setOpenChat = (path: string | null) => { openChat = path; };
export const isOpenChat = (url: unknown) => typeof url === "string" && url === openChat;

/** Where a tapped push should go (only paths inside this app). */
export function pushTarget(data: unknown): string | null {
  const url = (data as { url?: unknown } | null)?.url;
  return typeof url === "string" && /^\/(chat\/[\w-]+|alerts|send)$/.test(url) ? url : null;
}
