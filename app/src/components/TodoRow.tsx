import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Clover } from "./Clover";
import { StoredImage } from "./StoredImage";

const DOUBLE_TAP_MS = 260;

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
export function TodoRow({ right, below, smallPhoto, onMemoPress, onAlarmPress, title, alarm, memo, done, color, photo, onToggle, onPress, onDoubleTap, small, smallMemo, onLongPress, delayLongPress, selected, largeMemo }: {
  title: string; alarm?: string; memo?: string; done: boolean; color: string; photo?: string; onToggle: () => void; onPress?: () => void; onDoubleTap?: () => void;
  small?: boolean; smallMemo?: boolean; onLongPress?: () => void; delayLongPress?: number; selected?: boolean; largeMemo?: boolean;
  /** tapping the memo text opens the memo editor, tapping the alarm time opens the time sheet (user) */
  onMemoPress?: () => void; onAlarmPress?: () => void;
  /** 설정 → 화면 → 할 일 사진 작게 보기 */
  smallPhoto?: boolean;
  /** friends: the heart at the right end, and the reactions under the to-do */
  right?: React.ReactNode; below?: React.ReactNode;
}) {
  const { c } = useTheme();
  // With double-tap editing on, a single tap waits a moment to see if a second one follows, so a double tap
  // goes straight to editing without the menu flashing in between (user).
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);
  const press = () => {
    if (!onDoubleTap) return onPress?.();
    if (pending.current) {
      clearTimeout(pending.current);
      pending.current = null;
      onDoubleTap();
      return;
    }
    pending.current = setTimeout(() => { pending.current = null; onPress?.(); }, DOUBLE_TAP_MS);
  };
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 8, paddingHorizontal: selected === undefined ? 0 : 6, marginHorizontal: selected === undefined ? 0 : -6, borderRadius: tokens.radius.md, backgroundColor: selected ? c.surfaceButton : "transparent" }} accessibilityState={selected === undefined ? undefined : { selected }}>
      <Clover size={tokens.size.cloverTodo} state={done ? { kind: "todoDone", color } : { kind: "todoOpen" }} onPress={onToggle} label={`${title}, ${done ? "완료됨" : "미완료"}`} />
      <Pressable onPress={press} onLongPress={onLongPress} delayLongPress={delayLongPress} style={{ flex: 1, gap: 2 }} accessibilityRole="button" accessibilityHint="메뉴 열기">
        <AppText variant={small ? "body" : "bodyLg"}>{title}</AppText>
        {alarm ? (
          <Pressable onPress={onAlarmPress} disabled={!onAlarmPress} onLongPress={onLongPress} delayLongPress={delayLongPress} hitSlop={{ top: 4, bottom: 4 }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, alignSelf: "flex-start" }} accessibilityRole="button" accessibilityLabel={`알림 ${alarm}`} accessibilityHint="시간 알림 바꾸기">
            <AlarmClock />
            <AppText variant="helper">{alarm}</AppText>
          </Pressable>
        ) : null}
        {memo ? (
          <Pressable onPress={onMemoPress} disabled={!onMemoPress} onLongPress={onLongPress} delayLongPress={delayLongPress} accessibilityRole="button" accessibilityHint="메모 편집">
            <AppText variant={largeMemo ? "body" : smallMemo ? "small" : "helper"} color="textSecondary">{memo}</AppText>
          </Pressable>
        ) : null}
        {photo ? <StoredImage uri={photo} label="인증 사진" style={{ marginTop: 8, width: smallPhoto ? "45%" : "100%", aspectRatio: smallPhoto ? 1.4 : 2, borderRadius: smallPhoto ? tokens.radius.md : tokens.radius.lg, backgroundColor: c.surface }} /> : null}
        {below}
      </Pressable>
      {right}
    </View>
  );
}
