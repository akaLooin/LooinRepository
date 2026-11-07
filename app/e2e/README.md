# Browser checks

Each script drives the web build in Chromium (Playwright) at 411×891 and prints a JSON result with any console errors.
They run against **demo mode** (no Supabase keys), so the sample data is the same every time.

```bash
npx expo export --platform web --output-dir /tmp/web     # build without .env.local values
node e2e/serve.js /tmp/web &                              # serves on http://localhost:8765 with SPA fallback
node e2e/slice.js /tmp/shots                              # second argument: where screenshots go
```

| script | covers |
| --- | --- |
| slice.js | home: add, check, to-do menu, 내일 또 하기, top menu |
| cat.js | categories: hex colour, visibility, new, end, delete |
| rt.js | routines: occurrences on home, manual-add row, repeat, time, new |
| pend.js | manual-add routine row adds with one tap |
| dd.js | D-days: list, new repeating, delete |
| home-options.js | calendar filter, 리스트 메뉴 (hide done, collapse), input at top |
| capture-for-diff.js | screenshots in the reference states for replica-diff |
| edge.js | edge cases from replica/test-plan.md (empty/long/emoji input, double submit, back mid-edit, long names, past D-day, direct-opened edit, 360 wide) and an axe scan |
| calendar.js | calendar swipe/arrows page months (1st / last day picked), title → today, edit mode and draft kept across days |
| auth.js | 비밀번호 찾기 screen, e-mail check, server error message (build with dummy keys, see the file) |
| settings.js | every 설정 row opens its screen; profile ID check, 관심사, 성별, 생년월, privacy sheet, FAQ, 마이 gear |
| menus.js | the to-do menu rows for today/past × done/undone match the original's four menus |
| sheets.js | drag sheets down to close, short drag springs back, 정보 보기 as a sheet, header buttons still tap |
| photos.js | proof photo, profile photo, diary photo (pass an image path as the 3rd argument) |
| inbox-listmenu.js | 보관함 as the page left of home (button, swipe there and back, add, 오늘하기) and 리스트 메뉴 |
| drag.js | hold-and-drag reorder: categories, D-days, home to-dos (survives reload), a to-do dragged into another category, routines |
| tm.js | timer start/pause, survives reload, info screen |
| chat.js | 대화 (demo): unread dot on 보내기, list → conversation, send text / big emoji / emoji panel, 전송됨 on the last one, read after opening, new conversation from a profile |
| friends.js | demo people: friend chip → friend home, heart → emoji/sticker reaction and take back, their diary (sheet, sticker reaction), 주간 보기, 둘러보기 search → profile → follow (clovers) / request, profile's home button, 알림, 마이 counts → 친구 lists |
| st.js | display settings (theme, week start), profile edit |
| dy.js | diary: mood, text, background, reopen, empty removes |
| rm.js | reminders add/duplicate/delete, to-do alarm |

Unit tests (no browser): `npm test`.
