// 지도 창: 1월드를 위에서 내려다본 지형 지도(SVG). 지역마다 땅 모양·색·작은 그림, 길로 이어진다.
// 지역을 누르면 테두리만 빛나고(창 크기는 그대로), 아래 고정된 줄에 이동 정보가 나온다.

export interface MapRegion {
  id: string; name: string;
  /** 'open' 갈 수 있음 · 'here' 현재 위치 · 'locked' 아직 모름 · 'unmet' 열렸지만 처치 목표가 남음 · 'mark' 누를 수 없는 장소(보스 둥지 등) */
  state: 'open' | 'here' | 'locked' | 'unmet' | 'mark';
  sel: boolean;
  sub: string;
}

type Theme = 'snowtown' | 'snowfield' | 'pinewood' | 'frostlake' | 'icecave' | 'glacier' | 'aurora' | 'frostpeak' | 'oasis' | 'dunes' | 'canyon' | 'mirage' | 'tomb' | 'saltlake' | 'starfield' | 'sunspire' | 'gate' | 'town' | 'meadow' | 'hills' | 'forest' | 'swamp' | 'cave' | 'ridge' | 'ruins' | 'grove' | 'mine' | 'arena' | 'lair';
interface Spot { x: number; y: number; r: number; theme: Theme }
/** 지역 위치(가로 420 × 세로 230 좌표) */
export const SPOTS: Record<string, Spot> = {
  town: { x: 48, y: 172, r: 30, theme: 'town' },
  meadow: { x: 112, y: 120, r: 32, theme: 'meadow' },
  arena: { x: 70, y: 52, r: 20, theme: 'arena' },
  hills: { x: 176, y: 168, r: 30, theme: 'hills' },
  mine1: { x: 228, y: 192, r: 17, theme: 'mine' },
  mine2: { x: 268, y: 200, r: 15, theme: 'mine' },
  forest: { x: 196, y: 92, r: 34, theme: 'forest' },
  lair: { x: 158, y: 30, r: 18, theme: 'lair' },
  swamp: { x: 262, y: 128, r: 30, theme: 'swamp' },
  cave: { x: 318, y: 178, r: 26, theme: 'cave' },
  ridge: { x: 364, y: 126, r: 28, theme: 'ridge' },
  ruins: { x: 318, y: 62, r: 28, theme: 'ruins' },
  grove: { x: 380, y: 52, r: 24, theme: 'grove' },
  gate: { x: 404, y: 108, r: 12, theme: 'gate' },
  // 2월드: 노을 사막(서쪽 세계의 문 → 오아시스 → 동쪽 해탑)
  gate1: { x: 22, y: 92, r: 12, theme: 'gate' },
  oasis: { x: 62, y: 160, r: 30, theme: 'oasis' },
  dunes: { x: 128, y: 112, r: 32, theme: 'dunes' },
  canyon: { x: 186, y: 172, r: 30, theme: 'canyon' },
  mirage: { x: 222, y: 92, r: 30, theme: 'mirage' },
  tomb: { x: 282, y: 160, r: 28, theme: 'tomb' },
  saltlake: { x: 300, y: 70, r: 28, theme: 'saltlake' },
  starfield: { x: 360, y: 150, r: 28, theme: 'starfield' },
  sunspire: { x: 384, y: 66, r: 24, theme: 'sunspire' },
  sandlair: { x: 384, y: 20, r: 14, theme: 'sunspire' },
  gate3: { x: 406, y: 112, r: 12, theme: 'gate' },
  // 3월드: 서리 고원(남쪽 세계의 문 → 눈꽃 마을 → 북동쪽 봉우리)
  gate2: { x: 24, y: 196, r: 12, theme: 'gate' },
  snowtown: { x: 66, y: 150, r: 30, theme: 'snowtown' },
  snowfield: { x: 126, y: 96, r: 30, theme: 'snowfield' },
  pinewood: { x: 176, y: 170, r: 30, theme: 'pinewood' },
  frostlake: { x: 232, y: 106, r: 30, theme: 'frostlake' },
  icecave: { x: 286, y: 176, r: 26, theme: 'icecave' },
  glacier: { x: 316, y: 100, r: 26, theme: 'glacier' },
  aurora: { x: 370, y: 162, r: 26, theme: 'aurora' },
  frostpeak: { x: 380, y: 72, r: 24, theme: 'frostpeak' },
  frostlair: { x: 344, y: 26, r: 14, theme: 'frostpeak' },
};
export const ROADS: [string, string][] = [
  ['town', 'meadow'], ['meadow', 'arena'], ['meadow', 'hills'], ['hills', 'mine1'], ['mine1', 'mine2'], ['hills', 'forest'],
  ['forest', 'lair'], ['forest', 'swamp'], ['swamp', 'cave'], ['cave', 'ridge'], ['ridge', 'ruins'], ['ruins', 'grove'], ['grove', 'gate'],
  ['gate1', 'oasis'], ['oasis', 'dunes'], ['dunes', 'canyon'], ['canyon', 'mirage'], ['mirage', 'tomb'], ['tomb', 'saltlake'], ['saltlake', 'starfield'], ['starfield', 'sunspire'], ['sunspire', 'sandlair'], ['sunspire', 'gate3'],
  ['gate2', 'snowtown'], ['snowtown', 'snowfield'], ['snowfield', 'pinewood'], ['pinewood', 'frostlake'], ['frostlake', 'icecave'], ['icecave', 'glacier'], ['glacier', 'aurora'], ['aurora', 'frostpeak'], ['frostpeak', 'frostlair'],
];

const FILL: Record<Theme, [string, string]> = {
  town: ['#d9be82', '#b89a5c'], meadow: ['#93d46c', '#6cae4c'], arena: ['#e0b064', '#b8863c'], hills: ['#c2a874', '#97804e'],
  mine: ['#8a7866', '#5e4e40'], forest: ['#4f9a52', '#2f6c38'], lair: ['#3a7440', '#22502a'], swamp: ['#6f8a62', '#4c6444'],
  cave: ['#6c6274', '#463e50'], ridge: ['#b6c6d4', '#8496a8'], ruins: ['#b4a486', '#857458'], grove: ['#5a6cb4', '#3a4884'], gate: ['#d8c088', '#8a6a3a'],
  oasis: ['#9ad06a', '#6aa84a'], dunes: ['#f2d896', '#c8a462'], canyon: ['#d8784a', '#9a4a2a'], mirage: ['#f8e8c0', '#d0b070'],
  tomb: ['#c8a870', '#8a6e46'], saltlake: ['#f0f6fa', '#a8c0d0'], starfield: ['#5a4a8a', '#342a5a'], sunspire: ['#f2b450', '#a8742a'],
  snowtown: ['#eef4fa', '#a8bcd0'], snowfield: ['#ffffff', '#b8cce0'], pinewood: ['#cfe0ea', '#5a8a7a'], frostlake: ['#bfe4f6', '#6aa8cc'],
  icecave: ['#6a8ab8', '#3a5a88'], glacier: ['#d8ecfa', '#7aa4cc'], aurora: ['#3a4a7a', '#1e2a50'], frostpeak: ['#e4ecf6', '#8a9cb8'],
};

/** 정해진 씨앗으로 흔들린 둥근 땅 모양 */
function blob(cx: number, cy: number, r: number, seed: number, flat = 0.78): string {
  const n = 11, pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.82 + 0.22 * Math.abs(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453 % 1);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * flat]);
  }
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2].map((v) => v.toFixed(1)).join(' ');
  let d = `M${mid(pts[n - 1], pts[0])}`;
  for (let i = 0; i < n; i++) d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mid(pts[i], pts[(i + 1) % n])}`;
  return d + 'Z';
}

// 작은 그림들(지역 성격이 보이도록)
const tree = (x: number, y: number, c = '#2a6a30') => `<rect x="${x - 0.8}" y="${y}" width="1.6" height="3" fill="#6a4a2a"/><circle cx="${x}" cy="${y - 1}" r="3.4" fill="${c}"/><circle cx="${x - 1}" cy="${y - 2}" r="1.2" fill="#ffffff" opacity=".18"/>`;
const rock = (x: number, y: number, c = '#8c8070') => `<path d="M${x - 3.5} ${y + 2} L${x - 2} ${y - 2} L${x + 1.5} ${y - 3} L${x + 3.5} ${y + 2}Z" fill="${c}" stroke="#4a4038" stroke-width=".5"/>`;
const house = (x: number, y: number, roof = '#c8503c') => `<rect x="${x - 3}" y="${y - 2}" width="6" height="5" fill="#f2e2bc" stroke="#6a4a2a" stroke-width=".5"/><path d="M${x - 4} ${y - 2} L${x} ${y - 6} L${x + 4} ${y - 2}Z" fill="${roof}"/>`;
const pond = (x: number, y: number, rx = 6, ry = 3) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#7fb8c8" stroke="#4e8898" stroke-width=".5"/>`;
const peak = (x: number, y: number, s = 1) => `<path d="M${x - 7 * s} ${y + 4 * s} L${x} ${y - 7 * s} L${x + 7 * s} ${y + 4 * s}Z" fill="#8a9cb0"/><path d="M${x - 2.6 * s} ${y - 3 * s} L${x} ${y - 7 * s} L${x + 2.6 * s} ${y - 3 * s}Z" fill="#ffffff"/>`;
const pillar = (x: number, y: number, h = 7) => `<rect x="${x - 1.3}" y="${y - h}" width="2.6" height="${h}" fill="#e2d6b8" stroke="#7a6a4c" stroke-width=".4"/>`;
const arch = (x: number, y: number) => `<path d="M${x - 5} ${y + 3} L${x - 5} ${y - 1} Q${x} ${y - 6} ${x + 5} ${y - 1} L${x + 5} ${y + 3}Z" fill="#2a2228"/><path d="M${x - 6} ${y + 3} L${x - 6} ${y - 1} Q${x} ${y - 8} ${x + 6} ${y - 1} L${x + 6} ${y + 3}" fill="none" stroke="#a89888" stroke-width="1"/>`;
const pine = (x: number, y: number) => `<path d="M${x} ${y - 6} L${x + 3.4} ${y + 2} L${x - 3.4} ${y + 2}Z" fill="#2e6a4a"/><path d="M${x} ${y - 6} L${x + 1.4} ${y - 3} L${x - 1.4} ${y - 3}Z" fill="#ffffff"/><rect x="${x - 0.6}" y="${y + 2}" width="1.2" height="1.6" fill="#6a4a2a"/>`;
const flower = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="1" fill="${c}"/>`;

function deco(s: Spot): string {
  const { x, y, theme } = s;
  switch (theme) {
    case 'town': return house(x - 9, y - 2) + house(x + 4, y - 7, '#3c78c8') + house(x + 8, y + 5, '#d89a3c') + `<circle cx="${x - 2}" cy="${y + 6}" r="1.6" fill="#ff9a3c"/>` + tree(x - 18, y + 6);
    case 'meadow': return [[-12, -6, '#fff'], [6, -10, '#ffd34a'], [14, 4, '#ff8ab0'], [-4, 8, '#fff'], [-18, 6, '#ffd34a'], [2, 0, '#ff8ab0']].map(([a, b, c]) => flower(x + +a, y + +b, c as string)).join('') + tree(x + 18, y - 6, '#3e8a3a');
    case 'arena': return `<ellipse cx="${x}" cy="${y}" rx="11" ry="7" fill="#c89048" stroke="#7a5428" stroke-width="1"/><ellipse cx="${x}" cy="${y}" rx="6.5" ry="3.6" fill="#e8cc8c"/>`;
    case 'hills': return rock(x - 10, y - 4) + rock(x + 6, y - 8) + rock(x + 12, y + 6) + rock(x - 2, y + 6, '#a49478');
    case 'mine': return arch(x, y - 1);
    case 'forest': return [[-16, -4], [-6, -12], [6, -8], [16, -2], [-10, 6], [2, 4], [12, 10], [-20, 8]].map(([a, b]) => tree(x + a, y + b)).join('');
    case 'lair': return tree(x - 8, y, '#1e4a24') + tree(x + 8, y + 1, '#1e4a24') + `<circle cx="${x}" cy="${y - 1}" r="4" fill="#5cc85a" stroke="#1e4a24" stroke-width=".8"/><path d="M${x - 3} ${y - 4} l1.5 -3 l1.5 2 l1.5 -2.5 l1.5 2 l1.5 -2 l.5 3.5Z" fill="#f6c945"/>`;
    case 'swamp': return pond(x - 8, y - 4, 8, 3.5) + pond(x + 10, y + 6, 6, 2.6) + tree(x + 14, y - 8, '#3e5a3a') + `<path d="M${x - 2} ${y + 8} v-5 M${x} ${y + 8} v-6 M${x + 2} ${y + 8} v-4" stroke="#8aa060" stroke-width=".8"/>`;
    case 'cave': return arch(x - 4, y) + rock(x + 12, y + 4, '#7c7088') + rock(x - 14, y + 6, '#7c7088');
    case 'ridge': return peak(x - 8, y - 2, 1.1) + peak(x + 9, y + 3, 0.9) + `<path d="M${x - 16} ${y + 10} q4 -2 8 0 t8 0" stroke="#ffffff" stroke-width=".7" fill="none" opacity=".8"/>`;
    case 'ruins': return pillar(x - 10, y + 4) + pillar(x - 4, y + 2, 9) + pillar(x + 8, y + 5, 5) + `<rect x="${x - 12}" y="${y + 4}" width="24" height="2" fill="#cabc9a"/>` + rock(x + 14, y - 6, '#a49478');
    case 'gate': return `<path d="M${x - 6} ${y + 5} L${x - 6} ${y - 3} Q${x} ${y - 10} ${x + 6} ${y - 3} L${x + 6} ${y + 5}Z" fill="#f6c945" stroke="#6a4a1a" stroke-width="1"/><path d="M${x - 3} ${y + 5} L${x - 3} ${y - 2} Q${x} ${y - 6} ${x + 3} ${y - 2} L${x + 3} ${y + 5}Z" fill="#ffe9a8"/>`;
    case 'oasis': return pond(x - 2, y + 2, 9, 4) + tree(x - 14, y - 4, '#3a9a4a') + tree(x + 12, y - 6, '#3a9a4a') + `<path d="M${x + 4} ${y - 2} l5 -6 l5 6Z" fill="#e8dcc0" stroke="#8a6a3a" stroke-width=".5"/><path d="M${x - 10} ${y + 10} l4 -5 l4 5Z" fill="#e0a83a" stroke="#8a6a3a" stroke-width=".5"/>`;
    case 'dunes': return [[-12, -4], [4, -10], [8, 6], [-6, 8]].map(([a, b]) => `<path d="M${x + a - 7} ${y + b + 2} q7 -7 14 0" fill="#e2c482" stroke="#b8945a" stroke-width=".6"/>`).join('') + `<rect x="${x + 16}" y="${y - 6}" width="2" height="7" fill="#4a9a3a"/><rect x="${x + 14}" y="${y - 4}" width="2" height="3" fill="#4a9a3a"/>`;
    case 'canyon': return `<path d="M${x - 16} ${y + 6} l3 -12 h8 l2 12Z" fill="#b85a3a"/><path d="M${x + 2} ${y + 8} l2 -16 h9 l3 16Z" fill="#a84a2a"/><path d="M${x - 12} ${y - 6} h7" stroke="#f0a07a" stroke-width="1"/>`;
    case 'mirage': return `<path d="M${x - 14} ${y - 4} q4 -2 8 0 t8 0 t8 0" stroke="#ffffff" stroke-width=".8" fill="none" opacity=".8"/><path d="M${x - 10} ${y + 4} q4 -2 8 0 t8 0" stroke="#ffffff" stroke-width=".8" fill="none" opacity=".6"/>` + pond(x + 6, y + 10, 6, 2) + `<circle cx="${x - 8}" cy="${y - 12}" r="3" fill="#fff0a8"/>`;
    case 'tomb': return `<path d="M${x - 12} ${y + 6} L${x} ${y - 12} L${x + 12} ${y + 6}Z" fill="#d8b878" stroke="#8a6e46" stroke-width=".6"/><path d="M${x} ${y - 12} L${x + 12} ${y + 6} L${x + 4} ${y + 6}Z" fill="#b8955a"/><rect x="${x - 2}" y="${y}" width="4" height="6" fill="#4a3a2a"/>`;
    case 'saltlake': return `<ellipse cx="${x}" cy="${y}" rx="15" ry="6" fill="#d8eef8" stroke="#a8c0d0" stroke-width=".6"/>` + [[-8, -1], [4, 2], [10, -3]].map(([a, b]) => `<rect x="${x + a}" y="${y + b - 2}" width="2" height="3" fill="#ffffff"/>`).join('');
    case 'starfield': return [[-10, -6], [6, -10], [12, 4], [-4, 6], [0, -2], [-14, 4]].map(([a, b], k) => `<circle cx="${x + a}" cy="${y + b}" r="${k % 2 ? 1 : 1.4}" fill="#fff6c8"/>`).join('') + `<path d="M${x - 16} ${y + 10} q8 -5 16 0 t16 0" fill="#d8b888"/>`;
    case 'sunspire': return `<rect x="${x - 4}" y="${y - 14}" width="8" height="20" fill="#e8c47a" stroke="#8a6a3a" stroke-width=".6"/><path d="M${x - 6} ${y - 14} l6 -6 l6 6Z" fill="#f2a83a"/><circle cx="${x}" cy="${y - 8}" r="1.6" fill="#ff7a2a"/>` + pillar(x - 12, y + 6, 6) + pillar(x + 12, y + 6, 5);
    case 'snowtown': return house(x - 9, y - 2, '#e8f2fc') + house(x + 5, y - 7, '#4e8de2') + house(x + 8, y + 5, '#e25d4e') + `<circle cx="${x - 2}" cy="${y + 6}" r="1.6" fill="#ff9a3c"/>` + pine(x - 18, y + 4);
    case 'snowfield': return [[-12, -4], [6, -8], [12, 6], [-4, 8]].map(([a, b]) => `<ellipse cx="${x + a}" cy="${y + b}" rx="5" ry="2.4" fill="#ffffff" stroke="#c4d6e8" stroke-width=".5"/>`).join('') + pine(x + 16, y - 2);
    case 'pinewood': return [[-16, -2], [-8, -10], [2, -6], [12, -10], [16, 2], [-10, 6], [4, 6], [-20, 8]].map(([a, b]) => pine(x + a, y + b)).join('');
    case 'frostlake': return `<ellipse cx="${x}" cy="${y}" rx="15" ry="7" fill="#d8f2fc" stroke="#7ab8dc" stroke-width=".7"/><path d="M${x - 8} ${y - 2} l5 2 l4 -3 l5 3" stroke="#ffffff" stroke-width=".7" fill="none"/>` + `<circle cx="${x + 6}" cy="${y + 2}" r="1.4" fill="#1e5a88"/>`;
    case 'icecave': return arch(x - 4, y) + `<path d="M${x + 8} ${y - 6} l2 8 l2 -8Z M${x - 14} ${y - 4} l1.6 6 l1.6 -6Z" fill="#c8ecff" stroke="#5a8ab8" stroke-width=".4"/>`;
    case 'glacier': return `<path d="M${x - 14} ${y + 6} L${x - 8} ${y - 8} L${x - 2} ${y - 4} L${x + 4} ${y - 12} L${x + 14} ${y + 6}Z" fill="#e8f6ff" stroke="#7aa4cc" stroke-width=".6"/><path d="M${x + 4} ${y - 12} L${x + 6} ${y + 6}" stroke="#a8c8e4" stroke-width=".6"/>`;
    case 'aurora': return `<path d="M${x - 16} ${y - 10} q8 -6 16 0 t16 0" stroke="#7affc8" stroke-width="2" fill="none" opacity=".8"/><path d="M${x - 14} ${y - 5} q7 -5 14 0 t14 0" stroke="#ff9ae0" stroke-width="1.4" fill="none" opacity=".7"/>` + [[-8, 4], [6, 6], [12, -2]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r=".9" fill="#fff6c8"/>`).join('');
    case 'frostpeak': return peak(x - 6, y, 1.2) + peak(x + 8, y + 4, 0.9) + `<circle cx="${x + 12}" cy="${y - 8}" r="1" fill="#ffffff"/>`;
    case 'grove': return tree(x - 10, y + 2, '#2c3c7c') + tree(x + 8, y - 4, '#2c3c7c') + tree(x + 2, y + 8, '#2c3c7c') + `<circle cx="${x - 2}" cy="${y - 10}" r="3" fill="#fff6c8"/><circle cx="${x - 0.8}" cy="${y - 10.8}" r="2.6" fill="${FILL.grove[0]}"/>` + flower(x + 12, y + 6, '#b8f0ff') + flower(x - 14, y - 4, '#b8f0ff');
  }
}

/** 지도 SVG. regions 에 없는 지역은 그리지 않는다 */
export function worldMapSvg(regions: MapRegion[], world = 1): string {
  const by = Object.fromEntries(regions.map((r) => [r.id, r]));
  // 섬(바탕 땅)과 바다
  const land = world === 3 ? ['#eef4fa', '#c8dcec'] : world === 2 ? ['#f6e2b0', '#ecd092'] : ['#e8d6a4', '#a8cf84'];
  let out = `<svg class="wmap" viewBox="0 0 420 230" role="group" aria-label="${world}월드 지도">
    <defs><pattern id="wave" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 6 q4 -3 8 0 t8 0" stroke="#ffffff" stroke-opacity=".18" fill="none" stroke-width=".8"/></pattern>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="420" height="230" fill="#3e7aa0"/><rect width="420" height="230" fill="url(#wave)"/>
    <path d="${blob(210, 120, 262, 3 + world, 0.52)}" fill="${land[0]}"/><path d="${blob(210, 120, 250, 3 + world, 0.49)}" fill="${land[1]}"/>`;
  // 길
  for (const [a, b] of ROADS) {
    if (!by[a] || !by[b]) continue;
    const p = SPOTS[a], q = SPOTS[b], known = by[a].state !== 'locked' && by[b].state !== 'locked';
    const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.12, my = (p.y + q.y) / 2 - (q.x - p.x) * 0.12;
    out += `<path d="M${p.x} ${p.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${q.x} ${q.y}" fill="none" stroke="${known ? '#f6e6b8' : '#8a8a7a'}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${known ? '0' : '2 4'}"/>`;
    if (known) out += `<path d="M${p.x} ${p.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${q.x} ${q.y}" fill="none" stroke="#c8a868" stroke-width="1" stroke-dasharray="3 3"/>`;
  }
  // 지역
  regions.forEach((r, i) => {
    const s = SPOTS[r.id];
    if (!s) return;
    const [fill, edge] = FILL[s.theme], locked = r.state === 'locked';
    const click = r.state === 'open' || r.state === 'unmet' ? ` data-act="mapsel:${r.id}" tabindex="0"` : '';
    out += `<g class="wreg ${r.state} ${r.sel ? 'sel' : ''}"${click} role="button" aria-pressed="${r.sel}" aria-label="${locked ? '알 수 없는 지역' : `${r.name} ${r.sub}`}">
      <path class="land" d="${blob(s.x, s.y, s.r, i + 7)}" fill="${locked ? '#8c9488' : fill}" stroke="${r.sel ? '#ffe066' : locked ? '#6a7266' : edge}" stroke-width="${r.sel ? 3 : 1.5}" ${r.sel ? 'filter="url(#glow)"' : ''}/>
      ${locked ? `<text x="${s.x}" y="${s.y + 4}" class="wq">?</text>` : deco(s)}
      ${r.state === 'here' ? `<g class="pin"><path d="M${s.x} ${s.y - 4} l-4 -7 a4.6 4.6 0 1 1 8 0Z" fill="#e2574a" stroke="#3a1a1a" stroke-width=".8"/><circle cx="${s.x}" cy="${s.y - 13}" r="1.6" fill="#fff"/></g>` : ''}
      <text x="${s.x}" y="${s.y + s.r * 0.78 + 9}" class="wname">${locked ? '???' : r.name}</text>
      ${r.sub && !locked ? `<text x="${s.x}" y="${s.y + s.r * 0.78 + 17}" class="wsub ${r.state}">${r.sub}</text>` : ''}
    </g>`;
  });
  return out + '</svg>';
}
