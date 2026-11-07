// 보관함 (button, swipe, add, 오늘하기) and 리스트 메뉴 (내일 하기, 할 일 선택 → 보관함, 모든 할 일 삭제).
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
async function swipe(p, x, y, dx) {
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(x + (dx * i) / 10, y); await p.waitForTimeout(15); }
  await p.mouse.up(); await p.waitForTimeout(500);
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });

  // button → 보관함
  await p.getByLabel("보관함").first().click();
  await p.waitForTimeout(500);
  r.inboxTitle = await p.getByRole("heading", { name: "보관함" }).count();
  r.memoShown = await p.getByText("독서 모임 찾기", { exact: false }).count();
  await p.screenshot({ path: `${out}/S23.png` });
  // home stays in the page next to 보관함 (hidden from screen readers), so look things up by role: only the page in view counts
  const row = () => p.getByRole("button", { name: "날짜 없는 할 일" });
  await p.getByRole("button", { name: "Normal에 할 일 추가" }).click();
  await p.getByLabel("할 일 입력").fill("날짜 없는 할 일");
  await p.getByLabel("할 일 입력").press("Enter");
  await p.waitForTimeout(300);
  await p.mouse.click(200, 20);
  r.added = await row().count();
  await row().click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/S23-sheet.png` });
  await p.getByText("오늘하기").click();
  await p.waitForTimeout(400);
  r.leftInbox = (await row().count()) === 0;
  // swipe left on the inbox goes back home
  await swipe(p, 300, 500, -200);
  r.backHome = await row().count(); // today's list on home
  // swipe right under the calendar opens 보관함
  const y = (await p.getByLabel("To Do에 할 일 추가").boundingBox()).y + 60;
  await swipe(p, 150, y, 220); // from a row's text (a touch that starts on the checkbox stays with the checkbox)
  r.swipedToInbox = await p.getByRole("heading", { name: "보관함" }).count();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);

  // 리스트 메뉴: 미완료 할 일 내일 하기 on 4 Nov
  await p.getByLabel("11월 4일", { exact: true }).first().click();
  const before5 = (await p.getByLabel("11월 5일", { exact: true }).first().innerText()).split("\n")[0];
  await p.getByRole("button", { name: "리스트 메뉴" }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/S03-listmenu.png` });
  await p.getByRole("radio", { name: "미완료 할 일 내일 하기" }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(400);
  r.nov5 = `${before5} -> ${(await p.getByLabel("11월 5일", { exact: true }).first().innerText()).split("\n")[0]}`;

  // 할 일 선택 → 보관함
  await p.getByLabel("11월 5일", { exact: true }).first().click();
  await p.getByRole("button", { name: "리스트 메뉴" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("radio", { name: "할 일 선택" }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(300);
  const first = (await p.getByRole("checkbox").first().getAttribute("aria-label")).split(",")[0];
  await p.getByText(first, { exact: true }).first().click();
  await p.waitForTimeout(200);
  r.selectedCount = await p.getByText("1개 선택됨").count();
  await p.screenshot({ path: `${out}/S03-select.png` });
  await p.getByRole("button", { name: "보관함" }).last().click();
  await p.waitForTimeout(300);
  await p.goto("http://localhost:8765/inbox", { waitUntil: "networkidle" });
  r.movedToInbox = await p.getByText(first, { exact: true }).count();

  // 모든 할 일 삭제 on 4 Nov
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.getByLabel("11월 4일", { exact: true }).first().click();
  await p.getByRole("button", { name: "리스트 메뉴" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("radio", { name: "모든 할 일 삭제" }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "삭제" }).last().click();
  await p.waitForTimeout(300);
  r.nov4Empty = (await p.getByLabel("11월 4일", { exact: true }).first().innerText()).split("\n")[0];
  r.errs = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
