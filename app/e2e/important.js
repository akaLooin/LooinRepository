// 중요한 날 (user's feature, 2026-11-20): a long press on a to-do's check marks it important (again: off); its day
// glows on the 할 일 캘린더. An event's 강조 (the button right of 수정 on a selected event, or the editor switch) makes
// its bar glow on the 일정 캘린더 and its days glow on the 할 일 캘린더.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  const shot = (n) => p.screenshot({ path: `${process.env.SHOT_DIR || "."}/${n}.png` });
  const now = new Date();
  const wd = "일월화수목금토";
  const dl = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd[d.getDay()]})`;
  const cell = (n, imp) => p.getByLabel(`11월 ${n}일${imp ? ", 중요한 날" : ""}`, { exact: true }).first();
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await cell(3).click(); await p.waitForTimeout(300);
  const check = p.getByRole("checkbox", { name: /^책 30쪽 읽기, / });
  await check.click({ delay: 800 }); // hold
  await p.waitForTimeout(500);
  r.toastOn = await p.getByText("중요한 날로 표시했어요").count();
  r.stillUnchecked = await p.getByRole("checkbox", { name: "책 30쪽 읽기, 미완료, 중요" }).count();
  r.dayGlows = await cell(3, true).count();
  await shot("important-todo");
  // again: off
  await check.click({ delay: 800 });
  await p.waitForTimeout(500);
  r.toastOff = await p.getByText("중요한 날 표시를 풀었어요").count();
  r.dayPlain = (await cell(3, true).count()) === 0 && (await cell(3).count()) === 1;
  // a short tap still checks it
  await check.click(); await p.waitForTimeout(300);
  r.tapChecks = await p.getByRole("checkbox", { name: "책 30쪽 읽기, 완료됨" }).count();
  // events: 강조 right of 수정
  await p.getByRole("button", { name: "캘린더 종류: 할 일 캘린더" }).click(); await p.waitForTimeout(300);
  await p.getByRole("radio", { name: "일정 캘린더" }).click(); await p.waitForTimeout(500);
  await p.getByLabel(`${now.getMonth() + 1}월 ${now.getDate()}일`, { exact: true }).first().click(); await p.waitForTimeout(800);
  await p.getByRole("button", { name: /^팀 회의, / }).click(); await p.waitForTimeout(300);
  const order = await p.getByRole("button", { name: /^(일정 수정|일정 강조|일정 삭제)$/ }).evaluateAll((els) => els.map((e) => [e.getAttribute("aria-label"), e.getBoundingClientRect().x]));
  r.order = order.sort((a, b2) => a[1] - b2[1]).map((x) => x[0]).join(" | ");
  await p.getByRole("button", { name: "일정 강조" }).click(); await p.waitForTimeout(400);
  r.eventToast = await p.getByText("중요한 일정으로 강조했어요").count();
  r.blockMarked = await p.getByRole("button", { name: /^팀 회의, .*, 강조$/ }).count();
  await shot("important-event");
  // the editor switch
  await p.getByRole("button", { name: "일정 수정" }).click(); await p.waitForTimeout(400);
  r.editorSwitchOn = await p.getByRole("switch", { name: "중요한 일정으로 강조" }).getAttribute("aria-checked");
  await p.getByRole("button", { name: "닫기" }).first().click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "뒤로 가기" }).click(); await p.waitForTimeout(600);
  r.barGlows = await p.getByLabel("팀 회의, 강조", { exact: true }).count();
  await shot("important-event-calendar");
  await p.getByRole("button", { name: "캘린더 종류: 일정 캘린더" }).click(); await p.waitForTimeout(300);
  await p.getByRole("radio", { name: "할 일 캘린더" }).click(); await p.waitForTimeout(500);
  // on the 할 일 캘린더 an important event glows on its line, not on the day's clover (user)
  r.eventLineGlows = await p.getByLabel("팀 회의, 강조", { exact: true }).count();
  r.dayNotLit = (await p.getByLabel(`${now.getMonth() + 1}월 ${now.getDate()}일, 중요한 날`, { exact: true }).count()) === 0;
  // lines sit under the date circles: the circle's bottom is above the line's top
  const num = await p.getByLabel(`${now.getMonth() + 1}월 ${now.getDate()}일`, { exact: true }).first().getByText(String(now.getDate()), { exact: true }).boundingBox();
  const line = await p.getByLabel("팀 회의, 강조", { exact: true }).boundingBox();
  r.lineBelowCircle = !!num && !!line && line.y >= num.y + num.height + 4; // the circle reaches ~4 past the number
  r.gap = num && line ? Math.round(line.y - (num.y + num.height)) : null;
  await shot("important-todo-calendar");
  // 설정 → 화면 → 강조 색
  await p.goto("http://localhost:8765/settings/display", { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  r.defaultColour = await p.getByRole("button", { name: /^강조 색, #00FF7F/ }).count();
  await p.getByRole("button", { name: /^강조 색/ }).click(); await p.waitForTimeout(400);
  await p.getByRole("radio", { name: "강조 색 #FFE14D" }).click();
  await p.getByRole("button", { name: "확인" }).click(); await p.waitForTimeout(300);
  r.colourSaved = await p.evaluate(() => JSON.parse(localStorage.getItem("todomate:prefs") || "{}").glowColor);
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e.message.split("\n").slice(0, 3).join(" ")); process.exit(1); });
