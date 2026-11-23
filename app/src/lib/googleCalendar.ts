/**
 * 구글 캘린더 연동 (메인 앱, 2026-11-23; user's choice: two ways, through the server, calendars picked in 설정).
 * The server function `google-calendar` talks to Google; the app only connects, picks calendars and asks for a
 * sync. Events from Google arrive like any other change (the usual sync pulls them).
 */
import { Linking } from "react-native";
import { onSynced, syncNow } from "../data/store";
import { getPrefs, setPref } from "../data/prefs";
import { supabase } from "./supabase";

export type GoogleStatus = { connected: boolean; email?: string | null; last_sync_at?: string | null; last_error?: string | null; missing?: boolean };
export type GoogleCalendar = { calendar_id: string; summary: string; color: string; can_write: boolean; selected: boolean; is_default: boolean; category_id?: string | null };

const FN = "google-calendar";
/** "not_set_up": the server's Google keys are not in yet (a PC step); "no_sql": the SQL has not been run. */
export class GoogleError extends Error {}

async function call(action: string): Promise<Record<string, unknown>> {
  if (!supabase) throw new GoogleError("로그인이 필요해요");
  const { data, error } = await supabase.functions.invoke(FN, { body: { action } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const body = ctx ? await ctx.json().catch(() => null) : null;
    if (body?.error === "not_set_up") throw new GoogleError("서버에 구글 설정이 아직 없어요 (PC에서 할 일)");
    if (ctx?.status === 404) throw new GoogleError("서버에 연동 기능이 아직 없어요 (PC에서 할 일)");
    throw new GoogleError(body?.error ? String(body.error) : "서버에 닿지 않았어요");
  }
  return data ?? {};
}

export async function googleStatus(): Promise<GoogleStatus> {
  if (!supabase) return { connected: false };
  const { data, error } = await supabase.rpc("google_status");
  if (error) return { connected: false, missing: true };
  const s = data as GoogleStatus;
  if (getPrefs().googleLinked !== !!s.connected) setPref("googleLinked", !!s.connected);
  if (s.connected && s.email && getPrefs().googleEmail !== s.email) setPref("googleEmail", s.email);
  return s;
}

export async function googleCalendars(): Promise<GoogleCalendar[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("google_calendars").select("calendar_id, summary, color, can_write, selected, is_default, category_id").order("summary");
  const list = (data ?? []) as GoogleCalendar[];
  // the event editor offers the picked ones it can write to
  setPref("googleCalendars", list.filter((k) => k.selected && k.can_write).map((k) => ({ id: k.calendar_id, summary: k.summary, color: k.color, categoryId: k.category_id ?? null })));
  setPref("googleReadOnlyCategoryIds", list.filter((k) => !k.can_write && k.category_id).map((k) => k.category_id!));
  setPref("googleReadOnlyCalendarIds", list.filter((k) => !k.can_write).map((k) => k.calendar_id));
  return list;
}

/** Opens Google's agreement page in the browser; Google sends it back to the server, which keeps the account. */
export async function connectGoogle() {
  const { url } = await call("auth-url");
  await Linking.openURL(String(url));
}

export async function pickCalendar(id: string, selected: boolean) {
  await supabase?.from("google_calendars").update({ selected }).eq("calendar_id", id);
  await googleCalendars();
}

/** The colours this account's Google Calendar offers (kept on the phone for the event editor). */
export async function googleColors() {
  const r = (await call("colors")) as { event?: Record<string, string>; calendar?: Record<string, string>; labels?: Record<string, Record<string, string>> };
  setPref("googleLabels", Object.fromEntries(Object.entries(r.labels ?? {}).map(([cal, l]) => [cal, Object.entries(l).map(([id, hex]) => ({ id, hex }))])));
  const event = Object.entries(r.event ?? {}).map(([id, hex]) => ({ id, hex })).sort((a, b) => Number(a.id) - Number(b.id));
  if (event.length) setPref("googleEventColors", event);
  setPref("googleCalendarColorCount", Object.keys(r.calendar ?? {}).length);
  return event;
}

let lastSync = 0;
let syncing: Promise<unknown> | null = null;
/** Both ways now: the app's changes first (the usual sync), then the server with Google, then pull what came. */
export async function syncGoogle(): Promise<{ pulled?: number; pushed?: number; failed?: number; error?: string | null }> {
  if (syncing) await syncing;
  const run = (async () => {
    await syncNow();
    const r = await call("sync");
    lastSync = Date.now();
    await googleCalendars();
    await googleColors().catch(() => {});
    if (r.changed) await syncNow();
    return r;
  })();
  syncing = run;
  try { return (await run) as { pulled?: number; pushed?: number; failed?: number; error?: string | null }; } finally { syncing = null; }
}

export async function disconnectGoogle() {
  await call("disconnect");
  setPref("googleLinked", false);
  setPref("googleCalendars", []);
  setPref("googleEmail", null);
  setPref("googleEventColors", []);
  await syncNow();
}

/** After the app's own sync: if connected, let the server sync with Google when events changed or a while passed. */
let started = false;
export function startGoogleAutoSync() {
  if (started) return;
  started = true;
  // a change made while a Google sync runs goes right after it, not at the next timer (user, 2026-11-23: a colour
  // changed in 립마크 did not reach Google at once)
  let again = false;
  const run = () => {
    lastSync = Date.now();
    syncing = call("sync").then((r) => (r.changed ? syncNow() : undefined)).catch(() => {}).finally(() => {
      syncing = null;
      if (again) { again = false; run(); }
    });
  };
  onSynced(({ eventsSent }) => {
    if (!getPrefs().googleLinked) return;
    if (syncing) { if (eventsSent) again = true; return; }
    if (!eventsSent && Date.now() - lastSync < 3 * 60000) return;
    run();
  });
}
