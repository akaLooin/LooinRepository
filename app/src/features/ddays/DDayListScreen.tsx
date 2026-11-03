import { useInsets } from "../../theme";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { AddPill, AppText, ChevronDown, ChevronUp, Lock, PillRow, ScreenHeader } from "../../components";
import { ddayLabel, moveDDay, selectDDays, useDB } from "../../data/store";
import { tokens, useTheme } from "../../theme";

/** S21. The first D-day others can see is the one shown on the home screen. Reorder with the arrows (drag comes later). */
export function DDayListScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const ddays = useDB(selectDDays);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="디데이 관리" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 12, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted">눌러서 고치고, 화살표로 순서를 바꿔요. 맨 위의 공개 디데이가 홈에 보여요.</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <AppText variant="bodyLg" weight={700}>디데이</AppText>
          <AddPill onPress={() => router.push("/ddays/new" as never)} />
        </View>
        {ddays.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 20 }}>아직 디데이가 없어요. 시험, 기념일, 마감일을 추가해 보세요.</AppText> : null}
        {ddays.map((d, i) => (
          <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ flex: 1 }}>
              <PillRow
                title={d.title}
                right={ddayLabel(d)}
                rightColor="dday"
                left={d.isPrivate ? <Lock size={16} color={c.textMuted} fill={c.textMuted} /> : undefined}
                onPress={() => router.push(`/ddays/${d.id}` as never)}
              />
            </View>
            <View>
              <Pressable onPress={() => moveDDay(d.id, -1)} disabled={i === 0} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${d.title} 위로`} style={{ opacity: i === 0 ? 0.25 : 1 }}>
                <ChevronUp size={20} color={c.textMuted} />
              </Pressable>
              <Pressable onPress={() => moveDDay(d.id, 1)} disabled={i === ddays.length - 1} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${d.title} 아래로`} style={{ opacity: i === ddays.length - 1 ? 0.25 : 1 }}>
                <ChevronDown size={20} color={c.textMuted} />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
