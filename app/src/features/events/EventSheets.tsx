import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import {
  AppText, BottomSheet, Bell, Button, Calendar, Check, ChevronLeft, ChevronRight, Clock, ColorCodeInput, FileText, MemoInput, Pencil, PillButton,
  PRESET_COLORS, TileButton, TimeGrid, Toggle, Trash2, X,
} from "../../components";
import { usePrefs } from "../../data/prefs";
import { deleteEvent, saveEvent, useDB } from "../../data/store";
import { addDays, daysBetween, parseDay, today, WEEKDAY_LABELS, weekday, type Day } from "../../lib/dates";
import { ALARM_CHOICES, alarmLabel, clock, eventProblem, eventTimeLabel, fromMinutes, toMinutes, type CalEvent } from "../../lib/events";
import { fontFamily, onColor, tokens, useTheme } from "../../theme";

export type EventDraft = Omit<CalEvent, "id"> & { id?: string };

export const dayLabel = (d: Day) => { const { m, d: dd } = parseDay(d); return `${m}월 ${dd}일 (${WEEKDAY_LABELS[weekday(d)]})`; };

/** A new event's starting values: one hour from `startTime`, the last colour used. */
export function newDraft(day: Day, startTime: string, endTime: string, color: string): EventDraft {
  return { title: "", startDate: day, endDate: day, allDay: false, startTime, endTime, color, memo: "", alarmMinutes: null }; // 알림 없음 by default (user)
}

type Sub = "form" | "startDate" | "endDate" | "startTime" | "endTime" | "color" | "alarm";

/**
 * Add or change an 일정 (user's feature; the flow follows the user's screen recording of a calendar app: tap an hour,
 * type a title, 저장). One sheet: the title and the times on top, the rest below; dates, times, colour and alarm open
 * in the same sheet.
 */
export function EventEditor({ draft, onClose, onSaved }: { draft: EventDraft | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const categories = useDB((d) => d.categories);
  const [e, setE] = useState<EventDraft | null>(draft);
  const [sub, setSub] = useState<Sub>("form");
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => { setE(draft); setSub("form"); setProblem(null); }, [draft]);
  if (!e) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const put = (patch: Partial<EventDraft>) => { setProblem(null); setE((x) => (x ? { ...x, ...patch } : x)); };
  const save = () => {
    const p = eventProblem(e);
    if (p) { setProblem(p); return; }
    saveEvent({ ...e, title: e.title.trim(), memo: e.memo.trim() });
    onSaved(`${dayLabel(e.startDate)}에 '${e.title.trim()}'을(를) 저장했어요`);
  };
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
        <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="일정 저장"
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
  } else if (sub === "color") {
    body = (
      <View style={{ gap: 18 }}>
        <AppText variant="bodyLg" weight={700}>색</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {colors.map((col) => (
            <Pressable key={col} onPress={() => put({ color: col })} accessibilityRole="radio" accessibilityState={{ checked: e.color.toUpperCase() === col }} accessibilityLabel={`색 ${col}`}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: col, alignItems: "center", justifyContent: "center" }}>
              {e.color.toUpperCase() === col ? <Check size={20} color={onColor(col)} strokeWidth={3} /> : null}
            </Pressable>
          ))}
        </View>
        <ColorCodeInput value={e.color} onChange={(hex) => put({ color: hex })} />
        <Button kind="sheetPrimary" label="완료" onPress={back} />
      </View>
    );
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
        <TextInput value={e.title} onChangeText={(title) => put({ title })} placeholder="제목 추가" placeholderTextColor={c.textPlaceholder} autoFocus={!e.id}
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
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 8 }} />
        {row(icon(Bell), alarmLabel(e.alarmMinutes), () => setSub("alarm"), `알림 ${alarmLabel(e.alarmMinutes)}`)}
        {row(<View style={{ width: 22, alignItems: "center" }}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: e.color }} /></View>, "색", () => setSub("color"), "색 고르기")}
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 8 }} />
        <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingTop: 6 }}>
          <View style={{ paddingTop: 12 }}>{icon(FileText)}</View>
          <View style={{ flex: 1 }}><MemoInput value={e.memo} onChangeText={(memo) => put({ memo })} placeholder="설명 추가" /></View>
        </View>
      </ScrollView>
    );
  }

  return (
    // the phone's back button steps back: a date, time, colour or alarm page returns to the form (the keyboard closes
    // on its own first), and only the form closes the sheet (user)
    <BottomSheet visible={!!draft} onClose={onClose} onBack={sub === "form" ? onClose : back}>
      {header}
      {body}
    </BottomSheet>
  );
}

/** A month to pick a day from (inside the editor sheet). */
function DayPicker({ initial, min, onPick }: { initial: Day; min?: Day; onPick: (d: Day) => void }) {
  const { c } = useTheme();
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
  const prefs = usePrefs();
  const e = useDB((d) => d.events.find((x) => x.id === id));
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
        <TileButton label="삭제하기" icon={<Trash2 size={28} color={c.menuDelete} />} onPress={() => { deleteEvent(e.id); onClose(); notice("일정을 지웠어요"); }} />
      </View>
    </BottomSheet>
  );
}

