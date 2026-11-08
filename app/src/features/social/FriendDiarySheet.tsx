import { Pressable, ScrollView, View } from "react-native";
import { useState } from "react";
import { AppText, BottomSheet, Ellipsis, Heart, MoodGauge, MoodMark, StoredImage } from "../../components";
import { ActionSheet } from "../settings/parts";
import type { Person, Reaction } from "../../data/social";
import type { Diary } from "../../data/types";
import { parseDay, weekday } from "../../lib/dates";
import { contrast, tokens, useTheme } from "../../theme";
import { ReactionLine } from "./ReactionLine";

/**
 * A diary, read only, in a sheet: mood sticker and 기분 온도 on top, name and date, the text, photos, in the diary's
 * background colour. A friend's has a heart for a sticker/emoji reaction; my own has ⋯ → 수정 / 삭제 (original,
 * user's recording) and shows the reactions friends left.
 */
export function FriendDiarySheet({ diary, person, reactions, onReact, onClose, onEdit, onDelete }: {
  diary: Diary | null; person: Pick<Person, "nickname" | "avatarUri">; reactions: Reaction[]; onReact?: () => void; onClose: () => void;
  onEdit?: () => void; onDelete?: () => void;
}) {
  const [menu, setMenu] = useState(false);
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
            {diary.emoji ? <View style={{ alignItems: "center", gap: 6 }}>
              <MoodMark value={diary.emoji} size={64} />
              {typeof diary.moodTemp === "number" ? <MoodGauge temp={diary.moodTemp} ink={ink} track={c.surfaceStrong} /> : null}
            </View> : null}
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
            {onEdit || onDelete ? (
              <Pressable onPress={() => setMenu(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="일기 메뉴">
                <Ellipsis size={24} color={ink} />
              </Pressable>
            ) : null}
            {onReact ? <Pressable onPress={onReact} hitSlop={10} accessibilityRole="button" accessibilityLabel={mine ? "일기 반응 바꾸기" : "일기에 반응하기"}>
              <Heart size={26} color={mine ? c.sunday : ink} fill={mine ? c.sunday : "transparent"} />
            </Pressable> : null}
          </View>
        </View>
      ) : null}
      <ActionSheet visible={menu} onClose={() => setMenu(false)} options={[
        ...(onEdit ? [{ label: "수정", onPress: onEdit }] : []),
        ...(onDelete ? [{ label: "삭제", danger: true, onPress: onDelete }] : []),
      ]} />
    </BottomSheet>
  );
}
