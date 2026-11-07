import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { AppText, ScreenHeader, useToast } from "../../components";
import { followList, refreshFollowing, removeFollower, respondFollow, unfollow, type Person } from "../../data/social";
import { tokens, useInsets, useTheme } from "../../theme";
import { PersonRow } from "./PersonRow";
import { PersonSheet } from "./PersonSheet";

type Tab = "following" | "followers" | "requests";
const TABS: { key: Tab; label: string }[] = [{ key: "following", label: "팔로잉" }, { key: "followers", label: "팔로워" }, { key: "requests", label: "요청" }];

/** 팔로잉 / 팔로워 / 받은 요청, from the home people button and 마이's counts. (Layout guessed: not in the recordings.) */
export function PeopleScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === params.tab) ? (params.tab as Tab) : "following");
  const [list, setList] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Person | null>(null);
  const [toast, notice] = useToast();
  const load = useCallback(() => {
    setList(null);
    followList(tab).then((l) => { setList(l); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했어요"));
  }, [tab]);
  useEffect(load, [load]);
  const act = (f: () => Promise<unknown>, done: string) => f().then(() => { notice(done); load(); refreshFollowing(); }).catch((e) => notice(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요"));
  const actions = (p: Person) =>
    tab === "following" ? [{ label: "팔로잉", onPress: () => act(() => unfollow(p.id), `${p.nickname}님 팔로우를 취소했어요`) }]
    : tab === "followers" ? [{ label: "삭제", onPress: () => act(() => removeFollower(p.id), `${p.nickname}님을 팔로워에서 삭제했어요`) }]
    : [{ label: "수락", strong: true, onPress: () => act(() => respondFollow(p.id, true), "요청을 수락했어요") }, { label: "거절", onPress: () => act(() => respondFollow(p.id, false), "요청을 거절했어요") }];
  const G = tokens.layout.gutter;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="친구" onBack={() => router.back()} right={{ label: "찾기", onPress: () => router.replace("/explore" as never) }} />
      <View style={{ flexDirection: "row", paddingHorizontal: G, gap: 8, marginBottom: 8 }} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }}
            style={{ height: 34, paddingHorizontal: 16, borderRadius: 17, justifyContent: "center", backgroundColor: tab === t.key ? c.selectedBg : c.surface }}>
            <AppText variant="body" weight={600} color={tab === t.key ? "onSelected" : "text"}>{t.label}</AppText>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40 }}>
        {error ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>{error}</AppText>
          : list === null ? <ActivityIndicator style={{ marginTop: 40 }} color={c.textMuted} />
          : list.length === 0 ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>{tab === "requests" ? "받은 요청이 없어요" : "아직 아무도 없어요"}</AppText>
          : list.map((p) => <PersonRow key={p.id} p={p} onPress={() => setOpen(p)} action={actions(p)} />)}
      </ScrollView>
      <PersonSheet person={open} onClose={() => { setOpen(null); load(); }} />
      {toast}
    </View>
  );
}
