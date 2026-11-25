import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { CARD_PRESET_LV, CARD_SETS, FAMILY_SLOTS, SIGN_LV, statueNeed } from '../src/core/data';
import { charSlots, setTier, statueLevel } from '../src/core/progress';
import { addItem, createCharacter, derive, deserialize, newAccount, serialize } from '../src/core/state';

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
    c.level = TALENT_PRESET_LV; c.talentPoints = 5;
    applyAction(acc, 0, { t: 'talent', id: 'smash' }, 0); applyAction(acc, 0, { t: 'talent', id: 'smash' }, 0);
    applyAction(acc, 0, { t: 'barSet', bar: 0, slot: 0, id: 'smash' }, 0);
    expect(applyAction(acc, 0, { t: 'talentPreset', i: 1 }, 0).ok).toBe(true);
    expect(c.talents).toEqual({}); expect(c.talentPoints).toBe(5); expect(c.attackBars[0][0]).toBeNull();
    applyAction(acc, 0, { t: 'talent', id: 'heal' }, 0);
    expect(applyAction(acc, 0, { t: 'talentPreset', i: 0 }, 0).ok).toBe(true);
    expect(c.talents.smash).toBe(2); expect(c.talentPoints).toBe(3); expect(c.attackBars[0][0]).toBe('smash');
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

import { owlCost, weekKey } from '../src/core/companions';
describe('동료·부엉이', () => {
  it('동료는 주 1회, 처음엔 없는 동료부터 오고 같은 주엔 다시 안 온다', () => {
    const { acc, c } = setup();
    const t0 = new Date('2026-11-24T12:00:00').getTime();
    const before = derive(c, acc);
    expect(applyAction(acc, 0, { t: 'pet' }, t0).ok).toBe(true);
    expect(Object.keys(acc.pets)).toHaveLength(1);
    expect(applyAction(acc, 0, { t: 'pet' }, t0 + 3600_000).ok).toBe(false);
    const next = t0 + 7 * 86400_000;
    expect(weekKey(next)).toBe(weekKey(t0) + 1);
    expect(applyAction(acc, 0, { t: 'pet' }, next).ok).toBe(true);
    expect(Object.keys(acc.pets)).toHaveLength(2);
    const after = derive(c, acc);
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
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
  it('토템: 혼령 수로 영혼, 끝까지 지키면 1.5배, 영혼으로 축복', () => {
    const { acc, c } = setup();
    expect(applyAction(acc, 0, { t: 'totem', kills: 40, survived: true }, 0).n).toBe(30);
    expect(applyAction(acc, 0, { t: 'totem', kills: 5000, survived: false }, 0).n).toBe(TOTEM.maxKills / 2);
    const d0 = derive(c, acc).dmg;
    expect(applyAction(acc, 0, { t: 'bless', k: 'dmg' }, 0).ok).toBe(true);
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
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
