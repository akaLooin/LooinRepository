import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, Bell, ChevronRight, Plus, Search, Send, StoredImage, X } from "../../components";
import { useUnreadConversations } from "../../data/chat";
import { useMyCrews } from "../../data/crews";
import { searchPeople, useFollowing, type Person } from "../../data/social";
import { useAppConfig, useT } from "../../lib/appConfig";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";
import { FeedList } from "../social/FeedList";
import { PersonRow } from "../social/PersonRow";
import { PersonSheet } from "../social/PersonSheet";

const G = tokens.layout.gutter;
const SHOWN = 5;

/**
 * 커뮤니티 (design app, 2026-11-21 third pass, user: "친구 위주", not like the original). Friends come first as a
 * list (tap: their home), then 소식 (the friends' feed) or 찾기 (find people) on a switch. 대화 and 알림 at the top.
 * Crews only show when the admin panel turns them on (app_config crews_enabled).
 */
export function TogetherScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const following = useFollowing();
  const config = useAppConfig();
  const crews = useMyCrews();
  const unread = useUnreadConversations();
  const [mode, setMode] = useState<"feed" | "find">("feed");
  const tx = useT(); // wording from the admin app
  const [open, setOpen] = useState<Person | null>(null);
  const a = 44;
  const avatar = (uri: string | undefined, square?: boolean) => (uri
    ? <StoredImage uri={uri} label="" style={{ width: a, height: a, borderRadius: square ? 14 : a / 2 }} />
    : <View style={{ width: a, height: a, borderRadius: square ? 14 : a / 2, backgroundColor: c.surfaceStrong }} />);
  const sectionTitle = (t: string, more?: [string, () => void]) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 8 }}>
      <AppText variant="body" weight={700} style={{ flex: 1 }} accessibilityRole="header">{t}</AppText>
      {more ? (
        <Pressable onPress={more[1]} hitSlop={8} accessibilityRole="button" accessibilityLabel={more[0]} style={{ flexDirection: "row", alignItems: "center" }}>
          <AppText variant="small" color="textMuted">{more[0]}</AppText><ChevronRight size={14} color={c.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: G, height: 56 }}>
        <AppText variant="monthTitle" weight={700} style={{ flex: 1 }} accessibilityRole="header">{tx("community.title")}</AppText>
        <Pressable onPress={() => router.push("/alerts" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="알림"><Bell size={23} color={c.text} /></Pressable>
        <Pressable onPress={() => router.push("/send" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel={unread ? "대화, 새 메시지" : "대화"}>
          <Send size={23} color={c.text} />
          {unread ? <View style={{ position: "absolute", top: -2, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: c.sunday }} /> : null}
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40 }}>
        {/* friends first */}
        <View style={{ borderRadius: tokens.radius.lg, backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", height: 44 }}>
            <AppText variant="body" weight={700} style={{ flex: 1 }} accessibilityRole="header">{`친구 ${following.length}`}</AppText>
            <Pressable onPress={() => router.push("/people" as never)} hitSlop={8} accessibilityRole="button" accessibilityLabel="친구 추가"
              style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: c.surfaceStrong }}>
              <Plus size={14} color={c.text} /><AppText variant="small" weight={600}>{tx("community.addFriend")}</AppText>
            </Pressable>
          </View>
          {following.length ? following.slice(0, SHOWN).map((p) => (
            <Pressable key={p.id} onPress={() => router.push(`/friend/${p.id}` as never)} accessibilityRole="button" accessibilityLabel={`${p.nickname} 홈`}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
              {avatar(p.avatarUri)}
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight={600} numberOfLines={1}>{p.nickname}</AppText>
                <AppText variant="small" color="textMuted" numberOfLines={1}>{p.bio || `@${p.handle}`}</AppText>
              </View>
              <AppText variant="small" color="textMuted">하루 보기</AppText>
              <ChevronRight size={16} color={c.textMuted} />
            </Pressable>
          )) : (
            <AppText variant="helper" color="textMuted" style={{ paddingVertical: 12 }}>친구를 추가하면 서로의 하루를 보고 응원할 수 있어요</AppText>
          )}
          {following.length > SHOWN ? (
            <Pressable onPress={() => router.push("/people?tab=following" as never)} accessibilityRole="button" style={{ height: 40, justifyContent: "center", alignItems: "center" }}>
              <AppText variant="small" color="textMuted">{`친구 ${following.length}명 모두 보기`}</AppText>
            </Pressable>
          ) : null}
        </View>

        {config.crews && crews.length ? (
          <>
            {sectionTitle("크루")}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {crews.map((cr) => (
                <Pressable key={cr.id} onPress={() => router.push(`/friend/crew:${cr.id}` as never)} accessibilityRole="button" accessibilityLabel={`${cr.name} 홈`} style={{ alignItems: "center", gap: 6, width: a + 16 }}>
                  {avatar(cr.imageUri, true)}
                  <AppText variant="small" numberOfLines={1}>{cr.name}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* 소식 | 찾기 */}
        <View style={{ flexDirection: "row", marginTop: 22, marginBottom: 6, borderRadius: 12, backgroundColor: c.surface, padding: 3 }} role="tablist">
          {([["feed", tx("community.feed")], ["find", tx("community.find")]] as const).map(([k, label]) => (
            <Pressable key={k} onPress={() => setMode(k)} role="tab" aria-selected={mode === k} accessibilityLabel={label}
              style={{ flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: mode === k ? c.surfaceStrong : "transparent" }}>
              <AppText variant="helper" weight={mode === k ? 700 : 500} color={mode === k ? "text" : "textMuted"}>{label}</AppText>
            </Pressable>
          ))}
        </View>
        {mode === "feed" ? <FeedList onPerson={setOpen} heading={false} /> : <FindPeople onOpen={setOpen} />}
      </ScrollView>
      <PersonSheet person={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function FindPeople({ onOpen }: { onOpen: (p: Person) => void }) {
  const { c } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(0);
  useEffect(() => {
    if (!q.trim()) { setResults(null); setError(null); return; }
    const n = ++asked.current;
    const t = setTimeout(() => {
      setBusy(true);
      searchPeople(q)
        .then((r) => { if (n === asked.current) { setResults(r); setError(null); } })
        .catch((e) => { if (n === asked.current) setError(e instanceof Error ? e.message : "찾지 못했어요"); })
        .finally(() => { if (n === asked.current) setBusy(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: 44, borderRadius: 22, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 10, gap: 8 }}>
        <Search size={18} color={c.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder="닉네임 또는 ID" placeholderTextColor={c.textPlaceholder} autoCapitalize="none" autoCorrect={false} autoFocus
          accessibilityLabel="닉네임 또는 ID로 찾기" returnKeyType="search"
          style={{ flex: 1, color: c.text, fontSize: tokens.type.bodyLg.size, fontFamily: fontFamily(400), paddingVertical: 0, outlineStyle: "none" as never }} />
        {busy ? <ActivityIndicator size="small" color={c.textMuted} /> : null}
        {q ? <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="지우기"><X size={18} color={c.textMuted} /></Pressable> : null}
      </View>
      {error ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 30 }}>{error}</AppText>
        : results === null ? <AppText variant="helper" color="textMuted" center style={{ paddingVertical: 30 }}>닉네임이나 ID로 친구를 찾아 보세요</AppText>
        : results.length === 0 ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 30 }}>찾는 사람이 없어요</AppText>
        : results.map((p) => <PersonRow key={p.id} p={p} onPress={() => onOpen(p)} />)}
    </View>
  );
}
