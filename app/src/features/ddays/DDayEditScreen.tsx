import { useInsets } from "../../theme";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  AppText, BottomSheet, Button, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FieldGroup, FieldRow, PillButton, RadioList, ScreenHeader, TitleInput, Toggle,
} from "../../components";
import { ddayLabel, deleteDDay, saveDDay, useDB, type DDay } from "../../data/store";
import { parseDay, today, weekday, type Day } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";

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
  const [open, setOpen] = useState(true);
  const [ym, setYm] = useState(() => ({ y: parseDay(date).y, m: parseDay(date).m }));
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);

  const shift = (n: number) => setYm(({ y, m }) => { const t = m + n; return { y: y + Math.floor((t - 1) / 12), m: ((t - 1 + 120) % 12) + 1 }; });
  const save = () => {
    if (!title.trim()) return setError("이름을 입력해 주세요");
    saveDDay({ id: existing?.id, title: title.trim(), type, repeatUnit: type === "repeat" ? unit : undefined, targetDate: date, isPrivate });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="디데이" onBack={() => router.back()} right={{ label: "완료", onPress: save }} />
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
        <AppText variant="body" color="textSecondary">{`오늘 기준 ${ddayLabel({ type, targetDate: date, repeatUnit: unit })}`}</AppText>
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
          <Button kind="danger" flex label="삭제" onPress={() => { if (existing) deleteDDay(existing.id); setConfirm(false); router.back(); }} />
        </View>
      </BottomSheet>
    </View>
  );
}
