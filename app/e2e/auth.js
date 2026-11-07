// 비밀번호 찾기 on the login screen. Needs a build with dummy keys, so the login screen shows (no real server):
//   EXPO_PUBLIC_SUPABASE_URL=https://example.invalid EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy npx expo export --platform web --output-dir /tmp/webauth
// The reset link itself (todomateclone://reset-password#…) is read by AuthGate on the phone; scripts/test-authlink.ts covers the parsing.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 411, height: 891 } });
  const r = {};
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  r.login = await p.getByText("오늘 할 일을 시작해요").count();
  await p.getByText("비밀번호를 잊으셨나요?").click();
  r.resetTitle = await p.getByText("비밀번호 찾기").count();
  r.noPasswordField = (await p.getByLabel("비밀번호", { exact: true }).count()) === 0;
  await p.getByRole("button", { name: "재설정 메일 보내기" }).click();
  r.badEmail = await p.getByText("이메일 주소를 확인해 주세요").count();
  await p.getByLabel("이메일").fill("me@example.com");
  await p.getByRole("button", { name: "재설정 메일 보내기" }).click();
  await p.waitForTimeout(3000);
  r.errorShown = await p.getByText(/서버에 연결하지 못했어요|하지 못했어요/).allInnerTexts();
  await p.screenshot({ path: process.argv[2] + "/reset.png" });
  await p.getByText("로그인으로 돌아가기").click();
  r.back = await p.getByText("오늘 할 일을 시작해요").count();
  console.log(JSON.stringify(r));
  await b.close();
})();
