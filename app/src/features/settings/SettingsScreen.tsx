import Constants from "expo-constants";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import {
  AppText, Bell, CircleQuestionMark, FlaskConical, Info, Lock, Megaphone, Monitor, ScreenHeader, SettingsRow, Shield, SmilePlus, StoredImage, User,
} from "../../components";
import { useDB } from "../../data/store";
import { goBack } from "../../lib/nav";
import { supabase } from "../../lib/supabase";
import { tokens, useInsets, useTheme } from "../../theme";
import { unregisterPush } from "../../lib/push";

/** S12, laid out as the original's list (user's recording, 2026-11-07). Premium is left out on purpose (no payments). */
export function SettingsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const avatar = useDB((d) => d.profile.avatarUri);
  const icon = (I: typeof User) => <I size={22} color={c.text} />;
  const go = (path: string) => () => router.push(path as never);
  const version = Constants.expoConfig?.version ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="설정" onBack={() => goBack("/")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>
        <SettingsRow title="프로필" onPress={go("/profile")}
          icon={avatar ? <StoredImage uri={avatar} label="프로필 사진" style={{ width: 22, height: 22, borderRadius: 11 }} /> : icon(User)} />
        <SettingsRow title="계정" icon={icon(User)} onPress={go("/settings/account")} />
        <SettingsRow title="개인정보 보호" icon={icon(Shield)} onPress={go("/settings/privacy")} />
        <SettingsRow title="앱 권한" icon={icon(Lock)} onPress={go("/settings/permissions")} />
        <SettingsRow title="화면" icon={icon(Monitor)} onPress={go("/settings/display")} />
        <SettingsRow title="알림" icon={icon(Bell)} onPress={go("/settings/notifications")} />
        <SettingsRow title="공지사항" icon={icon(Megaphone)} onPress={go("/settings/notices")} />
        <SettingsRow title="내 스티커" icon={icon(SmilePlus)} onPress={go("/settings/stickers")} />
        <SettingsRow title="정보" icon={icon(Info)} onPress={go("/settings/about")} />
        <SettingsRow title="문의하기" icon={icon(CircleQuestionMark)} onPress={go("/settings/faq")} />
        <SettingsRow title="실험실" icon={icon(FlaskConical)} onPress={go("/settings/lab")} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 56, marginTop: 20 }}>
          <AppText variant="bodyLg">버전</AppText>
          <AppText variant="bodyLg" color="textMuted">{version}</AppText>
        </View>
        {supabase ? (
          <Pressable onPress={async () => { await unregisterPush(); await supabase?.auth.signOut(); }} accessibilityRole="button" style={{ height: 56, justifyContent: "center" }}>
            <AppText variant="bodyLg">로그아웃</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
