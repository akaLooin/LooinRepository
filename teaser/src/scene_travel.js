// 장면 2 — 종이가 바람을 타고 시대를 건넌다. 시대가 지날수록 연필 스케치에서 사실적인 영상으로 바뀐다
import * as THREE from 'three';
import { renderFilm, blit } from './film.js';
import { V, tex, noiseTex, std, box, cyl, ball, shaft, dust, makePaper, makeFigure, skyDome } from './kit.js';
import { W, H, clamp, lerp, prog, ease, rng, noise, canvas } from './core.js';

let S;
const cone = (r, h, seg, m, x, y, z, parent) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m); c.position.set(x, y + h / 2, z); c.castShadow = c.receiveShadow = true; parent?.add(c); return c; };
const puffTex = tex(128, 128, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
function smoke(parent, n, color, opacity = 0.5) { // 피어오르는 연기
  const sp = Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, opacity, depthWrite: false })); parent.add(s); return s; });
  return (t, x, y, z, size, rise, drift, speed = 0.3) => sp.forEach((s, i) => { const k = (t * speed + i / n) % 1; s.position.set(x + k * drift + Math.sin(i * 7 + t) * size * 0.3, y + k * rise, z + Math.cos(i * 5) * size * 0.3); s.scale.setScalar(size * (0.6 + k * 2.4)); s.material.opacity = opacity * Math.sin(k * Math.PI); });
}
function ground(seed, amp, flat, color, map) { // 길 주변은 평평하고 멀어질수록 굴곡지는 땅
  const g = new THREE.PlaneGeometry(900, 900, 110, 110); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = clamp((Math.abs(z) - flat) / 60); p.setY(i, amp * d * d * (0.5 + 0.5 * noise(x / 70 + seed, 1) + 0.6 * noise(z / 45 + seed, 2) * noise(x / 30, 3)) + amp * 0.04 * noise(x / 9, 4) * noise(z / 7, 5)); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, std(color, { map, roughness: 0.95 })); m.receiveShadow = true; return m;
}
function mammoth(mat, tusk) {
  const g = new THREE.Group(), s = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const b = ball(r, mat, x, y, z, g); b.scale.set(sx, sy, sz); return b; };
  s(1.15, 0, 2.3, 0, 1.45, 1.0, 0.95); s(0.95, 0.9, 2.75, 0, 1, 1.05, 0.9); s(0.7, 1.9, 2.75, 0, 0.9, 1.1, 0.85); s(0.5, 1.85, 3.45, 0, 1, 0.8, 0.9);
  const legs = [[1.0, 0.45], [1.0, -0.45], [-0.9, 0.45], [-0.9, -0.45]].map(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 1.9, z); g.add(l); const c = cyl(0.3, 0.26, 1.9, mat, 0, -0.95, 0, l, 10); return l; });
  const trunk = []; let par = g, py = 2.45, px = 2.4;
  for (let i = 0; i < 6; i++) { const j = new THREE.Group(); j.position.set(i ? 0 : px, i ? -0.42 : py, 0); par.add(j); cyl(0.2 - i * 0.025, 0.17 - i * 0.025, 0.46, mat, 0, -0.21, 0, j, 8); trunk.push(j); par = j; }
  for (const sz of [-1, 1]) { const tk = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 8, 16, 2.2), tusk); tk.position.set(2.6, 2.3, sz * 0.38); tk.rotation.set(0, sz * 0.25, -2.5); tk.castShadow = true; g.add(tk); }
  g.userData.anim = t => { legs.forEach((l, i) => (l.rotation.z = Math.sin(t * 2.2 + [0, Math.PI, Math.PI, 0][i]) * 0.3)); trunk.forEach((j, i) => (j.rotation.z = (i ? 0.25 : 0.1) + Math.sin(t * 1.6 - i * 0.6) * 0.16)); g.position.y = Math.abs(Math.sin(t * 2.2)) * 0.06; };
  return g;
}
function palm(mat, leaf, parent, x, z, h = 7) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  for (let i = 0; i < 7; i++) cyl(0.2 - i * 0.012, 0.22 - i * 0.012, h / 7 + 0.05, mat, Math.sin(i * 0.3) * 0.5, (i + 0.5) * h / 7, 0, g, 8);
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.4, 1, 5), leaf); l.geometry.translate(0, 1.7, 0); const p = l.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, -(p.getY(k) ** 2) * 0.16); l.geometry.computeVertexNormals(); l.position.set(Math.sin(1.8) * 0.5, h, 0); l.rotation.set(1.05, (i / 9) * Math.PI * 2, 0, 'YXZ'); l.castShadow = true; g.add(l); }
  return g;
}
const winTex = (seed, lit, warm) => tex(256, 512, (x, w, h) => { const r = rng(seed); x.fillStyle = '#0b0c12'; x.fillRect(0, 0, w, h); for (let yy = 8; yy < h - 8; yy += 20) for (let xx = 8; xx < w - 8; xx += 16) if (r() < lit) { const v = 150 + r() * 105; x.fillStyle = warm ? `rgb(${v},${v * 0.82},${v * 0.5})` : `rgb(${v * 0.75},${v * 0.9},${v})`; x.fillRect(xx, yy, 9, 13); } });

// ---------- 시대별 세트 ----------
const ERAS = [
  { year: '기원전 10,000년', sky: [0x2b3350, 0xf2c79a], sun: [0.75, 0.16, -0.55], sunCol: 0xffd9a8, sunI: 3.4, hemi: 0.5, fog: [0xd9b995, 0.0055], st: { mono: 1, outline: 0.8, paper: 0.3, hatch: 1, grain: 0.09, exposure: 1.0 },
    paper: [[-18, 6, 4], [-6, 2.6, 3], [3, 3.2, 2.4], [10, 4.6, -2], [20, 5, -5]], off: [[-3, -0.9, 5], [-5.5, 0.4, 3]], fov: 48,
    build(g, r) {
      const rock = std(0x7d7468), fur = std(0x1b1714, { roughness: 1 }), ivory = std(0xe8e0cc, { roughness: 0.5 });
      g.add(ground(1, 46, 16, 0x8f8672));
      cone(70, 80, 24, rock, 60, -6, -230, g); const vs = smoke(g, 9, 0x4a4442, 0.7);
      for (let i = 0; i < 26; i++) { const rs = 1.5 + r() * 4.5, c = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), rock); c.position.set(-60 + r() * 150, rs * 0.5, (r() < 0.6 ? -1 : 1) * (15 + r() * 60)); c.rotation.set(r() * 3, r() * 3, r() * 3); c.scale.set(0.8 + r() * 0.7, 1 + r() * 1.6, 0.8 + r() * 0.6); c.castShadow = c.receiveShadow = true; g.add(c); }
      const ms = [[9, -6, 1], [16, -11, 0.8], [3, -13, 0.62]].map(([x, z, s]) => { const m = mammoth(fur, ivory); m.scale.setScalar(s); m.userData.b = [x, z]; g.add(m); return m; });
      const fire = new THREE.PointLight(0xff9a4a, 26, 22, 1.6); fire.position.set(2, 0.8, 3); g.add(fire);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb060).multiplyScalar(4) })); fl.position.set(2, 0.55, 3); g.add(fl);
      for (let i = 0; i < 5; i++) { const l = cyl(0.06, 0.06, 0.9, std(0x2a221c), 2, 0.12, 3, g, 6); l.rotation.set(Math.PI / 2, 0, i * 1.26); }
      const fs = smoke(g, 5, 0x999188, 0.35);
      const men = [[0.6, 4.4, 2.4, 0], [3.5, 3.9, -2.2, 1], [2.3, 1.2, 0.2, 0]].map(([x, z, yaw, spear]) => { const f = makeFigure({ hair: true }); f.root.position.set(x, 0, z); f.root.rotation.y = yaw; g.add(f.root); if (spear) cyl(0.02, 0.02, 2.2, std(0x2a221c), 0, -0.2, 0, f.arms.R.hand, 6); return f; });
      return (t, u, pp) => {
        vs(t, 60, 72, -230, 16, 90, 60, 0.12); fs(t, 2, 1.2, 3, 0.6, 5, 1.5, 0.5);
        ms.forEach((m, i) => { m.position.x = m.userData.b[0] + t * 0.9 * m.scale.x; m.position.z = m.userData.b[1]; m.userData.anim(t + i); m.rotation.y = 0.15; });
        fire.intensity = 26 * (1 + noise(t * 11, 1) * 0.3); fl.scale.set(1 + noise(t * 13, 2) * 0.25, 1 + noise(t * 9, 3) * 0.35, 1);
        men.forEach((f, i) => { f.stand(t * 2 + i); const k = ease.io(prog(u, 0.15 + i * 0.08, 0.45 + i * 0.08)); f.head.lookAt(pp); f.head.rotation.x = clamp(f.head.rotation.x, -0.9, 0.3); f.reach(i === 1 ? 'L' : 'R', f.root.position.clone().lerp(pp, 0.5).setY(1.2 + k * 0.9)); });
      };
    } },
  { year: '기원전 2,500년', sky: [0x5f86b8, 0xf6e6c2], sun: [-0.35, 0.72, -0.6], sunCol: 0xfff3d6, sunI: 4.4, hemi: 0.75, fog: [0xeedcb4, 0.0038], st: { mono: 1, outline: 0.62, paper: 0.22, hatch: 0.8, grain: 0.08, exposure: 1.02 },
    paper: [[-24, 3, 12], [-8, 2.6, 8], [6, 8, 2], [16, 26, -14], [24, 48, -28]], off: [[-4, -0.4, 6], [-2.5, -3.2, 6.5]], fov: 46,
    build(g, r) {
      const stone = std(0xd9c9a0, { map: noiseTex(256, 8, 190, 36, [8, 8], 5) }), trunk = std(0x5a4a38), leaf = std(0x4a5a40, { side: THREE.DoubleSide });
      g.add(ground(4, 22, 40, 0xdcc99a));
      for (const [x, z, s] of [[34, -44, 1], [-40, -90, 0.72], [110, -120, 0.55]]) { const p = cone(46 * s, 58 * s, 4, stone, x, -0.5, z, g); p.rotation.y = Math.PI / 4; }
      for (const z of [-6, 6]) { box(1.3, 11, 1.3, stone, 2, 5.5, z, g); const tp = cone(0.95, 1.6, 4, stone, 2, 11, z, g); tp.rotation.y = Math.PI / 4; }
      for (let i = 0; i < 7; i++) palm(trunk, leaf, g, -24 + r() * 26, 16 + r() * 12, 5 + r() * 3);
      const block = box(2.4, 1.6, 1.6, stone, 0, 0.95, 9, g); const sled = box(3, 0.16, 1.9, trunk, 0, 0.1, 9, g);
      const men = Array.from({ length: 6 }, (_, i) => { const f = makeFigure({}); f.root.position.set(3 + (i >> 1) * 1.4, 0, 9 + (i % 2 ? 0.5 : -0.5)); f.root.rotation.y = Math.PI / 2; g.add(f.root); return f; });
      const rope = cyl(0.03, 0.03, 6, trunk, 4.2, 1.1, 9, g, 6); rope.rotation.z = Math.PI / 2;
      return (t, u, pp) => { const dx = t * 0.5; block.position.x = dx; sled.position.x = dx; rope.position.x = 4.2 + dx;
        men.forEach((f, i) => { f.root.position.x = 3 + (i >> 1) * 1.4 + dx; f.walk(t * 3.2 + i, 0.55); f.spine.rotation.x = 0.55; f.reach('L', f.root.position.clone().add(V(-0.4, 1.1, 0))); f.reach('R', f.root.position.clone().add(V(-0.5, 1.05, 0))); }); };
    } },
  { year: '기원전 400년', sky: [0x4f7fb5, 0xdce9ee], sun: [0.55, 0.5, 0.45], sunCol: 0xfff0dc, sunI: 4.0, hemi: 0.85, fog: [0xcfdde6, 0.0042], st: { mono: 0.82, outline: 0.45, paper: 0.14, hatch: 0.5, grain: 0.07, exposure: 1.0 },
    paper: [[-26, 6, 0], [-12, 4.2, 0.8], [0, 4.8, -0.6], [12, 4.0, 0.6], [24, 6.5, 0]], off: [[-5.5, 0.4, 2.3], [-4.5, -1.0, -2.1]], fov: 44,
    build(g, r) {
      const marble = std(0xeeeae0, { map: noiseTex(256, 12, 225, 22, [2, 4], 3), roughness: 0.6 }), dark = std(0x3c4a38), roof = std(0xb6917a);
      const gr = ground(7, 30, 26, 0x9aa37c); g.add(gr);
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.18, metalness: 0.3 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.4, -290); g.add(sea);
      for (let i = 0; i < 3; i++) box(46 - i * 1.6, 0.4, 12 - i * 1.4, marble, 0, 0.2 + i * 0.4, 0, g);
      for (let i = 0; i < 12; i++) for (const z of [-4, 4]) { const c = cyl(0.55, 0.66, 8.4, marble, -20.9 + i * 3.8, 5.4, z, g, 16); box(1.5, 0.3, 1.5, marble, -20.9 + i * 3.8, 9.75, z, g); }
      box(45, 1.3, 10.5, marble, 0, 10.55, 0, g);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 45, 3), roof); ped.rotation.set(0, 0, Math.PI / 2); ped.position.set(0, 13.9, 0); ped.scale.z = 1.0; ped.scale.x = 0.9; ped.castShadow = true; g.add(ped);
      for (let i = 0; i < 12; i++) { const c = cone(1.1, 7 + r() * 4, 10, dark, -40 + r() * 80, 0, -16 - r() * 18, g); }
      for (let i = 0; i < 3; i++) { const sx = -60 + i * 55, sg = new THREE.Group(); sg.position.set(sx, 0.5, -110 - i * 30); g.add(sg); box(11, 1.6, 3, std(0x4a3828), 0, 0.6, 0, sg); cyl(0.14, 0.14, 8, std(0x4a3828), 0, 5, 0, sg, 6); box(0.1, 4.6, 6, std(0xeee8d8), 0, 6, 0, sg); sg.userData.i = i; }
      const st = [[-6, 2.2], [5, -2.4], [12, 2.0]].map(([x, z], i) => { const f = makeFigure({ coat: 0.3 }); f.root.position.set(x, 1.2, z); f.root.rotation.y = i; g.add(f.root); return f; });
      return (t, u, pp) => { st.forEach((f, i) => { f.stand(t * 2 + i); f.head.lookAt(pp); f.reach('R', f.root.position.clone().lerp(pp, 0.4).setY(2.6 + ease.io(prog(u, 0.3, 0.6)) * 0.6)); f.sway(t, 0, 0.6); }); g.children.forEach(c => { if (c.userData.i != null) { c.position.x += 0; c.rotation.z = Math.sin(t * 1.2 + c.userData.i) * 0.03; } }); };
    } },
  { year: '1300년', sky: [0x394068, 0xf0b98a], sun: [-0.7, 0.2, -0.5], sunCol: 0xffc890, sunI: 3.6, hemi: 1.1, fog: [0xc79f88, 0.006], st: { mono: 0.55, outline: 0.28, paper: 0.08, hatch: 0.25, grain: 0.065, exposure: 1.02, sat: 0.9 },
    paper: [[-16, 4, 8], [-6, 9, 1.5], [3.5, 16, -0.5], [7.5, 24, -5], [3, 31, -5.5], [-3, 37, -2]], off: [[-4, -1.6, 6], [-5, 1.2, 7.5]], fov: 46,
    build(g, r) {
      const stone = std(0x8f8a80, { map: noiseTex(256, 21, 160, 40, [3, 6], 4) }), roof = std(0x6a3b30), wood = std(0x4a3a2c), plaster = std(0xd8ccb0), cloth = new THREE.MeshStandardMaterial({ color: 0xb8322c, side: THREE.DoubleSide, roughness: 0.8 });
      g.add(ground(11, 34, 34, 0x66704a));
      const flags = [];
      for (const [x, z, h, rd] of [[0, -6, 26, 3.2], [-13, -12, 20, 2.6], [13, -12, 21, 2.6], [-13, -30, 18, 2.6], [13, -30, 18, 2.6]]) {
        cyl(rd, rd * 1.08, h, stone, x, h / 2, z, g, 18); cyl(rd * 1.15, rd * 1.15, 1.0, stone, x, h + 0.2, z, g, 18);
        for (let i = 0; i < 10; i++) box(0.7, 0.9, 0.5, stone, x + Math.cos(i * 0.628) * rd * 1.1, h + 1.1, z + Math.sin(i * 0.628) * rd * 1.1, g).rotation.y = -i * 0.628 + 1.57;
        cone(rd * 1.2, rd * 2.4, 18, roof, x, h + 0.7, z, g); cyl(0.05, 0.05, 3, wood, x, h + rd * 2.4 + 2, z, g, 6);
        const fg = new THREE.PlaneGeometry(2.4, 1.2, 10, 3); fg.translate(1.2, 0, 0); const f = new THREE.Mesh(fg, cloth); f.position.set(x, h + rd * 2.4 + 2.8, z); f.castShadow = true; g.add(f); flags.push([f, fg.attributes.position.array.slice()]);
        for (let i = 0; i < 4; i++) { const wn = box(0.3, 0.9, 0.1, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb866).multiplyScalar(1.6) }), x + Math.sin(i * 1.7) * rd, 6 + i * 4, z + Math.cos(i * 1.7) * rd * 1.01, g); wn.rotation.y = i * 1.7; wn.castShadow = false; }
      }
      for (const [x1, z1, x2, z2] of [[-13, -12, 13, -12], [-13, -12, -13, -30], [13, -12, 13, -30]]) { const w = box(Math.hypot(x2 - x1, z2 - z1), 11, 1.6, stone, (x1 + x2) / 2, 5.5, (z1 + z2) / 2, g); w.rotation.y = Math.atan2(z2 - z1, x2 - x1) ? Math.PI / 2 : 0; }
      for (let i = 0; i < 12; i++) box(1.1, 1, 1.7, stone, -12 + i * 2.2, 11.4, -12, g);
      for (let i = 0; i < 9; i++) { const x = -44 + r() * 30 + (i > 4 ? 60 : 0), z = (i % 2 ? 24 + r() * 14 : -34 - r() * 12), hg = new THREE.Group(); hg.position.set(x, 0, z); hg.rotation.y = r() * 3; g.add(hg); box(4, 2.8, 3.2, plaster, 0, 1.4, 0, hg); const rf = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 4.4, 3), roof); rf.rotation.z = Math.PI / 2; rf.position.y = 3.9; rf.scale.set(0.75, 1, 1); rf.castShadow = true; hg.add(rf); }
      const mill = new THREE.Group(); mill.position.set(22, 0, 6); g.add(mill); cyl(1.4, 2.2, 8, plaster, 0, 4, 0, mill, 12); cone(1.7, 2, 12, roof, 0, 8, 0, mill);
      const sails = new THREE.Group(); sails.position.set(0, 7.6, 2.0); mill.add(sails); for (let i = 0; i < 4; i++) { const a = new THREE.Group(); a.rotation.z = i * Math.PI / 2; sails.add(a); box(0.12, 6, 0.1, wood, 0, 3, 0, a); box(1.2, 4.6, 0.04, std(0xe8e0cc), 0.65, 3.4, 0, a); }
      return (t, u) => { sails.rotation.z = t * 1.1; flags.forEach(([f, b], k) => { const p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.setZ(i, Math.sin(x * 3 - t * 9 + k) * 0.22 * x); p.setY(i, b[i * 3 + 1] + Math.sin(x * 2 - t * 7) * 0.06 * x); } p.needsUpdate = true; f.geometry.computeVertexNormals(); }); };
    } },
  { year: '1850년', sky: [0x565c66, 0xcdbfa6], sun: [0.5, 0.35, -0.7], sunCol: 0xffe0b8, sunI: 2.6, hemi: 0.7, fog: [0xa69c8c, 0.0065], st: { mono: 0.28, outline: 0.12, paper: 0.03, hatch: 0.1, grain: 0.06, exposure: 1.05, sat: 0.85 },
    paper: [[-26, 14, 5], [-12, 12.7, 3.7], [0, 13.2, 3.1], [12, 12.7, 3.8], [24, 15, 6]], off: [[-4.5, -0.5, 5], [3.5, -1.3, 6]], fov: 44,
    build(g, r) {
      const brick = std(0x7a4a3c, { map: tex(256, 256, (x, w) => { x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, w, w); const rr = rng(3); for (let y = 0; y < 16; y++) for (let i = -1; i < 8; i++) { const v = 120 + rr() * 90; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14); } }, { repeat: [6, 6] }) });
      const iron = std(0x1a1a1c, { roughness: 0.5, metalness: 0.6 }), soot = std(0x3a3632), stone = std(0x77706a, { map: noiseTex(256, 31, 150, 40, [4, 2], 3) }), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb060).multiplyScalar(2.2) });
      g.add(ground(15, 10, 60, 0x4a4640));
      const stacks = [];
      for (let i = 0; i < 9; i++) { const x = -70 + i * 19 + r() * 6, z = -22 - r() * 30, w = 12 + r() * 8, h = 7 + r() * 6; box(w, h, 10, brick, x, h / 2, z, g); const rf = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, w, 3), soot); rf.rotation.z = Math.PI / 2; rf.position.set(x, h + 2.6, z); rf.scale.x = 0.55; g.add(rf);
        for (let k = 0; k < 5; k++) box(1.0, 1.8, 0.1, glow, x - w / 2 + 1.6 + k * (w - 3.2) / 4, h * 0.55, z + 5.05, g).castShadow = false;
        const ch = 20 + r() * 14; cyl(0.9, 1.4, ch, brick, x + w * 0.3, ch / 2, z - 2, g, 12); stacks.push([x + w * 0.3, ch, z - 2]); }
      const sm = stacks.map(() => smoke(g, 12, 0x2c2a2a, 0.8));
      // 고가 철교와 증기 기관차
      box(260, 1.2, 4.2, stone, 0, 9.0, 0, g); for (let i = 0; i < 18; i++) { box(2.2, 8.6, 4.2, stone, -110 + i * 13, 4.3, 0, g); const ar = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.7, 6, 14, Math.PI), stone); ar.position.set(-103.5 + i * 13, 3.6, 0); ar.scale.z = 3; ar.castShadow = true; g.add(ar); }
      for (const z of [-0.75, 0.75]) box(260, 0.12, 0.12, iron, 0, 9.66, z, g);
      const train = new THREE.Group(); g.add(train);
      const boiler = cyl(1.05, 1.05, 6, iron, 2, 11.3, 0, train, 16); boiler.rotation.z = Math.PI / 2; box(2.6, 2.9, 2.5, iron, -2, 11.5, 0, train); cyl(0.3, 0.42, 1.5, iron, 4.2, 12.9, 0, train); cyl(0.42, 0.42, 0.5, iron, 2.4, 12.5, 0, train); box(1.4, 0.8, 2.3, iron, 5.6, 10.3, 0, train);
      const wheels = []; for (const x of [-2.2, 0.2, 2.2, 4.2]) for (const z of [-1.05, 1.05]) { const wl = cyl(0.78, 0.78, 0.16, iron, x, 10.45, z, train, 14); wl.rotation.x = Math.PI / 2; wheels.push(wl); }
      const lamp = new THREE.PointLight(0xffd9a0, 30, 30, 1.6); lamp.position.set(6.6, 11.6, 0); train.add(lamp); ball(0.22, glow, 6.4, 11.6, 0, train).castShadow = false;
      for (let i = 0; i < 4; i++) { box(7.4, 2.7, 2.5, std(0x3a2e28, { map: brick.map }), -8 - i * 8.2, 11.4, 0, train); for (const z of [-1.05, 1.05]) for (const x of [-2.4, 2.4]) { const wl = cyl(0.55, 0.55, 0.16, iron, -8 - i * 8.2 + x, 10.22, z, train, 12); wl.rotation.x = Math.PI / 2; } }
      const steam = smoke(g, 9, 0xe8e4dc, 0.7);
      for (let i = 0; i < 8; i++) { cyl(0.07, 0.09, 3.4, iron, -50 + i * 14, 1.7, 12, g, 6); ball(0.24, glow, -50 + i * 14, 3.5, 12, g).castShadow = false; }
      return (t, u) => { const tx = -22 + u * 34; train.position.x = tx; wheels.forEach(w => (w.rotation.y = -t * 14)); steam(t, tx + 4.2, 13.7, 0, 1.3, 7, -16, 1.1); sm.forEach((f, i) => f(t + i * 0.3, stacks[i][0], stacks[i][1], stacks[i][2], 4.2, 26, 24, 0.14)); };
    } },
  { year: '2010년', sky: [0x05060f, 0x241a3a], sun: [0.2, 0.8, 0.3], sunCol: 0x8fa8ff, sunI: 0.35, hemi: 0.5, fog: [0x141222, 0.009], st: { mono: 0, outline: 0, paper: 0, hatch: 0, grain: 0.05, exposure: 1.1, bloom: 0.6, bloomT: 0.85, aperture: 0.1 },
    paper: [[-34, 46, 1], [-14, 22, -2], [4, 8, 1.5], [22, 3.6, -1], [40, 3.0, 4]], off: [[-7, 3, 1.5], [-6, -0.9, -1.6]], fov: 46,
    build(g, r) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(500, 22), new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.22, metalness: 0.1, map: noiseTex(512, 41, 70, 40, [40, 2], 2), roughnessMap: noiseTex(256, 42, 70, 110, [30, 3], 6) })); road.rotation.x = -Math.PI / 2; road.position.y = 0.01; road.receiveShadow = true; g.add(road);
      const base = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), std(0x0c0c10)); base.rotation.x = -Math.PI / 2; g.add(base);
      for (const z of [-13.5, 13.5]) box(500, 0.3, 5, std(0x2a2a30, { roughness: 0.6 }), 0, 0.15, z, g);
      for (let i = 0; i < 60; i++) box(2.6, 0.02, 0.2, new THREE.MeshBasicMaterial({ color: 0x8a8a80 }), -240 + i * 8, 0.03, 0, g).castShadow = false;
      const NEON = [0xff2d7a, 0x19d3ff, 0xffd400, 0x00ff7f, 0xff7a1a, 0x9a4dff];
      for (let i = 0; i < 46; i++) { const side = i % 2 ? 1 : -1, row = i % 4 < 2 ? 0 : 1, x = -170 + (i >> 1) * 15 + r() * 4, w = 11 + r() * 5, d = 12 + r() * 6, h = (row ? 60 : 24) + r() * (row ? 90 : 40), z = side * (17 + d / 2 + row * 22);
        const wt = winTex(i + 1, 0.3 + r() * 0.35, r() < 0.6); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(Math.max(1, Math.round(w / 9)), Math.max(1, Math.round(h / 20)));
        const m = new THREE.MeshStandardMaterial({ color: 0x20222c, roughness: 0.35, metalness: 0.4, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 1.5 }); box(w, h, d, m, x, h / 2, z, g);
        if (!row && r() < 0.8) { const c = NEON[(r() * 6) | 0], sh = 1.2 + r() * 2.2, sw = 3 + r() * 5, sy = 5 + r() * 9; const sg = box(sw, sh, 0.3, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.6) }), x, sy, z - side * (d / 2 + 0.3), g); sg.castShadow = false;
          const rf = new THREE.Mesh(new THREE.PlaneGeometry(sw * 1.1, 9), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, map: puffTex })); rf.rotation.x = -Math.PI / 2; rf.position.set(x, 0.04, side * 8); g.add(rf);
          const pl = new THREE.PointLight(c, 60, 26, 1.8); pl.position.set(x, sy, z - side * (d / 2 + 1.5)); if (i % 6 === 1) g.add(pl); } }
      const lamps = []; for (let i = 0; i < 12; i++) { const x = -90 + i * 16, z = i % 2 ? 10.6 : -10.6; cyl(0.1, 0.14, 7, std(0x18181c), x, 3.5, z, g, 8); box(1.6, 0.14, 0.3, std(0x18181c), x, 7, z - Math.sign(z) * 0.7, g); ball(0.22, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(4) }), x, 6.85, z - Math.sign(z) * 1.4, g).castShadow = false; const sf = shaft(0.3, 3.4, 7, 0xffd9a0, 0.1); sf.position.set(x, 6.85, z - Math.sign(z) * 1.4); g.add(sf); if (i > 3 && i < 9) { const pl = new THREE.PointLight(0xffd0a0, 55, 24, 1.7); pl.position.set(x, 6.6, z - Math.sign(z) * 1.4); g.add(pl); } }
      const cars = Array.from({ length: 9 }, (_, i) => { const c = new THREE.Group(), dir = i % 2 ? 1 : -1, col = [0x1a1a22, 0x6a1a1a, 0x22364a, 0xb8b8b8][i % 4]; g.add(c);
        const bm = new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.7 }); box(4.3, 0.75, 1.8, bm, 0, 0.72, 0, c); box(2.3, 0.65, 1.6, new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.1, metalness: 0.8 }), -0.15, 1.38, 0, c);
        for (const x of [-1.35, 1.35]) for (const z of [-0.85, 0.85]) { const wl = cyl(0.36, 0.36, 0.24, std(0x0a0a0a), x, 0.36, z, c, 12); wl.rotation.x = Math.PI / 2; }
        for (const z of [-0.62, 0.62]) { ball(0.13, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d0).multiplyScalar(6) }), 2.16, 0.78, z, c).castShadow = false; ball(0.1, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2010).multiplyScalar(3) }), -2.16, 0.82, z, c).castShadow = false; }
        const hl = shaft(0.2, 2.2, 9, 0xfff2d0, 0.16); hl.rotation.z = Math.PI / 2 + 0.06; hl.position.set(2.2, 0.75, 0); c.add(hl);
        c.rotation.y = dir > 0 ? 0 : Math.PI; c.userData = { dir, z: dir > 0 ? 3 + (i % 3) * 2.6 : -3 - (i % 3) * 2.6, x0: -80 + i * 23, v: 13 + (i % 3) * 3 }; return c; });
      const peds = Array.from({ length: 7 }, (_, i) => { const f = makeFigure({ coat: 0.3, hair: true }); f.root.userData = { z: (i % 2 ? 1 : -1) * (12.4 + (i % 3) * 0.7), x0: -20 + i * 9, dir: i % 3 ? 1 : -1 }; f.root.rotation.y = f.root.userData.dir > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(f.root); return f; });
      const vent = smoke(g, 6, 0x8890a8, 0.25);
      return (t, u) => { cars.forEach(c => { const d = c.userData; c.position.set(((d.x0 + d.dir * t * d.v + 400) % 240) - 120, 0, d.z); }); peds.forEach((f, i) => { const d = f.root.userData; f.root.position.set(d.x0 + d.dir * t * 1.5, 0.3, d.z); f.walk(t * 6 + i * 2, 0.8); f.sway(t, 0.6, 0.2); }); vent(t, 18, 0.3, 9, 1.2, 7, 2, 0.35); };
    } },
];
export const ERA_COUNT = ERAS.length;

export function initTravel(A) {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, W / H, 0.1, 1500);
  const sky = skyDome(); scene.add(sky); scene.fog = new THREE.FogExp2(0xffffff, 0.004);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -55; sc.right = sc.top = 55; sc.near = 1; sc.far = 400; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.05; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(hemi);
  const paper = makePaper(A.old, 1.25); paper.material.emissiveIntensity = 0.22; scene.add(paper);
  const pl = new THREE.PointLight(0xfff4e0, 0, 14, 1.6); paper.add(pl);
  const r = rng(99);
  const groups = ERAS.map(e => { const g = new THREE.Group(); g.visible = false; scene.add(g); e.update = e.build(g, r); e.pc = new THREE.CatmullRomCurve3(e.paper.map(p => V(...p)));  return g; });
  S = { scene, cam, sky, sun, hemi, paper, groups, pl };
}

export function travel(ctx, t, dur, A, sub) {
  const { scene, cam, sky, sun, hemi, paper, groups, pl } = S;
  const N = ERAS.length, ed = dur / N, i = Math.min(N - 1, Math.floor(t / ed)), lt = t - i * ed, u = lt / ed, e = ERAS[i];
  groups.forEach((g, k) => (g.visible = k === i));
  sky.material.uniforms.top.value.set(e.sky[0]); sky.material.uniforms.bot.value.set(e.sky[1]);
  const sd = V(...e.sun).normalize(); sky.material.uniforms.sun.value.copy(sd); sky.material.uniforms.sunCol.value.set(e.sunCol).multiplyScalar(i === 5 ? 0.15 : 1);
  sun.color.set(e.sunCol); sun.intensity = e.sunI; hemi.intensity = e.hemi; hemi.color.set(e.sky[1]); hemi.groundColor.set(e.fog[0]).multiplyScalar(0.4);
  scene.fog.color.set(e.fog[0]); scene.fog.density = e.fog[1]; pl.intensity = i === 5 ? 1.2 : 0; paper.material.emissiveIntensity = i === 5 ? 0.5 : 0.22;
  // 종이와 추격 카메라. 시대의 끝에서 종이가 렌즈를 덮으며 다음 시대로 넘어간다
  const pu = ease.io(u) * 0.94 + u * 0.06, pp = e.pc.getPoint(pu);
  pp.add(V(0, Math.sin(t * 5.3) * 0.25 + Math.sin(t * 9.1) * 0.1, Math.sin(t * 4.1) * 0.3));
  const ok = ease.io(u), tg = e.pc.getTangent(pu);
  const cp = e.pc.getPoint(Math.max(0, pu - 0.015)).add(V(lerp(e.off[0][0], e.off[1][0], ok), lerp(e.off[0][1], e.off[1][1], ok), lerp(e.off[0][2], e.off[1][2], ok))).add(V(noise(t * 2.3, 11) * 0.1, noise(t * 2.9, 12) * 0.08, noise(t * 2.1, 13) * 0.1));
  const TR = 0.2, kin = 1 - ease.out(prog(lt, 0, TR)), kout = ease.in(prog(lt, ed - TR, ed)), cover = Math.max(i > 0 ? kin : 0, i < N - 1 ? kout : 0);
  cam.position.copy(cp); cam.up.set(noise(t * 0.9, 14) * 0.09, 1, 0).normalize(); cam.fov = e.fov + cover * 8; cam.lookAt(pp.clone().add(tg.multiplyScalar(1.4))); cam.updateProjectionMatrix();
  const fwd = cam.getWorldDirection(V()), near = cp.clone().add(fwd.multiplyScalar(0.7));
  paper.position.copy(pp).lerp(near, cover);
  paper.rotation.set(t * 3.1 + Math.sin(t * 2.3) * 0.8, t * 1.7, Math.sin(t * 2.9) * 0.9);
  if (cover > 0.01) paper.quaternion.slerp(cam.quaternion, cover);
  paper.flutter(t, 1 - cover * 0.6);
  sun.target.position.copy(pp).lerp(cp, 0.5); sun.position.copy(sun.target.position).add(sd.multiplyScalar(160));
  e.update(t, u, pp);
  const st = { vig: 0.5, bloom: 0.3, bloomT: 0.92, aperture: 0.12, focus: cp.distanceTo(paper.position), ...e.st };
  st.flash = Math.max(i > 0 ? 1 - prog(lt, 0, 0.1) : 0, i < N - 1 ? prog(lt, ed - 0.07, ed) : 0) * 0.9;
  if (i === 0) st.flash = Math.max(st.flash, 1 - ease.out(prog(lt, 0, 0.5)));
  if (i === N - 1) st.fade = 1 - prog(lt, ed - 0.3, ed);
  renderFilm(scene, cam, st, t, sub); blit(ctx);
  // 연도 자막
  const a = prog(lt, 0.12, 0.4) * (1 - prog(lt, ed - 0.3, ed - 0.1));
  if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.font = 'italic 500 44px Georgia, "Times New Roman", serif'; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14; ctx.fillStyle = '#f6f1e6'; ctx.fillText(e.year, 96, 978); ctx.fillRect(96, 996, 64 * a, 2); ctx.restore(); }
}
