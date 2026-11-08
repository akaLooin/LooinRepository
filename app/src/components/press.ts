import { Platform } from "react-native";

/**
 * Touch feedback on list rows, as in the original (user's screen recording of 설정): no grey row, only a faint ripple
 * spreading from the finger. Android draws it natively; elsewhere the row tints faintly while pressed.
 */
export const ripple = (color: string) => (Platform.OS === "android" ? { android_ripple: { color, foreground: true } } : {});
export const pressedBg = (pressed: boolean, color: string, bg?: string) => (Platform.OS !== "android" && pressed ? color : bg);
