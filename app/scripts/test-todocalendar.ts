import assert from "node:assert/strict";
import { cellItems, requestHomeDay, takeHomeDay } from "../src/lib/todoCalendar";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
t("a day shows up to the limit, then +n on the last line", () => {
  const xs = [1, 2, 3, 4, 5];
  assert.deepEqual(cellItems(xs, 10), { shown: xs, more: 0 });
  assert.deepEqual(cellItems(xs, 5), { shown: xs, more: 0 });
  assert.deepEqual(cellItems(xs, 3), { shown: [1, 2], more: 3 });
  assert.deepEqual(cellItems(xs, 0), { shown: xs, more: 0 });
  assert.deepEqual(cellItems(xs, 1), { shown: [1], more: 4 });
});
t("a day picked in the calendar is taken once by home", () => {
  requestHomeDay("2026-11-20");
  assert.equal(takeHomeDay(), "2026-11-20");
  assert.equal(takeHomeDay(), null);
});
