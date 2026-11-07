// The to-do menu follows the original's four menus (user's screenshots, 2026-11-07):
// today/undone, today/done, past/undone, past/done each show their own rows.
const { chromium } = require("playwright");
const rowsOf = async (p) => (await p.getByRole("button").allInnerTexts()).map((s) => s.trim());
const pick = (all, names) => names.filter((n) => all.includes(n));
const NAMES = ["메모", "시간 알림", "타이머 열기", "사진 인증", "내일 하기", "오늘하기", "오늘 또 하기", "내일 또 하기", "다른 날 또 하기", "날짜 바꾸기", "보관함으로 이동", "정보 보기"];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  const open = async (title) => { await p.getByText(title, { exact: true }).first().click(); await p.waitForTimeout(500); return pick(await rowsOf(p), NAMES); };
  const close = async () => { await p.mouse.click(200, 40); await p.waitForTimeout(500); };
  // today: add one, read the menu, check it, read again
  await p.getByLabel("To Do에 할 일 추가").click();
  await p.getByLabel("할 일 입력").fill("메뉴 확인");
  await p.getByLabel("할 일 입력").press("Enter");
  await p.getByLabel("할 일 입력").blur().catch(() => {});
  await p.waitForTimeout(400);
  r.todayOpen = await open("메뉴 확인"); await close();
  await p.getByRole("checkbox", { name: "메뉴 확인, 미완료" }).click(); await p.waitForTimeout(300);
  r.todayDone = await open("메뉴 확인"); await close();
  // a past day (sample data on 3 Nov)
  await p.getByLabel("11월 3일", { exact: true }).first().click(); await p.waitForTimeout(300);
  r.pastOpen = await open("책 30쪽 읽기"); await close();
  await p.getByRole("checkbox", { name: "책 30쪽 읽기, 미완료" }).click(); await p.waitForTimeout(300);
  r.pastDone = await open("책 30쪽 읽기"); await close();
  // tapping the memo text opens the memo editor straight away; tapping the alarm time opens the time sheet
  await p.getByText("에세이 - 3장").first().click(); await p.waitForTimeout(500);
  r.memoTapOpensEditor = await p.getByLabel("메모를 남겨 보세요").count();
  r.memoFocused = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  await p.getByRole("button", { name: "완료" }).first().click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /오늘로 이동$/ }).click(); await p.waitForTimeout(300); // back to today
  await open("메뉴 확인"); await p.getByText("시간 알림").click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "완료" }).last().click(); await p.waitForTimeout(500);
  await p.getByLabel(/^알림 \d\d:\d\d$/).first().click(); await p.waitForTimeout(500);
  r.alarmTapOpensTime = await p.getByText("시간 알림").count();
  const want = {
    todayOpen: ["메모", "시간 알림", "타이머 열기", "내일 하기", "날짜 바꾸기", "보관함으로 이동", "정보 보기"],
    todayDone: ["메모", "시간 알림", "타이머 열기", "사진 인증", "내일 또 하기", "다른 날 또 하기", "날짜 바꾸기", "정보 보기"],
    pastOpen: ["메모", "타이머 열기", "오늘하기", "날짜 바꾸기", "보관함으로 이동", "정보 보기"],
    pastDone: ["메모", "타이머 열기", "사진 인증", "오늘 또 하기", "다른 날 또 하기", "날짜 바꾸기", "정보 보기"],
  };
  r.match = Object.fromEntries(Object.entries(want).map(([k, v]) => [k, JSON.stringify(r[k]) === JSON.stringify(v)]));
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
