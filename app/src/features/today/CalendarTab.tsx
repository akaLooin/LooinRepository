import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, Calendar, CalendarHeader, useToast } from "../../components";
import { usePrefs } from "../../data/prefs";
import { isDDayOn, selectActiveCategories, selectCategories, selectDDays, selectEvents, todosForDay, useDB } from "../../data/store";
import { fromMonthIndex, monthIndex, parseDay, pickAfterPaging, today, type Day } from "../../lib/dates";
import { eventBars, importantDays } from "../../lib/events";
import { smoothLayout } from "../../lib/motion";
import { requestHomeDay } from "../../lib/todoCalendar";
import { tokens, useInsets, useTheme } from "../../theme";
import { CalendarPager, calendarJustSwiped } from "../home/CalendarPager";
import { CalendarFilterSheet } from "../home/HomeSheets";
import { dayState } from "../home/dayState";
import { AgendaList } from "./AgendaList";
import { dayTitle } from "./TodayScreen";

const G = tokens.layout.gutter;

/**
 * 달력 (design app, 2026-11-21): the month with its stars (할 일 캘린더) or event bars (일정 캘린더, ▼), and the chosen
 * day's agenda under it. On the 일정 캘린더 a date opens its hour grid, as before.
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
  const [toast, notice] = useToast();
  const eventMode = prefs.calendarKind === "span";
  const calIds = new Set(prefs.calendarCategoryIds ?? categories.map((x) => x.id));
  const calCats = active.filter((x) => calIds.has(x.id));
  const bars = useMemo(() => eventBars(events), [events]);
  const monthKey = `${view.y}-${String(view.m).padStart(2, "0")}`;
  const lit = useMemo(() => importantDays(db.todos, [], `${monthKey}-01`, `${monthKey}-31`), [db.todos, monthKey]);

  const goPage = (i: number, dir: 1 | -1) => {
    smoothLayout(200);
    const { y, m } = fromMonthIndex(i);
    setView({ y, m });
    setSelected(pickAfterPaging(y, m, dir));
  };
  const pageIndex = monthIndex(view.y, view.m);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: G, paddingTop: 16, paddingBottom: 40 }}>
        <CalendarHeader title={`${view.y}년 ${view.m}월`} mode="month" onPrev={() => goPage(pageIndex - 1, -1)} onNext={() => goPage(pageIndex + 1, 1)}
          onTitle={() => { setSelected(now); setView({ y: parseDay(now).y, m: parseDay(now).m }); }}
          filterColors={calCats.slice(0, 2).map((x) => x.color)} onFilter={() => setFilter(true)} kind={prefs.calendarKind} />
        <View style={{ marginTop: 16 }}>
          <CalendarPager key={String(prefs.weekStartsSunday)} index={pageIndex} onIndexChange={goPage} gutter={G} renderPage={(i, width) => {
            const ym = fromMonthIndex(i);
            return (
              <Calendar year={ym.y} month={ym.m} today={now} selected={selected} width={width} weekStartsSunday={prefs.weekStartsSunday}
                onSelect={(d) => {
                  if (calendarJustSwiped()) return;
                  setSelected(d);
                  if (eventMode) router.push(`/events/${d}` as never);
                }}
                state={(d) => dayState(todosForDay(db, d).filter((t) => calIds.has(t.categoryId)), calCats, prefs.calendarCategoryCount)}
                spans={bars} kind={prefs.calendarKind} importantOn={(d) => lit.has(d)} ddayOn={(d) => ddays.some((x) => isDDayOn(x, d))} />
            );
          }} />
        </View>
        {eventMode ? null : (
          <View style={{ marginTop: 18 }}>
            <AppText variant="bodyLg" weight={700}>{dayTitle(selected)}</AppText>
            <AgendaList day={selected} notice={notice} />
            {/* adding happens on 오늘 (its input bar), opened on this day */}
            <Pressable onPress={() => { requestHomeDay(selected); router.replace("/" as never); }} accessibilityRole="button"
              style={{ marginTop: 12, height: 46, borderRadius: 23, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
              <AppText variant="body" color="textMuted">＋ 이날에 할 일 추가</AppText>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {filter ? <CalendarFilterSheet open onClose={() => setFilter(false)} categories={categories} /> : null}
      {toast}
    </View>
  );
}
