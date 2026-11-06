package com.looin.studio.model

import com.looin.studio.gl.Shaders

/** A colour look, rendered by [Shaders.LOOK]. All presets are original to Looin Studio. */
data class Look(
    val id: String,
    val name: String,
    val category: String,
    val matrix: FloatArray = IDENTITY,
    val offset: FloatArray = ZERO3,
    val lift: FloatArray = ZERO3,
    val gamma: FloatArray = ONE3,
    val gain: FloatArray = ONE3,
    val sat: Float = 1f,
    val contrast: Float = 1f,
    val shadowTint: FloatArray = HALF3,
    val highTint: FloatArray = HALF3,
    val split: Float = 0f,
    val fade: Float = 0f,
    val grain: Float = 0f,
    val vignette: Float = 0f,
) {
    companion object {
        val IDENTITY = floatArrayOf(1f, 0f, 0f, 0f, 1f, 0f, 0f, 0f, 1f)
        val ZERO3 = floatArrayOf(0f, 0f, 0f)
        val ONE3 = floatArrayOf(1f, 1f, 1f)
        val HALF3 = floatArrayOf(0.5f, 0.5f, 0.5f)
    }
}

/** An effect pass with its own shader. [animated] effects change over time. */
data class EffectDef(
    val id: String,
    val name: String,
    val category: String,
    val shader: String,
    val animated: Boolean,
    val defaultIntensity: Float = 0.7f,
    val needsOverlay: Boolean = false,
)

private fun v(r: Float, g: Float, b: Float) = floatArrayOf(r, g, b)

/** Column-major mat3 as GLSL expects; rows given here are output r, g, b. */
private fun mat(vararg rows: Float): FloatArray = floatArrayOf(
    rows[0], rows[3], rows[6],
    rows[1], rows[4], rows[7],
    rows[2], rows[5], rows[8],
)

object Presets {

    val lookCategories = listOf("빈티지", "필름", "시네마", "인디", "무드", "흑백")

    val looks: List<Look> = listOf(
        // ---- 빈티지 (vintage)
        Look("v_sunday", "Sunday", "빈티지", lift = v(0.06f, 0.04f, 0.02f), gain = v(1.02f, 0.98f, 0.9f),
            sat = 0.85f, contrast = 0.95f, fade = 0.08f, vignette = 0.25f),
        Look("v_polar", "Polar", "빈티지", lift = v(0.03f, 0.05f, 0.06f), gain = v(0.98f, 1f, 0.95f),
            sat = 0.75f, contrast = 0.9f, fade = 0.12f, highTint = v(0.56f, 0.53f, 0.45f), split = 0.3f),
        Look("v_peach", "Peach", "빈티지", offset = v(0.03f, 0.01f, -0.02f), gain = v(1.05f, 0.97f, 0.92f),
            sat = 0.9f, fade = 0.06f, shadowTint = v(0.55f, 0.45f, 0.5f), split = 0.25f),
        Look("v_70s", "Seventy", "빈티지", matrix = mat(0.95f, 0.1f, 0f, 0.05f, 0.9f, 0.05f, 0.05f, 0.15f, 0.7f),
            offset = v(0.04f, 0.02f, 0f), sat = 0.8f, contrast = 1.05f, fade = 0.06f, grain = 0.04f, vignette = 0.3f),
        Look("v_dusty", "Dusty", "빈티지", lift = v(0.08f, 0.07f, 0.06f), sat = 0.6f, contrast = 0.88f, fade = 0.1f, grain = 0.05f),

        // ---- 필름 (film)
        Look("f_gold", "Honey", "필름", gain = v(1.06f, 1.0f, 0.86f), lift = v(0.02f, 0.01f, 0f),
            sat = 1.1f, contrast = 1.05f, shadowTint = v(0.48f, 0.5f, 0.56f), split = 0.2f, grain = 0.03f),
        Look("f_port", "Skin", "필름", gain = v(1.03f, 0.99f, 0.94f), lift = v(0.03f, 0.02f, 0.02f),
            sat = 0.92f, contrast = 0.97f, highTint = v(0.55f, 0.51f, 0.46f), split = 0.2f, grain = 0.02f),
        Look("f_velvet", "Velvet", "필름", sat = 1.35f, contrast = 1.15f, gain = v(1.0f, 0.98f, 1.02f),
            shadowTint = v(0.5f, 0.46f, 0.55f), split = 0.2f),
        Look("f_superia", "Verdant", "필름", gain = v(0.96f, 1.03f, 0.98f), lift = v(0f, 0.02f, 0.02f),
            sat = 1.05f, contrast = 1.05f, shadowTint = v(0.44f, 0.54f, 0.52f), split = 0.3f, grain = 0.03f),
        Look("f_expired", "Expired", "필름", matrix = mat(0.9f, 0.15f, 0f, 0f, 0.95f, 0.1f, 0.1f, 0.1f, 0.8f),
            lift = v(0.05f, 0.03f, 0.08f), sat = 0.85f, contrast = 0.92f, fade = 0.1f, grain = 0.06f, vignette = 0.2f),
        Look("f_instant", "Instant", "필름", lift = v(0.07f, 0.06f, 0.04f), gain = v(1.0f, 0.97f, 0.88f),
            sat = 0.8f, contrast = 0.85f, fade = 0.1f, highTint = v(0.58f, 0.54f, 0.44f), split = 0.35f, vignette = 0.2f),

        // ---- 시네마 (cinema)
        Look("c_teal", "Teal Night", "시네마", sat = 1.05f, contrast = 1.12f,
            shadowTint = v(0.36f, 0.55f, 0.6f), highTint = v(0.64f, 0.52f, 0.4f), split = 0.6f, vignette = 0.3f),
        Look("c_noir", "Neon Noir", "시네마", sat = 1.2f, contrast = 1.2f, gamma = v(0.95f, 0.95f, 1.0f),
            shadowTint = v(0.45f, 0.38f, 0.62f), highTint = v(0.6f, 0.45f, 0.6f), split = 0.5f, vignette = 0.35f),
        Look("c_desert", "Dune", "시네마", gain = v(1.08f, 0.98f, 0.82f), sat = 0.9f, contrast = 1.1f,
            shadowTint = v(0.55f, 0.48f, 0.42f), split = 0.4f),
        Look("c_blockbuster", "Epic", "시네마", sat = 0.9f, contrast = 1.25f, gamma = v(1.05f, 1.0f, 0.95f),
            shadowTint = v(0.4f, 0.52f, 0.58f), highTint = v(0.62f, 0.52f, 0.42f), split = 0.45f, vignette = 0.25f),
        Look("c_bleach", "Bypass", "시네마", sat = 0.45f, contrast = 1.3f, gain = v(1.02f, 1.02f, 1.0f), grain = 0.03f),

        // ---- 인디 (indie)
        Look("i_mint", "Mint", "인디", gain = v(0.95f, 1.03f, 0.98f), lift = v(0.02f, 0.05f, 0.04f),
            sat = 0.85f, fade = 0.08f, shadowTint = v(0.45f, 0.56f, 0.52f), split = 0.3f),
        Look("i_lilac", "Lilac", "인디", gain = v(1.0f, 0.95f, 1.05f), lift = v(0.04f, 0.02f, 0.06f),
            sat = 0.85f, fade = 0.07f, highTint = v(0.55f, 0.48f, 0.58f), split = 0.3f),
        Look("i_cream", "Cream", "인디", lift = v(0.07f, 0.06f, 0.05f), gain = v(1.03f, 1.0f, 0.93f),
            sat = 0.7f, contrast = 0.85f, fade = 0.12f),
        Look("i_cherry", "Cherry", "인디", matrix = mat(1.1f, -0.05f, -0.05f, 0f, 0.95f, 0.05f, 0f, 0.05f, 0.95f),
            sat = 1.1f, contrast = 1.05f, shadowTint = v(0.55f, 0.45f, 0.48f), split = 0.25f),
        Look("i_sky", "Skyline", "인디", gain = v(0.94f, 1.0f, 1.08f), sat = 1.05f, contrast = 1.05f,
            highTint = v(0.47f, 0.52f, 0.58f), split = 0.3f),

        // ---- 무드 (mood)
        Look("m_moody", "Moody", "무드", sat = 0.75f, contrast = 1.15f, gamma = v(0.9f, 0.9f, 0.92f),
            shadowTint = v(0.45f, 0.5f, 0.55f), split = 0.3f, vignette = 0.4f),
        Look("m_dusk", "Dusk", "무드", gain = v(1.05f, 0.9f, 0.95f), sat = 0.95f, contrast = 1.05f,
            shadowTint = v(0.42f, 0.4f, 0.6f), highTint = v(0.65f, 0.5f, 0.45f), split = 0.5f),
        Look("m_forest", "Forest", "무드", gain = v(0.92f, 1.0f, 0.9f), sat = 0.85f, contrast = 1.1f,
            shadowTint = v(0.42f, 0.55f, 0.45f), split = 0.35f, vignette = 0.3f),
        Look("m_cold", "Frost", "무드", gain = v(0.9f, 0.98f, 1.08f), sat = 0.7f, contrast = 1.05f, lift = v(0.02f, 0.03f, 0.06f)),
        Look("m_ember", "Ember", "무드", gain = v(1.1f, 0.92f, 0.8f), sat = 1.1f, contrast = 1.15f, vignette = 0.45f,
            shadowTint = v(0.55f, 0.42f, 0.38f), split = 0.3f),

        // ---- 흑백 (mono)
        Look("b_classic", "Classic", "흑백", sat = 0f, contrast = 1.1f),
        Look("b_silver", "Silver", "흑백", sat = 0f, contrast = 1.3f, gamma = v(1.05f, 1.05f, 1.05f), grain = 0.05f),
        Look("b_soft", "Soft", "흑백", sat = 0f, contrast = 0.85f, fade = 0.12f),
        Look("b_sepia", "Sepia", "흑백", matrix = mat(0.39f, 0.77f, 0.19f, 0.35f, 0.69f, 0.17f, 0.27f, 0.53f, 0.13f),
            contrast = 1.05f, fade = 0.05f, vignette = 0.3f),
        Look("b_cyan", "Blueprint", "흑백", matrix = mat(0.2f, 0.6f, 0.1f, 0.25f, 0.7f, 0.12f, 0.3f, 0.8f, 0.15f),
            contrast = 1.1f),
    )

    val effectCategories = listOf("레트로", "글리치", "필름", "빛", "아트", "왜곡")

    val effects: List<EffectDef> = listOf(
        EffectDef("vhs", "VHS", "레트로", Shaders.VHS, animated = true),
        EffectDef("crt", "브라운관", "레트로", Shaders.CRT, animated = true),
        EffectDef("oldfilm", "8mm", "레트로", Shaders.OLD_FILM, animated = true),
        EffectDef("datestamp", "날짜 스탬프", "레트로", Shaders.DATE_STAMP, animated = true,
            defaultIntensity = 1f, needsOverlay = true),

        EffectDef("rgb", "RGB 분리", "글리치", Shaders.RGB_SHIFT, animated = true, defaultIntensity = 0.5f),
        EffectDef("glitch", "디지털", "글리치", Shaders.DIGITAL_GLITCH, animated = true, defaultIntensity = 0.5f),
        EffectDef("slice", "슬라이스", "글리치", Shaders.SLICE, animated = true, defaultIntensity = 0.5f),
        EffectDef("wave", "웨이브", "글리치", Shaders.WAVE, animated = true, defaultIntensity = 0.5f),

        EffectDef("grain", "그레인", "필름", Shaders.GRAIN, animated = true, defaultIntensity = 0.5f),
        EffectDef("dust", "먼지", "필름", Shaders.DUST, animated = true, defaultIntensity = 0.6f),
        EffectDef("burn", "필름 번", "필름", Shaders.FILM_BURN, animated = true),
        EffectDef("halation", "할레이션", "필름", Shaders.HALATION, animated = false, defaultIntensity = 0.6f),

        EffectDef("leak", "빛샘", "빛", Shaders.LIGHT_LEAK, animated = true),
        EffectDef("neon", "네온 글로우", "빛", Shaders.NEON_GLOW, animated = true, defaultIntensity = 0.6f),
        EffectDef("sparkle", "반짝이", "빛", Shaders.SPARKLE, animated = true, defaultIntensity = 0.8f),
        EffectDef("prism", "프리즘", "빛", Shaders.PRISM, animated = true, defaultIntensity = 0.6f),
        EffectDef("dreamy", "드리미", "빛", Shaders.DREAMY, animated = false, defaultIntensity = 0.6f),

        EffectDef("halftone", "하프톤", "아트", Shaders.HALFTONE, animated = false, defaultIntensity = 1f),
        EffectDef("poster", "포스터", "아트", Shaders.POSTER, animated = false, defaultIntensity = 0.6f),
        EffectDef("sketch", "스케치", "아트", Shaders.SKETCH, animated = false, defaultIntensity = 1f),
        EffectDef("duotone", "듀오톤", "아트", Shaders.DUOTONE_POP, animated = true, defaultIntensity = 0.8f),

        EffectDef("pixel", "픽셀", "왜곡", Shaders.PIXELATE, animated = false, defaultIntensity = 0.5f),
        EffectDef("mirror", "미러", "왜곡", Shaders.MIRROR, animated = false, defaultIntensity = 1f),
        EffectDef("fisheye", "어안", "왜곡", Shaders.FISHEYE, animated = false, defaultIntensity = 0.5f),
        EffectDef("kaleido", "만화경", "왜곡", Shaders.KALEIDO, animated = true, defaultIntensity = 1f),
    )

    private val lookById = looks.associateBy { it.id }
    private val effectById = effects.associateBy { it.id }
    fun look(id: String?): Look? = id?.let { lookById[it] }
    fun effect(id: String): EffectDef? = effectById[id]
}
