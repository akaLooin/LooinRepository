import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { router } from "expo-router";
import { View } from "react-native";
import { AddPill, AppText, PillRow, ReorderableList, ScreenHeader, VisibilityIcon, DragScrollView } from "../../components";
import { reorderCategories, selectCategories, useDB } from "../../data/store";
import { readableOn, tokens, useTheme, visibleOn } from "../../theme";

/** S06: list of categories. Drag to reorder is not built yet (needs the gesture library). */
export function CategoryListScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const categories = useDB(selectCategories);
  const active = categories.filter((x) => !x.endedAt);
  const ended = categories.filter((x) => x.endedAt);
  const row = (cat: (typeof categories)[number], drag?: { onLongPress: () => void; delayLongPress: number }) => (
    <PillRow
      key={cat.id}
      {...drag}
      title={cat.title}
      right="편집"
      onPress={() => router.push(`/categories/${cat.id}` as never)}
      left={<VisibilityIcon value={cat.visibility} color={c.textMuted} />}
      titleColor={readableOn(visibleOn(cat.color, c.bg, c.text), c.surfaceInput)}
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="카테고리 관리" onBack={() => goBack("/")} />
      <DragScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 12, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted">눌러서 이름, 색, 공개 범위를 바꾸고, 길게 눌러 끌면 순서가 바뀌어요.</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <AppText variant="bodyLg" weight={700}>일반</AppText>
          <AddPill onPress={() => router.push("/categories/new" as never)} />
        </View>
        {active.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 20 }}>아직 카테고리가 없어요. 추가하기를 눌러 만들어 보세요.</AppText> : (
          <ReorderableList items={active} keyOf={(x) => x.id} labelOf={(x) => x.title} gap={12}
            onReorder={(ids) => reorderCategories([...ids, ...ended.map((x) => x.id)])} renderItem={(cat, drag) => row(cat, drag)} />
        )}
        {ended.length ? (
          <>
            <AppText variant="bodyLg" weight={700} style={{ marginTop: 20 }}>종료됨</AppText>
            {ended.map((cat) => row(cat))}
          </>
        ) : null}
      </DragScrollView>
    </View>
  );
}
