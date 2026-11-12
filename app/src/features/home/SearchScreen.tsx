import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { AppText, Check, ChevronLeft, MoodMark, Search, X } from "../../components";
import { useDB } from "../../data/store";
import { parseDay, WEEKDAY_LABELS, weekday, type Day } from "../../lib/dates";
import { goBack } from "../../lib/nav";
import { marks, searchAll, type SearchHit, type SearchKind } from "../../lib/search";
import { requestHomeDay } from "../../lib/todoCalendar";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";

const G = tokens.layout.gutter;
const dayTitle = (d: Day) => { const { y, m, d: dd } = parseDay(d); return `${y}년 ${m}월 ${dd}일 (${WEEKDAY_LABELS[weekday(d)]})`; };

type Row = { type: "day"; key: string; date: Day | null } | { type: "hit"; key: string; hit: SearchHit };

/** 할 일·일기 검색 (user's feature), from the search button at the top of home. A result opens home on its day. */
export function SearchScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState("");
  const [kind, setKind] = useState<SearchKind>("all");
  // search after a short pause in typing (a long history is searched on every key otherwise)
  useEffect(() => { const t = setTimeout(() => setTyped(q), 150); return () => clearTimeout(t); }, [q]);
  const todos = useDB((d) => d.todos);
  const diaries = useDB((d) => d.diaries);
  const categories = useDB((d) => d.categories);
  const hits = useMemo(() => searchAll({ todos, diaries, categories }, typed, kind), [todos, diaries, categories, typed, kind]);
  const rows = useMemo(() => {
    const out: Row[] = [];
    let last: string | undefined;
    for (const h of hits) {
      const k = h.date ?? "inbox";
      if (k !== last) { out.push({ type: "day", key: `d:${k}`, date: h.date }); last = k; }
      out.push({ type: "hit", key: `${h.kind}:${h.id}`, hit: h });
    }
    return out;
  }, [hits]);

  const open = (date: Day | null) => {
    if (date) { requestHomeDay(date); goBack("/"); }
    else { goBack("/"); router.push("/inbox" as never); }
  };

  const Marked = ({ text, variant, color, strike }: { text: string; variant: "body" | "helper"; color?: "text" | "textMuted"; strike?: boolean }) => (
    <AppText variant={variant} color={color} numberOfLines={2} style={strike ? { textDecorationLine: "line-through" } : undefined}>
      {marks(text, typed).map((p, i) => p.hit ? <AppText key={i} variant={variant} weight={700} raw={c.searchHit}>{p.t}</AppText> : p.t)}
    </AppText>
  );

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === "day") {
      return (
        <Pressable onPress={() => open(item.date)} accessibilityRole="button" accessibilityLabel={item.date ? `${dayTitle(item.date)}로 가기` : "보관함으로 가기"}
          style={{ paddingTop: 22, paddingBottom: 8 }}>
          <AppText variant="helper" color="textMuted" weight={600}>{item.date ? dayTitle(item.date) : "보관함"}</AppText>
        </Pressable>
      );
    }
    const h = item.hit;
    const label = h.kind === "todo" ? `할 일 ${h.text}${h.done ? ", 완료" : ""}` : `일기 ${h.text}`;
    return (
      <Pressable onPress={() => open(h.date)} accessibilityRole="button" accessibilityLabel={label}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: tokens.radius.md, backgroundColor: pressed ? c.surface : "transparent" })}>
        {h.kind === "todo" ? (
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: h.done ? h.color : "transparent", borderWidth: h.done ? 0 : 2, borderColor: h.color, alignItems: "center", justifyContent: "center" }}>
            {h.done ? <Check size={15} color={c.bg} strokeWidth={3} /> : null}
          </View>
        ) : (
          <View style={{ width: 22, alignItems: "center" }}>{h.emoji ? <MoodMark value={h.emoji} size={22} /> : <AppText variant="body">📔</AppText>}</View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          {h.kind === "diary" ? <AppText variant="helper" color="textMuted">일기</AppText> : null}
          <Marked text={h.text} variant="body" color={h.kind === "todo" && h.done ? "textMuted" : "text"} />
          {h.kind === "todo" && h.memo ? <Marked text={h.memo} variant="helper" color="textMuted" /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: G - 6, paddingRight: G, paddingTop: 10, paddingBottom: 10 }}>
        <Pressable onPress={() => goBack("/")} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로 가기" style={{ padding: 4 }}>
          <ChevronLeft size={28} color={c.text} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 10, gap: 8 }}>
          <Search size={18} color={c.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="할 일, 메모, 일기" placeholderTextColor={c.textPlaceholder} autoFocus autoCorrect={false}
            accessibilityLabel="할 일과 일기 검색" returnKeyType="search"
            style={{ flex: 1, minWidth: 0, color: c.text, fontSize: tokens.type.bodyLg.size, fontFamily: fontFamily(400), paddingVertical: 0, outlineStyle: "none" as never }} />
          {q ? <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="지우기"><X size={18} color={c.textMuted} /></Pressable> : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: G }}>
        {([["all", "전체"], ["todo", "할 일"], ["diary", "일기"]] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="button" accessibilityState={{ selected: kind === k }} accessibilityLabel={`${l}만 보기`}
            style={{ height: 34, paddingHorizontal: 16, borderRadius: tokens.radius.pill, justifyContent: "center", backgroundColor: kind === k ? c.text : c.surface }}>
            <AppText variant="body" weight={600} raw={kind === k ? c.bg : c.text}>{l}</AppText>
          </Pressable>
        ))}
      </View>
      <FlatList data={rows} keyExtractor={(r) => r.key} renderItem={renderRow} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: G, paddingBottom: insets.bottom + 40 }}
        ListEmptyComponent={
          <AppText variant="body" color="textMuted" center style={{ paddingVertical: 60 }}>
            {typed.trim() ? "찾는 할 일이나 일기가 없어요" : "지난 할 일과 일기를 찾아볼 수 있어요"}
          </AppText>
        } />
    </View>
  );
}
