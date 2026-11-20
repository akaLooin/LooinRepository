import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, TextInput, View } from "react-native";
import { AppText, BottomSheet, Check, Clover, KeyboardSpacer } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { addTodo, EndedCategoryError, selectActiveCategories, todosForDay, useDB } from "../../data/store";
import { addDays, parseDay, today, WEEKDAY_LABELS, weekday, weekStart, type Day } from "../../lib/dates";
import { importantDays } from "../../lib/events";
import { isHoliday } from "../../lib/holidays";
import { fontFamily, tokens, useInsets, useTheme, visibleOn } from "../../theme";
import { dayState } from "../home/dayState";

const G = tokens.layout.gutter;
/** "11월 20일 금요일" */
export const dayTitle = (d: Day) => { const { m, d: dd } = parseDay(d); return `${m}월 ${dd}일 ${WEEKDAY_LABELS[weekday(d)]}요일`; };

/**
 * Seven days with their stars; swipe left/right for another week, tap a day to show it. `onDouble` (홈): a second tap
 * within 0.3 s opens the day elsewhere. `big` (홈 card): larger stars so the numbers read easily (user).
 */
export function WeekStrip({ day, onPick, onDouble, big }: { day: Day; onPick: (d: Day) => void; onDouble?: (d: Day) => void; big?: boolean }) {
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
  const lastTap = useRef<{ d: Day; at: number } | null>(null);
  const tap = (d: Day) => {
    const t = Date.now(), prev = lastTap.current;
    lastTap.current = { d, at: t };
    if (onDouble && prev && prev.d === d && t - prev.at < 300) { lastTap.current = null; onDouble(d); return; }
    onPick(d);
  };
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
          <Pressable key={d} onPress={() => tap(d)} accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityHint={onDouble ? "두 번 누르면 달력에서 열기" : undefined} accessibilityLabel={`${parseDay(d).m}월 ${parseDay(d).d}일${isHoliday(d) ? ", 공휴일" : ""}${lit.has(d) ? ", 중요한 날" : ""}`}
            style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 8, borderRadius: 14, backgroundColor: sel ? c.surfaceStrong : "transparent" }}>
            <AppText variant="small" weight={600} color={wd === 0 || isHoliday(d) ? "sunday" : wd === 6 ? "saturday" : "textMuted"}>{WEEKDAY_LABELS[wd]}</AppText>
            {/* today stays green even when picked; Sundays and 공휴일 red, Saturdays blue (user) */}
            <AppText variant={big ? "bodyLg" : "body"} weight={700} color={d === now ? "accent" : wd === 0 || isHoliday(d) ? "sunday" : wd === 6 ? "saturday" : "text"}>{String(parseDay(d).d)}</AppText>
            <Clover size={big ? 30 : 16} state={dayState(list, cats, prefs.calendarCategoryCount)} glow={lit.has(d)} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** The bar at the bottom: type a to-do, it goes to the shown day in the chosen category (tap the chip to change it). */
export function QuickAdd({ day, cats, lastId, notice }: { day: Day; cats: ReturnType<typeof selectActiveCategories>; lastId: string | null; notice: (m: string) => void }) {
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

