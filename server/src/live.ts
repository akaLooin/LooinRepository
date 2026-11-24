// 실시간: 같은 맵에 있는 다른 플레이어의 위치·모습 중계와 채팅.
// 전투·보상은 실시간 동기화하지 않는다(각자 자기 기기에서 돌고, 결과는 /sync 로 검증).
import type { FastifyInstance } from 'fastify';
import { jwtVerify } from 'jose';
import type { WebSocket } from 'ws';
import { z } from 'zod';

const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const itemId = z.string().regex(/^[a-z0-9_]{1,40}$/);
/** 겉으로 보이는 장비(무기·모자·갑옷) */
const Gear = z.object({ weapon: itemId.optional(), hat: itemId.optional(), body: itemId.optional() });
const Join = z.object({
  t: z.literal('join'), map: z.string().max(40), name: z.string().min(1).max(10),
  look: z.object({ hair: z.number().int().min(0).max(9), hairColor: colour, skin: colour, outfit: colour }),
  cls: z.string().max(20), level: z.number().int().min(1).max(9999), gear: Gear.optional(),
});
const GearMsg = z.object({ t: z.literal('gear'), gear: Gear });
const Pos = z.object({
  t: z.literal('pos'), x: z.number().finite(), y: z.number().finite(), f: z.union([z.literal(1), z.literal(-1)]),
  m: z.boolean(), g: z.boolean(), r: z.boolean(), s: z.number().int().min(0), k: z.string().max(12),
});
const Say = z.object({ t: z.literal('say'), text: z.string().min(1).max(200) });
const Msg = z.discriminatedUnion('t', [Join, Pos, Say, GearMsg]);

export type PlayerInfo = Omit<z.infer<typeof Join>, 't'> & Omit<z.infer<typeof Pos>, 't'> & { id: string };
export interface ChatLine { from: string; text: string; at: number }

/** 채팅 글 정리: 제어 문자 제거, 공백 정리, 길이 제한 */
export const cleanText = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
const MAX_PER_MAP = 40, HISTORY = 50;

export function registerLive(app: FastifyInstance, key: Uint8Array, now: () => number) {
  const conns = new Map<WebSocket, { id: string; account: string; info: PlayerInfo | null; lastSay: number; posCount: number; posWindow: number; gearCount: number; gearWindow: number }>();
  const history: ChatLine[] = [];
  let seq = 0;
  const send = (ws: WebSocket, msg: unknown) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
  const room = (map: string) => [...conns.entries()].filter(([, c]) => c.info?.map === map);
  const toRoom = (map: string, msg: unknown, except?: WebSocket) => { for (const [ws] of room(map)) if (ws !== except) send(ws, msg); };

  app.get('/live', { websocket: true }, async (ws: WebSocket, req) => {
    // 브라우저 WebSocket 은 헤더를 못 넣으므로 토큰은 주소에
    const token = (req.query as { token?: string }).token ?? '';
    let account: string;
    try { account = (await jwtVerify(token, key)).payload.sub ?? ''; } catch { ws.close(4001, 'unauthorized'); return; }
    const me = { id: `p${++seq}`, account, info: null as PlayerInfo | null, lastSay: 0, posCount: 0, posWindow: now(), gearCount: 0, gearWindow: now() };
    conns.set(ws, me);
    send(ws, { t: 'hello', id: me.id, history });

    ws.on('message', (raw) => {
      let m: z.infer<typeof Msg>;
      try { const p = Msg.safeParse(JSON.parse(String(raw))); if (!p.success) return; m = p.data; } catch { return; }
      if (m.t === 'join') {
        const prev = me.info?.map;
        if (prev && prev !== m.map) toRoom(prev, { t: 'left', id: me.id }, ws);
        if (room(m.map).length >= MAX_PER_MAP && prev !== m.map) { send(ws, { t: 'full' }); me.info = null; return; }
        me.info = { id: me.id, map: m.map, name: cleanText(m.name) || '모험가', look: m.look, cls: m.cls, level: m.level, gear: m.gear ?? {},
          x: me.info?.x ?? 0, y: me.info?.y ?? 0, f: 1, m: false, g: true, r: false, s: 0, k: 'attack' };
        send(ws, { t: 'state', players: room(m.map).filter(([w]) => w !== ws).map(([, c]) => c.info) });
        toRoom(m.map, { t: 'join', player: me.info }, ws);
      } else if (m.t === 'pos') {
        if (!me.info) return;
        // 초당 12번까지만
        const t = now();
        if (t - me.posWindow > 1000) { me.posWindow = t; me.posCount = 0; }
        if (++me.posCount > 12) return;
        Object.assign(me.info, { x: m.x, y: m.y, f: m.f, m: m.m, g: m.g, r: m.r, s: m.s, k: m.k });
        toRoom(me.info.map, { t: 'pos', id: me.id, x: m.x, y: m.y, f: m.f, m: m.m, g: m.g, r: m.r, s: m.s, k: m.k }, ws);
      } else if (m.t === 'gear') {
        if (!me.info) return;
        // 장비 바꾸기는 드물다: 초당 4번까지만
        const t = now();
        if (t - me.gearWindow > 1000) { me.gearWindow = t; me.gearCount = 0; }
        if (++me.gearCount > 4) return;
        me.info.gear = m.gear;
        toRoom(me.info.map, { t: 'gear', id: me.id, gear: m.gear }, ws);
      } else if (m.t === 'say') {
        if (!me.info) return;
        const t = now();
        if (t - me.lastSay < 1500) { send(ws, { t: 'slow' }); return; }
        const text = cleanText(m.text);
        if (!text) return;
        me.lastSay = t;
        const line: ChatLine = { from: me.info.name, text, at: t };
        history.push(line); if (history.length > HISTORY) history.shift();
        // 채팅은 모든 접속자에게(월드 채널), 말풍선용으로 보낸 사람 ID도 함께
        for (const [w] of conns) send(w, { t: 'chat', id: me.id, map: me.info.map, ...line });
      }
    });
    ws.on('close', () => {
      conns.delete(ws);
      if (me.info) toRoom(me.info.map, { t: 'left', id: me.id });
    });
  });
}
