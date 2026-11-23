// Design app (build with APP_VARIANT=design): 홈 · 달력 · 함께 · 나 tabs (2026-11-21).
// 홈: greeting, today's count and what is next, this week, D-days, shortcuts, an input bar for today; a week day opens
// 달력 on it. 달력: a month (picked day = white cell, today = grey cell), the day's agenda (timed events, To Do with
// category groups, 강조 marks, D-days on top) and an input bar for that day. 함께: friend row → their page.
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
  await p.getByLabel("할 일 추가").filter({ visible: true }).fill("홈 입력 테스트"); await p.getByLabel("할 일 추가").filter({ visible: true }).press("Enter"); await p.waitForTimeout(400);
  r.homeCount = await p.getByText(/\/ \d+ 끝냈어요/).innerText();
  // shortcuts: hide one in 편집 and it leaves the grid
  await p.getByRole("button", { name: "바로가기 편집" }).click(); await p.waitForTimeout(500);
  await p.getByRole("checkbox", { name: "친구" }).click(); await p.waitForTimeout(200);
  await p.getByRole("checkbox", { name: "검색" }).click(); await p.waitForTimeout(200);
  await p.getByRole("button", { name: "완료" }).last().click(); await p.waitForTimeout(500);
  r.shortcuts = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => localStorage.getItem(k).includes("homeShortcuts")) ?? "") ?? "{}").homeShortcuts ?? null).catch(() => "?");
  await shot("design-home");
  // a day in this week's strip shows it in the card; a double tap opens 달력 on that day
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (tomorrow.getDay() !== 0) {
    const dayBtn = p.getByRole("button", { name: `${tomorrow.getMonth() + 1}월 ${tomorrow.getDate()}일`, exact: true }).first();
    await dayBtn.click(); await p.waitForTimeout(500);
    r.peek = (await p.getByLabel(/의 할 일과 일정$/).first().getAttribute("aria-label")).startsWith(`${tomorrow.getMonth() + 1}월 ${tomorrow.getDate()}일`);
    await dayBtn.click(); await p.waitForTimeout(450);
    await dayBtn.click(); await p.waitForTimeout(100); await dayBtn.click(); await p.waitForTimeout(800);
    r.openedDay = (await p.getByText(`${tomorrow.getMonth() + 1}월 ${tomorrow.getDate()}일 `, { exact: false }).count()) > 0;
  }
  await p.getByRole("tab", { name: "달력" }).click(); await p.waitForTimeout(800);
  await p.getByRole("button", { name: "다음 달" }).click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: /오늘로 이동$/ }).first().click(); await p.waitForTimeout(500);
  r.timedEvent = await p.getByRole("button", { name: /^팀 회의, / }).count();
  r.toDoHeading = await p.getByText("To Do", { exact: true }).count();
  // an event opens its editor right here (no timeline)
  await p.getByRole("button", { name: /^팀 회의, / }).first().click(); await p.waitForTimeout(500);
  const hasTitleInput = () => p.evaluate(() => [...document.querySelectorAll("input,textarea")].some((x) => x.value === "팀 회의"));
  r.eventEditor = (await hasTitleInput());
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  if (await hasTitleInput()) { await p.getByRole("button", { name: /닫기|취소/ }).first().click().catch(() => {}); await p.waitForTimeout(400); }
  r.addedFromHome = await p.getByText("홈 입력 테스트").count();
  await p.getByLabel("할 일 추가").filter({ visible: true }).fill("달력 입력 테스트"); await p.getByLabel("할 일 추가").filter({ visible: true }).press("Enter"); await p.waitForTimeout(400);
  r.added = await p.getByText("달력 입력 테스트").count();
  // the input bar's category chip: add one to-do to the other category
  await p.getByRole("button", { name: /^카테고리 .*, 바꾸기$/ }).filter({ visible: true }).first().click(); await p.waitForTimeout(400);
  r.categorySheet = await p.getByText("어느 카테고리에 넣을까요?").count();
  await p.getByRole("radio").filter({ visible: true }).last().click(); await p.waitForTimeout(300);
  await p.getByLabel("할 일 추가").filter({ visible: true }).fill("다른 칸 테스트"); await p.getByLabel("할 일 추가").filter({ visible: true }).press("Enter"); await p.waitForTimeout(400);
  // To Do is in category groups (no tags); hold a to-do and drop it inside another group: it joins that category
  const groups = () => p.evaluate(() => {
    const out = {}; let cur = "";
    for (const el of document.querySelectorAll('[aria-label*=" 카테고리, "], [role="checkbox"]')) {
      if (!el.offsetParent) continue;
      const l = el.getAttribute("aria-label");
      if (/ 카테고리, (접힘|펼침)$/.test(l)) cur = l.replace(/ 카테고리, (접힘|펼침)$/, ""); else out[l.split(",")[0]] = cur;
    }
    return out;
  });
  const g0 = await groups();
  r.groupsBefore = g0;
  r.noTags = (await p.getByRole("button", { name: /의 카테고리 .*, 바꾸기$/ }).count()) === 0;
  const heads = await p.locator('[aria-label*=" 카테고리, "]').filter({ visible: true }).all();
  r.groupHeads = heads.length;
  // bring the group titles and the to-do into view first (the list scrolls under the input bar)
  await p.locator('[aria-label*=" 카테고리, "]').filter({ visible: true }).first().evaluate((el) => el.scrollIntoView({ block: "start" })); await p.waitForTimeout(400);
  const from = await p.getByText("다른 칸 테스트", { exact: true }).filter({ visible: true }).first().boundingBox();
  const to = await heads[0].boundingBox();
  r.dragBoxes = { from: Math.round(from.y), to: Math.round(to.y) };
  await p.mouse.move(from.x + 20, from.y + from.height / 2); await p.mouse.down(); await p.waitForTimeout(500);
  const dy = to.y + to.height + 8 - (from.y + from.height / 2);
  for (let i = 1; i <= 10; i++) { await p.mouse.move(from.x + 20, from.y + from.height / 2 + (dy * i) / 10); await p.waitForTimeout(40); }
  await p.mouse.up(); await p.waitForTimeout(700);
  const g1 = await groups();
  r.groupsAfter = g1;
  r.dragJoined = g0["다른 칸 테스트"] !== g1["다른 칸 테스트"] && g1["다른 칸 테스트"] === (await heads[0].getAttribute("aria-label")).replace(/ 카테고리, (접힘|펼침)$/, "");
  // the picked day is a white cell, today a grey one
  const d2 = new Date(now); d2.setDate(now.getDate() === 1 ? 2 : 1);
  await p.getByLabel(`${d2.getMonth() + 1}월 ${d2.getDate()}일`, { exact: true }).first().click(); await p.waitForTimeout(400);
  r.cellColours = await p.evaluate(([a, b2]) => [a, b2].map((l) => getComputedStyle(document.querySelector(`[aria-label="${l}"]`)).backgroundColor), [`${d2.getMonth() + 1}월 ${d2.getDate()}일`, `${now.getMonth() + 1}월 ${now.getDate()}일`]);
  await shot("design-calendar");
  await p.getByRole("tab", { name: "커뮤니티" }).click(); await p.waitForTimeout(1200);
  r.crewsHidden = (await p.getByText("크루", { exact: true }).count()) === 0;
  await p.getByRole("tab", { name: "친구 찾기" }).click(); await p.waitForTimeout(300);
  await p.getByLabel("닉네임 또는 ID로 찾기").fill("다람"); await p.waitForTimeout(900);
  r.found = await p.getByText("다람쥐").count();
  await p.getByRole("tab", { name: "친구 소식" }).click(); await p.waitForTimeout(300);
  r.friendRow = await p.getByRole("button", { name: "토끼 홈" }).count();
  await p.getByRole("button", { name: "토끼 홈" }).first().click(); await p.waitForTimeout(1200);
  r.friendPage = p.url().includes("/friend/");
  await shot("design-friend");
  await p.goBack(); await p.waitForTimeout(800);
  await p.getByRole("tab", { name: "프로필" }).click(); await p.waitForTimeout(800);
  r.profileTiles = await p.getByLabel(/^(완료한 할 일|이번 달|연속 기록) /).count();
  r.settingsGroups = await p.getByRole("button", { name: "화면", exact: true }).count();
  await shot("design-profile");
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e.message.split("\n").slice(0, 2).join(" "), JSON.stringify(global.R)); process.exit(1); });
