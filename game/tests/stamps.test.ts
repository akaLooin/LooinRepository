import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { BRIBES, STAMP_LV } from '../src/core/data';
import { STAMP_BY_ID, stampCost, stampValue } from '../src/core/stamps';
import { addItem, countItem, createCharacter, derive, deserialize, newAccount, serialize } from '../src/core/state';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => { const acc = newAccount(); createCharacter(acc, '테스트', look, 0); acc.coins = 100_000; return { acc, c: acc.characters[0] }; };

describe('우표', () => {
  it(`Lv.${STAMP_LV}부터 넣을 수 있고, 넣으면 계정 전체 능력치가 오른다`, () => {
    const { acc, c } = setup();
    addItem(c, 'stamp_hp', 1);
    expect(applyAction(acc, 0, { t: 'stampIn', id: 'stamp_hp' }, 0).err).toMatch(/Lv/);
    c.level = STAMP_LV;
    const before = derive(c, acc).maxHp;
    expect(applyAction(acc, 0, { t: 'stampIn', id: 'stamp_hp' }, 0).ok).toBe(true);
    expect(countItem(c, 'stamp_hp')).toBe(0);
    expect(acc.stamps.stamp_hp).toBe(1);
    expect(derive(c, acc).maxHp).toBeGreaterThan(before);
    // 다른 캐릭터도 같은 효과
    createCharacter(acc, '둘째', look, 0);
    const c2 = acc.characters[1];
    expect(derive(c2, acc).maxHp).toBeGreaterThan(derive(c2, { cards: acc.cards }).maxHp);
  });
  it('올리기는 코인과 재료(가방 → 창고)를 쓰고 값이 점점 오른다', () => {
    const { acc, c } = setup();
    c.level = STAMP_LV; acc.stamps.stamp_hp = 1;
    const s = STAMP_BY_ID.stamp_hp, cost1 = stampCost(acc, s);
    expect(applyAction(acc, 0, { t: 'stampUp', id: 'stamp_hp' }, 0).err).toMatch(/부족/);
    acc.storage.push({ id: cost1.mat, qty: 500 });
    expect(applyAction(acc, 0, { t: 'stampUp', id: 'stamp_hp' }, 0).ok).toBe(true);
    expect(acc.stamps.stamp_hp).toBe(2);
    expect(stampCost(acc, s).coins).toBeGreaterThan(cost1.coins);
    // 점점 덜 오르는 우표는 상한에 가까워진다
    const sat = STAMP_BY_ID.stamp_dmg;
    expect(stampValue(sat, 1000)).toBeLessThan(sat.a);
    expect(stampValue(sat, 10)).toBeGreaterThan(stampValue(sat, 5));
  });
  it('후원 계약은 차례대로 한 번씩 산다', () => {
    const { acc, c } = setup();
    c.level = STAMP_LV; acc.stamps.stamp_hp = 3;
    const before = stampCost(acc, STAMP_BY_ID.stamp_hp).coins;
    expect(applyAction(acc, 0, { t: 'bribe' }, 0).ok).toBe(true); // 우표 할인
    expect(stampCost(acc, STAMP_BY_ID.stamp_hp).coins).toBeLessThan(before);
    for (let i = 1; i < BRIBES.length; i++) applyAction(acc, 0, { t: 'bribe' }, 0);
    // 다음 세트는 그 월드에 가야 열린다
    expect(acc.bribes).toBe(BRIBES.filter((b) => b.set === 1).length);
    c.maxWorld = 4; acc.coins = 1e12;
    for (let i = acc.bribes; i < BRIBES.length; i++) applyAction(acc, 0, { t: 'bribe' }, 0);
    expect(acc.bribes).toBe(BRIBES.length);
    expect(applyAction(acc, 0, { t: 'bribe' }, 0).ok).toBe(false);
  });
  it('예전 저장에는 빈 우표함이 생긴다', () => {
    const { acc } = setup();
    const raw = JSON.parse(serialize(acc)); delete raw.stamps; delete raw.bribes;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.stamps).toEqual({}); expect(back.bribes).toBe(0);
  });
});
