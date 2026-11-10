// 장면 6 — 단순 리뉴얼 로고: #00ff7f 투명 재질의 3D → 여러 구도 → 회전 → 2D 원본 → 글리치 → 끝
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, H, clamp, lerp, prog, ease, rng, noise, drawLogo, glitch } from './core.js';
import { RW, RH } from './film.js';

const GREEN = 0x00ff7f, FOV = 30, DEPTH = 300, BEVEL = 34;
let renderer, composer, scene, camera, group, glass, dust, lights = [], K, CX, CY, ZF;

function envMap() { // 스튜디오 조명 환경(선명한 띠 반사)
  const s = new THREE.Scene(); s.background = new THREE.Color(0x010302);
  const box = (w, h, d, x, y, z, col, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i) })); m.position.set(x, y, z); s.add(m); };
  box(14, 0.2, 3, 0, 9, 3, 0xb8ffdc, 1.1);        // 위 소프트박스
  box(0.3, 12, 2.2, -10, 1, 3, 0x00ff7f, 5);   // 왼쪽 초록 띠
  box(0.3, 12, 1.2, 10, 2, 5, 0xffffff, 5);    // 오른쪽 흰 띠
  box(0.3, 10, 1.0, 9, 0, -6, 0x00e5ff, 3);     // 뒤쪽 청록 띠
  box(16, 0.2, 2, 0, -9, 4, 0x00ff7f, 1.6);       // 아래 반사
  box(6, 3, 0.2, 0, 3, 12, 0xffffff, 0.5);      // 정면 필
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, 0.015).texture; pm.dispose();
  return t;
}

export async function init3d(A) {
  renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  scene.environment = envMap();
  camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);

  const txt = await (await fetch('./assets/logo-2026-simple.svg')).text();
  const shapes = new SVGLoader().parse(txt).paths.flatMap(p => SVGLoader.createShapes(p));
  const b = A.simple.bbox; CX = (b.x0 + b.x1) / 2; CY = (b.y0 + b.y1) / 2; K = 5.2 / (b.x1 - b.x0);
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL * 0.7, bevelOffset: -BEVEL * 0.7, bevelSegments: 6, curveSegments: 28 });
  geo.translate(-CX, -CY, -DEPTH / 2);
  ZF = (DEPTH / 2 + BEVEL) * K;
  // 투명 재질: 뒷면 → 앞면 순서로 겹쳐 그려 안쪽 구조가 비쳐 보이게 한다
  // 정면에서는 맑게 비치고, 비스듬한 면과 반사광은 또렷해지는 유리(프레넬 알파)
  const mat = side => {
    const m = new THREE.MeshPhysicalMaterial({
      color: GREEN, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, reflectivity: 0.9,
      transparent: true, depthWrite: false, side,
      envMapIntensity: side === THREE.BackSide ? 0.9 : 1.25, emissive: new THREE.Color(GREEN), emissiveIntensity: 0.3,
    });
    const a0 = side === THREE.BackSide ? '0.13' : '0.2';
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float fr = pow(clamp(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 2.2);
        float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.6, 0.1));
        gl_FragColor.a = clamp(mix(${a0}, 0.92, fr) + smoothstep(0.6, 1.6, lum) * 0.6, 0.0, 1.0);
        if (!(lum >= 0.0) || !(fr >= 0.0)) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(5.0));`);
    };
    return m;
  };
  const back = new THREE.Mesh(geo, mat(THREE.BackSide)); back.renderOrder = 1;
  glass = new THREE.Mesh(geo, mat(THREE.FrontSide)); glass.renderOrder = 2;
  group = new THREE.Group(); group.add(back, glass); group.scale.set(K, -K, K); scene.add(group);

  // 떠다니는 먼지 입자
  const r = rng(3), n = 420, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * 26; pos[i * 3 + 1] = (r() - 0.5) * 15; pos[i * 3 + 2] = -1.5 - r() * 9; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: GREEN, size: 0.035, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);
  for (const [c, i] of [[0xffffff, 22], [GREEN, 30], [0x00e5ff, 16]]) { const l = new THREE.PointLight(c, i, 30); lights.push(l); scene.add(l); }

  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW / 2, RH / 2), 0.42, 0.55, 0.82));
  composer.addPass(new OutputPass());
}

// 광고풍 카메라: 느린 매크로 글라이드 사이를 빠른 스윕(모션블러)으로 끊김 없이 잇는다
const FRONT = 11.4;
// [시작 시각, u => {pos, look, rot, roll}]  — 각 구도는 다음 구도 시작 전 WHIP초 동안 빠르게 넘어간다
const SHOTS = [
  [0.4, u => ({ pos: [lerp(0.5, 1.5, u), lerp(0.55, 0.1, u), lerp(2.0, 4.6, ease.out(u))], look: [lerp(-0.1, 0.1, u), lerp(0.3, 0.05, u), 0], rot: [0.12, lerp(0.75, 0.2, u), 0] })],          // 별에서 물러나며 등장
  [2.6, u => ({ pos: [lerp(-4.4, -3.0, u), lerp(-1.0, -0.45, u), lerp(1.0, 1.6, u)], look: [lerp(-0.7, 0.5, u), -0.1, 0], rot: [0, lerp(-0.15, 0.2, u), 0], roll: -0.14 })],                     // 고리 가장자리를 스치는 매크로
  [4.5, u => ({ pos: [lerp(1.3, -0.5, u), 3.2, 3.3], look: [0.2, 0, 0], rot: [-0.95, 0, lerp(-0.6, 0.15, u)] })],                                                                              // 위에서 내려다보며 회전
  [6.3, u => ({ pos: [lerp(2.6, 1.6, u), lerp(-1.5, -1.1, u), lerp(3.6, 3.0, u)], look: [0.1, 0, 0], rot: [0.1, lerp(-0.9, -0.5, u), 0.05], roll: 0.1 })],                                      // 아래에서 올려다보는 영웅 구도
  [8.0, (u, t) => { const k = 1 - (1 - prog(t, 8.0, FRONT)) ** 2.4; return { pos: [0, 0, lerp(7.6, 9.2, k)], look: [0, 0, 0], rot: [lerp(0.2, 0, k), (1 - k) * -Math.PI * 2.4, 0] }; }],        // 전체 회전 → 정면
];
const WHIP = 0.42;
const mixA = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function shotAt(t) {
  let i = SHOTS.length - 1; while (i > 0 && t < SHOTS[i][0]) i--;
  const s0 = SHOTS[i][0], s1 = i < SHOTS.length - 1 ? SHOTS[i + 1][0] : 14, p = SHOTS[i][1](prog(t, s0, s1), t);
  p.roll ||= 0; p.spin = 0;
  if (i < SHOTS.length - 1 && t > s1 - WHIP) { // 다음 구도로 휙 넘어가는 스윕
    const k = ease.io(prog(t, s1 - WHIP, s1)), n = SHOTS[i + 1][1](0, s1); n.roll ||= 0;
    return { pos: mixA(p.pos, n.pos, k), look: mixA(p.look, n.look, k), rot: mixA(p.rot, n.rot, k), roll: lerp(p.roll, n.roll, k), spin: Math.sin(k * Math.PI) * 0.5 };
  }
  return p;
}
function render3d(t, sub) {
  const p = shotAt(t), JIT = [[0, 0], [0.5, 0.33], [-0.5, 0.66], [0.25, -0.44]][sub % 4];
  camera.fov = FOV; camera.position.set(...p.pos); camera.up.set(Math.sin(p.roll), Math.cos(p.roll), 0); camera.lookAt(...p.look);
  camera.setViewOffset(RW, RH, JIT[0], JIT[1], RW, RH); camera.updateProjectionMatrix();
  group.rotation.set(p.rot[0], p.rot[1] + p.spin, p.rot[2]);
  scene.environmentRotation.set(0, t * 0.55, Math.sin(t * 0.4) * 0.3);   // 표면을 훑고 지나가는 반사광
  dust.position.set(Math.sin(t * 0.2) * 0.4, t * 0.04, 0);
  lights[0].position.set(Math.cos(t * 0.9) * 5, 3 + Math.sin(t * 0.7), 4 + Math.sin(t * 0.9) * 2);
  lights[1].position.set(Math.cos(t * 0.6 + 2) * -6, -2, 2 + Math.sin(t * 0.5) * 3);
  lights[2].position.set(Math.sin(t * 0.8) * 4, 1, -5);
  composer.render();
}
// 정면 구도에서 2D 로고가 놓일 화면 위치/크기 (3D 앞면과 정확히 일치)
function flat2d(z) {
  const ppu = (H / 2) / (Math.tan((FOV * Math.PI) / 360) * (z - ZF));
  return { size: 3000 * K * ppu, x: W / 2 + (1500 - CX) * K * ppu, y: H / 2 + (1500 - CY) * K * ppu };
}

/* 0-0.4 암전 · ~8.0 광고풍 구도 4컷(스윕으로 연결) · 8.0-11.4 회전하며 정면으로 · 11.4-12.0 2D로 전환 · 12.0-12.7 정지
   12.7-13.2 지지직 · 13.2-13.4 점멸 · 이후 암전 */
export function logo3d(ctx, t, dur, A, sub) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t < 0.4 || t > 13.42) return;
  const k2 = ease.io(prog(t, FRONT, 12.0));
  if (k2 < 1) {
    render3d(t, sub);
    ctx.globalAlpha = 1 - k2; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(renderer.domElement, 0, 0, W, H); ctx.globalAlpha = 1;
    const dark = 1 - ease.io(prog(t, 0.4, 1.3));
    if (dark > 0) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, W, H); }
  }
  if (k2 > 0) {
    const f = flat2d(9.2);
    drawLogo(ctx, A.simple, f.x, f.y, f.size, '#00ff7f', k2);
    const sw = prog(t, FRONT + 0.1, 12.1);
    if (sw > 0 && sw < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const x = lerp(-300, W + 300, ease.io(sw)), g = ctx.createLinearGradient(x - 220, 0, x + 220, 0); g.addColorStop(0, 'rgba(180,255,220,0)'); g.addColorStop(0.5, `rgba(180,255,220,${0.22 * Math.sin(sw * Math.PI)})`); g.addColorStop(1, 'rgba(180,255,220,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  const g1 = prog(t, 12.7, 13.2);
  if (g1 > 0 && t < 13.2) glitch(ctx, 0.2 + g1 * 0.8 * (0.5 + 0.5 * noise(t * 40, 5)), Math.floor(t * 30) + 500);
  if (t >= 13.2) { if (Math.floor(t * 30) % 3 === 0) glitch(ctx, 1, Math.floor(t * 30) + 500); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } }
}
