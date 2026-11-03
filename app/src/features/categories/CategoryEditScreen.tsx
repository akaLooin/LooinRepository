import { useInsets } from "../../theme";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  AppText, BottomSheet, Button, ColorCodeInput, FieldGroup, FieldRow, RadioCheck, ScreenHeader, TitleInput, VisibilityIcon, type Visibility,
} from "../../components";
import { deleteCategory, endCategory, moveCategoryTodos, saveCategory, selectCategories, useDB } from "../../data/store";
import { readableOn, tokens, useTheme, visibleOn } from "../../theme";

export const VISIBILITY_LABEL: Record<Visibility, string> = { public: "전체 공개", followers: "팔로워 공개", partial: "일부 공개", private: "나만 보기" };
const ORDER: Visibility[] = ["public", "followers", "partial", "private"];

type Sheet = null | "visibility" | "color" | "move" | "delete";

/** S06b: create (id = "new") or edit a category. */
export function CategoryEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const categories = useDB(selectCategories);
  const existing = categories.find((x) => x.id === id);
  const isNew = !existing;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [color, setColor] = useState(existing?.color ?? tokens.colors.dark.accent.toUpperCase());
  const [visibility, setVisibility] = useState<Visibility>(existing?.visibility ?? "followers");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [draftVis, setDraftVis] = useState<Visibility>(visibility);
  const [draftColor, setDraftColor] = useState(color);
  const [error, setError] = useState<string | undefined>();

  const shown = visibleOn(color, c.bg, c.text);
  const save = () => {
    if (!title.trim()) return setError("이름을 입력해 주세요");
    saveCategory({ id: existing?.id, title: title.trim(), color, visibility });
    router.back();
  };
  const others = categories.filter((x) => x.id !== existing?.id && !x.endedAt);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="카테고리" onBack={() => router.back()} right={{ label: "확인", onPress: save }} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, paddingTop: 6, gap: 7, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TitleInput value={title} onChangeText={(s) => { setTitle(s); setError(undefined); }} placeholder="카테고리 이름" underline={shown} textColor={readableOn(shown, c.bg)} error={error} autoFocus={isNew} bold />
        <View style={{ height: 6 }} />
        <FieldGroup>
          <FieldRow title="공개설정" value={VISIBILITY_LABEL[visibility]} onPress={() => { setDraftVis(visibility); setSheet("visibility"); }} right={<VisibilityIcon value={visibility} color={c.textMuted} />} />
        </FieldGroup>
        <FieldGroup>
          <FieldRow title="색상" onPress={() => { setDraftColor(color); setSheet("color"); }}
            right={<View accessibilityLabel={`현재 색 ${color}`} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: shown, borderWidth: 2, borderColor: c.text }} />} />
        </FieldGroup>
        {!isNew ? (
          <>
            <FieldGroup><FieldRow title="다른 카테고리로 이관하기" onPress={() => setSheet("move")} /></FieldGroup>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Button kind="plain" flex height={43} label={existing?.endedAt ? "다시 사용하기" : "종료하기"} onPress={() => { endCategory(existing!.id, !existing?.endedAt); router.back(); }} />
              <Button kind="danger" flex height={43} label="삭제" onPress={() => setSheet("delete")} />
            </View>
            <View style={{ gap: 6, marginTop: 14 }}>
              <AppText variant="helper" color="textSecondary">종료: 지금까지의 기록은 그대로 두고, 새 할 일만 더 넣을 수 없게 해요.</AppText>
              <AppText variant="helper" color="textSecondary">삭제: 카테고리와 그 안의 할 일을 모두 지워요. 되돌릴 수 없어요.</AppText>
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomSheet visible={sheet === "visibility"} onClose={() => setSheet(null)} title="공개설정">
        <View accessibilityRole="radiogroup">
          {ORDER.map((v) => (
            <Pressable key={v} onPress={() => setDraftVis(v)} accessibilityRole="radio" accessibilityState={{ checked: draftVis === v }}
              style={{ flexDirection: "row", alignItems: "center", height: 58, gap: 14 }}>
              <VisibilityIcon value={v} color={c.textMuted} size={22} />
              <AppText variant="bodyLg" style={{ flex: 1 }}>{VISIBILITY_LABEL[v]}</AppText>
              <RadioCheck selected={draftVis === v} />
            </Pressable>
          ))}
        </View>
        <AppText variant="helper" color="textMuted" style={{ marginTop: 6 }}>친구 기능(2단계)이 생기면 이 설정대로 보여요.</AppText>
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setVisibility(draftVis); setSheet(null); }} /></View>
      </BottomSheet>

      <BottomSheet visible={sheet === "color"} onClose={() => setSheet(null)} title="색상">
        <ColorCodeInput value={draftColor} onChange={setDraftColor} />
        <View style={{ marginTop: 24 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setColor(draftColor); setSheet(null); }} /></View>
      </BottomSheet>

      <BottomSheet visible={sheet === "move"} onClose={() => setSheet(null)} title="어느 카테고리로 옮길까요?">
        {others.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 16 }}>옮길 수 있는 다른 카테고리가 없어요.</AppText> : null}
        <View style={{ gap: 10 }}>
          {others.map((o) => (
            <Pressable key={o.id} onPress={() => { moveCategoryTodos(existing!.id, o.id); setSheet(null); }} accessibilityRole="button"
              style={{ height: 52, borderRadius: tokens.radius.pill, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10 }}>
              <VisibilityIcon value={o.visibility} color={c.textMuted} />
              <AppText variant="category" raw={readableOn(visibleOn(o.color, c.bg, c.text), c.surface)}>{o.title}</AppText>
            </Pressable>
          ))}
        </View>
        <AppText variant="helper" color="textMuted" style={{ marginTop: 12 }}>이 카테고리의 할 일이 모두 옮겨져요.</AppText>
      </BottomSheet>

      <BottomSheet visible={sheet === "delete"} onClose={() => setSheet(null)} title={`'${existing?.title ?? ""}' 삭제`}>
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>안에 있는 할 일까지 모두 지워져요.</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setSheet(null)} />
          <Button kind="danger" flex label="삭제" onPress={() => { deleteCategory(existing!.id); setSheet(null); router.back(); }} />
        </View>
      </BottomSheet>
    </View>
  );
}
