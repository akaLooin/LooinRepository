import assert from "node:assert/strict";
import { GOOGLE_EVENT_COLORS, instanceId, starOff, starOn, fromGoogle, fromRecurrence, localParts, readState, signState, toGoogle, toRecurrence, zonedToUtcCompact, type EventFields } from "../../supabase/functions/_shared/gcal";
import { expandEvents, type CalEvent } from "../src/lib/events";
import { GOOGLE_COLORS } from "../src/lib/googleColors";

const t = async (n: string, f: () => void | Promise<void>) => { await f(); console.log("ok", n); };
const TZ = "Asia/Seoul";
const palette = { "1": "#7986CB", "11": "#D50000", "10": "#0B8043" };
const base: EventFields = { title: "회의", start_date: "2026-11-24", end_date: "2026-11-24", all_day: false, start_time: "19:00", end_time: "20:00", color: "#4A90E2", memo: "", alarm_minutes: null, repeat: null, skip_dates: [], important: false, location: "", meet_link: null, alarms: [], attendees: [], time_zone: null, attachments: [] };

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
    assert.deepEqual(back.fields, { ...base, alarm_minutes: 30, alarms: [30], memo: "3층" });
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

  await t("구글 캘린더: event labels (the newer colours) both ways", () => {
    const labels = { "lab-cherry": "#D81B60", "lab-banana": "#F6BF26" };
    const ev = { summary: "x", start: { date: "2026-11-24" }, end: { date: "2026-11-25" } };
    // a label wins over the old colorId Google keeps beside it, which wins over the calendar's colour
    assert.equal(fromGoogle({ ...ev, eventLabelId: "lab-cherry", colorId: "11" }, TZ, GOOGLE_EVENT_COLORS, "#123456", labels)!.fields.color, "#D81B60");
    assert.equal(fromGoogle({ ...ev, eventLabelId: "unknown", colorId: "6" }, TZ, GOOGLE_EVENT_COLORS, "#123456", labels)!.fields.color, "#F4511E");
    assert.equal(fromGoogle(ev, TZ, GOOGLE_EVENT_COLORS, "#123456", labels)!.fields.color, "#123456");
    // back: a label colour sends that label; the calendar's colour sends none; another colour no label
    assert.equal(toGoogle({ ...base, color: "#d81b60" }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2", undefined, labels).eventLabelId, "lab-cherry");
    const own = toGoogle({ ...base, color: "#4A90E2" }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2", undefined, labels);
    assert.equal(own.eventLabelId, null); assert.equal(own.colorId, null);
    assert.equal(toGoogle({ ...base, color: "#123123" }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2", undefined, labels).eventLabelId, null);
  });

  await t("구글 캘린더: place both ways, the video meeting read from Google", () => {
    const g = toGoogle({ ...base, location: "서울 강남역 2번 출구" }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2");
    assert.equal(g.location, "서울 강남역 2번 출구");
    const back = fromGoogle({ ...g, start: { dateTime: "2026-11-24T19:00:00+09:00" }, end: { dateTime: "2026-11-24T20:00:00+09:00" }, hangoutLink: "https://meet.google.com/abc-defg-hij" }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2")!;
    assert.equal(back.fields.location, "서울 강남역 2번 출구"); assert.equal(back.fields.meet_link, "https://meet.google.com/abc-defg-hij");
    assert.equal("meet_link" in toGoogle({ ...base, meet_link: "https://x" }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2"), false, "the meeting is Google's, never sent");
    assert.equal(fromGoogle({ summary: "x", start: { date: "2026-11-24" }, end: { date: "2026-11-25" }, conferenceData: { entryPoints: [{ entryPointType: "phone", uri: "tel:1" }, { entryPointType: "video", uri: "https://zoom.us/j/1" }] } }, TZ, GOOGLE_EVENT_COLORS, "#1")!.fields.meet_link, "https://zoom.us/j/1");
  });

  await t("구글 캘린더: 알림 both ways (none means none, the calendar's default is shown as it rings, all-day counted from 9:00)", () => {
    const none = toGoogle({ ...base, alarm_minutes: null }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2");
    assert.deepEqual(none.reminders, { useDefault: false, overrides: [] }, "알림 없음 sends no alarm, not the calendar's default");
    const ev = { summary: "x", start: { dateTime: "2026-11-24T19:00:00+09:00" }, end: { dateTime: "2026-11-24T20:00:00+09:00" } };
    assert.equal(fromGoogle({ ...ev, reminders: { useDefault: true } }, TZ, GOOGLE_EVENT_COLORS, "#1", {}, 30)!.fields.alarm_minutes, 30, "a default alarm shows as it rings");
    assert.equal(fromGoogle({ ...ev, reminders: { useDefault: false, overrides: [] } }, TZ, GOOGLE_EVENT_COLORS, "#1", {}, 30)!.fields.alarm_minutes, null);
    const allDay = { ...base, all_day: true, start_time: null, end_time: null, alarm_minutes: 1440 }; // the day before, 9:00
    const g = toGoogle(allDay, TZ, GOOGLE_EVENT_COLORS, "#4A90E2");
    assert.deepEqual(g.reminders.overrides, [{ method: "popup", minutes: 900 }]);
    assert.equal(fromGoogle(g, TZ, GOOGLE_EVENT_COLORS, "#4A90E2")!.fields.alarm_minutes, 1440);
  });

  await t("구글 캘린더: a label colour goes as the label only (the old colorId beside it showed another colour)", () => {
    const g = toGoogle({ ...base, color: "#D81B60" }, TZ, GOOGLE_EVENT_COLORS, "#4A90E2", undefined, { "lab-cherry": "#D81B60" });
    assert.equal(g.eventLabelId, "lab-cherry"); assert.equal(g.colorId, null); assert.ok(g.__fallbackColorId, "a fallback if Google refuses the label");
  });

  await t("구글 캘린더: the signed note of who is connecting", async () => {
    const s = await signState("user-1", "secret", 1000);
    assert.equal(await readState(s, "secret", 2000), "user-1");
    assert.equal(await readState(s, "other", 2000), null, "a note signed with another key is refused");
    assert.equal(await readState(s, "secret", 1000 + 16 * 60000), null, "too old");
    assert.equal(await readState(s.replace(/^./, "x"), "secret", 2000), null, "changed");
  });
  await t("one time of a Google repeat: its id in Google", () => {
    assert.equal(instanceId("abc", "2026-12-01", true, null, "Asia/Seoul"), "abc_20261201");
    // 08:00 in Seoul is the day before in UTC
    assert.equal(instanceId("abc", "2026-12-01", false, "08:00", "Asia/Seoul"), "abc_20261130T230000Z");
  });
})();
