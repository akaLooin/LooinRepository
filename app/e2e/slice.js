// Drives the vertical slice in a browser: open home, add a to-do, check it, see the calendar change.
const { chromium } = require("playwright");
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/S03-top.png` });

  const cell = () => p.getByLabel("11월 3일", { exact: true }).first();
  const before = await cell().innerText();

  // add a to-do to "To Do"
  await p.getByLabel("To Do에 할 일 추가").click();
  await p.getByLabel("할 일 입력").fill("테스트 할 일");
  await p.getByLabel("할 일 입력").press("Enter");
  await p.waitForTimeout(300);
  const afterAdd = await cell().innerText();
  await p.keyboard.press("Escape");
  await p.getByLabel("관리 메뉴").focus(); // blur the input
  await p.waitForTimeout(300);
  const added = await p.getByText("테스트 할 일").count();

  // check it
  await p.getByRole("checkbox", { name: "테스트 할 일, 미완료" }).click();
  await p.waitForTimeout(300);
  const afterCheck = await cell().innerText();
  const checked = await p.getByRole("checkbox", { name: "테스트 할 일, 완료됨" }).count();

  await p.evaluate(() => window.scrollTo(0, 0));
  const scroller = p.locator("div").filter({ hasText: "리스트 메뉴" }).first();
  await p.mouse.wheel(0, 900);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/S03-bottom.png` });

  // open the to-do menu
  await p.getByText("테스트 할 일").click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/S05.png` });
  const sheetHasMenu = await p.getByText("다른 날 또 하기").count();
  await p.getByText("내일 또 하기").click();
  await p.waitForTimeout(300);
  const toast = await p.getByText("내일 할 일에 추가했어요").count();

  // top-right menu
  await p.mouse.wheel(0, -2000);
  await p.getByLabel("관리 메뉴").click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/S06m.png` });
  const menu = await p.getByText("리마인더 관리").count();

  console.log(JSON.stringify({ before, afterAdd, added, afterCheck, checked, sheetHasMenu, toast, menu, errs: errs.slice(0, 5) }, null, 1));
  await b.close();
})();
