import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { AppText, BottomSheet, Button, RadioList, ScreenHeader, ToggleRow, ValueRow, useToast } from "../../components";
import { setPref, usePrefs, type Prefs } from "../../data/prefs";
import { CALENDAR_MAX } from "../../data/prefsRow";
import { DESIGN_WIDTH, FONT_LABEL, tokens, useDesignScale, useTheme, type FontFace } from "../../theme";

const maxLabel = (n: number) => (n ? `${n}개` : "무제한");
const MEMO_LINES: Record<number, string> = { 0: "무제한", 1: "1줄", 2: "2줄", 3: "3줄", 5: "5줄" };

const THEME: Record<Prefs["theme"], string> = { system: "시스템", dark: "다크", light: "라이트" };
const SORT: Record<Prefs["todoSort"], string> = { done_last: "완료 여부 순", manual: "추가한 순" };

/** S12d. */
export function DisplaySettingsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const p = usePrefs();
  const [sheet, setSheet] = useState<null | "theme" | "sort" | "scale" | "font" | "lines" | "monthMax" | "weekMax">(null);
  const [draftMax, setDraftMax] = useState("10");
  const [draftFont, setDraftFont] = useState<FontFace>(p.font);
  const [draftLines, setDraftLines] = useState("0");
  const [toast, notice] = useToast();
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
        <ValueRow title="언어" value="한국어" onPress={() => notice("지금은 한국어만 있어요")} />
        <ValueRow title="폰트" value={FONT_LABEL[p.font]} onPress={() => { setDraftFont(p.font); setSheet("font"); }} />
        <ValueRow title="피드에서 메모 줄 제한" value={MEMO_LINES[p.feedMemoLines] ?? "무제한"} onPress={() => { setDraftLines(String(p.feedMemoLines)); setSheet("lines"); }} />
        <ValueRow title="할 일 정렬" value={SORT[p.todoSort]} onPress={() => { setDraftSort(p.todoSort); setSheet("sort"); }} />
        <ValueRow title="월별 할 일 캘린더의 최대 항목 개수" value={maxLabel(p.monthCalendarMax)} onPress={() => { setDraftMax(String(p.monthCalendarMax)); setSheet("monthMax"); }} />
        <ValueRow title="주별 할 일 캘린더의 최대 항목 개수" value={maxLabel(p.weekCalendarMax)} onPress={() => { setDraftMax(String(p.weekCalendarMax)); setSheet("weekMax"); }} />
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
      <BottomSheet visible={sheet === "font"} onClose={() => setSheet(null)} title="폰트">
        <RadioList value={draftFont} onChange={setDraftFont} options={(Object.keys(FONT_LABEL) as FontFace[]).map((v) => ({ value: v, label: FONT_LABEL[v] }))} />
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("font", draftFont); setSheet(null); }} /></View>
      </BottomSheet>
      <BottomSheet visible={sheet === "lines"} onClose={() => setSheet(null)} title="피드에서 메모 줄 제한">
        <RadioList value={draftLines} onChange={setDraftLines} options={Object.entries(MEMO_LINES).map(([v, label]) => ({ value: v, label }))} />
        <AppText variant="helper" color="textMuted" style={{ marginTop: 12 }}>친구 피드(2단계)에서 메모를 몇 줄까지 보여 줄지 정해요.</AppText>
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("feedMemoLines", Number(draftLines)); setSheet(null); }} /></View>
      </BottomSheet>
      {(["monthMax", "weekMax"] as const).map((k) => (
        <BottomSheet key={k} visible={sheet === k} onClose={() => setSheet(null)} title={k === "monthMax" ? "월별 할 일 캘린더의 최대 항목 개수" : "주별 할 일 캘린더의 최대 항목 개수"}>
          <RadioList value={draftMax} onChange={setDraftMax} options={CALENDAR_MAX.map((v) => ({ value: String(v), label: maxLabel(v) }))} />
          <AppText variant="helper" color="textMuted" style={{ marginTop: 12 }}>할 일 캘린더(홈 → 오른쪽 위 메뉴)에서 하루 칸에 할 일을 몇 개까지 보여 줄지 정해요. 넘치면 "+n"으로 보여요.</AppText>
          <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref(k === "monthMax" ? "monthCalendarMax" : "weekCalendarMax", Number(draftMax)); setSheet(null); }} /></View>
        </BottomSheet>
      ))}
      {toast}
      <BottomSheet visible={sheet === "sort"} onClose={() => setSheet(null)} title="할 일 정렬">
        <RadioList value={draftSort} onChange={setDraftSort} options={(Object.keys(SORT) as Prefs["todoSort"][]).map((v) => ({ value: v, label: SORT[v] }))} />
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setPref("todoSort", draftSort); setSheet(null); }} /></View>
      </BottomSheet>
    </View>
  );
}
