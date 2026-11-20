import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, Bell, Button, ConfirmDialog, Megaphone, Settings, Toggle, useToast } from "../../components";
import { supabase } from "../../lib/supabase";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";
import { unregisterPush } from "../../lib/push";

const G = tokens.layout.gutter;
type Notice = { id: string; title: string; body: string; published: boolean; created_at: string };
type Broadcast = { id: string; title: string; body: string; sent: number; created_at: string };
const when = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

/**
 * 관리자 앱 (APP_VARIANT=admin, a third Android app beside the usual and design ones; user, 2026-11-21: an app, not a
 * web page). Sign in with the app account listed in `admins` (SQL 20261121000000_admin). Three tabs: 앱 설정 (switches
 * the apps read), 공지사항, 알림 보내기 (push to every phone). The server checks again (RLS, admin-broadcast function).
 */
export function AdminApp() {
  const { c } = useTheme();
  const insets = useInsets();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [why, setWhy] = useState(""); // what the server said, shown on the "not an admin" screen
  const [tab, setTab] = useState<"config" | "notices" | "push">("config");
  const [toast, notice] = useToast();
  const check = useCallback(() => {
    setAdmin(null);
    setWhy("");
    supabase?.auth.getUser().then(({ data }) => setWhy((w) => w || `로그인한 계정: ${data.user?.email ?? "?"}`));
    supabase?.rpc("is_admin").then(({ data, error }) => {
      if (error) setWhy(`서버 응답: ${error.message}${/is_admin|function/i.test(error.message) ? " (SQL 20261121000000_admin을 아직 실행하지 않은 것 같아요)" : ""}`);
      setAdmin(error ? false : data === true);
    }, (e) => { setWhy(`연결 오류: ${e instanceof Error ? e.message : String(e)}`); setAdmin(false); });
  }, []);
  useEffect(() => { check(); }, [check]);
  const signOut = async () => { await unregisterPush(); await supabase?.auth.signOut(); };

  if (admin === null) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={c.text} /></View>;
  if (!admin) return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40, paddingHorizontal: G, gap: 16 }}>
      <AppText variant="bodyLg" weight={800} style={{ fontSize: 22, lineHeight: 30 }}>관리자가 아니에요</AppText>
      <AppText variant="body" color="textSecondary">이 계정은 관리자로 지정되지 않았어요. Supabase SQL Editor에서 20261121000000_admin.sql 맨 아래 줄로 내 이메일을 관리자로 지정한 뒤 다시 확인해 주세요. (SQL을 아직 실행하지 않았어도 이 화면이 보여요.)</AppText>
      {why ? <AppText variant="small" color="textMuted" selectable>{why}</AppText> : null}
      <Button kind="sheetPrimary" label="다시 확인" onPress={check} />
      <Button kind="plain" label="로그아웃" onPress={signOut} />
    </View>
  );

  const tabs = [["config", "앱 설정", Settings], ["notices", "공지사항", Megaphone], ["push", "알림 보내기", Bell]] as const;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", height: 56, paddingHorizontal: G }}>
        <AppText variant="bodyLg" weight={800} style={{ flex: 1, fontSize: 22, lineHeight: 30 }} accessibilityRole="header">관리자</AppText>
        <Pressable onPress={signOut} hitSlop={8} accessibilityRole="button"><AppText variant="helper" color="textMuted">로그아웃</AppText></Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40, gap: 12 }}>
        {tab === "config" ? <Config notice={notice} /> : tab === "notices" ? <Notices notice={notice} /> : <Push notice={notice} />}
      </ScrollView>
      <View style={{ flexDirection: "row", paddingBottom: insets.bottom + 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.sectionLine, backgroundColor: c.bg }} role="tablist">
        {tabs.map(([k, label, Icon]) => (
          <Pressable key={k} onPress={() => setTab(k)} role="tab" aria-selected={tab === k} accessibilityLabel={label} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 6 }}>
            <Icon size={22} color={tab === k ? c.text : c.textMuted} />
            <AppText variant="small" weight={tab === k ? 700 : 500} color={tab === k ? "text" : "textMuted"}>{label}</AppText>
          </Pressable>
        ))}
      </View>
      {toast}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={{ padding: 16, gap: 10, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>{children}</View>;
}

function Field({ value, onChange, placeholder, lines = 1, max }: { value: string; onChange: (s: string) => void; placeholder: string; lines?: number; max: number }) {
  const { c } = useTheme();
  return (
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.textPlaceholder} multiline={lines > 1} maxLength={max}
      accessibilityLabel={placeholder}
      style={{ minHeight: lines > 1 ? 22 * lines + 24 : 48, borderRadius: tokens.radius.md, backgroundColor: c.surfaceInput, color: c.text, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: fontFamily(500), fontSize: tokens.type.bodyLg.size, textAlignVertical: lines > 1 ? "top" : "center", outlineStyle: "none" as never }} />
  );
}

function Config({ notice }: { notice: (m: string) => void }) {
  const [crews, setCrews] = useState<boolean | null>(null);
  const [home, setHome] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("app_config").select("key, value");
    if (error) { notice(`불러오지 못했어요: ${error.message}`); return; }
    const get = (k: string) => data.find((r) => r.key === k)?.value;
    setCrews(get("crews_enabled") === true);
    setHome(typeof get("home_notice") === "string" ? (get("home_notice") as string) : "");
  }, [notice]);
  useEffect(() => { load(); }, [load]);
  const save = async (key: string, value: unknown, done: string) => {
    const { error } = await supabase!.from("app_config").upsert({ key, value, updated_at: new Date().toISOString() });
    notice(error ? `저장하지 못했어요: ${error.message}` : done);
    load();
  };
  return (
    <>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyLg" weight={700}>크루 기능</AppText>
            <AppText variant="small" color="textMuted">켜면 디자인 앱 커뮤니티에 크루가 보여요. 앱을 다시 열면 반영돼요. (기존 앱은 항상 보임)</AppText>
          </View>
          <Toggle value={!!crews} disabled={crews === null} label="크루 기능" onChange={(v) => save("crews_enabled", v, v ? "크루를 켰어요" : "크루를 껐어요")} />
        </View>
      </Card>
      <Card>
        <AppText variant="bodyLg" weight={700}>홈 공지</AppText>
        <AppText variant="small" color="textMuted">디자인 앱 홈 맨 위에 보이는 안내. 비우면 안 보여요.</AppText>
        <Field value={home} onChange={setHome} placeholder="예: 오늘 밤 12시에 잠깐 점검해요" lines={3} max={300} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="내리기" onPress={() => { setHome(""); save("home_notice", null, "홈 공지를 내렸어요"); }} />
          <Button kind="sheetPrimary" flex height={46} label="저장" onPress={() => save("home_notice", home.trim() || null, "홈 공지를 저장했어요")} />
        </View>
      </Card>
    </>
  );
}

function Notices({ notice }: { notice: (m: string) => void }) {
  const { c } = useTheme();
  const [list, setList] = useState<Notice[]>([]);
  const empty = { title: "", body: "", published: true } as { id?: string; title: string; body: string; published: boolean };
  const [draft, setDraft] = useState(empty);
  const [removing, setRemoving] = useState<Notice | null>(null);
  const load = useCallback(() => {
    supabase!.from("app_notices").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) notice(`불러오지 못했어요: ${error.message}`); else setList(data as Notice[]);
    });
  }, [notice]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    const row = { title: draft.title.trim(), body: draft.body.trim(), published: draft.published };
    if (!row.title || !row.body) { notice("제목과 내용을 적어 주세요"); return; }
    const { error } = draft.id ? await supabase!.from("app_notices").update(row).eq("id", draft.id) : await supabase!.from("app_notices").insert(row);
    notice(error ? `저장하지 못했어요: ${error.message}` : draft.id ? "고쳤어요" : row.published ? "공지를 올렸어요" : "초안으로 저장했어요");
    if (!error) setDraft(empty);
    load();
  };
  return (
    <>
      <Card>
        <AppText variant="bodyLg" weight={700}>{draft.id ? "공지 고치기" : "새 공지"}</AppText>
        <Field value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="제목" max={100} />
        <Field value={draft.body} onChange={(body) => setDraft({ ...draft, body })} placeholder="내용" lines={5} max={4000} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AppText variant="body" style={{ flex: 1 }}>{draft.published ? "바로 게시" : "초안 (나만 보임)"}</AppText>
          <Toggle value={draft.published} label="바로 게시" onChange={(published) => setDraft({ ...draft, published })} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {draft.id ? <Button kind="plain" flex label="취소" onPress={() => setDraft(empty)} /> : null}
          <Button kind="sheetPrimary" flex height={46} label={draft.id ? "저장" : "올리기"} onPress={save} />
        </View>
      </Card>
      {list.length ? <AppText variant="small" weight={700} color="textMuted" style={{ marginTop: 8, marginLeft: 4 }}>올린 공지</AppText> : null}
      {list.map((n) => (
        <Card key={n.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText variant="bodyLg" weight={700} style={{ flex: 1 }} numberOfLines={1}>{n.title}</AppText>
            {n.published ? null : <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: c.surfaceStrong }}><AppText variant="small" color="textMuted">초안</AppText></View>}
          </View>
          <AppText variant="small" color="textMuted">{when(n.created_at)}</AppText>
          <AppText variant="body">{n.body}</AppText>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button kind="plain" flex label="고치기" onPress={() => setDraft({ id: n.id, title: n.title, body: n.body, published: n.published })} />
            <Button kind="danger" flex height={46} label="지우기" onPress={() => setRemoving(n)} />
          </View>
        </Card>
      ))}
      {!list.length ? <AppText variant="helper" color="textMuted" center style={{ paddingVertical: 20 }}>아직 올린 공지가 없어요. 앱에는 기본 공지만 보여요.</AppText> : null}
      <ConfirmDialog visible={!!removing} message={`'${removing?.title ?? ""}' 공지를 지울까요?`} cancel="취소" ok="지우기" danger
        onCancel={() => setRemoving(null)}
        onOk={async () => {
          const n = removing!; setRemoving(null);
          const { error } = await supabase!.from("app_notices").delete().eq("id", n.id);
          notice(error ? `지우지 못했어요: ${error.message}` : "지웠어요"); load();
        }} />
    </>
  );
}

function Push({ notice }: { notice: (m: string) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<number | null>(null);
  const [log, setLog] = useState<Broadcast[]>([]);
  const load = useCallback(() => {
    supabase!.from("admin_broadcasts").select("*").order("created_at", { ascending: false }).limit(20).then(({ data }) => setLog((data ?? []) as Broadcast[]));
  }, []);
  useEffect(() => { load(); }, [load]);
  const call = async (dryRun: boolean) => {
    const { data, error } = await supabase!.functions.invoke("admin-broadcast", { body: { title: title.trim(), body: body.trim(), dryRun } });
    if (error) throw new Error(error.message);
    return data as { sent?: number; phones?: number };
  };
  const fail = (e: unknown) => notice(`보내지 못했어요. admin-broadcast 함수를 배포했는지 확인해 주세요. (${e instanceof Error ? e.message : String(e)})`);
  const start = async () => {
    if (!title.trim() || !body.trim()) { notice("제목과 내용을 적어 주세요"); return; }
    setBusy(true);
    try { const { phones = 0 } = await call(true); setAsk(phones); } catch (e) { fail(e); }
    setBusy(false);
  };
  const send = async () => {
    setAsk(null); setBusy(true);
    try { const { sent = 0 } = await call(false); notice(`${sent}대에 보냈어요`); setTitle(""); setBody(""); load(); } catch (e) { fail(e); }
    setBusy(false);
  };
  return (
    <>
      <Card>
        <AppText variant="bodyLg" weight={700}>모든 폰에 알림 보내기</AppText>
        <AppText variant="small" color="textMuted">푸시를 허용한 모든 폰에 바로 가요(기존 앱). 누르면 앱의 알림 화면이 열려요. 보내기 전에 몇 대인지 먼저 알려 줘요.</AppText>
        <Field value={title} onChange={setTitle} placeholder="알림 제목" max={100} />
        <Field value={body} onChange={setBody} placeholder="알림 내용" lines={3} max={500} />
        <Button kind="sheetPrimary" height={46} label={busy ? "확인하는 중…" : "보내기"} loading={busy} onPress={start} />
      </Card>
      {log.length ? <AppText variant="small" weight={700} color="textMuted" style={{ marginTop: 8, marginLeft: 4 }}>보낸 기록</AppText> : null}
      {log.map((b) => (
        <Card key={b.id}>
          <AppText variant="body" weight={700}>{b.title}</AppText>
          <AppText variant="small" color="textSecondary">{b.body}</AppText>
          <AppText variant="small" color="textMuted">{`${when(b.created_at)} · ${b.sent}대`}</AppText>
        </Card>
      ))}
      <ConfirmDialog visible={ask !== null} message={`폰 ${ask ?? 0}대에 보낼까요?\n\n${title}\n${body}`} cancel="취소" ok="보내기"
        onCancel={() => setAsk(null)} onOk={send} />
    </>
  );
}

