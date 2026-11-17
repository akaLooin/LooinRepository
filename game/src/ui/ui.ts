// DOM 기반 UI. 게임 상태를 읽어 HTML을 만들고, data-act 속성으로 동작을 위임 처리한다.
// 모양은 전부 components.css 의 부품(ui-*)과 tokens.css 의 역할 토큰으로 그린다.
import { AfkReport } from '../core/afk';
import {
  CARDS, CLASSES, CLASS_LEVEL, ClassId, EquipSlot, HAIR_COLORS, HAIR_STYLES, INVENTORY_SIZE, ITEMS, MAPS, MAX_CHARACTERS,
  MONSTERS, NODES, NPC_LOOK, NPC_NAME, OUTFIT_COLORS, QUESTS, RECIPES, SKILL_NAMES, SKIN_COLORS, SLOT_NAMES, STAT_DESC,
  STAT_NAMES, SkillKey, StatKey, TALENTS, cardNext, cardTier,
} from '../core/data';
import {
  Character, Look, acceptQuest, advanceClass, canCraft, completeQuest, countItem, craft, currentQuest, derive, equipItem,
  dmgTaken, hitChance, learnTalent, questProgress, sellItem, setFood, skillXpToNext, spendStat, unequipItem, xpToNext,
} from '../core/state';
import { WorldEvent } from '../core/world';
import { Game } from '../game';
import { ITEM_ICON, iconUrl, portraitUrl } from '../render/sprites';
import { pixelIcon } from './icons';

type Panel = 'afk' | 'items' | 'attacks' | 'char' | 'codex' | 'map' | 'chat' | 'menu' | 'craft' | 'npc' | null;

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
  private tab: Partial<Record<Exclude<Panel, null>, number>> = {};
  private sel: string | null = null;      // 가방에서 선택한 아이템
  private afk: AfkReport | null = null;
  private craftSel = -1;
  private creating = false;
  private draft: { name: string; look: Look } = this.randomDraft();
  private last: Record<string, string> = {};

  constructor(private game: Game) {
    this.root.classList.add('ui');
    this.root.innerHTML = `
      <div id="quest" class="hidden"></div>
      <div id="where" class="hidden"></div>
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
    else if (e.t === 'arrive' && e.what !== 'portal') { this.open(e.what === 'npc' ? 'npc' : 'craft'); this.refresh(true); }
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
      ['talents', '특성', 'open:char', c.statPoints > 0 || c.talentPoints > 0], ['codex', '도감', 'open:codex', !!questProgress(c)?.done],
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

    const act = c.activity.k === 'gather' ? `${NODES[c.activity.node].name} 채집` : w.map.spawns.length ? '사냥' : '휴식';
    this.put('where', `<div class="ui-sm">${w.map.name} <span class="ui-muted">· ${act}</span></div><div class="ui-accent">${icon('coin')} ${g.acc.coins.toLocaleString()}</div>`);

    // 공격 바: 배운 액티브 스킬(원형 칸)
    this.put('skills', TALENTS.filter((t) => t.active && c.talents[t.id] && (!t.cls || t.cls === c.cls)).map((t) => {
      const cd = w.player.cd[t.id] ?? 0, low = c.mp < t.active!.mana;
      return `<button class="ui-slot round skill ${low ? 'nomp' : ''}" data-skill="${t.id}" aria-label="${t.name}${cd > 0 ? ` (${Math.ceil(cd)}초)` : low ? ' (마나 부족)' : ''}"><span class="nm">${t.name}</span>${cd > 0 ? `<span class="cool">${Math.ceil(cd)}</span>` : ''}</button>`;
    }).join(''));

    const q = currentQuest(c), qp = questProgress(c);
    this.put('quest', c.cls === 'beginner' && c.level >= CLASS_LEVEL ? `<span class="ui-accent">★ 전직 가능! 마을의 ${NPC_NAME}을(를) 찾아가세요</span>`
      : q && qp && c.quest.accepted ? `<span class="${qp.done ? 'ui-good' : ''}">${q.name} ${qp.done ? '— 완료! 촌장에게 돌아가세요' : `${qp.have}/${qp.need}`}</span>`
        : q && w.map.id === 'town' ? `<span class="ui-muted">마을의 ${NPC_NAME}에게 말을 걸어 보세요</span>` : '');

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
          ${r.lost ? `<p class="ui-sm ui-bad">가방이 가득 차 아이템 ${r.lost}개를 잃었습니다.</p>` : ''}
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
        for (let i = 0; i < INVENTORY_SIZE; i++) {
          const s = c.inventory[i];
          cells += s ? `<button class="ui-slot" data-act="pick:${s.id}" aria-selected="${this.sel === s.id}" aria-label="${ITEMS[s.id].name} ${s.qty}개">${icon(s.id)}${s.qty > 1 ? `<span class="qty">${s.qty}</span>` : ''}</button>`
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
          detail = `<div class="ui-row"><span class="ui-slot">${icon(it.id)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${it.slot ? SLOT_NAMES[it.slot] : '재료'} · ${n}개</div></div></div>
            <span class="ui-sm">${it.desc}</span>
            ${it.stats ? `<span class="ui-sm ui-good">${statLine(it.id)}</span>` : ''}
            ${it.reqLv ? `<span class="ui-xs ${c.level >= it.reqLv ? 'ui-muted' : 'ui-bad'}">Lv.${it.reqLv} 필요</span>` : ''}
            <div class="ui-row" style="flex-wrap:wrap">${it.slot ? `<button class="ui-btn success" data-act="equip:${it.id}">장착</button>` : ''}${it.kind === 'food' ? `<button class="ui-btn success" data-act="food:${it.id}">음식 칸에 넣기</button>` : ''}
              <button class="ui-btn sm" data-act="sell:${it.id}:1">판매 ${it.sell}</button>
              ${n > 1 ? `<button class="ui-btn sm" data-act="sell:${it.id}:${n}">전부 판매 ${it.sell * n}</button>` : ''}</div>`;
        }
        return win(`아이템 <span class="ui-sm ui-muted">${c.inventory.length}/${INVENTORY_SIZE}</span>`, `
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
          body = CARDS.map((cd) => {
            const n = g.acc.cards[cd.monster] ?? 0, tier = cardTier(n), next = cardNext(n);
            return `<div class="ui-row line"><span class="ui-slot ${tier >= 3 ? 'r4' : tier === 2 ? 'r3' : tier === 1 ? 'r2' : 'locked'}"><img class="px" style="${n ? '' : 'filter:brightness(0)'}" src="${iconUrl(`mob_${cd.monster}`)}" alt=""></span>
              <div class="ui-grow"><b>${n ? MONSTERS[cd.monster].name : '???'}</b> <span class="ui-accent">${'★'.repeat(tier)}${'☆'.repeat(3 - tier)}</span>
              <div class="ui-sm ${tier ? 'ui-good' : 'ui-muted'}">${cd.label} +${Math.round(cd.per * Math.max(1, tier) * 100)}%${tier ? '' : ' (미획득)'}</div>
              <div class="ui-xs ui-muted">${next ? `보유 ${n} / 다음 단계 ${next}` : `보유 ${n} · 최고 단계`}</div></div></div>`;
          }).join('') + '<p class="ui-xs ui-muted">카드는 몬스터가 가끔 떨어뜨리며, 효과는 모든 캐릭터에게 적용됩니다.</p>';
        } else {
          body = QUESTS.map((q, i) => {
            const st = i < c.quest.idx ? '<span class="ui-good">완료</span>' : i === c.quest.idx ? (c.quest.accepted ? `<span class="ui-accent">진행 중 ${questProgress(c)!.have}/${questProgress(c)!.need}</span>` : '<span class="ui-muted">수락 가능</span>') : '<span class="ui-muted">잠김</span>';
            return `<div class="ui-row line"><b class="ui-grow">${i <= c.quest.idx ? q.name : '???'}</b><span class="ui-sm">${st}</span></div>`;
          }).join('');
        }
        return win('도감', `${tabs(['카드', '퀘스트'], tab, tabAct)}<div class="ui-tabpanel">${body}</div>`);
      }

      case 'map': {
        const order = ['town', 'meadow', 'hills', 'forest'];
        const rows = order.map((id) => {
          const m = MAPS[id], here = c.mapId === id;
          const kills = c.kills[id] ?? 0;
          const gate = m.portals.find((p) => p.reqKills);
          return `<div class="ui-row line"><span class="ui-grow"><b>${m.name}</b>${here ? ' <span class="ui-accent">· 현재 위치</span>' : ''}</span>
            <span class="ui-sm ui-muted">${m.spawns.length ? `처치 ${kills}${gate ? ` / 다음 맵 ${gate.reqKills}` : ''}` : '마을'}</span></div>`;
        }).join('');
        return win('지도', `<p class="ui-sm ui-muted">맵 사이는 포탈로 걸어서 이동합니다. 각 맵에서 몬스터를 충분히 처치하면 다음 맵 포탈이 열립니다.</p>${rows}`);
      }

      case 'chat':
        return win('채팅', '<p class="ui-muted">채팅은 온라인 기능과 함께 열립니다.</p>');

      case 'menu':
        return win('메뉴', `<div class="stack">
          <button class="ui-btn block" data-act="chars">캐릭터 선택으로</button>
          <p class="ui-xs ui-muted">진행 상황은 이 기기에 자동 저장됩니다. 선택하지 않은 캐릭터도 마지막 대상을 계속 사냥·채집합니다.</p></div>`);

      case 'npc': {
        const speaker = (body: string) => `<div class="ui-dialog" role="dialog" aria-label="${NPC_NAME}"><div class="speaker"><div class="face"><img class="px" src="${portraitUrl(NPC_LOOK)}" alt=""></div>${NPC_NAME}</div>
          <div class="ui-grow stack">${body}</div><button class="ui-btn sm close" data-act="close" aria-label="닫기">✕</button></div>`;
        if (c.cls === 'beginner' && c.level >= CLASS_LEVEL) {
          return speaker(`<p>“많이 강해졌구먼! 이제 자네의 길을 정할 때일세.” <span class="ui-xs ui-bad">(한 번 고르면 바꿀 수 없습니다)</span></p>
            ${(['warrior', 'archer', 'mage'] as ClassId[]).map((id) => `<div class="ui-row line"><div class="ui-grow"><b>${CLASSES[id].name}</b><div class="ui-sm ui-muted">${CLASSES[id].desc}</div></div><button class="ui-btn primary" data-act="class:${id}">전직</button></div>`).join('')}`);
        }
        const q = currentQuest(c), p = questProgress(c);
        if (!q || !p) return speaker('<p>“고맙네! 지금은 부탁할 일이 없다네.”</p>');
        const goal = 'kill' in q.goal ? `${MONSTERS[q.goal.kill].name} ${q.goal.n}마리 처치` : `${ITEMS[q.goal.item].name} ${q.goal.n}개 가져오기`;
        const r = q.reward;
        const rew = [r.coins ? `${icon('coin')} ${r.coins}` : '', r.xp ? `경험치 ${r.xp}` : '', r.item ? `${icon(r.item)} ${ITEMS[r.item].name}` : ''].filter(Boolean).join(' · ');
        const btn = !c.quest.accepted ? '<button class="ui-btn primary" data-act="qaccept">수락</button>'
          : `<button class="ui-btn success" data-act="qdone" ${p.done ? '' : 'disabled'}>완료</button>`;
        return speaker(`<div><b class="ui-accent">${q.name}</b> <span class="ui-xs ui-muted">${c.quest.idx + 1}/${QUESTS.length}</span></div><p>“${q.text}”</p>
          <div class="ui-sm">목표: ${goal}${c.quest.accepted ? ` <b class="${p.done ? 'ui-good' : 'ui-accent'}">(${p.have}/${p.need})</b>` : ''}</div>
          <div class="ui-sm ui-muted">보상: ${rew}</div><div class="ui-row"><span class="ui-grow"></span>${btn}</div>`);
      }

      case 'craft': {
        // 분류 탭 + 아이콘 격자 + 선택한 품목 상세. 품목이 늘어도 목록이 길어지지 않는다.
        const groups: [string, (s: EquipSlot) => boolean][] = [
          ['무기', (s) => s === 'weapon'], ['방어구', (s) => s === 'hat' || s === 'body'], ['도구', (s) => s === 'pickaxe' || s === 'axe'],
        ];
        const list = RECIPES.map((r, i) => ({ r, i })).filter(({ r }) => groups[tab][1](ITEMS[r.item].slot!));
        if (!list.some((x) => x.i === this.craftSel)) this.craftSel = list[0]?.i ?? -1;
        let cells = '';
        for (let n = 0; n < Math.max(12, Math.ceil(list.length / 4) * 4); n++) {
          const x = list[n];
          cells += x ? `<button class="ui-slot ${canCraft(g.acc, c, x.i) ? 'ready' : 'short'}" data-act="csel:${x.i}" aria-selected="${x.i === this.craftSel}" aria-label="${ITEMS[x.r.item].name}">${icon(x.r.item)}</button>` : '<div class="ui-slot empty"></div>';
        }
        let detail = '';
        const r = RECIPES[this.craftSel];
        if (r) {
          const it = ITEMS[r.item];
          const who = it.wtype ? ` · ${Object.values(CLASSES).filter((k) => k.weapon === it.wtype && k.id !== 'beginner').map((k) => k.name).join('/')}` : '';
          const mats = r.mats.map(([id, n]) => `<span>${icon(id)} ${ITEMS[id].name}</span><span class="${countItem(c, id) >= n ? 'ui-good' : 'ui-bad'}">${countItem(c, id)}/${n}</span>`).join('');
          detail = `<div class="ui-row"><span class="ui-slot">${icon(r.item)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${SLOT_NAMES[it.slot!]}${it.reqLv ? ` · Lv.${it.reqLv}` : ''}${who}</div></div></div>
            <span class="ui-sm ui-good">${statLine(it.id)}</span>
            <div class="ui-kv mats">${mats}<span>${icon('coin')} 코인</span><span class="${g.acc.coins >= r.coins ? 'ui-good' : 'ui-bad'}">${g.acc.coins}/${r.coins}</span></div>
            <button class="ui-btn primary block" data-act="craft:${this.craftSel}" ${canCraft(g.acc, c, this.craftSel) ? '' : 'disabled'}>제작</button>`;
        }
        return win('제작대', `${tabs(groups.map(([n]) => n), tab, tabAct)}<div class="ui-tabpanel split"><div class="ui-grid c4">${cells}</div><div class="ui-detail">${detail}</div></div>`);
      }
    }
    return '';
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
    const list = TALENTS.filter((t) => !t.cls || t.cls === c.cls).map((t) => {
      const lv = c.talents[t.id] ?? 0;
      return `<div class="ui-row line"><div class="ui-grow"><b>${t.name}</b> <span class="ui-xs ui-accent">Lv.${lv}/${t.max}</span>
        ${t.cls ? `<span class="ui-xs ui-good">${CLASSES[t.cls].name} 전용</span>` : ''} <span class="ui-xs ui-muted">${t.active ? `액티브 · 마나 ${t.active.mana} · 재사용 ${t.active.cooldown}초` : '패시브'}</span>
        <div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${t.desc(Math.max(1, lv))}</div>
        ${lv && lv < t.max ? `<div class="ui-xs ui-muted">다음: ${t.desc(lv + 1)}</div>` : ''}</div>
        <button class="ui-btn sm primary" data-act="talent:${t.id}" aria-label="${t.name} 올리기" ${c.talentPoints && lv < t.max ? '' : 'disabled'}>＋</button></div>`;
    }).join('');
    return `<div class="ui-row"><span class="ui-grow">남은 포인트 <span class="ui-xs ui-muted">(레벨마다 1)</span></span><b class="ui-accent ui-lg">${c.talentPoints}</b></div>${list}`;
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
      case 'class': if (c) { const err = advanceClass(c, a as ClassId); fail(err); if (!err) { this.toast(`${CLASSES[c.cls].name}(으)로 전직했습니다!`); this.panel = 'char'; this.tab.char = 1; } } break;
      case 'pick': this.sel = b ? `${a}:${b}` : a; break;
      case 'equip': if (c) { fail(equipItem(c, a)); this.sel = null; } break;
      case 'food': if (c) { fail(setFood(c, a || null)); this.sel = a ? 'food' : null; } break;
      case 'unequip': if (c) { fail(unequipItem(c, a as EquipSlot)); this.sel = null; } break;
      case 'sell': if (c) { const gain = sellItem(g.acc, c, a, +b); if (gain) this.toast(`+${gain} 코인`, 'coin'); } break;
      case 'stat': if (c) spendStat(c, a as StatKey); break;
      case 'talent': if (c) learnTalent(c, a); break;
      case 'qaccept': if (c && acceptQuest(c)) { this.toast(`퀘스트 수락: ${currentQuest(c)!.name}`); this.panel = null; } break;
      case 'qdone': if (c) { const name = currentQuest(c)?.name; const err = completeQuest(g.acc, c); fail(err); if (!err) this.toast(`퀘스트 완료: ${name}`); } break;
      case 'craft': if (c) { const err = craft(g.acc, c, +a); fail(err); if (!err) this.toast(`${ITEMS[RECIPES[+a].item].name} 제작 완료!`, RECIPES[+a].item); } break;
    }
    if (c && act !== 'select' && act !== 'chars') g.save();
    this.refresh();
  }
}
