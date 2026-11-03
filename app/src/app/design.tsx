import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AddPill, AppText, BottomNav, BottomSheet, Button, Calendar, CalendarHeader, CategoryPill, Check, Chip, Clock, Clover, ColorCodeInput,
  FieldGroup, FieldRow, FileText, IconChip, Image, Info, MemoInput, PillButton, PillRow, PlayButton, PopupMenu, ProfileHeader, RadioCheck,
  RadioList, Redo2, RoutineRow, ScreenHeader, SettingsRow, SheetMenuRow, TextAlignStart, TileButton, TimeGrid, TitleInput, TodoRow, Toggle,
  ToggleRow, Trash2, User, Users, ValueRow, VisibilityIcon, ArrowRight, Archive, Pencil, type CloverState, type Tab,
} from "../components";
import { monthGrid, type Day } from "../lib/dates";
import { tokens, useTheme, type Scheme } from "../theme";

const G = tokens.layout.gutter;
const GREEN = "#00FF7F";

// Sample data that mirrors the reference screenshots (counts per day in November 2026).
const COUNTS: Record<number, number> = { 4: 6, 5: 2, 6: 1, 7: 4, 8: 2, 9: 1, 10: 3, 12: 1, 14: 2, 15: 1, 19: 1, 20: 1, 21: 2, 23: 1, 26: 2, 28: 2, 29: 1 };
function sampleState(day: Day): CloverState {
  const d = Number(day.slice(8));
  if (d === 1) return { kind: "doneCount", color: GREEN, count: 1 };
  if (d === 2) return { kind: "done", color: GREEN };
  if (d === 3) return { kind: "partial", color: GREEN, ratio: 0.5 };
  return COUNTS[d] ? { kind: "count", count: COUNTS[d] } : { kind: "empty" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingVertical: 20, borderTopWidth: 1, borderTopColor: c.surface, gap: 14 }}>
      <AppText variant="helper" color="textMuted" weight={600}>{title}</AppText>
      {children}
    </View>
  );
}

export default function Design() {
  const { theme } = useLocalSearchParams<{ theme?: string }>();
  const { c, scheme, setOverride } = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (theme === "light" || theme === "dark") setOverride(theme);
  }, [theme, setOverride]);

  const [done, setDone] = useState(true);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [toggles, setToggles] = useState({ a: true, b: false });
  const [repeat, setRepeat] = useState("daily");
  const [vis, setVis] = useState("followers");
  const [time, setTime] = useState({ h: 23, m: 55 });
  const [color, setColor] = useState(GREEN);
  const [title, setTitle] = useState("To Do");
  const [memo, setMemo] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [picked, setPicked] = useState<Day>("2026-11-03");
  const week = monthGrid(2026, 11).slice(0, 1);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top, alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth: tokens.layout.screenWidthBasis, paddingHorizontal: G }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 }}>
          <AppText variant="screenTitle">디자인 시스템</AppText>
          <PillButton label={scheme === "dark" ? "라이트로" : "다크로"} onPress={() => setOverride((scheme === "dark" ? "light" : "dark") as Scheme)} />
        </View>

        <Section title="클로버 (S03 날짜, 할 일)">
          <View style={{ flexDirection: "row", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Clover state={{ kind: "empty" }} />
            <Clover state={{ kind: "count", count: 6 }} />
            <Clover state={{ kind: "doneCount", color: GREEN, count: 1 }} />
            <Clover state={{ kind: "done", color: GREEN }} />
            <Clover state={{ kind: "partial", color: GREEN, ratio: 0.5 }} />
            <Clover size={25} state={{ kind: "todoOpen" }} />
            <Clover size={25} state={{ kind: "todoDone", color: "#3D8BFF" }} />
            <Clover size={48} state={{ kind: "todoDone", color: GREEN }} />
          </View>
        </Section>

        <Section title="사람 칩 (S03)">
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <IconChip label="보관함"><Archive size={22} color={c.text} /></IconChip>
            <Chip label="루인" selected />
            <Chip label="친구" />
            <IconChip label="친구 목록"><Users size={22} color={c.text} /></IconChip>
          </View>
        </Section>

        <Section title="프로필 머리 (S03)">
          <ProfileHeader name="루인" dday={{ title: "SK 아이젠 지원", label: "D-12" }} />
        </Section>

        <Section title="캘린더 (S03 월간, 주간)">
          <CalendarHeader title={mode === "month" ? "2026년 11월" : "2026년 11월 1주차"} mode={mode} onToggleMode={() => setMode(mode === "month" ? "week" : "month")} onPrev={() => {}} onNext={() => {}} filterColors={[GREEN, "#FFFFFF"]} />
          <Calendar year={2026} month={11} today="2026-11-03" state={sampleState} rows={mode === "week" ? week : undefined} />
        </Section>

        <Section title="카테고리와 할 일 (S03)">
          <CategoryPill title="To Do" color={GREEN} visibility="followers" />
          <TodoRow title="💪 운동하기: 어깨" done={done} color={GREEN} onToggle={() => setDone(!done)} />
          <CategoryPill title="Normal" color="#FFFFFF" visibility="private" />
          <TodoRow title="책 30쪽 읽기" memo="메모가 여기에 회색으로" done={false} color="#FFFFFF" onToggle={() => {}} />
        </Section>

        <Section title="알약 버튼">
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <PillButton label="주" />
            <AddPill />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <VisibilityIcon value="public" color={c.textMuted} />
              <VisibilityIcon value="followers" color={c.textMuted} />
              <VisibilityIcon value="private" color={c.textMuted} />
            </View>
          </View>
        </Section>

        <Section title="상단 메뉴 (S06m)">
          <View style={{ alignItems: "flex-end" }}>
            <PopupMenu items={["카테고리 관리", "루틴 관리", "디데이 관리", "리마인더 관리"].map((label) => ({ label, onPress: () => {} }))} />
          </View>
        </Section>

        <Section title="할 일 메뉴 바텀 시트 (S05)">
          <BottomSheet inline visible onClose={() => {}} title="💪 운동하기: 어깨">
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <TileButton label="수정하기" icon={<Pencil size={28} color={c.menuEdit} />} />
              <TileButton label="삭제하기" icon={<Trash2 size={28} color={c.menuDelete} />} />
            </View>
            <SheetMenuRow title="메모" color="menuMemo" icon={<FileText size={18} color="#FFFFFF" />} />
            <SheetMenuRow title="시간 알림" color="menuTime" icon={<Clock size={18} color="#FFFFFF" />} />
            <SheetMenuRow title="사진 인증" color="menuPhoto" icon={<Image size={18} color="#FFFFFF" />} />
            <SheetMenuRow title="내일 또 하기" color="menuRepeat" icon={<ArrowRight size={18} color="#FFFFFF" />} />
            <SheetMenuRow title="날짜 바꾸기" color="menuMove" icon={<Redo2 size={18} color="#FFFFFF" />} />
            <SheetMenuRow title="정보 보기" color="menuInfo" icon={<Info size={18} color={c.text} />} />
          </BottomSheet>
        </Section>

        <Section title="공개설정 시트 (S06c)">
          <BottomSheet inline visible onClose={() => {}} title="공개설정">
            {([["public", "전체 공개"], ["followers", "팔로워 공개"], ["partial", "일부 공개"], ["private", "나만 보기"]] as const).map(([v, l]) => (
              <View key={v} style={{ flexDirection: "row", alignItems: "center", height: 58, gap: 14 }} onTouchEnd={() => setVis(v)}>
                <VisibilityIcon value={v} color={c.textMuted} size={22} />
                <AppText variant="bodyLg" style={{ flex: 1 }}>{l}</AppText>
                <RadioCheck selected={vis === v} />
              </View>
            ))}
            <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" /></View>
          </BottomSheet>
        </Section>

        <Section title="화면 머리, 편집 칸 (S06b 카테고리 편집)">
          <ScreenHeader title="카테고리" onBack={() => {}} right={{ label: "확인", onPress: () => {} }} />
          <TitleInput value={title} onChangeText={setTitle} underline={color} textColor={color} />
          <View style={{ gap: 10 }}>
            <FieldGroup><FieldRow title="공개설정" value="팔로워 공개" onPress={() => {}} right={<Users size={18} color={c.textMuted} fill={c.textMuted} />} /></FieldGroup>
            <FieldGroup><FieldRow title="색상" onPress={() => {}} right={<View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color, borderWidth: 2, borderColor: "#FFFFFF" }} />} /></FieldGroup>
            <FieldGroup><FieldRow title="다른 카테고리로 이관하기" onPress={() => {}} /></FieldGroup>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button kind="plain" label="종료하기" flex height={46} />
            <Button kind="danger" label="삭제" flex height={46} />
          </View>
        </Section>

        <Section title="색상 코드 입력 (S06d, 원본과 다름)">
          <ColorCodeInput value={color} onChange={setColor} />
        </Section>

        <Section title="루틴 (S07, S07b, S07c)">
          <RoutineRow status="진행 중" title="💪 운동하기" detail="2026. 9. 27 ~ / 매일" />
          <RoutineRow status="진행 중" title="💵 월급날" detail="2026. 9. 29 ~ 2026. 12. 31 / 매월 10일" />
          <FieldGroup>
            <FieldRow title="시작 날짜" value="2026. 9. 27." onPress={() => {}} />
            <FieldRow title="종료 날짜" value="없음" onPress={() => {}} />
          </FieldGroup>
          <FieldGroup><FieldRow title="수동으로 할 일 추가" right={<Toggle value={toggles.a} onChange={(v) => setToggles({ ...toggles, a: v })} />} /></FieldGroup>
          <MemoInput value={memo} onChangeText={setMemo} placeholder="메모" />
          <Button kind="danger" label="삭제" />
          <RadioList value={repeat} onChange={setRepeat} options={[["daily", "매일"], ["interval", "간격"], ["weekly", "매주"], ["biweekly", "격주"], ["monthly", "매월"], ["yearly", "매년"]].map(([value, label]) => ({ value, label }))} />
        </Section>

        <Section title="시간 설정 시트 (S07d, S22b)">
          <BottomSheet inline visible onClose={() => {}} title="시간 설정">
            <TimeGrid hour={time.h} minute={time.m} onChange={(h, m) => setTime({ h, m })} />
            <View style={{ marginTop: 20 }}><Button kind="sheetBlock" label="완료" /></View>
          </BottomSheet>
        </Section>

        <Section title="디데이 (S21, S21b)">
          <PillRow title="SK 아이젠 지원" right="D-12" rightColor="dday" />
          <PillRow title="To Do" right="편집" left={<Users size={18} color={c.textMuted} fill={c.textMuted} />} />
          <Calendar picker year={2026} month={11} today="2026-11-03" selected={picked} onSelect={setPicked} />
        </Section>

        <Section title="설정 (S12, S12d)">
          <SettingsRow title="프로필" icon={<User size={24} color={c.text} />} />
          <ToggleRow title="달력에서 일요일부터 시작" value={toggles.a} onChange={(v) => setToggles({ ...toggles, a: v })} />
          <ToggleRow title="할 일을 상단에서 입력" value={toggles.b} onChange={(v) => setToggles({ ...toggles, b: v })} />
          <ValueRow title="테마" value={scheme === "dark" ? "다크" : "라이트"} onPress={() => {}} />
          <ValueRow title="할 일 정렬" value="완료 여부 순" onPress={() => {}} />
        </Section>

        <Section title="타이머 (S08)">
          <AppText variant="bodyLg" weight={700} center>💪 운동하기: 어깨</AppText>
          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.surfaceStrong, paddingVertical: 8, marginHorizontal: 20 }}>
            <AppText variant="timer" color="timerIdle" center style={{ fontVariant: ["tabular-nums"] }}>00:00:00</AppText>
          </View>
          <PlayButton />
        </Section>

        <Section title="하단 탭">
          <BottomNav active={tab} onChange={setTab} />
        </Section>
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}
