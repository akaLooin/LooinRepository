// 사진 크게 보기: tapping a photo opens the full-screen viewer; two-finger zoom is checked by its transform, the ⋯ menu
// offers 사진 저장 (and 신고하기 only for someone else's photo); ✕ closes. Uses a diary photo set through the page.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAIAAABd+SbeAAABtElEQVR4nO2cMU4DQRAEbYvHEPESBzyHZxHwEmIe42ATSwiwLaa6z66KLW9fqW92Tzrd/vntayfzHNIBHgVFQygaQtEQioZQNISiIRQNoWiIp3SAi/h8Pf7+g5f3DybJzexrH8H/lPsTndIbRd+s+Jw23UWi/8Xvd0qMt2yGQ5ZH//kq8o3GRGSrHW40WbdstZOi+SsPuo6JTl1zat2M6OxdHFk9ILrhGMBnoEU3WF7ASVDRPZYXZB5OdJvlBZaq5cnw7oFEd9Z5wWQjRDdbXgAJHR0QioYYF90/NxbTOW00xKzordR5MZrWRkMoGkLREIOitzWgF3OZbTSEoiEUDaFoCEVDKBpC0RCKhlA0hKIhBkWXvAF+FXOZbTSEoiEUDTEreltjejStjYYYF72VUk/ntNEQioYgRPdPDyAh1Ohm10w2RwcEJ7qz1FgqtNFtrsk89OjocQ0nCczoBtd8hsxmmHUdWT126ki5Tq2bPN7x1xy8k8LnaPLKs/Mq/6mfxeg7vg3bb8uT4ZyLBsu7nkaf43fvUPySYwC/TSqX0rIZ3j2KhlA0hKIhFA2haAhFQyga4gT1HX5xm6xnKQAAAABJRU5ErkJggg==";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  // a diary with one photo on today's date, written straight into the demo store
  await p.evaluate((png) => {
    const d = new Date(); const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const raw = JSON.parse(localStorage.getItem("todomate:demo") || "null");
    if (raw) { raw.db.diaries = [{ id: "e2e-diary", date: day, body: "사진 일기", visibility: "private", imagePaths: [png] }]; localStorage.setItem("todomate:demo", JSON.stringify(raw)); }
  }, PNG);
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  if (!(await p.getByRole("button", { name: "오늘의 일기 보기" }).count())) {
    // the store had not been saved yet on first load: save once through the UI
    await p.getByRole("button", { name: "일기 쓰기" }).first().click(); await p.waitForTimeout(400);
    await p.getByLabel("일기 내용").fill("사진 일기"); await p.getByRole("button", { name: "완료" }).click(); await p.waitForTimeout(600);
    await p.evaluate((png) => { const raw = JSON.parse(localStorage.getItem("todomate:demo")); raw.db.diaries[0].imagePaths = [png]; localStorage.setItem("todomate:demo", JSON.stringify(raw)); }, PNG);
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(700);
  }
  await p.getByRole("button", { name: "오늘의 일기 보기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "일기 메뉴" }).click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "수정" }).click(); await p.waitForTimeout(700);
  await p.getByLabel("일기 사진 1, 크게 보기").click();
  await p.waitForTimeout(600);
  r.viewer = await p.getByLabel("일기 사진 1").count();
  await p.screenshot({ path: `${out}/photo-view.png` });
  await p.getByRole("button", { name: "사진 메뉴" }).click();
  await p.waitForTimeout(300);
  r.save = await p.getByRole("button", { name: "사진 저장" }).count();
  r.noReportOnMine = await p.getByRole("button", { name: "신고하기" }).count() === 0;
  await p.getByRole("button", { name: "취소" }).click();
  await p.waitForTimeout(200);
  await p.getByRole("button", { name: "닫기" }).last().click();
  await p.waitForTimeout(400);
  r.closed = await p.getByRole("button", { name: "사진 메뉴" }).count() === 0;
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
