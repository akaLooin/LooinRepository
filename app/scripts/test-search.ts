import assert from "node:assert/strict";
import { marks, searchAll, snippet } from "../src/lib/search";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
const todo = (id: string, title: string, date: string | null, extra = {}) => ({ id, categoryId: "c1", title, date, sortOrder: 0, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "", ...extra });
const db = {
  categories: [{ id: "c1", title: "공부", color: "#00FF7F", visibility: "all" as const, sortOrder: 0 }],
  todos: [
    todo("a", "영어 단어 외우기", "2026-11-01"),
    todo("b", "운동", "2026-11-05", { memo: "영어 팟캐스트 들으면서 걷기", isDone: true }),
    todo("c", "영어책 사기", null),
    todo("d", "영어 숙제", "2026-11-03", { isSkipped: true }),
  ],
  diaries: [{ id: "x", date: "2026-11-01", body: "오늘은 영어 공부를 오래 했다.", visibility: "all" as const, imagePaths: [] }],
};
t("search: to-do title, memo and diary, newest day first, 보관함 last, deleted routine days left out", () => {
  const r = searchAll(db as never, " 영어 ");
  assert.deepEqual(r.map((h) => h.id), ["b", "a", "x", "c"]);
  assert.equal(r[0].kind === "todo" && r[0].memo, "영어 팟캐스트 들으면서 걷기");
  assert.equal(r[0].kind === "todo" && r[0].done, true);
  assert.deepEqual(searchAll(db as never, "영어", "diary").map((h) => h.id), ["x"]);
  assert.deepEqual(searchAll(db as never, "영어", "todo").map((h) => h.id), ["b", "a", "c"]);
  assert.deepEqual(searchAll(db as never, "   "), []);
  assert.deepEqual(searchAll(db as never, "ENGLISH"), []);
});
t("search: case-insensitive, highlight parts and a short line around the match", () => {
  const d2 = { ...db, todos: [todo("e", "Read the Book", "2026-11-02")] };
  assert.deepEqual(searchAll(d2 as never, "book").map((h) => h.id), ["e"]);
  assert.deepEqual(marks("Read the Book, book", "book"), [{ t: "Read the ", hit: false }, { t: "Book", hit: true }, { t: ", ", hit: false }, { t: "book", hit: true }]);
  const long = "가".repeat(60) + "클로버" + "나".repeat(60);
  const s = snippet(long, "클로버", 5);
  assert.equal(s, "…가가가가가클로버나나나나나…");
  assert.equal(snippet("짧은 글", "글"), "짧은 글");
});
