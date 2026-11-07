// Friends (demo people): chip row → friend home, heart → reaction and back, 둘러보기 search → profile → follow
// (clovers; approval → 요청됨), profile's home button, 친구 lists, 알림, 마이 counts.
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

  // the friend I follow has a chip; tapping it shows their home
  await p.getByRole("button", { name: "토끼", exact: true }).click();
  await p.waitForTimeout(600);
  r.friendName = await p.getByText("매일 조금씩").count();
  r.friendTodo = await p.getByText("운동하기", { exact: true }).count();
  r.privateNoAdd = await p.getByRole("button", { name: "To Do에 할 일 추가" }).count(); // read only
  await p.screenshot({ path: `${out}/friend-home.png` });
  await p.getByRole("button", { name: "운동하기에 반응하기" }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/friend-react.png` });
  r.stickersFirst = await p.getByRole("button", { name: "최고 반응", exact: true }).count();
  await p.getByRole("tab", { name: "하트·축하" }).click();
  await p.waitForTimeout(200);
  await p.getByRole("button", { name: "🔥 반응", exact: true }).click();
  await p.waitForTimeout(500);
  r.reacted = await p.getByRole("button", { name: "운동하기 반응 바꾸기" }).count();
  r.emojiShown = await p.getByLabel("반응 🔥").count();
  await p.screenshot({ path: `${out}/friend-reacted.png` });
  // the same pick again takes it back
  await p.getByRole("button", { name: "운동하기 반응 바꾸기" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "🔥 반응 지우기" }).click();
  await p.waitForTimeout(400);
  r.cleared = await p.getByRole("button", { name: "운동하기에 반응하기" }).count();
  // a sticker (our own 클로버 친구들) on another to-do
  await p.getByRole("button", { name: "일기 쓰기에 반응하기" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("tab", { name: "스티커" }).click();
  await p.waitForTimeout(200);
  await p.getByRole("button", { name: "최고 반응", exact: true }).click();
  await p.waitForTimeout(500);
  r.stickerShown = await p.getByLabel("반응 최고").count();
  await p.screenshot({ path: `${out}/friend-sticker.png` });
  // their diary of the day, with its own heart
  await p.getByRole("button", { name: "토끼의 일기 보기" }).click();
  await p.waitForTimeout(500);
  r.diaryText = await p.getByText("날씨가 좋아서 기분도 좋았다", { exact: false }).count();
  await p.getByRole("button", { name: "일기에 반응하기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("tab", { name: "스티커" }).click();
  await p.waitForTimeout(200);
  await p.getByRole("button", { name: "고마워 반응", exact: true }).click();
  await p.waitForTimeout(500);
  r.diaryReacted = await p.getByRole("button", { name: "일기 반응 바꾸기" }).count();
  r.diarySticker = await p.getByLabel("반응 고마워").count();
  await p.screenshot({ path: `${out}/friend-diary.png` });
  await p.mouse.click(200, 60); // tap the dimmed area above the sheet to close it
  await p.waitForTimeout(500);
  // week view, as on my home
  await p.getByRole("button", { name: "주간 보기" }).click();
  await p.waitForTimeout(500);
  r.weekTitle = await p.getByText(/주차$/).count();
  const t1 = await p.getByText(/주차$/).first().textContent();
  await p.getByRole("button", { name: "다음" }).click();
  await p.waitForTimeout(500);
  r.weekMoved = (await p.getByText(/주차$/).first().textContent()) !== t1 || (await p.getByText(/월 \d+일 .요일$/).count()) > 0;
  await p.screenshot({ path: `${out}/friend-week.png` });
  await p.getByRole("button", { name: "이전" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: "월간 보기" }).click();
  await p.waitForTimeout(400);
  r.monthBack = await p.getByText(/^\d{4}년 \d+월$/).count();

  // back to me
  await p.getByRole("button", { name: /^(나|체험|.+)$/ }).nth(1).click(); // the chip after 보관함 is mine
  await p.waitForTimeout(400);
  r.backToMe = await p.getByRole("button", { name: "운동하기에 반응하기" }).count() === 0;

  // 둘러보기: search, open profile, follow (clovers), the chip appears on home
  await p.getByRole("tab", { name: "둘러보기" }).click();
  await p.waitForTimeout(400);
  await p.getByLabel("계정 또는 크루 찾기").fill("다람");
  await p.waitForTimeout(800);
  r.found = await p.getByRole("button", { name: "다람쥐 프로필" }).count();
  await p.getByRole("button", { name: "다람쥐 프로필" }).click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "팔로우", exact: true }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/profile-follow.png` });
  r.following = await p.getByRole("button", { name: "팔로잉", exact: true }).count();
  await p.getByRole("button", { name: "다람쥐의 홈" }).click();
  await p.waitForTimeout(800);
  r.homeOfFriend = await p.getByText("도토리 모으는 중").count();
  r.newChip = await p.getByRole("button", { name: "다람쥐", exact: true }).count();

  // approval on → request
  await p.getByRole("tab", { name: "둘러보기" }).click();
  await p.waitForTimeout(400);
  await p.getByLabel("계정 또는 크루 찾기").fill("owl");
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: "부엉이 프로필" }).click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "팔로우", exact: true }).click();
  await p.waitForTimeout(400);
  r.requested = await p.getByRole("button", { name: "요청됨", exact: true }).count();
  await p.getByRole("button", { name: "닫기" }).first().click();
  await p.waitForTimeout(400);

  // 알림, 마이 counts → 친구 lists
  await p.getByRole("tab", { name: "알림" }).click();
  await p.waitForTimeout(500);
  r.alertsEmpty = await p.getByText("아직 알림이 없어요").count();
  await p.getByRole("tab", { name: "마이" }).click();
  await p.waitForTimeout(500);
  r.counts = await p.getByRole("button", { name: "팔로잉 2" }).count();
  await p.getByRole("button", { name: "팔로잉 2" }).click();
  await p.waitForTimeout(600);
  r.list = await p.getByRole("button", { name: "다람쥐 프로필" }).count();
  await p.screenshot({ path: `${out}/people.png` });
  await p.getByRole("tab", { name: "팔로워" }).click();
  await p.waitForTimeout(400);
  r.followers = await p.getByRole("button", { name: "토끼 프로필" }).count();

  // reactions friends left on my diary (demo: 토끼 leaves 고마워 on every diary of mine)
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: "일기 쓰기" }).click();
  await p.waitForTimeout(600);
  await p.getByLabel("일기 내용").fill("오늘도 잘 해냈다");
  await p.getByRole("button", { name: "완료" }).click();
  await p.waitForTimeout(800);
  r.homeDiaryReaction = await p.getByLabel("반응 고마워").count();
  await p.getByRole("button", { name: "일기 보기" }).click();
  await p.waitForTimeout(800);
  r.diaryReceived = await p.getByText("받은 반응 1").count();
  r.diaryFrom = await p.getByText("토끼", { exact: true }).count();
  await p.screenshot({ path: `${out}/my-diary-received.png` });
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
