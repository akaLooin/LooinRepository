import { describe, expect, it } from 'vitest';
import { computeAfk } from '../src/core/afk';
import { MAPS, RECIPES } from '../src/core/data';
import { Rng } from '../src/core/rng';
import {
  addItem, countItem, craft, createCharacter, derive, deserialize, equipItem, gainXp, newAccount, serialize,
  unequipItem, xpToNext, acceptQuest, advanceClass, completeQuest, learnTalent, questProgress,
} from '../src/core/state';
import { World } from '../src/core/world';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => {
  const acc = newAccount();
  const c = createCharacter(acc, '테스트', look, 0)!;
  return { acc, c };
};
const run = (w: World, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) { w.step(1 / 60, { move: 0, jump: false, down: false }); w.events.length = 0; }
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
    acc.coins = 100; addItem(c, 'moss', 10);
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
    c.mapId = 'meadow'; c.auto = true; c.mode = 'fight';
    const w = new World(acc, c, new Rng(7));
    run(w, 120);
    expect(c.kills.meadow).toBeGreaterThan(25);
    expect(c.level).toBeGreaterThan(1);
    expect(acc.coins).toBeGreaterThan(0);
    // 발판 위 몬스터도 잡았는지: 모든 개체가 최소 한 번은 죽었어야 2분 내 이 수치가 나온다
    expect(w.player.x).toBeGreaterThan(0);
  });
  it('자동 전투: 모든 맵에서 모든 발판에 도달할 수 있다', () => {
    for (const map of Object.values(MAPS)) {
      if (!map.spawns.length) continue;
      const { acc, c } = setup();
      c.mapId = map.id; c.auto = true; c.level = 60; c.stats.str = 200;
      const w = new World(acc, c, new Rng(3));
      const seen = new Set<number>();
      for (let i = 0; i < 180 * 60; i++) {
        w.step(1 / 60, { move: 0, jump: false, down: false });
        for (const e of w.events) if (e.t === 'kill') seen.add(e.uid);
        w.events.length = 0;
      }
      expect(seen.size, map.id).toBe(w.mobs.length);
    }
  });
  it('자동 채집: 나무를 베어 통나무와 스킬 경험치를 얻는다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = true; c.mode = 'gather';
    const w = new World(acc, c, new Rng(1));
    run(w, 60);
    expect(countItem(c, 'log')).toBeGreaterThan(5);
    expect(c.skills.chopping.lv).toBeGreaterThan(1);
  });
  it('수동 조작: 이동과 점프', () => {
    const { acc, c } = setup();
    const w = new World(acc, c, new Rng(1));
    const x0 = w.player.x;
    for (let i = 0; i < 30; i++) w.step(1 / 60, { move: 1, jump: i === 0, down: false });
    expect(w.player.x).toBeGreaterThan(x0 + 20);
    expect(w.player.y).toBeLessThan(0);
    run(w, 2);
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
    c.mapId = 'meadow'; c.auto = true; c.mode = 'fight';
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
  it('자동이 꺼진 캐릭터는 쉬기만 한다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = false;
    const r = computeAfk(acc, c, 3600_000, new Rng(1))!;
    expect(r.mode).toBe('rest');
    expect(r.xp).toBe(0);
  });
  it('채집 방치', () => {
    const { acc, c } = setup();
    c.mapId = 'hills'; c.auto = true; c.mode = 'gather';
    const r = computeAfk(acc, c, 3600_000, new Rng(1))!;
    expect(r.mode).toBe('gather');
    expect(countItem(c, 'ore')).toBeGreaterThan(50);
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
    expect(c.quest).toEqual({ idx: 1, accepted: false, prog: 0 });
  });
  it('납품 퀘스트: 아이템을 소모한다', () => {
    const { acc, c } = setup();
    c.quest = { idx: 2, accepted: true, prog: 0 };
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
    delete raw.characters[0].talents; delete raw.characters[0].talentPoints; delete raw.characters[0].quest;
    const a = deserialize(JSON.stringify(raw))!;
    expect(a.characters[0].talentPoints).toBe(3);
    expect(a.characters[0].quest.idx).toBe(0);
  });
});

describe('터치 조작', () => {
  const idle = { move: 0, jump: false, down: false };
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
    until(w, () => countItem(c, 'log') >= 2, 40);
    expect(countItem(c, 'log')).toBeGreaterThanOrEqual(2);
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
      w.step(1 / 60, { move: 0, jump: false, down: false });
      shots = Math.max(shots, w.shots.length);
      for (const e of w.events) if (e.t === 'dmg' && !e.onPlayer) minDist = Math.min(minDist, Math.abs(e.x - w.player.x));
      w.events.length = 0;
    }
    expect(shots).toBeGreaterThan(0);
    expect(c.kills.meadow).toBeGreaterThan(10);
  });
  it('카드는 계정 전체 능력치를 올린다', () => {
    const { acc, c } = setup();
    const base = derive(c, acc.cards).maxHp;
    acc.cards.mossblob = 3;
    expect(derive(c, acc.cards).maxHp).toBeGreaterThan(base);
    c.mapId = 'meadow'; c.auto = true;
    const r = computeAfk(acc, c, 12 * 3600_000, new Rng(1))!;
    expect(r.cards.length).toBeGreaterThan(0);
  });
});
