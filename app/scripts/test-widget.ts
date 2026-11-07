import assert from "node:assert/strict";
import { toggleQueued, widgetModel } from "../src/widget/model";
import type { DB } from "../src/data/types";

const db = {
  profile: { id: "u", nickname: "", bio: "" }, ddays: [], diaries: [], reminders: [],
  categories: [
    { id: "b", title: "Normal", color: "#FFFFFF", visibility: "private", sortOrder: 2 },
    { id: "a", title: "To Do", color: "#00FF7F", visibility: "public", sortOrder: 1 },
  ],
  todos: [
    { id: "t2", categoryId: "a", title: "둘째", date: "2026-11-07", sortOrder: 2, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" },
    { id: "t1", categoryId: "a", title: "첫째", date: "2026-11-07", sortOrder: 1, isDone: true, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" },
    { id: "t3", categoryId: "b", title: "노멀", date: "2026-11-07", sortOrder: 1, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" },
    { id: "t4", categoryId: "a", title: "내일", date: "2026-11-08", sortOrder: 1, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" },
  ],
  routines: [{ id: "r1", categoryId: "b", title: "운동", startDate: "2026-11-01", repeatType: "daily", memo: "", manualAdd: false, sortOrder: 1 }],
} as unknown as DB;

const m = widgetModel(db, "2026-11-07", []);
assert.equal(m.dateLabel, "11월 7일 토요일");
// category order (the list order, not sortOrder), then each to-do's own order; routine occurrences included
assert.deepEqual(m.rows.map((r) => r.title), ["첫째", "둘째", "노멀", "운동"]);
assert.equal(m.rows[0].color.length, 7);
assert.equal(m.left, 3);
// a check on the widget shows at once; a second tap cancels it
const q = toggleQueued([], "t2");
assert.equal(widgetModel(db, "2026-11-07", q).left, 2);
assert.deepEqual(toggleQueued(q, "t2"), []);
// signed out: nothing to show
assert.equal(widgetModel(null, "2026-11-07", []).signedOut, true);
console.log("ok widget: today's to-dos in order, checks from the widget, signed out");
