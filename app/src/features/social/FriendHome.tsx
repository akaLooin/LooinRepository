import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText, Calendar, CalendarHeader, CategoryPill, Heart, ProfileHeader, Sticker, stickerLabel, TodoRow, useToast } from "../../components";
import { friendMonth, react, type FriendView, type Reaction } from "../../data/social";
import { isVirtual, todosForDay } from "../../data/store";
import { usePrefs } from "../../data/prefs";
import { nextReaction } from "../../lib/friend";
import { addDays, fromMonthIndex, monthIndex, parseDay, pickAfterPaging, today, weekday, type Day } from "../../lib/dates";
import { smoothLayout } from "../../lib/motion";
import { tokens, useTheme } from "../../theme";
import { CalendarPager, calendarJustSwiped } from "../home/CalendarPager";
import { dayState } from "../home/dayState";
import { ReactionSheet } from "./ReactionSheet";

const G = tokens.layout.gutter;

/** The reactions under a to-do: the emoji people gave, in order (original: the sticker sits under the title). */
export function ReactionLine({ list }: { list: Reaction[] }) {
  if (!list.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 4 }} accessibilityLabel={`반응 ${list.map((r) => (r.kind === "sticker" ? stickerLabel(r.value) : r.value)).join(" ")}`}>
      {list.map((r, i) => r.kind === "sticker" ? <Sticker key={i} id={r.value} size={44} /> : <AppText key={i} style={{ fontSize: 22, lineHeight: 28 }}>{r.value}</AppText>)}
    </View>
  );
}

/**
 * A friend's home, opened from their chip on home (original, user's recording): their profile, calendar with
 * clovers, categories and to-dos, read only. The heart at the right end of a to-do opens the reaction panel; once
 * you reacted the heart turns red and your emoji shows under the to-do. Only what they share with you comes from the
 * server (visibility, blocks and private memos are applied there).
 */
export function FriendHome({ id }: { id: string }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const now = today();
  const [selected, setSelected] = useState<Day>(now);
  const [view, setView] = useState(() => ({ y: parseDay(now).y, m: parseDay(now).m }));
  const [months, setMonths] = useState<Record<number, FriendView | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null); // to-do whose reaction panel is open
  const [toast, notice] = useToast();
  const loading = useRef(new Set<number>());

  const load = useCallback((i: number, force = false) => {
    if (loading.current.has(i) || (!force && i in months)) return;
    loading.current.add(i);
    // the month and the days of the next and previous months the grid shows
    const first = (k: number) => { const { y, m } = fromMonthIndex(k); return `${y}-${String(m).padStart(2, "0")}-01`; };
    friendMonth(id, addDays(first(i), -7), addDays(first(i + 1), 6))
      .then((v) => { setMonths((x) => ({ ...x, [i]: v })); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했어요"))
      .finally(() => loading.current.delete(i));
  }, [id, months, prefs.weekStartsSunday]);

  const pageIndex = monthIndex(view.y, view.m);
  useEffect(() => { setMonths({}); setSelected(now); setView({ y: parseDay(now).y, m: parseDay(now).m }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(pageIndex); }, [load, pageIndex]);

  const current = months[pageIndex];
  const goPage = (i: number, dir: 1 | -1) => {
    smoothLayout(200);
    const { y, m } = fromMonthIndex(i);
    setView({ y, m });
    setSelected(pickAfterPaging(y, m, dir));
  };

  if (current === null) {
    return <AppText variant="bodyLg" color="textMuted" center style={{ marginTop: 60 }}>볼 수 없는 사람이에요</AppText>;
  }
  if (!current) {
    return (
      <View style={{ marginTop: 60, alignItems: "center", gap: 12, paddingHorizontal: G }}>
        {error ? <AppText variant="body" color="textMuted" center>{error}</AppText> : <ActivityIndicator color={c.textMuted} />}
        {error ? <Pressable onPress={() => load(pageIndex, true)} accessibilityRole="button"><AppText variant="body" color="saturday">다시 시도</AppText></Pressable> : null}
      </View>
    );
  }

  const fdb = current.db;
  const p = current.person;
  const cats = [...fdb.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const dayTodos = todosForDay(fdb, selected).sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = cats.filter((cat) => dayTodos.some((t) => t.categoryId === cat.id));

  const setReactions = (todoId: string, list: Reaction[]) =>
    setMonths((x) => ({ ...x, [pageIndex]: x[pageIndex] ? { ...x[pageIndex]!, reactions: { ...x[pageIndex]!.reactions, [todoId]: list } } : x[pageIndex] }));
  const onPick = (todoId: string, value: string, kind: "emoji" | "sticker") => {
    const before = current.reactions[todoId] ?? [];
    const { list, action } = nextReaction(before, { kind, value });
    setPicking(null);
    setReactions(todoId, list); // shows at once; put back if the server says no
    react(todoId, { kind, value }, action === "clear").catch((e) => {
      setReactions(todoId, before);
      notice(e instanceof Error ? e.message : "반응을 남기지 못했어요");
    });
  };
  const pickingMine = picking ? (current.reactions[picking] ?? []).find((r) => r.mine)?.value : undefined;

  const renderPage = (i: number, width: number) => {
    const ym = fromMonthIndex(i);
    const v = months[i];
    if (v === undefined) setTimeout(() => load(i), 0); // the months on either side, for the slide
    return (
      <Calendar
        year={ym.y}
        month={ym.m}
        today={now}
        selected={selected}
        onSelect={(d) => { if (calendarJustSwiped()) return; if (d !== selected) smoothLayout(160); setSelected(d); }}
        state={(d) => (v ? dayState(todosForDay(v.db, d), v.db.categories, prefs.calendarCategoryCount) : { kind: "empty" })}
        weekStartsSunday={prefs.weekStartsSunday}
        width={width}
      />
    );
  };

  return (
    <View>
      <View style={{ paddingHorizontal: G, marginTop: 34 }}>
        <ProfileHeader name={p.nickname} avatar={p.avatarUri} bio={p.bio} emoji={p.statusEmoji} readOnly />
      </View>
      <View style={{ paddingHorizontal: G, marginTop: 27, gap: 16 }}>
        <CalendarHeader
          title={`${view.y}년 ${view.m}월`}
          mode="month"
          onTitle={() => { setSelected(now); setView({ y: parseDay(now).y, m: parseDay(now).m }); }}
          onPrev={() => goPage(pageIndex - 1, -1)}
          onNext={() => goPage(pageIndex + 1, 1)}
          filterColors={cats.slice(0, 2).map((x) => x.color)}
        />
        <CalendarPager key={`friend-${id}-${prefs.weekStartsSunday}`} index={pageIndex} onIndexChange={goPage} renderPage={renderPage} gutter={G} />
      </View>
      <View style={{ paddingHorizontal: G, marginTop: 20, gap: 12, marginLeft: 3 }}>
        {selected !== now ? (
          <AppText variant="helper" color="textMuted">{`${parseDay(selected).m}월 ${parseDay(selected).d}일 ${"일월화수목금토"[weekday(selected)]}요일`}</AppText>
        ) : null}
        {shown.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 16 }}>이날 보이는 할 일이 없어요</AppText> : null}
        {shown.map((cat) => (
          <View key={cat.id} style={{ gap: 2 }}>
            <View style={{ marginBottom: 8 }}><CategoryPill title={cat.title} color={cat.color} visibility="public" /></View>
            {dayTodos.filter((t) => t.categoryId === cat.id).map((t) => {
              const list = current.reactions[t.id] ?? [];
              const mine = list.some((r) => r.mine);
              // a routine's day that nobody has touched has no to-do of its own yet, so it cannot take a reaction
              const canReact = !isVirtual(t.id);
              return (
                <TodoRow
                  key={t.id}
                  title={t.title}
                  memo={t.memo}
                  photo={t.photoUri}
                  done={t.isDone}
                  color={cat.color}
                  onToggle={() => {}}
                  smallPhoto={prefs.smallTodoPhoto}
                  below={<ReactionLine list={list} />}
                  right={canReact ? (
                    <Pressable onPress={() => setPicking(t.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={mine ? `${t.title} 반응 바꾸기` : `${t.title}에 반응하기`}
                      style={{ paddingTop: 2 }}>
                      <Heart size={24} color={mine ? c.sunday : c.textMuted} fill={mine ? c.sunday : "transparent"} />
                    </Pressable>
                  ) : null}
                />
              );
            })}
          </View>
        ))}
      </View>
      <ReactionSheet visible={!!picking} current={pickingMine} onPick={(v, k) => picking && onPick(picking, v, k)} onClose={() => setPicking(null)} />
      {toast}
    </View>
  );
}
