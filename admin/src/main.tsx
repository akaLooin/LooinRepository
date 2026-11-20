import { createClient, type Session } from "@supabase/supabase-js";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_KEY__: string;
const sb = __SUPABASE_URL__ && __SUPABASE_KEY__ ? createClient(__SUPABASE_URL__, __SUPABASE_KEY__) : null;

type Notice = { id: string; title: string; body: string; published: boolean; created_at: string };
type Broadcast = { id: string; title: string; body: string; sent: number; created_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/**
 * 관리자 패널: a separate web page (not in the app) for the owner. Sign in with the app account listed in `admins`
 * (SQL 20261121000000_admin). 앱 설정 (switches the apps read at start), 공지사항, 알림 보내기 (push to every phone).
 * Every change is checked again on the server (RLS, admin-broadcast function), so this page holds no secret.
 */
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!sb || !session) { setAdmin(null); return; }
    sb.rpc("is_admin").then(({ data, error }) => setAdmin(error ? false : data === true));
  }, [session]);

  if (!sb) return <Shell><p className="warn">Supabase 값이 없어요. <code>app\.env.local</code>이 있는 PC에서 실행해 주세요.</p></Shell>;
  if (!session) return <Shell><Login /></Shell>;
  if (admin === null) return <Shell><p className="muted">확인하는 중…</p></Shell>;
  if (!admin) return (
    <Shell>
      <p className="warn">이 계정({session.user.email})은 관리자가 아니에요. SQL 20261121000000_admin.sql 맨 아래 줄로 관리자를 지정해 주세요.</p>
      <button onClick={() => sb.auth.signOut()}>로그아웃</button>
    </Shell>
  );
  return <Panel email={session.user.email ?? ""} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="narrow"><h1>관리자 패널</h1>{children}</main>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="card" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError("");
      const { error } = await sb!.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setError("이메일이나 비밀번호가 맞지 않아요");
    }}>
      <p className="muted">앱에서 쓰는 계정으로 로그인하세요.</p>
      <label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
      <label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      {error ? <p className="warn">{error}</p> : null}
      <button className="primary" disabled={busy}>{busy ? "로그인 중…" : "로그인"}</button>
    </form>
  );
}

function Panel({ email }: { email: string }) {
  const [tab, setTab] = useState<"config" | "notices" | "push">("config");
  return (
    <main>
      <header>
        <h1>관리자 패널</h1>
        <span className="muted">{email}</span>
        <button onClick={() => sb!.auth.signOut()}>로그아웃</button>
      </header>
      <nav role="tablist">
        {([["config", "앱 설정"], ["notices", "공지사항"], ["push", "알림 보내기"]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
      {tab === "config" ? <Config /> : tab === "notices" ? <Notices /> : <Push />}
    </main>
  );
}

function Config() {
  const [crews, setCrews] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");
  const [msg, setMsg] = useState("");
  const load = async () => {
    const { data, error } = await sb!.from("app_config").select("key, value");
    if (error) { setMsg(`불러오지 못했어요: ${error.message}`); return; }
    const get = (k: string) => data.find((r) => r.key === k)?.value;
    setCrews(get("crews_enabled") === true);
    setNotice(typeof get("home_notice") === "string" ? (get("home_notice") as string) : "");
  };
  useEffect(() => { load(); }, []);
  const save = async (key: string, value: unknown, done: string) => {
    const { error } = await sb!.from("app_config").upsert({ key, value, updated_at: new Date().toISOString() });
    setMsg(error ? `저장하지 못했어요: ${error.message}` : done);
    load();
  };
  return (
    <section>
      <div className="card row">
        <div>
          <h2>크루 기능</h2>
          <p className="muted">켜면 디자인 앱의 커뮤니티에 크루가 보여요. 앱을 다시 열 때 반영돼요. (기존 앱은 항상 보임)</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={!!crews} disabled={crews === null} onChange={(e) => save("crews_enabled", e.target.checked, e.target.checked ? "크루를 켰어요" : "크루를 껐어요")} />
          <span>{crews ? "켜짐" : "꺼짐"}</span>
        </label>
      </div>
      <div className="card">
        <h2>홈 공지</h2>
        <p className="muted">디자인 앱 홈 맨 위에 보이는 한 줄 안내. 비우면 안 보여요.</p>
        <textarea value={notice} onChange={(e) => setNotice(e.target.value)} maxLength={300} rows={3} placeholder="예: 오늘 밤 12시에 잠깐 점검해요" />
        <div className="actions">
          <button onClick={() => save("home_notice", null, "홈 공지를 내렸어요")}>내리기</button>
          <button className="primary" onClick={() => save("home_notice", notice.trim() || null, "홈 공지를 저장했어요")}>저장</button>
        </div>
      </div>
      {msg ? <p className="toast" role="status">{msg}</p> : null}
    </section>
  );
}

function Notices() {
  const [list, setList] = useState<Notice[]>([]);
  const [draft, setDraft] = useState<{ id?: string; title: string; body: string; published: boolean }>({ title: "", body: "", published: true });
  const [msg, setMsg] = useState("");
  const load = () => sb!.from("app_notices").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
    if (error) setMsg(`불러오지 못했어요: ${error.message}`); else setList(data as Notice[]);
  });
  useEffect(() => { load(); }, []);
  const save = async () => {
    const row = { title: draft.title.trim(), body: draft.body.trim(), published: draft.published };
    if (!row.title || !row.body) { setMsg("제목과 내용을 적어 주세요"); return; }
    const { error } = draft.id ? await sb!.from("app_notices").update(row).eq("id", draft.id) : await sb!.from("app_notices").insert(row);
    setMsg(error ? `저장하지 못했어요: ${error.message}` : draft.id ? "고쳤어요" : row.published ? "공지를 올렸어요" : "초안으로 저장했어요");
    if (!error) setDraft({ title: "", body: "", published: true });
    load();
  };
  return (
    <section>
      <div className="card">
        <h2>{draft.id ? "공지 고치기" : "새 공지"}</h2>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={100} placeholder="제목" aria-label="제목" />
        <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={4000} rows={6} placeholder="내용" aria-label="내용" />
        <label className="check"><input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> 바로 게시 (끄면 초안: 나만 보임)</label>
        <div className="actions">
          {draft.id ? <button onClick={() => setDraft({ title: "", body: "", published: true })}>취소</button> : null}
          <button className="primary" onClick={save}>{draft.id ? "저장" : "올리기"}</button>
        </div>
      </div>
      {msg ? <p className="toast" role="status">{msg}</p> : null}
      {list.map((n) => (
        <article key={n.id} className="card">
          <div className="row">
            <h3>{n.title} {n.published ? null : <span className="tag">초안</span>}</h3>
            <span className="muted">{when(n.created_at)}</span>
          </div>
          <p className="pre">{n.body}</p>
          <div className="actions">
            <button onClick={() => setDraft({ id: n.id, title: n.title, body: n.body, published: n.published })}>고치기</button>
            <button className="danger" onClick={async () => {
              if (!confirm(`'${n.title}' 공지를 지울까요?`)) return;
              const { error } = await sb!.from("app_notices").delete().eq("id", n.id);
              setMsg(error ? `지우지 못했어요: ${error.message}` : "지웠어요"); load();
            }}>지우기</button>
          </div>
        </article>
      ))}
      {!list.length ? <p className="muted">아직 올린 공지가 없어요. 앱에는 기본 공지만 보여요.</p> : null}
    </section>
  );
}

function Push() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Broadcast[]>([]);
  const load = () => sb!.from("admin_broadcasts").select("*").order("created_at", { ascending: false }).limit(20).then(({ data }) => setLog((data ?? []) as Broadcast[]));
  useEffect(() => { load(); }, []);
  const call = async (dryRun: boolean) => {
    const { data, error } = await sb!.functions.invoke("admin-broadcast", { body: { title: title.trim(), body: body.trim(), dryRun } });
    if (error) throw new Error(error.message);
    return data as { sent?: number; phones?: number };
  };
  const send = async () => {
    if (!title.trim() || !body.trim()) { setMsg("제목과 내용을 적어 주세요"); return; }
    setBusy(true); setMsg("");
    try {
      const { phones = 0 } = await call(true);
      if (!confirm(`폰 ${phones}대에 보낼까요?\n\n${title}\n${body}`)) { setBusy(false); return; }
      const { sent = 0 } = await call(false);
      setMsg(`${sent}대에 보냈어요`); setTitle(""); setBody(""); load();
    } catch (e) {
      setMsg(`보내지 못했어요. admin-broadcast 함수를 배포했는지 확인해 주세요. (${e instanceof Error ? e.message : e})`);
    }
    setBusy(false);
  };
  return (
    <section>
      <div className="card">
        <h2>모든 폰에 알림 보내기</h2>
        <p className="muted">푸시를 허용한 모든 폰에 바로 가요. 누르면 앱의 알림 화면이 열려요. 보내기 전에 몇 대인지 먼저 알려 줘요.</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="제목" aria-label="알림 제목" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={3} placeholder="내용" aria-label="알림 내용" />
        <div className="actions"><button className="primary" onClick={send} disabled={busy}>{busy ? "보내는 중…" : "보내기"}</button></div>
      </div>
      {msg ? <p className="toast" role="status">{msg}</p> : null}
      {log.length ? <h2 className="sub">보낸 기록</h2> : null}
      {log.map((b) => (
        <div key={b.id} className="card row">
          <div><strong>{b.title}</strong><p className="muted">{b.body}</p></div>
          <span className="muted">{`${when(b.created_at)} · ${b.sent}대`}</span>
        </div>
      ))}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
