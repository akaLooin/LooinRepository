// 뽀모도로 (user's feature): timer ⋯ → 뽀모도로, length stepper, countdown runs and pauses, the end records the time.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  await p.getByText("책 30쪽 읽기").click();
  await p.waitForTimeout(500);
  await p.getByText("타이머 열기").click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "타이머 종류" }).click();
  await p.getByRole("menuitem", { name: /뽀모도로/ }).click();
  await p.waitForTimeout(300);
  r.title = await p.getByText("뽀모도로", { exact: true }).count();
  r.full = await p.getByLabel("남은 시간 25:00").count();
  await p.getByRole("button", { name: "5분 늘리기" }).click();
  r.thirty = await p.getByLabel("남은 시간 30:00").count();
  await p.getByRole("button", { name: "5분 줄이기" }).click();
  await p.getByRole("button", { name: "5분 줄이기" }).click();
  r.twenty = await p.getByLabel("남은 시간 20:00").count();
  await p.getByRole("button", { name: "시작하기" }).click();
  await p.waitForTimeout(2300);
  r.counting = await p.getByLabel(/남은 시간 19:5[6-8]/).count();
  r.stepperHidden = (await p.getByRole("button", { name: "5분 늘리기" }).count()) === 0;
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/pomodoro.png` : "pomodoro.png" });
  await p.getByRole("button", { name: "일시정지" }).click();
  await p.waitForTimeout(1200);
  r.paused = await p.getByLabel(/남은 시간 19:5[6-8]/).count();
  await p.getByRole("button", { name: "그만하기" }).click();
  r.stopped = await p.getByLabel("남은 시간 20:00").count();
  // a 2-second session, to see the end
  const id = p.url().split("/timer/")[1];
  await p.evaluate((id) => {
    const k = "todomate:prefs"; const v = JSON.parse(localStorage.getItem(k) || "{}");
    const total = 2; // what the earlier run recorded (about 2 s); the end sets base + length exactly
    localStorage.setItem(k, JSON.stringify({ ...v, pomodoro: { todoId: id, base: total, seconds: 2 } }));
  }, id);
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: "이어서 하기" }).click();
  await p.waitForTimeout(3500);
  r.ended = await p.getByText("집중 시간이 끝났어요. 잠깐 쉬어요").count();
  r.backToStart = await p.getByRole("button", { name: "시작하기" }).count();
  await p.getByRole("button", { name: "타이머 종류" }).click();
  await p.getByRole("menuitem", { name: /스톱워치/ }).click();
  r.stopwatch = await p.getByLabel("기록한 시간 00:00:04").count();
  r.errors = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
