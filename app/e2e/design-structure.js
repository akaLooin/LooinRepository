// Design app (build with APP_VARIANT=design): 오늘 · 달력 · 함께 · 나 tabs (2026-11-21, user's choice "오늘 중심").
// 오늘: date, week strip, agenda (timed events, 언제든 with category tags), input bar adds to the shown day in the
// chosen category; a week-strip day switches the day; 달력: month + the chosen day's agenda; 함께: friend row → their page.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  const shot = (n) => p.screenshot({ path: `${process.env.SHOT_DIR || "."}/${n}.png` });
  const now = new Date();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  r.tabs = await p.getByRole("tab").allInnerTexts();
  r.title = await p.getByRole("heading").first().innerText();
  r.timedEvent = await p.getByRole("button", { name: /^팀 회의, / }).count();
  r.anytime = await p.getByText("언제든").count();
  await p.getByLabel("할 일 추가").fill("바 입력 테스트"); await p.getByLabel("할 일 추가").press("Enter"); await p.waitForTimeout(400);
  r.added = await p.getByText("바 입력 테스트").count();
  await p.getByRole("button", { name: /^카테고리 .*, 바꾸기$/ }).click(); await p.waitForTimeout(400);
  r.categorySheet = await p.getByText("어느 카테고리에 넣을까요?").count();
  await p.getByRole("radio").last().click(); await p.waitForTimeout(300);
  await shot("design-today");
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (tomorrow.getDay() !== 0) {
    await p.getByRole("button", { name: `${tomorrow.getMonth() + 1}월 ${tomorrow.getDate()}일`, exact: true }).click(); await p.waitForTimeout(300);
    r.dayChanged = await p.getByRole("heading").first().innerText();
  }
  await p.getByRole("tab", { name: "달력" }).click(); await p.waitForTimeout(800);
  r.calendarAgenda = await p.getByText("언제든").count();
  await p.getByRole("tab", { name: "함께" }).click(); await p.waitForTimeout(1200);
  r.friendRow = await p.getByRole("button", { name: "토끼 홈" }).count();
  await p.getByRole("button", { name: "토끼 홈" }).first().click(); await p.waitForTimeout(1200);
  r.friendPage = p.url().includes("/friend/");
  await shot("design-friend");
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e.message.split("\n")[0]); process.exit(1); });
