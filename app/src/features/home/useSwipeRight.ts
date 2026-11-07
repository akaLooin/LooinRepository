import { useMemo } from "react";
import { PanResponder } from "react-native";

/**
 * A left-to-right swipe (as in the original: swiping under the calendar opens 보관함). Claims the gesture only when
 * it is clearly horizontal, so vertical scrolling and taps keep working.
 */
const horizontal = (dx: number, dy: number, direction: number) => dx * direction > 20 && Math.abs(dy) < 15 && Math.abs(dx) > Math.abs(dy) * 2;

export function useSwipeRight(onSwipe: () => void, minDx = 70, direction: 1 | -1 = 1) {
  return useMemo(
    () =>
      PanResponder.create({
        // Also in the capture phase: a swipe that starts on a to-do row must win over the row's tap.
        // A held (dragging) row refuses to hand over its gesture, so a drag is never taken away.
        onMoveShouldSetPanResponderCapture: (_e, g) => horizontal(g.dx, g.dy, direction),
        onMoveShouldSetPanResponder: (_e, g) => horizontal(g.dx, g.dy, direction),
        onPanResponderRelease: (_e, g) => { if (g.dx * direction > minDx && Math.abs(g.dy) < 60) onSwipe(); },
        onPanResponderTerminationRequest: () => true,
      }).panHandlers,
    [onSwipe, minDx, direction],
  );
}
