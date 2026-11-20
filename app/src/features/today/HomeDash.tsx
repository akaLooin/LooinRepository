import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, ChevronRight, NeonText, Search, TodoRow, useToast } from "../../components";
import { usePrefs } from "../../data/prefs";
import { ddayLabel, isDDayToday, selectActiveCategories, selectCategories, selectDDays, todosForDay, toggleTodo, useDB } from "../../data/store";
import { addDays, daysBetween, parseDay, today, WEEKDAY_LABELS, weekday, weekStart, type Day } from "../../lib/dates";
import { clock, dayBlocks, eventsOn, eventTimeLabel, fromMinutes, inBand } from "../../lib/events";
import { peekHomeDay, requestHomeDay } from "../../lib/todoCalendar";
import { useAppConfig } from "../../lib/appConfig";
import { tokens, useInsets, useTheme, visibleOn } from "../../theme";
import { HomeMenu, MenuButton } from "../home/HomeMenu";
import { dayTitle, QuickAdd, WeekStrip } from "./parts";
import { ShortcutEditSheet, ShortcutGrid } from "./Shortcuts";

const G = tokens.layout.gutter;
const greeting = (h: number) => (h < 5 ? "늦은 밤이에요" : h < 12 ? "좋은 아침이에요" : h < 18 ? "좋은 오후예요" : "좋은 저녁이에요");

/**
 * 홈 (design app, 2026-11-21 second pass, user: "요약이나 각종 편의 기능"): a greeting, today at a glance (done count,
 * what is next), this week's stars (tap a day to see it in the card, double tap to open it in 달력), D-days, coming
 * 중요한 날 with their colours and D-n, shortcuts you pick and order (편집), and an input bar for today.
 */
export function HomeDash() {
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const cats = useDB(selectActiveCategories);
  const ddays = useDB(selectDDays);
  const profile = useDB((d) => d.profile);
  const all = useDB(selectCategories);
  const config = useAppConfig(); // a notice the admin panel put on 홈
  const [menu, setMenu] = useState(false);
  const [editShortcuts, setEditShortcuts] = useState(false);
  const [peek, setPeek] = useState<Day>(today()); // the day shown under 이번 주 (tap a day; a double tap opens 달력)
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
      ...db.todos.filter((t) => t.isImportant && t.date && t.date >= now && t.date <= end && !t.isSkipped).map((t) => {
        const cat = all.find((x) => x.id === t.categoryId);
        return { d: t.date!, title: t.title, id: t.id, color: cat?.color ?? c.accent, sub: `${cat?.title ?? "할 일"}${t.isDone ? " · 완료" : ""}` };
      }),
      ...db.events.filter((e) => e.important && e.endDate >= now && e.startDate <= end).map((e) => ({
        d: e.startDate < now ? now : e.startDate, title: e.title, id: e.id, color: e.color, sub: `일정 · ${eventTimeLabel(e, prefs.use24h, parseDay(now).y)}`,
      })),
    ];
    return list.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).slice(0, 5);
  }, [db.todos, db.events, now, all, c.accent, prefs.use24h]);
  // the picked day of the week card, shown right in the card
  const peekTodos = todosForDay(db, peek);
  const peekEvents = eventsOn(db.events, peek);

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

        {config.notice ? (
          <View style={{ marginTop: 14, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: c.sectionLine }} accessibilityRole="alert">
            <AppText variant="small" weight={700} color="textMuted">공지</AppText>
            <AppText variant="body" style={{ marginTop: 4 }}>{config.notice}</AppText>
          </View>
        ) : null}
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
          <WeekStrip big day={peek} onPick={setPeek} onDouble={openDay} />
          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.sectionLine }} accessibilityLabel={`${dayTitle(peek)}의 할 일과 일정`}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <AppText variant="helper" weight={700} style={{ flex: 1 }}>{peek === now ? `오늘 · ${dayTitle(peek)}` : dayTitle(peek)}</AppText>
              <Pressable onPress={() => openDay(peek)} hitSlop={8} accessibilityRole="button" accessibilityLabel="달력에서 열기" style={{ flexDirection: "row", alignItems: "center" }}>
                <AppText variant="small" color="textMuted">달력에서 열기</AppText><ChevronRight size={14} color={c.textMuted} />
              </Pressable>
            </View>
            {peekEvents.slice(0, 4).map((e) => (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: e.color }} />
                <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>{e.title}</AppText>
                <AppText variant="small" color="textMuted">{inBand(e) ? "종일" : clock(e.startTime ?? "00:00", prefs.use24h)}</AppText>
              </View>
            ))}
            {peekTodos.slice(0, 6).map((t) => (
              <TodoRow key={t.id} title={t.title} done={t.isDone} important={t.isImportant} small
                color={all.find((x) => x.id === t.categoryId)?.color ?? c.accent} onToggle={() => toggleTodo(t.id)} onPress={() => openDay(peek)} />
            ))}
            {peekTodos.length > 6 ? <AppText variant="small" color="textMuted" style={{ paddingTop: 4 }}>{`할 일 ${peekTodos.length - 6}개 더`}</AppText> : null}
            {!peekTodos.length && !peekEvents.length ? <AppText variant="helper" color="textMuted" style={{ paddingVertical: 8 }}>할 일도 일정도 없어요</AppText> : null}
          </View>
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
          {coming.map((x) => {
            const n = daysBetween(now, x.d), col = visibleOn(x.color, c.surface, c.text);
            return (
              <Pressable key={x.id} onPress={() => openDay(x.d)} accessibilityRole="button" accessibilityLabel={`${x.title}, ${x.sub}, ${n === 0 ? "오늘" : `${n}일 뒤`}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 }}>
                <View style={{ width: 40, alignItems: "center" }}>
                  <AppText variant="small" color="textMuted">{WEEKDAY_LABELS[weekday(x.d)]}</AppText>
                  <AppText variant="bodyLg" weight={700}>{String(parseDay(x.d).d)}</AppText>
                </View>
                <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: col }} />
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight={600} numberOfLines={1}>{x.title}</AppText>
                  <AppText variant="small" raw={col} numberOfLines={1}>{x.sub}</AppText>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: n === 0 ? c.dday + "33" : c.surfaceStrong }}>
                  <AppText variant="small" weight={700} color={n === 0 ? "dday" : "textSecondary"}>{n === 0 ? "오늘" : `D-${n}`}</AppText>
                </View>
              </Pressable>
            );
          })}
        </>) : null}

        {card(<>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <AppText variant="body" weight={700} style={{ flex: 1 }}>바로가기</AppText>
            <Pressable onPress={() => setEditShortcuts(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="바로가기 편집">
              <AppText variant="small" color="textMuted">편집</AppText>
            </Pressable>
          </View>
          <ShortcutGrid />
        </>)}
      </ScrollView>
      <QuickAdd day={now} cats={cats} lastId={prefs.quickAddCategory} notice={notice} />
      <HomeMenu open={menu} onClose={() => setMenu(false)} />
      <ShortcutEditSheet open={editShortcuts} onClose={() => setEditShortcuts(false)} />
      {toast}
    </View>
  );
}
