import { useMemo } from "react";
import { PanResponder } from "react-native";

/**
 * A left-to-right swipe (as in the original: swiping under the calendar opens 보관함). Claims the gesture only when
 * it is clearly horizontal, so vertical scrolling and taps keep working.
 */
export function useSwipeRight(onSwipe: () => void, minDx = 70, direction: 1 | -1 = 1) {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dx * direction > 20 && Math.abs(g.dy) < 15 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_e, g) => { if (g.dx * direction > minDx && Math.abs(g.dy) < 60) onSwipe(); },
        onPanResponderTerminationRequest: () => true,
      }).panHandlers,
    [onSwipe, minDx, direction],
  );
}
