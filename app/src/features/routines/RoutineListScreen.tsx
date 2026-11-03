import { useInsets } from "../../theme";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, Plus, ReorderableList, RoutineRow, ScreenHeader } from "../../components";
import { reorderRoutines, selectActiveCategories, selectRoutines, useDB } from "../../data/store";
import { today } from "../../lib/dates";
import { periodLabel, routineStatus, ruleLabel } from "../../lib/routines";
import { readableOn, tokens, useTheme, visibleOn } from "../../theme";

const STATUS = { active: "진행 중", upcoming: "예정", finished: "종료" } as const;

/** S07: routines grouped by category. Drag to reorder is not built yet. */
export function RoutineListScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const categories = useDB(selectActiveCategories);
  const routines = useDB(selectRoutines);
  const now = today();
  const [dragging, setDragging] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="루틴 관리" onBack={() => router.back()} />
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ padding: tokens.layout.gutter, gap: 12, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted">카테고리를 눌러 루틴을 만들고, 루틴을 눌러 고쳐요. 길게 눌러 끌면 순서가 바뀌어요.</AppText>
        {categories.length === 0 ? <AppText variant="body" color="textMuted">먼저 카테고리를 만들어 주세요.</AppText> : null}
        {categories.map((cat) => {
          const items = routines.filter((r) => r.categoryId === cat.id);
          return (
            <View key={cat.id} style={{ marginTop: 8 }}>
              <Pressable onPress={() => router.push(`/routines/new?category=${cat.id}` as never)} accessibilityRole="button" accessibilityLabel={`${cat.title}에 루틴 추가`}
                style={{ height: 49, borderRadius: tokens.radius.pill, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 8 }}>
                <AppText variant="category" raw={readableOn(visibleOn(cat.color, c.bg, c.text), c.surface)} style={{ flex: 1 }}>{cat.title}</AppText>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
                  <Plus size={20} color={c.text} strokeWidth={2.4} />
                </View>
              </Pressable>
              <View style={{ paddingHorizontal: 12 }}>
                <ReorderableList items={items} keyOf={(r) => r.id} labelOf={(r) => r.title} onDragging={setDragging} onReorder={reorderRoutines}
                  renderItem={(r, drag) => (
                    <RoutineRow status={STATUS[routineStatus(r, now)]} title={r.title} detail={`${periodLabel(r.startDate, r.endDate)} / ${ruleLabel(r)}`}
                      onPress={() => router.push(`/routines/${r.id}` as never)} {...drag} />
                  )} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
