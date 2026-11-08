import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppText, ScreenHeader, useToast } from "../../components";
import { applyCrew, crewDetail, setCrewFlash, type CrewDetail } from "../../data/crews";
import { today } from "../../lib/dates";
import { goBack } from "../../lib/nav";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";
import { CategoryPickSheet, CategoryRow, CrewImage } from "./parts";

/** 참가 신청 (original): the crew on top, a message to the crew (200 characters), the category to share, 확인. */
export function CrewApplyScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [crew, setCrew] = useState<CrewDetail | null>(null);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, notice] = useToast();
  useEffect(() => { if (id) crewDetail(id, today()).then(setCrew).catch(() => {}); }, [id]);
  const send = async () => {
    if (!id || busy) return;
    if (!category) { setPicking(true); return notice("크루에 공유할 카테고리를 골라 주세요"); }
    setBusy(true);
    try {
      await applyCrew(id, message.trim(), category);
      setCrewFlash("참가 신청을 보냈어요");
      goBack(`/crew/${id}`);
    } catch (e) {
      notice(e instanceof Error ? e.message : "보내지 못했어요");
    } finally {
      setBusy(false);
    }
  };
  const G = tokens.layout.gutter;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="참가 신청" onBack={() => goBack(`/crew/${id}`)} right={{ label: "확인", onPress: send }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: G, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {crew ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <CrewImage uri={crew.imageUri} size={64} round />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLg" weight={700} numberOfLines={1}>{crew.name}</AppText>
              {crew.description ? <AppText variant="helper" color="textMuted" numberOfLines={1}>{crew.description}</AppText> : null}
            </View>
          </View>
        ) : null}
        <View style={{ borderRadius: tokens.radius.md, backgroundColor: c.surface, padding: 14, minHeight: 150 }}>
          <TextInput value={message} onChangeText={(t) => setMessage(t.slice(0, 200))} multiline placeholder="크루에 보낼 메시지를 입력하세요" placeholderTextColor={c.textPlaceholder}
            accessibilityLabel="크루에 보낼 메시지" style={{ flex: 1, minHeight: 110, color: c.text, fontFamily: fontFamily(400), fontSize: tokens.type.body.size, textAlignVertical: "top", outlineStyle: "none" as never }} />
          <AppText variant="small" color="textMuted" style={{ alignSelf: "flex-end" }}>{`${message.length} / 200`}</AppText>
        </View>
        <CategoryRow id={category} onPress={() => setPicking(true)} />
      </ScrollView>
      <CategoryPickSheet visible={picking} value={category} onPick={setCategory} onClose={() => setPicking(false)} />
      {toast}
    </View>
  );
}
