// 장면 1 — 오래된 도서관의 비밀 사무실 (흑백 3D, 촛불과 달빛)
import * as THREE from 'three';
import { renderFilm, blit } from './film.js';
import { V, tex, noiseTex, std, box, cyl, ball, shaft, dust, makePaper, makeFigure, alongPath } from './kit.js';
import { W, H, clamp, lerp, prog, ease, rng, noise, canvas, paperSprite, PAPER_W, PAPER_H, drawLogoSketch } from './core.js';

let S;
const PAPER = V(0.02, 0.787, -0.66), PW = 0.36, PH = PW * PAPER_H / PAPER_W;
const IN = [[-1.4, 2.0], [-0.55, 1.0], [-1.14, -0.15], [-1.14, -0.95], [-0.55, -1.42], [0, -1.15]];
const OUT = [[0, -1.15], [-0.6, -1.45], [-1.14, -0.95], [-1.1, -0.1], [-0.72, 1.3], [-1.5, 2.3]];

function shelves(scene, mWood, books, r, x, z, rotY, width, height) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  box(width, height, 0.03, mWood, 0, height / 2, -0.14, g);
  for (const sx of [-1, 1]) box(0.04, height, 0.3, mWood, sx * width / 2, height / 2, 0, g);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let y = 0.08; y < height; y += 0.37) {
    box(width, 0.03, 0.3, mWood, 0, y, 0, g);
    let bx = -width / 2 + 0.05;
    while (bx < width / 2 - 0.08 && y < height - 0.2) {
      const bw = 0.022 + r() * 0.045, bh = 0.2 + r() * 0.11, bd = 0.17 + r() * 0.06;
      if (r() < 0.07) { bx += 0.08 + r() * 0.1; continue; }
      const lean = r() < 0.1 ? (r() - 0.5) * 0.5 : 0;
      q.setFromEuler(new THREE.Euler(0, 0, lean));
      const lp = V(bx + bw / 2 + Math.abs(lean) * 0.08, y + 0.015 + bh / 2, 0.02 - (0.24 - bd) / 2 + r() * 0.02);
      m.compose(lp, q, V(bw, bh, bd)); m.premultiply(g.matrixWorld.identity().makeRotationY(rotY).setPosition(x, 0, z));
      const v = 0.12 + r() * 0.5; c.setRGB(v, v * (0.85 + r() * 0.15), v * (0.7 + r() * 0.25));
      if (books.n < books.mesh.count) { books.mesh.setMatrixAt(books.n, m); books.mesh.setColorAt(books.n, c); books.n++; }
      bx += bw + 0.002 + Math.abs(lean) * 0.1;
    }
  }
}

export function initOffice(A) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030304); scene.fog = new THREE.FogExp2(0x08080c, 0.035);
  const cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 60);
  const r = rng(12), wood = noiseTex(512, 1, 128, 46, [2, 1], 9);
  const mWood = std(0x74624e, { map: wood }), mDark = std(0x2e2823, { map: wood }), mWall = std(0x8a857c, { map: noiseTex(512, 2, 150, 34, [3, 2], 2) }), mFloor = std(0x5a4c40, { map: noiseTex(512, 5, 120, 50, [2, 6], 14), roughness: 0.5 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 7), mFloor); fl.rotation.x = -Math.PI / 2; fl.position.z = 0.6; fl.receiveShadow = true; scene.add(fl);
  // 벽 (뒷벽은 창문 자리를 비워 달빛이 창 모양으로 들어온다)
  box(1.4, 3.3, 0.14, mWall, -1.05, 1.65, -2.55, scene); box(1.0, 3.3, 0.14, mWall, 1.25, 1.65, -2.55, scene);
  box(1.1, 1.0, 0.14, mWall, 0.2, 0.5, -2.55, scene); box(1.1, 0.6, 0.14, mWall, 0.2, 3.0, -2.55, scene);
  box(0.12, 3.3, 7, mWall, -1.76, 1.65, 0.6, scene); box(0.12, 3.3, 7, mWall, 1.76, 1.65, 0.6, scene);
  box(3.7, 0.12, 7, mDark, 0, 3.32, 0.6, scene);
  for (let i = 0; i < 5; i++) box(3.6, 0.16, 0.14, mDark, 0, 3.18, -2.2 + i * 1.2, scene);
  // 창밖 밤하늘
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshBasicMaterial({ fog: false, map: tex(512, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a6a8c'); g.addColorStop(1, '#c9d4ea'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const m = x.createRadialGradient(330, 200, 0, 330, 200, 150); m.addColorStop(0, '#fff'); m.addColorStop(0.2, '#fff'); m.addColorStop(0.24, 'rgba(255,255,255,0.5)'); m.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = m; x.fillRect(0, 0, w, h);
    const rr = rng(2); x.fillStyle = '#fff'; for (let i = 0; i < 90; i++) x.fillRect(rr() * w, rr() * h, 2, 2);
  }) }));
  sky.material.color.setScalar(1.3); sky.position.set(0.6, 2.2, -4.2); scene.add(sky);
  // 창틀과 여닫이 창
  box(1.26, 0.07, 0.24, mDark, 0.2, 0.98, -2.5, scene); box(1.26, 0.07, 0.2, mDark, 0.2, 2.72, -2.5, scene);
  const leaves = [];
  for (const sx of [-1, 1]) {
    const lf = new THREE.Group(); lf.position.set(0.2 + sx * 0.55, 1.85, -2.5); scene.add(lf);
    box(0.04, 1.7, 0.04, mDark, 0, 0, 0, lf); box(0.04, 1.7, 0.04, mDark, -sx * 0.53, 0, 0, lf); box(0.04, 1.7, 0.03, mDark, -sx * 0.27, 0, 0, lf);
    for (const y of [-0.83, -0.28, 0.28, 0.83]) box(0.55, 0.035, 0.03, mDark, -sx * 0.27, y, 0, lf);
    leaves.push([lf, sx]);
  }
  // 커튼
  const curtains = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.PlaneGeometry(0.62, 2.1, 10, 16); const m = new THREE.Mesh(g, std(0x3a3436, { side: THREE.DoubleSide, roughness: 0.95 }));
    m.position.set(0.2 + sx * 0.78, 1.78, -2.36); m.castShadow = true; scene.add(m); curtains.push([m, g.attributes.position.array.slice(), sx]);
  }
  cyl(0.02, 0.02, 2.2, mDark, 0.2, 2.84, -2.36, scene).rotation.z = Math.PI / 2;
  // 책장
  const books = { mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, { roughness: 0.8 }), 1500), n: 0 };
  books.mesh.castShadow = books.mesh.receiveShadow = true; scene.add(books.mesh);
  shelves(scene, mDark, books, r, -1.55, -0.55, Math.PI / 2, 3.7, 3.0); shelves(scene, mDark, books, r, 1.55, -0.3, -Math.PI / 2, 4.2, 3.0);
  shelves(scene, mDark, books, r, -1.02, -2.33, 0, 1.0, 3.0); shelves(scene, mDark, books, r, 1.3, -2.33, 0, 0.75, 3.0);
  books.mesh.count = books.n; books.mesh.instanceMatrix.needsUpdate = true; books.mesh.instanceColor.needsUpdate = true;
  // 책상, 의자, 소품
  box(1.75, 0.06, 0.9, mWood, 0, 0.752, -0.6, scene);
  box(1.6, 0.66, 0.05, mDark, 0, 0.4, -0.2, scene); for (const sx of [-1, 1]) box(0.06, 0.74, 0.8, mDark, sx * 0.8, 0.37, -0.6, scene);
  const chair = new THREE.Group(); scene.add(chair); box(0.5, 0.06, 0.48, mDark, 0, 0.5, 0, chair); box(0.5, 0.75, 0.05, mDark, 0, 0.9, -0.24, chair); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 0.5, 0.05, mDark, sx * 0.22, 0.25, sz * 0.2, chair);
  for (let i = 0; i < 4; i++) { const b = box(0.24 - i * 0.015, 0.045, 0.32, std([0x3a3330, 0x5a5048, 0x2a2624, 0x6a6258][i]), 0.6, 0.805 + i * 0.046, -0.78, scene); b.rotation.y = (r() - 0.5) * 0.5; }
  for (let i = 0; i < 6; i++) { const b = box(0.3, 0.05, 0.22, std(0x151312 + i * 0x0a0908), 1.15 + (r() - 0.5) * 0.05, 0.03 + i * 0.052, 0.5, scene); b.rotation.y = (r() - 0.5) * 0.6; }
  for (let i = 0; i < 4; i++) { const b = box(0.28, 0.05, 0.2, std(0x201c1a + i * 0x0c0b0a), -1.1, 0.03 + i * 0.052, 1.2, scene); b.rotation.y = (r() - 0.5) * 0.6; }
  cyl(0.035, 0.04, 0.06, std(0x0c0c0e, { roughness: 0.3 }), -0.36, 0.81, -0.74, scene); // 잉크병
  const glb = ball(0.14, std(0x6f6a60, { roughness: 0.4 }), 0.72, 1.0, -0.4, scene); cyl(0.012, 0.06, 0.1, mDark, 0.72, 0.83, -0.4, scene);
  for (let i = 0; i < 3; i++) { const sc = cyl(0.022, 0.022, 0.34, std(0xcfc6b0), -0.62 + i * 0.05, 0.8, -0.3 - i * 0.03, scene); sc.rotation.set(Math.PI / 2, 0, 0.5 + i * 0.3); }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.6), std(0x3a2f30, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.004, 1.0); rug.receiveShadow = true; scene.add(rug);
  // 촛불
  cyl(0.06, 0.07, 0.015, std(0x8a7a50, { metalness: 0.7, roughness: 0.35 }), -0.56, 0.79, -0.5, scene); cyl(0.017, 0.019, 0.15, std(0xe8e0cc, { emissive: 0x554433 }), -0.56, 0.87, -0.5, scene);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(7) })); flame.scale.set(1, 2.6, 1); flame.position.set(-0.56, 0.975, -0.5); scene.add(flame);
  const candle = new THREE.PointLight(0xffb469, 2.4, 9, 1.7); candle.position.copy(flame.position); candle.castShadow = true; candle.shadow.mapSize.set(512, 512); candle.shadow.bias = -0.003; candle.shadow.radius = 5; scene.add(candle);
  // 달빛과 빛줄기
  const moon = new THREE.SpotLight(0xd8e4ff, 150, 20, 0.2, 0.35, 1.3); moon.position.set(1.9, 5.2, -8.2); moon.target.position.set(-0.3, 0.3, 0.9); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0006; moon.shadow.radius = 4; scene.add(moon, moon.target);
  const sh = shaft(0.55, 1.25, 5.2, 0xcfe0ff, 0.045); sh.position.set(0.25, 1.95, -2.4); sh.quaternion.setFromUnitVectors(V(0, -1, 0), V(-0.3, 0.3, 0.9).sub(V(1.9, 5.2, -8.2)).normalize()); scene.add(sh);
  scene.add(new THREE.HemisphereLight(0x9fb0d8, 0x2a221c, 0.55));
  const door = new THREE.SpotLight(0xffe9c8, 0, 12, 0.42, 0.7, 1.4); door.position.set(-4.4, 1.9, 2.6); door.target.position.set(0.6, 0, 0.3); door.castShadow = true; door.shadow.mapSize.set(1024, 1024); door.shadow.bias = -0.001; scene.add(door, door.target);
  const motes = dust(380, 0.016, [3.2, 3, 5.5], 0xdde6ff, 0.5); scene.add(motes);
  // 인물, 종이, 깃펜
  const fig = makeFigure({ cloak: 0.4, hood: true }); scene.add(fig.root);
  const skc = canvas(PAPER_W, PAPER_H), skt = new THREE.CanvasTexture(skc); skt.colorSpace = THREE.SRGBColorSpace; skt.anisotropy = 8;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: skt, roughness: 0.9, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: skt, emissiveIntensity: 0.03 }));
  sheet.rotation.set(-Math.PI / 2, 0, Math.PI); sheet.receiveShadow = true; scene.add(sheet);
  const quill = new THREE.Group(); scene.add(quill);
  cyl(0.0035, 0.002, 0.3, std(0xe8e2d2), 0, 0.15, 0, quill, 8); const nib = cyl(0.0035, 0.0002, 0.03, std(0x101010, { metalness: 0.6, roughness: 0.3 }), 0, 0.012, 0, quill, 8);
  const fe = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.27), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, alphaTest: 0.4, roughness: 0.8, emissive: 0xffffff, emissiveIntensity: 0.08, map: tex(128, 400, (x, w, h) => {
    x.fillStyle = '#f4f1e8'; x.beginPath(); x.moveTo(w / 2, h); x.bezierCurveTo(w * 1.15, h * 0.75, w * 1.0, h * 0.2, w * 0.56, 0); x.bezierCurveTo(w * 0.05, h * 0.25, -w * 0.1, h * 0.7, w / 2, h); x.fill();
    x.strokeStyle = 'rgba(60,55,50,0.55)'; x.lineWidth = 1.2; for (let i = 0; i < 40; i++) { const y = h - i * 10; x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w * 0.95, y - 26); x.moveTo(w / 2, y); x.lineTo(w * 0.08, y - 24); x.stroke(); }
    x.lineWidth = 3; x.strokeStyle = '#d8d2c2'; x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w * 0.55, 6); x.stroke();
  }) }));
  fe.position.y = 0.2; fe.castShadow = true; quill.add(fe);
  const fly = makePaper(A.old, 0.42); scene.add(fly);
  const loose = Array.from({ length: 7 }, () => { const p = makePaper(null, 0.34); scene.add(p); return p; });
  S = { scene, cam, fig, chair, sheet, skc, skt, quill, fly, loose, flame, candle, moon, door, leaves, curtains, motes, sh };
}

const look = (cam, p, t, up) => { cam.position.copy(p); if (up) cam.up.copy(up); else cam.up.set(0, 1, 0); cam.lookAt(t); };
const shake = (t, a, s = 1) => V(noise(t * 1.3 * s, 1) * a, noise(t * 1.1 * s, 2) * a, noise(t * 0.9 * s, 3) * a);

export function office(ctx, t, dur, A, sub) {
  const { scene, cam, fig, chair, sheet, skc, skt, quill, fly, loose, flame, candle, door, leaves, curtains, motes } = S;
  const st = { mono: 1, outline: 0.5, grain: 0.08, paper: 0.1, bloom: 0.34, bloomT: 0.9, vig: 0.6, exposure: 1.35, aperture: 0.5 };
  const wind = ease.io(prog(t, 9.55, 10.1));
  // 촛불, 먼지, 창, 커튼
  const fl = 1 + noise(t * 9, 3) * 0.14 + wind * noise(t * 30, 4) * 0.5, out = 1 - prog(t, 10.3, 10.5);
  candle.intensity = 2.4 * fl * out; flame.scale.set(1 + wind * 0.6, 2.6 * fl, 1); flame.position.x = -0.56 - wind * 0.012 * (1 + noise(t * 20, 5)); flame.visible = out > 0;
  motes.position.set(Math.sin(t * 0.13) * 0.2 - wind * (t - 9.5) * 0.5, Math.sin(t * 0.1) * 0.1, wind * (t - 9.5) * 0.9);
  const op = ease.back(prog(t, 9.5, 9.95));
  for (const [lf, sx] of leaves) lf.rotation.y = -sx * op * 1.75;
  for (const [m, base, sx] of curtains) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], k = (1.05 - y) / 2.1; p.setZ(i, Math.sin(x * 16) * 0.035 + k * k * wind * (0.55 + 0.3 * Math.sin(t * 9 + x * 5 + y * 3))); p.setX(i, x * (1 - 0.25 * k * wind) - sx * k * wind * 0.1); } p.needsUpdate = true; m.geometry.computeVertexNormals(); }
  door.intensity = 90 * ease.out(prog(t, 0.05, 0.6)); door.castShadow = t < 3 || t > 8.6;
  chair.position.set(0, 0, -1.15); sheet.visible = quill.visible = fly.visible = false; loose.forEach(p => (p.visible = false));
  let tip = null;

  if (t < 3.0) { // A — 문이 열리고, 검은 형체가 들어와 책상에 앉는다
    const u = ease.io(prog(t, 0.25, 2.3)), a = alongPath(IN, u), sit = ease.io(prog(t, 2.3, 2.95));
    fig.root.position.copy(a.p); fig.root.rotation.y = lerp(a.yaw, 0, ease.io(prog(u, 0.86, 1)));
    fig.walk(u * a.len / 0.72 * Math.PI, 1 - prog(u, 0.93, 1)); if (u >= 1) fig.stand(t * 3);
    fig.sit(sit); fig.sway(t, (1 - sit) * (u < 1 ? 1 : 0), 0); chair.position.z = -1.15 - 0.25 * (1 - sit) * 0;
    const k = ease.io(prog(t, 0, 3));
    look(cam, V(lerp(1.25, 0.55, k), lerp(1.05, 1.5, k), lerp(3.7, 2.7, k)).add(shake(t, 0.012)), V(lerp(-0.7, 0, k), lerp(1.1, 1.0, k), lerp(0.6, -1.0, k)));
    cam.fov = 36; st.focus = cam.position.distanceTo(fig.root.position) ; st.fade = prog(t, 0, 0.8); st.aperture = 0.35;
  } else if (t < 8.6) { // B — 종이를 꺼내 깃펜으로 기존 로고를 그린다
    fig.root.position.set(0, 0, -1.15); fig.root.rotation.y = 0; fig.sit(1); fig.sway(t, 0, 0);
    const dp = prog(t, 5.0, 8.2), x = skc.getContext('2d');
    x.clearRect(0, 0, PAPER_W, PAPER_H); x.drawImage(paperSprite(null), 0, 0);
    const c = drawLogoSketch(x, A.old, dp, PAPER_W / 2, PAPER_H / 2 - 8, 580, '#17110d'); skt.needsUpdate = true;
    const slide = ease.out(prog(t, 3.0, 3.7));
    sheet.visible = true; sheet.position.set(PAPER.x + (1 - slide) * 0.3, PAPER.y, PAPER.z - (1 - slide) * 0.22); sheet.rotation.z = Math.PI + (1 - slide) * 0.5 + 0.04;
    const draw = V(PAPER.x - (c[0] / PAPER_W - 0.5) * PW, PAPER.y, PAPER.z + (0.5 - c[1] / PAPER_H) * PH);
    // 펜촉: 잉크병 → 고민(허공에서 맴돌고 톡톡) → 그리기 → 들어올림
    const ink = V(-0.36, 0.86, -0.74), hov = V(0.0 + Math.cos(t * 4.2) * 0.05, 0.86 + Math.max(0, Math.sin(t * 9)) * 0.025, -0.66 + Math.sin(t * 4.2) * 0.035);
    const k1 = ease.io(prog(t, 3.6, 4.15)), k2 = ease.io(prog(t, 4.85, 5.1)), k3 = ease.io(prog(t, 8.2, 8.6));
    tip = ink.clone().lerp(hov, k1).lerp(draw, k2).lerp(V(-0.15, 0.98, -0.8), k3);
    tip.y += Math.sin(prog(t, 3.6, 4.15) * Math.PI) * 0.08;
    quill.visible = t > 3.25; quill.position.copy(tip);
    quill.rotation.set(-0.5 + noise(t * 5, 7) * 0.05 * k2, 0.4, 0.45 + Math.sin(t * 4.2) * 0.12 * (1 - k2) + noise(t * 6, 8) * 0.06 * k2);
    const arrive = ease.io(prog(t, 3.2, 3.6));
    quill.updateMatrixWorld(); fig.reach('R', V(-0.25, 0.83, -0.95).lerp(quill.localToWorld(V(0, 0.075, 0)), arrive), V(-0.6, -1, -0.2));
    fig.reach('L', V(0.26, 0.8, -0.95).lerp(V(0.17, 0.795, -0.84), slide));
    fig.spine.rotation.set(0.42 + 0.04 * Math.sin(t * 1.3), (tip.x) * -0.5, 0); fig.head.rotation.set(0.42 - 0.3 * (1 - k2) * Math.sin(prog(t, 4.1, 4.9) * Math.PI), tip.x * -0.6 + (1 - k2) * k1 * 0.3 * Math.sin(t * 2.5), (1 - k2) * k1 * 0.18);
    if (t < 6.3) { const k = ease.io(prog(t, 3.0, 6.3)); look(cam, V(lerp(1.1, 0.82, k), lerp(1.55, 1.38, k), lerp(-0.45, -0.7, k)).add(shake(t, 0.006)), V(-0.05, 0.86, -0.74)); cam.fov = 36; st.focus = cam.position.distanceTo(PAPER); st.aperture = 0.9; }
    else if (t < 7.45) { const k = prog(t, 6.3, 7.45); look(cam, V(lerp(-0.32, -0.12, k), 0.845, lerp(-0.32, -0.36, k)).add(shake(t, 0.002)), V(tip.x * 0.6, 0.83, -0.7)); cam.fov = 30; st.focus = cam.position.distanceTo(tip); st.aperture = 1.6; }
    else { const k = ease.io(prog(t, 7.45, 8.6)); fig.spine.rotation.x = 0.02; fig.head.rotation.x = 0.25; look(cam, V(0.02, lerp(1.42, 1.72, k), -0.66), V(0.02, 0.78, -0.66), V(Math.sin(lerp(0.25, 0, k)), 0, Math.cos(lerp(0.25, 0, k)))); cam.fov = 30; st.focus = cam.position.y - 0.787; st.aperture = 0.5; }
  } else { // C — 급히 나가고, 창이 열리며 바람이 종이를 창밖으로 날린다
    const u = ease.in(prog(t, 9.05, 10.0)) , a = alongPath(OUT, u), up = ease.out(prog(t, 8.82, 9.12));
    fig.root.position.copy(a.p); fig.root.rotation.y = lerp(0, a.yaw, ease.io(prog(u, 0, 0.15)));
    fig.root.visible = u < 1;
    if (u > 0) { fig.walk(u * a.len / 0.8 * Math.PI, 1.15); fig.sit(0); } else { fig.stand(t * 3); fig.sit(1 - up); fig.head.rotation.set(-0.15, 0.9 * ease.back(prog(t, 8.62, 8.8)), 0); fig.spine.rotation.y = 0.3 * prog(t, 8.62, 8.8); }
    fig.sway(t, u > 0 ? 1.6 : 0, wind * 0.5);
    chair.position.z = -1.15 - 0.3 * up; chair.rotation.y = 0.25 * up;
    const fp = prog(t, 10.15, 11.5);
    const path = new THREE.CatmullRomCurve3([V(0.02, 0.8, -0.66), V(0.5, 1.25, 0.1), V(-0.45, 1.8, 0.35), V(-0.1, 2.05, -0.9), V(0.2, 1.9, -2.5), V(0.5, 2.3, -4.6)]);
    const pp = path.getPoint(ease.io(fp));
    fly.visible = true; fly.position.copy(pp);
    if (fp <= 0) { fly.rotation.set(-Math.PI / 2, 0, Math.PI + 0.04); fly.flutter(t, wind * 0.35); fly.position.y += wind * 0.01; }
    else { fly.rotation.set(-Math.PI / 2 + fp * 5.5 + Math.sin(t * 7) * 0.4, fp * 3.1, Math.PI + fp * 4); fly.flutter(t, 1); }
    loose.forEach((p, i) => { // 함께 흩날리는 빈 종이들
      const k = prog(t, 9.95 + i * 0.09, 11.6); p.visible = k > 0; if (!p.visible) return;
      p.position.set(0.6 - i * 0.2 + Math.sin(k * 5 + i) * 0.5 - k * 0.3, 0.86 + k * (1.2 + (i % 3) * 0.3) + Math.sin(k * 9 + i * 2) * 0.12, -0.7 + k * (1.4 + i * 0.35) + Math.cos(k * 4 + i) * 0.4);
      p.rotation.set(k * 7 + i, k * 5 + i * 2, k * 6); p.flutter(t + i, 1);
    });
    const k = ease.io(prog(t, 10.1, 11.6));
    const cp = V(-1.2, 1.42, 2.35).lerp(V(0.25, 1.75, -0.2), k).add(shake(t, 0.012 + wind * 0.02, 3));
    look(cam, cp, V(0.0, 1.0, -1.1).lerp(pp, ease.io(prog(t, 9.9, 10.5))));
    cam.fov = lerp(36, 30, k); st.focus = lerp(cp.distanceTo(V(0, 1, -1.2)), cp.distanceTo(pp), prog(t, 9.9, 10.5)); st.aperture = 0.45;
    st.flash = ease.in(prog(t, 11.2, dur)); st.bloom = 0.32 + st.flash * 1.5;
  }
  cam.updateProjectionMatrix();
  renderFilm(scene, cam, st, t, sub);
  blit(ctx);
}
