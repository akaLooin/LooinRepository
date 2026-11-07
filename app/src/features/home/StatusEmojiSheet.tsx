import { Pressable, View } from "react-native";
import { AppText, BottomSheet, Button } from "../../components";
import { updateProfile } from "../../data/store";
import { tokens, useTheme } from "../../theme";

/** A plain set of everyday moods and activities (system emoji, nothing taken from the original). */
const EMOJI = [
  "😀", "😊", "🥰", "😎", "🤓", "😴", "🥱", "🤒", "😤", "😭", "🤯", "🥳",
  "💪", "🏃", "🧘", "📚", "✍️", "💻", "🎧", "🎮", "🍳", "☕", "🍺", "✈️",
  "🔥", "🌱", "🌙", "☀️", "🌧️", "❄️", "❤️", "⭐", "🍀", "🎯", "🏠", "🏖️",
];

/** 상태 이모지 (the dashed 😊+ button next to the profile on home): pick one, or take it off. */
export function StatusEmojiSheet({ open, current, onClose }: { open: boolean; current?: string; onClose: () => void }) {
  const { c } = useTheme();
  const pick = (e?: string) => { updateProfile({ statusEmoji: e }); onClose(); };
  return (
    <BottomSheet visible={open} onClose={onClose} title="상태 이모지">
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 6 }}>
        {EMOJI.map((e) => (
          <Pressable key={e} onPress={() => pick(e)} accessibilityRole="button" accessibilityLabel={`상태 이모지 ${e}`} accessibilityState={{ selected: e === current }}
            style={({ pressed }) => ({ width: "16.6%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: tokens.radius.md,
              backgroundColor: e === current ? c.surfaceStrong : pressed ? c.surfaceButton : "transparent" })}>
            <AppText style={{ fontSize: 28, lineHeight: 34 }}>{e}</AppText>
          </Pressable>
        ))}
      </View>
      {current ? <View style={{ marginTop: 16 }}><Button kind="plain" label="이모지 없애기" onPress={() => pick(undefined)} /></View> : null}
    </BottomSheet>
  );
}
