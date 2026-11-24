// 플레이어 행동. 기기(낙관적 적용)와 서버(권위)가 같은 함수로 적용한다.
// 새 행동을 추가할 때는 여기 한 곳만 고치면 클라이언트와 서버가 함께 바뀐다.
import { ClassId, EquipSlot, MAPS, NODES, StatKey } from './data';
import {
  Account, Activity, acceptQuest, advanceClass, buy, collectAnvil, completeQuest, countItem, craft, deposit, depositAll, equipCard,
  equipItem, learnTalent, switchTalentPreset, portalLock, setBarSlot, teleport, removeItem, sellItem, setFood, setProduct, spendAnvilPoint, spendStat, unequipCard, unequipItem, useItem,
  withdraw,
} from './state';
import { buyBribe, collectStamp, upgradeStamp } from './stamps';
import { MeritEff, buyMerit, claimTask } from './tasks';
import { alignSign, claimAchievement, claimStar, offerStatue, switchCardPreset, toggleCardSet, unlockSign } from './progress';
import { ForgeUp, buyForge, forgeCollect, forgeLoad, forgeOil, forgeUpgrade } from './forge';

export type Action =
  | { t: 'stat'; stat: StatKey }
  | { t: 'talent'; id: string }
  | { t: 'equip'; id: string }
  | { t: 'unequip'; slot: EquipSlot }
  | { t: 'food'; id: string | null; slot?: number }
  | { t: 'use'; id: string }
  | { t: 'sell'; id: string; qty: number }
  | { t: 'craft'; idx: number }
  | { t: 'class'; cls: ClassId }
  | { t: 'qaccept'; npc: string }
  | { t: 'qdone'; npc: string }
  | { t: 'deposit'; id: string }
  | { t: 'withdraw'; id: string }
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
  | { t: 'talentPreset'; i: number };

export interface ActionResult { ok: boolean; err?: string; n?: number }
const ok = (n?: number): ActionResult => ({ ok: true, n });
const fail = (err: string): ActionResult => ({ ok: false, err });
const res = (err: string | null): ActionResult => (err ? fail(err) : ok());

/** 행동 하나 적용. 실패하면 상태는 바뀌지 않는다 */
export function applyAction(acc: Account, ci: number, a: Action, now: number): ActionResult {
  const c = acc.characters[ci];
  if (!c) return fail('캐릭터가 없습니다');
  switch (a.t) {
    case 'stat': return spendStat(c, a.stat) ? ok() : fail('포인트가 없습니다');
    case 'talent': return learnTalent(c, a.id) ? ok() : fail('특성을 올릴 수 없습니다');
    case 'equip': return res(equipItem(c, a.id));
    case 'unequip': return res(unequipItem(c, a.slot));
    case 'food': return res(setFood(c, a.id, a.slot ?? 0));
    case 'use': return res(useItem(acc, c, a.id));
    case 'sell': { const n = sellItem(acc, c, a.id, a.qty); return n ? ok(n) : fail('팔 수 없습니다'); }
    case 'craft': return res(craft(acc, c, a.idx));
    case 'class': return res(advanceClass(c, a.cls));
    case 'qaccept': return acceptQuest(c, a.npc) ? ok() : fail('수락할 수 없습니다');
    case 'qdone': return res(completeQuest(acc, c, a.npc));
    case 'deposit': { const n = deposit(acc, c, a.id); return n ? ok(n) : fail('창고가 가득 찼습니다'); }
    case 'withdraw': { const n = withdraw(acc, c, a.id); return n ? ok(n) : fail('가방에 자리가 없습니다'); }
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
      if (q.key) {
        if (countItem(c, q.key) < 1) return fail('열쇠가 필요합니다');
        removeItem(c, q.key, 1);
      }
      c.mapId = q.to; c.x = q.toX; c.y = q.toY ?? 0;
      return ok();
    }
    case 'respawn': c.mapId = 'town'; c.x = 120; c.y = 0; return ok();
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
    case 'target': {
      const t = a.activity;
      if (t.k === 'gather' && !(NODES[t.node] && MAPS[c.mapId].nodes.some((n) => n.node === t.node))) return fail('이 맵에 없는 자원');
      c.activity = t;
      return ok();
    }
  }
}
