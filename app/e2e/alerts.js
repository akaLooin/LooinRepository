// 알림 in four tabs (user's feature): 친구의 할 일 (finished to-dos only), 친구의 일기, 받은 관심, 공지.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.getByRole("tab", { name: "알림" }).click();
  await p.waitForTimeout(800);
  r.tabs = await p.getByRole("tab", { name: /^(친구의 할 일|친구의 일기|받은 관심|공지)/ }).count();
  r.todoTabSelected = await p.getByRole("tab", { name: "친구의 할 일", selected: true }).count();
  r.friendTodo = await p.getByText("아침 산책", { exact: true }).count();
  r.noDiaryHere = (await p.getByText("날씨가 좋아서", { exact: false }).count()) === 0;
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/alerts.png` : "alerts.png" });
  await p.getByRole("tab", { name: "친구의 일기" }).click();
  await p.waitForTimeout(700);
  r.friendDiary = await p.getByText("날씨가 좋아서", { exact: false }).count();
  r.noTodoHere = (await p.getByText("아침 산책", { exact: true }).count()) === 0;
  await p.getByRole("tab", { name: /^받은 관심/ }).click();
  await p.waitForTimeout(300);
  r.interestEmpty = await p.getByText("아직 받은 관심이 없어요").count();
  await p.getByRole("tab", { name: "공지" }).click();
  await p.waitForTimeout(300);
  r.notice = await p.getByText(/홈 맨 위 돋보기/).count();
  // the tab is remembered while the app runs
  await p.getByRole("tab", { name: "홈" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("tab", { name: "알림" }).click();
  await p.waitForTimeout(300);
  r.remembered = await p.getByRole("tab", { name: "공지", selected: true }).count();
  r.errors = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
