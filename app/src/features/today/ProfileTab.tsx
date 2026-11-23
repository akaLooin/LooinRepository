import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  AppText, Bell, ChevronRight, CircleQuestionMark, FlaskConical, Info, Lock, Megaphone, Monitor, Palette, Pencil, Shield, SmilePlus, Tag, CalendarDays, StoredImage, User, Users, useFrame, useToast, RefreshCw,
} from "../../components";
import { followList, getPerson } from "../../data/social";
import { sessionUserId, useDB } from "../../data/store";
import { streakOf, today } from "../../lib/dates";
import { useFeature, useT } from "../../lib/appConfig";
import { unregisterPush } from "../../lib/push";
import { supabase } from "../../lib/supabase";
import { updateNow } from "../../lib/updateNow";
import { tokens, useInsets, useTheme } from "../../theme";

const G = tokens.layout.gutter;

type Row = [string, typeof User, string];
const GROUPS: [string, Row[]][] = [
  ["계정", [["계정", User, "/settings/account"], ["개인정보 보호", Shield, "/settings/privacy"], ["앱 권한", Lock, "/settings/permissions"]]],
  ["앱", [["스킨", Palette, "/settings/skins"], ["일정 카테고리", Tag, "/settings/event-categories"], ["구글 캘린더", CalendarDays, "/settings/google"], ["화면", Monitor, "/settings/display"], ["알림", Bell, "/settings/notifications"], ["내 스티커", SmilePlus, "/settings/stickers"], ["실험실", FlaskConical, "/settings/lab"]]],
  ["도움", [["공지사항", Megaphone, "/settings/notices"], ["문의하기", CircleQuestionMark, "/settings/faq"], ["정보", Info, "/settings/about"]]],
];

/** The settings as grouped cards (design app): used under 프로필 and as the 설정 screen. */
export function SettingsGroups() {
  const { c } = useTheme();
  const frame = useFrame();
  const [toast, notice] = useToast();
  const version = Constants.expoConfig?.version ?? "";
  const at = Updates.isEnabled && !Updates.isEmbeddedLaunch && Updates.createdAt ? Updates.createdAt : null;
  const updated = at ? `${at.getMonth() + 1}월 ${at.getDate()}일 ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")} 업데이트` : "설치한 그대로";
  return (
    <View>
      {GROUPS.map(([title, rows]) => (
        <View key={title} style={{ marginTop: 22 }}>
          <AppText variant="small" weight={700} color="textMuted" style={{ marginBottom: 8, marginLeft: 4 }} accessibilityRole="header">{title}</AppText>
          <View style={{ borderRadius: tokens.radius.lg, backgroundColor: c.surface, overflow: "hidden", ...frame }}>
            {rows.map(([label, I, path], i) => (
              <Pressable key={label} onPress={() => router.push(path as never)} accessibilityRole="button" accessibilityLabel={label}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 52, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.sectionLine }}>
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}><I size={17} color={c.text} /></View>
                <AppText variant="bodyLg" style={{ flex: 1 }}>{label}</AppText>
                <ChevronRight size={18} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <View style={{ marginTop: 22, alignItems: "center", gap: 2 }}>
        <AppText variant="small" color="textMuted">{`버전 ${version} · ${updated}`}</AppText>
        {/* 지금 업데이트 (user, 2026-11-23): a new version at once, without closing the app */}
        <Pressable onPress={async () => {
            const r = await updateNow();
            if (r === "latest") notice("이미 최신 버전이에요");
            else if (r === "unavailable") notice("여기서는 업데이트를 받을 수 없어요");
            else if (r === "failed") notice("새 버전을 받지 못했어요. 인터넷을 확인해 주세요");
          }} accessibilityRole="button" accessibilityLabel="지금 업데이트"
          style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 16, marginTop: 8, borderRadius: 20, backgroundColor: c.surface, ...frame }}>
          <RefreshCw size={15} color={c.text} />
          <AppText variant="helper" weight={700}>지금 업데이트</AppText>
        </Pressable>
        {toast}
        {supabase ? (
          <Pressable onPress={async () => { await unregisterPush(); await supabase?.auth.signOut(); }} accessibilityRole="button" style={{ height: 44, justifyContent: "center" }}>
            <AppText variant="helper" color="danger" weight={600}>로그아웃</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * 프로필 (design app, 2026-11-21 third pass, user: change the structure, not like the original's 마이). A centred card
 * (photo, name, friends), three record tiles (all done, this month, days in a row), then the settings as grouped
 * cards right on this tab, so there is no separate gear page.
 */
export function ProfileTab() {
  const { c } = useTheme();
  const frame = useFrame();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  const todos = useDB((d) => d.todos);
  const [email, setEmail] = useState("");
  const tx = useT(); // wording and the record tiles from the admin app
  const showStats = useFeature("profile.stats");
  const [counts, setCounts] = useState({ following: 0, followers: 0 });
  useEffect(() => { supabase?.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? "")); }, []);
  useFocusEffect(useCallback(() => {
    const me = sessionUserId();
    if (me) getPerson(me).then((p) => p && setCounts({ following: p.following ?? 0, followers: p.followers ?? 0 })).catch(() => {});
    else Promise.all([followList("following"), followList("followers")]).then(([a, b]) => setCounts({ following: a.length, followers: b.length })).catch(() => {});
  }, []));
  const now = today();
  const done = todos.filter((t) => t.isDone && !t.isSkipped);
  const thisMonth = done.filter((t) => (t.date ?? "").startsWith(now.slice(0, 7))).length;
  const streak = streakOf(new Set(done.map((t) => t.date).filter((d): d is string => !!d)), now);
  const a = 84;
  const tile = (value: string, label: string) => (
    <View style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 14, borderRadius: tokens.radius.lg, backgroundColor: c.surface, ...frame }} accessible accessibilityLabel={`${label} ${value}`}>
      <AppText variant="monthTitle" weight={700}>{value}</AppText>
      <AppText variant="small" color="textMuted">{label}</AppText>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: G, height: 56 }}>
        <AppText variant="monthTitle" weight={700} style={{ flex: 1 }} accessibilityRole="header">{tx("profile.title")}</AppText>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", paddingVertical: 22, borderRadius: tokens.radius.lg, backgroundColor: c.surface, ...frame }}>
          <Pressable onPress={() => router.push("/profile" as never)} accessibilityRole="button" accessibilityLabel="프로필 고치기">
            {profile.avatarUri
              ? <StoredImage uri={profile.avatarUri} label="프로필 사진" style={{ width: a, height: a, borderRadius: a / 2 }} />
              : <View style={{ width: a, height: a, borderRadius: a / 2, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}><User size={36} color={c.textMuted} /></View>}
            <View style={{ position: "absolute", right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: c.text, alignItems: "center", justifyContent: "center" }}>
              <Pencil size={14} color={c.bg} />
            </View>
          </Pressable>
          <AppText variant="bodyLg" weight={700} style={{ marginTop: 12 }}>{profile.nickname || "이름 없음"}</AppText>
          {email ? <AppText variant="small" color="textMuted" style={{ marginTop: 2 }}>{email}</AppText> : null}
          <Pressable onPress={() => router.push("/people?tab=following" as never)} accessibilityRole="button" accessibilityLabel={`친구 ${counts.following}명, 나를 추가한 사람 ${counts.followers}명`}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.surfaceStrong }}>
            <Users size={15} color={c.text} />
            <AppText variant="small" weight={600}>{`친구 ${counts.following}`}</AppText>
            <AppText variant="small" color="textMuted">{`· 나를 추가 ${counts.followers}`}</AppText>
          </Pressable>
        </View>
        {showStats ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          {tile(String(done.length), tx("profile.done"))}
          {tile(String(thisMonth), tx("profile.month"))}
          {tile(`${streak}일`, tx("profile.streak"))}
        </View>
        ) : null}
        <SettingsGroups />
      </ScrollView>
    </View>
  );
}
