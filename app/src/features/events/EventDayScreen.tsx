import { useLocalSearchParams } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BackHandler, PanResponder, Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import { AppText, ChevronLeft, ChevronRight, Pencil, PillButton, Plus, Trash2, useToast } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { deleteEvent, saveEvent, useDB } from "../../data/store";
import { addDays, today, type Day } from "../../lib/dates";
import { clock, dayBlocks, DAY_MINUTES, eventsOn, eventTimeLabel, fromMinutes, inBand, slotAt, toMinutes, type Block, type CalEvent } from "../../lib/events";
import { moveBlock, resizeBlock } from "../../lib/eventDrag";
import { goBack } from "../../lib/nav";
import { onColor, tokens, useDesignScale, useInsets, useTheme } from "../../theme";
import { dayLabel, EventDetail, EventEditor, newDraft, type EventDraft } from "./EventSheets";

const LABEL_W = tokens.layout.hourLabelWidth;
const HEAD = tokens.layout.dayHeadHeight;
const H_MIN = 28, H_MAX = 200; // how far two fingers can squeeze or spread an hour
const LONG_PRESS = 400;
const isDay = (s: unknown): s is Day => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const minutesNow = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

type Drag = { id: string; top: number; bottom: number } | null;

/**
 * 일정 캘린더, one day as an hour grid (user's feature, after the user's screen recording; 2026-11-19 changes):
 * - scrolling up or down runs on into the day before or after (three days are drawn; when the scroll comes to rest
 *   on a neighbour, it becomes the middle one)
 * - tapping an empty half hour adds a one-hour event there
 * - tapping an event selects it: round handles above and below stretch it, small 수정 / 삭제 buttons sit next to it;
 *   holding it moves it up or down. 종일 events are in each day's top line and open their sheet.
 */
export function EventDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const scale = useDesignScale();
  const events = useDB((d) => d.events);
  const [day, setDay] = useState<Day>(isDay(date) ? date : today());
  const [shown, setShown] = useState<Day>(day); // the day in view (the title)
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [locked, setLocked] = useState(false); // no scrolling while an event is moved or stretched
  const [toast, notice] = useToast();
  // two fingers spread or squeeze the hours (user); kept on this phone
  const [H, setH] = useState(() => Math.min(H_MAX, Math.max(H_MIN, prefs.timelineHourHeight || tokens.layout.hourHeight)));
  const SEC = HEAD + 24 * H; // one day: its date line, then 24 hours
  const px = (min: number) => (min / 60) * H;
  const viewH = useRef(600);
  const pinch = useRef<{ d0: number; h0: number } | null>(null);
  const zoomTo = (nh: number) => {
    nh = Math.round(Math.min(H_MAX, Math.max(H_MIN, nh)));
    if (nh === H) return;
    // keep the time in the middle of the screen where it is
    const mid = y.current + viewH.current / 2;
    const k = Math.max(0, Math.min(2, Math.floor(mid / SEC)));
    const minutes = Math.max(0, ((mid - k * SEC - HEAD) / H) * 60);
    const ny = k * (HEAD + 24 * nh) + HEAD + (minutes / 60) * nh - viewH.current / 2;
    setH(nh);
    y.current = Math.max(0, ny);
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
  const scroll = useRef<ScrollViewInstance>(null);
  const y = useRef(0);
  const shift = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(h); }, []);
  const days = [addDays(day, -1), day, addDays(day, 1)];
  const lastColor = events[events.length - 1]?.color ?? c.accent;

  // first view: the middle day, at the morning, its first event, or an hour before now (today)
  useEffect(() => {
    const first = dayBlocks(events, day)[0]?.top;
    const at = day === today() ? minutesNow() - 60 : first !== undefined ? Math.min(first - 30, 8 * 60) : 8 * 60;
    const t = setTimeout(() => { y.current = SEC + Math.max(0, px(at)); scroll.current?.scrollTo({ y: y.current, animated: false }); }, 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // a neighbour became the middle day: keep the same picture on screen
  useLayoutEffect(() => {
    if (!shift.current) return;
    y.current -= shift.current;
    shift.current = 0;
    scroll.current?.scrollTo({ y: y.current, animated: false });
  }, [day]);

  // the phone's back button lets go of a selected event before leaving the screen
  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => { if (selected && !draft && !open) { setSelected(null); return true; } return false; });
    return () => h.remove();
  }, [selected, draft, open]);

  const onScroll = (ny: number) => {
    y.current = ny;
    const i = Math.max(0, Math.min(2, Math.floor((ny + 120) / SEC)));
    if (days[i] !== shown) setShown(days[i]);
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const k = Math.floor((y.current + 120) / SEC);
      if (k === 0) { shift.current = -SEC; setDay((d) => addDays(d, -1)); }
      if (k >= 2) { shift.current = SEC; setDay((d) => addDays(d, 1)); }
    }, 220);
  };

  const addAt = (d: Day, minutes: number) => {
    if (selected) { setSelected(null); return; } // a tap beside a selected event lets go of it
    const s = slotAt(minutes);
    setDraft(newDraft(d, s.startTime, s.endTime, lastColor));
  };
  const hourLabel = (h: number) => (prefs.use24h ? `${String(h).padStart(2, "0")}:00` : `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시`);
  const commit = (e: CalEvent, top: number, bottom: number) => {
    setDrag(null);
    setLocked(false);
    if (top === toMinutes(e.startTime ?? "00:00") && bottom === toMinutes(e.endTime ?? "00:00")) return;
    saveEvent({ ...e, startTime: fromMinutes(top), endTime: fromMinutes(bottom) });
    notice(`${clock(fromMinutes(top), prefs.use24h)}~${clock(fromMinutes(bottom), prefs.use24h)}로 바꿨어요`);
  };

  const section = (d: Day) => {
    const band = eventsOn(events, d).filter(inBand);
    const blocks = dayBlocks(events, d);
    const isToday = d === today();
    const pending = draft && !draft.id && !draft.allDay && draft.startDate === d && draft.startTime && draft.endTime ? draft : null;
    return (
      <View key={d} style={{ height: SEC }}>
        <View style={{ height: HEAD, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: tokens.layout.gutter, borderTopWidth: 1, borderTopColor: c.divider }}>
          <AppText variant="body" weight={700} color={isToday ? "accent" : "text"} style={{ width: LABEL_W + 40 }}>{dayLabel(d)}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: "center" }} accessibilityLabel={`${dayLabel(d)} 종일 일정`}>
            {band.map((e) => (
              <Pressable key={e.id} onPress={() => setOpen(e.id)} accessibilityRole="button" accessibilityLabel={`${e.title}, ${eventTimeLabel(e, prefs.use24h, 0)}`}
                style={{ backgroundColor: e.color, borderRadius: tokens.radius.sm, paddingHorizontal: 10, paddingVertical: 5 }}>
                <AppText variant="small" weight={600} raw={onColor(e.color)} numberOfLines={1}>{e.title}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
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
            {isToday ? (
              <View pointerEvents="none" style={{ position: "absolute", top: px(minutesNow()) - 4, left: -6, right: 0, flexDirection: "row", alignItems: "center" }} accessibilityLabel="지금">
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.nowLine }} />
                <View style={{ flex: 1, height: 2, backgroundColor: c.nowLine }} />
              </View>
            ) : null}
            {blocks.map((b) => (
              <EventBlock key={b.e.id} b={b} hour={H} drag={drag?.id === b.e.id ? drag : null} selected={selected === b.e.id} scale={scale} use24h={prefs.use24h}
                onTap={() => setSelected((x) => (x === b.e.id ? null : b.e.id))}
                onHold={() => { setSelected(b.e.id); setLocked(true); }}
                onDrag={(top, bottom) => { setLocked(true); setDrag({ id: b.e.id, top, bottom }); }}
                onDrop={(top, bottom) => commit(b.e, top, bottom)}
                onCancel={() => { setDrag(null); setLocked(false); }}
                onEdit={() => { setSelected(null); setDraft({ ...b.e }); }}
                onDelete={() => { setSelected(null); deleteEvent(b.e.id); notice("일정을 지웠어요"); }} />
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: tokens.layout.gutter - 6, paddingRight: tokens.layout.gutter, height: tokens.layout.headerHeight }}>
        <Pressable onPress={() => goBack("/")} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로 가기" style={{ padding: 4 }}>
          <ChevronLeft size={28} color={c.text} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={() => { setSelected(null); setDay(today()); setShown(today()); }} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${dayLabel(shown)}, 오늘로 이동`}>
          <AppText variant="sheetTitle" accessibilityRole="header">{dayLabel(shown)}</AppText>
        </Pressable>
        <PillButton round onPress={() => { setSelected(null); setDay(addDays(shown, -1)); setShown(addDays(shown, -1)); }} a11y="전날"><ChevronLeft size={20} color={c.text} /></PillButton>
        <PillButton round onPress={() => { setSelected(null); setDay(addDays(shown, 1)); setShown(addDays(shown, 1)); }} a11y="다음 날"><ChevronRight size={20} color={c.text} /></PillButton>
      </View>

      {/* pan-y: in a browser, two fingers zoom the hours here instead of the whole page */}
      <View style={{ flex: 1, touchAction: "pan-y" } as never} {...touches} onTouchCancel={touches.onTouchEnd} onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; }}>
        <ScrollView ref={scroll} scrollEnabled={!locked} scrollEventThrottle={16} onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {days.map(section)}
        </ScrollView>
      </View>

      <Pressable onPress={() => { setSelected(null); addAt(shown, Math.min(shown === today() ? Math.ceil(minutesNow() / 60) * 60 : 9 * 60, DAY_MINUTES - 60)); }} accessibilityRole="button" accessibilityLabel="일정 추가"
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
 * quarter hours.
 */
function EventBlock({ b, hour: H, drag, selected, scale, use24h, onTap, onHold, onDrag, onDrop, onCancel, onEdit, onDelete }: {
  b: Block; hour: number; drag: Drag; selected: boolean; scale: number; use24h: boolean;
  onTap: () => void; onHold: () => void; onDrag: (top: number, bottom: number) => void; onDrop: (top: number, bottom: number) => void; onCancel: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const { c } = useTheme();
  const top = drag?.top ?? b.top, bottom = drag?.bottom ?? b.bottom;
  const start = toMinutes(b.e.startTime ?? "00:00"), end = toMinutes(b.e.endTime ?? "00:00");
  // the latest values for the gesture handlers, which are made once
  const live = useRef({ b, start, end, scale, H, onTap, onHold, onDrag, onDrop, onCancel, selected });
  live.current = { b, start, end, scale, H, onTap, onHold, onDrag, onDrop, onCancel, selected };
  const minutesOf = (dy: number) => ((dy / live.current.scale) / live.current.H) * 60;
  const px = (min: number) => (min / 60) * H;

  const body = useRef((() => {
    let held = false, moved = false, last: { top: number; bottom: number } | null = null;
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
        last = moveBlock(start, end, minutesOf(g.dy));
        live.current.onDrag(last.top, last.bottom);
      },
      onPanResponderRelease: () => {
        clear();
        if (held) { const { start, end } = live.current; live.current.onDrop(last?.top ?? start, last?.bottom ?? end); }
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
  const label = `${b.e.title}, ${eventTimeLabel({ ...b.e, startTime: fromMinutes(top), endTime: fromMinutes(bottom) }, use24h, 0)}`;
  const KNOB = 16;
  const actionsBelow = top < 60; // near midnight there is no room above
  return (
    <View style={{ position: "absolute", top: px(top) + 1, height, left: selected || drag ? 0 : `${(b.col / b.cols) * 100}%`, width: selected || drag ? "100%" : `${100 / b.cols}%`,
      paddingRight: 2, zIndex: selected || drag ? 5 : 1 }}>
      <View {...body.panHandlers} accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
        accessibilityHint={selected ? "다시 누르면 선택 해제, 길게 눌러 옮기기" : "눌러서 선택, 길게 눌러 옮기기"}
        style={{ flex: 1, borderRadius: tokens.radius.sm, backgroundColor: b.e.color, paddingHorizontal: 6, paddingVertical: 3, overflow: "hidden",
          borderWidth: selected ? 2 : 0, borderColor: c.text, opacity: drag ? 0.85 : 1 }}>
        <AppText variant="small" weight={700} raw={onColor(b.e.color)} numberOfLines={1}>{b.e.title}</AppText>
        {bottom - top >= 50 || drag ? <AppText variant="spanLabel" raw={onColor(b.e.color)} numberOfLines={1}>{`${clock(fromMinutes(top), use24h)}~${clock(fromMinutes(bottom), use24h)}`}</AppText> : null}
      </View>
      {selected ? (
        <>
          <View {...topHandle.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="시작 시간 끌어서 바꾸기"
            style={{ position: "absolute", top: -KNOB / 2 - 6, left: "50%", marginLeft: -(KNOB + 12) / 2, width: KNOB + 12, height: KNOB + 12, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: c.bg, borderWidth: 3, borderColor: b.e.color }} />
          </View>
          <View {...bottomHandle.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="끝나는 시간 끌어서 바꾸기"
            style={{ position: "absolute", bottom: -KNOB / 2 - 6, left: "50%", marginLeft: -(KNOB + 12) / 2, width: KNOB + 12, height: KNOB + 12, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: c.bg, borderWidth: 3, borderColor: b.e.color }} />
          </View>
          {drag ? null : (
            <View style={{ position: "absolute", right: 8, flexDirection: "row", gap: 6, ...(actionsBelow ? { top: height + 10 } : { top: -38 }) }}>
              <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="일정 수정"
                style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: c.surfaceRaised }}>
                <Pencil size={14} color={c.menuEdit} /><AppText variant="small" weight={600}>수정</AppText>
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
