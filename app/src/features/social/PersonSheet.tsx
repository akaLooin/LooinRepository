import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText, BottomSheet, Ellipsis, House, Send, StoredImage, useToast, X } from "../../components";
import { block, getPerson, follow, removeFollower, showFriend, unblock, unfollow, type Person } from "../../data/social";
import { ActionSheet } from "../settings/parts";
import { openConversation } from "../../data/chat";
import { tokens, useTheme } from "../../theme";
import { CloverBurst } from "./CloverBurst";

/**
 * Someone's profile (original, user's recording): a large picture on top with ✕ on the left and 팔로우 and ⋯ on the
 * right, the name below with a home button (their home) and a paper plane (대화). Following makes clovers pop.
 * We have no cover pictures, so the profile photo fills the top.
 */
export function PersonSheet({ person: initial, onClose, onChange }: { person: Person | null; onClose: () => void; onChange?: (p: Person) => void }) {
  const { c } = useTheme();
  const [p, setP] = useState<Person | null>(initial);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [burst, setBurst] = useState(0);
  const [toast, notice] = useToast();
  useEffect(() => {
    setP(initial);
    setBurst(0);
    if (initial) getPerson(initial.id).then((x) => { if (x) setP(x); }).catch(() => {});
  }, [initial]);
  const update = (next: Person) => { setP(next); onChange?.(next); };
  const run = async (f: () => Promise<Person | void>) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await f();
      if (next) update(next);
    } catch (e) {
      notice(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요");
    } finally {
      setBusy(false);
    }
  };
  const onFollow = () => run(async () => {
    if (!p) return;
    if (p.iFollow) { await unfollow(p.id); return { ...p, iFollow: null, followers: p.iFollow === "accepted" && p.followers ? p.followers - 1 : p.followers }; }
    const st = await follow(p.id);
    if (st === "accepted") setBurst((n) => n + 1);
    else notice("팔로우를 요청했어요");
    return { ...p, iFollow: st, followers: st === "accepted" && p.followers !== undefined ? p.followers + 1 : p.followers };
  });
  const label = p?.iFollow === "accepted" ? "팔로잉" : p?.iFollow === "pending" ? "요청됨" : "팔로우";
  const H = 260;
  return (
    <BottomSheet visible={!!initial} onClose={onClose}>
      {p ? (
        <View style={{ marginHorizontal: -tokens.layout.gutter, marginTop: -8 }}>
          <View style={{ height: H, backgroundColor: c.surfaceStrong, overflow: "hidden" }}>
            {p.avatarUri ? <StoredImage uri={p.avatarUri} label={`${p.nickname} 프로필 사진`} style={{ width: "100%", height: H }} /> : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <AppText style={{ fontSize: 72, lineHeight: 88 }} color="textMuted">{p.nickname.slice(0, 1)}</AppText>
              </View>
            )}
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="닫기" style={{ position: "absolute", left: 14, top: 14 }}>
              <X size={26} color={c.text} />
            </Pressable>
            <View style={{ position: "absolute", right: 12, top: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
              {p.blockedByMe ? null : (
                <Pressable onPress={onFollow} disabled={busy} accessibilityRole="button" accessibilityLabel={label}
                  style={{ height: 34, paddingHorizontal: 16, borderRadius: 17, justifyContent: "center", backgroundColor: p.iFollow ? c.surfaceButton : c.selectedBg }}>
                  {busy ? <ActivityIndicator size="small" color={c.text} /> : <AppText variant="body" weight={600} color={p.iFollow ? "text" : "onSelected"}>{label}</AppText>}
                </Pressable>
              )}
              <Pressable onPress={() => setMenu(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="더보기"
                style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceButton }}>
                <Ellipsis size={20} color={c.text} />
              </Pressable>
            </View>
          </View>
          <View style={{ paddingHorizontal: tokens.layout.gutter, paddingTop: 20, paddingBottom: 12, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="profileName" numberOfLines={1}>{p.nickname}</AppText>
                {p.handle ? <AppText variant="helper" color="textMuted">@{p.handle}</AppText> : null}
              </View>
              <RoundButton label={`${p.nickname}의 홈`} onPress={() => { onClose(); showFriend(p.id); router.replace("/" as never); }}><House size={20} color={c.text} /></RoundButton>
              <RoundButton label="대화" onPress={() => run(async () => {
                const conv = await openConversation(p.id);
                onClose();
                router.push(`/chat/${conv}` as never);
              })}><Send size={20} color={c.text} /></RoundButton>
            </View>
            {p.bio ? <AppText variant="body" color="textSecondary">{p.bio}</AppText> : null}
            {p.followers !== undefined ? (
              <AppText variant="helper">
                <AppText variant="helper" color="textMuted">팔로워 </AppText>{p.followers}{"  "}
                <AppText variant="helper" color="textMuted">팔로잉 </AppText>{p.following ?? 0}
                {p.followsMe === "accepted" ? <AppText variant="helper" color="textMuted">{"  · 나를 팔로우해요"}</AppText> : null}
              </AppText>
            ) : null}
            {p.blockedByMe ? <AppText variant="helper" color="danger">차단한 사람이에요</AppText> : null}
          </View>
          <CloverBurst run={burst} color={c.accent} />
          {toast}
        </View>
      ) : null}
      <ActionSheet visible={menu} onClose={() => setMenu(false)} options={p ? [
        ...(p.followsMe ? [{ label: "팔로워 삭제", onPress: () => run(async () => { await removeFollower(p.id); return { ...p, followsMe: null }; }) }] : []),
        p.blockedByMe
          ? { label: "차단 해제", onPress: () => run(async () => { await unblock(p.id); return { ...p, blockedByMe: false }; }) }
          : { label: "차단하기", danger: true, onPress: () => run(async () => { await block(p.id); return { ...p, blockedByMe: true, iFollow: null, followsMe: null }; }) },
      ] : []} />
    </BottomSheet>
  );
}

function RoundButton({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceButton }}>
      {children}
    </Pressable>
  );
}
