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
| dd.js | D-days: list, reorder, new repeating, delete |
| tm.js | timer start/pause, survives reload, info screen |
| st.js | display settings (theme, week start), profile edit |
| dy.js | diary: mood, text, background, reopen, empty removes |
| rm.js | reminders add/duplicate/delete, to-do alarm |

Unit tests (no browser): `npm test`.
