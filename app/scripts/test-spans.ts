import assert from "node:assert/strict";
import { daysBetween } from "../src/lib/dates";
import { isSpan, moveSpan, onDay, rowSegments, spanLabel, type SpanBar } from "../src/lib/spans";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
t("multi-day to-do: covers its days, keeps its length when moved", () => {
  const s = { date: "2026-11-03", endDate: "2026-11-07" };
  assert.equal(isSpan(s), true);
  assert.equal(isSpan({ date: "2026-11-03", endDate: "2026-11-03" }), false);
  assert.equal(isSpan({ date: null, endDate: "2026-11-03" }), false);
  assert.deepEqual(["2026-11-02", "2026-11-03", "2026-11-05", "2026-11-07", "2026-11-08"].map((d) => onDay(s, d)), [false, true, true, true, false]);
  assert.equal(onDay({ date: "2026-11-03" }, "2026-11-03"), true);
  assert.deepEqual(moveSpan(s, "2026-11-29"), { date: "2026-11-29", endDate: "2026-12-03" });
  assert.deepEqual(moveSpan(s, null), { date: null, endDate: null });
  assert.deepEqual(moveSpan({ date: "2026-11-03" }, "2026-11-04"), { date: "2026-11-04" });
  assert.equal(daysBetween("2026-03-28", "2026-04-02"), 5);
  assert.equal(spanLabel(s, 2026), "11.3 – 11.7");
  assert.equal(spanLabel({ date: "2026-12-30", endDate: "2027-01-02" }, 2026), "12.30 – 2027.1.2");
});
t("multi-day to-do: bars of a calendar row in lanes, the rest counted per day", () => {
  const row = [null, null, "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"];
  const bar = (id: string, start: string, end: string): SpanBar => ({ id, start, end, color: "#fff", done: false, title: id });
  const { segments, more } = rowSegments(row, [
    bar("trip", "2026-10-30", "2026-11-04"), // started last month: cut at the row's first day
    bar("exam", "2026-11-04", "2026-11-09"), // goes on into the next row
    bar("long", "2026-11-05", "2026-11-06"),
    bar("x", "2026-11-05", "2026-11-05"),
  ], 2);
  const by = Object.fromEntries(segments.map((s) => [s.id, [s.lane, s.from, s.to, s.opensLeft, s.opensRight]]));
  assert.deepEqual(by.trip, [0, 2, 3, true, false]);
  assert.deepEqual(by.exam, [1, 3, 6, false, true]);
  assert.deepEqual(by.long, [0, 4, 5, false, false]);
  assert.equal(by.x, undefined);
  assert.deepEqual(more, [0, 0, 0, 0, 1, 0, 0]);
  assert.deepEqual(rowSegments([null, null, null, null, null, null, null], [bar("a", "2026-11-01", "2026-11-02")], 2).segments, []);
});

t("일정 막대 (메인 앱): highlighted first, then all-day, then timed", () => {
  const row = ["2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28"];
  const bars = [
    { id: "timed", start: "2026-11-22", end: "2026-11-22", color: "", done: false, title: "회의" },
    { id: "allday", start: "2026-11-23", end: "2026-11-23", color: "", done: false, title: "휴가", allDay: true },
    { id: "star", start: "2026-11-24", end: "2026-11-24", color: "", done: false, title: "발표", important: true },
  ];
  // all on one day each would not compete; put them on the same day to see the lanes
  const same = bars.map((b) => ({ ...b, start: "2026-11-25", end: "2026-11-25" }));
  assert.deepEqual(rowSegments(row, same, 2, true).segments.map((x) => x.id), ["star", "allday"]);
  assert.deepEqual(rowSegments(row, same.filter((b) => b.id !== "star"), 2, true).segments.map((x) => x.id), ["allday", "timed"]);
});
