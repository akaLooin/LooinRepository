// Calendar category filter, folding a category (∨ at the row end), and "할 일을 상단에서 입력".
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  const cell = (d) => p.getByLabel(`11월 ${d}일`, { exact: true }).first();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  r.nov4Before = (await cell(4).innerText()).split("\n")[0]; // 6 left across both categories
  await p.getByLabel("표시할 카테고리").click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/home-filter.png` });
  await p.getByRole("checkbox", { name: "Normal" }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(400);
  r.nov4OnlyToDo = (await cell(4).innerText()).split("\n")[0]; // To Do share only
  // collapse (설정 → 화면 → 카테고리 접기 펼치기)
  await p.goto("http://localhost:8765/settings/display", { waitUntil: "networkidle" });
  await p.getByRole("switch", { name: "카테고리 접기 펼치기" }).click();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  // the ∨ at the right end of the title row folds (original), the title itself still opens the category
  await p.getByRole("button", { name: "Normal 접기" }).click();
  await p.waitForTimeout(300);
  r.collapsed = (await p.getByText("책 30쪽 읽기").count()) === 0 && (await p.getByRole("button", { name: "Normal 펼치기" }).count()) === 1;
  await p.getByRole("button", { name: "Normal 펼치기" }).click();
  await p.waitForTimeout(300);
  r.expanded = (await p.getByText("책 30쪽 읽기").count()) === 1;
  // input at top
  await p.goto("http://localhost:8765/settings/display", { waitUntil: "networkidle" });
  await p.getByRole("switch", { name: "할 일을 상단에서 입력" }).click();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  await p.getByLabel("To Do에 할 일 추가").click();
  await p.waitForTimeout(300);
  const inputY = (await p.getByLabel("할 일 입력").boundingBox()).y;
  const rowY = (await p.getByText("💪 운동하기: 어깨").boundingBox()).y;
  r.inputAboveRows = inputY < rowY;
  r.errs = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
