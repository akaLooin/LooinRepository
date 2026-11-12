// 여러 날 할 일 (user's feature): to-do menu → 여러 날 하기 → 끝나는 날; the to-do shows on each of its days with its
// period, not in the clovers; the ▼ sheet switches to the 긴 할 일 calendar (labelled bars, grey once done);
// 날짜 바꾸기 keeps its length; 없음 makes it one day again.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 1300 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  const shot = (n) => p.screenshot({ path: `${process.env.SHOT_DIR || "."}/${n}.png` });
  const day = (n) => p.getByLabel(`11월 ${n}일`, { exact: true }).first();
  const menu = async () => { await p.getByText("책 30쪽 읽기", { exact: true }).last().click(); /* the list row: the calendar bar comes first */ await p.waitForTimeout(500); };
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await day(3).click();
  await p.waitForTimeout(300);
  const cloverBefore = await day(5).getAttribute("aria-label");
  await menu();
  await p.getByText("여러 날 하기").click();
  await p.waitForTimeout(400);
  await p.getByLabel("11월 6일", { exact: true }).last().click();
  await p.getByRole("button", { name: "완료" }).last().click();
  await p.waitForTimeout(500);
  r.toast = await p.getByText("11월 6일까지 하는 할 일이에요").count();
  r.period = await p.getByLabel("기간 11.3 – 11.6").count();
  await shot("span-basic");
  await day(5).click();
  await p.waitForTimeout(300);
  r.onMiddleDay = await p.getByText("책 30쪽 읽기", { exact: true }).count(); // basic calendar: no label, so this is the list
  r.cloverSame = (await day(5).getAttribute("aria-label")) === cloverBefore;
  // 긴 할 일 calendar
  await p.getByRole("button", { name: "캘린더 종류와 표시할 카테고리" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("radio", { name: "긴 할 일 캘린더" }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(500);
  r.bar = await p.getByLabel("책 30쪽 읽기", { exact: true }).count();
  r.headerIcon = await p.getByRole("button", { name: "캘린더 종류: 긴 할 일" }).count();
  await p.getByLabel("책 30쪽 읽기, 미완료").click();
  await p.waitForTimeout(400);
  r.barDone = await p.getByLabel("책 30쪽 읽기, 완료", { exact: true }).count();
  await shot("span-long");
  // move keeps the length (4 days)
  await menu();
  await p.getByText("날짜 바꾸기").click();
  await p.waitForTimeout(400);
  await p.getByLabel("11월 10일", { exact: true }).last().click();
  await p.getByRole("button", { name: "완료" }).last().click();
  await p.waitForTimeout(500);
  await day(13).click(); await p.waitForTimeout(300);
  r.movedEnd = await p.getByText("책 30쪽 읽기", { exact: true }).count();
  await day(14).click(); await p.waitForTimeout(300);
  r.notAfter = (await p.getByText("책 30쪽 읽기", { exact: true }).count()) === 1; // only the bar in the calendar, not in the list
  // back to one day
  await day(10).click(); await p.waitForTimeout(300);
  await menu();
  await p.getByText(/^기간 · 11\.10 – 11\.13/).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "없음" }).click();
  await p.waitForTimeout(400);
  r.oneDay = await p.getByText("하루 할 일로 바꿨어요").count();
  await day(11).click(); await p.waitForTimeout(300);
  r.goneNextDay = (await p.getByText("책 30쪽 읽기", { exact: true }).count()) === 0;
  // survives a reload with the calendar kind
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  r.kindKept = await p.getByRole("button", { name: "캘린더 종류: 긴 할 일" }).count();
  r.errors = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
