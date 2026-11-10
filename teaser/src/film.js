// 필름 파이프라인: 3D 장면 → 블룸 → (심도·연필 외곽선·흑백 그레이딩·종이결·그레인·비네트) → 화면
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { W, H, paperTexture } from './core.js';

export let renderer;
export const RS = 0.75, RW = Math.round(W * RS), RH = Math.round(H * RS); // 3D 내부 해상도(서브프레임 지터로 보간)
export const blit = ctx => { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(renderer.domElement, 0, 0, W, H); };
let rt, bloom, quad, qscene, qcam, mat;
export const STYLE = { mono: 1, outline: 0.6, grain: 0.07, paper: 0, vig: 0.55, exposure: 1, focus: 5, aperture: 0, bloom: 0.5, bloomT: 0.8, fade: 1, tint: [1, 0.985, 0.955], hatch: 0.5, sat: 1, flash: 0 };

export function initFilm() {
  renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(RW, RH) });
  bloom = new UnrealBloomPass(new THREE.Vector2(RW / 2, RH / 2), 0.5, 0.6, 0.8);
  const ptex = new THREE.CanvasTexture(paperTexture());
  mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, tPaper: { value: ptex }, px: { value: new THREE.Vector2(1 / RW, 1 / RH) },
      near: { value: 0.1 }, far: { value: 100 }, focus: { value: 5 }, aperture: { value: 0 }, mono: { value: 1 }, outline: { value: 0.6 }, grain: { value: 0.07 },
      paper: { value: 0 }, vig: { value: 0.5 }, exposure: { value: 1 }, fade: { value: 1 }, time: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) }, hatch: { value: 0.5 }, sat: { value: 1 }, flash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      precision highp float; varying vec2 vUv;
      uniform sampler2D tColor, tDepth, tPaper; uniform vec2 px; uniform vec3 tint;
      uniform float near, far, focus, aperture, mono, outline, grain, paper, vig, exposure, fade, time, hatch, sat, flash;
      float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      float zAt(vec2 uv){ return lin(texture2D(tDepth, uv).x); }
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        float z = zAt(vUv);
        // 심도(조리개 흐림)
        float coc = clamp(abs(z - focus) / max(z, 0.05) * aperture, 0.0, 1.0) * 16.0;
        vec3 col = texture2D(tColor, vUv).rgb; float ws = 1.0;
        if (coc > 0.6) {
          for (int i = 1; i <= 14; i++) {
            float a = float(i) * 2.39996 + hash(vUv / px + time) * 6.2832, r = sqrt((float(i) - 0.5 + hash(vUv.yx / px) * 0.5) / 14.0) * coc;
            vec2 o = vec2(cos(a), sin(a)) * r * px, uv2 = vUv + o;
            float z2 = zAt(uv2), c2 = clamp(abs(z2 - focus) / max(z2, 0.05) * aperture, 0.0, 1.0) * 16.0;
            float w = (z2 > z - 0.05 ? 1.0 : smoothstep(0.0, 1.0, c2 / max(r, 0.5)));
            vec3 s = texture2D(tColor, uv2).rgb; w *= 1.0 + dot(s, vec3(0.33)) * 0.6;
            col += s * w; ws += w;
          }
          col /= ws;
        }
        // 연필 외곽선(깊이 경계)
        float e = 0.0;
        if (outline > 0.001) {
          float dx = abs(zAt(vUv + vec2(px.x * 1.5, 0.0)) - zAt(vUv - vec2(px.x * 1.5, 0.0)));
          float dy = abs(zAt(vUv + vec2(0.0, px.y * 1.5)) - zAt(vUv - vec2(0.0, px.y * 1.5)));
          e = smoothstep(0.012, 0.05, (dx + dy) / z) * (1.0 - smoothstep(0.3, 1.0, coc / 16.0));
          e *= 0.75 + 0.25 * hash(floor(vUv / px / 3.0));
        }
        col *= exposure;
        col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
        col = pow(col, vec3(1.0 / 2.2));
        float g = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(g), col, sat);
        col = mix(col, vec3(smoothstep(-0.02, 1.02, g)) * tint, mono);
        // 그림자 속 연필 해칭
        float hl = sin((vUv.x / px.x + vUv.y / px.y) * 0.55) * 0.5 + 0.5;
        col -= outline * hatch * smoothstep(0.42, 0.05, g) * smoothstep(0.55, 0.95, hl) * 0.10;
        col = mix(col, col * 0.12, e * outline);
        col *= mix(vec3(1.0), texture2D(tPaper, vUv).rgb * 1.16, paper);
        vec2 q = vUv - 0.5; col *= 1.0 - vig * smoothstep(0.25, 0.95, dot(q, q) * 2.2);
        col += (hash(vUv / px + fract(time) * 91.7) - 0.5) * grain * (1.1 - g * 0.6);
        col = mix(col * fade, vec3(1.0), flash);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  qscene = new THREE.Scene(); qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; qscene.add(quad);
  return renderer;
}

const JIT = [[0, 0], [0.5, 0.33], [-0.5, 0.66], [0.25, -0.44], [-0.25, -0.11], [0.12, 0.5]];
export function renderFilm(scene, camera, style, t, sub = 0, target = null) {
  const s = { ...STYLE, ...style }, u = mat.uniforms;
  const j = JIT[sub % JIT.length];
  camera.setViewOffset(RW, RH, j[0], j[1], RW, RH); camera.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  if (s.bloom > 0.01) { bloom.strength = s.bloom; bloom.threshold = s.bloomT; bloom.radius = 0.65; bloom.render(renderer, null, rt, 0, false); }
  for (const k of ['focus', 'aperture', 'mono', 'outline', 'grain', 'paper', 'vig', 'exposure', 'fade', 'hatch', 'sat', 'flash']) u[k].value = s[k];
  u.near.value = camera.near; u.far.value = camera.far; u.time.value = t * 7.13 + sub * 0.37; u.tint.value.set(...s.tint);
  renderer.setRenderTarget(target); renderer.render(qscene, qcam);
  camera.clearViewOffset();
}
