// 설정 laid out as the original (user's recording 2026-11-07): every row opens its screen; profile fields, interests,
// account (gender, birth month), privacy (all diaries' visibility), FAQ, 실험실.
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
  await p.goto("http://localhost:8765/settings", { waitUntil: "networkidle" });
  await p.screenshot({ path: `${out}/settings.png` });
  const rows = ["프로필", "계정", "개인정보 보호", "앱 권한", "화면", "알림", "공지사항", "내 스티커", "정보", "문의하기", "실험실"];
  r.rows = [];
  for (const name of rows) {
    await p.goto("http://localhost:8765/settings", { waitUntil: "networkidle" });
    await p.getByRole("button", { name, exact: true }).click(); await p.waitForTimeout(400);
    r.rows.push(`${name}:${await p.getByRole("button", { name: "뒤로 가기" }).count()}`);
  }
  // profile: ID with a bad value is refused, a good one saved; interests: pick two and a typed one
  await p.goto("http://localhost:8765/profile", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /^ID, / }).click(); await p.waitForTimeout(300);
  await p.getByLabel("ID", { exact: true }).fill("한글");
  await p.getByRole("button", { name: "확인" }).click(); await p.waitForTimeout(200);
  r.handleRefused = await p.getByText(/영문, 숫자/).count();
  await p.getByLabel("ID", { exact: true }).fill("Looin");
  await p.getByRole("button", { name: "확인" }).click(); await p.waitForTimeout(400);
  r.handle = await p.getByRole("button", { name: "ID, Looin" }).count();
  await p.getByRole("button", { name: /^관심사, / }).click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "To Do", exact: true }).click();
  await p.getByRole("button", { name: "직접 등록" }).click(); await p.waitForTimeout(300);
  await p.getByLabel("관심사 입력").fill("독서");
  await p.getByRole("button", { name: "추가" }).click(); await p.waitForTimeout(300);
  r.counter = await p.getByText("최대 등록 개수 2/10").count();
  await p.getByRole("button", { name: "확인" }).click(); await p.waitForTimeout(400);
  r.interests = await p.getByRole("button", { name: "관심사, To Do, 독서" }).count();
  // account: gender and birth month
  await p.goto("http://localhost:8765/settings/account", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /^성별, / }).click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "비이진" }).click(); await p.waitForTimeout(300);
  r.gender = await p.getByRole("button", { name: "성별, 비이진" }).count();
  await p.getByRole("button", { name: /^생년월, / }).click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "2001년" }).click();
  await p.getByRole("button", { name: "4월" }).click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "확인" }).click(); await p.waitForTimeout(400);
  r.birth = await p.getByRole("button", { name: "생년월, 2001.04" }).count();
  // privacy: all diaries to 나만 보기
  await p.goto("http://localhost:8765/settings/privacy", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /^할 일 좋아요 허용/ }).click(); await p.waitForTimeout(300);
  await p.getByRole("radio", { name: "팔로워" }).click();
  await p.getByRole("button", { name: "확인" }).click(); await p.waitForTimeout(300);
  r.likes = await p.getByRole("button", { name: "할 일 좋아요 허용, 팔로워" }).count();
  // FAQ opens an answer
  await p.goto("http://localhost:8765/settings/faq", { waitUntil: "networkidle" });
  await p.getByText(/^4\. 비밀번호를 잊어버렸어요/).click(); await p.waitForTimeout(200);
  r.faq = await p.getByText(/비밀번호를 잊으셨나요/).count();
  // 화면: small photo switch exists
  await p.goto("http://localhost:8765/settings/display", { waitUntil: "networkidle" });
  r.smallPhoto = await p.getByRole("switch", { name: "할 일 사진 작게 보기" }).count();
  // 마이 tab: gear goes to settings
  await p.goto("http://localhost:8765/me", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "설정" }).click(); await p.waitForTimeout(400);
  r.gear = p.url().endsWith("/settings");
  // 상태 이모지 on home: pick one, it replaces the 😊+ button; take it off again
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "상태 이모지 추가" }).click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "상태 이모지 📚" }).click(); await p.waitForTimeout(500);
  r.emojiShown = await p.getByRole("button", { name: "상태 이모지 📚, 바꾸기" }).count();
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(500);
  r.emojiKept = await p.getByRole("button", { name: "상태 이모지 📚, 바꾸기" }).count();
  await p.getByRole("button", { name: "상태 이모지 📚, 바꾸기" }).click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "이모지 없애기" }).click(); await p.waitForTimeout(500);
  r.emojiRemoved = await p.getByRole("button", { name: "상태 이모지 추가" }).count();
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
