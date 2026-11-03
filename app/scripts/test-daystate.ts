// Clover rule confirmed by the user. npx tsx scripts/test-daystate.ts
import assert from "node:assert/strict";
import { dayState } from "../src/features/home/dayState";

const cats = [
  { id: "a", title: "To Do", color: "#00FF7F", visibility: "followers" as const, sortOrder: 1 },
  { id: "b", title: "Normal", color: "#FFFFFF", visibility: "private" as const, sortOrder: 2 },
];
const todo = (categoryId: string, isDone: boolean) => ({ id: Math.random().toString(), categoryId, title: "x", date: "2026-11-03", sortOrder: 1, isDone, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" });
const t = (name: string, fn: () => void) => { fn(); console.log("ok", name); };

t("no to-dos: empty", () => assert.deepEqual(dayState([], cats), { kind: "empty" }));
t("nothing done: grey with the number left", () => assert.deepEqual(dayState([todo("a", false), todo("b", false)], cats), { kind: "count", count: 2 }));
t("one done in one category: its colour, number left", () =>
  assert.deepEqual(dayState([todo("a", true), todo("a", false)], cats), { kind: "split", colors: ["#00FF7F"], left: 1 }));
t("two categories: split in category order, tick when all done", () =>
  assert.deepEqual(dayState([todo("b", true), todo("a", true)], cats), { kind: "split", colors: ["#00FF7F", "#FFFFFF"], left: 0 }));
t("one category done, other not: both colours, number left", () =>
  assert.deepEqual(dayState([todo("a", true), todo("b", false)], cats), { kind: "split", colors: ["#00FF7F", "#FFFFFF"], left: 1 }));
