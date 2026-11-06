# Architecture: Looin Studio (Android, personal use)

Reads `recon.md` + `features.csv`. No backend: everything happens on the phone.

## Stack

| layer | choice | why |
| --- | --- | --- |
| app | Kotlin + Jetpack Compose (Material 3) | native Android, the only target |
| GPU | OpenGL ES 2.0, hand-written GLSL | runs on every Android phone; one shader set for photo and video |
| video preview | Media3 ExoPlayer + `setVideoEffects` | official, plays any gallery video, accepts custom GL effects |
| video export | Media3 Transformer (H.264 mp4) | hardware encoder, keeps audio, trim/speed built in |
| storage | MediaStore (`Pictures/LooinStudio`, `Movies/LooinStudio`) | no storage permission needed on Android 10+ |
| prefs | SharedPreferences | favourites only |
| build | Gradle 8.14 / AGP 8.7 / minSdk 29 / targetSdk 35 | |

No database, no network, no accounts → no schema and no API routes.

## The one idea

`gl/ChainRenderer` runs `look → adjust → effects…` as ping-pong full-screen passes. It is
used in four places, so they always match:

1. photo preview (`PhotoPreviewView`, a GLSurfaceView)
2. photo export and preset thumbnails (`OffscreenRenderer`, private EGL pbuffer context)
3. video preview (`ChainGlEffect` inside ExoPlayer's effect pipeline)
4. video export (`ChainGlEffect` inside Transformer)

Effects work in picture-uv space, not pixels, so a 1600 px preview and a 4096 px export look the same.

## Data (in memory)

`EditState` (immutable data class) → undo/redo is a stack of snapshots.
`RenderState` is derived from it and read by the GL threads (video reads it per frame).

## Parts that bite

- GL texture orientation: Bitmap uploads are flipped once in `tex()` on the first pass; the
  offscreen readback is flipped in the vertex shader (`uFlipY`) so no extra bitmap is needed.
- Geometry (crop/rotate) changes frame size: photos do it on the CPU bitmap; video uses Media3
  `ScaleAndRotateTransformation` / `Presentation` and rebuilds the preview player.
- Memory: export is capped at 4096 px and at the GPU's `GL_MAX_TEXTURE_SIZE`.
- Video export runs on the main looper (Transformer requirement) and is cancellable.

## Build order (as built)

1. Vertical slice: pick photo → filter → save.  2. Effects + adjust.  3. Video preview/export.
4. Crop, trim, speed, mute.  5. Undo/redo, favourites, shuffle, compare, recent exports, share-in.
