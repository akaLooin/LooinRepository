import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { AppText, Button, ChevronDown, ChevronUp, Minus, Plus, Search, Toggle } from "../../components";
import { refreshAppConfig } from "../../lib/appConfig";
import { featureOn, numberOf, parseConfig, textOf, type AppConfig } from "../../lib/configRules";
import { COLOR_ROLES, FEATURES, HOME_CARDS, NUMBERS, TEXTS, type ColorRole, type FeatureKey, type HomeCard, type NumberKey, type TextKey } from "../../lib/remoteCatalog";
import { supabase } from "../../lib/supabase";
import { fontFamily, tokens, useTheme } from "../../theme";

/**
 * The admin app's editors for the design app (user, 2026-11-21: change as much as possible without Claude):
 * 기능 (shown parts, numbers, 점검 모드), 문구 (every text in remoteCatalog), 색 (colour roles per theme).
 * Each part is one row of app_config (features, numbers, maintenance, texts, colors); the phones read them when the
 * app opens or comes back. Bad values are dropped by parseConfig on the phones, so nothing here can break the app.
 */

type Rows = { key: string; value: unknown }[];

/** The server's settings, read as the design app reads them, plus a saver for one key. */
export function useRemote(notice: (m: string) => void) {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [raw, setRaw] = useState<Rows>([]);
  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("app_config").select("key, value");
    if (error) { notice(`불러오지 못했어요: ${error.message}`); return; }
    setRaw(data as Rows);
    setCfg(parseConfig(data as Rows, true));
  }, [notice]);
  useEffect(() => { load(); }, [load]);
  const save = useCallback(async (key: string, value: unknown, done: string) => {
    const { error } = await supabase!.from("app_config").upsert({ key, value, updated_at: new Date().toISOString() });
    notice(error ? `저장하지 못했어요: ${error.message}` : done);
    await load();
    refreshAppConfig();
  }, [load, notice]);
  return { cfg, raw, save, load };
}

function Card({ title, sub, children }: { title?: string; sub?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 16, gap: 10, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
      {title ? <AppText variant="bodyLg" weight={700}>{title}</AppText> : null}
      {sub ? <AppText variant="small" color="textMuted">{sub}</AppText> : null}
      {children}
    </View>
  );
}

function Line({ children, first }: { children: React.ReactNode; first?: boolean }) {
  const { c } = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderTopWidth: first ? 0 : 1, borderTopColor: c.sectionLine }}>{children}</View>;
}

function Input({ value, onChange, placeholder, lines = 1, max = 80, mono }: { value: string; onChange: (s: string) => void; placeholder: string; lines?: number; max?: number; mono?: boolean }) {
  const { c } = useTheme();
  return (
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.textPlaceholder} multiline={lines > 1} maxLength={max}
      autoCapitalize="none" autoCorrect={false} accessibilityLabel={placeholder}
      style={{ flex: 1, minHeight: lines > 1 ? 22 * lines + 20 : 42, borderRadius: tokens.radius.md, backgroundColor: c.surfaceInput, color: c.text, paddingHorizontal: 12, paddingVertical: 10,
        fontFamily: fontFamily(mono ? 600 : 500), fontSize: tokens.type.body.size, textAlignVertical: lines > 1 ? "top" : "center", outlineStyle: "none" as never }} />
  );
}

/** 기능: crews, the home notice, shown parts, numbers and 점검 모드. */
export function FeaturesEditor({ notice }: { notice: (m: string) => void }) {
  const { c } = useTheme();
  const { cfg, raw, save } = useRemote(notice);
  const [home, setHome] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!cfg) return <AppText variant="body" color="textMuted">불러오는 중…</AppText>;
  const homeText = home ?? (typeof raw.find((r) => r.key === "home_notice")?.value === "string" ? (raw.find((r) => r.key === "home_notice")!.value as string) : "");
  const maintMsg = msg ?? cfg.maintenance.message;
  const groups = [...new Set(Object.values(FEATURES).map((f) => f.group))];
  const setFeature = (k: FeatureKey, v: boolean) => save("features", { ...cfg.features, [k]: v }, `${FEATURES[k].label}: ${v ? "보이기" : "숨기기"}`);
  const setNumber = (k: NumberKey, v: number) => save("numbers", { ...cfg.numbers, [k]: v }, `${NUMBERS[k].label}: ${v}${NUMBERS[k].unit}`);
  return (
    <>
      <Card title="점검 모드" sub="켜면 디자인 앱을 연 사람에게 아래 문구가 담긴 점검 화면만 보여요. 관리자 앱은 그대로 쓸 수 있어요.">
        <Line first>
          <AppText variant="body" style={{ flex: 1 }}>{cfg.maintenance.on ? "점검 중" : "꺼짐"}</AppText>
          <Toggle value={cfg.maintenance.on} label="점검 모드" onChange={(on) => save("maintenance", { on, message: maintMsg }, on ? "점검 모드를 켰어요" : "점검 모드를 껐어요")} />
        </Line>
        <Input value={maintMsg} onChange={setMsg} placeholder="점검 안내 (비우면 기본 문구)" lines={2} max={300} />
        <Button kind="plain" label="문구 저장" onPress={() => save("maintenance", { on: cfg.maintenance.on, message: maintMsg.trim() }, "점검 문구를 저장했어요")} />
      </Card>

      <Card title="크루 기능" sub="켜면 디자인 앱 커뮤니티에 크루가 보여요. (기존 앱은 항상 보임)">
        <Line first>
          <AppText variant="body" style={{ flex: 1 }}>{cfg.crews ? "보이기" : "숨기기"}</AppText>
          <Toggle value={cfg.crews} label="크루 기능" onChange={(v) => save("crews_enabled", v, v ? "크루를 켰어요" : "크루를 껐어요")} />
        </Line>
      </Card>

      <Card title="홈 공지" sub="디자인 앱 홈 맨 위에 보이는 안내. 비우면 안 보여요.">
        <Input value={homeText} onChange={setHome} placeholder="예: 오늘 밤 12시에 잠깐 점검해요" lines={3} max={300} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="내리기" onPress={() => { setHome(""); save("home_notice", null, "홈 공지를 내렸어요"); }} />
          <Button kind="sheetPrimary" flex height={46} label="저장" onPress={() => save("home_notice", homeText.trim() || null, "홈 공지를 저장했어요")} />
        </View>
      </Card>

      {groups.map((g) => (
        <Card key={g} title={`보이기 · ${g}`}>
          {(Object.keys(FEATURES) as FeatureKey[]).filter((k) => FEATURES[k].group === g).map((k, i) => (
            <Line key={k} first={i === 0}>
              <AppText variant="body" style={{ flex: 1 }}>{FEATURES[k].label.replace(`${g}: `, "")}</AppText>
              <Toggle value={featureOn(cfg, k)} label={FEATURES[k].label} onChange={(v) => setFeature(k, v)} />
            </Line>
          ))}
        </Card>
      ))}

      <Card title="숫자" sub="− + 로 바꾸면 바로 저장돼요. 정해진 범위 밖으로는 안 바뀌어요.">
        {(Object.keys(NUMBERS) as NumberKey[]).map((k, i) => {
          const spec = NUMBERS[k], v = numberOf(cfg, k);
          const step = (d: number) => setNumber(k, Math.min(spec.max, Math.max(spec.min, v + d * spec.step)));
          const btn = (d: number) => (
            <Pressable onPress={() => step(d)} disabled={d < 0 ? v <= spec.min : v >= spec.max} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${spec.label} ${d < 0 ? "줄이기" : "늘리기"}`}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center", opacity: (d < 0 ? v <= spec.min : v >= spec.max) ? 0.35 : 1 }}>
              {d < 0 ? <Minus size={16} color={c.text} /> : <Plus size={16} color={c.text} />}
            </Pressable>
          );
          return (
            <Line key={k} first={i === 0}>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{spec.label}</AppText>
                <AppText variant="small" color="textMuted">{`기본 ${spec.def}${spec.unit} · ${spec.min}~${spec.max}`}</AppText>
              </View>
              {btn(-1)}
              <AppText variant="body" weight={700} center style={{ minWidth: 56 }}>{`${v}${spec.unit}`}</AppText>
              {btn(1)}
            </Line>
          );
        })}
      </Card>

      <Card title="홈 카드 순서" sub="▲ ▼ 로 옮기면 바로 저장되고, 열려 있는 디자인 앱에도 곧 반영돼요.">
        {cfg.homeOrder.map((k, i) => {
          const move = (d: number) => {
            const next = [...cfg.homeOrder];
            [next[i], next[i + d]] = [next[i + d], next[i]];
            save("home_order", next, `${HOME_CARDS[k]} 카드를 옮겼어요`);
          };
          const arrow = (d: number) => (
            <Pressable onPress={() => move(d)} disabled={d < 0 ? i === 0 : i === cfg.homeOrder.length - 1} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${HOME_CARDS[k]} ${d < 0 ? "위로" : "아래로"}`}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center", opacity: (d < 0 ? i === 0 : i === cfg.homeOrder.length - 1) ? 0.3 : 1 }}>
              {d < 0 ? <ChevronUp size={18} color={c.text} /> : <ChevronDown size={18} color={c.text} />}
            </Pressable>
          );
          return (
            <Line key={k} first={i === 0}>
              <AppText variant="body" weight={700} color="textMuted" style={{ width: 20 }}>{i + 1}</AppText>
              <AppText variant="body" style={{ flex: 1 }}>{HOME_CARDS[k as HomeCard]}</AppText>
              {arrow(-1)}{arrow(1)}
            </Line>
          );
        })}
      </Card>

      <History />

      <Button kind="plain" label="보이기·숫자·순서 모두 기본값으로" onPress={async () => { await save("features", {}, "기본값으로 돌렸어요"); await save("numbers", {}, "기본값으로 돌렸어요"); await save("home_order", Object.keys(HOME_CARDS), "보이기·숫자·순서를 기본값으로 돌렸어요"); }} />
      
    </>
  );
}

/** 문구: every text of the design app, with the default shown faintly; empty = default. */
export function TextsEditor({ notice }: { notice: (m: string) => void }) {
  const { cfg, save } = useRemote(notice);
  const [draft, setDraft] = useState<Partial<Record<TextKey, string>> | null>(null);
  const [q, setQ] = useState("");
  const keys = useMemo(() => (Object.keys(TEXTS) as TextKey[]).filter((k) => !q.trim() || TEXTS[k].label.includes(q.trim()) || TEXTS[k].def.includes(q.trim())), [q]);
  if (!cfg) return <AppText variant="body" color="textMuted">불러오는 중…</AppText>;
  const cur = draft ?? cfg.texts;
  const changed = draft !== null;
  const commit = () => {
    const clean = Object.fromEntries(Object.entries(cur).filter(([, v]) => typeof v === "string" && v.trim()).map(([k, v]) => [k, (v as string).trim()]));
    save("texts", clean, "문구를 저장했어요").then(() => setDraft(null));
  };
  return (
    <>
      <Card sub="칸을 비우면 기본 문구(흐린 글씨)로 돌아가요. 고친 뒤 맨 위 저장을 누르세요. 디자인 앱을 다시 열면 바뀌어요.">
        <SearchBox value={q} onChange={setQ} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="되돌리기" disabled={!changed} onPress={() => setDraft(null)} />
          <Button kind="sheetPrimary" flex height={46} label={changed ? "저장" : "바뀐 것 없음"} disabled={!changed} onPress={commit} />
        </View>
      </Card>
      <Card>
        {keys.map((k, i) => (
          <View key={k} style={{ gap: 6, paddingTop: i ? 10 : 0 }}>
            <AppText variant="small" color="textMuted">{TEXTS[k].label}</AppText>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Input value={cur[k] ?? ""} onChange={(s) => setDraft({ ...cur, [k]: s })} placeholder={TEXTS[k].def} />
            </View>
          </View>
        ))}
        {!keys.length ? <AppText variant="body" color="textMuted">찾는 문구가 없어요</AppText> : null}
      </Card>
      <Button kind="plain" label="문구 모두 기본값으로" onPress={() => save("texts", {}, "문구를 모두 기본값으로 돌렸어요").then(() => setDraft(null))} />
      <AppText variant="small" color="textMuted">{`지금 보이는 예: 홈 탭 "${textOf(cfg, "tab.home")}", 시간 없는 할 일 "${textOf(cfg, "agenda.todo")}"`}</AppText>
    </>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 42, paddingHorizontal: 12, borderRadius: 21, backgroundColor: c.surfaceInput }}>
      <Search size={16} color={c.textMuted} />
      <TextInput value={value} onChangeText={onChange} placeholder="찾기 (예: 홈, 오전)" placeholderTextColor={c.textPlaceholder} accessibilityLabel="문구 찾기"
        style={{ flex: 1, color: c.text, fontFamily: fontFamily(500), fontSize: tokens.type.body.size, paddingVertical: 0, outlineStyle: "none" as never }} />
    </View>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** 색: colour roles per theme (#RRGGBB), with the colour shown beside each; empty = the app's own colour. */
export function ColorsEditor({ notice, base }: { notice: (m: string) => void; base: Record<"dark" | "light", Record<string, string>> }) {
  const { c } = useTheme();
  const { cfg, save } = useRemote(notice);
  const [scheme, setScheme] = useState<"dark" | "light">("dark");
  const [draft, setDraft] = useState<AppConfig["colors"] | null>(null);
  if (!cfg) return <AppText variant="body" color="textMuted">불러오는 중…</AppText>;
  const cur = draft ?? cfg.colors;
  const set = cur[scheme];
  const bad = (Object.keys(set) as ColorRole[]).filter((k) => set[k] && !HEX.test(set[k]!));
  const commit = () => {
    if (bad.length) { notice("#RRGGBB 꼴로 적어 주세요 (예: #00ff7f)"); return; }
    const clean = (s: Partial<Record<ColorRole, string>>) => Object.fromEntries(Object.entries(s).filter(([, v]) => v && HEX.test(v)));
    save("colors", { dark: clean(cur.dark), light: clean(cur.light) }, "색을 저장했어요").then(() => setDraft(null));
  };
  return (
    <>
      <Card sub="디자인 앱의 색을 바꿔요. 칸을 비우면 원래 색. 다크·라이트 테마를 따로 정해요. 관리자 앱 색은 바뀌지 않아요.">
        <View style={{ flexDirection: "row", padding: 3, borderRadius: 12, backgroundColor: c.surfaceInput }} role="tablist">
          {(["dark", "light"] as const).map((k) => (
            <Pressable key={k} onPress={() => setScheme(k)} role="tab" aria-selected={scheme === k} accessibilityLabel={k === "dark" ? "다크 테마" : "라이트 테마"}
              style={{ flex: 1, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: scheme === k ? c.surfaceStrong : "transparent" }}>
              <AppText variant="helper" weight={scheme === k ? 700 : 500}>{k === "dark" ? "다크" : "라이트"}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="되돌리기" disabled={!draft} onPress={() => setDraft(null)} />
          <Button kind="sheetPrimary" flex height={46} label={draft ? "저장" : "바뀐 것 없음"} disabled={!draft} onPress={commit} />
        </View>
      </Card>
      <Card>
        {(Object.keys(COLOR_ROLES) as ColorRole[]).map((k, i) => {
          const v = set[k] ?? "";
          const shown = HEX.test(v) ? v : base[scheme][k];
          return (
            <Line key={k} first={i === 0}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: shown, borderWidth: 1, borderColor: c.sectionLine }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body">{COLOR_ROLES[k]}</AppText>
                <AppText variant="small" color={v && !HEX.test(v) ? "danger" : "textMuted"}>{v && !HEX.test(v) ? "#RRGGBB 꼴이 아니에요" : `원래 ${base[scheme][k]}`}</AppText>
              </View>
              <View style={{ width: 112 }}>
                <Input value={v} mono max={7} placeholder={base[scheme][k]}
                  onChange={(s) => setDraft({ ...cur, [scheme]: { ...set, [k]: s.trim() ? (s.startsWith("#") ? s : `#${s}`) : undefined } })} />
              </View>
            </Line>
          );
        })}
      </Card>
      <Button kind="plain" label="색 모두 원래대로" onPress={() => save("colors", { dark: {}, light: {} }, "색을 원래대로 돌렸어요").then(() => setDraft(null))} />
    </>
  );
}

const KEY_LABEL: Record<string, string> = {
  texts: "문구", features: "보이기", numbers: "숫자", colors: "색", home_order: "홈 카드 순서", maintenance: "점검 모드", crews_enabled: "크루 기능", home_notice: "홈 공지",
};

/** 변경 기록 (SQL 20261122000000_admin_live): the last 20 saves, newest first. Also copied into the repository. */
function History() {
  const { c } = useTheme();
  const [rows, setRows] = useState<{ id: number; key: string; changed_at: string }[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    supabase!.from("app_config_history").select("id, key, changed_at").order("changed_at", { ascending: false }).limit(20)
      .then(({ data, error: e }) => { if (e) setError(true); else setRows(data as never); });
  }, []);
  const when = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  return (
    <Card title="변경 기록" sub="최근 저장 20개. 같은 기록이 저장소(docs/context/remote-config.md)에도 복사돼서 Claude도 볼 수 있어요.">
      {error ? <AppText variant="small" color="textMuted">기록을 못 읽었어요. SQL 20261122000000_admin_live를 실행했는지 확인해 주세요.</AppText>
        : !rows ? <AppText variant="small" color="textMuted">불러오는 중…</AppText>
        : !rows.length ? <AppText variant="small" color="textMuted">아직 기록이 없어요</AppText>
        : rows.map((r, i) => (
          <Line key={r.id} first={i === 0}>
            <AppText variant="small" color="textMuted" style={{ width: 80 }}>{when(r.changed_at)}</AppText>
            <AppText variant="body" style={{ flex: 1 }}>{KEY_LABEL[r.key] ?? r.key}</AppText>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
          </Line>
        ))}
    </Card>
  );
}
