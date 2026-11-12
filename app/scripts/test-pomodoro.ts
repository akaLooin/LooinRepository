import assert from "node:assert/strict";
import { clampMinutes, countdownText, pomodoroLeft, startSession } from "../src/lib/pomodoro";

const t = (n: string, f: () => void) => { f(); console.log("ok", n); };
t("pomodoro counts down over the to-do's timer, and pauses with it", () => {
  assert.equal(pomodoroLeft(null, "a", 100, 25), 1500);
  const s = startSession(null, "a", 100, 25);
  assert.deepEqual(s, { todoId: "a", base: 100, seconds: 1500 });
  assert.equal(pomodoroLeft(s, "a", 160, 25), 1440);
  assert.equal(pomodoroLeft(s, "a", 99999, 25), 0);
  // another to-do's session does not count here
  assert.equal(pomodoroLeft(s, "b", 160, 10), 600);
  // resume keeps the paused session; a finished one starts over from the current total
  assert.equal(startSession(s, "a", 160, 25), s);
  assert.deepEqual(startSession(s, "a", 1600, 50), { todoId: "a", base: 1600, seconds: 3000 });
});
t("pomodoro minutes and text", () => {
  assert.equal(clampMinutes(0), 5);
  assert.equal(clampMinutes(27), 25);
  assert.equal(clampMinutes(500), 120);
  assert.equal(countdownText(1500), "25 : 00");
  assert.equal(countdownText(59), "00 : 59");
  assert.equal(countdownText(3725), "01 : 02 : 05");
});
