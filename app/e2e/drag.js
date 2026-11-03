// Hold a row, move it, release: the order must change and survive a reload.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
async function drag(p, locator, dy) {
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.waitForTimeout(500); // long press
  for (let i = 1; i <= 8; i++) { await p.mouse.move(x, y + (dy * i) / 8); await p.waitForTimeout(30); }
  await p.mouse.up();
  await p.waitForTimeout(400);
}
const order = async (p, re) => (await p.getByRole("button", { name: re }).allInnerTexts()).map((s) => s.split("\n")[0]);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });

  // categories
  await p.goto("http://localhost:8765/categories", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  r.catBefore = await order(p, /, 편집$/);
  await drag(p, p.getByRole("button", { name: "Normal, 편집" }), -64);
  r.catAfter = await order(p, /, 편집$/);

  // d-days
  await p.goto("http://localhost:8765/ddays", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  r.ddBefore = await order(p, /, D[-+]/);
  await drag(p, p.getByRole("button", { name: /^자격증 시험, D/ }), 64);
  r.ddAfter = await order(p, /, D[-+]/);
  await p.screenshot({ path: `${out}/S21-drag.png` });

  // home to-dos on 4 Nov (several in one category)
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.getByLabel("11월 4일", { exact: true }).click();
  await p.waitForTimeout(300);
  const titles = async () => (await p.getByRole("checkbox").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).map((s) => s.split(",")[0]);
  r.todoBefore = await titles();
  await drag(p, p.getByText(r.todoBefore[0], { exact: true }).first(), 52);
  r.todoAfter = await titles();
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.getByLabel("11월 4일", { exact: true }).click();
  await p.waitForTimeout(300);
  r.todoAfterReload = await titles();

  // routines
  await p.goto("http://localhost:8765/routines", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const rnames = async () => (await p.getByText(/^진행 중 \| /).allInnerTexts()).map((s) => s.replace(/^진행 중 \| /, ""));
  r.rtBefore = await rnames();
  await drag(p, p.getByText(/💵 월급날/).first(), -74);
  r.rtAfter = await rnames();
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
