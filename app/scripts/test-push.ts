import assert from "node:assert/strict";
import { deadTokens, expoBatches, messageText, noticeBody, noticeKind, wants } from "../../supabase/functions/push/payload";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
t("chat message lines", () => {
  assert.equal(messageText("text", "  안녕\n오늘 "), "안녕 오늘");
  assert.equal(messageText("photo", ""), "사진을 보냈어요");
  assert.equal(messageText("sticker", "clover.best"), "스티커를 보냈어요");
  assert.equal(messageText("text", "가".repeat(200)).length, 120);
});
t("follow and reaction lines match the 알림 tab", () => {
  assert.equal(noticeBody("follow_request", "토끼"), "토끼님이 팔로우를 요청했어요");
  assert.equal(noticeBody("reaction", "토끼", "clover.best", "산책"), "토끼님이 '산책'에 스티커로 반응했어요");
  assert.equal(noticeBody("reaction", "토끼", "🔥", null), "토끼님이 🔥 반응했어요");
  assert.equal(noticeBody("weird", "토끼"), null);
  assert.equal(noticeBody("crew_request", "토끼", null, null, "아침 운동"), "토끼님이 '아침 운동' 크루에 참가 신청했어요");
});
t("설정 → 알림 is respected; no settings row = on", () => {
  assert.equal(wants("chat", null), true);
  assert.equal(wants("chat", { notify_chat: false }), false);
  assert.equal(wants(noticeKind("reaction"), { notify_likes: false, notify_following: true }), false);
  assert.equal(wants(noticeKind("follow"), { notify_likes: false, notify_following: true }), true);
});
t("only Expo tokens, 100 per request; unreachable phones are dropped", () => {
  const tokens = [...Array.from({ length: 150 }, (_, i) => `ExponentPushToken[p${i}]`), "junk"];
  const b = expoBatches(tokens, "토끼", "안녕", "/chat/1", "messages");
  assert.deepEqual(b.map((x) => x.length), [100, 50]);
  assert.equal(b[0][0].data.url, "/chat/1");
  assert.deepEqual(deadTokens(b[1].slice(0, 2), [{ status: "ok" }, { status: "error", details: { error: "DeviceNotRegistered" } }]), ["ExponentPushToken[p101]"]);
});
