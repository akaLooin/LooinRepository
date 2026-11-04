package com.looin.filmcam.gl

import android.content.res.AssetManager
import android.graphics.BitmapFactory
import android.opengl.GLES20
import com.looin.filmcam.film.FilmLook
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min

/** 셰이더에 넘기는 값. 미리보기와 현상이 같은 값을 쓴다. */
data class FilmParams(
    val filmId: String,
    val exposure: Float,
    val grain: Float,
    val vignette: Float,
    val warmth: Float,
    val leak: Float,
    val leakX: Float,
    val leakY: Float,
    val leakR: Float,
    val leakG: Float,
    val leakB: Float,
    val distortion: Float,
    val seed: Float,
)

/** seed가 없으면 미리보기(고정 위치), 있으면 컷마다 다른 빛샘 위치. */
fun FilmLook.params(seed: Long? = null): FilmParams {
    var lx = 1.0f
    var ly = 0.8f
    if (seed != null) {
        val r1 = ((seed * 2654435761L) and 0xffff).toFloat() / 0xffff
        val r2 = ((seed * 40503L + 12345L) and 0xffff).toFloat() / 0xffff
        when ((seed and 3L).toInt()) { // 네 변 중 하나에서 들어오는 빛
            0 -> { lx = 0f; ly = r1 }
            1 -> { lx = 1f; ly = r1 }
            2 -> { lx = r2; ly = 0f }
            else -> { lx = r2; ly = 1f }
        }
    }
    val c = film.leakColor
    return FilmParams(
        filmId = film.id,
        exposure = exposureEv,
        grain = film.grain,
        vignette = body.vignette,
        warmth = body.warmth,
        leak = film.leak,
        leakX = lx, leakY = ly,
        leakR = c.getOrElse(0) { 1f }, leakG = c.getOrElse(1) { 1f }, leakB = c.getOrElse(2) { 1f },
        distortion = lens.distortion,
        seed = ((seed ?: 7L) % 997L).toFloat(),
    )
}

object FilmShader {
    const val LUT_SIZE = 33

    const val VERTEX = """
attribute vec4 aPos;
varying vec2 vPos;
void main() {
    gl_Position = aPos;
    vPos = aPos.xy * 0.5 + 0.5;
}
"""

    fun fragment(oes: Boolean): String =
        (if (oes) "#extension GL_OES_EGL_image_external : require\n#define SAMPLER samplerExternalOES\n"
        else "#define SAMPLER sampler2D\n") + FRAGMENT

    private const val FRAGMENT = """
precision highp float;
varying vec2 vPos;
uniform SAMPLER uInput;
uniform mat4 uTexMatrix;
uniform sampler2D uLut;
uniform float uLutSize;
uniform float uExposure;
uniform float uGrain;
uniform float uGrainScale;
uniform float uSeed;
uniform float uVignette;
uniform float uWarmth;
uniform float uLeak;
uniform vec2 uLeakPos;
uniform vec3 uLeakColor;
uniform float uDistortion;
uniform vec2 uRes;

// 33x33x33 LUT를 가로로 펼친 텍스처 (x = b*N + r, y = g). 파랑 축만 수동 보간.
vec3 applyLut(vec3 c) {
    float n = uLutSize;
    float b = c.b * (n - 1.0);
    float b0 = floor(b);
    float b1 = min(b0 + 1.0, n - 1.0);
    float x = (c.r * (n - 1.0) + 0.5) / (n * n);
    float y = (c.g * (n - 1.0) + 0.5) / n;
    vec3 c0 = texture2D(uLut, vec2(x + b0 / n, y)).rgb;
    vec3 c1 = texture2D(uLut, vec2(x + b1 / n, y)).rgb;
    return mix(c0, c1, b - b0);
}

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031 + uSeed * 0.013);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 d = vPos - 0.5;
    float r2 = dot(d, d);
    vec2 p = 0.5 + d * (1.0 + uDistortion * r2) / (1.0 + uDistortion * 0.25);
    vec2 tc = (uTexMatrix * vec4(p, 0.0, 1.0)).xy;
    vec3 c = texture2D(uInput, tc).rgb;

    c = clamp(c * exp2(uExposure), 0.0, 1.0);
    c = applyLut(c);
    c.r += uWarmth;
    c.b -= uWarmth;

    float vig = 1.0 - uVignette * smoothstep(0.35, 1.0, length(d) * 1.414);
    c *= vig;

    float aspect = uRes.x / uRes.y;
    float l = uLeak * (1.0 - smoothstep(0.0, 0.9, length((vPos - uLeakPos) * vec2(aspect, 1.0))));
    c = 1.0 - (1.0 - c) * (1.0 - uLeakColor * l);

    vec2 g = floor(vPos * uRes / uGrainScale);
    float noise = hash(g) + hash(g + 17.0) - 1.0;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c += noise * uGrain * (1.0 - lum * 0.6);

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
}

/** 셰이더 프로그램 + LUT 텍스처 캐시. GL 스레드에서만 사용. */
class FilmProgram(oes: Boolean, private val assets: AssetManager) {
    private val program = GlUtil.program(FilmShader.VERTEX, FilmShader.fragment(oes))
    private val aPos = GLES20.glGetAttribLocation(program, "aPos")
    private val locs = HashMap<String, Int>()
    private val quad = ByteBuffer.allocateDirect(32).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {
        put(floatArrayOf(-1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f)); position(0)
    }
    private var lutTex = 0
    private var lutFilm: String? = null

    private fun loc(name: String) = locs.getOrPut(name) { GLES20.glGetUniformLocation(program, name) }

    private fun ensureLut(filmId: String) {
        if (filmId == lutFilm) return
        if (lutTex != 0) GlUtil.deleteTexture(lutTex)
        val bmp = assets.open("luts/$filmId.png").use {
            BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inScaled = false })
        } ?: error("LUT 없음: $filmId")
        lutTex = GlUtil.bitmapTexture(bmp)
        bmp.recycle()
        lutFilm = filmId
    }

    fun draw(target: Int, inputTex: Int, texMatrix: FloatArray, p: FilmParams, w: Int, h: Int) {
        ensureLut(p.filmId)
        GLES20.glViewport(0, 0, w, h)
        GLES20.glUseProgram(program)

        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
        GLES20.glBindTexture(target, inputTex)
        GLES20.glUniform1i(loc("uInput"), 0)
        GLES20.glActiveTexture(GLES20.GL_TEXTURE1)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, lutTex)
        GLES20.glUniform1i(loc("uLut"), 1)

        GLES20.glUniformMatrix4fv(loc("uTexMatrix"), 1, false, texMatrix, 0)
        GLES20.glUniform1f(loc("uLutSize"), FilmShader.LUT_SIZE.toFloat())
        GLES20.glUniform1f(loc("uExposure"), p.exposure)
        GLES20.glUniform1f(loc("uGrain"), p.grain)
        // 그레인 알갱이 크기를 출력 해상도에 비례시켜 미리보기와 결과가 같아 보이게
        GLES20.glUniform1f(loc("uGrainScale"), max(1f, min(w, h) / 720f))
        GLES20.glUniform1f(loc("uSeed"), p.seed)
        GLES20.glUniform1f(loc("uVignette"), p.vignette)
        GLES20.glUniform1f(loc("uWarmth"), p.warmth)
        GLES20.glUniform1f(loc("uLeak"), p.leak)
        GLES20.glUniform2f(loc("uLeakPos"), p.leakX, p.leakY)
        GLES20.glUniform3f(loc("uLeakColor"), p.leakR, p.leakG, p.leakB)
        GLES20.glUniform1f(loc("uDistortion"), p.distortion)
        GLES20.glUniform2f(loc("uRes"), w.toFloat(), h.toFloat())

        GLES20.glVertexAttribPointer(aPos, 2, GLES20.GL_FLOAT, false, 0, quad)
        GLES20.glEnableVertexAttribArray(aPos)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
        GLES20.glDisableVertexAttribArray(aPos)
    }

    fun release() {
        if (lutTex != 0) GlUtil.deleteTexture(lutTex)
        GLES20.glDeleteProgram(program)
    }
}
