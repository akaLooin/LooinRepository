// Bottom sheets close when the top is dragged down; a short drag springs back. Also the 할 일 정보 sheet.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
async function dragDown(p, x, y, dy) {
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(x, y + (dy * i) / 10); await p.waitForTimeout(20); }
  await p.mouse.up(); await p.waitForTimeout(600);
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  await p.getByText("책 30쪽 읽기").first().click();
  await p.waitForTimeout(600);
  const title = p.getByRole("heading", { name: "책 30쪽 읽기" });
  const tb = await title.boundingBox();
  await dragDown(p, tb.x + tb.width / 2, tb.y + tb.height / 2, 40); // short: springs back
  r.shortKeepsOpen = await p.getByText("날짜 바꾸기").isVisible();
  await dragDown(p, tb.x + tb.width / 2, tb.y + tb.height / 2, 260); // long: closes
  r.longCloses = (await p.getByText("다른 날 또 하기").count()) === 0;
  // backdrop tap still closes, after the slide-out
  await p.getByText("책 30쪽 읽기").first().click();
  await p.waitForTimeout(600);
  await p.mouse.click(200, 40);
  await p.waitForTimeout(500);
  r.tapCloses = (await p.getByText("날짜 바꾸기").count()) === 0;
  // 정보 보기 as a sheet over home
  await p.getByText("책 30쪽 읽기").first().click();
  await p.waitForTimeout(600);
  await p.getByText("정보 보기").click();
  await p.waitForTimeout(800);
  r.infoOpen = await p.getByRole("heading", { name: "할 일" }).count();
  r.homeBehind = await p.getByLabel("관리 메뉴").count();
  await p.screenshot({ path: `${out}/S05b-sheet.png` });
  const hb = await p.getByRole("heading", { name: "할 일" }).boundingBox();
  await dragDown(p, hb.x + hb.width / 2, hb.y + hb.height / 2, 300);
  r.infoClosed = (await p.getByRole("heading", { name: "할 일" }).count()) === 0;
  // a button inside the draggable header still gets its tap (메모 sheet: 완료)
  await p.getByText("책 30쪽 읽기").first().click();
  await p.waitForTimeout(600);
  await p.getByText("메모", { exact: true }).click();
  await p.waitForTimeout(600);
  await p.getByLabel("메모를 남겨 보세요").fill("헤더 버튼 확인");
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(600);
  r.headerButtonWorks = await p.getByText("헤더 버튼 확인").count();
  r.errs = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
