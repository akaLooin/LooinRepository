// 일기 as in the original's recording: the dashed button next to the profile opens the day's diary; pick a sticker
// mood, set 기분 온도, background from the colour grid (확인), text; 완료 → the sticker sits next to the profile;
// tapping it opens the diary sheet, ⋯ → 수정 / 삭제; closing with changes asks first.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "일기 쓰기" }).first().click();
  await p.waitForTimeout(600);
  r.opened = await p.getByRole("heading", { name: "일기" }).count();
  await p.getByRole("button", { name: "오늘의 기분 고르기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "최고 반응", exact: true }).click();
  await p.waitForTimeout(400);
  r.sticker = await p.getByLabel("최고 스티커").count();
  // 기분 온도: tap the sticker, slide, 확인
  await p.getByRole("button", { name: "오늘의 기분, 기분 온도 정하기" }).click();
  await p.waitForTimeout(500);
  const slider = p.getByRole("adjustable", { name: "기분 온도" }).or(p.getByLabel("기분 온도", { exact: true })).first();
  const box = await slider.boundingBox();
  await p.mouse.click(box.x + box.width * 0.33, box.y + box.height / 2);
  await p.waitForTimeout(200);
  r.tempShown = await p.getByText(/^3\d°$/).first().textContent();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(400);
  r.gauge = await p.getByLabel(/^기분 온도 3\d도$/).count();
  // background colour grid, preview then 확인
  await p.getByRole("button", { name: "배경색" }).click();
  await p.waitForTimeout(400);
  r.colorCount = await p.getByRole("radio", { name: /^배경 #/ }).count();
  await p.getByRole("radio", { name: "배경 #D9A43A" }).click();
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(300);
  await p.getByLabel("일기 내용").fill("좋아요");
  await p.screenshot({ path: `${out}/diary-write.png` });
  // closing with changes asks
  await p.getByRole("button", { name: "닫기" }).first().click();
  await p.waitForTimeout(300);
  r.asks = await p.getByText("작성을 완료하시겠습니까?").count();
  await p.getByRole("button", { name: "완료" }).last().click();
  await p.waitForTimeout(800);
  r.besideProfile = await p.getByRole("button", { name: "오늘의 일기 보기" }).count();
  await p.screenshot({ path: `${out}/diary-home.png` });
  await p.getByRole("button", { name: "오늘의 일기 보기" }).click();
  await p.waitForTimeout(600);
  r.sheetText = await p.getByText("좋아요", { exact: true }).count();
  await p.screenshot({ path: `${out}/diary-sheet.png` });
  await p.getByRole("button", { name: "일기 메뉴" }).click();
  await p.waitForTimeout(400);
  r.menu = (await p.getByRole("button", { name: "수정" }).count()) + (await p.getByRole("button", { name: "삭제" }).count());
  await p.getByRole("button", { name: "삭제" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "삭제" }).last().click();
  await p.waitForTimeout(600);
  r.deleted = await p.getByRole("button", { name: "일기 쓰기" }).count() > 0;
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
