import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { cleanText } from '../src/live';
import { MemoryStore } from '../src/store';

const look = { hair: 0, hairColor: '#112233', skin: '#ffd9b8', outfit: '#e25d4e' };
/** 받은 메시지를 모아 두고, 조건에 맞는 메시지를 기다린다 */
function inbox() {
  const got: Record<string, unknown>[] = [];
  return {
    onInit: (ws: { on: (e: string, f: (d: unknown) => void) => void }) => ws.on('message', (d) => got.push(JSON.parse(String(d)))),
    got,
    wait: async (pred: (m: Record<string, unknown>) => boolean, ms = 2000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) { const m = got.find(pred); if (m) return m; await new Promise((r) => setTimeout(r, 10)); }
      throw new Error('메시지가 오지 않았습니다: ' + JSON.stringify(got));
    },
  };
}

describe('실시간', () => {
  it('토큰이 없으면 끊고, 같은 맵 사람끼리 위치를 주고받고, 채팅은 모두에게', async () => {
    let t = 1_000_000;
    const app = buildApp({ store: new MemoryStore(), secret: 'x'.repeat(40), now: () => t });
    await app.ready();
    const tok = async () => (await app.inject({ method: 'POST', url: '/auth/guest' })).json().token as string;

    const bad = await app.injectWS('/live?token=nope');
    const closed = await new Promise<number>((r) => bad.on('close', (code: number) => r(code)));
    expect(closed).toBe(4001);

    const ia = inbox(), ib = inbox(), ic = inbox();
    const a = await app.injectWS(`/live?token=${await tok()}`, {}, { onInit: ia.onInit });
    const b = await app.injectWS(`/live?token=${await tok()}`, {}, { onInit: ib.onInit });
    const c = await app.injectWS(`/live?token=${await tok()}`, {}, { onInit: ic.onInit });
    await ia.wait((m) => m.t === 'hello'); await ib.wait((m) => m.t === 'hello'); await ic.wait((m) => m.t === 'hello');
    a.send(JSON.stringify({ t: 'join', map: 'meadow', name: '에이', look, cls: 'beginner', level: 3 }));
    await ia.wait((m) => m.t === 'state');
    b.send(JSON.stringify({ t: 'join', map: 'meadow', name: '비', look, cls: 'archer', level: 12 }));
    c.send(JSON.stringify({ t: 'join', map: 'hills', name: '씨', look, cls: 'mage', level: 20 }));
    const st = await ib.wait((m) => m.t === 'state');
    expect((st.players as { name: string }[]).map((p) => p.name)).toEqual(['에이']);
    await ia.wait((m) => m.t === 'join' && (m.player as { name: string }).name === '비');

    a.send(JSON.stringify({ t: 'pos', x: 120, y: -48, f: -1, m: true, g: true, r: false, s: 3, k: 'attack' }));
    const pos = await ib.wait((m) => m.t === 'pos');
    expect(pos.x).toBe(120);
    await new Promise((r) => setTimeout(r, 100));
    expect(ic.got.some((m) => m.t === 'pos')).toBe(false); // 다른 맵에는 가지 않는다

    // 장비 겉모습: 들어올 때 함께, 바꾸면 같은 맵에만
    a.send(JSON.stringify({ t: 'gear', gear: { weapon: 'sword_stone', hat: 'hat_moss' } }));
    const gear = await ib.wait((m) => m.t === 'gear');
    expect(gear.gear).toEqual({ weapon: 'sword_stone', hat: 'hat_moss' });
    a.send(JSON.stringify({ t: 'gear', gear: { hat: '../evil' } }));
    await new Promise((r) => setTimeout(r, 100));
    expect(ib.got.filter((m) => m.t === 'gear')).toHaveLength(1); // 이상한 id 는 버린다
    expect(ic.got.some((m) => m.t === 'gear')).toBe(false);
    const id = inbox();
    const d = await app.injectWS(`/live?token=${await tok()}`, {}, { onInit: id.onInit });
    await id.wait((m) => m.t === 'hello');
    d.send(JSON.stringify({ t: 'join', map: 'meadow', name: '디', look, cls: 'beginner', level: 1 }));
    const late = await id.wait((m) => m.t === 'state');
    expect((late.players as { name: string; gear: unknown }[]).find((p) => p.name === '에이')?.gear).toEqual({ weapon: 'sword_stone', hat: 'hat_moss' });
    d.terminate();

    a.send(JSON.stringify({ t: 'say', text: '  안녕\u0007 하세요  ' }));
    const chat = await ic.wait((m) => m.t === 'chat');
    expect(chat.text).toBe('안녕 하세요');
    expect(chat.from).toBe('에이');
    a.send(JSON.stringify({ t: 'say', text: '도배' }));
    await ia.wait((m) => m.t === 'slow');
    t += 2000;
    a.send(JSON.stringify({ t: 'say', text: '이제 됨' }));
    await ib.wait((m) => m.t === 'chat' && m.text === '이제 됨');

    a.terminate();
    await ib.wait((m) => m.t === 'left');
    b.terminate(); c.terminate();
    await app.close();
  });
  it('채팅 글 정리', () => {
    expect(cleanText('a‮b\n\nc')).toBe('ab c');
    expect(cleanText('x'.repeat(500))).toHaveLength(120);
  });
});
