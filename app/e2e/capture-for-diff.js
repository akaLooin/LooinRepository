// Captures the clone in the same state as each reference screenshot in replica/screens/, for replica-diff.
// Viewport 411x799 = the reference phone's content area (1080x2340 minus 96px status bar and 144px nav bar, at 411 wide).
// Usage: node e2e/capture-for-diff.js <outDir>   (web export served on :8765 in demo mode)
const { chromium } = require("playwright");
const out = process.argv[2];
const W = 411, H = 799;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const go = async (path) => { await p.goto("http://localhost:8765" + path, { waitUntil: "networkidle" }); await p.waitForTimeout(500); };
  const shot = async (name) => { await p.waitForTimeout(350); await p.screenshot({ path: `${out}/${name}.png` }); };
  const scrollTo = async (locator, y) => {
    const box = await locator.boundingBox();
    await p.mouse.move(W / 2, H / 2);
    await p.mouse.wheel(0, box.y - y);
    await p.waitForTimeout(300);
  };

  await go("/");
  await p.evaluate(() => localStorage.clear());
  await go("/");
  await shot("s03-home-top-dark");
  // reference bottom shot: the "To Do" pill sits about 420dp down
  await scrollTo(p.getByLabel("To Do에 할 일 추가"), 420 - 14);
  await shot("s03-home-bottom-dark");
  await go("/");
  await p.getByRole("button", { name: "주간 보기" }).click();
  await shot("s03-home-week-dark");

  await go("/");
  await p.getByText("💪 운동하기: 어깨").click();
  await shot("s05-todo-menu");
  await p.getByText("메모", { exact: true }).click();
  await shot("s05a-todo-memo-sheet");

  await go("/");
  await p.getByText("💪 운동하기: 어깨").click();
  await p.getByText("정보 보기").click();
  await shot("s05b-todo-info");

  await go("/");
  await p.getByLabel("관리 메뉴").click();
  await shot("s06-top-menu");

  await go("/categories");
  await shot("s06-category-list");
  await p.getByRole("button", { name: "To Do, 편집" }).click();
  await shot("s06b-category-edit");
  await p.getByRole("button", { name: /^공개설정/ }).click();
  await shot("s06c-visibility-sheet");

  await go("/routines");
  await shot("s07-routine-list");
  await p.getByText(/💪 운동하기$/).first().click();
  await shot("s07b-routine-edit");
  await p.getByRole("button", { name: "반복, 매일" }).click();
  await shot("s07c-repeat-picker");
  await p.getByRole("button", { name: "완료" }).last().click();
  await p.getByRole("button", { name: "시간, 없음" }).click();
  await p.getByRole("radio", { name: "23시" }).click();
  await p.getByRole("radio", { name: "55분" }).click();
  await shot("s07d-time-sheet");

  await go("/");
  await p.getByText("💪 운동하기: 어깨").click();
  await p.getByText("타이머 열기").click();
  await shot("s08-timer");

  await go("/diary/2026-11-03");
  await shot("s09-diary-write");

  await go("/settings");
  await shot("s12-settings");
  await go("/settings/display");
  await shot("s12-display-1");

  await go("/ddays");
  await shot("s21-dday-list");
  await go("/ddays/new");
  await p.getByLabel("디데이 이름").blur();
  await shot("s21b-dday-edit-1");

  await go("/reminders");
  await shot("s22-reminder-list-empty");
  await p.getByRole("button", { name: "추가하기" }).click();
  await shot("s22b-reminder-time-sheet");

  await go("/settings/display");
  await p.getByRole("button", { name: /^테마/ }).click();
  await p.getByRole("radio", { name: "라이트" }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await go("/");
  await shot("s03-home-top-light");

  console.log(JSON.stringify({ ok: true, errs }));
  await b.close();
})();
