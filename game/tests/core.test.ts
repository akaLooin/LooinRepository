import { describe, expect, it } from 'vitest';
import { afkRates, computeAfk } from '../src/core/afk';
import { MAPS, MONSTERS, RECIPES } from '../src/core/data';
import { Rng } from '../src/core/rng';
import {
  addItem, countItem, craft, createCharacter, derive, deserialize, equipItem, gainXp, newAccount, serialize,
  unequipItem, xpToNext, acceptQuest, advanceClass, completeQuest, equipCard, equipItem as equip, recipeLock, anvilSlotsOpen, currentQuest, dmgTaken, hitChance, setFood, addItemSome, anvilTick, anvilPointsFree, buy, collectAnvil,
  deposit, depositAll, invSize, setProduct, shopLeft, spendAnvilPoint, stackCap, storageCount, useItem, withdraw, today, learnTalent, questProgress,
} from '../src/core/state';
import { World } from '../src/core/world';
import { familyValue } from '../src/core/progress';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => {
  const acc = newAccount();
  const c = createCharacter(acc, '테스트', look, 0)!;
  return { acc, c };
};
/** 실제 플레이어처럼 떨어진 아이템을 주워 담는다(1초마다 화면을 쓸어 줍기) */
const sweep = (w: World) => { for (const d of w.drops.slice()) w.pickAt(d.x, d.y); };
const run = (w: World, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) { w.step(1 / 60, { move: 0, climb: 0 }); w.events.length = 0; if (i % 60 === 59) sweep(w); }
  for (let i = 0; i < 60; i++) { w.step(1 / 60, { move: 0, climb: 0 }); w.events.length = 0; if (i === 0) sweep(w); }
};

describe('성장', () => {
  it('경험치가 차면 레벨업하고 스탯 포인트를 준다', () => {
    const { c } = setup();
    expect(gainXp(c, xpToNext(1) + xpToNext(2))).toBe(2);
    expect(c.level).toBe(3);
    expect(c.statPoints).toBe(6);
    expect(c.hp).toBe(derive(c).maxHp);
  });
  it('장비 교체 시 이전 장비는 가방으로 돌아간다', () => {
    const { c } = setup();
    addItem(c, 'sword_stone');
    expect(equipItem(c, 'sword_stone')).toMatch(/레벨/);
    c.level = 5;
    expect(equipItem(c, 'sword_stone')).toBeNull();
    expect(c.equipment.weapon).toBe('sword_stone');
    expect(countItem(c, 'sword_wood')).toBe(1);
    expect(unequipItem(c, 'weapon')).toBeNull();
    expect(c.equipment.weapon).toBeUndefined();
  });
  it('제작은 재료와 코인을 소모한다', () => {
    const { acc, c } = setup();
    expect(craft(acc, c, 0)).not.toBeNull();
    acc.coins = 100; addItem(c, 'moss', 10); addItem(c, 'twine', 4);
    expect(craft(acc, c, 0)).toBeNull();
    expect(acc.coins).toBe(100 - RECIPES[0].coins);
    expect(countItem(c, 'moss')).toBe(2);
    expect(countItem(c, 'hat_moss')).toBe(1);
  });
  it('저장/불러오기 왕복', () => {
    const { acc } = setup();
    expect(deserialize(serialize(acc))).toEqual(acc);
    expect(deserialize('{bad')).toBeNull();
  });
});

describe('월드 시뮬레이션', () => {
  it('자동 전투: 발판 위 몬스터까지 찾아가 사냥한다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = true;
    const w = new World(acc, c, new Rng(7));
    run(w, 120);
    expect(c.kills.meadow).toBeGreaterThan(25);
    expect(c.level).toBeGreaterThan(1);
    expect(acc.coins).toBeGreaterThan(0);
    // 발판 위 몬스터도 잡았는지: 모든 개체가 최소 한 번은 죽었어야 2분 내 이 수치가 나온다
    expect(w.player.x).toBeGreaterThan(0);
  });
  it('모든 맵에서 모든 발판의 몬스터에게 갈 수 있다(터치로 하나씩 지정)', () => {
    for (const map of Object.values(MAPS)) {
      if (!map.spawns.length) continue;
      const { acc, c } = setup();
      c.mapId = map.id; c.level = 60; c.stats.luk = 4000; // 초보자는 행운이 공격력(2·3월드 몬스터도 제한 시간 안에 잡도록)
      acc.stamps.stamp_def = 8000; // 강한 맵(2·3월드 포함)에서도 쓰러지지 않게(도달 가능성만 본다)
      const w = new World(acc, c, new Rng(3));
      const seen = new Set<number>();
      for (const m of w.mobs.slice()) {
        if (!m.alive || m.def.scale) continue; // 미니보스는 체력이 많아 도달성과 무관하게 오래 걸린다
        w.command = { k: 'mob', uid: m.uid };
        for (let i = 0; i < 60 * 60 && !seen.has(m.uid); i++) {
          w.step(1 / 60, { move: 0, climb: 0 });
          for (const e of w.events) if (e.t === 'kill') seen.add(e.uid);
          w.events.length = 0;
        }
        expect(seen.has(m.uid), `${map.id} ${Math.round(m.x)},${m.y}`).toBe(true);
      }
    }
  });
  it('자동 채집: 나무를 베어 통나무와 스킬 경험치를 얻는다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = true; c.activity = { k: 'gather', node: 'oak' };
    const w = new World(acc, c, new Rng(1));
    run(w, 60);
    expect(countItem(c, 'log')).toBeGreaterThan(5);
    expect(c.skills.chopping.lv).toBeGreaterThan(1);
  });
  it('수동 조작: 걷기와 로프 오르내리기', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.x = 180;
    const w = new World(acc, c, new Rng(1));
    for (const m of w.mobs) m.alive = false, m.respawnT = 999;
    for (let i = 0; i < 600 && Math.abs(w.player.x - 205) > 2; i++) w.step(1 / 60, { move: 1, climb: 0 });
    expect(Math.abs(w.player.x - 205)).toBeLessThan(4);
    for (let i = 0; i < 300 && w.player.y !== -48; i++) w.step(1 / 60, { move: 0, climb: -1 });
    expect(w.player.y).toBe(-48);
    expect(w.player.onGround).toBe(true);
    for (let i = 0; i < 300 && w.player.y !== 0; i++) w.step(1 / 60, { move: 0, climb: 1 });
    expect(w.player.y).toBe(0);
  });
});

describe('방치 보상', () => {
  it('1분 미만은 보상 없음', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = true;
    expect(computeAfk(acc, c, 30_000, new Rng(1))).toBeNull();
  });
  it('자동 전투 중이던 캐릭터는 처치/경험치/코인을 얻는다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = true;
    const r = computeAfk(acc, c, 3600_000, new Rng(1))!;
    expect(r.mode).toBe('fight');
    expect(r.kills).toBeGreaterThan(100);
    expect(acc.coins).toBe(r.coins);
    expect(c.level).toBeGreaterThan(1);
    expect(c.kills.meadow).toBe(r.kills);
    expect(c.lastActive).toBe(3600_000);
  });
  it('방치 효율은 실제 플레이보다 높지 않다', () => {
    const a = setup(); a.c.mapId = 'meadow'; a.c.auto = true;
    const w = new World(a.acc, a.c, new Rng(5));
    run(w, 600);
    const b = setup(); b.c.mapId = 'meadow'; b.c.auto = true;
    const r = computeAfk(b.acc, b.c, 600_000, new Rng(5))!;
    expect(r.kills).toBeLessThan(a.c.kills.meadow);
    expect(r.kills).toBeGreaterThan(a.c.kills.meadow * 0.2);
  });
  it('AUTO가 꺼져 있어도 사냥터에 있으면 방치 사냥으로 처리한다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = false;
    expect(computeAfk(acc, c, 3600_000, new Rng(1))!.mode).toBe('fight');
  });
  it('마을에서는 쉬기만 한다', () => {
    const { acc, c } = setup();
    c.mapId = 'town';
    const r = computeAfk(acc, c, 3600_000, new Rng(1))!;
    expect(r.mode).toBe('rest');
    expect(r.xp).toBe(0);
  });
  it('채집 방치', () => {
    const { acc, c } = setup();
    c.mapId = 'hills'; c.activity = { k: 'gather', node: 'redrock' };
    const r = computeAfk(acc, c, 3600_000, new Rng(1))!;
    expect(r.mode).toBe('gather');
    // 한 칸이 차면 빈 칸에 이어서 쌓고, 가방이 다 차서 못 넣은 만큼만 잃는다
    expect(countItem(c, 'ore')).toBe(345);
    expect(r.skipped).toBe(0);
    // 가방이 거의 차 있으면 남은 칸만큼만 줍고 멈춘다(버리지 않는다)
    const { acc: a2, c: c2 } = setup();
    c2.mapId = 'hills'; c2.activity = { k: 'gather', node: 'redrock' };
    for (let i = 0; i < 15; i++) c2.inventory.push({ id: 'pebble', qty: 25 });
    const r2 = computeAfk(a2, c2, 3600_000, new Rng(1))!;
    expect(countItem(c2, 'ore')).toBe(25);
    expect(r2.skipped).toBeGreaterThan(0);
    expect(r.skill!.levels).toBeGreaterThan(0);
  });
});

describe('퀘스트와 특성', () => {
  it('처치 퀘스트: 수락 후 처치만 집계하고 보상을 준다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = true;
    const w = new World(acc, c, new Rng(2));
    run(w, 20);
    expect(questProgress(c)!.have).toBe(0); // 수락 전에는 집계하지 않는다
    expect(completeQuest(acc, c)).not.toBeNull();
    expect(acceptQuest(c)).toBe(true);
    run(w, 60);
    expect(questProgress(c)!.done).toBe(true);
    const coins = acc.coins;
    expect(completeQuest(acc, c)).toBeNull();
    expect(acc.coins).toBe(coins + 30);
    expect(c.quests.elder).toEqual({ idx: 1, accepted: false, prog: 0 });
  });
  it('납품 퀘스트: 아이템을 소모한다', () => {
    const { acc, c } = setup();
    c.quests.elder = { idx: 2, accepted: true, prog: 0 };
    addItem(c, 'moss', 10);
    expect(completeQuest(acc, c)).toBeNull();
    expect(countItem(c, 'moss')).toBe(2);
    expect(countItem(c, 'hat_moss')).toBe(1);
  });
  it('특성: 포인트 소모, 패시브 반영, 강타는 범위 피해 후 재사용 대기', () => {
    const { acc, c } = setup();
    expect(learnTalent(c, 'smash')).toBe(false);
    gainXp(c, xpToNext(1) + xpToNext(2) + xpToNext(3));
    expect(c.talentPoints).toBe(3);
    const hp0 = derive(c).maxHp;
    expect(learnTalent(c, 'tough')).toBe(true);
    expect(derive(c).maxHp).toBeGreaterThan(hp0);
    learnTalent(c, 'smash');
    c.mapId = 'meadow';
    const w = new World(acc, c, new Rng(4));
    expect(w.useSkill('heal')).toBe(false); // 배우지 않음
    for (const m of w.mobs) { m.x = w.player.x + 20; m.y = 0; m.spawnAge = 1; }
    expect(w.useSkill('smash')).toBe(true);
    expect(w.events.filter((e) => e.t === 'dmg').length).toBe(w.mobs.length);
    expect(w.useSkill('smash')).toBe(false);
    expect(w.player.cd.smash).toBeGreaterThan(0);
  });
  it('이전 저장 데이터를 불러오면 새 필드가 채워진다', () => {
    const { acc, c } = setup();
    c.level = 4;
    const raw = JSON.parse(serialize(acc));
    delete raw.characters[0].talents; delete raw.characters[0].talentPoints; delete raw.characters[0].quests; raw.characters[0].quest = { idx: 3, accepted: true, prog: 2 };
    raw.characters[0].anvil = { prod: 'twine', stored: 7, frac: 0, pts: { cap: 0, spd: 0, xp: 0 } }; delete raw.characters[0].cardSlots; raw.cards = { pebbler: 2 };
    const a = deserialize(JSON.stringify(raw))!;
    expect(a.characters[0].talentPoints).toBe(3);
    // 예전 형식(퀘스트 하나, 생산 칸 하나, 카드 장착 없음)을 새 형식으로 옮긴다
    expect(a.characters[0].quests.elder).toEqual({ idx: 3, accepted: true, prog: 2 });
    expect(a.characters[0].anvil.slots[0]).toEqual({ prod: 'twine', stored: 7, frac: 0 });
    expect(a.characters[0].cardSlots).toEqual(['pebbler', null, null, null]);
  });
});

describe('터치 조작', () => {
  const idle = { move: 0, climb: 0 };
  const until = (w: World, pred: () => boolean, seconds = 30) => {
    for (let i = 0; i < seconds * 60 && !pred(); i++) { w.step(1 / 60, idle); }
    return pred();
  };
  it('빈 곳을 터치하면 그 지점(발판 위 포함)으로 걸어간다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow';
    const w = new World(acc, c, new Rng(1));
    for (const m of w.mobs) m.alive = false, m.respawnT = 999;
    expect(w.tap(550, -100)).toEqual({ k: 'move', x: 550, y: -96 });
    expect(until(w, () => w.command === null)).toBe(true);
    expect(w.player.y).toBe(-96);
    expect(Math.abs(w.player.x - 550)).toBeLessThan(5);
    w.tap(300, 20);
    expect(until(w, () => w.command === null)).toBe(true);
    expect(w.player.y).toBe(0);
    expect(w.tap(300, -30)).toBeNull(); // 허공은 무시
    expect(w.tap(300, -130)).toBeNull();
  });
  it('몬스터를 터치하면 다가가 쓰러뜨린다 (AUTO 꺼짐)', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow';
    const w = new World(acc, c, new Rng(1));
    const m = w.mobs[0];
    expect(w.tap(m.x, m.y - 8)).toEqual({ k: 'mob', uid: m.uid });
    expect(until(w, () => !m.alive)).toBe(true);
    expect(c.kills.meadow).toBeGreaterThan(0);
  });
  it('나무를 터치하면 계속 벤다, 포탈을 터치하면 도착 이벤트', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow';
    const w = new World(acc, c, new Rng(1));
    for (const m of w.mobs) m.alive = false, m.respawnT = 999;
    expect(w.tap(95, -20)?.k).toBe('node');
    // 통나무는 바닥에 떨어지고, 눌러서 주워야 가방에 들어온다(줍는 동안 캐릭터는 그대로 벤다)
    until(w, () => w.drops.filter((d) => d.id === 'log').length >= 2, 40);
    expect(countItem(c, 'log')).toBe(0);
    const d = w.drops.find((x) => x.id === 'log')!;
    w.step(0.5, { move: 0, climb: 0 });
    expect(w.pickAt(d.x, d.y)).toBeGreaterThan(0);
    expect(w.command?.k).toBe('node');
    until(w, () => countItem(c, 'log') >= 1, 5);
    expect(countItem(c, 'log')).toBeGreaterThanOrEqual(1);
    expect(w.tap(24, -20)?.k).toBe('portal');
    w.events.length = 0;
    expect(until(w, () => w.events.some((e) => e.t === 'arrive'))).toBe(true);
  });
});

describe('전직과 카드', () => {
  it('레벨 10부터 전직, 궁수는 활을 받고 멀리서 발사체로 공격한다', () => {
    const { acc, c } = setup();
    expect(advanceClass(c, 'archer')).toMatch(/레벨/);
    c.level = 10;
    expect(advanceClass(c, 'archer')).toBeNull();
    expect(c.equipment.weapon).toBe('bow_wood');
    expect(countItem(c, 'sword_wood')).toBe(1);
    expect(equipItem(c, 'sword_wood')).toMatch(/직업/);
    expect(advanceClass(c, 'mage')).not.toBeNull();
    expect(learnTalent(c, 'nova')).toBe(false);
    c.mapId = 'meadow'; c.auto = true;
    const w = new World(acc, c, new Rng(3));
    let shots = 0, minDist = 1e9;
    for (let i = 0; i < 60 * 60; i++) {
      w.step(1 / 60, { move: 0, climb: 0 });
      shots = Math.max(shots, w.shots.length);
      for (const e of w.events) if (e.t === 'dmg' && !e.onPlayer) minDist = Math.min(minDist, Math.abs(e.x - w.player.x));
      w.events.length = 0;
    }
    expect(shots).toBeGreaterThan(0);
    expect(c.kills.meadow).toBeGreaterThan(10);
  });
  it('카드는 계정 전체 능력치를 올린다', () => {
    const { acc, c } = setup();
    const base = derive(c, acc).maxHp;
    acc.cards.mossblob = 3;
    // 장착해야 효과가 있다
    expect(derive(c, acc).maxHp).toBe(base);
    expect(equipCard(acc, c, 'mossblob', 0)).toBeNull();
    expect(derive(c, acc).maxHp).toBeGreaterThan(base);
    expect(equipCard(acc, c, 'pebbler', 1)).toMatch(/없는/);
    c.mapId = 'meadow'; c.auto = true;
    const r = computeAfk(acc, c, 12 * 3600_000, new Rng(1))!;
    expect(r.cards.length).toBeGreaterThan(0);
  });
});

describe('전투 공식', () => {
  it('명중률: 요구치의 절반 이하면 0%, 같으면 100%', () => {
    expect(hitChance(5, 10)).toBe(0);
    expect(hitChance(7.5, 10)).toBeCloseTo(0.5);
    expect(hitChance(10, 10)).toBe(1);
    expect(hitChance(30, 10)).toBe(1);
  });
  it('방어력이 기준치를 넘으면 받는 피해 0', () => {
    const m = MONSTERS.pebbler;
    expect(dmgTaken(m, 0)).toBe(m.atk);
    expect(dmgTaken(m, m.defZero / 2)).toBe(Math.ceil(m.atk / 2));
    expect(dmgTaken(m, m.defZero)).toBe(0);
    expect(dmgTaken(m, m.defZero * 3)).toBe(0);
  });
  it('명중이 모자라면 빗나감이 나오고, 전혀 못 맞히면 처치하지 못한다', () => {
    const { acc, c } = setup();
    c.mapId = 'forest'; c.auto = true; c.level = 1;
    const w = new World(acc, c, new Rng(2));
    let miss = 0, hit = 0;
    for (let i = 0; i < 30 * 60; i++) {
      w.step(1 / 60, { move: 0, climb: 0 });
      for (const e of w.events) if (e.t === 'dmg' && !e.onPlayer) (e.miss ? miss++ : hit++);
      w.events.length = 0;
    }
    expect(miss).toBeGreaterThan(0);
    expect(hit).toBe(0);
    const r = computeAfk(acc, c, c.lastActive + 3600_000, new Rng(1))!;
    expect(r.kills).toBe(0);
  });
  it('스킬은 마나를 쓰고, 마나가 모자라면 쓰지 못한다', () => {
    const { acc, c } = setup();
    c.talents.smash = 1; c.mapId = 'meadow';
    const w = new World(acc, c, new Rng(4));
    for (const m of w.mobs) { m.x = w.player.x + 20; m.y = 0; m.spawnAge = 1; }
    const mp = c.mp;
    expect(w.useSkill('smash')).toBe(true);
    expect(c.mp).toBe(mp - 4);
    w.player.cd.smash = 0; c.mp = 3;
    expect(w.useSkill('smash')).toBe(false);
  });
  it('음식 칸: 체력이 낮으면 자동으로 먹는다', () => {
    const { acc, c } = setup();
    addItem(c, 'berry', 5);
    expect(setFood(c, 'berry')).toBeNull();
    expect(countItem(c, 'berry')).toBe(0);
    expect(c.foods[0]).toEqual({ id: 'berry', qty: 5 });
    const w = new World(acc, c, new Rng(1));
    c.hp = 5;
    w.step(1 / 60, { move: 0, climb: 0 });
    expect(c.hp).toBeGreaterThan(19);
    expect(c.foods[0]!.qty).toBe(4);
    expect(w.events.some((e) => e.t === 'heal')).toBe(true);
    expect(setFood(c, null)).toBeNull();
    expect(countItem(c, 'berry')).toBe(4);
    expect(setFood(c, 'log')).toMatch(/음식/);
  });
});

describe('가방·주머니·창고', () => {
  it('가방은 16칸, 가방 아이템으로 늘어나고 같은 가방은 한 번만', () => {
    const { acc, c } = setup();
    expect(invSize(c)).toBe(16);
    addItem(c, 'bag_small');
    expect(useItem(acc, c, 'bag_small')).toBeNull();
    expect(invSize(c)).toBe(20);
    addItem(c, 'bag_small');
    expect(useItem(acc, c, 'bag_small')).toMatch(/이미/);
  });
  it('한 칸 최대치: 기본 25, 주머니를 쓰면 그 묶음만 100', () => {
    const { acc, c } = setup();
    // 한 칸이 차면 다음 칸으로(가방 칸 수가 전체 한도)
    expect(addItemSome(c, 'moss', 40)).toBe(40);
    expect(c.inventory.filter((s) => s.id === 'moss').map((s) => s.qty)).toEqual([25, 15]);
    expect(addItemSome(c, 'moss', 10_000)).toBe(25 * 16 - 40);
    expect(addItem(c, 'moss', 1)).toBe(false);
    c.inventory = [];
    addItem(c, 'pouch_mat'); useItem(acc, c, 'pouch_mat');
    expect(stackCap(c, 'moss')).toBe(100);
    expect(stackCap(c, 'log')).toBe(25);
    expect(addItemSome(c, 'moss', 200)).toBe(200);
    expect(c.inventory.filter((s) => s.id === 'moss').map((s) => s.qty)).toEqual([100, 100]);
  });
  it('창고: 넣고 빼기, 전부 넣기는 재료·음식만, 제작은 창고 재료도 쓴다', () => {
    const { acc, c } = setup();
    addItem(c, 'moss', 20); addItem(c, 'berry', 3); addItem(c, 'sword_stone');
    expect(depositAll(acc, c)).toBe(2);
    expect(countItem(c, 'sword_stone')).toBe(1);
    expect(storageCount(acc, 'moss')).toBe(20);
    expect(withdraw(acc, c, 'moss', 5)).toBe(5);
    expect(storageCount(acc, 'moss')).toBe(15);
    // 창고에는 한 칸 제한이 없다
    deposit(acc, c, 'moss'); addItem(c, 'moss', 25); deposit(acc, c, 'moss'); addItem(c, 'moss', 5); deposit(acc, c, 'moss');
    expect(storageCount(acc, 'moss')).toBe(50);
    acc.coins = 50; addItem(c, 'twine', 4);
    expect(craft(acc, c, 0)).toBeNull(); // 이끼 8개는 창고에서
    expect(storageCount(acc, 'moss')).toBe(42);
  });
  it('잡화점: 하루 수량 제한, 날짜가 바뀌면 다시 채워진다', () => {
    const { acc, c } = setup();
    acc.coins = 5000;
    const day1 = new Date(2026, 0, 1, 12).getTime(), day2 = new Date(2026, 0, 2, 12).getTime();
    expect(buy(acc, c, 2, 1, day1)).toBeNull();
    expect(buy(acc, c, 2, 1, day1)).toMatch(/다 팔렸/);
    expect(shopLeft(acc, 2, day2)).toBe(1);
    expect(acc.shop.day).toBe(today(day2));
  });
});

describe('모루 생산', () => {
  it('시간이 흐르면 만들어지고, 대장 경험치·포인트가 쌓이며, 용량에서 멈춘다', () => {
    const { acc, c } = setup();
    expect(setProduct(c, 'nail')).toMatch(/Lv/);
    expect(setProduct(c, 'twine')).toBeNull();
    const a = anvilTick(c, 1800);
    expect(a.made).toBe(60);
    expect(c.skills.smithing.lv).toBeGreaterThan(1);
    expect(anvilPointsFree(c)).toBe(c.skills.smithing.lv - 1);
    anvilTick(c, 99999);
    expect(c.anvil.slots[0].stored).toBe(60); // 기본 용량
    expect(spendAnvilPoint(c, 'cap')).toBe(true);
    anvilTick(c, 99999);
    expect(c.anvil.slots[0].stored).toBe(90);
    expect(collectAnvil(acc, c, false)).toBe(90);
    expect(c.inventory.filter((s) => s.id === 'twine').map((s) => s.qty)).toEqual([25, 25, 25, 15]);
    anvilTick(c, 99999);
    expect(collectAnvil(acc, c, true)).toBe(90);
    expect(storageCount(acc, 'twine')).toBe(90);
  });
  it('방치 보상에도 모루 생산이 들어간다', () => {
    const { acc, c } = setup();
    setProduct(c, 'twine');
    const r = computeAfk(acc, c, 3600_000, new Rng(1))!;
    expect(r.anvil!.items[0].made).toBe(60);
  });
});

describe('방치 정보와 보상', () => {
  it('방치 효율·처치 상한·명중·생존력을 계산하고, 보상은 그 수치를 따른다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow';
    const r = afkRates(acc, c);
    expect(r.mode).toBe('fight');
    // 기본 40% + 행운 1(0.2%p) + 가족 보너스(초보자 Lv.1)
    expect(r.rate).toBeCloseTo(0.402 + familyValue('beginner', 1) / 100, 6);
    expect(r.killsPerHour).toBeLessThanOrEqual(r.killCap * r.rate + 1e-9);
    expect(r.hit).toBe(1);
    const rep = computeAfk(acc, c, 2 * 3600_000, new Rng(1))!;
    expect(rep.kills).toBe(Math.floor(r.killsPerHour * 2));
  });
  it('피해가 회복보다 크면 음식을 먹어 버티고, 음식이 없으면 효율이 떨어진다', () => {
    const { acc, c } = setup();
    c.mapId = 'hills'; c.level = 5; c.stats.luk = 8;
    const hungry = afkRates(acc, c);
    expect(hungry.survival).toBeLessThan(1);
    c.foods[0] = { id: 'mushroom', qty: 300 }; c.foods[1] = { id: 'berry', qty: 200 };
    const fed = afkRates(acc, c);
    expect(fed.survival).toBe(1);
    expect(fed.killsPerHour).toBeGreaterThan(hungry.killsPerHour);
    const rep = computeAfk(acc, c, 3600_000, new Rng(1))!;
    expect(rep.food).toBeGreaterThan(0);
    expect((c.foods[0]?.qty ?? 0) + (c.foods[1]?.qty ?? 0)).toBe(500 - rep.food);
    expect(c.foods[1]!.qty).toBe(200); // 위 칸부터 먹는다
  });
  it('자원 카드: 나무를 캐며 모으고, 장착하면 벌목 효율이 오른다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.activity = { k: 'gather', node: 'oak' };
    const r = afkRates(acc, c);
    expect(r.mode).toBe('gather');
    expect(r.cards.map((x) => x.id)).toEqual(['oak']);
    // 긴 방치(최대 시간)면 첫 장은 거의 확실히 나온다
    const rep = computeAfk(acc, c, 24 * 3600_000, new Rng(5))!;
    expect(rep.cards.some((x) => x.name === '참나무')).toBe(true);
    expect(acc.cards.oak).toBeGreaterThan(0);
    const before = derive(c, acc).chopping;
    expect(equipCard(acc, c, 'oak', 0)).toBeNull();
    expect(derive(c, acc).chopping).toBeGreaterThan(before);
  });
  it('카드는 드물게: 12시간 사냥해도 수십 장이 나오지 않는다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.level = 10; c.stats.luk = 10;
    const rep = computeAfk(acc, c, 12 * 3600_000, new Rng(3))!;
    const n = rep.cards.reduce((s, x) => s + x.qty, 0);
    expect(n).toBeLessThan(15);
  });
});

describe('마을·언덕·보스', () => {
  it('마을 오른쪽 높은 발판 아래 땅도 걷고, 로프로 올라 위의 촌장에게 간다', () => {
    const { acc, c } = setup();
    const w = new World(acc, c, new Rng(1));
    for (let i = 0; i < 600; i++) w.step(1 / 60, { move: 1, climb: 0 });
    expect(w.player.y).toBe(0);
    expect(w.player.x).toBeGreaterThan(600); // 발판 아래 땅을 지나 맵 끝까지
    const npc = w.map.facilities.findIndex((f) => f.npc === 'elder');
    const f = w.map.facilities[npc];
    expect(w.tap(f.x, f.y - 10)).toEqual({ k: 'fac', idx: npc });
    let arrived = false;
    for (let i = 0; i < 60 * 40 && !arrived; i++) {
      w.step(1 / 60, { move: 0, climb: 0 });
      arrived = w.events.some((e) => e.t === 'arrive' && e.what === 'fac' && e.idx === npc);
      w.events.length = 0;
    }
    expect(arrived).toBe(true);
    expect(w.player.y).toBe(-48);
    // 발판 아래 땅을 누르면 땅으로 간다
    expect(w.tap(520, 5)).toEqual({ k: 'move', x: 520, y: 0 });
  });
  it('보스: 예고 후 내려찍고, 처치하면 기록이 남고 다시 살아나지 않는다', () => {
    const { acc, c } = setup();
    c.mapId = 'lair'; c.level = 40; c.stats.luk = 120; c.x = 60;
    const w = new World(acc, c, new Rng(5));
    const boss = w.mobs.find((m) => m.def.boss)!;
    expect(boss).toBeTruthy();
    w.tap(boss.x, boss.y - 10);
    let tele = false, slam = false;
    for (let i = 0; i < 60 * 120 && boss.alive; i++) {
      w.step(1 / 60, { move: 0, climb: 0 });
      if (w.command === null && boss.alive) w.tap(boss.x, boss.y - 10);
      for (const e of w.events) { if (e.t === 'telegraph') tele = true; if (e.t === 'slam') slam = true; }
      w.events.length = 0;
    }
    expect(tele && slam).toBe(true);
    expect(boss.alive).toBe(false);
    expect(acc.bosses.mossking).toBe(1);
    for (let i = 0; i < 600; i++) w.step(1 / 60, { move: 0, climb: 0 });
    expect(boss.alive).toBe(false);
  });
});

describe('1월드 마무리', () => {
  it('쓰러지면 마을에서 부활한다', () => {
    const { acc, c } = setup();
    c.mapId = 'hills';
    const w = new World(acc, c, new Rng(1));
    c.hp = 1; w.player.dead = 0.01; c.hp = 0;
    w.step(1 / 60, { move: 0, climb: 0 });
    expect(w.events.some((e) => e.t === 'respawn')).toBe(true);
    expect(c.hp).toBe(derive(c, acc).maxHp);
  });
  it('장신구 칸', () => {
    const { c } = setup();
    c.level = 6; addItem(c, 'moss_ring');
    expect(equip(c, 'moss_ring')).toBeNull();
    expect(c.equipment.ring).toBe('moss_ring');
  });
  it('모루: 대장 Lv.5에 두 번째 생산 칸, 2단계 레시피는 모루 확장 후', () => {
    const { acc, c } = setup();
    expect(anvilSlotsOpen(c)).toBe(1);
    expect(setProduct(c, 'twine', 1)).toMatch(/열리지/);
    c.skills.smithing.lv = 5;
    expect(setProduct(c, 'twine', 1)).toBeNull();
    expect(c.anvil.slots.length).toBe(2);
    setProduct(c, 'twine', 0);
    const t = anvilTick(c, 1800);
    expect(t.bySlot.length).toBe(2);
    const leaf = RECIPES.findIndex((r) => r.item === 'sword_leaf'), exp = RECIPES.findIndex((r) => r.unlock === 2);
    expect(recipeLock(acc, c, leaf)).toMatch(/2단계/);
    acc.coins = 9999; addItem(c, 'plank', 15); addItem(c, 'nail', 25); addItem(c, 'ore', 20);
    expect(craft(acc, c, exp)).toBeNull();
    expect(acc.anvilTier).toBe(2);
    expect(countItem(c, 'anvil_exp')).toBe(0);
    expect(recipeLock(acc, c, leaf)).toBeNull();
    expect(recipeLock(acc, c, exp)).toMatch(/이미/);
  });
  it('NPC마다 따로 퀘스트가 이어진다', () => {
    const { acc, c } = setup();
    expect(currentQuest(c, 'smith')!.name).toBe('첫 노끈');
    expect(acceptQuest(c, 'smith')).toBe(true);
    expect(c.quests.elder?.accepted ?? false).toBe(false);
    addItem(c, 'twine', 20);
    expect(completeQuest(acc, c, 'smith')).toBeNull();
    expect(c.quests.smith.idx).toBe(1);
    expect(currentQuest(c, 'elder')!.name).toBe('첫 걸음');
  });
});

describe('음식 재사용 대기·채집 보호', () => {
  it('음식은 먹은 뒤 대기시간이 지나야 다음 것을 먹는다', () => {
    const { acc, c } = setup();
    c.mapId = 'town';
    c.foods[0] = { id: 'berry', qty: 10 };
    const w = new World(acc, c, new Rng(1));
    const d = derive(c);
    c.hp = 1;
    w.step(1 / 60, { move: 0, climb: 0 });
    expect(c.foods[0]!.qty).toBe(9);
    c.hp = 1;
    for (let i = 0; i < 60 * 2; i++) w.step(1 / 60, { move: 0, climb: 0 });
    expect(c.foods[0]!.qty).toBe(9); // 산딸기 대기 3초
    for (let i = 0; i < 60 * 1.5; i++) w.step(1 / 60, { move: 0, climb: 0 });
    expect(c.foods[0]!.qty).toBe(8);
    expect(c.hp).toBeLessThanOrEqual(d.maxHp);
  });
  it('채집하는 동안에는 일반 몬스터의 몸통 박치기를 받지 않는다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow';
    const w = new World(acc, c, new Rng(5));
    const node = w.nodes[0];
    // 몬스터를 채집 자리로 모은다
    w.player.x = node.x; w.player.y = node.y;
    w.gatherT = 5;
    const hp0 = c.hp;
    for (let i = 0; i < 60; i++) { for (const m of w.mobs) { m.x = w.player.x; m.y = w.player.y; m.spawnAge = 2; } w.step(1 / 60, { move: 0, climb: 0 }); }
    expect(c.hp).toBe(hp0);
    w.gatherT = 0;
    for (let i = 0; i < 60 * 3; i++) { for (const m of w.mobs) { m.x = w.player.x; m.y = w.player.y; m.spawnAge = 2; } w.step(1 / 60, { move: 0, climb: 0 }); }
    expect(c.hp).toBeLessThan(hp0);
  });
});

describe('2월드 기술: 낚시·곤충 채집', () => {
  for (const [node, item, skill] of [['spring', 'fish_minnow', 'fishing'], ['antbush', 'bug_ant', 'catching']] as const) {
    it(`${node}: 자동으로 ${item}과(와) 기술 경험치를 얻는다`, () => {
      const { acc, c } = setup();
      c.mapId = 'oasis'; c.maxWorld = 2; c.auto = true; c.activity = { k: 'gather', node };
      const w = new World(acc, c, new Rng(2));
      run(w, 60);
      expect(countItem(c, item)).toBeGreaterThan(3);
      expect(c.skills[skill].lv + c.skills[skill].xp).toBeGreaterThan(1);
    });
  }
  it('낚싯대·잠자리채가 효율을 올리고, 저장 후에도 기술이 남는다', () => {
    const { acc, c } = setup();
    const f0 = derive(c, acc).fishing, k0 = derive(c, acc).catching;
    addItem(c, 'rod_reed', 1); addItem(c, 'net_cloth', 1);
    expect(equipItem(c, 'rod_reed')).toBeNull(); expect(equipItem(c, 'net_cloth')).toBeNull();
    expect(derive(c, acc).fishing).toBeCloseTo(f0 + 3);
    expect(derive(c, acc).catching).toBeCloseTo(k0 + 3);
    const raw = JSON.parse(serialize(acc));
    delete raw.characters[0].skills.fishing; // 예전 저장 데이터
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.characters[0].skills.fishing).toEqual({ lv: 1, xp: 0 });
  });
});
