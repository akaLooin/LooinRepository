// 친구 소식 in 둘러보기 (demo people): finished to-dos and a diary of the friend I follow, a sticker reaction,
// 설정 → 화면 → 피드에서 좋아요 보이기 off hides the reactions; searching replaces the feed.
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
  await p.getByRole("tab", { name: "둘러보기" }).click();
  await p.waitForTimeout(800);
  r.header = await p.getByRole("heading", { name: "친구 소식" }).count();
  r.doneTodo = await p.getByText("아침 산책", { exact: true }).count();
  r.notDone = await p.getByText("장보기", { exact: true }).count(); // tomorrow's, not done: not in the feed
  r.diary = await p.getByText("날씨가 좋아서", { exact: false }).count();
  await p.getByRole("button", { name: "아침 산책 반응 바꾸기" }).or(p.getByRole("button", { name: "아침 산책에 반응하기" })).first().click();
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "최고 반응", exact: true }).click();
  await p.waitForTimeout(400);
  r.reacted = await p.getByRole("button", { name: "아침 산책 반응 바꾸기" }).count();
  r.stickerShown = await p.getByLabel(/^반응 .*최고/).count();
  await p.screenshot({ path: `${out}/feed.png` });
  // likes hidden in the feed
  await p.goto("http://localhost:8765/settings/display", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.getByRole("switch", { name: "피드에서 좋아요 보이기" }).click();
  await p.waitForTimeout(200);
  await p.goto("http://localhost:8765/explore", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  r.hiddenLikes = await p.getByLabel(/^반응 /).count() === 0;
  // search replaces the feed
  await p.getByLabel("계정 또는 크루 찾기").fill("다람");
  await p.waitForTimeout(800);
  r.searchShown = await p.getByRole("button", { name: "다람쥐 프로필" }).count();
  r.feedGone = await p.getByRole("heading", { name: "친구 소식" }).count() === 0;
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
