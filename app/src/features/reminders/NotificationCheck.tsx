import { useCallback, useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { AppText, Button } from "../../components";
import { notificationStatus, sendTestNotification } from "../../data/notifications";
import { tokens, useTheme } from "../../theme";

type Status = Awaited<ReturnType<typeof notificationStatus>>;

const two = (n: number) => String(n).padStart(2, "0");
const when = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${two(d.getHours())}:${two(d.getMinutes())}`;

/** 알림 점검: whether notifications are allowed, how many are waiting, the next one, and a 10-second test. */
export function NotificationCheck({ notice }: { notice: (msg: string) => void }) {
  const { c } = useTheme();
  const [st, setSt] = useState<Status | null>(null);
  const refresh = useCallback(() => { notificationStatus().then(setSt).catch(() => {}); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  if (Platform.OS === "web") return null;

  const test = async () => {
    const ok = await sendTestNotification(10);
    notice(ok ? "10초 뒤에 알림이 와요. 앱을 닫고 기다려 보세요" : "알림 권한이 꺼져 있어요. 폰 설정에서 켜 주세요");
    setTimeout(refresh, 500);
  };

  return (
    <View style={{ marginTop: 28, padding: 16, borderRadius: tokens.radius.md, backgroundColor: c.surface, gap: 8 }}>
      <AppText variant="bodyLg" weight={700}>알림 점검</AppText>
      {st ? (
        <>
          <AppText variant="body" color="textMuted">{`권한: ${st.allowed ? "허용됨" : "꺼짐"} · 알림 채널: ${st.channel ? "정상" : "기본 채널 사용"}`}</AppText>
          <AppText variant="body" color="textMuted">{`예약된 알림 ${st.scheduled}개${st.next ? ` · 다음 ${when(st.next)}` : ""}`}</AppText>
          {st.error ? <AppText variant="helper" color="textMuted" numberOfLines={3}>{`마지막 오류: ${st.error}`}</AppText> : null}
        </>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <View style={{ flex: 1 }}><Button kind="sheetBlock" label="10초 뒤 테스트 알림" onPress={test} /></View>
        <View style={{ flex: 1 }}><Button kind="sheetBlock" label="새로 고침" onPress={refresh} /></View>
      </View>
    </View>
  );
}
