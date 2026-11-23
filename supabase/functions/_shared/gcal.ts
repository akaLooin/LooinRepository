// 구글 캘린더 ↔ 립마크 일정: pure conversions, shared by the google-calendar function and the app's tests.
// No Deno or Node APIs here (Intl and crypto.subtle exist in both).

export type Day = string; // YYYY-MM-DD
export type Repeat = { kind: "daily" | "weekly" | "monthly" | "yearly"; weekdays?: number[]; until?: Day | null; every?: number };
/** An events row as stored (the parts Google knows about). */
export type Attendee = { email: string; name?: string; status?: string; organizer?: boolean; self?: boolean; optional?: boolean };
export type EventFields = {
  title: string; start_date: Day; end_date: Day; all_day: boolean; start_time: string | null; end_time: string | null;
  color: string; memo: string; alarm_minutes: number | null; repeat: Repeat | null; skip_dates: Day[];
  /** 강조: shown in Google as a ⭐ at the front of the title (user, 2026-11-23) */
  important: boolean;
  /** 장소 (both ways) and the video meeting Google made (read only in the app) */
  location?: string;
  /** the video meeting; "new" asks Google to make a Meet, "" takes it away (app → Google only) */
  meet_link?: string | null;
  /** every alarm, minutes before (alarm_minutes is the first one, for older apps) */
  alarms?: number[] | null;
  /** guests: e-mail, name, answer (accepted / declined / tentative / needsAction) */
  attendees?: Attendee[] | null;
  /** the event's own time zone (Google's; none = the calendar's) */
  time_zone?: string | null;
  /** files attached in Google (read only in the app) */
  attachments?: { title: string; url: string }[] | null;
};

/**
 * ⭐ at the front of a Google title = 강조 in the app (the star itself is taken off; "⭐️" with its variation mark too).
 * ★ counts the same, for typing on a PC without emoji (user, 2026-11-23).
 */
export function starOff(title: string): { title: string; important: boolean } {
  const m = /^\s*(?:\u2B50|\u2605)\uFE0F?\s*/.exec(title);
  return m ? { title: title.slice(m[0].length), important: true } : { title, important: false };
}
/** 강조 in the app = "⭐ " at the front of the Google title. */
export const starOn = (title: string, important: boolean) => (important ? `⭐ ${starOff(title).title}` : starOff(title).title);
// deno-lint-ignore no-explicit-any
export type GEvent = Record<string, any>;

const pad = (n: number) => String(n).padStart(2, "0");
export const addDays = (d: Day, n: number): Day => {
  const [y, m, dd] = d.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
const weekdayOf = (d: Day) => { const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); };
const compact = (d: Day) => d.replaceAll("-", "");
const fromCompact = (s: string): Day => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

/** The wall-clock date and time of an instant in a time zone. */
export function localParts(iso: string, tz: string): { date: Day; time: string } {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** The instant of a wall-clock date and time in a time zone, as YYYYMMDDTHHMMSSZ. */
export function zonedToUtcCompact(date: Day, time: string, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  let guess = Date.UTC(y, m - 1, d, h, mi);
  // correct by the zone's offset at that moment (twice, for days when the offset changes)
  for (let i = 0; i < 2; i++) {
    const lp = localParts(new Date(guess).toISOString(), tz);
    const [ly, lm, ld] = lp.date.split("-").map(Number);
    const [lh, lmi] = lp.time.split(":").map(Number);
    guess -= Date.UTC(ly, lm - 1, ld, lh, lmi) - Date.UTC(y, m - 1, d, h, mi);
  }
  const t = new Date(guess);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}Z`;
}

// ── repeats ─────────────────────────────────────────────
const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Our repeat as RRULE and EXDATE lines. `exceptions`: skipped days that Google keeps as changed single times (not EXDATEs). */
export function toRecurrence(e: Pick<EventFields, "repeat" | "skip_dates" | "start_date" | "all_day" | "start_time">, tz: string, exceptions: Set<Day> = new Set()): string[] | undefined {
  const r = e.repeat;
  if (!r) return undefined;
  const parts = [`FREQ=${r.kind.toUpperCase()}`];
  if (r.every && r.every > 1) parts.push(`INTERVAL=${r.every}`);
  if (r.kind === "weekly") parts.push(`BYDAY=${(r.weekdays?.length ? [...r.weekdays].sort() : [weekdayOf(e.start_date)]).map((x) => DAYS[x]).join(",")}`);
  if (r.kind === "monthly") parts.push(`BYMONTHDAY=${Number(e.start_date.slice(8, 10))}`);
  if (r.until) parts.push(`UNTIL=${e.all_day ? compact(r.until) : zonedToUtcCompact(r.until, "23:59", tz).replace(/00Z$/, "59Z")}`);
  const lines = [`RRULE:${parts.join(";")}`];
  const skips = (e.skip_dates ?? []).filter((d) => !exceptions.has(d)).sort();
  if (skips.length) {
    lines.push(e.all_day
      ? `EXDATE;VALUE=DATE:${skips.map(compact).join(",")}`
      : `EXDATE;TZID=${tz}:${skips.map((d) => `${compact(d)}T${(e.start_time ?? "00:00").replace(":", "")}00`).join(",")}`);
  }
  return lines;
}

/** Days written in an EXDATE line, as local days. */
function exdates(line: string, tz: string): Day[] {
  const [head, list] = [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1)];
  const zone = /TZID=([^;:]+)/.exec(head)?.[1];
  return list.split(",").map((v) => {
    v = v.trim();
    if (/^\d{8}$/.test(v)) return fromCompact(v);
    if (v.endsWith("Z")) return localParts(`${fromCompact(v)}T${v.slice(9, 11)}:${v.slice(11, 13)}:${v.slice(13, 15)}Z`, tz).date;
    return fromCompact(v); // a wall-clock time in TZID (or floating): its own date
  }).filter((d) => zone || true);
}

/**
 * Google's recurrence lines as our repeat. `lossy` when a part cannot be drawn by the app (every 2nd Monday, a
 * set of month days, …): the event is then shown by its nearest form and never written back.
 */
export function fromRecurrence(lines: string[] | undefined, start: Day, allDay: boolean, tz: string): { repeat: Repeat | null; skip: Day[]; lossy: boolean } {
  const rule = lines?.find((l) => l.startsWith("RRULE:"));
  if (!rule) return { repeat: null, skip: [], lossy: false };
  const p = Object.fromEntries(rule.slice(6).split(";").map((kv) => kv.split("=") as [string, string]));
  let lossy = false;
  const freq = String(p.FREQ ?? "").toLowerCase();
  if (!["daily", "weekly", "monthly", "yearly"].includes(freq)) return { repeat: null, skip: [], lossy: true };
  const repeat: Repeat = { kind: freq as Repeat["kind"] };
  const every = Number(p.INTERVAL ?? 1);
  if (every > 1) repeat.every = every;
  if (p.BYDAY) {
    const codes = p.BYDAY.split(",");
    if (freq === "weekly" && codes.every((c: string) => DAYS.includes(c))) repeat.weekdays = codes.map((c: string) => DAYS.indexOf(c)).sort();
    else lossy = true; // "2MO" (the second Monday), or BYDAY on a monthly / daily rule
  }
  if (p.BYMONTHDAY && !(freq === "monthly" && Number(p.BYMONTHDAY) === Number(start.slice(8, 10)))) lossy = true;
  for (const k of ["BYSETPOS", "BYWEEKNO", "BYYEARDAY", "BYHOUR", "BYMINUTE"]) if (p[k]) lossy = true;
  if (p.BYMONTH && !(freq === "yearly" && Number(p.BYMONTH) === Number(start.slice(5, 7)))) lossy = true;
  if (p.UNTIL) {
    const u = String(p.UNTIL);
    repeat.until = /^\d{8}$/.test(u) ? fromCompact(u) : u.endsWith("Z") ? localParts(`${fromCompact(u)}T${u.slice(9, 11)}:${u.slice(11, 13)}:${u.slice(13, 15)}Z`, tz).date : fromCompact(u);
  } else if (p.COUNT) repeat.until = lastOfCount(repeat, start, Number(p.COUNT));
  const skip = (lines ?? []).filter((l) => l.startsWith("EXDATE")).flatMap((l) => exdates(l, tz));
  void allDay;
  return { repeat, skip: [...new Set(skip)].sort(), lossy };
}

/** Does a repeat start a time on `day`? (as the app's lib/events repeatsOn) */
export function repeatsOn(r: Repeat, start: Day, day: Day): boolean {
  if (day < start || (r.until && day > r.until)) return false;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [y, m, d] = day.split("-").map(Number);
  const n = Math.max(1, r.every ?? 1);
  const between = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000);
  if (r.kind === "daily") return between % n === 0;
  if (r.kind === "weekly") return Math.floor((between + weekdayOf(start)) / 7) % n === 0 && (r.weekdays?.length ? r.weekdays : [weekdayOf(start)]).includes(weekdayOf(day));
  if (r.kind === "monthly") return d === sd && ((y - sy) * 12 + (m - sm)) % n === 0;
  return m === sm && d === sd && (y - sy) % n === 0;
}

/** COUNT=n as the day of the n-th time. */
function lastOfCount(r: Repeat, start: Day, count: number): Day {
  let seen = 0;
  for (let d = start, i = 0; i < 366 * 30; d = addDays(d, 1), i++) if (repeatsOn(r, start, d) && ++seen >= count) return d;
  return addDays(start, 366 * 30);
}

/**
 * Google Calendar's eleven event colours (colorId → colour), as Google's own apps show them. The colors API still
 * answers older, paler shades; these are the ones a person sees and picks, so the app offers exactly these when an
 * event goes to Google (user, 2026-11-23). app/src/lib/googleColors.ts has the same list (a test keeps them equal).
 */
export const GOOGLE_EVENT_COLORS: Record<string, string> = {
  "11": "#D50000", "4": "#E67C73", "6": "#F4511E", "5": "#F6BF26", "2": "#33B679", "10": "#0B8043",
  "7": "#039BE5", "9": "#3F51B5", "1": "#7986CB", "3": "#8E24AA", "8": "#616161",
};

// ── events ──────────────────────────────────────────────
const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
export const hex = (c: string | undefined) => (c && /^#[0-9A-Fa-f]{6}$/.test(c) ? c.toUpperCase() : null);

/**
 * A Google event as our fields (null when it is cancelled). `palette`: Google's event colours by colorId;
 * `calendarColor`: used when the event has none of its own.
 */
/**
 * `labels`: the calendar's event labels (Google's newer colours, labelProperties.eventLabels), label id → colour.
 * An event's label wins over its old colorId, which wins over the calendar's colour.
 */
export function fromGoogle(g: GEvent, tz: string, palette: Record<string, string>, calendarColor: string, labels: Record<string, string> = {}, defaultReminders: number | number[] | null = null): { fields: EventFields; lossy: boolean } | null {
  if (g.status === "cancelled" || !g.start) return null;
  const allDay = !!g.start.date;
  let startDate: Day, endDate: Day, startTime: string | null = null, endTime: string | null = null;
  if (allDay) {
    startDate = g.start.date;
    endDate = g.end?.date ? addDays(g.end.date, -1) : startDate; // Google's last day is the day after
    if (endDate < startDate) endDate = startDate;
  } else {
    const zone = g.start.timeZone || tz;
    const s = localParts(g.start.dateTime, zone), e = localParts(g.end?.dateTime ?? g.start.dateTime, g.end?.timeZone || zone);
    startDate = s.date; startTime = s.time; endDate = e.date; endTime = e.time;
    // ending at midnight: "until 24:00" of the day before (the app's way)
    if (endTime === "00:00" && endDate > startDate) { endDate = addDays(endDate, -1); endTime = "24:00"; }
    if (endDate === startDate && endTime <= startTime) endTime = startTime === "23:59" ? "24:00" : `${pad(Math.min(23, Number(startTime.slice(0, 2)) + 1))}:${startTime.slice(3)}`;
  }
  const rec = fromRecurrence(g.recurrence, startDate, allDay, g.start.timeZone || tz);
  // the alarm as Google really rings it: the event's own, or (useDefault) the calendar's default
  const defaults = defaultReminders == null ? [] : Array.isArray(defaultReminders) ? defaultReminders : [defaultReminders];
  const popups = ((g.reminders?.overrides ?? []) as { method: string; minutes: number }[]).filter((o) => o.method === "popup").map((o) => o.minutes);
  const rings = [...new Set(g.reminders?.useDefault ? defaults : popups)].sort((a, b) => a - b);
  const alarms = rings.map((m) => alarmFromGoogle(m, allDay)!).filter((m) => m != null);
  const star = starOff(String(g.summary ?? ""));
  return {
    fields: {
      title: star.title.trim().slice(0, 100) || "(제목 없음)", important: star.important,
      location: String(g.location ?? "").slice(0, 500),
      meet_link: meetLinkOf(g),
      start_date: startDate, end_date: endDate, all_day: allDay, start_time: startTime, end_time: endTime,
      color: hex(labels[g.eventLabelId]) ?? hex(palette[g.colorId]) ?? hex(calendarColor) ?? "#4A90E2",
      memo: stripHtml(String(g.description ?? "")).trim().slice(0, 2000),
      alarm_minutes: alarms[0] ?? null,
      alarms,
      attendees: ((g.attendees ?? []) as GEvent[]).filter((a) => a.email && !a.resource).map((a) => ({
        email: String(a.email), ...(a.displayName ? { name: String(a.displayName) } : {}), ...(a.responseStatus ? { status: String(a.responseStatus) } : {}),
        ...(a.organizer ? { organizer: true } : {}), ...(a.self ? { self: true } : {}), ...(a.optional ? { optional: true } : {}),
      })),
      time_zone: g.start.timeZone ?? null,
      attachments: ((g.attachments ?? []) as GEvent[]).filter((a) => a.fileUrl).map((a) => ({ title: String(a.title ?? "첨부파일").slice(0, 200), url: String(a.fileUrl) })),
      repeat: rec.repeat, skip_dates: rec.skip,
    },
    lossy: rec.lossy,
  };
}

/** The video meeting of a Google event (Meet or another one added there). */
export function meetLinkOf(g: GEvent): string | null {
  const video = (g.conferenceData?.entryPoints ?? []).find((p: { entryPointType?: string; uri?: string }) => p.entryPointType === "video")?.uri;
  const link = String(g.hangoutLink ?? video ?? "");
  return /^https:\/\//.test(link) ? link.slice(0, 500) : null;
}

/** Our event as a Google event body (insert or full update). */
export function toGoogle(e: EventFields, calendarTz: string, palette: Record<string, string>, calendarColor: string, exceptions?: Set<Day>, labels: Record<string, string> = {}): GEvent {
  // the event's own time zone if it has one (picked in the app or kept from Google), else the calendar's
  const tz = e.time_zone || calendarTz;
  const body: GEvent = { summary: starOn(e.title, e.important), description: e.memo || "" };
  if (e.location !== undefined) body.location = e.location;
  // guests: their e-mails and answers as the app has them (no invitation mails are sent from here)
  if (e.attendees) body.attendees = e.attendees.map((a) => ({ email: a.email, ...(a.status ? { responseStatus: a.status } : {}), ...(a.optional ? { optional: true } : {}), ...(a.name ? { displayName: a.name } : {}) }));
  // a new video meeting is asked for; "" takes the meeting off (the request goes with conferenceDataVersion=1)
  if (e.meet_link === "new") body.conferenceData = { createRequest: { requestId: `libmark-${e.start_date}-${Math.random().toString(36).slice(2, 10)}`, conferenceSolutionKey: { type: "hangoutsMeet" } } };
  else if (e.meet_link === "") body.conferenceData = null;
  if (e.all_day) {
    body.start = { date: e.start_date };
    body.end = { date: addDays(e.end_date, 1) };
  } else {
    const end = e.end_time === "24:00" ? { date: addDays(e.end_date, 1), time: "00:00" } : { date: e.end_date, time: e.end_time ?? "00:00" };
    body.start = { dateTime: `${e.start_date}T${e.start_time ?? "00:00"}:00`, timeZone: tz };
    body.end = { dateTime: `${end.date}T${end.time}:00`, timeZone: tz };
  }
  const rec = toRecurrence(e, tz, exceptions);
  body.recurrence = rec ?? [];
  // the calendar's own colour: no label, no colorId; a label's colour: that label (and the old colorId nearest to it,
  // as Google keeps both); any other colour: the nearest old colorId
  // a label's colour goes as that label only: sending the old colorId beside it made Google show the old, nearest
  // colour instead (user, 2026-11-23). `__fallbackColorId` is what to send if Google refuses the label (taken off
  // before sending).
  const label = sameColor(e.color, calendarColor) ? undefined : Object.entries(labels).find(([, c]) => sameColor(e.color, c))?.[0];
  const nearest = sameColor(e.color, calendarColor) ? null : nearestColorId(e.color, palette);
  body.eventLabelId = label ?? null;
  body.colorId = label ? null : nearest;
  if (label) body.__fallbackColorId = nearest;
  // 알림 없음 = no alarm in Google either (it was "the calendar's default", so a default alarm appeared, user)
  // every alarm (Google takes up to five)
  const list = (e.alarms?.length ? e.alarms : e.alarm_minutes != null ? [e.alarm_minutes] : []).map((m) => alarmToGoogle(m, e.all_day)!).filter((m) => m != null);
  body.reminders = { useDefault: false, overrides: [...new Set(list)].sort((a, b) => a - b).slice(0, 5).map((minutes) => ({ method: "popup", minutes })) };
  return body;
}

/**
 * Alarms: the app counts minutes before the start (an all-day event: before 9:00 of its first day); Google counts
 * minutes before the start (an all-day event: before 00:00), at most four weeks.
 */
/**
 * The id Google gives one time of a repeating event: the series id, "_", and when that time was meant to start
 * (all day: YYYYMMDD; timed: YYYYMMDDTHHMMSSZ in UTC).
 */
export function instanceId(seriesGoogleId: string, day: Day, allDay: boolean, startTime: string | null, tz: string): string {
  return `${seriesGoogleId}_${allDay ? compact(day) : zonedToUtcCompact(day, startTime ?? "00:00", tz)}`;
}

export function alarmFromGoogle(minutes: number | null | undefined, allDay: boolean): number | null {
  if (minutes == null) return null;
  return Math.min(40320, Math.max(0, allDay ? minutes + 540 : minutes));
}
export function alarmToGoogle(minutes: number | null | undefined, allDay: boolean): number | null {
  if (minutes == null) return null;
  return Math.min(40320, Math.max(0, allDay ? minutes - 540 : minutes));
}

const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const sameColor = (a: string, b: string) => a.toUpperCase() === (b || "").toUpperCase();
/** The Google event colour closest to ours. */
export function nearestColorId(color: string, palette: Record<string, string>): string | null {
  const [r, g, b] = rgb(color);
  let best: string | null = null, dist = Infinity;
  for (const [id, c] of Object.entries(palette)) {
    if (!hex(c)) continue;
    const [r2, g2, b2] = rgb(c);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < dist) { dist = d; best = id; }
  }
  return best;
}

/** The day an instance of a repeating Google event was originally on (for skipping it in the series). */
export function originalDay(g: GEvent, tz: string): Day | null {
  const o = g.originalStartTime;
  if (!o) return null;
  return o.date ?? localParts(o.dateTime, o.timeZone || tz).date;
}

// ── OAuth state ─────────────────────────────────────────
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}
/** A signed note of who is connecting (it comes back from Google unchanged), valid for 15 minutes. */
export async function signState(userId: string, secret: string, now = Date.now()): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify({ u: userId, exp: now + 15 * 60000 })));
  return `${body}.${b64url(await hmac(secret, body))}`;
}
export async function readState(state: string, secret: string, now = Date.now()): Promise<string | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig || b64url(await hmac(secret, body)) !== sig) return null;
  try {
    const v = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return typeof v.u === "string" && v.exp > now ? v.u : null;
  } catch { return null; }
}

/** The colour Google shows for an event (its label, else its old colorId, else its calendar's). */
export function shownColor(g: GEvent, palette: Record<string, string>, calendarColor: string, labels: Record<string, string> = {}): string {
  return hex(labels[g.eventLabelId]) ?? hex(palette[g.colorId]) ?? hex(calendarColor) ?? "#4A90E2";
}
