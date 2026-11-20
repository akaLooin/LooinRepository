import { Pressable, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { TextButton } from "./Button";
import { ChevronLeft, X } from "./icons";
import { DESIGN_TRIAL } from "../lib/variant";

/** 56dp header: back or close on the left, centred title, optional text action (확인/완료). */
/** `ink` overrides the text colour when the screen has its own background (a diary colour). */
export function ScreenHeader({ title, onBack, close, right, ink }: { title: string; onBack?: () => void; close?: boolean; right?: { label: string; onPress: () => void }; ink?: string }) {
  const { c } = useTheme();
  const Icon = close ? X : ChevronLeft;
  // design app (release redesign, not the original's centred title): a round back button, the title on the left
  // next to it, and the action as a small filled pill on the right
  if (DESIGN_TRIAL) return (
    <View style={{ height: tokens.layout.headerHeight + 4, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: tokens.layout.gutter }}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel={close ? "닫기" : "뒤로 가기"}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: ink ? "transparent" : c.surface, alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} color={ink ?? c.text} strokeWidth={2.4} />
        </Pressable>
      ) : null}
      <AppText variant="bodyLg" weight={800} accessibilityRole="header" raw={ink} numberOfLines={1} style={{ flex: 1, fontSize: 20, lineHeight: 26 }}>{title}</AppText>
      {right ? (
        <Pressable onPress={right.onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={right.label}
          style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: ink ? "transparent" : c.text, borderWidth: ink ? 1 : 0, borderColor: ink, alignItems: "center", justifyContent: "center" }}>
          <AppText variant="body" weight={700} raw={ink ?? c.bg}>{right.label}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
  return (
    <View style={{ height: tokens.layout.headerHeight, justifyContent: "center", paddingHorizontal: tokens.layout.gutter }}>
      <AppText variant="screenTitle" center accessibilityRole="header" raw={ink}>{title}</AppText>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={close ? "닫기" : "뒤로 가기"} style={{ position: "absolute", left: tokens.layout.gutter - 4 }}>
          <Icon size={28} color={ink ?? c.text} strokeWidth={2.2} />
        </Pressable>
      ) : null}
      {right ? <View style={{ position: "absolute", right: tokens.layout.gutter }}><TextButton {...right} raw={ink} /></View> : null}
    </View>
  );
}
