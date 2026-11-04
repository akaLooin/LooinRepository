import assert from "node:assert/strict";
import { fromSettingsRow, SYNCED, toSettingsRow } from "../src/data/prefsRow";
import type { Prefs } from "../src/data/prefs";

const p: Prefs = {
  theme: "light", weekStartsSunday: false, doubleTapToEdit: true, use24h: false, smallTodoText: true, smallTodoMemo: false, todoSort: "manual",
  uiScale: 0.9, calendarCategoryIds: ["c1"], calendarCategoryCount: 3, collapsibleCategories: true, collapsedCategoryIds: ["c2"], inputAtTop: true,
};
const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
t("synced settings survive a round trip", () => {
  const back = fromSettingsRow(toSettingsRow(p, "u1"));
  for (const k of SYNCED) assert.deepEqual(back[k], p[k], k);
});
t("device-only prefs never go to the server", () => {
  const row = JSON.stringify(toSettingsRow(p, "u1"));
  assert.ok(!row.includes("0.9") && !row.includes("c1") && !row.includes("c2"));
});
t("odd server values are ignored", () => {
  assert.deepEqual(fromSettingsRow({ theme: "purple", todo_sort: "created", calendar_category_count: 9, use_24h: "yes" }), {});
});
