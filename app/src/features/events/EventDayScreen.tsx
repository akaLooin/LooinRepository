import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, FlatList, PanResponder, Platform, Pressable, ScrollView, View, type FlatListInstance, type ScrollViewInstance } from "react-native";
import { AppText, ChevronLeft, ChevronRight, Pencil, PillButton, Plus, Sparkles, Trash2, useGlowColor, GlowFrame, useToast } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { deleteEvent, saveEvent, toggleEventImportant, useDB } from "../../data/store";
import { addDays, daysBetween, today, type Day } from "../../lib/dates";
import { clock, dayBlocks, DAY_MINUTES, eventsOn, eventTimeLabel, fromMinutes, inBand, slotAt, toMinutes, type Block, type CalEvent } from "../../lib/events";
import { moveBlock, moveSpanBlock, resizeBlock, shiftEvent } from "../../lib/eventDrag";
import { goBack } from "../../lib/nav";
import { onColor, tokens, useDesignScale, useInsets, useTheme } from "../../theme";
import { dayLabel, EventDetail, EventEditor, newDraft, type EventDraft } from "./EventSheets";

const LABEL_W = tokens.layout.hourLabelWidth;
const H_MIN = 28, H_MAX = 200; // how far two fingers can squeeze or spread an hour
const LONG_PRESS = 400;
const SPAN = 365; // days reachable by swiping, either way from the day opened
const DAY_INDEXES = Array.from({ length: SPAN * 2 + 1 }, (_, i) => i);
const isDay = (s: unknown): s is Day => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const minutesNow = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

type Drag = { id: string; top: number; bottom: number } | null;

/**
 * 일정 캘린더, one day as an hour grid (user's feature, after the user's screen recording; changes 11-19/20):
 * - one day at a time; swiping left or right goes to the next or previous day (user, 2026-11-20: replaces the
 *   up-and-down run into the next day, so an event over midnight can fill the hours it takes)
 * - 종일 events sit in the line above the hours; timed ones, also those running past midnight, are blocks
 * - tapping an empty half hour adds a one-hour event there; two fingers spread or squeeze the hours
 * - tapping an event selects it: round handles stretch it, small 수정 / 강조 / 삭제 buttons sit next to it; holding it
 *   moves it up or down (one-day events)
 */
export function EventDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const scale = useDesignScale();
  const events = useDB((d) => d.events);
  const [day, setDay] = useState<Day>(isDay(date) ? date : today());
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [locked, setLocked] = useState(false); // no scrolling or swiping while an event is moved or stretched
  const [toast, notice] = useToast();
  // two fingers spread or squeeze the hours (user); kept on this phone
  const [H, setH] = useState(() => Math.min(H_MAX, Math.max(H_MIN, prefs.timelineHourHeight || tokens.layout.hourHeight)));
  const px = (min: number) => (min / 60) * H;
  const viewH = useRef(600);
  const scroll = useRef<ScrollViewInstance>(null);
  const y = useRef(0);
  const pinch = useRef<{ d0: number; h0: number } | null>(null);
  const zoomTo = (nh: number) => {
    nh = Math.round(Math.min(H_MAX, Math.max(H_MIN, nh)));
    if (nh === H) return;
    // keep the time in the middle of the screen where it is
    const minutes = ((y.current + viewH.current / 2) / H) * 60;
    setH(nh);
    y.current = Math.max(0, (minutes / 60) * nh - viewH.current / 2);
    requestAnimationFrame(() => scroll.current?.scrollTo({ y: y.current, animated: false }));
  };
  const touches = {
    onTouchStart: (e: { nativeEvent: { touches: readonly { pageX: number; pageY: number }[] } }) => {
      const t = e.nativeEvent.touches;
      if (t.length === 2) { pinch.current = { d0: Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY), h0: H }; setLocked(true); }
    },
    onTouchMove: (e: { nativeEvent: { touches: readonly { pageX: number; pageY: number }[] } }) => {
      const t = e.nativeEvent.touches;
      if (t.length < 2) return;
      const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
      if (!pinch.current) { pinch.current = { d0: d, h0: H }; setLocked(true); return; }
      if (pinch.current.d0 > 0) zoomTo(pinch.current.h0 * (d / pinch.current.d0));
    },
    onTouchEnd: (e: { nativeEvent: { touches: readonly unknown[] } }) => {
      if (!pinch.current || e.nativeEvent.touches.length >= 2) return;
      pinch.current = null;
      setLocked(false);
      setPref("timelineHourHeight", H);
    },
  };

  // swiping left or right: a native paging list of days (a year either way), so the phone's own scrolling decides
  // between a swipe and an up/down scroll and the next day is already drawn under the finger. Nothing is moved
  // around when a swipe ends (the three re-centred pages made the events flicker, user 2026-11-21).
  const base = useRef(day).current;
  const dayAt = (i: number) => addDays(base, i - SPAN);
  const indexOf = (d: Day) => daysBetween(base, d) + SPAN;
  const list = useRef<FlatListInstance>(null);
  const [pageW, setPageW] = useState(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageScrolls = useRef(new Map<Day, ScrollViewInstance>()).current;
  const offsets = useRef(new Map<Day, { x: number; y: number }>()).current;
  const startOffset = (d: Day) => {
    let o = offsets.get(d);
    if (!o) { o = { x: 0, y: y.current }; offsets.set(d, o); }
    return o;
  };
  const settle = (x: number) => {
    if (!pageW) return;
    const d = dayAt(Math.round(x / pageW));
    setDay((cur) => (cur === d ? cur : d));
  };
  const goDay = (dir: 1 | -1) => {
    const next = addDays(day, dir);
    setSelected(null);
    syncNeighbours();
    list.current?.scrollToIndex({ index: indexOf(next), animated: true });
    setDay(next);
  };
  const goToday = () => {
    setSelected(null);
    list.current?.scrollToIndex({ index: indexOf(today()), animated: false });
    setDay(today());
  };
  // the days beside show the same hours as the one in view when they slide in
  const syncNeighbours = () => {
    for (const d of [addDays(day, -1), addDays(day, 1)]) pageScrolls.get(d)?.scrollTo({ y: y.current, animated: false });
  };

  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(h); }, []);
  const lastColor = events[events.length - 1]?.color ?? c.accent;

  // first view: the morning, the first event, or an hour before now (today); other days keep the same hour in view
  useEffect(() => {
    const first = dayBlocks(events, day)[0]?.top;
    const at = day === today() ? minutesNow() - 60 : first !== undefined ? Math.min(first - 30, 8 * 60) : 8 * 60;
    const t = setTimeout(() => { y.current = Math.max(0, px(at)); scroll.current?.scrollTo({ y: y.current, animated: false }); }, 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the phone's back button lets go of a selected event before leaving the screen
  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => { if (selected && !draft && !open) { setSelected(null); return true; } return false; });
    return () => h.remove();
  }, [selected, draft, open]);

  const addAt = (d: Day, minutes: number) => {
    if (selected) { setSelected(null); return; } // a tap beside a selected event lets go of it
    const s = slotAt(minutes);
    setDraft(newDraft(d, s.startTime, s.endTime, lastColor));
  };
  const hourLabel = (h: number) => (prefs.use24h ? `${String(h).padStart(2, "0")}:00` : `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시`);
  const commit = (b: Block, top: number, bottom: number, day: Day, moved?: number) => {
    setDrag(null);
    setLocked(false);
    if (top === b.top && bottom === b.bottom && !moved) return;
    const e = b.e;
    // an event over midnight held and moved: the whole event moves (across midnight if need be)
    if (moved !== undefined && e.startDate !== e.endDate) {
      if (!moved) return;
      const shifted = shiftEvent(e, moved);
      saveEvent(shifted);
      notice(`${eventTimeLabel(shifted, prefs.use24h, Number(day.slice(0, 4)))}로 옮겼어요`);
      return;
    }
    // an event over midnight: only the edge that is really on this day changes (its start on the first day, its end
    // on the last); the day boundaries stay
    const next = e.startDate === e.endDate
      ? { ...e, startTime: fromMinutes(top), endTime: fromMinutes(bottom) }
      : { ...e, ...(e.startDate === day ? { startTime: fromMinutes(top) } : {}), ...(e.endDate === day ? { endTime: fromMinutes(bottom) } : {}) };
    saveEvent(next);
    notice(`${eventTimeLabel(next, prefs.use24h, Number(day.slice(0, 4)))}로 바꿨어요`);
  };

  const isToday = day === today();
  // what the pages draw from (the list redraws its pages when this changes)
  const pageState = { events, draft, selected, drag, H, locked, day, use24h: prefs.use24h };

  // one day's page: its 종일 line and its hours (the middle one is the day in view)
  const page = (d: Day) => {
    const band = eventsOn(events, d).filter(inBand);
    const blocks = dayBlocks(events, d);
    const middle = d === day;
    const pending = draft && !draft.id && !draft.allDay && draft.startDate === d && draft.startTime && draft.endTime ? draft : null;
    return (
      // the side pages are there to slide in; screen readers only get the day in view
      <View key={d} style={{ width: pageW, flex: 1 }} importantForAccessibility={middle ? "auto" : "no-hide-descendants"} accessibilityElementsHidden={!middle} aria-hidden={!middle}>
        {band.length ? (
          // 종일: chips above the hours (room around them for the glow and sparks of a highlighted one)
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingLeft: LABEL_W, paddingRight: tokens.layout.gutter, paddingTop: 14, paddingBottom: 10,
            borderBottomWidth: 1, borderBottomColor: c.divider }} accessibilityLabel={`${dayLabel(d)} 종일 일정`}>
            {band.map((e) => (
              <Pressable key={e.id} onPress={() => setOpen(e.id)} accessibilityRole="button" accessibilityLabel={`${e.title}, ${eventTimeLabel(e, prefs.use24h, 0)}${e.important ? ", 강조" : ""}`}
                style={{ backgroundColor: e.color, borderRadius: tokens.radius.sm, paddingHorizontal: 10, paddingVertical: 5 }}>
                {e.important ? <GlowFrame radius={tokens.radius.sm} inset={6} embers={{ count: 7, rise: 20, size: 3.5 }} /> : null}
                <AppText variant="small" weight={600} raw={onColor(e.color)} numberOfLines={1}>{e.title}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
        <ScrollView ref={(v) => { if (v) pageScrolls.set(d, v); else pageScrolls.delete(d); if (middle) (scroll as { current: ScrollViewInstance | null }).current = v; }}
          scrollEnabled={!locked} scrollEventThrottle={16} nestedScrollEnabled
          // a touch right after a scroll goes to the event or hour under it, not to stopping the scroll (user)
          disableScrollViewPanResponder
          // a side page opens at the hour the middle one shows. The same object every time: a new one made the page
          // jump back on every redraw (flicker while swiping, and a held event let go in a browser)
          contentOffset={startOffset(d)}
          onScroll={middle ? (e) => { y.current = e.nativeEvent.contentOffset.y; } : undefined}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 40 }}>
          <View style={{ height: 24 * H }}>
            {Array.from({ length: 24 }, (_, h) => (
              <View key={h} pointerEvents="none" style={{ position: "absolute", top: h * H, left: 0, right: 0, flexDirection: "row", alignItems: "flex-start" }}>
                <AppText variant="small" color="textMuted" style={{ width: LABEL_W - 8, textAlign: "right", marginTop: -8 }}>{h ? hourLabel(h) : ""}</AppText>
                <View style={{ flex: 1, height: 1, backgroundColor: c.hourLine, marginLeft: 8, marginRight: tokens.layout.gutter }} />
              </View>
            ))}
            {Array.from({ length: 48 }, (_, i) => (
              <Pressable key={i} onPress={() => addAt(d, i * 30)} accessibilityRole="button" accessibilityLabel={`${dayLabel(d)} ${fromMinutes(i * 30)}에 일정 추가`}
                style={{ position: "absolute", top: (i * H) / 2, height: H / 2, left: LABEL_W, right: tokens.layout.gutter }} />
            ))}
            <View pointerEvents="box-none" style={{ position: "absolute", top: 0, bottom: 0, left: LABEL_W + 2, right: tokens.layout.gutter }}>
              {pending ? (
                <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: px(toMinutes(pending.startTime!)), height: px(toMinutes(pending.endTime!) - toMinutes(pending.startTime!)),
                  borderWidth: 2, borderColor: pending.color, borderRadius: tokens.radius.sm }} accessibilityLabel="새 일정 자리" />
              ) : null}
              {middle && drag ? (
                // while stretching or moving: the times at its edges, in the hour column on the left (user)
                ([["시작", drag.top], ["끝", drag.bottom]] as const).filter(([, m]) => m > 0 && m < DAY_MINUTES).map(([edge, m]) => (
                  <View key={edge} pointerEvents="none" style={{ position: "absolute", top: px(m) - 10, left: -LABEL_W, width: LABEL_W - 4, height: 20, borderRadius: 10,
                    backgroundColor: c.text, alignItems: "center", justifyContent: "center", zIndex: 6 }} accessibilityLabel={`${edge} ${fromMinutes(m)}`}>
                    <AppText variant="small" weight={700} raw={c.bg}>{clock(fromMinutes(m), prefs.use24h)}</AppText>
                  </View>
                ))
              ) : null}
              {middle && drag ? [drag.top, drag.bottom].filter((m) => m > 0 && m < DAY_MINUTES).map((m, i) => (
                <View key={`g${i}`} pointerEvents="none" style={{ position: "absolute", top: px(m), left: -4, right: 0, height: 1, backgroundColor: c.textMuted, opacity: 0.6 }} />
              )) : null}
              {d === today() ? (
                <View pointerEvents="none" style={{ position: "absolute", top: px(minutesNow()) - 4, left: -6, right: 0, flexDirection: "row", alignItems: "center" }} accessibilityLabel="지금">
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.nowLine }} />
                  <View style={{ flex: 1, height: 2, backgroundColor: c.nowLine }} />
                </View>
              ) : null}
              {blocks.map((b) => (
                <EventBlock key={b.e.id} b={b} day={d} hour={H} drag={middle && drag?.id === b.e.id ? drag : null} selected={middle && selected === b.e.id} scale={scale} use24h={prefs.use24h}
                  onTap={() => setSelected((x) => (x === b.e.id ? null : b.e.id))}
                  onHold={() => { setSelected(b.e.id); setLocked(true); }}
                  onDrag={(top, bottom) => { setLocked(true); setDrag({ id: b.e.id, top, bottom }); }}
                  onDrop={(top, bottom, moved) => commit(b, top, bottom, d, moved)}
                  onCancel={() => { setDrag(null); setLocked(false); }}
                  onEdit={() => { setSelected(null); setDraft({ ...b.e }); }}
                  onImportant={() => notice(toggleEventImportant(b.e.id) ? "중요한 일정으로 강조했어요" : "강조를 풀었어요")}
                  onDelete={() => { setSelected(null); deleteEvent(b.e.id); notice("일정을 지웠어요"); }} />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: tokens.layout.gutter - 6, paddingRight: tokens.layout.gutter, height: tokens.layout.headerHeight }}>
        <Pressable onPress={() => goBack("/")} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로 가기" style={{ padding: 4 }}>
          <ChevronLeft size={28} color={c.text} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={goToday} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${dayLabel(day)}, 오늘로 이동`}>
          <AppText variant="sheetTitle" accessibilityRole="header">{dayLabel(day)}</AppText>
        </Pressable>
        <PillButton round onPress={() => goDay(-1)} a11y="전날"><ChevronLeft size={20} color={c.text} /></PillButton>
        <PillButton round onPress={() => goDay(1)} a11y="다음 날"><ChevronRight size={20} color={c.text} /></PillButton>
      </View>

      {/* pan-y: in a browser, two fingers zoom the hours here instead of the whole page */}
      {/* (browser) no text selection: dragging selected text starts the browser's own drag and lets go of the event */}
      <View style={{ flex: 1, touchAction: "pan-x pan-y", userSelect: "none" } as never} {...touches} onTouchCancel={touches.onTouchEnd}
        onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; const w = Math.round(e.nativeEvent.layout.width); if (w !== pageW) setPageW(w); }}>
        {pageW ? (
          <FlatList ref={list} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={!locked} disableScrollViewPanResponder
            data={DAY_INDEXES} keyExtractor={(i) => String(i)} renderItem={({ item }) => page(dayAt(item))}
            extraData={pageState} initialScrollIndex={indexOf(day)} getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
            windowSize={3} initialNumToRender={1} maxToRenderPerBatch={2} directionalLockEnabled scrollEventThrottle={16}
            onScrollBeginDrag={() => { setSelected(null); syncNeighbours(); }}
            onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
            onScroll={(e) => {
              if (Platform.OS !== "web") return; // the phone settles on momentum end, never while the finger holds
              if (settleTimer.current) clearTimeout(settleTimer.current);
              const x = e.nativeEvent.contentOffset.x;
              settleTimer.current = setTimeout(() => settle(x), 180); // the web has no momentum events
            }} />
        ) : null}
      </View>

      <Pressable onPress={() => { setSelected(null); addAt(day, Math.min(isToday ? Math.ceil(minutesNow() / 60) * 60 : 9 * 60, DAY_MINUTES - 60)); }} accessibilityRole="button" accessibilityLabel="일정 추가"
        style={{ position: "absolute", right: tokens.layout.gutter, bottom: insets.bottom + 24, width: 56, height: 56, borderRadius: 18, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
        <Plus size={28} color={onColor(c.accent)} strokeWidth={2.4} />
      </Pressable>

      <EventEditor draft={draft} onClose={() => setDraft(null)} onSaved={(m) => { setDraft(null); notice(m); }} />
      <EventDetail id={open} onClose={() => setOpen(null)} notice={notice} onEdit={(e) => { setOpen(null); setDraft({ ...e }); }} />
      {toast}
    </View>
  );
}

/**
 * One timed event in the grid. A tap selects it; holding it (0.4 s) lifts it to move up or down; when selected, the
 * round handles in the middle of its top and bottom edges stretch it (5-minute steps); a held event moves by
 * quarter hours (an event over midnight moves whole, dates included).
 */
function EventBlock({ b, day, hour: H, drag, selected, scale, use24h, onTap, onHold, onDrag, onDrop, onCancel, onEdit, onImportant, onDelete }: {
  b: Block; day: Day; hour: number; drag: Drag; selected: boolean; scale: number; use24h: boolean;
  onTap: () => void; onHold: () => void; onDrag: (top: number, bottom: number) => void; onDrop: (top: number, bottom: number, moved?: number) => void; onCancel: () => void;
  onEdit: () => void; onImportant: () => void; onDelete: () => void;
}) {
  const { c } = useTheme();
  const glow = useGlowColor();
  const top = drag?.top ?? b.top, bottom = drag?.bottom ?? b.bottom;
  // an event over midnight shows only its part of this day: its real start (first day) and end (last day) can be
  // stretched with the handles; it is not moved by holding
  const partial = b.e.startDate !== b.e.endDate;
  const canTop = !partial || b.e.startDate === day, canBottom = !partial || b.e.endDate === day;
  const start = partial ? b.top : toMinutes(b.e.startTime ?? "00:00"), end = partial ? b.bottom : toMinutes(b.e.endTime ?? "00:00");
  // the latest values for the gesture handlers, which are made once
  const live = useRef({ b, start, end, scale, H, onTap, onHold, onDrag, onDrop, onCancel, selected, partial });
  live.current = { b, start, end, scale, H, onTap, onHold, onDrag, onDrop, onCancel, selected, partial };
  const minutesOf = (dy: number) => ((dy / live.current.scale) / live.current.H) * 60;
  const px = (min: number) => (min / 60) * H;

  const body = useRef((() => {
    let held = false, moved = false, last: { top: number; bottom: number; delta?: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => { if (timer) clearTimeout(timer); timer = null; };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => false,
      onPanResponderTerminationRequest: () => !held,
      onPanResponderGrant: () => {
        held = false; moved = false; last = null;
        timer = setTimeout(() => { held = true; live.current.onHold(); }, LONG_PRESS);
      },
      onPanResponderMove: (_, g) => {
        if (!held) { if (Math.abs(g.dy) > 8 || Math.abs(g.dx) > 8) { moved = true; clear(); } return; }
        const { start, end } = live.current;
        // an event over midnight: its part of this day slides, and the whole event moves on letting go
        last = live.current.partial ? moveSpanBlock(start, end, minutesOf(g.dy)) : moveBlock(start, end, minutesOf(g.dy));
        live.current.onDrag(last.top, last.bottom);
      },
      onPanResponderRelease: () => {
        clear();
        if (held) { const { start, end } = live.current; live.current.onDrop(last?.top ?? start, last?.bottom ?? end, live.current.partial ? last?.delta ?? 0 : undefined); }
        else if (!moved) live.current.onTap();
        held = false; last = null;
      },
      onPanResponderTerminate: () => { clear(); if (held) live.current.onCancel(); held = false; last = null; },
    });
  })()).current;
  const handle = (edge: "top" | "bottom") => {
    let last: { top: number; bottom: number } | null = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { last = null; live.current.onDrag(live.current.start, live.current.end); },
      onPanResponderMove: (_, g) => {
        const { start, end } = live.current;
        last = resizeBlock(start, end, edge, minutesOf(g.dy));
        live.current.onDrag(last.top, last.bottom);
      },
      onPanResponderRelease: () => { const { start, end } = live.current; live.current.onDrop(last?.top ?? start, last?.bottom ?? end); },
      onPanResponderTerminate: () => live.current.onCancel(),
    });
  };
  const topHandle = useRef(handle("top")).current;
  const bottomHandle = useRef(handle("bottom")).current;

  const height = Math.max(18, px(bottom - top) - 2);
  // over midnight: only the edge on this day follows a drag; the other stays the event's own time
  const shownTimes = { startTime: canTop ? fromMinutes(top) : b.e.startTime, endTime: canBottom ? fromMinutes(bottom) : b.e.endTime };
  const label = `${b.e.title}, ${eventTimeLabel({ ...b.e, ...shownTimes }, use24h, 0)}`;
  const KNOB = 16;
  const actionsBelow = top < 60; // near midnight there is no room above
  return (
    <View style={{ position: "absolute", top: px(top) + 1, height, left: `${(b.col / b.cols) * 100}%`, width: `${100 / b.cols}%`, // same size when selected (user)
      paddingRight: 2, zIndex: selected || drag ? 5 : 1 }}>
      {b.e.important ? (
        // 강조: the glowing frame (and, in the design trial, embers)
        <GlowFrame radius={tokens.radius.sm} inset={6} right={2} embers={{ count: 10, rise: 30, size: 4.5 }} />
      ) : null}
      <View {...body.panHandlers} accessible accessibilityRole="button" accessibilityLabel={b.e.important ? `${label}, 강조` : label} accessibilityState={{ selected }}
        accessibilityHint={selected ? "다시 누르면 선택 해제, 길게 눌러 옮기기" : "눌러서 선택, 길게 눌러 옮기기"}
        style={{ flex: 1, borderRadius: tokens.radius.sm, backgroundColor: b.e.color, paddingHorizontal: 6, paddingVertical: 3, overflow: "hidden",
          borderWidth: selected ? 2 : 0, borderColor: c.text, opacity: drag ? 0.85 : 1 }}>
        <AppText variant="small" weight={700} raw={onColor(b.e.color)} numberOfLines={1}>{b.e.title}</AppText>
        {bottom - top >= 50 || drag ? <AppText variant="spanLabel" raw={onColor(b.e.color)} numberOfLines={2}>
          {partial ? eventTimeLabel(b.e, use24h, 0) : `${clock(fromMinutes(top), use24h)}~${clock(fromMinutes(bottom), use24h)}`}</AppText> : null}
      </View>
      {selected ? (
        <>
          {canTop ? (
          <View {...topHandle.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="시작 시간 끌어서 바꾸기"
            style={{ position: "absolute", top: -KNOB / 2 - 6, left: "50%", marginLeft: -(KNOB + 12) / 2, width: KNOB + 12, height: KNOB + 12, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: c.bg, borderWidth: 3, borderColor: b.e.color }} />
          </View>
          ) : null}
          {canBottom ? (
          <View {...bottomHandle.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="끝나는 시간 끌어서 바꾸기"
            style={{ position: "absolute", bottom: -KNOB / 2 - 6, left: "50%", marginLeft: -(KNOB + 12) / 2, width: KNOB + 12, height: KNOB + 12, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: c.bg, borderWidth: 3, borderColor: b.e.color }} />
          </View>
          ) : null}
          {drag ? null : (
            // the buttons hang from the block towards the middle of the screen, so a narrow block's do not run off it
            <View style={{ position: "absolute", flexDirection: "row", gap: 6, ...(b.col + 0.5 < b.cols / 2 ? { left: 0 } : { right: 2 }), ...(actionsBelow ? { top: height + 10 } : { top: -38 }) }}>
              <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="일정 수정"
                style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: c.surfaceRaised }}>
                <Pencil size={14} color={c.menuEdit} /><AppText variant="small" weight={600}>수정</AppText>
              </Pressable>
              <Pressable onPress={onImportant} accessibilityRole="button" accessibilityLabel={b.e.important ? "강조 해제" : "일정 강조"}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: c.surfaceRaised,
                  borderWidth: b.e.important ? 1 : 0, borderColor: glow }}>
                <Sparkles size={14} color={glow} /><AppText variant="small" weight={600}>{b.e.important ? "강조 해제" : "강조"}</AppText>
              </Pressable>
              <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="일정 삭제"
                style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: c.surfaceRaised }}>
                <Trash2 size={14} color={c.menuDelete} /><AppText variant="small" weight={600}>삭제</AppText>
              </Pressable>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}
