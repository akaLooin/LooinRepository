// Edge Function: 구글 캘린더 양방향 연동 (2026-11-23, user's choice: through the server, calendars picked in settings).
// Deploy: supabase functions deploy google-calendar --no-verify-jwt   (the Google callback and the timer carry no
// sign-in; every action from the app checks the user's sign-in itself)
// Secrets (Dashboard → Edge Functions → Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_STATE_SECRET
// (any long random text), GOOGLE_CRON_SECRET (another one, for the timer). SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// POST {action}: "auth-url" (where to send the browser), "sync" (both ways now), "disconnect";
//   {action: "cron"} with header x-cron-secret: sync everyone (every 15 minutes, set up with pg_cron).
// GET …/google-calendar/callback: Google sends the browser back here after the user agreed.
//
// Colours: an event wears its own Google colour (colorId) if it has one, else its calendar's; when a calendar's colour
// changes in Google, the events that wore it (and its 일정 카테고리) follow.
// How a sync goes, per user: refresh the calendar list (the main one picked at first), give each picked calendar
// a 일정 카테고리 of its name and colour, pull Google's changes since last time (sync tokens), then send the app's
// changes to Google. Each event says where it goes (events.google_calendar_id, picked in the event editor; empty =
// only in 립마크, so events made before connecting stay in the app, user 2026-11-23). Picking 립마크 only for a
// linked event takes it off Google. 강조 = a ⭐ at the front of the Google title. When both sides changed one event,
// the later wins.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { addDays, type EventFields, fromGoogle, GOOGLE_EVENT_COLORS, type GEvent, originalDay, readState, signState, toGoogle } from "../_shared/gcal.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info" };
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.calendarlist.readonly"];
const API = "https://www.googleapis.com/calendar/v3";
const callbackUrl = () => `${env("SUPABASE_URL")}/functions/v1/google-calendar/callback`;
const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const json = (v: unknown, status = 200) => Response.json(v, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/callback")) return callback(url);
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });
  const input = await req.json().catch(() => ({}));
  const db = admin();

  if (input?.action === "cron") {
    if (!env("GOOGLE_CRON_SECRET") || req.headers.get("x-cron-secret") !== env("GOOGLE_CRON_SECRET")) return json({ error: "forbidden" }, 403);
    const { data } = await db.from("google_accounts").select("user_id");
    const out: Record<string, unknown> = {};
    for (const a of data ?? []) out[a.user_id] = await syncUser(db, a.user_id).catch((e) => ({ error: String(e) }));
    return json({ users: Object.keys(out).length });
  }

  const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: me } = await asUser.auth.getUser();
  if (!me.user) return json({ error: "unauthorized" }, 401);
  const uid = me.user.id;
  if (!env("GOOGLE_CLIENT_ID") || !env("GOOGLE_CLIENT_SECRET") || !env("GOOGLE_STATE_SECRET")) return json({ error: "not_set_up" }, 503);

  if (input?.action === "auth-url") {
    const q = new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: callbackUrl(), response_type: "code", scope: SCOPES.join(" "),
      access_type: "offline", prompt: "consent", include_granted_scopes: "true", state: await signState(uid, env("GOOGLE_STATE_SECRET")),
    });
    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${q}` });
  }
  if (input?.action === "sync") {
    try { return json(await syncUser(db, uid)); } catch (e) { return json({ error: String(e) }, 500); }
  }
  // the colours this account's Google Calendar offers (user, 2026-11-23: more than eleven), for the event editor
  if (input?.action === "colors") {
    try { return json(await livePalette(await accessToken(db, uid))); } catch (e) { return json({ error: String(e) }, 500); }
  }
  if (input?.action === "disconnect") {
    const { data: acc } = await db.from("google_accounts").select("refresh_token").eq("user_id", uid).maybeSingle();
    if (acc) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(acc.refresh_token)}`, { method: "POST" }).catch(() => {});
    // events that came from Google leave the app (they stay in Google); events made in the app stay, unlinked
    const { data: links } = await db.from("google_event_links").select("event_id, origin").eq("user_id", uid);
    const fromGoogleIds = (links ?? []).filter((l) => l.origin === "google").map((l) => l.event_id);
    for (let i = 0; i < fromGoogleIds.length; i += 200) await db.from("events").update({ deleted_at: new Date().toISOString() }).in("id", fromGoogleIds.slice(i, i + 200));
    await db.from("google_event_links").delete().eq("user_id", uid);
    await db.from("google_calendars").delete().eq("user_id", uid);
    await db.from("google_accounts").delete().eq("user_id", uid);
    return json({ ok: true });
  }
  return json({ error: "unknown action" }, 400);
});

/**
 * Google sends the browser back here with a code: keep the account's key, then send the browser back into the app
 * (립마크's 구글 캘린더 screen). Supabase's own address serves no web pages (an HTML answer shows as plain text,
 * user 2026-11-23: broken letters), so the answer is a jump into the app, with the outcome in the address.
 */
async function callback(url: URL): Promise<Response> {
  const back = (outcome: string) => new Response(null, { status: 302, headers: { location: `todomateclone-design://settings/google?google=${outcome}` } });
  const uid = await readState(url.searchParams.get("state") ?? "", env("GOOGLE_STATE_SECRET"));
  const code = url.searchParams.get("code");
  if (!uid || !code) return back("expired");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri: callbackUrl(), grant_type: "authorization_code" }),
  });
  const tok = await res.json().catch(() => ({}));
  if (!res.ok || !tok.refresh_token) return back("no_key");
  let email: string | null = null;
  try { email = JSON.parse(atob(String(tok.id_token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email ?? null; } catch { /* no e-mail */ }
  const db = admin();
  await db.from("google_accounts").upsert({ user_id: uid, refresh_token: tok.refresh_token, email, last_error: null });
  await syncUser(db, uid).catch(() => {});
  return back("connected");
}

type Cal = { calendar_id: string; summary: string; color: string; time_zone: string; can_write: boolean; selected: boolean; is_default: boolean; sync_token: string | null; category_id: string | null };
type Link = { event_id: string; calendar_id: string; google_id: string; origin: string; lossy: boolean; google_updated: string | null; synced_at: string };
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

async function accessToken(db: SupabaseClient, uid: string): Promise<string> {
  const { data: acc } = await db.from("google_accounts").select("refresh_token").eq("user_id", uid).maybeSingle();
  if (!acc) throw new Error("not connected");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: acc.refresh_token, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), grant_type: "refresh_token" }),
  });
  const tok = await res.json().catch(() => ({}));
  if (!res.ok || !tok.access_token) {
    await db.from("google_accounts").update({ last_error: tok.error === "invalid_grant" ? "다시 연결해 주세요 (구글 연결이 끊겼어요)" : `구글 응답 ${res.status}` }).eq("user_id", uid);
    throw new Error(`token ${res.status} ${tok.error ?? ""}`);
  }
  return tok.access_token;
}

async function g(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  if (res.status === 204) return { ok: true, status: 204, body: null };
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}
const enc = encodeURIComponent;

const FIELDS = ["title", "start_date", "end_date", "all_day", "start_time", "end_time", "color", "memo", "alarm_minutes", "repeat", "skip_dates"] as const;
const fieldsOf = (r: Row): EventFields => ({
  title: r.title, start_date: r.start_date, end_date: r.end_date, all_day: r.all_day,
  start_time: r.start_time ? String(r.start_time).slice(0, 5) : null, end_time: r.end_time ? String(r.end_time).slice(0, 5) : null,
  color: r.color, memo: r.memo ?? "", alarm_minutes: r.alarm_minutes, repeat: r.repeat ?? null, skip_dates: r.skip_dates ?? [], important: !!r.important,
});
/** our row's time columns: "24:00" is stored as 24:00:00 (Postgres time allows it) */
const toRowFields = (f: EventFields) => ({ ...f, start_time: f.all_day ? null : f.start_time, end_time: f.all_day ? null : f.end_time });

async function syncUser(db: SupabaseClient, uid: string) {
  const token = await accessToken(db, uid);
  const stats = { pulled: 0, pushed: 0, deleted: 0 };

  // 1. calendars
  const list: GEvent[] = [];
  for (let page: string | undefined; ;) {
    const r = await g(token, `/users/me/calendarList?maxResults=250${page ? `&pageToken=${enc(page)}` : ""}`);
    if (!r.ok) throw new Error(`calendarList ${r.status}`);
    list.push(...(r.body.items ?? []));
    page = r.body.nextPageToken;
    if (!page) break;
  }
  const { data: known } = await db.from("google_calendars").select("*").eq("user_id", uid);
  const had = new Map((known ?? []).map((c: Cal) => [c.calendar_id, c]));
  const first = !known?.length;
  const rows = list.map((c) => ({
    user_id: uid, calendar_id: c.id, summary: String(c.summaryOverride ?? c.summary ?? "").slice(0, 100), color: /^#[0-9a-fA-F]{6}$/.test(c.backgroundColor ?? "") ? c.backgroundColor.toUpperCase() : "#4A90E2",
    time_zone: c.timeZone ?? "Asia/Seoul", can_write: c.accessRole === "owner" || c.accessRole === "writer",
    // at first only the main calendar is picked, and new events go there
    selected: had.get(c.id)?.selected ?? (first && !!c.primary), is_default: had.get(c.id)?.is_default ?? (first && !!c.primary),
  }));
  if (rows.length) await db.from("google_calendars").upsert(rows);
  // a calendar's colour changed in Google: its events that wear the calendar's colour (none of their own) and its
  // 일정 카테고리 follow it; events with their own Google colour keep theirs (user, 2026-11-23)
  for (const r of rows) {
    const old = had.get(r.calendar_id);
    if (!old || old.color.toUpperCase() === r.color) continue;
    const { data: moved } = await db.from("events").update({ color: r.color }).eq("user_id", uid).eq("google_calendar_id", r.calendar_id).ilike("color", old.color).is("deleted_at", null).select("id, updated_at");
    // not a change to send back to Google: the links stay in step
    for (const m of moved ?? []) await db.from("google_event_links").update({ synced_at: m.updated_at }).eq("event_id", m.id);
    if (old.category_id) await db.from("event_categories").update({ color: r.color }).eq("id", old.category_id).ilike("color", old.color);
  }
  const gone = [...had.keys()].filter((id) => !list.some((c) => c.id === id));
  if (gone.length) await db.from("google_calendars").delete().eq("user_id", uid).in("calendar_id", gone);
  const { data: calsNow } = await db.from("google_calendars").select("*").eq("user_id", uid);
  const cals: Cal[] = calsNow ?? [];

  // a 일정 카테고리 per picked calendar (its name and colour)
  const { data: catRows } = await db.from("event_categories").select("id, deleted_at").eq("user_id", uid);
  const liveCats = new Set((catRows ?? []).filter((k) => !k.deleted_at).map((k) => k.id));
  for (const c of cals.filter((x) => x.selected && (!x.category_id || !liveCats.has(x.category_id)))) {
    const id = crypto.randomUUID();
    const { error } = await db.from("event_categories").insert({ id, user_id: uid, title: c.summary.slice(0, 40) || "구글 캘린더", color: c.color, sort_order: Date.now() / 1e9 });
    if (!error) { await db.from("google_calendars").update({ category_id: id }).eq("user_id", uid).eq("calendar_id", c.calendar_id); c.category_id = id; }
  }
  const picked = cals.filter((c) => c.selected);

  const { data: linkRows } = await db.from("google_event_links").select("*").eq("user_id", uid);
  const links: Link[] = linkRows ?? [];
  const byGoogle = new Map(links.map((l) => [`${l.calendar_id}|${l.google_id}`, l]));

  // calendars no longer picked: their Google events leave the app, the app's own stay (unlinked)
  for (const l of links.filter((l) => !picked.some((c) => c.calendar_id === l.calendar_id))) {
    if (l.origin === "google") await db.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", l.event_id);
    else await db.from("events").update({ google_calendar_id: null }).eq("id", l.event_id);
    await db.from("google_event_links").delete().eq("event_id", l.event_id);
    byGoogle.delete(`${l.calendar_id}|${l.google_id}`);
  }

  // the eleven colours as Google's apps show them (the colors API answers older shades)
  const palette = (await livePalette(token)).event;

  // 2. pull
  for (const c of picked) {
    const items: GEvent[] = [];
    let syncToken = c.sync_token;
    let next: string | undefined;
    for (let page: string | undefined, tries = 0; ;) {
      const q = new URLSearchParams({ maxResults: "2500", showDeleted: "true", singleEvents: "false" });
      if (syncToken) q.set("syncToken", syncToken);
      if (page) q.set("pageToken", page);
      const r = await g(token, `/calendars/${enc(c.calendar_id)}/events?${q}`);
      if (r.status === 410 && tries++ === 0) { syncToken = null; items.length = 0; page = undefined; continue; } // too old: read all again
      if (!r.ok) throw new Error(`events ${r.status}`);
      items.push(...(r.body.items ?? []));
      page = r.body.nextPageToken;
      if (!page) { next = r.body.nextSyncToken; break; }
    }
    // series and single events first, then the changed or cancelled times of series
    items.sort((a, b) => Number(!!a.recurringEventId) - Number(!!b.recurringEventId));
    for (const item of items) stats.pulled += await pullOne(db, uid, c, item, palette, byGoogle);
    if (next) await db.from("google_calendars").update({ sync_token: next }).eq("user_id", uid).eq("calendar_id", c.calendar_id);
  }

  // 3. push: what changed in the app since it was last in step with Google
  const { data: evRows } = await db.from("events").select("*").eq("user_id", uid);
  // events made in 립마크 before the account was connected stay in 립마크, always (user, 2026-11-23: they showed up
  // in Google); only events made or picked for Google after connecting go up
  const { data: acc } = await db.from("google_accounts").select("created_at").eq("user_id", uid).maybeSingle();
  const connectedAt = acc?.created_at ? new Date(acc.created_at) : new Date();
  const linkOf = new Map([...byGoogle.values()].map((l) => [l.event_id, l]));
  const writable = (id: string | null | undefined) => (id ? picked.find((c) => c.calendar_id === id && c.can_write) : undefined);
  const takeOff = async (l: Link) => {
    const cal = cals.find((c) => c.calendar_id === l.calendar_id);
    if (cal?.can_write && !l.lossy) await g(token, `/calendars/${enc(l.calendar_id)}/events/${enc(l.google_id)}`, { method: "DELETE" });
    await db.from("google_event_links").delete().eq("event_id", l.event_id);
    stats.deleted++;
  };
  for (const e of evRows ?? []) {
    const l = linkOf.get(e.id);
    if (l) {
      if (e.deleted_at) { await takeOff(l); continue; }
      if (new Date(e.updated_at) <= new Date(l.synced_at)) continue;
      // 립마크 only picked for it: off Google, kept in the app
      if (!e.google_calendar_id) { await takeOff(l); continue; }
      if (l.lossy) continue;
      const target = writable(e.google_calendar_id);
      if (!target) continue;
      let gid = l.google_id;
      if (target.calendar_id !== l.calendar_id) {
        const mv = await g(token, `/calendars/${enc(l.calendar_id)}/events/${enc(gid)}/move?destination=${enc(target.calendar_id)}`, { method: "POST" });
        if (mv.ok) gid = mv.body.id;
      }
      const r = await g(token, `/calendars/${enc(target.calendar_id)}/events/${enc(gid)}`, { method: "PUT", body: JSON.stringify(toGoogle(fieldsOf(e), target.time_zone, palette, target.color, exceptionDays(links, l))) });
      if (r.ok) {
        await db.from("google_event_links").update({ calendar_id: target.calendar_id, google_id: r.body.id, google_updated: r.body.updated, synced_at: e.updated_at }).eq("event_id", e.id);
        stats.pushed++;
      }
    } else if (!e.deleted_at && e.google_calendar_id && new Date(e.created_at ?? 0) > connectedAt) {
      const target = writable(e.google_calendar_id);
      if (!target) continue;
      const r = await g(token, `/calendars/${enc(target.calendar_id)}/events`, { method: "POST", body: JSON.stringify(toGoogle(fieldsOf(e), target.time_zone, palette, target.color)) });
      if (r.ok) {
        await db.from("google_event_links").insert({ event_id: e.id, user_id: uid, calendar_id: target.calendar_id, google_id: r.body.id, origin: "app", google_updated: r.body.updated, synced_at: e.updated_at });
        stats.pushed++;
      }
    }
  }
  await db.from("google_accounts").update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("user_id", uid);
  return { ok: true, ...stats, changed: stats.pulled > 0 };
}

/**
 * The colours Google answers for this account, by colorId: `event` (an event's own colour) and `calendar`. The first
 * eleven event colours are given in the shades Google's apps show (the API still answers older, paler ones); any
 * other colour comes as Google gives it. Without an answer, the eleven.
 */
async function livePalette(token: string): Promise<{ event: Record<string, string>; calendar: Record<string, string> }> {
  const r = await g(token, "/colors");
  const pick = (o: Record<string, Row> | undefined) => Object.fromEntries(Object.entries(o ?? {}).map(([id, v]) => [id, String(v.background ?? "").toUpperCase()]).filter(([, c]) => /^#[0-9A-F]{6}$/.test(c)));
  const event = { ...pick(r.body?.event), ...GOOGLE_EVENT_COLORS };
  return { event: Object.keys(event).length ? event : { ...GOOGLE_EVENT_COLORS }, calendar: pick(r.body?.calendar) };
}

/** The days of a series that Google keeps as changed single times (sent as such, not as EXDATEs). */
function exceptionDays(links: Link[], series: Link) {
  const out = new Set<string>();
  for (const l of links) if (l.google_id.startsWith(`${series.google_id}_`)) {
    const m = /_(\d{8})/.exec(l.google_id);
    if (m) out.add(`${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`);
  }
  return out;
}

/** One Google event into the app. Returns 1 when the app changed. */
async function pullOne(db: SupabaseClient, uid: string, c: Cal, item: GEvent, palette: Record<string, string>, byGoogle: Map<string, Link>): Promise<number> {
  const key = `${c.calendar_id}|${item.id}`;
  const link = byGoogle.get(key);
  const now = new Date().toISOString();
  const seriesLink = item.recurringEventId ? byGoogle.get(`${c.calendar_id}|${item.recurringEventId}`) : undefined;
  const skipInSeries = async () => {
    const day = originalDay(item, c.time_zone);
    if (!seriesLink || !day) return;
    const { data: s } = await db.from("events").select("skip_dates").eq("id", seriesLink.event_id).maybeSingle();
    const skips: string[] = s?.skip_dates ?? [];
    if (skips.includes(day)) return;
    const { data: up } = await db.from("events").update({ skip_dates: [...skips, day].sort() }).eq("id", seriesLink.event_id).select("updated_at").maybeSingle();
    if (up) await db.from("google_event_links").update({ synced_at: up.updated_at }).eq("event_id", seriesLink.event_id);
  };

  const mapped = fromGoogle(item, c.time_zone, palette, c.color);
  if (!mapped) {
    // deleted in Google (a whole event, or one time of a series)
    if (item.recurringEventId) await skipInSeries();
    if (link) {
      await db.from("events").update({ deleted_at: now }).eq("id", link.event_id);
      await db.from("google_event_links").delete().eq("event_id", link.event_id);
      byGoogle.delete(key);
      return 1;
    }
    return item.recurringEventId ? 1 : 0;
  }
  if (item.recurringEventId) await skipInSeries(); // one time changed in Google: out of the series, kept on its own
  const fields = toRowFields(mapped.fields);
  if (link) {
    if (link.google_updated && new Date(item.updated) <= new Date(link.google_updated)) return 0; // our own write coming back
    const { data: e } = await db.from("events").select("updated_at, deleted_at, skip_dates").eq("id", link.event_id).maybeSingle();
    // changed on both sides since the last sync: the later one wins
    if (e && !e.deleted_at && new Date(e.updated_at) > new Date(link.synced_at) && new Date(e.updated_at) > new Date(item.updated)) return 0;
    // keep the days the app already knows were changed on their own
    const skip = [...new Set([...(fields.skip_dates ?? []), ...exceptionsFor(byGoogle, c.calendar_id, item.id)])].sort();
    const { data: up } = await db.from("events").update({ ...fields, skip_dates: skip, google_calendar_id: c.calendar_id, deleted_at: null }).eq("id", link.event_id).select("updated_at").maybeSingle();
    if (!up) return 0;
    await db.from("google_event_links").update({ google_updated: item.updated, synced_at: up.updated_at, lossy: mapped.lossy }).eq("event_id", link.event_id);
    link.google_updated = item.updated; link.synced_at = up.updated_at; link.lossy = mapped.lossy;
    return 1;
  }
  const id = crypto.randomUUID();
  const { data: ins, error } = await db.from("events").insert({ id, user_id: uid, ...fields, category_id: c.category_id, google_calendar_id: c.calendar_id }).select("updated_at").maybeSingle();
  if (error || !ins) return 0;
  const l: Link = { event_id: id, calendar_id: c.calendar_id, google_id: item.id, origin: "google", lossy: mapped.lossy, google_updated: item.updated, synced_at: ins.updated_at };
  await db.from("google_event_links").insert({ ...l, user_id: uid });
  byGoogle.set(key, l);
  return 1;
}

/** Days of a series already kept in the app as changed single times. */
function exceptionsFor(byGoogle: Map<string, Link>, calendarId: string, seriesId: string): string[] {
  const out: string[] = [];
  for (const l of byGoogle.values()) if (l.calendar_id === calendarId && l.google_id.startsWith(`${seriesId}_`)) {
    const m = /_(\d{8})/.exec(l.google_id);
    if (m) out.push(`${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`);
  }
  return out;
}

void addDays; void FIELDS;
