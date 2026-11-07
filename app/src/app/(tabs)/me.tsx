import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, BottomSheet, Settings, StoredImage } from "../../components";
import { sessionUserId, useDB } from "../../data/store";
import { followList, getPerson } from "../../data/social";
import { today } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { tokens, useInsets, useTheme } from "../../theme";

/**
 * S18, laid out as the original's 마이 (user's recording): gear to settings, photo, name, e-mail, following counts
 * (tap → 친구 lists), and 나의 기록. Premium and the sticker shop are left out on purpose.
 */
export default function Me() {
  const { c } = useTheme();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  const todos = useDB((d) => d.todos);
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState(false);
  useEffect(() => { supabase?.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? "")); }, []);
  const a = 56;
  const [counts, setCounts] = useState({ following: 0, followers: 0 });
  useFocusEffect(useCallback(() => {
    const me = sessionUserId();
    if (me) getPerson(me).then((p) => p && setCounts({ following: p.following ?? 0, followers: p.followers ?? 0 })).catch(() => {});
    else Promise.all([followList("following"), followList("followers")]).then(([a, b]) => setCounts({ following: a.length, followers: b.length })).catch(() => {});
  }, []));

  const done = todos.filter((t) => t.isDone && !t.isSkipped);
  const month = today().slice(0, 7);
  const thisMonth = done.filter((t) => (t.date ?? "").startsWith(month)).length;
  const days = new Set(done.map((t) => t.date).filter(Boolean)).size;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingHorizontal: tokens.layout.gutter }}>
      <View style={{ height: 52, alignItems: "flex-end", justifyContent: "center" }}>
        <Pressable onPress={() => router.push("/settings" as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel="설정">
          <Settings size={24} color={c.text} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {profile.avatarUri
          ? <StoredImage uri={profile.avatarUri} label="프로필 사진" style={{ width: a, height: a, borderRadius: a / 2 }} />
          : <View style={{ width: a, height: a, borderRadius: a / 2, backgroundColor: c.surfaceStrong }} />}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyLg" weight={700}>{profile.nickname || "이름 없음"}</AppText>
          {email ? <AppText variant="helper" color="textMuted">{email}</AppText> : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => router.push("/people?tab=following" as never)} accessibilityRole="button" accessibilityLabel={`팔로잉 ${counts.following}`}>
              <AppText variant="helper"><AppText variant="helper" color="textMuted">팔로잉 </AppText>{counts.following}</AppText>
            </Pressable>
            <Pressable onPress={() => router.push("/people?tab=followers" as never)} accessibilityRole="button" accessibilityLabel={`팔로워 ${counts.followers}`}>
              <AppText variant="helper"><AppText variant="helper" color="textMuted">팔로워 </AppText>{counts.followers}</AppText>
            </Pressable>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", marginTop: 20, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceRow, paddingVertical: 14 }}>
        <Pressable onPress={() => setStats(true)} accessibilityRole="button" style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <AppText variant="bodyLg" weight={700}>{done.length}</AppText>
          <AppText variant="helper">나의 기록</AppText>
        </Pressable>
      </View>
      <BottomSheet visible={stats} onClose={() => setStats(false)} title="나의 기록">
        {[["지금까지 완료한 할 일", `${done.length}개`], ["이번 달 완료한 할 일", `${thisMonth}개`], ["할 일을 끝낸 날", `${days}일`]].map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 }}>
            <AppText variant="bodyLg">{k}</AppText>
            <AppText variant="bodyLg" weight={700}>{v}</AppText>
          </View>
        ))}
      </BottomSheet>
    </View>
  );
}
