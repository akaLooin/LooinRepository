import { Pressable, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { TextButton } from "./Button";
import { ChevronLeft, X } from "./icons";

/** 56dp header: back or close on the left, centred title, optional text action (확인/완료). */
export function ScreenHeader({ title, onBack, close, right }: { title: string; onBack?: () => void; close?: boolean; right?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  const Icon = close ? X : ChevronLeft;
  return (
    <View style={{ height: tokens.layout.headerHeight, justifyContent: "center", paddingHorizontal: tokens.layout.gutter }}>
      <AppText variant="screenTitle" center accessibilityRole="header">{title}</AppText>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={close ? "닫기" : "뒤로 가기"} style={{ position: "absolute", left: tokens.layout.gutter - 4 }}>
          <Icon size={28} color={c.text} strokeWidth={2.2} />
        </Pressable>
      ) : null}
      {right ? <View style={{ position: "absolute", right: tokens.layout.gutter }}><TextButton {...right} /></View> : null}
    </View>
  );
}
