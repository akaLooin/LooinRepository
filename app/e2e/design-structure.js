// Design app (build with APP_VARIANT=design): 홈 · 달력 · 함께 · 나 tabs (2026-11-21).
// 홈: greeting, today's count and what is next, this week, D-days, shortcuts, an input bar for today; a week day opens
// 달력 on it. 달력: a month (picked day = white cell, today = grey cell), the day's agenda (timed events, 언제든 with
// category tags) and an input bar for that day. 함께: friend row → their page.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = (global.R = {});
  const shot = (n) => p.screenshot({ path: `${process.env.SHOT_DIR || "."}/${n}.png` });
  const now = new Date();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  r.tabs = await p.getByRole("tab").allInnerTexts();
  r.greeting = await p.getByRole("heading").first().innerText();
  r.cards = await p.getByText(/^(오늘|이번 주|디데이|바로가기)$/).count();
  await p.getByLabel("할 일 추가").fill("홈 입력 테스트"); await p.getByLabel("할 일 추가").press("Enter"); await p.waitForTimeout(400);
  r.homeCount = await p.getByText(/\/ \d+ 끝냈어요/).innerText();
  await shot("design-home");
  // a day in this week's strip opens 달력 on that day
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (tomorrow.getDay() !== 0) {
    await p.getByRole("button", { name: `${tomorrow.getMonth() + 1}월 ${tomorrow.getDate()}일`, exact: true }).first().click(); await p.waitForTimeout(800);
    r.openedDay = (await p.getByText(`${tomorrow.getMonth() + 1}월 ${tomorrow.getDate()}일 `, { exact: false }).count()) > 0 && p.url().endsWith("/calendar");
  }
  await p.getByRole("tab", { name: "달력" }).click(); await p.waitForTimeout(800);
  await p.getByRole("button", { name: "다음 달" }).click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: /오늘로 이동$/ }).first().click(); await p.waitForTimeout(500);
  r.timedEvent = await p.getByRole("button", { name: /^팀 회의, / }).count();
  r.anytime = await p.getByText("언제든").count();
  r.addedFromHome = await p.getByText("홈 입력 테스트").count();
  await p.getByLabel("할 일 추가").fill("달력 입력 테스트"); await p.getByLabel("할 일 추가").press("Enter"); await p.waitForTimeout(400);
  r.added = await p.getByText("달력 입력 테스트").count();
  await p.getByRole("button", { name: /^카테고리 .*, 바꾸기$/ }).click(); await p.waitForTimeout(400);
  r.categorySheet = await p.getByText("어느 카테고리에 넣을까요?").count();
  await p.getByRole("radio").last().click(); await p.waitForTimeout(300);
  // the picked day is a white cell, today a grey one
  const d2 = new Date(now); d2.setDate(now.getDate() === 1 ? 2 : 1);
  await p.getByLabel(`${d2.getMonth() + 1}월 ${d2.getDate()}일`, { exact: true }).first().click(); await p.waitForTimeout(400);
  r.cellColours = await p.evaluate(([a, b2]) => [a, b2].map((l) => getComputedStyle(document.querySelector(`[aria-label="${l}"]`)).backgroundColor), [`${d2.getMonth() + 1}월 ${d2.getDate()}일`, `${now.getMonth() + 1}월 ${now.getDate()}일`]);
  await shot("design-calendar");
  await p.getByRole("tab", { name: "함께" }).click(); await p.waitForTimeout(1200);
  r.friendRow = await p.getByRole("button", { name: "토끼 홈" }).count();
  await p.getByRole("button", { name: "토끼 홈" }).first().click(); await p.waitForTimeout(1200);
  r.friendPage = p.url().includes("/friend/");
  await shot("design-friend");
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e.message.split("\n").slice(0, 2).join(" "), JSON.stringify(global.R)); process.exit(1); });
