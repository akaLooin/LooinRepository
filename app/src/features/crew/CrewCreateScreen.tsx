import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, ConfirmDialog, ScreenHeader, StoredImage, useToast } from "../../components";
import { createCrew, crewDetail, deleteCrew, setCrewFlash, updateCrew } from "../../data/crews";
import { today } from "../../lib/dates";
import { pickPhoto } from "../../lib/photos";
import { goBack } from "../../lib/nav";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";
import { CategoryPickSheet, CategoryRow, CrewImage } from "./parts";

/**
 * 크루 만들기 / 크루 수정 (original, user's recording): picture with the "크루 이미지" link under it, 크루 이름, 크루 소개
 * (100), the category I share, 확인 → "크루 생성을 완료하시겠습니까?". With ?id= it edits the crew (leader) and offers
 * 크루 삭제 at the bottom.
 */
export function CrewCreateScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const [oldImage, setOldImage] = useState<string | undefined>();
  const [ask, setAsk] = useState<null | "create" | "delete">(null);
  const { c } = useTheme();
  const insets = useInsets();
  const [image, setImage] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, notice] = useToast();
  useEffect(() => {
    if (!id) return;
    crewDetail(id, today()).then((d) => { if (d) { setName(d.name); setDesc(d.description); setOldImage(d.imageUri); setCategory(d.myCategoryId); } }).catch(() => {});
  }, [id]);
  const check = () => {
    if (!name.trim()) return notice("크루 이름을 적어 주세요");
    if (!editing && !category) { setPicking(true); return notice("크루에 공유할 카테고리를 골라 주세요"); }
    setAsk("create");
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (editing && id) {
        await updateCrew(id, { name: name.trim(), description: desc.trim(), localImage: image });
        setCrewFlash("크루를 수정했어요");
        goBack(`/crew/${id}`);
      } else {
        setCrewFlash("크루가 성공적으로 생성되었습니다");
        const newId = await createCrew({ name: name.trim(), description: desc.trim(), categoryId: category!, localImage: image });
        router.replace(`/crew/${newId}` as never);
      }
    } catch (e) {
      notice(e instanceof Error ? e.message : "저장하지 못했어요");
    } finally {
      setBusy(false);
    }
  };
  const field = { color: c.text, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, outlineStyle: "none" as never };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title={editing ? "크루 수정" : "크루 만들기"} onBack={() => goBack(editing ? `/crew/${id}` : "/explore")} right={{ label: "확인", onPress: check }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={async () => { const u = await pickPhoto().catch(() => null); if (u) setImage(u); }} accessibilityRole="button" accessibilityLabel="크루 이미지 고르기"
          style={{ alignSelf: "center", alignItems: "center", gap: 8 }}>
          {image ? <StoredImage uri={image} label="크루 사진" style={{ width: 110, height: 110, borderRadius: 55 }} /> : <CrewImage uri={oldImage} size={110} round />}
          <AppText variant="helper" color="saturday" style={{ textDecorationLine: "underline" }}>크루 이미지</AppText>
        </Pressable>
        <View style={{ borderRadius: tokens.radius.md, backgroundColor: c.surface, paddingHorizontal: 14, height: 52, justifyContent: "center" }}>
          <TextInput value={name} onChangeText={(t) => setName(t.slice(0, 30))} placeholder="크루 이름" placeholderTextColor={c.textPlaceholder} accessibilityLabel="크루 이름" style={field} />
        </View>
        <View style={{ borderRadius: tokens.radius.md, backgroundColor: c.surface, padding: 14, minHeight: 130 }}>
          <TextInput value={desc} onChangeText={(t) => setDesc(t.slice(0, 100))} multiline placeholder="크루 소개" placeholderTextColor={c.textPlaceholder}
            accessibilityLabel="크루 소개" style={{ ...field, fontSize: tokens.type.body.size, minHeight: 100, textAlignVertical: "top" }} />
          <AppText variant="small" color="textMuted" style={{ alignSelf: "flex-end" }}>{`${desc.length} / 100`}</AppText>
        </View>
        {editing ? null : <CategoryRow id={category} onPress={() => setPicking(true)} />}
        {editing ? (
          <Pressable onPress={() => setAsk("delete")} accessibilityRole="button" style={{ height: 46, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, marginTop: 12 }}>
            <AppText variant="body" weight={600} color="danger">크루 삭제</AppText>
          </Pressable>
        ) : <AppText variant="small" color="textMuted">크루를 만들면 내가 크루장이 돼요. 참가 신청은 크루 화면에서 수락하거나 거절해요.</AppText>}
      </ScrollView>
      <ConfirmDialog visible={ask === "create"} message={editing ? "크루 수정을 완료하시겠습니까?" : "크루 생성을 완료하시겠습니까?"} onCancel={() => setAsk(null)}
        onOk={() => { setAsk(null); save(); }} />
      <ConfirmDialog visible={ask === "delete"} message="크루를 삭제할까요? 멤버와 순위, 대화가 모두 사라져요." ok="삭제" danger onCancel={() => setAsk(null)}
        onOk={() => { setAsk(null); if (id) deleteCrew(id).then(() => router.replace("/explore" as never)).catch((e) => notice(String(e?.message ?? e))); }} />
      <CategoryPickSheet visible={picking} value={category} onPick={setCategory} onClose={() => setPicking(false)} />
      {toast}
    </View>
  );
}
