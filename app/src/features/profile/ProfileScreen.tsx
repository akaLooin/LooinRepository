import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, ScreenHeader, StoredImage, useToast } from "../../components";
import { updateProfile, useDB } from "../../data/store";
import { goBack } from "../../lib/nav";
import { pickPhoto } from "../../lib/photos";
import { tokens, useInsets, useTheme } from "../../theme";
import { ActionSheet, BoxRow } from "../settings/parts";

/** S02, as the original's 프로필 (user's recording): photo with 프로필 이미지 (수정/삭제), then 이름, 자기소개, 관심사, ID. */
export function ProfileScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  const [sheet, setSheet] = useState(false);
  const [toast, notice] = useToast();
  const size = tokens.size.avatarProfile + 20;
  const pick = async () => {
    try {
      const uri = await pickPhoto();
      if (uri) updateProfile({ avatarUri: uri });
    } catch {
      notice("사진을 불러오지 못했어요");
    }
  };
  const edit = (field: string) => () => router.push(`/settings/edit/${field}` as never);
  const interests = profile.interests ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="프로필" onBack={() => goBack("/settings")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40, gap: 10 }}>
        <View style={{ alignItems: "center", gap: 10, marginTop: 12, marginBottom: 24 }}>
          <Pressable onPress={() => setSheet(true)} accessibilityRole="button" accessibilityLabel="프로필 이미지 바꾸기">
            {profile.avatarUri
              ? <StoredImage uri={profile.avatarUri} label="프로필 사진" style={{ width: size, height: size, borderRadius: size / 2 }} />
              : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceStrong }} />}
          </Pressable>
          <Pressable onPress={() => setSheet(true)} accessibilityRole="button" hitSlop={8}>
            <AppText variant="helper" color="saturday" style={{ textDecorationLine: "underline" }}>프로필 이미지</AppText>
          </Pressable>
        </View>
        <BoxRow label="이름" value={profile.nickname} onPress={edit("nickname")} />
        <BoxRow label="자기소개" value={profile.bio ? profile.bio.split("\n")[0] : "등록안됨"} onPress={edit("bio")} />
        <BoxRow label="관심사" value={interests.length ? interests.join(", ") : "등록안됨"} onPress={() => router.push("/settings/interests" as never)} />
        <BoxRow label="ID" value={profile.handle || "등록안됨"} onPress={edit("handle")} />
      </ScrollView>
      <ActionSheet visible={sheet} onClose={() => setSheet(false)} options={[
        { label: "수정", onPress: pick },
        ...(profile.avatarUri ? [{ label: "삭제", danger: true, onPress: () => updateProfile({ avatarUri: undefined }) }] : []),
      ]} />
      {toast}
    </View>
  );
}
