// 장면 3~5 — 2010년대 골목의 그래피티, 휴대폰 촬영, 디지털 스캔
import { W, H, clamp, lerp, prog, ease, rng, noise, S, sk, tone, beginSketch, layer, person, vignette, flyingPaper, paperSprite, canvas, logoBitmap, drawLogo, glitch, windLine } from './core.js';

const P = { rough: 0.55, sat: 1 };
export const LG = { x: 960, y: 480, size: 700 };   // 벽 위 로고 위치
const GREEN = '#00ff7f';

// ---------- 벽 ----------
function wall(t) {
  return layer('alleyWall', t, P, x => {
    x.fillStyle = '#3a2b2c'; x.fillRect(0, 0, W, H);
    const r = rng(77);
    for (let row = 0; row < 24; row++) for (let col = -1; col < 17; col++) {
      const bx = col * 124 + (row % 2) * 62, by = row * 40;
      const v = r(); x.fillStyle = `rgb(${88 + v * 40},${50 + v * 22},${46 + v * 18})`;
      x.fillRect(bx + 3, by + 3, 118, 34);
      if (r() < 0.16) { x.fillStyle = 'rgba(20,14,16,0.35)'; x.fillRect(bx + 3, by + 3, 118, 34); }
    }
    for (let i = 0; i < 26; i++) sk.line(0, i * 40 + 1, W, i * 40 + 1, { strokeWidth: 1.2, stroke: '#1d1517' });
    // 얼룩
    for (let i = 0; i < 16; i++) { const g = x.createRadialGradient(r() * W, r() * 900, 0, r() * W, r() * 900, 200 + r() * 300); g.addColorStop(0, 'rgba(12,8,14,0.3)'); g.addColorStop(1, 'rgba(12,8,14,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    // 배수관, 창문, 전선, 포스터
    sk.rect(120, -10, 44, 960, { fill: '#4d5560', strokeWidth: 3 }); for (const y of [180, 520, 820]) sk.rect(110, y, 64, 22, { fill: '#39404a' });
    sk.rect(1560, 90, 240, 200, { fill: '#141821', strokeWidth: 5 }); for (let i = 1; i < 5; i++) sk.line(1560 + i * 48, 90, 1560 + i * 48, 290, { strokeWidth: 4 });
    sk.rect(1548, 290, 264, 20, { fill: '#5a5560' });
    sk.curve([[0, 60], [600, 120], [1200, 70], [1920, 110]], { strokeWidth: 3 });
    sk.rect(230, 560, 150, 200, { fill: '#c9b98a' }); sk.rect(250, 580, 110, 70, { fill: '#b04a4a' }); for (let i = 0; i < 4; i++) sk.line(250, 670 + i * 20, 360 - i * 14, 670 + i * 20, { strokeWidth: 2 });
    sk.rect(1620, 520, 130, 170, { fill: '#8fb0b8' }); sk.circle(1685, 585, 60, { fill: '#e8d36a' });
    // 바닥
    sk.rect(-10, 940, W + 20, 160, { fill: '#26242b', strokeWidth: 4 });
    for (let i = 0; i < 7; i++) sk.line(i * 330 - 40, 1080, i * 300 + 60, 940, { strokeWidth: 1.5, stroke: '#141318' });
    sk.rect(-10, 930, W + 20, 18, { fill: '#4a4850' });
    // 쓰레기통
    sk.rect(1640, 760, 170, 190, { fill: '#2f4a44', strokeWidth: 4 }); sk.rect(1626, 740, 198, 26, { fill: '#3a5a52', strokeWidth: 4 }); for (let i = 1; i < 4; i++) sk.line(1640 + i * 42, 772, 1640 + i * 42, 944, { strokeWidth: 2 });
    // 가로등
    sk.rect(1440, 150, 18, 800, { fill: '#1a1a20' }); sk.path('M1449,160 q0,-60 -70,-60 l-40,0', { strokeWidth: 9, stroke: '#1a1a20' }); sk.rect(1300, 92, 70, 26, { fill: '#ffe9a8' });
  });
}
function lampLight(ctx, t) {
  ctx.save(); ctx.fillStyle = 'rgba(8,8,20,0.42)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(1335, 120, 0, 1100, 560, 980);
  g.addColorStop(0, 'rgba(255,226,150,0.34)'); g.addColorStop(0.5, 'rgba(255,200,120,0.07)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------- 그래피티 스프라이트 ----------
const GR = {};
function graffiti(logo, key, stops) {
  if (GR[key]) return GR[key];
  const R = 1024, c = canvas(R, R), x = c.getContext('2d'), m = canvas(R, R), mx = m.getContext('2d');
  mx.drawImage(logoBitmap(logo, R, '#ffffff'), 0, 0);
  mx.globalCompositeOperation = 'source-in';
  const g = mx.createLinearGradient(R * 0.15, R * 0.1, R * 0.85, R * 0.95);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  mx.fillStyle = g; mx.fillRect(0, 0, R, R);
  // 번짐(오버스프레이) → 그림자 → 본색 → 하이라이트
  x.filter = 'blur(14px)'; x.globalAlpha = 0.55; x.drawImage(m, 0, 0); x.filter = 'none'; x.globalAlpha = 1;
  x.drawImage(logoBitmap(logo, R, '#0d0a12'), 5, 6);
  x.drawImage(m, 0, 0);
    return (GR[key] = c);
}
const OLD_COLS = ['#ff2d7a', '#ff7a1a', '#ffd400', '#19d3ff', '#9a4dff'];
const NEW_COLS = ['#00ff7f', '#2dffc4', '#c8ffe6', '#00ff7f', '#00d0ff'];

// 스프레이 경로 (로고 좌표 0..1)
function sprayPath(n, seed, slow) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    if (slow) { const a = k * Math.PI * 7, rad = 0.06 + k * 0.5; pts.push([0.5 + Math.cos(a) * rad * 0.8 + (r() - 0.5) * 0.05, 0.5 + Math.sin(a) * rad + (r() - 0.5) * 0.05]); }
    else { const row = Math.floor(k * 7), u = (k * 7) % 1; pts.push([0.12 + (row % 2 ? 1 - u : u) * 0.76 + (r() - 0.5) * 0.06, 0.08 + (row + u) / 7 * 0.86]); }
  }
  return pts;
}
const FAST = sprayPath(90, 3, false), SLOW = sprayPath(120, 9, true);
const at = (pts, p) => { const f = clamp(p) * (pts.length - 1), i = Math.floor(f), b = pts[Math.min(pts.length - 1, i + 1)]; return [lerp(pts[i][0], b[0], f - i), lerp(pts[i][1], b[1], f - i)]; };
let mC, cC;
function mask(pts, p, rad) { // p까지 뿌려진 영역
  mC ||= canvas(512, 512); const x = mC.getContext('2d');
  x.clearRect(0, 0, 512, 512);
  const n = clamp(p) * (pts.length - 1);
  for (let i = 0; i <= n; i++) {
    const [u, v] = pts[i], rr = rad * 512 * clamp((n - i) / 3 + 0.35, 0, 1);
    const g = x.createRadialGradient(u * 512, v * 512, rr * 0.45, u * 512, v * 512, rr);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(u * 512 - rr, v * 512 - rr, rr * 2, rr * 2);
  }
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
  for (let i = 0; i < 9; i++) {
    const x = LG.x - 240 + r() * 480, y0 = LG.y + 120 + r() * 170, len = (30 + r() * 110) * clamp(p * 1.5 - r() * 0.5);
    if (len <= 0) continue;
    ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 4 + r() * 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + len); ctx.stroke();
  }
}
// 벽 위의 그림 상태. a: 기존 로고 진행, b: 2026 로고로 덧칠 진행
function paint(ctx, A, a, b) {
  const oldS = graffiti(A.old, 'old', OLD_COLS), newS = graffiti(A.neo, 'new', NEW_COLS);
  if (b >= 1) { ctx.drawImage(newS, LG.x - LG.size / 2, LG.y - LG.size / 2, LG.size, LG.size); drips(ctx, 1, NEW_COLS, 5); return; }
  if (a > 0) {
    if (b <= 0) { if (a >= 1) ctx.drawImage(oldS, LG.x - LG.size / 2, LG.y - LG.size / 2, LG.size, LG.size); else masked(ctx, oldS, mask(FAST, a, 0.17), false); drips(ctx, a, OLD_COLS, 2); }
    else {
      const m = mask(SLOW, b, 0.2);
      ctx.save(); ctx.globalAlpha = 1 - b * 0.6; drips(ctx, 1, OLD_COLS, 2); ctx.restore();
      masked(ctx, oldS, m, true); masked(ctx, newS, m, false); drips(ctx, b, NEW_COLS, 5);
    }
  }
}
function sprayMist(ctx, from, to, col, t) {
  const r = rng(Math.floor(t * 30) + 1);
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const k = r(), sp = k * 46;
    ctx.fillStyle = col; ctx.globalAlpha = 0.5 * (1 - k * 0.6) * r();
    ctx.beginPath(); ctx.arc(lerp(from[0], to[0], k) + (r() - 0.5) * sp, lerp(from[1], to[1], k) + (r() - 0.5) * sp, 2 + r() * 5, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function can(ctx, hand, to) {
  const a = Math.atan2(to[1] - hand[1], to[0] - hand[0]);
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(a);
  ctx.fillStyle = '#0b0a0d'; ctx.fillRect(-14, -44, 30, 76); ctx.fillRect(4, -56, 12, 14);
  ctx.restore();
  return [hand[0] + Math.cos(a) * 20, hand[1] + Math.sin(a) * 20 - 40];
}

// ---------- 장면 3: 골목 ----------
/* 0-1.6 종이가 날아오고 아티스트가 잡는다 · 1.6-3.0 로고 확인 · 3.0-5.6 기존 로고를 빠르게 그림
   5.6-7.2 맘에 들지 않음 · 7.2-11.6 천천히 2026 로고로 수정 · 11.6-13.2 완성, 퇴장 */
export function alley(ctx, t, dur, A) {
  const z = 1.08 - 0.08 * ease.out(prog(t, 0, 2.5)) + 0.05 * ease.io(prog(t, 7.2, 11.6));
  ctx.translate(W / 2, 520); ctx.scale(z, z); ctx.translate(-W / 2, -520);
  ctx.drawImage(wall(t), 0, 0);
  const a = prog(t, 3.1, 5.5), b = ease.io(prog(t, 7.3, 11.5));
  paint(ctx, A, a, b);
  lampLight(ctx, t);
  // 종이
  const cat = prog(t, 0.2, 1.5);
  const hold = [640, 470];
  let fig = { x: 520, y: 950, s: 1.3, face: 1, style: 'hood' };
  const enter = prog(t, 0, 1.1); fig.x = lerp(180, 520, ease.out(enter)); if (enter < 1) fig.walk = enter * 9;
  if (t < 1.5) { fig.handR = [lerp(560, 660, cat), lerp(700, 380, ease.out(prog(t, 0.9, 1.5)))]; }
  else if (t < 3.0) { fig.handR = hold; fig.handL = [600, 520]; fig.head = { dx: 6, dy: 6 }; fig.lean = 0.06; }
  else if (t < 5.6) { // 빠르게 분사
    const pt = at(FAST, a), tx = LG.x + (pt[0] - 0.5) * LG.size, ty = LG.y + (pt[1] - 0.5) * LG.size;
    fig.x = lerp(520, 600, pt[0]) ; fig.handR = [tx - 90, ty + 20]; fig.lean = 0.1 + (pt[1] - 0.5) * 0.2; fig.tgt = [tx, ty]; fig.col = OLD_COLS[Math.floor(a * 9) % 5];
  } else if (t < 7.2) { // 물러나서 살펴보고 고개를 젓는다
    const k = ease.io(prog(t, 5.6, 6.1));
    fig.x = lerp(560, 430, k); fig.handR = [fig.x + 60, 560]; fig.handL = null; fig.head = { dx: Math.sin((t - 6.2) * 14) * 12 * prog(t, 6.2, 6.3) * (1 - prog(t, 6.9, 7.1)), dy: 4 }; fig.lean = -0.05;
  } else if (t < 11.6) { // 천천히 수정
    const pt = at(SLOW, b), tx = LG.x + (pt[0] - 0.5) * LG.size, ty = LG.y + (pt[1] - 0.5) * LG.size;
    fig.x = lerp(430, 560, ease.io(prog(t, 7.2, 7.8))) + (pt[0] - 0.5) * 60; fig.handR = [tx - 80, ty + 16]; fig.lean = 0.08; fig.tgt = [tx, ty]; fig.col = NEW_COLS[Math.floor(b * 12) % 5];
  } else { // 만족하고 떠난다
    const k = prog(t, 12.0, dur + 0.4);
    fig.x = lerp(560, -260, ease.in(k)); fig.face = k > 0 ? -1 : 1; if (k > 0) fig.walk = k * 12; fig.handR = k > 0 ? null : [fig.x + 70, 520];
  }
  if (t < 1.5) { // 바람 타고 날아오는 종이
    const e = ease.out(cat);
    windLine(ctx, [[-100, 200], [300, 120], [700, 300], [1100, 200]], t * 1.2, 'rgba(255,255,255,0.4)', 3);
    flyingPaper(ctx, A.old, lerp(1500, 668, e) + Math.sin(e * 8) * 60 * (1 - e), lerp(-120, 372, e) + Math.sin(e * 6) * 80 * (1 - e), lerp(240, 150, e), (1 - e) * Math.sin(t * 6) * 0.7, (1 - e) * t * 5);
  }
  const body = person(ctx, fig);
  if (t >= 1.5 && t < 3.0) { ctx.save(); ctx.translate(lerp(668, 640, prog(t, 1.5, 1.8)), lerp(372, 450, prog(t, 1.5, 1.8))); ctx.rotate(-0.08 + Math.sin(t * 3) * 0.03); ctx.drawImage(paperSprite(A.old), -75, -95, 150, 190); ctx.restore(); person(ctx, { ...fig, handR: [690, 520], handL: [612, 540] }); }
  if (fig.tgt) { const nz = can(ctx, body.handR, fig.tgt); sprayMist(ctx, nz, fig.tgt, fig.col, t); }
  else if (t >= 5.6 && t < 12.2) can(ctx, body.handR, [body.handR[0] + 10, body.handR[1] - 100]);
  // 못마땅한 표시 / 완성 반짝임
  if (t > 6.2 && t < 7.1) { beginSketch(ctx, t, { ...P, rough: 1.2, base: 40 }); sk.path(`M${body.head[0] + 60},${body.head[1] - 90} q14,-22 28,0 t28,0 t28,0`, { stroke: '#ffffff', strokeWidth: 5 }); }
  const sp = prog(t, 11.5, 12.3);
  if (sp > 0 && sp < 1) for (let i = 0; i < 5; i++) star(ctx, LG.x + [-300, 280, -180, 320, 20][i], LG.y + [-260, -200, 240, 130, -330][i], 44 * Math.sin(clamp(sp * 1.6 - i * 0.12) * Math.PI), GREEN);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  vignette(ctx, 0.5, '4,4,12');
  const fin = prog(t, 0, 0.35); if (fin < 1) { ctx.fillStyle = `rgba(10,10,18,${1 - fin})`; ctx.fillRect(0, 0, W, H); }
}
function star(ctx, x, y, r, col) {
  if (r <= 0) return;
  ctx.save(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.22 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- 장면 4: 휴대폰 ----------
let finalWall;
function wallFinal(A) { // 완성된 벽 (사람 없음)
  if (finalWall) return finalWall;
  finalWall = canvas(W, H); const x = finalWall.getContext('2d');
  x.drawImage(wall(0), 0, 0); paint(x, A, 1, 1); lampLight(x, 0); vignette(x, 0.5, '4,4,12');
  return finalWall;
}
const PH = { x: 960, y: 520, w: 760, h: 380 };            // 휴대폰 본체
const SC = { w: 640, h: 360 };                             // 화면(16:9)
function cameraUI(ctx, t, lock) { // 화면 좌표계(1920x1080) 기준 카메라 앱 UI
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = W / 2 + sx * 860, cy = H / 2 + sy * 440; ctx.beginPath(); ctx.moveTo(cx, cy - sy * 70); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * 70, cy); ctx.stroke(); }
  ctx.globalAlpha = 0.28; ctx.lineWidth = 2; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(W * i / 3, 0); ctx.lineTo(W * i / 3, H); ctx.moveTo(0, H * i / 3); ctx.lineTo(W, H * i / 3); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 초점 박스
  const s = lerp(520, 400, ease.out(lock)) + (lock < 1 ? Math.sin(t * 16) * 8 : 0);
  ctx.strokeStyle = lock >= 1 ? GREEN : '#ffd23d'; ctx.lineWidth = 6;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = LG.x + sx * s, cy = LG.y + sy * s * 0.86; ctx.beginPath(); ctx.moveTo(cx, cy - sy * 60); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * 60, cy); ctx.stroke(); }
  // 셔터 버튼, 상태
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(1790, 540, 60, 0, 7); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1790, 540, 46, 0, 7); ctx.fill();
  ctx.font = '600 34px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText('PHOTO', 110, 150); ctx.fillText('1x', 1768, 700);
  ctx.fillStyle = '#ffd23d'; ctx.fillText('HDR', 110, 960);
  ctx.restore();
}
/* 0-1.3 행인이 휴대폰을 든다 · 1.3-3.1 화면으로 클로즈업 · 3.1 초점 고정 · 3.45 찰칵 · ~4.6 사진이 어두워지며 디지털 화면으로 */
export const SHUTTER = 3.45;
export function phone(ctx, t, dur, A) {
  const wf = wallFinal(A);
  const zk = ease.io(prog(t, 1.3, 3.1)), zs = lerp(1, W / SC.w, zk);
  const raise = ease.out(prog(t, 0.35, 1.25)), py = lerp(1500, PH.y, raise);
  if (zk < 1) {
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(zs, zs); ctx.translate(-PH.x, -lerp(H / 2, PH.y, zk));
    // 배경: 벽(약간 흐리게)
    ctx.filter = `blur(${(2 + zk * 10).toFixed(1)}px)`; ctx.drawImage(wf, 0, 0); ctx.filter = 'none';
    ctx.fillStyle = `rgba(0,0,8,${0.25 + 0.3 * zk})`; ctx.fillRect(-50, -50, W + 100, H + 100);
    // 행인(뒷모습, 화면 앞쪽)
    const wx = lerp(2300, 960, ease.out(prog(t, 0, 0.9)));
    ctx.fillStyle = '#060608';
    ctx.beginPath(); ctx.ellipse(wx, 1420, 460, 420, 0, 0, 7); ctx.fill();           // 어깨
    ctx.beginPath(); ctx.arc(wx + 40, 880 + Math.sin(prog(t, 0, 0.9) * 9) * 8, 150, 0, 7); ctx.fill();  // 머리
    ctx.strokeStyle = '#060608'; ctx.lineCap = 'round'; ctx.lineWidth = 120;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(wx + sx * 380, 1300); ctx.lineTo(PH.x + sx * (PH.w / 2 + 10), py + 60); ctx.stroke(); }
    // 휴대폰
    ctx.fillStyle = '#0d0d12'; ctx.beginPath(); ctx.roundRect(PH.x - PH.w / 2, py - PH.h / 2, PH.w, PH.h, 44); ctx.fill();
    ctx.strokeStyle = '#3a3a48'; ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(PH.x - SC.w / 2, py - SC.h / 2, SC.w, SC.h, 10); ctx.clip();
    ctx.translate(PH.x - SC.w / 2, py - SC.h / 2); ctx.scale(SC.w / W, SC.h / H);
    ctx.drawImage(wf, 0, 0); cameraUI(ctx, t, prog(t, 2.9, 3.15)); ctx.restore();
    // 손가락
    ctx.fillStyle = '#060608';
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(PH.x + sx * (PH.w / 2 - 6), py - 60 + i * 150, 62, 44, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  } else {
    ctx.drawImage(wf, 0, 0);
    const d = prog(t, SHUTTER + 0.35, dur); // 사진이 어두워진다
    if (t < SHUTTER + 0.25) cameraUI(ctx, t, prog(t, 2.9, 3.15));
    if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${ease.io(d) * 0.82})`; ctx.fillRect(0, 0, W, H); }
  }
  // 찰칵: 셔터 닫힘 + 플래시
  const sh = t - SHUTTER;
  if (sh > -0.06 && sh < 0.5) {
    const blink = 1 - clamp(Math.abs(sh) / 0.07);
    if (blink > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H * 0.5 * blink); ctx.fillRect(0, H - H * 0.5 * blink, W, H * 0.5 * blink); }
    if (sh > 0.04) { ctx.fillStyle = `rgba(255,255,255,${(1 - ease.out(prog(sh, 0.04, 0.5))) * 0.95})`; ctx.fillRect(0, 0, W, H); }
  }
  const fin = prog(t, 0, 0.3); if (fin < 1) { ctx.fillStyle = `rgba(0,0,0,${0})`; }
}

// ---------- 장면 5: 스캔 ----------
/* 0-2.2 스캔 라인이 내려가며 원본 2026 로고가 정갈하게 나타남 · 2.2-3.5 정지 · 3.5-4.1 지지직 · 4.1-4.6 점멸 후 암전 */
export function scan(ctx, t, dur, A) {
  const top = LG.y - LG.size / 2, k = ease.io(prog(t, 0.15, 2.2)), y = lerp(top - 40, top + LG.size + 40, k);
  const mv = ease.io(prog(t, 2.2, 3.3)), cy = lerp(LG.y, H / 2, mv), size = lerp(LG.size, 760, mv);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // 아래쪽: 아직 스캔되지 않은 사진
  if (k < 1) { ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, H - y); ctx.clip(); ctx.drawImage(wallFinal(A), 0, 0); ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // 위쪽: 디지털 화면 + 원본 로고
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, k >= 1 ? H : y); ctx.clip();
  ctx.fillStyle = `rgba(0,255,127,${0.10 * (1 - mv)})`;
  for (let gx = 60; gx < W; gx += 60) for (let gy = 60; gy < H; gy += 60) ctx.fillRect(gx - 1, gy - 1, 2, 2);
  drawLogo(ctx, A.neo, LG.x, cy, size, '#f4f6f5');
  ctx.restore();
  if (k > 0 && k < 1) { // 스캔 라인
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y - 90, 0, y + 6); g.addColorStop(0, 'rgba(0,255,127,0)'); g.addColorStop(1, 'rgba(0,255,127,0.4)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 90, W, 96);
    ctx.fillStyle = '#eafff4'; ctx.shadowColor = GREEN; ctx.shadowBlur = 30; ctx.fillRect(0, y - 2, W, 4); ctx.restore();
  }
  // HUD
  if (t < 3.4) {
    ctx.save(); ctx.font = '500 26px Inter, monospace'; ctx.fillStyle = `rgba(0,255,127,${0.8 * (1 - prog(t, 2.8, 3.4))})`;
    ctx.fillText(k < 1 ? `SCANNING  ${String(Math.floor(k * 100)).padStart(3, '0')}%` : 'SCAN COMPLETE', 90, 110);
    ctx.fillRect(90, 126, 300 * k, 3); ctx.restore();
  }
  // 지지직 → 점멸 → 암전
  const g1 = prog(t, 3.5, 4.1);
  if (g1 > 0 && t < 4.1) glitch(ctx, 0.25 + g1 * 0.75 * (0.5 + 0.5 * noise(t * 40, 2)), Math.floor(t * 30));
  if (t >= 4.1) { const on = t < 4.3 && Math.floor(t * 30) % 3 === 0; if (on) glitch(ctx, 0.9, Math.floor(t * 30)); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } }
}
