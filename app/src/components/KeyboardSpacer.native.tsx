import Reanimated, { useAnimatedStyle } from "react-native-reanimated";
import { KeyboardProvider, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useDesignScale, useInsets } from "../theme";

/**
 * Empty space under a bottom bar that grows with the on-screen keyboard, frame by frame, so the bar (the message field)
 * stays right above it. The keyboard height comes from Android's window insets (react-native-keyboard-controller),
 * which stay right when the app draws edge to edge; the old Keyboard-event maths left the chat field under the keyboard
 * (user's report). Heights are divided by the canvas scale because the whole app is drawn scaled (ScaledRoot).
 * `already` = what the bar already leaves at the bottom (the safe-area inset), so it is not added twice.
 */
export function KeyboardSpacer({ already }: { already?: number }) {
  const s = useDesignScale();
  const insets = useInsets();
  const { height } = useReanimatedKeyboardAnimation(); // 0 closed, -keyboard height open
  const base = already ?? insets.bottom;
  const style = useAnimatedStyle(() => ({ height: Math.max(0, -height.value / s - base) }));
  return <Reanimated.View style={style} />;
}

/** Wraps the app once so the keyboard is tracked (native only). */
export function KeyboardRoot({ children }: { children: React.ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
