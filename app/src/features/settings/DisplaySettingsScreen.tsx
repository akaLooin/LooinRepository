import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { AppText, BottomSheet, Button, RadioList, ScreenHeader, Toggle, ToggleRow, ValueRow } from "../../components";
import { setPref, usePrefs, type Prefs } from "../../data/prefs";
import { DESIGN_WIDTH, tokens, useDesignScale, useTheme } from "../../theme";

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
  const insets = useInsets();
  const p = usePrefs();
  const [sheet, setSheet] = useState<null | "theme" | "sort" | "scale">(null);
  const { width } = useWindowDimensions();
  const scale = useDesignScale();
  const [draftScale, setDraftScale] = useState<string>(String(p.uiScale));
  const SCALES = ["auto", "0.85", "0.9", "0.95", "1"];
  const scaleLabel = (v: string) => (v === "auto" ? `자동 (${Math.round(Math.min(1, Math.max(0.8, width / DESIGN_WIDTH)) * 100)}%)` : `${Math.round(Number(v) * 100)}%`);
  const [draftTheme, setDraftTheme] = useState(p.theme);
  const [draftSort, setDraftSort] = useState(p.todoSort);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="화면" onBack={() => goBack("/settings")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>
        <ToggleRow title="달력에서 일요일부터 시작" value={p.weekStartsSunday} onChange={(v) => setPref("weekStartsSunday", v)} />
        <ToggleRow title="할 일을 상단에서 입력" value={p.inputAtTop} onChange={(v) => setPref("inputAtTop", v)} />
        <ToggleRow title="피드에서 좋아요 보이기" value={p.showLikesInFeed} onChange={(v) => setPref("showLikesInFeed", v)} />
        <ToggleRow title="시간을 24시간제로 표시" value={p.use24h} onChange={(v) => setPref("use24h", v)} />
        <ToggleRow title="카테고리 접기 펼치기" value={p.collapsibleCategories} onChange={(v) => setPref("collapsibleCategories", v)} />
        <ToggleRow title="할 일 텍스트 작게 보기" value={p.smallTodoText} onChange={(v) => setPref("smallTodoText", v)} />
        <ToggleRow title="할 일 사진 작게 보기" value={p.smallTodoPhoto} onChange={(v) => setPref("smallTodoPhoto", v)} />
        <ToggleRow title="할 일 메모 작게 보기" value={p.smallTodoMemo} onChange={(v) => setPref("smallTodoMemo", v)} />
        <ToggleRow title="할 일 더블 탭으로 편집" value={p.doubleTapToEdit} onChange={(v) => setPref("doubleTapToEdit", v)} />
        <ValueRow title="테마" value={THEME[p.theme]} onPress={() => { setDraftTheme(p.theme); setSheet("theme"); }} />
        <Later title="언어" value="한국어" />
        <Later title="폰트" value="기본" />
        <Later title="피드에서 메모 줄 제한" value="무제한" />
        <ValueRow title="할 일 정렬" value={SORT[p.todoSort]} onPress={() => { setDraftSort(p.todoSort); setSheet("sort"); }} />
        <Later title="월별 할 일 캘린더의 최대 항목 개수" value="10" />
        <Later title="주별 할 일 캘린더의 최대 항목 개수" value="무제한" />
        <ValueRow title="할 일 캘린더에서 표시할 카테고리" value={String(p.calendarCategoryCount)} onPress={() => setPref("calendarCategoryCount", (p.calendarCategoryCount % 4) + 1)} />
        {/* not in the original: added for this app */}
        <ValueRow title="체크 표시 색" value={p.checkColor === "black" ? "검은색" : "하얀색"} onPress={() => setPref("checkColor", p.checkColor === "black" ? "white" : "black")} />
        <ValueRow title="화면 크기" value={scaleLabel(String(p.uiScale))} onPress={() => { setDraftScale(String(p.uiScale)); setSheet("scale"); }} divider={false} />
      </ScrollView>
      <BottomSheet visible={sheet === "theme"} onClose={() => setSheet(null)} title="테마">
        <RadioList value={draftTheme} onChange={setDraftTheme} options={(Object.keys(THEME) as Prefs["theme"][]).map((v) => ({ value: v, label: THEME[v] }))} />
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("theme", draftTheme); setSheet(null); }} /></View>
      </BottomSheet>
      <BottomSheet visible={sheet === "scale"} onClose={() => setSheet(null)} title="화면 크기">
        <RadioList value={draftScale} onChange={setDraftScale} options={SCALES.map((v) => ({ value: v, label: scaleLabel(v) }))} />
        <AppText variant="helper" color="textMuted" style={{ marginTop: 12 }}>
          {`이 폰의 화면 폭: ${Math.round(width)}dp · 지금 배율 ${Math.round(scale * 100)}%. 글자와 아이콘이 원본보다 크거나 작으면 바꿔 보세요.`}
        </AppText>
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("uiScale", draftScale === "auto" ? "auto" : Number(draftScale)); setSheet(null); }} /></View>
      </BottomSheet>
      <BottomSheet visible={sheet === "sort"} onClose={() => setSheet(null)} title="할 일 정렬">
        <RadioList value={draftSort} onChange={setDraftSort} options={(Object.keys(SORT) as Prefs["todoSort"][]).map((v) => ({ value: v, label: SORT[v] }))} />
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("todoSort", draftSort); setSheet(null); }} /></View>
      </BottomSheet>
    </View>
  );
}
