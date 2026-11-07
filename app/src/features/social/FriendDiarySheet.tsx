import { Pressable, ScrollView, View } from "react-native";
import { AppText, BottomSheet, Heart, StoredImage } from "../../components";
import type { Person, Reaction } from "../../data/social";
import type { Diary } from "../../data/types";
import { parseDay, weekday } from "../../lib/dates";
import { contrast, tokens, useTheme } from "../../theme";
import { ReactionLine } from "./ReactionLine";

/**
 * A friend's diary, read only (layout follows my own diary screen: mood on top, name and date, the text, photos, in
 * the diary's background colour). The heart at the bottom opens the sticker/emoji panel, as on their to-dos.
 * (The original's friend-diary screen was not recorded; this is our version.)
 */
export function FriendDiarySheet({ diary, person, reactions, onReact, onClose }: {
  diary: Diary | null; person: Person; reactions: Reaction[]; onReact: () => void; onClose: () => void;
}) {
  const { c } = useTheme();
  const bg = diary?.backgroundColor;
  // the diary's own colour is the friend's content; text on it picks black or white for contrast, as in DiaryScreen
  const ink = bg ? (contrast(c.onIcon, bg) >= 4.5 ? c.onIcon : c.onSelected) : c.text;
  const mine = reactions.some((r) => r.mine);
  const d = diary ? parseDay(diary.date) : null;
  return (
    <BottomSheet visible={!!diary} onClose={onClose}>
      {diary && d ? (
        <View style={{ borderRadius: tokens.radius.lg, backgroundColor: bg ?? c.surface, padding: 18, gap: 14 }}>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 14 }}>
            {diary.emoji ? <AppText center style={{ fontSize: 56, lineHeight: 70 }}>{diary.emoji}</AppText> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {person.avatarUri ? <StoredImage uri={person.avatarUri} label="" style={{ width: 40, height: 40, borderRadius: 20 }} />
                : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceStrong }} />}
              <View style={{ gap: 1 }}>
                <AppText variant="bodyLg" weight={700} raw={ink}>{person.nickname}</AppText>
                <AppText variant="helper" raw={ink} style={{ opacity: 0.75 }}>{`${d.y}년 ${d.m}월 ${d.d}일 ${"일월화수목금토"[weekday(diary.date)]}요일`}</AppText>
              </View>
            </View>
            {diary.body ? <AppText variant="bodyLg" raw={ink} style={{ lineHeight: 26 }} selectable>{diary.body}</AppText> : null}
            {diary.imagePaths.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {diary.imagePaths.map((u, i) => <StoredImage key={u + i} uri={u} label={`일기 사진 ${i + 1}`} style={{ width: 110, height: 110, borderRadius: tokens.radius.md }} />)}
              </View>
            ) : null}
          </ScrollView>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}><ReactionLine list={reactions} /></View>
            <Pressable onPress={onReact} hitSlop={10} accessibilityRole="button" accessibilityLabel={mine ? "일기 반응 바꾸기" : "일기에 반응하기"}>
              <Heart size={26} color={mine ? c.sunday : ink} fill={mine ? c.sunday : "transparent"} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}
