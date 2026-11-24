import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { FORGE, SMELTS } from '../src/core/data';
import { forgeSettle, smeltSeconds } from '../src/core/forge';
import { addItem, countItem, createCharacter, deserialize, newAccount, serialize } from '../src/core/state';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => { const acc = newAccount(); createCharacter(acc, '테스트', look, 0); acc.coins = 10_000; return { acc, c: acc.characters[0] }; };
const sm = SMELTS[0];

describe('용광로', () => {
  it('사고, 광석을 넣으면 시간이 흘러 주괴가 되고, 꺼낼 수 있다', () => {
    const { acc, c } = setup();
    expect(applyAction(acc, 0, { t: 'forgeLoad', slot: 0, ore: 'ore' }, 0).ok).toBe(false); // 아직 없다
    expect(applyAction(acc, 0, { t: 'forgeBuy' }, 0).ok).toBe(true);
    expect(acc.coins).toBe(10_000 - FORGE.price);
    addItem(c, 'ore', 20);
    expect(applyAction(acc, 0, { t: 'forgeLoad', slot: 0, ore: 'ore' }, 0).ok).toBe(true);
    expect(countItem(c, 'ore')).toBe(0);
    const sec = smeltSeconds(acc.forge, acc.forge.slots[0]);
    forgeSettle(acc, sec * 1000 * 3 + 10);
    expect(acc.forge.slots[0].bars).toBe(3);
    expect(acc.forge.slots[0].qty).toBe(20 - 3 * sm.need);
    // 기기가 본 개수만큼만 꺼낸다
    const r = applyAction(acc, 0, { t: 'forgeCollect', slot: 0, toStorage: false, n: 2 }, sec * 1000 * 3 + 10);
    expect(r.n).toBe(2);
    expect(countItem(c, sm.bar)).toBe(2);
  });
  it('다 녹이면 끝까지 멈추고, 남은 광석은 꺼낼 때 돌려준다', () => {
    const { acc, c } = setup();
    applyAction(acc, 0, { t: 'forgeBuy' }, 0);
    addItem(c, 'ore', 7);
    applyAction(acc, 0, { t: 'forgeLoad', slot: 0, ore: 'ore' }, 0);
    const r = applyAction(acc, 0, { t: 'forgeCollect', slot: 0, toStorage: false, n: 99 }, 3600_000);
    expect(r.n).toBe(2);
    expect(countItem(c, 'ore')).toBe(1); // 3개에 못 미치는 1개
    expect(acc.forge.slots[0].ore).toBeNull();
  });
  it('기름과 속도 강화는 빨라지되 이미 진행한 몫은 잃지 않는다', () => {
    const { acc, c } = setup();
    applyAction(acc, 0, { t: 'forgeBuy' }, 0);
    addItem(c, 'ore', 24); addItem(c, 'forge_oil', 1);
    applyAction(acc, 0, { t: 'forgeLoad', slot: 0, ore: 'ore' }, 0);
    const base = smeltSeconds(acc.forge, acc.forge.slots[0]);
    const half = base * 500;
    expect(applyAction(acc, 0, { t: 'forgeOil', slot: 0 }, half).err).toBeUndefined();
    expect(smeltSeconds(acc.forge, acc.forge.slots[0])).toBeCloseTo(base / FORGE.oilSpeed);
    // 남은 절반은 빨라진 속도로
    forgeSettle(acc, half + (base / FORGE.oilSpeed) * 500 + 5);
    expect(acc.forge.slots[0].bars).toBe(1);
    expect(applyAction(acc, 0, { t: 'forgeUp', k: 'speed' }, half + 1000).err).toBeUndefined();
    expect(acc.forge.up.speed).toBe(1);
    expect(applyAction(acc, 0, { t: 'forgeUp', k: 'slots' }, half + 1000).err).toBeUndefined();
    forgeSettle(acc, half + 2000);
    expect(acc.forge.slots).toHaveLength(FORGE.slotsBase + 1);
  });
  it('예전 저장에는 용광로가 비어 있는 채로 생긴다', () => {
    const { acc } = setup();
    const raw = JSON.parse(serialize(acc)); delete raw.forge;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.forge.owned).toBe(false);
  });
});
