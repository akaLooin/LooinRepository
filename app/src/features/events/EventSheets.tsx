import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import {
  AppText, BottomSheet, Bell, Button, Calendar, ConfirmDialog, Check, ChevronLeft, ChevronRight, Clock, ColorCodeInput, FileText, MemoInput, Pencil, PillButton, Sparkles,
  CalendarDays, Globe, Lock, MapPin, Paperclip, Plus, Users, Video, PRESET_COLORS, Repeat, Tag, TileButton, useGlowColor, TimeGrid, Toggle, Trash2, X,
} from "../../components";
import { usePrefs } from "../../data/prefs";
import { deleteEvent, findEvent, saveEvent, saveEventCategory, selectEventCategories, toggleEventImportant, useDB, type EventScope } from "../../data/store";
import { addDays, daysBetween, parseDay, today, WEEKDAY_LABELS, weekday, type Day } from "../../lib/dates";
import { ALARM_CHOICES, alarmLabel, alarmsOf, type EventGuest, clock, eventProblem, eventTimeLabel, fromMinutes, REPEAT_LABELS, repeatLabel, toMinutes, type CalEvent, type EventRepeat } from "../../lib/events";
import { DESIGN_TRIAL } from "../../lib/variant";
import { googleColorChoices, isGoogleColor, isReadOnlyEvent, labelChoices } from "../../lib/googleColors";
import { fontFamily, onColor, tokens, useTheme } from "../../theme";

export type EventDraft = Omit<CalEvent, "id"> & { id?: string };

export const dayLabel = (d: Day) => { const { m, d: dd } = parseDay(d); return `${m}월 ${dd}일 (${WEEKDAY_LABELS[weekday(d)]})`; };

/** A new event's starting values: one hour from `startTime`, the last colour used. */
export function newDraft(day: Day, startTime: string, endTime: string, color: string): EventDraft {
  return { title: "", startDate: day, endDate: day, allDay: false, startTime, endTime, color, memo: "", alarmMinutes: null }; // 알림 없음 by default (user)
}

type Sub = "form" | "startDate" | "endDate" | "startTime" | "endTime" | "color" | "alarm" | "category" | "repeat" | "until" | "google" | "tz" | "guests";

/** 시간대 choices (Google's list is long; the ones people here travel to, and the phone's own) */
const TIME_ZONES: { id: string; label: string }[] = [
  { id: "Asia/Seoul", label: "한국 표준시" }, { id: "Asia/Tokyo", label: "일본 표준시" }, { id: "Asia/Shanghai", label: "중국 표준시" },
  { id: "Asia/Taipei", label: "타이베이" }, { id: "Asia/Hong_Kong", label: "홍콩" }, { id: "Asia/Singapore", label: "싱가포르" },
  { id: "Asia/Bangkok", label: "방콕" }, { id: "Asia/Ho_Chi_Minh", label: "베트남" }, { id: "Australia/Sydney", label: "시드니" },
  { id: "Europe/London", label: "런던" }, { id: "Europe/Paris", label: "파리" }, { id: "Europe/Berlin", label: "베를린" },
  { id: "America/New_York", label: "뉴욕" }, { id: "America/Chicago", label: "시카고" }, { id: "America/Los_Angeles", label: "로스앤젤레스" },
  { id: "Pacific/Honolulu", label: "하와이" }, { id: "UTC", label: "협정 세계시 (UTC)" },
];
const tzLabel = (id?: string | null) => TIME_ZONES.find((z) => z.id === id)?.label ?? id ?? "한국 표준시";
const GUEST_STATUS: Record<string, string> = { accepted: "참석", declined: "불참", tentative: "미정", needsAction: "답 없음" };
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

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
  // 알림 여러 개: which alarm the alarm page changes (-1 = a new one)
  const [alarmSlot, setAlarmSlot] = useState(-1);
  const [guest, setGuest] = useState("");
  const [formKey, setFormKey] = useState(0); // a new draft: the title field starts afresh
  const eventCats = useDB(selectEventCategories);
  const saved = useDB((d) => !!draft && !!findEvent(d, draft.id));
  useEffect(() => { setE(draft); setSub("form"); setProblem(null); setAsking(false); setScopeAsk(false); setNewCat(""); setGuest(""); setFormKey((n) => n + 1); }, [draft]);
  if (!e) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const put = (patch: Partial<EventDraft>) => { setProblem(null); setE((x) => (x ? { ...x, ...patch } : x)); };
  const save = (scope?: EventScope) => {
    const p = eventProblem(e);
    if (p) { setProblem(p); return; }
    // one time of a repeating event: this time only, or every time? (asked first)
    if (e.seriesId && !scope) { setScopeAsk(true); return; }
    setScopeAsk(false);
    saveEvent({ ...e, title: e.title.trim(), memo: e.memo.trim(), ...(e.location !== undefined ? { location: e.location.trim() } : {}) }, scope ?? "all");
    onSaved(`${dayLabel(e.startDate)}에 '${e.title.trim()}'을(를) 저장했어요`);
  };
  const cat = eventCats.find((k) => k.id === e.categoryId);
  // from a Google calendar that can only be read: information only
  const readOnly = !!e.id && isReadOnlyEvent(e, prefs.googleReadOnlyCalendarIds);
  // a Google calendar as the event's category: where it goes, its 일정 카테고리, and (if Google lacks the colour) its colour
  const pickGoogleCalendar = (id: string) => {
    const cal = prefs.googleCalendars.find((k) => k.id === id);
    if (!cal) return;
    put({ googleCalendarId: id, ...(cal.categoryId ? { categoryId: cal.categoryId } : {}), ...(!isGoogleColor(e.color, cal.color, [...prefs.googleEventColors, ...(prefs.googleLabels[cal.id] ?? [])]) || e.color === (prefs.googleCalendars.find((k) => k.id === e.googleCalendarId)?.color) ? { color: cal.color } : {}) });
  };
  const chooseAccount = (google: boolean) => {
    if (!google) { put({ googleCalendarId: null }); return; }
    if (e.googleCalendarId) return;
    // the calendar whose category the event already has, else the first one
    const cal = prefs.googleCalendars.find((k) => k.categoryId && k.categoryId === e.categoryId) ?? prefs.googleCalendars[0];
    if (cal) pickGoogleCalendar(cal.id);
  };
  const gcal = e.googleCalendarId ? prefs.googleCalendars.find((k) => k.id === e.googleCalendarId) ?? { id: e.googleCalendarId, summary: "구글 캘린더", color: e.color } : null;
  const googleLabel = e.googleCalendarId ? `구글 캘린더 · ${prefs.googleEmail ?? "연결한 계정"}` : "립마크에만";
  const catLabel = e.googleCalendarId ? prefs.googleCalendars.find((k) => k.id === e.googleCalendarId)?.summary ?? "구글 캘린더" : cat ? cat.title : "카테고리 없음";
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
  const alarms = alarmsOf(e);
  const setAlarms = (list: number[]) => { const l = [...new Set(list)].sort((a, b) => a - b).slice(0, 5); put({ alarms: l, alarmMinutes: l[0] ?? null }); };
  const guests = e.attendees ?? [];
  const addGuest = () => {
    const mail = guest.trim().toLowerCase();
    if (!isEmail(mail)) { setProblem("이메일 주소를 확인해 주세요"); return; }
    if (!guests.some((g) => g.email.toLowerCase() === mail)) put({ attendees: [...guests, { email: mail, status: "needsAction" }] });
    setGuest("");
  };
  const meetState = e.meetLink === "new" ? "new" : e.meetLink ? "on" : "off";

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Pressable onPress={sub === "form" ? onClose : back} hitSlop={12} accessibilityRole="button" accessibilityLabel={sub === "form" ? "닫기" : "뒤로"} style={{ padding: 4 }}>
        {sub === "form" ? <X size={24} color={c.text} /> : <ChevronLeft size={26} color={c.text} />}
      </Pressable>
      <View style={{ flex: 1 }} />
      {sub === "form" && !readOnly ? (
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
          {/* the calendar's own 24 label colours when it has them (Google's newer colours), else the event palette */}
          {(prefs.googleLabels[gcal.id]?.length ? labelChoices(prefs.googleLabels[gcal.id]) : googleColorChoices(prefs.googleEventColors)).map((k) => option(k.hex, k.name))}
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
  } else if (sub === "category" && e.googleCalendarId) {
    // going to Google: the account's calendars are the categories (each has a 일정 카테고리 of its name and colour)
    body = (
      <View>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>구글 캘린더</AppText>
        {prefs.googleCalendars.map((k) => (
          <Pressable key={k.id} onPress={() => { pickGoogleCalendar(k.id); back(); }} accessibilityRole="radio" accessibilityState={{ checked: e.googleCalendarId === k.id }} accessibilityLabel={k.summary}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 50 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: k.color }} />
            <AppText variant="bodyLg" style={{ flex: 1 }} numberOfLines={1}>{k.summary}</AppText>
            {e.googleCalendarId === k.id ? <Check size={20} color={c.text} /> : null}
          </Pressable>
        ))}
        <AppText variant="small" color="textMuted" style={{ marginTop: 8 }}>여기 보이는 캘린더는 설정 → 구글 캘린더에서 골라요</AppText>
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
          {eventCats.filter((k) => !prefs.googleReadOnlyCategoryIds.includes(k.id) || e.categoryId === k.id).map((k) => choice(k.id, k.title, k.color))}
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
    // 올릴 곳 (user, 2026-11-23): the account. 립마크에만, or the Google account; its calendars are then the categories
    const choice = (google: boolean, label: string) => (
      <Pressable key={label} onPress={() => { chooseAccount(google); back(); if (google && !e.googleCalendarId) setSub("category"); }}
        accessibilityRole="radio" accessibilityState={{ checked: !!e.googleCalendarId === google }} accessibilityLabel={label}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 52 }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: c.textMuted, backgroundColor: !!e.googleCalendarId === google ? c.text : "transparent" }} />
        <AppText variant="bodyLg" style={{ flex: 1 }} numberOfLines={1}>{label}</AppText>
        {!!e.googleCalendarId === google ? <Check size={20} color={c.text} /> : null}
      </Pressable>
    );
    body = (
      <View>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>올릴 곳</AppText>
        {choice(false, "립마크에만 (구글에 안 올림)")}
        {choice(true, `구글 캘린더 · ${prefs.googleEmail ?? "연결한 계정"}`)}
        <AppText variant="small" color="textMuted" style={{ marginTop: 8 }}>구글 계정을 고르면 카테고리에서 그 계정의 캘린더를 골라요</AppText>
      </View>
    );
  } else if (sub === "until") {
    body = <DayPicker initial={e.repeat?.until ?? addDays(e.startDate, 30)} min={e.startDate} onPick={(d) => { put({ repeat: { ...e.repeat!, until: d } }); setSub("repeat"); }} />;
  } else if (sub === "alarm") {
    body = (
      <View>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>알림</AppText>
        {ALARM_CHOICES.map((a) => (
          <Pressable key={String(a.minutes)} onPress={() => {
            if (!DESIGN_TRIAL) put({ alarmMinutes: a.minutes });
            // 알림 여러 개 (user, 2026-11-23, like Google): a picked time changes this alarm or adds one; 알림 없음 takes it off
            else setAlarms(alarmSlot < 0 ? (a.minutes == null ? alarms : [...alarms, a.minutes]) : alarms.flatMap((m, i) => (i === alarmSlot ? (a.minutes == null ? [] : [a.minutes]) : [m])));
            back();
          }} accessibilityRole="radio" accessibilityState={{ checked: DESIGN_TRIAL ? alarmSlot >= 0 && alarms[alarmSlot] === a.minutes : (e.alarmMinutes ?? null) === a.minutes }}
            style={{ flexDirection: "row", alignItems: "center", height: 50 }}>
            <AppText variant="bodyLg" style={{ flex: 1 }}>{e.allDay && a.minutes !== null ? `${a.label} (오전 9시 기준)` : a.label}</AppText>
            {(DESIGN_TRIAL ? alarmSlot >= 0 && alarms[alarmSlot] === a.minutes : (e.alarmMinutes ?? null) === a.minutes) ? <Check size={20} color={c.text} /> : null}
          </Pressable>
        ))}
      </View>
    );
  } else if (sub === "tz") {
    body = (
      <ScrollView style={{ maxHeight: 520 }}>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>시간대</AppText>
        {TIME_ZONES.map((z) => {
          const on = (e.timeZone || "Asia/Seoul") === z.id;
          return (
            <Pressable key={z.id} onPress={() => { put({ timeZone: z.id }); back(); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={z.label}
              style={{ flexDirection: "row", alignItems: "center", height: 50 }}>
              <AppText variant="bodyLg" style={{ flex: 1 }}>{z.label}</AppText>
              <AppText variant="small" color="textMuted" style={{ marginRight: 10 }}>{z.id}</AppText>
              {on ? <Check size={20} color={c.text} /> : null}
            </Pressable>
          );
        })}
        <AppText variant="small" color="textMuted" style={{ marginTop: 8 }}>립마크에는 적은 시각 그대로 보이고, 구글에서는 이 시간대의 시각으로 맞춰져요</AppText>
      </ScrollView>
    );
  } else if (sub === "guests") {
    body = (
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
        <AppText variant="bodyLg" weight={700} style={{ marginBottom: 6 }}>참석자</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput value={guest} onChangeText={(t) => { setGuest(t); setProblem(null); }} placeholder="이메일 주소로 사용자 추가" placeholderTextColor={c.textPlaceholder}
            accessibilityLabel="참석자 이메일" autoCapitalize="none" keyboardType="email-address" returnKeyType="done" onSubmitEditing={addGuest} maxLength={200}
            style={{ flex: 1, outlineStyle: "none" as never, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, color: c.text, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.divider }} />
          <PillButton onPress={addGuest} a11y="참석자 추가"><Plus size={18} color={c.text} /></PillButton>
        </View>
        {problem ? <AppText variant="helper" color="danger" style={{ marginTop: 6 }}>{problem}</AppText> : null}
        {guests.map((g: EventGuest) => (
          <View key={g.email} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLg" numberOfLines={1}>{g.name || g.email}</AppText>
              <AppText variant="small" color="textMuted" numberOfLines={1}>{`${g.name ? `${g.email} · ` : ""}${g.organizer ? "주최자 · " : ""}${GUEST_STATUS[g.status ?? "needsAction"] ?? "답 없음"}`}</AppText>
            </View>
            {g.organizer ? null : (
              <Pressable onPress={() => put({ attendees: guests.filter((x) => x.email !== g.email) })} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${g.email} 빼기`}>
                <X size={20} color={c.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
        <AppText variant="small" color="textMuted" style={{ marginTop: 10 }}>구글 일정에 참석자로 들어가요. 초대 메일은 립마크가 보내지 않아요 (보내려면 구글 캘린더에서)</AppText>
      </ScrollView>
    );
  } else if (readOnly) {
    const calName = prefs.googleCalendars.find((k) => k.id === e.googleCalendarId)?.summary;
    const line = (I: typeof Bell, text: string) => (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 44 }}>
        <I size={20} color={c.textMuted} />
        <AppText variant="bodyLg" style={{ flex: 1 }}>{text}</AppText>
      </View>
    );
    body = (
      <ScrollView style={{ maxHeight: 520 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: e.color }} />
          <AppText variant="sheetTitle" style={{ flex: 1 }} accessibilityRole="header">{e.title}</AppText>
        </View>
        <AppText variant="body" color="textSecondary" style={{ marginBottom: 10 }}>{`${dayLabel(e.startDate)} · ${eventTimeLabel({ ...e, id: e.id ?? "" }, prefs.use24h, parseDay(today()).y)}`}</AppText>
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 6 }} />
        {e.repeat ? line(Repeat, repeatLabel(e.repeat, e.startDate)) : null}
        {line(CalendarDays, calName ? `구글 · ${calName}` : "구글 캘린더")}
        {alarms.length ? line(Bell, alarms.map(alarmLabel).join(", ")) : null}
        {e.timeZone && e.timeZone !== "Asia/Seoul" && !e.allDay ? line(Globe, tzLabel(e.timeZone)) : null}
        {guests.length ? line(Users, guests.map((g) => `${g.name || g.email} (${GUEST_STATUS[g.status ?? "needsAction"] ?? "답 없음"})`).join("\n")) : null}
        {e.location ? line(MapPin, e.location) : null}
        {e.meetLink && e.meetLink !== "new" ? row(<Video size={20} color={c.info} />, "화상 회의 참여", () => Linking.openURL(e.meetLink!), "화상 회의 참여") : null}
        {(e.attachments ?? []).map((a) => row(<Paperclip size={20} color={c.textMuted} />, a.title, () => Linking.openURL(a.url), `첨부파일 ${a.title} 열기`))}
        {e.memo ? (
          <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 8 }}>
            <FileText size={20} color={c.textMuted} /><AppText variant="body" style={{ flex: 1 }}>{e.memo}</AppText>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, padding: 12, borderRadius: tokens.radius.md, backgroundColor: c.surfaceButton }}>
          <Lock size={16} color={c.textMuted} />
          <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>보기만 할 수 있는 구글 캘린더의 일정이라 립마크에서는 바꾸거나 지울 수 없어요</AppText>
        </View>
      </ScrollView>
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
        {/* 시간대 (user, 2026-11-23: as in Google, 한국 표준시 unless picked) */}
        {DESIGN_TRIAL && !e.allDay && e.googleCalendarId ? row(icon(Globe), tzLabel(e.timeZone), () => setSub("tz"), `시간대 ${tzLabel(e.timeZone)}`) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
          <Sparkles size={22} color={e.important ? glow : c.textMuted} />
          <AppText variant="bodyLg" style={{ flex: 1 }}>중요한 일정으로 강조</AppText>
          <Toggle value={!!e.important} label="중요한 일정으로 강조" onChange={(important) => put({ important })} />
        </View>
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 8 }} />
        {!DESIGN_TRIAL ? row(icon(Bell), alarmLabel(e.alarmMinutes), () => setSub("alarm"), `알림 ${alarmLabel(e.alarmMinutes)}`) : (
          // 알림 여러 개 (user, 2026-11-23, like Google): each alarm, a cross to take it off, and 알림 추가
          <View>
            {alarms.map((m, i) => (
              <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
                {i === 0 ? icon(Bell) : <View style={{ width: 22 }} />}
                <Pressable onPress={() => { setAlarmSlot(i); setSub("alarm"); }} accessibilityRole="button" accessibilityLabel={`알림 ${alarmLabel(m)} 바꾸기`} style={{ flex: 1, paddingVertical: 12 }}>
                  <AppText variant="bodyLg">{alarmLabel(m)}</AppText>
                </Pressable>
                <Pressable onPress={() => setAlarms(alarms.filter((_, j) => j !== i))} hitSlop={10} accessibilityRole="button" accessibilityLabel={`알림 ${alarmLabel(m)} 빼기`}>
                  <X size={20} color={c.textMuted} />
                </Pressable>
              </View>
            ))}
            {alarms.length < 5 ? row(alarms.length ? <View style={{ width: 22 }} /> : icon(Bell), "알림 추가", () => { setAlarmSlot(-1); setSub("alarm"); }, "알림 추가") : null}
          </View>
        )}
        {DESIGN_TRIAL ? row(icon(Repeat), repeatLabel(e.repeat, e.startDate), () => setSub("repeat"), `반복 ${repeatLabel(e.repeat, e.startDate)}`) : null}
        {DESIGN_TRIAL && (prefs.googleLinked || e.googleCalendarId) ? row(icon(CalendarDays), googleLabel, () => setSub("google"), `올릴 곳 ${googleLabel}`) : null}
        {DESIGN_TRIAL ? row(icon(Tag), catLabel, () => setSub("category"), `일정 카테고리 ${catLabel}`) : null}
        {row(<View style={{ width: 22, alignItems: "center" }}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: e.color }} /></View>, "색", () => setSub("color"), "색 고르기")}
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 8 }} />
        {/* 장소 (user, 2026-11-23: what Google has, editable here too) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
          {icon(MapPin)}
          <TextInput key={`loc${formKey}`} defaultValue={e.location ?? ""} onChangeText={(location) => put({ location })} placeholder="장소 추가" placeholderTextColor={c.textPlaceholder}
            accessibilityLabel="장소" maxLength={500} style={{ flex: 1, outlineStyle: "none" as never, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, color: c.text, paddingVertical: 10 }} />
        </View>
        {/* 참석자 · 화상 회의 (Google's guests and Meet; only for an event kept in a Google calendar) */}
        {DESIGN_TRIAL && e.googleCalendarId ? row(icon(Users), guests.length ? `참석자 ${guests.length}명` : "사용자 추가", () => setSub("guests"), guests.length ? `참석자 ${guests.length}명` : "사용자 추가") : null}
        {meetState === "on" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
            <Video size={22} color={c.info} />
            <Pressable onPress={() => Linking.openURL(e.meetLink!)} accessibilityRole="button" accessibilityLabel="화상 회의 참여" style={{ flex: 1, paddingVertical: 12 }}>
              <AppText variant="bodyLg" raw={c.info}>화상 회의 참여</AppText>
            </Pressable>
            {DESIGN_TRIAL && e.googleCalendarId ? (
              <Pressable onPress={() => put({ meetLink: "" })} hitSlop={10} accessibilityRole="button" accessibilityLabel="화상 회의 빼기"><X size={20} color={c.textMuted} /></Pressable>
            ) : null}
          </View>
        ) : DESIGN_TRIAL && e.googleCalendarId ? (
          meetState === "new" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 50 }}>
              {icon(Video)}
              <AppText variant="bodyLg" style={{ flex: 1 }}>저장하면 Google Meet 회의가 만들어져요</AppText>
              <Pressable onPress={() => put({ meetLink: e.id ? "" : undefined })} hitSlop={10} accessibilityRole="button" accessibilityLabel="화상 회의 추가 취소"><X size={20} color={c.textMuted} /></Pressable>
            </View>
          ) : row(icon(Video), "Google Meet 화상 회의 추가", () => put({ meetLink: "new" }), "화상 회의 추가")
        ) : null}
        {(e.attachments ?? []).map((a) => row(<Paperclip size={22} color={c.textMuted} />, a.title, () => Linking.openURL(a.url), `첨부파일 ${a.title} 열기`))}
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
  const readOnly = !!e && isReadOnlyEvent(e, prefs.googleReadOnlyCalendarIds);
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
      {alarmsOf(e).length ? (
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center", minHeight: 40 }}><Bell size={20} color={c.textMuted} /><AppText variant="body" style={{ flex: 1 }}>{alarmsOf(e).map(alarmLabel).join(", ")}</AppText></View>
      ) : null}
      {e.attendees?.length ? (
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center", minHeight: 40 }}><Users size={20} color={c.textMuted} /><AppText variant="body" style={{ flex: 1 }}>{`참석자 ${e.attendees.length}명`}</AppText></View>
      ) : null}
      {e.memo ? (
        <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 8 }}><FileText size={20} color={c.textMuted} /><AppText variant="body" style={{ flex: 1 }}>{e.memo}</AppText></View>
      ) : null}
      {readOnly ? (
        <AppText variant="small" color="textMuted" style={{ marginTop: 12 }}>보기만 할 수 있는 구글 캘린더의 일정이에요</AppText>
      ) : (
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <TileButton label="수정하기" icon={<Pencil size={28} color={c.menuEdit} />} onPress={() => onEdit(e)} />
        <TileButton label={e.important ? "강조 해제" : "강조"} icon={<Sparkles size={28} color={glow} />} onPress={() => notice(toggleEventImportant(e.id) ? "중요한 일정으로 강조했어요" : "강조를 풀었어요")} />
        <TileButton label="삭제하기" icon={<Trash2 size={28} color={c.menuDelete} />} onPress={() => { if (e.seriesId) setRemoving(true); else { deleteEvent(e.id); onClose(); notice("일정을 지웠어요"); } }} />
      </View>
      )}
      <EventDeleteDialog event={removing ? e : null} onClose={() => setRemoving(false)} onDone={(m) => { setRemoving(false); onClose(); notice(m); }} />
    </BottomSheet>
  );
}

