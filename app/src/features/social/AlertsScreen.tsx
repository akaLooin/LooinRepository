import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { AppText, TabPills, useToast } from "../../components";
import { APP_NOTICES } from "../../data/notices";
import { FeedList } from "./FeedList";
import { markNoticesRead, myNotices, refreshFollowing, respondFollow, type Notice, type Person } from "../../data/social";
import { tokens, useInsets, useTheme } from "../../theme";
import { PersonRow } from "./PersonRow";
import { noticeText, timeAgo } from "../../lib/friend";
import { PersonSheet } from "./PersonSheet";

type Tab = "todos" | "diaries" | "interest" | "notices";
const TABS = [["todos", "친구의 할 일"], ["diaries", "친구의 일기"], ["interest", "받은 관심"], ["notices", "공지"]] as const;
let lastTab: Tab | null = null; // the tab last looked at, while the app runs

/**
 * 알림 (S16), in four tabs (user's feature): 친구의 할 일 and 친구의 일기 (the friend feed by kind), 받은 관심 (follow
 * requests to accept or refuse, new followers, reactions, crew news) and 공지 (this app's update notes).
 * Opens on 받은 관심 when something there is unread.
 */
export function AlertsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [list, setList] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Person | null>(null);
  const [toast, notice] = useToast();
  const [tab, setTabState] = useState<Tab | null>(lastTab);
  const setTab = (t: Tab) => { lastTab = t; setTabState(t); };
  const shownTab: Tab = tab ?? "interest";
  const unread = !!list?.some((n) => !n.readAt);
  const load = useCallback(() => {
    myNotices().then((l) => {
      setList(l); setError(null);
      // first visit: 받은 관심 if something there is new, else 친구의 할 일
      setTabState((t) => t ?? (lastTab = l.some((n) => !n.readAt) ? "interest" : "todos"));
    }).catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했어요"));
  }, []);
  useFocusEffect(load);
  // seen once 받은 관심 is on screen (the red dot stays until then)
  useFocusEffect(useCallback(() => {
    if (shownTab !== "interest" || !unread) return;
    const t = setTimeout(() => markNoticesRead().catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [shownTab, unread]));
  const answer = (n: Notice, accept: boolean) =>
    respondFollow(n.actor.id, accept).then(() => { notice(accept ? "요청을 수락했어요" : "요청을 거절했어요"); load(); refreshFollowing(); })
      .catch((e) => notice(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요"));
  const G = tokens.layout.gutter;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, justifyContent: "center", paddingHorizontal: G }}>
        <AppText variant="screenTitle" accessibilityRole="header">알림</AppText>
      </View>
      <View style={{ flexGrow: 0, paddingBottom: 6 }}>
        <TabPills items={TABS} value={shownTab} onChange={setTab} dot={{ interest: unread }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40 }}>
        {shownTab === "todos" || shownTab === "diaries" ? <FeedList key={shownTab} only={shownTab === "todos" ? "todo" : "diary"} heading={false} onPerson={setOpen} />
          : shownTab === "notices" ? APP_NOTICES.map((n, i) => (
            <View key={i} style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: c.surfaceRow, gap: 8 }}>
              <AppText variant="body">{n.text}</AppText>
              <AppText variant="helper" color="textMuted">{n.date}</AppText>
            </View>
          ))
          : error ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>{error}</AppText>
          : list === null ? <ActivityIndicator style={{ marginTop: 40 }} color={c.textMuted} />
          : list.length === 0 ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>아직 받은 관심이 없어요</AppText>
          : list.map((n) => (
            <View key={n.id} style={{ opacity: n.readAt ? 0.75 : 1 }}>
              <PersonRow p={n.actor} onPress={() => (n.crewId ? router.push(`/crew/${n.crewId}` as never) : setOpen(n.actor))} sub={`${noticeText(n)} · ${timeAgo(n.createdAt)}`}
                action={n.type === "follow_request" ? [{ label: "수락", strong: true, onPress: () => answer(n, true) }, { label: "거절", onPress: () => answer(n, false) }] : undefined} />
            </View>
          ))}
      </ScrollView>
      <PersonSheet person={open} onClose={() => setOpen(null)} />
      {toast}
    </View>
  );
}
