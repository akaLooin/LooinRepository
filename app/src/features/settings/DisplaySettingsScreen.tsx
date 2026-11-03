import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, BottomSheet, Button, RadioList, ScreenHeader, Toggle, ToggleRow, ValueRow } from "../../components";
import { setPref, usePrefs, type Prefs } from "../../data/prefs";
import { tokens, useTheme } from "../../theme";

const THEME: Record<Prefs["theme"], string> = { system: "시스템", dark: "다크", light: "라이트" };
const SORT: Record<Prefs["todoSort"], string> = { done_last: "완료 여부 순", manual: "추가한 순" };

/** A row for an option the original has but this clone does not support yet: visible, clearly marked, not interactive. */
function Later({ title, value }: { title: string; value?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ minHeight: 60, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: c.divider, opacity: 0.45 }} accessibilityState={{ disabled: true }}>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      {value ? <AppText variant="bodyLg">{value}</AppText> : <Toggle value={false} onChange={() => {}} disabled label={title} />}
      <AppText variant="helper" color="textMuted" style={{ marginLeft: 10 }}>준비 중</AppText>
    </View>
  );
}

/** S12d. */
export function DisplaySettingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePrefs();
  const [sheet, setSheet] = useState<null | "theme" | "sort">(null);
  const [draftTheme, setDraftTheme] = useState(p.theme);
  const [draftSort, setDraftSort] = useState(p.todoSort);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="화면" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>
        <ToggleRow title="달력에서 일요일부터 시작" value={p.weekStartsSunday} onChange={(v) => setPref("weekStartsSunday", v)} />
        <Later title="할 일을 상단에서 입력" />
        <Later title="피드에서 좋아요 보이기" />
        <ToggleRow title="시간을 24시간제로 표시" value={p.use24h} onChange={(v) => setPref("use24h", v)} />
        <Later title="카테고리 접기 펼치기" />
        <ToggleRow title="할 일 텍스트 작게 보기" value={p.smallTodoText} onChange={(v) => setPref("smallTodoText", v)} />
        <Later title="할 일 사진 작게 보기" />
        <ToggleRow title="할 일 메모 작게 보기" value={p.smallTodoMemo} onChange={(v) => setPref("smallTodoMemo", v)} />
        <ToggleRow title="할 일 더블 탭으로 편집" value={p.doubleTapToEdit} onChange={(v) => setPref("doubleTapToEdit", v)} />
        <ValueRow title="테마" value={THEME[p.theme]} onPress={() => { setDraftTheme(p.theme); setSheet("theme"); }} />
        <Later title="언어" value="한국어" />
        <Later title="폰트" value="기본" />
        <Later title="피드에서 메모 줄 제한" value="무제한" />
        <ValueRow title="할 일 정렬" value={SORT[p.todoSort]} onPress={() => { setDraftSort(p.todoSort); setSheet("sort"); }} />
        <Later title="월별 할 일 캘린더의 최대 항목 개수" value="10" />
        <Later title="주별 할 일 캘린더의 최대 항목 개수" value="무제한" />
        <Later title="할 일 캘린더에서 표시할 카테고리" value="2" />
      </ScrollView>
      <BottomSheet visible={sheet === "theme"} onClose={() => setSheet(null)} title="테마">
        <RadioList value={draftTheme} onChange={setDraftTheme} options={(Object.keys(THEME) as Prefs["theme"][]).map((v) => ({ value: v, label: THEME[v] }))} />
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("theme", draftTheme); setSheet(null); }} /></View>
      </BottomSheet>
      <BottomSheet visible={sheet === "sort"} onClose={() => setSheet(null)} title="할 일 정렬">
        <RadioList value={draftSort} onChange={setDraftSort} options={(Object.keys(SORT) as Prefs["todoSort"][]).map((v) => ({ value: v, label: SORT[v] }))} />
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("todoSort", draftSort); setSheet(null); }} /></View>
      </BottomSheet>
    </View>
  );
}
