// 장면 1 — 오래된 도서관의 비밀 사무실 (동화풍 스케치)
import { W, H, clamp, lerp, prog, ease, rng, noise, S, sk, tone, beginSketch, layer, person, paperTexture, vignette, paperSprite, PAPER_W, PAPER_H, drawLogoSketch, flyingPaper, windLine, canvas } from './core.js';

const P = { rough: 1.5, sat: 0.22 };
const WIN = { x: 1240, y: 190, w: 300, h: 450 };
const BOOKS = ['#7a3b2e', '#3f5a4a', '#8a6a3a', '#35405e', '#6b2f45', '#55503a', '#9a7b4f', '#2f4a55'];

function shelf(x, y, w, h, seed) {
  const r = rng(seed), rows = 5, rh = h / rows;
  sk.rect(x, y, w, h, { fill: '#3a2a1c', strokeWidth: 4 });
  for (let i = 0; i < rows; i++) {
    const by = y + (i + 1) * rh - 10;
    let bx = x + 14;
    while (bx < x + w - 40) {
      const bw = 18 + r() * 30, bh = rh * (0.5 + r() * 0.36);
      if (r() < 0.12) { bx += bw; continue; }
      if (r() < 0.1) { sk.poly([[bx, by], [bx + bh * 0.35, by - bh], [bx + bh * 0.35 + bw, by - bh + 6], [bx + bw, by]], { fill: BOOKS[(r() * 8) | 0] }); bx += bw + bh * 0.35; continue; }
      sk.rect(bx, by - bh, bw, bh, { fill: BOOKS[(r() * 8) | 0], strokeWidth: 1.8 });
      if (r() < 0.5) sk.line(bx + 3, by - bh * 0.75, bx + bw - 3, by - bh * 0.75, { strokeWidth: 1.2, stroke: '#d9c08a' });
      bx += bw + 1;
    }
    sk.line(x, by + 3, x + w, by + 3, { strokeWidth: 5 });
  }
}
function background(t) {
  return layer('officeBg', t, P, x => {
    x.fillStyle = tone('#5d4c3a'); x.fillRect(0, 0, W, H);
    // 벽 돌결
    const r = rng(5);
    for (let i = 0; i < 60; i++) { const bx = r() * W, by = 80 + r() * 740; sk.line(bx, by, bx + 60 + r() * 80, by, { strokeWidth: 1.2, stroke: '#3a2c1f' }); }
    // 바닥
    sk.rect(-10, 840, W + 20, 260, { fill: '#3b2c1e', strokeWidth: 3 });
    for (let i = 0; i < 9; i++) sk.line(i * 240 - 60, 1080, 300 + i * 165, 840, { strokeWidth: 1.5 });
    // 문틀
    sk.rect(76, 316, 268, 528, { fill: '#2a1d13', strokeWidth: 5 });
    // 창문(아치) — 밤하늘
    const { x: wx, y: wy, w, h } = WIN;
    sk.path(`M${wx - w / 2},${wy + h} L${wx - w / 2},${wy + 120} Q${wx - w / 2},${wy} ${wx},${wy - 20} Q${wx + w / 2},${wy} ${wx + w / 2},${wy + 120} L${wx + w / 2},${wy + h} Z`, { fill: '#27344f', strokeWidth: 7 });
    sk.circle(wx + 60, wy + 120, 74, { fill: '#f3e6b8', strokeWidth: 1.5 });
    for (let i = 0; i < 14; i++) sk.circle(wx - 130 + r() * 260, wy + 30 + r() * 300, 4 + r() * 4, { fill: '#f3e6b8', stroke: 'none' });
    sk.path(`M${wx - w / 2},${wy + h} Q${wx - 60},${wy + h - 90} ${wx + 10},${wy + h - 50} T${wx + w / 2},${wy + h - 70} L${wx + w / 2},${wy + h} Z`, { fill: '#1b2538', strokeWidth: 1.5 });
    sk.rect(wx - w / 2 - 24, wy + h, w + 48, 22, { fill: '#4a3826', strokeWidth: 3 });
    // 책장
    shelf(392, 110, 420, 732, 11);
    shelf(1500, 110, 400, 732, 23);
    // 천장 들보, 등불
    sk.rect(-10, -10, W + 20, 86, { fill: '#2a1d13', strokeWidth: 4 });
    for (let i = 0; i < 5; i++) sk.rect(180 + i * 420, 70, 46, 44, { fill: '#2a1d13' });
    // 바닥에 쌓인 책
    for (let i = 0; i < 5; i++) sk.rect(1390 + (i % 2) * 10, 800 - i * 26, 120 - i * 6, 26, { fill: BOOKS[i + 1] });
    for (let i = 0; i < 3; i++) sk.rect(420 + i * 8, 812 - i * 24, 110, 24, { fill: BOOKS[i + 4] });
    // 의자 등받이
    sk.rect(890, 520, 190, 300, { fill: '#33241a', strokeWidth: 4 });
  });
}
function desk(t) {
  return layer('officeDesk', t, P, () => {
    sk.poly([[640, 716], [1330, 716], [1400, 792], [570, 792]], { fill: '#6a4c30', strokeWidth: 4 });
    sk.rect(570, 792, 830, 300, { fill: '#4a3421', strokeWidth: 4 });
    sk.rect(610, 830, 330, 120, { strokeWidth: 2.5 }); sk.rect(1030, 830, 330, 120, { strokeWidth: 2.5 });
    sk.circle(775, 890, 20, { fill: '#b89454' }); sk.circle(1195, 890, 20, { fill: '#b89454' });
    // 잉크병, 책, 촛대
    sk.rect(1236, 690, 44, 44, { fill: '#1a1612' }); sk.rect(1246, 676, 24, 16, { fill: '#1a1612' });
    sk.rect(1100, 700, 110, 22, { fill: BOOKS[0] }); sk.rect(1110, 680, 96, 20, { fill: BOOKS[3] });
    sk.ellipse(720, 740, 90, 22, { fill: '#b89454' }); sk.rect(709, 650, 22, 88, { fill: '#efe4c4' });
  });
}
function flame(ctx, x, y, t, s = 1) {
  const f = 1 + noise(t * 9, 3) * 0.12;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 14 * s, 0, x, y - 14 * s, 150 * s * f);
  g.addColorStop(0, 'rgba(255,190,90,0.55)'); g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 220 * s, y - 240 * s, 440 * s, 440 * s);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffd98a'; ctx.strokeStyle = '#b5601c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - 14 * s, y - 14 * s, x - 6 * s + noise(t * 7, 1) * 5, y - 34 * s * f, x + noise(t * 6, 2) * 6, y - 46 * s * f);
  ctx.bezierCurveTo(x + 8 * s, y - 30 * s, x + 14 * s, y - 12 * s, x, y); ctx.fill(); ctx.stroke();
  ctx.restore();
}
let dark;
function darkness(ctx, t, lights, amount = 0.64) {
  dark ||= canvas(W / 2, H / 2);
  const d = dark.getContext('2d');
  d.setTransform(0.5, 0, 0, 0.5, 0, 0);
  d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
  d.fillStyle = `rgba(10,6,14,${amount})`; d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-out';
  for (const [x, y, r, a] of lights) {
    const g = d.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.5, `rgba(0,0,0,${a * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.drawImage(dark, 0, 0, W, H);
}

function wide(ctx, t, o) {
  ctx.drawImage(background(t), 0, 0);
  beginSketch(ctx, t, { ...P, base: 3 });
  const { x: wx, y: wy, w, h } = WIN;
  // 창문 살 / 열린 창
  if (o.wind <= 0) { sk.line(wx, wy - 10, wx, wy + h, { strokeWidth: 5 }); sk.line(wx - w / 2, wy + 230, wx + w / 2, wy + 230, { strokeWidth: 5 }); }
  else { sk.poly([[wx - w / 2, wy + 110], [wx - w / 2 - 70, wy + 70], [wx - w / 2 - 70, wy + h + 30], [wx - w / 2, wy + h]], { fill: '#6d7c8f', strokeWidth: 4 }); sk.poly([[wx + w / 2, wy + 110], [wx + w / 2 + 70, wy + 70], [wx + w / 2 + 70, wy + h + 30], [wx + w / 2, wy + h]], { fill: '#6d7c8f', strokeWidth: 4 }); }
  // 커튼
  for (const sgn of [-1, 1]) {
    const fl = o.wind * (40 + 30 * Math.sin(t * 9 + sgn)), ex = wx + sgn * (w / 2 + 40);
    sk.path(`M${ex - sgn * 10},${wy - 40} Q${ex - sgn * 70 - sgn * fl * 0.3},${wy + 200} ${ex - sgn * (40 + fl * 1.6)},${wy + h + 60 - fl * 0.5} L${ex + sgn * 34},${wy + h + 70} L${ex + sgn * 30},${wy - 40} Z`, { fill: '#6b2f35', strokeWidth: 3 });
  }
  sk.line(wx - w / 2 - 90, wy - 44, wx + w / 2 + 90, wy - 44, { strokeWidth: 7 });
  // 문 (열리면 복도 불빛)
  if (o.door > 0) {
    ctx.fillStyle = tone('#e3c98c'); ctx.fillRect(90, 330, 240, 510);
    sk.poly([[90, 330], [90 + 240 * (1 - o.door * 0.82), 330 + 34 * o.door], [90 + 240 * (1 - o.door * 0.82), 840 + 30 * o.door], [90, 840]], { fill: '#4a3421', strokeWidth: 4 });
  } else { sk.rect(90, 330, 240, 510, { fill: '#4a3421', strokeWidth: 3 }); sk.circle(300, 600, 18, { fill: '#b89454' }); }
  // 인물
  if (o.fig) person(ctx, { style: 'cloak', s: 1.25, y: 900, ...o.fig });
  ctx.drawImage(desk(t), 0, 0);
  beginSketch(ctx, t, { ...P, base: 5 });
  // 책상 위 종이
  if (o.paper) {
    ctx.save(); ctx.transform(1, 0, -0.35, 0.3, 980, 752);
    ctx.drawImage(paperSprite(o.paperLogo), -90, -112, 180, 228); ctx.restore();
  }
  flame(ctx, 720, 650, t);
  darkness(ctx, t, [[720, 640, 620 + noise(t * 8, 4) * 30, 1], [wx, wy + 200, 420, 0.75], ...(o.door > 0 ? [[210, 600, 480 * o.door, 0.9]] : [])]);
}

function closeup(ctx, t, A) {
  beginSketch(ctx, t, { ...P, base: 7 });
  ctx.drawImage(layer('officeTop', t, P, x => {
    x.fillStyle = tone('#6a4c30'); x.fillRect(0, 0, W, H);
    const r = rng(9);
    for (let i = 0; i < 7; i++) sk.line(-20, 60 + i * 170 + r() * 20, W + 20, 40 + i * 170 + r() * 30, { strokeWidth: 3, stroke: '#3a2816' });
    for (let i = 0; i < 70; i++) { const gx = r() * W, gy = r() * H; sk.curve([[gx, gy], [gx + 90, gy + r() * 10 - 5], [gx + 190, gy + r() * 14 - 7]], { strokeWidth: 1, stroke: '#4a341f' }); }
    // 촛대, 잉크병, 책
    sk.ellipse(250, 240, 230, 150, { fill: '#b89454', strokeWidth: 4 }); sk.ellipse(250, 222, 96, 60, { fill: '#efe4c4', strokeWidth: 3 });
    sk.ellipse(1650, 250, 170, 150, { fill: '#1a1612', strokeWidth: 4 }); sk.ellipse(1650, 240, 84, 70, { fill: '#0c0a10', strokeWidth: 3 });
    sk.poly([[1500, 760], [1930, 700], [1930, 1090], [1560, 1090]], { fill: BOOKS[0], strokeWidth: 4 }); sk.poly([[1540, 800], [1930, 745], [1930, 1090], [1590, 1090]], { strokeWidth: 2, stroke: '#d9c08a' });
    sk.poly([[-10, 780], [230, 800], [200, 1090], [-10, 1090]], { fill: BOOKS[3], strokeWidth: 4 });
  }), 0, 0);
  flame(ctx, 250, 215, t, 1.5);
  // 종이
  const slide = ease.out(prog(t, 3.0, 3.7)), rot = lerp(-0.5, -0.045, slide);
  const px = lerp(1500, 960, slide), py = lerp(1500, 560, slide);
  ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetX = 12; ctx.shadowOffsetY = 16;
  ctx.drawImage(paperSprite(null), -PAPER_W / 2, -PAPER_H / 2);
  ctx.shadowColor = 'transparent';
  const dp = prog(t, 5.0, 8.2), lp = drawLogoSketch(ctx, A.old, dp, 0, -8, 580, '#2a1a10');
  ctx.restore();
  const c = Math.cos(rot), s = Math.sin(rot);
  let tx = px + lp[0] * c - lp[1] * s, ty = py + lp[0] * s + lp[1] * c;
  // 깃펜: 등장 → 고민 → 그리기 → 들어올림
  const arrive = ease.out(prog(t, 3.5, 4.1)), pond = prog(t, 4.1, 5.0) * (1 - prog(t, 4.9, 5.1)), leave = ease.in(prog(t, 8.2, 8.6));
  const hov = [980 + Math.cos(t * 5) * 46, 520 + Math.sin(t * 5) * 30 + Math.max(0, Math.sin(t * 13)) * -14];
  const k = ease.io(prog(t, 4.9, 5.15));
  tx = lerp(hov[0], tx, k); ty = lerp(hov[1], ty, k);
  tx = lerp(1700, tx, arrive) + leave * 500; ty = lerp(1300, ty, arrive) + leave * 300;
  const lift = (1 - k) * 46 + leave * 80;
  if (lift > 1) { ctx.fillStyle = 'rgba(20,10,0,0.25)'; ctx.beginPath(); ctx.ellipse(tx + lift * 0.5, ty + lift * 0.2, 16, 7, 0, 0, 7); ctx.fill(); }
  quill(ctx, tx, ty - lift, 0.62 + noise(t * 6, 8) * 0.06 * k + pond * Math.sin(t * 5) * 0.08);
  // 고민 중 말줄임표
  if (pond > 0) { ctx.fillStyle = tone('#2a1a10'); for (let i = 0; i < 3; i++) if (prog(t, 4.15 + i * 0.22, 4.2 + i * 0.22) > 0) { ctx.beginPath(); ctx.arc(820 + i * 46, 330 - i * 26, 9 + i * 2, 0, 7); ctx.fill(); } }
  darkness(ctx, t, [[560, 420, 1250 + noise(t * 8, 4) * 40, 1]], 0.6);
}
export function quill(ctx, x, y, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  // 깃털
  ctx.fillStyle = '#f1e8d2'; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -120); ctx.bezierCurveTo(78, -190, 92, -380, 16, -520); ctx.bezierCurveTo(-52, -420, -66, -250, 0, -120); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 11; i++) { const yy = -150 - i * 32; ctx.beginPath(); ctx.moveTo(4, yy); ctx.lineTo(48 - i * 2, yy - 34); ctx.moveTo(4, yy); ctx.lineTo(-36 + i * 1.5, yy - 30); ctx.stroke(); }
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(2, -300, 14, -510); ctx.stroke();
  ctx.fillStyle = '#17110c'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -40); ctx.lineTo(8, -40); ctx.closePath(); ctx.fill();
  // 손과 소매 (검은 형태)
  ctx.fillStyle = '#0b0a0d';
  ctx.beginPath(); ctx.ellipse(18, -96, 70, 54, 0.3, 0, 7); ctx.fill();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-30 + i * 6, -74 - i * 30, 30, 17, -0.3, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(60, -140); ctx.lineTo(1500, 500); ctx.lineTo(1100, 1100); ctx.lineTo(10, -40); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function office(ctx, t, dur, A) {
  if (t < 3.0) { // A: 들어와서 앉는다
    const w = prog(t, 0.35, 2.3), sit = ease.io(prog(t, 2.3, 2.9));
    const z = 1.06 - 0.06 * ease.out(prog(t, 0, 3));
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    wide(ctx, t, { door: ease.out(prog(t, 0, 0.5)), wind: 0, fig: t > 0.3 ? { x: lerp(210, 985, ease.io(w)), face: 1, walk: w < 1 ? w * 16 : null, sit } : null });
    ctx.fillStyle = `rgba(0,0,0,${1 - prog(t, 0, 0.7)})`; ctx.fillRect(-100, -100, W + 200, H + 200);
  } else if (t < 8.6) { // B: 책상 클로즈업 — 기존 로고를 그린다
    const z = 1 + 0.05 * prog(t, 3, 8.6);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    closeup(ctx, t, A);
  } else { // C: 급히 나가고, 바람이 종이를 창밖으로
    const out = prog(t, 9.0, 9.9), wind = ease.io(prog(t, 9.7, 10.2));
    const fly = prog(t, 10.2, 11.35), zoom = ease.in(prog(t, 10.5, dur));
    const z = 1 + zoom * 4.2;
    ctx.translate(WIN.x, WIN.y + 190); ctx.scale(z, z); ctx.translate(-WIN.x, -WIN.y - 190);
    wide(ctx, t, {
      door: 1, wind, paper: fly <= 0, paperLogo: A.old,
      fig: out < 1 ? { x: lerp(985, 150, ease.in(out)), face: -1, walk: out > 0 ? out * 14 : null, sit: 1 - ease.out(prog(t, 8.85, 9.1)), head: { dx: -10 * prog(t, 8.6, 8.8) } } : null,
    });
    // 문 두드리는 표시
    if (t < 9.1) { beginSketch(ctx, t, { ...P, base: 9 }); const a = prog(t, 8.62, 8.7); if (a > 0) for (let i = 0; i < 3; i++) sk.line(360 + i * 6, 520 + i * 44, 420 + i * 10, 500 + i * 50, { stroke: '#f3e6b8', strokeWidth: 5 }); }
    // 바람
    if (wind > 0) for (let i = 0; i < 5; i++) {
      windLine(ctx, [[WIN.x + 120 - i * 50, WIN.y + 120 + i * 60], [900 - i * 30, 420 + i * 50], [760, 640 + i * 20], [900 + i * 30, 760], [1080, 640 - i * 20], [WIN.x - 60 + i * 30, WIN.y + 240]], t * 0.9 + i * 0.23, `rgba(255,250,235,${0.55 * wind})`, 3.5);
    }
    if (fly > 0) {
      const e = ease.io(fly), bx = lerp(980, WIN.x + 10, e) + Math.sin(e * 7) * 70 * (1 - e), by = lerp(752, WIN.y + 215, e) - Math.sin(e * Math.PI) * 190;
      flyingPaper(ctx, A.old, bx, by, lerp(200, 70, e), Math.sin(e * 9) * 0.6, e * 11);
    }
    // 창밖 하늘로 빨려 들어가며 다음 장면으로
    const fade = prog(t, dur - 0.45, dur);
    if (fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = tone('#27344f', fade); ctx.fillRect(0, 0, W, H); }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(paperTexture(), 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  vignette(ctx, 0.7);
}
