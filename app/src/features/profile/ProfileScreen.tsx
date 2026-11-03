import { useInsets } from "../../theme";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppText, ScreenHeader, TitleInput } from "../../components";
import { updateProfile, useDB } from "../../data/store";
import { fontFamily, tokens, useTheme } from "../../theme";

/** S02: nickname and bio. Profile photo comes with photo upload (later). */
export function ProfileScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio);
  const [error, setError] = useState<string>();
  const save = () => {
    const n = nickname.trim();
    if (!n) return setError("닉네임을 입력해 주세요");
    if (n.length > 20) return setError("닉네임은 20자까지예요");
    updateProfile({ nickname: n, bio: bio.trim().slice(0, 150) });
    router.back();
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="프로필" onBack={() => router.back()} right={{ label: "확인", onPress: save }} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 18 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 8, marginVertical: 8 }}>
          <View style={{ width: tokens.size.avatarProfile + 20, height: tokens.size.avatarProfile + 20, borderRadius: 60, backgroundColor: c.surfaceStrong }} />
          <AppText variant="helper" color="textMuted">프로필 사진은 사진 기능과 함께 추가돼요</AppText>
        </View>
        <AppText variant="helper" color="textMuted" weight={600}>닉네임</AppText>
        <TitleInput value={nickname} onChangeText={(s) => { setNickname(s); setError(undefined); }} placeholder="닉네임" error={error} />
        <AppText variant="helper" color="textMuted" weight={600} style={{ marginTop: 10 }}>자기소개</AppText>
        <TextInput
          value={bio}
          onChangeText={(s) => setBio(s.slice(0, 150))}
          placeholder="나를 한 줄로 소개해 보세요"
          placeholderTextColor={c.textPlaceholder}
          multiline
          accessibilityLabel="자기소개"
          style={{ minHeight: 100, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceInput, color: c.text, padding: 18, textAlignVertical: "top",
            fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, outlineStyle: "none" as never }}
        />
        <AppText variant="helper" color="textMuted" style={{ alignSelf: "flex-end" }}>{`${bio.length}/150`}</AppText>
      </ScrollView>
    </View>
  );
}
