// Design app (build with APP_VARIANT=design): 홈 · 달력 · 함께 · 나 tabs (2026-11-21).
// 홈: greeting, today's count and what is next, this week, D-days, shortcuts, an input bar for today; a week day opens
// 달력 on it. 달력: a month (picked day = white cell, today = grey cell), the day's agenda (timed events, To Do with
// category tags) and an input bar for that day. 함께: friend row → their page.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = (global.R = {});
  const shot = (n) => p.screenshot({ path: `${process.argv[2] || process.env.SHOT_DIR || require("os").tmpdir()}/${n}.png` });
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
  r.toDoHeading = await p.getByText("To Do", { exact: true }).count();
  // an event opens its editor right here (no timeline)
  await p.getByRole("button", { name: /^팀 회의, / }).first().click(); await p.waitForTimeout(500);
  const hasTitleInput = () => p.evaluate(() => [...document.querySelectorAll("input,textarea")].some((x) => x.value === "팀 회의"));
  r.eventEditor = (await hasTitleInput()) && p.url().endsWith("/calendar");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  if (await hasTitleInput()) { await p.getByRole("button", { name: /닫기|취소/ }).first().click().catch(() => {}); await p.waitForTimeout(400); }
  r.addedFromHome = await p.getByText("홈 입력 테스트").count();
  await p.getByLabel("할 일 추가").fill("달력 입력 테스트"); await p.getByLabel("할 일 추가").press("Enter"); await p.waitForTimeout(400);
  r.added = await p.getByText("달력 입력 테스트").count();
  // the category tag of a to-do moves it to another category
  const tagBtn = p.getByRole("button", { name: /^달력 입력 테스트의 카테고리 .*, 바꾸기$/ });
  const before = await tagBtn.getAttribute("aria-label");
  await tagBtn.click(); await p.waitForTimeout(400);
  await p.getByRole("radio", { checked: false }).first().click(); await p.waitForTimeout(400);
  r.recategorised = before !== (await p.getByRole("button", { name: /^달력 입력 테스트의 카테고리 .*, 바꾸기$/ }).getAttribute("aria-label"));
  await p.getByRole("button", { name: /^카테고리 [^의]*, 바꾸기$/ }).first().click(); await p.waitForTimeout(400);
  r.categorySheet = await p.getByText("어느 카테고리에 넣을까요?").count();
  await p.getByRole("radio").last().click(); await p.waitForTimeout(300);
  // hold a To Do row and drop it at the top: it takes the category of the row it lands on (user)
  const tags = async () => (await p.getByRole("button", { name: /의 카테고리 .*, 바꾸기$/ }).evaluateAll((xs) => xs.map((x) => x.getAttribute("aria-label").match(/^(.*)의 카테고리 (.*), 바꾸기$/).slice(1))));
  const t0 = await tags();
  r.tagsBefore = t0.map((x) => x.join(">"));
  const lastT = t0[t0.length - 1], firstT = t0.find((x) => x[1] !== lastT[1]) ?? t0[0];
  const from = await p.getByText(lastT[0], { exact: true }).first().boundingBox(), to = await p.getByText(firstT[0], { exact: true }).first().boundingBox();
  await p.mouse.move(from.x + 20, from.y + from.height / 2); await p.mouse.down(); await p.waitForTimeout(700);
  const dy = to.y - from.y - 10;
  for (let i = 1; i <= 8; i++) { await p.mouse.move(from.x + 20, from.y + from.height / 2 + (dy * i) / 8); await p.waitForTimeout(40); }
  await p.mouse.up(); await p.waitForTimeout(600);
  const t1 = await tags();
  r.tagsAfter = t1.map((x) => x.join(">"));
  r.dragJoined = t1.find((x) => x[0] === lastT[0])?.[1] === firstT[1];
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
