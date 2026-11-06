# Recon map: Prequel – Photo & Video Editor (Android)

Scope: the core editing loop — pick a photo or video, apply filters / effects /
adjustments, compare, export to the gallery. **The AI effects category is
excluded** (user's request). No accounts, no feed, no subscription.
For: the repo owner's personal, private use on their own Android phone. No store release.
Date: 2026-11-06

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Google Play listing | https://play.google.com/store/apps/details?id=com.prequel.app | blocked on this session's network; not read |
| 2 | App Store listing (US) | https://apps.apple.com/us/app/prequel-photo-video-editor/id1325756279 | blocked on network; content seen via search snippets |
| 3 | SourceForge product page | https://sourceforge.net/software/product/Prequel/ | "advanced adjustments for every filter and effect" |
| 4 | toolmage review | https://www.toolmage.com/en/tool/prequel/ | 800+ filters/effects, grouped by style |
| 5 | aichief listing | https://aichief.com/ai-video-tools/prequel-app | video editor: import clips, filters, music, templates |
| 6 | App Store index mirror | https://index.interceptd.com/detail/app/1325756279 | named effects: VHS, Glitch, Film, Neon, Retro, Vintage, Sparkles |

No screenshots were saved (store pages unreachable). Layout patterns below are
the generic photo-editor pattern the sources describe, written fresh.

## Core loop

Pick media → tap a style → tune intensity/adjustments → export. That's what people pay for.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Home | app launch | entry: new photo / new video, recent exports | big action cards, recent grid | empty (no exports), filled |
| S02 | Media picker | S01 → card | choose a photo or video from the gallery | system Photo Picker | cancelled, permission n/a (photo picker needs none) |
| S03 | Editor | after S02 | preview with live GL render; bottom tool tabs | preview surface, tab bar (Filters / Effects / Adjust / Crop), compare button, export button | loading, photo, video playing/paused, render error |
| S04 | Filters panel | S03 tab | colour looks grouped by category | category chips, thumbnail strip, intensity slider | none selected, selected |
| S05 | Effects panel | S03 tab | animated/overlay effects (VHS, glitch, grain, leaks…) by category | category chips, effect strip, intensity slider; multiple stackable | none, 1+ active |
| S06 | Adjust panel | S03 tab | brightness, contrast, saturation, … | tool icon strip, bipolar slider, reset | default, edited (dot marker) |
| S07 | Crop panel | S03 tab | aspect ratio, rotate, flip | ratio chips, rotate/flip buttons | free, fixed ratio |
| S08 | Export sheet | S03 → export | quality choice + progress + done | resolution options, progress bar, share/open | idle, exporting, success, failure |
| S09 | Video trim/speed | S03 tab (video only) | trim start/end, playback speed | range slider, speed chips | full, trimmed |

## Flows

```
F01 Edit a photo
    S01 -> S02 -> S03 -> S04 pick filter -> S05 add effect -> S06 tweak -> S08 save
    happy path taps: 6
    edge: huge image (memory), HEIC, portrait EXIF rotation, cancel picker

F02 Edit a video
    S01 -> S02 -> S03 (plays) -> S05 VHS -> S09 trim -> S08 export mp4
    happy path taps: 6
    edge: long video, odd resolution, no audio track, export cancelled, leaving app mid-export

F03 Compare before/after
    S03 press-and-hold compare button -> original shown -> release
    taps: 1 (hold)

F04 Reset
    S06 reset single tool / S03 "reset all"
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Action card | photo, video | pressed | S01 |
| Tool tab bar | 4–5 tabs | selected, unselected | S03 |
| Category chip row | text chips | selected, unselected | S04, S05 |
| Preset thumbnail | filter (colour swatch preview), effect (icon tile) | default, selected, active-in-stack | S04, S05 |
| Intensity slider | 0–100 unipolar, -100..100 bipolar | idle, dragging (value bubble) | S04–S06 |
| Icon button | compare (hold), undo, close, export | pressed, disabled | S03 |
| Bottom sheet | export | idle, progress, done, error | S08 |
| Range slider | trim | dragging | S09 |

## Inferred data model (local only, no backend)

```
Preset      id, name, kind (filter|effect), category, shader, defaultIntensity
            evidence: sources 4, 6 (named categories)  confidence: high
EditState   mediaUri, mediaType (photo|video), filterId?, filterIntensity,
            effects [ {presetId, intensity} ], adjust {key -> value},
            crop {ratio, rotation, flipH, flipV}, trim {startMs, endMs}, speed
            evidence: S03-S09 behaviour  confidence: medium
Export      uri, mediaType, createdAt   (read back from MediaStore folder)
            confidence: guess
```

Relationships: EditState 1–1 Preset(filter), EditState 1–n Preset(effect).

## Feature matrix

See `features.csv`. Must: 16, should: 10, could: 6, skip: 6.

## Out of scope (cannot or should not be cloned)

- **AI effects category** — excluded by the user.
- The original's 800+ preset library, its names, icons, LUTs and artwork — those
  belong to the original. The clone ships its own ~40 shader-built presets.
- Licensed music library, templates made by the original's creators.
- Subscription / paywall, account, social feed — not needed for personal use.

## Size

Screens 9, flows 4, entities 3. Hard parts: one GL shader pipeline shared by
photo preview, photo export and video export; real-time video preview with
effects; video export (encoding) on varied devices. Size: M.
