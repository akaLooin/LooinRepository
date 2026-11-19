// 일정 (user's feature, 2026-11-18/19): the ▼ sheet switches calendars with one tap (no 확인); nothing under the 일정
// 캘린더; a tapped date opens the hour grid; a tap on 14:00 adds an event (알림 없음 by default, minutes by wheel);
// tapping an event selects it (handles + 수정/삭제), the bottom handle stretches it, holding it moves it; a tap
// beside it lets go; scrolling runs on into the next day; 종일 events sit in the day's top line; an old 여러 날 할 일
// becomes an event.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  const shot = (n) => p.screenshot({ path: `${process.env.SHOT_DIR || "."}/${n}.png` });
  const now = new Date();
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const wd = "일월화수목금토";
  const dl = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd[d.getDay()]})`;
  const esc = (s) => s.replace(/[()]/g, "\\$&");
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.getByRole("button", { name: "캘린더 종류: 할 일 캘린더" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("radio", { name: "일정 캘린더" }).click();
  await p.waitForTimeout(600);
  r.switched = await p.getByRole("button", { name: "캘린더 종류: 일정 캘린더" }).count();
  r.sheetClosed = (await p.getByRole("radio", { name: "일정 캘린더" }).count()) === 0;
  r.nothingBelow = (await p.getByText("리스트 메뉴").count()) === 0 && (await p.getByText(/요일 일정$/).count()) === 0;
  await shot("events-calendar");
  await p.getByLabel(`${now.getMonth() + 1}월 ${now.getDate()}일`, { exact: true }).first().click();
  await p.waitForTimeout(800);
  r.url = p.url().endsWith(`/events/${ymd(now)}`);
  r.title = await p.getByRole("button", { name: `${dl(now)}, 오늘로 이동` }).count();
  await p.getByRole("button", { name: `${dl(now)} 14:00에 일정 추가` }).click();
  await p.waitForTimeout(600);
  r.slot = await p.getByLabel("새 일정 자리").count();
  r.noAlarm = await p.getByRole("button", { name: "알림 알림 없음" }).count();
  await p.getByLabel("일정 제목").fill("테스트");
  // the end time by the minute wheel
  await p.getByRole("button", { name: /^종료 시간/ }).click();
  await p.waitForTimeout(500);
  await p.getByRole("radiogroup", { name: "분" }).getByRole("radio", { name: "37분" }).click();
  await p.waitForTimeout(700);
  await shot("events-wheel");
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(300);
  r.wheelMinute = await p.getByRole("button", { name: "종료 시간 15:37" }).count();
  await p.getByRole("button", { name: "일정 저장" }).click();
  await p.waitForTimeout(600);
  r.saved = await p.getByText(/'테스트'을\(를\) 저장했어요/).count();
  const block = p.getByRole("button", { name: /^테스트, 14:00~15:37/ });
  r.block = await block.count();
  // tap: selected, with handles and small buttons
  await block.click();
  await p.waitForTimeout(400);
  r.handles = await p.getByLabel("끝나는 시간 끌어서 바꾸기").count();
  r.smallButtons = await p.getByRole("button", { name: "일정 수정" }).count();
  await shot("events-selected");
  // stretch: bottom handle down by about half an hour
  const bb = await block.boundingBox();
  const perMin = (bb.height + 2) / 97; // 14:00–15:37
  const h = await p.getByLabel("끝나는 시간 끌어서 바꾸기").boundingBox();
  await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + (perMin * 23 * i) / 6);
  await p.mouse.up();
  await p.waitForTimeout(500);
  r.stretched = await p.getByRole("button", { name: /^테스트, 14:00~16:00/ }).count();
  // hold and move up an hour
  const b2 = await p.getByRole("button", { name: /^테스트, 14:00~16:00/ }).boundingBox();
  await p.mouse.move(b2.x + 40, b2.y + 20);
  await p.mouse.down();
  await p.waitForTimeout(600);
  for (let i = 1; i <= 6; i++) await p.mouse.move(b2.x + 40, b2.y + 20 - (perMin * 60 * i) / 6);
  await p.mouse.up();
  await p.waitForTimeout(500);
  r.moved = await p.getByRole("button", { name: /^테스트, 13:00~15:00/ }).count();
  r.movedToast = await p.getByText(/13:00~15:00로 바꿨어요/).count();
  // a tap beside it lets go, without adding
  await p.getByRole("button", { name: `${dl(now)} 20:00에 일정 추가` }).click();
  await p.waitForTimeout(400);
  r.letGo = (await p.getByLabel("끝나는 시간 끌어서 바꾸기").count()) === 0 && (await p.getByLabel("일정 제목").count()) === 0;
  // 수정 → 종일
  await p.getByRole("button", { name: /^테스트, 13:00~15:00/ }).click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "일정 수정" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("switch", { name: "종일" }).click();
  await p.getByRole("button", { name: "일정 저장" }).click();
  await p.waitForTimeout(600);
  r.inBand = await p.getByLabel(`${dl(now)} 종일 일정`).getByRole("button", { name: /^테스트, 종일/ }).count();
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  r.afterReload = await p.getByRole("button", { name: /^테스트, 종일/ }).count();
  await p.getByRole("button", { name: /^테스트, 종일/ }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "삭제하기" }).click();
  await p.waitForTimeout(500);
  r.deleted = (await p.getByRole("button", { name: /^테스트, / }).count()) === 0;
  // scrolling down runs on into tomorrow
  const t2 = new Date(now); t2.setDate(t2.getDate() + 1);
  await p.mouse.move(250, 500);
  for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(40); }
  await p.waitForTimeout(900);
  r.nextDayTitle = await p.getByRole("button", { name: `${dl(t2)}, 오늘로 이동` }).count();
  r.recentred = await p.getByRole("button", { name: `${dl(t2)} 14:00에 일정 추가` }).count();
  await shot("events-next-day");
  await p.getByRole("button", { name: "뒤로 가기" }).click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "캘린더 종류: 일정 캘린더" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("radio", { name: "할 일 캘린더" }).click();
  await p.waitForTimeout(600);
  r.backToTodos = await p.getByText("리스트 메뉴").count();
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("todomate:demo"));
    s.db.todos[0] = { ...s.db.todos[0], title: "옛 여러 날", date: "2026-11-03", endDate: "2026-11-05" };
    localStorage.setItem("todomate:demo", JSON.stringify(s));
  });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "캘린더 종류: 할 일 캘린더" }).click();
  await p.waitForTimeout(300);
  await p.getByRole("radio", { name: "일정 캘린더" }).click();
  await p.waitForTimeout(500);
  r.lifted = await p.getByLabel("옛 여러 날", { exact: true }).count();
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e.message.split("\n")[0]); process.exit(1); });
