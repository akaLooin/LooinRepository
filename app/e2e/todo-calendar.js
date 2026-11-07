// 할 일 캘린더: opens from the home menu, to-dos written in the days, the 설정 → 화면 limit turns extras into "+n",
// week view, and tapping a day opens home on that day.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "관리 메뉴" }).first().click();
  await p.waitForTimeout(400);
  await p.getByText("할 일 캘린더", { exact: true }).click();
  await p.waitForTimeout(700);
  r.title = await p.getByRole("heading", { name: "할 일 캘린더" }).count();
  const d = new Date();
  const todayLabel = `${d.getMonth() + 1}월 ${d.getDate()}일, 할 일 `;
  const cell = p.getByRole("button", { name: new RegExp("^" + todayLabel) });
  r.todayCell = await cell.getAttribute("aria-label");
  r.plusBefore = await cell.getByText(/^\+\d+$/).count();
  await p.screenshot({ path: `${out}/todo-calendar.png` });

  // limit 3 in 설정 → 화면
  await p.goto("http://localhost:8765/settings/display", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.getByText("월별 할 일 캘린더의 최대 항목 개수").click();
  await p.waitForTimeout(400);
  await p.getByText("3개", { exact: true }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(300);
  r.settingShown = await p.getByText("3개", { exact: true }).count();
  await p.goto("http://localhost:8765/todo-calendar", { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  const cell2 = p.getByRole("button", { name: new RegExp("^" + todayLabel) });
  r.plusAfter = await cell2.getByText(/^\+\d+$/).textContent().catch(() => null);
  await p.screenshot({ path: `${out}/todo-calendar-3.png` });

  // week view
  await p.getByRole("button", { name: "주간 보기" }).click();
  await p.waitForTimeout(400);
  r.weekRows = await p.getByRole("button", { name: /월 \d+일, 할 일 \d+개$/ }).count();
  r.weekTitle = await p.getByText(/주차$/).count();
  await p.screenshot({ path: `${out}/todo-calendar-week.png` });

  // tap tomorrow → home on that day
  const t = new Date(Date.now() + 86400000);
  await p.getByRole("button", { name: "월간 보기" }).click();
  await p.waitForTimeout(300);
  if (t.getMonth() !== d.getMonth()) { await p.getByRole("button", { name: "다음" }).click(); await p.waitForTimeout(300); }
  await p.getByRole("button", { name: new RegExp(`^${t.getMonth() + 1}월 ${t.getDate()}일, 할 일 `) }).click();
  await p.waitForTimeout(800);
  r.homeOnDay = await p.getByText(new RegExp(`^${t.getMonth() + 1}월 ${t.getDate()}일 .요일$`)).count();
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
