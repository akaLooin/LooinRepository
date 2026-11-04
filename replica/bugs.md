# Bugs

Found by `/replica-test` on 2026-11-04. Only reproduced bugs are listed. Severity: S1 data loss/security/core blocked · S2 feature broken, no workaround · S3 broken with a workaround or visibly wrong · S4 cosmetic.

| ID | sev | steps | expected | actual | evidence | status |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | S3 | Rename a category to 30 characters, open home | the pill shortens with "…" and its + stays on screen | the pill pushed + off the right edge (x 522 on a 411 screen); no way to add to that category from home | edge.js F02-E3 | fixed in 33c47c8 |
| B2 | S3 | Open an edit screen directly (refresh on /ddays/new, or a link), press 완료 | saves and returns to the list | saved but stayed on the edit screen (no history to go back to) | edge.js F07-E2 | fixed (goBack falls back to the list) |
| B3 | S3 | Screen reader on the web, focus a to-do's clover | hears checked / not checked | role checkbox without aria-checked (axe aria-required-attr) | edge.js axe on / and /inbox | fixed (aria-checked) |
| B4 | S4 | Diary without a profile photo | placeholder announced as an image | aria-label on a plain div (axe aria-prohibited-attr) | edge.js axe on /diary | fixed (role img) |
| B5 | S2 | Drag a bottom sheet down, then drag it again after it sprang back | second drag closes it too | second drag did nothing on the web (gesture reused the first drag's start point) | sheets.js | fixed before release of the feature (claim on touch) |
| B6 | S3 | On the web, pick a photo, reload | photo still shows | photo broken (blob URL gone after reload) | photos.js | fixed (data URL on web; native files unaffected) |

## To check (not confirmed as bugs)

- axe **label-content-name-mismatch** (home 30, categories 2, routine edit 4, display 3): read-aloud labels such as "11월 3일" differ from the visible "3" plus the clover count. Low impact; revisit with a real screen reader (TalkBack).
- axe **color-contrast** on 설정 → 화면: the dimmed "준비 중" rows are intentionally inactive.
- Native photo files live in the cache folder until uploaded; in demo mode (no account) the OS could clear them. Copying to the document folder would need expo-file-system.
- Not run on a real phone yet: notifications ringing, Storage upload, real two-device sync.
