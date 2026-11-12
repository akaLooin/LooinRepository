import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import {
  AppText, BottomSheet, Button, FieldGroup, FieldRow, MemoInput, RadioList, ScreenHeader, TimeGrid, TitleInput, Toggle,
} from "../../components";
import { deleteRoutine, saveRoutine, useDB } from "../../data/store";
import { addDays, parseDay, today, weekday, type Day } from "../../lib/dates";
import { ruleLabel, type RepeatRule, type RepeatType } from "../../lib/routines";
import { fontFamily, ScaledRoot, tokens, useTheme, visibleOn } from "../../theme";
import { DatePickSheet } from "../home/TodoSheets";

const TYPES: { value: RepeatType; label: string }[] = [
  { value: "daily", label: "매일" }, { value: "interval", label: "간격" }, { value: "weekly", label: "매주" },
  { value: "biweekly", label: "격주" }, { value: "monthly", label: "매월" }, { value: "yearly", label: "매년" },
];
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const fmt = (d: Day) => { const { y, m, d: dd } = parseDay(d); return `${y}. ${m}. ${dd}.`; };

type Sheet = null | "start" | "end" | "time" | "repeat" | "delete";

/** S07b. `id` = "new" with ?category= to create. */
export function RoutineEditScreen() {
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const existing = useDB((d) => d.routines.find((r) => r.id === id));
  const categoryId = existing?.categoryId ?? category ?? "";
  const cat = useDB((d) => d.categories.find((x) => x.id === categoryId));

  const [title, setTitle] = useState(existing?.title ?? "");
  const [startDate, setStart] = useState<Day>(existing?.startDate ?? today());
  const [endDate, setEnd] = useState<Day | undefined>(existing?.endDate);
  const [rule, setRule] = useState<RepeatRule>(existing ?? { repeatType: "daily" });
  const [time, setTime] = useState<string | undefined>(existing?.timeOfDay);
  const [memo, setMemo] = useState(existing?.memo ?? "");
  const [manualAdd, setManual] = useState(existing?.manualAdd ?? false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState<string>();
  const [draftTime, setDraftTime] = useState({ h: 9, m: 0 });

  const color = visibleOn(cat?.color ?? c.text, c.bg, c.text);
  const save = () => {
    if (!title.trim()) return setError("이름을 입력해 주세요");
    if (!cat) return setError("카테고리를 찾을 수 없어요");
    saveRoutine({ id: existing?.id, categoryId, title: title.trim(), startDate, endDate, ...rule, timeOfDay: time, memo, manualAdd });
    goBack("/routines");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="루틴" onBack={() => goBack("/routines")} right={{ label: "확인", onPress: save }} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, paddingTop: 6, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TitleInput value={title} onChangeText={(s) => { setTitle(s); setError(undefined); }} placeholder="루틴 이름" underline={color} error={error} autoFocus={!existing} />
        <View style={{ height: 0 }} />
        <FieldGroup>
          <FieldRow title="시작 날짜" value={fmt(startDate)} onPress={() => setSheet("start")} />
          <FieldRow title="종료 날짜 없음" right={<Toggle value={!endDate} label="종료 날짜 없음"
            onChange={(none) => setEnd(none ? undefined : addDays(startDate, 30))} />} />
          {endDate ? <FieldRow title="종료 날짜" value={fmt(endDate)} onPress={() => setSheet("end")} /> : null}
        </FieldGroup>
        <FieldGroup><FieldRow title="반복" value={ruleLabel(rule)} onPress={() => setSheet("repeat")} /></FieldGroup>
        <FieldGroup><FieldRow title="시간" value={time ?? "없음"} onPress={() => { const [h, m] = (time ?? "09:00").split(":").map(Number); setDraftTime({ h, m }); setSheet("time"); }} /></FieldGroup>
        <MemoInput value={memo} onChangeText={setMemo} placeholder="메모" />
        <FieldGroup><FieldRow title="수동으로 할 일 추가" right={<Toggle value={manualAdd} onChange={setManual} label="수동으로 할 일 추가" />} /></FieldGroup>
        <AppText variant="helper" color="textMuted">켜면 홈에 자동으로 나타나지 않고, 할 일을 추가할 때 이 루틴을 골라 넣을 수 있어요.</AppText>
        {existing ? <View style={{ marginTop: 8 }}><Button kind="danger" label="삭제" onPress={() => setSheet("delete")} /></View> : null}
      </ScrollView>

      {sheet === "start" ? <DatePickSheet title="시작 날짜" initial={startDate} onClose={() => setSheet(null)} onPick={(d) => { setStart(d); if (endDate && endDate < d) setEnd(undefined); setSheet(null); }} /> : null}
      {sheet === "end" ? (
        <DatePickSheet title="종료 날짜" initial={endDate ?? startDate} onClose={() => setSheet(null)}
          onPick={(d) => { setEnd(d < startDate ? startDate : d); setSheet(null); }} onClear={() => { setEnd(undefined); setSheet(null); }} />
      ) : null}

      <BottomSheet visible={sheet === "time"} onClose={() => setSheet(null)} title="시간 설정">
        <TimeGrid hour={draftTime.h} minute={draftTime.m} onChange={(h, m) => setDraftTime({ h, m })} />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <Button kind="sheetBlock" flex label="없음" onPress={() => { setTime(undefined); setSheet(null); }} />
          <Button kind="sheetBlock" flex label="완료" onPress={() => { setTime(`${String(draftTime.h).padStart(2, "0")}:${String(draftTime.m).padStart(2, "0")}`); setSheet(null); }} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === "delete"} onClose={() => setSheet(null)} title="루틴 삭제">
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>앞으로의 반복만 사라지고, 이미 한 기록은 남아요.</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setSheet(null)} />
          <Button kind="danger" flex label="삭제" onPress={() => { if (existing) deleteRoutine(existing.id); setSheet(null); goBack("/routines"); }} />
        </View>
      </BottomSheet>

      {sheet === "repeat" ? <RepeatScreen rule={rule} startDate={startDate} onDone={(r) => { setRule(r); setSheet(null); }} onBack={() => setSheet(null)} /> : null}
    </View>
  );
}

/** S07c as a full-screen page: the type list, then the details that type needs. */
function RepeatScreen({ rule, startDate, onDone, onBack }: { rule: RepeatRule; startDate: Day; onDone: (r: RepeatRule) => void; onBack: () => void }) {
  const { c } = useTheme();
  const insets = useInsets();
  const s = parseDay(startDate);
  const [r, setR] = useState<RepeatRule>(rule);
  const setType = (t: RepeatType) =>
    setR({
      repeatType: t,
      intervalDays: t === "interval" ? r.intervalDays ?? 2 : undefined,
      weekdays: t === "weekly" || t === "biweekly" ? (r.weekdays?.length ? r.weekdays : [weekday(startDate)]) : undefined,
      monthDays: t === "monthly" ? (r.monthDays?.length ? r.monthDays : [s.d]) : undefined,
      yearMonth: t === "yearly" ? r.yearMonth ?? s.m : undefined,
      yearDay: t === "yearly" ? r.yearDay ?? s.d : undefined,
    });
  const toggleIn = (xs: number[] = [], x: number) => (xs.includes(x) ? (xs.length > 1 ? xs.filter((v) => v !== x) : xs) : [...xs, x]);
  const chip = (label: string, on: boolean, onPress: () => void, w = 44) => (
    <Pressable key={label} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ width: w, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.selectedBg : c.surfaceRow }}>
      <AppText variant="body" weight={600} color={on ? "onSelected" : "text"}>{label}</AppText>
    </Pressable>
  );
  return (
    <Modal visible animationType="slide" onRequestClose={onBack}>
      <ScaledRoot>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <ScreenHeader title="반복" onBack={onBack} right={{ label: "완료", onPress: () => onDone(r) }} />
        <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 20, paddingBottom: 40 }}>
          <RadioList options={TYPES} value={r.repeatType} onChange={setType} />
          {r.repeatType === "interval" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TextInput
                value={String(r.intervalDays ?? 2)}
                onChangeText={(v) => setR({ ...r, intervalDays: Math.max(2, Math.min(365, Number(v.replace(/\D/g, "")) || 2)) })}
                keyboardType="number-pad"
                accessibilityLabel="며칠마다"
                style={{ width: 80, height: 48, borderRadius: tokens.radius.md, backgroundColor: c.surfaceInput, color: c.text, textAlign: "center", fontFamily: fontFamily(600), fontSize: tokens.type.bodyLg.size }}
              />
              <AppText variant="bodyLg">일마다</AppText>
            </View>
          ) : null}
          {r.repeatType === "weekly" || r.repeatType === "biweekly" ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {WD.map((w, i) => chip(w, !!r.weekdays?.includes(i), () => setR({ ...r, weekdays: toggleIn(r.weekdays, i) })))}
            </View>
          ) : null}
          {r.repeatType === "monthly" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => chip(String(d), !!r.monthDays?.includes(d), () => setR({ ...r, monthDays: toggleIn(r.monthDays, d) })))}
            </View>
          ) : null}
          {r.repeatType === "yearly" ? <AppText variant="bodyLg">{`매년 ${r.yearMonth}월 ${r.yearDay}일 (시작 날짜 기준)`}</AppText> : null}
          <AppText variant="helper" color="textMuted">{`미리 보기: ${ruleLabel(r)}`}</AppText>
        </ScrollView>
      </View>
      </ScaledRoot>
    </Modal>
  );
}
