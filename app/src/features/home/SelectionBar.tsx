import { Pressable, View } from "react-native";
import { AppText } from "../../components";
import { tokens, useInsets, useTheme, type ColorName } from "../../theme";

/** 할 일 선택 mode: what to do with the picked to-dos. Sits above the bottom tabs. */
export function SelectionBar({ count, onTomorrow, onInbox, onDelete, onCancel }: {
  count: number; onTomorrow: () => void; onInbox: () => void; onDelete: () => void; onCancel: () => void;
}) {
  const { c } = useTheme();
  const insets = useInsets();
  const btn = (label: string, onPress: () => void, color: ColorName = "text", disabled = false) => (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={{ flex: 1, height: 44, borderRadius: tokens.radius.md, backgroundColor: c.surfaceButton, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}>
      <AppText variant="body" weight={600} color={color}>{label}</AppText>
    </Pressable>
  );
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 10, paddingTop: 12, paddingHorizontal: tokens.layout.gutter,
      backgroundColor: c.surfaceRaised, borderTopLeftRadius: tokens.radius.sheet, borderTopRightRadius: tokens.radius.sheet, gap: 10 }}>
      <AppText variant="body" center accessibilityLiveRegion="polite">{count ? `${count}개 선택됨` : "옮기거나 지울 할 일을 눌러 고르세요"}</AppText>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {btn("내일 하기", onTomorrow, "text", !count)}
        {btn("보관함", onInbox, "text", !count)}
        {btn("삭제", onDelete, "danger", !count)}
        {btn("취소", onCancel)}
      </View>
    </View>
  );
}
