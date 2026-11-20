import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, Archive, BottomSheet, Check, Clock, Clover, KeyboardSpacer, NeonText, Search, useToast } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { addTodo, ddayLabel, EndedCategoryError, isDDayToday, selectActiveCategories, selectDDays, todosForDay, useDB } from "../../data/store";
import { addDays, parseDay, today, WEEKDAY_LABELS, weekday, weekStart, type Day } from "../../lib/dates";
import { importantDays } from "../../lib/events";
import { takeHomeDay } from "../../lib/todoCalendar";
import { fontFamily, tokens, useInsets, useTheme, visibleOn } from "../../theme";
import { HomeMenu, MenuButton } from "../home/HomeMenu";
import { dayState } from "../home/dayState";
import { AgendaList } from "./AgendaList";

const G = tokens.layout.gutter;
export const dayTitle = (d: Day) => { const { m, d: dd } = parseDay(d); return `${m}월 ${dd}일 ${WEEKDAY_LABELS[weekday(d)]}요일`; };

/**
 * 오늘 (design app's home, 2026-11-21, user's choice "오늘 중심"): the day as an agenda. On top the date, the D-day and
 * how many to-dos are done; a week strip (swipe for the next or previous week); then the agenda; an input bar at the
 * bottom adds a to-do to the shown day in the chosen category.
 */
export function TodayScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const ddays = useDB(selectDDays);
  const cats = useDB(selectActiveCategories);
  const now = today();
  const [day, setDay] = useState<Day>(now);
  const [menu, setMenu] = useState(false);
  const [toast, notice] = useToast();
  // a day picked elsewhere (search result, 달력) opens here
  useFocusEffect(useCallback(() => { const d = takeHomeDay(); if (d) setDay(d); }, []));

  const todos = todosForDay(db, day);
  const doneCount = todos.filter((t) => t.isDone).length;
  const dday = ddays.find((d) => !d.isPrivate) ?? ddays[0];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18, height: 52, justifyContent: "flex-end" }}>
          <Pressable onPress={() => router.push(`/events/${day}` as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="이날 시간표"><Clock size={23} color={c.text} /></Pressable>
          <Pressable onPress={() => router.push("/search" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="할 일과 일기 검색"><Search size={23} color={c.text} /></Pressable>
          <Pressable onPress={() => router.push("/inbox" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="보관함"><Archive size={23} color={c.text} /></Pressable>
          <MenuButton onPress={() => setMenu(true)} />
        </View>
        <Pressable onPress={() => setDay(now)} accessibilityRole="button" accessibilityLabel={`${dayTitle(day)}${day === now ? "" : ", 오늘로 이동"}`}>
          <AppText variant="monthTitle" weight={700} style={{ fontSize: 26, lineHeight: 34 }} accessibilityRole="header">{dayTitle(day)}</AppText>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
          {dday ? (
            <Pressable onPress={() => router.push("/ddays" as never)} accessibilityRole="button" accessibilityLabel={`${dday.title} ${ddayLabel(dday, now)}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: c.dday + "22" }}>
              <AppText variant="small" weight={600}>{dday.title}</AppText>
              {isDDayToday(dday, now) ? <NeonText variant="body">{ddayLabel(dday, now)}</NeonText> : <AppText variant="small" weight={700} color="dday">{ddayLabel(dday, now)}</AppText>}
            </Pressable>
          ) : null}
          {todos.length ? <AppText variant="helper" color="textMuted">{`할 일 ${doneCount}/${todos.length}`}</AppText> : null}
        </View>
        <WeekStrip day={day} onPick={setDay} />
        <AgendaList day={day} notice={notice} />
      </ScrollView>
      <QuickAdd day={day} cats={cats} lastId={prefs.quickAddCategory} notice={notice} />
      <HomeMenu open={menu} onClose={() => setMenu(false)} />
      {toast}
    </View>
  );
}

/** Seven days with their stars; swipe left/right for another week, tap a day to show it. */
export function WeekStrip({ day, onPick }: { day: Day; onPick: (d: Day) => void }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const cats = useDB(selectActiveCategories);
  const start = weekStart(day, prefs.weekStartsSunday);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const lit = useMemo(() => importantDays(db.todos, [], start, addDays(start, 6)), [db.todos, start]);
  const now = today();
  const latest = useRef({ day, onPick });
  latest.current = { day, onPick };
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 40) latest.current.onPick(addDays(latest.current.day, g.dx < 0 ? 7 : -7)); },
  })).current;
  return (
    <View {...swipe.panHandlers} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginHorizontal: -6 }} accessibilityLabel="한 주">
      {days.map((d) => {
        const sel = d === day, wd = weekday(d);
        const list = todosForDay(db, d);
        return (
          <Pressable key={d} onPress={() => onPick(d)} accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityLabel={`${parseDay(d).m}월 ${parseDay(d).d}일${lit.has(d) ? ", 중요한 날" : ""}`}
            style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 8, borderRadius: 14, backgroundColor: sel ? c.surfaceStrong : "transparent" }}>
            <AppText variant="small" weight={600} color={wd === 0 ? "sunday" : wd === 6 ? "saturday" : "textMuted"}>{WEEKDAY_LABELS[wd]}</AppText>
            <AppText variant="body" weight={700} color={d === now && !sel ? "accent" : "text"}>{String(parseDay(d).d)}</AppText>
            <Clover size={16} state={dayState(list, cats, prefs.calendarCategoryCount)} glow={lit.has(d)} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** The bar at the bottom: type a to-do, it goes to the shown day in the chosen category (tap the chip to change it). */
function QuickAdd({ day, cats, lastId, notice }: { day: Day; cats: ReturnType<typeof selectActiveCategories>; lastId: string | null; notice: (m: string) => void }) {
  const { c } = useTheme();
  const insets = useInsets();
  const [text, setText] = useState("");
  const [picking, setPicking] = useState(false);
  const cat = cats.find((x) => x.id === lastId) ?? cats[0];
  const input = useRef<React.ElementRef<typeof TextInput>>(null);
  const submit = () => {
    const title = text.trim();
    if (!title || !cat) return;
    try {
      addTodo(cat.id, day, title);
      setText("");
    } catch (e) {
      if (e instanceof EndedCategoryError) notice(e.message); else throw e;
    }
  };
  if (!cats.length) return null;
  const col = visibleOn(cat.color, c.bg, c.text);
  return (
    <View style={{ paddingHorizontal: G, paddingTop: 8, paddingBottom: 10, backgroundColor: c.bg }}>
      <View style={{ height: 48, borderRadius: 24, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", paddingLeft: 18, paddingRight: 6, gap: 8 }}>
        <TextInput ref={input} value={text} onChangeText={setText} onSubmitEditing={submit} blurOnSubmit={false} returnKeyType="done"
          placeholder={`${parseDay(day).m}월 ${parseDay(day).d}일에 할 일 추가`} placeholderTextColor={c.textPlaceholder} accessibilityLabel="할 일 추가"
          style={{ flex: 1, minWidth: 0, color: c.text, fontSize: tokens.type.bodyLg.size, fontFamily: fontFamily(400), paddingVertical: 0, outlineStyle: "none" as never }} />
        <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`카테고리 ${cat.title}, 바꾸기`}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: col + "22" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
          <AppText variant="small" weight={700} raw={col} numberOfLines={1} style={{ maxWidth: 90 }}>{cat.title}</AppText>
        </Pressable>
      </View>
      {/* the tab bar under it already leaves its height (and the safe area) */}
      <KeyboardSpacer already={tokens.layout.bottomNavHeight + insets.bottom} />
      <BottomSheet visible={picking} onClose={() => setPicking(false)} title="어느 카테고리에 넣을까요?">
        {cats.map((x) => (
          <Pressable key={x.id} onPress={() => { setPref("quickAddCategory", x.id); setPicking(false); input.current?.focus(); }} accessibilityRole="radio" accessibilityState={{ checked: x.id === cat.id }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 52 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: visibleOn(x.color, c.bg, c.text) }} />
            <AppText variant="bodyLg" style={{ flex: 1 }}>{x.title}</AppText>
            {x.id === cat.id ? <Check size={20} color={c.text} /> : null}
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

