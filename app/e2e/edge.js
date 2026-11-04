// Edge cases from replica/test-plan.md that the flow scripts do not cover, plus an axe accessibility scan.
// Prints one JSON line: each case id -> pass/fail with a detail, and axe violations (serious/critical) per screen.
const { chromium } = require("playwright");
const path = require("path");
const AXE = path.join(__dirname, "..", "node_modules", "axe-core", "axe.min.js");

const results = {};
const check = (id, ok, detail) => { results[id] = ok ? "pass" : `FAIL ${detail ?? ""}`.trim(); };

async function fresh(p) {
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click();
}
const count = (p, text) => p.getByText(text, { exact: true }).count();
async function axe(p, name, out) {
  await p.addScriptTag({ path: AXE });
  const v = await p.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { resultTypes: ["violations"] });
    return r.violations.filter((x) => x.impact === "serious" || x.impact === "critical").map((x) => `${x.id}(${x.nodes.length})`);
  });
  out[name] = v;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  p.on("response", (r) => r.status() >= 500 && errs.push(`HTTP ${r.status()} ${r.url()}`));

  // F01-E1 empty input adds nothing
  await fresh(p);
  let before = await p.getByRole("checkbox").count();
  await p.getByLabel("To Do에 할 일 추가").click();
  await p.getByLabel("할 일 입력").fill("   ");
  await p.getByLabel("할 일 입력").press("Enter");
  await p.getByLabel("할 일 입력").blur().catch(() => {});
  await p.waitForTimeout(300);
  check("F01-E1 empty title not added", (await p.getByRole("checkbox").count()) === before);

  // F01-E2 very long title wraps, no sideways scroll
  const long = "아주 긴 할 일 제목 ".repeat(12).trim();
  await p.getByLabel("To Do에 할 일 추가").click();
  await p.getByLabel("할 일 입력").fill(long);
  await p.getByLabel("할 일 입력").press("Enter");
  await p.getByLabel("할 일 입력").blur().catch(() => {});
  await p.waitForTimeout(300);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  check("F01-E2 long title wraps", (await count(p, long)) === 1 && sw <= 411, `scrollWidth ${sw}`);

  // F01-E3 emoji and accents kept as typed
  const emo = "🧪 café ñ 한글 ✅";
  await p.getByLabel("To Do에 할 일 추가").click();
  await p.getByLabel("할 일 입력").fill(emo);
  await p.getByLabel("할 일 입력").press("Enter");
  await p.getByLabel("할 일 입력").blur().catch(() => {});
  await p.waitForTimeout(300);
  const emoRows = await p.getByRole("checkbox").evaluateAll((els, s) => els.filter((e) => e.getAttribute("aria-label") === `${s}, 미완료`).length, emo);
  check("F01-E3 emoji and accents", emoRows === 1, `${emoRows} rows; seen: ${JSON.stringify(await p.getByRole("checkbox").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")).filter((s) => /caf|🧪|긴/.test(s))))}`);

  // F01-E4 double submit adds one
  before = await p.getByRole("checkbox").count();
  await p.getByLabel("To Do에 할 일 추가").click();
  await p.getByLabel("할 일 입력").fill("한 번만");
  await p.getByLabel("할 일 입력").press("Enter");
  await p.getByLabel("할 일 입력").press("Enter");
  await p.getByLabel("할 일 입력").blur().catch(() => {});
  await p.waitForTimeout(300);
  check("F01-E4 double Enter adds once", (await count(p, "한 번만")) === 1, `${await count(p, "한 번만")} rows`);

  // F01-E5 refresh keeps what was added
  await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  check("F01-E5 survives refresh", (await p.getByRole("checkbox").evaluateAll((els, s) => els.filter((e) => e.getAttribute("aria-label") === `${s}, 미완료`).length, emo)) === 1);

  // F01-E6 rapid double toggle ends where it started
  const box = p.getByRole("checkbox", { name: "책 30쪽 읽기, 미완료" });
  await box.dblclick();
  await p.waitForTimeout(300);
  check("F01-E6 double tap on clover", (await p.getByRole("checkbox", { name: "책 30쪽 읽기, 미완료" }).count()) === 1);

  // F02-E1 back mid-edit does not save
  await p.goto("http://localhost:8765/categories", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "To Do, 편집" }).click();
  await p.getByLabel("카테고리 이름").fill("바뀌면 안 됨");
  await p.getByRole("button", { name: "뒤로 가기" }).click();
  await p.waitForTimeout(400);
  check("F02-E1 back discards edit", (await p.getByRole("button", { name: "To Do, 편집" }).count()) === 1);

  // F02-E2 very long category name stays on one pill line (ellipsis), no sideways scroll
  await p.getByRole("button", { name: "To Do, 편집" }).click();
  await p.getByLabel("카테고리 이름").fill("가".repeat(30));
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(400);
  const sw2 = await p.evaluate(() => document.documentElement.scrollWidth);
  check("F02-E2 30-char category name", sw2 <= 411, `scrollWidth ${sw2}`);
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  const sw3 = await p.evaluate(() => document.documentElement.scrollWidth);
  const pill = await p.getByLabel(`${"가".repeat(30)}에 할 일 추가`).boundingBox();
  check("F02-E3 long name on home pill", sw3 <= 411 && pill && pill.x + pill.width <= 411, `scrollWidth ${sw3}, + at ${pill && Math.round(pill.x + pill.width)}`);

  // F04-E1 routine with end before start is corrected
  // (covered by the date sheet clamping; checked in rt.js flow)

  // B2: an edit screen opened directly (refresh, link) still closes after saving
  await p.goto("http://localhost:8765/ddays/new", { waitUntil: "networkidle" });
  await p.getByLabel("디데이 이름").fill("바로 연 화면");
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(500);
  check("F07-E2 direct-opened edit closes on 완료", !p.url().includes("/ddays/new") && (await p.getByRole("button", { name: /^바로 연 화면, D/ }).count()) === 1, p.url());

  // F07-E1 D-day in the past shows D+n
  await p.goto("http://localhost:8765/ddays", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "추가하기" }).click();
  await p.waitForTimeout(400);
  await p.getByLabel("디데이 이름").fill("지난 날");
  await p.getByRole("button", { name: "이전 달" }).click();
  await p.getByLabel("10월 1일", { exact: true }).last().click();
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(400);
  check("F07-E1 past D-day shows D+", (await p.getByRole("button", { name: /^지난 날, D\+\d+$/ }).count()) === 1);

  // M-E1 360dp-wide phone: no sideways scroll on main screens
  await p.setViewportSize({ width: 360, height: 780 });
  const wide = [];
  for (const route of ["/", "/inbox", "/categories", "/routines", "/ddays", "/settings", "/settings/display", "/reminders", "/diary/2026-11-03", "/profile"]) {
    await p.goto("http://localhost:8765" + route, { waitUntil: "networkidle" });
    await p.waitForTimeout(300);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    if (w > 360) wide.push(`${route}:${w}`);
  }
  check("M-E1 360 wide, no sideways scroll", wide.length === 0, wide.join(" "));

  // A11Y axe on main screens (serious and critical only)
  await p.setViewportSize({ width: 411, height: 891 });
  const a11y = {};
  for (const route of ["/", "/inbox", "/categories", "/routines/new?category=c0000000-0000-4000-8000-000000000001", "/settings/display", "/diary/2026-11-03"]) {
    await p.goto("http://localhost:8765" + route, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await axe(p, route, a11y);
  }
  check("NO console errors / 5xx", errs.length === 0, errs.slice(0, 3).join(" | "));
  console.log(JSON.stringify({ results, a11y }, null, 1));
  await b.close();
})();
