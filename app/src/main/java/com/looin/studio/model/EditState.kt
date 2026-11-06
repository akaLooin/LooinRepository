package com.looin.studio.model

enum class MediaType { PHOTO, VIDEO }

enum class AdjustKey(val label: String, val bipolar: Boolean) {
    EXPOSURE("노출", true),
    BRIGHTNESS("밝기", true),
    CONTRAST("대비", true),
    SATURATION("채도", true),
    VIBRANCE("생동감", true),
    WARMTH("색온도", true),
    TINT("색조", true),
    HIGHLIGHTS("하이라이트", true),
    SHADOWS("그림자", true),
    FADE("페이드", false),
    VIGNETTE("비네트", true),
    SHARPEN("선명도", false),
    GRAIN("그레인", false),
}

enum class AspectRatio(val label: String, val value: Float?) {
    ORIGINAL("원본", null),
    SQUARE("1:1", 1f),
    PORTRAIT_4_5("4:5", 4f / 5f),
    PORTRAIT_3_4("3:4", 3f / 4f),
    STORY("9:16", 9f / 16f),
    WIDE("16:9", 16f / 9f),
}

data class Geometry(
    val ratio: AspectRatio = AspectRatio.ORIGINAL,
    /** Clockwise, multiple of 90. */
    val rotation: Int = 0,
    val flipH: Boolean = false,
    val flipV: Boolean = false,
) {
    val isIdentity get() = ratio == AspectRatio.ORIGINAL && rotation % 360 == 0 && !flipH && !flipV
}

data class ActiveEffect(val id: String, val intensity: Float)

/** Everything the user changed. Immutable, so undo/redo is a list of snapshots. */
data class EditState(
    val lookId: String? = null,
    val lookIntensity: Float = 1f,
    val effects: List<ActiveEffect> = emptyList(),
    val adjust: Map<AdjustKey, Float> = emptyMap(),
    val geometry: Geometry = Geometry(),
    val trimStartMs: Long = 0L,
    /** -1 = until the end. */
    val trimEndMs: Long = -1L,
    val speed: Float = 1f,
    val mute: Boolean = false,
) {
    fun toRender(): RenderState = RenderState(
        look = Presets.look(lookId),
        lookIntensity = lookIntensity,
        adjust = FloatArray(AdjustKey.entries.size) { adjust[AdjustKey.entries[it]] ?: 0f },
        effects = effects.mapNotNull { e -> Presets.effect(e.id)?.let { it to e.intensity } },
    )
}

/** What the GL chain needs; built from [EditState] and read from the GL threads. */
class RenderState(
    val look: Look?,
    val lookIntensity: Float,
    val adjust: FloatArray,
    val effects: List<Pair<EffectDef, Float>>,
) {
    val hasAdjust: Boolean get() = adjust.any { it != 0f }
    val animated: Boolean get() = effects.any { it.first.animated } || (adjust[AdjustKey.GRAIN.ordinal] != 0f)
    val isEmpty: Boolean get() = look == null && !hasAdjust && effects.isEmpty()

    companion object {
        val EMPTY = RenderState(null, 0f, FloatArray(AdjustKey.entries.size), emptyList())
    }
}
