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
