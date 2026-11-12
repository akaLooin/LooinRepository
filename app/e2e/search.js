// 할 일·일기 검색 (user's feature): search button at the top of home, to-dos (title and memo) and diaries,
// filter chips, highlight, tapping a result opens home on that day.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  // a diary on 3 Nov to find
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "할 일과 일기 검색" }).click();
  await p.waitForTimeout(500);
  r.emptyHint = await p.getByText("지난 할 일과 일기를 찾아볼 수 있어요").count();
  await p.getByLabel("할 일과 일기 검색").last().fill("책");
  await p.waitForTimeout(500);
  r.todoHit = await p.getByRole("button", { name: /할 일 책 30쪽 읽기/ }).count();
  r.dayHeader = await p.getByRole("button", { name: /2026년 11월 3일 \(화\)로 가기/ }).count();
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/search.png` : "search.png" });
  await p.getByRole("button", { name: "일기만 보기" }).click();
  await p.waitForTimeout(300);
  r.diaryFilterHidesTodos = (await p.getByRole("button", { name: /할 일 책 30쪽 읽기/ }).count()) === 0;
  await p.getByRole("button", { name: "전체만 보기" }).click();
  await p.getByLabel("할 일과 일기 검색").last().fill("없는검색어");
  await p.waitForTimeout(400);
  r.none = await p.getByText("찾는 할 일이나 일기가 없어요").count();
  await p.getByLabel("할 일과 일기 검색").last().fill("책");
  await p.waitForTimeout(400);
  // go to another day first, then jump back by the result
  await p.getByRole("button", { name: "뒤로 가기" }).click();
  await p.waitForTimeout(300);
  await p.getByLabel("11월 10일", { exact: true }).first().click();
  await p.getByRole("button", { name: "할 일과 일기 검색" }).click();
  await p.waitForTimeout(400);
  await p.getByLabel("할 일과 일기 검색").last().fill("책 30");
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: /할 일 책 30쪽 읽기/ }).click();
  await p.waitForTimeout(700);
  r.jumped = await p.getByText("책 30쪽 읽기").count();
  r.home = await p.getByRole("button", { name: "관리 메뉴" }).count();
  r.errors = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
