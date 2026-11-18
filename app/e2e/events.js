// 일정 (user's feature, 2026-11-18): the ▼ sheet switches calendars with one tap (no 확인); the 일정 캘린더 shows events
// as bars and a tapped date opens its hour grid; tapping an hour adds an event there (title → 저장), tapping an event
// shows it (수정하기 / 삭제하기); 종일 events sit in the band on top; an old 여러 날 할 일 becomes an event.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  const shot = (n) => p.screenshot({ path: `${process.env.SHOT_DIR || "."}/${n}.png` });
  const now = new Date();
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await shot("events-todo-calendar");
  // one tap switches the calendar and closes the sheet
  await p.getByRole("button", { name: "캘린더 종류: 할 일 캘린더" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("radio", { name: "일정 캘린더" }).click();
  await p.waitForTimeout(600);
  r.switched = await p.getByRole("button", { name: "캘린더 종류: 일정 캘린더" }).count();
  r.sheetClosed = (await p.getByRole("radio", { name: "일정 캘린더" }).count()) === 0;
  r.noTodoList = (await p.getByText("리스트 메뉴").count()) === 0;
  r.todayEventListed = await p.getByText("팀 회의").count();
  await shot("events-calendar");
  // a date opens the hour grid
  await p.getByLabel(todayLabel, { exact: true }).first().click();
  await p.waitForTimeout(800);
  r.url = p.url().endsWith(`/events/${ymd(now)}`);
  r.block = await p.getByRole("button", { name: /^팀 회의, / }).count();
  r.nowLine = await p.getByLabel("지금", { exact: true }).count();
  // tap 14:10 on the grid → 14:00–15:00
  await p.getByRole("button", { name: "14:00에 일정 추가" }).click();
  await p.waitForTimeout(600);
  r.slot = await p.getByLabel("새 일정 자리").count();
  r.slotTime = await p.getByText(/14:00~15:00/).count();
  await p.getByLabel("일정 제목").fill("테스트");
  await shot("events-add");
  await p.getByRole("button", { name: "일정 저장" }).click();
  await p.waitForTimeout(600);
  r.saved = await p.getByText(/'테스트'을\(를\) 저장했어요/).count();
  r.newBlock = await p.getByRole("button", { name: "테스트, 14:00~15:00" }).count();
  // an empty title is refused
  await p.getByRole("button", { name: "20:00에 일정 추가" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "일정 저장" }).click();
  r.needsTitle = await p.getByText("제목을 적어 주세요").count();
  await p.getByRole("button", { name: "닫기" }).first().click();
  await p.waitForTimeout(500);
  // open it, change it to 종일
  await p.getByRole("button", { name: "테스트, 14:00~15:00" }).click();
  await p.waitForTimeout(500);
  r.detail = await p.getByRole("button", { name: "수정하기" }).count();
  await p.getByRole("button", { name: "수정하기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("switch", { name: "종일" }).click();
  await p.getByRole("button", { name: "일정 저장" }).click();
  await p.waitForTimeout(600);
  r.inBand = await p.getByLabel("종일 일정").getByRole("button", { name: /^테스트, 종일/ }).count();
  await shot("events-day");
  // survives a reload
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  r.afterReload = await p.getByRole("button", { name: /^테스트, 종일/ }).count();
  // delete
  await p.getByRole("button", { name: /^테스트, 종일/ }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "삭제하기" }).click();
  await p.waitForTimeout(500);
  r.deleted = (await p.getByRole("button", { name: /^테스트, / }).count()) === 0;
  // next day arrow
  await p.getByRole("button", { name: "다음 날" }).click();
  await p.waitForTimeout(400);
  const t2 = new Date(now); t2.setDate(t2.getDate() + 1);
  r.nextDay = await p.getByText(new RegExp(`^${t2.getMonth() + 1}월 ${t2.getDate()}일 \\(`)).count();
  // back home, then the 할 일 캘린더 again with one tap
  await p.getByRole("button", { name: "뒤로 가기" }).click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "캘린더 종류: 일정 캘린더" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("radio", { name: "할 일 캘린더" }).click();
  await p.waitForTimeout(600);
  r.backToTodos = await p.getByText("리스트 메뉴").count();
  // an old multi-day to-do (saved by the 11.12 version) becomes an event
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("todomate:demo"));
    const t = s.db.todos[0];
    s.db.todos[0] = { ...t, title: "옛 여러 날", date: "2026-11-03", endDate: "2026-11-05" };
    localStorage.setItem("todomate:demo", JSON.stringify(s));
  });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "캘린더 종류: 할 일 캘린더" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("radio", { name: "일정 캘린더" }).click();
  await p.waitForTimeout(500);
  r.lifted = await p.getByLabel("옛 여러 날", { exact: true }).count();
  r.liftedIsNotTodo = await p.evaluate(() => !JSON.parse(localStorage.getItem("todomate:demo")).db.todos.some((t) => t.title === "옛 여러 날"));
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
