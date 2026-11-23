import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, View, type ViewInstance } from "react-native";
import { AppText, Calendar, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Clock, Clover, DragScrollView, Search, useGlowOf, useToast } from "../../components";
import { usePrefs } from "../../data/prefs";
import { ddayLabel, deleteTodos, isDDayOn, nextOccurrence, moveTodos, selectActiveCategories, selectCategories, selectDDays, todosForDay, useDB } from "../../data/store";
import { addDays, fromMonthIndex, monthIndex, parseDay, pickAfterPaging, today, weekStart, type Day } from "../../lib/dates";
import { eventBars, importantDayColors, importantDays } from "../../lib/events";
import { smoothLayout } from "../../lib/motion";
import { takeHomeDay } from "../../lib/todoCalendar";
import { tokens, useInsets, useTheme } from "../../theme";
import { CalendarPager, calendarJustSwiped } from "../home/CalendarPager";
import { CalendarFilterSheet } from "../home/HomeSheets";
import { dayState } from "../home/dayState";
import { HomeMenu, MenuButton } from "../home/HomeMenu";
import { useCalendarEvents } from "../../lib/calendarView";
import { AgendaList, type AgendaDrop } from "./AgendaList";
import { SelectionBar } from "../home/SelectionBar";
import { dayTitle, DDayNotice, QuickAdd } from "./parts";

const G = tokens.layout.gutter;

/**
 * 달력 (design app, 2026-11-21 second pass, user): the agenda of a day under a month of stars. The picked day is a
 * white cell and today a grey one (no circle); stars keep the calendar's size. ▼ switches to the 일정 캘린더 (bars;
 * a date opens its hour grid). The input bar adds to the picked day.
 */
export function CalendarTab() {
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const categories = useDB(selectCategories);
  const active = useDB(selectActiveCategories);
  const ddays = useDB(selectDDays);
  const events = useCalendarEvents(); // 보기 설정: hidden Google calendars left out
  const now = today();
  const [selected, setSelected] = useState<Day>(now);
  const [view, setView] = useState(() => ({ y: parseDay(now).y, m: parseDay(now).m }));
  const [filter, setFilter] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, notice] = useToast();
  const eventMode = prefs.calendarKind === "span";
  const calIds = new Set(prefs.calendarCategoryIds ?? categories.map((x) => x.id));
  const calCats = active.filter((x) => calIds.has(x.id));
  const glowOf = useGlowOf();
  const bars = useMemo(() => eventBars(events, (e) => glowOf(e.categoryId, e.color), true), [events, prefs.glowMode, prefs.glowColors]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthKey = `${view.y}-${String(view.m).padStart(2, "0")}`;
  const lit = useMemo(() => importantDays(db.todos, [], `${monthKey}-01`, `${monthKey}-31`), [db.todos, monthKey]);
  // 메인 앱: a day glows in the colour of its first important to-do (its category's, or the one picked for it)
  const litColor = useMemo(() => importantDayColors(db.todos, categories, `${monthKey}-01`, `${monthKey}-31`, glowOf), [db.todos, categories, monthKey, prefs.glowMode, prefs.glowColors]); // eslint-disable-line react-hooks/exhaustive-deps

  // each day's star is worked out once per change of the data, not again on every tap or swipe (speed, user)
  const calKey = calCats.map((x) => x.id + x.color).join();
  const starOf = useMemo(() => {
    const cache = new Map<Day, ReturnType<typeof dayState>>();
    return (d: Day) => {
      let v = cache.get(d);
      if (!v) { v = dayState(todosForDay(db, d).filter((t) => calIds.has(t.categoryId)), calCats, prefs.calendarCategoryCount); cache.set(d, v); }
      return v;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, calKey, prefs.calendarCategoryCount]);
  const show = (d: Day) => { setSelected(d); setView({ y: parseDay(d).y, m: parseDay(d).m }); };
  // a day picked elsewhere (홈, search, 할 일 캘린더) opens here
  useFocusEffect(useCallback(() => { const d = takeHomeDay(); if (d) show(d); }, []));
  // 주 / 월 (as in the copy app): week pages show one row; paging moves the picked day by a week
  const [mode, setMode] = useState<"month" | "week">("month");
  const epochWeek = weekStart("2000-01-02", prefs.weekStartsSunday);
  const weekIndexOf = (d: Day) => Math.round((Date.parse(weekStart(d, prefs.weekStartsSunday)) - Date.parse(epochWeek)) / (7 * 86400000));
  const pageIndex = mode === "month" ? monthIndex(view.y, view.m) : weekIndexOf(selected);
  const lastPage = useRef(0);
  const goPage = (i: number, dir: 1 | -1) => {
    // swipes one after another: no fading layout, so the next month is there at once (user, 2026-11-23)
    const quick = Date.now() - lastPage.current < 700;
    lastPage.current = Date.now();
    if (!quick) smoothLayout(200);
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
  // 할 일 선택 (list menu): pick several to-dos, then move them or delete them
  const [selecting, setSelecting] = useState<Set<string> | null>(null);
  // drag a to-do onto a date of the calendar to move it there (as in the copy app)
  const cellViews = useRef(new Map<Day, ViewInstance>()).current;
  const cellRef = useCallback((d: Day, v: ViewInstance | null) => { if (v) cellViews.set(d, v); }, [cellViews]);
  const cellRects = useRef<{ d: Day; x: number; y: number; w: number; h: number }[]>([]);
  const [dropHover, setDropHover] = useState<Day | null>(null);
  const drop: AgendaDrop = {
    prepare: () => {
      const found: typeof cellRects.current = [];
      cellRects.current = found;
      const screenW = Dimensions.get("window").width;
      cellViews.forEach((v, d) => {
        try {
          v.measureInWindow((x, y, w, h) => { if (w && h && x >= -1 && x <= screenW - 2) found.push({ d, x, y, w, h }); });
        } catch { /* a date no longer on screen */ }
      });
    },
    at: (px, py) => {
      const hit = cellRects.current.find((r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h);
      return hit && hit.d !== selected ? hit.d : null;
    },
    onHover: (d) => setDropHover(d),
    onDropOn: (key, d) => {
      setDropHover(null);
      moveTodos([key], d);
      const p = parseDay(d);
      notice(`${p.m}월 ${p.d}일로 옮겼어요`);
    },
  };
  const todos = todosForDay(db, selected);
  const doneCount = todos.filter((t) => t.isDone).length;
  const icon = (label: string, onPress: () => void, child: React.ReactNode) => (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} style={{ padding: 4 }}>{child}</Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <DragScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 24 }}>
        {/* the same top row as 홈 (search, menu), so the month has room above it */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18, height: 52, justifyContent: "flex-end" }}>
          <DDayNotice />
          <Pressable onPress={() => router.push("/search" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="할 일과 일기 검색"><Search size={23} color={c.text} /></Pressable>
          <MenuButton onPress={() => setMenu(true)} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", height: 48, gap: 10, marginBottom: 6 }}>
          <Pressable onPress={() => show(now)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${view.y}년 ${view.m}월, 오늘로 이동`}>
            <AppText variant="monthTitle" weight={700} style={{ fontSize: 26, lineHeight: 34 }} accessibilityRole="header">{`${view.y}년 ${view.m}월`}</AppText>
          </Pressable>
          <Pressable onPress={() => setFilter(true)} accessibilityRole="button" accessibilityLabel={eventMode ? "캘린더 종류: 일정 캘린더" : "캘린더 종류: 할 일 캘린더"}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 17, backgroundColor: c.surface }}>
            {eventMode ? <CalendarRange size={18} color={c.text} /> : <Clover size={16} state={{ kind: "fill", color: calCats[0]?.color ?? c.accent }} />}
            <ChevronDown size={14} color={c.text} />
          </Pressable>
          <Pressable onPress={() => { smoothLayout(); setMode(mode === "month" ? "week" : "month"); setView({ y: parseDay(selected).y, m: parseDay(selected).m }); }}
            accessibilityRole="button" accessibilityLabel={mode === "month" ? "한 주만 보기" : "한 달 보기"}
            style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: c.surface, justifyContent: "center" }}>
            <AppText variant="helper" weight={700}>{mode === "month" ? "월" : "주"}</AppText>
          </Pressable>
          {icon(mode === "month" ? "이전 달" : "이전 주", () => goPage(pageIndex - 1, -1), <ChevronLeft size={24} color={c.text} />)}
          {icon(mode === "month" ? "다음 달" : "다음 주", () => goPage(pageIndex + 1, 1), <ChevronRight size={24} color={c.text} />)}
        </View>
        <CalendarPager key={`${prefs.weekStartsSunday}${mode}`} index={pageIndex} onIndexChange={goPage} gutter={G} renderPage={(i, width) => {
          const rows = mode === "week" ? [Array.from({ length: 7 }, (_, k) => addDays(epochWeek, i * 7 + k))] : undefined;
          const ym = mode === "month" ? fromMonthIndex(i) : view;
          return (
            <Calendar boxed year={ym.y} month={ym.m} rows={rows} today={now} selected={selected} width={width} weekStartsSunday={prefs.weekStartsSunday}
              cellRef={cellRef} dropHover={dropHover}
              onSelect={(d) => {
                if (calendarJustSwiped()) return;
                if (d !== selected) smoothLayout(160);
                setSelected(d);
                if (eventMode) router.push(`/events/${d}` as never);
              }}
              state={starOf}
              spans={bars} kind={prefs.calendarKind} importantOn={(d) => litColor.get(d) ?? lit.has(d)} ddayOn={(d) => ddays.some((x) => isDDayOn(x, d))} />
          );
        }} />
        <View style={{ height: 1, backgroundColor: c.sectionLine, marginTop: 14 }} />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 14 }}>
          <AppText variant="bodyLg" weight={700} style={{ flex: 1 }}>{dayTitle(selected)}</AppText>
          {todos.length ? <AppText variant="helper" color="textMuted">{`할 일 ${doneCount}/${todos.length}`}</AppText> : null}
          {icon("이날 시간표", () => router.push(`/events/${selected}` as never), <Clock size={21} color={c.text} />)}
        </View>
        <AgendaList day={selected} notice={notice} drop={drop} selecting={selecting} onSelecting={setSelecting} />
      </DragScrollView>
      {selecting ? (
        <SelectionBar
          count={selecting.size}
          onCancel={() => setSelecting(null)}
          onTomorrow={() => { moveTodos([...selecting], addDays(selected, 1)); notice(`${selecting.size}개를 내일로 옮겼어요`); setSelecting(null); }}
          onInbox={() => { moveTodos([...selecting], null); notice(`${selecting.size}개를 보관함으로 옮겼어요`); setSelecting(null); }}
          onDelete={() => { deleteTodos([...selecting]); notice(`${selecting.size}개를 지웠어요`); setSelecting(null); }}
        />
      ) : <QuickAdd day={selected} cats={active} lastId={prefs.quickAddCategory} notice={notice} />}
      <HomeMenu open={menu} onClose={() => setMenu(false)} />
      {filter ? <CalendarFilterSheet open onClose={() => setFilter(false)} categories={categories} /> : null}
      {toast}
    </View>
  );
}
