// DOM 기반 UI. 게임 상태를 읽어 HTML을 만들고, data-act 속성으로 동작을 위임 처리한다.
import { AfkReport } from '../core/afk';
import {
  CARDS, CLASSES, CLASS_LEVEL, ClassId, EquipSlot, HAIR_COLORS, cardNext, cardTier, HAIR_STYLES, INVENTORY_SIZE, ITEMS, MAPS, MAX_CHARACTERS, MONSTERS, NPC_NAME, OUTFIT_COLORS, QUESTS, RECIPES, TALENT, TALENTS,
  SKILL_NAMES, SKIN_COLORS, SLOT_NAMES, STAT_DESC, STAT_NAMES, SkillKey, StatKey,
} from '../core/data';
import {
  Character, Look, acceptQuest, advanceClass, canCraft, completeQuest, countItem, craft, currentQuest, derive, equipItem, learnTalent, questProgress,
  sellItem, skillXpToNext, spendStat, unequipItem, xpToNext,
} from '../core/state';
import { WorldEvent } from '../core/world';
import { Game } from '../game';
import { ITEM_ICON, iconUrl, portraitUrl } from '../render/sprites';

type Panel = 'cards' | 'bag' | 'stats' | 'craft' | 'afk' | 'talents' | 'quest' | null;
const icon = (id: string, cls = 'px') => `<img class="${cls}" src="${iconUrl(ITEM_ICON[id])}" alt="">`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / b) * 100)).toFixed(1)}%`;
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : `${Math.floor(s / 60)}분`);
const STAT_LABEL: Record<string, string> = { dmg: '공격력', def: '방어력', hp: '체력', str: '힘', agi: '민첩', wis: '지혜', luk: '행운', mining: '채광', chopping: '벌목' };
const statLine = (id: string) => Object.entries(ITEMS[id].stats ?? {}).map(([k, v]) => `${STAT_LABEL[k]} +${v}`).join(', ');

export class UI {
  private root = document.getElementById('ui')!;
  private panel: Panel = null;
  private sel: string | null = null;      // 가방에서 선택한 아이템
  private afk: AfkReport | null = null;
  private creating = false;
  private draft: { name: string; look: Look } = this.randomDraft();
  private last: Record<string, string> = {};

  constructor(private game: Game) {
    this.root.innerHTML = `
      <div id="hud" class="box hidden"></div><div id="quest" class="hidden"></div><div id="top" class="hidden"></div>
      <div id="skills" class="hidden"></div>
      <div id="toasts"></div>
      <div id="act" class="hidden"></div>
      <div id="modal" class="hidden"></div>
      <div id="title"></div>`;
    this.root.addEventListener('click', (e) => this.onClick(e));
    // 누르고 있는 동안 동작하는 버튼(이동/점프)
    const hold = (e: Event, on: boolean) => {
      const sk = on ? (e.target as HTMLElement).closest<HTMLElement>('[data-skill]') : null;
      if (sk) { e.preventDefault(); this.game.world?.useSkill(sk.dataset.skill!); this.refresh(); return; }
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-hold]');
      if (!b) return;
      e.preventDefault();
      b.classList.toggle('down', on);
      const k = b.dataset.hold!, inp = this.game.input;
      if (k === 'left') inp.move = on ? -1 : inp.move === -1 ? 0 : inp.move;
      else if (k === 'right') inp.move = on ? 1 : inp.move === 1 ? 0 : inp.move;
      else if (k === 'jump') { if (on) inp.jump = true; }
      else if (k === 'down') inp.down = on;
    };
    this.root.addEventListener('pointerdown', (e) => hold(e, true));
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'pointerout']) this.root.addEventListener(ev, (e) => hold(e, false));
    this.root.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.id === 'cname') this.draft.name = t.value;
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

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
    d.className = 'toast';
    d.innerHTML = (item ? icon(item) : '') + esc(text);
    box.appendChild(d);
    while (box.children.length > 5) box.firstChild!.remove();
    setTimeout(() => d.remove(), 2600);
  }

  onEvent(e: WorldEvent) {
    if (e.t === 'loot') this.toast(e.text, e.item ?? (e.text.includes('코인') ? 'coin' : undefined));
    else if (e.t === 'level') this.toast(`레벨 업! Lv.${e.level} (능력치 +3)`);
    else if (e.t === 'skill') this.toast(`${e.name} 레벨 업! Lv.${e.level}`);
    else if (e.t === 'arrive' && e.what !== 'portal') { this.panel = e.what === 'npc' ? 'quest' : 'craft'; this.sel = null; this.refresh(true); }
    else if (e.t === 'cast') { /* 연출은 렌더러가 담당 */ }
    else if (e.t === 'faint') this.toast('쓰러졌습니다... 잠시 후 부활합니다');
  }

  // ───────── 렌더 ─────────
  refresh(force = false) {
    if (force) this.last = {};
    const g = this.game, c = g.char, w = g.world;
    const playing = !!c && !!w;
    for (const id of ['hud', 'top', 'act', 'skills', 'quest']) this.show(id, playing);
    this.show('title', !playing);
    if (!playing) {
      this.show('modal', false); this.put('title', this.titleHtml());
      const nm = document.getElementById('cname') as HTMLInputElement | null;
      if (nm && nm.value !== this.draft.name) nm.value = this.draft.name;
      return;
    }

    const d = w.d;
    this.put('hud', `
      <div class="face"><img class="px" src="${portraitUrl(c.look)}"></div>
      <div class="col">
        <div class="nm"><span>${esc(c.name)} <span class="dim">${CLASSES[c.cls].name}</span></span><b>Lv.${c.level}</b></div>
        <div class="bar hp"><i style="width:${pct(c.hp, d.maxHp)}"></i><span>${Math.ceil(c.hp)} / ${d.maxHp}</span></div>
        <div class="bar xp"><i style="width:${pct(c.xp, xpToNext(c.level))}"></i><span>${pct(c.xp, xpToNext(c.level))}</span></div>
      </div>`);
    this.put('top', `
      <div class="info box"><div>${w.map.name}</div><div class="coin">${icon('coin')}${g.acc.coins.toLocaleString()}</div></div>
      <button data-act="open:bag">가방</button>
      <button data-act="open:stats">능력치${c.statPoints ? '<i class="dot"></i>' : ''}</button>
      <button data-act="open:talents">특성${c.talentPoints ? '<i class="dot"></i>' : ''}</button>
      <button data-act="open:cards">카드</button>
      <button data-act="chars">캐릭터</button>`);
    this.put('act', `
      <div class="stack">
        <button data-act="mode">${c.mode === 'fight' ? '⚔ 전투' : '⛏ 채집'}</button>
        <button data-act="auto" class="${c.auto ? 'on' : ''}">AUTO ${c.auto ? 'ON' : 'OFF'}</button>
      </div>`);

    this.put('skills', TALENTS.filter((t) => t.active && c.talents[t.id] && (!t.cls || t.cls === c.cls)).map((t) => {
      const cd = w.player.cd[t.id] ?? 0;
      return `<button class="round ${cd > 0 ? 'cd' : ''}" data-skill="${t.id}">${cd > 0 ? Math.ceil(cd) : t.name}</button>`;
    }).join(''));
    const q = currentQuest(c), qp = questProgress(c);
    this.put('quest', c.cls === 'beginner' && c.level >= CLASS_LEVEL ? `<div class="gold-t">★ 전직 가능! 마을의 ${NPC_NAME}을(를) 찾아가세요</div>` : q && qp && c.quest.accepted
      ? `<div class="${qp.done ? 'green-t' : ''}">📜 ${q.name} ${qp.done ? '— 완료! 촌장에게 돌아가세요' : `${qp.have}/${qp.need}`}</div>`
      : q && w.map.id !== 'town' ? '' : q ? `<div class="dim">📜 마을의 ${NPC_NAME}에게 말을 걸어 보세요</div>` : '');

    this.show('modal', !!this.panel);
    if (this.panel) this.put('modal', this.panelHtml(c));
  }

  private titleHtml(): string {
    const acc = this.game.acc;
    if (this.creating || acc.characters.length === 0) {
      const l = this.draft.look;
      const sw = (label: string, key: 'hairColor' | 'skin' | 'outfit', list: string[]) =>
        `<div class="sw"><span>${label}</span>${list.map((col) => `<i data-act="look:${key}:${col}" class="${l[key] === col ? 'sel' : ''}" style="background:${col}"></i>`).join('')}</div>`;
      return `<h1>LOOIN IDLE</h1>
        <div class="creator box">
          <div class="pv"><img class="px" src="${portraitUrl(l)}"></div>
          <div class="opts">
            <input id="cname" maxlength="10" placeholder="이름 (최대 10자)">
            <div class="sw"><span>머리</span><button data-act="hair:-1">◀</button><b>${l.hair + 1} / ${HAIR_STYLES}</b><button data-act="hair:1">▶</button></div>
            ${sw('머리색', 'hairColor', HAIR_COLORS)}${sw('피부', 'skin', SKIN_COLORS)}${sw('옷', 'outfit', OUTFIT_COLORS)}
            <div class="row" style="margin-top:.4em">
              ${acc.characters.length ? '<button data-act="cancelCreate">취소</button>' : ''}
              <span class="grow"></span><button class="gold" data-act="create">모험 시작!</button>
            </div>
          </div>
        </div>`;
    }
    const now = Date.now();
    const cards = acc.characters.map((c, i) => {
      const map = MAPS[c.mapId], away = Math.floor((now - c.lastActive) / 1000);
      const st = !c.auto ? '휴식 중' : c.mode === 'fight' && map.spawns.length ? '사냥 중' : c.mode === 'gather' && map.nodes.length ? '채집 중' : '휴식 중';
      return `<div class="card box" data-act="select:${i}">
        <img class="px" src="${portraitUrl(c.look)}">
        <div><b>${esc(c.name)}</b></div><div class="small gold-t">Lv.${c.level}</div>
        <div class="small dim">${map.name}</div>
        <div class="st">${st}${away >= 60 ? ` · ${dur(away)}` : ''}</div></div>`;
    }).join('');
    const add = acc.characters.length < MAX_CHARACTERS ? `<div class="card box new" data-act="newChar"><div class="big">＋</div><div>새 캐릭터</div></div>` : '';
    return `<h1>LOOIN IDLE</h1><div class="dim small">캐릭터를 선택하세요 — 선택하지 않은 캐릭터는 계속 방치 성장합니다</div><div class="cards">${cards}${add}</div>`;
  }

  private panelHtml(c: Character): string {
    const win = (title: string, body: string, close = true) =>
      `<div class="win box"><header><b>${title}</b>${close ? '<button data-act="close">✕</button>' : ''}</header><div class="body">${body}</div></div>`;
    const g = this.game;
    if (this.panel === 'afk' && this.afk) {
      const r = this.afk;
      const what = r.mode === 'fight' ? '사냥했습니다' : r.mode === 'gather' ? '채집했습니다' : '쉬었습니다 (AUTO를 켜 두면 방치 중에도 성장합니다)';
      const lines: string[] = [];
      if (r.kills) lines.push(`<div>처치 <span>${r.kills.toLocaleString()}</span></div>`);
      if (r.xp) lines.push(`<div>경험치 <span>+${r.xp.toLocaleString()}</span></div>`);
      if (r.coins) lines.push(`<div>코인 <span>+${r.coins.toLocaleString()}</span></div>`);
      if (r.levels) lines.push(`<div>레벨 업 <span>+${r.levels}</span></div>`);
      if (r.skill) lines.push(`<div>${r.skill.name} 경험치 <span>+${r.skill.xp.toLocaleString()}</span></div>`);
      if (r.skill?.levels) lines.push(`<div>${r.skill.name} 레벨 <span>+${r.skill.levels}</span></div>`);
      return win('방치 보상', `
        <div><b>${esc(c.name)}</b>이(가) <span class="gold-t">${dur(r.seconds)}</span> 동안 <b>${r.mapName}</b>에서 ${what}.</div>
        <div class="kv big">${lines.join('')}</div>
        <div class="loot">${r.items.map((i) => `<span>${icon(i.id)}${i.name} ×${i.qty.toLocaleString()}</span>`).join('')}</div>
        ${r.cards.length ? `<div class="loot">${r.cards.map((k) => `<span class="gold-t">★ ${k.name} 카드 ×${k.qty}</span>`).join('')}</div>` : ''}
        ${r.lost ? `<div class="small red-t" style="margin-top:.5em">가방이 가득 차 아이템 ${r.lost}개를 잃었습니다.</div>` : ''}
        <div class="row" style="margin-top:.9em"><span class="grow"></span><button class="gold" data-act="close">받기</button></div>`, false);
    }
    if (this.panel === 'bag') {
      const eq = (Object.keys(SLOT_NAMES) as EquipSlot[]).map((s) => {
        const id = c.equipment[s];
        return `<div class="slot ${id ? '' : 'empty'} ${this.sel === `eq:${s}` ? 'sel' : ''}" data-act="pick:eq:${s}">${id ? icon(id) : '<img>'}<span class="lbl">${SLOT_NAMES[s]}</span></div>`;
      }).join('');
      let cells = '';
      for (let i = 0; i < INVENTORY_SIZE; i++) {
        const s = c.inventory[i];
        cells += s ? `<div class="slot ${this.sel === s.id ? 'sel' : ''}" data-act="pick:${s.id}">${icon(s.id)}${s.qty > 1 ? `<span class="q">${s.qty}</span>` : ''}</div>` : '<div class="slot empty"></div>';
      }
      let detail = '<span class="dim small">아이템을 선택하세요.</span>';
      if (this.sel?.startsWith('eq:')) {
        const slot = this.sel.slice(3) as EquipSlot, id = c.equipment[slot];
        if (id) detail = `<b>${ITEMS[id].name}</b> <span class="small dim">장착 중</span><div class="small">${ITEMS[id].desc}</div><div class="small green-t">${statLine(id)}</div>
          <div class="btns"><button data-act="unequip:${slot}">해제</button></div>`;
      } else if (this.sel && countItem(c, this.sel)) {
        const it = ITEMS[this.sel], n = countItem(c, this.sel);
        detail = `<b>${it.name}</b> <span class="small dim">×${n}</span><div class="small">${it.desc}</div>
          ${it.stats ? `<div class="small green-t">${statLine(it.id)}${it.reqLv ? ` <span class="${c.level >= it.reqLv ? 'dim' : 'red-t'}">(Lv.${it.reqLv} 필요)</span>` : ''}</div>` : ''}
          <div class="btns">${it.slot ? `<button class="green" data-act="equip:${it.id}">장착</button>` : ''}
          <button data-act="sell:${it.id}:1">판매 (${it.sell})</button>${n > 1 ? `<button data-act="sell:${it.id}:${n}">전부 판매 (${it.sell * n})</button>` : ''}</div>`;
      }
      return win(`가방 <span class="small dim">${c.inventory.length}/${INVENTORY_SIZE}</span>`, `<div class="slots eq">${eq}</div><div class="slots">${cells}</div><div class="detail">${detail}</div>`);
    }
    if (this.panel === 'stats') {
      const d = derive(c, g.acc.cards);
      const stats = (Object.keys(STAT_NAMES) as StatKey[]).map((k) => `
        <div class="stat"><b>${STAT_NAMES[k]}</b><span class="v">${d[k]}</span><span class="grow small dim">${STAT_DESC[k]}</span>
        <button data-act="stat:${k}" ${c.statPoints ? '' : 'disabled'}>＋</button></div>`).join('');
      const skills = (Object.keys(SKILL_NAMES) as SkillKey[]).map((k) => {
        const s = c.skills[k];
        return `<div class="stat"><b>${SKILL_NAMES[k]}</b><span class="v">Lv.${s.lv}</span>
          <div class="bar sk grow"><i style="width:${pct(s.xp, skillXpToNext(s.lv))}"></i><span>${s.xp} / ${skillXpToNext(s.lv)}</span></div></div>`;
      }).join('');
      return win('능력치', `
        <div class="row"><span>남은 포인트</span><b class="gold-t big">${c.statPoints}</b></div>${stats}
        <div class="kv">
          <div>공격력 <span>${Math.round(d.dmg * 0.8)}~${Math.round(d.dmg * 1.2)}</span></div><div>최대 체력 <span>${d.maxHp}</span></div>
          <div>방어력 <span>${d.def.toFixed(1)}</span></div><div>공격 속도 <span>${(1 / d.atkInterval).toFixed(2)}/초</span></div>
          <div>치명타 <span>${(d.crit * 100).toFixed(1)}%</span></div><div>이동 속도 <span>${Math.round(d.speed)}</span></div>
          <div>경험치 배율 <span>×${d.xpMult.toFixed(2)}</span></div><div>드롭 배율 <span>×${d.dropMult.toFixed(2)}</span></div>
        </div>
        <h4>기술</h4>${skills}`);
    }
    if (this.panel === 'talents') {
      const list = TALENTS.filter((t) => !t.cls || t.cls === c.cls).map((t) => {
        const lv = c.talents[t.id] ?? 0;
        return `<div class="recipe"><div class="grow"><div><b>${t.name}</b> <span class="small gold-t">Lv.${lv}/${t.max}</span>
          ${t.cls ? `<span class="small green-t">${CLASSES[t.cls].name} 전용</span>` : ''}
          <span class="small dim">${t.active ? `액티브 · 재사용 ${t.active.cooldown}초` : '패시브'}</span></div>
          <div class="small ${lv ? 'green-t' : 'dim'}">${t.desc(Math.max(1, lv))}</div>
          ${lv && lv < t.max ? `<div class="small dim">다음: ${t.desc(lv + 1)}</div>` : ''}</div>
          <button class="gold" data-act="talent:${t.id}" ${c.talentPoints && lv < t.max ? '' : 'disabled'}>＋</button></div>`;
      }).join('');
      return win('특성', `<div class="row" style="margin-bottom:.5em"><span>남은 포인트</span><b class="gold-t big">${c.talentPoints}</b>
        <span class="small dim">레벨이 오를 때마다 1 포인트 · AUTO 중에는 액티브 스킬을 자동으로 사용</span></div>${list}`);
    }
    if (this.panel === 'cards') {
      const list = CARDS.map((cd) => {
        const n = g.acc.cards[cd.monster] ?? 0, tier = cardTier(n), next = cardNext(n);
        return `<div class="recipe"><img class="px ic" style="${n ? '' : 'filter:brightness(0) opacity(.45)'}" src="${iconUrl(`mob_${cd.monster}`)}">
          <div class="grow"><div><b>${n ? MONSTERS[cd.monster].name : '???'}</b> <span class="gold-t">${'★'.repeat(tier)}${'☆'.repeat(3 - tier)}</span></div>
          <div class="small ${tier ? 'green-t' : 'dim'}">${cd.label} +${Math.round(cd.per * Math.max(1, tier) * 100)}%${tier ? '' : ' (미획득)'}</div>
          <div class="small dim">${next ? `보유 ${n} / 다음 단계 ${next}` : `보유 ${n} · 최고 단계`}</div></div></div>`;
      }).join('');
      return win('몬스터 카드', `<div class="small dim" style="margin-bottom:.5em">몬스터가 가끔 카드를 떨어뜨립니다. 카드 효과는 모든 캐릭터에게 적용됩니다.</div>${list}`);
    }
    if (this.panel === 'quest') {
      if (c.cls === 'beginner' && c.level >= CLASS_LEVEL) {
        const opts = (['warrior', 'archer', 'mage'] as ClassId[]).map((id) => `<div class="recipe"><div class="grow"><b>${CLASSES[id].name}</b>
          <div class="small">${CLASSES[id].desc}</div></div><button class="gold" data-act="class:${id}">전직</button></div>`).join('');
        return win(`${NPC_NAME} <span class="small dim">전직</span>`, `<div style="margin-bottom:.6em">“많이 강해졌구먼! 이제 자네의 길을 정할 때일세.” <span class="small red-t">(한 번 고르면 바꿀 수 없습니다)</span></div>${opts}`);
      }
      const q = currentQuest(c), p = questProgress(c);
      if (!q || !p) return win(NPC_NAME, '<div>고맙네! 지금은 부탁할 일이 없다네. 다음 이야기를 기다려 주게.</div>');
      const goal = 'kill' in q.goal ? `${MONSTERS[q.goal.kill].name} ${q.goal.n}마리 처치` : `${icon(q.goal.item)}${ITEMS[q.goal.item].name} ${q.goal.n}개 납품`;
      const r = q.reward;
      const rew = [r.coins ? `<span>${icon('coin')}${r.coins}</span>` : '', r.xp ? `<span>경험치 +${r.xp}</span>` : '', r.item ? `<span>${icon(r.item)}${ITEMS[r.item].name}</span>` : ''].join('');
      const btn = !c.quest.accepted ? '<button class="gold" data-act="qaccept">수락</button>'
        : `<button class="green" data-act="qdone" ${p.done ? '' : 'disabled'}>완료</button>`;
      return win(`${NPC_NAME} <span class="small dim">퀘스트 ${c.quest.idx + 1}/${QUESTS.length}</span>`, `
        <div><b class="gold-t">${q.name}</b></div><div style="margin:.4em 0">“${q.text}”</div>
        <div class="small">목표: ${goal} ${c.quest.accepted ? `<b class="${p.done ? 'green-t' : 'gold-t'}">(${p.have}/${p.need})</b>` : ''}</div>
        <h4>보상</h4><div class="loot">${rew}</div>
        <div class="row" style="margin-top:.9em"><span class="grow"></span>${btn}</div>`);
    }
    if (this.panel === 'craft') {
      const list = RECIPES.map((r, i) => {
        const it = ITEMS[r.item];
        const mats = r.mats.map(([id, n]) => `<span class="${countItem(c, id) >= n ? '' : 'red-t'}">${icon(id)}${countItem(c, id)}/${n}</span>`).join(' ');
        return `<div class="recipe"><img class="px ic" src="${iconUrl(ITEM_ICON[r.item])}">
          <div class="grow"><div><b>${it.name}</b> <span class="small dim">${SLOT_NAMES[it.slot!]}${it.reqLv ? ` · Lv.${it.reqLv}` : ''}</span></div>
          <div class="small green-t">${statLine(it.id)}</div>
          <div class="small mats"><span class="${g.acc.coins >= r.coins ? '' : 'red-t'}">${icon('coin')}${r.coins}</span> ${mats}</div></div>
          <button class="gold" data-act="craft:${i}" ${canCraft(g.acc, c, i) ? '' : 'disabled'}>제작</button></div>`;
      }).join('');
      return win('제작대', list);
    }
    return '';
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
      case 'open': this.panel = a as Panel; this.sel = null; break;
      case 'close': this.panel = null; this.afk = null; break;
      case 'auto': if (c) c.auto = !c.auto; break;
      case 'mode': if (c) c.mode = c.mode === 'fight' ? 'gather' : 'fight'; break;
      case 'class': if (c) { const err = advanceClass(c, a as ClassId); fail(err); if (!err) { this.toast(`${CLASSES[c.cls].name}(으)로 전직했습니다!`); this.panel = 'talents'; } } break;
      case 'pick': this.sel = b ? `${a}:${b}` : a; break;
      case 'equip': if (c) { fail(equipItem(c, a)); this.sel = null; } break;
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
