import assert from "node:assert/strict";
import { GOOGLE_EVENT_COLORS, starOff, starOn, fromGoogle, fromRecurrence, localParts, readState, signState, toGoogle, toRecurrence, zonedToUtcCompact, type EventFields } from "../../supabase/functions/_shared/gcal";
import { expandEvents, type CalEvent } from "../src/lib/events";
import { GOOGLE_COLORS } from "../src/lib/googleColors";

const t = async (n: string, f: () => void | Promise<void>) => { await f(); console.log("ok", n); };
const TZ = "Asia/Seoul";
const palette = { "1": "#7986CB", "11": "#D50000", "10": "#0B8043" };
const base: EventFields = { title: "회의", start_date: "2026-11-24", end_date: "2026-11-24", all_day: false, start_time: "19:00", end_time: "20:00", color: "#4A90E2", memo: "", alarm_minutes: null, repeat: null, skip_dates: [], important: false };

(async () => {
  await t("구글 캘린더: time zones", () => {
    assert.deepEqual(localParts("2026-11-24T10:00:00Z", TZ), { date: "2026-11-24", time: "19:00" });
    assert.equal(zonedToUtcCompact("2026-11-24", "19:00", TZ), "20261124T100000Z");
    assert.equal(zonedToUtcCompact("2026-07-01", "09:00", "America/New_York"), "20260701T130000Z", "summer time");
  });

  await t("구글 캘린더: a timed and an all-day event both ways", () => {
    const g = toGoogle({ ...base, alarm_minutes: 30, memo: "3층" }, TZ, palette, "#4A90E2");
    assert.deepEqual(g.start, { dateTime: "2026-11-24T19:00:00", timeZone: TZ });
    assert.deepEqual(g.reminders, { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] });
    assert.equal(g.colorId, null, "the calendar's own colour sends no colorId");
    const back = fromGoogle({ ...g, start: { dateTime: "2026-11-24T19:00:00+09:00" }, end: { dateTime: "2026-11-24T20:00:00+09:00" } }, TZ, palette, "#4A90E2")!;
    assert.deepEqual(back.fields, { ...base, alarm_minutes: 30, memo: "3층" });
    // all day: Google's end is the day after
    const trip = { ...base, all_day: true, start_time: null, end_time: null, end_date: "2026-11-26" };
    const ga = toGoogle(trip, TZ, palette, "#4A90E2");
    assert.deepEqual([ga.start, ga.end], [{ date: "2026-11-24" }, { date: "2026-11-27" }]);
    assert.deepEqual(fromGoogle(ga, TZ, palette, "#4A90E2")!.fields, trip);
    // until midnight
    const late = toGoogle({ ...base, start_time: "22:00", end_time: "24:00" }, TZ, palette, "#4A90E2");
    assert.equal(late.end.dateTime, "2026-11-25T00:00:00");
    assert.equal(fromGoogle({ ...late, start: { dateTime: "2026-11-24T22:00:00+09:00" }, end: { dateTime: "2026-11-25T00:00:00+09:00" } }, TZ, palette, "#4A90E2")!.fields.end_time, "24:00");
    // colours: nearest Google colour; an event with no colour takes the calendar's
    assert.equal(toGoogle({ ...base, color: "#E00000" }, TZ, palette, "#4A90E2").colorId, "11");
    assert.equal(fromGoogle({ summary: "x", colorId: "10", start: { date: "2026-11-24" }, end: { date: "2026-11-25" } }, TZ, palette, "#123456")!.fields.color, "#0B8043");
    assert.equal(fromGoogle({ summary: "", start: { date: "2026-11-24" }, end: { date: "2026-11-25" } }, TZ, palette, "#123456")!.fields.color, "#123456");
    assert.equal(fromGoogle({ status: "cancelled" }, TZ, palette, "#123456"), null);
    assert.equal(fromGoogle({ summary: "<b>a</b>", description: "줄1<br>줄2", start: { date: "2026-11-24" }, end: { date: "2026-11-25" } }, TZ, palette, "#123456")!.fields.memo, "줄1\n줄2");
  });

  await t("구글 캘린더: repeats both ways, skipped days, every 2 weeks, count, lossy rules", () => {
    const weekly = { ...base, repeat: { kind: "weekly" as const, weekdays: [2, 4], until: "2026-12-31" }, skip_dates: ["2026-12-01"] };
    const lines = toRecurrence(weekly, TZ)!;
    assert.deepEqual(lines, ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T145959Z", "EXDATE;TZID=Asia/Seoul:20261201T190000"]);
    const back = fromRecurrence(lines, "2026-11-24", false, TZ);
    assert.deepEqual(back, { repeat: { kind: "weekly", weekdays: [2, 4], until: "2026-12-31" }, skip: ["2026-12-01"], lossy: false });
    // a day kept by Google as a changed single time is not sent as an EXDATE
    assert.deepEqual(toRecurrence(weekly, TZ, new Set(["2026-12-01"])), ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T145959Z"]);
    assert.deepEqual(toRecurrence({ ...base, all_day: true, repeat: { kind: "yearly" }, skip_dates: ["2027-11-24"] }, TZ), ["RRULE:FREQ=YEARLY", "EXDATE;VALUE=DATE:20271124"]);
    const two = fromRecurrence(["RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"], "2026-11-23", false, TZ);
    assert.deepEqual(two.repeat, { kind: "weekly", every: 2, weekdays: [1] });
    const ev = (r: CalEvent["repeat"]): CalEvent => ({ id: "e", title: "", startDate: "2026-11-23", endDate: "2026-11-23", allDay: true, color: "#000000", memo: "", repeat: r });
    assert.deepEqual(expandEvents([ev(two.repeat)], "2026-11-23", "2026-12-21").map((x) => x.startDate), ["2026-11-23", "2026-12-07", "2026-12-21"], "the app draws every 2 weeks");
    assert.equal(fromRecurrence(["RRULE:FREQ=DAILY;COUNT=3"], "2026-11-23", true, TZ).repeat!.until, "2026-11-25");
    assert.equal(fromRecurrence(["RRULE:FREQ=MONTHLY;BYDAY=2MO"], "2026-11-09", true, TZ).lossy, true, "the second Monday cannot be drawn: never written back");
    assert.equal(fromRecurrence(["RRULE:FREQ=MONTHLY;BYMONTHDAY=9"], "2026-11-09", true, TZ).lossy, false);
    assert.deepEqual(fromRecurrence(["RRULE:FREQ=DAILY", "EXDATE:20261124T100000Z,20261125T100000Z"], "2026-11-23", false, TZ).skip, ["2026-11-24", "2026-11-25"]);
  });

  await t("구글 캘린더: ⭐ at the front of the Google title = 강조 in the app, both ways", () => {
    assert.deepEqual(starOff("⭐ 시험"), { title: "시험", important: true });
    assert.deepEqual(starOff("⭐️시험"), { title: "시험", important: true }, "with the emoji's variation mark, no space");
    assert.deepEqual(starOff("★ 시험"), { title: "시험", important: true }, "★ (typed on a PC) counts too");
    assert.deepEqual(starOff("★시험"), { title: "시험", important: true });
    assert.equal(starOn("★ 시험", true), "⭐ 시험", "written back as ⭐");
    assert.equal(starOn("★ 시험", false), "시험");
    assert.deepEqual(starOff("시험 ⭐"), { title: "시험 ⭐", important: false }, "only at the front");
    assert.equal(starOn("시험", true), "⭐ 시험");
    assert.equal(starOn("⭐ 시험", true), "⭐ 시험", "never two stars");
    assert.equal(starOn("⭐ 시험", false), "시험", "강조 off takes the star away");
    const g = fromGoogle({ summary: "⭐ 발표", start: { date: "2026-11-24" }, end: { date: "2026-11-25" } }, TZ, palette, "#123456")!;
    assert.equal(g.fields.title, "발표"); assert.equal(g.fields.important, true);
    assert.equal(toGoogle({ ...base, important: true }, TZ, palette, "#4A90E2").summary, "⭐ 회의");
    assert.equal(toGoogle({ ...base, important: false }, TZ, palette, "#4A90E2").summary, "회의");
  });

  await t("구글 캘린더: the app offers exactly Google's eleven colours, and each goes back as its own colorId", () => {
    assert.deepEqual(Object.fromEntries(GOOGLE_COLORS.map((c) => [c.id, c.hex])), GOOGLE_EVENT_COLORS);
    for (const k of GOOGLE_COLORS) assert.equal(toGoogle({ ...base, color: k.hex }, TZ, GOOGLE_EVENT_COLORS, "#123456").colorId, k.id, k.name);
    assert.equal(fromGoogle({ summary: "x", colorId: "6", start: { date: "2026-11-24" }, end: { date: "2026-11-25" } }, TZ, GOOGLE_EVENT_COLORS, "#123456")!.fields.color, "#F4511E");
  });

  await t("구글 캘린더: the signed note of who is connecting", async () => {
    const s = await signState("user-1", "secret", 1000);
    assert.equal(await readState(s, "secret", 2000), "user-1");
    assert.equal(await readState(s, "other", 2000), null, "a note signed with another key is refused");
    assert.equal(await readState(s, "secret", 1000 + 16 * 60000), null, "too old");
    assert.equal(await readState(s.replace(/^./, "x"), "secret", 2000), null, "changed");
  });
})();
