import assert from "node:assert/strict";
import { ddayLabel, isDDayOn, nextOccurrence } from "../src/data/dday";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
t("fixed", () => {
  assert.equal(ddayLabel({ type: "fixed", targetDate: "2026-11-15" }, "2026-11-03"), "D-12");
  assert.equal(ddayLabel({ type: "fixed", targetDate: "2026-11-03" }, "2026-11-03"), "D-DAY");
  assert.equal(ddayLabel({ type: "fixed", targetDate: "2026-11-01" }, "2026-11-03"), "D+2");
});
t("yearly birthday rolls to next year", () => {
  assert.equal(nextOccurrence({ type: "repeat", repeatUnit: "yearly", targetDate: "2000-03-05" }, "2026-11-03"), "2027-03-05");
  assert.equal(nextOccurrence({ type: "repeat", repeatUnit: "yearly", targetDate: "2000-12-25" }, "2026-11-03"), "2026-12-25");
  assert.equal(nextOccurrence({ type: "repeat", repeatUnit: "yearly", targetDate: "2000-02-29" }, "2026-11-03"), "2027-02-28");
});
t("monthly uses the last day of short months", () => {
  assert.equal(nextOccurrence({ type: "repeat", repeatUnit: "monthly", targetDate: "2026-01-31" }, "2026-11-03"), "2026-11-30");
  assert.equal(nextOccurrence({ type: "repeat", repeatUnit: "monthly", targetDate: "2026-01-02" }, "2026-11-03"), "2026-12-02");
});
t("a repeat that has not started yet counts to its first date", () => {
  assert.equal(nextOccurrence({ type: "repeat", repeatUnit: "yearly", targetDate: "2027-01-01" }, "2026-11-03"), "2027-01-01");
});
t("당일 포함 counts the day itself as day 1", () => {
  const d = { type: "fixed" as const, targetDate: "2026-11-01", includeToday: true };
  assert.equal(ddayLabel(d, "2026-11-01"), "D+1");
  assert.equal(ddayLabel(d, "2026-11-06"), "D+6");
  assert.equal(ddayLabel(d, "2026-10-30"), "D-2");
  assert.equal(ddayLabel({ ...d, includeToday: false }, "2026-11-06"), "D+5");
});
t("the red circle falls on the D-day's dates", () => {
  assert.equal(isDDayOn({ type: "fixed", targetDate: "2026-11-20" }, "2026-11-20"), true);
  assert.equal(isDDayOn({ type: "fixed", targetDate: "2026-11-20" }, "2026-11-21"), false);
  const y = { type: "repeat" as const, targetDate: "2020-03-14", repeatUnit: "yearly" as const };
  assert.equal(isDDayOn(y, "2026-03-14"), true);
  assert.equal(isDDayOn(y, "2026-03-15"), false);
  assert.equal(isDDayOn(y, "2019-03-14"), false);
  const m = { type: "repeat" as const, targetDate: "2026-01-31", repeatUnit: "monthly" as const };
  assert.equal(isDDayOn(m, "2026-02-28"), true);
});
