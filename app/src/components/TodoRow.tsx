import { useRef } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Clover } from "./Clover";
import { StoredImage } from "./StoredImage";

/** The small filled clock in front of a to-do's alarm time (user's screenshot of the original). */
function AlarmClock({ size = 14 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={7} fill={c.alarmIcon} />
      <Path d="M7 3.4V7.2L9.6 8.6" stroke={c.alarmIconHands} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** One to-do: clover checkbox, title, optional alarm time, memo and proof photo (S03). */
export function TodoRow({ title, alarm, memo, done, color, photo, onToggle, onPress, onDoubleTap, small, smallMemo, onLongPress, delayLongPress, selected, largeMemo }: {
  title: string; alarm?: string; memo?: string; done: boolean; color: string; photo?: string; onToggle: () => void; onPress?: () => void; onDoubleTap?: () => void;
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
        {alarm ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }} accessibilityLabel={`알림 ${alarm}`}>
            <AlarmClock />
            <AppText variant="helper">{alarm}</AppText>
          </View>
        ) : null}
        {memo ? <AppText variant={largeMemo ? "body" : smallMemo ? "small" : "helper"} color="textSecondary">{memo}</AppText> : null}
        {photo ? <StoredImage uri={photo} label="인증 사진" style={{ marginTop: 8, width: "100%", aspectRatio: 2, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} /> : null}
      </Pressable>
    </View>
  );
}
