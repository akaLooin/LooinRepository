import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import { AppText, ChevronLeft, ChevronRight, PillButton, Plus, useToast } from "../../components";
import { usePrefs } from "../../data/prefs";
import { useDB } from "../../data/store";
import { addDays, today, type Day } from "../../lib/dates";
import { clock, dayBlocks, DAY_MINUTES, eventsOn, eventTimeLabel, fromMinutes, inBand, slotAt, toMinutes, type CalEvent } from "../../lib/events";
import { goBack } from "../../lib/nav";
import { onColor, tokens, useInsets, useTheme } from "../../theme";
import { dayLabel, EventDetail, EventEditor, newDraft, type EventDraft } from "./EventSheets";

const H = tokens.layout.hourHeight;
const LABEL_W = tokens.layout.hourLabelWidth;
const isDay = (s: unknown): s is Day => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const minutesNow = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

/**
 * One day of the 일정 캘린더 as an hour grid (user's feature, after the user's screen recording): 종일 and multi-day
 * events in a band on top, timed ones as blocks, a line at the current time. Tapping an empty hour marks an hour
 * there and opens the editor; tapping an event shows it.
 */
export function EventDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const events = useDB((d) => d.events);
  const [day, setDay] = useState<Day>(isDay(date) ? date : today());
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [toast, notice] = useToast();
  const scroll = useRef<ScrollViewInstance>(null);
  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(h); }, []);

  const list = useMemo(() => eventsOn(events, day), [events, day]);
  const band = list.filter(inBand);
  const blocks = useMemo(() => dayBlocks(events, day), [events, day]);
  const isToday = day === today();
  const lastColor = events[events.length - 1]?.color ?? c.accent;

  // open on the morning, the first event, or an hour before now (today)
  useEffect(() => {
    const first = blocks[0]?.top;
    const at = isToday ? minutesNow() - 60 : first !== undefined ? Math.min(first - 30, 8 * 60) : 8 * 60;
    const y = Math.max(0, (at / 60) * H);
    const t = setTimeout(() => scroll.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(t);
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  const addAt = (minutes: number) => {
    const s = slotAt(minutes);
    setDraft(newDraft(day, s.startTime, s.endTime, lastColor));
    // the marked hour stays in sight above the sheet (as in the recording)
    scroll.current?.scrollTo({ y: Math.max(0, (toMinutes(s.startTime) / 60 - 1) * H), animated: true });
  };
  const hourLabel = (h: number) => (prefs.use24h ? `${String(h).padStart(2, "0")}:00` : `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시`);
  const pending = draft && !draft.id && !draft.allDay && draft.startDate === day && draft.startTime && draft.endTime ? draft : null;
  const toTop = (hm: string) => { const [h, m] = hm.split(":").map(Number); return ((h * 60 + m) / 60) * H; };

  const chip = (e: CalEvent) => (
    <Pressable key={e.id} onPress={() => setOpen(e.id)} accessibilityRole="button" accessibilityLabel={`${e.title}, ${eventTimeLabel(e, prefs.use24h, 0)}`}
      style={{ backgroundColor: e.color, borderRadius: tokens.radius.sm, paddingHorizontal: 10, paddingVertical: 5 }}>
      <AppText variant="small" weight={600} raw={onColor(e.color)} numberOfLines={1}>{e.title}</AppText>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: tokens.layout.gutter - 6, paddingRight: tokens.layout.gutter, height: tokens.layout.headerHeight }}>
        <Pressable onPress={() => goBack("/")} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로 가기" style={{ padding: 4 }}>
          <ChevronLeft size={28} color={c.text} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={() => setDay(today())} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${dayLabel(day)}, 오늘로 이동`}>
          <AppText variant="sheetTitle" accessibilityRole="header">{dayLabel(day)}</AppText>
        </Pressable>
        <PillButton round onPress={() => setDay(addDays(day, -1))} a11y="전날"><ChevronLeft size={20} color={c.text} /></PillButton>
        <PillButton round onPress={() => setDay(addDays(day, 1))} a11y="다음 날"><ChevronRight size={20} color={c.text} /></PillButton>
      </View>

      {band.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: LABEL_W, paddingRight: tokens.layout.gutter, paddingBottom: 10 }} accessibilityLabel="종일 일정">
          {band.map(chip)}
        </View>
      ) : null}

      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={{ height: 24 * H + 1, marginTop: 8 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <View key={h} pointerEvents="none" style={{ position: "absolute", top: h * H, left: 0, right: 0, flexDirection: "row", alignItems: "flex-start" }}>
              <AppText variant="small" color="textMuted" style={{ width: LABEL_W - 8, textAlign: "right", marginTop: -8 }}>{h ? hourLabel(h) : ""}</AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: c.hourLine, marginLeft: 8, marginRight: tokens.layout.gutter }} />
            </View>
          ))}
          {/* the empty grid: one tap area per half hour (a touch position is not reliable on every platform) */}
          {Array.from({ length: 48 }, (_, i) => (
            <Pressable key={i} onPress={() => addAt(i * 30)} accessibilityRole="button" accessibilityLabel={`${fromMinutes(i * 30)}에 일정 추가`}
              style={{ position: "absolute", top: (i * H) / 2, height: H / 2, left: LABEL_W, right: tokens.layout.gutter }} />
          ))}
          <View pointerEvents="box-none" style={{ position: "absolute", top: 0, bottom: 0, left: LABEL_W + 2, right: tokens.layout.gutter }}>
            {blocks.map((b) => (
              <Pressable key={b.e.id} onPress={() => setOpen(b.e.id)} accessibilityRole="button" accessibilityLabel={`${b.e.title}, ${eventTimeLabel(b.e, prefs.use24h, 0)}`}
                style={{ position: "absolute", top: (b.top / 60) * H + 1, height: Math.max(18, ((b.bottom - b.top) / 60) * H - 2), left: `${(b.col / b.cols) * 100}%`, width: `${100 / b.cols}%`, paddingRight: 2 }}>
                <View style={{ flex: 1, borderRadius: tokens.radius.sm, backgroundColor: b.e.color, paddingHorizontal: 6, paddingVertical: 3, overflow: "hidden" }}>
                  <AppText variant="small" weight={700} raw={onColor(b.e.color)} numberOfLines={1}>{b.e.title}</AppText>
                  {b.bottom - b.top >= 50 ? <AppText variant="spanLabel" raw={onColor(b.e.color)} numberOfLines={1}>{`${clock(b.e.startTime!, prefs.use24h)}~${clock(b.e.endTime!, prefs.use24h)}`}</AppText> : null}
                </View>
              </Pressable>
            ))}
            {pending ? (
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: toTop(pending.startTime!), height: toTop(pending.endTime!) - toTop(pending.startTime!),
                borderWidth: 2, borderColor: pending.color, borderRadius: tokens.radius.sm, backgroundColor: "transparent" }} accessibilityLabel="새 일정 자리" />
            ) : null}
          </View>
          {isToday ? (
            <View pointerEvents="none" style={{ position: "absolute", top: (minutesNow() / DAY_MINUTES) * 24 * H, left: LABEL_W - 4, right: tokens.layout.gutter, flexDirection: "row", alignItems: "center" }} accessibilityLabel="지금">
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.nowLine }} />
              <View style={{ flex: 1, height: 2, backgroundColor: c.nowLine }} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable onPress={() => addAt(Math.min(isToday ? Math.ceil(minutesNow() / 60) * 60 : 9 * 60, DAY_MINUTES - 60))} accessibilityRole="button" accessibilityLabel="일정 추가"
        style={{ position: "absolute", right: tokens.layout.gutter, bottom: insets.bottom + 24, width: 56, height: 56, borderRadius: 18, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
        <Plus size={28} color={onColor(c.accent)} strokeWidth={2.4} />
      </Pressable>

      <EventEditor draft={draft} onClose={() => setDraft(null)} onSaved={(m) => { setDraft(null); notice(m); }} />
      <EventDetail id={open} onClose={() => setOpen(null)} notice={notice}
        onEdit={(e) => { setOpen(null); setDraft({ ...e }); }} />
      {toast}
    </View>
  );
}
