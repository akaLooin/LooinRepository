import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, Image as ImageIcon, ScreenHeader, StoredImage, useToast } from "../../components";
import { createCrew } from "../../data/crews";
import { pickPhoto } from "../../lib/photos";
import { goBack } from "../../lib/nav";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";
import { CategoryPickSheet, CategoryRow, CrewImage } from "./parts";

/** 크루 만들기 (the original's 만들기 was not recorded; our form): picture, 이름, 소개, the category I share. */
export function CrewCreateScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [image, setImage] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, notice] = useToast();
  const save = async () => {
    if (busy) return;
    if (!name.trim()) return notice("크루 이름을 적어 주세요");
    if (!category) { setPicking(true); return notice("크루에 공유할 카테고리를 골라 주세요"); }
    setBusy(true);
    try {
      const id = await createCrew({ name: name.trim(), description: desc.trim(), categoryId: category, localImage: image });
      router.replace(`/crew/${id}` as never);
    } catch (e) {
      notice(e instanceof Error ? e.message : "만들지 못했어요");
    } finally {
      setBusy(false);
    }
  };
  const field = { color: c.text, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, outlineStyle: "none" as never };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="크루 만들기" onBack={() => goBack("/explore")} right={{ label: "완료", onPress: save }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={async () => { const u = await pickPhoto().catch(() => null); if (u) setImage(u); }} accessibilityRole="button" accessibilityLabel="크루 사진 고르기" style={{ alignSelf: "center" }}>
          {image ? <StoredImage uri={image} label="크루 사진" style={{ width: 96, height: 96, borderRadius: 48 }} /> : <CrewImage size={96} round />}
          <View style={{ position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceButton, alignItems: "center", justifyContent: "center" }}>
            <ImageIcon size={16} color={c.text} />
          </View>
        </Pressable>
        <View style={{ borderRadius: tokens.radius.md, backgroundColor: c.surface, paddingHorizontal: 14, height: 52, justifyContent: "center" }}>
          <TextInput value={name} onChangeText={(t) => setName(t.slice(0, 30))} placeholder="크루 이름" placeholderTextColor={c.textPlaceholder} accessibilityLabel="크루 이름" style={field} />
        </View>
        <View style={{ borderRadius: tokens.radius.md, backgroundColor: c.surface, padding: 14, minHeight: 130 }}>
          <TextInput value={desc} onChangeText={(t) => setDesc(t.slice(0, 500))} multiline placeholder="어떤 크루인지 소개해 주세요" placeholderTextColor={c.textPlaceholder}
            accessibilityLabel="크루 소개" style={{ ...field, fontSize: tokens.type.body.size, minHeight: 100, textAlignVertical: "top" }} />
          <AppText variant="small" color="textMuted" style={{ alignSelf: "flex-end" }}>{`${desc.length} / 500`}</AppText>
        </View>
        <CategoryRow id={category} onPress={() => setPicking(true)} />
        <AppText variant="small" color="textMuted">크루를 만들면 내가 크루장이 돼요. 참가 신청은 크루 화면에서 수락하거나 거절해요.</AppText>
      </ScrollView>
      <CategoryPickSheet visible={picking} value={category} onPick={setCategory} onClose={() => setPicking(false)} />
      {toast}
    </View>
  );
}
