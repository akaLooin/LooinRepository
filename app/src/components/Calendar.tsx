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
export function CalendarHeader({ title, mode, onToggleMode, onPrev, onNext, filterColors, onFilter }: {
  title: string; mode: "month" | "week"; onToggleMode: () => void; onPrev: () => void; onNext: () => void; filterColors: string[]; onFilter?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <PillButton onPress={onFilter} a11y="표시할 카테고리">
        <View style={{ width: 26, height: 22 }}>
          {filterColors.slice(0, 2).map((col, i) => (
            <View key={i} style={{ position: "absolute", left: i * 8, top: 0 }}><Clover size={18} state={{ kind: "fill", color: col }} /></View>
          ))}
        </View>
        <ChevronDown size={18} color={c.text} fill={c.text} />
      </PillButton>
      <AppText variant="monthTitle" style={{ flex: 1, marginLeft: 6 }} accessibilityRole="header">{title}</AppText>
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
export function Calendar({ year, month, today, selected, onSelect, state, picker, weekStartsSunday = true, rows }: {
  year: number; month: number; today: Day; selected?: Day; onSelect?: (d: Day) => void; state?: (d: Day) => CloverState; picker?: boolean; weekStartsSunday?: boolean; rows?: (Day | null)[][];
}) {
  const { c } = useTheme();
  const grid = rows ?? monthGrid(year, month, weekStartsSunday);
  const labels = weekdayLabels(weekStartsSunday);
  return (
    <View>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        {labels.map((l) => (
          <AppText key={l} variant="weekday" center color={l === "일" ? "sunday" : l === "토" ? "saturday" : "text"} style={{ flex: 1 }}>{l}</AppText>
        ))}
      </View>
      {grid.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", height: picker ? 52 : tokens.layout.calendarRowHeight }}>
          {row.map((day, j) => {
            if (!day) return <View key={j} style={{ flex: 1 }} />;
            const isToday = day === today;
            const isSel = picker ? day === selected : false;
            const ring = isToday && !picker ? true : isSel;
            const label = String(parseDay(day).d);
            return (
              <Pressable key={j} style={{ flex: 1, alignItems: "center", gap: 4 }} onPress={() => onSelect?.(day)} accessibilityRole="button" accessibilityLabel={`${month}월 ${label}일`}>
                {!picker && state ? <Clover state={state(day)} /> : null}
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: ring ? c.selectedBg : "transparent", marginTop: picker ? 0 : -6 }}>
                  <AppText variant="date" weight={ring ? 700 : 500} color={ring ? "onSelected" : dayColor(weekday(day))}>{label}</AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
