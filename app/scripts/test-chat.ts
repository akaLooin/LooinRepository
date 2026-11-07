import assert from "node:assert/strict";
import { chatItems, dayLabel, isBigEmoji, mergeMessages, previewText, toMessage, type Message } from "../src/lib/chat";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
const at = (h: number, m: number, d = 8) => new Date(2026, 10, d, h, m).toISOString();
const msg = (id: string, createdAt: string, mine = false, extra: Partial<Message> = {}): Message => ({ id, kind: "text", body: id, mine, createdAt, ...extra });

t("one copy per message, oldest first; the server's copy replaces the one being sent", () => {
  const sending = msg("b", at(10, 1), true, { status: "sending" });
  const list = mergeMessages([msg("a", at(10, 0)), sending], [msg("c", at(9, 0)), { ...sending, status: undefined, createdAt: at(10, 2) }]);
  assert.deepEqual(list.map((m) => m.id), ["c", "a", "b"]);
  assert.equal(list[2].status, undefined);
});
t("a photo sent from this phone keeps its local copy", () => {
  const local = msg("p", at(10, 0), true, { kind: "photo", body: "", photoUri: "file:///x.jpg", status: "sending" });
  const [m] = mergeMessages([local], [{ ...local, status: undefined, photoUri: "chat-photos/u/p.jpg" }]);
  assert.equal(m.photoUri, "file:///x.jpg");
  const [n] = mergeMessages([], [{ ...local, status: undefined, photoUri: "chat-photos/u/p.jpg" }]);
  assert.equal(n.photoUri, "chat-photos/u/p.jpg");
});
t("day labels", () => {
  const now = new Date(2026, 10, 8, 12, 0);
  assert.equal(dayLabel(at(9, 0), now), "오늘");
  assert.equal(dayLabel(at(9, 0, 7), now), "어제");
  assert.equal(dayLabel(at(9, 0, 3), now), "11월 3일 화요일");
  assert.equal(dayLabel(new Date(2025, 0, 2).toISOString(), now), "2025년 1월 2일 목요일");
});
t("a day label where the day changes; time only at the end of a run", () => {
  const now = new Date(2026, 10, 8, 12, 0);
  const items = chatItems([msg("a", at(23, 0, 7)), msg("b", at(9, 0)), msg("c", at(9, 0)), msg("d", at(9, 0), true)], true, now);
  assert.deepEqual(items.map((i) => (i.type === "day" ? i.label : `${i.m.id}${i.time ? "@" + i.time : ""}`)), ["어제", "a@23:00", "오늘", "b", "c@09:00", "d@09:00"]);
  assert.equal(chatItems([msg("x", at(15, 5))], false, now)[1].type === "msg" && (chatItems([msg("x", at(15, 5))], false, now)[1] as { time?: string }).time, "오후 3:05");
});
t("only emoji → drawn large", () => {
  assert.equal(isBigEmoji("🔥"), true);
  assert.equal(isBigEmoji("👍🏻❤️"), true);
  assert.equal(isBigEmoji("👨‍👩‍👧"), true);
  assert.equal(isBigEmoji("안녕 🔥"), false);
  assert.equal(isBigEmoji("🔥🔥🔥🔥"), false);
  assert.equal(isBigEmoji("123"), false);
});
t("list preview and server rows", () => {
  assert.equal(previewText({ kind: "photo", body: "", mine: false }), "사진을 보냈어요");
  assert.equal(previewText({ kind: "text", body: "줄\n바꿈", mine: true }), "줄 바꿈");
  assert.equal(previewText(null), "");
  assert.equal(previewText({ kind: "sticker", body: "clover.best", mine: false }), "스티커를 보냈어요");
  assert.equal(toMessage({ id: "s", kind: "sticker", body: "clover.best", created_at: "x" }).kind, "sticker");
  const m = toMessage({ id: "x", kind: "weird", body: null, mine: 1, created_at: "2026-11-08T00:00:00Z" });
  assert.equal(m.kind, "text");
  assert.equal(m.mine, true);
});
