import assert from "node:assert/strict";
import { medalOf, toCrewCard, toCrewDetail } from "../src/lib/crew";

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
