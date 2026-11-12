import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText, Calendar, CalendarHeader, CategoryPill, Heart, ProfileHeader, TodoRow, useToast, MoodMark } from "../../components";
import type { Diary } from "../../data/types";
import { friendMonth, react, type FriendView, type Reaction } from "../../data/social";
import { isVirtual, todosForDay } from "../../data/store";
import { usePrefs } from "../../data/prefs";
import { nextReaction } from "../../lib/friend";
import { addDays, fromMonthIndex, monthGrid, monthIndex, parseDay, pickAfterPaging, today, weekday, weekStart, type Day } from "../../lib/dates";
import { smoothLayout } from "../../lib/motion";
import { tokens, useTheme } from "../../theme";
import { CalendarPager, calendarJustSwiped } from "../home/CalendarPager";
import { dayState } from "../home/dayState";
import { FriendDiarySheet } from "./FriendDiarySheet";
import { ReactionLine } from "./ReactionLine";

export { ReactionLine };
import { ReactionSheet } from "./ReactionSheet";

const G = tokens.layout.gutter;

/**
 * A friend's home, opened from their chip on home (original, user's recording): their profile, calendar with
 * clovers (month, or week with the 주 button, as on my home), categories and to-dos, read only, and their diary of the
 * day when they share it. The heart at the right end of a to-do opens the reaction panel; once you reacted the heart
 * turns red and your sticker or emoji shows under the to-do. The diary opens in a sheet with its own heart.
 * Only what they share with you comes from the server (visibility, blocks and private memos are applied there).
 */
export function FriendHome({ id }: { id: string }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const now = today();
  const [selected, setSelected] = useState<Day>(now);
  const [view, setView] = useState(() => ({ y: parseDay(now).y, m: parseDay(now).m }));
  const [mode, setMode] = useState<"month" | "week">("month");
  const [months, setMonths] = useState<Record<number, FriendView | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ id: string; target: "todo" | "diary" } | null>(null); // whose reaction panel is open
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [toast, notice] = useToast();
  const loading = useRef(new Set<number>());
  const sundayFirst = prefs.weekStartsSunday;

  const load = useCallback((i: number, force = false) => {
    if (loading.current.has(i) || (!force && i in months)) return;
    loading.current.add(i);
    // the month and the days of the next and previous months the grid shows
    const first = (k: number) => { const { y, m } = fromMonthIndex(k); return `${y}-${String(m).padStart(2, "0")}-01`; };
    friendMonth(id, addDays(first(i), -7), addDays(first(i + 1), 6))
      .then((v) => { setMonths((x) => ({ ...x, [i]: v })); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했어요"))
      .finally(() => loading.current.delete(i));
  }, [id, months]);

  const monthOf = (d: Day) => { const { y, m } = parseDay(d); return monthIndex(y, m); };
  const epochWeek = weekStart("2000-01-02", sundayFirst);
  const weekIndexOf = (d: Day) => Math.round((Date.parse(weekStart(d, sundayFirst)) - Date.parse(epochWeek)) / (7 * 86400000));
  const weekDays = (i: number) => Array.from({ length: 7 }, (_, k) => addDays(epochWeek, i * 7 + k));
  const pageIndex = mode === "month" ? monthIndex(view.y, view.m) : weekIndexOf(selected);

  useEffect(() => { setMonths({}); setSelected(now); setView({ y: parseDay(now).y, m: parseDay(now).m }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode === "month") load(pageIndex);
    else { const days = weekDays(pageIndex); load(monthOf(days[0])); load(monthOf(days[6])); }
  }, [load, pageIndex, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentIndex = monthOf(selected);
  const current = months[currentIndex];
  const anyView = current ?? Object.values(months).find((v): v is FriendView => !!v);
  const goPage = (i: number, dir: 1 | -1) => {
    smoothLayout(200);
    if (mode === "week") {
      const next = addDays(selected, dir * 7 * Math.abs(i - pageIndex || 1));
      setSelected(next);
      setView({ y: parseDay(next).y, m: parseDay(next).m });
      return;
    }
    const { y, m } = fromMonthIndex(i);
    setView({ y, m });
    setSelected(pickAfterPaging(y, m, dir));
  };

  if (current === null || (!anyView && Object.values(months).some((v) => v === null))) {
    return <AppText variant="bodyLg" color="textMuted" center style={{ marginTop: 60 }}>볼 수 없는 사람이에요</AppText>;
  }
  if (!anyView) {
    return (
      <View style={{ marginTop: 60, alignItems: "center", gap: 12, paddingHorizontal: G }}>
        {error ? <AppText variant="body" color="textMuted" center>{error}</AppText> : <ActivityIndicator color={c.textMuted} />}
        {error ? <Pressable onPress={() => load(pageIndex, true)} accessibilityRole="button"><AppText variant="body" color="saturday">다시 시도</AppText></Pressable> : null}
      </View>
    );
  }

  const p = anyView.person;
  const cats = [...anyView.db.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const fdb = current?.db;
  const dayTodos = fdb ? todosForDay(fdb, selected).sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const shown = fdb ? [...fdb.categories].sort((a, b) => a.sortOrder - b.sortOrder).filter((cat) => dayTodos.some((t) => t.categoryId === cat.id)) : [];
  const diary: Diary | undefined = fdb?.diaries.find((d) => d.date === selected);

  const setReactions = (targetId: string, target: "todo" | "diary", list: Reaction[]) =>
    setMonths((x) => {
      const v = x[currentIndex];
      if (!v) return x;
      return { ...x, [currentIndex]: target === "todo" ? { ...v, reactions: { ...v.reactions, [targetId]: list } } : { ...v, diaryReactions: { ...v.diaryReactions, [targetId]: list } } };
    });
  const listFor = (targetId: string, target: "todo" | "diary") => ((target === "todo" ? current?.reactions : current?.diaryReactions)?.[targetId] ?? []);
  const onPick = (targetId: string, target: "todo" | "diary", value: string, kind: "emoji" | "sticker") => {
    const before = listFor(targetId, target);
    const { list, action } = nextReaction(before, { kind, value });
    setPicking(null);
    setReactions(targetId, target, list); // shows at once; put back if the server says no
    react(targetId, { kind, value }, action === "clear", target).catch((e) => {
      setReactions(targetId, target, before);
      notice(e instanceof Error ? e.message : "반응을 남기지 못했어요");
    });
  };
  const pickingMine = picking ? listFor(picking.id, picking.target).find((r) => r.mine)?.value : undefined;

  const grid = monthGrid(view.y, view.m, sundayFirst);
  const weekNo = Math.max(0, grid.findIndex((row) => row.includes(selected)));
  const title = mode === "month" ? `${view.y}년 ${view.m}월` : `${view.y}년 ${view.m}월 ${weekNo + 1}주차`;
  const stateOn = (d: Day) => {
    const v = months[monthOf(d)];
    if (v === undefined) setTimeout(() => load(monthOf(d)), 0); // the pages on either side, for the slide
    return v ? dayState(todosForDay(v.db, d), v.db.categories, prefs.calendarCategoryCount) : { kind: "empty" as const };
  };
  const renderPage = (i: number, width: number) => {
    const ym = mode === "month" ? fromMonthIndex(i) : view;
    return (
      <Calendar
        year={ym.y}
        month={ym.m}
        today={now}
        selected={selected}
        onSelect={(d) => { if (calendarJustSwiped()) return; if (d !== selected) smoothLayout(160); setSelected(d); }}
        state={stateOn}
        rows={mode === "week" ? [weekDays(i)] : undefined}
        weekStartsSunday={sundayFirst}
        width={width}
      />
    );
  };
  const diaryMine = diary ? (current?.diaryReactions[diary.id] ?? []).some((r) => r.mine) : false;

  return (
    <View>
      <View style={{ paddingHorizontal: G, marginTop: 34 }}>
        <ProfileHeader name={p.nickname} avatar={p.avatarUri} bio={p.bio} emoji={diary ? diary.emoji ?? "📔" : undefined} onEmoji={() => setDiaryOpen(true)} readOnly />
      </View>
      <View style={{ paddingHorizontal: G, marginTop: 27, gap: 16 }}>
        <CalendarHeader
          title={title}
          mode={mode}
          onTitle={() => { setSelected(now); setView({ y: parseDay(now).y, m: parseDay(now).m }); }}
          onToggleMode={() => { smoothLayout(); setMode(mode === "month" ? "week" : "month"); setView({ y: parseDay(selected).y, m: parseDay(selected).m }); }}
          onPrev={() => goPage(pageIndex - 1, -1)}
          onNext={() => goPage(pageIndex + 1, 1)}
          filterColors={cats.slice(0, 2).map((x) => x.color)}
        />
        <CalendarPager key={`friend-${id}-${mode}-${sundayFirst}`} index={pageIndex} onIndexChange={goPage} renderPage={renderPage} gutter={G} />
      </View>
      <View style={{ paddingHorizontal: G, marginTop: 20, gap: 12, marginLeft: 3 }}>
        {selected !== now ? (
          <AppText variant="helper" color="textMuted">{`${parseDay(selected).m}월 ${parseDay(selected).d}일 ${"일월화수목금토"[weekday(selected)]}요일`}</AppText>
        ) : null}
        {current === undefined ? <ActivityIndicator style={{ paddingVertical: 16 }} color={c.textMuted} /> : null}
        {current && shown.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 16 }}>이날 보이는 할 일이 없어요</AppText> : null}
        {shown.map((cat) => (
          <View key={cat.id} style={{ gap: 2 }}>
            <View style={{ marginBottom: 8 }}><CategoryPill title={cat.title} color={cat.color} visibility="public" /></View>
            {dayTodos.filter((t) => t.categoryId === cat.id).map((t) => {
              const list = listFor(t.id, "todo");
              const mine = list.some((r) => r.mine);
              // a routine's day that nobody has touched has no to-do of its own yet, so it cannot take a reaction
              const canReact = !isVirtual(t.id);
              return (
                <TodoRow
                  key={t.id}
                  title={t.title}
                  memo={t.memo}
                  photo={t.photoUri}
                  photoOthers
                  done={t.isDone}
                  color={cat.color}
                  onToggle={() => {}}
                  smallPhoto={prefs.smallTodoPhoto}
                  below={<ReactionLine list={list} />}
                  right={canReact ? (
                    <Pressable onPress={() => setPicking({ id: t.id, target: "todo" })} hitSlop={10} accessibilityRole="button" accessibilityLabel={mine ? `${t.title} 반응 바꾸기` : `${t.title}에 반응하기`}
                      style={{ paddingTop: 2 }}>
                      <Heart size={24} color={mine ? c.sunday : c.textMuted} fill={mine ? c.sunday : "transparent"} />
                    </Pressable>
                  ) : null}
                />
              );
            })}
          </View>
        ))}
        {diary ? (
          <Pressable onPress={() => setDiaryOpen(true)} accessibilityRole="button" accessibilityLabel={`${p.nickname}의 일기 보기`}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
            {diary.emoji ? <MoodMark value={diary.emoji} size={26} /> : <AppText variant="bodyLg">📔</AppText>}
            <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>{diary.body || "기분을 남겼어요"}</AppText>
            {diaryMine ? <Heart size={18} color={c.sunday} fill={c.sunday} /> : null}
          </Pressable>
        ) : null}
      </View>
      <FriendDiarySheet
        diary={diaryOpen ? diary ?? null : null}
        person={p}
        reactions={diary ? current?.diaryReactions[diary.id] ?? [] : []}
        onReact={() => diary && setPicking({ id: diary.id, target: "diary" })}
        onClose={() => setDiaryOpen(false)}
      />
      <ReactionSheet visible={!!picking} current={pickingMine} onPick={(v, k) => picking && onPick(picking.id, picking.target, v, k)} onClose={() => setPicking(null)} />
      {toast}
    </View>
  );
}
