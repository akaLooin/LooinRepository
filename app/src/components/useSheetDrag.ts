import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, PanResponder, Platform } from "react-native";

const OFFSCREEN = 900;
// Sheets move on the UI thread on the phone, so they stay smooth while the screen behind them is busy.
const native = Platform.OS !== "web";

/**
 * Slide-up sheet motion plus drag-down-to-close, on PanResponder (no extra library).
 * Attach `handlers` to the sheet's top area (grabber and title) so lists and inputs below keep their own gestures.
 * Drag past 90dp, or flick down, and the sheet slides away and `onDismiss` runs; otherwise it springs back.
 */
export function useSheetDrag(open: boolean, onDismiss: () => void, onHidden?: () => void) {
  const y = useRef(new Animated.Value(OFFSCREEN)).current;
  const fade = y.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp" });
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const draggedAway = useRef(false);

  useEffect(() => {
    if (open) draggedAway.current = false;
    // already slid off by a drag: no second animation, gone at once
    if (!open && draggedAway.current) { onHidden?.(); return; }
    Animated.timing(y, { toValue: open ? 0 : OFFSCREEN, duration: open ? 260 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: native })
      .start(({ finished }) => { if (finished && !open) onHidden?.(); });
  }, [open, y]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlers = useMemo(
    () =>
      PanResponder.create({
        // Claim on touch so each gesture starts its own measurement (claiming only on move reuses the last
        // gesture's start point). Buttons inside the header still win their taps: they are deeper and claim first.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => y.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 90 || g.vy > 1.2) {
            Animated.timing(y, { toValue: OFFSCREEN, duration: 180, useNativeDriver: native }).start(() => { draggedAway.current = true; dismissRef.current(); });
          } else {
            Animated.spring(y, { toValue: 0, useNativeDriver: native, bounciness: 4 }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: native }).start(),
      }).panHandlers,
    [y],
  );

  return { translateY: y, scrimOpacity: fade, handlers };
}
