import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppText, BottomSheet, Bell, Button, Info, Lock, ScreenHeader, SettingsRow, SmilePlus, User, useToast,
} from "../../components";
import { syncNow, useSyncStatus } from "../../data/store";
import { supabase } from "../../lib/supabase";
import { tokens, useTheme } from "../../theme";

/** S12. Account actions work; the other rows open screens that are built later. */
export function SettingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sync = useSyncStatus();
  const [toast, notice] = useToast();
  const [sheet, setSheet] = useState<null | "delete">(null);
  const [busy, setBusy] = useState(false);
  const icon = (I: typeof User) => <I size={24} color={c.text} />;
  const later = () => notice("다음 단계에서 만들어요");

  const deleteAccount = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    setBusy(false);
    if (error) return notice("계정을 지우지 못했어요. 잠시 후 다시 시도해 주세요");
    await supabase.auth.signOut();
  };

  const syncLine = !supabase
    ? "체험 모드: 이 기기에만 저장돼요"
    : sync.state === "syncing" ? "동기화 중…"
    : sync.state === "offline" ? `오프라인 · 보낼 변경 ${sync.pending}개`
    : sync.pending ? `보낼 변경 ${sync.pending}개` : "모두 동기화됨";

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="설정" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>
        <SettingsRow title="프로필" icon={icon(User)} onPress={() => router.push("/profile" as never)} />
        <SettingsRow title="개인정보 보호" icon={icon(Lock)} onPress={later} />
        <SettingsRow title="화면" icon={icon(Info)} onPress={() => router.push("/settings/display" as never)} />
        <SettingsRow title="알림" icon={icon(Bell)} onPress={later} />
        <SettingsRow title="내 스티커" icon={icon(SmilePlus)} onPress={later} />

        <AppText variant="helper" color="textMuted" weight={600} style={{ marginTop: 28, marginBottom: 4 }}>계정과 동기화</AppText>
        <SettingsRow title={syncLine} icon={icon(Info)} onPress={supabase ? syncNow : undefined} />
        {sync.rejected.length ? (
          <AppText variant="helper" color="danger" style={{ marginBottom: 8 }}>{`서버가 받지 않은 변경 ${sync.rejected.length}개 (예: 종료한 카테고리에 추가한 할 일)`}</AppText>
        ) : null}
        {supabase ? (
          <>
            <SettingsRow title="로그아웃" icon={icon(User)} onPress={() => supabase?.auth.signOut()} />
            <SettingsRow title="계정 삭제" icon={icon(Lock)} onPress={() => setSheet("delete")} />
          </>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 28 }}>
          <AppText variant="bodyLg">버전</AppText>
          <AppText variant="bodyLg" color="textMuted">0.1.0</AppText>
        </View>
      </ScrollView>

      <BottomSheet visible={sheet === "delete"} onClose={() => setSheet(null)} title="계정 삭제">
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>할 일, 루틴, 카테고리, 사진까지 모두 지워지고 되돌릴 수 없어요.</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setSheet(null)} />
          <Button kind="danger" flex label="삭제" loading={busy} onPress={deleteAccount} />
        </View>
      </BottomSheet>
      {toast}
    </View>
  );
}
