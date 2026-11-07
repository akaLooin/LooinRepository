import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, ChevronLeft, ChevronRight, PillButton, ScreenHeader } from "../../components";
import { selectCategories, todosForDay, useDB } from "../../data/store";
import { usePrefs } from "../../data/prefs";
import { addDays, monthGrid, parseDay, today, weekday, weekStart, type Day } from "../../lib/dates";
import { goBack } from "../../lib/nav";
import { smoothLayout } from "../../lib/motion";
import { cellItems, requestHomeDay } from "../../lib/todoCalendar";
import { tokens, useInsets, useTheme, visibleOn } from "../../theme";

const G = tokens.layout.gutter;
const WD = "일월화수목금토";

/**
 * 할 일 캘린더: a big calendar with the to-dos written in each day (month), or one row per day (week). A day shows
 * up to 설정 → 화면 → 월별/주별 할 일 캘린더의 최대 항목 개수 to-dos, then "+n". The categories follow the home
 * calendar's ▼ filter. Tapping a day opens home on that day.
 * (The original's screen was not seen: this layout is ours, from its setting names.)
 */
export function TodoCalendarScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const categories = useDB(selectCategories);
  const now = today();
  const [mode, setMode] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState<Day>(now); // a day in the month or week shown
  const { y, m } = parseDay(anchor);
  const sundayFirst = prefs.weekStartsSunday;

  const calIds = useMemo(() => new Set(prefs.calendarCategoryIds ?? categories.map((x) => x.id)), [prefs.calendarCategoryIds, categories]);
  const catOf = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);
  const order = useMemo(() => new Map(categories.map((x, i) => [x.id, i])), [categories]);
  const todosOn = (d: Day) =>
    todosForDay(db, d)
      .filter((t) => calIds.has(t.categoryId))
      .sort((a, b) => (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0) || a.sortOrder - b.sortOrder);

  const weekDays = Array.from({ length: 7 }, (_, k) => addDays(weekStart(anchor, sundayFirst), k));
  const grid = monthGrid(y, m, sundayFirst);
  const weekNo = Math.max(0, grid.findIndex((row) => row.includes(weekDays[0]) || row.includes(anchor)));
  const title = mode === "month" ? `${y}년 ${m}월` : `${y}년 ${m}월 ${weekNo + 1}주차`;
  const shift = (dir: 1 | -1) => {
    smoothLayout(160);
    if (mode === "week") setAnchor(addDays(anchor, dir * 7));
    else { const n = new Date(y, m - 1 + dir, 1); setAnchor(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`); }
  };
  const open = (d: Day) => { requestHomeDay(d); goBack("/"); };
  const dayColor = (d: Day): "sunday" | "saturday" | "text" => (weekday(d) === 0 ? "sunday" : weekday(d) === 6 ? "saturday" : "text");

  const Item = ({ title: t, color, done }: { title: string; color: string; done: boolean }) => (
    <AppText variant="small" numberOfLines={1} raw={done ? c.textMuted : visibleOn(color, c.bg, c.text)}
      style={{ textDecorationLine: done ? "line-through" : "none" }}>{t}</AppText>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="할 일 캘린더" onBack={() => goBack("/")} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: G, marginBottom: 12 }}>
        <Pressable onPress={() => setAnchor(now)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${title}, 오늘로 이동`}>
          <AppText variant="monthTitle" accessibilityRole="header">{title}</AppText>
        </Pressable>
        <PillButton label={mode === "month" ? "주" : "월"} onPress={() => { smoothLayout(); setMode(mode === "month" ? "week" : "month"); }} a11y={mode === "month" ? "주간 보기" : "월간 보기"} />
        <PillButton round onPress={() => shift(-1)} a11y="이전"><ChevronLeft size={20} color={c.text} /></PillButton>
        <PillButton round onPress={() => shift(1)} a11y="다음"><ChevronRight size={20} color={c.text} /></PillButton>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: G - 4, paddingBottom: 40 }}>
        {mode === "month" ? (
          <>
            <View style={{ flexDirection: "row" }}>
              {Array.from({ length: 7 }, (_, i) => WD[(i + (sundayFirst ? 0 : 1)) % 7]).map((w, i) => (
                <AppText key={w} variant="small" center color={w === "일" ? "sunday" : w === "토" ? "saturday" : "textMuted"} style={{ flex: 1, paddingBottom: 6 }}>{w}</AppText>
              ))}
            </View>
            {grid.map((row, r) => (
              <View key={r} style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: c.surface }}>
                {row.map((d, i) => {
                  if (!d) return <View key={i} style={{ flex: 1 }} />;
                  const list = todosOn(d);
                  const { shown, more } = cellItems(list, prefs.monthCalendarMax);
                  return (
                    <Pressable key={d} onPress={() => open(d)} accessibilityRole="button"
                      accessibilityLabel={`${parseDay(d).m}월 ${parseDay(d).d}일, 할 일 ${list.length}개${list.length ? `: ${list.map((t) => t.title).join(", ")}` : ""}`}
                      style={{ flex: 1, minHeight: 72, paddingHorizontal: 2, paddingTop: 4, paddingBottom: 6, gap: 1 }}>
                      <View style={{ alignSelf: "center", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: d === now ? c.selectedDay : "transparent", marginBottom: 2 }}>
                        <AppText variant="small" weight={600} color={dayColor(d)}>{parseDay(d).d}</AppText>
                      </View>
                      {shown.map((t) => <Item key={t.id} title={t.title} color={catOf.get(t.categoryId)?.color ?? c.text} done={t.isDone} />)}
                      {more ? <AppText variant="small" color="textMuted">+{more}</AppText> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </>
        ) : (
          weekDays.map((d) => {
            const list = todosOn(d);
            const { shown, more } = cellItems(list, prefs.weekCalendarMax);
            return (
              <Pressable key={d} onPress={() => open(d)} accessibilityRole="button" accessibilityLabel={`${parseDay(d).m}월 ${parseDay(d).d}일, 할 일 ${list.length}개`}
                style={{ flexDirection: "row", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: c.surface }}>
                <View style={{ width: 44, alignItems: "center", paddingTop: 2, borderRadius: tokens.radius.md, backgroundColor: d === now ? c.selectedDay : "transparent" }}>
                  <AppText variant="small" color={dayColor(d)}>{WD[weekday(d)]}</AppText>
                  <AppText variant="bodyLg" weight={700} color={dayColor(d)}>{parseDay(d).d}</AppText>
                </View>
                <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
                  {list.length === 0 ? <AppText variant="body" color="textMuted">할 일 없음</AppText> : null}
                  {shown.map((t) => (
                    <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.isDone ? catOf.get(t.categoryId)?.color ?? c.text : "transparent", borderWidth: 1.5, borderColor: catOf.get(t.categoryId)?.color ?? c.text }} />
                      <AppText variant="body" numberOfLines={1} color={t.isDone ? "textMuted" : "text"} style={{ flex: 1, textDecorationLine: t.isDone ? "line-through" : "none" }}>{t.title}</AppText>
                    </View>
                  ))}
                  {more ? <AppText variant="helper" color="textMuted">+{more}개 더</AppText> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
