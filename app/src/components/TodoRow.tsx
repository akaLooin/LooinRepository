import { useRef } from "react";
import { Image, Pressable, View, type ImageSourcePropType } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Clover } from "./Clover";

/** One to-do: clover checkbox, title, optional memo and proof photo (S03). */
export function TodoRow({ title, memo, done, color, photo, onToggle, onPress, onDoubleTap, small, smallMemo, onLongPress, delayLongPress, selected, largeMemo }: {
  title: string; memo?: string; done: boolean; color: string; photo?: ImageSourcePropType; onToggle: () => void; onPress?: () => void; onDoubleTap?: () => void;
  small?: boolean; smallMemo?: boolean; onLongPress?: () => void; delayLongPress?: number; selected?: boolean; largeMemo?: boolean;
}) {
  const { c } = useTheme();
  const last = useRef(0);
  const press = () => {
    const now = Date.now();
    if (onDoubleTap && now - last.current < 300) onDoubleTap();
    else onPress?.();
    last.current = now;
  };
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 8, paddingHorizontal: selected === undefined ? 0 : 6, marginHorizontal: selected === undefined ? 0 : -6, borderRadius: tokens.radius.md, backgroundColor: selected ? c.surfaceButton : "transparent" }} accessibilityState={selected === undefined ? undefined : { selected }}>
      <Clover size={tokens.size.cloverTodo} state={done ? { kind: "todoDone", color } : { kind: "todoOpen" }} onPress={onToggle} label={`${title}, ${done ? "완료됨" : "미완료"}`} />
      <Pressable onPress={press} onLongPress={onLongPress} delayLongPress={delayLongPress} style={{ flex: 1, gap: 2 }} accessibilityRole="button" accessibilityHint="메뉴 열기">
        <AppText variant={small ? "body" : "bodyLg"}>{title}</AppText>
        {memo ? <AppText variant={largeMemo ? "body" : smallMemo ? "small" : "helper"} color="textSecondary">{memo}</AppText> : null}
        {photo ? <Image source={photo} style={{ marginTop: 8, width: "100%", aspectRatio: 2, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} /> : null}
      </Pressable>
    </View>
  );
}
