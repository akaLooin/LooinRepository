// 플레이어 행동. 기기(낙관적 적용)와 서버(권위)가 같은 함수로 적용한다.
// 새 행동을 추가할 때는 여기 한 곳만 고치면 클라이언트와 서버가 함께 바뀐다.
import { applyStone } from './upgrade';
import { deliver, postRefresh, upBox } from './post';
import { cancelTrap, collectTrap, setTrap } from './traps';
import { buildSettle, cancelBuild, startBuild, upBuild , placeCog, rankUpSalt, setPrint, toggleRefine, toggleStaff, trashCog, upAtom, useBook } from './build';
import { placeObol, takeObol } from './obols';
import { arcadeSettle, poppySettle, shootBall, upPoppy } from './arcade';
import { buildShrine, pickShrine, placeShrine, shrineSettle } from './shrines';
import { buyChip, labSettle, leaveLab, placeInLab, toggleChip, unlockJewel } from './lab';
import { BreedUp, breedSettle, fightArena, hatchEgg, releasePet, toggleArena, toggleFence, toggleKeeper, toggleTeam, upBreed } from './breeding';
import { KitchenUp, buyKitchen, claimSpices, cookSettle, levelMeal, setMeal, startRecipe, toggleChef, upKitchen, useLadle } from './cooking';
import { finishWorship, togglePrayer, upPrayer } from './worship';
import { LiquidUp, alchSettle, assignAlch, toggleBig, upBubble, upLiquid, upVial } from './alchemy';
import { TALENT, classLine, worldOf } from './data';
import { ClassId, EquipSlot, MAPS, NODES, OwlUp, StatKey } from './data';
import { depositShards, owlSettle, owlUpgrade, plusPet, pullPet } from './companions';
import { GameKind, finishGame } from './minigames';
import {
  Account, Activity, acceptQuest, advanceClass, buy, collectAnvil, completeQuest, countItem, craft, deposit, depositAll, equipCard,
  equipItem, gateOpen, townOf, learnStarTal, learnTalent, switchTalentPreset, portalLock, arenaClaim, setSkin, clearSkin, setBarSlot, teleport, removeItem, sellItem, setFood, setProduct, spendAnvilPoint, spendStat, unequipCard, unequipItem, useItem,
  withdraw,
} from './state';
import { buyBribe, collectStamp, upgradeStamp } from './stamps';
import { MeritEff, buyMerit, claimTask } from './tasks';
import { alignSign, claimAchievement, claimStar, offerStatue, switchCardPreset, toggleCardSet, unlockSign } from './progress';
import { ForgeUp, buyForge, forgeCollect, forgeLoad, forgeOil, forgeUpgrade } from './forge';

export type Action =
  | { t: 'stat'; stat: StatKey }
  | { t: 'talent'; id: string }
  | { t: 'equip'; id: string; at?: number }
  | { t: 'starTal'; id: string }
  | { t: 'upgrade'; stone: string; slot: EquipSlot }
  | { t: 'unequip'; slot: EquipSlot }
  | { t: 'food'; id: string | null; slot?: number }
  | { t: 'use'; id: string }
  | { t: 'sell'; id: string; qty: number }
  | { t: 'craft'; idx: number }
  | { t: 'class'; cls: ClassId }
  | { t: 'qaccept'; npc: string }
  | { t: 'qdone'; npc: string }
  | { t: 'deposit'; id: string }
  | { t: 'withdraw'; id: string; qty?: number }
  | { t: 'depositAll' }
  | { t: 'buy'; idx: number; qty: number }
  | { t: 'prod'; slot: number; item: string | null }
  | { t: 'apt'; k: 'cap' | 'spd' | 'xp' }
  | { t: 'collect'; slot: number; toStorage: boolean }
  | { t: 'cardOn'; card: string }
  | { t: 'cardOff'; slot: number }
  | { t: 'travel'; portal: number }
  | { t: 'respawn' }
  | { t: 'auto'; on: boolean }
  | { t: 'target'; activity: Activity }
  | { t: 'barSet'; bar: number; slot: number; id: string | null }
  | { t: 'barPage'; page: number }
  | { t: 'option'; autoAttacks: boolean }
  | { t: 'teleport'; map: string }
  | { t: 'forgeBuy' }
  | { t: 'forgeLoad'; slot: number; ore: string }
  | { t: 'forgeOil'; slot: number }
  | { t: 'forgeCollect'; slot: number; toStorage: boolean; n: number }
  | { t: 'forgeUp'; k: ForgeUp }
  | { t: 'stampIn'; id: string }
  | { t: 'stampUp'; id: string }
  | { t: 'bribe' }
  | { t: 'task'; id: string }
  | { t: 'merit'; id: MeritEff }
  | { t: 'statue'; id: string }
  | { t: 'star'; id: string }
  | { t: 'signOpen'; id: string }
  | { t: 'sign'; id: string | null }
  | { t: 'achieve'; id: string }
  | { t: 'cardSet'; id: string | null }
  | { t: 'cardPreset'; i: number }
  | { t: 'talentPreset'; i: number }
  | { t: 'arenaClaim' }
  | { t: 'petPull'; tier: number }
  | { t: 'petPlus'; id: string }
  | { t: 'petShard' }
  | { t: 'skinOn'; id: string }
  | { t: 'skinOff'; slot: 'hat' | 'body' }
  | { t: 'owl'; k?: OwlUp }
  | { t: 'post'; op: 'refresh' | 'deliver' | 'box'; idx?: number; id?: string }
  | { t: 'worship'; op: 'run' | 'up' | 'toggle'; id: string; kills?: number; survived?: boolean }
  | { t: 'build'; op: 'start' | 'cancel' | 'rate' | 'slots' | 'visit' | 'staff' | 'cog' | 'trash' | 'refine' | 'rank' | 'print' | 'book' | 'atom'; id?: string; idx?: number; slot?: number }
  | { t: 'shrine'; op: 'build' | 'place' | 'pick' | 'visit'; id?: string }
  | { t: 'obol'; op: 'place' | 'take'; fam: boolean; idx: number; id?: string }
  | { t: 'arcade'; op: 'visit' | 'shoot' }
  | { t: 'poppy'; op: 'visit' | 'up'; id?: string }
  | { t: 'lab'; op: 'visit' | 'place' | 'leave' | 'jewel' | 'chip' | 'chipOn'; spot?: number; id?: string }
  | { t: 'breed'; op: 'visit' | 'hatch' | 'release' | 'fence' | 'team' | 'up' | 'keeper' | 'arena' | 'fight'; uid?: number; terr?: string; k?: BreedUp }
  | { t: 'cook'; op: 'visit' | 'claim' | 'meal' | 'recipe' | 'up' | 'buy' | 'lvl' | 'chef' | 'ladle'; idx?: number; id?: string; sp?: string[]; k?: KitchenUp }
  | { t: 'trap'; op: 'set' | 'collect' | 'cancel'; idx: number; critter?: string; time?: number; box?: string }
  | { t: 'alch'; op: 'start' | 'bubble' | 'vial' | 'liquid' | 'assign' | 'big'; id?: string }
  | { t: 'game'; kind: GameKind; score: number };

export interface ActionResult { ok: boolean; err?: string; n?: number }
const ok = (n?: number): ActionResult => ({ ok: true, n });
const fail = (err: string): ActionResult => ({ ok: false, err });
const res = (err: string | null): ActionResult => (err ? fail(err) : ok());

/** 행동 하나 적용. 실패하면 상태는 바뀌지 않는다 */
export function applyAction(acc: Account, ci: number, a: Action, now: number): ActionResult {
  const c = acc.characters[ci];
  if (!c) return fail('캐릭터가 없습니다');
  // 맵을 옮기면 요리사·연구원이 자리를 비우게 되므로, 그 전까지 일한 몫을 먼저 정산한다
  if ((a.t === 'travel' || a.t === 'teleport' || a.t === 'respawn') && (acc.cook.chefs.includes(c.id) || acc.lab.members.some((m) => m.id === c.id))) {
    cookSettle(acc, now); labSettle(acc, now);
  }
  switch (a.t) {
    case 'stat': return spendStat(c, a.stat) ? ok() : fail('포인트가 없습니다');
    case 'talent': return learnTalent(c, a.id, acc.build?.talentMax) ? ok() : fail('특성을 올릴 수 없습니다');
    case 'starTal': return res(learnStarTal(acc, c, a.id));
    case 'equip': return res(equipItem(c, a.id, a.at));
    case 'upgrade': { const r = applyStone(acc, c, a.stone, a.slot); return typeof r === 'string' ? fail(r) : ok(r.ok ? 1 : 0); }
    case 'unequip': return res(unequipItem(c, a.slot));
    case 'food': return res(setFood(c, a.id, a.slot ?? 0));
    case 'use': return res(useItem(acc, c, a.id));
    case 'sell': { const n = sellItem(acc, c, a.id, a.qty); return n ? ok(n) : fail('팔 수 없습니다'); }
    case 'craft': return res(craft(acc, c, a.idx));
    case 'class': return res(advanceClass(c, a.cls));
    case 'qaccept': return acceptQuest(c, a.npc) ? ok() : fail('수락할 수 없습니다');
    case 'qdone': return res(completeQuest(acc, c, a.npc));
    case 'deposit': { const n = deposit(acc, c, a.id); return n ? ok(n) : fail('창고가 가득 찼습니다'); }
    case 'withdraw': { const n = withdraw(acc, c, a.id, a.qty && a.qty > 0 ? a.qty : Infinity); return n ? ok(n) : fail('가방에 자리가 없습니다'); }
    case 'depositAll': return ok(depositAll(acc, c));
    case 'buy': return res(buy(acc, c, a.idx, a.qty, now));
    case 'prod': return res(setProduct(c, a.item, a.slot));
    case 'apt': return spendAnvilPoint(c, a.k) ? ok() : fail('포인트가 없습니다');
    case 'collect': { const n = collectAnvil(acc, c, a.toStorage, a.slot); return n ? ok(n) : fail(a.toStorage ? '창고가 가득 찼습니다' : '가방에 자리가 없습니다'); }
    case 'cardOn': return res(equipCard(acc, c, a.card, c.cardSlots.indexOf(null)));
    case 'cardOff': unequipCard(acc, c, a.slot); return ok();
    case 'travel': {
      // 처치 수는 서버에 동기화된 값으로 판단한다(기기는 이동 전에 먼저 동기화한다)
      const q = MAPS[c.mapId]?.portals[a.portal];
      if (!q || !MAPS[q.to]) return fail('없는 포탈');
      const lock = portalLock(c, c.mapId, q);
      if (lock) return fail(`아직 열리지 않았습니다(${lock})`);
      // 세계의 문: 앞으로(더 높은 월드로) 갈 때만 조건을 본다
      if (q.gate && worldOf(q.to) > worldOf(c.mapId)) {
        if (!gateOpen(acc, c, worldOf(q.to))) return fail('세계의 문 조건을 아직 채우지 못했습니다');
        c.maxWorld = Math.max(c.maxWorld ?? 1, worldOf(q.to));
      }
      if (q.key) {
        if (countItem(c, q.key) < 1) return fail('열쇠가 필요합니다');
        removeItem(c, q.key, 1);
      }
      // 콜로세움: 들어갈 때 처치 수를 기억(보상은 이번 회차분), 중간에 나가면 보상 없음
      if (MAPS[q.to].arena) c.arenaStart = c.kills[q.to] ?? 0; else c.arenaStart = null;
      c.mapId = q.to; c.x = q.toX; c.y = q.toY ?? 0;
      return ok();
    }
    case 'respawn': { const t = townOf(c.mapId); c.mapId = t.id; c.x = t.x; c.y = 0; return ok(); }
    case 'auto': c.auto = a.on; return ok();
    case 'barSet': return res(setBarSlot(c, a.bar, a.slot, a.id));
    case 'barPage': if (a.page < 0 || a.page >= c.attackBars.length) return fail('없는 장'); c.attackPage = a.page; return ok();
    case 'option': acc.options.autoAttacks = a.autoAttacks; return ok();
    case 'teleport': return res(teleport(acc, c, a.map, now));
    case 'forgeBuy': return res(buyForge(acc));
    case 'forgeLoad': return res(forgeLoad(acc, c, a.slot, a.ore, now));
    case 'forgeOil': return res(forgeOil(acc, c, a.slot, now));
    case 'forgeCollect': { const n = forgeCollect(acc, c, a.slot, a.toStorage, now, a.n); return n ? ok(n) : fail('꺼낼 주괴가 없거나 자리가 없습니다'); }
    case 'forgeUp': return res(forgeUpgrade(acc, a.k, now));
    case 'stampIn': return res(collectStamp(acc, c, a.id));
    case 'stampUp': return res(upgradeStamp(acc, c, a.id));
    case 'bribe': return res(buyBribe(acc));
    case 'task': return res(claimTask(acc, a.id));
    case 'merit': return res(buyMerit(acc, a.id));
    case 'statue': { const r = offerStatue(acc, c, a.id); return typeof r === 'number' ? ok(r) : fail(r); }
    case 'star': return res(claimStar(acc, c, a.id));
    case 'signOpen': return res(unlockSign(acc, a.id));
    case 'sign': return res(alignSign(acc, c, a.id));
    case 'achieve': return res(claimAchievement(acc, a.id));
    case 'cardSet': return res(toggleCardSet(c, a.id));
    case 'cardPreset': return res(switchCardPreset(acc, c, a.i));
    case 'talentPreset': return res(switchTalentPreset(c, a.i));
    case 'petPull': { const r = pullPet(acc, a.tier, now); return typeof r === 'string' ? fail(r) : ok(r.crystals); }
    case 'petPlus': return res(plusPet(acc, a.id));
    case 'skinOn': return res(setSkin(c, a.id));
    case 'skinOff': return res(clearSkin(c, a.slot));
    case 'petShard': { const n = depositShards(acc, c); return n ? ok(n) : fail('펫 크리스탈 조각이 없습니다'); }
    case 'game': return res(finishGame(acc, c, a.kind, a.score, now));
    case 'alch': {
      // 처음 솥을 찾은 순간부터 액체가 쌓인다
      if (a.op === 'start') { alchSettle(acc, now); return ok(); }
      if (!acc.alch.t) return fail('먼저 오아시스 마을의 연금 솥을 찾아가세요');
      if (a.op === 'bubble') return res(upBubble(acc, c, a.id ?? '', now));
      if (a.op === 'vial') { const before = acc.alch.vials[a.id ?? ''] ?? 0; const r = upVial(acc, c, a.id ?? ''); return r ? fail(r) : ok((acc.alch.vials[a.id ?? ''] ?? 0) > before ? 1 : 0); }
      if (a.op === 'assign') return res(assignAlch(acc, c, a.id ?? '', now));
      if (a.op === 'big') return res(toggleBig(acc, c, a.id ?? ''));
      return res(upLiquid(acc, a.id as LiquidUp, now));
    }
    case 'worship': {
      if (a.op === 'run') { const r = finishWorship(acc, c, a.id, a.kills ?? 0, !!a.survived, now); return typeof r === 'number' ? ok(r) : fail(r); }
      if (a.op === 'up') return res(upPrayer(acc, c, a.id));
      return res(togglePrayer(acc, c, a.id));
    }
    case 'lab': {
      if ((c.maxWorld ?? 1) < 4) return fail('4월드 성운 정거장의 연구실에서 할 수 있습니다');
      if (a.op === 'visit') { labSettle(acc, now); return ok(); }
      if (a.op === 'place') return res(placeInLab(acc, c, a.spot ?? -1, now));
      if (a.op === 'leave') return res(leaveLab(acc, c, now));
      if (a.op === 'jewel') return res(unlockJewel(acc, a.id ?? '', now));
      if (a.op === 'chip') return res(buyChip(acc, a.id ?? ''));
      if (a.op === 'chipOn') return res(toggleChip(acc, c, a.id ?? ''));
      return fail('없는 행동');
    }
    case 'breed': {
      if ((c.maxWorld ?? 1) < 4) return fail('4월드 성운 정거장의 번식 둥지에서 할 수 있습니다');
      switch (a.op) {
        case 'visit': breedSettle(acc, now); return ok();
        case 'hatch': return res(hatchEgg(acc, now, c));
        case 'keeper': return res(toggleKeeper(acc, c, now));
        case 'arena': return res(toggleArena(acc, a.uid ?? -1, now));
        case 'fight': { const r = fightArena(acc, now); return typeof r === 'number' ? ok(r) : fail(r); }
        case 'release': return res(releasePet(acc, a.uid ?? -1, now));
        case 'fence': return res(toggleFence(acc, a.uid ?? -1, now));
        case 'team': return res(toggleTeam(acc, a.uid ?? -1, a.terr ?? '', now));
        case 'up': return res(upBreed(acc, a.k ?? 'nest', now));
      }
      return fail('없는 행동');
    }
    case 'cook': {
      if ((c.maxWorld ?? 1) < 4) return fail('4월드 성운 정거장의 별빛 식당에서 할 수 있습니다');
      switch (a.op) {
        case 'visit': cookSettle(acc, now); return ok();
        case 'claim': return res(claimSpices(acc, now));
        case 'meal': return res(setMeal(acc, a.idx ?? -1, a.id ?? '', now));
        case 'recipe': return res(startRecipe(acc, a.idx ?? -1, a.sp ?? [], now));
        case 'up': return res(upKitchen(acc, a.idx ?? -1, a.k ?? 'spd', now));
        case 'buy': return res(buyKitchen(acc, now));
        case 'lvl': return res(levelMeal(acc, a.id ?? '', now));
        case 'chef': return res(toggleChef(acc, c.id, now));
        case 'ladle': return res(useLadle(acc, a.idx ?? -1, now));
      }
      return fail('없는 행동');
    }
    case 'arcade': {
      if ((c.maxWorld ?? 1) < 2) return fail('2월드 오아시스 마을의 오락실에서 할 수 있습니다');
      if (a.op === 'visit') { arcadeSettle(acc, now); return ok(); }
      const r = shootBall(acc, now); return typeof r === 'string' ? fail(r) : ok(r.coins);
    }
    case 'poppy': {
      if ((c.maxWorld ?? 1) < 2) return fail('2월드 오아시스 마을의 포피에게서 할 수 있습니다');
      if (a.op === 'visit') { poppySettle(acc, now); return ok(); }
      return res(upPoppy(acc, a.id ?? '', now));
    }
    case 'obol': return res(a.op === 'place' ? placeObol(acc, c, a.id ?? '', a.fam, a.idx) : takeObol(acc, c, a.fam, a.idx));
    case 'shrine': {
      if ((c.maxWorld ?? 1) < 3) return fail('3월드 눈꽃 마을의 공방 마당에서 지을 수 있습니다');
      if (a.op === 'visit') { shrineSettle(acc, now); return ok(); }
      if (a.op === 'build') return res(buildShrine(acc, c, a.id ?? '', now));
      if (a.op === 'place') return res(placeShrine(acc, c, a.id ?? '', now));
      return res(pickShrine(acc, a.id ?? '', now));
    }
    case 'build': {
      if ((c.maxWorld ?? 1) < 3) return fail('3월드 눈꽃 마을의 공방 마당에서 할 수 있습니다');
      if (a.op === 'visit') { buildSettle(acc, now); return ok(); }
      if (a.op === 'start') return res(startBuild(acc, c, a.id ?? '', now));
      if (a.op === 'cancel') return res(cancelBuild(acc, a.idx ?? -1, now));
      if (a.op === 'staff') return res(toggleStaff(acc, c, now));
      if (a.op === 'cog') { buildSettle(acc, now); return res(placeCog(acc, a.idx ?? -1, a.slot ?? -1)); }
      if (a.op === 'trash') { buildSettle(acc, now); return res(trashCog(acc, a.idx ?? -1)); }
      if (a.op === 'refine') return res(toggleRefine(acc, a.id ?? '', now));
      if (a.op === 'rank') return res(rankUpSalt(acc, a.id ?? '', now));
      if (a.op === 'print') return res(setPrint(acc, a.slot ?? -1, a.id ?? '', now));
      if (a.op === 'book') { buildSettle(acc, now); const t = TALENT[a.id ?? '']; return res(useBook(acc, a.id ?? '', !!t && (!t.cls || classLine(c.cls).includes(t.cls)))); }
      if (a.op === 'atom') return res(upAtom(acc, a.id ?? '', now));
      return res(upBuild(acc, a.op, now));
    }
    case 'trap': {
      if ((c.maxWorld ?? 1) < 3) return fail('3월드 눈꽃 마을의 덫 오두막에서 할 수 있습니다');
      if (a.op === 'set') return res(setTrap(c, a.idx, a.critter ?? '', a.time ?? 0, now, a.box ?? 'tb_card', acc.build?.levels.b_drone ?? 0));
      if (a.op === 'collect') return res(collectTrap(acc, c, a.idx, now));
      return res(cancelTrap(c, a.idx));
    }
    case 'post': {
      if (worldOf(c.mapId) < 2 && (c.maxWorld ?? 1) < 2) return fail('2월드 오아시스 마을의 우체국에서 할 수 있습니다');
      if (a.op === 'refresh') { postRefresh(acc, c, now); return ok(); }
      if (a.op === 'deliver') return res(deliver(acc, c, a.idx ?? -1, now));
      return res(upBox(c, a.id ?? ''));
    }
    case 'owl': if (!a.k) { owlSettle(acc, now); return ok(); } return res(owlUpgrade(acc, a.k, now));
    case 'arenaClaim': { const r = arenaClaim(acc, c); return typeof r === 'string' ? fail(r) : ok(r.waves); }
    case 'target': {
      const t = a.activity;
      if (t.k === 'gather' && !(NODES[t.node] && MAPS[c.mapId].nodes.some((n) => n.node === t.node))) return fail('이 맵에 없는 자원');
      c.activity = t;
      return ok();
    }
  }
}
