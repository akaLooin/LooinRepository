// Photo proof on a to-do, profile photo, diary photo (web: the picker is a file input). Pass an image path as argv[3].
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
const img = process.argv[3];
async function pick(p, trigger) {
  const [chooser] = await Promise.all([p.waitForEvent("filechooser", { timeout: 10000 }), trigger()]);
  await chooser.setFiles(img);
  await p.waitForTimeout(1500); // resize happens on a canvas
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click();

  await p.getByText("책 30쪽 읽기").click();
  await p.waitForTimeout(400);
  await pick(p, () => p.getByText("사진 인증").click());
  r.rowPhoto = await p.getByLabel("인증 사진").count();
  const size = await p.getByLabel("인증 사진").first().evaluate((el) => { const i = el.querySelector("img") || el; return [i.naturalWidth || 0, i.naturalHeight || 0]; });
  r.resized = size;
  await p.screenshot({ path: `${out}/photo-row.png` });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  r.afterReload = await p.getByLabel("인증 사진").count();
  await p.getByText("책 30쪽 읽기").click();
  await p.waitForTimeout(400);
  r.menuChanged = await p.getByText("사진 바꾸기").count();
  await p.getByText("정보 보기").click();
  await p.waitForTimeout(500);
  r.infoPhoto = await p.getByLabel("인증 사진").count();

  await p.goto("http://localhost:8765/profile", { waitUntil: "networkidle" });
  await pick(p, () => p.getByRole("button", { name: "프로필 사진 바꾸기", exact: true }).click());
  await p.getByRole("button", { name: "확인" }).click();
  await p.waitForTimeout(500);
  r.homeAvatar = await p.getByLabel("프로필 사진").count();

  await p.goto("http://localhost:8765/diary/2026-11-03", { waitUntil: "networkidle" });
  await pick(p, () => p.getByRole("button", { name: "사진 넣기" }).click());
  r.diaryThumb = await p.getByLabel("일기 사진 1", { exact: true }).count();
  await p.screenshot({ path: `${out}/photo-diary.png` });
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(400);
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.getByLabel("11월 3일", { exact: true }).first().click();
  r.diarySaved = await p.getByRole("button", { name: "일기 보기" }).count();
  await p.goto("http://localhost:8765/diary/2026-11-03", { waitUntil: "networkidle" });
  r.diaryPhotoKept = await p.getByLabel("일기 사진 1", { exact: true }).count();
  r.errs = errs;
  console.log(JSON.stringify(r));
  await b.close();
})();
