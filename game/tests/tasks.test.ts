import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { RECIPES, SHOP, STORAGE_SIZE } from '../src/core/data';
import { recipeLock, createCharacter, derive, deserialize, newAccount, serialize, shopLeft, storageSize } from '../src/core/state';
import { TASK_BY_ID } from '../src/core/tasks';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => { const acc = newAccount(); createCharacter(acc, '테스트', look, 0); return { acc, c: acc.characters[0] }; };
const ri = (item: string) => RECIPES.findIndex((r) => r.item === item);

describe('작업판', () => {
  it('모든 캐릭터 기록을 합쳐 단계를 받고, 공로와 레시피를 얻는다', () => {
    const { acc, c } = setup();
    expect(recipeLock(acc, c, ri('pick_red'))).toMatch(/작업판/);
    expect(applyAction(acc, 0, { t: 'task', id: 'mining' }, 0).err).toMatch(/못 미쳤/);
    createCharacter(acc, '둘째', look, 0);
    acc.characters[1].skills.mining.lv = TASK_BY_ID.mining.tiers[0];
    expect(applyAction(acc, 0, { t: 'task', id: 'mining' }, 0).ok).toBe(true);
    expect(acc.merit).toBe(TASK_BY_ID.mining.merit[0]);
    expect(recipeLock(acc, c, ri('pick_red'))).toBeNull();
    // 같은 단계는 두 번 받지 못한다
    expect(applyAction(acc, 0, { t: 'task', id: 'mining' }, 0).ok).toBe(false);
    c.kills.meadow = 30; acc.characters[1].kills.meadow = 25;
    expect(applyAction(acc, 0, { t: 'task', id: 'kill_meadow' }, 0).ok).toBe(true);
  });
  it('공로 상점: 창고·방치·순간이동 보너스', () => {
    const { acc, c } = setup();
    acc.merit = 20;
    const afk0 = derive(c, acc).afkFight;
    expect(applyAction(acc, 0, { t: 'merit', id: 'storage' }, 0).ok).toBe(true);
    expect(storageSize(acc)).toBe(STORAGE_SIZE + 4);
    expect(applyAction(acc, 0, { t: 'merit', id: 'afk' }, 0).ok).toBe(true);
    expect(derive(c, acc).afkFight).toBeGreaterThan(afk0);
    const ti = SHOP.findIndex((e) => e.item === 'tp_ticket'), base = shopLeft(acc, ti, 0);
    applyAction(acc, 0, { t: 'merit', id: 'teleport' }, 0);
    expect(shopLeft(acc, ti, 0)).toBe(base + 2); // 순간이동 티켓 하루 구매 수
    acc.merit = 0;
    expect(applyAction(acc, 0, { t: 'merit', id: 'xp' }, 0).err).toMatch(/부족/);
  });
  it('예전 저장에는 빈 작업판이 생긴다', () => {
    const { acc } = setup();
    const raw = JSON.parse(serialize(acc)); delete raw.tasks; delete raw.merit; delete raw.meritShop;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.tasks).toEqual({}); expect(back.merit).toBe(0);
  });
});
