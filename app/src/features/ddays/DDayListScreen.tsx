import { useInsets } from "../../theme";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { AddPill, AppText, Lock, PillRow, ReorderableList, ScreenHeader } from "../../components";
import { ddayLabel, reorderDDays, selectDDays, useDB } from "../../data/store";
import { tokens, useTheme } from "../../theme";

/** S21. The first D-day others can see is the one shown on the home screen. Hold and drag to reorder. */
export function DDayListScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const ddays = useDB(selectDDays);
  const [dragging, setDragging] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="디데이 관리" onBack={() => router.back()} />
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ padding: tokens.layout.gutter, gap: 12, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted">눌러서 고치고, 길게 눌러 끌면 순서가 바뀌어요. 맨 위의 공개 디데이가 홈에 보여요.</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <AppText variant="bodyLg" weight={700}>디데이</AppText>
          <AddPill onPress={() => router.push("/ddays/new" as never)} />
        </View>
        {ddays.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 20 }}>아직 디데이가 없어요. 시험, 기념일, 마감일을 추가해 보세요.</AppText> : null}
        <ReorderableList items={ddays} keyOf={(d) => d.id} labelOf={(d) => d.title} gap={12} onDragging={setDragging} onReorder={reorderDDays}
          renderItem={(d, drag) => (
            <PillRow title={d.title} right={ddayLabel(d)} rightColor="dday" {...drag}
              left={d.isPrivate ? <Lock size={16} color={c.textMuted} fill={c.textMuted} /> : undefined}
              onPress={() => router.push(`/ddays/${d.id}` as never)} />
          )} />
      </ScrollView>
    </View>
  );
}
