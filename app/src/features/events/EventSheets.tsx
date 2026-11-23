import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import {
  AppText, BottomSheet, Bell, Button, Calendar, ConfirmDialog, Check, ChevronLeft, ChevronRight, Clock, ColorCodeInput, FileText, MemoInput, Pencil, PillButton, Sparkles,
  CalendarDays, PRESET_COLORS, Repeat, Tag, TileButton, useGlowColor, TimeGrid, Toggle, Trash2, X,
} from "../../components";
import { usePrefs } from "../../data/prefs";
import { deleteEvent, findEvent, saveEvent, saveEventCategory, selectEventCategories, toggleEventImportant, useDB, type EventScope } from "../../data/store";
import { addDays, daysBetween, parseDay, today, WEEKDAY_LABELS, weekday, type Day } from "../../lib/dates";
import { ALARM_CHOICES, alarmLabel, clock, eventProblem, eventTimeLabel, fromMinutes, REPEAT_LABELS, repeatLabel, toMinutes, type CalEvent, type EventRepeat } from "../../lib/events";
import { DESIGN_TRIAL } from "../../lib/variant";
import { GOOGLE_COLORS, isGoogleColor } from "../../lib/googleColors";
import { fontFamily, onColor, tokens, useTheme } from "../../theme";

export type EventDraft = Omit<CalEvent, "id"> & { id?: string };

export const dayLabel = (d: Day) => { const { m, d: dd } = parseDay(d); return `${m}월 ${dd}일 (${WEEKDAY_LABELS[weekday(d)]})`; };

/** A new event's starting values: one hour from `startTime`, the last colour used. */
export function newDraft(day: Day, startTime: string, endTime: string, color: string): EventDraft {
  return { title: "", startDate: day, endDate: day, allDay: false, startTime, endTime, color, memo: "", alarmMinutes: null }; // 알림 없음 by default (user)
}

type Sub = "form" | "startDate" | "endDate" | "startTime" | "endTime" | "color" | "alarm" | "category" | "repeat" | "until" | "google";

/**
 * Add or change an 일정 (user's feature; the flow follows the user's screen recording of a calendar app: tap an hour,
 * type a title, 저장). One sheet: the title and the times on top, the rest below; dates, times, colour and alarm open
 * in the same sheet.
 */
export function EventEditor({ draft, onClose, onSaved }: { draft: EventDraft | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const { c } = useTheme();
  const glow = useGlowColor();
  const prefs = usePrefs();
  const categories = useDB((d) => d.categories);
  const [e, setE] = useState<EventDraft | null>(draft);
  const [sub, setSub] = useState<Sub>("form");
  const [problem, setProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [scopeAsk, setScopeAsk] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [formKey, setFormKey] = useState(0); // a new draft: the title field starts afresh
  const eventCats = useDB(selectEventCategories);
  const saved = useDB((d) => !!draft && !!findEvent(d, draft.id));
  useEffect(() => { setE(draft); setSub("form"); setProblem(null); setAsking(false); setScopeAsk(false); setNewCat(""); setFormKey((n) => n + 1); }, [draft]);
  if (!e) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const put = (patch: Partial<EventDraft>) => { setProblem(null); setE((x) => (x ? { ...x, ...patch } : x)); };
  const save = (scope?: EventScope) => {
    const p = eventProblem(e);
    if (p) { setProblem(p); return; }
    // one time of a repeating event: this time only, or every time? (asked first)
    if (e.seriesId && !scope) { setScopeAsk(true); return; }
    setScopeAsk(false);
    saveEvent({ ...e, title: e.title.trim(), memo: e.memo.trim() }, scope ?? "all");
    onSaved(`${dayLabel(e.startDate)}에 '${e.title.trim()}'을(를) 저장했어요`);
  };
  const cat = eventCats.find((k) => k.id === e.categoryId);
  const gcal = e.googleCalendarId ? prefs.googleCalendars.find((k) => k.id === e.googleCalendarId) ?? { id: e.googleCalendarId, summary: "구글 캘린더", color: e.color } : null;
  const googleLabel = e.googleCalendarId ? `구글 · ${prefs.googleCalendars.find((k) => k.id === e.googleCalendarId)?.summary ?? "캘린더"}` : "립마크에만";
  const pickCat = (id: string | null) => { const k = eventCats.find((x) => x.id === id); put(k ? { categoryId: k.id, color: k.color } : { categoryId: null }); back(); };
  const setRepeat = (kind: EventRepeat["kind"] | null) =>
    put({ repeat: kind ? { kind, until: e.repeat?.until ?? null, ...(kind === "weekly" ? { weekdays: e.repeat?.weekdays?.length ? e.repeat.weekdays : [weekday(e.startDate)] } : {}) } : null });
  const setStartDate = (d: Day) => put({ startDate: d, endDate: addDays(d, Math.max(0, daysBetween(e.startDate, e.endDate))) });
  const setStartTime = (hm: string) => {
    const length = e.startDate === e.endDate ? toMinutes(e.endTime ?? hm) - toMinutes(e.startTime ?? hm) : 60;
    const end = Math.min(toMinutes(hm) + Math.max(length, 15), 24 * 60 - 5);
    put(e.startDate === e.endDate ? { startTime: hm, endTime: fromMinutes(Math.max(end, toMinutes(hm) + 5)) } : { startTime: hm });
  };
  const colors = [...new Set([...categories.map((x) => x.color.toUpperCase()), ...PRESET_COLORS])].slice(0, 12);
  const back = () => setSub("form");

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Pressable onPress={sub === "form" ? onClose : back} hitSlop={12} accessibilityRole="button" accessibilityLabel={sub === "form" ? "닫기" : "뒤로"} style={{ padding: 4 }}>
        {sub === "form" ? <X size={24} color={c.text} /> : <ChevronLeft size={26} color={c.text} />}
      </Pressable>
      <View style={{ flex: 1 }} />
      {sub === "form" ? (
        <Pressable onPress={() => save()} accessibilityRole="button" accessibilityLabel="일정 저장"
          style={{ backgroundColor: c.accent, borderRadius: tokens.radius.pill, paddingHorizontal: 20, height: 38, justifyContent: "center" }}>
          <AppText variant="body" weight={700} raw={onColor(c.accent)}>저장</AppText>
        </Pressable>
      ) : null}
    </View>
  );

  const when = (which: "start" | "end") => {
    const d = which === "start" ? e.startDate : e.endDate;
    const t = which === "start" ? e.startTime : e.endTime;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
        <AppText variant="body" color="textMuted" style={{ width: 44 }}>{which === "start" ? "시작" : "종료"}</AppText>
        <Pressable onPress={() => setSub(which === "start" ? "startDate" : "endDate")} accessibilityRole="button" accessibilityLabel={`${which === "start" ? "시작" : "종료"} 날짜 ${dayLabel(d)}`}
          style={{ flex: 1, paddingVertical: 12 }}>
          <AppText variant="bodyLg">{dayLabel(d)}</AppText>
        </Pressable>
        {e.allDay ? null : (
          <Pressable onPress={() => setSub(which === "start" ? "startTime" : "endTime")} accessibilityRole="button" accessibilityLabel={`${which === "start" ? "시작" : "종료"} 시간 ${clock(t ?? "00:00", prefs.use24h)}`}
            style={{ paddingVertical: 12, paddingLeft: 12 }}>
            <AppText variant="bodyLg">{clock(t ?? "00:00", prefs.use24h)}</AppText>
          </Pressable>
        )}
      </View>
    );
  };
  const row = (icon: React.ReactNode, label: string, onPress: () => void, a11y: string) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
      {icon}
      <AppText variant="bodyLg" style={{ flex: 1 }}>{label}</AppText>
    </Pressable>
  );

  let body: React.ReactNode;
  if (sub === "startDate" || sub === "endDate") {
    body = <DayPicker initial={sub === "startDate" ? e.startDate : e.endDate} min={sub === "endDate" ? e.startDate : undefined}
      onPick={(d) => { if (sub === "startDate") setStartDate(d); else put({ endDate: d }); back(); }} />;
  } else if (sub === "startTime" || sub === "endTime") {
    const cur = toMinutes((sub === "startTime" ? e.startTime : e.endTime) ?? "09:00");
    body = (
      <View style={{ gap: 14 }}>
        <AppText variant="bodyLg" weight={700}>{sub === "startTime" ? "시작 시간" : "종료 시간"}</AppText>
        <TimeGrid hour={Math.floor(cur / 60) % 24} minute={cur % 60} onChange={(h, m) => {
          const hm = fromMinutes(h * 60 + m);
          if (sub === "startTime") setStartTime(hm); else put({ endTime: hm });
        }} />
        <Button kind="sheetPrimary" label="완료" onPress={back} />
      </View>
    );
  } else if (sub === "color" && gcal) {
    // going to Google (user, 2026-11-23): only the colours Google Calendar has, so what shows here is what shows there
    const option = (hex: string, name: string) => {
      const on = e.color.toUpperCase() === hex.toUpperCase();
      return (
        <Pressable key={name} onPress={() => put({ color: hex })} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`색 ${name}`}
          style={{ width: "25%", alignItems: "center", gap: 4, paddingVertical: 6 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: hex, alignItems: "center", justifyContent: "center", borderWidth: on ? 3 : 0, borderColor: c.text }}>
            {on ? <Check size={18} color={onColor(hex)} strokeWidth={3} /> : null}
          </View>
          <AppText variant="small" color={on ? "text" : "textMuted"} weight={on ? 700 : 400} numberOfLines={1}>{name}</AppText>
        </Pressable>
      );
    };
    body = (
      <View style={{ gap: 14 }}>
        <AppText variant="bodyLg" weight={700}>색</AppText>
        <AppText variant="small" color="textMuted">구글 캘린더에 올리는 일정이라 구글 캘린더에 있는 색만 고를 수 있어요</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {option(gcal.color, "캘린더 색")}
          {GOOGLE_COLORS.map((k) => option(k.hex, k.name))}
        </View>
        <Button kind="sheetPrimary" label="완료" onPress={back} />
      </View>
    );
  } else if (sub === "color") {
    body = (
      <View style={{ gap: 18 }}>
        <AppText variant="bodyLg" weight={700}>색</AppText>
        {/* one row of swatches (the category colours first), inside the code field (user: two rows showed) */}
        <ColorCodeInput value={e.color} onChange={(hex) => put({ color: hex })} presets={colors} />
        <Button kind="sheetPrimary" label="완료" onPress={back} />
      </View>
    );
  } else if (sub === "category") {
    // 일정 카테고리 (user, 2026-11-23): apart from the to-dos' categories; picking one takes its colour
    const choice = (id: string | null, label: string, col?: string) => (
      <Pressable key={id ?? "none"} onPress={() => pickCat(id)} accessibilityRole="radio" accessibilityState={{ checked: (e.categoryId ?? null) === id }} accessibilityLabel={label}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 50 }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: col ?? "transparent", borderWidth: col ? 0 : 1.5, borderColor: c.textMuted }} />
        <AppText variant="bodyLg" style={{ flex: 1 }}>{label}</AppText>
        {(e.categoryId ?? null) === id ? <Check size={20} color={c.text} /> : null}
      </Pressable>
    );
    body = (
      <View>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>일정 카테고리</AppText>
        <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
          {choice(null, "카테고리 없음")}
          {eventCats.map((k) => choice(k.id, k.title, k.color))}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <TextInput value={newCat} onChangeText={setNewCat} placeholder="새 카테고리 이름" placeholderTextColor={c.textPlaceholder} maxLength={40} accessibilityLabel="새 일정 카테고리 이름"
            style={{ flex: 1, height: 44, paddingHorizontal: 14, borderRadius: tokens.radius.md, backgroundColor: c.surfaceInput, color: c.text, fontFamily: fontFamily(400), fontSize: tokens.type.body.size, outlineStyle: "none" as never }} />
          <Pressable onPress={() => {
            const title = newCat.trim();
            if (!title) return;
            const id = saveEventCategory({ title, color: PRESET_COLORS[eventCats.length % PRESET_COLORS.length] });
            setNewCat("");
            put({ categoryId: id, color: PRESET_COLORS[eventCats.length % PRESET_COLORS.length] });
            back();
          }} accessibilityRole="button" accessibilityLabel="카테고리 추가"
            style={{ height: 44, paddingHorizontal: 16, borderRadius: tokens.radius.md, backgroundColor: c.surfaceButton, justifyContent: "center" }}>
            <AppText variant="body" weight={700}>추가</AppText>
          </Pressable>
        </View>
        <AppText variant="small" color="textMuted" style={{ marginTop: 8 }}>이름과 색은 설정 → 일정 카테고리에서 바꿀 수 있어요</AppText>
      </View>
    );
  } else if (sub === "repeat") {
    const kinds: (EventRepeat["kind"] | null)[] = [null, "daily", "weekly", "monthly", "yearly"];
    const wd = e.repeat?.weekdays ?? [];
    body = (
      <View>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>반복</AppText>
        {kinds.map((k) => {
          const on = (e.repeat?.kind ?? null) === k;
          return (
            <Pressable key={k ?? "none"} onPress={() => setRepeat(k)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flexDirection: "row", alignItems: "center", height: 48 }}>
              <AppText variant="bodyLg" style={{ flex: 1 }}>{k ? REPEAT_LABELS[k] : "반복 안 함"}</AppText>
              {on ? <Check size={20} color={c.text} /> : null}
            </Pressable>
          );
        })}
        {e.repeat?.kind === "weekly" ? (
          <View style={{ flexDirection: "row", gap: 6, marginVertical: 8 }}>
            {WEEKDAY_LABELS.map((label, i) => {
              const on = wd.includes(i);
              return (
                <Pressable key={label} onPress={() => { const next = on ? wd.filter((x) => x !== i) : [...wd, i]; if (next.length) put({ repeat: { ...e.repeat!, weekdays: next.sort() } }); }}
                  accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${label}요일`}
                  style={{ flex: 1, height: 40, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.selectedBg : c.surfaceButton }}>
                  <AppText variant="body" weight={700} raw={on ? c.onSelected : undefined}>{label}</AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {e.repeat ? (
          <View style={{ flexDirection: "row", alignItems: "center", minHeight: 50, marginTop: 4 }}>
            <AppText variant="bodyLg" style={{ flex: 1 }}>끝나는 날</AppText>
            <Pressable onPress={() => put({ repeat: { ...e.repeat!, until: null } })} accessibilityRole="radio" accessibilityState={{ checked: !e.repeat.until }}
              style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center", backgroundColor: !e.repeat.until ? c.selectedBg : c.surfaceButton, marginRight: 8 }}>
              <AppText variant="body" weight={600} raw={!e.repeat.until ? c.onSelected : undefined}>계속</AppText>
            </Pressable>
            <Pressable onPress={() => setSub("until")} accessibilityRole="button" accessibilityLabel="끝나는 날 고르기"
              style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center", backgroundColor: e.repeat.until ? c.selectedBg : c.surfaceButton }}>
              <AppText variant="body" weight={600} raw={e.repeat.until ? c.onSelected : undefined}>{e.repeat.until ? dayLabel(e.repeat.until) : "날짜"}</AppText>
            </Pressable>
          </View>
        ) : null}
        <Button kind="sheetPrimary" label="완료" onPress={back} />
      </View>
    );
  } else if (sub === "google") {
    // 구글 캘린더 (user, 2026-11-23): picked for each event; 립마크에만 keeps it out of Google (and takes it off if it was there)
    const choice = (id: string | null, label: string, col?: string) => (
      <Pressable key={id ?? "none"} onPress={() => {
        // going to a Google calendar with a colour Google does not have: the calendar's own colour instead
        const cal = prefs.googleCalendars.find((k) => k.id === id);
        put(cal && !isGoogleColor(e.color, cal.color) ? { googleCalendarId: id, color: cal.color } : { googleCalendarId: id });
        back();
      }} accessibilityRole="radio" accessibilityState={{ checked: (e.googleCalendarId ?? null) === id }} accessibilityLabel={label}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 50 }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: col ?? "transparent", borderWidth: col ? 0 : 1.5, borderColor: c.textMuted }} />
        <AppText variant="bodyLg" style={{ flex: 1 }}>{label}</AppText>
        {(e.googleCalendarId ?? null) === id ? <Check size={20} color={c.text} /> : null}
      </Pressable>
    );
    body = (
      <View>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>올릴 곳</AppText>
        {choice(null, "립마크에만 (구글에 안 올림)")}
        {prefs.googleCalendars.map((k) => choice(k.id, k.summary, k.color))}
        <AppText variant="small" color="textMuted" style={{ marginTop: 8 }}>연동할 캘린더는 설정 → 구글 캘린더에서 골라요</AppText>
      </View>
    );
  } else if (sub === "until") {
    body = <DayPicker initial={e.repeat?.until ?? addDays(e.startDate, 30)} min={e.startDate} onPick={(d) => { put({ repeat: { ...e.repeat!, until: d } }); setSub("repeat"); }} />;
  } else if (sub === "alarm") {
    body = (
      <View>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>알림</AppText>
        {ALARM_CHOICES.map((a) => (
          <Pressable key={String(a.minutes)} onPress={() => { put({ alarmMinutes: a.minutes }); back(); }} accessibilityRole="radio" accessibilityState={{ checked: (e.alarmMinutes ?? null) === a.minutes }}
            style={{ flexDirection: "row", alignItems: "center", height: 50 }}>
            <AppText variant="bodyLg" style={{ flex: 1 }}>{e.allDay && a.minutes !== null ? `${a.label} (오전 9시 기준)` : a.label}</AppText>
            {(e.alarmMinutes ?? null) === a.minutes ? <Check size={20} color={c.text} /> : null}
          </Pressable>
        ))}
      </View>
    );
  } else {
    const icon = (I: typeof Bell) => <I size={22} color={c.textMuted} />;
    body = (
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
        {/* keeps its own text (see useOwnText in Form.tsx): a value sent back while typing mixed up Korean letters */}
        <TextInput key={formKey} defaultValue={e.title} onChangeText={(title) => put({ title })} placeholder="제목 추가" placeholderTextColor={c.textPlaceholder} autoFocus={!e.id}
          accessibilityLabel="일정 제목" maxLength={100} returnKeyType="done"
          style={{ outlineStyle: "none" as never, fontFamily: fontFamily(600), fontSize: 24, color: c.text, paddingVertical: 8 }} />
        <AppText variant="body" color="textSecondary" style={{ marginBottom: 8 }}>{`${dayLabel(e.startDate)} · ${eventTimeLabel({ ...e, id: "" }, prefs.use24h, parseDay(today()).y)}`}</AppText>
        {problem ? <AppText variant="helper" color="danger" style={{ marginBottom: 6 }}>{problem}</AppText> : null}
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 8 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
          {icon(Clock)}
          <AppText variant="bodyLg" style={{ flex: 1 }}>종일</AppText>
          <Toggle value={e.allDay} label="종일" onChange={(allDay) => put(allDay ? { allDay } : { allDay, startTime: e.startTime ?? "09:00", endTime: e.endTime ?? "10:00" })} />
        </View>
        <View style={{ paddingLeft: 36 }}>
          {when("start")}
          {when("end")}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
          <Sparkles size={22} color={e.important ? glow : c.textMuted} />
          <AppText variant="bodyLg" style={{ flex: 1 }}>중요한 일정으로 강조</AppText>
          <Toggle value={!!e.important} label="중요한 일정으로 강조" onChange={(important) => put({ important })} />
        </View>
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 8 }} />
        {row(icon(Bell), alarmLabel(e.alarmMinutes), () => setSub("alarm"), `알림 ${alarmLabel(e.alarmMinutes)}`)}
        {DESIGN_TRIAL ? row(icon(Repeat), repeatLabel(e.repeat, e.startDate), () => setSub("repeat"), `반복 ${repeatLabel(e.repeat, e.startDate)}`) : null}
        {DESIGN_TRIAL ? row(icon(Tag), cat ? cat.title : "카테고리 없음", () => setSub("category"), `일정 카테고리 ${cat ? cat.title : "없음"}`) : null}
        {DESIGN_TRIAL && (prefs.googleLinked || e.googleCalendarId) ? row(icon(CalendarDays), googleLabel, () => setSub("google"), `구글 캘린더 ${googleLabel}`) : null}
        {row(<View style={{ width: 22, alignItems: "center" }}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: e.color }} /></View>, "색", () => setSub("color"), "색 고르기")}
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 8 }} />
        <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingTop: 6 }}>
          <View style={{ paddingTop: 12 }}>{icon(FileText)}</View>
          <View style={{ flex: 1 }}><MemoInput value={e.memo} onChangeText={(memo) => put({ memo })} placeholder="설명 추가" /></View>
        </View>
        {/* an event already saved can be deleted right here (user, 2026-11-23: without going into the timeline) */}
        {saved ? (
          <Pressable onPress={() => setAsking(true)} accessibilityRole="button" accessibilityLabel="일정 삭제"
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, marginTop: 18, borderRadius: 24, borderWidth: 1, borderColor: c.danger }}>
            <Trash2 size={18} color={c.danger} />
            <AppText variant="body" weight={700} color="danger">일정 삭제</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  return (
    // the phone's back button steps back: a date, time, colour or alarm page returns to the form (the keyboard closes
    // on its own first), and only the form closes the sheet (user)
    <BottomSheet visible={!!draft} onClose={onClose} onBack={sub === "form" ? onClose : sub === "until" ? () => setSub("repeat") : back}>
      {header}
      {body}
      <EventDeleteDialog event={asking && e.id ? ({ ...e, id: e.id } as CalEvent) : null} onClose={() => setAsking(false)} onDone={(m) => { setAsking(false); onSaved(m); }} />
      <ConfirmDialog visible={scopeAsk} message="반복 일정이에요. 어디까지 바꿀까요?" onCancel={() => setScopeAsk(false)}
        options={[{ label: "이 일정만", onPress: () => save("one") }, { label: "모든 반복 일정", onPress: () => save("all") }]} />
    </BottomSheet>
  );
}

/** Deleting an event; a time of a repeating one asks: this time only, or the whole repeat. */
export function EventDeleteDialog({ event, onClose, onDone }: { event: CalEvent | null; onClose: () => void; onDone: (msg: string) => void }) {
  if (!event) return null;
  const name = `'${event.title || "일정"}'`;
  if (event.seriesId)
    return (
      <ConfirmDialog visible message={`${name}은(는) 반복 일정이에요. 어떻게 지울까요?`} onCancel={onClose}
        options={[
          { label: "이 일정만 지우기", danger: true, onPress: () => { deleteEvent(event.id, "one"); onDone(`${name} 이날 일정을 지웠어요`); } },
          { label: "모든 반복 일정 지우기", danger: true, onPress: () => { deleteEvent(event.id, "all"); onDone(`${name} 반복 일정을 모두 지웠어요`); } },
        ]} />
    );
  return <ConfirmDialog visible message={`${name} 일정을 지울까요?`} cancel="취소" ok="지우기" danger onCancel={onClose} onOk={() => { deleteEvent(event.id); onDone(`${name} 일정을 지웠어요`); }} />;
}

/** A month to pick a day from (inside the editor sheet). */
function DayPicker({ initial, min, onPick }: { initial: Day; min?: Day; onPick: (d: Day) => void }) {
  const { c } = useTheme();
  const glow = useGlowColor();
  const s = parseDay(initial);
  const [ym, setYm] = useState({ y: s.y, m: s.m });
  const shift = (n: number) => setYm(({ y, m }) => { const t = m + n; return { y: y + Math.floor((t - 1) / 12), m: ((t - 1 + 120) % 12) + 1 }; });
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <AppText variant="bodyLg" weight={700} style={{ flex: 1 }}>{`${ym.y}년 ${ym.m}월`}</AppText>
        <PillButton round onPress={() => shift(-1)} a11y="이전 달"><ChevronLeft size={20} color={c.text} /></PillButton>
        <View style={{ width: 8 }} />
        <PillButton round onPress={() => shift(1)} a11y="다음 달"><ChevronRight size={20} color={c.text} /></PillButton>
      </View>
      <Calendar picker year={ym.y} month={ym.m} today={initial} selected={initial} onSelect={(d) => onPick(min && d < min ? min : d)} />
    </View>
  );
}

/** Tapping an event: what it is, with 수정하기 and 삭제하기. */
export function EventDetail({ id, onClose, onEdit, notice }: { id: string | null; onClose: () => void; onEdit: (e: CalEvent) => void; notice: (m: string) => void }) {
  const { c } = useTheme();
  const glow = useGlowColor();
  const prefs = usePrefs();
  const e = useDB((d) => findEvent(d, id));
  const [removing, setRemoving] = useState(false);
  if (!e) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;
  return (
    <BottomSheet visible={!!id} onClose={onClose}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
        <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: e.color, marginTop: 6 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="sheetTitle" accessibilityRole="header">{e.title}</AppText>
          <AppText variant="body" color="textSecondary">{`${e.startDate === e.endDate ? `${dayLabel(e.startDate)} · ` : ""}${eventTimeLabel(e, prefs.use24h, parseDay(today()).y)}`}</AppText>
        </View>
      </View>
      {e.alarmMinutes != null ? (
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center", minHeight: 40 }}><Bell size={20} color={c.textMuted} /><AppText variant="body">{alarmLabel(e.alarmMinutes)}</AppText></View>
      ) : null}
      {e.memo ? (
        <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 8 }}><FileText size={20} color={c.textMuted} /><AppText variant="body" style={{ flex: 1 }}>{e.memo}</AppText></View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <TileButton label="수정하기" icon={<Pencil size={28} color={c.menuEdit} />} onPress={() => onEdit(e)} />
        <TileButton label={e.important ? "강조 해제" : "강조"} icon={<Sparkles size={28} color={glow} />} onPress={() => notice(toggleEventImportant(e.id) ? "중요한 일정으로 강조했어요" : "강조를 풀었어요")} />
        <TileButton label="삭제하기" icon={<Trash2 size={28} color={c.menuDelete} />} onPress={() => { if (e.seriesId) setRemoving(true); else { deleteEvent(e.id); onClose(); notice("일정을 지웠어요"); } }} />
      </View>
      <EventDeleteDialog event={removing ? e : null} onClose={() => setRemoving(false)} onDone={(m) => { setRemoving(false); onClose(); notice(m); }} />
    </BottomSheet>
  );
}

