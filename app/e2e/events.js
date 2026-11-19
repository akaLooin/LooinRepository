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
  const r = (global.R = {});
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
  // tapping the middle number lets you type it
  await p.getByRole("radiogroup", { name: "시" }).getByRole("radio", { name: "15시" }).click();
  await p.waitForTimeout(300);
  await p.getByLabel("시 직접 입력").fill("16");
  await p.getByLabel("시 직접 입력").press("Enter");
  await p.waitForTimeout(700);
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(300);
  r.typedHour = await p.getByRole("button", { name: "종료 시간 16:37" }).count();
  await p.getByRole("button", { name: /^종료 시간/ }).click();
  await p.waitForTimeout(500);
  await p.getByRole("radiogroup", { name: "시" }).getByRole("radio", { name: "16시" }).click();
  await p.waitForTimeout(300);
  await p.getByLabel("시 직접 입력").fill("15");
  await p.getByLabel("시 직접 입력").press("Enter");
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
  // two fingers spread the hours (touch events through the browser's touch emulation)
  const hourGap = async () => { const a = await p.getByRole("button", { name: `${dl(now)} 10:00에 일정 추가` }).boundingBox(); const b2 = await p.getByRole("button", { name: `${dl(now)} 11:00에 일정 추가` }).boundingBox(); return b2.y - a.y; };
  const before = await hourGap();
  const cdp = await p.context().newCDPSession(p);
  const tp = (d) => [{ x: 200, y: 450 - d, id: 1 }, { x: 210, y: 450 + d, id: 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(40) });
  for (let d = 50; d <= 120; d += 10) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: tp(d) }); await p.waitForTimeout(30); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(500);
  const after = await hourGap();
  r.pinchWider = after > before * 1.5;
  r.zoomKept = await p.evaluate(() => JSON.parse(localStorage.getItem("todomate:prefs") || "{}").timelineHourHeight > 52);
  await shot("events-zoomed");
  // swiping left goes to the next day (one day at a time)
  const t2 = new Date(now); t2.setDate(t2.getDate() + 1);
  await p.mouse.move(330, 500); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(330 - i * 30, 503);
  await p.mouse.up();
  await p.waitForTimeout(700);
  r.swipedToNextDay = await p.getByRole("button", { name: `${dl(t2)}, 오늘로 이동` }).count();
  await shot("events-next-day");
  // an event over midnight is a block on both days, not a 종일 chip
  await p.evaluate(({ a, b2 }) => {
    const s = JSON.parse(localStorage.getItem("todomate:demo"));
    s.db.events.push({ id: "e-night", title: "야간 작업", startDate: a, endDate: b2, allDay: false, startTime: "22:00", endTime: "02:00", color: "#7B61FF", memo: "", alarmMinutes: null });
    localStorage.setItem("todomate:demo", JSON.stringify(s));
  }, { a: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`, b2: `${t2.getFullYear()}-${String(t2.getMonth() + 1).padStart(2, "0")}-${String(t2.getDate()).padStart(2, "0")}` });
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  r.overnightToday = await p.getByRole("button", { name: /^야간 작업, / }).count(); // the reload opens today again: 22:00–24:00
  await p.getByRole("button", { name: "다음 날" }).click(); await p.waitForTimeout(700);
  r.overnightBlock = await p.getByRole("button", { name: /^야간 작업, / }).count();
  r.notInBand = (await p.getByLabel(`${dl(t2)} 종일 일정`).count()) === 0;
  const nb = await p.getByRole("button", { name: /^야간 작업, / }).boundingBox();
  const two = await p.getByRole("button", { name: `${dl(t2)} 02:00에 일정 추가` }).boundingBox();
  r.overnightEndsAt2 = !!nb && !!two && Math.abs(nb.y + nb.height - two.y) < 6;
  // selecting keeps its size; on its last day only the end can be stretched
  await p.getByRole("button", { name: /^야간 작업, / }).click(); await p.waitForTimeout(400);
  const nbSel = await p.getByRole("button", { name: /^야간 작업, / }).boundingBox();
  r.sameSizeSelected = Math.abs(nbSel.width - nb.width) < 1 && Math.abs(nbSel.x - nb.x) < 1;
  r.onlyEndHandle = (await p.getByLabel("끝나는 시간 끌어서 바꾸기").count()) === 1 && (await p.getByLabel("시작 시간 끌어서 바꾸기").count()) === 0;
  const hh = await p.getByLabel("끝나는 시간 끌어서 바꾸기").boundingBox();
  const hourPx = (await p.getByRole("button", { name: `${dl(t2)} 03:00에 일정 추가` }).boundingBox()).y - (await p.getByRole("button", { name: `${dl(t2)} 02:00에 일정 추가` }).boundingBox()).y;
  await p.mouse.move(hh.x + hh.width / 2, hh.y + hh.height / 2); await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(hh.x + hh.width / 2, hh.y + hh.height / 2 + (hourPx * i) / 6);
  await p.mouse.up(); await p.waitForTimeout(600);
  r.overnightStretched = await p.evaluate(() => JSON.parse(localStorage.getItem("todomate:demo")).db.events.find((e) => e.id === "e-night")?.endTime);
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
})().catch((e) => { console.error(e.message.split("\n").slice(0, 3).join(" "), JSON.stringify(global.R)); process.exit(1); });
