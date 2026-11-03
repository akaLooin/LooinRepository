import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";

/** Short message at the bottom of the screen. `useToast()` returns [element, show]. */
export function useToast(): [React.ReactNode, (msg: string) => void] {
  const { c } = useTheme();
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const el = msg ? (
    <View pointerEvents="none" style={{ position: "absolute", left: tokens.layout.gutter, right: tokens.layout.gutter, bottom: 16, alignItems: "center" }}>
      <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.surfaceStrong, borderRadius: tokens.radius.pill, paddingHorizontal: 18, paddingVertical: 10 }}>
        <AppText variant="body">{msg}</AppText>
      </View>
    </View>
  ) : null;
  return [el, show];
}
