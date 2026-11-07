// Calendar paging (swipe and arrows), tap the month title for today, and edit mode kept across days.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
async function swipe(p, x, y, dx) {
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 12; i++) { await p.mouse.move(x + (dx * i) / 12, y); await p.waitForTimeout(16); }
  await p.mouse.up(); await p.waitForTimeout(500);
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  const title = async () => (await p.getByRole("button", { name: /오늘로 이동$/ }).getAttribute("aria-label")).replace(", 오늘로 이동", "");
  const picked = async () => (await p.getByText(/^\d+월 \d+일 .요일$/).allInnerTexts()).join();
  r.start = await title();
  // swipe left on the calendar → next month, the 1st picked
  const cal = await p.getByLabel(/^11월 1[0-9]일$/).first().boundingBox();
  await swipe(p, 300, cal.y + 10, -220);
  r.afterSwipeNext = await title();
  r.pickedNext = await picked();
  await swipe(p, 100, cal.y + 10, 220);
  await swipe(p, 100, cal.y + 10, 220);
  r.afterSwipeBack2 = await title();
  r.pickedBack = await picked();
  // short swipe springs back
  await swipe(p, 200, cal.y + 10, -40);
  r.shortStays = await title();
  // arrows
  await p.getByRole("button", { name: "다음" }).click(); await p.waitForTimeout(400);
  r.arrowNext = await title();
  // title → today
  await p.getByRole("button", { name: /오늘로 이동$/ }).click(); await p.waitForTimeout(400);
  r.titleToday = await title();
  await p.screenshot({ path: `${out}/calendar.png` });
  // edit mode kept across days: double tap a to-do on 3 Nov, type, pick 4 Nov, back to 3 Nov
  await p.getByLabel("11월 3일", { exact: true }).first().click(); await p.waitForTimeout(300);
  const row = p.getByText("책 30쪽 읽기", { exact: true }).first();
  await row.dblclick(); await p.waitForTimeout(500);
  r.editOpen = await p.getByLabel("할 일 입력").count();
  r.editFocused = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  await p.getByLabel("할 일 입력").fill("책 40쪽 읽기");
  await p.getByLabel("11월 4일", { exact: true }).first().click(); await p.waitForTimeout(400);
  r.editHiddenOnOtherDay = await p.getByLabel("할 일 입력").count();
  await p.getByLabel("11월 3일", { exact: true }).first().click(); await p.waitForTimeout(500);
  r.editBack = await p.getByLabel("할 일 입력").count();
  r.draftKept = await p.getByLabel("할 일 입력").inputValue().catch(() => null);
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
