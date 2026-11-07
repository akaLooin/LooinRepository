import assert from "node:assert/strict";
import { groupReactions, nextReaction, noticeText, timeAgo, toFriendView, toPerson } from "../src/lib/friend";
import { todosForDay } from "../src/data/occurrences";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
const raw = {
  person: { id: "a", nickname: "토끼", handle: "rabbit", bio: "", i_follow: "accepted", follows_me: null, blocked_by_me: false, followers: 3, following: 1 },
  categories: [{ id: "c1", title: "To Do", color: "#7FB2FF", sort_order: 1, ended_at: null }],
  todos: [
    { id: "t1", category_id: "c1", title: "산책", date: "2026-11-08", sort_order: 0, is_done: true, memo: "", reactions: [{ kind: "emoji", value: "🔥", mine: true }, { kind: "emoji", value: "👏", mine: false }] },
    { id: "t2", category_id: "c1", title: "운동: 어깨", date: "2026-11-09", sort_order: 1, is_done: false, memo: "", routine_id: "r1", routine_date: "2026-11-09", reactions: [] },
  ],
  routines: [{ id: "r1", category_id: "c1", title: "운동", start_date: "2026-11-01", repeat_type: "daily", sort_order: 0 }],
  diaries: [],
};

t("friend_range becomes the same shape as my data", () => {
  const v = toFriendView(raw)!;
  assert.equal(v.person.iFollow, "accepted");
  assert.equal(v.person.followers, 3);
  assert.equal(v.db.categories[0].title, "To Do");
  assert.deepEqual(v.reactions.t1.map((r) => r.value), ["🔥", "👏"]);
  assert.equal(v.reactions.t1[0].mine, true);
});
t("their routines fill the days like mine (a touched day keeps its own to-do)", () => {
  const v = toFriendView(raw)!;
  assert.deepEqual(todosForDay(v.db, "2026-11-08").map((x) => x.title).sort(), ["산책", "운동"]);
  assert.deepEqual(todosForDay(v.db, "2026-11-09").map((x) => x.title), ["운동: 어깨"]);
});
t("blocked or gone: nothing", () => {
  assert.equal(toFriendView(null), null);
  assert.equal(toFriendView({ person: null }), null);
});
t("one reaction per person: a new pick replaces, the same pick takes it back", () => {
  const list = [{ kind: "emoji" as const, value: "👏" }, { kind: "emoji" as const, value: "🔥", mine: true }];
  const a = nextReaction(list, { kind: "emoji", value: "❤️" });
  assert.equal(a.action, "set");
  assert.deepEqual(a.list.map((r) => r.value), ["👏", "❤️"]);
  const b = nextReaction(list, { kind: "emoji", value: "🔥" });
  assert.equal(b.action, "clear");
  assert.deepEqual(b.list.map((r) => r.value), ["👏"]);
});
t("reactions on my to-dos and diaries are grouped by id", () => {
  const g = groupReactions([
    { todo_id: "x", kind: "emoji", value: "👍", nickname: "토끼" }, { todo_id: "x", kind: "emoji", value: "🔥" },
    { diary_id: "d", kind: "sticker", value: "clover.thanks", nickname: "다람쥐" }, { bad: 1 },
  ]);
  assert.deepEqual(Object.keys(g.todos), ["x"]);
  assert.equal(g.todos.x[0].nickname, "토끼");
  assert.deepEqual(g.diaries.d, [{ kind: "sticker", value: "clover.thanks", nickname: "다람쥐" }]);
});
t("odd follow states are ignored", () => {
  assert.equal(toPerson({ id: 1, nickname: "x", i_follow: "maybe" }).iFollow, null);
});
t("notice wording", () => {
  assert.equal(noticeText({ type: "follow_request", actor: { nickname: "토끼" } }), "토끼님이 팔로우를 요청했어요");
  assert.equal(noticeText({ type: "reaction", actor: { nickname: "토끼" }, value: "🔥", todoTitle: "산책" }), "토끼님이 '산책'에 🔥 반응했어요");
  assert.equal(noticeText({ type: "reaction", actor: { nickname: "토끼" }, value: "clover.best", todoTitle: "산책" }), "토끼님이 '산책'에 스티커로 반응했어요");
  const now = Date.parse("2026-11-08T12:00:00Z");
  assert.equal(timeAgo("2026-11-08T11:59:30Z", now), "방금");
  assert.equal(timeAgo("2026-11-08T10:00:00Z", now), "2시간 전");
  assert.equal(timeAgo("2026-11-06T12:00:00Z", now), "2일 전");
});
