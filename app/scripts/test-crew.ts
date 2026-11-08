import assert from "node:assert/strict";
import { crewDB, crewLink, medalOf, toCrewCard, toCrewDetail, toCrewHome } from "../src/lib/crew";
import { todosForDay } from "../src/data/occurrences";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
t("crew cards", () => {
  const c = toCrewCard({ id: 1, name: "아침 운동", members: "3", my_status: "weird" });
  assert.equal(c.id, "1");
  assert.equal(c.members, 3);
  assert.equal(c.myStatus, null);
});
t("crew detail: ranking, shared to-dos only when given, requests only for the leader", () => {
  const d = toCrewDetail({
    id: "c", name: "x", is_owner: false, my_status: "pending",
    members: [
      { person: { id: "a", nickname: "토끼" }, is_owner: true, category: { title: "운동", color: "#7FB2FF" }, done_count: 9, last_done_at: "2026-11-08T00:00:00Z", today: null },
      { person: { id: "b", nickname: "다람쥐" }, is_owner: false, category: null, done_count: 0, today: [{ title: "스쿼트", is_done: true }] },
    ],
    requests: null,
  })!;
  assert.equal(d.myStatus, "pending");
  assert.equal(d.members, 2);
  assert.equal(d.memberList[0].category?.title, "운동");
  assert.equal(d.memberList[0].today, undefined);
  assert.deepEqual(d.memberList[1].today, [{ title: "스쿼트", isDone: true }]);
  assert.equal(d.requests, undefined);
  assert.equal(toCrewDetail(null), null);
});
t("medals for the top three who finished something", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => medalOf(i, 5)), [1, 2, 3, null]);
  assert.equal(medalOf(0, 0), null);
});
t("crew home: others from the server, mine from this phone", () => {
  const data = toCrewHome({
    crew: { id: "c", name: "물 마시기", description: "", is_owner: true },
    members: [
      { person: { id: "me", nickname: "나" }, is_owner: true, category: { id: "cat-me", title: "server title", color: "#000000" } },
      { person: { id: "b", nickname: "토끼" }, is_owner: false, category: { id: "cat-b", title: "운동", color: "#7FB2FF" } },
      { person: { id: "x", nickname: "no category" }, category: null },
    ],
    todos: [
      { id: "tb", user_id: "b", category_id: "cat-b", title: "스쿼트", date: "2026-11-09", sort_order: 0, is_done: true },
      { id: "stale", user_id: "me", category_id: "cat-me", title: "old copy", date: "2026-11-09", sort_order: 0, is_done: false },
    ],
    routines: [],
  })!;
  assert.equal(data.members.length, 2);
  const local = { profile: { id: "me", nickname: "나", bio: "" }, categories: [{ id: "cat-me", title: "물", color: "#00FF7F", visibility: "private" as const, sortOrder: 0 }],
    todos: [{ id: "tm", categoryId: "cat-me", title: "물 2L", date: "2026-11-09", sortOrder: 0, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" }],
    routines: [], ddays: [], diaries: [], reminders: [] };
  const db = crewDB(data, local, "me");
  assert.deepEqual(todosForDay(db, "2026-11-09").map((t) => t.title).sort(), ["물 2L", "스쿼트"]);
  assert.equal(db.categories[0].title, "물");
  assert.equal(crewLink("c"), "todomateclone://crew/c");
});
