// 장면 3~5 — 2010년대 골목의 그래피티(사실적 3D), 휴대폰 촬영, 디지털 스캔
import * as THREE from 'three';
import { renderFilm, blit, renderer } from './film.js';
import { V, tex, noiseTex, std, box, cyl, ball, shaft, makePaper, makeFigure } from './kit.js';
import { W, H, clamp, lerp, prog, ease, rng, noise, canvas, logoBitmap, drawLogo, glitch } from './core.js';

const GREEN = '#00ff7f';
const DS = 1536, DM = 3.4, LCY = 1.85;                 // 페인트 데칼: 캔버스 크기, 실제 크기(m), 로고 중심 높이
const LG = { x: DS / 2, y: DS / 2, size: 1040 };       // 데칼 캔버스 안의 로고
const LM = LG.size / DS * DM;                          // 벽 위 로고 크기(m)
const BW = 0.22, BH = 0.075;
let S;

// ---------- 2D 페인트 ----------
const GR = {};
function graffiti(logo, key, stops) {
  if (GR[key]) return GR[key];
  const R = 1024, c = canvas(R, R), x = c.getContext('2d'), m = canvas(R, R), mx = m.getContext('2d');
  mx.drawImage(logoBitmap(logo, R, '#ffffff'), 0, 0); mx.globalCompositeOperation = 'source-in';
  const g = mx.createLinearGradient(R * 0.15, R * 0.1, R * 0.85, R * 0.95); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  mx.fillStyle = g; mx.fillRect(0, 0, R, R);
  x.filter = 'blur(12px)'; x.globalAlpha = 0.5; x.drawImage(m, 0, 0); x.filter = 'none'; x.globalAlpha = 1;
  x.drawImage(logoBitmap(logo, R, '#0b0810'), 4, 5); x.drawImage(m, 0, 0);
  return (GR[key] = c);
}
const OLD_COLS = ['#ff2d7a', '#ff7a1a', '#ffd400', '#19d3ff', '#9a4dff'], NEW_COLS = ['#00ff7f', '#2dffc4', '#c8ffe6', '#00ff7f', '#00d0ff'];
function sprayPath(n, seed, slow) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < n; i++) { const k = i / (n - 1);
    if (slow) { const a = k * Math.PI * 7, rad = 0.06 + k * 0.5; pts.push([0.5 + Math.cos(a) * rad * 0.8 + (r() - 0.5) * 0.05, 0.5 + Math.sin(a) * rad + (r() - 0.5) * 0.05]); }
    else { const row = Math.floor(k * 7), u = (k * 7) % 1; pts.push([0.12 + (row % 2 ? 1 - u : u) * 0.76 + (r() - 0.5) * 0.06, 0.08 + (row + u) / 7 * 0.86]); } }
  return pts;
}
const FAST = sprayPath(90, 3, false), SLOW = sprayPath(120, 9, true);
const at = (pts, p) => { const f = clamp(p) * (pts.length - 1), i = Math.floor(f), b = pts[Math.min(pts.length - 1, i + 1)]; return [lerp(pts[i][0], b[0], f - i), lerp(pts[i][1], b[1], f - i)]; };
let mC, cC, mortar;
function mask(pts, p, rad) {
  mC ||= canvas(512, 512); const x = mC.getContext('2d'); x.clearRect(0, 0, 512, 512);
  const n = clamp(p) * (pts.length - 1);
  for (let i = 0; i <= n; i++) { const [u, v] = pts[i], rr = rad * 512 * clamp((n - i) / 3 + 0.35, 0, 1), g = x.createRadialGradient(u * 512, v * 512, rr * 0.45, u * 512, v * 512, rr); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(u * 512 - rr, v * 512 - rr, rr * 2, rr * 2); }
  return mC;
}
function masked(ctx, sprite, m, inv) {
  cC ||= canvas(1024, 1024); const x = cC.getContext('2d');
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 1024, 1024); x.drawImage(sprite, 0, 0);
  x.globalCompositeOperation = inv ? 'destination-out' : 'destination-in'; x.drawImage(m, 0, 0, 1024, 1024);
  ctx.drawImage(cC, LG.x - LG.size / 2, LG.y - LG.size / 2, LG.size, LG.size);
}
function drips(ctx, p, cols, seed) {
  const r = rng(seed);
  for (let i = 0; i < 11; i++) { const x = LG.x - 330 + r() * 660, y0 = LG.y + 150 + r() * 260, len = (40 + r() * 170) * clamp(p * 1.5 - r() * 0.5); if (len <= 0) continue;
    ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 5 + r() * 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + len); ctx.stroke(); }
}
// a: 기존 로고 진행, b: 2026 로고로 덧칠 진행
function paint(ctx, A, a, b) {
  const oldS = graffiti(A.old, 'old', OLD_COLS), newS = graffiti(A.neo, 'new', NEW_COLS), q = [LG.x - LG.size / 2, LG.y - LG.size / 2, LG.size, LG.size];
  ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, DS, DS);
  if (b >= 1) { ctx.drawImage(newS, ...q); drips(ctx, 1, NEW_COLS, 5); }
  else if (a > 0) {
    if (b <= 0) { if (a >= 1) ctx.drawImage(oldS, ...q); else masked(ctx, oldS, mask(FAST, a, 0.17), false); drips(ctx, a, OLD_COLS, 2); }
    else { const m = mask(SLOW, b, 0.2); ctx.save(); ctx.globalAlpha = 1 - b * 0.7; drips(ctx, 1, OLD_COLS, 2); ctx.restore(); masked(ctx, oldS, m, true); masked(ctx, newS, m, false); drips(ctx, b, NEW_COLS, 5); }
  }
  // 벽돌 줄눈과 거친 표면에는 페인트가 덜 먹는다
  ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(mortar, 0, 0); ctx.globalCompositeOperation = 'source-over';
}

// ---------- 세트 ----------
function bricks(w, h, mw, mh, x0, y0, mode) { // mode: 'color' | 'bump' | 'mortar'
  return (x) => {
    const sx = w / mw, sy = h / mh, r = rng(77);
    x.fillStyle = mode === 'color' ? '#3d302d' : mode === 'bump' ? '#000' : 'rgba(0,0,0,0)'; if (mode !== 'mortar') x.fillRect(0, 0, w, h);
    const r0 = Math.floor(y0 / BH), r1 = Math.ceil((y0 + mh) / BH);
    for (let row = r0; row < r1; row++) for (let col = Math.floor(x0 / BW) - 1; col < (x0 + mw) / BW + 1; col++) {
      const bx = (col * BW + (row & 1) * BW / 2 - x0) * sx, by = h - (row * BH + BH - y0) * sy, hh = Math.sin(row * 127.1 + col * 311.7) * 43758.5453, v = hh - Math.floor(hh);
      if (mode === 'color') { x.fillStyle = `rgb(${96 + v * 62},${52 + v * 30},${44 + v * 22})`; x.fillRect(bx + 1.5, by + 1.5, BW * sx - 3, BH * sy - 3); if (v > 0.86) { x.fillStyle = 'rgba(20,14,14,0.45)'; x.fillRect(bx + 1.5, by + 1.5, BW * sx - 3, BH * sy - 3); } }
      else if (mode === 'bump') { x.fillStyle = `rgb(${190 + v * 60},${190 + v * 60},${190 + v * 60})`; x.fillRect(bx + 2, by + 2, BW * sx - 4, BH * sy - 4); }
      else { x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3.5; x.strokeRect(bx, by, BW * sx, BH * sy); }
    }
    if (mode === 'mortar') for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.5})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    if (mode === 'color') { for (let i = 0; i < 60; i++) { const g = x.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 100 + r() * 400); g.addColorStop(0, `rgba(${r() > 0.6 ? '220,210,200' : '8,6,10'},0.2)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
      for (let i = 0; i < 30; i++) { const px = r() * w, g = x.createLinearGradient(0, 0, 0, h * (0.3 + r() * 0.6)); g.addColorStop(0, 'rgba(10,8,10,0.4)'); g.addColorStop(1, 'rgba(10,8,10,0)'); x.fillStyle = g; x.fillRect(px, 0, 14 + r() * 50, h); }
      x.font = 'bold 70px Inter, sans-serif'; x.globalAlpha = 0.16; x.fillStyle = '#d8d0c0'; x.save(); x.translate(w * 0.13, h * 0.62); x.rotate(-0.12); x.fillText('NO', 0, 0); x.fillText('POSTING', -30, 70); x.restore(); x.globalAlpha = 1; }
  };
}
export function initAlley(A) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05060c); scene.fog = new THREE.FogExp2(0x0a0c16, 0.028);
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.02, 200), phoneCam = new THREE.PerspectiveCamera(46, W / H, 0.05, 200);
  const r = rng(5), WW = 18, WH = 7;
  mortar = canvas(DS, DS); bricks(DS, DS, DM, DM, -DM / 2, LCY - DM / 2, 'mortar')(mortar.getContext('2d'));
  const wmat = new THREE.MeshStandardMaterial({ map: tex(4096, 1600, bricks(4096, 1600, WW, WH, -WW / 2, 0, 'color')), bumpMap: tex(2048, 800, bricks(2048, 800, WW, WH, -WW / 2, 0, 'bump'), { srgb: false }), bumpScale: 2.2, roughness: 0.86 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), wmat); wall.position.set(0, WH / 2, 0); wall.receiveShadow = true; scene.add(wall);
  const dc = canvas(DS, DS), dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace; dt.anisotropy = 8;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(DM, DM), new THREE.MeshStandardMaterial({ map: dt, transparent: true, roughness: 0.5, emissive: 0xffffff, emissiveMap: dt, emissiveIntensity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.position.set(0, LCY, 0.004); decal.receiveShadow = true; scene.add(decal);
  // 젖은 바닥
  const gm = new THREE.MeshStandardMaterial({ color: 0x1b1b20, map: noiseTex(512, 51, 90, 50, [8, 4], 2), roughnessMap: noiseTex(512, 52, 110, 120, [3, 2], 10), roughness: 0.75, metalness: 0.15 });
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), gm); gnd.rotation.x = -Math.PI / 2; gnd.position.set(8, 0, 7.9); gnd.receiveShadow = true; scene.add(gnd);
  box(60, 0.14, 0.5, std(0x34343a, { roughness: 0.6 }), 8, 0.07, 0.25, scene);
  const dk = std(0x15161a, { roughness: 0.5, metalness: 0.5 }), metal = std(0x3a4048, { roughness: 0.45, metalness: 0.7 });
  // 배수관, 전선, 실외기, 창문, 철문, 비상계단
  cyl(0.07, 0.07, 7, metal, -3.3, 3.5, 0.1, scene, 10); for (const y of [0.9, 2.7, 4.6]) cyl(0.09, 0.09, 0.06, dk, -3.3, y, 0.1, scene, 10);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-9, 5.0 + i * 0.25, 0.06), V(-3, 4.6 + i * 0.3, 0.1), V(3, 4.9 + i * 0.2, 0.08), V(9, 4.7 + i * 0.3, 0.06)]), 40, 0.012, 5), dk); c.castShadow = true; scene.add(c); }
  box(0.9, 0.6, 0.4, metal, -2.3, 4.45, 0.22, scene); cyl(0.22, 0.22, 0.03, dk, -2.3, 4.45, 0.43, scene, 16).rotation.x = Math.PI / 2;
  box(1.5, 1.3, 0.08, std(0x0b0d14, { roughness: 0.15, metalness: 0.6, emissive: 0x3a2a14, emissiveIntensity: 0.6 }), 3.6, 4.1, 0.01, scene); for (let i = 0; i < 6; i++) cyl(0.014, 0.014, 1.3, dk, 2.95 + i * 0.26, 4.1, 0.1, scene, 6); box(1.7, 0.08, 0.2, std(0x55555c), 3.6, 3.42, 0.08, scene);
  box(1.05, 2.15, 0.06, std(0x2c3a40, { roughness: 0.4, metalness: 0.6 }), 5.2, 1.08, 0.02, scene); box(1.25, 2.3, 0.04, std(0x1a1c20), 5.2, 1.15, 0.0, scene); ball(0.035, metal, 4.82, 1.05, 0.08, scene);
  const dl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5030).multiplyScalar(3) })); dl.position.set(5.2, 2.5, 0.12); scene.add(dl); const dpl = new THREE.PointLight(0xff5030, 2.2, 5, 1.8); dpl.position.set(5.2, 2.45, 0.35); scene.add(dpl);
  for (let i = 0; i < 2; i++) box(0.05, 6.4, 0.05, dk, -5.6 + i * 0.6, 3.6, 0.45, scene); for (let i = 0; i < 16; i++) cyl(0.018, 0.018, 0.6, dk, -5.3, 0.6 + i * 0.4, 0.45, scene, 6).rotation.z = Math.PI / 2;
  box(2.2, 0.06, 0.9, dk, -5.3, 5.3, 0.45, scene);
  // 쓰레기통, 상자, 봉투, 스프레이 캔
  box(1.7, 1.15, 0.95, std(0x23483e, { roughness: 0.5, metalness: 0.4 }), -6.2, 0.6, 0.62, scene); const lid = box(1.76, 0.07, 1.0, std(0x1a3a32, { roughness: 0.5, metalness: 0.4 }), -6.2, 1.22, 0.6, scene); lid.rotation.x = -0.12;
  for (const [x, z, s] of [[-4.6, 0.5, 0.36], [-4.2, 0.72, 0.3], [6.6, 0.5, 0.4]]) { const b = ball(s, std(0x0c0c0e, { roughness: 0.35 }), x, s * 0.8, z, scene); b.scale.set(1, 0.82, 0.9); }
  box(0.6, 0.45, 0.45, std(0x6a5a44), 6.9, 0.23, 1.3, scene).rotation.y = 0.4; box(0.5, 0.4, 0.4, std(0x7a6a50), 7.0, 0.66, 1.25, scene).rotation.y = 0.2;
  const cans = [0xff2d7a, 0xffd400, 0x19d3ff, 0x00ff7f, 0xeeeeee].map((c, i) => { const g = new THREE.Group(); cyl(0.033, 0.033, 0.19, std(c, { roughness: 0.3, metalness: 0.5 }), 0, 0.095, 0, g, 12); cyl(0.012, 0.016, 0.03, std(0xdddddd), 0, 0.2, 0, g, 8); g.position.set(-1.9 + i * 0.13 + (i % 2) * 0.05, 0, 0.55 + (i % 3) * 0.1); if (i === 4) { g.rotation.z = 1.57; g.position.y = 0.035; } scene.add(g); return g; });
  const bag = box(0.42, 0.3, 0.2, std(0x1a1a20), -2.25, 0.15, 0.45, scene);
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.4 + r() * 0.9, 20), new THREE.MeshStandardMaterial({ color: 0x06070a, roughness: 0.04, metalness: 0.9 })); p.rotation.x = -Math.PI / 2; p.scale.y = 0.5 + r() * 0.4; p.position.set(-5 + r() * 12, 0.006, 1.6 + r() * 3.5); scene.add(p); }
  // 포스터
  for (const [x, y, c] of [[-4.3, 1.7, 0xc9b98a], [-3.9, 2.35, 0x8fb0b8], [2.4, 1.2, 0xb8b0a0]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.6), std(c, { map: noiseTex(128, x * 10, 200, 60, [1, 1], 2) })); p.position.set(x, y, 0.006); p.rotation.z = (r() - 0.5) * 0.2; scene.add(p); }
  // 조명: 벽등(따뜻함), 달빛 림(차가움), 멀리 거리의 불빛
  box(0.06, 0.06, 1.1, dk, 1.7, 5.25, 0.55, scene); cyl(0.2, 0.34, 0.2, dk, 1.7, 5.15, 1.1, scene, 16);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(6) })); bulb.position.set(1.7, 5.02, 1.1); scene.add(bulb);
  const lamp = new THREE.SpotLight(0xffd2a0, 130, 16, 0.86, 0.75, 1.5); lamp.position.set(1.7, 5.0, 1.15); lamp.target.position.set(0.1, 0.6, 0.9); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0008; lamp.shadow.radius = 5; scene.add(lamp, lamp.target);
  const sf = shaft(0.2, 3.4, 5.2, 0xffd9a0, 0.06); sf.position.copy(bulb.position); sf.quaternion.setFromUnitVectors(V(0, -1, 0), V(0.1, 0.6, 0.9).sub(bulb.position).normalize()); scene.add(sf);
  const rim = new THREE.DirectionalLight(0x6f8cff, 0.9); rim.position.set(-6, 7, 6); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x4a5a90, 0x1a1512, 0.8));
  const bokeh = Array.from({ length: 46 }, (_, i) => { const c = [0xffd9a0, 0xff2d7a, 0x19d3ff, 0xffd400, 0xff4020, 0xffffff][i % 6]; const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 + r() * 0.14, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3), fog: false })); b.position.set(13 + r() * 46, 0.6 + r() * 9, 1 + r() * 11); b.userData = { x: b.position.x, v: i % 5 === 0 ? 6 + r() * 6 : 0 }; scene.add(b); return b; });
  box(0.3, 14, 20, std(0x111218), -9.2, 7, 10, scene); box(40, 14, 0.3, std(0x0c0d12), 8, 7, 15.5, scene);
  // 스프레이 안개, 페인트 빛
  const mistTex = tex(32, 32, x => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
  const mist = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.05, map: mistTex, transparent: true, opacity: 0.3, depthWrite: false })); mist.frustumCulled = false; scene.add(mist);
  const glow = new THREE.PointLight(0xffffff, 0, 3.5, 1.6); scene.add(glow);
  // 인물, 종이, 캔, 휴대폰
  const artist = makeFigure({ hood: true, pack: true }); scene.add(artist.root);
  const can = new THREE.Group(); cyl(0.033, 0.033, 0.19, std(0x202024, { roughness: 0.3, metalness: 0.6 }), 0, 0, 0, can, 12); cyl(0.012, 0.016, 0.035, std(0xdddddd), 0, 0.11, 0, can, 8); scene.add(can);
  const paper = makePaper(A.old, 0.4); paper.material.emissiveIntensity = 0.12; scene.add(paper);
  const walker = makeFigure({ coat: 0.3, hair: true }); scene.add(walker.root);
  const phone = new THREE.Group(); scene.add(phone);
  const PW = 0.158, PH = PW * 9 / 16;
  const body = box(PW + 0.022, PH + 0.012, 0.009, std(0x0c0c10, { roughness: 0.25, metalness: 0.8 }), 0, 0, -0.005, phone);
  const rtp = new THREE.WebGLRenderTarget(960, 540); rtp.texture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: rtp.texture, fog: false, color: 0xb0b0b0 })); phone.add(screen);
  const uic = canvas(960, 540), uit = new THREE.CanvasTexture(uic); uit.colorSpace = THREE.SRGBColorSpace;
  const ui = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: uit, transparent: true, fog: false, depthWrite: false })); ui.position.z = 0.0006; phone.add(ui);
  S = { scene, cam, phoneCam, dc, dt, decal, artist, can, cans, paper, walker, phone, rtp, uic, uit, mist, glow, bokeh, lamp, PW, PH, key: '' };
}
const look = (cam, p, t) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(t); };
const shake = (t, a, s = 1) => V(noise(t * 1.3 * s, 1) * a, noise(t * 1.1 * s, 2) * a, noise(t * 0.9 * s, 3) * a);
const wallPt = pt => V((pt[0] - 0.5) * LM, LCY + (0.5 - pt[1]) * LM, 0);
function setPaint(A, a, b) { const k = a.toFixed(4) + b.toFixed(4); if (k === S.key) return; S.key = k; paint(S.dc.getContext('2d'), A, a, b); S.dt.needsUpdate = true; }
function common(t) { S.bokeh.forEach(b => { if (b.userData.v) b.position.x = 13 + ((b.userData.x + t * b.userData.v) % 46); }); S.lamp.intensity = 130 * (1 + noise(t * 23, 9) * 0.03 - (noise(t * 3, 8) > 0.82 ? 0.25 : 0)); }
const BASE = { mono: 0, outline: 0, paper: 0, hatch: 0, grain: 0.055, vig: 0.6, bloom: 0.32, bloomT: 0.95, exposure: 1.05, aperture: 0.5 };

/* 0-1.5 종이를 잡는다 · 1.5-3.0 로고 확인 · 3.0-5.6 기존 로고를 빠르게 · 5.6-7.2 맘에 안 듦 · 7.2-11.6 천천히 2026 로고로 · 11.6- 완성 */
export function alley(ctx, t, dur, A, sub) {
  const { scene, cam, artist: f, can, paper, walker, phone, mist, glow } = S, st = { ...BASE };
  common(t); walker.root.visible = phone.visible = false; f.root.visible = true; paper.visible = t < 3.0; can.visible = t >= 3.0 && t < 12.3; mist.visible = false; glow.intensity = 0;
  const a = prog(t, 3.1, 5.5), b = ease.io(prog(t, 7.3, 11.5)); setPaint(A, a, b);
  let spray = null, col = '#fff';
  if (t < 1.5) { // 내려오는 종이를 발견하고 잡는다
    const w = prog(t, 0, 1.0), cat = ease.out(prog(t, 0.95, 1.42));
    f.root.position.set(lerp(-5.6, -2.0, ease.out(w)), 0, 1.5); f.root.rotation.y = Math.PI / 2; f.walk(w * 9, 1 - prog(w, 0.8, 1)); if (w >= 1) f.stand(t * 3);
    const hand = V(-1.55, 2.2, 1.45); f.head.rotation.x = -0.5 * prog(t, 0.4, 0.9); if (cat > 0) f.reach('R', V(-1.7, 1.2, 1.5).lerp(hand, cat), V(0, -1, 0.4));
    const k = ease.out(prog(t, 0, 1.42)), pp = new THREE.CatmullRomCurve3([V(4.5, 8, 4.5), V(1.5, 5.2, 2.6), V(-0.6, 3.5, 2.2), V(-1.3, 2.7, 1.2), hand]).getPoint(k);
    paper.position.copy(pp); paper.rotation.set(t * 5 * (1 - k) - 0.3, t * 3 * (1 - k) - 1.2, (1 - k) * 2); paper.flutter(t, 1 - k * 0.6);
    const c = ease.io(prog(t, 0, 1.5)); look(cam, V(lerp(4.2, 0.6, c), lerp(6.5, 1.5, c), lerp(7.5, 5.6, c)).add(shake(t, 0.03)), pp.clone().lerp(V(-1.2, 1.6, 0.8), c * 0.6));
    cam.fov = 44; st.focus = cam.position.distanceTo(pp); st.aperture = 0.3; st.fade = prog(t, 0, 0.35);
  } else if (t < 3.0) { // 어깨 너머로 종이 속 기존 로고를 확인
    f.root.position.set(-2.0, 0, 1.5); f.root.rotation.y = Math.PI / 2; f.stand(t * 3);
    const lower = ease.io(prog(t, 2.45, 2.9)), pp = V(-1.52, 1.5 - lower * 0.35, 1.5 - lower * 0.1);
    paper.position.copy(pp); paper.rotation.set(-0.25 - lower * 0.8, -Math.PI / 2, 0, 'YXZ'); paper.flutter(t, 0.12);
    f.reach('R', pp.clone().add(V(-0.06, -0.1, 0.16)), V(0, -1, 0.3)); f.reach('L', pp.clone().add(V(-0.06, -0.1, -0.16)), V(0, -1, -0.3));
    f.head.rotation.set(0.35 - lower * 0.4, -lower * 1.1, 0); f.spine.rotation.y = -lower * 0.4;
    const c = ease.io(prog(t, 1.5, 3.0)); look(cam, V(lerp(-2.75, -2.6, c), lerp(1.86, 1.8, c), lerp(1.86, 2.0, c)).add(shake(t, 0.004)), pp.clone().add(V(0.4, 0.02, -0.25 * lower)));
    cam.fov = 36; st.focus = cam.position.distanceTo(pp); st.aperture = 1.3;
  } else if (t < 5.6) { // 화려한 색으로 빠르게 그린다
    const pt = at(FAST, a), tg = wallPt(pt); spray = a > 0 && a < 1 ? tg : null; col = OLD_COLS[Math.floor(a * 9) % 5];
    f.root.position.set(tg.x * 0.6 - 0.28 + noise(t * 9, 4) * 0.05, 0, 0.92); f.root.rotation.y = Math.PI + (tg.x - f.root.position.x) * -0.5;
    f.stand(t * 8); f.crouch(clamp((1.7 - tg.y) * 0.75, 0, 0.9)); f.spine.rotation.set(0.12 + (1.9 - tg.y) * 0.12, noise(t * 10, 5) * 0.2, (tg.x - f.root.position.x) * -0.2);
    f.reach('R', tg.clone().add(V(0, 0.02, 0.36)), V(0.5, -1, 0)); f.armFK('L', 0.3, 0.5, -0.6); f.head.lookAt(tg);
    const c = ease.io(prog(t, 3.0, 5.6)); look(cam, V(lerp(-3.4, 2.9, c), lerp(0.9, 1.5, c), lerp(4.6, 3.9, c) - Math.sin(c * Math.PI) * 1.2).add(shake(t, 0.02, 3)), V(lerp(-0.4, 0.2, c), 1.75, 0));
    cam.fov = 42 - Math.sin(c * Math.PI) * 6; st.focus = cam.position.distanceTo(V(0, 1.8, 0.3)); st.aperture = 0.3;
  } else if (t < 7.2) { // 물러나서 보더니 고개를 젓는다
    const k = ease.io(prog(t, 5.6, 6.3)); f.root.position.set(lerp(0.2, 0.55, k), 0, lerp(0.92, 2.5, k)); f.root.rotation.y = Math.PI;
    if (k < 1) f.walk(-k * 7, 0.6); else f.stand(t * 3);
    const sh = prog(t, 6.45, 6.6) * (1 - prog(t, 7.0, 7.15)); f.head.rotation.set(0.05, Math.sin((t - 6.45) * 15) * 0.42 * sh, 0.25 * ease.io(prog(t, 6.2, 6.5)) * (1 - sh)); f.spine.rotation.x = 0.05 + 0.1 * sh;
    f.armFK('R', 0.1, -0.12, -0.3); f.armFK('L', 0.05, 0.12, -0.2);
    const c = ease.io(prog(t, 5.6, 7.2)); look(cam, V(lerp(1.5, 1.25, c), 1.72, lerp(4.6, 4.2, c)).add(shake(t, 0.008)), V(0, 1.75, 0)); cam.fov = 40; st.focus = cam.position.z; st.aperture = 0.55;
  } else if (t < 11.6) { // 천천히, 정성껏 2026 로고로 고친다
    const pt = at(SLOW, b), tg = wallPt(pt); spray = b > 0.001 && b < 0.999 ? tg : null; col = NEW_COLS[Math.floor(b * 12) % 5];
    const ap = ease.io(prog(t, 7.2, 7.8)), back = ease.io(prog(t, 11.2, 11.6));
    f.root.position.set(lerp(0.55, tg.x * 0.6 - 0.26, ap), 0, lerp(2.5, 0.95, ap) + back * 0.5); f.root.rotation.y = Math.PI + (tg.x - f.root.position.x) * -0.45 * ap;
    if (ap < 1) f.walk(ap * 6, 0.7); else { f.stand(t * 3); f.crouch(clamp((1.6 - tg.y) * 0.7, 0, 0.85)); }
    f.spine.rotation.set(0.1 + (1.9 - tg.y) * 0.1, 0, (tg.x - f.root.position.x) * -0.15);
    if (ap > 0.6) { f.reach('R', tg.clone().add(V(0, 0.02, 0.36)), V(0.5, -1, 0)); f.head.lookAt(tg); }
    if (t < 8.7) { const c = prog(t, 7.2, 8.7); look(cam, tg.clone().add(V(0.85 - c * 0.2, 0.08, 0.5)).add(shake(t, 0.004)), tg.clone().add(V(-0.3, 0, 0.1))); cam.fov = 34; st.focus = cam.position.distanceTo(tg) * 0.9; st.aperture = 1.5; }
    else if (t < 10.3) { const c = ease.io(prog(t, 8.7, 10.3)); look(cam, V(lerp(-2.9, -2.2, c), 1.55, lerp(1.9, 2.6, c)).add(shake(t, 0.006)), V(0.1, 1.8, 0.2)); cam.fov = 38; st.focus = cam.position.distanceTo(f.root.position.clone().setY(1.5)); st.aperture = 0.8; }
    else { const c = ease.io(prog(t, 10.3, 11.6)); look(cam, V(lerp(0.5, 0, c), lerp(1.2, 1.7, c), lerp(2.4, 5.4, c)).add(shake(t, 0.006)), V(0, lerp(1.6, 1.85, c), 0)); cam.fov = 40; st.focus = cam.position.z; st.aperture = 0.4; }
  } else { // 만족하고 떠난다
    const k = prog(t, 12.2, dur + 0.5), nod = prog(t, 11.7, 12.2);
    f.root.position.set(lerp(0.4, 9, ease.in(k)), 0, lerp(1.5, 2.2, k)); f.root.rotation.y = lerp(Math.PI, Math.PI / 2, ease.io(prog(k, 0, 0.12)));
    if (k > 0) f.walk(k * 22, 1); else { f.stand(t * 3); f.head.rotation.x = Math.sin(nod * Math.PI * 2) * 0.22; f.armFK('R', 0.1, -0.12, -0.3); }
    const c = ease.io(prog(t, 11.6, dur)); look(cam, V(0, lerp(1.7, 1.8, c), lerp(5.4, 4.6, c)).add(shake(t, 0.005)), V(0, 1.85, 0)); cam.fov = 40; st.focus = cam.position.z; st.aperture = 0.4;
  }
  // 캔, 분사 안개, 페인트 빛
  if (can.visible) { const h = f.handPos('R'); can.position.copy(h); if (spray) { can.quaternion.setFromUnitVectors(V(0, 1, 0), V(0.25, 1, 0).normalize()); } else can.rotation.set(0.3, 0, 0.2); }
  if (spray) { const p = mist.geometry.attributes.position, r = rng(Math.floor(t * 60) + sub * 7 + 1), nz = can.position.clone().add(V(0, 0.1, -0.03));
    for (let i = 0; i < 240; i++) { const k = r() ** 0.7, sp = k * 0.16; p.setXYZ(i, lerp(nz.x, spray.x, k) + (r() - 0.5) * sp, lerp(nz.y, spray.y, k) + (r() - 0.5) * sp, lerp(nz.z, 0.02, k) + (r() - 0.5) * sp * 0.4); }
    p.needsUpdate = true; mist.visible = true; mist.material.color.set(col); glow.color.set(col); glow.intensity = 0.6; glow.position.copy(spray).add(V(0, 0, 0.3)); }
  cam.updateProjectionMatrix(); renderFilm(scene, cam, st, t, sub); blit(ctx);
}

// ---------- 장면 4: 휴대폰 ----------
const WP = V(0.28, 0, 4.0), PP = V(0.05, 1.62, 3.55);          // 행인 위치, 휴대폰 위치
function cameraUI(ctx, t, lock, w = W, h = H) {
  ctx.save(); ctx.scale(w / W, h / H); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = W / 2 + sx * 880, cy = H / 2 + sy * 470; ctx.beginPath(); ctx.moveTo(cx, cy - sy * 70); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * 70, cy); ctx.stroke(); }
  ctx.globalAlpha = 0.25; ctx.lineWidth = 2; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(W * i / 3, 0); ctx.lineTo(W * i / 3, H); ctx.moveTo(0, H * i / 3); ctx.lineTo(W, H * i / 3); ctx.stroke(); }
  ctx.globalAlpha = 1; const R = photoRect(), s = lerp(R.size * 0.72, R.size * 0.56, ease.out(lock)) + (lock < 1 ? Math.sin(t * 16) * 8 : 0);
  ctx.strokeStyle = lock >= 1 ? GREEN : '#ffd23d'; ctx.lineWidth = 6;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = R.x + sx * s, cy = R.y + sy * s; ctx.beginPath(); ctx.moveTo(cx, cy - sy * 60); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * 60, cy); ctx.stroke(); }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(1790, 540, 60, 0, 7); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1790, 540, 46, 0, 7); ctx.fill();
  ctx.font = '600 34px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText('PHOTO', 110, 130); ctx.fillText('1x', 1768, 700); ctx.fillStyle = '#ffd23d'; ctx.fillText('HDR', 110, 980);
  ctx.restore();
}
function setPhoneCam() { const c = S.phoneCam; c.position.copy(PP); c.up.set(0, 1, 0); c.lookAt(PP.x, PP.y, 0); c.updateProjectionMatrix(); c.updateMatrixWorld(); }
let PR;
function photoRect() { // 휴대폰 사진 속 로고의 화면 위치
  if (PR) return PR; setPhoneCam();
  const a = V(-LM / 2, LCY + LM / 2, 0).project(S.phoneCam), b = V(LM / 2, LCY - LM / 2, 0).project(S.phoneCam);
  return (PR = { x: (a.x + b.x) / 2 * W / 2 + W / 2, y: -(a.y + b.y) / 2 * H / 2 + H / 2, size: (b.x - a.x) * W / 2 });
}
const PHOTO_ST = { ...BASE, aperture: 0, vig: 0.45 };
let photoC;
function photo(A) { // 찰칵 찍힌 사진(고정 프레임)
  if (photoC) return photoC;
  const { scene, phoneCam, artist, walker, phone, paper, can, mist, glow } = S;
  common(100); setPaint(A, 1, 1); artist.root.visible = walker.root.visible = phone.visible = paper.visible = can.visible = mist.visible = false; glow.intensity = 0; setPhoneCam();
  photoC = canvas(W, H); const x = photoC.getContext('2d');
  for (let k = 0; k < 4; k++) { renderFilm(scene, phoneCam, PHOTO_ST, 3.3, k); x.globalAlpha = 1 / (k + 1); blit(x); }
  return photoC;
}
/* 0-1.3 행인이 다가와 휴대폰을 든다 · 1.3-3.1 화면으로 클로즈업 · 3.1 초점 고정 · 3.45 찰칵 · 이후 사진이 어두워진다 */
export const SHUTTER = 3.45;
export function phone(ctx, t, dur, A, sub) {
  const { scene, cam, phoneCam, artist, walker: f, phone: ph, paper, can, mist, glow, rtp, uic, uit, PH } = S, st = { ...BASE };
  const pc = photo(A);
  if (t < 3.1) {
    common(t); setPaint(A, 1, 1); artist.root.visible = paper.visible = can.visible = mist.visible = false; glow.intensity = 0; f.root.visible = true;
    const w = ease.out(prog(t, 0, 0.95)), raise = ease.io(prog(t, 0.7, 1.35));
    f.root.position.set(lerp(5.2, WP.x, w), 0, WP.z); f.root.rotation.y = lerp(-Math.PI / 2, Math.PI, ease.io(prog(t, 0.55, 1.0)));
    if (w < 1) f.walk(w * 10, 1 - prog(w, 0.85, 1)); else f.stand(t * 3); f.sway(t, 1 - w, 0.1);
    const pp = V(WP.x - 0.2, 1.0, WP.z - 0.25).lerp(PP, raise).add(V(noise(t * 1.7, 3) * 0.004, noise(t * 2.1, 4) * 0.004, 0));
    ph.position.copy(pp); ph.rotation.set(lerp(-1.2, 0, raise), 0, lerp(1.2, 0, raise)); ph.visible = true;
    if (raise > 0) { f.reach('R', pp.clone().add(V(0.09, -0.02, 0.03)), V(0.6, -1, 0.2)); f.reach('L', pp.clone().add(V(-0.09, -0.02, 0.03)), V(-0.6, -1, 0.2)); f.head.rotation.x = 0.12 * raise; }
    // 휴대폰 화면: 휴대폰 카메라가 보는 장면 + 카메라 앱 UI
    setPhoneCam(); ph.visible = false; f.root.visible = false; renderFilm(scene, phoneCam, PHOTO_ST, t, sub, rtp); ph.visible = true; f.root.visible = true;
    const ux = uic.getContext('2d'); ux.clearRect(0, 0, 960, 540); cameraUI(ux, t, prog(t, 2.9, 3.1), 960, 540); uit.needsUpdate = true;
    const k = ease.io(prog(t, 1.2, 3.1)), fill = PH / 2 / Math.tan((30 * Math.PI) / 360);
    cam.position.copy(V(1.15, 1.78, 5.6).lerp(V(PP.x, PP.y, PP.z + fill), k)).add(shake(t, 0.01 * (1 - k))); cam.up.set(0, 1, 0);
    cam.lookAt(V(0.1, 1.75, 0).lerp(V(PP.x, PP.y, PP.z), ease.out(k))); cam.fov = lerp(40, 30, k); cam.near = 0.01; cam.updateProjectionMatrix();
    st.focus = cam.position.distanceTo(PP); st.aperture = 0.9 * (1 - k * 0.3);
    renderFilm(scene, cam, st, t, sub); blit(ctx);
  } else {
    ctx.drawImage(pc, 0, 0);
    if (t < SHUTTER + 0.25) cameraUI(ctx, t, 1);
    const d = prog(t, SHUTTER + 0.35, dur); if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${ease.io(d) * 0.82})`; ctx.fillRect(0, 0, W, H); }
  }
  const sh = t - SHUTTER; // 찰칵: 셔터 닫힘 + 플래시
  if (sh > -0.06 && sh < 0.5) { const blink = 1 - clamp(Math.abs(sh) / 0.07); if (blink > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H * 0.5 * blink); ctx.fillRect(0, H - H * 0.5 * blink, W, H * 0.5 * blink); }
    if (sh > 0.04) { ctx.fillStyle = `rgba(255,255,255,${(1 - ease.out(prog(sh, 0.04, 0.5))) * 0.95})`; ctx.fillRect(0, 0, W, H); } }
}

// ---------- 장면 5: 스캔 ----------
/* 0-2.2 스캔 라인이 내려가며 원본 2026 로고가 정갈하게 나타남 · 2.2-3.5 정렬 · 3.5-4.1 지지직 · 4.1- 점멸 후 암전 */
export function scan(ctx, t, dur, A) {
  const R = photoRect(), top = R.y - R.size / 2, k = ease.io(prog(t, 0.15, 2.2)), y = lerp(top - 40, top + R.size + 40, k);
  const mv = ease.io(prog(t, 2.2, 3.3)), cx = lerp(R.x, W / 2, mv), cy = lerp(R.y, H / 2, mv), size = lerp(R.size, 780, mv);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (k < 1) { ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, H - y); ctx.clip(); ctx.drawImage(photo(A), 0, 0); ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, k >= 1 ? H : y); ctx.clip();
  ctx.fillStyle = `rgba(0,255,127,${0.10 * (1 - mv)})`; for (let gx = 60; gx < W; gx += 60) for (let gy = 60; gy < H; gy += 60) ctx.fillRect(gx - 1, gy - 1, 2, 2);
  // 방금 스캔된 띠는 초록 윤곽선(벡터 추적), 그 위로는 깨끗한 원본
  drawLogo(ctx, A.neo, cx, cy, size, '#f4f6f5');
  if (k < 1) { ctx.save(); ctx.beginPath(); ctx.rect(0, y - 150, W, 150); ctx.clip(); ctx.fillStyle = '#000'; ctx.fillRect(0, y - 150, W, 150); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(size / 3000, size / 3000); ctx.strokeStyle = GREEN; ctx.lineWidth = 7; ctx.shadowColor = GREEN; ctx.shadowBlur = 12; for (const p of A.neo.paths) ctx.stroke(p); ctx.restore();
    const g = ctx.createLinearGradient(0, y - 150, 0, y - 90); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); ctx.rect(0, y - 150, W, 60); ctx.clip(); drawLogo(ctx, A.neo, cx, cy, size, '#f4f6f5', 0.7); ctx.restore(); }
  ctx.restore();
  if (k > 0 && k < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, y - 90, 0, y + 6); g.addColorStop(0, 'rgba(0,255,127,0)'); g.addColorStop(1, 'rgba(0,255,127,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, y - 90, W, 96); ctx.fillStyle = '#eafff4'; ctx.shadowColor = GREEN; ctx.shadowBlur = 30; ctx.fillRect(0, y - 2, W, 4); ctx.restore(); }
  if (t < 3.4) { // HUD: 모서리 표시, 진행률, 좌표
    const a = 0.85 * (1 - prog(t, 2.8, 3.4)); ctx.save(); ctx.strokeStyle = ctx.fillStyle = `rgba(0,255,127,${a})`; ctx.lineWidth = 3; ctx.font = '500 24px Inter, monospace';
    const s2 = size / 2 + 46; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(cx + sx * s2, cy + sy * (s2 - 46)); ctx.lineTo(cx + sx * s2, cy + sy * s2); ctx.lineTo(cx + sx * (s2 - 46), cy + sy * s2); ctx.stroke(); }
    ctx.fillText(k < 1 ? `SCANNING  ${String(Math.floor(k * 100)).padStart(3, '0')}%` : 'VECTORIZED  ·  2026', 90, 104); ctx.fillRect(90, 120, 320 * k, 3);
    ctx.fillText(`X ${Math.round(cx)}  Y ${Math.round(k < 1 ? y : cy)}`, 90, 990); ctx.fillText(`${A.neo.subs.length} PATHS`, W - 250, 990); ctx.restore(); }
  const g1 = prog(t, 3.5, 4.1);
  if (g1 > 0 && t < 4.1) glitch(ctx, 0.25 + g1 * 0.75 * (0.5 + 0.5 * noise(t * 40, 2)), Math.floor(t * 30));
  if (t >= 4.1) { if (t < 4.3 && Math.floor(t * 30) % 3 === 0) glitch(ctx, 0.9, Math.floor(t * 30)); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } }
}
