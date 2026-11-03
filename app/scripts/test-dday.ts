import assert from "node:assert/strict";
import { ddayLabel, nextOccurrence } from "../src/data/dday";

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
