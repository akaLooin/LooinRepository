// 타임라인: 장면을 순서대로 이어 붙이고 시각 t(초)의 프레임을 그린다
import { W, H, loadLogo } from './core.js';
import { office } from './scene_office.js';
import { travel } from './scene_travel.js';
import { alley, phone, scan } from './scene_alley.js';
import { logo3d, init3d } from './scene_3d.js';

const SCENES = [
  ['office', 11.6, office],   // 도서관 비밀 사무실: 기존 로고를 그린다
  ['travel', 11.2, travel],   // 종이가 시대를 여행한다
  ['alley', 13.2, alley],     // 2010년대 골목: 그래피티 → 2026 로고
  ['phone', 4.6, phone],      // 휴대폰 클로즈업 → 찰칵
  ['scan', 4.6, scan],        // 디지털 스캔 → 글리치 → 점멸
  ['logo3d', 13.6, logo3d],   // 3D 단순 로고 → 2D → 글리치 → 끝
];
export const DURATION = SCENES.reduce((a, s) => a + s[1], 0);

const cv = document.getElementById('stage'), ctx = cv.getContext('2d');
const A = {};
let ready = (async () => {
  [A.old, A.neo, A.simple] = await Promise.all([
    loadLogo('./assets/logo-old.svg'), loadLogo('./assets/logo-2026.svg'), loadLogo('./assets/logo-2026-simple.svg'),
  ]);
  await init3d(A);
})();

export async function renderAt(t) {
  await ready;
  t = Math.max(0, Math.min(DURATION - 1e-4, t));
  let t0 = 0;
  for (const [name, dur, fn] of SCENES) {
    if (t < t0 + dur) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
      ctx.clearRect(0, 0, W, H);
      ctx.save(); fn(ctx, t - t0, dur, A); ctx.restore();
      return name;
    }
    t0 += dur;
  }
}
window.renderAt = renderAt; window.DURATION = DURATION;
window.sceneStarts = (() => { let t = 0; return SCENES.map(s => { const r = [s[0], t]; t += s[1]; return r; }); })();

// 미리보기: ?t=12.3 은 정지 프레임, 없으면 실시간 재생(스페이스: 일시정지, ←/→: 이동)
const q = new URLSearchParams(location.search);
if (q.has('t')) renderAt(parseFloat(q.get('t'))).then(() => (window.__done = true));
else if (!q.has('headless')) {
  document.body.classList.add('fit');
  const hud = document.getElementById('hud');
  let t = parseFloat(q.get('from') || 0), last = performance.now(), play = true, busy = false;
  addEventListener('keydown', e => {
    if (e.key === ' ') play = !play;
    if (e.key === 'ArrowRight') t += 1;
    if (e.key === 'ArrowLeft') t -= 1;
  });
  const loop = async now => {
    if (play) t += (now - last) / 1000;
    last = now;
    if (t >= DURATION) t = 0;
    if (!busy) { busy = true; const n = await renderAt(t); hud.textContent = `${t.toFixed(2)}s / ${DURATION.toFixed(1)}s  [${n}]`; busy = false; }
    requestAnimationFrame(loop);
  };
  ready.then(() => requestAnimationFrame(loop));
}
