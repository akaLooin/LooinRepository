import assert from "node:assert/strict";
import { alarmAt, clock, dayBlocks, eventProblem, eventsOn, eventTimeLabel, inBand, liftSpans, slotAt, type CalEvent } from "../src/lib/events";
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
  assert.deepEqual(list.map((e) => e.id), ["trip", "night", "early", "late"]);
  assert.equal(inBand(trip), true);
  assert.equal(inBand(night), true, "an event over two days sits in the band");
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
