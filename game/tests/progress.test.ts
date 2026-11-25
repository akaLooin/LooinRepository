import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { CARD_PRESET_LV, CARD_SETS, FAMILY_SLOTS, SIGN_LV, statueNeed } from '../src/core/data';
import { charSlots, setTier, statueLevel } from '../src/core/progress';
import { addItem, createCharacter, derive, deserialize, newAccount, serialize, tabFree as tFree } from '../src/core/state';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => { const acc = newAccount(); createCharacter(acc, '테스트', look, 0); return { acc, c: acc.characters[0] }; };

describe('석상', () => {
  it('조각 도구로 받침을 열고, 조각을 바치면 이 캐릭터만 강해진다', () => {
    const { acc, c } = setup();
    addItem(c, 'statue_str', statueNeed(0) + statueNeed(1));
    expect(applyAction(acc, 0, { t: 'statue', id: 'str' }, 0).ok).toBe(false);
    addItem(c, 'sculpt_tools', 1);
    expect(applyAction(acc, 0, { t: 'use', id: 'sculpt_tools' }, 0).ok).toBe(true);
    expect(acc.statuesOpen).toBe(true);
    const str0 = derive(c, acc).str;
    expect(applyAction(acc, 0, { t: 'statue', id: 'str' }, 0).n).toBe(statueNeed(0) + statueNeed(1));
    expect(statueLevel(c.statues.str).lv).toBe(2);
    expect(derive(c, acc).str).toBe(str0 + 2);
    createCharacter(acc, '둘째', look, 0);
    expect(acc.characters[1].statues.str ?? 0).toBe(0);
  });
});

describe('별자리', () => {
  it('그 맵에서 조건을 채우면 별 포인트, 별자리를 열고 캐릭터마다 정렬', () => {
    const { acc, c } = setup();
    c.level = SIGN_LV; c.mapId = 'town';
    expect(applyAction(acc, 0, { t: 'star', id: 'meadow1' }, 0).err).toMatch(/그 맵/);
    c.mapId = 'meadow';
    expect(applyAction(acc, 0, { t: 'star', id: 'meadow1' }, 0).ok).toBe(true);
    expect(acc.starPoints).toBe(1);
    expect(applyAction(acc, 0, { t: 'star', id: 'meadow1' }, 0).ok).toBe(false);
    const luk0 = derive(c, acc).luk;
    expect(applyAction(acc, 0, { t: 'signOpen', id: 'wanderer' }, 0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'sign', id: 'wanderer' }, 0).ok).toBe(true);
    expect(derive(c, acc).luk).toBe(luk0 + 4);
  });
});

describe('업적·가족·카드 세트', () => {
  it('업적은 조건을 채우면 받고 영구 보너스', () => {
    const { acc, c } = setup();
    expect(applyAction(acc, 0, { t: 'achieve', id: 'lv10' }, 0).ok).toBe(false);
    c.level = 10;
    const d0 = derive(c, acc).dmg;
    expect(applyAction(acc, 0, { t: 'achieve', id: 'lv10' }, 0).ok).toBe(true);
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
  });
  it('가족 레벨로 캐릭터 칸이 늘어난다(기본 2칸)', () => {
    const { acc, c } = setup();
    expect(charSlots(acc)).toBe(2);
    createCharacter(acc, '둘째', look, 0);
    expect(createCharacter(acc, '셋째', look, 0)).toBeNull();
    c.level = FAMILY_SLOTS[0];
    expect(createCharacter(acc, '셋째', look, 0)).not.toBeNull();
  });
  it('카드 세트는 별 합계로 단계가 오르고, 켜야 효과. 프리셋은 장착을 바꿔 끼운다', () => {
    const { acc, c } = setup();
    acc.cards = { mossblob: 3, pebbler: 1, oak: 1 };
    expect(setTier(acc, CARD_SETS[0])).toBe(1);
    const afk0 = derive(c, acc).afkFight;
    expect(applyAction(acc, 0, { t: 'cardSet', id: 'w1' }, 0).ok).toBe(true);
    expect(derive(c, acc).afkFight).toBeGreaterThan(afk0);
    applyAction(acc, 0, { t: 'cardOn', card: 'mossblob' }, 0);
    expect(applyAction(acc, 0, { t: 'cardPreset', i: 1 }, 0).err).toMatch(/Lv/);
    c.level = CARD_PRESET_LV;
    expect(applyAction(acc, 0, { t: 'cardPreset', i: 1 }, 0).ok).toBe(true);
    expect(c.cardSlots.filter(Boolean)).toHaveLength(0);
    applyAction(acc, 0, { t: 'cardOn', card: 'oak' }, 0);
    applyAction(acc, 0, { t: 'cardPreset', i: 0 }, 0);
    expect(c.cardSlots[0]).toBe('mossblob');
  });
  it('예전 저장을 새 형식으로', () => {
    const { acc } = setup();
    const raw = JSON.parse(serialize(acc));
    for (const k of ['statuesOpen', 'stars', 'starPoints', 'signs', 'achievements']) delete raw[k];
    for (const k of ['statues', 'sign', 'cardSet', 'cardPresets', 'cardPreset']) delete raw.characters[0][k];
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.signs).toEqual([]); expect(back.characters[0].cardPresets).toHaveLength(2);
  });
});

import { CLASS_LEVEL, SUBCLASS_LEVEL } from '../src/core/data';
describe('2차 전직·음식 칸·장비 칸', () => {
  it('1차 직업에서 Lv.30이면 그 갈래의 2차 직업으로, 2차 특성을 올릴 수 있다', () => {
    const { acc, c } = setup();
    c.level = CLASS_LEVEL;
    expect(applyAction(acc, 0, { t: 'class', cls: 'guardian' }, 0).ok).toBe(false);
    expect(applyAction(acc, 0, { t: 'class', cls: 'warrior' }, 0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'class', cls: 'guardian' }, 0).err).toMatch(/레벨/);
    c.level = SUBCLASS_LEVEL;
    expect(applyAction(acc, 0, { t: 'class', cls: 'ranger' }, 0).ok).toBe(false); // 다른 갈래
    const hp0 = derive(c, acc).maxHp;
    expect(applyAction(acc, 0, { t: 'class', cls: 'guardian' }, 0).ok).toBe(true);
    expect(derive(c, acc).maxHp).toBeGreaterThan(hp0);
    c.talentPoints = 3;
    expect(applyAction(acc, 0, { t: 'talent', id: 'bulwark' }, 0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'talent', id: 'cleave' }, 0).ok).toBe(true); // 1차 특성도 계속
    expect(applyAction(acc, 0, { t: 'talent', id: 'frenzy' }, 0).ok).toBe(false); // 다른 2차
  });
  it('음식은 칸마다 넣고, 같은 음식은 한 칸에 합친다', () => {
    const { acc, c } = setup();
    addItem(c, 'berry', 5);
    expect(applyAction(acc, 0, { t: 'food', id: 'berry', slot: 1 }, 0).ok).toBe(true);
    addItem(c, 'berry', 3);
    expect(applyAction(acc, 0, { t: 'food', id: 'berry', slot: 2 }, 0).ok).toBe(true);
    expect(c.foods[1]).toEqual({ id: 'berry', qty: 8 });
    expect(c.foods[2]).toBeNull();
  });
  it('바지·신발·트로피 칸에 장착', () => {
    const { acc, c } = setup();
    addItem(c, 'pants_moss', 1); addItem(c, 'trophy_moss', 1);
    expect(applyAction(acc, 0, { t: 'equip', id: 'pants_moss' }, 0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'equip', id: 'trophy_moss' }, 0).ok).toBe(true);
    expect(c.equipment.legs).toBe('pants_moss'); expect(c.equipment.trophy).toBe('trophy_moss');
  });
});

import { TALENT_PRESET_LV } from '../src/core/data';
describe('특성 프리셋', () => {
  it('배분과 공격 바를 두 벌로 저장해 바꿔 끼우고, 포인트 합은 그대로', () => {
    const { acc, c } = setup();
    c.level = TALENT_PRESET_LV;
    const pool = tFree(c, 0);
    applyAction(acc, 0, { t: 'talent', id: 'smash' }, 0); applyAction(acc, 0, { t: 'talent', id: 'smash' }, 0);
    applyAction(acc, 0, { t: 'barSet', bar: 0, slot: 0, id: 'smash' }, 0);
    expect(applyAction(acc, 0, { t: 'talentPreset', i: 1 }, 0).ok).toBe(true);
    expect(c.talents).toEqual({}); expect(tFree(c, 0)).toBe(pool); expect(c.attackBars[0][0]).toBeNull();
    applyAction(acc, 0, { t: 'talent', id: 'heal' }, 0);
    expect(applyAction(acc, 0, { t: 'talentPreset', i: 0 }, 0).ok).toBe(true);
    expect(c.talents.smash).toBe(2); expect(tFree(c, 0)).toBe(pool - 2); expect(c.attackBars[0][0]).toBe('smash');
  });
});

import { mapUnlocked } from '../src/core/state';
describe('1월드 확장 맵', () => {
  it('숲 다음 다섯 사냥터는 처치 수로, 광산은 채광 레벨로 열린다', () => {
    const { acc, c } = setup();
    c.kills = { meadow: 15, hills: 40, forest: 120 };
    expect(mapUnlocked(c, 'swamp')).toBe(true);
    expect(mapUnlocked(c, 'cave')).toBe(false);
    expect(mapUnlocked(c, 'mine1')).toBe(false);
    c.skills.mining.lv = 5;
    expect(mapUnlocked(c, 'mine1')).toBe(true);
    expect(mapUnlocked(c, 'mine2')).toBe(false);
    c.mapId = 'hills';
    expect(applyAction(acc, 0, { t: 'travel', portal: 2 }, 0).ok).toBe(true);
    expect(c.mapId).toBe('mine1');
    expect(applyAction(acc, 0, { t: 'travel', portal: 1 }, 0).err).toMatch(/채광 Lv/);
  });
});

import { ARENA, MAPS, MINIBOSSES, arenaWaves } from '../src/core/data';
import { minibossKey, minibossOpen } from '../src/core/state';
import { Rng } from '../src/core/rng';
import { World } from '../src/core/world';
describe('콜로세움·미니보스', () => {
  it('입장권으로 들어가 웨이브를 깨고, 깬 웨이브만큼 보상을 받고 풀밭으로', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.level = 60; c.stats.luk = 300; acc.stamps.stamp_def = 400;
    const portal = MAPS.meadow.portals.findIndex((p) => p.to === 'arena');
    expect(applyAction(acc, 0, { t: 'travel', portal }, 0).err).toMatch(/열쇠/);
    addItem(c, 'arena_ticket', 1);
    expect(applyAction(acc, 0, { t: 'travel', portal }, 0).ok).toBe(true);
    expect(c.arenaStart).toBe(0);
    const w = new World(acc, c, new Rng(2));
    let end: { waves: number; score: number } | null = null;
    c.auto = true;
    for (let i = 0; i < (ARENA.seconds + 5) * 60 && !end; i++) { w.step(1 / 60, { move: 0, climb: 0 }); for (const e of w.events) if (e.t === 'arenaEnd') end = e; w.events.length = 0; }
    expect(end).not.toBeNull();
    expect(end!.waves).toBe(arenaWaves(c.kills.arena));
    expect(end!.waves).toBeGreaterThanOrEqual(3);
    const coins = acc.coins;
    expect(applyAction(acc, 0, { t: 'arenaClaim' }, 0).n).toBe(end!.waves);
    expect(acc.coins).toBeGreaterThan(coins);
    expect(c.mapId).toBe('meadow');
    expect(applyAction(acc, 0, { t: 'arenaClaim' }, 0).ok).toBe(false); // 두 번은 안 된다
  });
  it('미니보스: 매시 정각부터 정해진 분까지, 잡으면 그 회차에는 다시 안 나온다', () => {
    const { acc } = setup();
    const mb = MINIBOSSES.find((m) => m.when === 'hourly')!;
    const open = new Date('2026-11-24T10:05:00').getTime(), late = new Date('2026-11-24T10:40:00').getTime();
    expect(minibossOpen(acc, mb.id, open)).toBe(true);
    expect(minibossOpen(acc, mb.id, late)).toBe(false);
    acc.miniKills[mb.id] = minibossKey(mb.id, open);
    expect(minibossOpen(acc, mb.id, open + 60_000)).toBe(false);
    expect(minibossOpen(acc, mb.id, open + 3600_000)).toBe(true);
  });
});

import { owlCost } from '../src/core/companions';
import { PETS, PET_PLUS } from '../src/core/data';
describe('동료·부엉이', () => {
  it('동료: 하루 한 번 무료 뽑기, 크리스탈 간식 뽑기, 겹치면 크리스탈, 결과는 기기·서버가 같다', () => {
    const { acc, c } = setup();
    const t0 = new Date('2026-11-25T12:00:00').getTime();
    const twin = JSON.parse(JSON.stringify(acc));
    const before = derive(c, acc);
    expect(applyAction(acc, 0, { t: 'petPull', tier: -1 }, t0).ok).toBe(true);
    expect(Object.keys(acc.pets)).toHaveLength(1);
    expect(applyAction(acc, 0, { t: 'petPull', tier: -1 }, t0 + 60_000).err).toMatch(/오늘/);
    expect(applyAction(acc, 0, { t: 'petPull', tier: -1 }, t0 + 86400_000).ok).toBe(true); // 다음 날
    expect(JSON.stringify(derive(c, acc))).not.toBe(JSON.stringify(before));
    // 같은 계정 상태면 같은 동료(서버 검증)
    applyAction(twin, 0, { t: 'petPull', tier: -1 }, t0);
    expect(Object.keys(twin.pets)).toEqual(Object.keys(acc.pets).slice(0, 1));
    expect(applyAction(acc, 0, { t: 'petPull', tier: 0 }, t0).err).toMatch(/크리스탈/);
  });
  it('간식 뽑기 보장: 10번 안에 희귀 이상, 30번 안에 영웅 이상. 조각을 넣고 + 강화', () => {
    const { acc, c } = setup();
    addItem(c, 'pet_shard', 25);
    expect(applyAction(acc, 0, { t: 'petShard' }, 0).n).toBe(250);
    acc.petCrystals = 40 * 30;
    let rare = false, epic = false;
    for (let i = 0; i < 30; i++) {
      const owned = new Set(Object.keys(acc.pets));
      applyAction(acc, 0, { t: 'petPull', tier: 0 }, 0);
      if (i === 9) rare = Object.keys(acc.pets).some((id) => PETS.find((p) => p.id === id)!.rarity >= 1) || acc.petPity.rare < 10;
      void owned;
    }
    epic = Object.keys(acc.pets).some((id) => PETS.find((p) => p.id === id)!.rarity >= 2);
    expect(rare).toBe(true); expect(epic).toBe(true);
    const id = Object.keys(acc.pets)[0], p = PETS.find((x) => x.id === id)!;
    acc.petCrystals = PET_PLUS[p.rarity];
    const v0 = derive(c, acc);
    expect(applyAction(acc, 0, { t: 'petPlus', id }, 0).ok).toBe(true);
    expect(acc.pets[id]).toBe(2);
    expect(JSON.stringify(derive(c, acc))).not.toBe(JSON.stringify(v0));
  });
  it('부엉이: 찾아온 뒤부터 깃털이 시간당 쌓이고, 깃털로 보너스', () => {
    const { acc, c } = setup();
    applyAction(acc, 0, { t: 'owl' }, 1000);
    expect(acc.owl.t).toBe(1000);
    const cost = owlCost(acc.owl, 'dmg');
    expect(applyAction(acc, 0, { t: 'owl', k: 'dmg' }, 1000 + 60_000).ok).toBe(false);
    const d0 = derive(c, acc).dmg;
    expect(applyAction(acc, 0, { t: 'owl', k: 'dmg' }, 1000 + 5 * 3600_000).ok).toBe(true);
    expect(acc.owl.f).toBeCloseTo(30 * 5 - cost, 5);
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
  });
});

import { STACK_BASE } from '../src/core/data';
import { countItem as cnt, removeItem } from '../src/core/state';
describe('가방 칸 나누기', () => {
  it('한 칸이 가득 차면 빈 칸에 새로 쌓고, 꺼낼 때는 뒤 칸부터', () => {
    const { c } = setup();
    expect(addItem(c, 'moss', STACK_BASE + 5)).toBe(true);
    const moss = c.inventory.filter((s) => s.id === 'moss');
    expect(moss.map((s) => s.qty)).toEqual([STACK_BASE, 5]);
    expect(cnt(c, 'moss')).toBe(STACK_BASE + 5);
    expect(removeItem(c, 'moss', 7)).toBe(true);
    expect(c.inventory.filter((s) => s.id === 'moss').map((s) => s.qty)).toEqual([STACK_BASE - 2]);
  });
});

import { GAMES, TOTEM } from '../src/core/minigames';
describe('미니게임·토템', () => {
  it('미니게임: 점수에 비례한 보상, 점수 상한, 하루 판수', () => {
    const { acc, c } = setup();
    const t = new Date('2026-11-25T10:30:00').getTime();
    const coins = acc.coins;
    expect(applyAction(acc, 0, { t: 'game', kind: 'chop', score: 9999 }, t).ok).toBe(true);
    expect(acc.mini.best.chop).toBe(GAMES.chop.max); // 상한
    expect(acc.coins).toBeGreaterThan(coins);
    expect(c.skills.chopping.lv).toBeGreaterThan(1);
    for (let i = 1; i < GAMES.chop.daily; i++) applyAction(acc, 0, { t: 'game', kind: 'chop', score: 10 }, t);
    expect(applyAction(acc, 0, { t: 'game', kind: 'chop', score: 10 }, t).err).toMatch(/오늘/);
    expect(applyAction(acc, 0, { t: 'game', kind: 'chop', score: 10 }, t + 86400_000).ok).toBe(true); // 다음 날
  });
  it('함정 피하기는 매시 정각~10분, 시간마다 한 번', () => {
    const { acc } = setup();
    const at = (m: number) => new Date(`2026-11-25T10:${String(m).padStart(2, '0')}:00`).getTime();
    expect(applyAction(acc, 0, { t: 'game', kind: 'spike', score: 50 }, at(30)).err).toMatch(/열리지/);
    expect(applyAction(acc, 0, { t: 'game', kind: 'spike', score: 50 }, at(3)).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'game', kind: 'spike', score: 50 }, at(5)).ok).toBe(false);
  });
  it('1월드 안개 늪의 이끼 토템이 첫 기도 토템이고, 기도 시스템과 같다(이끼 영혼으로 기도문)', () => {
    const { acc, c } = setup();
    c.mapId = 'swamp';
    expect(applyAction(acc, 0, { t: 'worship', op: 'run', id: 'wt_moss', kills: 40, survived: true }, 1000).n).toBeGreaterThan(0);
    expect(acc.worship.souls.moss).toBeGreaterThan(0);
    acc.worship.souls.moss = 1000;
    expect(applyAction(acc, 0, { t: 'worship', op: 'up', id: 'p_valor' }, 1000).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'worship', op: 'toggle', id: 'p_valor' }, 1000).ok).toBe(true);
    const d0 = derive(c, { ...acc, worship: { ...acc.worship, prayers: {} } }).dmg;
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
  });
  it('예전 수호 토템 영혼·축복은 이끼 영혼으로 옮겨진다', () => {
    const { acc } = setup();
    acc.totem.souls = 50; acc.totem.bless.dmg = 2;
    const b = deserialize(serialize(acc))!;
    expect(b.worship.souls.moss).toBe(50 + 20 + Math.round(20 * 1.35));
    expect(b.totem.souls).toBe(0);
  });
});

import { DROP_LIFE } from '../src/core/world';
import { computeAfk } from '../src/core/afk';
describe('전투·줍기 조작', () => {
  it('자동이 꺼져 있으면 옆에 적이 있어도 치지 않고, 지정하면 멈춰 선 뒤에만 친다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = false;
    const w = new World(acc, c, new Rng(1));
    for (const o of w.mobs.slice(1)) { o.alive = false; o.respawnT = 999; }
    const m = w.mobs[0]; m.plat = w.platforms[0]; m.y = 0; m.spawnAge = 5;
    let swung = false;
    const near = () => { m.x = w.player.x + 10; m.t = 99; m.moving = false; };
    for (let i = 0; i < 120; i++) { near(); w.step(1 / 60, { move: 0, climb: 0 }); if (w.player.swingT > 0) swung = true; }
    expect(swung).toBe(false); // 자동 꺼짐: 옆에 있어도 그대로
    for (let i = 0; i < 30; i++) { w.step(1 / 60, { move: 1, climb: 0 }); if (w.player.swingT > 0) swung = true; }
    expect(swung).toBe(false); // 걷는 중
    w.command = { k: 'mob', uid: m.uid };
    for (let i = 0; i < 120 && !swung; i++) { near(); w.step(1 / 60, { move: 0, climb: 0 }); if (w.player.swingT > 0) swung = true; }
    expect(swung).toBe(true); // 눌러서 지정하면 친다
  });
  it('자동을 끄면 하던 일을 멈추고 그 자리에 선다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.auto = true;
    const w = new World(acc, c, new Rng(1));
    for (let i = 0; i < 60; i++) w.step(1 / 60, { move: 0, climb: 0 });
    applyAction(acc, 0, { t: 'auto', on: false }, 0); w.stopAuto();
    for (let i = 0; i < 30; i++) w.step(1 / 60, { move: 0, climb: 0 });
    const x = w.player.x;
    for (let i = 0; i < 120; i++) w.step(1 / 60, { move: 0, climb: 0 });
    expect(Math.abs(w.player.x - x)).toBeLessThan(1);
    expect(w.command).toBeNull();
  });
  it('방치로 잡은 몬스터도 그 맵의 처치 수에 들어가 포탈을 연다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.level = 20; c.stats.luk = 60;
    expect(mapUnlocked(c, 'hills')).toBe(false);
    computeAfk(acc, c, 2 * 3600_000, new Rng(1));
    expect(c.kills.meadow).toBeGreaterThanOrEqual(15);
    expect(mapUnlocked(c, 'hills')).toBe(true);
    const portal = MAPS.meadow.portals.findIndex((p) => p.to === 'hills');
    expect(applyAction(acc, 0, { t: 'travel', portal }, 0).ok).toBe(true);
  });
  it('떨어진 아이템은 30분 뒤 사라진다', () => {
    const { acc, c } = setup();
    c.mapId = 'meadow';
    const w = new World(acc, c, new Rng(1));
    w.drops.push({ uid: 999, coin: false, id: 'moss', qty: 1, x: 300, y: -5, vx: 0, vy: 0, floorY: 0, age: DROP_LIFE - 0.5 });
    for (let i = 0; i < 30; i++) w.step(1 / 30, { move: 0, climb: 0 });
    expect(w.drops.some((d) => d.uid === 999)).toBe(false);
  });
});

import { clearSkin, lookOf, setSkin } from '../src/core/state';
describe('홀로웨어(겉모습 스킨)', () => {
  it('가방의 모자를 넣으면 겉모습만 바뀌고 능력치는 그대로', () => {
    const { acc, c } = setup();
    addItem(c, 'hat_moss', 1);
    const before = derive(c, acc);
    expect(setSkin(c, 'hat_moss')).toBeNull();
    expect(lookOf(c).hat).toBe('hat_moss');
    expect(derive(c, acc).def).toBe(before.def);
    expect(c.inventory.some((s) => s.id === 'hat_moss')).toBe(false);
    expect(setSkin(c, 'berry')).not.toBeNull();
    expect(clearSkin(c, 'hat')).toBeNull();
    expect(lookOf(c).hat).toBe(c.equipment.hat);
    expect(c.inventory.some((s) => s.id === 'hat_moss')).toBe(true);
    // 저장 후 다시 불러와도 남는다
    setSkin(c, 'hat_moss');
    expect(deserialize(serialize(acc))!.characters[0].skins.hat).toBe('hat_moss');
  });
});

import { foodWait, gateChecks, gateOpen, learnStarTal, starTalPoints } from '../src/core/state';
import { WORLD_GATE } from '../src/core/data';
describe('별빛 특성', () => {
  it('포인트는 레벨 2마다 1 + 업적마다 1, 쓴 만큼 줄고 효과가 반영된다', () => {
    const { acc, c } = setup();
    c.level = 10;
    expect(starTalPoints(acc, c)).toBe(5);
    acc.achievements.first = true;
    expect(starTalPoints(acc, c)).toBe(6);
    const sp0 = derive(c, acc).speed;
    expect(applyAction(acc, 0, { t: 'starTal', id: 'sl_speed' }, 0).ok).toBe(true);
    expect(derive(c, acc).speed).toBeCloseTo(sp0 * 1.015);
    for (let i = 0; i < 5; i++) learnStarTal(acc, c, 'sl_food');
    expect(starTalPoints(acc, c)).toBe(0);
    expect(learnStarTal(acc, c, 'sl_food')).toMatch(/부족/);
    expect(foodWait(c, 'berry')).toBeCloseTo(3 * 0.8);
    expect(deserialize(serialize(acc))!.characters[0].starTal.sl_food).toBe(5);
  });
});
describe('세계의 문', () => {
  it('원작처럼 그 월드 보스만 토벌하면 열린다(레벨·처치 조건 없음)', () => {
    const { acc, c } = setup();
    expect(gateOpen(acc, c)).toBe(false);
    expect(gateChecks(acc, c).length).toBe(1);
    acc.bosses.mossking = 1;
    expect(gateOpen(acc, c)).toBe(true);
    expect(WORLD_GATE.level + WORLD_GATE.kills).toBe(0);
  });
});

import { canTeleportTo } from '../src/core/state';
import { MAPS as ALLMAPS, WORLD2, worldOf } from '../src/core/data';
describe('2월드', () => {
  it('세계의 문을 지나야 2월드가 열리고, 이후 오아시스는 무료 순간이동·부활 장소', () => {
    const { acc, c } = setup();
    c.mapId = 'grove'; c.level = 30; acc.bosses.mossking = 1; c.kills.grove = 400;
    expect(mapUnlocked(c, 'oasis')).toBe(false);
    const gi = ALLMAPS.grove.portals.findIndex((p) => p.gate);
    // 조건을 못 채우면 거절
    acc.bosses.mossking = 0;
    expect(applyAction(acc, 0, { t: 'travel', portal: gi }, 0).ok).toBe(false);
    acc.bosses.mossking = 1;
    expect(applyAction(acc, 0, { t: 'travel', portal: gi }, 0).ok).toBe(true);
    expect(c.mapId).toBe('oasis'); expect(c.maxWorld).toBe(2);
    expect(mapUnlocked(c, 'oasis')).toBe(true);
    expect(mapUnlocked(c, 'dunes')).toBe(true);
    expect(mapUnlocked(c, 'canyon')).toBe(false);
    // 2월드에서 쓰러지면 오아시스에서 깨어난다
    c.mapId = 'dunes';
    applyAction(acc, 0, { t: 'respawn' }, 0);
    expect(c.mapId).toBe('oasis');
    // 1월드 마을로는 무료, 오아시스로도 무료
    expect(applyAction(acc, 0, { t: 'teleport', map: 'town' }, 0).ok).toBe(true);
    expect(canTeleportTo(c, 'oasis')).toBe(true);
    expect(applyAction(acc, 0, { t: 'teleport', map: 'oasis' }, 0).ok).toBe(true);
    // 돌아가는 문은 조건 없이 지난다
    const back = ALLMAPS.oasis.portals.findIndex((p) => p.to === 'grove');
    expect(applyAction(acc, 0, { t: 'travel', portal: back }, 0).ok).toBe(true);
    expect(c.mapId).toBe('grove');
  });
  it('2월드 맵은 처치 목표로 차례로 이어진다', () => {
    expect(WORLD2.every((id) => worldOf(id) === 2)).toBe(true);
    expect(worldOf('sandlair')).toBe(2);
    for (const id of WORLD2) expect(ALLMAPS[id]).toBeTruthy();
  });
});

import { BUBBLES, CAULDRONS, LIQUIDS, VIAL_COST, bubbleCost, bubbleValue, liquidCap } from '../src/core/alchemy';
describe('연금술', () => {
  it('솥을 찾아야 시작되고, 액체는 시간에 따라 한도까지 쌓인다(그 월드에 간 캐릭터가 있어야 그 액체가 열린다)', () => {
    const { acc, c } = setup();
    c.maxWorld = 2;
    expect(applyAction(acc, 0, { t: 'alch', op: 'liquid', id: 'rate' }, 0).ok).toBe(false);
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1000);
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1000 + 3_600_000);
    expect(acc.alch.liquids.water).toBeCloseTo(LIQUIDS[0].rate);
    expect(acc.alch.liquids.nitro).toBe(0); // 3월드 액체
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1000 + 100 * 3_600_000);
    expect(acc.alch.liquids.water).toBe(liquidCap(acc.alch, LIQUIDS[0]));
  });
  it('거품은 재료(가방+창고)와 그 거품의 액체를 써서 오르고 계정 보너스가 된다', () => {
    const { acc, c } = setup();
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1);
    acc.alch.liquids.water = 100;
    const b = BUBBLES.b_dmg, cost = bubbleCost(b, 0);
    addItem(c, b.item, cost.n - 2); acc.storage.push({ id: b.item, qty: 5 });
    const d0 = derive(c, acc).dmg;
    expect(applyAction(acc, 0, { t: 'alch', op: 'bubble', id: 'b_dmg' }, 1).ok).toBe(true);
    expect(acc.alch.bubbles.b_dmg).toBe(1);
    expect(acc.alch.liquids.water).toBe(100 - cost.liquid);
    expect(acc.storage.find((s) => s.id === b.item)!.qty).toBe(3);
    expect(derive(c, acc).dmg).toBeCloseTo(d0 * (1 + bubbleValue(b, 1) / 100) / 1, 0);
  });
  it('약병은 주사위로 발견한 뒤 물고기·곤충을 부어 단계가 오른다', () => {
    const { acc, c } = setup();
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1);
    const hp0 = derive(c, acc).maxHp;
    let rolls = 0;
    while (!acc.alch.vials.v_minnow && rolls < 50) { addItem(c, 'fish_minnow', VIAL_COST[0]); expect(applyAction(acc, 0, { t: 'alch', op: 'vial', id: 'v_minnow' }, 1).ok).toBe(true); rolls++; }
    expect(acc.alch.vials.v_minnow).toBe(1);
    expect(derive(c, acc).maxHp).toBeGreaterThan(hp0);
    expect(applyAction(acc, 0, { t: 'alch', op: 'vial', id: 'v_minnow' }, 1).ok).toBe(false);
    expect(deserialize(serialize(acc))!.alch.vials.v_minnow).toBe(1);
  });
  it('캐릭터를 솥에 맡기면 끓여서 새 거품을 발견하고 연금 경험치를 얻으며, 큰 거품은 장착한 캐릭터만', () => {
    const { acc, c } = setup();
    c.maxWorld = 2;
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1);
    expect(acc.alch.found.power).toBe(4);
    expect(applyAction(acc, 0, { t: 'alch', op: 'assign', id: 'c:power' }, 1).ok).toBe(true);
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1 + 100 * 3_600_000);
    expect(acc.alch.found.power).toBeGreaterThan(4);
    expect(c.skills.alchemy.lv > 1 || c.skills.alchemy.xp > 0).toBe(true);
    const big = CAULDRONS[0].bubbles.find((b) => b.big)!;
    acc.alch.bubbles[big.id] = 10;
    const v0 = derive(c, acc);
    expect(applyAction(acc, 0, { t: 'alch', op: 'big', id: big.id }, 2).ok).toBe(true);
    expect(JSON.stringify(derive(c, acc))).not.toBe(JSON.stringify(v0));
    expect(CAULDRONS.every((cd) => cd.bubbles.length === 30)).toBe(true);
  });
});

import { HIDDEN_CLASS, CLASSES as CLS } from '../src/core/data';
describe('히든 직업(방랑자 → 운명술사)', () => {
  it('기본 직업과 같은 Lv.10, 네잎 클로버를 들고 언덕에서만 전직된다', () => {
    const { acc, c } = setup();
    c.level = 9; c.mapId = HIDDEN_CLASS.map;
    addItem(c, HIDDEN_CLASS.item, 1);
    expect(applyAction(acc, 0, { t: 'class', cls: 'wanderer' }, 0).ok).toBe(false); // 레벨 부족
    c.level = 10; c.mapId = 'meadow';
    expect(applyAction(acc, 0, { t: 'class', cls: 'wanderer' }, 0).ok).toBe(false); // 장소가 다름
    c.mapId = HIDDEN_CLASS.map;
    expect(applyAction(acc, 0, { t: 'class', cls: 'wanderer' }, 0).ok).toBe(true);
    expect(c.cls).toBe('wanderer');
    expect(c.inventory.some((s) => s.id === HIDDEN_CLASS.item)).toBe(false);
    // 이미 전사인 캐릭터는 갈 수 없다
    const { acc: a2, c: c2 } = setup();
    c2.level = 20; c2.mapId = HIDDEN_CLASS.map; addItem(c2, HIDDEN_CLASS.item, 1);
    applyAction(a2, 0, { t: 'class', cls: 'warrior' }, 0);
    expect(applyAction(a2, 0, { t: 'class', cls: 'wanderer' }, 0).ok).toBe(false);
  });
  it('Lv.30에 신기루 평원의 나그네에게 사막 거상 트로피를 바치면 워커로, 행운이 주력이고 패시브가 붙는다', () => {
    const { acc, c } = setup();
    c.level = 30; c.mapId = HIDDEN_CLASS.map; addItem(c, HIDDEN_CLASS.item, 1);
    applyAction(acc, 0, { t: 'class', cls: 'wanderer' }, 0);
    expect(applyAction(acc, 0, { t: 'class', cls: 'fateweaver' }, 0).ok).toBe(false); // 증표·장소가 없다
    c.mapId = 'mirage'; addItem(c, 'trophy_sand', 1);
    expect(applyAction(acc, 0, { t: 'class', cls: 'fateweaver' }, 0).ok).toBe(true);
    expect(CLS[c.cls].main).toBe('luk');
    const drop0 = derive(c, acc).dropMult;
    c.talents.treasure = 5;
    expect(derive(c, acc).dropMult).toBeGreaterThan(drop0);
  });
});

import { HIDDEN_TIERS, TIER_LEVEL, classLine as cline, classTier, canSubclass as canSub } from '../src/core/data';
describe('히든 계열 4단계: 낭만가 → 워커 → 테일러 → 라이프텔러', () => {
  it('단계마다 정해진 레벨에서 차례로 전직하고, 계보의 특성을 모두 쓴다', () => {
    const { acc, c } = setup();
    c.level = 10; c.mapId = HIDDEN_CLASS.map; addItem(c, HIDDEN_CLASS.item, 1);
    expect(applyAction(acc, 0, { t: 'class', cls: 'wanderer' }, 0).ok).toBe(true);
    expect(CLS.wanderer.name).toBe('낭만가');
    for (const [cls, tier] of [['fateweaver', 2], ['taler', 3], ['lifeteller', 4]] as const) {
      const ht = HIDDEN_TIERS[cls]!; c.mapId = ht.map; addItem(c, ht.item, 1);
      c.level = TIER_LEVEL[tier] - 1;
      expect(canSub(c)).toBe(false);
      expect(applyAction(acc, 0, { t: 'class', cls }, 0).ok).toBe(false);
      c.level = TIER_LEVEL[tier];
      expect(canSub(c)).toBe(true);
      expect(applyAction(acc, 0, { t: 'class', cls }, 0).ok).toBe(true);
      expect(classTier(c.cls)).toBe(tier);
    }
    expect(cline(c.cls).map((k) => CLS[k].name)).toEqual(['초보자', '낭만가', '워커', '테일러', '라이프텔러']);
    expect(canSub(c)).toBe(false);
    // 1차 특성부터 4차 특성까지 배울 수 있다
    c.talentPoints = 4;
    for (const id of ['fortune', 'destiny', 'talestorm', 'lifesong']) expect(applyAction(acc, 0, { t: 'talent', id }, 0).ok).toBe(true);
    // 일반 직업은 3차(Lv.70)까지
    const { acc: a2, c: c2 } = setup();
    c2.level = 80; applyAction(a2, 0, { t: 'class', cls: 'warrior' }, 0); applyAction(a2, 0, { t: 'class', cls: 'guardian' }, 0);
    expect(c2.cls).toBe('guardian'); expect(canSub(c2)).toBe(true);
    expect(applyAction(a2, 0, { t: 'class', cls: 'bastion' }, 0).ok).toBe(true);
    expect(canSub(c2)).toBe(false);
  });
});

import { BOX_BY_ID, POST_ORDERS } from '../src/core/post';
describe('우체국', () => {
  const ready = () => {
    const { acc, c } = setup();
    c.maxWorld = 2; c.mapId = 'oasis'; c.kills.meadow = 100; c.kills.hills = 100;
    return { acc, c };
  };
  it('여섯 회사가 계정 공용으로 하루 하나씩, 기기와 서버가 같은 주문을 받고 날이 바뀌면 새로 받는다', () => {
    const { acc } = ready();
    const twin = JSON.parse(JSON.stringify(acc));
    const day1 = new Date(2026, 10, 25, 12).getTime();
    applyAction(acc, 0, { t: 'post', op: 'refresh' }, day1);
    applyAction(twin, 0, { t: 'post', op: 'refresh' }, day1);
    expect(acc.postOff.orders.length).toBeGreaterThanOrEqual(4);
    expect(acc.postOff.orders.length).toBeLessThanOrEqual(POST_ORDERS);
    expect(twin.postOff.orders).toEqual(acc.postOff.orders);
    const first = JSON.stringify(acc.postOff.orders);
    applyAction(acc, 0, { t: 'post', op: 'refresh' }, day1 + 3600_000);
    expect(JSON.stringify(acc.postOff.orders)).toBe(first);
    applyAction(acc, 0, { t: 'post', op: 'refresh' }, day1 + 86_400_000);
    expect(acc.postOff.day).not.toBe(twin.postOff.day);
  });
  it('배달하면 그 캐릭터가 포인트와 코인을 받고, 날마다 이어 배달하면 연속 보너스, 상자 효과 셋', () => {
    const { acc, c } = ready();
    const now = new Date(2026, 10, 25, 12).getTime();
    applyAction(acc, 0, { t: 'post', op: 'refresh' }, now);
    const o = acc.postOff.orders[0];
    expect(applyAction(acc, 0, { t: 'post', op: 'deliver', idx: 0 }, now).ok).toBe(false);
    for (const it of o.items) acc.storage.push({ id: it.item, qty: it.n });
    const coins = acc.coins;
    expect(applyAction(acc, 0, { t: 'post', op: 'deliver', idx: 0 }, now).ok).toBe(true);
    expect(c.post.pts).toBe(o.pts); expect(acc.coins).toBe(coins + Math.round(o.coins * 1.05));
    expect(acc.postOff.streak[o.company]).toBe(1);
    expect(applyAction(acc, 0, { t: 'post', op: 'deliver', idx: 0 }, now).ok).toBe(false);
    // 다음 날 같은 회사를 채우면 연속 2일
    const next = now + 86_400_000;
    applyAction(acc, 0, { t: 'post', op: 'refresh' }, next);
    const o2 = acc.postOff.orders.find((x) => x.company === o.company)!;
    for (const it of o2.items) acc.storage.push({ id: it.item, qty: it.n });
    expect(applyAction(acc, 0, { t: 'post', op: 'deliver', idx: acc.postOff.orders.indexOf(o2) }, next).ok).toBe(true);
    expect(acc.postOff.streak[o.company]).toBe(2);
    const str0 = derive(c, acc).str;
    expect(applyAction(acc, 0, { t: 'post', op: 'box', id: 'x_str' }, now).ok).toBe(true);
    expect(derive(c, acc).str).toBe(str0 + BOX_BY_ID.x_str.effs[0].per);
    expect(BOX_BY_ID.x_str.effs.length).toBe(3);
  });
});

import { WORLD3, WORLD_GATES, ITEMS as IT, MONSTERS as MON, NODES as ND, RECIPES as RC, CLASSES as CL3, TALENT as TL3, nextClasses as nextC, maxTierOf as maxT, CARD_BY_ID as CB } from '../src/core/data';
import { orderPool } from '../src/core/post';
describe('3월드: 서리 고원', () => {
  it('사막 거상을 토벌하면 해탑 끝 문으로 눈꽃 마을에 간다', () => {
    const { acc, c } = setup();
    c.maxWorld = 2; c.mapId = 'sunspire'; c.level = 60;
    const gi = ALLMAPS.sunspire.portals.findIndex((p) => p.gate);
    expect(ALLMAPS.sunspire.portals[gi].to).toBe('snowtown');
    expect(gateChecks(acc, c, 3).map((x) => x.ok)).toEqual([false]);
    expect(applyAction(acc, 0, { t: 'travel', portal: gi }, 0).ok).toBe(false);
    acc.bosses.sandlord = 1; c.kills.sunspire = WORLD_GATES[1].kills;
    expect(gateOpen(acc, c, 3)).toBe(true);
    // 2월드 문 조건(이끼왕)은 3월드 문과 상관없다
    expect(gateOpen(acc, c, 2)).toBe(false);
    expect(applyAction(acc, 0, { t: 'travel', portal: gi }, 0).ok).toBe(true);
    expect(c.mapId).toBe('snowtown'); expect(c.maxWorld).toBe(3);
    expect(mapUnlocked(c, 'snowfield')).toBe(true); expect(mapUnlocked(c, 'pinewood')).toBe(false);
    c.mapId = 'snowfield'; applyAction(acc, 0, { t: 'respawn' }, 0);
    expect(c.mapId).toBe('snowtown');
    expect(canTeleportTo(c, 'oasis')).toBe(true);
    // 3월드 재료가 우체국 주문에 나온다
    expect(orderPool(c)).toContain('snow_tuft');
  });
  it('맵·몬스터·자원·제작법이 모두 이어져 있다', () => {
    for (const id of WORLD3) { expect(ALLMAPS[id]).toBeTruthy(); expect(worldOf(id)).toBe(3); }
    expect(worldOf('frostlair')).toBe(3);
    expect(ALLMAPS.frostlair.boss).toBe('frostlord');
    for (const id of WORLD3) for (const s of ALLMAPS[id].spawns) { expect(MON[s.monster]).toBeTruthy(); expect(CB[s.monster]).toBeTruthy(); for (const d of MON[s.monster].drops) expect(IT[d.item], d.item).toBeTruthy(); }
    for (const id of WORLD3) for (const n of ALLMAPS[id].nodes) { expect(ND[n.node]).toBeTruthy(); expect(IT[ND[n.node].item]).toBeTruthy(); }
    for (const r of RC.filter((r) => r.tier === 5)) for (const [m] of r.mats) expect(IT[m], m).toBeTruthy();
  });
  it('일반 직업 6갈래 모두 Lv.70에 3차 전직이 있고, 3차 특성이 효과를 낸다', () => {
    for (const sub of ['guardian', 'berserker', 'sharpshooter', 'ranger', 'elementalist', 'hexer'] as const) {
      const n = nextC(sub);
      expect(n.length).toBe(1);
      expect(TALENTS_OF(n[0]).some((t) => t.active)).toBe(true);
    }
    expect(maxT('warrior')).toBe(3);
    const { acc, c } = setup();
    c.level = 70; applyAction(acc, 0, { t: 'class', cls: 'archer' }, 0); applyAction(acc, 0, { t: 'class', cls: 'ranger' }, 0);
    expect(applyAction(acc, 0, { t: 'class', cls: 'pathfinder' }, 0).ok).toBe(true);
    expect(CL3[c.cls].name).toBe('개척자');
    const d0 = derive(c, acc).dropMult;
    c.talents.scout = 5;
    expect(derive(c, acc).dropMult).toBeGreaterThan(d0);
    expect(TL3.arrowrain.cls).toBe('pathfinder');
  });
});
const TALENTS_OF = (cls: string) => Object.values(TL3).filter((t) => t.cls === cls);

import { CRITTER as CRT, TRAP_TIMES as TT, trapSlots as tSlots } from '../src/core/data';
import { trapYield } from '../src/core/traps';
import { checkSync as cs } from '../src/core/sync';
describe('덫 사냥', () => {
  const ready = () => {
    const { acc, c } = setup();
    c.maxWorld = 3; c.mapId = 'snowtown'; c.level = 60;
    return { acc, c };
  };
  it('3월드에 가야 덫을 놓고, 시간이 다 되면 정해진 수를 거둔다', () => {
    const { acc, c } = setup();
    expect(applyAction(acc, 0, { t: 'trap', op: 'set', idx: 0, critter: 'cr_hare', time: 0 }, 0).ok).toBe(false);
    const r = ready();
    const t0 = 1_000_000, y = trapYield(r.c, 'cr_hare', 1);
    expect(applyAction(r.acc, 0, { t: 'trap', op: 'set', idx: 0, critter: 'cr_hare', time: 1 }, t0).ok).toBe(true);
    expect(r.c.traps.slots[0]!.n).toBe(y.n);
    // 칸은 레벨 10마다 하나(처음엔 1칸)
    expect(applyAction(r.acc, 0, { t: 'trap', op: 'set', idx: 1, critter: 'cr_hare', time: 0 }, t0).ok).toBe(false);
    // 이미 놓인 칸, 시간 전 거두기는 거절
    expect(applyAction(r.acc, 0, { t: 'trap', op: 'collect', idx: 0 }, t0 + 1000).ok).toBe(false);
    expect(applyAction(r.acc, 0, { t: 'trap', op: 'collect', idx: 0 }, t0 + TT[1].min * 60_000).ok).toBe(true);
    expect(cnt(r.c, 'cr_hare')).toBe(y.n);
    expect(r.c.skills.trapping.xp + (r.c.skills.trapping.lv > 1 ? 1 : 0)).toBeGreaterThan(0);
    expect(r.c.traps.slots[0]).toBeNull();
    expect(tSlots(10)).toBe(2); expect(tSlots(99)).toBe(5);
  });
  it('레벨·맵이 모자라면 못 놓고, 덫 꾸러미로 잡는 수가 늘며, 길게 놓을수록 시간당 효율이 좋다', () => {
    const { acc, c } = ready();
    expect(applyAction(acc, 0, { t: 'trap', op: 'set', idx: 0, critter: 'cr_fox', time: 0 }, 0).ok).toBe(false);
    const short = trapYield(c, 'cr_hare', 0).n / TT[0].min, long = trapYield(c, 'cr_hare', 3).n / TT[3].min;
    expect(long).toBeGreaterThan(short);
    const before = trapYield(c, 'cr_hare', 3).n;
    // 나무 상자는 나무 덫 꾸러미를 써야 열린다
    expect(applyAction(acc, 0, { t: 'trap', op: 'set', idx: 0, critter: 'cr_hare', time: 3, box: 'tb_wood' }, 0).ok).toBe(false);
    addItem(c, 'trap_wood', 1);
    expect(applyAction(acc, 0, { t: 'use', id: 'trap_wood' }, 0).ok).toBe(true);
    expect(c.traps.tier).toBe(1);
    expect(trapYield(c, 'cr_hare', 3, 'tb_wood').n).toBeGreaterThan(before);
    // 상자마다 놓을 수 있는 시간이 다르다(판지 상자는 12시간 불가)
    expect(applyAction(acc, 0, { t: 'trap', op: 'set', idx: 0, critter: 'cr_hare', time: 3, box: 'tb_card' }, 0).ok).toBe(false);
    expect(applyAction(acc, 0, { t: 'trap', op: 'set', idx: 0, critter: 'cr_hare', time: 3, box: 'tb_wood' }, 0).ok).toBe(true);
    // 비단 상자: 적게 잡지만 경험치가 많다, 고기 상자: 빛나는 동물이 잘 잡힌다
    c.skills.trapping.lv = 30;
    expect(trapYield(c, 'cr_hare', 2, 'tb_silk').n).toBeLessThan(trapYield(c, 'cr_hare', 2, 'tb_card').n);
    expect(trapYield(c, 'cr_hare', 2, 'tb_silk').xp).toBeGreaterThan(trapYield(c, 'cr_hare', 2, 'tb_card').xp);
    expect(trapYield(c, 'cr_hare', 2, 'tb_meat').shinyExp).toBeGreaterThan(trapYield(c, 'cr_hare', 2, 'tb_card').shinyExp * 3);
    expect(CRT.cr_fox.lv).toBeGreaterThan(1);
    // 덫은 서버 행동으로만 바뀐다(동기화로 고칠 수 없다)
    const claimed = JSON.parse(JSON.stringify(c)); claimed.traps.tier = 3;
    expect(cs(acc, 0, claimed, { coins: acc.coins, cards: acc.cards, bosses: acc.bosses } as never, 5)).toMatch(/traps/);
  });
});

import { BUILDING as BD, buildCost as bCost, buildRate as bRate } from '../src/core/build';
describe('건설(공방 마당)', () => {
  it('재료를 넣어 공사를 시작하면 시간이 지나 지어지고, 계정 전체에 효과가 생긴다', () => {
    const { acc, c } = setup();
    expect(applyAction(acc, 0, { t: 'build', op: 'start', id: 'b_drill' }, 0).ok).toBe(false); // 3월드 전
    c.maxWorld = 3;
    const t0 = 5_000_000;
    expect(applyAction(acc, 0, { t: 'build', op: 'visit' }, t0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'build', op: 'start', id: 'b_drill' }, t0).ok).toBe(false); // 재료 부족
    const cost = bCost(BD.b_drill, 0);
    for (const [m, n] of cost.mats) addItem(c, m, n);
    const dmg0 = derive(c, acc).dmg;
    expect(applyAction(acc, 0, { t: 'build', op: 'start', id: 'b_drill' }, t0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'build', op: 'start', id: 'b_drill' }, t0).ok).toBe(false); // 같은 건물 두 번은 안 됨
    for (const [m] of cost.mats) expect(cnt(c, m)).toBe(0);
    const hours = cost.need / bRate(acc.build);
    applyAction(acc, 0, { t: 'build', op: 'visit' }, t0 + hours * 3_600_000 * 0.5);
    expect(acc.build.levels.b_drill ?? 0).toBe(0);
    applyAction(acc, 0, { t: 'build', op: 'visit' }, t0 + hours * 3_600_000 + 1000);
    expect(acc.build.levels.b_drill).toBe(1);
    expect(acc.build.xp + acc.build.lv).toBeGreaterThan(1);
    expect(derive(c, acc).dmg).toBeGreaterThan(dmg0);
    // 다른 캐릭터도 같은 효과
    expect(deserialize(serialize(acc))!.build.levels.b_drill).toBe(1);
  });
  it('비계는 속도를, 공사 칸은 동시에 짓는 수를 늘린다(코인)', () => {
    const { acc, c } = setup();
    c.maxWorld = 3; acc.coins = 1_000_000;
    applyAction(acc, 0, { t: 'build', op: 'visit' }, 1);
    const r0 = bRate(acc.build);
    expect(applyAction(acc, 0, { t: 'build', op: 'rate' }, 2).ok).toBe(true);
    expect(bRate(acc.build)).toBeGreaterThan(r0);
    expect(applyAction(acc, 0, { t: 'build', op: 'slots' }, 3).ok).toBe(true);
    expect(acc.build.up.slots).toBe(1);
  });
});

import { PRAYER as PR, WTOTEM as WT, chargeCap as cCap, chargeNow as cNow, prayerCost as pCost, prayerSlots as pSlots } from '../src/core/worship';
describe('기도', () => {
  const ready = () => { const { acc, c } = setup(); c.maxWorld = 3; c.mapId = 'snowfield'; return { acc, c }; };
  it('토템이 있는 맵에서 기도력을 써서 지키면 영혼과 기도 경험치, 기도력은 시간이 지나 다시 찬다', () => {
    const { acc, c } = ready();
    const t0 = 10_000_000;
    const cap0 = cCap(c);
    expect(cNow(c, t0)).toBe(cap0);
    c.mapId = 'forest';
    expect(applyAction(acc, 0, { t: 'worship', op: 'run', id: 'wt_moss', kills: 40, survived: true }, t0).ok).toBe(false); // 그 맵이 아님
    c.mapId = 'swamp';
    const r = applyAction(acc, 0, { t: 'worship', op: 'run', id: 'wt_moss', kills: 40, survived: true }, t0);
    expect(r.ok).toBe(true); expect(r.n).toBe(Math.floor(20 * 1.5 * 1.01));
    expect(acc.worship.souls.moss).toBe(r.n);
    expect(c.skills.worship.lv > 1 || c.skills.worship.xp > 0).toBe(true);
    expect(cNow(c, t0)).toBeCloseTo(cap0 - WT.wt_moss.cost);
    // 기도력이 모자라면 거절, 시간이 지나면 다시 찬다
    let runs = 0;
    while (applyAction(acc, 0, { t: 'worship', op: 'run', id: 'wt_moss', kills: 0, survived: false }, t0).ok) runs++;
    expect(runs).toBe(Math.floor((cap0 - WT.wt_moss.cost) / WT.wt_moss.cost));
    expect(cNow(c, t0 + 10 * 3_600_000)).toBe(cCap(c));
    // 혼령 수 상한, 높은 토템은 기도 레벨이 필요
    c.mapId = 'frostlake';
    expect(applyAction(acc, 0, { t: 'worship', op: 'run', id: 'wt_water', kills: 10, survived: true }, t0 + 10 * 3_600_000).ok).toBe(false);
  });
  it('기도문은 영혼으로 배우고(계정 공용), 캐릭터마다 켜면 효과와 저주가 함께 걸린다', () => {
    const { acc, c } = ready();
    expect(applyAction(acc, 0, { t: 'worship', op: 'toggle', id: 'p_valor' }, 0).ok).toBe(false); // 아직 안 배움
    acc.worship.souls.moss = pCost(0);
    expect(applyAction(acc, 0, { t: 'worship', op: 'up', id: 'p_valor' }, 0).ok).toBe(true);
    expect(acc.worship.souls.moss).toBe(0);
    const d0 = derive(c, acc);
    expect(applyAction(acc, 0, { t: 'worship', op: 'toggle', id: 'p_valor' }, 0).ok).toBe(true);
    const d1 = derive(c, acc);
    expect(d1.maxHp).toBeLessThan(d0.maxHp); // 저주: 최대 체력
    expect(PR.p_valor.eff).toBe('dmg');
    // 켤 수 있는 수는 기도 레벨로
    expect(pSlots(1)).toBe(1); expect(pSlots(40)).toBe(3);
    acc.worship.souls.moss = 9999; c.skills.worship.lv = 5;
    applyAction(acc, 0, { t: 'worship', op: 'up', id: 'p_harvest' }, 0);
    expect(applyAction(acc, 0, { t: 'worship', op: 'toggle', id: 'p_harvest' }, 0).ok).toBe(false);
    expect(applyAction(acc, 0, { t: 'worship', op: 'toggle', id: 'p_valor' }, 0).ok).toBe(true); // 끄기
    expect(applyAction(acc, 0, { t: 'worship', op: 'toggle', id: 'p_harvest' }, 0).ok).toBe(true);
  });
});

import { WORLD4, SMELTS as SM4, SHOP as SH4, NPCS as NP4 } from '../src/core/data';
describe('4월드: 별빛 성운', () => {
  it('눈보라 군주를 토벌하면 봉우리 끝 문으로 성운 정거장에 간다', () => {
    const { acc, c } = setup();
    c.maxWorld = 3; c.mapId = 'frostpeak'; c.level = 90;
    const gi = ALLMAPS.frostpeak.portals.findIndex((p) => p.gate);
    expect(ALLMAPS.frostpeak.portals[gi].to).toBe('nebtown');
    expect(gateChecks(acc, c, 4).map((x) => x.ok)).toEqual([false]);
    expect(applyAction(acc, 0, { t: 'travel', portal: gi }, 0).ok).toBe(false);
    acc.bosses.frostlord = 1; c.kills.frostpeak = WORLD_GATES[2].kills;
    expect(gateOpen(acc, c, 4)).toBe(true);
    expect(applyAction(acc, 0, { t: 'travel', portal: gi }, 0).ok).toBe(true);
    expect(c.mapId).toBe('nebtown'); expect(c.maxWorld).toBe(4);
    expect(mapUnlocked(c, 'moondust')).toBe(true); expect(mapUnlocked(c, 'crater')).toBe(false);
    c.mapId = 'moondust'; applyAction(acc, 0, { t: 'respawn' }, 0);
    expect(c.mapId).toBe('nebtown');
    expect(orderPool(c)).toContain('star_sand');
  });
  it('맵·몬스터·자원·제작법·퀘스트가 모두 이어져 있다', () => {
    for (const id of WORLD4) { expect(ALLMAPS[id]).toBeTruthy(); expect(worldOf(id)).toBe(4); }
    expect(worldOf('voidlair')).toBe(4);
    expect(ALLMAPS.voidlair.boss).toBe('nebtitan');
    expect(CB.nebtitan).toBeTruthy();
    for (const id of WORLD4) for (const s of ALLMAPS[id].spawns) { expect(MON[s.monster]).toBeTruthy(); expect(CB[s.monster]).toBeTruthy(); for (const d of MON[s.monster].drops) expect(IT[d.item], d.item).toBeTruthy(); }
    for (const id of WORLD4) for (const n of ALLMAPS[id].nodes) { expect(ND[n.node]).toBeTruthy(); expect(IT[ND[n.node].item]).toBeTruthy(); expect(CB[n.node]).toBeTruthy(); }
    for (const id of WORLD4) for (const p of ALLMAPS[id].portals) expect(ALLMAPS[p.to], p.to).toBeTruthy();
    for (const r of RC.filter((r) => r.tier === 6 || r.unlock === 6)) for (const [m] of r.mats) expect(IT[m], m).toBeTruthy();
    expect(RC.find((r) => r.item === 'anvil_exp5')?.unlock).toBe(6);
    expect(SM4.some((x) => x.bar === 'bar_nova')).toBe(true);
    expect(SH4.some((x) => x.item === 'moon_cake')).toBe(true);
    for (const q of NP4.astro.quests) { const gl = q.goal as { kill?: string; item?: string }; expect(gl.kill ? MON[gl.kill] : IT[gl.item!]).toBeTruthy(); }
  });
});

import { COOK, MEAL as MEALD, mealNeed as mNeed, recipeResult as rRes, recipeRoll as rRoll, recipeChance as rChance, spiceRate as sRate, SPICE as SPC } from '../src/core/cooking';
describe('요리(별빛 식당)', () => {
  const H = 3_600_000;
  const ready = () => { const { acc, c } = setup(); c.maxWorld = 4; c.mapId = 'nebtown'; c.level = 100; return { acc, c }; };
  it('4월드 전에는 쓸 수 없다', () => {
    const { acc, c } = setup();
    expect(applyAction(acc, 0, { t: 'cook', op: 'visit' }, 0).ok).toBe(false);
    c.maxWorld = 4; expect(applyAction(acc, 0, { t: 'cook', op: 'visit' }, 1000).ok).toBe(true);
  });
  it('원작처럼 향신료는 사냥으로는 모이지 않는다(번식 영역에서만), 시간이 지나면 국자가 모인다', () => {
    const { acc, c } = ready();
    c.kills.moondust = 4000; expect(sRate(acc, SPC.sp_dust)).toBe(0);
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H);
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H * 100);
    expect(acc.cook.bank.sp_dust ?? 0).toBe(0);
    expect(applyAction(acc, 0, { t: 'cook', op: 'claim' }, H * 100).ok).toBe(false);
    expect(acc.cook.ladles).toBe(COOK.ladleMax);
  });
  it('연구로 요리를 찾고, 주방이 계속 만들고, 접시로 레벨을 올리면 보너스가 생긴다', () => {
    const { acc, c } = ready();
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H);
    acc.cook.spices = { sp_dust: 100, sp_salt: 100 };
    const want = rRes(acc.cook, ['sp_dust', 'sp_salt'])!;
    expect(MEALD[want].tier).toBe(2);
    expect(applyAction(acc, 0, { t: 'cook', op: 'recipe', idx: 0, sp: ['sp_dust', 'sp_honey'] }, H).ok).toBe(false); // 꿀이 없다
    // 연구는 운: 이번 시도가 성공하도록 행운을 최대로(성공 확률 95%)하고 성공하는 시도 횟수를 찾는다
    acc.cook.kitchens[0].luck = 60;
    while (rRoll(acc.cook, ['sp_dust', 'sp_salt']) >= rChance(acc.cook.kitchens[0])) acc.cook.tries++;
    expect(applyAction(acc, 0, { t: 'cook', op: 'recipe', idx: 0, sp: ['sp_dust', 'sp_salt'] }, H).ok).toBe(true);
    expect(acc.cook.spices.sp_dust).toBe(90);
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H + COOK.recipeSecs * 2 * 1000);
    expect(acc.cook.found).toEqual([want]);
    expect(acc.cook.kitchens[0].meal).toBe(want);
    // 10시간 요리
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H * 11 + COOK.recipeSecs * 2 * 1000);
    const n = acc.cook.meals[want].n;
    expect(n).toBeCloseTo((3600 / COOK.secs[2]) * 10 * (1 + 60 * COOK.luckPer), 5);
    const before = derive(c, acc);
    expect(applyAction(acc, 0, { t: 'cook', op: 'lvl', id: want }, H * 12).ok).toBe(true);
    expect(acc.cook.meals[want].lv).toBe(1);
    expect(acc.cook.meals[want].n).toBeCloseTo(n - mNeed(0), 5);
    const after = derive(c, acc);
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  });
  it('식탁에 앉은 캐릭터는 주방을 빠르게 하고 요리 경험치를 얻는다(자리는 주방 수만큼)', () => {
    const { acc, c } = ready();
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H);
    acc.cook.found = ['m_bun']; acc.cook.meals.m_bun = { lv: 0, n: 0 };
    applyAction(acc, 0, { t: 'cook', op: 'meal', idx: 0, id: 'm_bun' }, H);
    expect(applyAction(acc, 0, { t: 'cook', op: 'chef' }, H).ok).toBe(true);
    c.skills.cooking = { lv: 10, xp: 0 };
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H * 2);
    expect(acc.cook.meals.m_bun.n).toBeCloseTo(30 * (1 + 10 * COOK.chefPer), 5);
    expect(c.skills.cooking.lv > 10 || c.skills.cooking.xp > 0).toBe(true);
    // 두 번째 캐릭터는 자리가 없다
    acc.characters.push({ ...JSON.parse(JSON.stringify(c)), id: c.id + 1 });
    expect(applyAction(acc, 1, { t: 'cook', op: 'chef' }, H * 2).ok).toBe(false);
    acc.coins = COOK.kitchenCost[1];
    expect(applyAction(acc, 0, { t: 'cook', op: 'buy' }, H * 2).ok).toBe(true);
    expect(applyAction(acc, 1, { t: 'cook', op: 'chef' }, H * 2).ok).toBe(true);
  });
  it('주방 단계는 정해진 향신료로 오른다', () => {
    const { acc } = ready();
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H);
    expect(applyAction(acc, 0, { t: 'cook', op: 'up', idx: 0, k: 'spd' }, H).ok).toBe(false);
    acc.cook.spices.sp_dust = 8;
    expect(applyAction(acc, 0, { t: 'cook', op: 'up', idx: 0, k: 'spd' }, H).ok).toBe(true);
    expect(acc.cook.kitchens[0].spd).toBe(1);
  });
});

import { BREED as BRD, SPEC as SPC2, TERR as TER, nestCap as nCap, teamPower as tPow, shinyNeed as shN, newBreed as nBreed } from '../src/core/breeding';
describe('번식(번식 둥지)', () => {
  const H = 3_600_000;
  const ready = () => { const { acc, c } = setup(); acc.breed = nBreed(777); c.maxWorld = 4; c.mapId = 'nebtown'; return { acc, c }; };
  it('4월드 전에는 쓸 수 없다', () => {
    const { acc, c } = ready(); c.maxWorld = 3;
    expect(applyAction(acc, 0, { t: 'breed', op: 'visit' }, H).ok).toBe(false);
  });
  it('둥지가 시간마다 알을 낳고 칸이 차면 멈춘다. 같은 씨앗이면 같은 펫이 나온다', () => {
    const run = () => {
      const { acc } = ready();
      applyAction(acc, 0, { t: 'breed', op: 'visit' }, H);
      applyAction(acc, 0, { t: 'breed', op: 'visit' }, H * 50);
      expect(acc.breed.eggs.length).toBe(nCap(acc.breed));
      expect(applyAction(acc, 0, { t: 'breed', op: 'hatch' }, H * 50).ok).toBe(true);
      expect(acc.breed.eggs.length).toBe(nCap(acc.breed) - 1);
      return acc.breed.pets[0];
    };
    const a = run(), b = run();
    expect(a).toEqual(b);
    expect(SPC2[a.sp].lv).toBe(1); // 번식 Lv.1에는 첫 종만
    expect(a.power).toBeGreaterThan(0);
  });
  it('울타리의 펫은 그 종의 반짝임을 올리고, 반짝임이 계정 보너스가 된다', () => {
    const { acc, c } = ready();
    applyAction(acc, 0, { t: 'breed', op: 'visit' }, H);
    acc.breed.pets.push({ uid: 99, sp: 'b_puff', power: 10, gene: 'fighter', rar: 0 });
    const hp0 = derive(c, acc).maxHp;
    expect(applyAction(acc, 0, { t: 'breed', op: 'fence', uid: 99 }, H).ok).toBe(true);
    applyAction(acc, 0, { t: 'breed', op: 'visit' }, H + (shN(0) + shN(1)) * H + 1000);
    expect(acc.breed.shiny.b_puff.lv).toBe(2);
    expect(derive(c, acc).maxHp).toBeGreaterThan(hp0);
  });
  it('영역에 보낸 팀은 힘만큼 돌며 향신료와 번식 경험치를 가져온다(한 펫은 한 곳에만)', () => {
    const { acc } = ready();
    applyAction(acc, 0, { t: 'breed', op: 'visit' }, H);
    expect(applyAction(acc, 0, { t: 'breed', op: 'keeper' }, H).ok).toBe(true); // 사육사가 번식 경험치를 받는다
    acc.breed.pets.push({ uid: 1, sp: 'b_puff', power: 30, gene: 'fighter', rar: 0 }, { uid: 2, sp: 'b_puff', power: 15, gene: 'forager', rar: 0 });
    expect(applyAction(acc, 0, { t: 'breed', op: 'team', uid: 1, terr: 't_crater' }, H).ok).toBe(false); // 번식 Lv.5 필요
    expect(applyAction(acc, 0, { t: 'breed', op: 'team', uid: 1, terr: 't_dust' }, H).ok).toBe(true);
    expect(tPow(acc.breed, 't_dust')).toBe(45);
    applyAction(acc, 0, { t: 'breed', op: 'fence', uid: 1 }, H); // 울타리로 옮기면 영역에서 빠진다
    expect(acc.breed.terr.t_dust.team).toEqual([]);
    applyAction(acc, 0, { t: 'breed', op: 'team', uid: 2, terr: 't_dust' }, H);
    // 힘 15 / 요구 30 → 한 바퀴 1시간
    applyAction(acc, 0, { t: 'breed', op: 'visit' }, H + H * 3 + 10);
    expect(acc.breed.terr.t_dust.laps).toBe(3);
    // 원작처럼 영역은 싸움: 이긴 판만 향신료(채집꾼 ×2, 영역에서만 나므로 ×5)
    expect(acc.cook.spices[TER.t_dust.spice]).toBe((acc.breed.terr.t_dust.wins ?? 0) * 2 * 5);
    expect(acc.characters[0].skills.breeding.lv > 1 || acc.characters[0].skills.breeding.xp > 0).toBe(true);
  });
  it('원작처럼 개량은 DNA(놓아준 펫)와 요리로, 펫을 놓아주면 자리가 비고 DNA를 얻는다', () => {
    const { acc } = ready();
    applyAction(acc, 0, { t: 'breed', op: 'visit' }, H);
    acc.coins = 1e12;
    expect(applyAction(acc, 0, { t: 'breed', op: 'up', k: 'nest' }, H).ok).toBe(false); // 코인으로는 안 된다
    acc.breed.pets.push({ uid: 5, sp: 'b_puff', power: 1000, gene: 'shiny', rar: 0 });
    applyAction(acc, 0, { t: 'breed', op: 'fence', uid: 5 }, H);
    expect(applyAction(acc, 0, { t: 'breed', op: 'release', uid: 5 }, H).ok).toBe(true);
    expect(acc.breed.pets.length).toBe(0); expect(acc.breed.fence).toEqual([]);
    expect(acc.breed.dna).toBe(100);
    acc.cook.meals[BRD.up.nest.meal] = { lv: 0, n: 10 };
    expect(applyAction(acc, 0, { t: 'breed', op: 'up', k: 'nest' }, H).ok).toBe(true);
    expect(nCap(acc.breed)).toBe(BRD.nestBase + 1);
  });
});

import { labState as lSt, labMult as lMult, LAB_NODE as LN, nearestSpot as nSpot, weeklyJewels as wJ } from '../src/core/lab';
import { stampBonus as stB } from '../src/core/stamps';
import { kitchenSpeed as kSpd } from '../src/core/cooking';
describe('연구실', () => {
  const H = 3_600_000;
  const ready = () => {
    const { acc, c } = setup(); c.maxWorld = 4; c.mapId = 'nebtown';
    const c2 = JSON.parse(JSON.stringify(c)); c2.id = c.id + 1; c2.name = '둘째'; acc.characters.push(c2);
    return { acc, c, c2: acc.characters[1] };
  };
  it('4월드 전에는 쓸 수 없다', () => {
    const { acc, c } = ready(); c.maxWorld = 3;
    expect(applyAction(acc, 0, { t: 'lab', op: 'place', spot: 0 }, H).ok).toBe(false);
  });
  it('본체 범위에 선 캐릭터가 연결되고, 그 범위의 장치가 켜져 다른 시스템이 몇 배가 된다', () => {
    const { acc, c } = ready();
    const sp = nSpot(70, 50);
    expect(applyAction(acc, 0, { t: 'lab', op: 'place', spot: sp }, H).ok).toBe(true);
    const st = lSt(acc);
    expect(st.linked.has(c.id)).toBe(true);
    // 자동 국자: 주방 속도 ×1.25
    expect(st.on.has('n_kitchen')).toBe(true);
    expect(kSpd(acc, acc.cook.kitchens[0])).toBeCloseTo(1.25, 5);
    // 우표 증폭기: 우표 ×1.5
    acc.stamps.stamp_hp = 5;
    const hp0 = stB(acc).hp;
    expect(applyAction(acc, 0, { t: 'lab', op: 'place', spot: nSpot(70, 90) }, H).ok).toBe(true);
    expect(lSt(acc).on.has('n_xp')).toBe(true);
    expect(stB(acc).hp).toBeCloseTo(hp0 * 1.5, 5);
    // 같은 자리에 다른 캐릭터는 못 선다
    expect(applyAction(acc, 1, { t: 'lab', op: 'place', spot: nSpot(70, 90) }, H).ok).toBe(false);
  });
  it('연결은 사슬로 이어지고, 연구 레벨이 오르면 범위가 넓어진다', () => {
    const { acc, c, c2 } = ready();
    applyAction(acc, 0, { t: 'lab', op: 'place', spot: nSpot(70, 90) }, H);
    applyAction(acc, 1, { t: 'lab', op: 'place', spot: nSpot(130, 90) }, H);
    expect(lSt(acc).linked.has(c2.id)).toBe(false); // 너무 멀다
    c2.skills.lab = { lv: 10, xp: 0 };
    expect(lSt(acc).linked.has(c2.id)).toBe(true);
    expect(lSt(acc).linked.has(c.id)).toBe(true);
    // 연결된 캐릭터만 시간마다 연구 경험치
    c2.skills.lab = { lv: 1, xp: 0 };
    applyAction(acc, 0, { t: 'lab', op: 'visit' }, H * 3);
    expect(c.skills.lab.xp + (c.skills.lab.lv - 1) * 1000).toBeGreaterThan(0);
    expect(c2.skills.lab).toEqual({ lv: 1, xp: 0 });
    expect(applyAction(acc, 1, { t: 'lab', op: 'leave' }, H * 3).ok).toBe(true);
    expect(acc.lab.members.length).toBe(1);
  });
  it('보석은 이번 주 상점에 나온 것만 향신료로 열고, 범위 안이면 켜진다', () => {
    const { acc } = ready();
    acc.petSeed = 1; while (!wJ(acc.petSeed, H).includes('j_ruby')) acc.petSeed++;
    applyAction(acc, 0, { t: 'lab', op: 'place', spot: nSpot(70, 130) }, H);
    expect(applyAction(acc, 0, { t: 'lab', op: 'jewel', id: 'j_ruby' }, H).ok).toBe(false);
    for (const [s, k] of LN.j_ruby.cost!) acc.cook.spices[s] = k;
    const off = ['j_amethyst', 'j_ruby', 'j_topaz', 'j_emerald', 'j_sapphire', 'j_pearl'].find((id) => !wJ(acc.petSeed, H).includes(id))!;
    for (const [s, k] of LN[off].cost!) acc.cook.spices[s] = (acc.cook.spices[s] ?? 0) + k;
    expect(applyAction(acc, 0, { t: 'lab', op: 'jewel', id: off }, H).ok).toBe(false); // 이번 주에 없는 보석
    expect(applyAction(acc, 0, { t: 'lab', op: 'jewel', id: 'j_ruby' }, H).ok).toBe(true);
    expect(lSt(acc).on.has('j_ruby')).toBe(true);
    expect(lMult(acc, 'labxp')).toBe(1);
  });
});
