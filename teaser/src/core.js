// 공통 유틸: 수학 헬퍼, 로고 로더, 스케치(rough.js) 래퍼, 실루엣 인물 리그
import rough from 'roughjs';

export const W = 1920, H = 1080;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// 부드러운 1D 노이즈 (-1..1)
export function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
}
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------- 색 ----------
export function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export function mix(h1, h2, t, a = 1) {
  const A = hexRgb(h1), B = hexRgb(h2);
  return rgb(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), a);
}

// ---------- 로고 ----------
const NS = 'http://www.w3.org/2000/svg';
export async function loadLogo(url) {
  const txt = await (await fetch(url)).text();
  const ds = [...txt.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 3000 3000');
  svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
  document.body.appendChild(svg);
  const paths = ds.map(d => new Path2D(d));
  const subs = [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const d of ds) {
    for (const sd of d.split(/(?=M )/)) {
      if (sd.trim().length < 4) continue;
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('d', sd);
      svg.appendChild(el);
      const len = el.getTotalLength(), bb = el.getBBox();
      x0 = Math.min(x0, bb.x); y0 = Math.min(y0, bb.y); x1 = Math.max(x1, bb.x + bb.width); y1 = Math.max(y1, bb.y + bb.height);
      subs.push({ p: new Path2D(sd), el, len, cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, top: bb.y });
    }
  }
  subs.sort((a, b) => a.cy - b.cy);
  return { ds, paths, subs, bbox: { x0, y0, x1, y1 }, cache: {} };
}
// 단색 비트맵 캐시
export function logoBitmap(logo, size, color) {
  const k = size + color;
  if (logo.cache[k]) return logo.cache[k];
  const c = canvas(size, size), x = c.getContext('2d');
  x.scale(size / 3000, size / 3000);
  x.fillStyle = color;
  for (const p of logo.paths) x.fill(p);
  return (logo.cache[k] = c);
}
export function drawLogo(ctx, logo, cx, cy, size, color, alpha = 1) {
  const res = Math.min(2048, 2 ** Math.ceil(Math.log2(Math.max(64, size * 1.2))));
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(logoBitmap(logo, res, color), cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}
// 펜으로 그려지는 로고. p: 0..1, 반환: 펜촉 위치(캔버스 좌표)
const tmpC = {};
export function drawLogoSketch(ctx, logo, p, cx, cy, size, color) {
  const N = logo.subs.length, sc = size / 3000, ox = cx - size / 2, oy = cy - size / 2;
  const WIN = 0.16, SPAN = 1 - WIN;
  if (p <= 0) return tip(0);
  // 채움(위→아래 와이프)
  const res = 1024;
  const t = (tmpC[res] ||= canvas(res, res)), tx = t.getContext('2d');
  const fi = clamp((p - WIN) / SPAN) * (N - 1), i0 = Math.floor(fi);
  const yT = p >= 1 ? 4000 : lerp(logo.subs[i0].cy, logo.subs[Math.min(N - 1, i0 + 1)].cy, fi - i0) - 60;
  tx.globalCompositeOperation = 'source-over';
  tx.clearRect(0, 0, res, res);
  tx.drawImage(logoBitmap(logo, res, color), 0, 0);
  if (p < 1) {
    const g = tx.createLinearGradient(0, (yT - 140) * res / 3000, 0, (yT + 20) * res / 3000);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    tx.globalCompositeOperation = 'destination-in';
    tx.fillStyle = g; tx.fillRect(0, 0, res, res);
  }
  ctx.drawImage(t, ox, oy, size, size);
  // 외곽선(진행 중)
  if (p < 1) {
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(sc, sc);
    ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.globalAlpha *= clamp((1 - p) * 12);
    for (let i = 0; i < N; i++) {
      const s = logo.subs[i], pi = clamp((p - (i / N) * SPAN) / WIN);
      if (pi <= 0) break;
      ctx.setLineDash(pi >= 1 ? [] : [pi * s.len, s.len + 50]);
      ctx.stroke(s.p);
    }
    ctx.restore();
  }
  function tip(q) {
    q = clamp(q);
    const i = Math.min(N - 1, Math.floor((q / SPAN) * N)), s = logo.subs[i];
    const pi = clamp((q - (i / N) * SPAN) / WIN);
    const pt = s.el.getPointAtLength(pi * s.len);
    return [ox + pt.x * sc, oy + pt.y * sc];
  }
  // 떨림을 줄이기 위해 최근 구간 평균
  let ax = 0, ay = 0; const K = 6;
  for (let k = 0; k < K; k++) { const q = tip(p - k * 0.004); ax += q[0]; ay += q[1]; }
  return [ax / K, ay / K];
}

// ---------- 스케치 래퍼 ----------
export const S = { ctx: null, rc: null, seed: 1, boil: 0, rough: 1.4, sat: 0, ink: '#2a1c10', lw: 2.4 };
export function beginSketch(ctx, t, { rough: r = 1.4, sat = 0, base = 1, ink = '#2a1c10' } = {}) {
  if (S.ctx !== ctx) { S.ctx = ctx; S.rc = rough.canvas(ctx.canvas); }
  S.seed = base * 1000 + 1; S.boil = Math.floor(t * 5) % 2; S.rough = r; S.sat = sat; S.ink = ink;
}
// 세피아 ↔ 원색. sat=0이면 세피아 단색, 1이면 원색
export function tone(hex, a = 1) {
  const [r, g, b] = hexRgb(hex), l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  const sp = [lerp(38, 236, l), lerp(26, 219, l), lerp(14, 184, l)];
  return rgb(lerp(sp[0], r, S.sat), lerp(sp[1], g, S.sat), lerp(sp[2], b, S.sat), a);
}
function opt(o = {}) {
  const fill = o.fill ? tone(o.fill) : undefined;
  return {
    seed: (S.seed += 13) + S.boil * 7919, roughness: S.rough, bowing: 0.8, strokeWidth: S.lw,
    fillStyle: 'solid', hachureGap: 9, fillWeight: 1.6, ...o,
    stroke: o.stroke === 'none' ? 'none' : o.stroke ? tone(o.stroke) : S.ink, fill,
  };
}
export const sk = {
  rect: (x, y, w, h, o) => S.rc.rectangle(x, y, w, h, opt(o)),
  line: (x1, y1, x2, y2, o) => S.rc.line(x1, y1, x2, y2, opt(o)),
  poly: (pts, o) => S.rc.polygon(pts, opt(o)),
  circle: (x, y, d, o) => S.rc.circle(x, y, d, opt(o)),
  ellipse: (x, y, w, h, o) => S.rc.ellipse(x, y, w, h, opt(o)),
  curve: (pts, o) => S.rc.curve(pts, opt(o)),
  path: (d, o) => S.rc.path(d, opt(o)),
  arc: (x, y, w, h, a0, a1, closed, o) => S.rc.arc(x, y, w, h, a0, a1, closed, opt(o)),
};

// ---------- 종이 질감 ----------
let paperTex;
export function paperTexture() {
  if (paperTex) return paperTex;
  const c = canvas(W, H), x = c.getContext('2d'), r = rng(7);
  x.fillStyle = '#e6d5ae'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const v = r();
    x.fillStyle = v > 0.5 ? `rgba(255,248,225,${r() * 0.12})` : `rgba(110,80,40,${r() * 0.10})`;
    const s = 1 + r() * 3;
    x.fillRect(r() * W, r() * H, s * (1 + r() * 6), s);
  }
  for (let i = 0; i < 40; i++) {
    const g = x.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 200 + r() * 300);
    g.addColorStop(0, `rgba(140,100,50,${0.05 + r() * 0.05})`); g.addColorStop(1, 'rgba(140,100,50,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  return (paperTex = c);
}
export function vignette(ctx, strength = 0.6, color = '20,12,6') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------- 실루엣 인물 ----------
// 2관절 IK: 어깨 s → 목표 t
function ik(sx, sy, tx, ty, l1, l2, bend) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const m = l1 + l2 - 0.01;
  if (d > m) { dx *= m / d; dy *= m / d; d = m; }
  const a = Math.atan2(dy, dx), c = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const e = a + c * bend;
  return [sx + Math.cos(e) * l1, sy + Math.sin(e) * l1, sx + dx, sy + dy];
}
/* p: {x, y(발), s(스케일), face(±1), walk(위상), sit(0..1), lean(rad),
      handR:[x,y]|null, handL:[x,y]|null, style:'cloak'|'hood'|'plain', head:{dx,dy}, color} */
export function person(ctx, p) {
  const s = p.s || 1, f = p.face || 1, col = p.color || '#0b0a0d';
  const legL = 170 * s, torso = 190 * s, sit = p.sit || 0, lean = p.lean || 0;
  const bob = p.walk != null ? Math.abs(Math.sin(p.walk)) * 8 * s : 0;
  const hipY = p.y - legL * (1 - sit * 0.45) - bob, hipX = p.x;
  const nkX = hipX + Math.sin(lean) * torso * f, nkY = hipY - Math.cos(lean) * torso;
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const seg = (x1, y1, x2, y2, w) => { ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  // 다리
  for (const sgn of [1, -1]) {
    const ph = p.walk != null ? Math.sin(p.walk + (sgn > 0 ? 0 : Math.PI)) : 0.12 * sgn;
    const fx = hipX + ph * 62 * s * (1 - sit) + sit * 70 * s * f, fy = p.y - Math.max(0, -Math.cos(p.walk + (sgn > 0 ? 0 : Math.PI)) || 0) * 26 * s * (p.walk != null ? 1 : 0);
    const k = ik(hipX, hipY, fx, fy, legL * 0.52, legL * 0.52, -f * 1);
    seg(hipX, hipY, k[0], k[1], 44); seg(k[0], k[1], k[2], k[3], 36);
    seg(k[2], k[3], k[2] + 26 * s * f, k[3], 26);
  }
  // 몸통
  seg(hipX, hipY, nkX, nkY + 30 * s, 78);
  if (p.style === 'cloak') {
    ctx.beginPath();
    ctx.moveTo(nkX - 62 * s, nkY + 10 * s); ctx.lineTo(nkX + 62 * s, nkY + 10 * s);
    ctx.lineTo(hipX + 96 * s + (p.walk != null ? Math.sin(p.walk) * 12 * s : 0), p.y - 28 * s - sit * 60 * s);
    ctx.lineTo(hipX - 96 * s - f * 22 * s, p.y - 28 * s - sit * 60 * s);
    ctx.closePath(); ctx.fill();
  }
  // 머리
  const hx = nkX + (p.head?.dx || 0) * s + f * 8 * s, hy = nkY - 38 * s + (p.head?.dy || 0) * s;
  ctx.beginPath(); ctx.arc(hx, hy, 44 * s, 0, 7); ctx.fill();
  if (p.style === 'cloak' || p.style === 'hood') {
    ctx.beginPath();
    ctx.moveTo(hx - f * 52 * s, hy + 44 * s); ctx.quadraticCurveTo(hx - f * 66 * s, hy - 40 * s, hx, hy - 58 * s);
    ctx.quadraticCurveTo(hx + f * 56 * s, hy - 46 * s, hx + f * 50 * s, hy + 8 * s); ctx.lineTo(hx + f * 30 * s, hy + 50 * s);
    ctx.closePath(); ctx.fill();
  }
  if (p.style === 'cap') { // 모자 챙
    ctx.beginPath(); ctx.ellipse(hx + f * 34 * s, hy - 20 * s, 44 * s, 10 * s, f * 0.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy - 8 * s, 46 * s, Math.PI, 0); ctx.fill();
  }
  // 팔
  const shY = nkY + 34 * s;
  const arm = (hand, side) => {
    const sx = nkX + side * 30 * s * f;
    let t = hand;
    if (!t) { const sw = p.walk != null ? Math.sin(p.walk + (side > 0 ? Math.PI : 0)) * 46 * s : side * 10 * s; t = [sx + sw, shY + 168 * s]; }
    const k = ik(sx, shY, t[0], t[1], 100 * s, 96 * s, f * (t[1] < shY ? 1 : -1) * 0.9);
    seg(sx, shY, k[0], k[1], 34); seg(k[0], k[1], k[2], k[3], 28);
    ctx.beginPath(); ctx.arc(k[2], k[3], 19 * s, 0, 7); ctx.fill();
    return [k[2], k[3]];
  };
  const r = arm(p.handR, 1), l = arm(p.handL, -1);
  ctx.restore();
  return { head: [hx, hy], handR: r, handL: l, neck: [nkX, nkY] };
}

// ---------- 글리치 ----------
let gA, gB;
export function glitch(ctx, amt, seed) {
  if (amt <= 0) return;
  gA ||= canvas(W, H); gB ||= canvas(W, H);
  const r = rng(seed * 9973 + 5), a = gA.getContext('2d'), b = gB.getContext('2d');
  a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, W, H); a.drawImage(ctx.canvas, 0, 0);
  // 수평 슬라이스 변위
  b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H); b.drawImage(gA, 0, 0);
  const n = Math.floor(4 + amt * 14);
  for (let i = 0; i < n; i++) {
    const y = r() * H, h = 6 + r() * 90 * amt, dx = (r() - 0.5) * 420 * amt;
    b.drawImage(gA, 0, y, W, h, dx, y, W, h);
  }
  // RGB 분리
  const sh = (6 + r() * 30) * amt;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (const [colr, dx] of [['#ff0000', -sh], ['#00ffff', sh]]) {
    a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, W, H); a.drawImage(gB, 0, 0);
    a.globalCompositeOperation = 'multiply'; a.fillStyle = colr; a.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(gA, dx, 0);
  }
  ctx.globalCompositeOperation = 'source-over';
  // 노이즈 바 / 스캔라인
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? '0,255,127' : '255,255,255'},${r() * 0.35 * amt})`;
    ctx.fillRect(r() * W, r() * H, r() * 500, 1 + r() * 5);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

// ---------- 정적 레이어 캐시 (선 떨림 2상태별) ----------
const LAYERS = {};
export function layer(key, t, params, fn, w = W, h = H) {
  const k = key + (Math.floor(t * 5) % 2);
  if (!LAYERS[k]) {
    const c = canvas(w, h), x = c.getContext('2d');
    beginSketch(x, t, params); fn(x);
    LAYERS[k] = c;
  }
  return LAYERS[k];
}

// ---------- 소품: 종이, 깃펜, 바람 ----------
const SPR = {};
export const PAPER_W = 640, PAPER_H = 810;
export function paperSprite(logo) { // logo가 있으면 로고가 그려진 종이
  const k = logo ? 'pl' : 'p';
  if (SPR[k]) return SPR[k];
  const c = canvas(PAPER_W, PAPER_H), x = c.getContext('2d'), r = rng(31);
  x.beginPath();
  const pts = [];
  for (let i = 0; i <= 40; i++) pts.push([8 + (i / 40) * (PAPER_W - 16), 8 + r() * 7]);
  for (let i = 0; i <= 50; i++) pts.push([PAPER_W - 8 - r() * 7, 8 + (i / 50) * (PAPER_H - 16)]);
  for (let i = 0; i <= 40; i++) pts.push([PAPER_W - 8 - (i / 40) * (PAPER_W - 16), PAPER_H - 8 - r() * 9]);
  for (let i = 0; i <= 50; i++) pts.push([8 + r() * 7, PAPER_H - 8 - (i / 50) * (PAPER_H - 16)]);
  pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
  x.closePath(); x.save(); x.clip();
  x.fillStyle = '#ead9b0'; x.fillRect(0, 0, PAPER_W, PAPER_H);
  const g = x.createRadialGradient(PAPER_W / 2, PAPER_H / 2, 150, PAPER_W / 2, PAPER_H / 2, 560);
  g.addColorStop(0, 'rgba(160,110,50,0)'); g.addColorStop(1, 'rgba(140,90,40,0.42)');
  x.fillStyle = g; x.fillRect(0, 0, PAPER_W, PAPER_H);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() > 0.5 ? '255,250,230' : '120,85,40'},${r() * 0.12})`; x.fillRect(r() * PAPER_W, r() * PAPER_H, 1 + r() * 9, 1 + r() * 2); }
  for (let i = 0; i < 7; i++) {
    const sx = r() * PAPER_W, sy = r() * PAPER_H, g2 = x.createRadialGradient(sx, sy, 0, sx, sy, 30 + r() * 80);
    g2.addColorStop(0, 'rgba(130,85,35,0.16)'); g2.addColorStop(1, 'rgba(130,85,35,0)');
    x.fillStyle = g2; x.fillRect(0, 0, PAPER_W, PAPER_H);
  }
  if (logo) drawLogo(x, logo, PAPER_W / 2, PAPER_H / 2 - 8, 580, '#2a1a10');
  x.restore();
  x.strokeStyle = 'rgba(70,45,20,0.55)'; x.lineWidth = 2; x.stroke();
  return (SPR[k] = c);
}
// 날아다니는 종이. tumble: 위상(뒤집히며 펄럭임)
export function flyingPaper(ctx, logo, x, y, h, rot, tumble) {
  const sp = paperSprite(logo), w = h * PAPER_W / PAPER_H;
  const sy = 0.62 + 0.38 * Math.cos(tumble), kx = Math.sin(tumble * 0.7) * 0.25;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.transform(1, 0, kx, sy, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
  ctx.drawImage(sp, -w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  // 접히는 면 음영
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, `rgba(60,35,10,${0.18 + 0.15 * Math.sin(tumble)})`); g.addColorStop(0.5, 'rgba(255,255,255,0.06)'); g.addColorStop(1, `rgba(60,35,10,${0.18 - 0.15 * Math.sin(tumble)})`);
  ctx.fillStyle = g; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.restore();
}
// 바람 줄기: pts를 지나는 곡선 위를 흐르는 대시
export function windLine(ctx, pts, phase, color = 'rgba(255,250,235,0.7)', lw = 3) {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.setLineDash([L * 0.28, L * 2]); ctx.lineDashOffset = L * 0.28 - (phase % 1) * L * 1.3;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  ctx.lineTo(pts.at(-1)[0], pts.at(-1)[1]); ctx.stroke(); ctx.restore();
}
