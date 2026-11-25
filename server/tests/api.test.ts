import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Rng } from '../../game/src/core/rng';
import { World } from '../../game/src/core/world';
import { buildApp } from '../src/app';
import { MemoryStore, SqlStore, Store, migrate } from '../src/store';

const look = { hair: 0, hairColor: '#112233', skin: '#ffd9b8', outfit: '#e25d4e' };
const uuid = () => crypto.randomUUID();

async function makeStores(): Promise<[string, () => Promise<Store>][]> {
  return [
    ['메모리', async () => new MemoryStore()],
    ['Postgres(PGlite)', async () => {
      const db = new PGlite();
      await migrate(db, [{ name: '001_init.sql', sql: readFileSync(join(import.meta.dirname, '..', 'migrations', '001_init.sql'), 'utf8') }]);
      return new SqlStore(db);
    }],
  ];
}

for (const [label, make] of await makeStores()) {
  describe(`API (${label})`, () => {
    async function setup() {
      let t = 1_700_000_000_000;
      const app = buildApp({ store: await make(), secret: 'x'.repeat(40), now: () => t });
      const call = async (method: 'GET' | 'POST' | 'DELETE', url: string, token?: string, body?: unknown) => {
        const r = await app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload: body as object });
        return { code: r.statusCode, json: r.json() };
      };
      const guest = async () => (await call('POST', '/auth/guest')).json as { accountId: string; deviceKey: string; token: string };
      return { app, call, guest, tick: (ms: number) => { t += ms; }, now: () => t };
    }

    it('게스트 가입 → 기기 키로 다시 로그인, 틀린 키·토큰은 거절', async () => {
      const { call, guest } = await setup();
      const g = await guest();
      expect(g.token).toBeTruthy();
      expect((await call('POST', '/auth/login', undefined, { accountId: g.accountId, deviceKey: g.deviceKey })).code).toBe(200);
      expect((await call('POST', '/auth/login', undefined, { accountId: g.accountId, deviceKey: 'w'.repeat(43) })).code).toBe(401);
      expect((await call('GET', '/account')).code).toBe(401);
      expect((await call('GET', '/account', 'nope')).code).toBe(401);
    });

    it('다른 계정의 데이터는 보이지 않는다', async () => {
      const { call, guest } = await setup();
      const a = await guest(), b = await guest();
      await call('POST', '/characters', a.token, { name: '에이', look });
      const mine = await call('GET', '/account', b.token);
      expect(mine.json.account.characters).toHaveLength(0);
      // b 가 자기 계정의 0번 캐릭터(없음)를 건드려도 a 에는 영향이 없다
      expect((await call('POST', '/characters/0/enter', b.token)).json.error).toBeTruthy();
    });
    it('캐릭터 삭제: 이름이 맞아야 지우고, 창고 등 계정 기록은 남는다', async () => {
      const { call, guest } = await setup();
      const g = await guest();
      await call('POST', '/characters', g.token, { name: '삭제될이', look });
      expect((await call('DELETE', '/characters/0', g.token, { name: '다른이름' })).json.error).toMatch(/이름/);
      const r = await call('DELETE', '/characters/0', g.token, { name: '삭제될이' });
      expect(r.json.ok).toBe(true);
      expect(r.json.account.characters).toHaveLength(0);
      expect((await call('DELETE', '/characters/0', g.token, { name: '삭제될이' })).json.error).toBeTruthy();
    });

    it('방치 보상은 서버 시계로 서버가 계산한다', async () => {
      const { call, guest, tick } = await setup();
      const g = await guest();
      await call('POST', '/characters', g.token, { name: '루인', look });
      // 마을→풀밭 이동은 처치 조건이 없다
      const mv = await call('POST', '/characters/0/action', g.token, { commandId: uuid(), action: { t: 'travel', portal: 0 } });
      expect(mv.json.ok).toBe(true);
      await call('POST', '/characters/0/enter', g.token);
      tick(2 * 3600_000);
      const r = await call('POST', '/characters/0/enter', g.token);
      expect(r.json.report.mode).toBe('fight');
      expect(r.json.report.kills).toBeGreaterThan(100);
      expect(r.json.account.coins).toBe(r.json.report.coins);
      // 바로 다시 들어가면 보상 없음
      expect((await call('POST', '/characters/0/enter', g.token)).json.report).toBeNull();
    });

    it('행동은 서버에서 규칙대로, 같은 요청은 한 번만 적용', async () => {
      const { call, guest } = await setup();
      const g = await guest();
      await call('POST', '/characters', g.token, { name: '루인', look });
      const bad = await call('POST', '/characters/0/action', g.token, { commandId: uuid(), action: { t: 'stat', stat: 'str' } });
      expect(bad.json.ok).toBe(false);
      expect(bad.json.account).toBeTruthy(); // 실패하면 서버 상태를 돌려준다
      const cmd = uuid();
      const a1 = await call('POST', '/characters/0/action', g.token, { commandId: cmd, action: { t: 'auto', on: true } });
      const a2 = await call('POST', '/characters/0/action', g.token, { commandId: cmd, action: { t: 'auto', on: true } });
      expect(a1.json).toEqual(a2.json);
      expect((await call('POST', '/characters/0/action', g.token, { commandId: uuid(), action: { t: 'nope' } })).code).toBe(400);
    });

    it('접속 중 실제 플레이 기록은 통과, 조작한 기록은 거절되고 서버 상태가 돌아온다', async () => {
      const { call, guest, tick } = await setup();
      const g = await guest();
      await call('POST', '/characters', g.token, { name: '루인', look });
      await call('POST', '/characters/0/action', g.token, { commandId: uuid(), action: { t: 'travel', portal: 0 } });
      await call('POST', '/characters/0/enter', g.token);
      // 기기: 서버 상태를 받아 2분 동안 자동 사냥
      const acc = (await call('GET', '/account', g.token)).json.account;
      const c = acc.characters[0]; c.auto = true;
      const w = new World(acc, c, new Rng(3));
      for (let i = 0; i < 120 * 60; i++) { w.step(1 / 60, { move: 0, climb: 0 }); w.events.length = 0; }
      tick(120_000);
      const ok = await call('POST', '/characters/0/sync', g.token, { commandId: uuid(), character: c, coins: acc.coins, cards: acc.cards, bosses: acc.bosses });
      expect(ok.json.ok).toBe(true);
      const after = (await call('GET', '/account', g.token)).json.account;
      expect(after.characters[0].kills.meadow).toBe(c.kills.meadow);
      // 조작: 코인 부풀리기
      tick(10_000);
      const bad = await call('POST', '/characters/0/sync', g.token, { commandId: uuid(), character: after.characters[0], coins: after.coins + 99999, cards: after.cards, bosses: after.bosses });
      expect(bad.json.ok).toBe(false);
      expect(bad.json.account.coins).toBe(after.coins);
    });

    it('기록을 실은 행동: 방금 주운 재료로 바로 제작', async () => {
      const { call, guest, tick } = await setup();
      const g = await guest();
      await call('POST', '/characters', g.token, { name: '루인', look });
      await call('POST', '/characters/0/action', g.token, { commandId: uuid(), action: { t: 'travel', portal: 0 } });
      await call('POST', '/characters/0/enter', g.token);
      const acc = (await call('GET', '/account', g.token)).json.account;
      const c = acc.characters[0]; c.auto = true;
      const w = new World(acc, c, new Rng(5));
      for (let i = 0; i < 240 * 60; i++) { w.step(1 / 60, { move: 0, climb: 0 }); w.events.length = 0; }
      tick(240_000);
      const moss = c.inventory.find((s: { id: string }) => s.id === 'moss')?.qty ?? 0;
      expect(moss).toBeGreaterThan(0);
      const r = await call('POST', '/characters/0/action', g.token, {
        commandId: uuid(), action: { t: 'sell', id: 'moss', qty: moss },
        sync: { character: c, coins: acc.coins, cards: acc.cards, bosses: acc.bosses },
      });
      expect(r.json.ok).toBe(true);
      expect(r.json.n).toBe(moss);
    });

    it('계정 삭제', async () => {
      const { call, guest } = await setup();
      const g = await guest();
      expect((await call('DELETE', '/account', g.token)).json.ok).toBe(true);
      expect((await call('GET', '/account', g.token)).code).toBe(404);
    });
  });
}
