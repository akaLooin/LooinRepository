// 마이그레이션만 따로 실행: DATABASE_URL=... npm run migrate
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { migrate } from '../src/store';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const dir = join(import.meta.dirname, '..', 'migrations');
await migrate(pool, readdirSync(dir).filter((f) => f.endsWith('.sql')).map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') })));
console.log('마이그레이션 완료');
await pool.end();
