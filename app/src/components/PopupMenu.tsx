import { Pressable, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";

/** Top-right popup with pill items: 카테고리 관리, 루틴 관리, 디데이 관리, 리마인더 관리 (S06m). */
export function PopupMenu({ items }: { items: { label: string; onPress: () => void }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: tokens.radius.popup, padding: 16, gap: 8, width: 230 }} accessibilityRole="menu">
      {items.map((it) => (
        <Pressable key={it.label} onPress={it.onPress} accessibilityRole="menuitem"
          style={({ pressed }) => ({ height: 52, borderRadius: tokens.radius.pill, backgroundColor: pressed ? c.surfaceButton : c.surface, alignItems: "center", justifyContent: "center" })}>
          <AppText variant="bodyLg" weight={500}>{it.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}
