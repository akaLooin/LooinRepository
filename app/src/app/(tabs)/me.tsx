import { useInsets } from "../../theme";
import { router } from "expo-router";
import { View } from "react-native";
import { AppText, ProfileHeader, SettingsRow, User } from "../../components";
import { useDB } from "../../data/store";
import { tokens, useTheme } from "../../theme";

/** S18 (partial): who you are and the way into settings. */
export default function Me() {
  const { c } = useTheme();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 24, paddingHorizontal: tokens.layout.gutter, gap: 24 }}>
      <AppText variant="screenTitle">마이</AppText>
      <ProfileHeader name={profile.nickname || "이름 없음"} bio={profile.bio} />
      <SettingsRow title="설정" icon={<User size={24} color={c.text} />} onPress={() => router.push("/settings" as never)} />
    </View>
  );
}
