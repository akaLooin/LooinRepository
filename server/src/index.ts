// 서버 시작점. 환경 변수: .env.example 참고
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { buildApp } from './app';
import { MemoryStore, SqlStore, Store, migrate } from './store';

const env = process.env;
const prod = env.NODE_ENV === 'production';
const secret = env.SERVER_SECRET ?? (prod ? '' : 'dev-only-secret-change-me-0123456789abcdef');
if (secret.length < 32) { console.error('SERVER_SECRET(32자 이상)가 필요합니다'); process.exit(1); }

let store: Store;
if (env.DATABASE_URL) {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: env.DATABASE_SSL === 'false' ? false : prod ? { rejectUnauthorized: false } : undefined });
  const dir = join(import.meta.dirname, '..', 'migrations');
  await migrate(pool, readdirSync(dir).filter((f) => f.endsWith('.sql')).map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') })));
  store = new SqlStore(pool);
} else {
  if (prod) { console.error('DATABASE_URL 이 필요합니다'); process.exit(1); }
  console.warn('DATABASE_URL 이 없어 메모리 저장소로 실행합니다(서버를 끄면 데이터가 사라집니다)');
  store = new MemoryStore();
}

const app = buildApp({ store, secret, origins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : undefined, logger: true });
await app.listen({ port: Number(env.PORT ?? 8787), host: '0.0.0.0' });
