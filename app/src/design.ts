// Design-system check page: every primitive in its states, plus the full screen skeleton.
import './styles/tokens.css';
import './styles/ui.css';
import { spriteURL, SPRITES } from './art/sprites';

const ic = (name: string, scale = 1) =>
  `<img class="${scale === 2 ? 'ic2' : 'ic'}" src="${spriteURL(name, scale === 2 ? 2 : 1)}" alt="">`;

const root = document.getElementById('root')!;

const screen = `
<div class="phone" style="max-width:var(--l-max-width);margin:0 auto;border:2px solid var(--c-border);display:flex;flex-direction:column;height:820px">
  <header class="topbar">
    <div class="money">${ic('coin', 2)}<div class="money-text"><span class="t-lg gold">4.97 UC</span><span class="muted">1.48 TVg/초</span></div></div>
    <div class="res"><span>${ic('legend')}428.4Qa</span><span>${ic('candy')}0</span></div>
    <button class="round" style="width:32px;height:32px" aria-label="설정">${ic('gear')}</button>
  </header>
  <div class="manabar" role="progressbar" aria-valuenow="62" aria-valuemax="100"><div class="fill" style="width:62%"></div><span class="label">영감 620/1000 · +1.0/초</span></div>
  <div class="spellrow">
    <button class="spell"><span class="slot">${ic('coin', 2)}</span><span class="pill">200</span></button>
    <button class="spell auto-gold"><span class="slot">${ic('hammer', 2)}<span class="cover" style="height:40%"></span></span><span class="pill">12초</span></button>
    <button class="spell auto-silver"><span class="slot">${ic('book', 2)}</span><span class="pill">900</span></button>
    <button class="spell" disabled><span class="slot">${ic('star', 2)}</span><span class="pill">1000</span></button>
    <button class="spell"><span class="slot">${ic('mana', 2)}</span><span class="pill">700</span></button>
    <button class="spell"><span class="slot">${ic('orb', 2)}</span><span class="pill">600</span></button>
  </div>
  <div class="map" style="flex:1">
    <canvas id="map"></canvas>
    <div class="autocast">
      <button class="round gold" aria-pressed="true" aria-label="자동 시전: 금">${ic('coin')}</button>
      <button class="round silver" aria-pressed="true" aria-label="자동 시전: 은">${ic('mana')}</button>
      <button class="round" aria-pressed="false" aria-label="자동 시전: 꺼짐">${ic('star')}</button>
    </div>
    <button class="corner left"><span class="round">${ic('orb', 2)}</span><span>점술</span></button>
    <div class="ribbon">건물</div>
    <button class="corner right"><span class="round">${ic('bag', 2)}</span><span>상점</span></button>
  </div>
  <section class="panel" style="height:var(--l-panel);overflow:auto">
    <div class="bgrid">
      ${[
        ['common', '이야기꾼', '1000', 'can'], ['common', '버섯 오두막', '703', 'can'], ['common', '과자 공방', '251', 'cant'],
        ['bright', '콩나무 농장', '4.7K', 'can'], ['dark', '마녀 오두막', '60', 'cant'], ['legend', '시간 미로', '9.7K', 'can'],
        ['bright', '구름 항구', '2.0K', 'cant'], ['dark', '해골 선착장', '357', 'can'], ['legend', '용의 보물고', '12', 'cant'],
        ['bright', '별빛 극장', '5', 'cant'], ['common', '이야기의 나무', '1', 'cant'],
      ].map(([v, n, o, s]) => `<button class="bcard ${v} ${s}"><img class="ic2" src="${spriteURL('house', 2)}" alt=""><span class="pct">+${o.length * 25}%</span><span class="own">${o}</span><span class="price">×1 2.44 UC</span><span class="name">${n}</span></button>`).join('')}
      <button class="btn primary lg" style="height:auto">최대 구매</button>
    </div>
  </section>
  <nav class="bottomnav" role="tablist">
    ${['house', 'hammer', 'shovel', 'trophy', 'star', 'flag', 'gear'].map((n, i) =>
      `<button class="round navbtn" role="tab" aria-selected="${i === 0}">${ic(n, 2)}${i === 1 ? '<span class="badge">4</span>' : ''}</button>`).join('')}
  </nav>
</div>`;

const states = `
<div style="max-width:var(--l-max-width);margin:24px auto;display:flex;flex-direction:column;gap:16px;padding:0 8px">
  <h2 class="t-lg">버튼</h2>
  <div style="display:flex;flex-wrap:wrap;gap:8px">
    <button class="btn primary">퇴위 +18.96</button><button class="btn special">환생 279</button>
    <button class="btn accent sm">모두 구매</button><button class="btn danger">초기화</button><button class="btn primary" disabled>비활성</button>
  </div>
  <h2 class="t-lg">업그레이드 패널</h2>
  <div style="display:flex;gap:8px">
    <div class="coincol">${['coin', 'mana', 'candy', 'legend'].map((n, i) => `<span class="${i === 3 ? 'zero' : ''}">${ic(n)}${i === 3 ? '0' : '152.1'}</span>`).join('')}</div>
    <div style="flex:1">
      <div style="display:flex;gap:8px;justify-content:center"><button class="btn primary sm">퇴위 +18.96</button><button class="btn special sm">환생</button></div>
      <section class="gsection"><header>미구매 개선 <button aria-label="접기">▲</button></header>
        <div class="ugrid">${['hammer', 'book', 'coin', 'star', 'mana', 'orb'].map((n, i) => `<button class="uslot ${i < 2 ? 'can' : 'cant'}">${ic(n, 2)}</button>`).join('')}</div></section>
      <section class="gsection"><header>구매한 개선 <button aria-label="접기">▲</button></header>
        <div class="ugrid">${['hammer', 'hammer', 'hammer', 'book', 'trophy'].map((n) => `<button class="uslot done">${ic(n, 2)}</button>`).join('')}</div></section>
    </div>
  </div>
  <h2 class="t-lg">모달 · 표</h2>
  <div class="modal" style="position:relative">
    <button class="close" aria-label="닫기">✕</button>
    <h2>출판 계약</h2>
    <table class="dtable"><tr><th>조각</th><th>보너스</th><th>비용</th><th></th></tr>
      ${['숲속 친구들', '음유시인', '별의 마법사'].map((n) => `<tr><td>${n} (2791)</td><td>+10%</td><td>673</td><td><button class="btn accent sm">구매</button></td></tr>`).join('')}</table>
    <div class="actions"><button class="btn primary">1회 구매</button></div>
  </div>
  <h2 class="t-lg">글자</h2>
  <p class="t-display">테일즈토피아 28</p><p class="t-lg">제목 22 Bold</p><p class="t-base">본문 14 갈무리14</p><p class="t-sm">강조 11 Bold</p><p>기본 11 갈무리11 · <span class="muted">보조</span> · <span class="dim">흐림</span></p>
  <label class="check"><input type="checkbox" checked> 구매한 개선 숨기기</label>
  <h2 class="t-lg">스프라이트 (×3)</h2>
  <div style="display:flex;flex-wrap:wrap;gap:8px">${Object.keys(SPRITES).map((n) => `<figure style="margin:0;text-align:center"><img src="${spriteURL(n, 3)}" alt="${n}"><figcaption class="dim">${n}</figcaption></figure>`).join('')}</div>
  <div class="toast" style="position:static;transform:none">🏅 명장면 달성: 첫 장을 넘기다</div>
</div>`;

root.innerHTML = screen + states;

// placeholder map: isometric grass tiles with a few houses, drawn at integer scale
const canvas = document.getElementById('map') as HTMLCanvasElement;
const box = canvas.parentElement!.getBoundingClientRect();
const S = 2;
canvas.width = Math.floor(box.width / S);
canvas.height = Math.floor(box.height / S);
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
for (let y = -1; y < canvas.height / 8 + 1; y++) {
  for (let x = -1; x < canvas.width / 32 + 1; x++) {
    const cx = x * 32 + (y % 2 ? 16 : 0), cy = y * 8;
    ctx.fillStyle = (x + y) % 3 ? '#3f8a4f' : '#4c9a5a';
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 16, cy); ctx.fill();
  }
}
const house = new Image();
house.onload = () => [[60, 40], [120, 70], [90, 100], [150, 30]].forEach(([x, y]) => ctx.drawImage(house, x, y));
house.src = spriteURL('house', 1);
