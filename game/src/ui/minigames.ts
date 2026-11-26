// 미니게임 화면: 화면 위에 덮는 전용 창(캔버스)에서 돌리고, 끝나면 점수를 돌려준다.
// 규칙·보상은 core/minigames.ts, 여기는 조작과 그림만.
export type PlayKind = 'chop' | 'mine' | 'spike' | 'darts' | 'totem' | 'worship';
/** 기도 토템 디펜스 설정: 혼령 속도 배율·그림·토템이 스스로 쏘는 간격(0이면 안 쏨)·토템 그림 */
export interface TotemOpts { speed: number; art: string; bolt: number; totem: string }
export interface PlayResult { score: number; kills: number; survived: boolean; /** 중간에 그만둠 */ quit?: boolean }

import { canvases } from '../render/sprites';

const W = 360, H = 200;
/** 게임에서 쓰는 픽셀 그림을 그대로 그린다(아래 가운데 기준, 높이 h) */
function sprite(c: CanvasRenderingContext2D, key: string, x: number, bottom: number, h: number, flip = false) {
  const img = canvases.get(key);
  if (!img) return;
  const w = (img.width / img.height) * h;
  c.save(); c.translate(x, bottom - h); if (flip) c.scale(-1, 1); c.drawImage(img, -w / 2, 0, w, h); c.restore();
}
const C = { bg: '#2a2230', panel: '#3a3142', text: '#fff3d6', muted: '#c3b8cc', good: '#94e07f', ok: '#f2c14e', bad: '#ff9686', wood: '#b9824f', leaf: '#5fb859', rock: '#8d97a3', spike: '#e9e4f0', spirit: '#a5d8ff', totem: '#8a6a4a' };

export function runGame(kind: PlayKind, title: string, done: (r: PlayResult) => void, opts?: TotemOpts) {
  const wrap = document.createElement('div');
  wrap.className = 'mgwrap';
  wrap.innerHTML = `<div class="mgbox ui-win"><div class="mghead"><b>${title}</b><span class="mgscore"></span><button class="ui-btn sm" data-mg="quit">그만두기</button></div><canvas width="${W * 2}" height="${H * 2}"></canvas><div class="mghint ui-xs ui-muted"></div></div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas')!, ctx = cv.getContext('2d')!;
  ctx.scale(2, 2); ctx.imageSmoothingEnabled = false;
  const scoreEl = wrap.querySelector<HTMLElement>('.mgscore')!, hint = wrap.querySelector<HTMLElement>('.mghint')!;
  let alive = true, last = performance.now(), down = false, tapX = -1;
  const g = makeGame(kind, opts);
  hint.textContent = g.hint;
  const finish = (quit = false) => { if (!alive) return; alive = false; wrap.remove(); done({ ...g.result(), quit }); };
  // 그만두기는 한 번 더 눌러야 한다
  const qb = wrap.querySelector<HTMLButtonElement>('[data-mg="quit"]')!;
  let armed = false;
  qb.addEventListener('click', () => { if (!armed) { armed = true; qb.textContent = '정말 그만둘까요?'; qb.classList.add('danger'); setTimeout(() => { armed = false; qb.textContent = '그만두기'; qb.classList.remove('danger'); }, 2500); return; } finish(true); });
  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); down = true; const [x, y] = pos(e); tapX = x; g.press(x, y); });
  addEventListener('pointerup', () => { if (!down) return; down = false; g.release(); });
  const loop = (t: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.step(dt, down);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    g.draw(ctx);
    scoreEl.textContent = g.status();
    if (g.over()) { setTimeout(() => finish(), 900); g.step = () => {}; }
    requestAnimationFrame(loop);
  };
  void tapX;
  requestAnimationFrame(loop);
}

interface Game { hint: string; step(dt: number, held: boolean): void; press(x: number, y: number): void; release(): void; draw(c: CanvasRenderingContext2D): void; status(): string; over(): boolean; result(): PlayResult }

function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, col = C.text, size = 12, align: CanvasTextAlign = 'center') {
  c.fillStyle = col; c.font = `bold ${size}px sans-serif`; c.textAlign = align; c.fillText(s, x, y);
}

function makeGame(kind: PlayKind, opts?: TotemOpts): Game {
  if (kind === 'chop') return timingGame();
  if (kind === 'mine') return chargeGame();
  if (kind === 'spike') return spikeGame();
  if (kind === 'darts') return dartsGame();
  return totemGame(opts ?? { speed: 1, art: 'mob_glowbat', bolt: 0, totem: 'obj_totem' });
}

/** 벌목: 왼쪽·오른쪽을 오가는 표시를 초록 구간에서 멈춘다(10번, 점점 빠르고 좁아진다) */
function timingGame(): Game {
  let round = 0, score = 0, t = 0, zone = 0.5, width = 0.18, msg = '', msgT = 0, done = false, hitFx = 0;
  const pos = () => (Math.sin(t * (1.6 + round * 0.18)) + 1) / 2;
  const next = () => { round++; zone = 0.2 + Math.random() * 0.6; width = Math.max(0.07, 0.18 - round * 0.011); if (round >= 10) done = true; };
  return {
    hint: '아무 곳이나 누르면 도끼를 휘두릅니다.',
    step(dt) { t += dt; msgT -= dt; hitFx = Math.max(0, hitFx - dt * 3); },
    press() {
      if (done) return;
      const d = Math.abs(pos() - zone);
      const pts = d < width * 0.25 ? 10 : d < width / 2 ? 6 : 0;
      score += pts; msg = pts === 10 ? '완벽!' : pts ? '좋아요' : '빗나감'; msgT = 0.8; hitFx = pts ? 1 : 0; next();
    },
    release() {},
    draw(c) {
      // 나무
      c.fillStyle = '#3a4a3a'; c.fillRect(0, 150, W, 50);
      sprite(c, 'node_oak_trunk', 180 + hitFx * 3, 152, 90); sprite(c, 'node_oak_top', 180 + hitFx * 2, 92, 80);
      // 막대
      const x0 = 30, w = 300, y = 170;
      c.fillStyle = C.panel; c.fillRect(x0, y, w, 14);
      c.fillStyle = C.good; c.fillRect(x0 + (zone - width / 2) * w, y, width * w, 14);
      c.fillStyle = C.ok; c.fillRect(x0 + (zone - width / 8) * w, y, (width / 4) * w, 14);
      c.fillStyle = C.text; c.fillRect(x0 + pos() * w - 2, y - 4, 4, 22);
      if (msgT > 0) text(c, msg, 180, 26, msg === '빗나감' ? C.bad : C.ok, 16);
      if (done) text(c, `끝! ${score}점`, 180, 110, C.ok, 20);
    },
    status: () => `${Math.min(round + 1, 10)}/10 · ${score}점`,
    over: () => done,
    result: () => ({ score, kills: 0, survived: true }),
  };
}

/** 채광: 누르고 있으면 힘이 차오르고, 노란 구간에서 떼면 점수(10번) */
function chargeGame(): Game {
  let round = 0, score = 0, power = 0, holding = false, lo = 0.6, hi = 0.8, msg = '', msgT = 0, done = false, crack = 0;
  const next = () => { round++; const w = Math.max(0.08, 0.2 - round * 0.012); lo = 0.35 + Math.random() * (0.55 - w); hi = lo + w; if (round >= 10) done = true; };
  return {
    hint: '누르고 있다가 노란 구간에서 손을 떼세요. 끝까지 차면 다시 0부터.',
    step(dt, held) { msgT -= dt; if (holding && held) { power += dt * (0.7 + round * 0.06); if (power > 1) power = 0; } },
    press() { if (!done) { holding = true; power = 0; } },
    release() {
      if (!holding || done) return;
      holding = false;
      const mid = (lo + hi) / 2, inZone = power >= lo && power <= hi;
      const pts = inZone ? (Math.abs(power - mid) < (hi - lo) / 4 ? 10 : 6) : 0;
      score += pts; msg = pts === 10 ? '쾅! 완벽' : pts ? '좋아요' : '헛스윙'; msgT = 0.8; if (pts) crack++; power = 0; next();
    },
    draw(c) {
      // 바위(금이 갈수록 어두워짐)
      c.fillStyle = '#3a322a'; c.fillRect(0, 150, W, 50);
      sprite(c, crack >= 6 ? 'node_goldrock' : crack >= 3 ? 'node_bluerock' : 'node_redrock', 180, 155, 90);
      c.strokeStyle = '#3d4450'; c.lineWidth = 2; for (let i = 0; i < Math.min(crack, 8); i++) { c.beginPath(); c.moveTo(150 + i * 8, 60 + (i % 3) * 10); c.lineTo(160 + i * 7, 110 - (i % 2) * 15); c.stroke(); }
      // 힘 막대(세로)
      const x = 320, y0 = 30, h = 150;
      c.fillStyle = C.panel; c.fillRect(x, y0, 18, h);
      c.fillStyle = C.ok; c.fillRect(x, y0 + (1 - hi) * h, 18, (hi - lo) * h);
      c.fillStyle = C.good; c.fillRect(x + 4, y0 + (1 - power) * h, 10, power * h);
      if (msgT > 0) text(c, msg, 180, 26, msg === '헛스윙' ? C.bad : C.ok, 16);
      if (done) text(c, `끝! ${score}점`, 180, 180, C.ok, 20);
    },
    status: () => `${Math.min(round + 1, 10)}/10 · ${score}점`,
    over: () => done,
    result: () => ({ score, kills: 0, survived: true }),
  };
}

/** 함정 피하기: 세 줄 중 한 줄에 서서 떨어지는 가시를 피한다(40초, 점점 빨라진다). 점수 = 버틴 시간 + 피한 가시 */
function spikeGame(): Game {
  let lane = 1, t = 0, spikes: { lane: number; y: number }[] = [], spawn = 0, dodged = 0, hitT = 0, lives = 3, done = false;
  const lx = (l: number) => 90 + l * 90;
  return {
    hint: '화면 왼쪽·오른쪽을 눌러 옮겨 다니세요. 세 번 맞으면 끝.',
    step(dt) {
      if (done) return;
      t += dt; spawn -= dt; hitT -= dt;
      const speed = 90 + t * 4;
      if (spawn <= 0) { spawn = Math.max(0.35, 1 - t * 0.016); spikes.push({ lane: Math.floor(Math.random() * 3), y: -10 }); }
      for (const s of spikes) s.y += speed * dt;
      for (const s of spikes) if (s.y > 160 && s.y < 175 && s.lane === lane && hitT <= 0) { lives--; hitT = 0.8; s.y = 999; }
      const before = spikes.length;
      spikes = spikes.filter((s) => s.y < 200);
      dodged += before - spikes.length;
      if (lives <= 0 || t >= 40) done = true;
    },
    press(x) { if (!done) lane = Math.max(0, Math.min(2, lane + (x < W / 2 ? -1 : 1))); },
    release() {},
    draw(c) {
      for (let l = 0; l < 3; l++) { c.fillStyle = l === lane ? '#4a3f54' : C.panel; c.fillRect(lx(l) - 35, 0, 70, H); }
      c.fillStyle = C.spike;
      for (const s of spikes) { c.beginPath(); c.moveTo(lx(s.lane) - 10, s.y - 12); c.lineTo(lx(s.lane) + 10, s.y - 12); c.lineTo(lx(s.lane), s.y + 6); c.fill(); }
      c.fillStyle = hitT > 0 ? C.bad : C.text; c.beginPath(); c.arc(lx(lane), 175, 10, 0, Math.PI * 2); c.fill();
      text(c, '♥'.repeat(Math.max(0, lives)), 10, 16, C.bad, 14, 'left');
      if (done) text(c, `끝! ${Math.round(Math.min(100, t * 1.5 + dodged * 0.5))}점`, 180, 100, C.ok, 20);
    },
    status: () => `${Math.max(0, Math.ceil(40 - t))}초 · 피함 ${dodged}`,
    over: () => done,
    result: () => ({ score: Math.round(Math.min(100, t * 1.5 + dodged * 0.5)), kills: 0, survived: lives > 0 }),
  };
}

/** 토템 디펜스(기도): 다섯 웨이브. 혼령 종류가 여럿이고, 연속으로 잡으면 기도가 차서 '기도 폭발'로 화면의 혼령을 한꺼번에 없앤다.
 *  · 보통(한 번) · 갑옷(두 번) · 날쌘(빠름) · 쪼개짐(잡으면 둘로) · 황금(잡으면 하트 +1 또는 느려짐) · 마지막 웨이브의 큰 혼령(다섯 번)
 *  · 점수(혼령 수)는 종류마다 다르다: 갑옷 2, 큰 혼령 5 */
type SpKind = 'normal' | 'armor' | 'swift' | 'split' | 'gold' | 'boss' | 'mini';
function totemGame(o: TotemOpts): Game {
  const WAVES = 5, WAVE_T = 11, PAUSE = 1.2;
  let t = 0, spawn = 0, kills = 0, hp = 5, done = false, bolt = o.bolt, combo = 0, comboT = 0, holy = 0, slowT = 0, wave = 0, waveT = 0, banner = 1.4, bossOut = false;
  let fx: { x: number; y: number; t: number; col: string }[] = [], pops: { x: number; y: number; t: number; s: string }[] = [];
  const shots: { x0: number; y0: number; x: number; y: number; t: number }[] = [];
  let spirits: { x: number; y: number; dir: number; sp: number; kind: SpKind; hp: number; hit: number }[] = [];
  const HP: Record<SpKind, number> = { normal: 1, armor: 2, swift: 1, split: 1, gold: 1, boss: 5, mini: 1 };
  const PTS: Record<SpKind, number> = { normal: 1, armor: 2, swift: 1, split: 1, gold: 1, boss: 5, mini: 1 };
  const add = (kind: SpKind, x?: number, y?: number, dir?: number) => {
    const d = dir ?? (Math.random() < 0.5 ? 1 : -1);
    const base = (28 + wave * 7 + Math.random() * 12) * o.speed;
    const sp = kind === 'swift' ? base * 1.8 : kind === 'armor' ? base * 0.7 : kind === 'boss' ? base * 0.45 : kind === 'mini' ? base * 1.3 : base;
    spirits.push({ x: x ?? (d > 0 ? -10 : W + 10), y: y ?? 60 + Math.random() * 100, dir: d, sp, kind, hp: HP[kind], hit: 0 });
  };
  const kill = (i: number) => {
    const s = spirits[i];
    spirits.splice(i, 1);
    kills += PTS[s.kind]; combo++; comboT = 1.4; holy = Math.min(1, holy + 0.06 + (s.kind === 'boss' ? 0.3 : 0));
    fx.push({ x: s.x, y: s.y, t: 0.3, col: s.kind === 'gold' ? C.ok : C.good });
    if (s.kind === 'split') { add('mini', s.x, s.y - 8, s.dir); add('mini', s.x, s.y + 8, s.dir); }
    if (s.kind === 'gold') { if (hp < 5 && Math.random() < 0.5) { hp++; pops.push({ x: s.x, y: s.y, t: 1, s: '♥ +1' }); } else { slowT = 3; pops.push({ x: s.x, y: s.y, t: 1, s: '느려짐!' }); } }
    if (combo > 0 && combo % 10 === 0) pops.push({ x: s.x, y: s.y - 10, t: 1, s: `${combo} 연속!` });
  };
  const hitAt = (i: number) => { const s = spirits[i]; s.hp--; s.hit = 0.15; if (s.hp <= 0) kill(i); else fx.push({ x: s.x, y: s.y, t: 0.2, col: C.spirit }); };
  const pick = (): SpKind => {
    const r = Math.random();
    if (wave >= 1 && r < 0.05) return 'gold';
    if (wave >= 1 && r < 0.25) return 'armor';
    if (wave >= 2 && r < 0.42) return 'swift';
    if (wave >= 3 && r < 0.56) return 'split';
    return 'normal';
  };
  return {
    hint: '혼령을 눌러 없애세요(갑옷은 두 번). 연속으로 잡으면 아래 기도가 차고, 가득 차면 왼쪽 아래를 눌러 기도 폭발!',
    step(dt) {
      if (done) return;
      const k = slowT > 0 ? 0.45 : 1;
      slowT = Math.max(0, slowT - dt); banner = Math.max(0, banner - dt);
      t += dt; waveT += dt;
      if (waveT > WAVE_T) { wave++; waveT = -PAUSE; banner = 1.4; if (wave >= WAVES) { done = true; return; } }
      if (waveT > 0) {
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.4, 1.2 - wave * 0.12) / Math.sqrt(o.speed); add(pick()); }
        if (wave === WAVES - 1 && !bossOut && waveT > 2) { bossOut = true; add('boss', undefined, 110); }
      }
      if ((comboT -= dt) <= 0) combo = 0;
      for (const s of spirits) { s.x += s.dir * s.sp * dt * k; s.y += (120 - s.y) * dt * 0.3 * k; s.hit = Math.max(0, s.hit - dt); }
      for (const s of spirits) if (Math.abs(s.x - W / 2) < 16) { hp -= s.kind === 'boss' ? 2 : 1; s.x = 9999; combo = 0; }
      spirits = spirits.filter((s) => s.x > -20 && s.x < W + 20);
      // 토템이 스스로 쏜다: 가장 가까운 혼령
      if (o.bolt > 0 && (bolt -= dt) <= 0 && spirits.length) {
        bolt = o.bolt;
        let bi = 0; spirits.forEach((s, i) => { if (Math.abs(s.x - W / 2) < Math.abs(spirits[bi].x - W / 2)) bi = i; });
        const s = spirits[bi]; shots.push({ x0: W / 2, y0: 110, x: s.x, y: s.y, t: 0.2 }); hitAt(bi);
      }
      for (let i = shots.length - 1; i >= 0; i--) if ((shots[i].t -= dt) <= 0) shots.splice(i, 1);
      fx = fx.filter((f) => (f.t -= dt) > 0); pops = pops.filter((p) => (p.t -= dt) > 0);
      if (hp <= 0) done = true;
    },
    press(x, y) {
      if (done) return;
      // 기도 폭발 버튼(왼쪽 아래)
      if (x < 70 && y > 168 && holy >= 1) { holy = 0; for (let i = spirits.length - 1; i >= 0; i--) { spirits[i].hp = 1; kill(i); } pops.push({ x: W / 2, y: 80, t: 1.2, s: '기도 폭발!' }); return; }
      let best = -1, bd = 22;
      spirits.forEach((s, i) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd + (s.kind === 'boss' ? 14 : 0)) { bd = d; best = i; } });
      if (best >= 0) hitAt(best); else combo = 0;
    },
    release() {},
    draw(c) {
      c.fillStyle = '#3a4a3a'; c.fillRect(0, 170, W, 30);
      if (slowT > 0) { c.fillStyle = 'rgba(120,160,255,.12)'; c.fillRect(0, 0, W, 170); }
      sprite(c, o.totem, W / 2, 172, 84);
      c.strokeStyle = '#c8f0ff'; c.lineWidth = 2;
      for (const b of shots) { c.globalAlpha = b.t / 0.2; c.beginPath(); c.moveTo(b.x0, b.y0); c.lineTo(b.x, b.y); c.stroke(); }
      for (const s of spirits) {
        const sz = s.kind === 'boss' ? 46 : s.kind === 'mini' ? 14 : s.kind === 'swift' ? 18 : 24;
        c.globalAlpha = s.hit > 0 ? 0.5 : 0.92;
        sprite(c, o.art, s.x, s.y + sz / 2, sz, s.dir < 0);
        c.globalAlpha = 1;
        if (s.kind === 'armor' || s.kind === 'boss') { c.strokeStyle = s.kind === 'boss' ? C.bad : C.spirit; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, sz / 2 + 2, 0, Math.PI * 2); c.stroke(); if (s.hp > 1) text(c, String(s.hp), s.x, s.y - sz / 2 - 4, C.text, 10); }
        if (s.kind === 'gold') { c.strokeStyle = C.ok; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, sz / 2 + 2, 0, Math.PI * 2); c.stroke(); }
        if (s.kind === 'split') { c.fillStyle = C.ok; c.fillRect(s.x - 1, s.y - sz / 2 - 3, 2, 2); }
      }
      c.globalAlpha = 1;
      for (const f of fx) { c.strokeStyle = f.col; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 14 * (1 - f.t / 0.3) + 4, 0, Math.PI * 2); c.stroke(); }
      for (const p of pops) text(c, p.s, p.x, p.y - (1 - p.t) * 16, C.ok, 12);
      text(c, '♥'.repeat(Math.max(0, hp)), 10, 16, C.bad, 14, 'left');
      text(c, `웨이브 ${Math.min(WAVES, wave + 1)}/${WAVES}${combo >= 3 ? ` · ${combo} 연속` : ''}`, W - 8, 16, C.text, 11, 'right');
      // 기도 게이지와 폭발 버튼
      c.fillStyle = '#1a1420'; c.fillRect(6, 178, 60, 14); c.fillStyle = holy >= 1 ? C.ok : C.spirit; c.fillRect(7, 179, 58 * holy, 12);
      text(c, holy >= 1 ? '기도 폭발!' : '기도', 36, 189, holy >= 1 ? '#2a2230' : C.text, 9);
      if (banner > 0 && !done) text(c, wave === WAVES - 1 ? `마지막 웨이브! 큰 혼령이 온다` : `웨이브 ${wave + 1}`, W / 2, 50, C.ok, 16);
      if (done) text(c, hp > 0 ? `지켜냈다! 혼령 ${kills}` : `토템이 쓰러졌다… 혼령 ${kills}`, 180, 60, C.ok, 18);
    },
    status: () => `${Math.max(0, Math.ceil(WAVES * (WAVE_T + PAUSE) - t))}초 · 혼령 ${kills}`,
    over: () => done,
    result: () => ({ score: kills, kills, survived: hp > 0 }),
  };
}

/** 다트: 과녁 위를 8자로 흔들리는 조준점이 가운데에 올 때 누른다(10발, 점점 빨라진다) */
function dartsGame(): Game {
  let t = 0, shots = 0, score = 0, done = false, msg = '', msgT = 0;
  const hits: { x: number; y: number }[] = [];
  const CX = 180, CY = 100, R = 70;
  const aim = () => { const sp = 1.4 + shots * 0.15; return { x: CX + Math.sin(t * sp) * R * 0.95, y: CY + Math.sin(t * sp * 2) * R * 0.5 }; };
  return {
    hint: '조준점이 과녁 가운데에 왔을 때 누르세요. 가운데일수록 점수가 높습니다(10발).',
    step(dt) { if (done) return; t += dt; msgT = Math.max(0, msgT - dt); },
    press() {
      if (done) return;
      const a = aim(), d = Math.hypot(a.x - CX, a.y - CY), pts = d < 8 ? 10 : d < 20 ? 7 : d < 35 ? 4 : d < 55 ? 2 : 0;
      score += pts; shots++; hits.push(a); msg = pts >= 10 ? '한가운데!' : pts ? `+${pts}` : '빗나감'; msgT = 0.7;
      if (shots >= 10) done = true;
    },
    release() {},
    draw(c) {
      for (const [r, col] of [[R, '#e9e4f0'], [55, '#d9574a'], [35, '#e9e4f0'], [20, '#d9574a'], [8, '#f2c14e']] as const) { c.fillStyle = col; c.beginPath(); c.arc(CX, CY, r, 0, Math.PI * 2); c.fill(); }
      for (const h of hits) { c.fillStyle = '#2a2230'; c.fillRect(h.x - 1.5, h.y - 1.5, 3, 3); }
      if (!done) { const a = aim(); c.strokeStyle = '#2a8a3a'; c.lineWidth = 2; c.beginPath(); c.arc(a.x, a.y, 6, 0, Math.PI * 2); c.moveTo(a.x - 9, a.y); c.lineTo(a.x + 9, a.y); c.moveTo(a.x, a.y - 9); c.lineTo(a.x, a.y + 9); c.stroke(); }
      if (msgT > 0) text(c, msg, CX, 24, C.ok, 14);
      if (done) text(c, `끝! ${score}점`, CX, 190, C.ok, 16);
    },
    status: () => `${score}점 · ${Math.min(10, shots)}/10발`,
    over: () => done,
    result: () => ({ score, kills: 0, survived: true }),
  };
}
