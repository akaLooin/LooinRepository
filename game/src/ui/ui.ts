// DOM 기반 UI. 게임 상태를 읽어 HTML을 만들고, data-act 속성으로 동작을 위임 처리한다.
// 모양은 전부 components.css 의 부품(ui-*)과 tokens.css 의 역할 토큰으로 그린다.
import { AfkReport, afkRates } from '../core/afk';
import {
  ATTACK_SLOTS, CARD_SLOTS, CLASS_NPC, NPCS, TALENT, TELEPORTS_MAX, WORLD1, ANVIL, CARDS, CLASSES, GROUP_NAMES, PRODUCTS, SHOP, STACK_BASE, stackGroup, CLASS_LEVEL, ClassId, EquipSlot, HAIR_COLORS, HAIR_STYLES, ITEMS, MAPS, MAX_CHARACTERS,
  MONSTERS, NODES, OUTFIT_COLORS, RECIPES, SKILL_NAMES, SKIN_COLORS, SLOT_NAMES, STAT_DESC,
  STAT_NAMES, SkillKey, StatKey, TALENTS, BaseClass, SUBCLASS_LEVEL, TALENT_PRESET_LV, baseClass, classLine, canSubclass, cardNext, cardTier, QuestDef, ARENA, arenaWaves, MINIBOSSES, SMELTS, FORGE, STATUES, SIGNS, SIGN_LV, ACHIEVEMENTS, FAMILY, FAMILY_SLOTS, CARD_SETS, CARD_PRESET_LV, STAMPS, STAMP_NAMES, STAMP_LV, StampCat, StampDef, BRIBES,
} from '../core/data';
import {
  Character, Look, acceptQuest, advanceClass, canCraft, completeQuest, countItem, craft, currentQuest, derive, equipItem,
  mapUnlocked, refillTeleports, anvilCap, anvilPointsFree, anvilRate, anvilSlotsOpen, equipCard, recipeLock, unequipCard, buy, collectAnvil, deposit, depositAll, haveMat, invSize, setProduct, shopLeft, spendAnvilPoint,
  stackCap, storageCount, storageSize, useItem, withdraw, dmgTaken, hitChance, learnTalent, questProgress, sellItem, setFood, skillXpToNext, spendStat, unequipItem, xpToNext,
  minibossOpen,
} from '../core/state';
import { WorldEvent } from '../core/world';
import { STARS, achieveReady, charSlots, familyBest, familyLevel, familyValue, setStars, setTier, statueLevel } from '../core/progress';
import { MERITS, MeritEff, TASKS, TASK_BY_ID, TASK_GROUP_NAMES, TaskGroup, meritCost, meritLv, taskDone } from '../core/tasks';
import { STAMP_BY_ID, stampCost, stampValue, stampsOpen } from '../core/stamps';
import { ForgeUp, forgeBonus, forgeCap, forgeProgress, forgeSettle, forgeSlotsOpen, forgeUpCost, forgeUpMaxed, smeltSeconds } from '../core/forge';
import { Game } from '../game';
import { ITEM_ICON, iconUrl, portraitUrl } from '../render/sprites';
import type { Audio } from '../audio';
import { pixelIcon } from './icons';

type Panel = 'afk' | 'items' | 'char' | 'codex' | 'map' | 'chat' | 'menu' | 'anvil' | 'npc' | 'storage' | 'shop' | 'afkinfo' | 'forge' | 'stamps' | 'tasks' | 'statues' | 'arena' | null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** 아이콘 그림(메뉴·특성·능력치 등 ui_/tl_/st_ 접두사) */
const ui = (key: string, cls = 'ic') => `<img class="px ${cls}" src="${iconUrl(key)}" alt="">`;
/** 아이콘 칸 + 숫자 배지(글자 대신). tone: ok(초록) / bad(빨강) */
const tile = (src: string, badge: string | number, label: string, cls = '', tone = '') =>
  `<span class="ui-slot sm ${cls}" title="${label}" aria-label="${label}"><img class="px" src="${src}" alt="">${badge !== '' ? `<span class="qty ${tone}">${badge}</span>` : ''}</span>`;
/** 퀘스트 목표 아이콘 칸(진행도 배지) */
const goalTile = (q: QuestDef, have: number | null, cls = '') => {
  const g = q.goal, kill = 'kill' in g;
  const src = kill ? iconUrl(`mob_${g.kill}`) : iconUrl(ITEM_ICON[g.item]);
  const label = kill ? `${MONSTERS[g.kill].name} ${g.n}마리 처치` : `${ITEMS[g.item].name} ${g.n}개`;
  return tile(src, have === null ? `×${g.n}` : `${Math.min(have, g.n)}/${g.n}`, label, cls, have === null ? '' : have >= g.n ? 'ok' : '');
};
/** 퀘스트 보상 아이콘 칸들 */
const rewardTiles = (r: QuestDef['reward']) => [
  r.coins ? tile(iconUrl(ITEM_ICON.coin), r.coins, `코인 ${r.coins}`) : '',
  r.xp ? tile(iconUrl('ui_xp'), r.xp, `경험치 ${r.xp}`) : '',
  r.item ? tile(iconUrl(ITEM_ICON[r.item]), '', ITEMS[r.item].name, 'r2') : '',
].join('');
const icon = (id: string) => `<img class="px" src="${iconUrl(ITEM_ICON[id])}" alt="">`;
const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / b) * 100)).toFixed(1)}%`;
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : `${Math.floor(s / 60)}분`);
const STAT_LABEL: Record<string, string> = { dmg: '공격력', def: '방어력', hp: '체력', str: '힘', agi: '민첩', wis: '지혜', luk: '행운', mining: '채광', chopping: '벌목' };
const statLine = (id: string) => Object.entries(ITEMS[id].stats ?? {}).map(([k, v]) => `${STAT_LABEL[k]} +${v}`).join(', ');

/** 게이지 */
const bar = (kind: string, value: number, max: number, text: string) =>
  `<div class="ui-bar ${kind}" role="progressbar" aria-valuenow="${Math.round(value)}" aria-valuemax="${Math.round(max)}"><i style="width:${pct(value, max)}"></i><span>${text}</span></div>`;
/** 탭 줄 */
const tabs = (names: string[], cur: number, act: string, icons: string[] = []) =>
  `<div class="ui-tabs" role="tablist">${names.map((n, i) => `<button role="tab" aria-selected="${i === cur}" data-act="${act}:${i}">${icons[i] ? ui(icons[i], 'tic') : ''}<span>${n}</span></button>`).join('')}</div>`;

/** 카드 이름·그림: 몬스터 카드는 몬스터, 자원 카드는 그 자원에서 나오는 아이템 그림 */
const cardName = (id: string) => MONSTERS[id]?.name ?? NODES[id]?.name ?? id;
const cardIcon = (id: string) => (MONSTERS[id] ? iconUrl(`mob_${id}`) : iconUrl(ITEM_ICON[NODES[id]?.item] ?? 'ui_lock'));

export class UI {
  private root = document.getElementById('ui')!;
  audio: Audio | null = null;
  private panel: Panel = null;
  private tab: Partial<Record<Exclude<Panel, null> | 'talentTab', number>> = {};
  private sel: string | null = null;      // 가방에서 선택한 아이템
  private afk: AfkReport | null = null;
  private craftSel = -1;
  private forgeSel = 0;
  private arenaResult: { waves: number; score: number } | null = null;
  private stampSel = '';
  /** 대화 중인 NPC, 생산 칸 선택 */
  private npcId = 'elder';
  /** 하단 바가 공격 바로 바뀌어 있는지, 공격 바에 놓으려고 고른 특성, 특성 화면에서 고른 특성 */
  private attackMode = false;
  private assigning: string | null = null;
  private talentSel: string | null = null;
  private drag: { id: string; ghost: HTMLElement } | null = null;
  private prodSlot = 0;
  private creating = false;
  private draft: { name: string; look: Look } = this.randomDraft();
  private last: Record<string, string> = {};

  constructor(private game: Game) {
    this.root.classList.add('ui');
    this.root.innerHTML = `
      <div id="quest" class="hidden"></div>
      <button id="where" class="hidden" data-act="open:afkinfo" aria-label="방치 정보"></button>
      <div id="bossbar" class="hidden"></div>
      <div id="skills" class="hidden"></div>
      <div id="toasts" aria-live="polite"></div>
      <div id="modal" class="hidden"></div>
      <div id="bottom" class="ui-bottom hidden"><div id="bsum" class="ui-summary"></div><div id="bgauge" class="ui-gauges"></div><nav id="bmenu" class="ui-menu" aria-label="메뉴"></nav></div>
      <div id="title"></div>`;
    this.root.addEventListener('click', (e) => this.onClick(e));
    // 스킬 버튼은 누르는 즉시 발동
    this.root.addEventListener('pointerdown', (e) => {
      const sk = (e.target as HTMLElement).closest<HTMLElement>('[data-bslot]');
      if (sk) { e.preventDefault(); this.pressSlot(+sk.dataset.bslot!); return; }
      // 특성 그림을 끌어 공격 바에 놓기
      const tal = (e.target as HTMLElement).closest<HTMLElement>('[data-tal]');
      if (tal && TALENT[tal.dataset.tal!]?.active && (this.game.char?.talents[tal.dataset.tal!] ?? 0) > 0) { e.preventDefault(); this.startDrag(tal.dataset.tal!, e as PointerEvent); }
    });
    this.root.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.id === 'cname') this.draft.name = t.value;
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    // 그림은 브라우저 기본 끌기를 막는다(우리 끌어 놓기를 취소시키므로)
    this.root.addEventListener('dragstart', (e) => e.preventDefault());
    addEventListener('pointermove', (e) => { if (this.drag) { this.drag.ghost.style.left = `${e.clientX}px`; this.drag.ghost.style.top = `${e.clientY}px`; } });
    addEventListener('pointerup', (e) => this.endDrag(e));
    // PC 단축키: Q 공격 바, 1~6 시전
    addEventListener('keydown', (e) => {
      if (document.activeElement instanceof HTMLInputElement || !this.game.world) return;
      if (e.key === 'q' || e.key === 'Q') { this.attackMode = !this.attackMode; this.refresh(); }
      else if (/^[1-6]$/.test(e.key)) this.pressSlot(+e.key - 1);
    });
    this.root.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = document.getElementById('chatin') as HTMLInputElement | null;
      const text = inp?.value.trim();
      if (inp && text) { this.game.say(text); inp.value = ''; }
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.panel && this.panel !== 'afk') { this.panel = null; this.refresh(); }
    });

    game.onWorld = () => this.refresh(true);
    game.onAfk = (r) => { this.afk = r; this.panel = 'afk'; this.refresh(true); };
    setInterval(() => this.refresh(), 200);
    this.refresh(true);
  }

  private randomDraft() {
    const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    return { name: '', look: { hair: Math.floor(Math.random() * HAIR_STYLES), hairColor: pick(HAIR_COLORS), skin: SKIN_COLORS[0], outfit: pick(OUTFIT_COLORS) } };
  }

  private $(id: string) { return document.getElementById(id)!; }
  /** 내용이 바뀐 경우에만 DOM 갱신(누르는 도중 버튼이 교체되는 것 방지) */
  private put(id: string, html: string) {
    if (this.last[id] === html) return;
    this.last[id] = html;
    this.$(id).innerHTML = html;
  }
  private show(id: string, on: boolean) { this.$(id).classList.toggle('hidden', !on); }

  toast(text: string, item?: string) {
    const box = this.$('toasts');
    const d = document.createElement('div');
    d.className = 'ui-toast';
    d.innerHTML = (item ? icon(item) : '') + esc(text);
    box.appendChild(d);
    while (box.children.length > 5) box.firstChild!.remove();
    setTimeout(() => d.remove(), 2600);
  }

  /** 다른 사람의 채팅: 채팅 창이 닫혀 있으면 알림으로 */
  onChat(l: { id?: string; from: string; text: string }) {
    if (this.panel !== 'chat' && l.id !== this.game.liveId) this.toast(`${l.from}: ${l.text}`);
  }

  onEvent(e: WorldEvent) {
    if (e.t === 'loot') this.toast(e.text, e.item ?? (e.text.includes('코인') ? 'coin' : undefined));
    else if (e.t === 'level') this.toast(`레벨 업! Lv.${e.level} (능력치 +3, 특성 +1)`);
    else if (e.t === 'skill') this.toast(`${e.name} 레벨 업! Lv.${e.level}`);
    else if (e.t === 'arrive' && e.what === 'fac') { const f = this.game.world?.map.facilities[e.idx]; if (f) { this.npcId = f.npc ?? 'elder'; this.open(f.kind); this.refresh(true); } }
    else if (e.t === 'respawn') this.toast('마을에서 다시 깨어났습니다');
    else if (e.t === 'boss') this.toast(`${e.name}을(를) 쓰러뜨렸습니다!`);
    else if (e.t === 'faint') this.toast(this.game.world?.arena ? '쓰러졌습니다! 콜로세움이 끝났습니다' : '쓰러졌습니다... 잠시 후 부활합니다');
    else if (e.t === 'miniboss') this.toast(`${e.name}을(를) 쓰러뜨렸습니다!`);
    else if (e.t === 'arenaEnd') { this.arenaResult = { waves: e.waves, score: e.score }; this.panel = 'arena'; this.refresh(true); }
  }

  private open(p: Panel) { this.panel = p; this.sel = null; this.craftSel = -1; }

  // ───────── 렌더 ─────────
  refresh(force = false) {
    if (force) this.last = {};
    const g = this.game, c = g.char, w = g.world;
    const playing = !!c && !!w;
    for (const id of ['bottom', 'quest', 'where']) this.show(id, playing);
    this.show('skills', false);
    this.show('title', !playing);
    if (!playing) {
      this.show('modal', false); this.put('title', this.titleHtml());
      const nm = document.getElementById('cname') as HTMLInputElement | null;
      if (nm && nm.value !== this.draft.name) nm.value = this.draft.name;
      return;
    }

    // 하단 바: 요약 | 게이지 | 메뉴 버튼 줄
    const d = w.d, need = xpToNext(c.level);
    const menu: [string, string, string, boolean?][] = [
      ['auto', '자동', 'auto'], ['attacks', '공격', 'atk'], ['items', '아이템', 'open:items'],
      ['talents', '특성', 'open:char', c.statPoints > 0 || c.talentPoints > 0], ['codex', '도감', 'open:codex', Object.keys(NPCS).some((n) => questProgress(c, n)?.done)],
      ['map', '지도', 'open:map'], ['chat', '채팅', 'open:chat'], ['menu', '메뉴', 'open:menu'],
    ];
    // 요약·게이지·버튼을 따로 갱신한다: 체력·마나가 차오를 때 버튼이 다시 만들어져 터치가 씹히지 않도록
    this.put('bsum', `<div class="face"><img class="px" src="${portraitUrl(c.look)}" alt=""></div>
      <div class="who"><b>${esc(c.name)}</b><span class="ui-muted">${CLASSES[c.cls].name}</span><span class="ui-accent">Lv.${c.level}</span></div>`);
    this.put('bgauge', `<label aria-label="체력">${ui('ui_heart', 'gic')}</label>${bar('hp', c.hp, d.maxHp, `${Math.ceil(c.hp)} / ${d.maxHp}`)}
      <label aria-label="마나">${ui('ui_mana', 'gic')}</label>${bar('mp', c.mp, d.maxMp, `${Math.floor(c.mp)} / ${d.maxMp}`)}
      <label aria-label="경험치">${ui('ui_xp', 'gic')}</label>${bar('xp', c.xp, need, `${c.xp.toLocaleString()} / ${need.toLocaleString()}`)}`);
    if (this.attackMode || this.assigning) this.put('bmenu', this.attackBarHtml(c));
    else this.put('bmenu', menu.map(([ic, label, act, dot]) => {
      const on = act === 'auto' ? c.auto : this.panel === act.slice(5);
      return `<button class="ui-menubtn ${on ? 'on' : ''}" data-act="${act}" aria-label="${label}${dot ? ' (새 항목)' : ''}" ${act === 'auto' ? `aria-pressed="${c.auto}"` : ''}>${ui(`ui_${ic}`, 'mi')}<span>${label}</span>${dot ? '<i class="dot"></i>' : ''}</button>`;
    }).join(''));

    const act = w.map.boss ? '보스전' : c.activity.k === 'gather' ? `${NODES[c.activity.node].name} 채집` : w.map.spawns.length ? '사냥' : '휴식';
    this.put('where', `<div class="ui-sm">${w.map.name} <span class="ui-muted">· ${act} ⓘ</span></div><div class="ui-accent">${icon('coin')} ${g.acc.coins.toLocaleString()}</div>`);
    // 보스 체력 바
    const boss = w.mobs.find((m) => (m.def.boss || m.def.scale) && m.alive && !w.arena);
    this.show('bossbar', !!boss);
    if (boss) this.put('bossbar', `<b>${boss.def.name}</b>${bar('hp', boss.hp, boss.def.hp, `${Math.max(0, Math.ceil(boss.hp)).toLocaleString()} / ${boss.def.hp.toLocaleString()}`)}`);

    if (this.panel === 'arena' && !w.arena) { this.panel = null; this.arenaResult = null; }
    // 진행 중인 퀘스트를 NPC마다 한 줄씩
    const lines: string[] = [];
    if (w.arena) {
      const a = w.arena;
      lines.push(`<b class="ui-accent">콜로세움</b> 웨이브 ${Math.min(a.wave, ARENA.waves.length)}/${ARENA.waves.length} · 남은 시간 ${Math.max(0, Math.ceil(a.t))}초`);
      lines.push(`점수 <b>${Math.round(a.score).toLocaleString()}</b>${a.mult > 1 ? ` <span class="ui-accent">×${a.mult.toFixed(1)}</span>` : ''} · 깬 웨이브 ${arenaWaves(a.kills)}`);
    }
    const mbs = MINIBOSSES.filter((m) => minibossOpen(g.acc, m.id, Date.now()));
    if (mbs.length && !w.arena) lines.push(`<span class="ui-accent">⚔ ${mbs.map((m) => `${MONSTERS[m.id].name}(${MAPS[m.map].name})`).join(', ')} 출현 중</span>`);
    if (canSubclass(c)) lines.push(`<span class="ui-accent">★ 2차 전직 가능! 마을의 ${NPCS[CLASS_NPC].name}을(를) 찾아가세요</span>`);
    if (c.cls === 'beginner' && c.level >= CLASS_LEVEL) lines.push(`<span class="ui-accent">★ 전직 가능! 마을의 ${NPCS[CLASS_NPC].name}을(를) 찾아가세요</span>`);
    for (const n of Object.values(NPCS)) {
      const q = currentQuest(c, n.id), qp = questProgress(c, n.id);
      if (q && qp && c.quests[n.id]?.accepted) lines.push(`<span class="${qp.done ? 'ui-good' : ''}">${q.name} ${qp.done ? `— 완료! ${n.name}에게` : `${qp.have}/${qp.need}`}</span>`);
    }
    if (!lines.length && w.map.id === 'town' && currentQuest(c, 'elder')) lines.push(`<span class="ui-muted">마을 사람들에게 말을 걸어 보세요</span>`);
    this.put('quest', lines.join('<br>'));

    this.show('modal', !!this.panel);
    if (this.panel) this.put('modal', this.panelHtml(c));
    if (this.panel === 'chat' && document.getElementById('chatlog')) {
      const log = g.chat.map((l) => `<div><b class="${l.id === g.liveId ? 'ui-accent' : ''}">${esc(l.from)}</b> ${esc(l.text)}</div>`).join('') || '<span class="ui-muted">아직 대화가 없습니다.</span>';
      if (this.last.chatlog !== log) {
        this.put('chatlog', log);
        const el = document.getElementById('chatlog')!; el.scrollTop = el.scrollHeight;
      }
    }
  }

  private titleHtml(): string {
    const acc = this.game.acc;
    if (this.creating || acc.characters.length === 0) {
      const l = this.draft.look;
      const sw = (label: string, key: 'hairColor' | 'skin' | 'outfit', list: string[]) =>
        `<div class="sw"><span class="ui-sm ui-muted">${label}</span>${list.map((col) => `<button class="chip" data-act="look:${key}:${col}" aria-label="${label} ${col}" aria-pressed="${l[key] === col}" style="background:${col}"></button>`).join('')}</div>`;
      return `<h1>LOOIN IDLE</h1>
        <div class="ui-win creator"><header><h2>새 캐릭터</h2></header><div class="body">
          <div class="pv"><img class="px" src="${portraitUrl(l)}" alt="미리보기"></div>
          <div class="opts">
            <label class="ui-sm ui-muted" for="cname">이름</label>
            <input id="cname" class="ui-input" maxlength="10" placeholder="최대 10자" autocomplete="off">
            ${sw('몸 색', 'skin', SKIN_COLORS)}
            <p class="ui-xs ui-muted">겉모습은 장비로 꾸며집니다.</p>
            <div class="ui-row">${acc.characters.length ? '<button class="ui-btn" data-act="cancelCreate">취소</button>' : ''}
              <span class="ui-grow"></span><button class="ui-btn primary" data-act="create">모험 시작!</button></div>
          </div></div></div>`;
    }
    const now = Date.now();
    const cards = acc.characters.map((c, i) => {
      const map = MAPS[c.mapId], away = Math.floor((now - c.lastActive) / 1000);
      const st = c.activity.k === 'gather' && map.nodes.some((n) => n.node === (c.activity as { node: string }).node) ? '채집 중' : map.spawns.length ? '사냥 중' : '휴식 중';
      return `<button class="charcard" data-act="select:${i}" aria-label="${esc(c.name)} 레벨 ${c.level} 선택">
        <img class="px" src="${portraitUrl(c.look)}" alt="">
        <b>${esc(c.name)}</b><span class="ui-sm ui-accent">Lv.${c.level} ${CLASSES[c.cls].name}</span>
        <span class="ui-xs ui-muted">${map.name}</span>
        <span class="ui-xs ui-good">${st}${away >= 60 ? ` · ${dur(away)}` : ''}</span></button>`;
    }).join('');
    const slots = charSlots(acc), nextLv = FAMILY_SLOTS.find((n) => familyLevel(acc) < n);
    const add = (acc.characters.length < slots ? `<button class="charcard new" data-act="newChar"><span class="ui-xl">＋</span><span>새 캐릭터</span></button>` : '')
      + (slots < MAX_CHARACTERS && nextLv ? `<div class="charcard locked"><span class="ui-xl">🔒</span><span class="ui-xs ui-muted">가족 레벨 ${nextLv}</span></div>` : '');
    return `<h1>LOOIN IDLE</h1><div class="ui-sm ui-muted">캐릭터를 선택하세요 — 선택하지 않은 캐릭터는 계속 방치 성장합니다</div><div class="cards">${cards}${add}</div>`;
  }

  private panelHtml(c: Character): string {
    const g = this.game;
    const win = (title: string, body: string, close = true) =>
      `<div class="ui-win" role="dialog" aria-labelledby="wtitle"><header><h2 id="wtitle">${title}</h2>${close ? '<button class="ui-btn sm" data-act="close" aria-label="닫기">✕</button>' : ''}</header><div class="body">${body}</div></div>`;
    const tab = this.tab[this.panel!] ?? 0;
    const tabAct = `tab:${this.panel}`;

    switch (this.panel) {
      case 'afk': {
        const r = this.afk;
        if (!r) return '';
        const what = r.mode === 'fight' ? '사냥했습니다' : r.mode === 'gather' ? '채집했습니다' : '쉬었습니다';
        const kv: string[] = [];
        if (r.kills) kv.push(`<span>처치</span><span>${r.kills.toLocaleString()}</span>`);
        if (r.xp) kv.push(`<span>경험치</span><span>+${r.xp.toLocaleString()}</span>`);
        if (r.coins) kv.push(`<span>코인</span><span>+${r.coins.toLocaleString()}</span>`);
        if (r.levels) kv.push(`<span>레벨 업</span><span>+${r.levels}</span>`);
        if (r.skill) kv.push(`<span>${r.skill.name} 경험치</span><span>+${r.skill.xp.toLocaleString()}</span>`);
        if (r.skill?.levels) kv.push(`<span>${r.skill.name} 레벨</span><span>+${r.skill.levels}</span>`);
        const got = r.items.map((i) => `<div class="ui-slot" aria-label="${i.name} ${i.qty}개">${icon(i.id)}<span class="qty">${i.qty.toLocaleString()}</span></div>`).join('');
        return win('방치 보상', `
          <p><b>${esc(c.name)}</b>이(가) <span class="ui-accent">${dur(r.seconds)}</span> 동안 <b>${r.mapName}</b>에서 ${what}.</p>
          ${kv.length ? `<div class="ui-kv">${kv.join('')}</div>` : ''}
          ${got ? `<h3>획득한 아이템</h3><div class="ui-grid">${got}</div>` : ''}
          ${r.cards.length ? `<p class="ui-accent">${r.cards.map((k) => `★ ${k.name} 카드 ×${k.qty}`).join(' · ')}</p>` : ''}
          ${r.anvil ? `<p class="ui-sm">모루에서 ${r.anvil.items.map((x) => `${ITEMS[x.item].name} ${x.made}개`).join(', ')}를 만들었습니다${r.anvil.levels ? ` (대장 레벨 +${r.anvil.levels})` : ''}.</p>` : ''}
          ${r.food ? `<p class="ui-sm ui-muted">음식 ${r.food}개를 먹었습니다.</p>` : ''}
          ${r.lost ? `<p class="ui-sm ui-bad">가방 칸이나 한 칸 최대치가 모자라 아이템 ${r.lost.toLocaleString()}개를 잃었습니다. 창고에 맡기거나 주머니를 쓰세요.</p>` : ''}
          <button class="ui-btn primary block" data-act="close">받기</button>`, false);
      }

      case 'items': {
        const eq = (Object.keys(SLOT_NAMES) as EquipSlot[]).map((s) => {
          const id = c.equipment[s];
          return `<button class="ui-slot eqslot" data-act="pick:eq:${s}" aria-selected="${this.sel === `eq:${s}`}" aria-label="${SLOT_NAMES[s]}${id ? `: ${ITEMS[id].name}` : ' (비어 있음)'}">${id ? icon(id) : ui(`eq_${s}`, 'sil')}</button>`;
        }).join('');
        const food = c.foods.map((f, i) => `<button class="ui-slot ${f ? '' : 'empty'}" data-act="pick:food:${i}" aria-selected="${this.sel === `food:${i}`}" aria-label="음식 칸 ${i + 1}${f ? `: ${ITEMS[f.id].name} ${f.qty}개` : ' (비어 있음)'}">${f ? `${icon(f.id)}<span class="qty">${f.qty}</span>` : ui('eq_food', 'sil')}</button>`).join('');
        let cells = '';
        for (let i = 0; i < Math.max(invSize(c), c.inventory.length); i++) {
          const s = c.inventory[i];
          cells += s ? `<button class="ui-slot ${s.qty >= stackCap(c, s.id) ? 'r4' : ''}" data-act="pick:${s.id}" aria-selected="${this.sel === s.id}" aria-label="${ITEMS[s.id].name} ${s.qty}개">${icon(s.id)}${s.qty > 1 ? `<span class="qty">${s.qty}</span>` : ''}</button>`
            : '<div class="ui-slot empty"></div>';
        }
        let detail = `${ui('ui_items', 'bigic')}<span class="ui-sm ui-muted">칸을 누르면 정보와 할 수 있는 일이 나옵니다.</span>`;
        if (this.sel?.startsWith('food:')) {
          const fi = +this.sel.slice(5), f = c.foods[fi];
          detail = f ? `<div class="ui-row"><span class="ui-slot">${icon(f.id)}</span><div><b>${ITEMS[f.id].name}</b><div class="ui-xs ui-muted">음식 칸 · ${f.qty}개</div></div></div>
            <span class="ui-sm">${ITEMS[f.id].desc}</span><span class="ui-xs ui-muted">체력이 45% 아래로 떨어지면 자동으로 하나씩 먹습니다.</span>
            <button class="ui-btn" data-act="food::${fi}">가방으로</button>` : '<span class="ui-sm ui-muted">음식을 넣어 두면 체력이 낮을 때 위 칸부터 자동으로 먹습니다.</span>';
        } else if (this.sel?.startsWith('eq:')) {
          const slot = this.sel.slice(3) as EquipSlot, id = c.equipment[slot];
          if (id) detail = `<div class="ui-row"><span class="ui-slot">${icon(id)}</span><div><b>${ITEMS[id].name}</b><div class="ui-xs ui-muted">${SLOT_NAMES[slot]} · 장착 중</div></div></div>
            <span class="ui-sm">${ITEMS[id].desc}</span><span class="ui-sm ui-good">${statLine(id)}</span>
            <button class="ui-btn" data-act="unequip:${slot}">해제</button>`;
        } else if (this.sel && countItem(c, this.sel)) {
          const it = ITEMS[this.sel], n = countItem(c, this.sel);
          detail = `<div class="ui-row"><span class="ui-slot">${icon(it.id)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${it.slot ? SLOT_NAMES[it.slot] : GROUP_NAMES[stackGroup(it.id)]} · ${n} / ${stackCap(c, it.id)}개</div></div></div>
            <span class="ui-sm">${it.desc}</span>
            ${it.stats ? `<span class="ui-sm ui-good">${statLine(it.id)}</span>` : ''}
            ${it.reqLv ? `<span class="ui-xs ${c.level >= it.reqLv ? 'ui-muted' : 'ui-bad'}">Lv.${it.reqLv} 필요</span>` : ''}
            <div class="ui-row" style="flex-wrap:wrap">${it.slot ? `<button class="ui-btn success iconbtn" data-act="equip:${it.id}">${ui(`eq_${it.slot}`, 'tic')} 장착</button>` : ''}${it.kind === 'food' ? `<button class="ui-btn success iconbtn" data-act="food:${it.id}">${ui('eq_food', 'tic')} 음식 칸</button>` : ''}${['bag', 'pouch', 'chest'].includes(it.kind) ? `<button class="ui-btn success iconbtn" data-act="use:${it.id}">${ui('ui_up', 'tic')} 사용</button>` : ''}
              <button class="ui-btn sm iconbtn" data-act="sell:${it.id}:1">${ui('ui_coin', 'tic')} ${it.sell}</button>
              ${n > 1 ? `<button class="ui-btn sm iconbtn" data-act="sell:${it.id}:${n}">${ui('ui_coin', 'tic')} 전부 ${it.sell * n}</button>` : ''}</div>`;
        }
        return win(`아이템 <span class="ui-sm ui-muted">${c.inventory.length}/${invSize(c)}</span>`, `
          <div class="split"><div><h3>${ui('ui_items', 'tic')} 장비 · 음식</h3><div class="ui-grid eq">${eq}${food}</div><h3>${ui('ui_items', 'tic')} 가방</h3><div class="ui-grid bag">${cells}</div></div>
          <div class="ui-detail">${detail}</div></div>`);
      }

      case 'char': {
        // 탭: 능력치 / 초보자 특성 / 직업 특성(원작처럼 단계별). 왼쪽 깃발로 공격 바 지정
        // 계보: 초보자 → 1차 → 2차. 탭은 능력치 + 계보마다 하나(아직 없는 단계는 잠김)
        const line = classLine(c.cls), base = baseClass(c.cls), sub = line[2];
        const hasCls = base !== 'beginner';
        const names = [`능력치${c.statPoints ? ` ${c.statPoints}` : ''}`, '초보자', hasCls ? CLASSES[base].name : '직업', sub ? CLASSES[sub].name : '2차 직업'];
        const t = (tab === 2 && !hasCls) || (tab === 3 && !sub) ? 1 : tab;
        const body = t === 0 ? this.statsHtml(c) : this.talentsHtml(c, t === 1 ? 'beginner' : t === 2 ? base : sub!);
        const baseIcon = hasCls ? `tl_${base === 'warrior' ? 'cleave' : base === 'archer' ? 'volley' : 'nova'}` : 'ui_lock';
        const subIcon = sub ? `tl_${TALENTS.find((x) => x.cls === sub)!.id}` : 'ui_lock';
        return win(`특성 <span class="ui-sm ui-muted">포인트</span> <b class="ui-accent">${c.talentPoints}</b>`, `${tabs(names, t, tabAct, ['st_str', 'ui_talents', baseIcon, subIcon])}
          ${t > 0 && c.level >= TALENT_PRESET_LV ? `<div class="ui-row" style="justify-content:flex-end"><span class="ui-xs ui-muted">특성 프리셋</span>${c.talentPresets.map((_, i) => `<button class="ui-btn sm ${i === c.talentPreset ? 'primary' : ''}" data-act="tpre:${i}">${i + 1}</button>`).join('')}</div>` : ''}
          <div class="ui-tabpanel talentpanel">${t > 0 ? `<button class="assignflag ${this.assigning !== null || this.attackMode ? 'on' : ''}" data-act="flag" aria-label="공격 지정">${ui('ui_assign', 'mi')}<span>공격<br>지정</span></button>` : ''}${body}</div>`);
      }

      case 'codex': {
        let body = '';
        if (tab === 0) {
          const slots = c.cardSlots.map((id, i) => id
            ? `<button class="ui-slot r3" data-act="cardoff:${i}" aria-label="${cardName(id)} 카드 빼기"><img class="px" src="${cardIcon(id)}" alt=""></button>`
            : `<div class="ui-slot empty" aria-label="빈 카드 칸"></div>`).join('');
          body = `<h3 style="margin-top:0">장착 ${c.cardSlots.filter(Boolean).length}/${CARD_SLOTS} <span class="ui-xs ui-muted">— 장착한 카드만 효과가 있습니다(캐릭터마다)</span></h3><div class="ui-grid">${slots}</div><h3>수집</h3>` + CARDS.map((cd) => {
            const n = g.acc.cards[cd.id] ?? 0, tier = cardTier(n), next = cardNext(n), on = c.cardSlots.includes(cd.id);
            const free = c.cardSlots.indexOf(null);
            const btn = !n ? '' : on ? `<button class="ui-btn sm" data-act="cardoff:${c.cardSlots.indexOf(cd.id)}">빼기</button>`
              : `<button class="ui-btn sm primary" data-act="cardon:${cd.id}" ${free >= 0 ? '' : 'disabled'}>장착</button>`;
            return `<div class="ui-row line"><span class="ui-slot ${tier >= 3 ? 'r4' : tier === 2 ? 'r3' : tier === 1 ? 'r2' : 'locked'}"><img class="px" style="${n ? '' : 'filter:brightness(0)'}" src="${cardIcon(cd.id)}" alt=""></span>
              <div class="ui-grow"><b>${n ? cardName(cd.id) : '???'}</b> <span class="ui-xs ui-muted">${cd.from === 'node' ? '자원' : '몬스터'}</span> <span class="ui-accent">${'★'.repeat(tier)}${'☆'.repeat(3 - tier)}</span>
              <div class="ui-sm ${on ? 'ui-good' : 'ui-muted'}">${cd.label} +${Math.round(cd.per * Math.max(1, tier) * 100)}%${on ? ' (적용 중)' : ''}</div>
              <div class="ui-xs ui-muted">${next ? `보유 ${n} / 다음 단계 ${next}` : `보유 ${n} · 최고 단계`}</div></div>${btn}</div>`;
          }).join('') + '<p class="ui-xs ui-muted">몬스터 카드는 사냥할 때, 자원 카드는 나무·광맥을 캘 때 드물게 나옵니다. 모은 카드는 모든 캐릭터가 함께 쓰고, 장착은 캐릭터마다 따로 합니다.</p>';
        } else {
          // NPC마다 퀘스트 사슬을 아이콘 칸으로: 끝낸 것 ✓, 지금 것 진행도, 남은 것 잠금
          body = Object.values(NPCS).map((n) => {
            const st = c.quests[n.id] ?? { idx: 0, accepted: false, prog: 0 };
            const pr = questProgress(c, n.id), cur = n.quests[st.idx];
            const chain = n.quests.map((q, i) => i < st.idx ? goalTile(q, q.goal.n, 'ready done')
              : i === st.idx ? goalTile(q, st.accepted ? pr!.have : null, st.accepted ? 'cur' : 'cur new')
              : '<span class="ui-slot sm locked" aria-label="잠긴 퀘스트"></span>').join('<span class="qlink" aria-hidden="true"></span>');
            const now = cur ? `<b>${cur.name}</b> ${st.accepted ? '' : '<span class="ui-xs ui-accent">!</span>'}` : '<span class="ui-good">모두 완료</span>';
            return `<div class="qnpc"><span class="qface"><img class="px" src="${portraitUrl(n.look)}" alt=""></span><div class="ui-grow"><div class="ui-sm">${n.name} <span class="ui-xs ui-muted">${Math.min(st.idx, n.quests.length)}/${n.quests.length}</span> · ${now}</div>
              <div class="qchain">${chain}</div></div></div>`;
          }).join('');
        }
        if (tab === 0) body = this.cardExtrasHtml(c) + body;
        if (tab === 2) body = this.starsHtml(c);
        if (tab === 3) body = this.achieveHtml();
        if (tab === 4) body = this.familyHtml();
        if (tab === 5) body = this.quickRefHtml();
        const achReady = ACHIEVEMENTS.some((d) => achieveReady(g.acc, d.id));
        return win('도감', `${tabs(['카드', '퀘스트', '별자리', `업적${achReady ? ' !' : ''}`, '가족', '빠른 참조'], tab, tabAct, ['ui_card', 'ui_quest', 'ui_star', 'ui_trophy', 'ui_family', 'ui_quick'])}<div class="ui-tabpanel">${body}</div>`);
      }

      case 'map': {
        // 열린 맵을 누르면 순간이동(마을은 무료, 나머지는 하루 무료 횟수). 보스방은 숲 끝 문으로
        refillTeleports(g.acc, Date.now());
        const nodes = WORLD1.map((id) => {
          const m = MAPS[id], here = c.mapId === id, open = mapUnlocked(c, id);
          const gate = m.portals.find((p) => p.reqKills && !p.key && WORLD1.includes(p.to));
          const sub = here ? '현재 위치' : !open ? '잠김' : m.spawns.length ? `처치 ${(c.kills[id] ?? 0).toLocaleString()}${gate ? `/${gate.reqKills}` : ''}` : '무료';
          const art = m.spawns.length ? iconUrl(`mob_${m.spawns[0].monster}`) : iconUrl('ui_teleport');
          return `<button class="mapnode ${here ? 'here' : ''} ${open ? '' : 'locked'}" data-act="tp:${id}" ${open && !here ? '' : 'disabled'} aria-label="${m.name}로 순간이동">
            <img class="px" src="${open ? art : iconUrl('ui_lock')}" alt=""><b>${open ? m.name : '???'}</b><span class="ui-xs ${here ? 'ui-accent' : 'ui-muted'}">${sub}</span></button>`;
        }).join('<span class="mapline"></span>');
        const lair = `<span class="mapline"></span><div class="mapnode ${c.mapId === 'lair' ? 'here' : ''} ${mapUnlocked(c, 'forest') ? '' : 'locked'}"><img class="px" src="${iconUrl('mob_mossking')}" alt=""><b>${MAPS.lair.name}</b><span class="ui-xs ui-muted">${g.acc.bosses.mossking ? `처치 ${g.acc.bosses.mossking}회` : '숲 끝 문 · 열쇠'}</span></div>`;
        const next = g.acc.bosses.mossking ? '<span class="mapline"></span><div class="mapnode locked"><img class="px" src="' + iconUrl('ui_lock') + '" alt=""><b>2월드</b><span class="ui-xs ui-muted">준비 중</span></div>' : '';
        return win(`지도 <span class="ui-sm">${ui('ui_teleport', 'tic')} ${g.acc.teleports.n}/${TELEPORTS_MAX}</span>`, `<div class="mapchain">${nodes}${lair}${next}</div>
          <p class="ui-xs ui-muted">열린 맵을 누르면 바로 이동합니다. 마을은 언제나 무료이고, 다른 맵은 하루마다 무료 이동 횟수가 쌓입니다.</p>`);
      }

      case 'chat':
        // 입력칸은 그대로 두고 대화 목록만 따로 갱신한다(쓰는 중에 글이 지워지지 않도록)
        if (g.netState !== 'online') return win('채팅', '<p class="ui-muted">채팅은 서버에 연결되어 있을 때 쓸 수 있습니다.</p>');
        return win('채팅 <span class="ui-xs ui-muted">모든 맵</span>', `<div id="chatlog" class="chatlog" aria-live="polite"></div>
          <form class="ui-row" data-chat style="margin-top:var(--sp-3)"><input id="chatin" class="ui-input ui-grow" maxlength="120" placeholder="할 말을 입력하세요" autocomplete="off" aria-label="채팅 입력">
          <button class="ui-btn primary" type="submit">보내기</button></form>`);

      case 'menu': {
        const row = (ic: string, label: string, act: string, extra = '') => `<button class="menurow" data-act="${act}">${ui(ic, 'mi')}<span class="ui-grow">${label}</span>${extra}</button>`;
        const tog = (on: boolean) => `<span class="pill ${on ? 'on' : ''}">${on ? '켜짐' : '꺼짐'}</span>`;
        return win('메뉴', `<div class="menulist">
          ${row('ui_afk', '방치 정보', 'open:afkinfo')}
          ${row('ui_swap', '캐릭터 바꾸기', 'chars')}
          <h3>${ui('ui_options', 'tic')} 옵션 <span class="ui-xs ui-muted">(모든 캐릭터 공용)</span></h3>
          ${row('ui_attacks', '자동 중 공격 사용', 'opt:autoAttacks', tog(g.acc.options.autoAttacks))}
          ${row('ui_sound', '효과음', 'sfx', tog(!!this.audio?.sfxOn))}
          ${row('ui_music', '배경음', 'bgm', tog(!!this.audio?.bgmOn))}
          <p class="ui-xs ${g.netState === 'offline' ? 'ui-bad' : 'ui-muted'}">${g.netState === 'online' ? '서버에 연결됨 — 진행은 서버에 저장됩니다.' : g.netState === 'offline' ? '서버에 연결할 수 없어 이 기기에서 진행 중입니다. 다시 연결되면 서버 기록에 맞춥니다.' : '이 기기에만 저장됩니다(서버 미설정).'}</p>
          ${row('ui_trash', '계정 삭제', 'delacc')}</div>`);
      }

      case 'npc': {
        const npc = NPCS[this.npcId] ?? NPCS.elder;
        const speaker = (body: string) => `<div class="ui-dialog" role="dialog" aria-label="${npc.name}"><div class="speaker"><div class="face"><img class="px" src="${portraitUrl(npc.look)}" alt=""></div>${npc.name}</div>
          <div class="ui-grow stack">${body}</div><button class="ui-btn sm close" data-act="close" aria-label="닫기">✕</button></div>`;
        const subs = (Object.keys(CLASSES) as ClassId[]).filter((id) => CLASSES[id].base === c.cls);
        if (npc.id === CLASS_NPC && subs.length && c.level >= SUBCLASS_LEVEL) {
          return speaker(`<p>“${CLASSES[c.cls].name}의 길을 꽤 걸었구먼. 이제 한 갈래를 더 고를 때일세.” <span class="ui-xs ui-bad">(한 번 고르면 바꿀 수 없습니다)</span></p>
            ${subs.map((id) => `<div class="ui-row line"><div class="ui-grow"><b>${CLASSES[id].name}</b><div class="ui-sm ui-muted">${CLASSES[id].desc}</div></div><button class="ui-btn primary" data-act="class:${id}">전직</button></div>`).join('')}`);
        }
        if (npc.id === CLASS_NPC && c.cls === 'beginner' && c.level >= CLASS_LEVEL) {
          return speaker(`<p>“많이 강해졌구먼! 이제 자네의 길을 정할 때일세.” <span class="ui-xs ui-bad">(한 번 고르면 바꿀 수 없습니다)</span></p>
            ${(['warrior', 'archer', 'mage'] as ClassId[]).map((id) => `<div class="ui-row line"><div class="ui-grow"><b>${CLASSES[id].name}</b><div class="ui-sm ui-muted">${CLASSES[id].desc}</div></div><button class="ui-btn primary" data-act="class:${id}">전직</button></div>`).join('')}`);
        }
        const q = currentQuest(c, npc.id), p = questProgress(c, npc.id), st = c.quests[npc.id] ?? { idx: 0, accepted: false };
        if (!q || !p) return speaker('<p>“고맙네! 지금은 부탁할 일이 없다네.”</p>');
        const btn = !st.accepted ? `<button class="ui-btn primary" data-act="qaccept:${npc.id}">수락</button>`
          : `<button class="ui-btn success" data-act="qdone:${npc.id}" ${p.done ? '' : 'disabled'}>완료</button>`;
        return speaker(`<div><b class="ui-accent">${q.name}</b> <span class="ui-xs ui-muted">${st.idx + 1}/${npc.quests.length}</span></div><p>“${q.text}”</p>
          <div class="qline">${ui('ui_quest', 'mi')}${goalTile(q, st.accepted ? p.have : null, st.accepted && p.done ? 'ready' : '')}<span class="qarrow" aria-hidden="true">▶</span>${rewardTiles(q.reward)}<span class="ui-grow"></span>${btn}</div>`);
      }

      case 'anvil': {
        // 탭: 제작 분류 4개 + 생산. 제작은 분류 탭 + 아이콘 격자 + 상세라 품목이 늘어도 길어지지 않는다.
        const groups: [string, (s?: EquipSlot) => boolean][] = [
          ['무기', (s) => s === 'weapon'], ['방어구', (s) => s === 'hat' || s === 'body'], ['도구', (s) => s === 'pickaxe' || s === 'axe'], ['기타', (s) => !s],
        ];
        const names = [...groups.map(([n]) => n), `생산${c.anvil.slots.some((sl) => sl.prod && sl.stored >= anvilCap(c)) ? ' !' : ''}`];
        if (tab === 4) return win(`모루 <span class="ui-sm ui-muted">${g.acc.anvilTier}단계 · 대장 Lv.${c.skills.smithing.lv}</span>`, `${tabs(names, tab, tabAct)}<div class="ui-tabpanel">${this.productionHtml(c)}</div>`);
        const list = RECIPES.map((r, i) => ({ r, i })).filter(({ r }) => groups[tab][1](ITEMS[r.item].slot));
        if (!list.some((x) => x.i === this.craftSel)) this.craftSel = list[0]?.i ?? -1;
        let cells = '';
        for (let n = 0; n < Math.max(12, Math.ceil(list.length / 4) * 4); n++) {
          const x = list[n];
          const lk = x && recipeLock(g.acc, c, x.i);
          cells += x ? `<button class="ui-slot ${lk ? 'locked' : canCraft(g.acc, c, x.i) ? 'ready' : 'short'}" data-act="csel:${x.i}" aria-selected="${x.i === this.craftSel}" aria-label="${ITEMS[x.r.item].name}${lk ? ` (${lk})` : ''}">${lk ? '' : icon(x.r.item)}</button>` : '<div class="ui-slot empty"></div>';
        }
        let detail = '';
        const r = RECIPES[this.craftSel];
        if (r) {
          const it = ITEMS[r.item];
          const who = it.wtype ? ` · ${Object.values(CLASSES).filter((k) => k.weapon === it.wtype && k.id !== 'beginner').map((k) => k.name).join('/')}` : '';
          // 재료: 아이콘 칸에 가진 수/필요 수(가방 + 창고)
          const mats = r.mats.map(([id, n]) => {
            const have = haveMat(g.acc, c, id), st = storageCount(g.acc, id);
            return tile(iconUrl(ITEM_ICON[id]), `${have}/${n}`, `${ITEMS[id].name} ${have}/${n}${st ? ` (창고 ${st})` : ''}`, '', have >= n ? 'ok' : 'bad');
          }).join('') + tile(iconUrl(ITEM_ICON.coin), r.coins.toLocaleString(), `코인 ${g.acc.coins}/${r.coins}`, '', g.acc.coins >= r.coins ? 'ok' : 'bad');
          detail = `<div class="ui-row"><span class="ui-slot">${icon(r.item)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${it.slot ? SLOT_NAMES[it.slot] : r.unlock ? `모루 ${r.unlock}단계 열기` : '소모품'}${r.tier && r.tier > 1 ? ` · ${r.tier}단계` : ''}${r.smithLv ? ` · 대장 Lv.${r.smithLv}` : ''}${it.reqLv ? ` · Lv.${it.reqLv}` : ''}${who}</div></div></div>
            <span class="ui-sm ${it.stats ? 'ui-good' : ''}">${it.stats ? statLine(it.id) : it.desc}</span>
            <div class="qline mats">${mats}</div>
            ${recipeLock(g.acc, c, this.craftSel) ? `<span class="ui-sm ui-bad">${recipeLock(g.acc, c, this.craftSel)}${(r.tier ?? 1) > g.acc.anvilTier ? ' — 기타 탭의 모루 확장으로 열립니다' : ''}</span>` : ''}
            <button class="ui-btn primary block" data-act="craft:${this.craftSel}" ${canCraft(g.acc, c, this.craftSel) ? '' : 'disabled'}>${r.unlock ? '확장' : '제작'}</button>
`;
        }
        return win('모루', `${tabs(names, tab, tabAct)}<div class="ui-tabpanel split"><div class="ui-grid c4">${cells}</div><div class="ui-detail">${detail}</div></div>`);
      }

      case 'storage': {
        const acc = g.acc, size = storageSize(acc);
        let top = '';
        for (let i = 0; i < Math.max(size, acc.storage.length); i++) {
          const s = acc.storage[i];
          top += s ? `<button class="ui-slot" data-act="take:${s.id}" aria-label="${ITEMS[s.id].name} ${s.qty}개 꺼내기">${icon(s.id)}<span class="qty">${s.qty.toLocaleString()}</span></button>` : '<div class="ui-slot empty"></div>';
        }
        let bag = '';
        for (let i = 0; i < invSize(c); i++) {
          const s = c.inventory[i];
          bag += s ? `<button class="ui-slot" data-act="put:${s.id}" aria-label="${ITEMS[s.id].name} ${s.qty}개 맡기기">${icon(s.id)}${s.qty > 1 ? `<span class="qty">${s.qty}</span>` : ''}</button>` : '<div class="ui-slot empty"></div>';
        }
        return win(`창고 <span class="ui-sm ui-muted">${acc.storage.length}/${size}</span>`, `
          <p class="ui-xs ui-muted">모든 캐릭터가 함께 쓰는 창고입니다. 칸을 누르면 그 아이템을 통째로 옮깁니다. 창고는 한 칸에 개수 제한이 없습니다.</p>
          <div class="ui-grid store">${top}</div>
          <div class="ui-row" style="margin:var(--sp-3) 0"><h3 class="ui-grow" style="margin:0">가방 ${c.inventory.length}/${invSize(c)}</h3><button class="ui-btn primary sm" data-act="putall">재료·음식 전부 맡기기</button></div>
          <div class="ui-grid bag">${bag}</div>`);
      }

      case 'shop': {
        const now = Date.now();
        const rows = SHOP.map((e, i) => {
          const it = ITEMS[e.item], left = shopLeft(g.acc, i, now);
          const many = e.daily >= 10 ? `<button class="ui-btn sm" data-act="buy:${i}:10" ${left >= 10 && g.acc.coins >= e.price * 10 ? '' : 'disabled'}>10개</button>` : '';
          return `<div class="ui-row line"><span class="ui-slot">${icon(e.item)}</span><div class="ui-grow"><b>${it.name}</b><div class="ui-xs ui-muted">${it.desc}</div></div>
            <div style="text-align:right"><div class="ui-accent">${icon('coin')} ${e.price.toLocaleString()}</div><div class="ui-xs ${left ? 'ui-muted' : 'ui-bad'}">오늘 ${left}/${e.daily}</div></div>
            <button class="ui-btn primary sm" data-act="buy:${i}:1" ${left && g.acc.coins >= e.price ? '' : 'disabled'}>사기</button>${many}</div>`;
        }).join('');
        return win('잡화점', `${rows}<p class="ui-xs ui-muted">판매는 아이템 창에서 합니다. 수량은 매일 다시 채워집니다.</p>`);
      }

      case 'arena': {
        const r = this.arenaResult ?? { waves: 0, score: 0 };
        const got = ARENA.rewards.filter((x) => r.waves >= x.waves);
        const tiles = got.flatMap((x) => [tile(iconUrl(ITEM_ICON.coin), x.coins.toLocaleString(), `코인 ${x.coins}`), ...x.items.map(([id, n]) => tile(iconUrl(ITEM_ICON[id]), n, `${ITEMS[id].name} ${n}개`))]).join('');
        const next = ARENA.rewards.find((x) => r.waves < x.waves);
        return win('콜로세움 결과', `<div class="stack"><div class="ui-row"><b class="ui-grow">깬 웨이브 ${r.waves}/${ARENA.waves.length}</b><span>점수 <b class="ui-accent">${r.score.toLocaleString()}</b></span></div>
          <div class="qline">${tiles || '<span class="ui-muted">받을 보상이 없습니다.</span>'}</div>
          ${next ? `<span class="ui-xs ui-muted">웨이브 ${next.waves}개를 깨면 다음 보상</span>` : ''}
          <span class="ui-xs ui-muted">최고 기록 ${Math.max(g.acc.arenaBest, r.waves)}웨이브</span>
          <button class="ui-btn primary block" data-act="arenaclaim">받고 나가기</button></div>`, false);
      }
      case 'statues': return win('석상 받침 <span class="ui-sm ui-muted">캐릭터마다</span>', this.statuesHtml(c));
      case 'tasks': {
        const groups = Object.keys(TASK_GROUP_NAMES) as TaskGroup[];
        const names = [...groups.map((k) => TASK_GROUP_NAMES[k]), '공로 상점'];
        const ready = (k: TaskGroup) => TASKS.some((t) => t.group === k && taskDone(g.acc, t.id) < t.tiers.length && t.value(g.acc) >= t.tiers[taskDone(g.acc, t.id)]);
        const body = tab === 3 ? this.meritHtml() : this.tasksHtml(groups[tab]);
        return win(`작업판 <span class="ui-sm ui-muted">계정 공용 · 공로</span> <b class="ui-accent">${g.acc.merit}</b>`, `${tabs(names.map((n, i) => (i < 3 && ready(groups[i]) ? `${n} !` : n)), tab, tabAct)}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'stamps': {
        const names = [...(['combat', 'skill', 'misc'] as StampCat[]).map((k) => STAMP_NAMES[k]), '후원'];
        const body = !stampsOpen(c) ? `<p class="ui-muted">우표함은 Lv.${STAMP_LV} 이상 캐릭터만 쓸 수 있습니다. 모은 우표는 모든 캐릭터에게 효과가 있습니다.</p>`
          : tab === 3 ? this.bribesHtml() : this.stampsHtml(c, (['combat', 'skill', 'misc'] as StampCat[])[tab]);
        return win('우표함 <span class="ui-sm ui-muted">계정 공용</span>', `${tabs(names, tab, tabAct)}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'forge': return win('용광로 <span class="ui-sm ui-muted">계정 공용</span>', this.forgeHtml(c));

      case 'afkinfo': {
        const r = afkRates(g.acc, c);
        const f = (n: number) => Math.round(n).toLocaleString();
        let body: string;
        if (r.mode === 'rest') body = '<p class="ui-muted">지금 위치에서는 방치해도 쉬기만 합니다. 사냥터로 가거나 자원을 눌러 대상을 정하세요.</p>';
        else if (r.mode === 'gather') body = `<div class="ui-kv"><span>대상</span><span>${r.target}</span><span>방치 효율</span><span>${Math.round(r.rate * 100)}%</span>
          <span>시간당 ${ITEMS[r.skill!.item].name}</span><span>${f(r.skill!.perHour)}</span><span>시간당 ${SKILL_NAMES[r.skill!.key]} 경험치</span><span>${f(r.skill!.xpPerHour)}</span></div>`;
        else body = `<div class="ui-kv"><span>대상</span><span>${r.target}</span><span>방치 효율</span><span>${Math.round(r.rate * 100)}%</span>
          <span>명중률</span><span class="${r.hit >= 1 ? 'ui-good' : r.hit > 0 ? '' : 'ui-bad'}">${Math.round(r.hit * 100)}%</span>
          <span>생존력</span><span class="${r.survival >= 1 ? 'ui-good' : 'ui-bad'}">${Math.round(r.survival * 100)}%</span>
          <span>시간당 처치</span><span>${f(r.killsPerHour)} <span class="ui-xs ui-muted">(상한 ${f(r.killCap * r.rate)})</span></span>
          <span>시간당 경험치</span><span>${f(r.xpPerHour)}</span><span>시간당 코인</span><span>${f(r.coinsPerHour)}</span>
          <span>시간당 음식</span><span>${r.foodPerHour ? f(r.foodPerHour) : '0'}</span></div>
          ${r.drops.length ? `<h3>시간당 아이템</h3><div class="ui-kv">${r.drops.map((dr) => `<span>${icon(dr.id)} ${ITEMS[dr.id].name}</span><span>${dr.perHour >= 10 ? f(dr.perHour) : dr.perHour.toFixed(1)}</span>`).join('')}</div>` : ''}
          ${r.survival < 1 ? '<p class="ui-xs ui-bad">받는 피해가 회복보다 커서 방치 중 자주 쓰러집니다. 방어력을 올리거나 음식 칸에 음식을 넣으세요.</p>' : ''}`;
        return win('방치 정보', `<p class="ui-xs ui-muted">이 캐릭터를 두고 떠나면 아래 속도로 계속 성장합니다(최대 12시간). AUTO 여부와는 상관없습니다.</p>${body}
          ${c.anvil.slots.filter((sl) => sl.prod).map((sl, i) => `<p class="ui-sm">모루 ${i + 1}번 칸: 시간당 ${ITEMS[sl.prod!].name} ${f(anvilRate(c, c.anvil.slots.indexOf(sl)))}개 (보관 ${sl.stored}/${anvilCap(c)})</p>`).join('')}`);
      }
    }
    return '';
  }

  private stampsHtml(c: Character, cat: StampCat): string {
    const acc = this.game.acc;
    const list = STAMPS.filter((s) => s.cat === cat);
    if (!list.some((s) => s.id === this.stampSel)) this.stampSel = list[0].id;
    const fmt = (s: StampDef, lv: number) => `+${(Math.round(stampValue(s, lv) * 10) / 10).toLocaleString()}${s.unit}`;
    const cells = list.map((s) => {
      const lv = acc.stamps[s.id] ?? 0, inBag = countItem(c, s.id) > 0;
      return `<button class="ui-slot ${lv ? 'r2' : inBag ? 'ready' : ''}" data-act="ssel:${s.id}" aria-selected="${s.id === this.stampSel}" aria-label="${ITEMS[s.id].name}${lv ? ` Lv.${lv}` : inBag ? ' (가방에 있음)' : ' (아직 없음)'}">
        <img class="px" style="${lv || inBag ? '' : 'filter:brightness(0) invert(.4);opacity:.6'}" src="${iconUrl(ITEM_ICON[s.id])}" alt="">${lv ? `<span class="lv">Lv.${lv}</span>` : inBag ? '<span class="qty ok">!</span>' : ''}</button>`;
    }).join('');
    const s = STAMP_BY_ID[this.stampSel], lv = acc.stamps[s.id] ?? 0;
    let detail = `<div class="ui-row"><span class="ui-slot">${icon(s.id)}</span><div><b>${ITEMS[s.id].name}</b> ${lv ? `<span class="ui-accent">Lv.${lv}</span>` : ''}<div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${s.label} ${fmt(s, Math.max(1, lv))}${lv ? ` → ${fmt(s, lv + 1)}` : ''}</div></div></div>`;
    if (!lv) {
      detail += countItem(c, s.id) ? `<button class="ui-btn primary block" data-act="sin:${s.id}">우표함에 넣기</button>`
        : `<span class="ui-xs ui-muted">아직 이 우표가 없습니다. ${SHOP.some((e) => e.item === s.id) ? '잡화점에서 팝니다.' : '몬스터가 드물게 떨어뜨립니다.'}</span>`;
    } else {
      const cost = stampCost(acc, s), mats = haveMat(acc, c, cost.mat);
      detail += `<div class="qline">${tile(iconUrl(ITEM_ICON.coin), cost.coins.toLocaleString(), `코인 ${acc.coins}/${cost.coins}`, '', acc.coins >= cost.coins ? 'ok' : 'bad')}${tile(iconUrl(ITEM_ICON[cost.mat]), `${mats}/${cost.qty}`, `${ITEMS[cost.mat].name} ${mats}/${cost.qty}`, '', mats >= cost.qty ? 'ok' : 'bad')}</div>
        <button class="ui-btn primary block" data-act="sup:${s.id}" ${acc.coins >= cost.coins && mats >= cost.qty ? '' : 'disabled'}>올리기</button>`;
    }
    return `<div class="split"><div class="ui-grid c4">${cells}</div><div class="ui-detail">${detail}</div></div>`;
  }

  private statuesHtml(c: Character): string {
    const acc = this.game.acc;
    if (!acc.statuesOpen) {
      const has = countItem(c, 'sculpt_tools') > 0;
      return `<div class="stack"><p class="ui-sm">몬스터가 떨어뜨리는 조각을 석상에 바치면 이 캐릭터의 능력치가 영구히 오릅니다. 먼저 조각 도구로 받침을 열어야 합니다.</p>
        ${has ? '<button class="ui-btn primary" data-act="sculpt">조각 도구 쓰기</button>' : '<span class="ui-xs ui-muted">조각 도구는 잡화점에서 팝니다.</span>'}</div>`;
    }
    return STATUES.map((s) => {
      const st = statueLevel(c.statues[s.id] ?? 0), n = countItem(c, s.item);
      const val = Math.round(st.lv * s.per * 10) / 10;
      return `<div class="ui-row line"><span class="ui-slot">${icon(s.item)}</span><div class="ui-grow"><b>${s.name}</b> <span class="ui-accent">Lv.${st.lv}</span>
          <span class="ui-sm ${st.lv ? 'ui-good' : 'ui-muted'}">${s.label} +${val}${s.unit} (다음 +${Math.round((st.lv + 1) * s.per * 10) / 10}${s.unit})</span>
          ${bar('skill', st.into, st.need, `${st.into} / ${st.need}`)}</div>
        <button class="ui-btn ${n ? 'primary' : ''} sm" data-act="statue:${s.id}" ${n ? '' : 'disabled'}>바치기 ${n}</button></div>`;
    }).join('') + '<p class="ui-xs ui-muted">조각은 사냥하며 드물게 얻습니다. 가방에 있는 그 조각을 모두 바칩니다.</p>';
  }

  private cardExtrasHtml(c: Character): string {
    const acc = this.game.acc;
    const sets = CARD_SETS.map((s) => {
      const stars = setStars(acc, s), t = setTier(acc, s), on = c.cardSet === s.id;
      const next = s.tiers[t];
      return `<div class="ui-row line"><div class="ui-grow"><b>${s.name}</b> <span class="ui-accent">${t}단계</span>
        <div class="ui-sm ${on && t ? 'ui-good' : 'ui-muted'}">${t ? s.label.replace(/\+%(p?)/, `+${s.v[t - 1]}%$1`) : '세트 효과 없음'}${on ? ' (켜짐)' : ''}</div>
        <div class="ui-xs ui-muted">세트 카드 별 ${stars}${next ? ` / 다음 단계 ${next}` : ' · 최고 단계'}</div></div>
        <button class="ui-btn sm ${on ? '' : 'primary'}" data-act="cset:${on ? '' : s.id}">${on ? '끄기' : '켜기'}</button></div>`;
    }).join('');
    const presets = c.level >= CARD_PRESET_LV
      ? `<div class="ui-row"><span class="ui-sm ui-grow">카드 프리셋</span>${c.cardPresets.map((_, i) => `<button class="ui-btn sm ${i === c.cardPreset ? 'primary' : ''}" data-act="cpre:${i}">${i + 1}</button>`).join('')}</div>`
      : `<p class="ui-xs ui-muted">Lv.${CARD_PRESET_LV}부터 카드 프리셋 2개를 쓸 수 있습니다.</p>`;
    return `<h3 style="margin-top:0">카드 세트</h3>${sets}${presets}`;
  }

  private starsHtml(c: Character): string {
    const acc = this.game.acc;
    if (c.level < SIGN_LV) return `<p class="ui-muted">Lv.${SIGN_LV}부터 별을 볼 수 있습니다. 맵 곳곳에 숨은 별 지도를 찾아 별 포인트를 모으고, 별자리를 열어 캐릭터마다 하나씩 정렬합니다.</p>`;
    const stars = STARS.map((s) => {
      const found = !!acc.stars[s.id], here = c.mapId === s.map, ok = here && s.check(acc, c);
      return `<div class="ui-row line"><div class="ui-grow"><b>${found || here ? MAPS[s.map].name : '???'}</b><div class="ui-sm ${found ? 'ui-good' : 'ui-muted'}">${found || here ? s.desc : '그 맵에 가면 보입니다'}</div></div>
        ${found ? '<span class="ui-accent">★</span>' : `<button class="ui-btn sm ${ok ? 'success' : ''}" data-act="star:${s.id}" ${ok ? '' : 'disabled'}>찾기</button>`}</div>`;
    }).join('');
    const signs = SIGNS.map((s) => {
      const open = acc.signs.includes(s.id), on = c.sign === s.id;
      const btn = on ? `<button class="ui-btn sm" data-act="sign:">해제</button>` : open ? `<button class="ui-btn sm primary" data-act="sign:${s.id}">정렬</button>`
        : `<button class="ui-btn sm" data-act="signopen:${s.id}" ${acc.starPoints >= s.cost ? '' : 'disabled'}>★${s.cost} 열기</button>`;
      return `<div class="ui-row line"><div class="ui-grow"><b>${s.name}</b>${on ? ' <span class="ui-good ui-xs">정렬 중</span>' : ''}<div class="ui-sm ${open ? '' : 'ui-muted'}">${s.label}</div></div>${btn}</div>`;
    }).join('');
    return `<h3 style="margin-top:0">별 지도 <span class="ui-accent">${Object.keys(acc.stars).length}/${STARS.length}</span> · 별 포인트 <span class="ui-accent">${acc.starPoints}</span></h3>${stars}<h3>별자리 <span class="ui-xs ui-muted">캐릭터마다 하나</span></h3>${signs}`;
  }

  private achieveHtml(): string {
    const acc = this.game.acc;
    return ACHIEVEMENTS.map((d) => {
      const got = !!acc.achievements[d.id], ready = achieveReady(acc, d.id);
      return `<div class="ui-row line ${got || ready ? '' : 'ui-muted'}"><span class="ui-slot sm ${got ? 'r3' : ''}">${ui('ui_trophy', 'mi')}</span><div class="ui-grow"><b>${d.name}</b><div class="ui-sm">${d.desc}</div><div class="ui-xs ${got ? 'ui-good' : 'ui-muted'}">보상: ${d.label}</div></div>
        ${got ? '<span class="ui-good">✓</span>' : `<button class="ui-btn sm ${ready ? 'success' : ''}" data-act="ach:${d.id}" ${ready ? '' : 'disabled'}>받기</button>`}</div>`;
    }).join('');
  }

  private familyHtml(): string {
    const acc = this.game.acc, best = familyBest(acc.characters), lv = familyLevel(acc);
    const rows = (Object.keys(FAMILY) as BaseClass[]).map((k) => {
      const v = familyValue(k, best[k]);
      return `<div class="ui-row line"><b class="ui-grow">${CLASSES[k].name} <span class="ui-xs ui-muted">최고 Lv.${best[k] || '-'}</span></b><span class="ui-sm ${v ? 'ui-good' : 'ui-muted'}">${FAMILY[k].label} +${(Math.round(v * 10) / 10)}${FAMILY[k].eff === 'afk' ? '%p' : '%'}</span></div>`;
    }).join('');
    const next = FAMILY_SLOTS.find((n) => lv < n);
    return `<p class="ui-sm">직업마다 가장 높은 캐릭터의 레벨이 계정 전체에 보너스를 줍니다.</p>${rows}
      <h3>가족 레벨 <span class="ui-accent">${lv}</span></h3><p class="ui-sm">캐릭터 칸 ${charSlots(acc)}/${MAX_CHARACTERS}${next ? ` · 레벨 합 ${next}이면 한 칸 더` : ''}</p>`;
  }

  private tasksHtml(group: TaskGroup): string {
    const acc = this.game.acc;
    return TASKS.filter((t) => t.group === group).map((t) => {
      const done = taskDone(acc, t.id), all = done >= t.tiers.length, v = t.value(acc), goal = t.tiers[Math.min(done, t.tiers.length - 1)];
      const can = !all && v >= goal;
      const pips = t.tiers.map((_, i) => `<span class="${i < done ? 'ui-accent' : 'ui-muted'}">${i < done ? '★' : '☆'}</span>`).join('');
      const unlock = !all ? t.recipes?.[done + 1] : undefined;
      const reward = all ? '' : `${tile(iconUrl('ui_up'), `+${t.merit[done]}`, `공로 +${t.merit[done]}`)}${unlock ? tile(iconUrl(ITEM_ICON[unlock]), '', `${ITEMS[unlock].name} 레시피`, 'r3') : ''}`;
      return `<div class="ui-row line"><div class="ui-grow"><b>${t.name}</b> ${pips}
          ${all ? '<div class="ui-sm ui-good">모두 마침</div>' : bar(can ? 'hp' : 'skill', Math.min(v, goal), goal, `${Math.min(v, goal).toLocaleString()} / ${goal.toLocaleString()} ${t.unit}`)}</div>
        <div class="qline">${reward}</div>${all ? '' : `<button class="ui-btn ${can ? 'success' : ''} sm" data-act="tclaim:${t.id}" ${can ? '' : 'disabled'}>받기</button>`}</div>`;
    }).join('') + '<p class="ui-xs ui-muted">모든 캐릭터의 기록을 합쳐 셉니다. 보상으로 공로 포인트와 새 제작 레시피를 얻습니다.</p>';
  }

  private meritHtml(): string {
    const acc = this.game.acc;
    return MERITS.map((m) => {
      const lv = meritLv(acc, m.id), max = lv >= m.max, cost = meritCost(acc, m.id);
      return `<div class="ui-row line"><div class="ui-grow"><b>${m.name}</b> <span class="ui-xs ui-accent">${lv}/${m.max}</span><div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${m.desc(Math.max(lv, 1) * m.per)}${lv ? '' : ' (1단계)'}</div></div>
        <button class="ui-btn sm" data-act="merit:${m.id}" ${!max && acc.merit >= cost ? '' : 'disabled'}>${max ? '최대' : `공로 ${cost}`}</button></div>`;
    }).join('') + `<p class="ui-xs ui-muted">공로 포인트 ${acc.merit}. 작업판 과제를 마치면 얻습니다.</p>`;
  }

  private bribesHtml(): string {
    const acc = this.game.acc;
    return BRIBES.map((b, i) => {
      const got = i < acc.bribes, next = i === acc.bribes;
      return `<div class="ui-row line ${got || next ? '' : 'ui-muted'}"><div class="ui-grow"><b>${next || got ? b.name : '???'}</b><div class="ui-sm ${got ? 'ui-good' : ''}">${next || got ? b.desc : '앞의 계약을 맺으면 열립니다'}</div></div>
        ${got ? '<span class="ui-good">✓</span>' : next ? `<button class="ui-btn primary sm" data-act="bribe" ${acc.coins >= b.price ? '' : 'disabled'}>${icon('coin')} ${b.price.toLocaleString()}</button>` : ''}</div>`;
    }).join('') + '<p class="ui-xs ui-muted">후원 계약은 한 번 맺으면 계정 전체에 계속 효과가 있습니다. 차례대로 맺을 수 있습니다.</p>';
  }

  private forgeHtml(c: Character): string {
    const acc = this.game.acc, f = acc.forge, now = Date.now();
    const sm = SMELTS[0];
    if (!f.owned) {
      return `<div class="stack"><p class="ui-sm">광석을 넣어 두면 시간이 흘러 주괴가 됩니다. 한 번 들이면 모든 캐릭터가 함께 씁니다.</p>
        <div class="qline">${tile(iconUrl(ITEM_ICON[sm.ore]), `×${sm.need}`, `${ITEMS[sm.ore].name} ${sm.need}개`)}<span class="qarrow">▶</span>${tile(iconUrl(ITEM_ICON[sm.bar]), '×1', ITEMS[sm.bar].name)}</div>
        <button class="ui-btn primary" data-act="forgebuy" ${acc.coins >= FORGE.price ? '' : 'disabled'}>${icon('coin')} ${FORGE.price.toLocaleString()} 들이기</button></div>`;
    }
    forgeSettle(acc, now);
    if (this.forgeSel >= f.slots.length) this.forgeSel = 0;
    const cap = forgeCap(f);
    const slotRow = f.slots.map((s, i) => {
      const p = forgeProgress(acc, s, now);
      return `<button class="prodslot" data-act="fslot:${i}" aria-selected="${i === this.forgeSel}">
        <span class="ui-slot">${s.ore ? `<img class="px" src="${iconUrl(ITEM_ICON[s.ore])}" alt=""><span class="qty">${s.qty}</span>` : ''}</span>
        ${s.ore ? bar('skill', p, 1, s.bars ? `주괴 ${s.bars}` : '') : '<span class="ui-xs ui-muted">비어 있음</span>'}</button>`;
    }).join('') + (forgeUpMaxed(f, 'slots') ? '' : `<div class="prodslot locked"><span class="ui-xs ui-muted">칸 늘리기로 열림</span></div>`);
    const s = f.slots[this.forgeSel], d = SMELTS.find((x) => x.ore === s.ore);
    let detail: string;
    if (s.ore && d) {
      const sec = smeltSeconds(acc, s), left = s.qty >= d.need ? Math.ceil(sec * (1 - forgeProgress(acc, s, now))) : 0;
      const total = Math.floor(s.qty / d.need);
      detail = `<div class="qline">${tile(iconUrl(ITEM_ICON[s.ore]), `${s.qty}/${cap}`, `${ITEMS[s.ore].name} ${s.qty}/${cap}`)}<span class="qarrow">▶</span>${tile(iconUrl(ITEM_ICON[d.bar]), s.bars, `${ITEMS[d.bar].name} ${s.bars}개`, s.bars ? 'ready' : '')}</div>
        <span class="ui-xs ui-muted">${total ? `다음 주괴까지 ${left}초 · 남은 광석으로 ${total}개 더 · 주괴 1개에 ${sec.toFixed(1)}초` : '광석이 모자라 멈췄습니다'}${s.oil ? ' · <span class="ui-accent">기름 효과 중</span>' : ''}</span>
        <div class="ui-row"><button class="ui-btn primary" data-act="fcollect:bag" ${s.bars ? '' : 'disabled'}>가방으로</button><button class="ui-btn" data-act="fcollect:store" ${s.bars ? '' : 'disabled'}>창고로</button>
        <button class="ui-btn sm" data-act="foil" ${!s.oil && countItem(c, FORGE.oilItem) && total ? '' : 'disabled'} title="${ITEMS[FORGE.oilItem].desc}">${icon(FORGE.oilItem)} 기름 ${countItem(c, FORGE.oilItem)}</button></div>`;
    } else detail = '<span class="ui-sm ui-muted">아래에서 넣을 광석을 고르세요. 가방에서 먼저, 모자라면 창고에서 칸 용량만큼 넣습니다.</span>';
    // 넣을 수 있는 광석(가방 + 창고)
    const ores = SMELTS.map((x) => ({ x, have: haveMat(acc, c, x.ore) })).filter(({ have }) => have > 0);
    const load = ores.length
      ? ores.map(({ x, have }) => `<button class="ui-slot" data-act="fload:${x.ore}" ${s.ore && s.ore !== x.ore ? 'disabled' : ''} aria-label="${ITEMS[x.ore].name} 넣기 (${have}개)"><img class="px" src="${iconUrl(ITEM_ICON[x.ore])}" alt=""><span class="qty">${have}</span></button>`).join('')
      : '<span class="ui-xs ui-muted">녹일 광석이 없습니다. 광맥을 캐 보세요.</span>';
    const ups: [ForgeUp, string, string][] = [
      ['slots', '칸 늘리기', `칸 ${forgeSlotsOpen(f)}개`], ['cap', '용량', `칸당 ${cap}개`],
      ['speed', '속도', `+${Math.round(f.up.speed * FORGE.speedPer * 100)}%`], ['bonus', '추가 주괴', `${Math.round(forgeBonus(f) * 100)}%`],
    ];
    const upRows = ups.map(([k, name, eff]) => {
      const max = forgeUpMaxed(f, k), cost = forgeUpCost(f, k);
      return `<div class="ui-row line"><b class="ui-grow">${name} <span class="ui-xs ui-accent">${f.up[k]}/${FORGE.upMax[k]}</span></b><span class="ui-xs ui-muted">${eff}</span>
        <button class="ui-btn sm" data-act="fup:${k}" ${!max && acc.coins >= cost ? '' : 'disabled'}>${max ? '최대' : `${icon('coin')} ${cost.toLocaleString()}`}</button></div>`;
    }).join('');
    return `<div class="prodslots">${slotRow}</div><div class="split"><div><h3 style="margin-top:0">${this.forgeSel + 1}번 칸</h3><div class="stack">${detail}</div>
      <h3>넣기</h3><div class="qline">${load}</div></div><div class="ui-detail"><h3 style="margin-top:0">강화</h3>${upRows}</div></div>`;
  }

  private productionHtml(c: Character): string {
    const open = anvilSlotsOpen(c);
    while (c.anvil.slots.length < open) c.anvil.slots.push({ prod: null, stored: 0, frac: 0 });
    if (this.prodSlot >= open) this.prodSlot = 0;
    const slot = c.anvil.slots[this.prodSlot];
    // 생산 칸: 열린 칸과 다음에 열릴 칸
    const slotRow = ANVIL.slotLv.map((lv, i) => {
      if (i >= open) return `<div class="prodslot locked"><span class="ui-xs ui-muted">대장 Lv.${lv}에 열림</span></div>`;
      const sl = c.anvil.slots[i];
      return `<button class="prodslot" data-act="pslot:${i}" aria-selected="${i === this.prodSlot}"><span class="ui-slot">${sl.prod ? icon(sl.prod) : ''}</span>
        <span class="ui-xs">${sl.prod ? `${sl.stored}/${anvilCap(c)}` : '비어 있음'}</span></button>`;
    }).join('');
    const prods = PRODUCTS.map((p) => {
      const locked = c.skills.smithing.lv < p.lv, on = slot.prod === p.item;
      return `<button class="ui-slot ${locked ? 'locked' : ''}" data-act="prod:${p.item}" aria-selected="${on}" aria-label="${ITEMS[p.item].name}${locked ? ` (대장 Lv.${p.lv} 필요)` : ''}" ${locked ? 'disabled' : ''}>${locked ? '' : icon(p.item)}<span class="lv">Lv.${p.lv}</span></button>`;
    }).join('');
    const sk = c.skills.smithing, need = skillXpToNext(sk.lv);
    const free = anvilPointsFree(c), pts = c.anvil.pts;
    const prow = (k: 'cap' | 'spd' | 'xp', name: string, eff: string) =>
      `<div class="ui-row line"><b class="ui-grow">${name} <span class="ui-xs ui-accent">${pts[k]}</span></b><span class="ui-xs ui-muted">${eff}</span><button class="ui-btn sm" data-act="apt:${k}" ${free > 0 ? '' : 'disabled'} aria-label="${name} 올리기">＋</button></div>`;
    const cur = slot.prod;
    return `<div class="prodslots">${slotRow}</div><div class="split"><div>
        <h3 style="margin-top:0">${this.prodSlot + 1}번 칸에서 만들 품목</h3><div class="ui-grid c4">${prods}</div>
        <h3>대장 Lv.${sk.lv}</h3>${bar('skill', sk.xp, need, `${Math.floor(sk.xp)} / ${need}`)}
        <h3>모루 포인트 <span class="ui-accent">${free}</span> <span class="ui-xs ui-muted">(대장 레벨마다 1, 모든 칸 공용)</span></h3>
        ${prow('cap', '용량', `+${ANVIL.capPer}개씩`)}${prow('spd', '속도', `+${Math.round(ANVIL.spdPer * 100)}%씩`)}${prow('xp', '경험치', `+${Math.round(ANVIL.xpPer * 100)}%씩`)}
      </div><div class="ui-detail">
        ${cur ? `<div class="ui-row"><span class="ui-slot">${icon(cur)}</span><div><b>${ITEMS[cur].name}</b><div class="ui-xs ui-muted">시간당 ${Math.round(anvilRate(c, this.prodSlot))}개</div></div></div>
          ${bar('skill', slot.stored, anvilCap(c), `${slot.stored} / ${anvilCap(c)}`)}
          ${slot.stored >= anvilCap(c) ? '<span class="ui-xs ui-bad">가득 차서 멈췄습니다. 받아 가세요.</span>' : '<span class="ui-xs ui-muted">이 캐릭터를 두고 떠나도 계속 만듭니다.</span>'}
          <div class="ui-row"><button class="ui-btn primary" data-act="collect:bag" ${slot.stored ? '' : 'disabled'}>가방으로</button><button class="ui-btn" data-act="collect:store" ${slot.stored ? '' : 'disabled'}>창고로</button></div>
          <button class="ui-btn sm" data-act="prod:">이 칸 멈추기</button>`
        : '<span class="ui-sm ui-muted">왼쪽에서 만들 품목을 고르세요. 모루는 시간이 흐르면 저절로 만들고, 만들 때마다 대장 경험치를 얻습니다.</span>'}
      </div></div>`;
  }

  private statsHtml(c: Character): string {
    const d = derive(c, this.game.acc);
    const stats = (Object.keys(STAT_NAMES) as StatKey[]).map((k) => `<div class="ui-row line"><b class="stat-name">${STAT_NAMES[k]}</b><span class="ui-accent stat-val">${d[k]}</span>
      <span class="ui-grow ui-xs ui-muted">${STAT_DESC[k]}</span><button class="ui-btn sm" data-act="stat:${k}" aria-label="${STAT_NAMES[k]} 올리기" ${c.statPoints ? '' : 'disabled'}>＋</button></div>`).join('');
    const skills = (Object.keys(SKILL_NAMES) as SkillKey[]).map((k) => {
      const s = c.skills[k], need = skillXpToNext(s.lv);
      return `<div class="ui-row line"><b class="stat-name">${SKILL_NAMES[k]}</b><span class="ui-accent stat-val">${s.lv}</span><div class="ui-grow">${bar('skill', s.xp, need, `${s.xp} / ${need}`)}</div></div>`;
    }).join('');
    return `<div class="split"><div><div class="ui-row"><span class="ui-grow">남은 포인트</span><b class="ui-accent ui-lg">${c.statPoints}</b></div>${stats}<h3>기술</h3>${skills}</div>
      <div class="ui-detail"><h3>세부 능력치</h3><div class="ui-kv">
        <span>공격력</span><span>${Math.round(d.dmg * 0.8)}~${Math.round(d.dmg * 1.2)}</span><span>최대 체력</span><span>${d.maxHp}</span>
        <span>최대 마나</span><span>${d.maxMp}</span><span>명중</span><span>${d.acc}</span>
        <span>방어력</span><span>${d.def.toFixed(1)}</span><span>공격 속도</span><span>${(1 / d.atkInterval).toFixed(2)}/초</span>
        <span>치명타</span><span>${(d.crit * 100).toFixed(1)}%</span><span>이동 속도</span><span>${Math.round(d.speed)}</span>
        <span>경험치 배율</span><span>×${d.xpMult.toFixed(2)}</span><span>드롭 배율</span><span>×${d.dropMult.toFixed(2)}</span></div>
        ${this.vsHtml(c, d)}</div></div>`;
  }

  /** 현재 맵 몬스터 상대로 명중률과 받는 피해 */
  private vsHtml(c: Character, d: ReturnType<typeof derive>): string {
    const map = MAPS[c.mapId];
    if (!map.spawns.length) return '';
    const rows = [...new Set(map.spawns.map((s) => s.monster))].map((id) => {
      const m = MONSTERS[id], hit = hitChance(d.acc, m.acc), taken = dmgTaken(m, d.def);
      return `<span>${m.name}</span><span><span class="${hit >= 1 ? 'ui-good' : hit > 0 ? '' : 'ui-bad'}">명중 ${Math.round(hit * 100)}%</span> · <span class="${taken ? '' : 'ui-good'}">피해 ${taken}</span></span>`;
    }).join('');
    return `<h3>${map.name}</h3><div class="ui-kv">${rows}</div><p class="ui-xs ui-muted">명중이 몬스터 요구치의 절반 이하면 전혀 맞지 않습니다. 방어력이 충분하면 피해가 0이 됩니다.</p>`;
  }

  /** 특성 격자: 틀 안의 그림 + LV 판. 고르면 오른쪽에 설명과 올리기·공격 지정 */
  private talentsHtml(c: Character, cls: string): string {
    const list = TALENTS.filter((t) => (cls === 'beginner' ? !t.cls : t.cls === cls));
    if (!list.some((t) => t.id === this.talentSel)) this.talentSel = list[0]?.id ?? null;
    const tiles = list.map((t) => {
      const lv = c.talents[t.id] ?? 0, onBar = c.attackBars.some((b) => b.includes(t.id));
      return `<button class="tal ${t.id === this.talentSel ? 'sel' : ''} ${lv ? '' : 'zero'} ${t.active ? 'act' : ''}" data-act="tsel:${t.id}" data-tal="${t.id}" aria-label="${t.name} 레벨 ${lv}">
        ${ui(`tl_${t.id}`, 'tic')}<span class="lvp">${lv >= t.max ? 'MAX' : `LV ${lv}`}</span>${onBar ? '<i class="onbar"></i>' : ''}</button>`;
    }).join('');
    const t = this.talentSel ? TALENT[this.talentSel] : null;
    let detail = '';
    if (t) {
      const lv = c.talents[t.id] ?? 0;
      detail = `<div class="ui-row">${ui(`tl_${t.id}`, 'bigic')}<div><b>${t.name}</b><div class="ui-xs ui-muted">${t.active ? `액티브 · 마나 ${t.active.mana} · ${t.active.cooldown}초` : '패시브'}</div>
        <div class="ui-accent">LV ${lv} / ${t.max}</div></div></div>
        <div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${t.desc(Math.max(1, lv))}</div>
        ${lv < t.max ? `<div class="ui-xs ui-muted">다음: ${t.desc(lv + 1)}</div>` : ''}
        <div class="ui-row"><button class="ui-btn primary iconbtn" data-act="talent:${t.id}" ${c.talentPoints && lv < t.max ? '' : 'disabled'}>${ui('ui_up', 'tic')} 올리기</button>
        ${t.active ? `<button class="ui-btn iconbtn" data-act="assign:${t.id}" ${lv ? '' : 'disabled'}>${ui('ui_assign', 'tic')} 공격 바에</button>` : ''}</div>
        ${t.active && lv ? '<span class="ui-xs ui-muted">그림을 끌어 아래 공격 바 칸에 놓아도 됩니다. 자동은 왼쪽 칸부터 씁니다.</span>' : ''}`;
    }
    return `<div class="split"><div class="talgrid">${tiles}</div><div class="ui-detail">${detail}</div></div>`;
  }

  /** 하단 공격 바: [메뉴로] [장 넘기기] [6칸] */
  private attackBarHtml(c: Character): string {
    const w = this.game.world!, page = c.attackPage, bar = c.attackBars[page];
    const slots = bar.map((id, i) => {
      const t = id ? TALENT[id] : null;
      const cd = id ? w.player.cd[id] ?? 0 : 0, low = !!t?.active && c.mp < t.active.mana;
      return `<button class="ui-menubtn bslot ${this.assigning ? 'drop' : ''} ${low ? 'nomp' : ''}" data-bslot="${i}" aria-label="${i + 1}번 칸${t ? `: ${t.name}` : ' 비어 있음'}">
        ${t ? ui(`tl_${id}`, 'mi') : '<span class="empty-plus">+</span>'}<span class="keyno">${i + 1}</span>${cd > 0 ? `<span class="cool">${Math.ceil(cd)}</span>` : ''}</button>`;
    }).join('');
    return `<button class="ui-menubtn on" data-act="atk" aria-label="메뉴로">${ui('ui_attacks', 'mi')}<span>${this.assigning ? '완료' : '공격'}</span></button>
      <button class="ui-menubtn page" data-act="bpage" aria-label="공격 바 넘기기">${ui('ui_arrow', 'mi rot')}<span>${page + 1}/${c.attackBars.length}</span></button>${slots}`;
  }

  /** 공격 바 칸: 놓는 중이면 그 칸에 놓고, 아니면 시전 */
  private pressSlot(i: number) {
    const c = this.game.char, w = this.game.world;
    if (!c || !w || i < 0 || i >= ATTACK_SLOTS) return;
    if (this.assigning) {
      const r = this.game.act({ t: 'barSet', bar: c.attackPage, slot: i, id: this.assigning });
      if (!r.ok) this.toast(r.err ?? '놓을 수 없습니다');
      this.assigning = null;
    } else {
      const id = c.attackBars[c.attackPage][i];
      if (id && !w.useSkill(id)) this.toast(c.mp < (TALENT[id].active?.mana ?? 0) ? '마나가 부족합니다' : '아직 쓸 수 없습니다');
    }
    this.refresh(true);
  }
  private startDrag(id: string, e: PointerEvent) {
    const ghost = document.createElement('div');
    ghost.className = 'dragghost';
    ghost.innerHTML = ui(`tl_${id}`, 'mi');
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
    document.body.appendChild(ghost);
    this.drag = { id, ghost };
    this.attackMode = true;
    this.refresh(true);
  }
  private endDrag(e: PointerEvent) {
    if (!this.drag) return;
    const { id, ghost } = this.drag;
    ghost.remove(); this.drag = null;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-bslot]');
    if (el) { this.assigning = id; this.pressSlot(+el.dataset.bslot!); }
  }

  /** 도감 > 빠른 참조: 어디서나 창고와 다른 캐릭터 현황을 본다 */
  private quickRefHtml(): string {
    const g = this.game, acc = g.acc;
    const store = acc.storage.map((s) => `<div class="ui-slot" aria-label="${ITEMS[s.id].name} ${s.qty}개">${icon(s.id)}<span class="qty">${s.qty.toLocaleString()}</span></div>`).join('') || '<span class="ui-sm ui-muted">비어 있음</span>';
    const chars = acc.characters.map((ch) => {
      const busy = ch.anvil.slots.filter((sl) => sl.prod).map((sl) => `${icon(sl.prod!)}${sl.stored}/${anvilCap(ch)}`).join(' ');
      const act = ch.activity.k === 'gather' ? `${NODES[ch.activity.node].name} 채집` : MAPS[ch.mapId].spawns.length ? '사냥' : '휴식';
      return `<div class="ui-row line"><img class="px qface" src="${portraitUrl(ch.look)}" alt=""><div class="ui-grow"><b>${esc(ch.name)}</b> <span class="ui-xs ui-accent">Lv.${ch.level} ${CLASSES[ch.cls].name}</span>
        <div class="ui-xs ui-muted">${MAPS[ch.mapId].name} · ${act}</div></div><span class="ui-xs qanvil">${busy}</span></div>`;
    }).join('');
    return `<h3 style="margin-top:0">${ui('ui_quick', 'tic')} 창고 ${acc.storage.length}/${storageSize(acc)}</h3><div class="ui-grid">${store}</div><h3>${ui('ui_swap', 'tic')} 캐릭터</h3>${chars}`;
  }

  // ───────── 입력 ─────────  // ───────── 입력 ─────────
  private onClick(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) {
      if ((e.target as HTMLElement).id === 'modal' && this.panel !== 'afk') { this.panel = null; this.refresh(); }
      return;
    }
    const [act, a, b] = el.dataset.act!.split(':');
    this.audio?.play('click');
    const g = this.game, c = g.char;
    const fail = (msg: string | null) => { if (msg) this.toast(msg); };
    switch (act) {
      case 'newChar': this.creating = true; this.draft = this.randomDraft(); break;
      case 'cancelCreate': this.creating = false; break;
      case 'hair': this.draft.look.hair = (this.draft.look.hair + +a + HAIR_STYLES) % HAIR_STYLES; break;
      case 'look': this.draft.look[a as 'hairColor' | 'skin' | 'outfit'] = b; break;
      case 'create': {
        g.create(this.draft.name || '모험가', { ...this.draft.look }).then((made) => {
          if (made) { this.creating = false; g.select(g.acc.characters.length - 1); }
          this.refresh(true);
        });
        break;
      }
      case 'select': g.select(+a); break;
      case 'chars': this.panel = null; g.leave(); break;
      // 같은 메뉴 버튼을 다시 누르면 닫힌다
      case 'open': if (this.panel === a) this.panel = null; else this.open(a as Panel); break;
      case 'close': this.panel = null; this.afk = null; break;
      case 'tab': this.tab[a as Exclude<Panel, null>] = +b; this.craftSel = -1; break;
      case 'csel': this.craftSel = +a; break;
      case 'pslot': this.prodSlot = +a; break;
      case 'fslot': this.forgeSel = +a; break;
      case 'ssel': this.stampSel = a; break;
      case 'arenaclaim': {
        const r = g.act({ t: 'arenaClaim' });
        if (r.ok) { this.toast(`콜로세움 보상을 받았습니다(웨이브 ${r.n})`); this.panel = null; this.arenaResult = null; g.travelTo(); } else fail(r.err ?? null);
        break;
      }
      case 'sculpt': { const r = g.act({ t: 'use', id: 'sculpt_tools' }); if (r.ok) this.toast('석상 받침을 열었습니다'); else fail(r.err ?? null); break; }
      case 'statue': { const r = g.act({ t: 'statue', id: a }); if (r.ok) this.toast(`조각 ${r.n}개를 바쳤습니다`); else fail(r.err ?? null); break; }
      case 'star': { const r = g.act({ t: 'star', id: a }); if (r.ok) this.toast('별 지도를 찾았습니다! 별 포인트 +1'); else fail(r.err ?? null); break; }
      case 'signopen': fail(g.act({ t: 'signOpen', id: a }).err ?? null); break;
      case 'sign': fail(g.act({ t: 'sign', id: a || null }).err ?? null); break;
      case 'ach': { const r = g.act({ t: 'achieve', id: a }); if (r.ok) this.toast(`업적 달성: ${ACHIEVEMENTS.find((d) => d.id === a)!.name}`); else fail(r.err ?? null); break; }
      case 'cset': fail(g.act({ t: 'cardSet', id: a || null }).err ?? null); break;
      case 'tpre': { const r = g.act({ t: 'talentPreset', i: +a }); if (r.ok) this.toast(`특성 프리셋 ${+a + 1}`); else fail(r.err ?? null); break; }
      case 'cpre': fail(g.act({ t: 'cardPreset', i: +a }).err ?? null); break;
      case 'tclaim': {
        const t = TASK_BY_ID[a], tier = taskDone(g.acc, a) + 1, r = g.act({ t: 'task', id: a });
        if (r.ok) { const it = t.recipes?.[tier]; this.toast(`${t.name} ${tier}단계 완료! 공로 +${t.merit[tier - 1]}${it ? ` · ${ITEMS[it].name} 레시피` : ''}`, it); } else fail(r.err ?? null);
        break;
      }
      case 'merit': fail(g.act({ t: 'merit', id: a as MeritEff }).err ?? null); break;
      case 'sin': { const r = g.act({ t: 'stampIn', id: a }); if (r.ok) this.toast(`${ITEMS[a].name}을(를) 우표함에 넣었습니다`, a); else fail(r.err ?? null); break; }
      case 'sup': fail(g.act({ t: 'stampUp', id: a }).err ?? null); break;
      case 'bribe': { const r = g.act({ t: 'bribe' }); if (r.ok) this.toast('후원 계약을 맺었습니다'); else fail(r.err ?? null); break; }
      case 'forgebuy': { const r = g.act({ t: 'forgeBuy' }); if (r.ok) this.toast('용광로를 들였습니다'); else fail(r.err ?? null); break; }
      case 'fload': fail(g.act({ t: 'forgeLoad', slot: this.forgeSel, ore: a }).err ?? null); break;
      case 'foil': fail(g.act({ t: 'forgeOil', slot: this.forgeSel }).err ?? null); break;
      case 'fup': fail(g.act({ t: 'forgeUp', k: a as ForgeUp }).err ?? null); break;
      case 'fcollect': {
        const sl = g.acc.forge.slots[this.forgeSel], bar = SMELTS.find((x) => x.ore === sl?.ore)?.bar;
        const r = g.act({ t: 'forgeCollect', slot: this.forgeSel, toStorage: a === 'store', n: Math.max(1, sl?.bars ?? 0) });
        if (r.ok && bar) this.toast(`${ITEMS[bar].name} ${r.n}개를 ${a === 'store' ? '창고' : '가방'}로`, bar); else fail(r.err ?? null);
        break;
      }
      case 'atk': this.attackMode = !(this.attackMode || this.assigning); this.assigning = null; break;
      case 'bpage': if (c) g.act({ t: 'barPage', page: (c.attackPage + 1) % c.attackBars.length }); break;
      case 'flag': this.attackMode = !this.attackMode; this.assigning = this.attackMode && this.talentSel && TALENT[this.talentSel]?.active && c?.talents[this.talentSel] ? this.talentSel : null; break;
      case 'tsel': this.talentSel = a; if (this.attackMode && TALENT[a]?.active && c?.talents[a]) this.assigning = a; break;
      case 'assign': this.assigning = a; this.attackMode = true; this.toast('아래 공격 바에서 놓을 칸을 누르세요'); break;
      case 'tp': { const r = g.act({ t: 'teleport', map: a }); if (r.ok) { g.travelTo(); this.panel = null; } else fail(r.err ?? null); break; }
      case 'opt': g.act({ t: 'option', autoAttacks: !g.acc.options.autoAttacks }); break;
      case 'pick': this.sel = b ? `${a}:${b}` : a; break;
      case 'sfx': this.audio?.setSfx(!this.audio.sfxOn); break;
      case 'bgm': this.audio?.setBgm(!this.audio.bgmOn); break;
      case 'delacc':
        if (confirm('계정을 삭제할까요? 모든 캐릭터와 진행이 사라지며 되돌릴 수 없습니다.')) {
          this.panel = null;
          g.deleteAccount().then(() => { this.toast('계정을 삭제했습니다'); this.refresh(true); }).catch((e) => this.toast((e as Error).message));
        }
        break;
      // ── 게임 행동: 전부 g.act 로(기기와 서버가 같은 규칙으로 적용) ──
      case 'auto': if (c) g.act({ t: 'auto', on: !c.auto }); break;
      case 'use': { const r = g.act({ t: 'use', id: a }); fail(r.err ?? null); if (r.ok) { this.toast(`${ITEMS[a].name} 사용!`, a); this.sel = null; } break; }
      case 'put': fail(g.act({ t: 'deposit', id: a }).err ?? null); break;
      case 'take': fail(g.act({ t: 'withdraw', id: a }).err ?? null); break;
      case 'putall': { const r = g.act({ t: 'depositAll' }); this.toast(r.n ? `${r.n}종류를 창고에 맡겼습니다` : '맡길 재료가 없습니다'); break; }
      case 'buy': { const r = g.act({ t: 'buy', idx: +a, qty: +b }); fail(r.err ?? null); if (r.ok) this.toast(`${ITEMS[SHOP[+a].item].name} ×${b} 구입`, SHOP[+a].item); break; }
      case 'prod': fail(g.act({ t: 'prod', slot: this.prodSlot, item: a || null }).err ?? null); break;
      case 'cardon': fail(g.act({ t: 'cardOn', card: a }).err ?? null); break;
      case 'cardoff': g.act({ t: 'cardOff', slot: +a }); break;
      case 'apt': g.act({ t: 'apt', k: a as 'cap' | 'spd' | 'xp' }); break;
      case 'collect': {
        const it = c?.anvil.slots[this.prodSlot]?.prod;
        const r = g.act({ t: 'collect', slot: this.prodSlot, toStorage: a === 'store' });
        if (r.ok && it) this.toast(`${ITEMS[it].name} ${r.n}개를 ${a === 'store' ? '창고' : '가방'}로`, it); else fail(r.err ?? null);
        break;
      }
      case 'class': { const r = g.act({ t: 'class', cls: a as ClassId }); fail(r.err ?? null); if (r.ok && c) { this.toast(`${CLASSES[c.cls].name}(으)로 전직했습니다!`); this.panel = 'char'; this.tab.char = CLASSES[c.cls].base ? 3 : 2; } break; }
      case 'equip': fail(g.act({ t: 'equip', id: a }).err ?? null); this.sel = null; break;
      case 'food': {
        // 넣기: 같은 음식 칸 → 빈 칸 → 첫 칸 순서로. 빼기: 고른 칸
        const slot = b !== undefined ? +b : Math.max(0, c!.foods.findIndex((f) => f?.id === a), c!.foods.findIndex((f) => f?.id === a) >= 0 ? 0 : c!.foods.indexOf(null));
        fail(g.act({ t: 'food', id: a || null, slot }).err ?? null);
        this.sel = a ? `food:${c!.foods.findIndex((f) => f?.id === a)}` : null;
        break;
      }
      case 'unequip': fail(g.act({ t: 'unequip', slot: a as EquipSlot }).err ?? null); this.sel = null; break;
      case 'sell': { const r = g.act({ t: 'sell', id: a, qty: +b }); if (r.ok) this.toast(`+${r.n} 코인`, 'coin'); break; }
      case 'stat': g.act({ t: 'stat', stat: a as StatKey }); break;
      case 'talent': g.act({ t: 'talent', id: a }); break;
      case 'qaccept': if (c && g.act({ t: 'qaccept', npc: a }).ok) { this.toast(`퀘스트 수락: ${currentQuest(c, a)!.name}`); this.panel = null; } break;
      case 'qdone': { const name = c && currentQuest(c, a)?.name; const r = g.act({ t: 'qdone', npc: a }); fail(r.err ?? null); if (r.ok) this.toast(`퀘스트 완료: ${name}`); break; }
      case 'craft': { const r = g.act({ t: 'craft', idx: +a }); fail(r.err ?? null); if (r.ok) this.toast(`${ITEMS[RECIPES[+a].item].name} ${RECIPES[+a].unlock ? '완료 — 모루가 한 단계 올랐습니다!' : '제작 완료!'}`, RECIPES[+a].item); break; }
    }
    this.refresh();
  }
}
