import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText, Clover, Heart, StoredImage, useToast, MoodMark, ZoomPhoto } from "../../components";
import { friendFeed, react, type FeedItem, type Person } from "../../data/social";
import { usePrefs } from "../../data/prefs";
import { nextReaction, timeAgo } from "../../lib/friend";
import { parseDay } from "../../lib/dates";
import { tokens, useTheme, visibleOn } from "../../theme";
import { ReactionLine } from "./ReactionLine";
import { ReactionSheet } from "./ReactionSheet";

/**
 * 친구 소식 (둘러보기, under the search field): what the people I follow finished and the diaries they share, newest
 * first, with a heart for a sticker/emoji reaction. 설정 → 화면: 피드에서 메모 줄 제한 cuts long memos and diaries,
 * 피드에서 좋아요 보이기 shows or hides the reactions under each entry. (Layout ours: the original's feed was not recorded.)
 */
export function FeedList({ onPerson, only, heading = true }: { onPerson: (p: Person) => void; only?: "todo" | "diary"; heading?: boolean }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<FeedItem | null>(null);
  const [toast, notice] = useToast();

  useFocusEffect(useCallback(() => {
    let alive = true;
    friendFeed().then((l) => { if (alive) { setItems(l); setMore(l.length >= 30); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "불러오지 못했어요"); });
    return () => { alive = false; };
  }, []));
  const loadMore = () => {
    const last = items?.[items.length - 1];
    if (!last) return;
    friendFeed(last.at).then((l) => { setItems((x) => [...(x ?? []), ...l.filter((n) => !x?.some((o) => o.id === n.id))]); setMore(l.length >= 30); }).catch(() => {});
  };
  const onPick = (it: FeedItem, value: string, kind: "emoji" | "sticker") => {
    const before = it.reactions;
    const { list, action } = nextReaction(before, { kind, value });
    const put = (reactions: typeof list) => setItems((x) => x?.map((o) => (o.id === it.id ? { ...o, reactions } : o)) ?? x);
    setPicking(null);
    put(list);
    react(it.id, { kind, value }, action === "clear", it.kind).catch((e) => { put(before); notice(e instanceof Error ? e.message : "반응을 남기지 못했어요"); });
  };
  const lines = prefs.feedMemoLines || undefined;
  // 알림 tabs show one kind (친구의 할 일 / 친구의 일기)
  const shown = items && only ? items.filter((it) => it.kind === only) : items;

  if (error) return <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>{error}</AppText>;
  if (!shown) return <ActivityIndicator style={{ marginTop: 40 }} color={c.textMuted} />;
  return (
    <View>
      {heading ? <AppText variant="bodyLg" weight={700} style={{ marginTop: 8, marginBottom: 4 }} accessibilityRole="header">친구 소식</AppText> : null}
      {shown.length === 0 ? (
        <AppText variant="body" color="textMuted" style={{ paddingVertical: 24 }}>
          {only === "todo" ? "팔로우한 친구가 할 일을 끝내면 여기에 보여요." : only === "diary" ? "팔로우한 친구가 일기를 쓰면 여기에 보여요."
            : "팔로우한 친구가 할 일을 끝내거나 일기를 쓰면 여기에 보여요. 위 칸에서 ID나 이름으로 친구를 찾아보세요."}
        </AppText>
      ) : null}
      {shown.map((it) => {
        const mine = it.reactions.some((r) => r.mine);
        const what = it.kind === "todo" ? it.title ?? "" : "일기";
        const d = it.date ? parseDay(it.date) : null;
        return (
          <View key={it.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.divider, gap: 10 }}>
            <Pressable onPress={() => onPerson(it.person)} accessibilityRole="button" accessibilityLabel={`${it.person.nickname} 프로필`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {it.person.avatarUri ? <StoredImage uri={it.person.avatarUri} label="" style={{ width: 36, height: 36, borderRadius: 18 }} />
                : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceStrong }} />}
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight={700} numberOfLines={1}>{it.person.nickname}</AppText>
                <AppText variant="small" color="textMuted">{`${timeAgo(it.at)}${d ? ` · ${d.m}월 ${d.d}일${it.kind === "todo" ? " 완료" : " 일기"}` : ""}`}</AppText>
              </View>
            </Pressable>
            {it.kind === "todo" ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Clover size={tokens.size.cloverTodo} state={{ kind: "todoDone", color: it.category?.color ?? c.accent }} label={`${it.title}, 완료됨`} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyLg">{it.title}</AppText>
                  {it.category ? <AppText variant="small" raw={visibleOn(it.category.color, c.bg, c.textMuted)}>{it.category.title}</AppText> : null}
                  {it.memo ? <AppText variant="helper" color="textSecondary" numberOfLines={lines}>{it.memo}</AppText> : null}
                  {it.photoUri ? <ZoomPhoto uri={it.photoUri} label="인증 사진" others={true}><StoredImage uri={it.photoUri} label="인증 사진" style={{ marginTop: 6, width: "100%", aspectRatio: 2, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} /></ZoomPhoto> : null}
                </View>
              </View>
            ) : (
              <View style={{ borderRadius: tokens.radius.lg, padding: 14, gap: 6, backgroundColor: c.surface }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{it.emoji ? <MoodMark value={it.emoji} size={28} /> : <AppText variant="bodyLg">📔</AppText>}<AppText variant="bodyLg">일기</AppText></View>
                {it.body ? <AppText variant="body" numberOfLines={lines ?? 6}>{it.body}</AppText> : null}
                {it.imagePaths?.length ? (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {it.imagePaths.slice(0, 3).map((u, i) => <ZoomPhoto key={u + i} uri={u} label={`일기 사진 ${i + 1}`} others={true}><StoredImage uri={u} label={`일기 사진 ${i + 1}`} style={{ width: 84, height: 84, borderRadius: tokens.radius.md }} /></ZoomPhoto>)}
                  </View>
                ) : null}
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>{prefs.showLikesInFeed ? <ReactionLine list={it.reactions} size={36} /> : null}</View>
              <Pressable onPress={() => setPicking(it)} hitSlop={10} accessibilityRole="button" accessibilityLabel={mine ? `${what} 반응 바꾸기` : `${what}에 반응하기`}>
                <Heart size={24} color={mine ? c.sunday : c.textMuted} fill={mine ? c.sunday : "transparent"} />
              </Pressable>
            </View>
          </View>
        );
      })}
      {more ? (
        <Pressable onPress={loadMore} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: 16 }}>
          <AppText variant="body" color="textMuted">더 보기</AppText>
        </Pressable>
      ) : null}
      <ReactionSheet visible={!!picking} current={picking?.reactions.find((r) => r.mine)?.value}
        onPick={(v, k) => picking && onPick(picking, v, k)} onClose={() => setPicking(null)} />
      {toast}
    </View>
  );
}
