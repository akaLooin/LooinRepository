import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  AppText, BottomSheet, Button, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FieldGroup, FieldRow, PillButton, RadioList, ScreenHeader, TitleInput, Toggle,
} from "../../components";
import { ddayLabel, deleteDDay, saveDDay, useDB, type DDay } from "../../data/store";
import { parseDay, today, weekday, type Day } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";
import { DESIGN_TRIAL } from "../../lib/variant";
import { DatePickSheet } from "../home/TodoSheets";

const WD = "일월화수목금토";
const long = (d: Day) => { const { y, m, d: dd } = parseDay(d); return `${y}년 ${m}월 ${dd}일 (${WD[weekday(d)]})`; };

/** S21b. id = "new" to create. */
export function DDayEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const existing = useDB((d) => d.ddays.find((x) => x.id === id));
  const [title, setTitle] = useState(existing?.title ?? "");
  const [type, setType] = useState<DDay["type"]>(existing?.type ?? "fixed");
  const [unit, setUnit] = useState<NonNullable<DDay["repeatUnit"]>>(existing?.repeatUnit ?? "yearly");
  const [date, setDate] = useState<Day>(existing?.targetDate ?? today());
  const [isPrivate, setPrivate] = useState(existing?.isPrivate ?? false);
  const [includeToday, setIncludeToday] = useState(existing?.includeToday ?? false);
  const [open, setOpen] = useState(true);
  const [ym, setYm] = useState(() => ({ y: parseDay(date).y, m: parseDay(date).m }));
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [picking, setPicking] = useState(false);

  const shift = (n: number) => setYm(({ y, m }) => { const t = m + n; return { y: y + Math.floor((t - 1) / 12), m: ((t - 1 + 120) % 12) + 1 }; });
  const save = () => {
    if (!title.trim()) return setError("이름을 입력해 주세요");
    saveDDay({ id: existing?.id, title: title.trim(), type, repeatUnit: type === "repeat" ? unit : undefined, targetDate: date, isPrivate,
      ...(includeToday || existing?.includeToday !== undefined ? { includeToday } : {}) });
    goBack("/ddays");
  };

  // 메인 앱 (user, 2026-11-23: not the original's 타입 radio list and unfolding date row): a big preview of the count
  // (tap it to pick the date), one switch for how it repeats, and option chips
  const kind = type === "fixed" ? "once" : unit;
  const setKind = (k: "once" | "yearly" | "monthly") => { if (k === "once") setType("fixed"); else { setType("repeat"); setUnit(k); } };
  const chip = (on: boolean, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, borderColor: on ? c.text : c.surfaceStrong, backgroundColor: on ? c.surfaceStrong : "transparent" }}>
      {on ? <Check size={15} color={c.text} strokeWidth={3} /> : null}
      <AppText variant="helper" weight={on ? 700 : 500} color={on ? "text" : "textSecondary"}>{label}</AppText>
    </Pressable>
  );
  if (DESIGN_TRIAL) return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="디데이" onBack={() => goBack("/ddays")} right={{ label: "저장", onPress: save }} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, paddingTop: 6, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TitleInput value={title} onChangeText={(s) => { setTitle(s); setError(undefined); }} placeholder="무슨 날인가요?" error={error} autoFocus={!existing} />
        <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`${ddayLabel({ type, targetDate: date, repeatUnit: unit, includeToday })}, ${long(date)}, 날짜 바꾸기`}
          style={{ alignItems: "center", paddingVertical: 22, gap: 6, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
          <AppText variant="bodyLg" weight={800} color="dday" style={{ fontSize: 40, lineHeight: 48 }}>{ddayLabel({ type, targetDate: date, repeatUnit: unit, includeToday })}</AppText>
          <AppText variant="body" weight={600}>{long(date)}</AppText>
          <AppText variant="small" color="textMuted">눌러서 날짜 바꾸기</AppText>
        </Pressable>
        <View style={{ flexDirection: "row", padding: 3, borderRadius: 12, backgroundColor: c.surface }} role="radiogroup">
          {([["once", "한 번"], ["yearly", "매년"], ["monthly", "매월"]] as const).map(([k, label]) => (
            <Pressable key={k} onPress={() => setKind(k)} role="radio" aria-checked={kind === k} accessibilityLabel={label}
              style={{ flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: kind === k ? c.surfaceStrong : "transparent" }}>
              <AppText variant="helper" weight={kind === k ? 800 : 500} color={kind === k ? "text" : "textMuted"}>{label}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {chip(includeToday, "그날을 1일로 세기", () => setIncludeToday(!includeToday))}
          {chip(isPrivate, "나만 보기", () => setPrivate(!isPrivate))}
        </View>
        <AppText variant="small" color="textMuted">그날을 1일로 세면 시작한 날부터 며칠째인지 셀 수 있어요. 나만 보기는 친구에게 숨겨요.</AppText>
        {existing ? (
          <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" accessibilityLabel="디데이 지우기"
            style={{ height: 46, marginTop: 10, borderRadius: 23, borderWidth: 1, borderColor: c.danger, alignItems: "center", justifyContent: "center" }}>
            <AppText variant="body" weight={700} color="danger">디데이 지우기</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
      {picking ? <DatePickSheet title="날짜 고르기" initial={date} onClose={() => setPicking(false)} onPick={(d) => { setDate(d); setPicking(false); }} /> : null}
      <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="디데이 지우기">
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>{`'${existing?.title ?? ""}'을 지울까요?`}</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setConfirm(false)} />
          <Button kind="danger" flex label="지우기" onPress={() => { if (existing) deleteDDay(existing.id); setConfirm(false); goBack("/ddays"); }} />
        </View>
      </BottomSheet>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="디데이" onBack={() => goBack("/ddays")} right={{ label: "완료", onPress: save }} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, paddingTop: 6, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TitleInput value={title} onChangeText={(s) => { setTitle(s); setError(undefined); }} placeholder="디데이 이름" error={error} autoFocus={!existing} />
        <AppText variant="bodyLg" weight={700} style={{ marginTop: 10 }}>타입</AppText>
        <RadioList value={type} onChange={setType} options={[{ value: "fixed", label: "고정 날짜" }, { value: "repeat", label: "반복" }]} />
        {type === "repeat" ? (
          <RadioList value={unit} onChange={setUnit} options={[{ value: "yearly", label: "매년 (생일, 기념일)" }, { value: "monthly", label: "매월 (월급날 등)" }]} />
        ) : null}
        <AppText variant="bodyLg" weight={700} style={{ marginTop: 10 }}>상세 설정</AppText>
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`날짜, ${long(date)}`}
          style={{ height: 64, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceInput, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10 }}>
          <AppText variant="bodyLg" style={{ flex: 1 }}>날짜</AppText>
          <AppText variant="bodyLg" weight={700}>{long(date)}</AppText>
          {open ? <ChevronUp size={20} color={c.text} /> : <ChevronDown size={20} color={c.text} />}
        </Pressable>
        {open ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <AppText variant="bodyLg" weight={700} style={{ flex: 1 }}>{`${ym.y}년 ${ym.m}월`}</AppText>
              <PillButton round onPress={() => shift(-1)} a11y="이전 달"><ChevronLeft size={20} color={c.text} /></PillButton>
              <View style={{ width: 8 }} />
              <PillButton round onPress={() => shift(1)} a11y="다음 달"><ChevronRight size={20} color={c.text} /></PillButton>
            </View>
            <Calendar picker year={ym.y} month={ym.m} today={today()} selected={date} onSelect={setDate} />
          </View>
        ) : null}
        <AppText variant="body" color="textSecondary">{`오늘 기준 ${ddayLabel({ type, targetDate: date, repeatUnit: unit, includeToday })}`}</AppText>
        <FieldGroup>
          <FieldRow title="당일 포함" right={<Toggle value={includeToday} onChange={setIncludeToday} label="당일 포함" />} />
        </FieldGroup>
        <AppText variant="helper" color="textMuted">켜면 그날을 1일로 세요. 시작한 날부터 며칠째인지 셀 때 써요 (그날 D+1).</AppText>
        <FieldGroup>
          <FieldRow title="나만 보기" right={<Toggle value={isPrivate} onChange={setPrivate} label="나만 보기" />} />
        </FieldGroup>
        <AppText variant="helper" color="textMuted">나만 보기로 두면 친구에게 보이지 않아요.</AppText>
        {existing ? (
          <View style={{ marginTop: 8 }}>
            <Button kind="danger" label="삭제" onPress={() => setConfirm(true)} />
          </View>
        ) : null}
      </ScrollView>
      <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="디데이 삭제">
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>{`'${existing?.title ?? ""}'을 지울까요?`}</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setConfirm(false)} />
          <Button kind="danger" flex label="삭제" onPress={() => { if (existing) deleteDDay(existing.id); setConfirm(false); goBack("/ddays"); }} />
        </View>
      </BottomSheet>
    </View>
  );
}
