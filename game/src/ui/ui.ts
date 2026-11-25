// DOM 기반 UI. 게임 상태를 읽어 HTML을 만들고, data-act 속성으로 동작을 위임 처리한다.
// 모양은 전부 components.css 의 부품(ui-*)과 tokens.css 의 역할 토큰으로 그린다.
import { AfkReport, afkRates } from '../core/afk';
import { upLeft } from '../core/upgrade';
import { FAMILY_OBOL_SLOTS, OBOL, PERSONAL_SLOTS, SHAPE_NAMES, slotOpen } from '../core/obols';
import { SHRINE, SHRINES, SHRINE_MAX, shrineNeed, shrineRate, shrineSettle, shrineValue } from '../core/shrines';
import { BOXES, COMPANIES, STREAK_MAX, boxCost, boxValue, orderReward, streakNow } from '../core/post';
import { boxLock, openBoxes, trapLock, trapYield } from '../core/traps';
import { PRAYERS, PRAYER_MAX, SOUL_NAMES, SoulKind, WTOTEMS, WTOTEM, boltEvery, chargeCap, chargeNow, chargeRate, prayerCost, prayerSlots, prayerValue, runSouls, worshipLock } from '../core/worship';
import { LAB, LAB_NODE, LAB_NODES, LAB_SPOTS, atStation, labRange, labSettle, labState } from '../core/lab';
import { BPet, BREED, BreedUp, GENES, SPEC, SPECIES, TERR, TERRITORIES, breedSettle, breedXpToNext, eggRate, fenceCap, nestCap, placeOf, rarityOdds, shinyNeed, spicePerLap, teamPower, upCostOf } from '../core/breeding';
import { COOK, KitchenUp, MEAL, MEALS, SPICES, chefMult, cookSettle, mealNeed, mealsPerHour, recipeChance, recipeCost, recipeRate, recipeResult, spiceMapName, spiceRate, upCost, upSpice } from '../core/cooking';
import { BUILD, BUILDINGS, buildCost, buildRate, buildSettle, buildSlots, buildXpToNext, rateUpCost } from '../core/build';
import { CRITTERS, SHINY_BONUS, TRAP_BOX, TRAP_BOXES, TRAP_NAMES, TRAP_TIMES, shinyLevel, trapSlots } from '../core/data';
import { BUBBLES, BUBBLES_PER, BUBBLE_MAX_LV, CAULDRONS, LIQUID, LIQUIDS, LIQUID_BY, LiquidId, LiquidUp, VIALS, VIAL_COST, VIAL_FIND, VIAL_MAX, alchSettle, bigSlots, brewNeed, brewRate, bubbleCost, bubbleFound, bubbleLv, bubbleValue, liquidCap, liquidOpen, liquidRate, liquidUpCost, vialValue, workPower } from '../core/alchemy';
/** 연금술 효과 이름 */
const ALCH_LABEL: Record<string, string> = { dmg: '공격력', hpPct: '최대 체력', str: '힘', agi: '민첩', wis: '지혜', luk: '행운', mining: '채광 효율', chopping: '벌목 효율', fishing: '낚시 효율', catching: '곤충 채집 효율', drop: '드롭률', xp: '경험치', afk: '방치 효율', coins: '코인 획득', def: '방어력', acc: '명중', hp: '최대 체력', card: '카드 드롭률' };
import {
  ATTACK_SLOTS, CARD_SLOTS, CLASS_NPC, CLASS_NPCS, NPCS, TALENT, TELEPORTS_MAX, WORLD1, ANVIL, CARDS, CLASSES, GROUP_NAMES, PRODUCTS, SHOP, STACK_BASE, stackGroup, CLASS_LEVEL, ClassId, EquipSlot, HAIR_COLORS, HAIR_STYLES, ITEMS, MAPS, MAX_CHARACTERS,
  MONSTERS, NODES, OUTFIT_COLORS, RECIPES, SKILL_NAMES, SKIN_COLORS, SLOT_NAMES, STAT_DESC,
  STAT_NAMES, SkillKey, StatKey, TALENTS, talentTab, BaseClass, SUBCLASS_LEVEL, TALENT_PRESET_LV, baseClass, classLine, canSubclass, cardNext, cardTier, CARD_MAX_TIER, QuestDef, TP_TICKET, PETS, PET_PLUS, PET_PITY, TREATS, RARITY_NAMES, CRYSTAL_ITEM, OWL, OwlUp, ARENA, arenaWaves, MINIBOSSES, SMELTS, FORGE, STATUES, SIGNS, SIGN_LV, signSlots, BIRTH_SIGNS, ACHIEVEMENTS, FAMILY, FAMILY_MIN, FAMILY_SLOTS, CARD_SETS, CARD_PRESET_LV, STAMPS, STAMP_NAMES, STAMP_LV, StampCat, StampDef, BRIBES,
  TIER_LEVEL, classTier, maxTierOf, nextClasses, HIDDEN_CLASS, HIDDEN_TIERS, WORLD2, WORLD3, WORLD4, WORLDS, TOWNS, worldOf, gateTo, STONES, STONE_BY_ID, Upg, upSlotsOf, ItemStats, FacilityKind, FACILITY_NAMES, STAR_TALS, STAR_TAL,
} from '../core/data';
import {
  Character, Look, acceptQuest, advanceClass, canCraft, completeQuest, countItem, craft, currentQuest, derive, equipItem,
  mapUnlocked, refillTeleports, anvilCap, anvilPointsFree, anvilRate, anvilSlotsOpen, equipCard, recipeLock, unequipCard, buy, collectAnvil, deposit, depositAll, haveMat, invSize, setProduct, shopLeft, spendAnvilPoint,
  stackCap, storageCount, storageSize, useItem, withdraw, dmgTaken, hitChance, learnTalent, questProgress, sellItem, setFood, skillXpToNext, spendStat, unequipItem, xpToNext,
  minibossOpen, mapQuota, canTeleportTo, SKIN_SLOTS, SkinSlot, starTalPoints, foodWait, gateChecks, gateOpen,
  anyTalentFree, tabFree,
} from '../core/state';
import { WorldEvent } from '../core/world';
import { GAMES, GameKind, SPIKE_WINDOW, gameReward, playsLeft, spikeOpen } from '../core/minigames';
import { PlayKind, runGame } from './minigames';
import { MapRegion, worldMapSvg } from './worldmap';
import { owlCost, owlPerHour, owlSettle, petFreeReady, petOwned, petPlus, petValue } from '../core/companions';
import { STARS, achieveReady, achieveProgress, charSlots, familyBest, familyLevel, familyValue, setStars, setTier, statueLevel, statueLv, DEATH_TIERS, deathBonus, deathKills, deathMaps, deathRank } from '../core/progress';
import { MERITS, MeritEff, TASKS, TASK_BY_ID, TASK_GROUP_NAMES, TaskGroup, meritCost, meritLv, taskDone } from '../core/tasks';
import { STAMP_BY_ID, stampCost, stampValue, stampsOpen } from '../core/stamps';
import { ForgeUp, forgeBonus, forgeCap, forgeProgress, forgeSettle, forgeSlotsOpen, forgeUpCost, forgeUpMaxed, smeltSeconds } from '../core/forge';
import { Game } from '../game';
import { ITEM_ICON, iconUrl, portraitUrl } from '../render/sprites';
import type { Audio } from '../audio';
import { pixelIcon } from './icons';

type Panel = 'lab' | 'nest' | 'kitchen' | 'afk' | 'items' | 'char' | 'codex' | 'map' | 'chat' | 'menu' | 'anvil' | 'npc' | 'storage' | 'shop' | 'afkinfo' | 'forge' | 'stamps' | 'tasks' | 'statues' | 'arena' | 'pets' | 'owl' | 'games' | 'gate' | 'alchemy' | 'post' | 'traps' | 'build' | 'shrine' | null;

/** '을(를)·이(가)·은(는)·와(과)·(으)로'를 앞 글자의 받침에 맞춰 고른다(태그는 건너뛰고 본다) */
const JOSA: Record<string, [string, string]> = { '을(를)': ['을', '를'], '이(가)': ['이', '가'], '은(는)': ['은', '는'], '와(과)': ['과', '와'], '(으)로': ['으로', '로'], '아(야)': ['아', '야'] };
export function josa(text: string): string {
  return text.replace(/([가-힣A-Za-z0-9])((?:<\/?[a-z][^>]*>)*)(을\(를\)|이\(가\)|은\(는\)|와\(과\)|\(으\)로|아\(야\))/g, (_m, ch: string, tags: string, j: string) => {
    const code = ch.charCodeAt(0);
    let batchim: boolean, rieul = false;
    if (code >= 0xac00 && code <= 0xd7a3) { const f = (code - 0xac00) % 28; batchim = f > 0; rieul = f === 8; }
    else batchim = /[013678lmnLMN]$/.test(ch); // 숫자·영문은 읽는 소리로 대강
    const [a, b] = JOSA[j];
    return ch + tags + (j === '(으)로' ? (batchim && !rieul ? a : b) : batchim ? a : b);
  });
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** 아이콘 그림(메뉴·특성·능력치 등 ui_/tl_/st_ 접두사) */
const ui = (key: string, cls = 'ic') => `<img class="px ${cls}" src="${iconUrl(key)}" alt="">`;
const iconHtml = (key: string) => `<img class="px tic" src="${iconUrl(key)}" alt="">`;
const PET_BONUS_NAMES: Record<string, string> = { hpPct: '최대 체력', drop: '드롭률', xp: '경험치', mining: '채광 효율', chopping: '벌목 효율', def: '방어력', coins: '코인 획득', afk: '방치 효율', dmg: '공격력' };
/** 바뀐 부분만 고치기: 같은 자리의 같은 태그는 속성·글자만 바꾸고, 다르면 그 노드만 갈아 끼운다 */
function morph(el: HTMLElement, html: string) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  patchChildren(el, tpl.content);
}
function patchChildren(dst: Node, src: Node) {
  const a = Array.from(dst.childNodes), b = Array.from(src.childNodes);
  for (let i = 0; i < b.length; i++) {
    const n = b[i], o = a[i];
    if (!o) { dst.appendChild(n); continue; }
    if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) { dst.replaceChild(n, o); continue; }
    if (n.nodeType === 3 || n.nodeType === 8) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; continue; }
    const oe = o as Element, ne = n as Element;
    for (const at of Array.from(oe.attributes)) if (!ne.hasAttribute(at.name)) oe.removeAttribute(at.name);
    for (const at of Array.from(ne.attributes)) if (oe.getAttribute(at.name) !== at.value) oe.setAttribute(at.name, at.value);
    // 입력칸은 사용자가 쓰는 값을 건드리지 않는다
    if (ne.nodeName !== 'INPUT' && ne.nodeName !== 'TEXTAREA') patchChildren(o, n);
  }
  for (let i = a.length - 1; i >= b.length; i--) dst.removeChild(a[i]);
}

/** 능력치 하나가 올려 주는 것(지금 값 기준으로 계산해 보여 준다) */
function statInfo(k: StatKey, v: number, cls: ClassId): string[] {
  const b = baseClass(cls), main = CLASSES[cls].main, acc = CLASSES[cls].acc;
  const role = [main === k ? `<b class="ui-good">지금 직업(${CLASSES[cls].name})의 공격력 능력치</b> — 1당 공격력 +0.5` : '', acc === k ? `<b class="ui-good">지금 직업의 명중 능력치</b> — 1당 명중 +1` : ''].filter(Boolean);
  const who: Record<StatKey, string> = { str: '전사의 공격력, 궁수의 명중', agi: '궁수의 공격력, 마법사의 명중', wis: '마법사의 공격력, 전사의 명중', luk: '초보자(와 숨겨진 길)의 공격력과 명중' };
  const f = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString();
  const lines: Record<StatKey, string[]> = {
    str: [`최대 체력 +${f(v * 3, 0)} (1당 +3)`, `치명타 피해 +${f(v * 0.4)}%p (1당 +0.4%p)`, `채광 효율 +${f(v * 0.05, 2)} (1당 +0.05)`],
    agi: [`이동 속도 +${f(Math.min(40, v * 0.6))} (1당 +0.6, 최대 +40)`, `치명타 확률 +${f(v * 0.4)}%p (1당 +0.4%p)`, `모루 생산 속도 +${f(v * 0.4)}% (1당 +0.4%)`],
    wis: [`최대 마나 +${f(v * 1.5, 0)} (1당 +1.5)`, `보스·미니보스에게 주는 피해 +${f(v * 0.4)}% (1당 +0.4%)`, `벌목 효율 +${f(v * 0.05, 2)} (1당 +0.05)`, `채집 방치 효율 +${f(v * 0.2)}%p`],
    luk: [`드롭률 +${f(v * 0.4)}% (1당 +0.4%)`, `경험치 +${f(v * 0.5)}% (1당 +0.5%)`, `전투 방치 효율 +${f(v * 0.2)}%p`],
  };
  void b;
  return [...role, `${who[k]}이 됩니다`, ...lines[k]];
}
/** 화면 앞에 띄울 중요 알림인지(잠김·조건·부족·실패) */
const IMPORTANT = /(열리지|잠겨|열립니다|필요|부족|없습니다|가득|할 수 없|쓸 수 없|아직|못했|맞지 않|최대 단계|이미)/;
/** 아이콘 칸 + 숫자 배지(글자 대신). tone: ok(초록) / bad(빨강) */
/** 칸에 들어가는 짧은 수(1.5만, 20만, 3억) */
const short = (n: number) => n >= 1e8 ? `${+(n / 1e8).toFixed(n < 1e9 ? 1 : 0)}억` : n >= 1e4 ? `${+(n / 1e4).toFixed(n < 1e5 ? 1 : 0)}만` : n.toLocaleString();
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
  r.coins ? tile(iconUrl(ITEM_ICON.coin), short(r.coins), `코인 ${r.coins.toLocaleString()}`) : '',
  r.xp ? tile(iconUrl('ui_xp'), short(r.xp), `경험치 ${r.xp.toLocaleString()}`) : '',
  r.item ? tile(iconUrl(ITEM_ICON[r.item]), '', ITEMS[r.item].name, 'r2') : '',
].join('');
const icon = (id: string) => `<img class="px" src="${iconUrl(ITEM_ICON[id])}" alt="">`;
const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / b) * 100)).toFixed(1)}%`;
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : `${Math.floor(s / 60)}분`);
const STAT_LABEL: Record<string, string> = { dmg: '공격력', def: '방어력', hp: '체력', str: '힘', agi: '민첩', wis: '지혜', luk: '행운', mining: '채광', chopping: '벌목', fishing: '낚시', catching: '곤충 채집' };
const statsText = (s: ItemStats | undefined) => Object.entries(s ?? {}).map(([k, v]) => `${STAT_LABEL[k]} +${v}`).join(', ');
const statLine = (id: string) => statsText(ITEMS[id].stats);
/** 강화 기록 한 줄 */
const upLine = (id: string, up: Upg | undefined) => {
  const max = upSlotsOf(id);
  if (!max) return '';
  return `<span class="ui-xs ${up?.n ? 'ui-accent' : 'ui-muted'}">강화 칸 ${up?.n ?? 0}/${max}${up && Object.keys(up.s).length ? ` · 강화 ${statsText(up.s)}` : ''}</span>`;
};
const upBadge = (up: Upg | undefined) => (up?.n ? `<span class="upn">+${up.n}</span>` : '');

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
  /** 아이템 창 왼쪽 탭: 0 장비, 1 홀로웨어 */
  private eqTab = 0;
  private starSel: string | null = null;
  private bubSel: string | null = null;
  /** 덫 오두막: 덫을 놓으려고 고른 칸 */
  private trapIdx = -1;
  private trapBox = 'tb_card';
  private cauldron = 'power';
  private kitIdx = -1;
  private sellArm: string | null = null;
  private lootHinted = false;
  private takeAll = false;
  private delAcc = false;
  private terrPick: string | null = null;
  private recipeSp: string[] = [];
  /** 목차 > 참조에서 연 창이면 닫을 때 목차로 돌아간다 */
  private refBack = false;
  /** 지도 창에서 보고 있는 월드(없으면 지금 있는 월드) */
  private mapWorld: number | null = null;
  /** 조건 창에 띄울 세계의 문(가는 월드) */
  private gateWorld = 2;
  private petSel: string | null = null;
  /** 지도에서 고른 맵(한 번 더 누르면 이동) */
  private mapSel: string | null = null;
  /** 삭제 확인 중인 캐릭터 */
  private delIdx: number | null = null;
  private statSel: StatKey | null = null;
  private shownPanel: Panel = null;
  private arenaResult: { waves: number; score: number } | null = null;
  private stampSel = '';
  /** 대화 중인 NPC, 생산 칸 선택 */
  private npcId = 'elder';
  /** 하단 바가 공격 바로 바뀌어 있는지, 공격 바에 놓으려고 고른 특성, 특성 화면에서 고른 특성 */
  private attackMode = false;
  private assigning: string | null = null;
  private assignPrev = false;
  /** 특성 창에서 퀵슬롯을 고르는 중인 특성과 공격 바 장 */
  private quickFor: string | null = null;
  private quickPage = 0;
  private talentSel: string | null = null;
  private drag: { id: string; ghost: HTMLElement } | null = null;
  private prodSlot = 0;
  private creating = false;
  private draft: { name: string; look: Look; sign: string } = this.randomDraft();
  private last: Record<string, string> = {};

  constructor(private game: Game) {
    this.root.classList.add('ui');
    this.root.innerHTML = `
      <div id="quest" class="hidden"></div>
      <button id="where" class="hidden" data-act="open:afkinfo" aria-label="방치 정보"></button>
      <div id="bossbar" class="hidden"></div>
      <div id="skills" class="hidden"></div>
      <div id="toasts" aria-live="polite"></div>
      <div id="notice" role="alert" aria-live="assertive"></div>
      <div id="modal" class="hidden"></div>
      <div id="bottom" class="ui-bottom hidden"><div id="bsum" class="ui-summary"></div><div id="bgauge" class="ui-gauges"></div><nav id="bmenu" class="ui-menu" aria-label="메뉴"></nav></div>
      <div id="title"></div>
      <div id="rotate" role="alert"><div class="ph"></div><b>화면을 가로로 돌려 주세요</b><span>테일즈토피아는 가로 화면에서 즐길 수 있습니다.</span></div>`;
    this.root.addEventListener('click', (e) => this.onClick(e));
    // 스킬 버튼은 누르는 즉시 발동
    this.root.addEventListener('pointerdown', (e) => {
      const sk = (e.target as HTMLElement).closest<HTMLElement>('[data-bslot]');
      if (sk) { e.preventDefault(); this.pressSlot(+sk.dataset.bslot!); return; }
      // 제작 버튼을 길게 누르면 계속 만든다
      const hold = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-hold]');
      if (hold && !hold.disabled) this.startHold(+hold.dataset.hold!);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) this.root.addEventListener(ev, () => this.stopHold());
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
    return { name: '', look: { hair: Math.floor(Math.random() * HAIR_STYLES), hairColor: pick(HAIR_COLORS), skin: SKIN_COLORS[0], outfit: pick(OUTFIT_COLORS) }, sign: pick(BIRTH_SIGNS) };
  }

  private $(id: string) { return document.getElementById(id)!; }
  /** 내용이 바뀐 경우에만 DOM 갱신(누르는 도중 버튼이 교체되는 것 방지) */
  private put(id: string, html: string) {
    if (this.last[id] === html) return;
    const first = !this.$(id).firstChild;
    this.last[id] = html;
    // 통째로 갈아 끼우면 그림이 다시 그려지며 깜빡이고 스크롤·애니메이션이 처음으로 돌아간다 → 바뀐 곳만 고친다
    html = josa(html);
    if (first) this.$(id).innerHTML = html; else morph(this.$(id), html);
  }
  private show(id: string, on: boolean) { this.$(id).classList.toggle('hidden', !on); }

  /** 중요한 알림(잠김·부족·실패 등): 화면 가운데 위쪽에 크게 */
  notice(text: string) {
    const el = this.$('notice');
    el.textContent = josa(text);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.noticeT);
    this.noticeT = window.setTimeout(() => el.classList.remove('show'), 2200);
  }
  private noticeT = 0;

  toast(text: string, item?: string) {
    // 잠김·부족·실패 같은 알림은 놓치지 않게 화면 앞으로
    if (!item && IMPORTANT.test(text)) { this.notice(text); return; }
    const box = this.$('toasts');
    const d = document.createElement('div');
    d.className = 'ui-toast';
    d.innerHTML = (item ? icon(item) : '') + esc(josa(text));
    box.appendChild(d);
    while (box.children.length > 5) box.firstChild!.remove();
    setTimeout(() => d.remove(), 2600);
  }

  /** 다른 사람의 채팅: 채팅 창이 닫혀 있으면 알림으로 */
  onChat(l: { id?: string; from: string; text: string }) {
    if (this.panel !== 'chat' && l.id !== this.game.liveId) this.toast(`${l.from}: ${l.text}`);
  }

  onEvent(e: WorldEvent) {
    if (e.t === 'warn') { this.notice(e.text); this.audio?.play('fail'); }
    else if (e.t === 'kill' && !this.lootHinted) {
      // 처음 몇 번은 떨어진 아이템 줍는 법을 알려 준다(기기마다 한 번)
      this.lootHinted = true;
      let seen = 0; try { seen = +(localStorage.getItem('hint_loot') ?? 0); localStorage.setItem('hint_loot', String(seen + 1)); } catch { /* 저장소 없음 */ }
      if (seen < 3) setTimeout(() => this.notice('떨어진 아이템은 누르거나 화면을 쓸어서 주울 수 있습니다'), 700);
    }
    else if (e.t === 'loot') this.toast(e.text, e.item ?? (e.text.includes('코인') ? 'coin' : undefined));
    else if (e.t === 'level') this.toast(`레벨 업! Lv.${e.level} (능력치 +3, 특성 +1)`);
    else if (e.t === 'skill') this.toast(`${e.name} 레벨 업! Lv.${e.level}`);
    else if (e.t === 'arrive' && e.what === 'fac') { const f = this.game.world?.map.facilities[e.idx]; if (f) { this.npcId = f.npc ?? 'elder'; this.open(f.kind); if (f.kind === 'owl' && !this.game.acc.owl.t) this.game.act({ t: 'owl' }); if (f.kind === 'alchemy' && !this.game.acc.alch.t) this.game.act({ t: 'alch', op: 'start' }); if (f.kind === 'post') this.game.act({ t: 'post', op: 'refresh' }); if (f.kind === 'build') this.game.act({ t: 'build', op: 'visit' }); if (f.kind === 'kitchen') this.game.act({ t: 'cook', op: 'visit' }); if (f.kind === 'nest') this.game.act({ t: 'breed', op: 'visit' }); if (f.kind === 'lab') this.game.act({ t: 'lab', op: 'visit' }); this.refresh(true); } }
    else if (e.t === 'respawn') this.toast('마을에서 다시 깨어났습니다');
    else if (e.t === 'gate') { this.gateWorld = e.to; this.open('gate'); this.refresh(true); }
    else if (e.t === 'boss') this.toast(`${e.name}을(를) 쓰러뜨렸습니다!`);
    else if (e.t === 'faint') this.toast(this.game.world?.arena ? '쓰러졌습니다! 콜로세움이 끝났습니다' : '쓰러졌습니다... 잠시 후 부활합니다');
    else if (e.t === 'miniboss') this.toast(`${e.name}을(를) 쓰러뜨렸습니다!`);
    else if (e.t === 'arenaEnd') { this.arenaResult = { waves: e.waves, score: e.score }; this.panel = 'arena'; this.refresh(true); }
  }

  private open(p: Panel) { this.panel = p; this.sel = null; this.craftSel = -1; if (p === 'map') { this.mapWorld = null; this.mapSel = null; } }

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
      ['talents', '특성', 'open:char', c.statPoints > 0 || anyTalentFree(c)], ['codex', '목차', 'open:codex', Object.keys(NPCS).some((n) => questProgress(c, n)?.done)],
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
    const mbs = MINIBOSSES.filter((m) => minibossOpen(g.acc, m.id, Date.now()) && mapUnlocked(c, m.map));
    if (mbs.length && !w.arena) lines.push(`<span class="ui-accent">⚔ ${mbs.map((m) => `${MONSTERS[m.id].name}(${MAPS[m.map].name})`).join(', ')} 출현 중</span>`);
    // 3월드에서는 눈꽃 마을의 장로에게서도 전직한다
    const promoNpc = NPCS[worldOf(c.mapId) === 3 ? 'elder3' : CLASS_NPC].name;
    if (canSubclass(c)) lines.push(classLine(c.cls).includes(HIDDEN_CLASS.cls) ? `<span class="ui-accent">★ ${classTier(c.cls) + 1}차 전직 가능! 어딘가의 ${NPCS[HIDDEN_CLASS.npc].name}을(를) 찾아가세요</span>` : `<span class="ui-accent">★ ${classTier(c.cls) + 1}차 전직 가능! 마을의 ${promoNpc}을(를) 찾아가세요</span>`);
    if (c.cls === 'beginner' && c.level >= CLASS_LEVEL) lines.push(`<span class="ui-accent">★ 전직 가능! 마을의 ${promoNpc}을(를) 찾아가세요</span>`);
    for (const n of Object.values(NPCS)) {
      const q = currentQuest(c, n.id), qp = questProgress(c, n.id);
      if (q && qp && c.quests[n.id]?.accepted) { const gl = q.goal, what = 'kill' in gl ? `${MONSTERS[gl.kill].name} 처치` : `${ITEMS[gl.item].name} 모으기`; lines.push(`<span class="${qp.done ? 'ui-good' : ''}">${q.name} ${qp.done ? `— 완료! ${n.name}에게` : `· ${what} ${qp.have}/${qp.need}`}</span>`); }
    }
    if (!lines.length && w.map.id === 'town' && currentQuest(c, 'elder')) lines.push(`<span class="ui-muted">마을 사람들에게 말을 걸어 보세요</span>`);
    this.put('quest', lines.join('<br>'));

    this.show('modal', !!this.panel);
    // 튀어나오는 애니메이션은 창을 새로 열 때만(같은 창을 다시 그릴 때는 재생하지 않는다)
    if (this.panel !== this.shownPanel) {
      this.shownPanel = this.panel;
      if (this.panel) { const m = this.$('modal'); m.classList.remove('opening'); void m.offsetWidth; m.classList.add('opening'); this.audio?.play('open'); }
    }
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
      return `<h1 class="gametitle">테일즈토피아 <span>Idle</span></h1>
        <div class="ui-win creator"><header><h2>새 캐릭터</h2></header><div class="body">
          <div class="pv"><img class="px" src="${portraitUrl(l)}" alt="미리보기"></div>
          <div class="opts">
            <label class="ui-sm ui-muted" for="cname">이름</label>
            <input id="cname" class="ui-input" maxlength="10" placeholder="최대 10자" autocomplete="off">
            ${sw('몸 색', 'skin', SKIN_COLORS)}
            <p class="ui-xs ui-muted">겉모습은 장비로 꾸며집니다.</p>
            <span class="ui-sm ui-muted">탄생 별자리 <span class="ui-xs">(평생 켜져 있음)</span></span>
            <div class="ui-row" style="flex-wrap:wrap;gap:var(--sp-1)">${BIRTH_SIGNS.map((id) => { const sg = SIGNS.find((x) => x.id === id)!; return `<button class="ui-btn sm ${this.draft.sign === id ? 'primary' : ''}" data-act="birth:${id}" aria-pressed="${this.draft.sign === id}">${sg.name} <span class="ui-xs">${sg.label}</span></button>`; }).join('')}</div>
            <div class="ui-row">${acc.characters.length ? '<button class="ui-btn" data-act="cancelCreate">취소</button>' : ''}
              <span class="ui-grow"></span><button class="ui-btn primary" data-act="create">모험 시작!</button></div>
          </div></div></div>`;
    }
    // 삭제 확인: 이름을 그대로 써야 지운다
    const del = this.delIdx !== null ? acc.characters[this.delIdx] : null;
    if (del) {
      return `<h1 class="gametitle">테일즈토피아 <span>Idle</span></h1><div class="ui-win delbox"><header><h2>캐릭터 삭제</h2></header><div class="body stack">
        <div class="ui-row"><img class="px" src="${portraitUrl(del.look)}" alt="" style="height:4em"><div><b>${esc(del.name)}</b><div class="ui-sm ui-accent">Lv.${del.level} ${CLASSES[del.cls].name}</div></div></div>
        <p class="ui-sm ui-bad">삭제하면 되돌릴 수 없습니다. 이 캐릭터의 가방·장비·레벨·특성이 모두 사라집니다. 창고와 카드·우표 등 계정 공용 기록은 남습니다.</p>
        <label class="ui-sm ui-muted" for="delname">확인을 위해 캐릭터 이름 <b>${esc(del.name)}</b>을(를) 그대로 입력하세요</label>
        <input id="delname" class="ui-input" maxlength="10" autocomplete="off">
        <div class="ui-row"><button class="ui-btn" data-act="delcancel">취소</button><span class="ui-grow"></span><button class="ui-btn danger" data-act="delgo">삭제</button></div></div></div>`;
    }
    const now = Date.now();
    const cards = acc.characters.map((c, i) => {
      const map = MAPS[c.mapId], away = Math.floor((now - c.lastActive) / 1000);
      const st = c.activity.k === 'gather' && map.nodes.some((n) => n.node === (c.activity as { node: string }).node) ? '채집 중' : map.spawns.length ? '사냥 중' : '휴식 중';
      return `<div class="charwrap"><button class="charcard" data-act="select:${i}" aria-label="${esc(c.name)} 레벨 ${c.level} 선택">
        <img class="px" src="${portraitUrl(c.look)}" alt="">
        <b>${esc(c.name)}</b><span class="ui-sm ui-accent">Lv.${c.level} ${CLASSES[c.cls].name}</span>
        <span class="ui-xs ui-muted">${map.name}</span>
        <span class="ui-xs ui-good">${st}${away >= 60 ? ` · ${dur(away)}` : ''}</span></button>
        <button class="chardel" data-act="delask:${i}" aria-label="${esc(c.name)} 삭제">${ui('ui_trash', 'tic')}</button></div>`;
    }).join('');
    const slots = charSlots(acc), nextLv = FAMILY_SLOTS.find((n) => familyLevel(acc) < n);
    const add = (acc.characters.length < slots ? `<button class="charcard new" data-act="newChar"><span class="ui-xl">＋</span><span>새 캐릭터</span></button>` : '')
      + (slots < MAX_CHARACTERS && nextLv ? `<div class="charcard locked"><span class="ui-xl">🔒</span><span class="ui-xs ui-muted">가족 레벨 ${nextLv}</span></div>` : '');
    return `<h1 class="gametitle">테일즈토피아 <span>Idle</span></h1><div class="ui-sm ui-muted">캐릭터를 선택하세요 — 선택하지 않은 캐릭터는 계속 방치 성장합니다</div><div class="cards">${cards}${add}</div>`;
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
          ${r.capped && r.capped > 60 ? `<p class="ui-xs ui-muted">방치 보상은 최대 ${dur(r.seconds)}까지 쌓입니다. 그 뒤 ${dur(r.capped)}은(는) 쌓이지 않았습니다.</p>` : ''}
          ${kv.length ? `<div class="ui-kv">${kv.join('')}</div>` : ''}
          ${got ? `<h3>획득한 아이템</h3><div class="ui-grid">${got}</div>` : ''}
          ${r.cards.length ? `<p class="ui-accent">${r.cards.map((k) => `★ ${k.name} 카드 ×${k.qty}`).join(' · ')}</p>` : ''}
          ${r.anvil ? `<p class="ui-sm">모루에서 ${r.anvil.items.map((x) => `${ITEMS[x.item].name} ${x.made}개`).join(', ')}를 만들었습니다${r.anvil.levels ? ` (대장 레벨 +${r.anvil.levels})` : ''}.</p>` : ''}
          ${r.food ? `<p class="ui-sm ui-muted">음식 ${r.food}개를 먹었습니다.</p>` : ''}
          ${r.skipped ? `<p class="ui-sm ui-accent">가방이 가득 차서 그 뒤로는 줍지 않았습니다(남은 칸만큼만 주웠습니다). 창고에 맡기거나 가방·주머니를 늘리면 더 모을 수 있습니다.</p>` : ''}
          <button class="ui-btn primary block" data-act="close">받기</button>`, false);
      }

      case 'items': {
        const eq = (Object.keys(SLOT_NAMES) as EquipSlot[]).map((s) => {
          const id = c.equipment[s];
          return `<button class="ui-slot eqslot" data-act="pick:eq:${s}" aria-selected="${this.sel === `eq:${s}`}" aria-label="${SLOT_NAMES[s]}${id ? `: ${ITEMS[id].name}` : ' (비어 있음)'}">${id ? icon(id) + upBadge(c.equipUp[s]) : `${ui(`eq_${s}`, 'sil')}<span class="slotlbl">${SLOT_NAMES[s]}</span>`}</button>`;
        }).join('');
        const eatCd = g.world?.eatT ?? 0;
        const food = c.foods.map((f, i) => `<button class="ui-slot ${f ? '' : 'empty'}" data-act="pick:food:${i}" aria-selected="${this.sel === `food:${i}`}" aria-label="음식 칸 ${i + 1}${f ? `: ${ITEMS[f.id].name} ${f.qty}개` : ' (비어 있음)'}">${f ? `${icon(f.id)}<span class="qty">${f.qty}</span>${eatCd > 0 ? `<span class="cool">${Math.ceil(eatCd)}</span>` : ''}` : ui('eq_food', 'sil')}</button>`).join('');
        let cells = '';
        for (let i = 0; i < Math.max(invSize(c), c.inventory.length); i++) {
          const s = c.inventory[i];
          const key = s?.up ? `${s.id}@${i}` : s?.id;
          cells += s ? `<button class="ui-slot ${s.up ? 'r2' : s.qty >= stackCap(c, s.id) ? 'r4' : ''}" data-act="pick:${key}" aria-selected="${this.sel === key}" aria-label="${ITEMS[s.id].name}${s.up ? ` 강화 ${s.up.n}칸` : ''} ${s.qty}개">${icon(s.id)}${upBadge(s.up)}${s.qty > 1 ? `<span class="qty">${s.qty}</span>` : ''}</button>`
            : '<div class="ui-slot empty"></div>';
        }
        let detail = `${ui('ui_items', 'bigic')}<span class="ui-sm ui-muted">칸을 누르면 정보와 할 수 있는 일이 나옵니다.</span>`;
        if (this.sel?.startsWith('food:')) {
          const fi = +this.sel.slice(5), f = c.foods[fi];
          detail = f ? `<div class="ui-row"><span class="ui-slot">${icon(f.id)}</span><div><b>${ITEMS[f.id].name}</b><div class="ui-xs ui-muted">음식 칸 · ${f.qty}개</div></div></div>
            <span class="ui-sm">${ITEMS[f.id].desc}</span><span class="ui-xs ui-muted">체력이 45% 아래로 떨어지면 자동으로 하나씩 먹습니다. 먹은 뒤에는 그 음식의 재사용 대기시간(${+foodWait(c, f.id).toFixed(1)}초) 동안 다음 음식을 먹지 않습니다.</span>${eatCd > 0 ? `<span class="ui-xs ui-accent">재사용까지 ${Math.ceil(eatCd)}초</span>` : ''}
            <button class="ui-btn" data-act="food::${fi}">가방으로</button>` : '<span class="ui-sm ui-muted">음식을 넣어 두면 체력이 낮을 때 위 칸부터 자동으로 먹습니다.</span>';
        } else if (this.sel?.startsWith('skin:')) {
          const slot = this.sel.slice(5) as SkinSlot, id = c.skins[slot];
          detail = id ? `<div class="ui-row"><span class="ui-slot r3">${icon(id)}</span><div><b>${ITEMS[id].name}</b><div class="ui-xs ui-muted">홀로웨어 ${SLOT_NAMES[slot]} · 겉모습만</div></div></div>
            <span class="ui-xs ui-muted">능력치는 실제 장비를 따르고, 겉모습만 이 아이템으로 보입니다.</span>
            <button class="ui-btn" data-act="skinoff:${slot}">가방으로</button>` : '<span class="ui-sm ui-muted">가방의 모자·갑옷을 골라 \'홀로웨어로\'를 누르면 능력치는 그대로 두고 겉모습만 바꿉니다.</span>';
        } else if (this.sel?.startsWith('eq:')) {
          const slot = this.sel.slice(3) as EquipSlot, id = c.equipment[slot];
          if (id) {
            const left = upLeft(c, slot);
            const stones = STONES.filter((st) => st.slots.includes(slot) && countItem(c, st.item) > 0);
            const stoneBtns = !upSlotsOf(id) ? '' : left <= 0 ? '<span class="ui-xs ui-muted">강화 칸을 모두 썼습니다.</span>'
              : stones.length ? `<div class="stonebtns">${stones.map((st) => `<button class="ui-btn sm iconbtn" data-act="upg:${st.item}:${slot}" aria-label="${ITEMS[st.item].name} 붙이기">${icon(st.item)} ${Math.round(st.chance * 100)}% <span class="ui-xs">×${countItem(c, st.item)}</span></button>`).join('')}</div>`
              : '<span class="ui-xs ui-muted">이 부위에 쓸 강화석이 가방에 없습니다.</span>';
            detail = `<div class="ui-row"><span class="ui-slot">${icon(id)}${upBadge(c.equipUp[slot])}</span><div><b>${ITEMS[id].name}</b><div class="ui-xs ui-muted">${SLOT_NAMES[slot]} · 장착 중</div></div></div>
            <span class="ui-sm ui-good">${statLine(id)}</span>${upLine(id, c.equipUp[slot])}${stoneBtns}
            <button class="ui-btn" data-act="unequip:${slot}">해제</button>`;
          }
        } else if (this.sel?.includes('@') && c.inventory[+this.sel.split('@')[1]]?.up) {
          const at = +this.sel.split('@')[1], st = c.inventory[at], it = ITEMS[st.id];
          detail = `<div class="ui-row"><span class="ui-slot r2">${icon(it.id)}${upBadge(st.up)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${SLOT_NAMES[it.slot!]} · 강화한 장비</div></div></div>
            <span class="ui-sm ui-good">${statLine(it.id)}</span>${upLine(it.id, st.up)}
            ${it.reqLv ? `<span class="ui-xs ${c.level >= it.reqLv ? 'ui-muted' : 'ui-bad'}">Lv.${it.reqLv} 필요</span>` : ''}
            <button class="ui-btn success iconbtn" data-act="equip:${it.id}:${at}">${ui(`eq_${it.slot}`, 'tic')} 장착</button>
            <span class="ui-xs ui-muted">강화한 장비는 창고에 넣거나 팔 수 없습니다.</span>`;
        } else if (this.sel && countItem(c, this.sel)) {
          const it = ITEMS[this.sel], n = c.inventory.reduce((k, s) => k + (s.id === it.id && !s.up ? s.qty : 0), 0);
          // 팔기: 장비·열쇠·비싼 것·여러 개는 한 번 더 눌러야 판다
          const sellBtn = (q: number) => {
            const key = `${it.id}:${q}`, armed = this.sellArm === key, label = q > 1 ? `전부 팔기 ×${q}` : '팔기';
            return `<button class="ui-btn sm iconbtn ${armed ? 'danger' : ''}" data-act="sell:${it.id}:${q}">${armed ? `정말 팔까요? ${ui('ui_coin', 'tic')} ${(it.sell * q).toLocaleString()}` : `${label} ${ui('ui_coin', 'tic')} ${(it.sell * q).toLocaleString()}`}</button>`;
          };
          detail = `<div class="ui-row"><span class="ui-slot">${icon(it.id)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${it.slot ? SLOT_NAMES[it.slot] : GROUP_NAMES[stackGroup(it.id)]} · ${n} / ${stackCap(c, it.id)}개</div></div></div>
            <span class="ui-sm">${it.desc}</span>
            ${it.stats ? `<span class="ui-sm ui-good">${statLine(it.id)}</span>${upLine(it.id, undefined)}` : ''}
            ${STONE_BY_ID[it.id] ? `<span class="ui-xs ui-muted">장비 탭에서 장착한 장비를 누르면 붙일 수 있습니다. 실패해도 강화 칸 하나를 씁니다.</span>` : ''}
            ${it.reqLv ? `<span class="ui-xs ${c.level >= it.reqLv ? 'ui-muted' : 'ui-bad'}">Lv.${it.reqLv} 필요</span>` : ''}
            <div class="ui-row" style="flex-wrap:wrap">${it.slot ? `<button class="ui-btn success iconbtn" data-act="equip:${it.id}">${ui(`eq_${it.slot}`, 'tic')} 장착</button>` : ''}${it.slot === 'hat' || it.slot === 'body' ? `<button class="ui-btn iconbtn" data-act="skinon:${it.id}">${ui(`eq_${it.slot}`, 'tic')} 홀로웨어로</button>` : ''}${it.kind === 'food' ? `<button class="ui-btn success iconbtn" data-act="food:${it.id}">${ui('eq_food', 'tic')} 음식 칸</button>` : ''}${['bag', 'pouch', 'chest', 'tool'].includes(it.kind) ? `<button class="ui-btn success iconbtn" data-act="use:${it.id}">${ui('ui_up', 'tic')} 사용</button>` : ''}${it.kind === 'obol' ? `<button class="ui-btn success iconbtn" data-act="obput:0:${it.id}">개인판에</button><button class="ui-btn iconbtn" data-act="obput:1:${it.id}">가족판에</button>` : ''}
              ${n ? sellBtn(1) : ''}${n > 1 ? sellBtn(n) : ''}</div>`;
        }
        // 왼쪽: 장비 / 홀로웨어(스킨) 탭, 오른쪽: 가방과 상세
        const skins = SKIN_SLOTS.map((s) => {
          const id = c.skins[s];
          return `<button class="ui-slot eqslot ${id ? 'r3' : ''}" data-act="pick:skin:${s}" aria-selected="${this.sel === `skin:${s}`}" aria-label="홀로웨어 ${SLOT_NAMES[s]}${id ? `: ${ITEMS[id].name}` : ' (비어 있음)'}">${id ? icon(id) : ui(`eq_${s}`, 'sil')}</button>`;
        }).join('');
        const board = (fam: boolean) => (fam ? FAMILY_OBOL_SLOTS : PERSONAL_SLOTS).map((sl, i) => {
          const id = (fam ? g.acc.famObols ?? [] : c.obols ?? [])[i], open = slotOpen(g.acc, c, fam, i);
          return id ? `<button class="ui-slot sm r2" data-act="obtake:${fam ? 1 : 0}:${i}" aria-label="${ITEMS[id].name} 빼기">${icon(id)}</button>`
            : `<span class="ui-slot sm ${open ? 'empty' : 'locked'}" title="${SHAPE_NAMES[sl.shape]} 칸${open ? '' : ` · ${fam ? `가족 레벨 ${sl.need}` : `Lv.${sl.need}`}`}"><span class="ui-xs ui-muted">${open ? ({ circle: '○', square: '□', hex: '⬡', spark: '✦' })[sl.shape] : '🔒'}</span></span>`;
        }).join('');
        const left = this.eqTab === 0
          ? `<div class="ui-grid eqcol">${eq}</div><h3 class="eqsub">${ui('eq_food', 'tic')} 음식</h3><div class="ui-grid eqcol">${food}</div>`
          : this.eqTab === 1 ? `<div class="ui-grid eqcol">${skins}</div><p class="ui-xs ui-muted">겉모습만 바꾸는 칸입니다. 능력치는 장비 탭의 장비를 따릅니다.</p>`
          : `<h3 class="eqsub" style="margin-top:0">개인 오볼판</h3><div class="ui-grid obgrid">${board(false)}</div><h3 class="eqsub">가족 오볼판 <span class="ui-xs ui-muted">모두에게</span></h3><div class="ui-grid obgrid">${board(true)}</div><p class="ui-xs ui-muted">가방의 오볼을 눌러 끼웁니다. 끼운 오볼을 누르면 뺍니다.</p>`;
        return win(`아이템 <span class="ui-sm ui-muted">${c.inventory.length}/${invSize(c)}</span>`, `
          <div class="invlayout"><div class="eqpanel"><div class="ui-tabs mini" role="tablist">
              <button role="tab" aria-selected="${this.eqTab === 0}" data-act="eqtab:0">장비</button><button role="tab" aria-selected="${this.eqTab === 1}" data-act="eqtab:1">홀로웨어</button><button role="tab" aria-selected="${this.eqTab === 2}" data-act="eqtab:2">오볼</button></div>${left}</div>
            <div class="invright"><div class="ui-grid bag">${cells}</div><div class="ui-detail">${detail}</div></div></div>`);
      }

      case 'char': {
        // 탭: 능력치 / 초보자 특성 / 직업 특성(원작처럼 단계별). 왼쪽 깃발로 공격 바 지정
        // 계보: 초보자 → 1차 → 2차. 탭은 능력치 + 계보마다 하나(아직 없는 단계는 잠김)
        // 탭: 능력치 · 초보자 · 단계별 직업(이 계열이 갈 수 있는 단계까지) · 별빛
        const line = classLine(c.cls), base = baseClass(c.cls), tiers = maxTierOf(base), star = 2 + tiers;
        const sp = starTalPoints(g.acc, c);
        const tierName = (k: number) => (line[k] ? CLASSES[line[k]].name : k === 1 ? '직업' : `${k}차 직업`);
        const tierIcon = (k: number) => (line[k] ? `tl_${TALENTS.find((x) => x.cls === line[k])?.id ?? 'smash'}` : 'ui_lock');
        const tp = (k: number) => (line[k] && tabFree(c, k) > 0 ? ` ${tabFree(c, k)}` : '');
        const names = [`능력치${c.statPoints ? ` ${c.statPoints}` : ''}`, `초보자${tp(0)}`, ...Array.from({ length: tiers }, (_, i) => `${tierName(i + 1)}${tp(i + 1)}`), `별빛${sp > 0 ? ` ${sp}` : ''}`];
        const icons = ['st_str', 'ui_talents', ...Array.from({ length: tiers }, (_, i) => tierIcon(i + 1)), 'ui_star'];
        const t = tab > star ? 1 : tab >= 2 && tab < star && !line[tab - 1] ? 1 : tab;
        const body = t === 0 ? this.statsHtml(c) : t === star ? this.starTalHtml(c) : this.talentsHtml(c, line[t - 1]);
        const tabPts = t > 0 && t < star ? tabFree(c, t - 1) : null;
        return win(`특성${tabPts !== null ? ` <span class="ui-sm ui-muted">이 탭 포인트</span> <b class="ui-accent">${tabPts}</b>` : ''}`, `${tabs(names, t, tabAct, icons)}
          ${t > 0 && t < star && c.level >= TALENT_PRESET_LV ? `<div class="ui-row" style="justify-content:flex-end"><span class="ui-xs ui-muted">특성 프리셋</span>${c.talentPresets.map((_, i) => `<button class="ui-btn sm ${i === c.talentPreset ? 'primary' : ''}" data-act="tpre:${i}">${i + 1}</button>`).join('')}</div>` : ''}
          <div class="ui-tabpanel talentpanel">${body}</div>`);
      }

      case 'codex': {
        // 목차: 첫 탭이 참조(어디서나 여는 시설 바로가기). t 는 예전 탭 번호(0 카드 … 5 참조)
        const t = tab === 0 ? 5 : tab - 1;
        let body = '';
        if (t === 0) {
          const slots = c.cardSlots.map((id, i) => id
            ? `<button class="ui-slot r3" data-act="cardoff:${i}" aria-label="${cardName(id)} 카드 빼기"><img class="px" src="${cardIcon(id)}" alt=""></button>`
            : `<div class="ui-slot empty" aria-label="빈 카드 칸"></div>`).join('');
          body = `<h3 style="margin-top:0">장착 ${c.cardSlots.filter(Boolean).length}/${CARD_SLOTS} <span class="ui-xs ui-muted">— 장착한 카드만 효과가 있습니다(캐릭터마다)</span></h3><div class="ui-grid">${slots}</div><h3>수집</h3>` + CARDS.map((cd) => {
            const n = g.acc.cards[cd.id] ?? 0, tier = cardTier(n), next = cardNext(n), on = c.cardSlots.includes(cd.id);
            const free = c.cardSlots.indexOf(null);
            const btn = !n || cd.passive ? '' : on ? `<button class="ui-btn sm" data-act="cardoff:${c.cardSlots.indexOf(cd.id)}">빼기</button>`
              : `<button class="ui-btn sm primary" data-act="cardon:${cd.id}" ${free >= 0 ? '' : 'disabled'}>장착</button>`;
            return `<div class="ui-row line"><span class="ui-slot ${tier >= 4 ? 'r5' : tier >= 3 ? 'r4' : tier === 2 ? 'r3' : tier === 1 ? 'r2' : 'locked'}"><img class="px" style="${n ? '' : 'filter:brightness(0)'}" src="${cardIcon(cd.id)}" alt=""></span>
              <div class="ui-grow"><b>${n ? cardName(cd.id) : '???'}</b> <span class="ui-xs ui-muted">${cd.from === 'node' ? '자원' : '몬스터'}</span> <span class="ui-accent">${'★'.repeat(tier)}${'☆'.repeat(CARD_MAX_TIER - tier)}</span>${cd.passive ? ' <span class="ui-xs ui-good">패시브</span>' : ''}
              <div class="ui-sm ${on || (cd.passive && n) ? 'ui-good' : 'ui-muted'}">${cd.label} +${Math.round(cd.per * Math.max(1, tier) * 100)}%${cd.passive ? (n ? ' (장착하지 않아도 적용)' : '') : on ? ' (적용 중)' : ''}</div>
              <div class="ui-xs ui-muted">${next ? `보유 ${n} / 다음 단계 ${next}` : `보유 ${n} · 최고 단계`}</div></div>${btn}</div>`;
          }).join('') + '<p class="ui-xs ui-muted">몬스터 카드는 사냥할 때, 자원 카드는 나무·광맥을 캘 때 드물게 나옵니다. 모은 카드는 모든 캐릭터가 함께 쓰고, 장착은 캐릭터마다 따로 합니다. 1·3·10·30·100장에서 단계가 오르고, 보스 카드는 패시브라 장착하지 않아도 효과가 있습니다.</p>';
        } else {
          // NPC마다 퀘스트 사슬을 아이콘 칸으로: 끝낸 것 ✓, 지금 것 진행도, 남은 것 잠금
          // 부탁이 있는 NPC 가운데, 이 캐릭터가 간 월드의 NPC만
          const npcWorld = (id: string) => { const m = Object.values(MAPS).find((x) => x.facilities.some((f) => f.npc === id)); return m ? worldOf(m.id) : 1; };
          body = Object.values(NPCS).filter((n) => n.quests.length && npcWorld(n.id) <= (c.maxWorld ?? 1)).map((n) => {
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
        if (t === 0) body = this.cardExtrasHtml(c) + body;
        if (t === 2) body = this.starsHtml(c);
        if (t === 3) body = this.achieveHtml();
        if (t === 4) body = this.familyHtml();
        if (t === 5) body = this.quickRefHtml();
        if (t === 6) body = this.deathHtml();
        const achReady = ACHIEVEMENTS.some((d) => achieveReady(g.acc, d.id));
        return win('목차', `${tabs(['참조', '카드', '퀘스트', '별자리', `업적${achReady ? ' !' : ''}`, '가족', '처치 기록'], tab, tabAct, ['ui_quick', 'ui_card', 'ui_quest', 'ui_star', 'ui_trophy', 'ui_family', 'ui_skull'])}<div class="ui-tabpanel">${body}</div>`);
      }

      case 'map': {
        // 위에서 내려다본 지형 지도. 지역을 누르면 테두리만 빛나고, 한 번 더(또는 아래 이동 버튼) 누르면 순간이동.
        // 마을은 무료, 나머지는 티켓 1장. 처치 목표를 다 채운 맵만 순간이동할 수 있다.
        const tickets = countItem(c, TP_TICKET) + storageCount(g.acc, TP_TICKET);
        // 월드 탭: 열어 둔 월드만 고를 수 있다
        const mw = c.maxWorld ?? 1, wn = Math.min(this.mapWorld ?? worldOf(c.mapId), mw);
        const ids = wn === 4 ? [...WORLD4, 'voidlair', 'gateb3'] : wn === 3 ? [...WORLD3, 'frostlair', 'gate2', 'gate4'] : wn === 2 ? [...WORLD2, 'sandlair', 'gate1', 'gate3'] : [...WORLD1, 'arena', 'lair', 'gate'];
        const regions: MapRegion[] = ids.map((id) => {
          if (id === 'gate1' || id === 'gate2') return { id, name: '세계의 문', state: 'mark', sel: false, sub: `${id.slice(4)}월드로` } as MapRegion;
          if (id === 'gateb3') return { id, name: '세계의 문', state: 'mark', sel: false, sub: '3월드로' } as MapRegion;
          if (id === 'gate4') { const ok = gateOpen(g.acc, c, 4); return { id, name: '세계의 문', state: mapUnlocked(c, 'frostpeak') ? 'mark' : 'locked', sel: false, sub: ok ? '열림 · 4월드로' : '조건 확인' } as MapRegion; }
          if (id === 'voidlair') { const here = c.mapId === id; return { id, name: MAPS.voidlair.name, state: here ? 'here' : mapUnlocked(c, 'voidedge') ? 'mark' : 'locked', sel: false, sub: here ? '현재 위치' : g.acc.bosses.nebtitan ? `토벌 ${g.acc.bosses.nebtitan}회` : '공허 위 · 열쇠' } as MapRegion; }
          if (id === 'gate3') { const ok = gateOpen(g.acc, c, 3); return { id, name: '세계의 문', state: mapUnlocked(c, 'sunspire') ? 'mark' : 'locked', sel: false, sub: ok ? '열림 · 3월드로' : '조건 확인' } as MapRegion; }
          if (id === 'frostlair') { const here = c.mapId === id; return { id, name: MAPS.frostlair.name, state: here ? 'here' : mapUnlocked(c, 'frostpeak') ? 'mark' : 'locked', sel: false, sub: here ? '현재 위치' : g.acc.bosses.frostlord ? `토벌 ${g.acc.bosses.frostlord}회` : '봉우리 위 · 열쇠' } as MapRegion; }
          if (id === 'sandlair') { const here = c.mapId === id; return { id, name: MAPS.sandlair.name, state: here ? 'here' : mapUnlocked(c, 'sunspire') ? 'mark' : 'locked', sel: false, sub: here ? '현재 위치' : g.acc.bosses.sandlord ? `토벌 ${g.acc.bosses.sandlord}회` : '해탑 위 · 열쇠' } as MapRegion; }
          if (id === 'gate') { const ok = gateOpen(g.acc, c); return { id, name: '세계의 문', state: mapUnlocked(c, 'grove') ? 'mark' : 'locked', sel: false, sub: ok ? '열림 · 2월드로' : '조건 확인' } as MapRegion; }
          const m = MAPS[id], here = c.mapId === id, open = mapUnlocked(c, id), q = mapQuota(id), k = c.kills[id] ?? 0;
          const mark = id === 'arena' || id === 'lair';
          const state: MapRegion['state'] = here ? 'here' : !open ? 'locked' : mark ? 'mark' : canTeleportTo(c, id) ? 'open' : 'unmet';
          const sub = here ? '현재 위치' : mark ? (id === 'lair' ? (g.acc.bosses.mossking ? `토벌 ${g.acc.bosses.mossking}회` : '숲 끝 · 열쇠') : '풀밭 위쪽 문') : q && k < q ? `처치 ${k.toLocaleString()}/${q}` : TOWNS.includes(id) ? '무료' : '';
          return { id, name: m.name, state, sel: this.mapSel === id, sub };
        });
        const pick = this.mapSel && MAPS[this.mapSel] && this.mapSel !== c.mapId ? this.mapSel : null;
        const can = pick ? canTeleportTo(c, pick) : false, free = !!pick && TOWNS.includes(pick);
        // 아래 줄은 늘 같은 높이: 고르기 전에는 안내, 고르면 이동 정보
        const foot = pick ? `<b class="ui-grow">${MAPS[pick].name}</b>
            <span class="ui-sm ${can ? '' : 'ui-bad'}">${!can ? `처치 목표 ${mapQuota(pick)}마리를 채워야 합니다` : free ? '무료' : `${iconHtml(ITEM_ICON[TP_TICKET])} 티켓 1장 (가진 ${tickets})`}</span>
            <button class="ui-btn primary sm" data-act="tp:${pick}" ${can && (free || tickets > 0) ? '' : 'disabled'}>이동</button>`
          : `<span class="ui-xs ui-muted ui-grow">지역을 누르면 고르고, 한 번 더 누르면 이동합니다. 마을은 무료, 다른 곳은 순간이동 티켓 1장.</span>`;
        const wtabs = mw > 1 ? ` <span class="worldsw" role="tablist">${WORLDS.filter((x) => x.n <= mw).map((x) => `<button class="ui-btn sm ${x.n === wn ? 'primary' : ''}" role="tab" aria-selected="${x.n === wn}" data-act="mapworld:${x.n}" title="${x.name}">${x.n}월드</button>`).join('')}</span>` : '';
        return win(`지도${wtabs} <span class="ui-sm">${iconHtml(ITEM_ICON[TP_TICKET])} 티켓 ${tickets}</span>`, `<div class="wmapbox"${wn === 4 ? ' style="background:#120e2a"' : ''}>${worldMapSvg(regions, wn)}</div><div class="ui-row mapfoot">${foot}</div>`);
      }

      case 'gate': {
        // 세계의 문: 조건을 다 채우면 2월드로 갈 수 있다(2월드는 아직 짓는 중)
        const gw = gateTo(this.gateWorld), checks = gateChecks(g.acc, c, gw.to), open = checks.every((x) => x.ok), town = MAPS[WORLDS.find((x) => x.n === gw.to)!.town].name;
        const rows = checks.map((x) => `<div class="ui-row line"><span class="gchk ${x.ok ? 'ok' : ''}">${x.ok ? '✓' : ''}</span><span class="ui-grow">${x.label}</span>
          <span class="ui-sm ${x.ok ? 'ui-good' : 'ui-bad'}">${Math.min(x.have, x.need).toLocaleString()} / ${x.need.toLocaleString()}</span></div>
          ${bar(x.ok ? 'xp' : 'hp', Math.min(x.have, x.need), x.need, '')}`).join('');
        return win('세계의 문', `<div class="gatebox"><div class="gateart" aria-hidden="true"></div><div class="ui-grow">
          <p class="ui-sm" style="margin-top:0">${gw.text}</p>${rows}
          <p class="ui-sm ${open ? 'ui-good' : 'ui-muted'}">${open ? `문이 열렸습니다! 문으로 들어가면 ${gw.to}월드 ${town}로 건너갑니다. 한 번 건너가면 지도에서 ${gw.to}월드로 순간이동할 수 있습니다.` : `모든 조건을 채우면 이 캐릭터가 문을 지날 수 있습니다. ${MONSTERS[gw.boss].name} 토벌은 계정 공용입니다.`}</p></div></div>`);
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
          ${row('ui_trash', '<span class="ui-bad">계정 삭제</span>', 'delacc')}
          ${this.delAcc ? `<div class="ui-tabpanel"><p class="ui-sm ui-bad">모든 캐릭터와 진행이 사라지며 되돌릴 수 없습니다.</p><label class="ui-sm ui-muted" for="delaccword">확인을 위해 <b>삭제</b> 라고 입력하세요</label>
            <div class="ui-row"><input id="delaccword" class="ui-input ui-grow" maxlength="4" autocomplete="off"><button class="ui-btn danger sm" data-act="delaccgo">계정 삭제</button><button class="ui-btn sm" data-act="delacc">취소</button></div></div>` : ''}</div>`);
      }

      case 'npc': {
        const npc = NPCS[this.npcId] ?? NPCS.elder;
        const speaker = (body: string) => `<div class="ui-dialog" role="dialog" aria-label="${npc.name}"><div class="speaker"><div class="face"><img class="px" src="${portraitUrl(npc.look)}" alt=""></div>${npc.name}</div>
          <div class="ui-grow stack">${body}</div><button class="ui-btn sm close" data-act="close" aria-label="닫기">✕</button></div>`;
        const subs = c.cls === 'beginner' ? [] : nextClasses(c.cls).filter((id) => !HIDDEN_TIERS[id]);
        // 전직 창에서도 이 NPC의 부탁을 받거나 끝낼 수 있게(전직을 미뤄도 퀘스트가 막히지 않는다)
        const questBlock = () => {
          const q = currentQuest(c, npc.id), p = questProgress(c, npc.id), st = c.quests[npc.id] ?? { idx: 0, accepted: false };
          if (!q || !p) return '';
          const btn = !st.accepted ? `<button class="ui-btn primary sm" data-act="qaccept:${npc.id}">수락</button>`
            : `<button class="ui-btn success sm" data-act="qdone:${npc.id}" ${p.done ? '' : 'disabled'}>완료</button>`;
          return `<div class="ui-xs ui-muted" style="margin-top:var(--sp-3)">부탁: <b class="ui-accent">${q.name}</b></div><div class="qline">${ui('ui_quest', 'mi')}${goalTile(q, st.accepted ? p.have : null, st.accepted && p.done ? 'ready' : '')}<span class="qarrow" aria-hidden="true">▶</span>${rewardTiles(q.reward)}<span class="ui-grow"></span>${btn}</div>`;
        };
        if (CLASS_NPCS.includes(npc.id) && subs.length && canSubclass(c)) {
          return speaker(`<p>“${CLASSES[c.cls].name}의 길을 꽤 걸었구먼. 이제 ${classTier(c.cls) + 1}차의 길로 나아갈 때일세.” <span class="ui-xs ui-bad">(한 번 고르면 바꿀 수 없습니다)</span></p>
            ${subs.map((id) => `<div class="ui-row line"><div class="ui-grow"><b>${CLASSES[id].name}</b><div class="ui-sm ui-muted">${CLASSES[id].desc}</div></div><button class="ui-btn primary" data-act="class:${id}">전직</button></div>`).join('')}${questBlock()}`);
        }
        if (CLASS_NPCS.includes(npc.id) && c.cls === 'beginner' && c.level >= CLASS_LEVEL) {
          return speaker(`<p>“많이 강해졌구먼! 이제 자네의 길을 정할 때일세.” <span class="ui-xs ui-bad">(한 번 고르면 바꿀 수 없습니다)</span></p>
            ${(['warrior', 'archer', 'mage'] as ClassId[]).map((id) => `<div class="ui-row line"><div class="ui-grow"><b>${CLASSES[id].name}</b><div class="ui-sm ui-muted">${CLASSES[id].desc}</div></div><button class="ui-btn primary" data-act="class:${id}">전직</button></div>`).join('')}${questBlock()}`);
        }
        // 수상한 나그네: 히든 계열. 월드마다 한 곳에 숨어 있고, 조건을 대놓고 알려 주지 않고 수수께끼로만
        if (npc.id === HIDDEN_CLASS.npc) {
          const line = classLine(c.cls), onLine = line.includes(HIDDEN_CLASS.cls);
          if (!onLine && c.cls !== 'beginner') return speaker('<p>“이미 길을 정했군… 아쉽네. 정해진 길만 있는 건 아니었는데.”</p>');
          const nextId = c.cls === 'beginner' ? HIDDEN_CLASS.cls : nextClasses(c.cls).find((id) => HIDDEN_TIERS[id]);
          if (!nextId) return speaker('<p>“이야기의 끝에 닿았군. 이제 자네가 이야기를 들려줄 차례일세.”</p>');
          const ht = HIDDEN_TIERS[nextId]!, need = TIER_LEVEL[classTier(nextId)];
          if (c.mapId !== ht.map) return speaker(`<p>“${onLine ? '길 위에서 또 만나는군.' : '흠… 아무 길에도 서지 않은 자로구먼.'} 하지만 다음 이야기는 여기서가 아니라네.”</p><p class="ui-sm ui-muted">“${MAPS[ht.map].name}에서 기다리지.”</p>`);
          if (c.level < need) return speaker(`<p>“${onLine ? '바람이 부는 쪽으로 계속 걷게, 동료여.' : '흠… 아무 길에도 서지 않은 자로구먼.'}”</p><p class="ui-sm ui-muted">“조금 더 오래 걸어 보게.” (Lv.${need})</p>`);
          if (countItem(c, ht.item) < 1) return speaker(`<p>“흠… 이제 때가 되었군.”</p><p class="ui-sm ui-muted">“${ht.hint}”</p>`);
          const w = CLASSES[nextId];
          return speaker(`<p>“그래, 그걸 찾았군. ${c.cls === 'beginner' ? '네 갈래 길 대신 다섯 번째 길이 있다네.' : '이야기의 다음 장을 펼칠 때일세.'}” <span class="ui-xs ui-bad">(한 번 고르면 바꿀 수 없습니다 · ${ITEMS[ht.item].name} 1개를 바칩니다)</span></p>
            <div class="ui-row line"><div class="ui-grow"><b class="ui-accent">${w.name}</b> <span class="ui-xs ui-accent">히든 ${classTier(nextId)}차</span><div class="ui-sm ui-muted">${w.desc}</div></div><button class="ui-btn primary" data-act="class:${nextId}">전직</button></div>`);
        }
        const q = currentQuest(c, npc.id), p = questProgress(c, npc.id), st = c.quests[npc.id] ?? { idx: 0, accepted: false };
        if (!q || !p) return speaker(npc.quests.length ? '<p>“고맙네! 지금은 부탁할 일이 없다네.”</p>' : `<p>“어서 오게. 지금은 부탁할 일이 없다네.”</p>${CLASS_NPCS.includes(npc.id) ? `<p class="ui-sm ui-muted">이곳에서 다음 단계 전직을 할 수 있습니다(${c.cls === 'beginner' ? `Lv.${CLASS_LEVEL}` : `Lv.${TIER_LEVEL[classTier(c.cls) + 1] ?? '-'}`}).</p>` : ''}`);
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
          const who = it.wtype ? ` · ${it.wtype === 'sword' ? '전사·낭만가 계열' : it.wtype === 'bow' ? '궁수 계열' : '마법사 계열'}` : '';
          // 재료: 아이콘 칸에 가진 수/필요 수(가방 + 창고)
          const mats = r.mats.map(([id, n]) => {
            const have = haveMat(g.acc, c, id), st = storageCount(g.acc, id);
            return tile(iconUrl(ITEM_ICON[id]), `${have}/${n}`, `${ITEMS[id].name} ${have}/${n}${st ? ` (창고 ${st})` : ''}`, '', have >= n ? 'ok' : 'bad');
          }).join('') + tile(iconUrl(ITEM_ICON.coin), r.coins.toLocaleString(), `코인 ${g.acc.coins}/${r.coins}`, '', g.acc.coins >= r.coins ? 'ok' : 'bad');
          detail = `<div class="ui-row"><span class="ui-slot">${icon(r.item)}</span><div><b>${it.name}</b><div class="ui-xs ui-muted">${it.slot ? SLOT_NAMES[it.slot] : r.unlock ? `모루 ${r.unlock}단계 열기` : '소모품'}${r.tier && r.tier > 1 ? ` · ${r.tier}단계` : ''}${r.smithLv ? ` · 대장 Lv.${r.smithLv}` : ''}${it.reqLv ? ` · Lv.${it.reqLv}` : ''}${who}</div></div></div>
            <span class="ui-sm ${it.stats ? 'ui-good' : ''}">${it.stats ? statLine(it.id) : it.desc}</span>
            <div class="qline mats">${mats}</div>
            ${(() => { const lack = r.mats.filter(([id, n]) => haveMat(g.acc, c, id) < n).map(([id, n]) => `${ITEMS[id].name} ${n - haveMat(g.acc, c, id)}개`); if (g.acc.coins < r.coins) lack.push(`코인 ${(r.coins - g.acc.coins).toLocaleString()}`); return lack.length ? `<span class="ui-xs ui-bad">부족: ${lack.join(', ')}</span>` : `<span class="ui-xs ui-muted">재료: ${r.mats.map(([id, n]) => `${ITEMS[id].name} ${n}`).join(', ')}</span>`; })()}
            ${recipeLock(g.acc, c, this.craftSel) ? `<span class="ui-sm ui-bad">${recipeLock(g.acc, c, this.craftSel)}${(r.tier ?? 1) > g.acc.anvilTier ? ' — 기타 탭의 모루 확장으로 열립니다' : ''}</span>` : ''}
            <button class="ui-btn primary block" data-act="craft:${this.craftSel}" ${r.unlock ? '' : `data-hold="${this.craftSel}"`} ${canCraft(g.acc, c, this.craftSel) ? '' : 'disabled'}>${r.unlock ? '확장' : '제작'}</button>
            ${r.unlock ? '' : '<span class="ui-xs ui-muted">길게 누르면 재료가 떨어질 때까지 계속 만듭니다.</span>'}
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
          <div class="ui-row"><p class="ui-xs ui-muted ui-grow">모든 캐릭터가 함께 쓰는 창고입니다(한 칸 개수 제한 없음). 창고 칸을 누르면 꺼내고, 가방 칸을 누르면 맡깁니다.</p>
            <span class="ui-xs">꺼내기</span><button class="ui-btn sm ${this.takeAll ? '' : 'primary'}" data-act="takemode:0">한 칸씩</button><button class="ui-btn sm ${this.takeAll ? 'primary' : ''}" data-act="takemode:1">전부</button></div>
          <div class="ui-grid store">${top}</div>
          <div class="ui-row" style="margin:var(--sp-3) 0"><h3 class="ui-grow" style="margin:0">가방 ${c.inventory.length}/${invSize(c)}</h3><button class="ui-btn primary sm" data-act="putall">재료·음식 전부 맡기기</button></div>
          <div class="ui-grid bag">${bag}</div>`);
      }

      case 'shop': {
        const now = Date.now();
        // 분류 탭: 음식 / 물품 / 우표·강화석. 아직 안 간 월드의 물건은 보이지 않는다
        const cat = (id: string) => ITEMS[id].kind === 'food' ? 0 : /^(stamp_|stone_)/.test(id) ? 2 : 1;
        const rows = SHOP.map((e, i) => {
          if ((c.maxWorld ?? 1) < (e.w ?? 1) || cat(e.item) !== tab) return '';
          const it = ITEMS[e.item], left = shopLeft(g.acc, i, now);
          const many = e.daily >= 10 ? `<button class="ui-btn sm" data-act="buy:${i}:10" ${left >= 10 && g.acc.coins >= e.price * 10 ? '' : 'disabled'}>10개</button>` : '';
          return `<div class="ui-row line"><span class="ui-slot">${icon(e.item)}</span><div class="ui-grow"><b>${it.name}</b><div class="ui-xs ui-muted">${it.desc}</div></div>
            <div style="text-align:right"><div class="ui-accent">${icon('coin')} ${e.price.toLocaleString()}</div><div class="ui-xs ${left ? 'ui-muted' : 'ui-bad'}">오늘 ${left}/${e.daily}</div></div>
            <button class="ui-btn primary sm" data-act="buy:${i}:1" ${left && g.acc.coins >= e.price ? '' : 'disabled'}>사기</button>${many}</div>`;
        }).join('');
        return win(`잡화점 <span class="ui-sm">${icon('coin')} ${g.acc.coins.toLocaleString()}</span>`, `${tabs(['음식', '물품', '우표·강화석'], tab, tabAct)}<div class="ui-tabpanel">${rows}<p class="ui-xs ui-muted">판매는 아이템 창에서 합니다. 수량은 매일 다시 채워집니다.</p></div>`);
      }

      case 'games': {
        const acc = g.acc, now = Date.now();
        const rows = (Object.keys(GAMES) as GameKind[]).map((k) => {
          const d = GAMES[k], left = playsLeft(acc, k, now), open = k !== 'spike' || spikeOpen(acc, now);
          const r = gameReward(c, k, d.max);
          const reward = [tile(iconUrl(ITEM_ICON.coin), `~${r.coins}`, `최고 점수면 코인 ${r.coins}`), ...r.items.map(([id, n]) => tile(iconUrl(ITEM_ICON[id]), `~${n}`, ITEMS[id].name)), r.skill ? tile(iconUrl('ui_xp'), `~${r.skill.xp}`, `${SKILL_NAMES[r.skill.key]} 경험치`) : ''].join('');
          const why = !open ? `매시 정각~${SPIKE_WINDOW}분에 열림` : !left ? '오늘은 끝' : '';
          return `<div class="ui-row line"><div class="ui-grow"><b>${d.name}</b> <span class="ui-xs ui-muted">최고 ${acc.mini.best[k] ?? 0}점 · 오늘 ${left}판 남음</span><div class="ui-xs ui-muted">${d.desc}</div><div class="qline">${reward}</div></div>
            <button class="ui-btn ${why ? '' : 'primary'}" data-act="play:${k}" ${why ? 'disabled' : ''}>${why || '시작'}</button></div>`;
        }).join('');
        return win('미니게임장', `${rows}<p class="ui-xs ui-muted">보상은 점수에 비례합니다(표시된 값은 최고 점수일 때).</p>`);
      }
      case 'pets': {
        // 원작의 펫: 하루 한 번 무료 뽑기 + 펫 크리스탈로 간식을 사서 뽑기. 가진 동료는 모두 효과, 겹치면 크리스탈, '+' 강화
        const acc = g.acc, now = Date.now(), freeOk = petFreeReady(acc, now), shards = countItem(c, CRYSTAL_ITEM);
        const odds = (o: number[]) => o.map((v, k) => (v ? `<span class="rar r${k}">${RARITY_NAMES[k]} ${Math.round(v * 100)}%</span>` : '')).join(' ');
        const treats = TREATS.map((t, i) => `<div class="ui-row line"><div class="ui-grow"><b>${t.name}</b><div class="ui-xs">${odds(t.odds)}</div></div>
          <button class="ui-btn sm ${acc.petCrystals >= t.cost ? 'primary' : ''}" data-act="ppull:${i}" ${acc.petCrystals >= t.cost ? '' : 'disabled'}>💎 ${t.cost}</button></div>`).join('');
        const sel = PETS.find((p) => p.id === this.petSel);
        const grid = PETS.map((p) => {
          const own = petOwned(acc, p.id), plus = petPlus(acc, p.id);
          return `<button class="ui-slot petcell r${p.rarity} ${own ? '' : 'none'}" data-act="psel:${p.id}" aria-pressed="${this.petSel === p.id}" aria-label="${own ? p.name : '아직 없는 동료'}">
            <img class="px" style="${own ? '' : 'filter:brightness(0) invert(.4);opacity:.55'}" src="${iconUrl(`pet_${p.id}`)}" alt="">${plus ? '<span class="qty ok">+</span>' : ''}</button>`;
        }).join('');
        let detail = '<span class="ui-xs ui-muted">동료를 누르면 효과를 볼 수 있습니다. 가지고만 있으면 모든 캐릭터에게 효과가 있습니다.</span>';
        if (sel) {
          const own = petOwned(acc, sel.id), plus = petPlus(acc, sel.id), cost = PET_PLUS[sel.rarity];
          detail = `<div class="ui-row"><span class="ui-slot r${sel.rarity}">${iconHtml(`pet_${sel.id}`)}</span><div><b>${own ? sel.name : '???'}${plus ? ' +' : ''}</b> <span class="rar r${sel.rarity}">${RARITY_NAMES[sel.rarity]}</span>
            <div class="ui-sm ${own ? 'ui-good' : 'ui-muted'}">${PET_BONUS_NAMES[sel.eff]} +${petValue({ pets: { [sel.id]: plus ? 2 : 1 } }, sel)}${sel.unit}${plus ? '' : ` (+ 강화하면 ${sel.per * 2}${sel.unit})`}</div></div></div>
            ${own && !plus ? `<button class="ui-btn sm" data-act="pplus:${sel.id}" ${acc.petCrystals >= cost ? '' : 'disabled'}>💎 ${cost} '+' 강화</button>` : ''}`;
        }
        return win(`동료 둥지 <span class="ui-sm ui-muted">계정 공용</span> <span class="ui-accent">💎 ${acc.petCrystals.toLocaleString()}</span>`, `<div class="split"><div class="stack">
            <button class="ui-btn ${freeOk ? 'primary' : ''} block" data-act="ppull:-1" ${freeOk ? '' : 'disabled'}>${freeOk ? '오늘의 무료 뽑기' : '무료 뽑기는 내일 다시'}</button>
            ${treats}
            <div class="ui-row"><span class="ui-xs ui-muted ui-grow">간식으로 ${PET_PITY.rare}번 안에 희귀 이상, ${PET_PITY.epic}번 안에 영웅 이상 보장 (지금 ${acc.petPity.rare}/${acc.petPity.epic})</span>
              ${shards ? `<button class="ui-btn sm" data-act="pshard">${iconHtml(ITEM_ICON[CRYSTAL_ITEM])} 조각 ${shards} 넣기</button>` : ''}</div>
          </div><div><div class="ui-grid petgrid">${grid}</div><div class="ui-detail" style="margin-top:var(--sp-2)">${detail}</div></div></div>
          <p class="ui-xs ui-muted">이미 있는 동료가 나오면 펫 크리스탈로 바뀝니다. 크리스탈 조각은 미니보스·콜로세움·잡화점에서 얻습니다.</p>`);
      }
      case 'owl': {
        const acc = g.acc, o = acc.owl;
        owlSettle(acc, Date.now());
        const rows = (Object.keys(OWL.ups) as OwlUp[]).map((k) => {
          const u = OWL.ups[k], max = o.up[k] >= u.max, cost = owlCost(o, k);
          return `<div class="ui-row line"><div class="ui-grow"><b>${u.name}</b> <span class="ui-xs ui-accent">${o.up[k]}/${u.max}</span><div class="ui-sm ${o.up[k] ? 'ui-good' : 'ui-muted'}">${u.desc(Math.max(1, o.up[k]) * u.per)}${o.up[k] ? '' : ' (1단계)'}</div></div>
            <button class="ui-btn sm" data-act="owl:${k}" ${!max && o.f >= cost ? '' : 'disabled'}>${max ? '최대' : `🪶 ${cost.toLocaleString()}`}</button></div>`;
        }).join('');
        return win('부엉이 횃대 <span class="ui-sm ui-muted">계정 공용</span>', `<div class="ui-row"><b class="ui-grow">깃털 <span class="ui-accent">${Math.floor(o.f).toLocaleString()}</span></b><span class="ui-sm ui-muted">시간당 ${Math.round(owlPerHour(o))}개 · 접속하지 않아도 쌓입니다</span></div>${rows}`);
      }
      case 'shrine': {
        const acc = g.acc, now = Date.now(), sk = c.skills.worship, need = skillXpToNext(sk.lv), ch = chargeNow(c, now), cap = chargeCap(c);
        const head = `<div class="ui-row alchhead">${ui('obj_shrine', 'mi')}<b class="ui-grow">기도 Lv.<span class="ui-accent">${sk.lv}</span> · 기도력 <span class="ui-accent">${Math.floor(ch)}</span> / ${cap} <span class="ui-xs ui-muted">시간당 ${chargeRate(c).toFixed(1)}</span></b><div style="width:26%">${bar('skill', sk.xp, need, `${sk.xp} / ${need}`)}</div></div>`;
        let body = '';
        if (tab === 0) {
          const be = boltEvery(c);
          body = WTOTEMS.map((t) => {
            const lock = worshipLock(c, t.id), here = c.mapId === t.map;
            const btn = lock ? `<span class="ui-sm ui-bad">${lock}</span>` : !here ? `<span class="ui-xs ui-muted">${MAPS[t.map].name}에서</span>` : `<button class="ui-btn sm primary" data-act="wplay:${t.id}" ${ch >= t.cost ? '' : 'disabled'}>지키기 · 기도력 ${t.cost}</button>`;
            return `<div class="ui-row line ${lock ? 'locked' : ''}">${ui(`soul_${t.soul}`, 'mi')}<div class="ui-grow"><b>${t.name}</b> <span class="ui-xs ui-muted">${MAPS[t.map].name} · Lv.${t.lv}</span>
              <div class="ui-xs ui-muted">${SOUL_NAMES[t.soul]} · 혼령 속도 ×${t.speed} · 혼령 최대 ${t.maxKills}마리(끝까지 지키면 ${runSouls(c, t.maxKills, true)}개)</div></div>${btn}</div>`;
          }).join('') + `<p class="ui-xs ui-muted">토템이 있는 맵에서 기도력을 써서 1분 동안 토템을 지킵니다. 다가오는 혼령을 눌러 없애세요. ${be ? `기도 Lv가 올라 토템이 ${be.toFixed(1)}초마다 스스로 혼령을 쏩니다.` : '기도 Lv.5부터 토템이 스스로 혼령을 쏩니다.'}</p>`;
        } else {
          const souls = (Object.keys(SOUL_NAMES) as SoulKind[]).map((k) => `<span class="ui-sm">${ui(`soul_${k}`, 'tic')} ${acc.worship.souls[k].toLocaleString()}</span>`).join(' ');
          const slots = prayerSlots(sk.lv), on = c.worship.on;
          body = `<div class="ui-row" style="gap:10px;flex-wrap:wrap">${souls}<span class="ui-grow"></span><span class="ui-xs">켠 기도문 <b class="ui-accent">${on.length}/${slots}</b></span></div>` + PRAYERS.map((p) => {
            const lv = acc.worship.prayers[p.id] ?? 0, max = lv >= PRAYER_MAX, cost = prayerCost(lv), locked = sk.lv < p.lv, active = on.includes(p.id);
            const v = (x: number) => Math.round(x * 100) / 100;
            return `<div class="ui-row line ${active ? 'sel' : ''} ${locked ? 'locked' : ''}">${ui(`soul_${p.soul}`, 'mi')}<div class="ui-grow"><b>${p.name}</b> <span class="ui-xs ui-accent">${lv}/${PRAYER_MAX}</span>
              <div class="ui-sm ui-good">${ALCH_LABEL[p.eff]} +${v(prayerValue(p, Math.max(1, lv)))}${p.unit}${lv && !max ? ` → +${v(prayerValue(p, lv + 1))}${p.unit}` : ''}</div>
              <div class="ui-xs ui-bad">저주: ${ALCH_LABEL[p.curse]} ${p.cv}${p.cunit}</div></div>
              ${locked ? `<span class="ui-sm ui-bad">기도 Lv.${p.lv}</span>` : `<button class="ui-btn sm" data-act="wup:${p.id}" ${!max && acc.worship.souls[p.soul] >= cost ? '' : 'disabled'}>${max ? '최대' : `${ui(`soul_${p.soul}`, 'tic')} ${cost.toLocaleString()}`}</button>
              <button class="ui-btn sm ${active ? 'primary' : ''}" data-act="wtog:${p.id}" ${lv ? '' : 'disabled'}>${active ? '끄기' : '켜기'}</button>`}</div>`;
          }).join('') + `<p class="ui-xs ui-muted">기도문 레벨은 계정 공용이고, 켜는 것은 캐릭터마다입니다. 켠 기도문은 효과와 함께 저주도 걸립니다. 켤 수 있는 수는 기도 Lv.20마다 하나씩 늘어납니다(최대 4).</p>`;
        }
        return win(`기도 토템 <span class="ui-sm ui-muted">${esc(c.name)}</span>`, `${head}${tabs(['토템', '기도문'], tab, tabAct, ['obj_shrine', 'soul_star'])}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'lab': {
        const acc = g.acc, lab = acc.lab, now = Date.now();
        labSettle(acc, now);
        const st = labState(acc), sk = c.skills.lab, need = skillXpToNext(sk.lv), me = lab.members.find((m) => m.id === c.id);
        const head = `<div class="ui-row alchhead">${ui('obj_lab', 'mi')}<b class="ui-grow">연구 Lv.<span class="ui-accent">${sk.lv}</span> <span class="ui-xs ui-muted">${esc(c.name)} · ${me ? (st.linked.has(c.id) ? '연결됨' : '연결 안 됨') : '연구실 밖'} · 범위 ${Math.round(labRange(sk.lv, st.on.has('n_link')))}</span></b>
          <div style="width:24%">${bar('skill', sk.xp, need, `${sk.xp} / ${need}`)}</div>${me ? '<button class="ui-btn sm" data-act="lableave">나가기</button>' : ''}</div>`;
        let body = '';
        if (tab === 0) {
          let svg = `<svg class="labmap" viewBox="-6 -6 332 192" role="group" aria-label="연구판"><rect x="-6" y="-6" width="332" height="192" fill="#120e2a"/>`;
          for (let x = 0; x <= 320; x += 20) svg += `<line x1="${x}" y1="0" x2="${x}" y2="180" stroke="#2a2452" stroke-width=".5"/>`;
          for (let y = 0; y <= 180; y += 20) svg += `<line x1="0" y1="${y}" x2="320" y2="${y}" stroke="#2a2452" stroke-width=".5"/>`;
          svg += `<circle cx="${LAB.main.x}" cy="${LAB.main.y}" r="${LAB.mainRange}" fill="#7affe8" fill-opacity=".06" stroke="#7affe8" stroke-opacity=".5" stroke-dasharray="3 3"/>`;
          for (const m of lab.members) if (st.linked.has(m.id)) { const p = LAB_SPOTS[m.spot]; svg += `<circle cx="${p.x}" cy="${p.y}" r="${st.range[m.id]}" fill="#c87aff" fill-opacity=".07" stroke="#c87aff" stroke-opacity=".55" stroke-dasharray="3 3"/>`; }
          for (const n of LAB_NODES) {
            const on = st.on.has(n.id), locked = n.jewel && !lab.jewels.includes(n.id);
            svg += n.jewel
              ? `<path d="M${n.x} ${n.y - 7} l6 7 l-6 7 l-6 -7Z" fill="${locked ? '#3a3448' : on ? '#ff9ae0' : '#7a5a8a'}" stroke="${on ? '#ffffff' : '#5a4a6a'}" stroke-width="1"><title>${n.name}: ${n.desc}${locked ? ' (잠김)' : ''}</title></path>`
              : `<rect x="${n.x - 7}" y="${n.y - 7}" width="14" height="14" rx="3" fill="${on ? '#7affe8' : '#3a3a5a'}" stroke="${on ? '#ffffff' : '#5a5a7a'}" stroke-width="1"><title>${n.name}: ${n.desc}</title></rect><rect x="${n.x - 3}" y="${n.y - 3}" width="6" height="6" fill="${on ? '#1a4a5a' : '#2a2a3a'}"/>`;
          }
          svg += `<rect x="${LAB.main.x - 12}" y="${LAB.main.y - 14}" width="24" height="28" rx="3" fill="#c8c4d8" stroke="#ffffff"/><rect x="${LAB.main.x - 8}" y="${LAB.main.y - 10}" width="16" height="10" fill="#2a6a7a"/><text x="${LAB.main.x}" y="${LAB.main.y + 26}" class="wsub">본체</text>`;
          LAB_SPOTS.forEach((p, i) => {
            const m = lab.members.find((x) => x.spot === i), ch = m ? acc.characters.find((x) => x.id === m.id) : null;
            const mine = m?.id === c.id, linked = m && st.linked.has(m.id);
            svg += `<g class="labspot" data-act="labspot:${i}" tabindex="0" role="button" aria-label="${ch ? `${esc(ch.name)}의 자리` : `빈 자리 ${i + 1}`}">
              <circle cx="${p.x}" cy="${p.y}" r="9" fill="${ch ? ch.look.outfit : '#1e1a3e'}" stroke="${mine ? '#ffe066' : linked ? '#c87aff' : '#5a5a7a'}" stroke-width="${mine ? 2.4 : 1.4}" ${ch ? '' : 'stroke-dasharray="2 2"'}/>
              ${ch ? `<text x="${p.x}" y="${p.y + 3.5}" class="labtx">${esc(ch.name.slice(0, 1))}</text><text x="${p.x}" y="${p.y + 19}" class="wsub">${esc(ch.name)}${atStation(acc, ch.id) ? '' : ' (비움)'}</text>` : `<text x="${p.x}" y="${p.y + 3.5}" class="labtx dim">+</text>`}</g>`;
          });
          svg += '</svg>';
          body = `<div class="wmapbox" style="background:#120e2a">${svg}</div><p class="ui-xs ui-muted">빈 자리를 누르면 ${esc(c.name)}이(가) 그 자리에 섭니다. 본체(왼쪽)의 신호 범위나 연결된 캐릭터의 범위에 닿으면 연결되고, 연결된 캐릭터의 범위 안 장치(네모)와 보석(마름모)이 켜집니다. 연결된 캐릭터는 시간마다 연구 경험치를 얻어 범위가 넓어집니다. 연구원은 성운 정거장에 머물러 있어야 일하고(다른 맵에 가면 자리를 비움), 요리사와 함께 할 수 없습니다.</p>`;
        } else {
          body = LAB_NODES.map((n) => {
            const on = st.on.has(n.id), locked = n.jewel && !lab.jewels.includes(n.id);
            const cost = locked && n.cost ? n.cost.map(([s, k]) => `<span class="ui-xs ${(acc.cook.spices[s] ?? 0) >= k ? '' : 'ui-bad'}">${ui(s, 'tic')}${k}</span>`).join(' ') : '';
            const can = locked && n.cost?.every(([s, k]) => (acc.cook.spices[s] ?? 0) >= k);
            return `<div class="ui-row line ${on ? '' : 'locked'}">${ui(`lab_${n.id}`, 'mi')}<div class="ui-grow"><b>${n.name}</b> <span class="ui-xs ${on ? 'ui-good' : 'ui-muted'}">${locked ? '잠김' : on ? '켜짐' : '꺼짐(범위 밖)'}</span><div class="ui-sm ${on ? 'ui-good' : 'ui-muted'}">${n.desc}</div>${cost ? `<div class="costrow">${cost}</div>` : ''}</div>
              ${locked ? `<button class="ui-btn sm primary" data-act="labjewel:${n.id}" ${can ? '' : 'disabled'}>열기</button>` : ''}</div>`;
          }).join('') + `<p class="ui-xs ui-muted">보석은 요리 향신료로 엽니다. 연 보석도 연결된 캐릭터의 범위 안에 있어야 켜집니다.</p>`;
        }
        return win('연구실', `${head}${tabs(['연구판', '장치·보석'], tab, tabAct, ['obj_lab', 'lab_j_ruby'])}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'nest': {
        const acc = g.acc, b = acc.breed, now = Date.now();
        breedSettle(acc, now);
        const need = breedXpToNext(b.lv);
        const head = `<div class="ui-row alchhead">${ui('obj_nest', 'mi')}<b class="ui-grow">번식 Lv.<span class="ui-accent">${b.lv}</span> <span class="ui-xs ui-muted">펫 ${b.pets.length}/${BREED.petMax} · 계정 공용</span></b><div style="width:28%">${bar('skill', b.xp, need, `${b.xp} / ${need}`)}</div></div>`;
        const RAR = ['일반', '희귀', '영웅', '전설'], RCLS = ['', 'ui-good', 'ui-accent', 'ui-bad'];
        const petLine = (p: BPet, btns: string) => { const s = SPEC[p.sp], at = placeOf(b, p.uid);
          return `<div class="ui-row line">${ui(`bp_${p.sp}`, 'mi')}<div class="ui-grow"><b>${s.name}</b> <span class="ui-xs ${RCLS[p.rar]}">${RAR[p.rar]}</span> <span class="ui-xs ui-accent">힘 ${p.power}</span>
            <div class="ui-xs ui-muted">${GENES[p.gene].name}: ${GENES[p.gene].desc}${at ? ` · ${at === 'fence' ? '울타리' : TERR[at].name}에 있음` : ''}</div></div>${btns}</div>`; };
        let body = '';
        if (tab === 0) {
          const eggs = Array.from({ length: nestCap(b) }, (_, i) => i < b.eggs.length ? `<span class="ui-slot" title="${RAR[[...b.eggs].sort((x, y) => y - x)[i]]} 알">${ui(`egg_${[...b.eggs].sort((x, y) => y - x)[i]}`, 'mi')}</span>` : `<span class="ui-slot ui-muted"></span>`).join('');
          const nextMin = Math.ceil((1 - (b.eggFrac % 1)) * 60 / eggRate(b));
          body = `<div class="ui-row" style="gap:6px;flex-wrap:wrap">${eggs}<span class="ui-grow ui-xs ui-muted">${b.eggs.length >= nestCap(b) ? '둥지가 가득 찼습니다' : `다음 알까지 약 ${nextMin}분`}</span>
            <button class="ui-btn sm primary" data-act="bhatch" ${b.eggs.length && b.pets.length < BREED.petMax ? '' : 'disabled'}>알 깨기</button></div>
            <h3>펫</h3>${b.pets.map((p) => petLine(p, `<button class="ui-btn sm ${placeOf(b, p.uid) === 'fence' ? 'primary' : ''}" data-act="bfence:${p.uid}">울타리</button><button class="ui-btn sm" data-act="brel:${p.uid}" title="놓아주면 사라집니다(번식 경험치 조금)">놓아주기</button>`)).join('') || '<p class="ui-sm ui-muted">아직 펫이 없습니다. 알을 깨 보세요.</p>'}
            <p class="ui-xs ui-muted">좋은 알부터 깹니다. 어떤 종이 나올지는 번식 레벨로 열린 종 가운데서 정해집니다.</p>`;
        } else if (tab === 1) {
          const inF = b.fence.map((u) => b.pets.find((p) => p.uid === u)).filter((p): p is BPet => !!p);
          body = `<div class="ui-row"><b class="ui-grow">울타리 ${inF.length}/${fenceCap(b)}</b><span class="ui-xs ui-muted">울타리에 있는 펫의 종마다 반짝임이 오릅니다</span></div>${inF.map((p) => petLine(p, `<button class="ui-btn sm" data-act="bfence:${p.uid}">빼기</button>`)).join('')}
            <h3>반짝임(계정 보너스)</h3>` + SPECIES.map((s) => {
            const sh = b.shiny[s.id] ?? { lv: 0, h: 0 }, open = s.lv <= b.lv, max = sh.lv >= BREED.shinyMax, nd = shinyNeed(sh.lv);
            const v = (x: number) => Math.round(x * s.per * 100) / 100;
            if (!open) return `<div class="ui-row line locked">${ui('ui_lock', 'mi')}<div class="ui-grow"><b>???</b><div class="ui-xs ui-muted">번식 Lv.${s.lv}에 열리는 종</div></div></div>`;
            return `<div class="ui-row line">${ui(`bp_${s.id}`, 'mi')}<div class="ui-grow"><b>${s.name}</b> <span class="ui-xs ui-accent">반짝임 ${sh.lv}/${BREED.shinyMax}</span>
              <div class="ui-sm ${sh.lv ? 'ui-good' : 'ui-muted'}">${ALCH_LABEL[s.eff]} +${v(sh.lv)}${s.unit}${max ? '' : ` → +${v(sh.lv + 1)}${s.unit}`}</div>${max ? '' : bar('xp', Math.floor(sh.h * 10), Math.ceil(nd * 10), `${sh.h.toFixed(1)} / ${nd.toFixed(1)}시간`)}</div></div>`;
          }).join('');
        } else if (tab === 2) {
          const tp = this.terrPick;
          if (tp && TERR[tp]) {
            const free = b.pets.filter((p) => { const at = placeOf(b, p.uid); return at !== tp; }).sort((x, y) => y.power - x.power);
            const team = b.terr[tp]?.team ?? [];
            body = `<div class="ui-row"><b class="ui-grow">${TERR[tp].name} 팀 ${team.length}/${BREED.teamMax} <span class="ui-xs ui-muted">힘 ${Math.round(teamPower(b, tp))} / 요구 ${TERR[tp].need}</span></b><button class="ui-btn sm" data-act="bterr:${tp}">뒤로</button></div>`
              + team.map((u) => b.pets.find((p) => p.uid === u)).filter((p): p is BPet => !!p).map((p) => petLine(p, `<button class="ui-btn sm primary" data-act="bteam:${p.uid}:${tp}">빼기</button>`)).join('')
              + `<h3>보낼 펫</h3>` + (free.map((p) => petLine(p, `<button class="ui-btn sm" data-act="bteam:${p.uid}:${tp}" ${team.length < BREED.teamMax ? '' : 'disabled'}>보내기</button>`)).join('') || '<p class="ui-sm ui-muted">보낼 펫이 없습니다.</p>');
          } else {
            body = TERRITORIES.map((t) => {
              const open = b.lv >= t.lv, st = b.terr[t.id], pw = teamPower(b, t.id), n = st?.team.length ?? 0;
              if (!open) return `<div class="ui-row line locked">${ui('ui_lock', 'mi')}<div class="ui-grow"><b>${t.name}</b><div class="ui-xs ui-muted">번식 Lv.${t.lv}에 열림</div></div></div>`;
              const lapH = pw ? (BREED.lapSecs * t.need) / pw / 3600 : 0;
              return `<div class="ui-row line">${ui(t.spice, 'mi')}<div class="ui-grow"><b>${t.name}</b> <span class="ui-xs ui-accent">팀 ${n}/${BREED.teamMax} · 힘 ${Math.round(pw)} / ${t.need}</span>
                ${n ? bar('xp', Math.floor(st!.prog), BREED.lapSecs, `한 바퀴 ${lapH >= 1 ? `${lapH.toFixed(1)}시간` : `${Math.ceil(lapH * 60)}분`} · 향신료 ${spicePerLap(b, t.id)}개 · ${st!.laps}바퀴 돌았음`) : '<div class="ui-xs ui-muted">펫을 보내면 영역을 돌며 향신료를 가져옵니다</div>'}</div>
                <button class="ui-btn sm primary" data-act="bterr:${t.id}">팀 짜기</button></div>`;
            }).join('') + `<p class="ui-xs ui-muted">팀의 힘이 요구 힘보다 셀수록 빨리 돕니다. 가져온 향신료는 별빛 식당에 바로 들어갑니다.</p>`;
          }
        } else {
          const NAMES: Record<BreedUp, [string, string]> = { nest: ['둥지 넓히기', `알 칸 ${nestCap(b)}개`], speed: ['따뜻한 짚', `알 낳는 속도 +${b.up.speed * 10}%`], rarity: ['별빛 모이', `좋은 알 확률 ×${(1 + b.up.rarity * 0.1).toFixed(1)}`], fence: ['울타리 넓히기', `울타리 ${fenceCap(b)}칸`] };
          body = (Object.keys(BREED.up) as BreedUp[]).map((k) => {
            const lv = b.up[k], max = lv >= BREED.up[k].max, cost = upCostOf(b, k);
            return `<div class="ui-row line">${ui('ui_up', 'mi')}<div class="ui-grow"><b>${NAMES[k][0]}</b> <span class="ui-xs ui-accent">${lv}/${BREED.up[k].max}</span><div class="ui-sm ui-muted">${NAMES[k][1]}</div></div>
              <button class="ui-btn sm" data-act="bup:${k}" ${!max && acc.coins >= cost ? '' : 'disabled'}>${max ? '최대' : `${ui('ui_coin', 'tic')} ${cost.toLocaleString()}`}</button></div>`;
          }).join('') + `<p class="ui-xs ui-muted">알 등급 확률: 희귀 ${(rarityOdds(b)[0] * 100).toFixed(1)}% · 영웅 ${(rarityOdds(b)[1] * 100).toFixed(1)}% · 전설 ${(rarityOdds(b)[2] * 100).toFixed(1)}%. 등급이 높을수록 펫의 힘이 셉니다.</p>`;
        }
        return win('번식 둥지', `${head}${tabs(['둥지', '울타리', '영역', '개량'], tab, tabAct, ['egg_1', 'bp_b_puff', 'sp_dust', 'ui_up'])}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'kitchen': {
        const acc = g.acc, k = acc.cook, now = Date.now();
        cookSettle(acc, now);
        const sk = c.skills.cooking, need = skillXpToNext(sk.lv), seated = k.chefs.includes(c.id);
        const head = `<div class="ui-row alchhead">${ui('obj_kitchen', 'mi')}<b class="ui-grow">요리 Lv.<span class="ui-accent">${sk.lv}</span> <span class="ui-xs ui-muted">요리사 ${k.chefs.length}/${k.kitchens.length} · 주방 속도 ×${chefMult(acc).toFixed(2)} · 국자 ${k.ladles ?? 0}/${COOK.ladleMax}</span></b>
          <div style="width:24%">${bar('skill', sk.xp, need, `${sk.xp} / ${need}`)}</div><button class="ui-btn sm ${seated ? 'primary' : ''}" data-act="kchef" title="식탁에 앉은 캐릭터는 성운 정거장에 머무는 동안 요리 레벨만큼 모든 주방을 빠르게 하고 요리 경험치를 얻습니다. 연구원과 함께 할 수 없습니다">${seated ? '식탁에서 일어나기' : '식탁에 앉기'}</button></div>`;
        const spi = (id: string, n?: number) => `${ui(id, 'tic')}${n !== undefined ? n.toLocaleString() : ''}`;
        const hm = (s: number) => { const m = Math.ceil(s / 60); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
        let body = '';
        if (tab === 0) {
          const ki = this.kitIdx;
          if (ki >= 0 && k.kitchens[ki] && !k.kitchens[ki].recipe) {
            // 고르기: 아는 요리 또는 새 요리 연구
            const meals = k.found.map((id) => { const m = MEAL[id]; return `<button class="ui-btn sm ${k.kitchens[ki].meal === id ? 'primary' : ''}" data-act="kmeal:${ki}:${id}">${ui(`ml_${id}`, 'tic')} ${m.name}<br><span class="ui-xs">${mealsPerHour(acc, k.kitchens[ki], id).toFixed(1)}/시간</span></button>`; }).join('');
            const sel = this.recipeSp, cost = recipeCost(k.found.length), res = sel.length ? recipeResult(k, sel) : null;
            const sps = SPICES.map((s) => { const on = sel.includes(s.id), have = k.spices[s.id] ?? 0; return `<button class="ui-btn sm ${on ? 'primary' : ''}" data-act="ksp:${s.id}" ${!on && (sel.length >= 4 || have < cost) ? 'disabled' : ''} title="${s.name}">${spi(s.id, have)}</button>`; }).join('');
            const tierTxt = sel.length ? `${sel.length}가지 → ${res ? `${MEAL[res].tier}단계 요리 · 성공 확률 ${Math.round(recipeChance(k.kitchens[ki]) * 100)}% · ${hm(COOK.recipeSecs * sel.length / recipeRate(k.kitchens[ki]))}` : '이 단계 요리는 다 찾았습니다'}` : '향신료를 1~4가지 고르세요';
            body = `<div class="ui-row"><b class="ui-grow">${ki + 1}번 주방에서 무엇을 할까요?</b><button class="ui-btn sm" data-act="kpick:${ki}">뒤로</button></div>
              <h3>아는 요리 만들기</h3><div class="ui-row trapbtns" style="flex-wrap:wrap;justify-content:flex-start">${meals || '<span class="ui-sm ui-muted">아직 아는 요리가 없습니다. 아래에서 연구하세요.</span>'}${k.kitchens[ki].meal ? `<button class="ui-btn sm" data-act="kmeal:${ki}:">멈추기</button>` : ''}</div>
              <h3>새 요리 연구 <span class="ui-xs ui-muted">가짓수마다 ${cost}개씩</span></h3><div class="ui-row trapbtns" style="flex-wrap:wrap;justify-content:flex-start">${sps}</div>
              <div class="ui-row"><span class="ui-sm ui-grow ${res ? 'ui-good' : 'ui-muted'}">${tierTxt}</span><button class="ui-btn sm primary" data-act="krecipe:${ki}" ${res ? '' : 'disabled'}>연구 시작</button></div>`;
          } else {
            body = k.kitchens.map((kit, i) => {
              let st: string;
              if (kit.recipe) st = `<b>요리 연구 중</b> <span class="ui-xs">${kit.recipe.sp.map((s) => ui(s, 'tic')).join('')} · 끝나야 성공인지 알 수 있습니다</span>${bar('xp', Math.floor(kit.recipe.prog), kit.recipe.need, `${hm((kit.recipe.need - kit.recipe.prog) / recipeRate(kit))} 남음`)}`;
              else if (kit.meal) st = `<b>${MEAL[kit.meal].name}</b> <span class="ui-xs ui-good">시간당 ${mealsPerHour(acc, kit, kit.meal).toFixed(1)}접시</span><div class="ui-xs ui-muted">가진 수 ${Math.floor(k.meals[kit.meal]?.n ?? 0).toLocaleString()}</div>`;
              else st = '<span class="ui-muted">쉬는 중 · 요리를 고르거나 연구하세요</span>';
              const ups = (['spd', 'fire', 'luck'] as KitchenUp[]).map((u) => {
                const lv = kit[u], sp = upSpice(i, u, lv), cost = upCost(lv), max = lv >= COOK.upMax;
                const lab = u === 'spd' ? `속도 ${lv}` : u === 'fire' ? `불 ${lv}` : `행운 ${lv}`;
                const tip = u === 'spd' ? `요리 속도 +${Math.round(lv * COOK.spdPer * 100)}%` : u === 'fire' ? `연구 속도 +${Math.round(lv * COOK.firePer * 100)}%` : `두 배 확률 ${Math.round(lv * COOK.luckPer * 100)}%`;
                return `<button class="ui-btn sm" data-act="kup:${i}:${u}" title="${tip}" ${!max && (k.spices[sp] ?? 0) >= cost ? '' : 'disabled'}>${lab}<br><span class="ui-xs">${max ? '최대' : spi(sp, cost)}</span></button>`;
              }).join('');
              return `<div class="ui-row line">${kit.meal ? ui(`ml_${kit.meal}`, 'mi') : ui('obj_kitchen', 'mi')}<div class="ui-grow">${st}</div><div class="ui-row trapbtns">${ups}</div>
                <button class="ui-btn sm" data-act="kladle:${i}" ${(k.ladles ?? 0) >= 1 && (kit.recipe || kit.meal) ? '' : 'disabled'} title="국자 하나로 이 주방의 1시간치를 바로 진행">국자</button>
                <button class="ui-btn sm primary" data-act="kpick:${i}" ${kit.recipe ? 'disabled' : ''}>바꾸기</button></div>`;
            }).join('');
            const kc = COOK.kitchenCost[k.kitchens.length];
            body += kc !== undefined ? `<div class="ui-row line">${ui('obj_kitchen', 'mi')}<span class="ui-grow"><b>주방 늘리기</b> <span class="ui-xs ui-muted">주방이 늘면 식탁 자리도 늘어납니다</span></span><button class="ui-btn sm" data-act="kbuy" ${acc.coins >= kc ? '' : 'disabled'}>${ui('ui_coin', 'tic')} ${kc.toLocaleString()}</button></div>` : '';
            body += `<p class="ui-xs ui-muted">주방은 계정 공용이고 접속하지 않아도 요리합니다. 주방 단계는 향신료로 올리고, 단계마다 드는 향신료가 바뀝니다.</p>`;
          }
        } else if (tab === 1) {
          body = MEALS.map((m) => {
            if (!k.found.includes(m.id)) return `<div class="ui-row line locked">${ui('ui_lock', 'mi')}<div class="ui-grow"><b>???</b><div class="ui-xs ui-muted">${m.tier}단계 요리 · 향신료 ${m.tier}가지로 연구</div></div></div>`;
            const st = k.meals[m.id] ?? { lv: 0, n: 0 }, max = st.lv >= COOK.mealMax, nd = mealNeed(st.lv), v = (x: number) => Math.round(x * m.per * 100) / 100;
            return `<div class="ui-row line">${ui(`ml_${m.id}`, 'mi')}<div class="ui-grow"><b>${m.name}</b> <span class="ui-xs ui-accent">Lv.${st.lv}/${COOK.mealMax}</span>
              <div class="ui-sm ${st.lv ? 'ui-good' : 'ui-muted'}">${ALCH_LABEL[m.eff]} +${v(st.lv)}${m.unit}${max ? '' : ` → +${v(st.lv + 1)}${m.unit}`}</div>${max ? '' : bar('xp', Math.min(nd, Math.floor(st.n)), nd, `${Math.floor(st.n).toLocaleString()} / ${nd.toLocaleString()}접시`)}</div>
              <button class="ui-btn sm primary" data-act="klvl:${m.id}" ${!max && st.n >= nd ? '' : 'disabled'}>${max ? '최대' : '레벨 업'}</button></div>`;
          }).join('') + `<p class="ui-xs ui-muted">쌓인 접시로 요리 레벨을 올리면 계정의 모든 캐릭터에게 효과가 생깁니다.</p>`;
        } else {
          const bank = SPICES.reduce((s, x) => s + Math.floor(k.bank[x.id] ?? 0), 0);
          body = SPICES.map((s) => {
            const have = k.spices[s.id] ?? 0, t = TERRITORIES.find((x) => x.spice === s.id), team = t ? acc.breed.terr[t.id]?.team.length ?? 0 : 0;
            return `<div class="ui-row line">${ui(s.id, 'mi')}<div class="ui-grow"><b>${s.name}</b> <span class="ui-xs ui-accent">${have.toLocaleString()}개</span>
              <div class="ui-xs ${team ? 'ui-good' : 'ui-muted'}">${t ? `번식 영역 '${t.name}'${team ? `에서 펫 ${team}마리가 모으는 중` : `에 펫을 보내면 모입니다(번식 Lv.${t.lv})`}` : '-'}</div></div></div>`;
          }).join('') + `<div class="ui-row"><span class="ui-xs ui-muted ui-grow">원작처럼 향신료는 번식 둥지의 영역에 펫을 보내야 모입니다.</span>${bank ? `<button class="ui-btn sm primary" data-act="kclaim">예전 저장고 거두기 (${bank})</button>` : ''}</div>`;
        }
        return win('별빛 식당', `${head}${tabs(['주방', '요리', '향신료'], tab, tabAct, ['obj_kitchen', 'ml_m_bun', 'sp_honey'])}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'build': {
        const acc = g.acc, b = acc.build, now = Date.now();
        buildSettle(acc, now);
        const rate = buildRate(b), need = buildXpToNext(b.lv);
        const hm = (h: number) => (h >= 1 ? `${Math.floor(h)}시간 ${Math.round((h % 1) * 60)}분` : `${Math.max(1, Math.ceil(h * 60))}분`);
        const head = `<div class="ui-row alchhead">${ui('obj_build', 'mi')}<b class="ui-grow">건설 Lv.<span class="ui-accent">${b.lv}</span> <span class="ui-xs ui-muted">시간당 건설 포인트 ${Math.round(rate).toLocaleString()} · 계정 공용</span></b><div style="width:28%">${bar('skill', b.xp, need, `${b.xp} / ${need}`)}</div></div>`;
        let body = '';
        if (tab === 0) {
          const jobs = Array.from({ length: buildSlots(b) }, (_, i) => {
            const j = b.jobs[i];
            if (!j) return `<div class="ui-row line">${ui('obj_build', 'mi')}<span class="ui-grow ui-muted">빈 공사 칸 · 아래에서 지을 건물을 고르세요</span></div>`;
            const d = BUILDINGS.find((x) => x.id === j.id)!, lv = b.levels[j.id] ?? 0;
            return `<div class="ui-row line">${ui(`bld_${d.id}`, 'mi')}<div class="ui-grow"><b>${d.name}</b> <span class="ui-xs ui-accent">Lv.${lv} → ${lv + 1}</span>${bar('xp', Math.floor(j.prog), j.need, `${Math.floor(j.prog).toLocaleString()} / ${j.need.toLocaleString()} · ${hm((j.need - j.prog) / rate)} 남음`)}</div>
              <button class="ui-btn sm" data-act="build:cancel:${i}" title="공사를 멈추면 넣은 재료는 돌려받지 못합니다">멈추기</button></div>`;
          }).join('');
          const free = b.jobs.filter(Boolean).length < buildSlots(b);
          const list = BUILDINGS.map((d) => {
            const lv = b.levels[d.id] ?? 0, max = lv >= d.max, busy = b.jobs.some((j) => j?.id === d.id), cost = buildCost(d, lv);
            const enough = cost.mats.every(([m, n]) => haveMat(acc, c, m) >= n);
            const mats = max ? '' : cost.mats.map(([m, n]) => `<span class="ui-xs ${haveMat(acc, c, m) >= n ? '' : 'ui-bad'}">${icon(m)}${n.toLocaleString()}</span>`).join(' ') + ` <span class="ui-xs ui-muted">· ${cost.need.toLocaleString()}점(${hm(cost.need / rate)})</span>`;
            const val = (x: number) => Math.round(x * d.per * 100) / 100;
            return `<div class="ui-row line ${max ? 'done' : ''}">${ui(`bld_${d.id}`, 'mi')}<div class="ui-grow"><b>${d.name}</b> <span class="ui-xs ui-accent">${lv}/${d.max}</span>
              <div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${ALCH_LABEL[d.eff]} +${val(lv)}${d.unit}${max ? '' : ` → +${val(lv + 1)}${d.unit}`}</div><div class="costrow">${mats}</div></div>
              <button class="ui-btn sm primary" data-act="build:start:${d.id}" ${!max && !busy && free && enough ? '' : 'disabled'}>${max ? '최대' : busy ? '공사 중' : '짓기'}</button></div>`;
          }).join('');
          body = `${jobs}<h3>건물</h3>${list}<p class="ui-xs ui-muted">재료는 가방과 창고에서 함께 씁니다. 공사는 접속하지 않아도 진행되고, 다 지어지면 계정의 모든 캐릭터에게 효과가 생깁니다.</p>`;
        } else if (tab === 2) {
          shrineSettle(acc, now);
          const here = MAPS[c.mapId], canHere = !TOWNS.includes(c.mapId) && here.spawns.length > 0;
          body = `<p class="ui-sm" style="margin-top:0">사당은 놓인 맵에 있는 캐릭터에게만 효과를 줍니다. 놓여 있는 동안 자라고, 그 맵에 캐릭터가 많을수록 빨리 자랍니다. 지금 <b>${esc(c.name)}</b>은(는) <b>${here.name}</b>에 있습니다${canHere ? '' : '(사냥터에만 놓을 수 있습니다)'}.</p>` + SHRINES.map((d) => {
            const st = acc.shrines.own[d.id], v = (x: number) => Math.round(x * 100) / 100;
            if (!st) {
              const ok = acc.coins >= d.coins && d.mats.every(([m, n]) => haveMat(acc, c, m) >= n);
              const cost = d.mats.map(([m, n]) => `<span class="ui-xs ${haveMat(acc, c, m) >= n ? '' : 'ui-bad'}">${icon(m)}${n}</span>`).join(' ') + ` <span class="ui-xs ${acc.coins >= d.coins ? '' : 'ui-bad'}">${ui('ui_coin', 'tic')}${short(d.coins)}</span>`;
              return `<div class="ui-row line locked">${ui('obj_shrine', 'mi')}<div class="ui-grow"><b>${d.name}</b><div class="ui-sm ui-muted">${ALCH_LABEL[d.eff]} +${v(shrineValue(d, 1))}${d.unit}부터</div><div class="costrow">${cost}</div></div><button class="ui-btn sm primary" data-act="shrine:build:${d.id}" ${ok ? '' : 'disabled'}>짓기</button></div>`;
            }
            const need = shrineNeed(st.lv), max = st.lv >= SHRINE_MAX, onHere = st.map === c.mapId;
            return `<div class="ui-row line ${onHere ? 'sel' : ''}">${ui('obj_shrine', 'mi')}<div class="ui-grow"><b>${d.name}</b> <span class="ui-xs ui-accent">Lv.${st.lv}</span> <span class="ui-xs ${st.map ? 'ui-good' : 'ui-muted'}">${st.map ? MAPS[st.map].name : '창고에 보관 중'}</span>
              <div class="ui-sm ui-good">${ALCH_LABEL[d.eff]} +${v(shrineValue(d, st.lv))}${d.unit}</div>${max ? '' : bar('skill', Math.floor(st.xp), need, `${Math.floor(st.xp)} / ${need} · 시간당 ${shrineRate(acc, st)}`)}</div>
              ${onHere ? `<button class="ui-btn sm" data-act="shrine:pick:${d.id}">거두기</button>` : `<button class="ui-btn sm primary" data-act="shrine:place:${d.id}" ${canHere ? '' : 'disabled'}>여기 놓기</button>`}</div>`;
          }).join('') + '<p class="ui-xs ui-muted">어느 맵에서든 메뉴의 시설 바로가기로 이 창을 열어, 지금 서 있는 맵에 사당을 놓을 수 있습니다.</p>';
        } else {
          const rc = rateUpCost(b), sc = BUILD.slotCost[b.up.slots];
          body = `<div class="ui-row line">${ui('ui_up', 'mi')}<div class="ui-grow"><b>튼튼한 비계</b> <span class="ui-xs ui-accent">${b.up.rate}/${BUILD.rateUpMax}</span><div class="ui-sm ui-muted">건설 속도 +${b.up.rate * BUILD.rateUp * 100}%${b.up.rate < BUILD.rateUpMax ? ` → +${(b.up.rate + 1) * BUILD.rateUp * 100}%` : ''}</div></div>
              <button class="ui-btn sm" data-act="build:rate" ${b.up.rate < BUILD.rateUpMax && acc.coins >= rc ? '' : 'disabled'}>${b.up.rate < BUILD.rateUpMax ? `${ui('ui_coin', 'tic')} ${rc.toLocaleString()}` : '최대'}</button></div>
            <div class="ui-row line">${ui('obj_build', 'mi')}<div class="ui-grow"><b>공사 칸 늘리기</b> <span class="ui-xs ui-accent">${buildSlots(b)}칸</span><div class="ui-sm ui-muted">여러 건물을 동시에 짓습니다(칸마다 같은 속도)</div></div>
              <button class="ui-btn sm" data-act="build:slots" ${sc !== undefined && acc.coins >= sc ? '' : 'disabled'}>${sc !== undefined ? `${ui('ui_coin', 'tic')} ${sc.toLocaleString()}` : '최대'}</button></div>
            <p class="ui-xs ui-muted">건설 레벨은 건물이 완성될 때마다 오르고, 레벨마다 건설 속도가 ${BUILD.ratePerLv * 100}%씩 빨라집니다.</p>`;
        }
        return win('공방 마당', `${head}${tabs(['건물', '작업장', '사당'], tab, tabAct, ['obj_build', 'ui_up', 'obj_shrine'])}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'traps': {
        const tr = c.traps, sk = c.skills.trapping, open = trapSlots(sk.lv), now = Date.now(), need = skillXpToNext(sk.lv);
        const head = `<div class="ui-row alchhead">${ui('obj_traps', 'mi')}<b class="ui-grow">덫 사냥 Lv.<span class="ui-accent">${sk.lv}</span> · ${TRAP_NAMES[tr.tier]} <span class="ui-xs ui-muted">상자 ${openBoxes(c).length}/${TRAP_BOXES.length}</span></b><div style="width:30%">${bar('skill', sk.xp, need, `${sk.xp} / ${need}`)}</div></div>`;
        const mmss = (ms: number) => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}시간 ${m}분` : m ? `${m}분 ${s % 60}초` : `${s}초`; };
        const rows = [0, 1, 2, 3, 4].map((i) => {
          if (i >= open) return `<div class="ui-row line locked">${ui('ui_lock', 'mi')}<span class="ui-grow ui-muted">덫 사냥 Lv.${i * 10}에 열리는 칸</span></div>`;
          const t = tr.slots[i];
          if (!t) return `<div class="ui-row line ${this.trapIdx === i ? 'sel' : ''}">${ui('obj_traps', 'mi')}<span class="ui-grow ui-muted">빈 덫</span><button class="ui-btn sm ${this.trapIdx === i ? 'primary' : ''}" data-act="trappick:${i}">덫 놓기</button></div>`;
          const left = t.end - now, done = left <= 0, total = Math.max(1, t.end - (t.end - left));
          void total;
          return `<div class="ui-row line"><span class="ui-slot">${icon(t.critter)}</span><div class="ui-grow"><b>${ITEMS[t.critter].name} ×${t.n}</b> <span class="ui-xs ui-muted">${TRAP_BOX[t.box ?? 'tb_card']?.name ?? ''} · 경험치 ${t.xp.toLocaleString()}</span>${t.shiny ? ` <span class="ui-xs ui-accent">✦ 빛나는 ${t.shiny}마리</span>` : ''}
            <div class="ui-sm ${done ? 'ui-good' : 'ui-muted'}">${done ? '다 잡혔습니다!' : `${mmss(left)} 남음 · 접속하지 않아도 진행`}</div></div>
            ${done ? `<button class="ui-btn sm primary" data-act="trap:collect:${i}">거두기</button>` : `<button class="ui-btn sm" data-act="trap:cancel:${i}" title="덫을 걷으면 잡은 것은 사라집니다">걷기</button>`}</div>`;
        }).join('');
        let pick = '';
        if (this.trapIdx >= 0 && this.trapIdx < open && !tr.slots[this.trapIdx]) {
          const bx = TRAP_BOX[this.trapBox] && !boxLock(c, TRAP_BOX[this.trapBox]) ? TRAP_BOX[this.trapBox] : TRAP_BOXES[0];
          const boxes = TRAP_BOXES.map((b) => { const l = boxLock(c, b); return `<button class="ui-btn sm ${b.id === bx.id ? 'primary' : ''}" data-act="trapbox:${b.id}" ${l ? 'disabled' : ''} title="${b.desc}${l ? ` (${l})` : ''}">${b.name}<br><span class="ui-xs">${l ?? `수 ×${b.qty} · 경험치 ×${b.xp}${b.shiny > 1 ? ` · ✦×${b.shiny}` : ''}`}</span></button>`; }).join('');
          pick = `<div class="ui-row"><b class="ui-grow">${this.trapIdx + 1}번 덫: 상자를 고르고, 잡을 동물과 시간을 고르세요</b><button class="ui-btn sm" data-act="trappick:${this.trapIdx}">뒤로</button></div>
            <div class="ui-row trapbtns" style="flex-wrap:wrap">${boxes}</div><p class="ui-xs ui-muted">${bx.name}: ${bx.desc}</p>` + CRITTERS.map((cr) => {
            const lock = trapLock(c, cr.id);
            const btns = lock ? `<span class="ui-sm ui-bad">${lock}</span>` : bx.times.map((k) => { const tt = TRAP_TIMES[k], y = trapYield(c, cr.id, k, bx.id); return `<button class="ui-btn sm" data-act="trapset:${cr.id}:${k}" title="${tt.label} 동안 ${y.n}마리 · 경험치 ${y.xp}">${tt.label}<br><span class="ui-xs">${y.n}마리</span></button>`; }).join('');
            const sh = g.acc.shinies?.[cr.id] ?? 0, sb = SHINY_BONUS[cr.id];
            return `<div class="ui-row line ${lock ? 'locked' : ''}"><span class="ui-slot">${icon(cr.id)}</span><div class="ui-grow"><b>${cr.name}</b><div class="ui-xs ui-muted">${MAPS[cr.map].name} · Lv.${cr.lv}${sb ? ` · ✦ ${sh}마리(${ALCH_LABEL[sb.eff]} +${shinyLevel(sh) * sb.per}${sb.unit})` : ''}</div></div><div class="ui-row trapbtns">${btns}</div></div>`;
          }).join('');
        }
        return win(`덫 오두막 <span class="ui-sm ui-muted">${esc(c.name)}</span>`, `${head}<div class="ui-tabpanel">${pick || rows}<p class="ui-xs ui-muted">덫은 캐릭터마다 따로 놓습니다. 상자마다 잡는 수·경험치·빛나는 동물 확률이 달라 목적에 맞게 고릅니다. 덫 꾸러미와 덫 사냥 레벨로 새 상자가 열립니다. 빛나는 동물(✦)은 계정 전체 보너스가 됩니다. 거둔 동물은 가방에, 넘치면 창고에 들어갑니다.</p></div>`);
      }
      case 'post': {
        const acc = g.acc, p = c.post, po = acc.postOff, now = Date.now(), left = po.orders.filter((o) => !o.done).length;
        const head = `<div class="ui-row alchhead">${ui('it_parcel', 'mi')}<b class="ui-grow">배달 포인트 <span class="ui-accent">${p.pts}</span> <span class="ui-xs ui-muted">${esc(c.name)}</span></b><span class="ui-xs ui-muted">오늘 남은 주문 ${left}/${po.orders.length} · 날이 바뀌면 새 주문</span></div>`;
        let body = '';
        if (tab === 0) {
          body = po.orders.map((o, i) => {
            const co = COMPANIES.find((x) => x.id === o.company)!, st = streakNow(acc, o.company, now), r = orderReward(acc, o, now);
            const ok = o.items.every((it) => haveMat(acc, c, it.item) >= it.n);
            const need = o.items.map((it) => { const have = haveMat(acc, c, it.item); return `<span class="ui-row" style="gap:4px"><span class="ui-slot sm">${icon(it.item)}</span><span class="ui-sm ${o.done ? 'ui-muted' : have >= it.n ? 'ui-good' : 'ui-bad'}">${ITEMS[it.item].name} ${Math.min(have, it.n).toLocaleString()}/${it.n.toLocaleString()}</span></span>`; }).join('');
            return `<div class="ui-row line ${o.done ? 'done' : ''}"><div class="ui-grow"><b>${co.name}</b> <span class="ui-xs ui-muted">${co.desc}</span>${st ? ` <span class="ui-xs ui-accent">연속 ${st}일</span>` : ''}<div class="ui-row" style="flex-wrap:wrap;gap:8px">${need}</div></div>
              <span class="ui-sm">${ui('it_parcel', 'tic')} +${r.pts} · ${ui('ui_coin', 'tic')} ${short(r.coins)}</span>
              <button class="ui-btn sm primary" data-act="post:deliver:${i}" ${!o.done && ok ? '' : 'disabled'}>${o.done ? '완료' : '배달'}</button></div>`;
          }).join('') || '<p class="ui-muted">아직 받을 수 있는 주문이 없습니다. 사냥터를 더 열어 보세요.</p>';
          body += `<p class="ui-xs ui-muted">주문은 계정 공용이고, 배달한 캐릭터가 포인트를 받습니다. 같은 회사의 주문을 날마다 이어서 채우면 연속 배달 보너스가 쌓입니다(최대 ${STREAK_MAX}일, 하루 거르면 처음부터). 가방과 창고의 재료를 함께 씁니다.</p>`;
        } else {
          body = BOXES.map((b) => {
            const lv = p.boxes[b.id] ?? 0, max = lv >= b.max, cost = boxCost(lv);
            const effs = b.effs.map((e) => { const v = boxValue(e, Math.max(lv, e.at + 1)), on = lv > e.at; return `<div class="ui-xs ${on ? 'ui-good' : 'ui-muted'}">${ALCH_LABEL[e.eff]} +${(Math.round((on ? boxValue(e, lv) : v) * 100) / 100).toLocaleString()}${e.unit}${on ? '' : ` (${e.at + 1}단계부터)`}</div>`; }).join('');
            return `<div class="ui-row line">${ui('it_parcel', 'mi')}<div class="ui-grow"><b>${b.name}</b> <span class="ui-xs ui-accent">${lv}/${b.max}</span>${effs}</div>
              <button class="ui-btn sm" data-act="post:box:${b.id}" ${!max && p.pts >= cost ? '' : 'disabled'}>${max ? '최대' : `${ui('it_parcel', 'tic')} ${cost}`}</button></div>`;
          }).join('') + '<p class="ui-xs ui-muted">택배 상자는 캐릭터마다 따로 올립니다. 상자마다 효과가 셋이고, 26·101단계에서 둘째·셋째 효과가 열립니다.</p>';
        }
        return win(`우체국 <span class="ui-sm ui-muted">${esc(c.name)}</span>`, `${head}${tabs(['배달 주문', '택배 상자'], tab, tabAct, ['it_parcel', 'it_parcel'])}<div class="ui-tabpanel">${body}</div>`);
      }
      case 'alchemy': {
        const acc = g.acc, a = acc.alch;
        alchSettle(acc, Date.now());
        const mine = a.assign[c.id];
        const where = (sl?: string) => (!sl ? '쉬는 중' : sl.startsWith('c:') ? CAULDRONS.find((x) => `c:${x.id}` === sl)!.name : `${LIQUID_BY[sl.slice(2) as LiquidId].name} 액체`);
        const liqs = LIQUIDS.filter((l) => liquidOpen(acc, l)).map((l) => `<span class="ui-xs">${ui(`liq_${l.id}`, 'tic')}${Math.floor(a.liquids[l.id])}/${liquidCap(a, l)}</span>`).join(' ');
        const head = `<div class="ui-row alchhead">${ui('bub_wise', 'mi')}<b class="ui-grow">연금 Lv.<span class="ui-accent">${c.skills.alchemy.lv}</span> <span class="ui-xs ui-muted">${esc(c.name)} · ${where(mine)}</span></b><span>${liqs}</span></div>`;
        let body = '';
        if (tab === 0) {
          const cid = (CAULDRONS.find((x) => x.id === this.cauldron) ?? CAULDRONS[0]).id, cd = CAULDRONS.find((x) => x.id === cid)!;
          if (!cd.bubbles.some((b) => b.id === this.bubSel)) this.bubSel = cd.bubbles[0].id;
          const pick = CAULDRONS.map((x) => `<button class="ui-btn sm ${x.id === cid ? 'primary' : ''}" data-act="cauld:${x.id}" style="${x.id === cid ? '' : `color:${x.color}`}">${x.name.replace('의 솥', '')} <span class="ui-xs">${a.found[x.id]}/${BUBBLES_PER}</span></button>`).join('');
          const n = a.found[cid], need = brewNeed(n), rate = brewRate(acc, cid), team = acc.characters.filter((x) => a.assign[x.id] === `c:${cid}`);
          const brew = n < BUBBLES_PER ? `<div class="ui-row"><span class="ui-xs ui-grow">끓이는 중: 다음 거품까지 ${bar('xp', Math.floor(a.brew[cid]), need, `${Math.floor(a.brew[cid])} / ${need} · 시간당 ${Math.round(rate)}`)}</span>
            <span class="ui-xs ui-muted">${team.length ? team.map((x) => esc(x.name)).join(', ') : '맡은 캐릭터 없음'}</span><button class="ui-btn sm ${mine === `c:${cid}` ? 'primary' : ''}" data-act="alch:assign:c:${cid}">${mine === `c:${cid}` ? '그만 끓이기' : `${esc(c.name)} 맡기기`}</button></div>` : '<p class="ui-xs ui-good">이 솥의 거품을 모두 발견했습니다.</p>';
          const cells = cd.bubbles.map((b, i) => {
            const lv = bubbleLv(a, b.id), found = i < n;
            return found ? `<button class="tal ${b.id === this.bubSel ? 'sel' : ''} ${lv ? '' : 'zero'}" data-act="bsel:${b.id}" aria-label="${b.name} 레벨 ${lv}">${ui(`bub_${cd.id}`, 'tic')}${b.big ? '<i class="onbar"></i>' : ''}<span class="lvp">LV ${lv}</span></button>`
              : `<span class="tal zero locked" aria-label="발견하지 못한 거품">${ui('ui_lock', 'tic')}</span>`;
          }).join('');
          const b = BUBBLES[this.bubSel!], lv = bubbleLv(a, b.id), cost = bubbleCost(b, lv), found = bubbleFound(a, b.id);
          const have = haveMat(acc, c, cost.item), liqHave = a.liquids[cost.liq], fmt = (v: number) => `${ALCH_LABEL[b.eff]} +${(Math.round(v * 10) / 10).toLocaleString()}${b.unit}`;
          const myBig = a.big[c.id] ?? [];
          const detail = `<div class="ui-row">${ui(`bub_${cd.id}`, 'bigic')}<div><b>${b.name}</b><div class="ui-xs ui-muted">${cd.name} · ${b.big ? '큰 거품(장착한 캐릭터만)' : '계정 공용'}</div><div class="ui-accent">LV ${lv}</div></div></div>
            <div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${fmt(bubbleValue(b, Math.max(1, lv)))}${lv ? '' : ' (1레벨)'}</div>
            <div class="ui-xs ui-muted">다음: ${fmt(bubbleValue(b, lv + 1))} · 최대 ${b.max}${b.unit}에 가까워집니다</div>
            <div class="costrow"><span>${icon(cost.item)}</span><span class="ui-grow ui-sm">${ITEMS[cost.item].name}</span><b class="ui-sm ${have >= cost.n ? 'ui-good' : 'ui-bad'}">${have.toLocaleString()} / ${cost.n.toLocaleString()}</b></div>
            <div class="costrow"><span>${ui(`liq_${cost.liq}`, 'mi')}</span><span class="ui-grow ui-sm">${LIQUID_BY[cost.liq].name}</span><b class="ui-sm ${liqHave >= cost.liquid ? 'ui-good' : 'ui-bad'}">${Math.floor(liqHave)} / ${cost.liquid}</b></div>
            <button class="ui-btn primary iconbtn block" data-act="alch:bubble:${b.id}" ${found && have >= cost.n && liqHave >= cost.liquid && lv < BUBBLE_MAX_LV ? '' : 'disabled'}>${ui('ui_up', 'tic')} 올리기</button>
            ${b.big ? `<button class="ui-btn iconbtn block ${myBig.includes(b.id) ? 'success' : ''}" data-act="alch:big:${b.id}" ${lv ? '' : 'disabled'}>${myBig.includes(b.id) ? '장착 해제' : `${esc(c.name)}에게 장착`} <span class="ui-xs">${myBig.length}/${bigSlots(c)}</span></button>` : ''}`;
          body = `<div class="ui-row" style="flex-wrap:wrap;gap:4px">${pick}</div>${brew}<div class="split"><div class="talgrid">${cells}</div><div class="ui-detail">${detail}</div></div>`;
        } else if (tab === 1) {
          body = LIQUIDS.map((l) => {
            const open = liquidOpen(acc, l), team = acc.characters.filter((x) => a.assign[x.id] === `l:${l.id}`);
            if (!open) return `<div class="ui-row line locked">${ui('ui_lock', 'mi')}<div class="ui-grow"><b>${l.name}</b><div class="ui-xs ui-muted">${l.w}월드에 가면 열립니다</div></div></div>`;
            return `<div class="ui-row line">${ui(`liq_${l.id}`, 'mi')}<div class="ui-grow"><b>${l.name}</b> <span class="ui-xs ui-muted">시간당 ${liquidRate(a, l, acc).toFixed(1)} · ${team.length ? team.map((x) => esc(x.name)).join(', ') : '맡은 캐릭터 없음'}</span>${bar('xp', Math.floor(a.liquids[l.id]), liquidCap(a, l), `${Math.floor(a.liquids[l.id])} / ${liquidCap(a, l)}`)}</div>
              <button class="ui-btn sm ${mine === `l:${l.id}` ? 'primary' : ''}" data-act="alch:assign:l:${l.id}">${mine === `l:${l.id}` ? '그만두기' : `${esc(c.name)} 맡기기`}</button></div>`;
          }).join('') + (['rate', 'cap'] as LiquidUp[]).map((k) => {
            const lv = a.up[k], max = lv >= LIQUID.max, cost = liquidUpCost(a, k);
            const label = k === 'rate' ? '끓이는 불 (모든 액체 생산 +30%씩)' : '큰 솥 (모든 액체 한도 +50%씩)';
            return `<div class="ui-row line"><div class="ui-grow"><b>${label}</b> <span class="ui-xs ui-accent">${lv}/${LIQUID.max}</span></div>
              <button class="ui-btn sm iconbtn" data-act="alch:liquid:${k}" ${!max && acc.coins >= cost ? '' : 'disabled'}>${max ? '최대' : `${ui('ui_coin', 'tic')} ${short(cost)}`}</button></div>`;
          }).join('') + '<p class="ui-xs ui-muted">액체는 시간에 따라 쌓이고, 캐릭터를 맡기면 그 캐릭터의 연금 레벨만큼 더 빨리 찹니다. 거품마다 쓰는 액체가 다릅니다.</p>';
        } else if (tab === 2) {
          body = VIALS.map((v) => {
            const lv = a.vials[v.id] ?? 0, n = VIAL_COST[lv], have = haveMat(acc, c, v.item);
            return `<div class="ui-row line">${ui(`vial_${v.id}`, 'mi')}<div class="ui-grow"><b>${lv ? v.name : '??? 약병'}</b> <span class="ui-xs ui-accent">${lv}/${VIAL_MAX}</span>
              <div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${ALCH_LABEL[v.eff]} +${vialValue(v, Math.max(1, lv))}${v.unit}${lv ? '' : ` (발견하면) · 주사위 성공 ${Math.round(VIAL_FIND * 100)}%`}</div></div>
              ${lv < VIAL_MAX ? tile(iconUrl(ITEM_ICON[v.item]), `${have}/${n}`, `${ITEMS[v.item].name} ${have}/${n}`, '', have >= n ? 'ok' : 'bad') : ''}
              <button class="ui-btn sm" data-act="alch:vial:${v.id}" ${lv < VIAL_MAX && have >= n ? '' : 'disabled'}>${lv >= VIAL_MAX ? '최대' : lv ? '붓기' : '주사위'}</button></div>`;
          }).join('') + '<p class="ui-xs ui-muted">처음엔 재료를 넣고 주사위를 굴려 약병을 발견해야 합니다(실패하면 재료만 씁니다). 발견한 뒤에는 재료를 부어 단계를 올립니다.</p>';
        } else {
          body = acc.characters.map((x) => `<div class="ui-row line ${x.id === c.id ? 'sel' : ''}"><img class="px" src="${portraitUrl(x.look)}" alt="" style="height:2em"><div class="ui-grow"><b>${esc(x.name)}</b> <span class="ui-xs ui-muted">연금 Lv.${x.skills.alchemy?.lv ?? 1} · 일하는 힘 ×${workPower(x).toFixed(2)}</span><div class="ui-xs ${a.assign[x.id] ? 'ui-good' : 'ui-muted'}">${where(a.assign[x.id])}${(a.big[x.id] ?? []).length ? ` · 큰 거품 ${(a.big[x.id] ?? []).map((id) => BUBBLES[id].name).join(', ')}` : ''}</div></div></div>`).join('')
            + '<p class="ui-xs ui-muted">캐릭터는 어디에 있든 솥이나 액체를 맡을 수 있습니다(한 곳만). 맡은 캐릭터는 시간마다 연금 경험치를 얻고, 연금 레벨이 오를수록 더 잘 끓입니다. 큰 거품 칸은 연금 Lv.30마다 하나씩 늘어납니다. 그 캐릭터로 접속해 맡기세요.</p>';
        }
        return win('연금 솥 <span class="ui-sm ui-muted">계정 공용</span>', `${head}${tabs(['거품', '액체', '약병', '배치'], tab, tabAct, ['bub_power', 'liq_water', 'vial_v_star', 'ui_family'])}<div class="ui-tabpanel">${body}</div>`);
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
        return win('방치 정보', `<p class="ui-xs ui-muted">이 캐릭터를 두고 떠나면 아래 속도로 계속 성장합니다(최대 1년). AUTO 여부와는 상관없습니다.</p>${body}
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
        : `<span class="ui-xs ui-muted">아직 이 우표가 없습니다. ${SHOP.some((e) => e.item === s.id) ? '잡화점에서 팝니다.' : `${s.w ? `${s.w}월드 ` : ''}몬스터가 드물게 떨어뜨립니다.`}</span>`;
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
      const st = statueLevel(c.statues[s.id] ?? 0), n = countItem(c, s.item), gold = acc.goldStatues?.includes(s.id), eff = statueLv(acc, c, s.id);
      const val = Math.round(eff * s.per * 10) / 10, gn = countItem(c, `g${s.item}`);
      return `<div class="ui-row line"><span class="ui-slot">${icon(gold ? `g${s.item}` : s.item)}</span><div class="ui-grow"><b>${gold ? '<span class="ui-accent">황금</span> ' : ''}${s.name}</b> <span class="ui-accent">Lv.${st.lv}</span>${gold && eff > st.lv ? ` <span class="ui-xs ui-good">(계정 최고 Lv.${eff} 적용)</span>` : ''}
          ${!gold && gn ? `<button class="ui-btn sm success" data-act="use:g${s.item}">황금으로 만들기</button>` : ''}
          <span class="ui-sm ${eff ? 'ui-good' : 'ui-muted'}">${s.label} +${val}${s.unit} (다음 +${Math.round((st.lv + 1) * s.per * 10) / 10}${s.unit})</span>
          ${bar('skill', st.into, st.need, `${st.into} / ${st.need}`)}</div>
        <button class="ui-btn ${n ? 'primary' : ''} sm" data-act="statue:${s.id}" ${n ? '' : 'disabled'}>바치기 ${n}</button></div>`;
    }).join('') + '<p class="ui-xs ui-muted">조각은 사냥하며 드물게 얻습니다. 가방에 있는 그 조각을 모두 바칩니다. 드물게 나타나는 수정 몬스터는 조각을 잔뜩 주고, 아주 드물게 황금 조각을 줍니다. 황금 석상은 계정에서 가장 높은 레벨이 모든 캐릭터에게 적용됩니다.</p>';
  }

  private cardExtrasHtml(c: Character): string {
    const acc = this.game.acc;
    const sets = CARD_SETS.map((s) => {
      const stars = setStars(acc, s), t = setTier(acc, s), on = c.cardSet === s.id;
      const next = s.tiers[t];
      return `<div class="ui-row line"><div class="ui-grow"><b>${s.name}</b> <span class="ui-accent">${t}단계</span>
        <div class="ui-sm ${on && t ? 'ui-good' : 'ui-muted'}">${t ? s.label.replace(/\+%(p?)/, `+${s.v[t - 1]}%$1`) : '세트 효과 없음'}${on ? ' (켜짐)' : ''}</div>
        <div class="ui-xs ui-muted">세트 카드 별 ${stars}${next ? ` / 다음 단계 ${next}` : ' · 최고 단계'}</div></div>
        <button class="ui-btn sm ${on ? '' : 'primary'}" data-act="cset:${on ? '' : s.id}" ${on || t ? '' : 'disabled title="카드를 더 모으면 켤 수 있습니다"'}>${on ? '끄기' : '켜기'}</button></div>`;
    }).join('');
    const presets = c.level >= CARD_PRESET_LV
      ? `<div class="ui-row"><span class="ui-sm ui-grow">카드 프리셋</span>${c.cardPresets.map((_, i) => `<button class="ui-btn sm ${i === c.cardPreset ? 'primary' : ''}" data-act="cpre:${i}">${i + 1}</button>`).join('')}</div>`
      : `<p class="ui-xs ui-muted">Lv.${CARD_PRESET_LV}부터 카드 프리셋 2개를 쓸 수 있습니다.</p>`;
    return `<h3 style="margin-top:0">카드 세트</h3>${sets}${presets}`;
  }

  private starsHtml(c: Character): string {
    const acc = this.game.acc;
    if (c.level < SIGN_LV) return `<p class="ui-muted">Lv.${SIGN_LV}부터 별을 볼 수 있습니다. 맵 곳곳에 숨은 별 지도를 찾아 별 포인트를 모으고, 별자리를 열어 캐릭터마다 하나씩 정렬합니다.</p>`;
    const stars = STARS.filter((s) => worldOf(s.map) <= (c.maxWorld ?? 1)).map((s) => {
      const found = !!acc.stars[s.id], here = c.mapId === s.map, ok = here && s.check(acc, c);
      return `<div class="ui-row line"><div class="ui-grow"><b>${found || here ? MAPS[s.map].name : '???'}</b><div class="ui-sm ${found ? 'ui-good' : 'ui-muted'}">${found || here ? s.desc : '그 맵에 가면 보입니다'}</div></div>
        ${found ? '<span class="ui-accent">★</span>' : `<button class="ui-btn sm ${ok ? 'success' : ''}" data-act="star:${s.id}" ${ok ? '' : 'disabled'}>찾기</button>`}</div>`;
    }).join('');
    const slots = signSlots(c), mw = c.maxWorld ?? 1;
    const signs = SIGNS.filter((s) => s.w <= mw).map((s) => {
      const open = acc.signs.includes(s.id), on = c.aligned.includes(s.id), birth = c.birth === s.id;
      const btn = on ? `<button class="ui-btn sm" data-act="sign:${s.id}">해제</button>` : open ? `<button class="ui-btn sm primary" data-act="sign:${s.id}" ${c.aligned.length < slots ? '' : 'disabled'}>정렬</button>`
        : `<button class="ui-btn sm" data-act="signopen:${s.id}" ${acc.starPoints >= s.cost ? '' : 'disabled'}>★${s.cost} 열기</button>`;
      return `<div class="ui-row line"><div class="ui-grow"><b>${s.name}</b> <span class="ui-xs ui-muted">${s.w}월드</span>${on ? ' <span class="ui-good ui-xs">정렬 중</span>' : ''}${birth ? ' <span class="ui-accent ui-xs">탄생 별자리</span>' : ''}<div class="ui-sm ${open || birth ? '' : 'ui-muted'}">${s.label}</div></div>${btn}</div>`;
    }).join('') + (mw < 4 ? '<p class="ui-xs ui-muted">다음 월드에 가면 그 하늘의 별자리와 별자리 칸이 하나 더 열립니다.</p>' : '');
    return `<h3 style="margin-top:0">별 지도 <span class="ui-accent">${Object.keys(acc.stars).length}/${STARS.filter((s) => worldOf(s.map) <= (c.maxWorld ?? 1)).length}</span> · 별 포인트 <span class="ui-accent">${acc.starPoints}</span></h3>${stars}<h3>별자리 <span class="ui-xs ui-muted">정렬 ${c.aligned.length}/${slots}칸 · 캐릭터마다</span></h3>${signs}`;
  }

  private achieveHtml(): string {
    const acc = this.game.acc;
    return ACHIEVEMENTS.map((d) => {
      const got = !!acc.achievements[d.id], ready = achieveReady(acc, d.id), [have, need] = achieveProgress(acc, d.id);
      return `<div class="ui-row line ${got || ready ? '' : 'ui-muted'}"><span class="ui-slot sm ${got ? 'r3' : ''}">${ui('ui_trophy', 'mi')}</span><div class="ui-grow"><b>${d.name}</b> ${got ? '' : `<span class="ui-xs ui-accent">${Math.min(have, need).toLocaleString()} / ${need.toLocaleString()}</span>`}<div class="ui-sm">${d.desc}</div><div class="ui-xs ${got ? 'ui-good' : 'ui-muted'}">보상: ${d.label}</div></div>
        ${got ? '<span class="ui-good">✓</span>' : `<button class="ui-btn sm ${ready ? 'success' : ''}" data-act="ach:${d.id}" ${ready ? '' : 'disabled'}>받기</button>`}</div>`;
    }).join('');
  }

  private deathHtml(): string {
    const acc = this.game.acc, c = this.game.char!, w3 = acc.characters.some((x) => (x.maxWorld ?? 1) >= 3);
    const rows = deathMaps().filter((id) => mapUnlocked(c, id) || deathKills(acc, id) > 0).map((id) => {
      const n = deathKills(acc, id), r = deathRank(n), next = DEATH_TIERS[r], mob = MAPS[id].spawns[0]?.monster;
      return `<div class="ui-row line"><span class="ui-slot sm">${mob ? `<img class="px" src="${iconUrl(`mob_${MONSTERS[mob].art ?? mob}`)}" alt="">` : ''}</span><div class="ui-grow"><b>${MAPS[id].name}</b> <span class="ui-xs ui-accent">${'★'.repeat(r)}${'☆'.repeat(DEATH_TIERS.length - r)}</span>
        ${next ? bar('xp', n, next, `${short(n)} / ${short(next)}`) : '<div class="ui-xs ui-good">최고 단계</div>'}</div>${w3 ? `<span class="ui-xs ${r ? 'ui-good' : 'ui-muted'}">멀티킬 ×${1 + r}</span>` : ''}</div>`;
    }).join('');
    return `<p class="ui-sm" style="margin-top:0">맵마다 계정 전체 처치 수를 모아 단계를 올립니다. 모든 맵의 단계 합마다 공격력 +0.5% (지금 <b class="ui-good">+${deathBonus(acc)}%</b>).${w3 ? ' 3월드에 간 계정은 멀티킬이 열려, 한 번 잡을 때 그 맵 처치 수가 단계만큼 더 오릅니다(포탈 조건·처치 기록이 빨라짐).' : ' 3월드에 가면 멀티킬이 열립니다.'}</p>${rows}`;
  }

  private familyHtml(): string {
    const acc = this.game.acc, best = familyBest(acc.characters), lv = familyLevel(acc);
    const unit = (e: string) => (e === 'afk' ? '%p' : ['hp', 'str', 'agi', 'wis', 'luk', 'def', 'acc'].includes(e) ? '' : '%');
    const rows = (Object.keys(FAMILY) as ClassId[]).map((k) => {
      const v = familyValue(k, best[k]);
      return `<div class="ui-row line"><b class="ui-grow">${CLASSES[k].name} <span class="ui-xs ui-muted">${best[k] ? `가족 Lv.${best[k]}` : `${classTier(k) ? `${FAMILY_MIN[classTier(k)]}레벨부터` : ''}`}</span></b><span class="ui-sm ${v ? 'ui-good' : 'ui-muted'}">${FAMILY[k].label} +${(Math.round(v * 10) / 10)}${unit(FAMILY[k].eff)}</span></div>`;
    }).join('');
    const next = FAMILY_SLOTS.find((n) => lv < n);
    return `<p class="ui-sm">캐릭터가 거쳐 온 모든 직업이 계정 전체에 보너스를 줍니다. 그 단계가 열리는 레벨(1차 9 · 2차 29 · 3차 69)부터 셉니다.</p>${rows}
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
    const mw = Math.max(1, ...acc.characters.map((x) => x.maxWorld ?? 1));
    return BRIBES.map((b, i) => {
      const got = i < acc.bribes, next = i === acc.bribes, open = b.set <= mw;
      const head = i === 0 || BRIBES[i - 1].set !== b.set ? `<h3>${b.set}월드 세트${open ? '' : ' <span class="ui-xs ui-muted">(그 월드에 가면 열림)</span>'}</h3>` : '';
      return `${head}<div class="ui-row line ${got || (next && open) ? '' : 'ui-muted'}"><div class="ui-grow"><b>${(next && open) || got ? b.name : '???'}</b><div class="ui-sm ${got ? 'ui-good' : ''}">${(next && open) || got ? b.desc : open ? '앞의 계약을 맺으면 열립니다' : `${b.set}월드에 가면 열립니다`}</div></div>
        ${got ? '<span class="ui-good">✓</span>' : next && open ? `<button class="ui-btn primary sm" data-act="bribe" ${acc.coins >= b.price ? '' : 'disabled'}>${icon('coin')} ${short(b.price)}</button>` : ''}</div>`;
    }).join('') + '<p class="ui-xs ui-muted">후원 계약은 한 번 맺으면 계정 전체에 계속 효과가 있습니다. 월드마다 한 세트가 있고, 차례대로 맺을 수 있습니다.</p>';
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
    // 능력치 이름을 누르면 오른쪽에 자세한 설명(지금 값으로 계산한 효과)
    const stats = (Object.keys(STAT_NAMES) as StatKey[]).map((k) => `<div class="ui-row line"><button class="stat-name stat-pick ${this.statSel === k ? 'on' : ''}" data-act="statinfo:${k}" aria-pressed="${this.statSel === k}">${STAT_NAMES[k]} <span class="ui-xs ui-muted">ⓘ</span></button><span class="ui-accent stat-val ui-grow">${d[k]}</span>
      <button class="ui-btn sm" data-act="stat:${k}" aria-label="${STAT_NAMES[k]} 올리기" ${c.statPoints ? '' : 'disabled'}>＋</button></div>`).join('');
    const sel = this.statSel;
    const info = sel ? `<div class="statinfo"><div class="ui-row"><b class="ui-grow">${STAT_NAMES[sel]} <span class="ui-accent">${d[sel]}</span></b><button class="ui-btn sm" data-act="statinfo:" aria-label="닫기">✕</button></div>
      <ul>${statInfo(sel, d[sel], c.cls).map((l) => `<li>${l}</li>`).join('')}</ul></div>` : '';
    const skills = (Object.keys(SKILL_NAMES) as SkillKey[]).map((k) => {
      const s = c.skills[k], need = skillXpToNext(s.lv);
      return `<div class="ui-row line"><b class="stat-name">${SKILL_NAMES[k]}</b><span class="ui-accent stat-val">${s.lv}</span><div class="ui-grow">${bar('skill', s.xp, need, `${s.xp} / ${need}`)}</div></div>`;
    }).join('');
    return `<div class="split"><div><div class="ui-row"><span class="ui-grow">남은 포인트</span><b class="ui-accent ui-lg">${c.statPoints}</b></div>${stats}<h3>기술</h3>${skills}</div>
      <div class="ui-detail">${info || '<p class="ui-xs ui-muted" style="margin:0">능력치 이름을 누르면 무엇을 올려 주는지 자세히 볼 수 있습니다.</p>'}<h3>세부 능력치</h3><div class="ui-kv">
        <span>공격력</span><span>${Math.round(d.dmg * 0.8)}~${Math.round(d.dmg * 1.2)}</span><span>최대 체력</span><span>${d.maxHp}</span>
        <span>최대 마나</span><span>${d.maxMp}</span><span>명중</span><span>${d.acc}</span>
        <span>방어력</span><span>${d.def.toFixed(1)}</span><span>공격 속도</span><span>${(1 / d.atkInterval).toFixed(2)}/초</span>
        <span>치명타</span><span>${(d.crit * 100).toFixed(1)}% · ×${d.critMult.toFixed(2)}</span><span>이동 속도</span><span>${Math.round(d.speed)}</span>
        <span>보스 피해</span><span>×${d.bossMult.toFixed(2)}</span><span>코인 배율</span><span>×${d.coinMult.toFixed(2)}</span>
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
  /** 별빛 특성: 직업과 상관없는 공용 탭. 포인트는 레벨 2마다 1 + 업적마다 1 */
  private starTalHtml(c: Character): string {
    const pts = starTalPoints(this.game.acc, c);
    if (!STAR_TAL[this.starSel ?? '']) this.starSel = STAR_TALS[0].id;
    const tiles = STAR_TALS.map((t) => {
      const lv = c.starTal[t.id] ?? 0;
      return `<button class="tal ${t.id === this.starSel ? 'sel' : ''} ${lv ? '' : 'zero'}" data-act="ssel:${t.id}" aria-label="${t.name} 레벨 ${lv}">${ui(t.icon, 'tic')}<span class="lvp">${lv >= t.max ? 'MAX' : `LV ${lv}`}</span></button>`;
    }).join('');
    const t = STAR_TAL[this.starSel!], lv = c.starTal[t.id] ?? 0;
    const detail = `<div class="ui-row">${ui(t.icon, 'bigic')}<div><b>${t.name}</b><div class="ui-xs ui-muted">별빛 특성 · 패시브</div><div class="ui-accent">LV ${lv} / ${t.max}</div></div></div>
      <div class="ui-sm ${lv ? 'ui-good' : 'ui-muted'}">${t.desc(Math.max(1, lv))}</div>
      ${lv < t.max ? `<div class="ui-xs ui-muted">다음: ${t.desc(lv + 1)}</div>` : ''}
      <button class="ui-btn primary iconbtn block" data-act="startal:${t.id}" ${pts > 0 && lv < t.max ? '' : 'disabled'}>${ui('ui_up', 'tic')} 올리기</button>
      <span class="ui-xs ui-muted">별빛 포인트 <b class="ui-accent">${pts}</b> — 레벨 2마다 1, 업적을 받을 때마다 1씩 늘어납니다. 직업이 바뀌어도 그대로입니다.</span>`;
    return `<div class="split"><div class="talgrid">${tiles}</div><div class="ui-detail">${detail}</div></div>`;
  }

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
        <div class="talbtns"><button class="ui-btn primary iconbtn block" data-act="talent:${t.id}" ${tabFree(c, talentTab(t)) > 0 && lv < t.max ? '' : 'disabled'}>${ui('ui_up', 'tic')} 올리기</button>
        ${t.active ? `<button class="ui-btn iconbtn block ${this.assigning === t.id ? 'success' : ''}" data-act="quick:${t.id}" ${lv ? '' : 'disabled'}>${ui('ui_assign', 'tic')} ${this.assigning === t.id ? '지정 취소' : '퀵슬롯에 지정하기'}</button>` : ''}</div>
        ${t.active && !lv ? '<span class="ui-xs ui-muted">1레벨 이상 올리면 퀵슬롯에 지정할 수 있습니다.</span>' : ''}
        ${t.active && lv && this.assigning === t.id ? `<div class="quickhint">${ui('ui_assign', 'tic')} 아래 깜빡이는 퀵슬롯 칸을 누르세요</div>` : ''}`;
    }
    return `<div class="split"><div class="talgrid">${tiles}</div><div class="ui-detail">${detail}</div></div>`;
  }

  /** 퀵슬롯 고르기: 공격 바 장을 고르고 칸을 누르면 그 칸에 놓는다(이미 있으면 그 칸에서 뺀다) */
  private quickPickHtml(c: Character, id: string): string {
    const page = Math.min(this.quickPage, c.attackBars.length - 1), bar = c.attackBars[page];
    const pages = c.attackBars.map((_, i) => `<button class="ui-btn sm ${i === page ? 'primary' : ''}" data-act="qpage:${i}">${i + 1}장</button>`).join('');
    const slots = bar.map((sid, i) => `<button class="ui-slot sm qslot ${sid === id ? 'r3' : ''}" data-act="qset:${i}" aria-label="${i + 1}번 칸${sid ? `: ${TALENT[sid].name}` : ' 비어 있음'}">${sid ? ui(`tl_${sid}`, 'mi') : '<span class="empty-plus">+</span>'}<span class="keyno">${i + 1}</span></button>`).join('');
    return `<div class="quickpick"><div class="ui-row"><span class="ui-xs ui-grow">놓을 칸을 누르세요 (자동은 왼쪽 칸부터 씁니다)</span>${pages}</div><div class="qline">${slots}</div>
      ${bar.includes(id) ? `<button class="ui-btn sm" data-act="qclear">이 장에서 빼기</button>` : ''}</div>`;
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
    return `<button class="ui-menubtn ${c.auto ? 'on' : ''}" data-act="auto" aria-pressed="${c.auto}" aria-label="자동">${ui('ui_auto', 'mi')}<span>자동</span></button>
      <button class="ui-menubtn on" data-act="atk" aria-label="메뉴로">${ui('ui_attacks', 'mi')}<span>${this.assigning ? '완료' : '공격'}</span></button>
      <button class="ui-menubtn page" data-act="bpage" aria-label="공격 바 넘기기">${ui('ui_arrow', 'mi rot')}<span>${page + 1}/${c.attackBars.length}</span></button>${slots}`;
  }

  /** 공격 바 칸: 놓는 중이면 그 칸에 놓고, 아니면 시전 */
  private pressSlot(i: number) {
    const c = this.game.char, w = this.game.world;
    if (!c || !w || i < 0 || i >= ATTACK_SLOTS) return;
    if (this.assigning) {
      const id = this.assigning, r = this.game.act({ t: 'barSet', bar: c.attackPage, slot: i, id });
      if (!r.ok) this.toast(r.err ?? '놓을 수 없습니다');
      else this.toast(`${TALENT[id].name} → 퀵슬롯 ${c.attackPage + 1}장 ${i + 1}번 칸`, `tl_${id}`);
      this.assigning = null;
      if (this.drag === null && this.panel === 'char') this.attackMode = this.assignPrev;
    } else {
      const id = c.attackBars[c.attackPage][i];
      if (!id) { this.notice('빈 칸입니다. 특성 창에서 공격 특성을 이 칸으로 끌어다 놓으세요'); return; }
      if (!w.useSkill(id)) this.toast(c.mp < (TALENT[id].active?.mana ?? 0) ? '마나가 부족합니다' : '아직 쓸 수 없습니다');
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

  /** 목차 > 참조: 시설 바로가기 + 창고·캐릭터 현황 */
  private quickRefHtml(): string {
    const g = this.game, acc = g.acc;
    const store = acc.storage.map((s) => `<div class="ui-slot" aria-label="${ITEMS[s.id].name} ${s.qty}개">${icon(s.id)}<span class="qty">${s.qty.toLocaleString()}</span></div>`).join('') || '<span class="ui-sm ui-muted">비어 있음</span>';
    const chars = acc.characters.map((ch) => {
      const busy = ch.anvil.slots.filter((sl) => sl.prod).map((sl) => `${icon(sl.prod!)}${sl.stored}/${anvilCap(ch)}`).join(' ');
      const act = ch.activity.k === 'gather' ? `${NODES[ch.activity.node].name} 채집` : MAPS[ch.mapId].spawns.length ? '사냥' : '휴식';
      return `<div class="ui-row line"><img class="px qface" src="${portraitUrl(ch.look)}" alt=""><div class="ui-grow"><b>${esc(ch.name)}</b> <span class="ui-xs ui-accent">Lv.${ch.level} ${CLASSES[ch.cls].name}</span>
        <div class="ui-xs ui-muted">${MAPS[ch.mapId].name} · ${act}</div></div><span class="ui-xs qanvil">${busy}</span></div>`;
    }).join('');
    // 시설 바로가기: 찾아낸(그 맵이 열린) 시설은 어디서나 연다
    const c = g.char!;
    const kinds: FacilityKind[] = ['anvil', 'forge', 'stamps', 'tasks', 'statues', 'pets', 'owl', 'games', 'alchemy', 'post', 'traps', 'build', 'shrine', 'kitchen', 'nest', 'lab'];
    const where = (k: FacilityKind) => Object.values(MAPS).find((m) => m.facilities.some((f) => f.kind === k));
    const refs = kinds.map((k) => {
      const m = where(k);
      if (!m) return '';
      const known = mapUnlocked(c, m.id) && (k !== 'owl' || acc.owl.t > 0) && (k !== 'alchemy' || acc.alch.t > 0) && (k !== 'post' || (c.maxWorld ?? 1) >= 2) && (k !== 'traps' || (c.maxWorld ?? 1) >= 3) && (k !== 'build' || acc.build.t > 0) && (k !== 'shrine' || (c.maxWorld ?? 1) >= 3) && ((k !== 'kitchen' && k !== 'nest' && k !== 'lab') || (c.maxWorld ?? 1) >= 4);
      const tex = k === 'anvil' ? 'obj_craft' : `obj_${k}`;
      return known
        ? `<button class="refbtn" data-act="ref:${k}"><img class="px" src="${iconUrl(tex)}" alt=""><b>${FACILITY_NAMES[k]}</b><span class="ui-xs ui-muted">${m.name}</span></button>`
        : `<div class="refbtn locked" aria-label="아직 찾지 못한 시설">${ui('ui_lock', 'mi')}<b>???</b><span class="ui-xs ui-muted">${mapUnlocked(c, m.id) ? '찾아가 보세요' : '아직 못 간 곳'}</span></div>`;
    }).join('') + `<button class="refbtn" data-act="ref:afkinfo">${ui('ui_afk', 'mi')}<b>방치 정보</b><span class="ui-xs ui-muted">지금 맵</span></button>`;
    return `<p class="ui-xs ui-muted" style="margin-top:0">한 번 찾아간 시설은 여기서 어디서나 열 수 있습니다.</p><div class="refgrid">${refs}</div>
      <h3>${ui('ui_quick', 'tic')} 창고 ${acc.storage.length}/${storageSize(acc)} <span class="ui-xs ui-muted">(보기만)</span></h3><div class="ui-grid">${store}</div><h3>${ui('ui_swap', 'tic')} 캐릭터</h3>${chars}`;
  }

  // ───────── 입력 ─────────  // ───────── 입력 ─────────
  /** 길게 눌러 연속 제작: 0.45초 뒤부터 0.14초마다 하나씩, 못 만들게 되면 멈춘다 */
  private hold: { timer: number; made: number; idx: number } | null = null;
  private holdUsed = false;
  private startHold(idx: number) {
    this.stopHold();
    this.holdUsed = false;
    const h = { timer: 0, made: 0, idx };
    const step = () => {
      const r = this.game.act({ t: 'craft', idx });
      if (!r.ok) { this.stopHold(); return; }
      h.made++; this.holdUsed = true;
      this.audio?.play('craft');
      this.refresh();
      h.timer = window.setTimeout(step, 140);
    };
    h.timer = window.setTimeout(step, 450);
    this.hold = h;
  }
  private stopHold() {
    const h = this.hold;
    if (!h) return;
    clearTimeout(h.timer);
    this.hold = null;
    if (h.made) this.toast(`${ITEMS[RECIPES[h.idx].item].name} ${h.made}개 연속 제작!`, RECIPES[h.idx].item);
  }

  private onClick(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    // 길게 눌러 이미 만들었으면 손을 뗄 때의 한 번은 건너뛴다
    if (this.holdUsed && el?.dataset.hold !== undefined) { this.holdUsed = false; return; }
    if (!el) {
      if ((e.target as HTMLElement).id === 'modal' && this.panel !== 'afk') { this.panel = null; this.refresh(); }
      return;
    }
    const [act, a, b, x3] = el.dataset.act!.split(':');
    this.audio?.play('click');
    const g = this.game, c = g.char;
    const fail = (msg: string | null) => { if (msg) { this.notice(msg); this.audio?.play('fail'); } };
    if (act !== 'sell') this.sellArm = null;
    switch (act) {
      case 'delask': this.delIdx = +a; break;
      case 'delcancel': this.delIdx = null; break;
      case 'delgo': {
        const idx = this.delIdx, name = (document.getElementById('delname') as HTMLInputElement | null)?.value ?? '';
        if (idx === null) break;
        g.deleteChar(idx, name).then((err) => { if (err) this.toast(err); else { this.toast('캐릭터를 삭제했습니다'); this.delIdx = null; } this.refresh(true); });
        break;
      }
      case 'newChar': this.creating = true; this.draft = this.randomDraft(); break;
      case 'cancelCreate': this.creating = false; break;
      case 'hair': this.draft.look.hair = (this.draft.look.hair + +a + HAIR_STYLES) % HAIR_STYLES; break;
      case 'look': this.draft.look[a as 'hairColor' | 'skin' | 'outfit'] = b; break;
      case 'birth': this.draft.sign = a; break;
      case 'create': {
        g.create(this.draft.name || '모험가', { ...this.draft.look }, this.draft.sign).then((made) => {
          if (made) { this.creating = false; g.select(g.acc.characters.length - 1); }
          this.refresh(true);
        });
        break;
      }
      case 'select': g.select(+a); break;
      case 'chars': this.panel = null; g.leave(); break;
      // 같은 메뉴 버튼을 다시 누르면 닫힌다
      case 'open': this.refBack = false; if (this.panel === a) this.panel = null; else this.open(a as Panel); break;
      case 'ref': this.refBack = true; this.open(a as Panel); if (a === 'post') g.act({ t: 'post', op: 'refresh' }); if (a === 'build') g.act({ t: 'build', op: 'visit' }); if (a === 'kitchen') g.act({ t: 'cook', op: 'visit' }); if (a === 'nest') g.act({ t: 'breed', op: 'visit' }); if (a === 'lab') g.act({ t: 'lab', op: 'visit' }); break;
      case 'close': if (this.refBack && this.panel !== 'codex') { this.refBack = false; this.open('codex'); break; } this.refBack = false; this.panel = null; this.afk = null; break;
      case 'tab': {
        // 아직 없는 직업 탭은 넘어가지 않고 알려 준다
        if (a === 'char' && c) {
          const k = +b - 1, tiers = maxTierOf(baseClass(c.cls));
          if (k >= 1 && k <= tiers && !classLine(c.cls)[k]) {
            this.toast(k === 1 ? `Lv.${CLASS_LEVEL}에 마을의 ${NPCS[CLASS_NPC].name}에게서 전직하면 열립니다` : `Lv.${TIER_LEVEL[k]}에 ${NPCS[CLASS_NPC].name}에게서 ${k}차 전직하면 열립니다`);
            break;
          }
        }
        this.tab[a as Exclude<Panel, null>] = +b; this.craftSel = -1; break;
      }
      case 'statinfo': this.statSel = (a || null) as StatKey | null; break;
      case 'csel': this.craftSel = +a; break;
      case 'pslot': this.prodSlot = +a; break;
      case 'fslot': this.forgeSel = +a; break;
      case 'ssel': this.stampSel = a; break;
      case 'play': {
        if (!c) break;
        const kind = a as GameKind, name = GAMES[kind].name;
        this.panel = null; this.refresh(true);
        runGame(kind, name, (r) => {
          if (r.quit && !r.score) { this.toast('그만두었습니다(남은 횟수는 그대로입니다)'); this.open('games'); this.refresh(true); return; }
          const res = g.act({ t: 'game', kind, score: r.score });
          if (res.ok) this.toast(r.score ? `${name} ${r.score}점! 보상을 받았습니다` : `${name} 0점 · 보상 없음`); else this.toast(res.err ?? '보상을 받지 못했습니다');
          this.open('games'); this.refresh(true);
        });
        break;
      }
      case 'ppull': {
        const before = { ...g.acc.pets }, r = g.act({ t: 'petPull', tier: +a });
        if (!r.ok) { fail(r.err ?? null); break; }
        const got = PETS.find((p) => !before[p.id] && g.acc.pets[p.id]);
        if (got) { this.petSel = got.id; this.notice(`새 동료! ${RARITY_NAMES[got.rarity]} ${got.name}`); this.audio?.play('card'); }
        else this.toast(`이미 있는 동료라 펫 크리스탈 ${r.n}개로 바뀌었습니다`);
        break;
      }
      case 'psel': this.petSel = a; break;
      case 'eqtab': this.eqTab = +a; this.sel = null; break;
      case 'obtake': fail(g.act({ t: 'obol', op: 'take', fam: a === '1', idx: +b }).err ?? null); break;
      case 'obput': {
        // 같은 모양의 열린 빈 칸 → 없으면 같은 모양의 첫 열린 칸(바꿔 끼움)
        const fam = a === '1', o = OBOL[b], slots = fam ? FAMILY_OBOL_SLOTS : PERSONAL_SLOTS, board = fam ? g.acc.famObols ?? [] : c!.obols ?? [];
        const ok = (i: number) => slots[i].shape === o.shape && slotOpen(g.acc, c!, fam, i);
        let idx = slots.findIndex((_, i) => ok(i) && !board[i]);
        if (idx < 0) idx = slots.findIndex((_, i) => ok(i));
        if (idx < 0) { this.toast(`${fam ? '가족' : '개인'} 오볼판에 열린 ${SHAPE_NAMES[o.shape]} 칸이 없습니다`); break; }
        const r = g.act({ t: 'obol', op: 'place', fam, idx, id: b });
        if (r.ok) { this.audio?.play('craft'); this.eqTab = 2; } else fail(r.err ?? null);
        break;
      }
      case 'skinon': { const r = g.act({ t: 'skinOn', id: a }); if (r.ok) { this.toast(`${ITEMS[a].name}을(를) 홀로웨어에 넣었습니다`, a); this.eqTab = 1; this.sel = `skin:${ITEMS[a].slot}`; } else fail(r.err ?? null); break; }
      case 'skinoff': fail(g.act({ t: 'skinOff', slot: a as SkinSlot }).err ?? null); break;
      case 'pplus': { const r = g.act({ t: 'petPlus', id: a }); if (r.ok) { this.toast(`${PETS.find((p) => p.id === a)!.name} + 강화!`); this.audio?.play('craft'); } else fail(r.err ?? null); break; }
      case 'pshard': { const r = g.act({ t: 'petShard' }); if (r.ok) this.toast(`펫 크리스탈 ${r.n}개를 넣었습니다`); else fail(r.err ?? null); break; }
      case 'bsel': this.bubSel = a; break;
      case 'wplay': {
        const t = WTOTEM[a];
        if (!t || !c) break;
        this.panel = null; this.refresh(true);
        runGame('worship', t.name, (r) => {
          if (r.quit && !r.kills) { this.toast('그만두었습니다(기도력은 그대로입니다)'); this.open('shrine'); this.refresh(true); return; }
          const res = g.act({ t: 'worship', op: 'run', id: t.id, kills: r.kills, survived: r.survived });
          if (res.ok) { this.toast(`${SOUL_NAMES[t.soul]} ${res.n}개를 얻었습니다`); this.audio?.play('coin'); } else this.toast(res.err ?? '보상을 받지 못했습니다');
          this.open('shrine'); this.refresh(true);
        }, { speed: t.speed, art: t.art, bolt: boltEvery(c), totem: 'obj_shrine' });
        break;
      }
      case 'wup': { const r = g.act({ t: 'worship', op: 'up', id: a }); if (r.ok) this.audio?.play('craft'); else fail(r.err ?? null); break; }
      case 'wtog': fail(g.act({ t: 'worship', op: 'toggle', id: a }).err ?? null); break;
      case 'shrine': {
        const r = g.act({ t: 'shrine', op: a as 'build' | 'place' | 'pick', id: b });
        if (r.ok) { this.audio?.play('craft'); this.toast(a === 'build' ? `${SHRINE[b].name}을(를) 지었습니다` : a === 'place' ? `${SHRINE[b].name}을(를) 이 맵에 놓았습니다` : `${SHRINE[b].name}을(를) 거뒀습니다`); } else fail(r.err ?? null);
        break;
      }
      case 'build': {
        const r = a === 'start' ? g.act({ t: 'build', op: 'start', id: b }) : a === 'cancel' ? g.act({ t: 'build', op: 'cancel', idx: +b }) : g.act({ t: 'build', op: a as 'rate' | 'slots' });
        if (r.ok) { this.audio?.play('craft'); if (a === 'start') this.toast('공사를 시작했습니다'); } else fail(r.err ?? null);
        break;
      }
      case 'labspot': { const r = g.act({ t: 'lab', op: 'place', spot: +a }); if (r.ok) this.audio?.play('craft'); else fail(r.err ?? null); break; }
      case 'lableave': fail(g.act({ t: 'lab', op: 'leave' }).err ?? null); break;
      case 'labjewel': { const r = g.act({ t: 'lab', op: 'jewel', id: a }); if (r.ok) { this.audio?.play('craft'); this.toast(`${LAB_NODE[a].name}을(를) 열었습니다`); } else fail(r.err ?? null); break; }
      case 'bhatch': { const n0 = g.acc.breed.pets.length; const r = g.act({ t: 'breed', op: 'hatch' }); if (r.ok) { this.audio?.play('coin'); const p = g.acc.breed.pets[n0]; this.toast(`${SPEC[p.sp].name}이(가) 태어났습니다! 힘 ${p.power}`); } else fail(r.err ?? null); break; }
      case 'brel': fail(g.act({ t: 'breed', op: 'release', uid: +a }).err ?? null); break;
      case 'bfence': fail(g.act({ t: 'breed', op: 'fence', uid: +a }).err ?? null); break;
      case 'bteam': fail(g.act({ t: 'breed', op: 'team', uid: +a, terr: b }).err ?? null); break;
      case 'bterr': this.terrPick = this.terrPick === a ? null : a; break;
      case 'bup': { const r = g.act({ t: 'breed', op: 'up', k: a as BreedUp }); if (r.ok) this.audio?.play('craft'); else fail(r.err ?? null); break; }
      case 'kpick': this.kitIdx = this.kitIdx === +a ? -1 : +a; this.recipeSp = []; break;
      case 'ksp': this.recipeSp = this.recipeSp.includes(a) ? this.recipeSp.filter((x) => x !== a) : [...this.recipeSp, a].slice(0, 4); break;
      case 'kmeal': { const r = g.act({ t: 'cook', op: 'meal', idx: +a, id: b ?? '' }); if (r.ok) this.kitIdx = -1; else fail(r.err ?? null); break; }
      case 'krecipe': { const r = g.act({ t: 'cook', op: 'recipe', idx: +a, sp: this.recipeSp }); if (r.ok) { this.audio?.play('craft'); this.toast('요리 연구를 시작했습니다'); this.kitIdx = -1; this.recipeSp = []; } else fail(r.err ?? null); break; }
      case 'kup': { const r = g.act({ t: 'cook', op: 'up', idx: +a, k: b as KitchenUp }); if (r.ok) this.audio?.play('craft'); else fail(r.err ?? null); break; }
      case 'kbuy': { const r = g.act({ t: 'cook', op: 'buy' }); if (r.ok) this.toast('주방이 하나 늘었습니다'); else fail(r.err ?? null); break; }
      case 'klvl': { const r = g.act({ t: 'cook', op: 'lvl', id: a }); if (r.ok) { this.audio?.play('craft'); this.toast(`${MEAL[a].name} Lv.${g.acc.cook.meals[a].lv}!`); } else fail(r.err ?? null); break; }
      case 'kclaim': { const r = g.act({ t: 'cook', op: 'claim' }); if (r.ok) this.audio?.play('coin'); else fail(r.err ?? null); break; }
      case 'kchef': fail(g.act({ t: 'cook', op: 'chef' }).err ?? null); break;
      case 'kladle': { const r = g.act({ t: 'cook', op: 'ladle', idx: +a }); if (r.ok) this.audio?.play('craft'); else fail(r.err ?? null); break; }
      case 'trappick': this.trapIdx = this.trapIdx === +a ? -1 : +a; break;
      case 'trapbox': this.trapBox = a; break;
      case 'trapset': {
        const r = g.act({ t: 'trap', op: 'set', idx: this.trapIdx, critter: a, time: +b, box: this.trapBox });
        if (r.ok) { this.audio?.play('craft'); this.toast(`${ITEMS[a].name} 덫을 놓았습니다`, a); this.trapIdx = -1; } else fail(r.err ?? null);
        break;
      }
      case 'trap': {
        const before = c!.skills.trapping.lv;
        const r = g.act({ t: 'trap', op: a as 'collect' | 'cancel', idx: +b });
        if (r.ok && a === 'collect') { this.audio?.play('coin'); this.toast(c!.skills.trapping.lv > before ? `덫 사냥 Lv.${c!.skills.trapping.lv}!` : '덫을 거뒀습니다'); } else if (!r.ok) fail(r.err ?? null);
        break;
      }
      case 'post': {
        const r = a === 'deliver' ? g.act({ t: 'post', op: 'deliver', idx: +b }) : g.act({ t: 'post', op: 'box', id: b });
        if (r.ok) { this.audio?.play(a === 'deliver' ? 'coin' : 'craft'); if (a === 'deliver') this.toast('배달 완료! 배달 포인트와 코인을 받았습니다', 'coin'); } else fail(r.err ?? null);
        break;
      }
      case 'alch': {
        const id = a === 'assign' ? `${b}:${x3}` : b;
        const r = g.act({ t: 'alch', op: a as 'bubble' | 'vial' | 'liquid' | 'assign' | 'big', id });
        if (!r.ok) { fail(r.err ?? null); break; }
        this.audio?.play('craft');
        if (a === 'vial' && !(g.acc.alch.vials[b] ?? 0)) this.toast('주사위 실패… 약병을 발견하지 못했습니다');
        else if (a === 'vial' && r.n === 1 && g.acc.alch.vials[b] === 1) this.toast('약병을 발견했습니다!');
        break;
      }
      case 'cauld': this.cauldron = a; this.bubSel = null; break;
      case 'owl': fail(g.act({ t: 'owl', k: a as OwlUp }).err ?? null); break;
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
      case 'tsel': if (this.talentSel !== a) this.quickFor = null; this.talentSel = a; break;
      case 'ssel': this.starSel = a; break;
      case 'startal': fail(g.act({ t: 'starTal', id: a }).err ?? null); break;
      case 'quick':
        // 아래 퀵슬롯(공격 바)이 깜빡이며 기다린다 → 원하는 칸을 직접 누른다. 한 번 더 누르면 취소
        if (this.assigning === a) { this.assigning = null; this.attackMode = this.assignPrev; break; }
        if (!this.assigning) this.assignPrev = this.attackMode;
        this.assigning = a; this.attackMode = true;
        break;
      case 'qpage': this.quickPage = +a; break;
      case 'qset': {
        if (!this.quickFor || !c) break;
        const r = g.act({ t: 'barSet', bar: this.quickPage, slot: +a, id: this.quickFor });
        if (r.ok) this.toast(`${TALENT[this.quickFor].name}을(를) 퀵슬롯 ${this.quickPage + 1}장 ${+a + 1}번 칸에 지정했습니다`); else fail(r.err ?? null);
        break;
      }
      case 'qclear': {
        if (!this.quickFor || !c) break;
        const i = c.attackBars[this.quickPage].indexOf(this.quickFor);
        if (i >= 0) fail(g.act({ t: 'barSet', bar: this.quickPage, slot: i, id: null }).err ?? null);
        break;
      }
      case 'mapworld': this.mapWorld = +a; this.mapSel = null; break;
      case 'mapsel': {
        // 같은 맵을 한 번 더 누르면 이동
        if (this.mapSel !== a) { this.mapSel = a; break; }
      }
      // falls through
      case 'tp': { const r = g.act({ t: 'teleport', map: a }); if (r.ok) { g.travelTo(); this.panel = null; this.mapSel = null; this.audio?.play('portal'); } else fail(r.err ?? null); break; }
      case 'opt': g.act({ t: 'option', autoAttacks: !g.acc.options.autoAttacks }); break;
      case 'pick': this.sel = b ? `${a}:${b}` : a; break;
      case 'sfx': this.audio?.setSfx(!this.audio.sfxOn); break;
      case 'bgm': this.audio?.setBgm(!this.audio.bgmOn); break;
      case 'delacc': this.delAcc = !this.delAcc; break;
      case 'delaccgo': {
        const v = (document.getElementById('delaccword') as HTMLInputElement | null)?.value.trim() ?? '';
        if (v !== '삭제') { fail('확인 칸에 삭제 라고 입력하세요'); break; }
        this.panel = null; this.delAcc = false;
        g.deleteAccount().then(() => { this.toast('계정을 삭제했습니다'); this.refresh(true); }).catch((e) => this.toast((e as Error).message));
        break;
      }
      // ── 게임 행동: 전부 g.act 로(기기와 서버가 같은 규칙으로 적용) ──
      case 'auto': if (c) { const on = !c.auto; g.act({ t: 'auto', on }); if (!on) g.world?.stopAuto(); } break;
      case 'use': { const r = g.act({ t: 'use', id: a }); fail(r.err ?? null); if (r.ok) { this.toast(`${ITEMS[a].name} 사용!`, a); this.sel = null; } break; }
      case 'put': fail(g.act({ t: 'deposit', id: a }).err ?? null); break;
      case 'take': fail(g.act({ t: 'withdraw', id: a, qty: this.takeAll ? undefined : stackCap(c!, a) }).err ?? null); break;
      case 'takemode': this.takeAll = a === '1'; break;
      case 'putall': { const r = g.act({ t: 'depositAll' }); this.toast(r.n ? `${r.n}종류를 창고에 맡겼습니다` : '맡길 재료가 없습니다'); break; }
      case 'buy': { const r = g.act({ t: 'buy', idx: +a, qty: +b }); fail(r.err ?? null); if (r.ok) { this.toast(`${ITEMS[SHOP[+a].item].name} ×${b} 구입`, SHOP[+a].item); this.audio?.play('buy'); } break; }
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
      case 'equip': fail(g.act({ t: 'equip', id: a, ...(b ? { at: +b } : {}) }).err ?? null); this.sel = null; break;
      case 'upg': {
        const r = g.act({ t: 'upgrade', stone: a, slot: b as EquipSlot });
        if (!r.ok) fail(r.err ?? null);
        else if (r.n) this.toast(`강화 성공! ${statsText(STONE_BY_ID[a].stats)}`, a);
        else this.toast('강화 실패… 강화 칸 하나를 썼습니다', a);
        break;
      }
      case 'food': {
        // 넣기: 같은 음식 칸 → 빈 칸 → 첫 칸 순서로. 빼기: 고른 칸
        const slot = b !== undefined ? +b : Math.max(0, c!.foods.findIndex((f) => f?.id === a), c!.foods.findIndex((f) => f?.id === a) >= 0 ? 0 : c!.foods.indexOf(null));
        fail(g.act({ t: 'food', id: a || null, slot }).err ?? null);
        this.sel = a ? `food:${c!.foods.findIndex((f) => f?.id === a)}` : null;
        break;
      }
      case 'unequip': fail(g.act({ t: 'unequip', slot: a as EquipSlot }).err ?? null); this.sel = null; break;
      case 'sell': {
        const it = ITEMS[a], key = `${a}:${b}`;
        const risky = it.kind === 'equip' || it.kind === 'key' || it.kind === 'unlock' || it.sell * +b >= 500 || +b > 1;
        if (risky && this.sellArm !== key) { this.sellArm = key; break; }
        this.sellArm = null;
        const r = g.act({ t: 'sell', id: a, qty: +b }); if (r.ok) this.toast(`${it.name} 팔기: +${r.n} 코인`, 'coin'); else fail(r.err ?? null);
        break;
      }
      case 'stat': g.act({ t: 'stat', stat: a as StatKey }); break;
      case 'talent': g.act({ t: 'talent', id: a }); break;
      case 'qaccept': if (c && g.act({ t: 'qaccept', npc: a }).ok) { this.toast(`퀘스트 수락: ${currentQuest(c, a)!.name}`); this.panel = null; } break;
      case 'qdone': { const name = c && currentQuest(c, a)?.name; const r = g.act({ t: 'qdone', npc: a }); fail(r.err ?? null); if (r.ok) { this.toast(`퀘스트 완료: ${name}`); this.audio?.play('quest'); } break; }
      case 'craft': { const r = g.act({ t: 'craft', idx: +a }); fail(r.err ?? null); if (r.ok) this.toast(`${ITEMS[RECIPES[+a].item].name} ${RECIPES[+a].unlock ? '완료 — 모루가 한 단계 올랐습니다!' : '제작 완료!'}`, RECIPES[+a].item); if (r.ok) this.audio?.play('craft'); break; }
    }
    this.refresh();
  }
}
