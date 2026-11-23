import { memo, useCallback, useRef, useState } from "react";
import type { ViewInstance as ViewType } from "react-native";
import { Pressable, View } from "react-native";
import { monthGrid, parseDay, weekday, weekdayLabels, type Day } from "../lib/dates";
import { rowSegments, type SpanBar } from "../lib/spans";
import { onColor, tokens, useTheme, type ColorName } from "../theme";
import { AppText } from "./AppText";
import { Clover, type CloverState } from "./Clover";
import { GlowFrame } from "./Highlight";
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from "./icons";
import { PillButton } from "./Pill";
import { DESIGN_TRIAL } from "../lib/variant";

/** 일정 캘린더: up to four events a day, then "+n" (user) */
const LONG_LANES = 4;
/** 할 일 캘린더: one event line every 6 points under the dates */
const LINE_STEP = 6;

function dayColor(wd: number): ColorName {
  return wd === 0 ? "sunday" : wd === 6 ? "saturday" : "text";
}

/** [clover ▼]  2026년 11월  [주] [‹] [›]  (S03) */
export function CalendarHeader({ title, mode, onToggleMode, onPrev, onNext, filterColors, onFilter, onTitle, kind = "basic" }: {
  title: string; mode: "month" | "week"; onToggleMode?: () => void; onPrev: () => void; onNext: () => void; filterColors: string[]; onFilter?: () => void;
  /** 캘린더 종류: the 할 일 캘린더 (clovers) or the 일정 캘린더 (bars) */
  kind?: "basic" | "span";
  /** tapping the big month title goes back to today (original) */
  onTitle?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <PillButton onPress={onFilter} a11y={kind === "span" ? "캘린더 종류: 일정 캘린더" : "캘린더 종류: 할 일 캘린더"} pad={9} gap={8}>
        {kind === "span" ? <CalendarRange size={22} color={c.text} /> : (
          <View style={{ width: 22, height: 22 }}>
            {filterColors.slice(0, 2).map((col, i) => (
              <View key={i} style={{ position: "absolute", left: i * 4, top: i * 4 }}><Clover size={18} state={{ kind: "fill", color: col }} /></View>
            ))}
          </View>
        )}
        <ChevronDown size={15} color={c.text} fill={c.text} />
      </PillButton>
      <Pressable onPress={onTitle} disabled={!onTitle} style={{ flex: 1, marginLeft: 1 }} accessibilityRole="button" accessibilityLabel={`${title}, 오늘로 이동`}>
        <AppText variant="monthTitle" accessibilityRole="header">{title}</AppText>
      </Pressable>
      {onToggleMode ? <PillButton label={mode === "month" ? "주" : "월"} onPress={onToggleMode} a11y={mode === "month" ? "주간 보기" : "월간 보기"} /> : null}
      <PillButton round onPress={onPrev} a11y="이전"><ChevronLeft size={20} color={c.text} /></PillButton>
      <PillButton round onPress={onNext} a11y="다음"><ChevronRight size={20} color={c.text} /></PillButton>
    </View>
  );
}

/**
 * One date. Memoised: picking a day redraws only the old and the new picked cell, not every clover of the three
 * months the calendar strip keeps (that made a tap take two to three times longer than in the original).
 */
const DayCell = memo(function DayCell({ day, ring, todayDisc, picker, clover, ringSize, onPick, dday, hover, cellRef, important, boxed, boxH }: {
  day: Day; ring: boolean; todayDisc: boolean; picker: boolean; clover?: CloverState; cloverKey: string; ringSize: number; onPick: (d: Day) => void;
  /** a D-day falls on this date: a red circle around the number (user's feature) */
  dday?: boolean;
  /** a held to-do is over this date (drop to move it here) */
  hover?: boolean;
  cellRef?: (d: Day, v: ViewType | null) => void;
  /** 중요한 날: the clover glows (user's feature) */
  important?: boolean;
  /** design app's 달력: the whole cell shows the choice (today grey, the picked day white), no circle (user) */
  boxed?: boolean;
  /** boxed: the box's height (a plain row; on the 일정 캘린더 it stops above the first name bar) */
  boxH?: number;
}) {
  const { c } = useTheme();
  const label = String(parseDay(day).d);
  const wd = weekday(day);
  const numberColor = ring && wd !== 0 && wd !== 6 ? "onSelected" : dayColor(wd);
  const inner = (
    <>
      {clover ? <Clover state={clover} glow={important} /> : null}
      <View style={{ width: picker ? 34 : ringSize, height: picker ? 34 : ringSize, borderRadius: picker && DESIGN_TRIAL ? 10 : (picker ? 34 : ringSize) / 2, alignItems: "center", justifyContent: "center", backgroundColor: !boxed && ring ? c.selectedBg : !boxed && todayDisc ? c.selectedDay : "transparent", marginTop: picker ? 0 : -5,
        borderWidth: dday ? 2 : 0, borderColor: c.dday, transform: [{ translateY: (ring || todayDisc || dday) && !picker && !boxed ? 4 : 0 }] }}
        accessibilityLabel={dday ? "디데이" : undefined}>
        <AppText variant="date" weight={ring ? 700 : 500} color={numberColor}>{label}</AppText>
      </View>
    </>
  );
  const a11y = { accessibilityRole: "button" as const, accessibilityLabel: `${parseDay(day).m}월 ${label}일${important ? ", 중요한 날" : ""}`, accessibilityState: { selected: ring } };
  // boxed (main app): the white/grey box keeps the height of a row without event lines and sits at the top of the
  // cell; the lines below it get their own room, so the two never overlap (user, 2026-11-23)
  if (boxed) return (
    <Pressable ref={cellRef ? (v) => cellRef(day, v) : undefined} style={{ flex: 1, marginHorizontal: 2 }} onPress={() => onPick(day)} {...a11y}>
      <View style={{ height: boxH ?? tokens.layout.calendarRowHeight - 2, alignItems: "center", gap: 4, paddingTop: 5 }}>
        {/* the white (picked) or grey (today) box is its own view, made fresh when a day is picked: changing the colour
            of one that was there lost its round corners on the phone (user, 2026-11-23) */}
        {hover || ring || todayDisc ? (
          <View key={hover ? "h" : ring ? "r" : "t"} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: tokens.radius.md, overflow: "hidden",
            backgroundColor: hover ? c.dropTarget : ring ? c.selectedBg : c.todayCell }} />
        ) : null}
        {inner}
      </View>
    </Pressable>
  );
  return (
    <Pressable ref={cellRef ? (v) => cellRef(day, v) : undefined}
      style={{ flex: 1, alignItems: "center", gap: 4, borderRadius: tokens.radius.md,
        backgroundColor: hover ? c.dropTarget : "transparent" }} onPress={() => onPick(day)} {...a11y}>
      {inner}
    </Pressable>
  );
}, (a, b) => a.day === b.day && a.ring === b.ring && a.todayDisc === b.todayDisc && a.picker === b.picker && a.cloverKey === b.cloverKey && a.ringSize === b.ringSize && a.onPick === b.onPick && a.dday === b.dday && a.hover === b.hover && a.cellRef === b.cellRef && a.important === b.important && a.boxed === b.boxed && a.boxH === b.boxH);

/**
 * Month or week grid. `state` gives each day's clover; pass `picker` for the plain date picker (S21b).
 * `rows` lets the week view pass just one row.
 */
export function Calendar({ year, month, today, selected, onSelect, state, picker, weekStartsSunday = true, rows, width, ddayOn, dropHover, cellRef, spans, kind = "basic", importantOn, boxed }: {
  year: number; month: number; today: Day; selected?: Day; onSelect?: (d: Day) => void; state?: (d: Day) => CloverState; picker?: boolean; weekStartsSunday?: boolean; rows?: (Day | null)[][];
  /** known width (calendar pager): the dates are placed right away instead of after measuring */
  width?: number;
  /** dates that are a D-day get a red circle */
  ddayOn?: (d: Day) => boolean;
  /** the date a held to-do is over (home: drag a to-do onto a date, user's feature) */
  dropHover?: Day | null;
  /** each date's view, so home can find which date is under the finger (keep it the same function between renders) */
  cellRef?: (d: Day, v: ViewType | null) => void;
  /** 일정: thin lines under the dates (할 일 캘린더), or labelled bars on the 일정 캘린더 (kind "span") */
  spans?: SpanBar[];
  kind?: "basic" | "span";
  /** 중요한 날: an important to-do or event on the date (the 할 일 캘린더's clover glows; on the 일정 캘린더 the bar does) */
  importantOn?: (d: Day) => boolean;
  /** the picked day and today shown as a filled cell, not a circle (design app's 달력) */
  boxed?: boolean;
}) {
  const { c } = useTheme();
  const long = kind === "span" && !picker;
  const grid = rows ?? monthGrid(year, month, weekStartsSunday);
  const labels = weekdayLabels(weekStartsSunday);
  // The original spreads the days edge to edge: the first clover touches the left margin, the last the right one.
  // Cells stay equal (bigger tap targets), so they reach past the margins by this much on each side.
  const [measured, setW] = useState(0);
  const w = width ?? measured;
  const k = tokens.size.cloverCalendar;
  const bleed = picker || !w ? 0 : Math.max(0, ((w - k) / 6 - k) / 2);
  const ringSize = tokens.size.todayRing;
  // one stable tap handler for every cell, so a cell only redraws when its own look changes
  const latest = useRef(onSelect);
  latest.current = onSelect;
  const pick = useCallback((d: Day) => latest.current?.(d), []);
  return (
    <View onLayout={width ? undefined : (e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: "row", marginBottom: picker ? 10 : 5, marginHorizontal: -bleed }}>
        {labels.map((l) => (
          <AppText key={l} variant="weekday" center color={l === "일" ? "sunday" : l === "토" ? "saturday" : "text"} style={{ flex: 1 }}>{l}</AppText>
        ))}
      </View>
      {grid.map((row, i) => {
        const bars = !picker && spans?.length ? rowSegments(row, spans, long ? LONG_LANES : 2, !long) : null;
        // 할 일 캘린더: a row with event lines grows by their height, so the lines sit under the date circles
        // instead of over them (user)
        const lineRoom = !long && bars?.segments.length ? 3 + (Math.max(...bars.segments.map((x) => x.lane)) + 1) * LINE_STEP : 0;
        return (
        <View key={i} style={{ flexDirection: "row", height: picker ? 52 : long ? tokens.layout.spanRowHeight : tokens.layout.calendarRowHeight + lineRoom, marginHorizontal: -bleed }}>
          {row.map((day, j) => {
            // an empty slot takes the same side margin as a boxed day, so a short first or last week keeps the grid
            // (user, 2026-11-23: the last week's days were wider and off line)
            if (!day) return <View key={j} style={{ flex: 1, marginHorizontal: boxed && !picker ? 2 : 0 }} />;
            const isToday = day === today;
            // As in the original: the picked day is a white disc (black number, red/blue kept on Sun/Sat),
            // today is a grey disc when another day is picked. The date picker sheet only marks the picked day.
            const ring = day === selected || (!picker && !selected && isToday);
            const todayDisc = !picker && isToday && !ring;
            const cs = !picker && !long && state ? state(day) : undefined;
            return (
              <DayCell key={j} day={day} ring={ring} todayDisc={todayDisc} picker={!!picker} clover={cs} cloverKey={cs ? JSON.stringify(cs) : ""}
                ringSize={ringSize} onPick={pick} dday={!picker && !!ddayOn?.(day)} hover={day === dropHover} cellRef={cellRef} important={!picker && !long && !!importantOn?.(day)} boxed={boxed && !picker} boxH={long ? 32 : tokens.layout.calendarRowHeight - 2} />
            );
          })}
          {bars ? (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
              {bars.segments.map((b) => {
                const fill = b.done ? c.spanDone : b.color;
                const pos = { position: "absolute" as const, left: `${(b.from / 7) * 100}%` as const, width: `${((b.to - b.from + 1) / 7) * 100}%` as const };
                const ends = { marginLeft: b.opensLeft ? 0 : 4, marginRight: b.opensRight ? 0 : 4 };
                const round = { borderTopLeftRadius: b.opensLeft ? 0 : 4, borderBottomLeftRadius: b.opensLeft ? 0 : 4, borderTopRightRadius: b.opensRight ? 0 : 4, borderBottomRightRadius: b.opensRight ? 0 : 4 };
                return long ? (
                  <View key={b.id} style={{ ...pos, top: 34 + b.lane * 17, height: 15 }} accessibilityLabel={`${b.title}${b.done ? ", 완료" : ""}${b.important ? ", 강조" : ""}`}>
                    {b.important ? (
                      // 강조: a glowing frame around the bar (and, in the design trial, embers)
                      <GlowFrame radius={4} inset={6} left={b.opensLeft ? 0 : 4} right={b.opensRight ? 0 : 4} embers={{ count: 4 * (b.to - b.from + 1), rise: 20, size: 3.5 }} />
                    ) : null}
                    <View style={{ flex: 1, ...ends, ...round, backgroundColor: fill, justifyContent: "center", paddingHorizontal: 4 }}>
                      {!b.opensLeft || b.from === row.findIndex(Boolean) ? (
                        <AppText variant="spanLabel" raw={onColor(fill)} numberOfLines={1}>{b.title}</AppText>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <View key={b.id} style={{ ...pos, bottom: 2 + b.lane * LINE_STEP, height: 3 }} accessibilityLabel={b.important ? `${b.title}, 강조` : undefined}>
                    {b.important ? (
                      // 강조 on the 할 일 캘린더: the line itself glows (not the day's clover, user)
                      <GlowFrame radius={2} inset={4.5} left={b.opensLeft ? 0 : 4} right={b.opensRight ? 0 : 4} embers={{ count: 3 * (b.to - b.from + 1), rise: 14, size: 3 }} />
                    ) : null}
                    <View style={{ flex: 1, ...ends, ...round, backgroundColor: fill }} />
                  </View>
                );
              })}
              {long ? bars.more.map((n, col) => (n ? (
                <AppText key={col} variant="spanLabel" color="textMuted" center style={{ position: "absolute", top: 34 + LONG_LANES * 17, left: `${(col / 7) * 100}%`, width: `${100 / 7}%` }}>{`+${n}`}</AppText>
              ) : null)) : null}
            </View>
          ) : null}
        </View>
        );
      })}
    </View>
  );
}
