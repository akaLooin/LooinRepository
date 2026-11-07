import { useState } from "react";
import { Pressable, View } from "react-native";
import { monthGrid, parseDay, weekday, weekdayLabels, type Day } from "../lib/dates";
import { tokens, useTheme, type ColorName } from "../theme";
import { AppText } from "./AppText";
import { Clover, type CloverState } from "./Clover";
import { ChevronDown, ChevronLeft, ChevronRight } from "./icons";
import { PillButton } from "./Pill";

function dayColor(wd: number): ColorName {
  return wd === 0 ? "sunday" : wd === 6 ? "saturday" : "text";
}

/** [clover ▼]  2026년 11월  [주] [‹] [›]  (S03) */
export function CalendarHeader({ title, mode, onToggleMode, onPrev, onNext, filterColors, onFilter, onTitle }: {
  title: string; mode: "month" | "week"; onToggleMode: () => void; onPrev: () => void; onNext: () => void; filterColors: string[]; onFilter?: () => void;
  /** tapping the big month title goes back to today (original) */
  onTitle?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <PillButton onPress={onFilter} a11y="표시할 카테고리" pad={9} gap={8}>
        <View style={{ width: 22, height: 22 }}>
          {filterColors.slice(0, 2).map((col, i) => (
            <View key={i} style={{ position: "absolute", left: i * 4, top: i * 4 }}><Clover size={18} state={{ kind: "fill", color: col }} /></View>
          ))}
        </View>
        <ChevronDown size={15} color={c.text} fill={c.text} />
      </PillButton>
      <Pressable onPress={onTitle} disabled={!onTitle} style={{ flex: 1, marginLeft: 1 }} accessibilityRole="button" accessibilityLabel={`${title}, 오늘로 이동`}>
        <AppText variant="monthTitle" accessibilityRole="header">{title}</AppText>
      </Pressable>
      <PillButton label={mode === "month" ? "주" : "월"} onPress={onToggleMode} a11y={mode === "month" ? "주간 보기" : "월간 보기"} />
      <PillButton round onPress={onPrev} a11y="이전"><ChevronLeft size={20} color={c.text} /></PillButton>
      <PillButton round onPress={onNext} a11y="다음"><ChevronRight size={20} color={c.text} /></PillButton>
    </View>
  );
}

/**
 * Month or week grid. `state` gives each day's clover; pass `picker` for the plain date picker (S21b).
 * `rows` lets the week view pass just one row.
 */
export function Calendar({ year, month, today, selected, onSelect, state, picker, weekStartsSunday = true, rows, width }: {
  year: number; month: number; today: Day; selected?: Day; onSelect?: (d: Day) => void; state?: (d: Day) => CloverState; picker?: boolean; weekStartsSunday?: boolean; rows?: (Day | null)[][];
  /** known width (calendar pager): the dates are placed right away instead of after measuring */
  width?: number;
}) {
  const { c } = useTheme();
  const grid = rows ?? monthGrid(year, month, weekStartsSunday);
  const labels = weekdayLabels(weekStartsSunday);
  // The original spreads the days edge to edge: the first clover touches the left margin, the last the right one.
  // Cells stay equal (bigger tap targets), so they reach past the margins by this much on each side.
  const [measured, setW] = useState(0);
  const w = width ?? measured;
  const k = tokens.size.cloverCalendar;
  const bleed = picker || !w ? 0 : Math.max(0, ((w - k) / 6 - k) / 2);
  const ringSize = tokens.size.todayRing;
  return (
    <View onLayout={width ? undefined : (e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: "row", marginBottom: picker ? 10 : 5, marginHorizontal: -bleed }}>
        {labels.map((l) => (
          <AppText key={l} variant="weekday" center color={l === "일" ? "sunday" : l === "토" ? "saturday" : "text"} style={{ flex: 1 }}>{l}</AppText>
        ))}
      </View>
      {grid.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", height: picker ? 52 : tokens.layout.calendarRowHeight, marginHorizontal: -bleed }}>
          {row.map((day, j) => {
            if (!day) return <View key={j} style={{ flex: 1 }} />;
            const isToday = day === today;
            // As in the original: the picked day is a white disc (black number, red/blue kept on Sun/Sat),
            // today is a grey disc when another day is picked. The date picker sheet only marks the picked day.
            const ring = day === selected || (!picker && !selected && isToday);
            const todayDisc = !picker && isToday && !ring;
            const label = String(parseDay(day).d);
            const wd = weekday(day);
            const numberColor = ring && wd !== 0 && wd !== 6 ? "onSelected" : dayColor(wd);
            return (
              <Pressable key={j} style={{ flex: 1, alignItems: "center", gap: 4 }} onPress={() => onSelect?.(day)} accessibilityRole="button" accessibilityLabel={`${parseDay(day).m}월 ${label}일`} accessibilityState={{ selected: day === selected }}>
                {!picker && state ? <Clover state={state(day)} /> : null}
                <View style={{ width: picker ? 34 : ringSize, height: picker ? 34 : ringSize, borderRadius: (picker ? 34 : ringSize) / 2, alignItems: "center", justifyContent: "center", backgroundColor: ring ? c.selectedBg : todayDisc ? c.selectedDay : "transparent", marginTop: picker ? 0 : -5, transform: [{ translateY: (ring || todayDisc) && !picker ? 4 : 0 }] }}>
                  <AppText variant="date" weight={ring ? 700 : 500} color={numberColor}>{label}</AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
