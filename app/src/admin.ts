// Admin panel: edit terms, names, descriptions and numbers without touching code.
// Edits are saved on this device (applies to the game immediately on reload) and can be exported as JSON
// to commit into src/data/overrides.json so every build ships with them.
import './styles/tokens.css';
import './styles/admin.css';
import { COLLECTIONS, DEFAULTS, LOCAL_KEY, applyOverrides, installContent, loadLocalOverrides, type Collection, type Overrides } from './data/content';
import baked from './data/overrides.json';

installContent();
let draft: Overrides = loadLocalOverrides();
let current = COLLECTIONS[0];
let query = '';
let dirty = false;

const root = document.getElementById('admin')!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function countChanges(o: Overrides) { let n = 0; for (const c of Object.values(o)) for (const f of Object.values(c)) n += Object.keys(f).length; return n; }

function valueOf(c: Collection, id: string, key: string) {
  return draft[c.id]?.[id]?.[key] ?? (baked as Overrides)[c.id]?.[id]?.[key] ?? DEFAULTS[c.id]?.[id]?.[key] ?? '';
}
function setValue(c: Collection, id: string, key: string, raw: string) {
  const def = (baked as Overrides)[c.id]?.[id]?.[key] ?? DEFAULTS[c.id]?.[id]?.[key];
  const field = c.fields.find((f) => f.key === key)!;
  const v = field.type === 'number' ? (raw.trim() === '' ? NaN : Number(raw)) : raw;
  draft[c.id] ??= {}; draft[c.id][id] ??= {};
  if (raw === '' || (field.type === 'number' && Number.isNaN(v as number)) || String(v) === String(def)) delete draft[c.id][id][key];
  else draft[c.id][id][key] = v;
  if (!Object.keys(draft[c.id][id]).length) delete draft[c.id][id];
  if (!Object.keys(draft[c.id]).length) delete draft[c.id];
  dirty = true; renderStatus();
}

function render() {
  root.innerHTML = `
  <header class="a-top">
    <b>테일즈토피아 관리자 패널</b>
    <span id="status" class="a-status"></span>
    <span class="a-actions">
      <button id="save" class="a-btn primary">저장 (이 기기에 적용)</button>
      <button id="export" class="a-btn">JSON 내보내기</button>
      <label class="a-btn">JSON 불러오기<input id="import" type="file" accept=".json,application/json" hidden></label>
      <button id="reset" class="a-btn danger">이 기기 변경 모두 지우기</button>
      <a class="a-btn" href="./index.html">게임 열기</a>
    </span>
  </header>
  <div class="a-body">
    <nav class="a-nav">${COLLECTIONS.map((c) => `<button data-c="${c.id}" class="${c === current ? 'on' : ''}">${c.label}<small>${countIn(c)}</small></button>`).join('')}</nav>
    <main class="a-main">
      <div class="a-tools"><input id="q" placeholder="검색 (ID·이름·설명)" value="${esc(query)}"><span class="dim">비워 두면 기본값을 써요. 바뀐 칸은 노란색이에요. 이름·설명 속 <b>{gem}</b> 같은 표시는 '게임 용어'의 현재 이름으로 자동으로 바뀌어요.</span></div>
      ${current.id === 'terms' ? `<div class="a-tools a-replace"><b>모든 이름·설명에서 바꾸기</b><input id="rf" placeholder="찾을 글자 (예: 숲)"><input id="rt" placeholder="바꿀 글자 (예: 정원)"><button id="rgo" class="a-btn">미리 보기</button><span id="rres" class="dim"></span></div>` : ''}
      <table class="a-table"><thead><tr><th>ID</th>${current.fields.map((f) => `<th>${f.label}</th>`).join('')}${current.id === 'terms' ? '<th>쓰이는 곳</th>' : ''}</tr></thead><tbody>${rows()}</tbody></table>
    </main>
  </div>`;
  root.querySelectorAll<HTMLButtonElement>('.a-nav button').forEach((b) => { b.onclick = () => { current = COLLECTIONS.find((c) => c.id === b.dataset.c)!; render(); }; });
  const q = root.querySelector<HTMLInputElement>('#q')!;
  q.oninput = () => { query = q.value; const tb = root.querySelector('tbody')!; tb.innerHTML = rows(); bindInputs(); };
  bindInputs();
  const rgo = root.querySelector<HTMLButtonElement>('#rgo');
  if (rgo) rgo.onclick = () => {
    const from = root.querySelector<HTMLInputElement>('#rf')!.value, to = root.querySelector<HTMLInputElement>('#rt')!.value;
    if (!from) return;
    const hits = findReplace(from, to, false);
    if (!hits.length) { root.querySelector('#rres')!.textContent = '찾은 곳이 없어요.'; return; }
    if (confirm(`${hits.length}곳을 바꿔요:\n\n${hits.slice(0, 15).join('\n')}${hits.length > 15 ? '\n…' : ''}\n\n적용할까요? (저장을 눌러야 게임에 반영돼요)`)) {
      findReplace(from, to, true); root.querySelector('#rres')!.textContent = `${hits.length}곳을 바꿨어요. 저장을 눌러 주세요.`;
    }
  };
  root.querySelector<HTMLButtonElement>('#save')!.onclick = save;
  root.querySelector<HTMLButtonElement>('#export')!.onclick = exportJSON;
  root.querySelector<HTMLInputElement>('#import')!.onchange = importJSON;
  root.querySelector<HTMLButtonElement>('#reset')!.onclick = () => { if (confirm('이 기기에 저장된 변경을 모두 지울까요? (내보낸 JSON과 코드의 overrides.json은 그대로예요)')) { draft = {}; try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ } dirty = false; render(); } };
  renderStatus();
}
function countIn(c: Collection) { const n = Object.keys(draft[c.id] ?? {}).length; return n ? ` ${n}` : ''; }

function rows() {
  const ql = query.trim().toLowerCase();
  return current.items().filter((it) => {
    if (!ql) return true;
    const hay = [it.id, it.title, ...current.fields.map((f) => valueOf(current, it.id, f.key))].join(' ').toLowerCase();
    return hay.includes(ql);
  }).map((it) => `<tr><td class="a-id"><b>${esc(it.id)}</b><br><small>${esc(it.title)}</small></td>${current.fields.map((f) => {
    const v = valueOf(current, it.id, f.key), def = DEFAULTS[current.id]?.[it.id]?.[f.key];
    const changed = draft[current.id]?.[it.id]?.[f.key] !== undefined ? ' changed' : (baked as Overrides)[current.id]?.[it.id]?.[f.key] !== undefined ? ' baked' : '';
    const attrs = `data-id="${esc(it.id)}" data-k="${f.key}" class="a-in${changed}" title="기본값: ${esc(def)}"`;
    if (def === undefined && f.type === 'number') return `<td><input ${attrs} type="text" inputmode="decimal" value="${esc(v)}" placeholder="(없음)"></td>`;
    if (f.type === 'longtext') return `<td><textarea ${attrs} rows="2">${esc(v)}</textarea></td>`;
    if (f.type === 'number') return `<td><input ${attrs} type="text" inputmode="decimal" value="${esc(v)}"></td>`;
    return `<td><input ${attrs} type="text" value="${esc(v)}"></td>`;
  }).join('')}${current.id === 'terms' ? `<td class="dim">${usage(it.id)}곳</td>` : ''}</tr>`).join('');
}

/** How many names/descriptions contain the {term} token. */
function usage(term: string) {
  let n = 0;
  for (const c of COLLECTIONS) {
    if (c.id === 'terms' || c.id === 'base') continue;
    for (const it of c.items()) for (const f of c.fields) if (f.type !== 'number' && String(valueOf(c, it.id, f.key)).includes(`{${term}}`)) n++;
  }
  return n;
}

/** Find/replace across every text field of every collection (writes into the draft). */
function findReplace(from: string, to: string, apply: boolean) {
  const hits: string[] = [];
  for (const c of COLLECTIONS) {
    if (c.id === 'terms' || c.id === 'base') continue;
    for (const it of c.items()) for (const f of c.fields) {
      if (f.type === 'number') continue;
      const v = String(valueOf(c, it.id, f.key));
      if (!v.includes(from)) continue;
      hits.push(`${c.label} · ${it.id}: ${v} → ${v.split(from).join(to)}`);
      if (apply) setValue(c, it.id, f.key, v.split(from).join(to));
    }
  }
  return hits;
}
function bindInputs() {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.a-in').forEach((el) => {
    el.oninput = () => { setValue(current, el.dataset.id!, el.dataset.k!, el.value); el.classList.toggle('changed', draft[current.id]?.[el.dataset.id!]?.[el.dataset.k!] !== undefined); };
  });
}
function renderStatus() {
  root.querySelectorAll<HTMLButtonElement>('.a-nav button').forEach((b) => { const c = COLLECTIONS.find((x) => x.id === b.dataset.c)!; const sm = b.querySelector('small'); if (sm) sm.textContent = countIn(c); });
  const el = root.querySelector('#status'); if (!el) return;
  el.textContent = `이 기기 변경 ${countChanges(draft)}개 · 빌드 포함(overrides.json) ${countChanges(baked as Overrides)}개${dirty ? ' · 저장 안 됨' : ''}`;
}
function save() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(draft)); } catch { alert('이 브라우저에서는 저장할 수 없어요. JSON으로 내보내 주세요.'); return; }
  applyOverrides(draft); dirty = false; renderStatus();
  toast('저장했어요. 게임을 새로고침하면 적용돼요.');
}
function merged(): Overrides {
  const out: Overrides = JSON.parse(JSON.stringify(baked));
  for (const [c, items] of Object.entries(draft)) for (const [id, fields] of Object.entries(items)) { out[c] ??= {}; out[c][id] = { ...(out[c][id] ?? {}), ...fields }; }
  return out;
}
function exportJSON() {
  const text = JSON.stringify(merged(), null, 2) + '\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = 'overrides.json'; a.click();
  navigator.clipboard?.writeText(text).catch(() => {});
  toast('overrides.json을 내려받았어요 (클립보드에도 복사). app/src/data/overrides.json에 넣으면 모든 빌드에 적용돼요.');
}
async function importJSON(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
  try { draft = JSON.parse(await file.text()); dirty = true; render(); toast('불러왔어요. 저장을 눌러 적용하세요.'); }
  catch { alert('JSON 형식이 올바르지 않아요.'); }
}
function toast(msg: string) {
  const t = document.createElement('div'); t.className = 'a-toast'; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}
window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });
render();
