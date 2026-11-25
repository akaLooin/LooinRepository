// HTTP API. 모든 게임 규칙은 game/src/core 를 그대로 가져다 쓴다(기기와 서버가 같은 코드).
// 원칙: 보상이 생기는 순간(방치 보상, 접속 중 플레이 기록)은 서버 시계로 서버가 계산·검증한다.
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { z } from 'zod';
import { Action, applyAction } from '../../game/src/core/actions';
import { computeAfk } from '../../game/src/core/afk';
import { HAIR_STYLES } from '../../game/src/core/data';
import { charSlots } from '../../game/src/core/progress';
import { Rng } from '../../game/src/core/rng';
import { Account, Character, createCharacter, deserialize, newAccount, serialize, deleteCharacter } from '../../game/src/core/state';
import { SyncAccount, acceptSync, checkSync } from '../../game/src/core/sync';
import { registerLive } from './live';
import { Store } from './store';

export interface AppOptions {
  store: Store;
  /** 토큰 서명 키(32바이트 이상) */
  secret: string;
  /** 서버 시계(테스트에서 바꿔 끼운다) */
  now?: () => number;
  /** 허용할 웹 출처. 기본은 전부(모바일 앱은 출처가 없다) */
  origins?: string[];
  logger?: boolean;
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// ───────── 입력 검증 ─────────
const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const Look = z.object({ hair: z.number().int().min(0).max(HAIR_STYLES - 1), hairColor: colour, skin: colour, outfit: colour });
const id = z.string().min(1).max(40);
const ActionSchema: z.ZodType<Action> = z.discriminatedUnion('t', [
  z.object({ t: z.literal('stat'), stat: z.enum(['str', 'agi', 'wis', 'luk']) }),
  z.object({ t: z.literal('talent'), id }),
  z.object({ t: z.literal('equip'), id }),
  z.object({ t: z.literal('unequip'), slot: z.enum(['weapon', 'hat', 'body', 'legs', 'shoes', 'ring', 'trophy', 'pickaxe', 'axe']) }),
  z.object({ t: z.literal('food'), id: id.nullable(), slot: z.number().int().min(0).max(9).optional() }),
  z.object({ t: z.literal('use'), id }),
  z.object({ t: z.literal('sell'), id, qty: z.number().int().min(1).max(1e6) }),
  z.object({ t: z.literal('craft'), idx: z.number().int().min(0).max(999) }),
  z.object({ t: z.literal('class'), cls: z.enum(['warrior', 'archer', 'mage', 'guardian', 'berserker', 'sharpshooter', 'ranger', 'elementalist', 'hexer']) }),
  z.object({ t: z.literal('qaccept'), npc: id }),
  z.object({ t: z.literal('qdone'), npc: id }),
  z.object({ t: z.literal('deposit'), id }),
  z.object({ t: z.literal('withdraw'), id }),
  z.object({ t: z.literal('depositAll') }),
  z.object({ t: z.literal('buy'), idx: z.number().int().min(0).max(99), qty: z.number().int().min(1).max(999) }),
  z.object({ t: z.literal('prod'), slot: z.number().int().min(0).max(9), item: id.nullable() }),
  z.object({ t: z.literal('apt'), k: z.enum(['cap', 'spd', 'xp']) }),
  z.object({ t: z.literal('collect'), slot: z.number().int().min(0).max(9), toStorage: z.boolean() }),
  z.object({ t: z.literal('cardOn'), card: id }),
  z.object({ t: z.literal('cardOff'), slot: z.number().int().min(0).max(9) }),
  z.object({ t: z.literal('travel'), portal: z.number().int().min(0).max(20) }),
  z.object({ t: z.literal('respawn') }),
  z.object({ t: z.literal('auto'), on: z.boolean() }),
  z.object({ t: z.literal('barSet'), bar: z.number().int().min(0).max(9), slot: z.number().int().min(0).max(19), id: id.nullable() }),
  z.object({ t: z.literal('barPage'), page: z.number().int().min(0).max(9) }),
  z.object({ t: z.literal('option'), autoAttacks: z.boolean() }),
  z.object({ t: z.literal('teleport'), map: id }),
  z.object({ t: z.literal('forgeBuy') }),
  z.object({ t: z.literal('forgeLoad'), slot: z.number().int().min(0).max(15), ore: id }),
  z.object({ t: z.literal('forgeOil'), slot: z.number().int().min(0).max(15) }),
  z.object({ t: z.literal('forgeCollect'), slot: z.number().int().min(0).max(15), toStorage: z.boolean(), n: z.number().int().min(1).max(1e6) }),
  z.object({ t: z.literal('forgeUp'), k: z.enum(['slots', 'cap', 'speed', 'bonus']) }),
  z.object({ t: z.literal('stampIn'), id }),
  z.object({ t: z.literal('stampUp'), id }),
  z.object({ t: z.literal('bribe') }),
  z.object({ t: z.literal('task'), id }),
  z.object({ t: z.literal('statue'), id }),
  z.object({ t: z.literal('star'), id }),
  z.object({ t: z.literal('signOpen'), id }),
  z.object({ t: z.literal('sign'), id: id.nullable() }),
  z.object({ t: z.literal('achieve'), id }),
  z.object({ t: z.literal('cardSet'), id: id.nullable() }),
  z.object({ t: z.literal('cardPreset'), i: z.number().int().min(0).max(3) }),
  z.object({ t: z.literal('arenaClaim') }),
  z.object({ t: z.literal('pet') }),
  z.object({ t: z.literal('game'), kind: z.enum(['chop', 'mine', 'spike']), score: z.number().finite().min(0).max(1000) }),
  z.object({ t: z.literal('totem'), kills: z.number().int().min(0).max(1000), survived: z.boolean() }),
  z.object({ t: z.literal('bless'), k: z.enum(['dmg', 'afk', 'xp']) }),
  z.object({ t: z.literal('owl'), k: z.enum(['rate', 'dmg', 'xp', 'drop', 'afk']).optional() }),
  z.object({ t: z.literal('talentPreset'), i: z.number().int().min(0).max(3) }),
  z.object({ t: z.literal('merit'), id: z.enum(['storage', 'afk', 'drop', 'xp', 'teleport', 'coins']) }),
  z.object({ t: z.literal('target'), activity: z.union([z.object({ k: z.literal('none') }), z.object({ k: z.literal('fight') }), z.object({ k: z.literal('gather'), node: id })]) }),
]) as z.ZodType<Action>;
// 캐릭터 상태는 모양만 대강 확인하고, 의미 검증은 checkSync 가 한다
const SyncSchema = z.object({
  character: z.record(z.string(), z.unknown()),
  coins: z.number().int().min(0),
  cards: z.record(z.string(), z.number().int().min(0)),
  bosses: z.record(z.string(), z.number().int().min(0)),
});
const Command = z.object({ commandId: z.string().uuid() });

// ───────── 요청 제한(인스턴스 하나 기준) ─────────
class Limiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}
  ok(key: string, now: number) {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    arr.push(now);
    this.hits.set(key, arr);
    return arr.length <= this.max;
  }
}

export function buildApp(o: AppOptions) {
  const now = o.now ?? Date.now;
  const key = new TextEncoder().encode(o.secret);
  const app = Fastify({ logger: o.logger ?? false, bodyLimit: 256 * 1024 });
  app.register(cors, { origin: o.origins ?? true });
  app.register(websocket);
  app.register(async (inst) => registerLive(inst, key, now));
  const authLimit = new Limiter(10, 60_000), writeLimit = new Limiter(120, 10_000);
  // 같은 계정의 요청은 차례대로 처리(한 인스턴스 안). 여러 인스턴스 사이는 version 으로 막는다
  const locks = new Map<string, Promise<unknown>>();
  const serial = <T>(accountId: string, fn: () => Promise<T>): Promise<T> => {
    const prev = locks.get(accountId) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    locks.set(accountId, next.catch(() => undefined));
    return next;
  };

  const sign = (sub: string) => new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(sub).setIssuedAt().setExpirationTime('30d').sign(key);
  async function auth(req: FastifyRequest, rep: FastifyReply): Promise<string | null> {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) { rep.code(401).send({ error: '로그인이 필요합니다' }); return null; }
    try {
      const { payload } = await jwtVerify(h.slice(7), key);
      return payload.sub ?? null;
    } catch { rep.code(401).send({ error: '로그인이 만료되었습니다' }); return null; }
  }
  /** 계정을 읽어 fn 으로 바꾸고, 바뀌었으면 저장. 다른 쪽이 먼저 썼으면 한 번 다시 시도 */
  type Body = Record<string, unknown>;
  async function withAccount(accountId: string, rep: FastifyReply, fn: (acc: Account) => Promise<{ body: Body; dirty: boolean }> | { body: Body; dirty: boolean }) {
    return serial(accountId, async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const row = await o.store.get(accountId);
        if (!row) return rep.code(404).send({ error: '계정이 없습니다' });
        if (row.banned) return rep.code(403).send({ error: '이용이 제한된 계정입니다' });
        const acc = deserialize(serialize(row.state));
        if (!acc) return rep.code(500).send({ error: '저장 데이터를 읽지 못했습니다' });
        const { body, dirty } = await fn(acc);
        if (!dirty) return { ...body, version: row.version };
        const v = await o.store.save(accountId, acc, row.version);
        if (v !== null) return { ...body, version: v };
      }
      return rep.code(409).send({ error: '다른 기기에서 먼저 바뀌었습니다. 다시 불러오세요' });
    });
  }
  const charIndex = (acc: Account, raw: unknown) => {
    const i = Number(raw);
    return Number.isInteger(i) && i >= 0 && i < acc.characters.length ? i : -1;
  };
  const elapsed = (c: Character) => Math.max(0, (now() - c.lastActive) / 1000);
  /** 접속 중 플레이 기록 반영. 통과 못 하면 이유 */
  function sync(acc: Account, i: number, body: z.infer<typeof SyncSchema>): string | null {
    const claimed = body.character as unknown as Character;
    const ca: SyncAccount = { coins: body.coins, cards: body.cards, bosses: body.bosses };
    // 저장 형식 보정(예전 기기 대비)
    const fixed = deserialize(serialize({ ...acc, characters: [claimed] }))?.characters[0];
    if (!fixed) return '읽을 수 없는 캐릭터';
    const why = checkSync(acc, i, fixed, ca, elapsed(acc.characters[i]));
    if (!why) acceptSync(acc, i, fixed, ca, now());
    return why;
  }

  app.get('/health', async () => ({ ok: true, now: now() }));

  // 게스트 계정: 기기에 무작위 키를 주고, 서버에는 해시만 저장한다
  app.post('/auth/guest', async (req, rep) => {
    if (!authLimit.ok(req.ip, now())) return rep.code(429).send({ error: '잠시 후 다시 시도하세요' });
    const deviceKey = randomBytes(32).toString('base64url');
    const row = await o.store.create(sha(deviceKey), newAccount());
    return { accountId: row.id, deviceKey, token: await sign(row.id) };
  });
  app.post('/auth/login', async (req, rep) => {
    if (!authLimit.ok(req.ip, now())) return rep.code(429).send({ error: '잠시 후 다시 시도하세요' });
    const b = z.object({ accountId: z.string().uuid(), deviceKey: z.string().min(20).max(100) }).safeParse(req.body);
    if (!b.success) return rep.code(400).send({ error: '잘못된 요청' });
    const row = await o.store.get(b.data.accountId);
    if (!row || row.deviceHash !== sha(b.data.deviceKey)) return rep.code(401).send({ error: '계정을 찾을 수 없습니다' });
    return { token: await sign(row.id) };
  });

  app.get('/account', async (req, rep) => {
    const me = await auth(req, rep); if (!me) return;
    return withAccount(me, rep, (acc) => ({ body: { account: acc, now: now() }, dirty: false }));
  });
  // 계정 삭제(되돌릴 수 없음). 스토어 규정상 앱 안에서 삭제할 수 있어야 한다
  app.delete('/account', async (req, rep) => {
    const me = await auth(req, rep); if (!me) return;
    await o.store.remove(me);
    return { ok: true };
  });

  app.post('/characters', async (req, rep) => {
    const me = await auth(req, rep); if (!me) return;
    const b = z.object({ name: z.string().trim().min(1).max(10), look: Look }).safeParse(req.body);
    if (!b.success) return rep.code(400).send({ error: '이름과 외형을 확인하세요' });
    return withAccount(me, rep, (acc) => {
      if (acc.characters.length >= charSlots(acc)) return { body: { error: '캐릭터 칸이 가득 찼습니다' }, dirty: false };
      const c = createCharacter(acc, b.data.name, b.data.look, now());
      return { body: { index: acc.characters.length - 1, account: acc, ok: !!c }, dirty: true };
    });
  });

  // 캐릭터 삭제(되돌릴 수 없음): 이름을 다시 받아 맞을 때만
  app.delete('/characters/:i', async (req, rep) => {
    const me = await auth(req, rep); if (!me) return;
    const b = z.object({ name: z.string().min(1).max(10) }).safeParse(req.body);
    if (!b.success) return rep.code(400).send({ error: '이름을 입력하세요' });
    return withAccount(me, rep, (acc) => {
      const i = charIndex(acc, (req.params as { i: string }).i);
      if (i < 0) return { body: { error: '캐릭터가 없습니다' }, dirty: false };
      const err = deleteCharacter(acc, i, b.data.name);
      return err ? { body: { error: err }, dirty: false } : { body: { ok: true, account: acc }, dirty: true };
    });
  });

  // 접속: 마지막 기록 이후 흐른 시간만큼 방치 보상을 서버가 계산해 지급
  app.post('/characters/:i/enter', async (req, rep) => {
    const me = await auth(req, rep); if (!me) return;
    return withAccount(me, rep, (acc) => {
      const i = charIndex(acc, (req.params as { i: string }).i);
      if (i < 0) return { body: { error: '캐릭터가 없습니다' }, dirty: false };
      const report = computeAfk(acc, acc.characters[i], now(), new Rng(randomInt(2 ** 31)));
      return { body: { report, account: acc }, dirty: true };
    });
  });

  // 접속 중 플레이 기록(주기적으로, 그리고 떠날 때). 통과하면 반영, 아니면 서버 상태를 돌려준다
  app.post('/characters/:i/sync', async (req, rep) => {
    const me = await auth(req, rep); if (!me) return;
    if (!writeLimit.ok(me, now())) return rep.code(429).send({ error: '요청이 너무 많습니다' });
    const b = Command.extend(SyncSchema.shape).safeParse(req.body);
    if (!b.success) return rep.code(400).send({ error: '잘못된 기록' });
    const done = await o.store.getCommand(b.data.commandId, me);
    if (done !== undefined) return done;
    const out = await withAccount(me, rep, (acc) => {
      const i = charIndex(acc, (req.params as { i: string }).i);
      if (i < 0) return { body: { ok: false, reason: '캐릭터가 없습니다' }, dirty: false };
      const why = sync(acc, i, b.data);
      if (why) acc.characters[i].lastActive = now(); // 거절해도 시간은 흘렀다
      return { body: why ? { ok: false, reason: why, account: acc } : { ok: true }, dirty: true };
    });
    if (out && typeof out === 'object' && 'ok' in out) await o.store.putCommand(b.data.commandId, me, 'sync', out, !out.ok);
    return out;
  });

  // 행동: 원하면 같은 요청에 직전 플레이 기록을 실어 먼저 반영한다(주운 재료로 바로 제작 등)
  app.post('/characters/:i/action', async (req, rep) => {
    const me = await auth(req, rep); if (!me) return;
    if (!writeLimit.ok(me, now())) return rep.code(429).send({ error: '요청이 너무 많습니다' });
    const b = Command.extend({ action: ActionSchema, sync: SyncSchema.optional() }).safeParse(req.body);
    if (!b.success) return rep.code(400).send({ error: '잘못된 행동' });
    const done = await o.store.getCommand(b.data.commandId, me);
    if (done !== undefined) return done;
    const out = await withAccount(me, rep, (acc) => {
      const i = charIndex(acc, (req.params as { i: string }).i);
      if (i < 0) return { body: { ok: false, err: '캐릭터가 없습니다' }, dirty: false };
      if (b.data.sync) {
        const why = sync(acc, i, b.data.sync);
        if (why) return { body: { ok: false, err: why, reason: why, account: acc }, dirty: false };
      }
      const result = applyAction(acc, i, b.data.action, now());
      return { body: { ...result, ...(result.ok ? {} : { account: acc }) }, dirty: result.ok || !!b.data.sync };
    });
    if (out && typeof out === 'object' && 'ok' in out) await o.store.putCommand(b.data.commandId, me, b.data.action.t, out, false);
    return out;
  });

  return app;
}
