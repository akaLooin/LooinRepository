package com.looin.studio.gl

/**
 * All GLSL used by the app. Every pass shares the same vertex shader and uniform names:
 *  uTex (sampler2D), uIntensity (0..1), uTime (seconds), uRes (output size in px).
 * Textures inside the chain are "GL upright": vUv (0,0) is the bottom-left of the picture.
 * Effects work in uv space (not pixels) so a 1600px preview and a 4000px export look the same.
 */
object Shaders {

    const val VERTEX = """
attribute vec4 aPosition;
attribute vec2 aTexCoord;
uniform float uFlipY;
varying vec2 vUv;
void main() {
    gl_Position = vec4(aPosition.x, aPosition.y * uFlipY, 0.0, 1.0);
    vUv = aTexCoord;
}
"""

    private const val HEADER = """
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uIntensity;
uniform float uTime;
uniform vec2 uRes;
// Maps upright picture coordinates to the input texture (flips Bitmap uploads on the first pass).
uniform vec2 uTexScale;
uniform vec2 uTexOffset;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 tex(vec2 uv) { return texture2D(uTex, uv * uTexScale + uTexOffset).rgb; }
float aspect() { return uRes.x / uRes.y; }
vec3 screenBlend(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }
"""

    fun fragment(body: String): String = HEADER + body

    val COPY = fragment(
        """
void main() { gl_FragColor = vec4(tex(vUv), 1.0); }
"""
    )

    /** Parametric colour look: matrix, lift/gamma/gain, saturation, split-tone, fade. */
    val LOOK = fragment(
        """
uniform mat3 uMatrix;
uniform vec3 uOffset;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform float uSat;
uniform float uContrast;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
uniform float uSplit;
uniform float uFade;
uniform float uGrain;
uniform float uVignette;
void main() {
    vec3 o = tex(vUv);
    vec3 c = uMatrix * o + uOffset;
    c = clamp((c - 0.5) * uContrast + 0.5, 0.0, 1.0);
    c = pow(c, 1.0 / uGamma);
    c = uGain * (c + uLift * (1.0 - c));
    float l = luma(c);
    c = mix(vec3(l), c, uSat);
    c += uSplit * ((1.0 - l) * (uShadowTint - 0.5) + l * (uHighTint - 0.5));
    c = c * (1.0 - uFade) + uFade * 0.42;
    vec2 d = (vUv - 0.5) * vec2(aspect(), 1.0);
    c *= mix(1.0, smoothstep(1.05, 0.25, length(d)), uVignette);
    vec2 g = vUv * vec2(aspect() * 700.0, 700.0);
    c += (hash(g) - 0.5) * uGrain;
    gl_FragColor = vec4(mix(o, clamp(c, 0.0, 1.0), uIntensity), 1.0);
}
"""
    )

    /** Manual adjustments. All values are -1..1 (fade, grain 0..1). */
    val ADJUST = fragment(
        """
uniform float uExposure;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uVibrance;
uniform float uWarmth;
uniform float uTint;
uniform float uHighlights;
uniform float uShadows;
uniform float uFade;
uniform float uVignette;
uniform float uSharpen;
uniform float uGrain;
void main() {
    vec3 c = tex(vUv);
    if (uSharpen > 0.0) {
        vec2 px = 1.5 / uRes;
        vec3 b = (tex(vUv + vec2(px.x, 0.0)) + tex(vUv - vec2(px.x, 0.0)) +
                  tex(vUv + vec2(0.0, px.y)) + tex(vUv - vec2(0.0, px.y))) * 0.25;
        c += (c - b) * uSharpen * 2.0;
    }
    c *= pow(2.0, uExposure * 1.5);
    c += uBrightness * 0.2;
    c = (c - 0.5) * (1.0 + uContrast * 0.7) + 0.5;
    float l = luma(c);
    float sh = 1.0 - smoothstep(0.0, 0.55, l);
    float hi = smoothstep(0.45, 1.0, l);
    c += uShadows * 0.3 * sh;
    c += uHighlights * 0.3 * hi;
    c.r += uWarmth * 0.08; c.b -= uWarmth * 0.08;
    c.g -= uTint * 0.06; c.r += uTint * 0.02; c.b += uTint * 0.02;
    l = luma(c);
    c = mix(vec3(l), c, 1.0 + uSaturation);
    float mx = max(c.r, max(c.g, c.b)); float mn = min(c.r, min(c.g, c.b));
    c = mix(vec3(luma(c)), c, 1.0 + uVibrance * (1.0 - clamp(mx - mn, 0.0, 1.0)));
    c = c * (1.0 - 0.25 * uFade) + 0.13 * uFade;
    vec2 d = (vUv - 0.5) * vec2(aspect(), 1.0);
    float v = smoothstep(1.0, 0.2, length(d));
    if (uVignette > 0.0) c = mix(c, c * v, uVignette);
    else c = mix(c, mix(vec3(1.0), c, v), -uVignette);
    vec2 g = vUv * vec2(aspect() * 700.0, 700.0) + fract(uTime) * 91.0;
    c += (hash(g) - 0.5) * uGrain * 0.25;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    // ---------------------------------------------------------------- effects

    val VHS = fragment(
        """
void main() {
    float I = uIntensity;
    vec2 uv = vUv;
    float t = uTime;
    float line = floor(uv.y * 240.0);
    uv.x += (hash(vec2(line, floor(t * 24.0))) - 0.5) * 0.003 * I;
    uv.x += sin(uv.y * 4.0 + t * 1.3) * 0.0015 * I;
    float bp = fract(t * 0.11);
    float band = 1.0 - smoothstep(0.0, 0.05, abs(uv.y - bp));
    uv.x += band * (hash(vec2(uv.y * 300.0, t)) - 0.5) * 0.03 * I;
    // chroma smear: luma stays sharp, colour is blurred horizontally
    vec3 sharp = tex(uv);
    vec3 smear = vec3(0.0);
    for (int i = -3; i <= 3; i++) smear += tex(uv + vec2(float(i) * 0.0035 * I + 0.004 * I, 0.0));
    smear /= 7.0;
    float y = luma(sharp);
    vec3 col = smear - luma(smear) + y;
    col.r = mix(col.r, tex(uv + vec2(0.006 * I, 0.0)).r, 0.5);
    col = mix(vec3(luma(col)), col, 1.0 - 0.15 * I);
    col = col * 0.9 + 0.06;
    float scan = 0.5 + 0.5 * sin(vUv.y * 3.14159 * 480.0);
    col *= 1.0 - 0.1 * I * scan;
    col += (hash(vUv * uRes + t * 60.0) - 0.5) * 0.07 * I;
    col += band * step(0.92, hash(vec2(vUv.x * 80.0, floor(vUv.y * 200.0) + t))) * 0.5 * I;
    gl_FragColor = vec4(mix(tex(vUv), clamp(col, 0.0, 1.0), I), 1.0);
}
"""
    )

    val CRT = fragment(
        """
void main() {
    float I = uIntensity;
    vec2 c = vUv - 0.5;
    float r2 = dot(c, c);
    vec2 uv = 0.5 + c * (1.0 + r2 * 0.35 * I);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    vec3 col;
    col.r = tex(uv + vec2(0.0015 * I, 0.0)).r;
    col.g = tex(uv).g;
    col.b = tex(uv - vec2(0.0015 * I, 0.0)).b;
    float mask = mod(floor(uv.x * uRes.x / 2.0), 3.0);
    vec3 m = vec3(mask == 0.0 ? 1.0 : 0.75, mask == 1.0 ? 1.0 : 0.75, mask == 2.0 ? 1.0 : 0.75);
    col *= mix(vec3(1.0), m, 0.5 * I);
    col *= 1.0 - 0.18 * I * (0.5 + 0.5 * sin(uv.y * 3.14159 * 360.0));
    col *= 1.0 + 0.03 * I * sin(uTime * 50.0);
    vec2 e = abs(uv - 0.5) * 2.0;
    col *= mix(1.0, smoothstep(1.0, 0.75, max(e.x, e.y)), I);
    col = col * 1.15;
    gl_FragColor = vec4(mix(tex(vUv), clamp(col, 0.0, 1.0), I), 1.0);
}
"""
    )

    val OLD_FILM = fragment(
        """
void main() {
    float I = uIntensity;
    float t = uTime;
    float f = floor(t * 18.0);
    vec2 uv = vUv + vec2(0.0, (hash(vec2(f, 1.0)) - 0.5) * 0.004 * I);
    vec3 c = tex(uv);
    float l = luma(c);
    vec3 sepia = vec3(l * 1.07, l * 0.88, l * 0.66) + vec3(0.04, 0.02, 0.0);
    c = mix(c, sepia, 0.85);
    c *= 0.92 + 0.1 * hash(vec2(f, 7.0));
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float x = hash(vec2(f, fi * 13.0));
        if (hash(vec2(f, fi + 40.0)) > 0.5) {
            float w = abs(vUv.x - x) * uRes.x / uRes.y;
            c -= (1.0 - smoothstep(0.0, 0.0015, w)) * 0.35;
        }
    }
    vec2 g = vUv * vec2(aspect(), 1.0);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 p = vec2(hash(vec2(f, fi * 3.1)) * aspect(), hash(vec2(f, fi * 7.7)));
        float r = 0.002 + 0.004 * hash(vec2(fi, f));
        c = mix(c, vec3(0.05), (1.0 - smoothstep(r * 0.5, r, length(g - p))) * 0.8);
    }
    c += (hash(vUv * uRes + f) - 0.5) * 0.12;
    vec2 d = (vUv - 0.5) * vec2(aspect(), 1.0);
    c *= smoothstep(1.1, 0.3, length(d));
    gl_FragColor = vec4(mix(tex(vUv), clamp(c, 0.0, 1.0), I), 1.0);
}
"""
    )

    val DATE_STAMP = fragment(
        """
uniform sampler2D uOverlay;
void main() {
    vec3 c = tex(vUv);
    vec4 o = texture2D(uOverlay, vec2(vUv.x, 1.0 - vUv.y));
    float flicker = 0.9 + 0.1 * sin(uTime * 9.0);
    gl_FragColor = vec4(mix(c, o.rgb / max(o.a, 0.001), o.a * uIntensity * flicker), 1.0);
}
"""
    )

    val RGB_SHIFT = fragment(
        """
void main() {
    float I = uIntensity;
    float a = 0.012 * I * (0.7 + 0.3 * sin(uTime * 3.0));
    vec2 dir = vec2(1.0, 0.25);
    vec3 c;
    c.r = tex(vUv + dir * a).r;
    c.g = tex(vUv).g;
    c.b = tex(vUv - dir * a).b;
    gl_FragColor = vec4(c, 1.0);
}
"""
    )

    val DIGITAL_GLITCH = fragment(
        """
void main() {
    float I = uIntensity;
    float t = floor(uTime * 10.0);
    vec2 uv = vUv;
    vec2 block = floor(uv * vec2(6.0, 28.0));
    float r = hash(block + t);
    float on = step(1.0 - 0.28 * I, r);
    uv.x += on * (hash(block * 1.7 + t) - 0.5) * 0.25;
    float row = floor(uv.y * 90.0);
    float rr = hash(vec2(row, t + 3.0));
    uv.x += step(1.0 - 0.06 * I, rr) * (rr - 0.5) * 0.1;
    vec3 c;
    float s = 0.015 * I * (on + 0.3);
    c.r = tex(uv + vec2(s, 0.0)).r;
    c.g = tex(uv).g;
    c.b = tex(uv - vec2(s, 0.0)).b;
    float inv = step(0.985, hash(block.yx + t * 0.37)) * on;
    c = mix(c, 1.0 - c, inv);
    c = mix(c, floor(c * 4.0) / 4.0, on * 0.6);
    gl_FragColor = vec4(c, 1.0);
}
"""
    )

    val WAVE = fragment(
        """
void main() {
    float I = uIntensity;
    vec2 uv = vUv;
    uv.x += sin(uv.y * 28.0 + uTime * 4.0) * 0.008 * I;
    uv.x += sin(uv.y * 90.0 - uTime * 9.0) * 0.002 * I;
    uv.y += cos(uv.x * 14.0 + uTime * 2.0) * 0.003 * I;
    gl_FragColor = vec4(tex(clamp(uv, 0.0, 1.0)), 1.0);
}
"""
    )

    val SLICE = fragment(
        """
void main() {
    float I = uIntensity;
    float t = floor(uTime * 6.0);
    float s = floor(vUv.y * (10.0 + 10.0 * hash(vec2(t, 2.0))));
    float off = (hash(vec2(s, t)) - 0.5) * 0.12 * I;
    off *= step(0.45, hash(vec2(s * 3.0, t + 1.0)));
    vec2 uv = vec2(fract(vUv.x + off), vUv.y);
    vec3 c = tex(uv);
    c = mix(c, c * vec3(1.15, 0.9, 1.1), step(0.0001, abs(off)) * 0.6);
    gl_FragColor = vec4(c, 1.0);
}
"""
    )

    val GRAIN = fragment(
        """
void main() {
    vec3 c = tex(vUv);
    vec2 g = vUv * vec2(aspect() * 900.0, 900.0);
    float f = floor(uTime * 24.0);
    float n = (hash(g + f * 17.0) + hash(g * 1.3 - f * 9.0)) * 0.5 - 0.5;
    float l = luma(c);
    float w = 1.0 - abs(l - 0.5) * 1.2;
    c += n * 0.28 * uIntensity * w;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    val DUST = fragment(
        """
void main() {
    float I = uIntensity;
    float f = floor(uTime * 12.0);
    vec3 c = tex(vUv);
    vec2 g = vUv * vec2(aspect(), 1.0);
    float dust = 0.0;
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        vec2 p = vec2(hash(vec2(f, fi)) * aspect(), hash(vec2(fi, f + 5.0)));
        float r = 0.0015 + 0.003 * hash(vec2(fi * 2.0, f));
        dust += 1.0 - smoothstep(r * 0.3, r, length(g - p));
    }
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float x = hash(vec2(f * 0.5, fi + 20.0));
        float w = abs(vUv.x - x) * aspect();
        float len = step(hash(vec2(fi, f)), vUv.y) * step(vUv.y, hash(vec2(fi, f)) + 0.5);
        dust += (1.0 - smoothstep(0.0, 0.001, w)) * len * 0.7;
    }
    c = mix(c, vec3(0.95, 0.93, 0.88), clamp(dust, 0.0, 1.0) * I);
    gl_FragColor = vec4(c, 1.0);
}
"""
    )

    val LIGHT_LEAK = fragment(
        """
void main() {
    float I = uIntensity;
    float t = uTime * 0.35;
    vec3 c = tex(vUv);
    vec2 p = vUv * vec2(aspect(), 1.0);
    vec2 a = vec2(-0.1 + 0.25 * sin(t), 0.8 + 0.2 * cos(t * 1.3));
    vec2 b = vec2(aspect() + 0.05 - 0.2 * cos(t * 0.8), 0.15 + 0.25 * sin(t * 1.1));
    float la = exp(-pow(length(p - a) / 0.55, 2.0));
    float lb = exp(-pow(length(p - b) / 0.45, 2.0));
    float n = noise(p * 3.0 + t);
    vec3 leak = vec3(1.0, 0.45, 0.15) * la * (0.7 + 0.5 * n) + vec3(1.0, 0.2, 0.35) * lb * (0.6 + 0.5 * n);
    c = screenBlend(c, leak * I * 1.2);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    val FILM_BURN = fragment(
        """
void main() {
    float I = uIntensity;
    float t = uTime;
    vec3 c = tex(vUv);
    vec2 p = vUv * vec2(aspect(), 1.0);
    float n = noise(p * 2.5 + vec2(t * 0.4, -t * 0.2)) * 0.6 + noise(p * 6.0 - t * 0.3) * 0.4;
    float edge = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
    float pulse = 0.55 + 0.45 * sin(t * 1.7);
    float burn = smoothstep(0.72, 1.12, edge + n * 0.45 - 0.12) * pulse;
    vec3 fire = mix(vec3(0.95, 0.25, 0.02), vec3(1.0, 0.75, 0.4), burn * burn);
    c = screenBlend(c, fire * burn * I * 0.9);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    val HALATION = fragment(
        """
void main() {
    float I = uIntensity;
    vec3 c = tex(vUv);
    vec3 glow = vec3(0.0);
    float total = 0.0;
    for (int i = 0; i < 12; i++) {
        float a = float(i) * 0.5236;
        for (int j = 1; j <= 2; j++) {
            vec2 o = vec2(cos(a), sin(a)) * float(j) * 0.006 / vec2(aspect(), 1.0);
            vec3 s = tex(vUv + o);
            glow += s * smoothstep(0.65, 1.0, luma(s));
            total += 1.0;
        }
    }
    glow /= total;
    c += glow * vec3(1.0, 0.35, 0.2) * 1.8 * I;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    val NEON_GLOW = fragment(
        """
void main() {
    float I = uIntensity;
    vec3 c = tex(vUv);
    vec3 glow = vec3(0.0);
    float total = 0.0;
    for (int i = 0; i < 16; i++) {
        float a = float(i) * 0.3927;
        for (int j = 1; j <= 3; j++) {
            vec2 o = vec2(cos(a), sin(a)) * float(j) * 0.012 / vec2(aspect(), 1.0);
            vec3 s = tex(vUv + o);
            glow += s * smoothstep(0.45, 0.95, luma(s));
            total += 1.0;
        }
    }
    glow /= total;
    float hue = uTime * 0.2;
    vec3 tint = 0.6 + 0.4 * cos(6.2831 * (hue + vec3(0.0, 0.33, 0.67)));
    glow *= mix(vec3(1.0), tint * 1.4, 0.6);
    c = screenBlend(c, glow * 2.2 * I);
    c = mix(c, c * vec3(0.9, 0.85, 1.05), 0.3 * I);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    val SPARKLE = fragment(
        """
void main() {
    float I = uIntensity;
    vec3 c = tex(vUv);
    float cells = 26.0;
    vec2 p = vUv * vec2(aspect(), 1.0) * cells;
    vec2 cell = floor(p);
    float star = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 id = cell + vec2(float(x), float(y));
            vec2 ctr = id + vec2(hash(id), hash(id + 7.0));
            vec2 suv = ctr / cells / vec2(aspect(), 1.0);
            float b = luma(tex(clamp(suv, 0.0, 1.0)));
            float bright = smoothstep(0.72, 0.95, b) * step(0.45, hash(id + 3.0));
            float tw = 0.5 + 0.5 * sin(uTime * (2.0 + 3.0 * hash(id + 9.0)) + hash(id) * 6.28);
            vec2 d = (p - ctr);
            float size = 0.9 + 1.2 * hash(id + 11.0);
            float cross = max(0.0, 1.0 - abs(d.x) * 14.0 / size - abs(d.y) * 1.2 / size)
                        + max(0.0, 1.0 - abs(d.y) * 14.0 / size - abs(d.x) * 1.2 / size);
            float core = exp(-dot(d, d) * 40.0 / size);
            star += (cross * 0.8 + core) * bright * tw;
        }
    }
    c = screenBlend(c, vec3(1.0, 0.97, 0.9) * clamp(star, 0.0, 1.5) * I);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    val PRISM = fragment(
        """
void main() {
    float I = uIntensity;
    vec2 d = vUv - 0.5;
    float k = 0.02 * I;
    vec3 c;
    c.r = tex(vUv + d * k).r;
    c.g = tex(vUv).g;
    c.b = tex(vUv - d * k).b;
    float band = vUv.x * 0.8 + vUv.y * 0.6 + uTime * 0.05;
    vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (band + vec3(0.0, 0.33, 0.67)));
    float mask = smoothstep(0.2, 0.9, length(d) * 1.6);
    c = screenBlend(c, rainbow * mask * 0.35 * I);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
    )

    val DREAMY = fragment(
        """
void main() {
    float I = uIntensity;
    vec3 c = tex(vUv);
    vec3 b = vec3(0.0);
    for (int i = 0; i < 12; i++) {
        float a = float(i) * 0.5236;
        b += tex(vUv + vec2(cos(a), sin(a)) * 0.008 / vec2(aspect(), 1.0));
        b += tex(vUv + vec2(cos(a + 0.26), sin(a + 0.26)) * 0.016 / vec2(aspect(), 1.0));
    }
    b /= 24.0;
    vec3 soft = screenBlend(c, b * 0.6);
    soft = soft * 0.92 + vec3(0.06, 0.04, 0.07);
    gl_FragColor = vec4(mix(c, clamp(soft, 0.0, 1.0), I), 1.0);
}
"""
    )

    // GLSL ES 1.00 has no transpose(): the inverse rotation is written by hand.
    val HALFTONE = fragment(
            """
void main() {
    float I = uIntensity;
    vec3 c = tex(vUv);
    float cells = 90.0;
    vec2 p = vUv * vec2(aspect(), 1.0) * cells;
    float s = 0.7071;
    vec2 rp = vec2(s * p.x - s * p.y, s * p.x + s * p.y);
    vec2 cell = floor(rp) + 0.5;
    vec2 ctr = vec2(s * cell.x + s * cell.y, -s * cell.x + s * cell.y);
    vec2 suv = ctr / cells / vec2(aspect(), 1.0);
    vec3 sc = tex(clamp(suv, 0.0, 1.0));
    float r = sqrt(1.0 - luma(sc)) * 0.72;
    float dotm = 1.0 - smoothstep(r - 0.08, r + 0.08, length(rp - cell));
    vec3 paper = vec3(0.96, 0.94, 0.88);
    vec3 ink = sc * 0.55;
    vec3 h = mix(paper, ink, dotm);
    gl_FragColor = vec4(mix(c, h, I), 1.0);
}
"""
    )

    val PIXELATE = fragment(
        """
void main() {
    float cells = mix(220.0, 28.0, uIntensity);
    vec2 n = vec2(cells * aspect(), cells);
    vec2 uv = (floor(vUv * n) + 0.5) / n;
    gl_FragColor = vec4(tex(uv), 1.0);
}
"""
    )

    val POSTER = fragment(
        """
void main() {
    float I = uIntensity;
    vec3 c = tex(vUv);
    float levels = mix(12.0, 3.0, I);
    vec3 p = floor(c * levels + 0.5) / levels;
    p = mix(vec3(luma(p)), p, 1.0 + 0.6 * I);
    gl_FragColor = vec4(clamp(mix(c, p, min(1.0, I * 1.5)), 0.0, 1.0), 1.0);
}
"""
    )

    val SKETCH = fragment(
        """
void main() {
    float I = uIntensity;
    vec2 px = 1.0 / vec2(1200.0 * aspect(), 1200.0);
    float tl = luma(tex(vUv + px * vec2(-1.0, 1.0)));
    float t = luma(tex(vUv + px * vec2(0.0, 1.0)));
    float tr = luma(tex(vUv + px * vec2(1.0, 1.0)));
    float l = luma(tex(vUv + px * vec2(-1.0, 0.0)));
    float r = luma(tex(vUv + px * vec2(1.0, 0.0)));
    float bl = luma(tex(vUv + px * vec2(-1.0, -1.0)));
    float b = luma(tex(vUv + px * vec2(0.0, -1.0)));
    float br = luma(tex(vUv + px * vec2(1.0, -1.0)));
    float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
    float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
    float e = clamp(length(vec2(gx, gy)) * 2.5, 0.0, 1.0);
    vec3 paper = vec3(0.97, 0.96, 0.93) - (hash(vUv * 900.0) * 0.04);
    vec3 s = paper * (1.0 - e * 0.9);
    gl_FragColor = vec4(mix(tex(vUv), s, I), 1.0);
}
"""
    )

    val MIRROR = fragment(
        """
void main() {
    vec2 uv = vUv;
    if (uv.x > 0.5) uv.x = 1.0 - uv.x;
    gl_FragColor = vec4(mix(tex(vUv), tex(uv), step(0.01, uIntensity)), 1.0);
}
"""
    )

    val FISHEYE = fragment(
        """
void main() {
    float I = uIntensity;
    vec2 d = (vUv - 0.5) * vec2(aspect(), 1.0);
    float r = length(d);
    float k = 1.0 + I * 1.2;
    float nr = pow(r * 2.0, k) / 2.0 / max(r, 0.0001) * r;
    vec2 nd = r > 0.0 ? d / r * nr : d;
    vec2 uv = nd / vec2(aspect(), 1.0) + 0.5;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    gl_FragColor = vec4(tex(clamp(uv, 0.0, 1.0)) * inside, 1.0);
}
"""
    )

    val KALEIDO = fragment(
        """
void main() {
    float I = uIntensity;
    vec2 d = (vUv - 0.5) * vec2(aspect(), 1.0);
    float a = atan(d.y, d.x) + uTime * 0.15;
    float r = length(d);
    float seg = 6.2831 / 6.0;
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    vec2 k = vec2(cos(a), sin(a)) * r;
    vec2 uv = k / vec2(aspect(), 1.0) + 0.5;
    gl_FragColor = vec4(mix(tex(vUv), tex(clamp(uv, 0.0, 1.0)), I), 1.0);
}
"""
    )

    val DUOTONE_POP = fragment(
        """
void main() {
    float I = uIntensity;
    vec3 c = tex(vUv);
    float l = smoothstep(0.1, 0.9, luma(c));
    float h = uTime * 0.08;
    vec3 a = 0.5 + 0.5 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));
    vec3 b = 0.5 + 0.5 * cos(6.2831 * (h + 0.5 + vec3(0.0, 0.33, 0.67)));
    vec3 d = mix(a * 0.25, b, l);
    gl_FragColor = vec4(mix(c, d, I), 1.0);
}
"""
    )
}
