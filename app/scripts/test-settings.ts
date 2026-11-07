import assert from "node:assert/strict";
import { fromSettingsRow, PRIVACY_COLUMNS, SYNCED, toSettingsRow } from "../src/data/prefsRow";
import type { Prefs } from "../src/data/prefs";

const p: Prefs = {
  theme: "light", weekStartsSunday: false, doubleTapToEdit: true, use24h: false, smallTodoText: true, smallTodoMemo: false, todoSort: "manual",
  uiScale: 0.9, calendarCategoryIds: ["c1"], calendarCategoryCount: 3, collapsibleCategories: true, collapsedCategoryIds: ["c2"], inputAtTop: true,
  checkColor: "black", smallTodoPhoto: true, showLikesInFeed: false, followApproval: true, likesTodo: "followers", likesDiary: "none", chatFrom: "all",
  searchable: false, notifyMarketing: true, notifyLikes: false, notifyFollowing: true, font: "nanumGothic", feedMemoLines: 2, monthCalendarMax: 15, weekCalendarMax: 0,
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
t("default font and no memo limit map to the server's defaults", () => {
  const row = toSettingsRow({ ...p, font: "pretendard", feedMemoLines: 0 }, "u1");
  assert.equal(row.font, "default");
  assert.equal(row.feed_memo_line_limit, null);
  const back = fromSettingsRow(row);
  assert.equal(back.font, "pretendard");
  assert.equal(back.feedMemoLines, 0);
});
t("odd server values are ignored", () => {
  assert.deepEqual(fromSettingsRow({ theme: "purple", todo_sort: "created", calendar_category_count: 9, use_24h: "yes" }), {});
});
t("privacy settings go to the account (other people's apps respect them)", () => {
  const row = toSettingsRow(p, "u1");
  for (const c of PRIVACY_COLUMNS) assert.ok(c in row, c);
  assert.deepEqual(fromSettingsRow({ likes_todo: "everyone", chat_from: "none", follow_approval: true }), { chatFrom: "none", followApproval: true });
});
t("할 일 캘린더 limits: null = 무제한, odd values ignored", () => {
  const row = toSettingsRow({ ...p, monthCalendarMax: 0, weekCalendarMax: 5 }, "u1");
  assert.equal(row.month_calendar_max, null);
  assert.equal(row.week_calendar_max, 5);
  assert.deepEqual(fromSettingsRow({ month_calendar_max: null, week_calendar_max: 7 }), { monthCalendarMax: 0, weekCalendarMax: 7 });
  assert.deepEqual(fromSettingsRow({ month_calendar_max: 4, week_calendar_max: -1 }), {});
});
