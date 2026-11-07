// 대화 (demo people): the dot on 보내기, list → conversation, send text / emoji (large) / from the emoji panel,
// 전송됨, back to the list with the new preview, and a new conversation from a profile's paper plane.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  r.dot = await p.getByRole("tab", { name: "보내기, 새 메시지" }).count();
  await p.getByRole("tab", { name: /^보내기/ }).click();
  await p.waitForTimeout(600);
  r.listRow = await p.getByRole("button", { name: /토끼와의 대화, 안 읽은 메시지 1개/ }).count();
  r.preview = await p.getByText("오늘 운동 같이 할래?").count();
  await p.screenshot({ path: `${out}/chat-list.png` });
  await p.getByRole("button", { name: /토끼와의 대화/ }).click();
  await p.waitForTimeout(800);
  r.firstMessage = await p.getByText("오늘 운동 같이 할래?").count();
  await p.getByLabel("메시지 입력").fill("좋아! 7시에 보자");
  await p.getByRole("button", { name: "보내기", exact: true }).click();
  await p.waitForTimeout(500);
  r.sent = await p.getByText("좋아! 7시에 보자").count();
  r.sentState = await p.getByText("전송됨").count();
  await p.getByLabel("메시지 입력").fill("🔥");
  await p.getByLabel("메시지 입력").press("Enter"); // multiline: Enter adds a line, so use the button
  await p.getByRole("button", { name: "보내기", exact: true }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "스티커·이모지 보내기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "다 했다 반응", exact: true }).click();
  await p.waitForTimeout(500);
  r.stickerSent = await p.getByLabel("다 했다 스티커").count();
  await p.getByRole("button", { name: "스티커·이모지 보내기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("tab", { name: "하트·축하" }).click();
  await p.waitForTimeout(200);
  await p.getByRole("button", { name: "💜 반응", exact: true }).click();
  await p.waitForTimeout(500);
  r.emojiSent = await p.getByText("💜", { exact: true }).count();
  r.oneState = await p.getByText("전송됨").count(); // only beside my last message
  await p.screenshot({ path: `${out}/chat.png` });
  await p.getByRole("button", { name: "뒤로 가기" }).click();
  await p.waitForTimeout(800);
  r.readNow = await p.getByRole("button", { name: /안 읽은 메시지/ }).count() === 0;
  r.newPreview = await p.getByText("💜").count();
  r.dotGone = await p.getByRole("tab", { name: "보내기, 새 메시지" }).count() === 0;

  // a new conversation from a profile
  await p.getByRole("tab", { name: "둘러보기" }).click();
  await p.waitForTimeout(400);
  await p.getByLabel("계정 또는 크루 찾기").fill("다람");
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: "다람쥐 프로필" }).click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "대화", exact: true }).click();
  await p.waitForTimeout(800);
  r.intro = await p.getByText("다람쥐님과의 대화예요", { exact: false }).count();
  await p.getByLabel("메시지 입력").fill("안녕");
  await p.getByRole("button", { name: "보내기", exact: true }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "뒤로 가기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("tab", { name: /^보내기/ }).click();
  await p.waitForTimeout(800);
  r.twoRooms = await p.getByRole("button", { name: /와의 대화/ }).count();
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
