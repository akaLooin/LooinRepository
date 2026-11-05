import assert from "node:assert/strict";
import { planNotifications } from "../src/lib/notificationPlan";
import type { DB } from "../src/data/types";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
const base: DB = {
  profile: { id: "u", nickname: "", bio: "" },
  categories: [{ id: "c", title: "To Do", color: "#00FF7F", visibility: "followers", sortOrder: 1 }],
  todos: [
    { id: "a", categoryId: "c", title: "운동", date: "2026-11-03", sortOrder: 1, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" },
    { id: "b", categoryId: "c", title: "독서", date: "2026-11-03", sortOrder: 2, isDone: true, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "",
      remindAt: new Date(2026, 10, 3, 21, 0).toISOString() },
    { id: "c1", categoryId: "c", title: "장보기", date: "2026-11-04", sortOrder: 1, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "",
      remindAt: new Date(2026, 10, 4, 18, 30).toISOString() },
  ],
  routines: [], ddays: [], diaries: [],
  reminders: [{ id: "r", timeOfDay: "09:00" }, { id: "s", timeOfDay: "22:00" }],
};
const now = new Date(2026, 10, 3, 12, 0); // 3 Nov, noon

t("past reminder times today are skipped, later ones kept with the day's count", () => {
  const plan = planNotifications(base, now);
  const today = plan.filter((p) => p.key.endsWith("2026-11-03"));
  assert.deepEqual(today.map((p) => p.key), ["reminder:s:2026-11-03"]);
  assert.equal(today[0].body, "아직 1개 남았어요");
});
t("a week of daily reminders", () => {
  assert.equal(planNotifications(base, now).filter((p) => p.key.startsWith("reminder:r:")).length, 6); // 4..9 Nov at 09:00
});
t("alarms only for future, unfinished to-dos", () => {
  const keys = planNotifications(base, now).filter((p) => p.key.startsWith("todo:")).map((p) => p.key);
  assert.deepEqual(keys, ["todo:c1"]);
});
t("sorted by time", () => {
  const plan = planNotifications(base, now);
  assert.ok(plan.every((p, i) => i === 0 || +plan[i - 1].at <= +p.at));
});
t("empty day gets a nudge", () => {
  const day = planNotifications(base, now).find((p) => p.key === "reminder:r:2026-11-05");
  assert.equal(day?.body, "오늘 할 일을 적어 볼까요?");
});

// a routine with a time rings on its days even before the user touches it, and shows its time
{
  const now2 = new Date(2026, 10, 5, 6, 0);
  const db2 = {
    profile: { id: "u", nickname: "", bio: "" }, categories: [{ id: "c", title: "To Do", color: "#00ff7f", visibility: "public", sortOrder: 1 }],
    todos: [], ddays: [], diaries: [], reminders: [],
    routines: [{ id: "r1", categoryId: "c", title: "운동하기", startDate: "2026-11-01", repeatType: "daily", timeOfDay: "07:55", memo: "", manualAdd: false, sortOrder: 1 }],
  } as never;
  const plan2 = planNotifications(db2, now2);
  assert.equal(plan2[0].title, "운동하기");
  assert.equal(plan2[0].at.getHours(), 7);
  assert.equal(plan2[0].at.getMinutes(), 55);
  assert.equal(plan2.length, 7); // one a day for the week ahead
  console.log("ok routine time rings on each day ahead");
}
