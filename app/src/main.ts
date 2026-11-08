// Talestopia Tycoon — game screen. Layout follows the original's mobile structure (replica/architecture.md).
import './styles/tokens.css';
import './styles/ui.css';
import Decimal from 'break_infinity.js';
import * as E from './engine/engine';
import { newGame, serialize, deserialize, type SaveState } from './engine/state';
import { fmt, fmtTime } from './engine/format';
import { spriteURL } from './art/sprites';
import { framedIcon, installTextures } from './art/ui';
import { buildingThumb, levelFor } from './art/buildings';
import { renderMap, MAP_W, MAP_H } from './art/map';
import { BUILDING_BY_ID } from './data/buildings';
import { FACTIONS, FACTION_BY_ID } from './data/factions';
import { SPELL_BY_ID } from './data/spells';
import { TROPHIES } from './data/general';
import { COIN_TYPES, type CoinType } from './data/types';

const SAVE_KEY = 'talestopia-tycoon-v1';
const COIN_COLOR: Record<CoinType, string> = { woodland: '#7fbf6a', minstrel: '#d8b04a', starmage: '#7cc0ff', thieves: '#a8a060', ghost: '#8c6cc8', witch: '#d4553a' };
const COIN_KO: Record<CoinType, string> = { woodland: '숲', minstrel: '음유', starmage: '별', thieves: '도적', ghost: '유령', witch: '마녀' };
type Tab = 'buildings' | 'upgrades' | 'explore' | 'trophies' | 'challenges' | 'events' | 'stats';
const TABS: { id: Tab; ko: string; icon: string }[] = [
  { id: 'buildings', ko: '건물', icon: 'house' }, { id: 'upgrades', ko: '개선', icon: 'hammer' }, { id: 'explore', ko: '탐사', icon: 'shovel' },
  { id: 'trophies', ko: '명장면', icon: 'trophy' }, { id: 'challenges', ko: '도전', icon: 'star' }, { id: 'events', ko: '이벤트', icon: 'flag' },
  { id: 'stats', ko: '기록', icon: 'book' },
];

installTextures();
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
let S: SaveState;
let tab: Tab = 'buildings';
let assignMode: 'gold' | 'silver' | null = null;
const F = (v: Decimal | number) => fmt(v, S.settings.numberFormat);

// ------------------------------------------------------------ storage
function save() { try { S.lastSeen = Date.now(); localStorage.setItem(SAVE_KEY, serialize(S)); return true; } catch { return false; } }
function load() {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      S = deserialize(raw, now);
      const off = E.applyOffline(S, now);
      if (off.gained.gt(0)) setTimeout(() => modal('다녀오셨군요', `<p>${fmtTime(off.seconds)} 동안 왕국이 일했어요.</p><p class="t-lg gold" style="text-align:center">+${F(off.gained)} 금화</p>`), 50);
      return;
    }
  } catch { /* new game */ }
  S = newGame(now);
}

// ------------------------------------------------------------ shell
const app = $('#app');
app.innerHTML = `
  <header class="topbar">
    <div class="money"><img class="ic2" src="${spriteURL('coin', 2)}" alt=""><div class="money-text"><span class="coins" id="coins">0</span><span class="cps" id="cps">0 /초</span></div></div>
    <div class="res"><span title="전설"><img class="ic" src="${spriteURL('legend')}" alt="전설"><b id="gems">0</b></span>
      <span title="견습생"><img class="ic" src="${spriteURL('ghost')}" alt="견습생"><b id="assist">0</b></span></div>
    <button class="round" id="btn-settings" style="width:30px;height:30px" aria-label="설정"><img class="ic" src="${spriteURL('gear')}" alt=""></button>
  </header>
  <div class="manabar" role="progressbar" id="manabar"><div class="fill" id="mana-fill"></div><span class="label shadow-text" id="mana-text"></span></div>
  <div class="spellrow" id="spells"></div>
  <div class="map" id="map">
    <canvas class="realm" id="realm"></canvas>
    <button class="tap" id="tap" aria-label="왕국 두드리기"></button>
    <div class="floaters" id="floaters"></div>
    <div class="effects" id="effects"></div>
    <div class="autocast">
      <button class="round" id="ac-gold" aria-pressed="false" aria-label="자동 시전 1순위 지정"><img class="ic" src="${spriteURL('coin')}" alt=""><span class="lbl shadow-text">1순위</span></button>
      <button class="round" id="ac-silver" aria-pressed="false" aria-label="자동 시전 2순위 지정" style="margin-top:8px"><img class="ic" src="${spriteURL('mana')}" alt=""><span class="lbl shadow-text">2순위</span></button>
      <button class="round" id="ac-thr" aria-label="자동 시전 시작 영감" style="margin-top:8px"><img class="ic" src="${spriteURL('hourglass')}" alt=""><span class="lbl shadow-text" id="ac-thr-l">0%</span></button>
    </div>
    <button class="corner left" id="btn-scry"><span class="round"><img class="ic2" src="${spriteURL('orb', 2)}" alt=""></span><span class="shadow-text">점술</span></button>
    <div class="ribbon shadow-text" id="ribbon">건물</div>
    <button class="btn accent sm buyall" id="buyall">모두 구매</button>
    <button class="corner right" id="btn-shop"><span class="round"><img class="ic2" src="${spriteURL('bag', 2)}" alt=""></span><span class="shadow-text">상점</span></button>
  </div>
  <section class="panel" id="panel"></section>
  <nav class="bottomnav" role="tablist" id="nav">${TABS.map((t) =>
    `<button class="round navbtn" role="tab" data-tab="${t.id}" aria-label="${t.ko}"><img class="ic2" src="${spriteURL(t.icon, 2)}" alt=""><span class="badge hidden"></span></button>`).join('')}</nav>
  <div id="layer"></div>`;

// ------------------------------------------------------------ toast & modal
let toastTimer = 0;
function toast(html: string) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; app.append(t); }
  t.innerHTML = html; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => t.classList.add('hidden'), 2200);
}
function closeModal() { $('#layer').innerHTML = ''; }
function modal(title: string, body: string, actions: { label: string; cls?: string; disabled?: boolean; run?: () => void }[] = [{ label: '확인' }]) {
  const layer = $('#layer');
  layer.innerHTML = `<div class="backdrop"><div class="modal" role="dialog" aria-modal="true"><button class="close" aria-label="닫기">✕</button>
    <h2>${title}</h2>${body}<div class="actions">${actions.map((a, i) => `<button class="btn ${a.cls ?? 'primary'}" data-i="${i}" ${a.disabled ? 'disabled' : ''}>${a.label}</button>`).join('')}</div></div></div>`;
  $('.close', layer).onclick = closeModal;
  $('.backdrop', layer).onclick = (e) => { if (e.target === e.currentTarget) closeModal(); };
  layer.querySelectorAll<HTMLButtonElement>('.actions button').forEach((b) => { b.onclick = () => { const a = actions[+b.dataset.i!]; closeModal(); a.run?.(); }; });
  return layer;
}

// ------------------------------------------------------------ map
const realm = $<HTMLCanvasElement>('#realm');
let mapKey = '';
function drawMap(force = false) {
  const owned = E.visibleBuildings(S).map((b) => ({ id: b.id, tier: b.tier, count: S.run.buildings[b.id] }));
  const key = owned.map((o) => o.id + levelFor(o.count) + (o.count > 0 ? 1 : 0)).join(',');
  const box = $('#map').getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.max(1, Math.ceil(Math.max((box.width * dpr) / MAP_W, (box.height * dpr) / MAP_H)));
  const sizeKey = key + '|' + scale;
  if (!force && sizeKey === mapKey) return;
  mapKey = sizeKey;
  const src = renderMap(owned);
  realm.width = MAP_W * scale; realm.height = MAP_H * scale;
  realm.style.width = (MAP_W * scale) / dpr + 'px'; realm.style.height = (MAP_H * scale) / dpr + 'px';
  const ctx = realm.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, realm.width, realm.height);
}
new ResizeObserver(() => drawMap(true)).observe($('#map'));

function floater(text: string, x: number, y: number, cls = '') {
  const f = document.createElement('div'); f.className = 'floater ' + cls; f.textContent = text;
  f.style.left = x - 20 + Math.random() * 16 + 'px'; f.style.top = y - 24 + 'px';
  $('#floaters').append(f); setTimeout(() => f.remove(), 950);
}
$('#tap').addEventListener('pointerdown', (ev) => {
  const r = E.click(S, Date.now());
  const box = $('#map').getBoundingClientRect();
  floater('+' + F(r.value), ev.clientX - box.left, ev.clientY - box.top);
  if (r.coin) floater(`+1 ${COIN_KO[r.coin]} 조각`, ev.clientX - box.left, ev.clientY - box.top - 16, 'coin');
});

// ------------------------------------------------------------ spells
let spellKey = '';
function renderSpells(now: number) {
  const list = E.availableSpells(S);
  const key = list.map((s) => s.id + (S.autocast[s.id] ?? '')).join(',');
  const row = $('#spells');
  if (key !== spellKey) {
    spellKey = key;
    row.innerHTML = list.map((sp) => {
      const frame = sp.faction ? 'gold' : sp.alignment ? 'silver' : 'bronze';
      const bg = sp.faction ? FACTION_BY_ID[sp.faction].color : sp.alignment === 'dark' ? '#7a2a2a' : sp.alignment === 'bright' ? '#2c4a8a' : '#4a3a2a';
      const ac = S.autocast[sp.id];
      return `<button class="spell" data-id="${sp.id}" aria-label="${sp.ko}"><span class="slot"><img src="${framedIcon(sp.icon, bg, frame)}" alt=""><span class="cover"></span>${ac && ac !== 'off' ? `<span class="tag ${ac}"></span>` : ''}</span><span class="pill"></span></button>`;
    }).join('');
    row.querySelectorAll<HTMLButtonElement>('.spell').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.id!;
        if (assignMode) {
          S.autocast[id] = S.autocast[id] === assignMode ? 'off' : assignMode;
          toast(`${SPELL_BY_ID[id].ko}: 자동 시전 ${S.autocast[id] === 'off' ? '끔' : assignMode === 'gold' ? '1순위' : '2순위'}`);
          spellKey = ''; return;
        }
        const r = E.castSpell(S, id, Date.now());
        if (!r) { showSpellInfo(id); return; }
        toast(`🔮 ${SPELL_BY_ID[id].ko}${r.gained ? ` +${F(r.gained)} 금화` : ''}${r.coins ? ` +${r.coins} 조각` : ''}`);
      };
      b.oncontextmenu = (e) => { e.preventDefault(); showSpellInfo(b.dataset.id!); };
    });
  }
  row.querySelectorAll<HTMLButtonElement>('.spell').forEach((b) => {
    const sp = SPELL_BY_ID[b.dataset.id!], a = S.run.activeSpells[sp.id];
    const on = !!a && a.end > now;
    b.classList.toggle('on', on);
    b.classList.toggle('short', !on && S.run.mana < sp.mana);
    $('.pill', b).textContent = on ? Math.ceil((a.end - now) / 1000) + '초' : String(sp.mana);
    ($('.cover', b) as HTMLElement).style.height = on ? `${(1 - (now - a.start) / (a.end - a.start)) * 36}px` : '0';
  });
}
function showSpellInfo(id: string) {
  const sp = SPELL_BY_ID[id];
  modal(sp.ko, `<p>${esc(sp.desc)}</p><p>영감 ${sp.mana}${sp.duration ? ` · ${sp.duration}초` : ' · 즉시'}</p>`, [
    { label: '시전', disabled: S.run.mana < sp.mana || E.spellActive(S, id, Date.now()), run: () => E.castSpell(S, id, Date.now()) }, { label: '닫기', cls: 'accent' }]);
}
function setAssign(m: 'gold' | 'silver') {
  assignMode = assignMode === m ? null : m;
  $('#ac-gold').setAttribute('aria-pressed', String(assignMode === 'gold'));
  $('#ac-silver').setAttribute('aria-pressed', String(assignMode === 'silver'));
  if (assignMode) toast(`${assignMode === 'gold' ? '1순위' : '2순위'} 자동 시전할 주문을 누르세요`);
}
$('#ac-gold').onclick = () => setAssign('gold');
$('#ac-silver').onclick = () => setAssign('silver');
$('#ac-thr').onclick = () => {
  const steps = [0, 0.25, 0.5, 0.75, 1]; S.autocastThreshold = steps[(steps.indexOf(S.autocastThreshold) + 1) % steps.length];
  toast(`영감이 ${S.autocastThreshold * 100}% 이상일 때부터 자동 시전`);
};

// ------------------------------------------------------------ panels
let panelKey = '';
function setTab(t: Tab) {
  tab = t; panelKey = '';
  document.querySelectorAll<HTMLButtonElement>('#nav .navbtn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $('#ribbon').textContent = TABS.find((x) => x.id === t)!.ko;
  $('#buyall').classList.toggle('hidden', t !== 'buildings' && t !== 'upgrades');
  $('#panel').scrollTop = 0;
  renderPanel();
}
document.querySelectorAll<HTMLButtonElement>('#nav .navbtn').forEach((b) => { b.onclick = () => setTab(b.dataset.tab as Tab); });
$('#buyall').onclick = () => {
  const n = tab === 'upgrades' ? E.buyAllUpgrades(S, Date.now()) : E.buyAllBuildings(S);
  toast(n ? `${n}개 구매했어요` : '살 수 있는 것이 없어요');
};

function renderPanel() {
  const p = $('#panel');
  if (tab === 'buildings') return renderBuildings(p);
  if (tab === 'upgrades') return renderUpgrades(p);
  if (tab === 'trophies') return renderTrophies(p);
  if (tab === 'stats') return renderStats(p);
  const key = tab;
  if (key === panelKey) return;
  panelKey = key;
  const msg: Record<string, string> = {
    explore: '서고 탐사(발굴)는 첫 <b>새 시리즈(환생)</b> 이후에 열려요.',
    challenges: '특별 원고(도전)는 <b>새 시리즈(환생)</b> 이후에 열려요.',
    events: '지금 진행 중인 이벤트가 없어요.',
  };
  p.innerHTML = `<div class="locked-panel"><img class="ic2" src="${spriteURL(TABS.find((x) => x.id === tab)!.icon, 2)}" alt=""><p>${msg[tab]}</p></div>`;
}

const AMOUNTS: SaveState['settings']['buyAmount'][] = [1, 10, 100, 'max'];
function renderBuildings(p: HTMLElement) {
  const list = E.visibleBuildings(S);
  const key = 'b' + list.map((b) => b.id).join(',') + S.settings.buyAmount;
  if (key !== panelKey) {
    panelKey = key;
    p.innerHTML = `<div class="bgrid">${list.map((b) => `<button class="bcard bevel ${b.alignment ?? 'common'}" data-id="${b.id}">
      <img src="${buildingThumb(b.id, 30)}" alt=""><span class="pct"></span><span class="own"></span><span class="price"></span><span class="name">${b.ko}</span></button>`).join('')}
      <button class="bcard amount bevel" id="amt">${S.settings.buyAmount === 'max' ? '최대 구매' : 'x' + S.settings.buyAmount + ' 구매'}</button></div>`;
    p.querySelectorAll<HTMLButtonElement>('.bcard[data-id]').forEach((c) => {
      c.onclick = () => { E.buyBuilding(S, c.dataset.id!, S.settings.buyAmount); updateBuildings(); };
    });
    $('#amt', p).onclick = () => { S.settings.buyAmount = AMOUNTS[(AMOUNTS.indexOf(S.settings.buyAmount) + 1) % AMOUNTS.length]; panelKey = ''; renderPanel(); };
  }
  updateBuildings();
}
function updateBuildings() {
  const snap = E.snapshot(S, Date.now());
  const total = E.buildingsCps(S, snap);
  const cm = snap.mods.costMult;
  document.querySelectorAll<HTMLButtonElement>('#panel .bcard[data-id]').forEach((c) => {
    const id = c.dataset.id!, b = BUILDING_BY_ID[id];
    const amt = S.settings.buyAmount;
    const n = amt === 'max' ? Math.max(1, E.maxAffordable(S, id, cm)) : amt;
    const cost = E.buildingCost(S, id, n, cm);
    const ok = cost.lte(S.run.coins);
    c.classList.toggle('can', ok); c.classList.toggle('cant', !ok);
    const prod = E.buildingProd(S, b, snap);
    const share = total.gt(0) ? prod.div(total).toNumber() * 100 : 0;
    $('.pct', c).textContent = share >= 0.05 ? share.toFixed(share < 10 ? 1 : 0) + '%' : '';
    $('.own', c).textContent = F(S.run.buildings[id]);
    $('.price', c).textContent = `x${n} ${F(cost)}`;
    c.title = `${b.ko}: 1채당 ${F(S.run.buildings[id] ? prod.div(S.run.buildings[id]) : 0)}/초`;
  });
}

function upgradeIcon(u: E.UpgradeView) {
  if (u.kind === 'building') {
    const b = BUILDING_BY_ID[u.icon.slice(2)];
    const bg = b.alignment === 'bright' ? '#2c4470' : b.alignment === 'dark' ? '#5a2226' : b.alignment === 'legend' ? '#45443a' : '#4e3c2a';
    return framedIcon('hammer', bg, u.tier! >= 5 ? 'gold' : u.tier! >= 2 ? 'silver' : 'bronze');
  }
  if (u.kind === 'faction') return framedIcon(u.icon, u.color!, u.tier === 3 ? 'gold' : u.tier === 2 ? 'silver' : 'bronze');
  if (u.kind === 'alignment') return framedIcon(u.icon, u.color!, 'gold');
  return framedIcon(u.icon, '#3a3040', 'plain');
}
function costHTML(u: E.UpgradeView) {
  const parts = [`<span class="gold"><img class="ic" src="${spriteURL('coin')}" alt=""> ${F(u.cost)}</span>`];
  for (const [k, v] of Object.entries(u.fcCost ?? {})) parts.push(`<span><i style="display:inline-block;width:8px;height:8px;background:${COIN_COLOR[k as CoinType]}"></i> ${COIN_KO[k as CoinType]} 조각 ${v}</span>`);
  return `<div class="cost">${parts.join('')}</div>`;
}
function showUpgrade(id: string) {
  const u = E.allUpgrades(S).find((x) => x.id === id); if (!u) return;
  modal(esc(u.ko), `<div class="head"><img src="${upgradeIcon(u)}" alt=""><p>${esc(u.desc)}</p></div>${u.purchased ? '<p class="gold">구매함</p>' : costHTML(u)}`,
    u.purchased ? [{ label: '닫기' }] : [{ label: '구매', disabled: !u.affordable, run: () => { if (E.buyUpgrade(S, id, Date.now())) { toast('✨ ' + esc(u.ko)); if (u.kind === 'alignment') { panelKey = ''; drawMap(true); } } } }, { label: '닫기', cls: 'accent' }]);
}
let upCollapsed = { todo: false, done: true };
function renderUpgrades(p: HTMLElement) {
  const ups = E.allUpgrades(S);
  const todo = ups.filter((u) => !u.purchased).sort((a, b) => (a.cost.lt(b.cost) ? -1 : 1));
  const done = ups.filter((u) => u.purchased);
  const gems = E.gemsOnAbdicate(S);
  const key = 'u' + todo.map((u) => u.id).join() + '|' + done.length + JSON.stringify(upCollapsed) + (S.run.faction ?? '');
  if (key !== panelKey) {
    panelKey = key;
    p.innerHTML = `<div class="uppanel">
      <div class="coincol" id="coincol">${COIN_TYPES.map((c) => `<span class="fc" data-c="${c}"><i style="background:${COIN_COLOR[c]}"></i><b></b></span>`).join('')}
        <button class="btn accent sm" id="btn-ex" style="margin-top:4px;padding:0 4px" ${E.canExchange(S) ? '' : 'disabled'}>출판 계약</button></div>
      <div>
        <div class="uptop"><button class="btn primary sm" id="btn-abd"></button><button class="btn special sm" id="btn-rei" disabled>새 시리즈 (전설 1Oc)</button></div>
        <section class="gsection"><header>미구매 개선 (${todo.length}) <button data-c="todo">${upCollapsed.todo ? '▼' : '▲'}</button></header>
          ${upCollapsed.todo ? '' : todo.length ? `<div class="ugrid">${todo.map((u) => `<button class="uslot" data-id="${u.id}"><img src="${upgradeIcon(u)}" alt="${esc(u.ko)}"></button>`).join('')}</div>` : '<div class="empty">지금 살 수 있는 개선이 없어요.</div>'}</section>
        <section class="gsection"><header>구매한 개선 (${done.length}) <button data-c="done">${upCollapsed.done ? '▼' : '▲'}</button></header>
          ${upCollapsed.done ? '' : `<div class="ugrid">${done.map((u) => `<button class="uslot" data-id="${u.id}"><img src="${upgradeIcon(u)}" alt="${esc(u.ko)}"></button>`).join('')}</div>`}</section>
      </div></div>`;
    p.querySelectorAll<HTMLButtonElement>('.uslot').forEach((b) => { b.onclick = () => showUpgrade(b.dataset.id!); });
    p.querySelectorAll<HTMLButtonElement>('.gsection header button').forEach((b) => { b.onclick = () => { const c = b.dataset.c as 'todo' | 'done'; upCollapsed = { ...upCollapsed, [c]: !upCollapsed[c] }; renderPanel(); }; });
    $('#btn-abd', p).onclick = abdicateFlow;
    $('#btn-ex', p).onclick = exchangeFlow;
  }
  const abd = $<HTMLButtonElement>('#btn-abd', p);
  abd.textContent = `다시 쓰기 +${F(gems)} 전설`; abd.disabled = gems.lt(1);
  p.querySelectorAll<HTMLElement>('.fc').forEach((e) => { const v = S.run.fc[e.dataset.c as CoinType]; $('b', e).textContent = F(v); e.classList.toggle('zero', v === 0); });
  const byId = new Map(todo.map((u) => [u.id, u]));
  p.querySelectorAll<HTMLButtonElement>('.uslot').forEach((b) => {
    const u = byId.get(b.dataset.id!); if (!u) return;
    b.classList.toggle('can', u.affordable); b.classList.toggle('cant', !u.affordable);
  });
}
function abdicateFlow() {
  const g = E.gemsOnAbdicate(S);
  modal('다시 쓰기', `<p>지금까지의 금화·건물·개선·성향·진영·이야기 조각을 내려놓고 처음부터 다시 써요.</p>
    <p>얻는 전설: <b class="gold">${F(g)}</b> (보유 ${F(S.gems)})\n전설 1개당 생산 +2%. 명장면은 남아요.</p>`, [
    { label: '다시 쓰기', disabled: g.lt(1), run: () => { const got = E.abdicate(S, Date.now()); save(); panelKey = ''; spellKey = ''; drawMap(true); toast(`🌟 전설 ${F(got)}개를 얻었어요`); } },
    { label: '취소', cls: 'accent' }]);
}
function exchangeFlow() {
  const draw = () => {
    const rows = COIN_TYPES.map((c) => `<tr><td><i style="display:inline-block;width:8px;height:8px;background:${COIN_COLOR[c]}"></i> ${COIN_KO[c]} (${F(S.run.fc[c])})</td>
      <td>${S.run.exchanges[c] ?? 0}회</td><td>${E.exchangeCost(S, c)}</td><td><button class="btn accent sm" data-c="${c}" ${S.run.fc[c] < E.exchangeCost(S, c) ? 'disabled' : ''}>계약</button></td></tr>`).join('');
    const layer = modal('출판 계약', `<p>이야기 조각으로 계약을 맺으면 모든 건물 생산이 영구히(이번 판) 늘어요. 계약 1회당 +${Math.round(E.snapshot(S, Date.now()).mods.exchangeBonus * 100)}%.</p>
      <table class="dtable"><tr><th>조각</th><th>계약</th><th>비용</th><th></th></tr>${rows}</table><p>총 계약 ${E.totalExchanges(S)}회</p>`, [{ label: '닫기' }]);
    layer.querySelectorAll<HTMLButtonElement>('.dtable button').forEach((b) => { b.onclick = () => { E.royalExchange(S, b.dataset.c as CoinType); draw(); }; });
  };
  draw();
}

function renderTrophies(p: HTMLElement) {
  const key = 't' + S.trophies.length;
  if (key === panelKey) return;
  panelKey = key;
  p.innerHTML = `<div class="t-sm" style="text-align:center">명장면 ${S.trophies.length} / ${TROPHIES.length}</div>
    <section class="gsection"><header>전체 명장면</header><div class="tgrid">${TROPHIES.map((t) => {
      const got = S.trophies.includes(t.id);
      const icon = t.id.startsWith('ally_') || t.id.startsWith('champ_') ? FACTION_BY_ID[t.id.split('_')[1] as keyof typeof FACTION_BY_ID].emblem : 'trophy';
      return `<button class="tslot ${got ? '' : 'locked'}" data-id="${t.id}"><img src="${framedIcon(icon, '#3a2a1a', got ? 'gold' : 'plain')}" alt="${esc(t.ko)}"></button>`;
    }).join('')}</div></section>`;
  p.querySelectorAll<HTMLButtonElement>('.tslot').forEach((b) => {
    b.onclick = () => { const t = TROPHIES.find((x) => x.id === b.dataset.id)!; modal(esc(t.ko), `<p>${esc(t.desc)}</p><p class="${S.trophies.includes(t.id) ? 'gold' : 'dim'}">${S.trophies.includes(t.id) ? '달성!' : '아직 달성하지 못했어요'}</p>`); };
  });
}

function renderStats(p: HTMLElement) {
  const snap = E.snapshot(S, Date.now());
  const rows: [string, string][] = [
    ['이번 판 금화', F(S.run.coinsRun)], ['두드리기로 번 금화', F(S.run.coinsByClick)], ['두드리기 1회', F(E.clickReward(S, snap))],
    ['이야기 조각 발견 확률', (E.fcChance(S, snap) * 100).toFixed(1) + '%'], ['견습생', String(snap.assistants)],
    ['영감 회복', snap.manaRegen.toFixed(2) + '/초'], ['영감 최대', String(snap.manaMax)],
    ['성향', S.run.alignment ? { bright: '밝은 이야기', dark: '어두운 이야기', legend: '옛 전설' }[S.run.alignment] : '-'],
    ['진영', S.run.faction ? FACTION_BY_ID[S.run.faction].ko : '-'],
    ['이번 판 시간', fmtTime((Date.now() - S.run.start) / 1000)], ['누적 금화', F(S.stats.totalCoins)], ['최고 판 금화', F(Decimal.max(S.stats.bestRun, S.run.coinsRun))],
    ['전설', F(S.gems)], ['다시 쓰기', String(S.stats.abdications)], ['총 두드리기', F(S.stats.clicks)], ['총 주문', F(S.stats.spells)],
  ];
  const html = `<dl class="stats">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
  if (panelKey !== 's') { panelKey = 's'; p.innerHTML = html; } else p.innerHTML = html;
}

// ------------------------------------------------------------ settings, scry, shop
$('#btn-settings').onclick = () => {
  const layer = modal('설정', `<div class="settings-grid">
    <div class="row"><span>숫자 표기</span><label class="check"><input type="radio" name="nf" value="short" ${S.settings.numberFormat === 'short' ? 'checked' : ''}> 짧은 이름</label>
      <label class="check"><input type="radio" name="nf" value="scientific" ${S.settings.numberFormat === 'scientific' ? 'checked' : ''}> 과학 표기</label></div>
    <div class="row"><button class="btn primary sm" id="s-save">저장</button><button class="btn accent sm" id="s-export">내보내기</button><button class="btn accent sm" id="s-import">불러오기</button></div>
    <textarea id="s-code" rows="3" placeholder="저장 코드"></textarea>
    <div class="row"><button class="btn danger sm" id="s-reset">모든 기록 초기화</button></div>
    <p class="dim">Talestopia Tycoon v0.2 · 글꼴 갈무리(OFL)</p></div>`, [{ label: '닫기' }]);
  layer.querySelectorAll<HTMLInputElement>('input[name=nf]').forEach((i) => { i.onchange = () => { S.settings.numberFormat = i.value as 'short'; panelKey = ''; }; });
  $('#s-save', layer).onclick = () => toast(save() ? '💾 저장했어요' : '이 브라우저에서는 저장할 수 없어요');
  $('#s-export', layer).onclick = () => { const c = btoa(unescape(encodeURIComponent(serialize(S)))); ($('#s-code', layer) as HTMLTextAreaElement).value = c; navigator.clipboard?.writeText(c).then(() => toast('📋 복사했어요'), () => {}); };
  $('#s-import', layer).onclick = () => {
    try { const t = deserialize(decodeURIComponent(escape(atob(($('#s-code', layer) as HTMLTextAreaElement).value.trim()))), Date.now()); S = t; S.lastSeen = Date.now(); save(); reset(); toast('📖 불러왔어요'); closeModal(); }
    catch { toast('저장 코드가 올바르지 않아요'); }
  };
  $('#s-reset', layer).onclick = () => modal('정말 초기화할까요?', '<p>전설과 명장면까지 모두 사라져요. 되돌릴 수 없어요.</p>', [
    { label: '초기화', cls: 'danger', run: () => { S = newGame(Date.now()); save(); reset(); } }, { label: '취소', cls: 'accent' }]);
};
$('#btn-scry').onclick = () => modal('점술', '<p>수정구로 앞날을 엿보고 4시간 동안 이어지는 축복 하나를 고를 수 있어요.\n(광고 연동 후 열려요)</p>');
$('#btn-shop').onclick = () => modal('상점', '<p>별사탕과 특별 상품은 정식 출시 때 열려요.</p>');

function reset() { panelKey = ''; spellKey = ''; mapKey = ''; drawMap(true); renderPanel(); }

// ------------------------------------------------------------ top bar + loop
function renderTop(now: number) {
  const snap = E.snapshot(S, now);
  $('#coins').textContent = F(S.run.coins);
  $('#cps').textContent = F(E.totalCps(S, snap)) + ' /초';
  $('#gems').textContent = F(S.gems);
  $('#assist').textContent = String(snap.assistants);
  $('#mana-fill').style.width = Math.min(100, (S.run.mana / snap.manaMax) * 100) + '%';
  $('#mana-text').textContent = `영감 ${Math.floor(S.run.mana)} / ${snap.manaMax} · +${snap.manaRegen.toFixed(1)}/초`;
  $('#ac-thr-l').textContent = Math.round(S.autocastThreshold * 100) + '%';
  const fx: string[] = [];
  if (S.run.alignment) fx.push({ bright: '☀ 밝은 이야기', dark: '☾ 어두운 이야기', legend: '⌛ 옛 전설' }[S.run.alignment]);
  if (S.run.faction) fx.push(FACTION_BY_ID[S.run.faction].ko);
  $('#effects').innerHTML = fx.map((t) => `<span class="shadow-text">${t}</span>`).join('');
  // badges: affordable upgrades
  const n = E.allUpgrades(S).filter((u) => !u.purchased && u.affordable).length;
  const badge = $('#nav [data-tab="upgrades"] .badge');
  badge.textContent = String(n); badge.classList.toggle('hidden', n === 0);
}

let last = 0;
function loop() {
  const now = Date.now();
  E.tick(S, now);
  if (now - last > 250) {
    last = now;
    for (const t of E.checkTrophies(S)) toast(`🏅 명장면: ${esc(t.ko)}`);
    renderTop(now);
    renderSpells(now);
    renderPanel();
    drawMap();
  }
  requestAnimationFrame(loop);
}

load();
setTab('buildings');
drawMap(true);
requestAnimationFrame(loop);
setInterval(save, 10000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else { const off = E.applyOffline(S, Date.now()); if (off.gained.gt(0)) toast(`자리를 비운 사이 +${F(off.gained)} 금화`); }
});
window.addEventListener('pagehide', save);
// debug helpers for testing in the browser console
(window as unknown as { tt: unknown }).tt = { get S() { return S; }, E, FACTIONS };
