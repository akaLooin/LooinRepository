// 렌더러: 헤드리스 크로미움으로 프레임을 뽑아 ffmpeg으로 mp4를 만든다
//   node render.mjs                전체 렌더 → out/teaser.mp4
//   node render.mjs --serve        미리보기 서버 (http://localhost:4173)
//   node render.mjs --shots 1,5.5  특정 시각의 정지 프레임 → out/shots/
//   옵션: --fps 30 --workers 4 --from 0 --to 60 --frames <dir> --audio out/audio.wav
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
const PORT = +arg('port', 4173);
await new Promise(r => server.listen(PORT, r));
const URL_ = `http://localhost:${PORT}/index.html?headless=1`;

if (arg('serve')) { console.log(`미리보기: http://localhost:${PORT}/`); await new Promise(() => {}); }

let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page error]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(URL_);
  await page.waitForFunction(() => window.renderAt && window.DURATION, null, { timeout: 600000 });
  return page;
}
async function grab(page, t, file, type = 'jpeg') {
  const url = await page.evaluate(async ([t, type]) => {
    await window.renderAt(t);
    return document.getElementById('stage').toDataURL('image/' + type, 0.94);
  }, [t, type]);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}

const shots = arg('shots');
if (shots) {
  const dir = path.join(ROOT, 'out/shots'); fs.mkdirSync(dir, { recursive: true });
  const page = await openPage();
  const dur = await page.evaluate(() => window.DURATION);
  console.log('duration', dur, JSON.stringify(await page.evaluate(() => window.sceneStarts)));
  const files = [];
  for (const s of String(shots).split(',')) {
    const f = path.join(dir, `t${(+s).toFixed(2).padStart(6, '0')}.jpg`);
    await grab(page, +s, f); files.push(f);
  }
  if (arg('sheet') && files.length > 1) { // 한 장으로 모아 보기
    const cols = +arg('cols', 3), rows = Math.ceil(files.length / cols);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex',
      `${files.map((_, i) => `[${i}:v]scale=640:360[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 640}_${Math.floor(i / cols) * 360}`).join('|')}:fill=black`,
      path.join(dir, 'sheet.jpg')], { stdio: 'inherit' });
    void rows;
  }
  await browser.close(); server.close(); process.exit(0);
}

// ---------- 전체 렌더 ----------
const FPS = +arg('fps', 30), NW = +arg('workers', 4);
const frames = path.resolve(arg('frames', path.join(ROOT, 'out/frames')));
fs.mkdirSync(frames, { recursive: true });
const p0 = await openPage();
const DUR = await p0.evaluate(() => window.DURATION);
const f0 = Math.floor(+arg('from', 0) * FPS), f1 = Math.min(Math.ceil(DUR * FPS), Math.ceil(+arg('to', DUR) * FPS));
let next = f0, done = 0; const total = f1 - f0, started = Date.now();
const pages = [p0, ...(await Promise.all(Array.from({ length: NW - 1 }, openPage)))];
await Promise.all(pages.map(async page => {
  while (next < f1) {
    const i = next++;
    await grab(page, i / FPS, path.join(frames, `f${String(i).padStart(5, '0')}.jpg`));
    if (++done % 60 === 0) console.log(`${done}/${total} 프레임 (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
}));
await browser.close(); server.close();
if (arg('from') === undefined && arg('to') === undefined || arg('encode')) {
  const out = path.resolve(arg('out', path.join(ROOT, 'out/teaser.mp4')));
  const audio = arg('audio', path.join(ROOT, 'out/audio.wav'));
  const hasA = fs.existsSync(audio);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-start_number', String(f0), '-i', path.join(frames, 'f%05d.jpg'),
    ...(hasA ? ['-i', audio] : []), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ...(hasA ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), out], { stdio: 'inherit' });
  console.log(r.status === 0 ? `완료: ${out}` : 'ffmpeg 실패');
}
