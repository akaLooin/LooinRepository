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
import { ARCHAEOLOGY, ARTIFACTS, CHALLENGES, FACILITIES, REINCARNATION_PERKS, RESEARCH_UPGRADES, UNLOCKS, facilityBonus, researchSlots } from './data/endgame';
import { COIN_TYPES, type CoinType } from './data/types';
import { installContent } from './data/content';
import { t, watchTerms, setCurrencyTier } from './data/terms';

installContent();
watchTerms(document.body);
const ADMIN = import.meta.env.DEV || import.meta.env.VITE_ADMIN === '1';

const SAVE_KEY = 'talestopia-tycoon-v1';
const COIN_COLOR: Record<CoinType, string> = { woodland: '#7fbf6a', minstrel: '#d8b04a', starmage: '#7cc0ff', thieves: '#a8a060', ghost: '#8c6cc8', witch: '#d4553a', clockmaker: '#c8a060', shadow: '#6a5a9a' };
const COIN_KO: Record<CoinType, string> = { woodland: '숲', minstrel: '음유', starmage: '별', thieves: '도적', ghost: '유령', witch: '마녀', clockmaker: '시계', shadow: '그림자' };
type Tab = 'buildings' | 'upgrades' | 'explore' | 'trophies' | 'challenges' | 'events' | 'stats';
const TABS: { id: Tab; readonly ko: string; icon: string }[] = [
  { id: 'buildings', get ko() { return t('tabBuildings'); }, icon: 'house' }, { id: 'upgrades', get ko() { return t('tabUpgrades'); }, icon: 'hammer' },
  { id: 'explore', get ko() { return t('tabExplore'); }, icon: 'shovel' }, { id: 'trophies', get ko() { return t('tabTrophies'); }, icon: 'trophy' },
  { id: 'challenges', get ko() { return t('tabChallenges'); }, icon: 'star' }, { id: 'events', get ko() { return t('tabEvents'); }, icon: 'flag' },
  { id: 'stats', get ko() { return t('tabStats'); }, icon: 'book' },
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
      if (off.gained.gt(0)) setTimeout(() => modal('다녀오셨군요', `<p>${fmtTime(off.seconds)} 동안 왕국이 일했어요.</p><p class="t-lg gold" style="text-align:center">+${F(off.gained)} {coin}</p>`), 50);
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
    <div class="res"><span title="${t('gem')}"><img class="ic" src="${spriteURL('legend')}" alt="${t('gem')}"><b id="gems">0</b></span>
      <span title="${t('assistant')}"><img class="ic" src="${spriteURL('ghost')}" alt="${t('assistant')}"><b id="assist">0</b></span>
      <span title="${t('ruby')}"><img class="ic" src="${spriteURL('candy')}" alt="${t('ruby')}"><b id="rubies">0</b></span></div>
    <button class="round" id="btn-settings" style="width:30px;height:30px" aria-label="설정"><img class="ic" src="${spriteURL('gear')}" alt=""></button>
  </header>
  <div class="manabar" role="progressbar" id="manabar"><div class="fill" id="mana-fill"></div><span class="label shadow-text" id="mana-text"></span></div>
  <div class="spellrow" id="spells"></div>
  <div class="map" id="map">
    <canvas class="realm" id="realm"></canvas>
    <button class="tap" id="tap" aria-label="왕국 두드리기"></button>
    <div class="dust" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i * 0.7) % 6}s;animation-duration:${5 + (i % 4)}s"></i>`).join('')}</div>
    <div class="floaters" id="floaters"></div>
    <div class="effects" id="effects"></div>
    <div class="autocast">
      <button class="round" id="ac-gold" aria-pressed="false" aria-label="자동 시전 1순위 지정"><img class="ic" src="${spriteURL('coin')}" alt=""><span class="lbl shadow-text">${t('autocast1')}</span></button>
      <button class="round" id="ac-silver" aria-pressed="false" aria-label="자동 시전 2순위 지정" style="margin-top:8px"><img class="ic" src="${spriteURL('mana')}" alt=""><span class="lbl shadow-text">${t('autocast2')}</span></button>
      <button class="round" id="ac-thr" aria-label="자동 시전 시작 {mana}" style="margin-top:8px"><img class="ic" src="${spriteURL('hourglass')}" alt=""><span class="lbl shadow-text" id="ac-thr-l">0%</span></button>
    </div>
    <button class="corner left" id="btn-scry"><span class="round"><img class="ic2" src="${spriteURL('orb', 2)}" alt=""></span><span class="shadow-text">${t('scry')}</span></button>
    <div class="ribbon shadow-text" id="ribbon">${t('tabBuildings')}</div>
    <button class="btn accent sm buyall" id="buyall">${t('buyAll')}</button>
    <button class="corner right" id="btn-shop"><span class="round"><img class="ic2" src="${spriteURL('bag', 2)}" alt=""></span><span class="shadow-text">${t('shop')}</span></button>
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
  const scale = Math.max(1, Math.round(Math.max((box.width * dpr) / MAP_W, (box.height * dpr) / MAP_H)));
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
  if (r.coin) floater(`+1 ${COIN_KO[r.coin]} {fcShort}`, ev.clientX - box.left, ev.clientY - box.top - 16, 'coin');
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
        toast(`🔮 ${SPELL_BY_ID[id].ko}${r.gained ? ` +${F(r.gained)} {coin}` : ''}${r.coins ? ` +${r.coins} {fcShort}` : ''}`);
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
  modal(sp.ko, `<p>${esc(sp.desc)}</p><p>{mana} ${sp.mana}${sp.duration ? ` · ${sp.duration}초` : ' · 즉시'}</p>`, [
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
  toast(`{mana}이 ${S.autocastThreshold * 100}% 이상일 때부터 자동 시전`);
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
  if (tab === 'explore') return renderExplore(p);
  if (tab === 'challenges') return renderChallenges(p);
  const key = tab;
  if (key === panelKey) return;
  panelKey = key;
  const msg: Record<string, string> = {
    explore: '{excavation}(발굴)는 첫 <b>{reincarnate}(환생)</b> 이후에 열려요.',
    challenges: '{challenge}(도전)는 <b>{reincarnate}(환생)</b> 이후에 열려요.',
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
  if (u.kind === 'alignment' || u.kind === 'heritage' || u.kind === 'bloodline' || u.kind === 'merc') return framedIcon(u.icon, u.color!, u.kind === 'merc' ? 'silver' : 'gold');
  return framedIcon(u.icon, '#3a3040', 'plain');
}
function costHTML(u: E.UpgradeView) {
  const parts = [`<span class="gold"><img class="ic" src="${spriteURL('coin')}" alt=""> ${F(u.cost)}</span>`];
  for (const [k, v] of Object.entries(u.fcCost ?? {})) parts.push(`<span><i style="display:inline-block;width:8px;height:8px;background:${COIN_COLOR[k as CoinType]}"></i> ${COIN_KO[k as CoinType]} {fcShort} ${v}</span>`);
  return `<div class="cost">${parts.join('')}</div>`;
}
function mercPicker(u: E.UpgradeView) {
  if (u.id === 'merc_spell') {
    if (S.run.mercSpell) { modal(esc(u.ko), `<p>${esc(u.desc)}</p>`); return; }
    const list = E.mercSpellCandidates(S);
    const layer = modal('마법 계약', `<p>주문 하나를 골라요. {coin} ${F(E.MERC.spellCoins)} + 그 진영 {fcShort} ${E.MERC.spellFC}개</p>
      <table class="dtable">${list.map((sp) => `<tr><td><b>${esc(sp.ko)}</b><br><span class="dim">${esc(sp.desc)}</span></td><td><button class="btn primary sm" data-sp="${sp.id}">선택</button></td></tr>`).join('')}</table>`, [{ label: '닫기', cls: 'accent' }]);
    layer.querySelectorAll<HTMLButtonElement>('[data-sp]').forEach((b) => { b.onclick = () => { closeModal(); toast(E.buyMercSpell(S, b.dataset.sp!) ? '🔮 마법 계약 완료' : '{coin}나 {fcShort}이 부족해요'); spellKey = ''; panelKey = ''; }; });
    return;
  }
  if (S.run.mercPicks[u.id]) { modal(esc(u.ko), `<p>${esc(u.desc)}</p><p class="gold">계약함</p>`); return; }
  const [, t, k] = u.id.match(/merc_t(\d)_(\d)/)!.map(Number);
  const list = E.mercCandidates(S, u.id);
  const layer = modal('계약 개선 고르기', `<p>${t}단계 진영 개선 하나를 골라요. 그 진영 {fcShort} ${E.mercSlotFC(t, k)}개</p>
    <table class="dtable">${list.map((x) => `<tr><td><b>${esc(x.ko)}</b> <span class="dim">(${FACTION_BY_ID[x.faction].ko})</span><br><span class="dim">${esc(x.desc)}</span></td><td><button class="btn primary sm" data-u="${x.id}">선택</button></td></tr>`).join('')}</table>`, [{ label: '닫기', cls: 'accent' }]);
  layer.querySelectorAll<HTMLButtonElement>('[data-u]').forEach((b) => { b.onclick = () => { closeModal(); toast(E.buyMercPick(S, u.id, b.dataset.u!) ? '✍ 계약했어요' : '{fcShort}이 부족해요'); panelKey = ''; }; });
}
function showUpgrade(id: string) {
  const u = E.allUpgrades(S).find((x) => x.id === id); if (!u) return;
  if (u.kind === 'merc') { mercPicker(u); return; }
  modal(esc(u.ko), `<div class="head"><img src="${upgradeIcon(u)}" alt=""><p>${esc(u.desc)}</p></div>${u.purchased ? '<p class="gold">구매함</p>' : costHTML(u)}`,
    u.purchased ? [{ label: '닫기' }] : [{ label: '구매', disabled: !u.affordable, run: () => { if (E.buyUpgrade(S, id, Date.now())) { toast('✨ ' + esc(u.ko)); if (u.kind === 'alignment') { panelKey = ''; drawMap(true); } } } }, { label: '닫기', cls: 'accent' }]);
}
let upCollapsed = { todo: false, done: true };
function renderUpgrades(p: HTMLElement) {
  const ups = E.allUpgrades(S);
  const todo = ups.filter((u) => !u.purchased).sort((a, b) => (a.cost.lt(b.cost) ? -1 : 1));
  const done = ups.filter((u) => u.purchased);
  const gems = E.gemsOnAbdicate(S);
  const key = 'u' + todo.map((u) => u.id).join() + '|' + done.length + JSON.stringify(upCollapsed) + (S.run.faction ?? '') + JSON.stringify(S.run.mercPicks) + S.run.mercSpell;
  if (key !== panelKey) {
    panelKey = key;
    p.innerHTML = `<div class="uppanel">
      <div class="coincol" id="coincol">${COIN_TYPES.map((c) => `<span class="fc" data-c="${c}"><i style="background:${COIN_COLOR[c]}"></i><b></b></span>`).join('')}
        <button class="btn accent sm" id="btn-ex" style="margin-top:4px;padding:0 4px" ${E.canExchange(S) ? '' : 'disabled'}>${t('exchange')}</button></div>
      <div>
        <div class="uptop"><button class="btn primary sm" id="btn-abd"></button><button class="btn special sm" id="btn-rei"></button></div>
        <section class="gsection"><header>미구매 개선 (${todo.length}) <button data-c="todo">${upCollapsed.todo ? '▼' : '▲'}</button></header>
          ${upCollapsed.todo ? '' : todo.length ? `<div class="ugrid">${todo.map((u) => `<button class="uslot" data-id="${u.id}"><img src="${upgradeIcon(u)}" alt="${esc(u.ko)}"></button>`).join('')}</div>` : '<div class="empty">지금 살 수 있는 개선이 없어요.</div>'}</section>
        <section class="gsection"><header>구매한 개선 (${done.length}) <button data-c="done">${upCollapsed.done ? '▼' : '▲'}</button></header>
          ${upCollapsed.done ? '' : `<div class="ugrid">${done.map((u) => `<button class="uslot" data-id="${u.id}"><img src="${upgradeIcon(u)}" alt="${esc(u.ko)}"></button>`).join('')}</div>`}</section>
      </div></div>`;
    p.querySelectorAll<HTMLButtonElement>('.uslot').forEach((b) => { b.onclick = () => showUpgrade(b.dataset.id!); });
    p.querySelectorAll<HTMLButtonElement>('.gsection header button').forEach((b) => { b.onclick = () => { const c = b.dataset.c as 'todo' | 'done'; upCollapsed = { ...upCollapsed, [c]: !upCollapsed[c] }; renderPanel(); }; });
    $('#btn-abd', p).onclick = abdicateFlow;
    $('#btn-ex', p).onclick = exchangeFlow;
    $('#btn-rei', p).onclick = reincarnateFlow;
  }
  const abd = $<HTMLButtonElement>('#btn-abd', p);
  abd.textContent = `${t('abdicate')} +${F(gems)} ${t('gem')}`; abd.disabled = gems.lt(1);
  const rei = $<HTMLButtonElement>('#btn-rei', p);
  if (E.ascensionDue(S)) {
    rei.textContent = E.canAscend(S) ? `${t('ascend')} A${S.perm.ascensions + 1}` : `${t('ascend')} (${t('gem')} ${F(E.reincarnationCost(S))})`;
    rei.disabled = !E.canAscend(S);
  } else {
    rei.textContent = E.canReincarnate(S) ? `${t('reincarnate')} R${S.perm.reincarnations + 1}` : `${t('reincarnate')} (${t('gem')} ${F(E.reincarnationCost(S))})`;
    rei.disabled = !E.canReincarnate(S);
  }
  p.querySelectorAll<HTMLElement>('.fc').forEach((e) => { const v = S.run.fc[e.dataset.c as CoinType]; $('b', e).textContent = F(v); e.classList.toggle('zero', v === 0); });
  const byId = new Map(todo.map((u) => [u.id, u]));
  p.querySelectorAll<HTMLButtonElement>('.uslot').forEach((b) => {
    const u = byId.get(b.dataset.id!); if (!u) return;
    b.classList.toggle('can', u.affordable); b.classList.toggle('cant', !u.affordable);
  });
}
function abdicateFlow() {
  const g = E.gemsOnAbdicate(S);
  modal('{abdicate}', `<p>지금까지의 {coin}·건물·개선·성향·진영·{fc}을 내려놓고 처음부터 다시 써요.</p>
    <p>얻는 {gem}: <b class="gold">${F(g)}</b> (보유 ${F(S.gems)})\n{gem} 1개당 생산 +2%. {trophy}은 남아요.</p>`, [
    { label: '{abdicate}', disabled: g.lt(1), run: () => { const got = E.abdicate(S, Date.now()); save(); panelKey = ''; spellKey = ''; drawMap(true); toast(`🌟 {gem} ${F(got)}개를 얻었어요`); } },
    { label: '취소', cls: 'accent' }]);
}
function exchangeFlow() {
  const draw = () => {
    const rows = COIN_TYPES.map((c) => `<tr><td><i style="display:inline-block;width:8px;height:8px;background:${COIN_COLOR[c]}"></i> ${COIN_KO[c]} (${F(S.run.fc[c])})</td>
      <td>${S.run.exchanges[c] ?? 0}회</td><td>${E.exchangeCost(S, c)}</td><td><button class="btn accent sm" data-c="${c}" ${S.run.fc[c] < E.exchangeCost(S, c) ? 'disabled' : ''}>계약</button></td></tr>`).join('');
    const layer = modal('{exchange}', `<p>{fc}으로 계약을 맺으면 모든 건물 생산이 영구히(이번 판) 늘어요. 계약 1회당 +${Math.round(E.snapshot(S, Date.now()).mods.exchangeBonus * 100)}%.</p>
      <table class="dtable"><tr><th>{fcShort}</th><th>계약</th><th>비용</th><th></th></tr>${rows}</table><p>총 계약 ${E.totalExchanges(S)}회</p>`, [{ label: '닫기' }]);
    layer.querySelectorAll<HTMLButtonElement>('.dtable button').forEach((b) => { b.onclick = () => { E.royalExchange(S, b.dataset.c as CoinType); draw(); }; });
  };
  draw();
}

function renderTrophies(p: HTMLElement) {
  const key = 't' + S.trophies.length;
  if (key === panelKey) return;
  panelKey = key;
  p.innerHTML = `<div class="t-sm" style="text-align:center">{trophy} ${S.trophies.length} / ${TROPHIES.length}</div>
    <section class="gsection"><header>전체 {trophy}</header><div class="tgrid">${TROPHIES.map((t) => {
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
    ['이번 판 {coin}', F(S.run.coinsRun)], ['두드리기로 번 {coin}', F(S.run.coinsByClick)], ['두드리기 1회', F(E.clickReward(S, snap))],
    ['{fc} 발견 확률', (E.fcChance(S, snap) * 100).toFixed(1) + '%'], ['{assistant}', String(snap.assistants)],
    ['{mana} 회복', snap.manaRegen.toFixed(2) + '/초'], ['{mana} 최대', String(snap.manaMax)],
    ['성향', S.run.alignment ? { bright: '{alignBright}', dark: '{alignDark}', legend: '{alignLegend}' }[S.run.alignment] : '-'],
    ['진영', S.run.faction ? FACTION_BY_ID[S.run.faction].ko : '-'],
    ['이번 판 시간', fmtTime((Date.now() - S.run.start) / 1000)], ['누적 {coin}', F(S.stats.totalCoins)], ['최고 판 {coin}', F(Decimal.max(S.stats.bestRun, S.run.coinsRun))],
    ['{gem}', F(S.gems)], ['{abdicate}', String(S.stats.abdications)], ['총 두드리기', F(S.stats.clicks)], ['총 주문', F(S.stats.spells)],
  ];
  rows.unshift(['{reincarnate}', 'R' + S.perm.reincarnations], ['{ascend}', 'A' + S.perm.ascensions]);
  const R = S.perm.reincarnations;
  const perks = REINCARNATION_PERKS.map((x) => `<li class="${R >= x.r ? '' : 'dim'}">R${x.r}: ${esc(x.ko)}</li>`).join('');
  const rp = E.researchPoints(S);
  const research = R < UNLOCKS.research ? `<p class="dim">{research}는 R${UNLOCKS.research}부터 열려요.</p>`
    : `<p>{researchPoint} ${rp.free} / ${rp.total}</p><table class="dtable">${FACILITIES.map((f) => `<tr><td>${f.ko}<br><span class="dim">${f.factions.map((x) => FACTION_BY_ID[x].ko).join(', ')}</span></td>
      <td>${S.perm.research[f.id] ?? 0}점 · +${Math.round(facilityBonus(S.perm.research[f.id] ?? 0) * 100)}%</td>
      <td><button class="btn accent sm" data-r="${f.id}" data-d="-1">−</button> <button class="btn primary sm" data-r="${f.id}" data-d="1" ${rp.free < 1 ? 'disabled' : ''}>+</button></td></tr>
      <tr><td colspan="3"><div class="rchips"><span class="dim">칸 ${E.researchSlotsUsed(S, f.id)}/${researchSlots(R)}</span>${RESEARCH_UPGRADES.filter((x) => x.facility === f.id).map((x) => {
        const on = S.perm.researchActive.includes(x.id), open = E.researchUnlocked(S, x.id);
        return `<button class="rchip ${on ? 'on' : open ? '' : 'locked'}" data-ru="${x.id}" title="${x.desc}">${open ? x.ko : x.rp + '점'}</button>`; }).join('')}</div></td></tr>`).join('')}</table>`;
  const key = 's' + rp.free + JSON.stringify(S.perm.research) + R + S.perm.researchActive.join();
  const html = `<section class="gsection"><header>기록</header><dl class="stats" style="padding:6px">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></section>
    <section class="gsection"><header>{research} (연구)</header><div style="padding:6px">${research}</div></section>
    <section class="gsection"><header>{reincarnationPower} (환생 보너스)</header><ul style="margin:6px;padding-left:16px">${perks}</ul></section>`;
  if (panelKey !== key) {
    const st = p.scrollTop; panelKey = key; p.innerHTML = html; p.scrollTop = st;
    p.querySelectorAll<HTMLButtonElement>('[data-r]').forEach((b) => { b.onclick = () => { E.assignResearch(S, b.dataset.r!, +b.dataset.d! as 1 | -1); panelKey = ''; renderPanel(); }; });
    p.querySelectorAll<HTMLButtonElement>('[data-ru]').forEach((b) => { b.onclick = () => {
      const x = RESEARCH_UPGRADES.find((r) => r.id === b.dataset.ru)!;
      if (!E.researchUnlocked(S, x.id)) { toast(`${x.ko}: 이 시설에 {researchPoint} ${x.rp}점이 필요해요`); return; }
      if (!E.toggleResearch(S, x.id)) toast('칸이 가득 찼어요. 다른 연구를 빼 주세요'); else toast(`${S.perm.researchActive.includes(x.id) ? '✔' : '✖'} ${x.ko}: ${x.desc}`);
      panelKey = ''; renderPanel(); }; });
  } else { const dl = $('dl.stats', p); if (dl) dl.innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join(''); }
}

// ------------------------------------------------------------ reincarnation, excavation, challenges
function reincarnateFlow() {
  if (E.ascensionDue(S)) { ascendFlow(); return; }
  modal('{reincarnate} (환생)', `<p>지금까지 모은 {gem}·건물·{fc}·발굴 기록을 모두 내려놓고 {reincarnate}를 시작해요.
{trophy}·{challenge}·유물·{ruby}·연구는 남아요.</p><p class="gold">{reincarnationPower}이 R${S.perm.reincarnations + 1}로 강해져요.</p>`, [
    { label: '{reincarnate} 시작', cls: 'special', disabled: !E.canReincarnate(S), run: () => { E.reincarnate(S, Date.now()); save(); reset(); toast(`📚 {reincarnate} R${S.perm.reincarnations} 시작!`); } },
    { label: '취소', cls: 'accent' }]);
}
function ascendFlow() {
  const A = S.perm.ascensions + 1;
  setCurrencyTier(A); const next = t('coin'); setCurrencyTier(A - 1);
  modal(`{ascend} ${A}`, `<p>{reincarnate}처럼 모두 내려놓되, {reincarnate} 횟수(R${S.perm.reincarnations})는 그대로 이어져요.</p>
<p>새 화폐 <b class="gold">${next}</b>가 생기고, {coin}로 사던 개선은 모두 무료가 돼요.
대신 모든 생산 보너스가 훨씬 작은 범위로 조정돼요 (배율 x → x^0.1).
건물 가격 증가율은 1.15 → 1.03으로 줄어요.</p>`, [
    { label: `{ascend} ${A}`, cls: 'special', disabled: !E.canAscend(S), run: () => { E.ascend(S, Date.now()); setCurrencyTier(S.perm.ascensions); save(); reset(); toast(`✨ {ascend} ${S.perm.ascensions}! 이제 {coin}의 시대예요`); } },
    { label: '취소', cls: 'accent' }]);
}
const ART_ICONS = ['book', 'flag', 'gear', 'book', 'mana', 'trophy', 'orb', 'hourglass', 'leaf', 'legend', 'mask', 'star', 'leaf', 'orb', 'book', 'sun'];
function renderExplore(p: HTMLElement) {
  const key = 'x' + S.perm.archaeology + S.perm.excavations + S.perm.artifacts.length + (S.gems.gte(ARCHAEOLOGY.gems) ? 1 : 0);
  if (key !== panelKey) {
    panelKey = key;
    if (!S.perm.archaeology) {
      const can = S.gems.gte(ARCHAEOLOGY.gems);
      p.innerHTML = `<div class="locked-panel"><img class="ic2" src="${spriteURL('shovel', 2)}" alt=""><p>{excavation}단을 꾸리면 책 속 깊은 곳을 발굴해 {fc}·{ruby}·유물을 찾을 수 있어요.</p>
        <p class="${can ? '' : 'dim'}">조건: {gem} ${F(ARCHAEOLOGY.gems)}개 · 비용 {coin} ${F(ARCHAEOLOGY.cost)}</p>
        <button class="btn primary" id="arch" ${can ? '' : 'disabled'}>탐사단 꾸리기</button></div>`;
      const b = $<HTMLButtonElement>('#arch', p); if (b) b.onclick = () => { if (E.buyArchaeology(S)) toast('⛏ {excavation}단을 꾸렸어요'); else toast('{coin}가 부족해요'); panelKey = ''; renderPanel(); };
    } else {
      p.innerHTML = `<div class="t-sm" style="text-align:center">탐사 깊이 ${S.perm.excavations}</div>
        <div class="uptop" style="margin-top:6px"><button class="btn primary sm" id="dig1">발굴</button><button class="btn primary sm" id="dig10">10회</button>
          <button class="btn accent sm" id="digreset">깊이 초기화 ({ruby} ${1 + Math.floor(S.perm.excavations / 3000)})</button></div>
        <p class="dim" style="text-align:center;margin:2px" id="digcost"></p>
        <section class="gsection"><header>유물 (${S.perm.artifacts.length}/${ARTIFACTS.length})</header><div class="tgrid">${ARTIFACTS.map((a, i) => {
          const got = S.perm.artifacts.includes(a.id);
          return `<button class="tslot ${got ? '' : 'locked'}" data-a="${a.id}"><img src="${framedIcon(ART_ICONS[i % ART_ICONS.length], '#5a4630', got ? 'gold' : 'plain')}" alt=""></button>`; }).join('')}</div></section>`;
      const dig = (n: number) => {
        const r = E.excavate(S, n);
        if (!r) { toast('{coin}가 부족해요'); return; }
        const bits = [r.coins ? `{fcShort} +${F(r.coins)}` : '', r.rubies ? `{ruby} +${r.rubies}` : '', ...r.artifacts.map((a) => `유물: ${esc(a.ko)}`)].filter(Boolean);
        toast('⛏ ' + (bits.join(' · ') || '아무것도 나오지 않았어요'));
        panelKey = ''; renderPanel();
      };
      $('#dig1', p).onclick = () => dig(1); $('#dig10', p).onclick = () => dig(10);
      $('#digreset', p).onclick = () => { toast(E.resetExcavations(S) ? '탐사 깊이를 처음으로 되돌렸어요' : '{ruby}이 부족해요'); panelKey = ''; renderPanel(); };
      p.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((b) => { b.onclick = () => {
        const a = ARTIFACTS.find((x) => x.id === b.dataset.a)!, got = S.perm.artifacts.includes(a.id);
        modal(got ? esc(a.ko) : '???', `<p>${got ? esc(a.desc) : a.at ? `탐사 깊이 ${a.at}에서 발견` : '깊은 곳(100 이후)에서 드물게 발견'}</p>`); }; });
    }
  }
  const c = $('#digcost', p);
  if (c) { c.textContent = `1회 ${F(E.nextExcavationCost(S, 1))} · 10회 ${F(E.nextExcavationCost(S, 10))} {coin}`;
    $<HTMLButtonElement>('#dig1', p).disabled = S.run.coins.lt(E.nextExcavationCost(S, 1)); $<HTMLButtonElement>('#dig10', p).disabled = S.run.coins.lt(E.nextExcavationCost(S, 10)); }
}
function renderChallenges(p: HTMLElement) {
  const key = 'c' + S.perm.challenges.length + S.perm.reincarnations;
  if (key === panelKey) return;
  panelKey = key;
  if (S.perm.reincarnations < UNLOCKS.challenges) {
    p.innerHTML = `<div class="locked-panel"><img class="ic2" src="${spriteURL('star', 2)}" alt=""><p>{challenge}(도전)는 <b>{reincarnate} R${UNLOCKS.challenges}</b>부터 열려요.</p></div>`; return;
  }
  const groups = FACTIONS.filter((f) => CHALLENGES.some((c) => c.faction === f.id)).map((f) => {
    const list = CHALLENGES.filter((c) => c.faction === f.id);
    return `<section class="gsection"><header>${f.ko} (${list.filter((c) => S.perm.challenges.includes(c.id)).length}/${list.length})</header><div class="tgrid">${list.map((c) => {
      const done = S.perm.challenges.includes(c.id), open = E.challengeAvailable(S, c);
      return `<button class="tslot ${done ? '' : 'locked'}" data-c="${c.id}" style="${open && !done ? 'outline:2px dashed var(--c-gold-ink)' : ''}"><img src="${framedIcon(f.emblem, f.color, done ? 'gold' : 'plain')}" alt=""></button>`; }).join('')}</div></section>`;
  }).join('');
  p.innerHTML = `<p class="dim" style="margin:2px 4px">해당 진영으로 플레이하는 동안 조건을 채우면 완료돼요. 보상은 그 진영일 때 적용돼요.</p>${groups}`;
  p.querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) => { b.onclick = () => {
    const c = CHALLENGES.find((x) => x.id === b.dataset.c)!, done = S.perm.challenges.includes(c.id), open = E.challengeAvailable(S, c);
    modal(esc(c.ko), `<p>${open || done ? esc(c.clue) : `R${c.minR} 이후, 앞 단계를 마치면 열려요.`}</p><p class="gold">보상: ${esc(c.reward)}</p><p>${done ? '완료!' : '진행 중'}</p>`); }; });
}

// ------------------------------------------------------------ settings, scry, shop
$('#btn-settings').onclick = () => {
  const layer = modal('설정', `<div class="settings-grid">
    <div class="row"><span>숫자 표기</span><label class="check"><input type="radio" name="nf" value="short" ${S.settings.numberFormat === 'short' ? 'checked' : ''}> 짧은 이름</label>
      <label class="check"><input type="radio" name="nf" value="scientific" ${S.settings.numberFormat === 'scientific' ? 'checked' : ''}> 과학 표기</label></div>
    <div class="row"><button class="btn primary sm" id="s-save">저장</button><button class="btn accent sm" id="s-export">내보내기</button><button class="btn accent sm" id="s-import">불러오기</button></div>
    <textarea id="s-code" rows="3" placeholder="저장 코드"></textarea>
    <div class="row"><button class="btn danger sm" id="s-reset">모든 기록 초기화</button></div>
    ${ADMIN ? '<div class="row"><a class="btn accent sm" style="display:inline-flex;align-items:center;text-decoration:none" href="./admin.html">관리자 패널</a></div>' : ''}
    <p class="dim">Talestopia Tycoon v0.4 · 글꼴 갈무리(OFL)</p></div>`, [{ label: '닫기' }]);
  layer.querySelectorAll<HTMLInputElement>('input[name=nf]').forEach((i) => { i.onchange = () => { S.settings.numberFormat = i.value as 'short'; panelKey = ''; }; });
  $('#s-save', layer).onclick = () => toast(save() ? '💾 저장했어요' : '이 브라우저에서는 저장할 수 없어요');
  $('#s-export', layer).onclick = () => { const c = btoa(unescape(encodeURIComponent(serialize(S)))); ($('#s-code', layer) as HTMLTextAreaElement).value = c; navigator.clipboard?.writeText(c).then(() => toast('📋 복사했어요'), () => {}); };
  $('#s-import', layer).onclick = () => {
    try { const t = deserialize(decodeURIComponent(escape(atob(($('#s-code', layer) as HTMLTextAreaElement).value.trim()))), Date.now()); S = t; S.lastSeen = Date.now(); save(); reset(); toast('📖 불러왔어요'); closeModal(); }
    catch { toast('저장 코드가 올바르지 않아요'); }
  };
  $('#s-reset', layer).onclick = () => modal('정말 초기화할까요?', '<p>{gem}과 {trophy}까지 모두 사라져요. 되돌릴 수 없어요.</p>', [
    { label: '초기화', cls: 'danger', run: () => { S = newGame(Date.now()); save(); reset(); } }, { label: '취소', cls: 'accent' }]);
};
$('#btn-scry').onclick = () => modal('점술', '<p>수정구로 앞날을 엿보고 4시간 동안 이어지는 축복 하나를 고를 수 있어요.\n(광고 연동 후 열려요)</p>');
$('#btn-shop').onclick = () => modal('상점', '<p>{ruby}과 특별 상품은 정식 출시 때 열려요.</p>');

function reset() { panelKey = ''; spellKey = ''; mapKey = ''; drawMap(true); renderPanel(); }

// ------------------------------------------------------------ top bar + loop
function renderTop(now: number) {
  setCurrencyTier(S.perm.ascensions);
  const snap = E.snapshot(S, now);
  $('#coins').textContent = F(S.run.coins);
  $('#cps').textContent = F(E.totalCps(S, snap)) + ' /초';
  document.title = t('gameTitle');
  $('#gems').textContent = F(S.gems);
  $('#assist').textContent = String(snap.assistants);
  $('#rubies').textContent = String(S.perm.rubies);
  $('#mana-fill').style.width = Math.min(100, (S.run.mana / snap.manaMax) * 100) + '%';
  $('#mana-text').textContent = `${t('mana')} ${Math.floor(S.run.mana)} / ${snap.manaMax} · +${snap.manaRegen.toFixed(1)}/초`;
  $('#ac-thr-l').textContent = Math.round(S.autocastThreshold * 100) + '%';
  const fx: string[] = [];
  if (S.run.alignment) fx.push({ bright: '☀ ' + t('alignBright'), dark: '☾ ' + t('alignDark'), legend: '⌛ ' + t('alignLegend') }[S.run.alignment]);
  if (S.run.faction) fx.push(FACTION_BY_ID[S.run.faction].ko);
  if (S.run.prestige) fx.push('+ ' + FACTION_BY_ID[S.run.prestige].ko);
  if (S.run.bloodline) fx.push('혈통: ' + FACTION_BY_ID[S.run.bloodline].ko);
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
    for (const t of E.checkTrophies(S)) toast(`🏅 {trophy}: ${esc(t.ko)}`);
    for (const c of E.checkChallenges(S, now)) toast(`📜 {challenge} 완료: ${esc(c.ko)}`);
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
  else { const off = E.applyOffline(S, Date.now()); if (off.gained.gt(0)) toast(`자리를 비운 사이 +${F(off.gained)} {coin}`); }
});
window.addEventListener('pagehide', save);
// debug helpers for testing in the browser console
(window as unknown as { tt: unknown }).tt = { get S() { return S; }, E, FACTIONS };
