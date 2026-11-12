// 할 일 날짜 옮기기 (user's feature): hold a to-do on home and drop it on a calendar date; the date lights up while
// the to-do is over it, the to-do moves there (and survives a reload). Dropping on its own day just reorders.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 1300 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click(); // seed data lives on 3 Nov
  await p.waitForTimeout(400);
  const row = p.getByText("책 30쪽 읽기");
  r.before = await row.count();
  const box = await row.boundingBox();
  const target = await p.getByLabel("11월 19일", { exact: true }).first().boundingBox();
  const x = box.x + 20, y = box.y + box.height / 2;
  const tx = target.x + target.width / 2, ty = target.y + target.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.waitForTimeout(650);
  for (let i = 1; i <= 12; i++) { await p.mouse.move(x + ((tx - x) * i) / 12, y + ((ty - y) * i) / 12); await p.waitForTimeout(30); }
  await p.waitForTimeout(150);
  r.hoverLit = await p.getByLabel("11월 19일", { exact: true }).first().evaluate((e) => getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)");
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/drag-date.png` : "drag-date.png" });
  await p.mouse.up();
  await p.waitForTimeout(700);
  r.toast = await p.getByText("11월 19일로 옮겼어요").count();
  r.goneFromDay = await p.getByText("책 30쪽 읽기").count();
  await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("11월 19일", { exact: true }).first().click();
  await p.waitForTimeout(400);
  r.onNewDay = await p.getByText("책 30쪽 읽기").count();
  r.errors = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
