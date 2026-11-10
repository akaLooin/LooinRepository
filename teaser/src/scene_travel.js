// 장면 2 — 종이가 바람을 타고 원시 시대부터 현대까지 시간을 여행한다
import { W, H, clamp, lerp, prog, ease, rng, noise, S, sk, tone, beginSketch, paperTexture, vignette, flyingPaper, windLine } from './core.js';

const BLK = '#0b0a0d';
function sky(ctx, top, bot) { const g = ctx.createLinearGradient(0, 0, 0, H * 0.8); g.addColorStop(0, tone(top)); g.addColorStop(1, tone(bot)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function hills(base, amp, period, seed, scroll, o) {
  let d = `M-40,${H + 40}`;
  for (let x = -40; x <= W + 40; x += 80) d += ` L${x},${base - amp * (noise((x + scroll) / period, seed) * 0.5 + 0.5)}`;
  sk.path(d + ` L${W + 40},${H + 40} Z`, o);
}
function ground(y, fill) { sk.rect(-20, y, W + 40, H - y + 20, { fill, strokeWidth: 3 }); }
const wrap = (x, span = W + 600) => ((x % span) + span) % span - 300;
function cloud(x, y, s, fill = '#f4ead2') { sk.path(`M${x},${y} q${20 * s},${-50 * s} ${70 * s},${-30 * s} q${30 * s},${-50 * s} ${90 * s},${-10 * s} q${60 * s},${-10 * s} ${50 * s},${40 * s} z`, { fill, strokeWidth: 2 }); }
function smoke(ctx, x, y, t, n, s, col) {
  for (let i = 0; i < n; i++) { const k = ((t * 0.5 + i / n) % 1); ctx.fillStyle = tone(col, 0.55 * (1 - k)); ctx.beginPath(); ctx.arc(x + k * 150 * s + Math.sin(i * 5 + t) * 14, y - k * 230 * s, (16 + k * 56) * s, 0, 7); ctx.fill(); }
}
function sil(ctx, fn) { ctx.save(); ctx.fillStyle = BLK; ctx.strokeStyle = BLK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; fn(); ctx.restore(); }
function legs(ctx, xs, y, h, w, t) { ctx.lineWidth = w; xs.forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(t * 7 + i * 1.7) * h * 0.22, y + h); ctx.stroke(); }); }
function mammoth(ctx, x, y, s, t) {
  sil(ctx, () => {
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, -150, 130, 86, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(120, -190, 70, 78, 0.2, 0, 7); ctx.fill();
    ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(165, -170); ctx.quadraticCurveTo(205, -90, 180 + Math.sin(t * 3) * 14, -20); ctx.stroke();
    ctx.strokeStyle = tone('#efe4c4'); ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(150, -140); ctx.quadraticCurveTo(250, -70, 240, -150); ctx.stroke();
    ctx.strokeStyle = BLK; legs(ctx, [-90, -40, 50, 95], -100, 100, 40, t);
  });
}
function camel(ctx, x, y, s, t) {
  sil(ctx, () => {
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, -120, 80, 38, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, -160, 34, 34, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(66, -128); ctx.quadraticCurveTo(110, -150, 104, -210); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(118, -214, 26, 14, 0.2, 0, 7); ctx.fill();
    legs(ctx, [-56, -30, 40, 62], -100, 100, 13, t);
  });
}
function human(ctx, x, y, s, t, spear) {
  sil(ctx, () => {
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, -150, 18, 0, 7); ctx.fill();
    ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(0, -122); ctx.lineTo(0, -70); ctx.stroke();
    legs(ctx, [-5, 5], -66, 66, 12, t);
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, -116); ctx.lineTo(26, -92 + Math.sin(t * 6) * 6); ctx.stroke();
    if (spear) { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(26, -10); ctx.lineTo(30, -210); ctx.stroke(); }
  });
}
function palm(x, y, s) {
  sk.curve([[x, y], [x + 10 * s, y - 90 * s], [x + 34 * s, y - 180 * s]], { strokeWidth: 7 * s, stroke: '#4a341f' });
  for (let i = 0; i < 6; i++) { const a = -2.9 + i * 0.55; sk.curve([[x + 34 * s, y - 180 * s], [x + 34 * s + Math.cos(a) * 60 * s, y - 190 * s + Math.sin(a) * 40 * s - 16 * s], [x + 34 * s + Math.cos(a) * 110 * s, y - 180 * s + Math.sin(a) * 60 * s + 30 * s]], { strokeWidth: 5 * s, stroke: '#3f5a3a' }); }
}
function building(x, y, w, h, fill, r, lit, win = '#f3d27a') {
  sk.rect(x, y - h, w, h, { fill, strokeWidth: 2.4 });
  for (let yy = y - h + 18; yy < y - 26; yy += 34) for (let xx = x + 12; xx < x + w - 18; xx += 26) if (r() < lit) { S.ctx.fillStyle = tone(win); S.ctx.fillRect(xx, yy, 12, 18); }
}

const ERAS = [
  { year: '기원전 10,000년', rough: 2.1, sat: 0.3, draw(ctx, t, sc) { // 원시 시대 — 새벽
    sky(ctx, '#e7a36a', '#f6dcae'); sk.circle(1500, 420, 150, { fill: '#fbe9b7', strokeWidth: 2 });
    sk.poly([[300 - sc * 0.1, 620], [560 - sc * 0.1, 210], [640 - sc * 0.1, 230], [700 - sc * 0.1, 200], [960 - sc * 0.1, 620]], { fill: '#6e5a52', strokeWidth: 3 });
    smoke(ctx, 630 - sc * 0.1, 200, t, 7, 1.3, '#5a4a48');
    hills(600, 150, 420, 1, sc * 0.2, { fill: '#8b7a5a' }); hills(760, 120, 300, 2, sc * 0.5, { fill: '#6d6a3f' });
    ground(860, '#57532f');
    mammoth(ctx, wrap(1500 - sc * 0.7), 880, 1.1, t); mammoth(ctx, wrap(1900 - sc * 0.7), 870, 0.75, t + 1);
    const fx = wrap(700 - sc);
    sk.path(`M${fx - 420},1000 q40,-330 260,-330 q220,0 250,330 z`, { fill: '#3c342c', strokeWidth: 4 }); sk.path(`M${fx - 300},1000 q30,-210 150,-210 q120,0 140,210 z`, { fill: '#17120e' });
    human(ctx, fx + 190, 960, 1.2, 0, true); human(ctx, fx + 330, 970, 1.0, 0);
    for (let i = 0; i < 3; i++) sk.line(fx + 230 + i * 20, 965, fx + 270 - i * 14, 935, { strokeWidth: 5, stroke: '#3a2816' });
    ctx.fillStyle = tone('#ff9a3a', 0.9); ctx.beginPath(); ctx.moveTo(fx + 240, 950); ctx.quadraticCurveTo(fx + 230 + noise(t * 9, 1) * 12, 900, fx + 258 + noise(t * 8, 2) * 14, 860); ctx.quadraticCurveTo(fx + 286, 905, fx + 276, 950); ctx.fill();
  } },
  { year: '기원전 2,500년', rough: 1.9, sat: 0.4, draw(ctx, t, sc) { // 고대 이집트 — 한낮
    sky(ctx, '#7fb7d6', '#f5e3b0'); sk.circle(420, 230, 170, { fill: '#fff3c4', strokeWidth: 2 });
    for (const [x, s] of [[1250, 1.3], [780, 0.9], [1640, 0.7]]) { const px = x - sc * 0.15; sk.poly([[px - 330 * s, 760], [px, 760 - 420 * s], [px + 330 * s, 760]], { fill: '#d8b46e', strokeWidth: 3 }); sk.poly([[px, 760 - 420 * s], [px + 330 * s, 760], [px + 90 * s, 760]], { fill: '#b08a4c', stroke: 'none', fillStyle: 'hachure', hachureGap: 12, fillWeight: 2 }); }
    hills(790, 70, 500, 3, sc * 0.4, { fill: '#e2c586' }); hills(900, 80, 380, 4, sc * 0.8, { fill: '#c9a560' });
    const ox = wrap(400 - sc * 0.8); sk.poly([[ox - 18, 880], [ox - 12, 560], [ox, 530], [ox + 12, 560], [ox + 18, 880]], { fill: '#b89a62' });
    palm(wrap(1650 - sc * 0.9), 900, 1.4); palm(wrap(1740 - sc * 0.9), 910, 1.0);
    for (let i = 0; i < 4; i++) camel(ctx, wrap(900 + i * 190 - sc * 0.6), 940, 0.8, t + i);
  } },
  { year: '기원전 400년', rough: 1.7, sat: 0.5, draw(ctx, t, sc) { // 고대 그리스 — 오후
    sky(ctx, '#5fa3cf', '#d9ecf0'); cloud(wrap(300 - sc * 0.05), 250, 1.4); cloud(wrap(1300 - sc * 0.05), 180, 1);
    sk.rect(-20, 640, W + 40, 300, { fill: '#3f7f9a', strokeWidth: 2 });
    for (let i = 0; i < 9; i++) sk.line(wrap(i * 260 - sc * 0.3), 690 + (i % 3) * 40, wrap(i * 260 - sc * 0.3) + 90, 690 + (i % 3) * 40, { stroke: '#d9ecf0', strokeWidth: 2 });
    const bx = wrap(1500 - sc * 0.45 + t * 30); // 갤리선
    sk.path(`M${bx - 150},690 q150,70 320,0 l20,-40 l-30,20 l-280,0 z`, { fill: '#6a4c30' }); sk.line(bx, 690, bx, 540, { strokeWidth: 5 }); sk.poly([[bx - 80, 560], [bx + 80, 560], [bx + 66, 650], [bx - 66, 650]], { fill: '#efe4c4' });
    hills(900, 220, 700, 5, sc * 0.6, { fill: '#9aa56a' });
    const tx = wrap(760 - sc * 0.6), ty = 700; // 신전
    sk.rect(tx - 290, ty, 580, 26, { fill: '#e9e2d0' }); sk.rect(tx - 270, ty - 26, 540, 26, { fill: '#e9e2d0' });
    for (let i = 0; i < 7; i++) { sk.rect(tx - 250 + i * 78, ty - 250, 32, 224, { fill: '#f3eee0' }); sk.line(tx - 234 + i * 78, ty - 240, tx - 234 + i * 78, ty - 36, { strokeWidth: 1.2 }); }
    sk.rect(tx - 276, ty - 284, 552, 34, { fill: '#e9e2d0' }); sk.poly([[tx - 290, ty - 284], [tx, ty - 390], [tx + 290, ty - 284]], { fill: '#f3eee0', strokeWidth: 3 });
    for (let i = 0; i < 4; i++) { const cx = wrap(1300 + i * 130 - sc * 0.8); sk.path(`M${cx},940 q-34,-170 0,-300 q34,130 0,300 z`, { fill: '#2f4a35' }); }
    ground(940, '#7c8650');
  } },
  { year: '1300년', rough: 1.5, sat: 0.6, draw(ctx, t, sc) { // 중세 — 해 질 녘
    sky(ctx, '#5b5f9a', '#f2b27a'); sk.circle(1560, 520, 140, { fill: '#ffd9a0', strokeWidth: 2 });
    hills(700, 200, 600, 6, sc * 0.2, { fill: '#6a6f8a' });
    const cx = wrap(900 - sc * 0.5), cy = 740; // 성
    sk.rect(cx - 260, cy - 240, 520, 240, { fill: '#8a8478', strokeWidth: 3 });
    for (let i = 0; i < 9; i++) sk.rect(cx - 260 + i * 60, cy - 270, 34, 32, { fill: '#8a8478' });
    for (const [dx, h] of [[-300, 400], [220, 460], [-40, 330]]) { sk.rect(cx + dx, cy - h, 90, h, { fill: '#9a9488', strokeWidth: 3 }); sk.poly([[cx + dx - 14, cy - h], [cx + dx + 45, cy - h - 120], [cx + dx + 104, cy - h]], { fill: '#7a3b2e' }); sk.line(cx + dx + 45, cy - h - 120, cx + dx + 45, cy - h - 180, { strokeWidth: 3 }); const fw = Math.sin(t * 8 + dx) * 8; sk.poly([[cx + dx + 45, cy - h - 180], [cx + dx + 105, cy - h - 165 + fw], [cx + dx + 45, cy - h - 148]], { fill: '#c9452e' }); S.ctx.fillStyle = tone('#f3d27a'); S.ctx.fillRect(cx + dx + 36, cy - h + 60, 16, 30); }
    sk.path(`M${cx - 40},${cy} l0,-90 q40,-50 80,0 l0,90 z`, { fill: '#2a1d13' });
    hills(880, 130, 340, 7, sc * 0.7, { fill: '#56663e' });
    const mx = wrap(1560 - sc * 0.8); // 풍차
    sk.poly([[mx - 50, 900], [mx - 30, 700], [mx + 30, 700], [mx + 50, 900]], { fill: '#b89a72' }); sk.poly([[mx - 40, 700], [mx, 650], [mx + 40, 700]], { fill: '#7a3b2e' });
    for (let i = 0; i < 4; i++) { const a = t * 1.6 + i * Math.PI / 2; sk.line(mx, 690, mx + Math.cos(a) * 150, 690 + Math.sin(a) * 150, { strokeWidth: 5 }); sk.poly([[mx + Math.cos(a) * 50, 690 + Math.sin(a) * 50], [mx + Math.cos(a) * 150, 690 + Math.sin(a) * 150], [mx + Math.cos(a + 0.22) * 150, 690 + Math.sin(a + 0.22) * 150], [mx + Math.cos(a + 0.5) * 56, 690 + Math.sin(a + 0.5) * 56]], { fill: '#efe4c4', strokeWidth: 1.5 }); }
    for (let i = 0; i < 3; i++) { const hx = wrap(300 + i * 170 - sc * 0.8); sk.rect(hx, 820, 120, 90, { fill: '#d9c8a0' }); sk.poly([[hx - 14, 820], [hx + 60, 750], [hx + 134, 820]], { fill: '#6a4c30' }); }
    ground(910, '#4a5a34');
  } },
  { year: '1850년', rough: 1.2, sat: 0.7, draw(ctx, t, sc) { // 산업혁명 — 매연 낀 하늘
    sky(ctx, '#6f7a86', '#d9c9a8');
    const r = rng(4);
    for (let i = 0; i < 6; i++) { const fx = wrap(i * 380 - sc * 0.3), h = 240 + r() * 160; sk.rect(fx, 760 - h * 0.5, 230, h * 0.5, { fill: '#5a4a44' }); sk.rect(fx + 40, 760 - h - 80, 46, h + 80 - h * 0.5, { fill: '#7a4a3a' }); smoke(ctx, fx + 63, 760 - h - 80, t + i * 0.3, 6, 1.2, '#3a3536'); for (let k = 0; k < 4; k++) { S.ctx.fillStyle = tone('#f3c66a'); S.ctx.fillRect(fx + 110 + k * 28, 760 - h * 0.5 + 30, 14, 26); } }
    // 고가 철교와 증기 기관차
    sk.rect(-20, 760, W + 40, 34, { fill: '#6e625a', strokeWidth: 3 });
    for (let i = 0; i < 8; i++) { const ax = wrap(i * 300 - sc * 0.6); sk.path(`M${ax},1000 l0,-150 q110,-110 220,0 l0,150`, { strokeWidth: 4, fill: '#4a423c' }); }
    const tx = -500 + ((t * 420 + sc * 0.3) % (W + 1400));
    sil(ctx, () => { ctx.fillRect(tx, 690, 210, 62); ctx.fillRect(tx + 150, 650, 70, 50); ctx.fillRect(tx + 30, 650, 26, 46); for (let i = 1; i < 4; i++) { ctx.fillRect(tx - i * 230, 684, 210, 68); } for (let i = -3; i < 1; i++) for (const w of [40, 160]) { ctx.beginPath(); ctx.arc(tx + i * 230 + w, 754, 22, 0, 7); ctx.fill(); } });
    smoke(ctx, tx + 43, 650, t * 2, 6, 0.9, '#e9e2d0');
    ground(990, '#3d3832');
    for (let i = 0; i < 4; i++) { const lx = wrap(200 + i * 520 - sc); sk.line(lx, 1000, lx, 860, { strokeWidth: 6 }); sk.rect(lx - 16, 824, 32, 38, { fill: '#f3d27a' }); }
  } },
  { year: '1925년', rough: 0.9, sat: 0.82, draw(ctx, t, sc) { // 1920년대 — 초저녁 도시
    sky(ctx, '#2f3f6e', '#e59a6a');
    const r = rng(8);
    for (let i = 0; i < 12; i++) { const bx = wrap(i * 190 - sc * 0.25), h = 250 + r() * 380; building(bx, 900, 150, h, '#3b3f58', r, 0.4); if (r() < 0.5) { sk.rect(bx + 40, 900 - h - 70, 70, 70, { fill: '#3b3f58' }); sk.line(bx + 75, 900 - h - 70, bx + 75, 900 - h - 150, { strokeWidth: 3 }); } }
    const zx = wrap(1300 - sc * 0.1 - t * 40); sk.ellipse(zx, 210, 380, 100, { fill: '#b9b4a8', strokeWidth: 3 }); sk.rect(zx - 50, 256, 100, 26, { fill: '#6e625a' }); // 비행선
    const px = wrap(300 + t * 330 - sc * 0.2), py = 350 + Math.sin(t * 2) * 30; // 복엽기
    sil(ctx, () => { ctx.fillRect(px - 70, py - 26, 130, 9); ctx.fillRect(px - 70, py + 14, 130, 9); ctx.beginPath(); ctx.ellipse(px - 20, py, 100, 16, 0, 0, 7); ctx.fill(); ctx.fillRect(px - 126, py - 30, 12, 34); ctx.fillRect(px - 44, py - 22, 4, 40); ctx.fillRect(px + 30, py - 22, 4, 40); });
    for (let i = 0; i < 9; i++) { const bx = wrap(i * 260 - sc * 0.6), h = 150 + r() * 200; building(bx, 940, 210, h, '#57464a', r, 0.55); }
    ground(940, '#2b2a33');
    for (let i = 0; i < 3; i++) { const cx = wrap(i * 700 + t * 240 - sc); sil(ctx, () => { ctx.fillRect(cx, 960, 170, 44); ctx.fillRect(cx + 40, 918, 90, 46); ctx.beginPath(); ctx.arc(cx + 36, 1008, 24, 0, 7); ctx.arc(cx + 136, 1008, 24, 0, 7); ctx.fill(); }); S.ctx.fillStyle = tone('#f3d27a'); S.ctx.fillRect(cx + 166, 970, 14, 12); }
  } },
  { year: '1990년', rough: 0.6, sat: 0.95, draw(ctx, t, sc) { // 현대 — 네온이 켜지는 밤
    sky(ctx, '#161a3a', '#7a3f7a');
    const r = rng(15);
    for (let i = 0; i < 14; i++) { const bx = wrap(i * 160 - sc * 0.2), h = 300 + r() * 480; building(bx, 920, 130, h, '#232a4e', r, 0.5, '#9fd8ff'); }
    const ax = wrap(1800 - t * 300); sil(ctx, () => { ctx.beginPath(); ctx.ellipse(ax, 170, 90, 12, -0.08, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(ax + 10, 170); ctx.lineTo(ax + 60, 130); ctx.lineTo(ax + 76, 132); ctx.lineTo(ax + 44, 172); ctx.fill(); }); S.ctx.fillStyle = Math.sin(t * 20) > 0 ? '#ff4040' : '#fff'; S.ctx.fillRect(ax - 4, 176, 7, 7);
    for (let i = 0; i < 8; i++) { const bx = wrap(i * 290 - sc * 0.6), h = 200 + r() * 260; building(bx, 950, 230, h, '#2e2540', r, 0.6); const nc = ['#ff3d8b', '#00e5ff', '#ffd23d', '#00ff7f'][i % 4]; S.ctx.save(); S.ctx.shadowColor = nc; S.ctx.shadowBlur = 26; S.ctx.fillStyle = nc; S.ctx.fillRect(bx + 30, 950 - h + 40, 150, 26); S.ctx.restore(); }
    ground(950, '#17161f');
    for (let i = 0; i < 4; i++) { const cx = wrap(i * 560 + t * 520 - sc); sil(ctx, () => { ctx.beginPath(); ctx.roundRect(cx, 968, 200, 40, 14); ctx.fill(); ctx.beginPath(); ctx.roundRect(cx + 40, 938, 110, 40, 16); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 44, 1010, 20, 0, 7); ctx.arc(cx + 158, 1010, 20, 0, 7); ctx.fill(); }); S.ctx.fillStyle = '#fff3b0'; S.ctx.fillRect(cx + 192, 978, 12, 10); S.ctx.fillStyle = '#ff4040'; S.ctx.fillRect(cx - 2, 978, 8, 10); }
  } },
];
export const ERA_COUNT = ERAS.length;

function drawEra(ctx, i, t, sc) {
  const e = ERAS[i];
  beginSketch(ctx, t, { rough: e.rough, sat: e.sat, base: 20 + i, ink: tone('#1c1410') });
  S.sat = e.sat; S.ink = tone('#1c1410');
  e.draw(ctx, t, sc);
  // 연도 표기
  ctx.save(); ctx.font = 'italic 600 46px Georgia, "Times New Roman", serif'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(15,10,6,0.55)'; const tw = ctx.measureText(e.year).width; ctx.fillRect(70, 84, tw + 56, 72);
  ctx.fillStyle = '#f3e6c4'; ctx.fillText(e.year, 98, 136); ctx.restore();
  ctx.save(); ctx.globalAlpha = lerp(0.6, 0.12, i / 6); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(paperTexture(), 0, 0); ctx.restore();
}

export function travel(ctx, t, dur, A) {
  const N = ERAS.length, ed = dur / N, i = Math.min(N - 1, Math.floor(t / ed)), u = t / ed - i, TR = 0.3;
  drawEra(ctx, i, t, (u - 0.5) * ed * 280);
  let edge = null;
  if (u > 1 - TR && i < N - 1) { // 다음 시대가 바람결을 따라 밀려 들어온다
    const k = ease.io((u - (1 - TR)) / TR), bx = lerp(W + 260, -260, k);
    ctx.save(); ctx.beginPath(); ctx.moveTo(W + 10, -10);
    for (let y = -10; y <= H + 10; y += 40) ctx.lineTo(bx + Math.sin(y / 130 + t * 7) * 70 + noise(y / 60, i) * 40, y);
    ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.clip();
    drawEra(ctx, i + 1, t, (u - 1.5) * ed * 280); ctx.restore();
    edge = bx;
  }
  // 바람 줄기
  for (let k = 0; k < 6; k++) {
    const y0 = 160 + k * 150 + noise(t * 0.7, k) * 60, ph = t * 1.1 + k * 0.37;
    windLine(ctx, [[W + 100, y0], [1400, y0 + 60 * Math.sin(k + t)], [900, y0 - 70], [500, y0 + 50], [-100, y0 - 20]], ph, `rgba(255,252,240,${edge != null ? 0.75 : 0.42})`, edge != null ? 5 : 3);
  }
  // 종이
  const px = 960 + 400 * Math.sin(t * 0.85 + 0.4) + 60 * Math.sin(t * 3.1), py = 480 + 190 * Math.sin(t * 1.55 + 1) + 40 * Math.sin(t * 4.3);
  flyingPaper(ctx, A.old, px, py, lerp(300, 250, Math.sin(t * 1.2) * 0.5 + 0.5), 0.5 * Math.sin(t * 2.1) + 0.2 * Math.sin(t * 5.3), t * 3.6);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  vignette(ctx, lerp(0.6, 0.35, t / dur));
  const fin = prog(t, 0, 0.4), fout = prog(t, dur - 0.3, dur);
  if (fin < 1) { ctx.fillStyle = tone('#27344f', 1 - fin); ctx.fillRect(0, 0, W, H); }
  if (fout > 0) { ctx.fillStyle = `rgba(10,10,18,${fout})`; ctx.fillRect(0, 0, W, H); }
}
