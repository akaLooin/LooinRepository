import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, Bell, Send, StoredImage, Users } from "../../components";
import { useUnreadConversations } from "../../data/chat";
import { useMyCrews } from "../../data/crews";
import { useFollowing } from "../../data/social";
import { tokens, useInsets, useTheme } from "../../theme";
import { ExploreScreen } from "../social/ExploreScreen";

const G = tokens.layout.gutter;

/**
 * 함께 (design app, 2026-11-21): friends and crews in one tab. A row of the people I follow and my crews (tap: their
 * home), 대화 and 알림 at the top right, then the search and the friends' feed (둘러보기).
 */
export function TogetherScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const following = useFollowing();
  const crews = useMyCrews();
  const unread = useUnreadConversations();
  const a = 52;
  const face = (key: string, name: string, uri: string | undefined, href: string, square?: boolean) => (
    <Pressable key={key} onPress={() => router.push(href as never)} accessibilityRole="button" accessibilityLabel={`${name} 홈`} style={{ alignItems: "center", gap: 6, width: a + 12 }}>
      {uri ? <StoredImage uri={uri} label="" style={{ width: a, height: a, borderRadius: square ? 16 : a / 2 }} />
        : <View style={{ width: a, height: a, borderRadius: square ? 16 : a / 2, backgroundColor: c.surfaceStrong }} />}
      <AppText variant="small" numberOfLines={1}>{name}</AppText>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: G, height: 56 }}>
        <AppText variant="monthTitle" weight={700} style={{ flex: 1 }} accessibilityRole="header">함께</AppText>
        <Pressable onPress={() => router.push("/people" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="친구 찾기·목록"><Users size={23} color={c.text} /></Pressable>
        <Pressable onPress={() => router.push("/alerts" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="알림"><Bell size={23} color={c.text} /></Pressable>
        <Pressable onPress={() => router.push("/send" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel={unread ? "대화, 새 메시지" : "대화"}>
          <Send size={23} color={c.text} />
          {unread ? <View style={{ position: "absolute", top: -2, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: c.sunday }} /> : null}
        </Pressable>
      </View>
      {following.length || crews.length ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: G - 6, gap: 6, paddingVertical: 6 }}>
            {following.map((p) => face(p.id, p.nickname, p.avatarUri, `/friend/${p.id}`))}
            {crews.map((cr) => face(cr.id, cr.name, cr.imageUri, `/friend/crew:${cr.id}`, true))}
          </ScrollView>
        </View>
      ) : null}
      <ExploreScreen embedded />
    </View>
  );
}
