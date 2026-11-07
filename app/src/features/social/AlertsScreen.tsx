import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { AppText, useToast } from "../../components";
import { markNoticesRead, myNotices, refreshFollowing, respondFollow, type Notice, type Person } from "../../data/social";
import { tokens, useInsets, useTheme } from "../../theme";
import { PersonRow } from "./PersonRow";
import { noticeText, timeAgo } from "../../lib/friend";
import { PersonSheet } from "./PersonSheet";

/** 알림 (S16): follow requests to accept or refuse, new followers, reactions. (Layout guessed: not recorded yet.) */
export function AlertsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [list, setList] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Person | null>(null);
  const [toast, notice] = useToast();
  const load = useCallback(() => {
    myNotices().then((l) => { setList(l); setError(null); markNoticesRead().catch(() => {}); })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했어요"));
  }, []);
  useFocusEffect(load);
  const answer = (n: Notice, accept: boolean) =>
    respondFollow(n.actor.id, accept).then(() => { notice(accept ? "요청을 수락했어요" : "요청을 거절했어요"); load(); refreshFollowing(); })
      .catch((e) => notice(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요"));
  const G = tokens.layout.gutter;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, justifyContent: "center", paddingHorizontal: G }}>
        <AppText variant="screenTitle" accessibilityRole="header">알림</AppText>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40 }}>
        {error ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>{error}</AppText>
          : list === null ? <ActivityIndicator style={{ marginTop: 40 }} color={c.textMuted} />
          : list.length === 0 ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>아직 알림이 없어요</AppText>
          : list.map((n) => (
            <View key={n.id} style={{ opacity: n.readAt ? 0.75 : 1 }}>
              <PersonRow p={n.actor} onPress={() => setOpen(n.actor)} sub={`${noticeText(n)} · ${timeAgo(n.createdAt)}`}
                action={n.type === "follow_request" ? [{ label: "수락", strong: true, onPress: () => answer(n, true) }, { label: "거절", onPress: () => answer(n, false) }] : undefined} />
            </View>
          ))}
      </ScrollView>
      <PersonSheet person={open} onClose={() => setOpen(null)} />
      {toast}
    </View>
  );
}
