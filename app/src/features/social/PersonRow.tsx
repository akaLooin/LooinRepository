import { Pressable, View } from "react-native";
import { AppText, StoredImage } from "../../components";
import type { Person } from "../../data/social";
import { useTheme } from "../../theme";

/** One person in a list: photo, name, @ID, and an optional button at the right. Tapping opens their profile. */
export function PersonRow({ p, onPress, action, sub }: {
  p: Person; onPress: () => void; sub?: string;
  action?: { label: string; onPress: () => void; strong?: boolean }[];
}) {
  const { c } = useTheme();
  const a = 44;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${p.nickname} 프로필`} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
        {p.avatarUri
          ? <StoredImage uri={p.avatarUri} label="" style={{ width: a, height: a, borderRadius: a / 2 }} />
          : <View style={{ width: a, height: a, borderRadius: a / 2, backgroundColor: c.surfaceStrong }} />}
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyLg" weight={600} numberOfLines={1}>{p.nickname}</AppText>
          {sub || p.handle ? <AppText variant="helper" color="textMuted" numberOfLines={2}>{sub ?? `@${p.handle}`}</AppText> : null}
        </View>
      </Pressable>
      {action?.map((b) => (
        <Pressable key={b.label} onPress={b.onPress} accessibilityRole="button" accessibilityLabel={`${p.nickname} ${b.label}`}
          style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: "center", backgroundColor: b.strong ? c.selectedBg : c.surfaceButton }}>
          <AppText variant="body" weight={600} color={b.strong ? "onSelected" : "text"}>{b.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

