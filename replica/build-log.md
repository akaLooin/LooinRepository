# Build log

| ID | date | status | notes |
| --- | --- | --- | --- |
| shell | 2026-11-06 | done | Gradle project, Compose theme from tokens, icon from the owner's Looin logo |
| S01 Home | 2026-11-06 | done | photo/video cards, recent exports grid + empty state |
| S02 Picker | 2026-11-06 | done | system Photo Picker (no storage permission); also "share to Looin Studio" |
| S03 Editor | 2026-11-06 | done | GL photo preview, ExoPlayer video preview, compare (hold), undo/redo, shuffle, discard dialog |
| S04 Filters | 2026-11-06 | done | 30 original looks in 6 categories, real thumbnails, intensity, favourites (long-press) |
| S05 Effects | 2026-11-06 | done | 25 original GLSL effects in 6 categories, stack up to 5, per-effect intensity |
| S06 Adjust | 2026-11-06 | done | 13 tools, bipolar sliders, double-tap to reset one, reset all adjustments |
| S07 Crop | 2026-11-06 | partial | ratio crop (centred), rotate, flip H/V; no free crop box |
| S08 Export | 2026-11-06 | done | photo JPEG / photo-as-5s-clip / video mp4, quality choice, progress, cancel, open, share |
| S09 Trim | 2026-11-06 | done | range trim, speed 0.5–2x, mute |

Harder than expected: texture orientation between Bitmap uploads, Media3 and readback (fixed
once in the shared `tex()` helper and the `uFlipY` vertex uniform).

Verified here: all 28 shaders compile and render in WebGL (same GLSL ES 1.00);
see `clone-effects-sheet.png`. Release APK builds and is signed.
Not verified here: running on a real phone (there is no emulator in this environment).
