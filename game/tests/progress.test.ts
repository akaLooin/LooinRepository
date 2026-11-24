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
