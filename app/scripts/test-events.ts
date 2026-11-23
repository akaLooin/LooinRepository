import assert from "node:assert/strict";
import { alarmAt, alarmsOf, alarmTimes, clock, dayBlocks, eventProblem, eventsOn, eventTimeLabel, inBand, liftSpans, slotAt, type CalEvent } from "../src/lib/events";
import { planNotifications } from "../src/lib/notificationPlan";
import { missingTable } from "../src/data/sync";
import { fromRow, toRow } from "../src/data/rows";
import type { DB } from "../src/data/types";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
const ev = (id: string, p: Partial<CalEvent>): CalEvent => ({ id, title: id, startDate: "2026-11-18", endDate: "2026-11-18", allDay: false, startTime: "09:00", endTime: "10:00", color: "#3DA5F4", memo: "", alarmMinutes: null, ...p });

t("일정: which day, band or grid, order", () => {
  const trip = ev("trip", { startDate: "2026-11-17", endDate: "2026-11-20", allDay: true, startTime: undefined, endTime: undefined });
  const late = ev("late", { startTime: "13:00", endTime: "14:00" });
  const early = ev("early", { startTime: "08:30", endTime: "09:30" });
  const night = ev("night", { startDate: "2026-11-18", endDate: "2026-11-19", startTime: "22:00", endTime: "02:00" });
  const list = eventsOn([late, trip, early, night, ev("other", { startDate: "2026-11-21", endDate: "2026-11-21" })], "2026-11-18");
  assert.deepEqual(list.map((e) => e.id), ["trip", "early", "late", "night"]);
  assert.equal(inBand(trip), true);
  assert.equal(inBand(night), false, "a timed event over midnight is a block, not in the band");
  const nb = dayBlocks([night], "2026-11-18")[0], nb2 = dayBlocks([night], "2026-11-19")[0];
  assert.deepEqual([nb.top, nb.bottom, nb2.top, nb2.bottom], [22 * 60, 24 * 60, 0, 2 * 60], "its part of each day");
  assert.equal(inBand(early), false);
});

t("일정: overlapping blocks share the width, the rest keep it", () => {
  const b = dayBlocks([ev("a", { startTime: "09:00", endTime: "10:30" }), ev("b", { startTime: "10:00", endTime: "11:00" }), ev("c", { startTime: "12:00", endTime: "12:10" }),
    ev("d", { startTime: "09:30", endTime: "10:00" })], "2026-11-18");
  const by = Object.fromEntries(b.map((x) => [x.e.id, x]));
  assert.equal(by.a.cols, 2);
  assert.equal(by.a.col, 0);
  assert.equal(by.d.col, 1);
  assert.equal(by.b.col, 1, "b starts after d ends, so it takes d's column");
  assert.equal(by.c.cols, 1);
  assert.equal(by.c.bottom - by.c.top, 20, "a 10-minute event is still tall enough to tap");
});

t("일정: a tap on the grid picks the half hour, one hour long", () => {
  assert.deepEqual(slotAt(8 * 60 + 40), { startTime: "08:30", endTime: "09:30" });
  assert.deepEqual(slotAt(9 * 60 + 5), { startTime: "09:00", endTime: "10:00" });
  assert.deepEqual(slotAt(23 * 60 + 50), { startTime: "23:00", endTime: "24:00" });
  assert.deepEqual(slotAt(-5), { startTime: "00:00", endTime: "01:00" });
});

t("일정: time labels and checks", () => {
  assert.equal(clock("08:30", false), "오전 8:30");
  assert.equal(clock("12:00", false), "오후 12:00");
  assert.equal(clock("00:15", false), "오전 12:15");
  assert.equal(eventTimeLabel(ev("x", { startTime: "08:30", endTime: "09:30" }), false, 2026), "오전 8:30~9:30");
  assert.equal(eventTimeLabel(ev("x", { startTime: "11:30", endTime: "13:00" }), false, 2026), "오전 11:30~오후 1:00");
  assert.equal(eventTimeLabel(ev("x", { startTime: "08:30", endTime: "09:30" }), true, 2026), "08:30~09:30");
  assert.equal(eventTimeLabel(ev("x", { allDay: true }), true, 2026), "종일");
  assert.equal(eventTimeLabel(ev("x", { allDay: true, endDate: "2027-01-02" }), true, 2026), "11월 18일 ~ 2027년 1월 2일");
  assert.equal(eventProblem(ev("x", { title: " " })), "제목을 적어 주세요");
  assert.equal(eventProblem(ev("x", { startTime: "10:00", endTime: "09:00" })), "끝나는 시간이 시작 시간보다 빨라요");
  assert.equal(eventProblem(ev("x", { startTime: "22:00", endTime: "02:00", endDate: "2026-11-19" })), null);
  assert.equal(eventProblem(ev("x", { endDate: "2026-11-17", allDay: true })), "끝나는 날이 시작하는 날보다 빨라요");
});

t("일정: alarms ring before the start, 종일 before 9:00, and are planned", () => {
  assert.deepEqual(alarmAt(ev("x", { startTime: "08:30", alarmMinutes: 30 })), new Date(2026, 10, 18, 8, 0));
  assert.deepEqual(alarmAt(ev("x", { allDay: true, alarmMinutes: 24 * 60 })), new Date(2026, 10, 17, 9, 0));
  assert.equal(alarmAt(ev("x", {})), null);
  const db = { profile: { id: "u", nickname: "", bio: "" }, categories: [], todos: [], routines: [], ddays: [], diaries: [], reminders: [],
    events: [ev("meet", { title: "회의", startTime: "10:00", alarmMinutes: 10 }), ev("gone", { startTime: "07:00", alarmMinutes: 0 })] } as DB;
  const plan = planNotifications(db, new Date(2026, 10, 18, 8, 0));
  assert.deepEqual(plan.map((p) => [p.key, p.title, p.body, p.at.getHours(), p.at.getMinutes()]), [["event:meet", "회의", "오전 10:00 시작", 9, 50]]);
});

t("일정: rows for the server and back; a missing table keeps them waiting", () => {
  const e = ev("3e000000-0000-0000-0000-000000000001", { alarmMinutes: 30, memo: "m" });
  const row = toRow.events(e, "u");
  assert.equal(row.start_time, "09:00");
  assert.deepEqual(fromRow.events({ ...row, start_time: "09:00:00", end_time: "10:00:00" }), e);
  assert.equal(toRow.events(ev("y", { allDay: true }), "u").start_time, null, "종일 has no times");
  assert.equal(missingTable('relation "public.events" does not exist'), true);
  assert.equal(missingTable("Could not find the table 'public.events' in the schema cache"), true);
  assert.equal(missingTable('column "end_date" of relation "todos" does not exist'), false);
});

t("일정: old multi-day to-dos become events with the same id", () => {
  const todos = [
    { id: "a", title: "제주", date: "2026-11-03", endDate: "2026-11-07", categoryId: "c1", memo: "", isSkipped: false },
    { id: "b", title: "하루", date: "2026-11-03", categoryId: "c1", memo: "" },
    { id: "c", title: "지움", date: "2026-11-03", endDate: "2026-11-04", categoryId: "c1", memo: "", isSkipped: true },
  ];
  const { events, lifted } = liftSpans(todos, () => "#FF6B81");
  assert.deepEqual([...lifted].sort(), ["a", "c"]);
  assert.deepEqual(events, [{ id: "a", title: "제주", startDate: "2026-11-03", endDate: "2026-11-07", allDay: true, color: "#FF6B81", memo: "", alarmMinutes: null }]);
});

import { moveBlock, resizeBlock } from "../src/lib/eventDrag";
t("일정: a held event moves by quarter hours within the day; stretching in 5 minutes, at least 15", () => {
  assert.deepEqual(moveBlock(540, 600, 32), { top: 570, bottom: 630 });
  assert.deepEqual(moveBlock(540, 600, 22), { top: 555, bottom: 615 });
  assert.deepEqual(moveBlock(545, 600, 1), { top: 540, bottom: 595 }, "lands on a quarter hour");
  assert.deepEqual(moveBlock(540, 600, -900), { top: 0, bottom: 60 });
  assert.deepEqual(moveBlock(540, 600, 2000), { top: 1380, bottom: 1440 });
  assert.deepEqual(resizeBlock(540, 600, "bottom", 47), { top: 540, bottom: 645 });
  assert.deepEqual(resizeBlock(540, 600, "bottom", -59), { top: 540, bottom: 555 });
  assert.deepEqual(resizeBlock(540, 600, "top", -61), { top: 480, bottom: 600 });
  assert.deepEqual(resizeBlock(540, 600, "top", 100), { top: 585, bottom: 600 });
  assert.deepEqual(resizeBlock(30, 600, "top", -100), { top: 0, bottom: 600 });
});

import { importantDays } from "../src/lib/events";
import { missingColumn } from "../src/data/sync";
t("중요한 날: days of important to-dos and events; synced only once set; waits for a missing column", () => {
  const days = importantDays(
    [{ date: "2026-11-03", isImportant: true }, { date: "2026-11-04" }, { date: "2026-11-05", isImportant: true, isSkipped: true }, { date: null, isImportant: true }],
    [ev("trip", { startDate: "2026-11-30", endDate: "2026-12-02", allDay: true, important: true }), ev("plain", { startDate: "2026-11-10" })],
    "2026-11-01", "2026-12-01");
  assert.deepEqual([...days].sort(), ["2026-11-03", "2026-11-30", "2026-12-01"]);
  assert.equal("is_important" in toRow.todos({ id: "t", categoryId: "c", title: "x", date: "2026-11-03", sortOrder: 1, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" }, "u"), false);
  assert.equal(toRow.events(ev("x", { important: true }), "u").important, true);
  assert.equal(fromRow.events({ ...toRow.events(ev("x", { important: true }), "u") }).important, true);
  assert.equal(missingColumn("Could not find the 'is_important' column of 'todos' in the schema cache"), true);
  assert.equal(missingColumn('relation "public.events" does not exist'), false);
});

import { moveSpanBlock, shiftEvent } from "../src/lib/eventDrag";
import { rowSegments } from "../src/lib/spans";
t("일정: an event over midnight moves whole; highlighted events take the 할 일 캘린더 lines first", () => {
  const night = ev("n", { startDate: "2026-11-19", endDate: "2026-11-20", startTime: "22:00", endTime: "02:00" });
  assert.deepEqual(moveSpanBlock(0, 120, 37), { top: 30, bottom: 150, delta: 30 });
  assert.deepEqual(moveSpanBlock(1320, 1440, 50), { top: 1365, bottom: 1440, delta: 45 });
  const later = shiftEvent(night, 150);
  assert.deepEqual([later.startDate, later.startTime, later.endDate, later.endTime], ["2026-11-20", "00:30", "2026-11-20", "04:30"]);
  const earlier = shiftEvent(night, -120);
  assert.deepEqual([earlier.startDate, earlier.startTime, earlier.endDate, earlier.endTime], ["2026-11-19", "20:00", "2026-11-19", "24:00"]);
  const row = ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"];
  const bars = [
    { id: "a", start: "2026-11-15", end: "2026-11-21", color: "", done: false, title: "a" },
    { id: "b", start: "2026-11-16", end: "2026-11-20", color: "", done: false, title: "b" },
    { id: "c", start: "2026-11-17", end: "2026-11-17", color: "", done: false, title: "c", important: true },
  ];
  assert.deepEqual(rowSegments(row, bars, 2, true).segments.map((x) => x.id), ["c", "a"]);
  assert.deepEqual(rowSegments(row, bars, 2).segments.map((x) => x.id), ["a", "b"]);
});

t("일정 반복: days, weekdays, month and year days, end day, skipped days, row round trip", () => {
  const { expandEvents, repeatLabel, seriesOf } = require("../src/lib/events") as typeof import("../src/lib/events");
  const days = (e: CalEvent, from: string, to: string) => expandEvents([e], from, to).map((x) => x.startDate);
  // 2026-11-24 is a Tuesday
  const weekly = ev("w", { startDate: "2026-11-24", endDate: "2026-11-24", repeat: { kind: "weekly", weekdays: [2, 4] }, skipDates: ["2026-12-01"] });
  assert.deepEqual(days(weekly, "2026-11-20", "2026-12-06"), ["2026-11-24", "2026-11-26", "2026-12-03"], "Tue and Thu, 12-01 taken out, nothing before the first day");
  const shown = expandEvents([weekly], "2026-11-24", "2026-11-24")[0];
  assert.equal(shown.id, "w~2026-11-24"); assert.equal(shown.seriesId, "w"); assert.equal(seriesOf(shown.id), "w");
  assert.deepEqual(days(ev("d", { startDate: "2026-11-24", repeat: { kind: "daily", until: "2026-11-26" } }), "2026-11-01", "2026-12-31"), ["2026-11-24", "2026-11-25", "2026-11-26"]);
  assert.deepEqual(days(ev("m", { startDate: "2026-01-31", endDate: "2026-01-31", repeat: { kind: "monthly" } }), "2026-01-01", "2026-05-31"), ["2026-01-31", "2026-03-31", "2026-05-31"], "months without the day are skipped");
  assert.deepEqual(days(ev("y", { startDate: "2024-02-29", endDate: "2024-02-29", repeat: { kind: "yearly" } }), "2024-01-01", "2028-12-31"), ["2024-02-29", "2028-02-29"]);
  // a two-day time that began before the shown range is still there
  const trip = ev("t", { startDate: "2026-11-23", endDate: "2026-11-24", allDay: true, repeat: { kind: "weekly" } });
  assert.deepEqual(expandEvents([trip], "2026-11-24", "2026-11-24").map((x) => `${x.startDate}..${x.endDate}`), ["2026-11-23..2026-11-24"]);
  assert.equal(repeatLabel(weekly.repeat, weekly.startDate), "매주 화·목");
  assert.equal(repeatLabel({ kind: "monthly", until: "2026-12-31" }, "2026-11-24"), "매월 24일 · 12월 31일까지");
  // stored and read back; an event without the new fields sends none of them (servers without the SQL keep syncing)
  const row = toRow.events({ ...weekly, categoryId: "k" }, "u");
  assert.deepEqual(fromRow.events(row), { ...weekly, categoryId: "k" });
  assert.equal("repeat" in toRow.events(ev("plain", {}), "u"), false);
});

t("일정 반복: this time only or every time, delete one or all", () => {
  const { expandEvents, saveEventIn, deleteEventIn } = require("../src/lib/events") as typeof import("../src/lib/events");
  let n = 0;
  const newId = () => `id${++n}`;
  let events: CalEvent[] = [];
  const save = (x: Omit<CalEvent, "id"> & { id?: string }, scope: "one" | "all") => { const r = saveEventIn(events, x, scope, newId); events = r.events; return r.id; };
  const id = save({ title: "영어", startDate: "2026-11-24", endDate: "2026-11-24", allDay: false, startTime: "19:00", endTime: "20:00", color: "#3DA5F4", memo: "", alarmMinutes: null, repeat: { kind: "weekly" } }, "all");
  const occ = (day: string) => expandEvents(events, "2026-01-01", "2027-12-31").find((e) => e.id === `${id}~${day}`);
  assert.ok(occ("2026-12-01"));
  // this time only: taken out of the repeat, kept as its own event
  save({ ...occ("2026-12-01")!, startTime: "18:00", endTime: "19:00" }, "one");
  assert.equal(occ("2026-12-01"), undefined);
  const lone = events.find((e) => e.id !== id)!;
  assert.equal(lone.startDate, "2026-12-01"); assert.equal(lone.startTime, "18:00"); assert.equal("repeat" in lone, false); assert.equal("seriesId" in lone, false);
  // kept as that time of the repeat, so Google changes only that time (user, 2026-11-23)
  assert.equal(lone.instanceOf, `${id}|2026-12-01`);
  // every time: moved a day on (from a later time), the title too
  save({ ...occ("2026-12-08")!, startDate: "2026-12-09", endDate: "2026-12-09", title: "영어 회화" }, "all");
  const series = events.find((e) => e.id === id)!;
  assert.equal(series.startDate, "2026-11-25"); assert.equal(series.title, "영어 회화"); assert.deepEqual(series.skipDates, ["2026-12-01"]);
  // the repeat turned off for all from a later time: the earlier times stay, ending the day before
  save({ ...occ("2026-12-16")!, repeat: null }, "all");
  assert.equal(events.find((e) => e.id === id)!.repeat!.until, "2026-12-15");
  events = deleteEventIn(events, `${id}~2026-12-02`, "one");
  assert.deepEqual(events.find((e) => e.id === id)!.skipDates, ["2026-12-01", "2026-12-02"]);
  events = deleteEventIn(events, `${id}~2026-12-09`, "all");
  assert.equal(events.some((e) => e.id === id), false);
});

t("강조 색: a day glows in its first important to-do's colour (category order)", () => {
  const { importantDayColors } = require("../src/lib/events") as typeof import("../src/lib/events");
  const cats = [{ id: "a", color: "#111111" }, { id: "b", color: "#222222" }];
  const todos = [
    { date: "2026-11-24", isImportant: true, categoryId: "b", sortOrder: 0 },
    { date: "2026-11-24", isImportant: true, categoryId: "a", sortOrder: 5 },
    { date: "2026-11-25", isImportant: false, categoryId: "a", sortOrder: 0 },
  ];
  const m = importantDayColors(todos, cats, "2026-11-01", "2026-11-30", (id, own) => (id === "b" ? "#FF0000" : own));
  assert.deepEqual([...m], [["2026-11-24", "#111111"]]);
});

t("알림 여러 개: each rings, smallest first", () => {
  const e: CalEvent = { id: "a", title: "x", startDate: "2026-11-18", endDate: "2026-11-18", allDay: false, startTime: "10:00", endTime: "11:00", color: "#111111", memo: "", alarmMinutes: 10, alarms: [60, 10, 60] };
  assert.deepEqual(alarmsOf(e), [10, 60]);
  assert.deepEqual(alarmTimes(e), [new Date(2026, 10, 18, 9, 50), new Date(2026, 10, 18, 9, 0)]);
  assert.deepEqual(alarmsOf({ alarmMinutes: 30 }), [30]);
  assert.deepEqual(alarmsOf({ alarmMinutes: null }), []);
});
