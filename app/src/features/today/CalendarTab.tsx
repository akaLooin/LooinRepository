import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, Calendar, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Clock, Clover, Search, useToast } from "../../components";
import { usePrefs } from "../../data/prefs";
import { isDDayOn, selectActiveCategories, selectCategories, selectDDays, selectEvents, todosForDay, useDB } from "../../data/store";
import { fromMonthIndex, monthIndex, parseDay, pickAfterPaging, today, type Day } from "../../lib/dates";
import { eventBars, importantDays } from "../../lib/events";
import { smoothLayout } from "../../lib/motion";
import { takeHomeDay } from "../../lib/todoCalendar";
import { tokens, useInsets, useTheme } from "../../theme";
import { CalendarPager, calendarJustSwiped } from "../home/CalendarPager";
import { CalendarFilterSheet } from "../home/HomeSheets";
import { dayState } from "../home/dayState";
import { HomeMenu, MenuButton } from "../home/HomeMenu";
import { AgendaList } from "./AgendaList";
import { dayTitle, QuickAdd } from "./parts";

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
  const events = useDB(selectEvents);
  const now = today();
  const [selected, setSelected] = useState<Day>(now);
  const [view, setView] = useState(() => ({ y: parseDay(now).y, m: parseDay(now).m }));
  const [filter, setFilter] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, notice] = useToast();
  const eventMode = prefs.calendarKind === "span";
  const calIds = new Set(prefs.calendarCategoryIds ?? categories.map((x) => x.id));
  const calCats = active.filter((x) => calIds.has(x.id));
  const bars = useMemo(() => eventBars(events), [events]);
  const monthKey = `${view.y}-${String(view.m).padStart(2, "0")}`;
  const lit = useMemo(() => importantDays(db.todos, [], `${monthKey}-01`, `${monthKey}-31`), [db.todos, monthKey]);

  const show = (d: Day) => { setSelected(d); setView({ y: parseDay(d).y, m: parseDay(d).m }); };
  // a day picked elsewhere (홈, search, 할 일 캘린더) opens here
  useFocusEffect(useCallback(() => { const d = takeHomeDay(); if (d) show(d); }, []));
  const pageIndex = monthIndex(view.y, view.m);
  const goPage = (i: number, dir: 1 | -1) => {
    smoothLayout(200);
    const { y, m } = fromMonthIndex(i);
    setView({ y, m });
    setSelected(pickAfterPaging(y, m, dir));
  };
  const todos = todosForDay(db, selected);
  const doneCount = todos.filter((t) => t.isDone).length;
  const icon = (label: string, onPress: () => void, child: React.ReactNode) => (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} style={{ padding: 4 }}>{child}</Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 24 }}>
        {/* the same top row as 홈 (search, menu), so the month has room above it */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18, height: 52, justifyContent: "flex-end" }}>
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
          {icon("이전 달", () => goPage(pageIndex - 1, -1), <ChevronLeft size={24} color={c.text} />)}
          {icon("다음 달", () => goPage(pageIndex + 1, 1), <ChevronRight size={24} color={c.text} />)}
        </View>
        <CalendarPager key={String(prefs.weekStartsSunday)} index={pageIndex} onIndexChange={goPage} gutter={G} renderPage={(i, width) => {
          const ym = fromMonthIndex(i);
          return (
            <Calendar boxed year={ym.y} month={ym.m} today={now} selected={selected} width={width} weekStartsSunday={prefs.weekStartsSunday}
              onSelect={(d) => {
                if (calendarJustSwiped()) return;
                if (d !== selected) smoothLayout(160);
                setSelected(d);
                if (eventMode) router.push(`/events/${d}` as never);
              }}
              state={(d) => dayState(todosForDay(db, d).filter((t) => calIds.has(t.categoryId)), calCats, prefs.calendarCategoryCount)}
              spans={bars} kind={prefs.calendarKind} importantOn={(d) => lit.has(d)} ddayOn={(d) => ddays.some((x) => isDDayOn(x, d))} />
          );
        }} />
        <View style={{ height: 1, backgroundColor: c.sectionLine, marginTop: 14 }} />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 14 }}>
          <AppText variant="bodyLg" weight={700} style={{ flex: 1 }}>{dayTitle(selected)}</AppText>
          {todos.length ? <AppText variant="helper" color="textMuted">{`할 일 ${doneCount}/${todos.length}`}</AppText> : null}
          {icon("이날 시간표", () => router.push(`/events/${selected}` as never), <Clock size={21} color={c.text} />)}
        </View>
        <AgendaList day={selected} notice={notice} />
      </ScrollView>
      <QuickAdd day={selected} cats={active} lastId={prefs.quickAddCategory} notice={notice} />
      <HomeMenu open={menu} onClose={() => setMenu(false)} />
      {filter ? <CalendarFilterSheet open onClose={() => setFilter(false)} categories={categories} /> : null}
      {toast}
    </View>
  );
}
