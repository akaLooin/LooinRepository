import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  AppText, Archive, Bell, CalendarRange, ChevronRight, Clover, FileText, List, NeonText, Plus, Search, Sparkles, Users, useToast,
} from "../../components";
import { usePrefs } from "../../data/prefs";
import { ddayLabel, isDDayToday, selectActiveCategories, selectDDays, todosForDay, useDB } from "../../data/store";
import { addDays, parseDay, today, weekStart, type Day } from "../../lib/dates";
import { clock, dayBlocks, eventsOn, fromMinutes } from "../../lib/events";
import { peekHomeDay, requestHomeDay } from "../../lib/todoCalendar";
import { tokens, useInsets, useTheme } from "../../theme";
import { HomeMenu, MenuButton } from "../home/HomeMenu";
import { dayTitle, QuickAdd, WeekStrip } from "./parts";

const G = tokens.layout.gutter;
const greeting = (h: number) => (h < 5 ? "늦은 밤이에요" : h < 12 ? "좋은 아침이에요" : h < 18 ? "좋은 오후예요" : "좋은 저녁이에요");

/**
 * 홈 (design app, 2026-11-21 second pass, user: "요약이나 각종 편의 기능"): a greeting, today at a glance (done count,
 * what is next), this week's stars, D-days, coming 중요한 날, shortcuts, and an input bar for today. The full day
 * list lives in 달력; tapping a day or "오늘 할 일" opens it there.
 */
export function HomeDash() {
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const cats = useDB(selectActiveCategories);
  const ddays = useDB(selectDDays);
  const profile = useDB((d) => d.profile);
  const [menu, setMenu] = useState(false);
  const [toast, notice] = useToast();
  const now = today();
  const openDay = (d: Day) => { requestHomeDay(d); router.replace("/calendar" as never); };
  // a day asked for elsewhere (search, 할 일 캘린더) is shown in 달력
  useFocusEffect(useCallback(() => { if (peekHomeDay()) router.replace("/calendar" as never); }, []));

  const todos = todosForDay(db, now);
  const done = todos.filter((t) => t.isDone).length;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  // what is next today: the next timed event or to-do from now on
  const next = useMemo(() => {
    const items = [
      ...dayBlocks(db.events, now).map((b) => ({ at: b.top, title: b.e.title, kind: "일정" })),
      ...todos.filter((t) => t.remindAt && !t.isDone).map((t) => { const d = new Date(t.remindAt!); return { at: d.getHours() * 60 + d.getMinutes(), title: t.title, kind: "할 일" }; }),
    ].filter((x) => x.at >= nowMin).sort((a, b) => a.at - b.at);
    return items[0];
  }, [db.events, todos, now, nowMin]);
  const allDay = eventsOn(db.events, now).filter((e) => e.allDay);
  const ws = weekStart(now, prefs.weekStartsSunday);
  const weekStars = db.todos.filter((t) => t.isDone && t.date && t.date >= ws && t.date <= addDays(ws, 6)).length;
  // 중요한 날 coming in the next 30 days (to-dos and highlighted events)
  const coming = useMemo(() => {
    const end = addDays(now, 30);
    const list = [
      ...db.todos.filter((t) => t.isImportant && t.date && t.date >= now && t.date <= end && !t.isSkipped).map((t) => ({ d: t.date!, title: t.title, id: t.id })),
      ...db.events.filter((e) => e.important && e.endDate >= now && e.startDate <= end).map((e) => ({ d: e.startDate < now ? now : e.startDate, title: e.title, id: e.id })),
    ];
    return list.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).slice(0, 4);
  }, [db.todos, db.events, now]);

  const card = (children: React.ReactNode, onPress?: () => void, label?: string) => {
    const style = { marginTop: 14, padding: 16, borderRadius: tokens.radius.lg, backgroundColor: c.surface };
    // a card without its own action is a plain box, so the days and links inside take the taps
    return onPress
      ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={style}>{children}</Pressable>
      : <View style={style}>{children}</View>;
  };
  const cardTitle = (t: string, more?: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
      <AppText variant="body" weight={700} style={{ flex: 1 }}>{t}</AppText>
      {more ? <AppText variant="small" color="textMuted">{more}</AppText> : null}
      {more ? <ChevronRight size={16} color={c.textMuted} /> : null}
    </View>
  );
  const shortcuts: [string, typeof Plus, () => void][] = [
    ["일정 추가", CalendarRange, () => router.push(`/events/${now}` as never)],
    ["일기 쓰기", FileText, () => router.push(`/diary/${now}` as never)],
    ["보관함", Archive, () => router.push("/inbox" as never)],
    ["루틴", List, () => router.push("/routines" as never)],
    ["카테고리", Clover as never, () => router.push("/categories" as never)],
    ["디데이", Sparkles, () => router.push("/ddays" as never)],
    ["리마인더", Bell, () => router.push("/reminders" as never)],
    ["친구", Users, () => router.push("/people" as never)],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18, height: 52, justifyContent: "flex-end" }}>
          <Pressable onPress={() => router.push("/search" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="할 일과 일기 검색"><Search size={23} color={c.text} /></Pressable>
          <MenuButton onPress={() => setMenu(true)} />
        </View>
        <AppText variant="helper" color="textMuted">{dayTitle(now)}</AppText>
        <AppText variant="monthTitle" weight={700} style={{ fontSize: 26, lineHeight: 34, marginTop: 2 }} accessibilityRole="header">
          {`${greeting(new Date().getHours())}${profile.nickname ? `, ${profile.nickname}` : ""}`}
        </AppText>

        {card(<>
          {cardTitle("오늘", "할 일 보기")}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <AppText variant="monthTitle" weight={700}>{`${done}`}</AppText>
            <AppText variant="body" color="textMuted">{`/ ${todos.length} 끝냈어요`}</AppText>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceStrong, marginTop: 10, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${todos.length ? (done / todos.length) * 100 : 0}%`, backgroundColor: c.accent, borderRadius: 3 }} />
          </View>
          {next ? <AppText variant="helper" color="textSecondary" style={{ marginTop: 10 }}>{`다음 · ${clock(fromMinutes(next.at), prefs.use24h)} ${next.title} (${next.kind})`}</AppText> : null}
          {allDay.length ? <AppText variant="helper" color="textSecondary" style={{ marginTop: 4 }} numberOfLines={1}>{`종일 · ${allDay.map((e) => e.title).join(", ")}`}</AppText> : null}
        </>, () => openDay(now), "오늘 할 일 보기")}

        {card(<>
          {cardTitle("이번 주", `별 ${weekStars}개`)}
          <WeekStrip day={now} onPick={openDay} />
        </>)}

        {ddays.length ? card(<>
          {cardTitle("디데이", "모두 보기")}
          {ddays.slice(0, 3).map((d) => (
            <View key={d.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5 }}>
              <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>{d.title}</AppText>
              {isDDayToday(d, now) ? <NeonText variant="body">{ddayLabel(d, now)}</NeonText> : <AppText variant="body" weight={700} color="dday">{ddayLabel(d, now)}</AppText>}
            </View>
          ))}
        </>, () => router.push("/ddays" as never), "디데이 모두 보기") : null}

        {coming.length ? card(<>
          {cardTitle("다가오는 중요한 날")}
          {coming.map((x) => (
            <Pressable key={x.id} onPress={() => openDay(x.d)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 }}>
              <AppText variant="helper" color="textMuted" style={{ width: 56 }}>{x.d === now ? "오늘" : `${parseDay(x.d).m}.${parseDay(x.d).d}`}</AppText>
              <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>{x.title}</AppText>
            </Pressable>
          ))}
        </>) : null}

        {card(<>
          {cardTitle("바로가기")}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {shortcuts.map(([label, Icon, go]) => (
              <Pressable key={label} onPress={go} accessibilityRole="button" accessibilityLabel={label} style={{ width: "25%", alignItems: "center", gap: 6, paddingVertical: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>
                  {label === "카테고리" ? <Clover size={20} state={{ kind: "fill", color: cats[0]?.color ?? c.accent }} /> : <Icon size={20} color={c.text} />}
                </View>
                <AppText variant="small">{label}</AppText>
              </Pressable>
            ))}
          </View>
        </>)}
      </ScrollView>
      <QuickAdd day={now} cats={cats} lastId={prefs.quickAddCategory} notice={notice} />
      <HomeMenu open={menu} onClose={() => setMenu(false)} />
      {toast}
    </View>
  );
}
