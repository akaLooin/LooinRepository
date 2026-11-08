import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { MoodMark } from "./Mood";
import { StoredImage } from "./StoredImage";
import { ChevronRight, SmilePlus } from "./icons";

/** Avatar, name, bio, first D-day and the status-emoji button (S03). */
export function ProfileHeader({ name, bio, avatar, dday, onDday, onEmoji, emoji, readOnly }: {
  name: string; bio?: string; avatar?: string; dday?: { title: string; label: string }; onDday?: () => void; onEmoji?: () => void;
  /** the selected day's diary mood (sticker or emoji), in place of the dashed 😊+ that opens the diary (original) */
  emoji?: string;
  /** someone else's profile: no placeholder bio, no emoji button */
  readOnly?: boolean;
}) {
  const { c } = useTheme();
  const a = tokens.size.avatarProfile;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      {avatar ? <StoredImage uri={avatar} label="프로필 사진" style={{ width: a, height: a, borderRadius: a / 2 }} /> : <View style={{ width: a, height: a, borderRadius: a / 2, backgroundColor: c.surfaceStrong }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="profileName">{name}</AppText>
        {bio || !readOnly ? <AppText variant="body" color="textMuted" numberOfLines={2}>{bio || "프로필에 자기소개를 입력해보세요"}</AppText> : null}
        {dday ? (
          <Pressable onPress={onDday} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityRole="button" accessibilityLabel={`${dday.title} ${dday.label}`}>
            <AppText variant="body" weight={700}>{dday.title} </AppText>
            <AppText variant="body" weight={700} color="dday">{dday.label}</AppText>
            <ChevronRight size={16} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {readOnly && !emoji ? null : <Pressable onPress={onEmoji} disabled={!onEmoji} hitSlop={8} accessibilityRole="button" accessibilityLabel={emoji ? "오늘의 일기 보기" : "일기 쓰기"} style={{ alignSelf: "flex-start", marginTop: 18 }}>
        {emoji ? (
          <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <MoodMark value={emoji} size={40} />
          </View>
        ) : (
        <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
          <Svg width={34} height={34} style={{ position: "absolute" }}>
            <Circle cx={17} cy={17} r={15} stroke={c.textMuted} strokeWidth={1.6} strokeDasharray="3 3" fill="none" />
          </Svg>
          <SmilePlus size={18} color={c.textMuted} />
        </View>
        )}
      </Pressable>}
    </View>
  );
}
