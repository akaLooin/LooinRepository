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
  // Nov 10 should show the monthly routine as a to-do; Nov 7 the Saturday one
  await p.getByLabel("11월 10일", { exact: true }).click();
  await p.waitForTimeout(200);
  r.payday = await p.getByText("💵 월급날").count();
  await p.getByLabel("11월 7일", { exact: true }).click();
  r.saturday = await p.getByText("📞 집에 안부 전화").count();
  // check the virtual occurrence
  await p.getByRole("checkbox", { name: "📞 집에 안부 전화, 미완료" }).click();
  await p.waitForTimeout(200);
  r.virtualChecked = await p.getByRole("checkbox", { name: "📞 집에 안부 전화, 완료됨" }).count();
  // manual-add routine: grey row with +, one tap adds it
  await p.getByLabel("11월 5일", { exact: true }).click();
  await p.getByLabel("💪 운동하기 오늘 할 일에 추가").click();
  await p.waitForTimeout(200);
  r.manualAdded = await p.getByRole("checkbox", { name: "💪 운동하기, 미완료" }).count();
  await p.screenshot({ path: `${out}/S03-routines.png` });

  await p.goto("http://localhost:8765/routines", { waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/S07.png` });
  r.listRows = await p.getByText("진행 중").count();
  r.paydayDetail = await p.getByText("2026. 9. 29 ~ 2026. 12. 31 / 매월 10일").count();
  await p.getByText("💪 운동하기").click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/S07b.png` });
  await p.getByRole("button", { name: "반복, 매일" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("radio", { name: "격주" }).click();
  await p.getByRole("checkbox", { name: "월" }).click();
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/S07c.png` });
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(400);
  r.ruleAfter = await p.getByText(/격주/).count();
  await p.getByRole("button", { name: "시간, 없음" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("radio", { name: "23시" }).click();
  await p.getByRole("radio", { name: "55분" }).click();
  await p.screenshot({ path: `${out}/S07d.png` });
  await p.getByRole("button", { name: "완료" }).last().click();
  await p.waitForTimeout(300);
  r.time = await p.getByRole("button", { name: "시간, 23:55" }).count();
  await p.getByRole("button", { name: "확인" }).first().click();
  await p.waitForTimeout(400);
  r.savedDetail = await p.getByText(/격주/).count();
  // create a routine
  await p.getByLabel("Normal에 루틴 추가").click();
  await p.waitForTimeout(300);
  await p.getByLabel("루틴 이름").fill("📚 독서");
  await p.getByRole("button", { name: "확인" }).first().click();
  await p.waitForTimeout(300);
  r.created = await p.getByText("📚 독서").count();
  r.errs = errs.slice(0, 5);
  console.log(JSON.stringify(r));
  await b.close();
})();
