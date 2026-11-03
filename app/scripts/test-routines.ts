// npx tsx scripts/test-routines.ts
import assert from "node:assert/strict";
import { occursOn, ruleLabel, periodLabel, routineStatus } from "../src/lib/routines";

const t = (name: string, fn: () => void) => { fn(); console.log("ok", name); };

t("daily respects start and end", () => {
  const r = { repeatType: "daily" as const, startDate: "2026-09-27", endDate: "2026-10-01" };
  assert.equal(occursOn(r, "2026-09-26"), false);
  assert.equal(occursOn(r, "2026-09-27"), true);
  assert.equal(occursOn(r, "2026-10-01"), true);
  assert.equal(occursOn(r, "2026-10-02"), false);
});
t("interval counts from start, across months and DST-free", () => {
  const r = { repeatType: "interval" as const, intervalDays: 3, startDate: "2026-10-30" };
  assert.deepEqual(["2026-10-30", "2026-11-01", "2026-11-02", "2026-11-05"].map((d) => occursOn(r, d)), [true, false, true, true]);
});
t("weekly on Saturday", () => {
  const r = { repeatType: "weekly" as const, weekdays: [6], startDate: "2026-10-17" };
  assert.equal(occursOn(r, "2026-11-07"), true); // Saturday
  assert.equal(occursOn(r, "2026-11-08"), false);
});
t("biweekly counts from the start week", () => {
  const r = { repeatType: "biweekly" as const, weekdays: [1, 3], startDate: "2026-11-04" }; // Wed
  assert.equal(occursOn(r, "2026-11-02"), false); // before start
  assert.equal(occursOn(r, "2026-11-04"), true); // start week Wed
  assert.equal(occursOn(r, "2026-11-09"), false); // next week Mon
  assert.equal(occursOn(r, "2026-11-16"), true); // week after Mon
  assert.equal(occursOn(r, "2026-11-18"), true);
});
t("monthly skips months without the day", () => {
  const r = { repeatType: "monthly" as const, monthDays: [31], startDate: "2026-01-01" };
  assert.equal(occursOn(r, "2026-01-31"), true);
  assert.equal(occursOn(r, "2026-02-28"), false);
  assert.equal(occursOn(r, "2026-04-30"), false);
});
t("yearly on Feb 29 only in leap years", () => {
  const r = { repeatType: "yearly" as const, yearMonth: 2, yearDay: 29, startDate: "2026-01-01" };
  assert.equal(occursOn(r, "2028-02-29"), true);
  assert.equal(occursOn(r, "2027-02-28"), false);
});
t("labels", () => {
  assert.equal(ruleLabel({ repeatType: "weekly", weekdays: [6] }), "토요일");
  assert.equal(ruleLabel({ repeatType: "weekly", weekdays: [5, 1, 3] }), "월, 수, 금");
  assert.equal(ruleLabel({ repeatType: "monthly", monthDays: [10] }), "매월 10일");
  assert.equal(periodLabel("2026-09-29", "2026-12-31"), "2026. 9. 29 ~ 2026. 12. 31");
  assert.equal(periodLabel("2026-09-27"), "2026. 9. 27 ~");
  assert.equal(routineStatus({ startDate: "2026-09-27" }, "2026-11-03"), "active");
  assert.equal(routineStatus({ startDate: "2026-09-27", endDate: "2026-10-01" }, "2026-11-03"), "finished");
});
