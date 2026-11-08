import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { AppText, RipplePressable, StoredImage } from "../../components";
import { myConversations, type Conversation } from "../../data/chat";
import { previewText } from "../../lib/chat";
import { timeAgo } from "../../lib/friend";
import { tokens, useInsets, useTheme } from "../../theme";

/**
 * 보내기 tab = 대화 (S17, user's recording): the title 대화 and one row per person you talk with. New conversations
 * start from someone's profile (the paper plane). Refreshed when the tab comes into view and every 10 s while open.
 */
export function ConversationsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [list, setList] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let alive = true;
    const load = () => myConversations().then((l) => { if (alive) { setList(l); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "불러오지 못했어요"); });
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []));
  const G = tokens.layout.gutter;
  const a = 48;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, justifyContent: "center", paddingHorizontal: G }}>
        <AppText variant="screenTitle" accessibilityRole="header">대화</AppText>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {error ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40, paddingHorizontal: G }}>{error}</AppText>
          : list === null ? <ActivityIndicator style={{ marginTop: 40 }} color={c.textMuted} />
          : list.length === 0 ? (
            <View style={{ paddingVertical: 48, paddingHorizontal: G, gap: 6 }}>
              <AppText variant="bodyLg" weight={600} center>아직 대화가 없어요</AppText>
              <AppText variant="body" color="textMuted" center>친구 프로필의 종이비행기를 눌러 대화를 시작해요</AppText>
            </View>
          )
          : list.map((cv) => (
            <RipplePressable key={cv.id} onPress={() => router.push(`/chat/${cv.id}` as never)} accessibilityRole="button"
              accessibilityLabel={`${cv.other.nickname}와의 대화${cv.unread ? `, 안 읽은 메시지 ${cv.unread}개` : ""}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: G, paddingVertical: 10 }}>
              {cv.other.avatarUri
                ? <StoredImage uri={cv.other.avatarUri} label="" style={{ width: a, height: a, borderRadius: a / 2 }} />
                : <View style={{ width: a, height: a, borderRadius: a / 2, backgroundColor: c.surfaceStrong }} />}
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyLg" weight={600} numberOfLines={1}>{cv.other.nickname}</AppText>
                <AppText variant="body" color={cv.unread ? "text" : "textMuted"} numberOfLines={1}>{previewText(cv.last)}</AppText>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                {cv.lastAt ? <AppText variant="small" color="textMuted">{timeAgo(cv.lastAt)}</AppText> : null}
                {cv.unread ? (
                  <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: c.sunday }}>
                    <AppText variant="small" weight={700} color="onIcon">{cv.unread > 99 ? "99+" : String(cv.unread)}</AppText>
                  </View>
                ) : null}
              </View>
            </RipplePressable>
          ))}
      </ScrollView>
    </View>
  );
}
