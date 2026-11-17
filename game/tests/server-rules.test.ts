import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { Rng } from '../src/core/rng';
import { addItem, countItem, createCharacter, deserialize, newAccount, serialize } from '../src/core/state';
import { acceptSync, checkSync } from '../src/core/sync';
import { World } from '../src/core/world';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => { const acc = newAccount(); createCharacter(acc, '테스트', look, 0); return acc; };
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** 서버 사본(server)과 기기 사본(client)을 따로 두고, 기기에서 실제로 seconds 동안 자동 사냥 */
function play(mapId: string, seconds: number, prep?: (a: ReturnType<typeof setup>) => void) {
  const server = setup();
  server.characters[0].mapId = mapId; server.characters[0].auto = true;
  prep?.(server);
  const client = clone(server);
  const w = new World(client, client.characters[0], new Rng(9));
  for (let i = 0; i < seconds * 60; i++) { w.step(1 / 60, { move: 0, climb: 0 }); w.events.length = 0; }
  const c = client.characters[0];
  return { server, client, c, ca: { coins: client.coins, cards: client.cards, bosses: client.bosses } };
}

describe('행동(서버·기기 공용)', () => {
  it('실패한 행동은 상태를 바꾸지 않는다', () => {
    const acc = setup();
    const before = serialize(acc);
    expect(applyAction(acc, 0, { t: 'stat', stat: 'str' }, 0).ok).toBe(false);
    expect(applyAction(acc, 0, { t: 'equip', id: 'sword_leaf' }, 0).ok).toBe(false);
    expect(serialize(acc)).toBe(before);
  });
  it('이동은 처치 조건과 열쇠를 확인하고, 열쇠를 쓴다', () => {
    const acc = setup(), c = acc.characters[0];
    c.mapId = 'meadow';
    const toHills = 1;
    expect(applyAction(acc, 0, { t: 'travel', portal: toHills }, 0).err).toMatch(/처치/);
    c.kills.meadow = 15;
    expect(applyAction(acc, 0, { t: 'travel', portal: toHills }, 0).ok).toBe(true);
    expect(c.mapId).toBe('hills');
    c.mapId = 'forest'; c.kills.forest = 60;
    expect(applyAction(acc, 0, { t: 'travel', portal: 1 }, 0).err).toMatch(/열쇠/);
    addItem(c, 'forest_key');
    expect(applyAction(acc, 0, { t: 'travel', portal: 1 }, 0).ok).toBe(true);
    expect(c.mapId).toBe('lair');
    expect(countItem(c, 'forest_key')).toBe(0);
  });
  it('대상 지정은 그 맵에 있는 자원만', () => {
    const acc = setup(); acc.characters[0].mapId = 'meadow';
    expect(applyAction(acc, 0, { t: 'target', activity: { k: 'gather', node: 'redrock' } }, 0).ok).toBe(false);
    expect(applyAction(acc, 0, { t: 'target', activity: { k: 'gather', node: 'oak' } }, 0).ok).toBe(true);
  });
});

describe('플레이 기록 검증', () => {
  it('실제로 3분 사냥한 기록은 통과하고 반영된다', () => {
    const { server, c, ca } = play('meadow', 180);
    expect(c.kills.meadow).toBeGreaterThan(10);
    expect(checkSync(server, 0, c, ca, 180)).toBeNull();
    acceptSync(server, 0, c, ca, 999);
    expect(server.characters[0].kills.meadow).toBe(c.kills.meadow);
    expect(server.characters[0].lastActive).toBe(999);
    expect(deserialize(serialize(server))).not.toBeNull();
  });
  it('실제 채집과 모루 생산도 통과한다', () => {
    const { server, c, ca } = play('meadow', 120, (a) => {
      a.characters[0].activity = { k: 'gather', node: 'oak' };
      a.characters[0].anvil.slots[0].prod = 'twine';
    });
    expect(countItem(c, 'log')).toBeGreaterThan(0);
    expect(c.anvil.slots[0].stored).toBeGreaterThan(0);
    expect(checkSync(server, 0, c, ca, 120)).toBeNull();
  });
  it('보스 처치는 보스방에서 한 번만 인정', () => {
    const { server, c, ca } = play('lair', 150, (a) => { const ch = a.characters[0]; ch.level = 40; ch.stats.luk = 120; });
    expect(ca.bosses.mossking).toBe(1);
    expect(checkSync(server, 0, c, ca, 150)).toBeNull();
    expect(checkSync(server, 0, c, { ...ca, bosses: { mossking: 2 } }, 150)).toMatch(/보스/);
  });
  it('조작한 기록은 거절한다', () => {
    const { server, c, ca } = play('meadow', 60);
    const t = (f: (x: typeof c, a: typeof ca) => void) => { const x = clone(c), a = clone(ca); f(x, a); return checkSync(server, 0, x, a, 60); };
    expect(t((_, a) => { a.coins += 5000; })).toMatch(/코인/);
    expect(t((x) => { x.kills.meadow += 5000; })).toMatch(/처치/);
    expect(t((x) => { x.level += 5; x.statPoints += 15; x.talentPoints += 5; })).toMatch(/경험치/);
    expect(t((x) => { x.inventory.push({ id: 'sword_leaf', qty: 1 }); })).toMatch(/잎새 칼/);
    expect(t((x) => { x.inventory.push({ id: 'moss', qty: 9999 }); })).toMatch(/이끼/);
    expect(t((x) => { x.equipment.weapon = 'sword_leaf'; })).toMatch(/equipment/);
    expect(t((x) => { x.stats.luk = 99; })).toMatch(/stats/);
    expect(t((x) => { x.mapId = 'forest'; })).toMatch(/mapId/);
    expect(t((_, a) => { a.cards.leafling = 50; })).toMatch(/카드/);
    // 같은 기록이라도 서버가 잰 시간이 너무 짧으면 거절
    expect(checkSync(server, 0, c, ca, 2)).not.toBeNull();
  });
});
