// Copies the admin app's settings (app_config) and its change log (app_config_history) into the repository, so
// Claude (and anyone reading the repo) can see what was changed in the admin app: docs/context/remote-config.md
// (readable) and docs/context/remote-config.json (the raw values, to bake into the app's defaults later).
// Run by .github/workflows/remote-config.yml with SUPABASE_URL and SUPABASE_KEY (the publishable key; both only
// read public rows). Node 22: node --experimental-strip-types app/scripts/remote-config-snapshot.mjs
import { writeFileSync } from "node:fs";
import { COLOR_ROLES, FEATURES, HOME_CARDS, NUMBERS, TEXTS } from "../src/lib/remoteCatalog.ts";

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_KEY;
if (!url || !key) { console.log("SUPABASE_URL / SUPABASE_KEY not set: nothing copied."); process.exit(0); }
const get = async (path) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
};

const rows = (await get("app_config?select=key,value,updated_at&order=key")).map((r) => ({ key: r.key, value: r.value, updated_at: r.updated_at }));
let history = [];
try { history = await get("app_config_history?select=key,old_value,new_value,changed_at&order=changed_at.desc&limit=40"); } catch { /* SQL 20261122000000 not run yet */ }

const val = (k) => rows.find((r) => r.key === k)?.value;
const out = ["# 관리자 앱 설정 (자동 복사)", "",
  "관리자 앱에서 바꾼 디자인 앱 설정. `.github/workflows/remote-config.yml`이 서버(app_config)에서 복사한다. 직접 고치지 말 것.",
  "항목 목록과 기본값: `app/src/lib/remoteCatalog.ts`. 원래 값(raw): `remote-config.json`.", ""];
const line = (...s) => out.push(...s);

line("## 지금 기본값과 다른 것");
let any = false;
const texts = val("texts") ?? {};
for (const [k, v] of Object.entries(texts)) if (TEXTS[k] && v !== TEXTS[k].def) { line(`- 문구 · ${TEXTS[k].label}: "${TEXTS[k].def}" → "${v}"`); any = true; }
const features = val("features") ?? {};
for (const [k, v] of Object.entries(features)) if (FEATURES[k] && v === false) { line(`- 숨김 · ${FEATURES[k].label}`); any = true; }
const numbers = val("numbers") ?? {};
for (const [k, v] of Object.entries(numbers)) if (NUMBERS[k] && v !== NUMBERS[k].def) { line(`- 숫자 · ${NUMBERS[k].label}: ${NUMBERS[k].def} → ${v}${NUMBERS[k].unit}`); any = true; }
const colors = val("colors") ?? {};
for (const scheme of ["dark", "light"]) for (const [k, v] of Object.entries(colors[scheme] ?? {})) if (COLOR_ROLES[k]) { line(`- 색 (${scheme === "dark" ? "다크" : "라이트"}) · ${COLOR_ROLES[k]}: ${v}`); any = true; }
const order = val("home_order");
if (Array.isArray(order) && order.join() !== Object.keys(HOME_CARDS).join()) { line(`- 홈 카드 순서: ${order.map((k) => HOME_CARDS[k] ?? k).join(" → ")}`); any = true; }
const m = val("maintenance");
if (m?.on) { line(`- **점검 모드 켜짐**: ${m.message || "(기본 문구)"}`); any = true; }
if (val("crews_enabled") === true) { line("- 크루 기능 켜짐"); any = true; }
if (typeof val("home_notice") === "string") { line(`- 홈 공지: ${val("home_notice")}`); any = true; }
if (!any) line("- 없음 (모두 기본값)");

line("", "## 최근 변경 기록 (새 것부터)");
if (!history.length) line("- 기록 없음 (또는 SQL 20261122000000_admin_live 미실행)");
for (const h of history) {
  const when = new Date(h.changed_at).toISOString().replace("T", " ").slice(0, 16);
  const short = (v) => (v === null || v === undefined ? "없음" : JSON.stringify(v).slice(0, 140));
  line(`- ${when} UTC · \`${h.key}\`: ${short(h.old_value)} → ${short(h.new_value)}`);
}

writeFileSync(new URL("../../docs/context/remote-config.md", import.meta.url), out.join("\n") + "\n");
writeFileSync(new URL("../../docs/context/remote-config.json", import.meta.url), JSON.stringify(rows.map(({ key, value }) => ({ key, value })), null, 2) + "\n");
console.log(`copied ${rows.length} settings, ${history.length} history lines`);
