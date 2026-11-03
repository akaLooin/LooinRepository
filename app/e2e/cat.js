const { chromium } = require("playwright");
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.getByLabel("관리 메뉴").click();
  await p.getByText("카테고리 관리").click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/S06.png` });
  r.list = await p.getByText("편집").count();

  // edit To Do colour by hex
  await p.getByRole("button", { name: "To Do, 편집" }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/S06b.png` });
  await p.getByRole("button", { name: /^색상/ }).click();
  await p.waitForTimeout(400);
  await p.getByLabel("색상 코드").fill("zz");
  r.invalidFiltered = await p.getByLabel("색상 코드").inputValue();
  await p.getByLabel("색상 코드").fill("3d8bf");
  r.invalidMsg = await p.getByText("6자리 색상 코드를 입력해 주세요", { exact: false }).count();
  await p.getByLabel("색상 코드").fill("3d8bff");
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/S06d.png` });
  await p.getByRole("button", { name: "확인" }).last().click();
  await p.waitForTimeout(300);
  r.colorShown = await p.getByLabel("현재 색 #3D8BFF").count();

  // visibility sheet
  await p.getByRole("button", { name: /^공개설정/ }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/S06c.png` });
  await p.getByRole("radio", { name: "나만 보기" }).click();
  await p.getByRole("button", { name: "확인" }).last().click();
  await p.waitForTimeout(300);
  r.visShown = await p.getByRole("button", { name: "공개설정, 나만 보기" }).count();
  await p.getByRole("button", { name: "확인" }).first().click(); // header save
  await p.waitForTimeout(400);

  // new category
  await p.getByRole("button", { name: "추가하기" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "확인" }).first().click();
  r.emptyNameError = await p.getByText("이름을 입력해 주세요").count();
  await p.getByLabel("카테고리 이름").fill("공부");
  await p.getByRole("button", { name: "확인" }).first().click();
  await p.waitForTimeout(400);
  r.newListed = await p.getByRole("button", { name: "공부, 편집" }).count();

  // end it, then try adding a to-do on home
  await p.getByRole("button", { name: "공부, 편집" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "종료하기" }).click();
  await p.waitForTimeout(300);
  r.endedSection = await p.getByText("종료됨").count();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" }); // note: reload resets the in-memory store
  // home colour check after reload is not meaningful with the fake store; check pill exists
  r.homePill = await p.getByLabel("To Do에 할 일 추가").count();

  // delete flow
  await p.goto("http://localhost:8765/categories", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Normal, 편집" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "삭제" }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/S06b-delete.png` });
  await p.getByRole("button", { name: "삭제" }).last().click();
  await p.waitForTimeout(400);
  r.afterDelete = await p.getByRole("button", { name: "Normal, 편집" }).count();
  r.errs = errs.slice(0, 5);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
