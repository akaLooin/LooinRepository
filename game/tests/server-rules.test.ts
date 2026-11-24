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
    expect(t((_, a) => { a.cards.oak = 30; })).toMatch(/카드/);
    expect(t((_, a) => { a.cards.nope = 1; })).toMatch(/카드/);
    expect(t((_, a) => { a.cards.oak = (a.cards.oak ?? 0) + 1; })).toBeNull(); // 한 장은 운이 좋으면 가능
    // 같은 기록이라도 서버가 잰 시간이 너무 짧으면 거절
    expect(checkSync(server, 0, c, ca, 2)).not.toBeNull();
  });
});

describe('공격 바', () => {
  it('액티브를 배우면 빈 칸에 놓이고, 칸 옮기기·비우기·장 넘기기, 배우지 않은 것은 못 놓는다', () => {
    const acc = setup(), c = acc.characters[0];
    c.talentPoints = 5;
    expect(applyAction(acc, 0, { t: 'talent', id: 'smash' }, 0).ok).toBe(true);
    expect(c.attackBars[0][0]).toBe('smash');
    expect(applyAction(acc, 0, { t: 'barSet', bar: 0, slot: 3, id: 'heal' }, 0).err).toMatch(/배우지/);
    applyAction(acc, 0, { t: 'talent', id: 'heal' }, 0);
    expect(c.attackBars[0][1]).toBe('heal');
    // 강타를 4번째 칸으로 옮기면 원래 칸은 비거나 그 칸에 있던 것과 자리를 바꾼다
    expect(applyAction(acc, 0, { t: 'barSet', bar: 0, slot: 3, id: 'smash' }, 0).ok).toBe(true);
    expect(c.attackBars[0].slice(0, 4)).toEqual([null, 'heal', null, 'smash']);
    expect(applyAction(acc, 0, { t: 'barSet', bar: 0, slot: 1, id: 'sharp' }, 0).err).toMatch(/액티브/);
    expect(applyAction(acc, 0, { t: 'barSet', bar: 0, slot: 1, id: null }, 0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'barPage', page: 1 }, 0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'barPage', page: 5 }, 0).ok).toBe(false);
  });
  it('자동은 지금 장의 왼쪽부터 시전하고, 옵션을 끄면 쓰지 않는다', () => {
    const acc = setup(), c = acc.characters[0];
    c.mapId = 'meadow'; c.auto = true; c.talents = { smash: 1 }; c.attackBars[0] = ['smash', null, null, null, null, null];
    const run = () => {
      const w = new World(acc, c, new Rng(2));
      let casts = 0;
      for (let i = 0; i < 60 * 40; i++) { w.step(1 / 60, { move: 0, climb: 0 }); casts += w.events.filter((e) => e.t === 'cast').length; w.events.length = 0; }
      return casts;
    };
    expect(run()).toBeGreaterThan(0);
    applyAction(acc, 0, { t: 'option', autoAttacks: false }, 0);
    expect(run()).toBe(0);
    applyAction(acc, 0, { t: 'option', autoAttacks: true }, 0);
    applyAction(acc, 0, { t: 'barPage', page: 1 }, 0); // 빈 장
    expect(run()).toBe(0);
  });
  it('예전 저장: 배운 액티브가 공격 바 첫 장에 놓인다', () => {
    const acc = setup(); const raw = JSON.parse(serialize(acc));
    raw.characters[0].talents = { smash: 2, sharp: 3, heal: 1 }; delete raw.characters[0].attackBars; delete raw.options;
    const a = deserialize(JSON.stringify(raw))!;
    expect(a.characters[0].attackBars[0].filter(Boolean)).toEqual(['smash', 'heal']);
    expect(a.options.autoAttacks).toBe(true);
  });
  it('플레이 기록으로 공격 바를 바꿀 수는 없다', () => {
    const { server, c, ca } = play('meadow', 30);
    const x = clone(c); x.attackBars[0][0] = 'smash';
    expect(checkSync(server, 0, x, ca, 30)).toMatch(/attackBars/);
  });
});

describe('지도 순간이동', () => {
  it('열린 맵만, 마을은 무료, 나머지는 하루 횟수를 쓰고 날이 바뀌면 채워진다', () => {
    const acc = setup(), c = acc.characters[0];
    const day1 = new Date(2026, 0, 1, 12).getTime(), day3 = new Date(2026, 0, 3, 12).getTime();
    expect(applyAction(acc, 0, { t: 'teleport', map: 'hills' }, day1).err).toMatch(/열리지/);
    expect(applyAction(acc, 0, { t: 'teleport', map: 'meadow' }, day1).ok).toBe(true);
    const n = acc.teleports.n;
    c.kills.meadow = 15;
    expect(applyAction(acc, 0, { t: 'teleport', map: 'hills' }, day1).ok).toBe(true);
    expect(acc.teleports.n).toBe(n - 1);
    expect(applyAction(acc, 0, { t: 'teleport', map: 'town' }, day1).ok).toBe(true);
    expect(acc.teleports.n).toBe(n - 1); // 마을은 무료
    acc.teleports.n = 0;
    expect(applyAction(acc, 0, { t: 'teleport', map: 'meadow' }, day1).err).toMatch(/다 썼/);
    expect(applyAction(acc, 0, { t: 'teleport', map: 'meadow' }, day3).ok).toBe(true); // 이틀 치가 쌓임
    expect(acc.teleports.n).toBe(9);
  });
});
