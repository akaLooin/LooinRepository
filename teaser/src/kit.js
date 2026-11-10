// 3D 소품 모음: 인물 리그, 종이, 빛줄기, 하늘, 텍스처
import * as THREE from 'three';
import { canvas, rng, clamp, lerp, noise, paperSprite, PAPER_W, PAPER_H } from './core.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DOWN = V(0, -1, 0);

// ---------- 텍스처 ----------
export function tex(w, h, fn, { repeat, srgb = true } = {}) {
  const c = canvas(w, h); fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 4; return t;
}
export function noiseTex(size, seed, base, amp, repeat, streak = 1) { // 얼룩진 회색 텍스처(나무결·석재·아스팔트)
  return tex(size, size, (x, w) => {
    const r = rng(seed); x.fillStyle = `rgb(${base},${base},${base})`; x.fillRect(0, 0, w, w);
    for (let i = 0; i < size * 14; i++) { const v = base + (r() - 0.5) * amp * 2; x.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.4})`; x.fillRect(r() * w, r() * w, (1 + r() * 4) * streak, 1 + r() * 3); }
    for (let i = 0; i < 30; i++) { const g = x.createRadialGradient(r() * w, r() * w, 0, r() * w, r() * w, w * (0.1 + r() * 0.25)); const v = r() > 0.5 ? 255 : 0; g.addColorStop(0, `rgba(${v},${v},${v},0.10)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); x.fillStyle = g; x.fillRect(0, 0, w, w); }
  }, { repeat });
}
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
export function box(w, h, d, m, x = 0, y = 0, z = 0, parent) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent?.add(b); return b; }
export function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, parent, seg = 20) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent?.add(b); return b; }
export function ball(r, m, x = 0, y = 0, z = 0, parent) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent?.add(b); return b; }

// 가짜 볼륨 라이트(빛줄기)
const shaftTex = tex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const g2 = x.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, w, h); });
export function shaft(rTop, rBot, len, color = 0xffffff, opacity = 0.2) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, 24, 1, true); g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, map: shaftTex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.renderOrder = 5; return m;
}
export function dust(n, size, spread, color = 0xffffff, opacity = 0.6, seed = 3) {
  const r = rng(seed), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * spread[0]; pos[i * 3 + 1] = r() * spread[1]; pos[i * 3 + 2] = (r() - 0.5) * spread[2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = tex(32, 32, x => { const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); });
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dot, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
}
// 하늘 돔(위·아래 그라데이션 + 해/달 광륜)
export function skyDome() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x223355) }, bot: { value: new THREE.Color(0xffddaa) }, sun: { value: V(0.3, 0.3, -1).normalize() }, sunCol: { value: new THREE.Color(0xffffff) }, sunSize: { value: 0.9992 } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 d; uniform vec3 top, bot, sun, sunCol; uniform float sunSize; void main(){ vec3 n = normalize(d); float h = pow(clamp(n.y * 1.1 + 0.08, 0.0, 1.0), 0.55); vec3 c = mix(bot, top, h); float s = max(dot(n, sun), 0.0); c += sunCol * (pow(s, 40.0) * 0.5 + pow(s, 700.0) * 1.5 + smoothstep(sunSize, sunSize + 0.0003, s) * 6.0); gl_FragColor = vec4(c, 1.0); }' });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), m); mesh.frustumCulled = false; return mesh;
}

// ---------- 종이 ----------
export function makePaper(logo, h = 0.42) {
  const w = h * PAPER_W / PAPER_H, t = new THREE.CanvasTexture(paperSprite(logo)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const g = new THREE.PlaneGeometry(w, h, 10, 14), base = g.attributes.position.array.slice();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.05, alphaTest: 0.5 }));
  m.castShadow = true; m.userData = { w, h };
  m.flutter = (time, amp = 1) => { // 바람에 휘고 펄럭인다
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; p.setZ(i, amp * (Math.sin(x * 14 + time * 13) * 0.022 + Math.sin(y * 9 - time * 9 + x * 5) * 0.03 + (x * x - y * y) * 0.5 * Math.sin(time * 5))); }
    p.needsUpdate = true; g.computeVertexNormals();
  };
  return m;
}

// ---------- 인물 리그 (검은 형체) ----------
export function makeFigure(o = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0x000000, roughness: 0.5, metalness: 0.0 });
  const cap = (r, len, r2) => { const g = r2 ? new THREE.CylinderGeometry(r, r2, len, 12) : new THREE.CapsuleGeometry(r, len, 6, 12); g.translate(0, -len / 2, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
  const sph = (r, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
  const G = () => new THREE.Group();
  const root = G(), hips = G(), spine = G(), head = G(), coat = G();
  root.add(hips); hips.position.y = 0.93; hips.add(spine, coat);
  hips.add(Object.assign(sph(0.17, 1, 0.75, 0.8), {}));
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.155, 0.5, 16), mat); torso.position.y = 0.25; torso.scale.z = 0.66; torso.castShadow = true; spine.add(torso);
  const sh = sph(0.2, 1.05, 0.45, 0.68); sh.position.y = 0.48; spine.add(sh);
  const neck = cap(0.05, 0.1); neck.position.y = 0.62; spine.add(neck);
  head.position.y = 0.6; spine.add(head);
  const skull = sph(0.118, 0.94, 1.1, 1.02); skull.position.set(0, 0.16, 0.015); head.add(skull);
  if (o.hood) { // 후드: 머리를 감싸고 어깨로 부드럽게 흘러내린다
    const hd = sph(0.148, 0.98, 1.1, 1.14); hd.position.set(0, 0.168, -0.022); head.add(hd);
    if (!o.cloak) { const cw = sph(0.19, 1.15, 0.5, 0.9); cw.position.set(0, -0.03, -0.02); head.add(cw); }
  }
  if (o.cloak) { // 온몸을 덮는 망토
    const cg = new THREE.CylinderGeometry(0.1, o.cloak, 1.42, 28, 12, true); cg.translate(0, -0.71, 0);
    const cm = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: mat.color, roughness: 0.55, side: THREE.DoubleSide })); cm.castShadow = true; cm.scale.z = 0.82;
    const cl = G(); cl.position.y = 0.66; cl.add(cm); spine.add(cl);
    coat.userData.base = cg.attributes.position.array.slice(); coat.userData.geo = cg; coat.userData.h = 1.42;
  }
  if (o.cap) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16), mat); br.position.set(0, 0.215, 0.12); br.scale.z = 1.3; head.add(br); const cr = sph(0.124, 1, 0.8, 1.02); cr.position.set(0, 0.2, 0.01); head.add(cr); }
  if (o.hair) { const hr = sph(0.13, 1, 0.8, 1.05); hr.position.set(0, 0.2, -0.02); head.add(hr); }
  if (o.pack) { const pk = sph(0.17, 0.95, 1.2, 0.6); pk.position.set(0, 0.3, -0.16); spine.add(pk); }
  if (o.coat) { // 긴 외투 자락
    const cg = new THREE.CylinderGeometry(0.2, o.coat, 0.78, 20, 6, true); cg.translate(0, -0.39, 0);
    const cm = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: mat.color, roughness: 0.7, side: THREE.DoubleSide })); cm.castShadow = true; cm.scale.z = 0.8; coat.add(cm); coat.position.y = 0.06;
    coat.userData.base = cg.attributes.position.array.slice(); coat.userData.geo = cg;
  }
  const arms = {}, legs = {};
  for (const [k, sx] of [['L', 1], ['R', -1]]) {
    const s = G(), e = G(), hand = G(); s.position.set(sx * 0.225, 0.47, 0); spine.add(s);
    s.add(cap(0.055, 0.27)); e.position.y = -0.28; s.add(e); e.add(cap(0.045, 0.25)); hand.position.y = -0.27; e.add(hand); hand.add(sph(0.055, 0.9, 1.15, 0.7));
    arms[k] = { s, e, hand };
    const h = G(), kn = G(); h.position.set(sx * 0.095, -0.02, 0); hips.add(h);
    h.add(cap(0.085, 0.42, 0.065)); kn.position.y = -0.44; h.add(kn); kn.add(cap(0.062, 0.4, 0.045));
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.07, 0.26), mat); ft.position.set(0, -0.44, 0.07); ft.castShadow = true; kn.add(ft);
    legs[k] = { h, kn };
  }
  const f = { root, hips, spine, head, coat, arms, legs, mat };
  const tmp = V(), q2 = new THREE.Quaternion(), ax = V();
  // 팔 IK: 월드 좌표 target으로 손을 뻗는다
  f.reach = (k, target, hint = V(0, -1, -0.6)) => {
    const a = arms[k], L1 = 0.28, L2 = 0.27;
    spine.updateWorldMatrix(true, false);
    const d = spine.worldToLocal(tmp.copy(target)).sub(a.s.position); let len = d.length(); const dir = d.clone().normalize();
    len = clamp(len, 0.08, L1 + L2 - 0.004);
    const ca = clamp((L1 * L1 + len * len - L2 * L2) / (2 * L1 * len), -1, 1), ang = Math.acos(ca);
    ax.crossVectors(dir, hint).normalize(); if (ax.lengthSq() < 0.01) ax.set(1, 0, 0);
    const u = dir.clone().applyAxisAngle(ax, ang);
    a.s.quaternion.setFromUnitVectors(DOWN, u);
    const l = dir.clone().multiplyScalar(len).sub(u.clone().multiplyScalar(L1)).normalize();
    q2.setFromUnitVectors(DOWN, l); a.e.quaternion.copy(a.s.quaternion).invert().multiply(q2);
  };
  f.armFK = (k, sx, sz, el) => { arms[k].s.rotation.set(sx, 0, sz); arms[k].e.rotation.set(el, 0, 0); };
  // 걷기. ph: 위상, amp: 보폭
  f.walk = (ph, amp = 1) => {
    for (const [k, o2] of [['L', 0], ['R', Math.PI]]) {
      const s = Math.sin(ph + o2), c = Math.cos(ph + o2);
      legs[k].h.rotation.set(-s * 0.62 * amp, 0, 0); legs[k].kn.rotation.set((Math.max(0, -c) * 1.05 + 0.08) * amp, 0, 0);
      f.armFK(k, s * 0.55 * amp, (k === 'L' ? 1 : -1) * 0.08, -0.25 - Math.max(0, s) * 0.5 * amp);
    }
    hips.position.y = 0.93 - 0.035 * amp + Math.cos(ph * 2) * 0.025 * amp;
    hips.rotation.set(0, Math.sin(ph) * 0.12 * amp, Math.sin(ph) * 0.03 * amp); spine.rotation.set(0.1 * amp, -Math.sin(ph) * 0.2 * amp, 0);
    head.rotation.set(-0.05, Math.sin(ph) * 0.08 * amp, 0);
  };
  f.stand = (k = 0) => { // 서 있는 기본 자세 (k: 숨쉬기 위상)
    for (const s of ['L', 'R']) { legs[s].h.rotation.set(0, 0, (s === 'L' ? 1 : -1) * 0.04); legs[s].kn.rotation.set(0.04, 0, 0); f.armFK(s, 0.05, (s === 'L' ? 1 : -1) * 0.1, -0.18); }
    hips.position.y = 0.93 + Math.sin(k) * 0.004; hips.rotation.set(0, 0, 0); spine.rotation.set(0.03 + Math.sin(k) * 0.01, 0, 0); head.rotation.set(0, 0, 0);
  };
  f.sit = (s = 1, seat = 0.5) => { // s: 0 서 있음 → 1 앉음
    for (const k of ['L', 'R']) { legs[k].h.rotation.set(-1.45 * s, 0, (k === 'L' ? 1 : -1) * 0.1 * s); legs[k].kn.rotation.set(1.5 * s, 0, 0); }
    hips.position.y = lerp(0.93, seat + 0.1, s); spine.rotation.x = 0.12 * s + Math.sin(s * Math.PI) * 0.35;
  };
  f.crouch = c => { for (const k of ['L', 'R']) { legs[k].h.rotation.x = -0.9 * c; legs[k].h.rotation.z = (k === 'L' ? 1 : -1) * (0.06 + 0.12 * c); legs[k].kn.rotation.x = 1.8 * c; } hips.position.y = 0.93 - 0.42 * c; };
  // 외투 자락의 흔들림
  f.sway = (time, speed = 0, wind = 0) => {
    const g = coat.userData.geo; if (!g) return; const b = coat.userData.base, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1], k = Math.max(0, y / -(coat.userData.h || 0.78)) ** 1.6, a = Math.atan2(b[i * 3 + 2], b[i * 3]);
      p.setX(i, b[i * 3] * (1 + k * wind * 0.25) + k * (Math.sin(time * 7 + a * 2) * 0.03 * (speed + wind)) + k * wind * 0.12);
      p.setZ(i, b[i * 3 + 2] * (1 + k * speed * 0.1) - k * speed * 0.2 + k * Math.sin(time * 9 + a * 3) * 0.035 * (speed + wind)); }
    p.needsUpdate = true; g.computeVertexNormals();
  };
  f.handPos = k => arms[k].hand.getWorldPosition(V());
  return f;
}
// 경로를 따라 걷게 한다. pts: [[x,z],...], u: 0..1
export function alongPath(pts, u) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => V(p[0], 0, p[1])), false, 'centripetal');
  const p = c.getPointAt(clamp(u)), tg = c.getTangentAt(clamp(u));
  return { p, yaw: Math.atan2(tg.x, tg.z), len: c.getLength() };
}
