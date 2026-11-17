// DOM 기반 UI. 게임 상태를 읽어 HTML을 만들고, data-act 속성으로 동작을 위임 처리한다.
// 모양은 전부 components.css 의 부품(ui-*)과 tokens.css 의 역할 토큰으로 그린다.
import { AfkReport, afkRates } from '../core/afk';
import {
  CARD_SLOTS, CLASS_NPC, NPCS, ANVIL, CARDS, CLASSES, GROUP_NAMES, PRODUCTS, SHOP, STACK_BASE, stackGroup, CLASS_LEVEL, ClassId, EquipSlot, HAIR_COLORS, HAIR_STYLES, ITEMS, MAPS, MAX_CHARACTERS,
  MONSTERS, NODES, OUTFIT_COLORS, RECIPES, SKILL_NAMES, SKIN_COLORS, SLOT_NAMES, STAT_DESC,
  STAT_NAMES, SkillKey, StatKey, TALENTS, cardNext, cardTier,
} from '../core/data';
import {
  Character, Look, acceptQuest, advanceClass, canCraft, completeQuest, countItem, craft, currentQuest, derive, equipItem,
  anvilCap, anvilPointsFree, anvilRate, anvilSlotsOpen, equipCard, recipeLock, unequipCard, buy, collectAnvil, deposit, depositAll, haveMat, invSize, setProduct, shopLeft, spendAnvilPoint,
  stackCap, storageCount, storageSize, useItem, withdraw, dmgTaken, hitChance, learnTalent, questProgress, sellItem, setFood, skillXpToNext, spendStat, unequipItem, xpToNext,
} from '../core/state';
import { WorldEvent } from '../core/world';
import { Game } from '../game';
import { ITEM_ICON, iconUrl, portraitUrl } from '../render/sprites';
import { pixelIcon } from './icons';

type Panel = 'afk' | 'items' | 'attacks' | 'char' | 'codex' | 'map' | 'chat' | 'menu' | 'anvil' | 'npc' | 'storage' | 'shop' | 'afkinfo' | null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const icon = (id: string) => `<img class="px" src="${iconUrl(ITEM_ICON[id])}" alt="">`;
const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / b) * 100)).toFixed(1)}%`;
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : `${Math.floor(s / 60)}분`);
const STAT_LABEL: Record<string, string> = { dmg: '공격력', def: '방어력', hp: '체력', str: '힘', agi: '민첩', wis: '지혜', luk: '행운', mining: '채광', chopping: '벌목' };
const statLine = (id: string) => Object.entries(ITEMS[id].stats ?? {}).map(([k, v]) => `${STAT_LABEL[k]} +${v}`).join(', ');

/** 게이지 */
const bar = (kind: string, value: number, max: number, text: string) =>
  `<div class="ui-bar ${kind}" role="progressbar" aria-valuenow="${Math.round(value)}" aria-valuemax="${Math.round(max)}"><i style="width:${pct(value, max)}"></i><span>${text}</span></div>`;
/** 탭 줄 */
const tabs = (names: string[], cur: number, act: string) =>
  `<div class="ui-tabs" role="tablist">${names.map((n, i) => `<button role="tab" aria-selected="${i === cur}" data-act="${act}:${i}">${n}</button>`).join('')}</div>`;

export class UI {
  private root = document.getElementById('ui')!;
  private panel: Panel = null;
  private tab: Partial<Record<Exclude<Panel, null> | 'talentTab', number>> = {};
  private sel: string | null = null;      // 가방에서 선택한 아이템
  private afk: AfkReport | null = null;
  private craftSel = -1;
  /** 대화 중인 NPC, 생산 칸 선택 */
  private npcId = 'elder';
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
      const sk = (e.target as HTMLElement).closest<HTMLElement>('[data-skill]');
      if (sk) { e.preventDefault(); this.game.world?.useSkill(sk.dataset.skill!); this.refresh(); }
    });
    this.root.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.id === 'cname') this.draft.name = t.value;
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
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

  onEvent(e: WorldEvent) {
    if (e.t === 'loot') this.toast(e.text, e.item ?? (e.text.includes('코인') ? 'coin' : undefined));
    else if (e.t === 'level') this.toast(`레벨 업! Lv.${e.level} (능력치 +3, 특성 +1)`);
    else if (e.t === 'skill') this.toast(`${e.name} 레벨 업! Lv.${e.level}`);
    else if (e.t === 'arrive' && e.what === 'fac') { const f = this.game.world?.map.facilities[e.idx]; if (f) { this.npcId = f.npc ?? 'elder'; this.open(f.kind); this.refresh(true); } }
    else if (e.t === 'respawn') this.toast('마을에서 다시 깨어났습니다');
    else if (e.t === 'boss') this.toast(`${e.name}을(를) 쓰러뜨렸습니다!`);
    else if (e.t === 'faint') this.toast('쓰러졌습니다... 잠시 후 부활합니다');
  }

  private open(p: Panel) { this.panel = p; this.sel = null; this.craftSel = -1; }

  // ───────── 렌더 ─────────
  refresh(force = false) {
    if (force) this.last = {};
    const g = this.game, c = g.char, w = g.world;
    const playing = !!c && !!w;
    for (const id of ['bottom', 'skills', 'quest', 'where']) this.show(id, playing);
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
      ['auto', '자동', 'auto'], ['attacks', '공격', 'open:attacks'], ['items', '아이템', 'open:items'],
      ['talents', '특성', 'open:char', c.statPoints > 0 || c.talentPoints > 0], ['codex', '도감', 'open:codex', Object.keys(NPCS).some((n) => questProgress(c, n)?.done)],
      ['map', '지도', 'open:map'], ['chat', '채팅', 'open:chat'], ['menu', '메뉴', 'open:menu'],
    ];
    // 요약·게이지·버튼을 따로 갱신한다: 체력·마나가 차오를 때 버튼이 다시 만들어져 터치가 씹히지 않도록
    this.put('bsum', `<div class="face"><img class="px" src="${portraitUrl(c.look)}" alt=""></div>
      <div class="who"><b>${esc(c.name)}</b><span class="ui-muted">${CLASSES[c.cls].name}</span><span class="ui-accent">Lv.${c.level}</span></div>`);
    this.put('bgauge', `<label>HP</label>${bar('hp', c.hp, d.maxHp, `${Math.ceil(c.hp)} / ${d.maxHp}`)}
      <label>MP</label>${bar('mp', c.mp, d.maxMp, `${Math.floor(c.mp)} / ${d.maxMp}`)}
      <label>XP</label>${bar('xp', c.xp, need, `${c.xp.toLocaleString()} / ${need.toLocaleString()}`)}`);
    this.put('bmenu', menu.map(([ic, label, act, dot]) => {
      const on = act === 'auto' ? c.auto : this.panel === act.slice(5);
      return `<button class="ui-menubtn ${on ? 'on' : ''}" data-act="${act}" aria-label="${label}${dot ? ' (새 항목)' : ''}" ${act === 'auto' ? `aria-pressed="${c.auto}"` : ''}>${pixelIcon(ic)}<span>${label}</span>${dot ? '<i class="dot"></i>' : ''}</button>`;
    }).join(''));

    const act = w.map.boss ? '보스전' : c.activity.k === 'gather' ? `${NODES[c.activity.node].name} 채집` : w.map.spawns.length ? '사냥' : '휴식';
    this.put('where', `<div class="ui-sm">${w.map.name} <span class="ui-muted">· ${act} ⓘ</span></div><div class="ui-accent">${icon('coin')} ${g.acc.coins.toLocaleString()}</div>`);
    // 보스 체력 바
    const boss = w.mobs.find((m) => m.def.boss && m.alive);
    this.show('bossbar', !!boss);
    if (boss) this.put('bossbar', `<b>${boss.def.name}</b>${bar('hp', boss.hp, boss.def.hp, `${Math.max(0, Math.ceil(boss.hp)).toLocaleString()} / ${boss.def.hp.toLocaleString()}`)}`);

    // 공격 바: 배운 액티브 스킬(원형 칸)
    this.put('skills', TALENTS.filter((t) => t.active && c.talents[t.id] && (!t.cls || t.cls === c.cls)).map((t) => {
      const cd = w.player.cd[t.id] ?? 0, low = c.mp < t.active!.mana;
      return `<button class="ui-slot round skill ${low ? 'nomp' : ''}" data-skill="${t.id}" aria-label="${t.name}${cd > 0 ? ` (${Math.ceil(cd)}초)` : low ? ' (마나 부족)' : ''}"><span class="nm">${t.name}</span>${cd > 0 ? `<span class="cool">${Math.ceil(cd)}</span>` : ''}</button>`;
    }).join(''));

    // 진행 중인 퀘스트를 NPC마다 한 줄씩
    const lines: string[] = [];
    if (c.cls === 'beginner' && c.level >= CLASS_LEVEL) lines.push(`<span class="ui-accent">★ 전직 가능! 마을의 ${NPCS[CLASS_NPC].name}을(를) 찾아가세요</span>`);
    for (const n of Object.values(NPCS)) {
      const q = currentQuest(c, n.id), qp = questProgress(c, n.id);
      if (q && qp && c.quests[n.id]?.accepted) lines.push(`<span class="${qp.done ? 'ui-good' : ''}">${q.name} ${qp.done ? `— 완료! ${n.name}에게` : `${qp.have}/${qp.need}`}</span>`);
    }
    if (!lines.length && w.map.id === 'town' && currentQuest(c, 'elder')) lines.push(`<span class="ui-muted">마을 사람들에게 말을 걸어 보세요</span>`);
    this.put('quest', lines.join('<br>'));

    this.show('modal', !!this.panel);
    if (this.panel) this.put('modal', this.panelHtml(c));
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
            <div class="sw"><span class="ui-sm ui-muted">머리</span><button class="ui-btn sm" data-act="hair:-1" aria-label="이전 머리">◀</button><b>${l.hair + 1} / ${HAIR_STYLES}</b><button class="ui-btn sm" data-act="hair:1" aria-label="다음 머리">▶</button></div>
            ${sw('머리색', 'hairColor', HAIR_COLORS)}${sw('피부', 'skin', SKIN_COLORS)}${sw('옷', 'outfit', OUTFIT_COLORS)}
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
    const add = acc.characters.length < MAX_CHARACTERS ? `<button class="charcard new" data-act="newChar"><span class="ui-xl">＋</span><span>새 캐릭터</span></button>` : '';
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
          return `<button class="ui-slot ${id ? '' : 'empty'}" data-act="pick:eq:${s}" aria-selected="${this.sel === `eq:${s}`}" aria-label="${SLOT_NAMES[s]}${id ? `: ${ITEMS[id].name}` : ' (비어 있음)'}">${id ? icon(id) : ''}<span class="lv">${SLOT_NAMES[s]}</span></button>`;
        }).join('');
        const f = c.food;
        const food = `<button class="ui-slot ${f ? '' : 'empty'}" data-act="pick:food" aria-selected="${this.sel === 'food'}" aria-label="음식 칸${f ? `: ${ITEMS[f.id].name} ${f.qty}개` : ' (비어 있음)'}">${f ? `${icon(f.id)}<span class="qty">${f.qty}</span>` : ''}<span class="lv">음식</span></button>`;
        let cells = '';
        for (let i = 0; i < Math.max(invSize(c), c.inventory.length); i++) {
          const s = c.inventory[i];
          cells += s ? `<button class="ui-slot ${s.qty >= stackCap(c, s.id) ? 'r4' : ''}" data-act="pick:${s.id}" aria-selected="${this.sel === s.id}" aria-label="${ITEMS[s.id].name} ${s.qty}개">${icon(s.id)}${s.qty > 1 ? `<span class="qty">${s.qty}</span>` : ''}</button>`
            : '<div class="ui-slot empty"></div>';
        }
        let detail = '<span class="ui-sm ui-muted">칸을 고르면 자세한 정보가 나옵니다.</span>';
        if (this.sel === 'food') {
          detail = f ? `<div class="ui-row"><span class="ui-slot">${icon(f.id)}</span><div><b>${ITEMS[f.id].name}</b><div class="ui-xs ui-muted">음식 칸 · ${f.qty}개</div></div></div>
            <span class="ui-sm">${ITEMS[f.id].desc}</span><span class="ui-xs ui-muted">체력이 45% 아래로 떨어지면 자동으로 하나씩 먹습니다.</span>
            <button class="ui-btn" data-act="food:">가방으로</button>` : '<span class="ui-sm ui-muted">음식을 넣어 두면 체력이 낮을 때 자동으로 먹습니다.</span>';
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
            <div class="ui-row" style="flex-wrap:wrap">${it.slot ? `<button class="ui-btn success" data-act="equip:${it.id}">장착</button>` : ''}${it.kind === 'food' ? `<button class="ui-btn success" data-act="food:${it.id}">음식 칸에 넣기</button>` : ''}${['bag', 'pouch', 'chest'].includes(it.kind) ? `<button class="ui-btn success" data-act="use:${it.id}">사용</button>` : ''}
              <button class="ui-btn sm" data-act="sell:${it.id}:1">판매 ${it.sell}</button>
              ${n > 1 ? `<button class="ui-btn sm" data-act="sell:${it.id}:${n}">전부 판매 ${it.sell * n}</button>` : ''}</div>`;
        }
        return win(`아이템 <span class="ui-sm ui-muted">${c.inventory.length}/${invSize(c)}</span>`, `
          <div class="split"><div><h3>장비</h3><div class="ui-grid eq">${eq}${food}</div><h3>가방</h3><div class="ui-grid bag">${cells}</div></div>
          <div class="ui-detail">${detail}</div></div>`);
      }

      case 'char': {
        const body = tab === 0 ? this.statsHtml(c) : this.talentsHtml(c);
        return win('캐릭터', `${tabs([`능력치${c.statPoints ? ` (${c.statPoints})` : ''}`, `특성${c.talentPoints ? ` (${c.talentPoints})` : ''}`], tab, tabAct)}<div class="ui-tabpanel">${body}</div>`);
      }

      case 'attacks': {
        const act = TALENTS.filter((t) => t.active && (!t.cls || t.cls === c.cls));
        const list = act.map((t) => {
          const lv = c.talents[t.id] ?? 0;
          return `<div class="ui-detail"><div class="ui-row"><b class="ui-grow">${t.name}</b><span class="ui-sm ${lv ? 'ui-accent' : 'ui-muted'}">${lv ? `Lv.${lv}` : '미습득'}</span></div>
            <span class="ui-sm">${t.desc(Math.max(1, lv))}</span><span class="ui-xs ui-muted">마나 ${t.active!.mana} · 재사용 ${t.active!.cooldown}초</span></div>`;
        }).join('');
        return win('공격', `<p class="ui-sm ui-muted">배운 액티브 특성은 화면 오른쪽 아래 공격 칸에 놓입니다. 자동 모드에서는 알아서 사용합니다.</p><div class="stack">${list}</div>`);
      }

      case 'codex': {
        let body = '';
        if (tab === 0) {
          const slots = c.cardSlots.map((id, i) => id
            ? `<button class="ui-slot r3" data-act="cardoff:${i}" aria-label="${MONSTERS[id].name} 카드 빼기"><img class="px" src="${iconUrl(`mob_${id}`)}" alt=""></button>`
            : `<div class="ui-slot empty" aria-label="빈 카드 칸"></div>`).join('');
          body = `<h3 style="margin-top:0">장착 ${c.cardSlots.filter(Boolean).length}/${CARD_SLOTS} <span class="ui-xs ui-muted">— 장착한 카드만 효과가 있습니다(캐릭터마다)</span></h3><div class="ui-grid">${slots}</div><h3>수집</h3>` + CARDS.map((cd) => {
            const n = g.acc.cards[cd.monster] ?? 0, tier = cardTier(n), next = cardNext(n), on = c.cardSlots.includes(cd.monster);
            const free = c.cardSlots.indexOf(null);
            const btn = !n ? '' : on ? `<button class="ui-btn sm" data-act="cardoff:${c.cardSlots.indexOf(cd.monster)}">빼기</button>`
              : `<button class="ui-btn sm primary" data-act="cardon:${cd.monster}" ${free >= 0 ? '' : 'disabled'}>장착</button>`;
            return `<div class="ui-row line"><span class="ui-slot ${tier >= 3 ? 'r4' : tier === 2 ? 'r3' : tier === 1 ? 'r2' : 'locked'}"><img class="px" style="${n ? '' : 'filter:brightness(0)'}" src="${iconUrl(`mob_${cd.monster}`)}" alt=""></span>
              <div class="ui-grow"><b>${n ? MONSTERS[cd.monster].name : '???'}</b> <span class="ui-accent">${'★'.repeat(tier)}${'☆'.repeat(3 - tier)}</span>
              <div class="ui-sm ${on ? 'ui-good' : 'ui-muted'}">${cd.label} +${Math.round(cd.per * Math.max(1, tier) * 100)}%${on ? ' (적용 중)' : ''}</div>
              <div class="ui-xs ui-muted">${next ? `보유 ${n} / 다음 단계 ${next}` : `보유 ${n} · 최고 단계`}</div></div>${btn}</div>`;
          }).join('') + '<p class="ui-xs ui-muted">카드는 몬스터가 드물게 떨어뜨립니다. 모은 카드는 모든 캐릭터가 함께 쓰고, 장착은 캐릭터마다 따로 합니다.</p>';
        } else {
          body = Object.values(NPCS).map((n) => {
            const st = c.quests[n.id] ?? { idx: 0, accepted: false, prog: 0 };
            return `<h3>${n.name}</h3>` + n.quests.map((q, i) => {
              const pr = questProgress(c, n.id);
              const s2 = i < st.idx ? '<span class="ui-good">완료</span>' : i === st.idx ? (st.accepted ? `<span class="ui-accent">진행 중 ${pr!.have}/${pr!.need}</span>` : '<span class="ui-muted">수락 가능</span>') : '<span class="ui-muted">잠김</span>';
              return `<div class="ui-row line"><b class="ui-grow">${i <= st.idx ? q.name : '???'}</b><span class="ui-sm">${s2}</span></div>`;
            }).join('');
          }).join('');
        }
        return win('도감', `${tabs(['카드', '퀘스트'], tab, tabAct)}<div class="ui-tabpanel">${body}</div>`);
      }

      case 'map': {
        // 1월드: 마을 → 풀밭 → 언덕 → 숲 → 보스. 앞 맵에서 처치 조건을 채우면 다음 맵이 열린다.
        const chain = ['town', 'meadow', 'hills', 'forest', 'lair'];
        let open = true;
        const nodes = chain.map((id, i) => {
          const m = MAPS[id], here = c.mapId === id;
          if (i > 0) {
            const prev = MAPS[chain[i - 1]], gate = prev.portals.find((p) => p.to === id);
            open = open && (c.kills[prev.id] ?? 0) >= (gate?.reqKills ?? 0);
          }
          const gate = m.portals.find((p) => p.reqKills && chain.includes(p.to));
          const sub = m.boss ? (g.acc.bosses[m.boss] ? `처치 ${g.acc.bosses[m.boss]}회` : '열쇠 필요') : m.spawns.length ? `처치 ${(c.kills[id] ?? 0).toLocaleString()}${gate ? ` / ${gate.reqKills}` : ''}` : '마을';
          return `<div class="mapnode ${here ? 'here' : ''} ${open ? '' : 'locked'}"><b>${open ? m.name : '???'}</b><span class="ui-xs ${here ? 'ui-accent' : 'ui-muted'}">${here ? '현재 위치' : sub}</span></div>`;
        }).join('<span class="mapline"></span>');
        const next = g.acc.bosses.mossking ? '<span class="mapline"></span><div class="mapnode locked"><b>2월드</b><span class="ui-xs ui-muted">준비 중</span></div>' : '';
        return win('지도', `<div class="mapchain">${nodes}${next}</div>
          <p class="ui-xs ui-muted">맵 사이는 포탈로 걸어서 이동합니다. 각 맵에서 몬스터를 충분히 처치하면 다음 맵 포탈이 열리고, 숲 끝의 둥지에는 열쇠가 있어야 들어갈 수 있습니다.</p>`);
      }

      case 'chat':
        return win('채팅', '<p class="ui-muted">채팅은 온라인 기능과 함께 열립니다.</p>');

      case 'menu':
        return win('메뉴', `<div class="stack">
          <button class="ui-btn block" data-act="open:afkinfo">방치 정보</button>
          <button class="ui-btn block" data-act="chars">캐릭터 선택으로</button>
          <p class="ui-xs ui-muted">진행 상황은 이 기기에 자동 저장됩니다. 선택하지 않은 캐릭터도 마지막 대상을 계속 사냥·채집합니다.</p></div>`);

      case 'npc': {
        const npc = NPCS[this.npcId] ?? NPCS.elder;
        const speaker = (body: string) => `<div class="ui-dialog" role="dialog" aria-label="${npc.name}"><div class="speaker"><div class="face"><img class="px" src="${portraitUrl(npc.look)}" alt=""></div>${npc.name}</div>
          <div class="ui-grow stack">${body}</div><button class="ui-btn sm close" data-act="close" aria-label="닫기">✕</button></div>`;
        if (npc.id === CLASS_NPC && c.cls === 'beginner' && c.level >= CLASS_LEVEL) {
          return speaker(`<p>“많이 강해졌구먼! 이제 자네의 길을 정할 때일세.” <span class="ui-xs ui-bad">(한 번 고르면 바꿀 수 없습니다)</span></p>
            ${(['warrior', 'archer', 'mage'] as ClassId[]).map((id) => `<div class="ui-row line"><div class="ui-grow"><b>${CLASSES[id].name}</b><div class="ui-sm ui-muted">${CLASSES[id].desc}</div></div><button class="ui-btn primary" data-act="class:${id}">전직</button></div>`).join('')}`);
        }
        const q = currentQuest(c, npc.id), p = questProgress(c, npc.id), st = c.quests[npc.id] ?? { idx: 0, accepted: false };
        if (!q || !p) return speaker('<p>“고맙네! 지금은 부탁할 일이 없다네.”</p>');
        const goal = 'kill' in q.goal ? `${MONSTERS[q.goal.kill].name} ${q.goal.n}마리 처치` : `${ITEMS[q.goal.item].name} ${q.goal.n}개 가져오기`;
        const r = q.reward;
        const rew = [r.coins ? `${icon('coin')} ${r.coins}` : '', r.xp ? `경험치 ${r.xp}` : '', r.item ? `${icon(r.item)} ${ITEMS[r.item].name}` : ''].filter(Boolean).join(' · ');
        const btn = !st.accepted ? `<button class="ui-btn primary" data-act="qaccept:${npc.id}">수락</button>`
          : `<button class="ui-btn success" data-act="qdone:${npc.id}" ${p.done ? '' : 'disabled'}>완료</button>`;
        return speaker(`<div><b class="ui-accent">${q.name}</b> <span class="ui-xs ui-muted">${st.idx + 1}/${npc.quests.length}</span></div><p>“${q.text}”</p>
          <div class="ui-sm">목표: ${goal}${st.accepted ? ` <b class="${p.done ? 'ui-good' : 'ui-accent'}">(${p.have}/${p.need})</b>` : ''}</div>
          <div class="ui-sm ui-muted">보상: ${rew}</div><div class="ui-row"><span class="ui-grow"></span>${btn}</div>`);
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
          const mats = r.mats.map(([id, n]) => {
            const have = haveMat(g.acc, c, id), st = storageCount(g.acc, id);
            return `<span>${icon(id)} ${ITEMS[id].name}${st ? ` <span class="ui-xs ui-muted">(창고 ${st})</span>` : ''}</span><span class="${have >= n ? 'ui-good' : 'ui-bad'}">${have}/${n}</span>`;
          }).join('');
          detail = `<div class="ui-row"><span class="ui-slot">${icon(r.item)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${it.slot ? SLOT_NAMES[it.slot] : r.unlock ? `모루 ${r.unlock}단계 열기` : '소모품'}${r.tier && r.tier > 1 ? ` · ${r.tier}단계` : ''}${r.smithLv ? ` · 대장 Lv.${r.smithLv}` : ''}${it.reqLv ? ` · Lv.${it.reqLv}` : ''}${who}</div></div></div>
            <span class="ui-sm ${it.stats ? 'ui-good' : ''}">${it.stats ? statLine(it.id) : it.desc}</span>
            <div class="ui-kv mats">${mats}<span>${icon('coin')} 코인</span><span class="${g.acc.coins >= r.coins ? 'ui-good' : 'ui-bad'}">${g.acc.coins}/${r.coins}</span></div>
            ${recipeLock(g.acc, c, this.craftSel) ? `<span class="ui-sm ui-bad">${recipeLock(g.acc, c, this.craftSel)}${(r.tier ?? 1) > g.acc.anvilTier ? ' — 기타 탭의 모루 확장으로 열립니다' : ''}</span>` : ''}
            <button class="ui-btn primary block" data-act="craft:${this.craftSel}" ${canCraft(g.acc, c, this.craftSel) ? '' : 'disabled'}>${r.unlock ? '확장' : '제작'}</button>
            <span class="ui-xs ui-muted">재료는 가방에서 먼저, 모자라면 창고에서 씁니다.</span>`;
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
    const d = derive(c, this.game.acc.cards);
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

  private talentsHtml(c: Character): string {
    // 원작처럼 단계별 탭: 초보자 특성 / 직업 특성(전직 후). 포인트는 공용
    const hasCls = c.cls !== 'beginner';
    const sub = hasCls ? this.tab.talentTab ?? 1 : 0;
    const list = TALENTS.filter((t) => (sub === 0 ? !t.cls : t.cls === c.cls)).map((t) => {
      const lv = c.talents[t.id] ?? 0;
      return `<div class="ui-row line"><div class="ui-grow"><b>${t.name}</b> <span class="ui-xs ui-accent">Lv.${lv}/${t.max}</span>
        <span class="ui-xs ui-muted">${t.active ? `액티브 · 마나 ${t.active.mana} · 재사용 ${t.active.cooldown}초` : '패시브'}</span>
        <div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${t.desc(Math.max(1, lv))}</div>
        ${lv && lv < t.max ? `<div class="ui-xs ui-muted">다음: ${t.desc(lv + 1)}</div>` : ''}</div>
        <button class="ui-btn sm primary" data-act="talent:${t.id}" aria-label="${t.name} 올리기" ${c.talentPoints && lv < t.max ? '' : 'disabled'}>＋</button></div>`;
    }).join('');
    const subtabs = `<div class="subtabs"><button class="ui-btn sm ${sub === 0 ? 'primary' : ''}" data-act="ttab:0">초보자</button>
      <button class="ui-btn sm ${sub === 1 ? 'primary' : ''}" data-act="ttab:1" ${hasCls ? '' : 'disabled'}>${hasCls ? CLASSES[c.cls].name : `전직 후 (Lv.${CLASS_LEVEL})`}</button></div>`;
    return `<div class="ui-row">${subtabs}<span class="ui-grow"></span><span>남은 포인트</span><b class="ui-accent ui-lg">${c.talentPoints}</b></div>${list}`;
  }

  // ───────── 입력 ─────────
  private onClick(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) {
      if ((e.target as HTMLElement).id === 'modal' && this.panel !== 'afk') { this.panel = null; this.refresh(); }
      return;
    }
    const [act, a, b] = el.dataset.act!.split(':');
    const g = this.game, c = g.char;
    const fail = (msg: string | null) => { if (msg) this.toast(msg); };
    switch (act) {
      case 'newChar': this.creating = true; this.draft = this.randomDraft(); break;
      case 'cancelCreate': this.creating = false; break;
      case 'hair': this.draft.look.hair = (this.draft.look.hair + +a + HAIR_STYLES) % HAIR_STYLES; break;
      case 'look': this.draft.look[a as 'hairColor' | 'skin' | 'outfit'] = b; break;
      case 'create': {
        const made = g.create(this.draft.name || '모험가', { ...this.draft.look });
        if (made) { this.creating = false; g.select(g.acc.characters.length - 1); }
        break;
      }
      case 'select': g.select(+a); break;
      case 'chars': this.panel = null; g.leave(); break;
      // 같은 메뉴 버튼을 다시 누르면 닫힌다
      case 'open': if (this.panel === a) this.panel = null; else this.open(a as Panel); break;
      case 'close': this.panel = null; this.afk = null; break;
      case 'tab': this.tab[a as Exclude<Panel, null>] = +b; this.craftSel = -1; break;
      case 'auto': if (c) c.auto = !c.auto; break;
      case 'csel': this.craftSel = +a; break;
      case 'use': if (c) { const err = useItem(g.acc, c, a); fail(err); if (!err) { this.toast(`${ITEMS[a].name} 사용!`, a); this.sel = null; } } break;
      case 'put': if (c) deposit(g.acc, c, a); break;
      case 'take': if (c) { if (!withdraw(g.acc, c, a)) this.toast('가방에 자리가 없습니다'); } break;
      case 'putall': if (c) { const n = depositAll(g.acc, c); this.toast(n ? `${n}종류를 창고에 맡겼습니다` : '맡길 재료가 없습니다'); } break;
      case 'buy': if (c) { const err = buy(g.acc, c, +a, +b, Date.now()); fail(err); if (!err) this.toast(`${ITEMS[SHOP[+a].item].name} ×${b} 구입`, SHOP[+a].item); } break;
      case 'prod': if (c) fail(setProduct(c, a || null, this.prodSlot)); break;
      case 'pslot': this.prodSlot = +a; break;
      case 'ttab': this.tab.talentTab = +a; break;
      case 'cardon': if (c) fail(equipCard(g.acc, c, a, c.cardSlots.indexOf(null))); break;
      case 'cardoff': if (c) unequipCard(g.acc, c, +a); break;
      case 'apt': if (c) spendAnvilPoint(c, a as 'cap' | 'spd' | 'xp'); break;
      case 'collect': if (c) { const it = c.anvil.slots[this.prodSlot]?.prod; const n = collectAnvil(g.acc, c, a === 'store', this.prodSlot); if (n && it) this.toast(`${ITEMS[it].name} ${n}개를 ${a === 'store' ? '창고' : '가방'}로`, it); else this.toast(a === 'store' ? '창고가 가득 찼습니다' : '가방에 자리가 없습니다'); } break;
      case 'class': if (c) { const err = advanceClass(c, a as ClassId); fail(err); if (!err) { this.toast(`${CLASSES[c.cls].name}(으)로 전직했습니다!`); this.panel = 'char'; this.tab.char = 1; } } break;
      case 'pick': this.sel = b ? `${a}:${b}` : a; break;
      case 'equip': if (c) { fail(equipItem(c, a)); this.sel = null; } break;
      case 'food': if (c) { fail(setFood(c, a || null)); this.sel = a ? 'food' : null; } break;
      case 'unequip': if (c) { fail(unequipItem(c, a as EquipSlot)); this.sel = null; } break;
      case 'sell': if (c) { const gain = sellItem(g.acc, c, a, +b); if (gain) this.toast(`+${gain} 코인`, 'coin'); } break;
      case 'stat': if (c) spendStat(c, a as StatKey); break;
      case 'talent': if (c) learnTalent(c, a); break;
      case 'qaccept': if (c && acceptQuest(c, a)) { this.toast(`퀘스트 수락: ${currentQuest(c, a)!.name}`); this.panel = null; } break;
      case 'qdone': if (c) { const name = currentQuest(c, a)?.name; const err = completeQuest(g.acc, c, a); fail(err); if (!err) this.toast(`퀘스트 완료: ${name}`); } break;
      case 'craft': if (c) { const err = craft(g.acc, c, +a); fail(err); if (!err) this.toast(`${ITEMS[RECIPES[+a].item].name} 제작 완료!`, RECIPES[+a].item); } break;
    }
    if (c && act !== 'select' && act !== 'chars') g.save();
    this.refresh();
  }
}
