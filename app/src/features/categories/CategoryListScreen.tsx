import { useInsets } from "../../theme";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { AddPill, AppText, PillRow, ScreenHeader, VisibilityIcon } from "../../components";
import { selectCategories, useDB } from "../../data/store";
import { readableOn, tokens, useTheme, visibleOn } from "../../theme";

/** S06: list of categories. Drag to reorder is not built yet (needs the gesture library). */
export function CategoryListScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const categories = useDB(selectCategories);
  const active = categories.filter((x) => !x.endedAt);
  const ended = categories.filter((x) => x.endedAt);
  const row = (cat: (typeof categories)[number]) => (
    <PillRow
      key={cat.id}
      title={cat.title}
      right="편집"
      onPress={() => router.push(`/categories/${cat.id}` as never)}
      left={<VisibilityIcon value={cat.visibility} color={c.textMuted} />}
      titleColor={readableOn(visibleOn(cat.color, c.bg, c.text), c.surfaceInput)}
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="카테고리 관리" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 12, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted">할 일은 카테고리별로 모여요. 눌러서 이름, 색, 공개 범위를 바꿀 수 있어요.</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <AppText variant="bodyLg" weight={700}>일반</AppText>
          <AddPill onPress={() => router.push("/categories/new" as never)} />
        </View>
        {active.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 20 }}>아직 카테고리가 없어요. 추가하기를 눌러 만들어 보세요.</AppText> : active.map(row)}
        {ended.length ? (
          <>
            <AppText variant="bodyLg" weight={700} style={{ marginTop: 20 }}>종료됨</AppText>
            {ended.map(row)}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
