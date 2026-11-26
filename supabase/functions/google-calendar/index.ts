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
// POST …/google-calendar/notify: Google's notice that a watched calendar changed (a sync starts at once).
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
import { addDays, alarmFromGoogle, type EventFields, fromGoogle, GOOGLE_EVENT_COLORS, instanceId, meetLinkOf, shownColor, type GEvent, originalDay, readState, signState, toGoogle } from "../_shared/gcal.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info" };
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  // the calendars themselves (read only): where Google keeps the event labels, its newer colours (user, 2026-11-23)
  "https://www.googleapis.com/auth/calendar.calendars.readonly"];
const API = "https://www.googleapis.com/calendar/v3";
const callbackUrl = () => `${env("SUPABASE_URL")}/functions/v1/google-calendar/callback`;
const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const json = (v: unknown, status = 200) => Response.json(v, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/callback")) return callback(url);
  if (req.method === "POST" && url.pathname.endsWith("/notify")) return notify(req);
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

  // one-time colour refresh (user, 2026-11-23: events pulled before the colour fixes wore their calendar's colour):
  // read every event of the picked calendars again from Google, so colours (and ⭐ 강조) are applied anew. Also
  // reports which colour fields Google sends, to see where the extra colours come from.
  if (input?.action === "refresh-colors") {
    if (!env("GOOGLE_CRON_SECRET") || req.headers.get("x-cron-secret") !== env("GOOGLE_CRON_SECRET")) return json({ error: "forbidden" }, 403);
    const { data: accounts } = await db.from("google_accounts").select("user_id");
    const out: Record<string, unknown> = {};
    for (const a of accounts ?? []) {
      try { out[a.user_id] = await refreshColours(db, a.user_id); } catch (e) { out[a.user_id] = { error: String(e) }; }
    }
    return json(out);
  }

  // one-time look at where Google keeps its event labels (the newer colours, user 2026-11-23): only fields whose name
  // has "label" in it, from the calendar list, the calendars and the events that carry one; no event contents
  if (input?.action === "labels-probe") {
    if (!env("GOOGLE_CRON_SECRET") || req.headers.get("x-cron-secret") !== env("GOOGLE_CRON_SECRET")) return json({ error: "forbidden" }, 403);
    const { data: accounts } = await db.from("google_accounts").select("user_id");
    const out: Record<string, unknown> = {};
    const labelish = (o: unknown, path = ""): Record<string, unknown> => {
      const found: Record<string, unknown> = {};
      if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Row)) {
        if (/label/i.test(k)) found[path + k] = v;
        else if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(found, labelish(v, `${path}${k}.`));
      }
      return found;
    };
    for (const a of accounts ?? []) {
      try {
        const token = await accessToken(db, a.user_id);
        const { data: cals } = await db.from("google_calendars").select("calendar_id").eq("user_id", a.user_id).eq("selected", true);
        const perCal: Record<string, unknown>[] = [];
        for (const [i, c] of (cals ?? []).entries()) {
          const entry = await g(token, `/users/me/calendarList/${enc(c.calendar_id)}`);
          const cal = await g(token, `/calendars/${enc(c.calendar_id)}`);
          const evs = await g(token, `/calendars/${enc(c.calendar_id)}/events?maxResults=2500&singleEvents=false`);
          const ids: Record<string, number> = {};
          let sample: Record<string, unknown> | null = null;
          for (const e of (evs.body?.items ?? []) as GEvent[]) if (e.eventLabelId) {
            ids[e.eventLabelId] = (ids[e.eventLabelId] ?? 0) + 1;
            if (!sample) sample = { ...labelish(e), colorId: e.colorId ?? null };
          }
          perCal.push({ calendar: i + 1, listKeys: Object.keys(entry.body ?? {}), listLabels: labelish(entry.body), calKeys: Object.keys(cal.body ?? {}), calError: cal.body?.error ? `${cal.status} ${cal.body.error.status ?? ""} ${String(cal.body.error.message ?? "").slice(0, 160)}` : null, calLabels: labelish(cal.body), eventLabelIds: ids, sample });
        }
        const colors = await g(token, "/colors");
        // which permissions the saved key really carries, and when it was last saved (권한 다시 받기)
        const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${enc(token)}`).then((r) => r.json()).catch(() => ({}));
        const { data: acc } = await db.from("google_accounts").select("updated_at").eq("user_id", a.user_id).maybeSingle();
        out[a.user_id] = { scopes: String(info.scope ?? "").split(" ").map((x: string) => x.replace("https://www.googleapis.com/auth/", "")), keySavedAt: acc?.updated_at ?? null,
          calendars: perCal, colorsKeys: Object.keys(colors.body ?? {}), colorsLabels: labelish(colors.body) };
      } catch (e) { out[a.user_id] = { error: String(e) }; }
    }
    return json(out);
  }

  // one-time clean-up (user, 2026-11-23): events made in 립마크 that went to Google come off Google again and stay
  // only in 립마크. Run once from the SQL Editor with the timer's secret; nothing in the app calls it.
  if (input?.action === "remove-copies") {
    if (!env("GOOGLE_CRON_SECRET") || req.headers.get("x-cron-secret") !== env("GOOGLE_CRON_SECRET")) return json({ error: "forbidden" }, 403);
    const { data: accounts } = await db.from("google_accounts").select("user_id");
    const out: Record<string, unknown> = {};
    for (const a of accounts ?? []) {
      try { out[a.user_id] = await removeCopies(db, a.user_id, input?.dry !== false, Math.min(300, Math.max(1, Number(input?.most) || 120))); } catch (e) { out[a.user_id] = { error: String(e) }; }
    }
    return json(out);
  }
  if (input?.action === "remove-app-uploads") {
    if (!env("GOOGLE_CRON_SECRET") || req.headers.get("x-cron-secret") !== env("GOOGLE_CRON_SECRET")) return json({ error: "forbidden" }, 403);
    const { data: accounts } = await db.from("google_accounts").select("user_id");
    const out: Record<string, unknown> = {};
    for (const a of accounts ?? []) {
      try {
        const token = await accessToken(db, a.user_id);
        const { data: links } = await db.from("google_event_links").select("event_id, calendar_id, google_id").eq("user_id", a.user_id).eq("origin", "app");
        let removed = 0;
        for (const l of links ?? []) {
          const r = await g(token, `/calendars/${enc(l.calendar_id)}/events/${enc(l.google_id)}`, { method: "DELETE" });
          if (!r.ok && r.status !== 404 && r.status !== 410) continue; // keep the link to try again
          await db.from("google_event_links").delete().eq("event_id", l.event_id);
          await db.from("events").update({ google_calendar_id: null }).eq("id", l.event_id);
          removed++;
        }
        out[a.user_id] = { found: links?.length ?? 0, removed };
      } catch (e) { out[a.user_id] = { error: String(e) }; }
    }
    return json(out);
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
    try { return json(await syncUser(db, uid, input?.quick === true)); } catch (e) { return json({ error: String(e) }, 500); }
  }
  // the colours this account's Google Calendar offers (user, 2026-11-23: more than eleven), for the event editor
  if (input?.action === "colors") {
    try {
      const token = await accessToken(db, uid);
      const { data: cals } = await db.from("google_calendars").select("calendar_id").eq("user_id", uid).eq("selected", true).eq("can_write", true);
      // each picked calendar's event labels (its 24 colours), for the event editor
      const labels: Record<string, Record<string, string>> = {};
      for (const c of cals ?? []) labels[c.calendar_id] = await labelsOf(token, c.calendar_id).catch(() => ({}));
      return json({ ...(await livePalette(token)), labels });
    } catch (e) { return json({ error: String(e) }, 500); }
  }
  if (input?.action === "disconnect") {
    const { data: acc } = await db.from("google_accounts").select("refresh_token").eq("user_id", uid).maybeSingle();
    try { const t = await accessToken(db, uid); await stopWatches(db, uid, t); } catch { /* the key may be gone already */ }
    if (acc) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(acc.refresh_token)}`, { method: "POST" }).catch(() => {});
    // events that came from Google leave the app (they stay in Google); events made in the app stay, unlinked
    const links = await every(() => db.from("google_event_links").select("event_id, origin").eq("user_id", uid), "event_id");
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
 * Google's notice that a watched calendar changed (user, 2026-11-23: changes both ways at once). The channel id is
 * ours, random and kept per calendar, so a notice is believed only when its id and token match one we made. The
 * answer goes at once; the sync runs after it.
 */
async function notify(req: Request): Promise<Response> {
  const id = req.headers.get("x-goog-channel-id") ?? "";
  const tok = req.headers.get("x-goog-channel-token") ?? "";
  const db = admin();
  const { data: cal } = id ? await db.from("google_calendars").select("user_id").eq("watch_id", id).maybeSingle() : { data: null };
  if (!cal || tok !== await channelToken(id)) return new Response(null, { status: 200 }); // not ours: Google stops on its own
  if (req.headers.get("x-goog-resource-state") === "sync") return new Response(null, { status: 200 }); // the first hello
  const run = syncUser(db, cal.user_id).catch(() => {});
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(run); else await run;
  return new Response(null, { status: 200 });
}
const notifyUrl = () => `${env("SUPABASE_URL")}/functions/v1/google-calendar/notify`;
/** what Google sends back with every notice of a channel: signed with our secret, so nobody else can make one */
const channelToken = async (id: string) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("GOOGLE_STATE_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`watch:${id}`)));
  return [...sig.slice(0, 24)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** Picked calendars get a watch (made again a day before it ends); calendars no longer picked lose theirs. */
async function keepWatches(db: SupabaseClient, uid: string, token: string, cals: (Cal & Row)[]) {
  const soon = Date.now() + 24 * 3600000;
  for (const c of cals) {
    const has = c.watch_id && c.watch_expires && new Date(c.watch_expires).getTime() > soon;
    if (!c.selected) {
      if (c.watch_id) await stopOne(db, uid, token, c);
      continue;
    }
    if (has) continue;
    if (c.watch_id) await stopOne(db, uid, token, c);
    const id = crypto.randomUUID();
    const r = await g(token, `/calendars/${enc(c.calendar_id)}/events/watch`, { method: "POST", body: JSON.stringify({ id, type: "web_hook", address: notifyUrl(), token: await channelToken(id) }) });
    if (!r.ok) continue; // no watch: the 15-minute timer still syncs
    await db.from("google_calendars").update({ watch_id: id, watch_resource: r.body.resourceId, watch_expires: new Date(Number(r.body.expiration) || Date.now() + 6 * 86400000).toISOString() })
      .eq("user_id", uid).eq("calendar_id", c.calendar_id);
  }
}
async function stopOne(db: SupabaseClient, uid: string, token: string, c: Row) {
  if (c.watch_resource) await g(token, "/channels/stop", { method: "POST", body: JSON.stringify({ id: c.watch_id, resourceId: c.watch_resource }) }).catch(() => {});
  await db.from("google_calendars").update({ watch_id: null, watch_resource: null, watch_expires: null }).eq("user_id", uid).eq("calendar_id", c.calendar_id);
}
async function stopWatches(db: SupabaseClient, uid: string, token: string) {
  const { data } = await db.from("google_calendars").select("*").eq("user_id", uid).not("watch_id", "is", null);
  for (const c of data ?? []) await stopOne(db, uid, token, c);
}

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
  location: r.location ?? "",
  meet_link: r.meet_link ?? null, alarms: Array.isArray(r.alarms) ? r.alarms : null, attendees: Array.isArray(r.attendees) ? r.attendees : null,
  time_zone: r.time_zone ?? null,
});
/** our row's time columns: "24:00" is stored as 24:00:00 (Postgres time allows it) */
const toRowFields = (f: EventFields) => ({ ...f, start_time: f.all_day ? null : f.start_time, end_time: f.all_day ? null : f.end_time });

/**
 * One sync at a time per person (Google's notices, the app and the timer can come together; two at once would bring
 * the same Google event in twice). One that comes while another runs asks for one more round after it.
 */
async function syncUser(db: SupabaseClient, uid: string, quick = false): Promise<Row> {
  const stale = new Date(Date.now() - 3 * 60000).toISOString();
  const { data: got } = await db.from("google_accounts").update({ sync_lock: new Date().toISOString(), sync_again: false })
    .eq("user_id", uid).or(`sync_lock.is.null,sync_lock.lt.${stale}`).select("user_id").maybeSingle();
  if (!got) {
    await db.from("google_accounts").update({ sync_again: true }).eq("user_id", uid);
    return { ok: true, busy: true, changed: false, error: null };
  }
  let out: Row = { ok: true };
  let changed = false;
  try {
    for (let round = 0; round < 3; round++) {
      out = await syncOnce(db, uid, quick && round === 0);
      changed ||= !!out.changed;
      const { data: again } = await db.from("google_accounts").update({ sync_again: false }).eq("user_id", uid).eq("sync_again", true).select("user_id").maybeSingle();
      if (!again) break;
    }
  } finally {
    await db.from("google_accounts").update({ sync_lock: null }).eq("user_id", uid);
  }
  return { ...out, changed };
}

/**
 * quick (user, 2026-11-23: a colour changed in 립마크 reached Google slowly): only the app's changes go to Google,
 * with the calendars, colours and labels kept from the last full round; no pull, no watch renewal. A full round
 * (Google's notice, the timer) does the rest.
 */
async function syncOnce(db: SupabaseClient, uid: string, quick = false) {
  const token = await accessToken(db, uid);
  const stats = { pulled: 0, pushed: 0, deleted: 0, failed: 0 };
  let firstError: string | null = null;
  // a write Google refuses is no longer passed over in silence (user, 2026-11-23: a colour change did not reach
  // Google): when it is about the label, the same change goes again with the old colorId only; otherwise the reason
  // is kept for 설정 → 구글 캘린더
  const write = async (target: string, method: "PATCH" | "POST", full: GEvent) => {
    let path = target;
    const { __fallbackColorId: fallback, ...body } = full;
    // conferenceDataVersion=1: so a video meeting asked for (or taken off) in 립마크 is made (or removed) by Google
    path = `${path}${path.includes("?") ? "&" : "?"}conferenceDataVersion=1`;
    // event labels (Google's 24 colours) are written only with eventLabelVersion=1 in the address (Google, July 2026);
    // with it the old colorId is ignored, so it goes only when a label is set or the calendar's colour is wanted
    // (no label, no colorId). Any other colour goes as the old colorId, without it.
    // a new event with the calendar's colour has no label to take off: nothing about labels is sent (user, 2026-11-26:
    // events added in 립마크 did not reach Google)
    if (method === "POST" && !body.eventLabelId) delete body.eventLabelId;
    else if (body.eventLabelId || (body.eventLabelId === null && body.colorId == null)) {
      path += "&eventLabelVersion=1";
      if (!body.eventLabelId) body.eventLabelId = ""; // "" takes the label off
    } else delete body.eventLabelId;
    let r = await g(token, path, { method, body: JSON.stringify(body) });
    if (!r.ok && r.status === 400 && "eventLabelId" in body) {
      // Google refused the label: the nearest old colour instead, and say so
      const { eventLabelId: _l, ...rest } = body;
      r = await g(token, path.replace("&eventLabelVersion=1", ""), { method, body: JSON.stringify({ ...rest, colorId: fallback ?? null }) });
      if (r.ok) firstError ??= "구글이 고른 색(라벨)을 받지 않아 가장 가까운 기본 색으로 올렸어요";
    }
    // Google took the change but not the label (it keeps its labels to itself): the same change again with the
    // nearest old colour, so Google shows a colour near the one picked, not the calendar's (user, 2026-11-23: 벚꽃
    // became green in Google)
    if (r.ok && body.eventLabelId && r.body?.eventLabelId !== body.eventLabelId) {
      const again = method === "POST" ? `${target}/${enc(r.body.id)}` : path;
      const back = await g(token, `${again.split("?")[0]}?conferenceDataVersion=1`, { method: "PATCH", body: JSON.stringify({ colorId: fallback ?? null }) });
      if (back.ok) { r = back; firstError ??= "구글이 이 색(라벨)을 립마크에서 바꾸지 못하게 해서, 구글에 있는 가장 가까운 기본 색으로 올렸어요"; }
    }
    if (!r.ok) { stats.failed++; firstError ??= `구글에 못 올렸어요 (${r.status} ${String(r.body?.error?.message ?? "").slice(0, 120)})`; }
    return r;
  };

  // 1. calendars (not in a quick round: the list kept from last time is used)
  const list: GEvent[] = [];
  if (!quick) {
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
    // every calendar of the account is synced (user, 2026-11-23; hiding is the app's 보기 설정); new events go to the main one
    selected: true, is_default: had.get(c.id)?.is_default ?? (first && !!c.primary),
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
  }
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
  // each calendar's default alarm (what Google rings for an event that keeps the default)
  const defaultAlarm = new Map(list.map((c) => [c.id, ((c.defaultReminders ?? []) as { method: string; minutes: number }[]).filter((d) => d.method === "popup").map((d) => d.minutes)]));

  // every row, not the first 1000 (user, 2026-11-23: with more than 1000 events, a saved Google event whose link was
  // not read went up to Google again as a new one)
  const links = (await every(() => db.from("google_event_links").select("*").eq("user_id", uid), "event_id")) as Link[];
  const byGoogle = new Map(links.map((l) => [`${l.calendar_id}|${l.google_id}`, l]));

  // calendars no longer picked: their Google events leave the app, the app's own stay (unlinked)
  for (const l of links.filter((l) => !picked.some((c) => c.calendar_id === l.calendar_id))) {
    if (l.origin === "google") await db.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", l.event_id);
    else await db.from("events").update({ google_calendar_id: null }).eq("id", l.event_id);
    await db.from("google_event_links").delete().eq("event_id", l.event_id);
    byGoogle.delete(`${l.calendar_id}|${l.google_id}`);
  }

  // the eleven colours as Google's apps show them (the colors API answers older shades)
  const keep = quick ? 30 * 60000 : 0;
  const palette = (await remembered(`p|${uid}`, keep, () => livePalette(token))).event;
  const labels = new Map<string, Record<string, string>>();
  for (const c of picked) labels.set(c.calendar_id, await remembered(`l|${uid}|${c.calendar_id}`, keep, () => labelsOf(token, c.calendar_id)).catch(() => ({})));

  // Google tells us at once when a picked calendar changes (a watch, about a week long, renewed here)
  if (!quick) await keepWatches(db, uid, token, cals).catch(() => {});

  // 2. pull
  for (const c of quick ? [] : picked) {
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
    for (const item of items) stats.pulled += await pullOne(db, uid, c, item, palette, byGoogle, labels.get(c.calendar_id) ?? {}, defaultAlarm.get(c.calendar_id) ?? []);
    if (next) await db.from("google_calendars").update({ sync_token: next }).eq("user_id", uid).eq("calendar_id", c.calendar_id);
  }

  // 3. push: what changed in the app since it was last in step with Google
  const evRows: Row[] = await every(() => db.from("events").select("*").eq("user_id", uid), "id");
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
  // after Google took a change: what Google decided (a meeting made or taken off) comes back into the app row
  // and the colour Google really shows, so both sides show the same (user, 2026-11-23)
  const afterPush = async (e: Row, body: GEvent, cal?: Cal) => {
    const patch: Row = {};
    if (e.meet_link === "new" || e.meet_link === "") patch.meet_link = meetLinkOf(body);
    if (cal) {
      const shown = shownColor(body, palette, cal.color, labels.get(cal.calendar_id));
      if (shown.toUpperCase() !== String(e.color ?? "").toUpperCase()) patch.color = shown;
    }
    if (!Object.keys(patch).length) return e.updated_at;
    const { data: up } = await db.from("events").update(patch).eq("id", e.id).select("updated_at").maybeSingle();
    return up?.updated_at ?? e.updated_at;
  };
  // one time of a Google repeat changed on its own in 립마크 ("이 일정만"): that time is changed in Google, the
  // repeat stays as it is (user, 2026-11-23: the whole repeat was redrawn). These go first, so the series' skipped
  // day is known as a changed time, not sent as a deleted one.
  const ordered = [...(evRows ?? [])].sort((a, b) => Number(!!b.instance_of) - Number(!!a.instance_of));
  // the days of a series kept as changed single times in 립마크 (local days; a Google id's day is in UTC)
  const changedDays = (sid: string) => new Set(ordered.filter((x) => !x.deleted_at && String(x.instance_of ?? "").startsWith(`${sid}|`)).map((x) => String(x.instance_of).split("|")[1]));
  for (const e of ordered) {
    const l = linkOf.get(e.id);
    if (!l && e.instance_of && !e.deleted_at) {
      const [sid, day] = String(e.instance_of).split("|");
      const sl = linkOf.get(sid);
      const series = ordered.find((x) => x.id === sid);
      const cal = sl && cals.find((c) => c.calendar_id === sl.calendar_id);
      if (sl && series && cal?.can_write && day) {
        const iid = instanceId(sl.google_id, day, !!series.all_day, series.start_time ? String(series.start_time).slice(0, 5) : null, series.time_zone || cal.time_zone);
        const body = toGoogle(fieldsOf(e), cal.time_zone, palette, cal.color, undefined, labels.get(cal.calendar_id));
        delete body.recurrence; // one time has no repeat of its own
        const r = await write(`/calendars/${enc(cal.calendar_id)}/events/${enc(iid)}`, "PATCH", body);
        if (r.ok) {
          const synced = await afterPush(e, r.body, cal);
          const nl: Link = { event_id: e.id, calendar_id: cal.calendar_id, google_id: r.body.id, origin: "google", lossy: false, google_updated: r.body.updated, synced_at: synced };
          await db.from("google_event_links").insert({ ...nl, user_id: uid });
          linkOf.set(e.id, nl); byGoogle.set(`${nl.calendar_id}|${nl.google_id}`, nl);
          stats.pushed++;
        }
        continue;
      }
    }
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
      const r = await write(`/calendars/${enc(target.calendar_id)}/events/${enc(gid)}`, "PATCH", toGoogle(fieldsOf(e), target.time_zone, palette, target.color, new Set([...exceptionDays([...byGoogle.values()], l), ...changedDays(e.id)]), labels.get(target.calendar_id)));
      if (r.ok) {
        const synced = await afterPush(e, r.body, target);
        await db.from("google_event_links").update({ calendar_id: target.calendar_id, google_id: r.body.id, google_updated: r.body.updated, synced_at: synced }).eq("event_id", e.id);
        stats.pushed++;
      }
    } else if (!e.deleted_at && e.google_calendar_id && new Date(e.created_at ?? 0) > connectedAt) {
      const target = writable(e.google_calendar_id);
      if (!target) continue;
      // never a second copy: an event already linked (or one from Google) is not made again
      if (e.instance_of) continue;
      const { data: had } = await db.from("google_event_links").select("event_id").eq("event_id", e.id).maybeSingle();
      if (had) continue;
      const body = toGoogle(fieldsOf(e), target.time_zone, palette, target.color, undefined, labels.get(target.calendar_id));
      body.extendedProperties = { private: { libmark: e.id } }; // which 립마크 event it is
      const r = await write(`/calendars/${enc(target.calendar_id)}/events`, "POST", body);
      if (r.ok) {
        const synced = await afterPush(e, r.body, target);
        await db.from("google_event_links").insert({ event_id: e.id, user_id: uid, calendar_id: target.calendar_id, google_id: r.body.id, origin: "app", google_updated: r.body.updated, synced_at: synced });
        stats.pushed++;
      }
    }
  }
  await db.from("google_accounts").update({ last_sync_at: new Date().toISOString(), last_error: firstError }).eq("user_id", uid);
  return { ok: true, ...stats, changed: stats.pulled > 0, error: firstError };
}

/**
 * The colours Google answers for this account, by colorId: `event` (an event's own colour) and `calendar`. The first
 * eleven event colours are given in the shades Google's apps show (the API still answers older, paler ones); any
 * other colour comes as Google gives it. Without an answer, the eleven.
 */
/** The alarms an event really has: its list, or (stored before the list existed) its one alarm time. */
const alarmList = (e: Row) => JSON.stringify(Array.isArray(e.alarms) && e.alarms.length ? [...new Set(e.alarms as number[])].sort((x, y) => x - y) : e.alarm_minutes != null ? [e.alarm_minutes] : []);

/** Every row of a query, page by page (a select alone returns at most 1000). */
// deno-lint-ignore no-explicit-any
async function every(make: () => any, key: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make().order(key).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/**
 * One-time clean-up of copies (user, 2026-11-23: saving a Google event made a new one): stored events of the same
 * Google calendar with the same title, days, times and repeat rule are copies; the oldest stays, the others leave the app and
 * Google. {dry: true} only counts.
 */
async function removeCopies(db: SupabaseClient, uid: string, dry: boolean, most = 120) {
  // a part at a time (user, 2026-11-25: 671 at once ran out of the server's strength); run again for the rest
  const token = await accessToken(db, uid);
  const evs = await every(() => db.from("events").select("id, title, start_date, end_date, all_day, start_time, end_time, repeat, instance_of, google_calendar_id, created_at, color, memo, location, alarm_minutes, alarms, important").eq("user_id", uid).is("deleted_at", null).not("google_calendar_id", "is", null), "id");
  const links = new Map((await every(() => db.from("google_event_links").select("event_id, calendar_id, google_id").eq("user_id", uid), "event_id")).map((l) => [l.event_id, l]));
  const { data: cals } = await db.from("google_calendars").select("calendar_id, can_write").eq("user_id", uid);
  const canWrite = new Set((cals ?? []).filter((c) => c.can_write).map((c) => c.calendar_id));
  const groups = new Map<string, Row[]>();
  // a copy is a second stored event that is the same: same calendar, title, first day, times and the same repeat
  // rule (a whole second repeat), or the same changed time of a repeat. The days a repeat comes back on are one stored
  // event, never copies of each other, so a usual repeat is never touched (user, 2026-11-25).
  let repeatGroups = 0;
  for (const e of evs) {
    const k = JSON.stringify([e.google_calendar_id, e.title, e.start_date, e.end_date, e.all_day, e.start_time, e.end_time, e.repeat ?? null, e.instance_of ?? null,
      // and everything else written on it (user, 2026-11-25): a different colour, memo, place, alarm or 강조 = not a copy
      String(e.color ?? "").toUpperCase(), e.memo ?? "", e.location ?? "", alarmList(e), !!e.important]);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  // the one kept: a linked one if there is (it is the real Google event), the oldest of those; copies with no link are
  // only in 립마크 (taken out of the app, Google untouched); linked copies are real copies in Google (deleted there too)
  let copies = 0, removed = 0, groupsWithCopies = 0, appOnly = 0, inGoogle = 0;
  const now = new Date().toISOString();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    groupsWithCopies++;
    if (list[0].repeat) repeatGroups++;
    list.sort((a, b) => Number(!links.has(a.id)) - Number(!links.has(b.id)) || String(a.created_at).localeCompare(String(b.created_at)));
    for (const e of list.slice(1)) {
      copies++;
      const l = links.get(e.id);
      if (l) inGoogle++; else appOnly++;
      if (dry || removed >= most) continue;
      if (l) {
        if (!canWrite.has(l.calendar_id)) continue;
        const r = await g(token, `/calendars/${enc(l.calendar_id)}/events/${enc(l.google_id)}`, { method: "DELETE" });
        if (!r.ok && r.status !== 404 && r.status !== 410) continue;
        await db.from("google_event_links").delete().eq("event_id", e.id);
      }
      await db.from("events").update({ deleted_at: now }).eq("id", e.id);
      removed++;
    }
  }
  return { events: evs.length, groupsWithCopies, repeatGroups, copies, appOnly, inGoogle, removed, left: dry ? copies : copies - removed, dry };
}

/** What Google said a moment ago (colours, labels), kept while this server copy lives: a quick round asks less. */
const memo = new Map<string, { at: number; v: unknown }>();
async function remembered<T>(key: string, keepMs: number, f: () => Promise<T>): Promise<T> {
  const m = memo.get(key);
  if (m && keepMs && Date.now() - m.at < keepMs) return m.v as T;
  const v = await f();
  memo.set(key, { at: Date.now(), v });
  return v;
}

async function livePalette(token: string): Promise<{ event: Record<string, string>; calendar: Record<string, string> }> {
  const r = await g(token, "/colors");
  const pick = (o: Record<string, Row> | undefined) => Object.fromEntries(Object.entries(o ?? {}).map(([id, v]) => [id, String(v.background ?? "").toUpperCase()]).filter(([, c]) => /^#[0-9A-F]{6}$/.test(c)));
  const event = { ...pick(r.body?.event), ...GOOGLE_EVENT_COLORS };
  return { event: Object.keys(event).length ? event : { ...GOOGLE_EVENT_COLORS }, calendar: pick(r.body?.calendar) };
}

/** A calendar's event labels (Google's newer colours): label id → colour; none when the calendar has none. */
async function labelsOf(token: string, calendarId: string): Promise<Record<string, string>> {
  const r = await g(token, `/calendars/${enc(calendarId)}`);
  const list = (r.body?.labelProperties?.eventLabels ?? []) as { id: string; backgroundColor?: string }[];
  return Object.fromEntries(list.filter((l) => l.id && /^#[0-9a-fA-F]{6}$/.test(l.backgroundColor ?? "")).map((l) => [l.id, l.backgroundColor!.toUpperCase()]));
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

/**
 * One-time colour refresh, light: lists only id, colour and status of every event of the picked calendars, sets the
 * colour of the linked app events whose colour differs (Google's own colour, else the calendar's), and keeps the
 * listing's sync token, so the 15-minute sync goes on from here. Counts what colour fields Google sent.
 */
async function refreshColours(db: SupabaseClient, uid: string) {
  const token = await accessToken(db, uid);
  const palette = (await livePalette(token)).event;
  const { data: cals } = await db.from("google_calendars").select("*").eq("user_id", uid).eq("selected", true);
  const links = await every(() => db.from("google_event_links").select("event_id, calendar_id, google_id").eq("user_id", uid), "event_id");
  const linkOf = new Map((links ?? []).map((l) => [`${l.calendar_id}|${l.google_id}`, l.event_id]));
  const want = new Map<string, { color: string; location: string; meet_link: string | null; alarm_minutes: number | null }>(); // event id -> what Google has
  const entries = await g(token, `/users/me/calendarList?maxResults=250`);
  const defaultAlarm = new Map(((entries.body?.items ?? []) as GEvent[]).map((c) => [c.id, ((c.defaultReminders ?? []) as { method: string; minutes: number }[]).filter((d) => d.method === "popup").map((d) => d.minutes)]));
  const report = { items: 0, withColorId: 0, colorIds: {} as Record<string, number>, otherKeys: {} as Record<string, number>, updated: 0 };
  for (const c of (cals ?? []) as Cal[]) {
    const labels = await labelsOf(token, c.calendar_id).catch(() => ({} as Record<string, string>));
    let next: string | undefined;
    for (let page: string | undefined; ;) {
      const q = new URLSearchParams({ maxResults: "2500", showDeleted: "true", singleEvents: "false" });
      if (page) q.set("pageToken", page);
      const r = await g(token, `/calendars/${enc(c.calendar_id)}/events?${q}`);
      if (!r.ok) throw new Error(`events ${r.status}`);
      for (const item of (r.body.items ?? []) as GEvent[]) {
        if (item.status === "cancelled") continue;
        report.items++;
        if (item.colorId) { report.withColorId++; report.colorIds[item.colorId] = (report.colorIds[item.colorId] ?? 0) + 1; }
        for (const k of Object.keys(item)) if (!KNOWN.has(k)) report.otherKeys[k] = (report.otherKeys[k] ?? 0) + 1;
        const id = linkOf.get(`${c.calendar_id}|${item.id}`);
        if (id) {
          const popups = ((item.reminders?.overrides ?? []) as { method: string; minutes: number }[]).filter((o) => o.method === "popup").map((o) => o.minutes);
          const rings = [...new Set(item.reminders?.useDefault ? defaultAlarm.get(c.calendar_id) ?? [] : popups)].sort((a, b) => a - b);
          const ring = rings[0] ?? null;
          want.set(id, { color: (item.eventLabelId && labels[item.eventLabelId]) || (item.colorId && palette[item.colorId]) || c.color, location: String(item.location ?? "").slice(0, 500), meet_link: meetLinkOf(item), alarm_minutes: alarmFromGoogle(ring, !!item.start?.date) });
        }
      }
      page = r.body.nextPageToken;
      if (!page) { next = r.body.nextSyncToken; break; }
    }
    if (next) await db.from("google_calendars").update({ sync_token: next }).eq("user_id", uid).eq("calendar_id", c.calendar_id);
  }
  const ids = [...want.keys()];
  for (let i = 0; i < ids.length; i += 200) {
    const { data: rows } = await db.from("events").select("id, color, location, meet_link, alarm_minutes").in("id", ids.slice(i, i + 200));
    for (const row of rows ?? []) {
      const w = want.get(row.id)!;
      if (String(row.color).toUpperCase() === w.color.toUpperCase() && (row.location ?? "") === w.location && (row.meet_link ?? null) === w.meet_link && (row.alarm_minutes ?? null) === w.alarm_minutes) continue;
      const { data: up } = await db.from("events").update({ color: w.color, location: w.location, meet_link: w.meet_link, alarm_minutes: w.alarm_minutes }).eq("id", row.id).select("updated_at").maybeSingle();
      if (up) await db.from("google_event_links").update({ synced_at: up.updated_at }).eq("event_id", row.id);
      report.updated++;
    }
  }
  return report;
}

/** While a colour refresh runs: what Google sent about colours (counts only, no event contents). */
type Diag = { items: number; withColorId: number; colorIds: Record<string, number>; otherKeys: Record<string, number> };
let diag: Diag | null = null;
const KNOWN = new Set(["kind", "etag", "id", "status", "htmlLink", "created", "updated", "summary", "description", "location", "colorId", "creator", "organizer", "start", "end", "endTimeUnspecified", "recurrence", "recurringEventId", "originalStartTime", "transparency", "visibility", "iCalUID", "sequence", "attendees", "attendeesOmitted", "extendedProperties", "hangoutLink", "conferenceData", "gadget", "anyoneCanAddSelf", "guestsCanInviteOthers", "guestsCanModify", "guestsCanSeeOtherGuests", "privateCopy", "locked", "reminders", "source", "workingLocationProperties", "outOfOfficeProperties", "focusTimeProperties", "attachments", "birthdayProperties", "eventType"]);

/** One Google event into the app. Returns 1 when the app changed. */
async function pullOne(db: SupabaseClient, uid: string, c: Cal, item: GEvent, palette: Record<string, string>, byGoogle: Map<string, Link>, labels: Record<string, string> = {}, defaultReminders: number[] = []): Promise<number> {
  if (diag && item.status !== "cancelled") {
    diag.items++;
    if (item.colorId) { diag.withColorId++; diag.colorIds[item.colorId] = (diag.colorIds[item.colorId] ?? 0) + 1; }
    for (const k of Object.keys(item)) if (!KNOWN.has(k)) diag.otherKeys[k] = (diag.otherKeys[k] ?? 0) + 1;
  }
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

  const mapped = fromGoogle(item, c.time_zone, palette, c.color, labels, defaultReminders);
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
  const day = item.recurringEventId ? originalDay(item, c.time_zone) : null;
  const instance_of = seriesLink && day ? `${seriesLink.event_id}|${day}` : null;
  const { data: ins, error } = await db.from("events").insert({ id, user_id: uid, ...fields, category_id: c.category_id, google_calendar_id: c.calendar_id, ...(instance_of ? { instance_of } : {}) }).select("updated_at").maybeSingle();
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
