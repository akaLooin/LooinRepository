import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Platform, View } from "react-native";
import { smoothLayout } from "../../lib/motion";

/**
 * The calendar as a sideways strip of pages (months, or weeks in week view), as in the original (user's recording):
 * the grid follows the finger, the next page slides in, and letting go past a fifth of the width (or a flick)
 * settles on it; otherwise it slides back. Arrow buttons slide the same way.
 *
 * Every page sits at a fixed place on the strip (page i at i × width), so changing the current page never moves
 * the pages themselves: only the strip slides. That keeps the slide free of jumps, and it does not wait for an
 * "animation finished" signal (Expo Go delivers those late).
 */
const native = Platform.OS !== "web";
let swipedAt = 0;
/** true right after a calendar swipe: a swipe that started on a date must not also pick that date */
export const calendarJustSwiped = () => Date.now() - swipedAt < 400;
const SLIDE_MS = 260;
const horizontal = (dx: number, dy: number) => Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;

export function CalendarPager({ index, onIndexChange, renderPage }: {
  index: number;
  onIndexChange: (index: number, dir: 1 | -1) => void;
  renderPage: (index: number) => React.ReactNode;
}) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(index);
  // positions are counted from the first page shown, so they stay small numbers (page i at (i - base) × width)
  const base = useRef(index).current;
  const shown = useRef(index); // the page the strip was last placed on
  const [heights, setHeights] = useState<Record<number, number>>({});

  // slide to the current page whenever it changes (swipe, arrows); a jump of more than one page (today) is instant
  useEffect(() => {
    indexRef.current = index;
    const W = wRef.current;
    if (!W) return;
    if (Math.abs(index - shown.current) > 1) x.setValue(-(index - base) * W);
    else Animated.timing(x, { toValue: -(index - base) * W, duration: SLIDE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    shown.current = index;
  }, [index, x]);

  const responder = useMemo(() => {
    let start = 0;
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => horizontal(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_e, g) => horizontal(g.dx, g.dy),
      onPanResponderGrant: () => {
        x.stopAnimation();
        start = -(indexRef.current - base) * wRef.current;
      },
      onPanResponderMove: (_e, g) => x.setValue(start + g.dx),
      onPanResponderRelease: (_e, g) => {
        swipedAt = Date.now();
        const W = wRef.current;
        const dir: 0 | 1 | -1 = g.dx < -W * 0.2 || g.vx < -0.4 ? 1 : g.dx > W * 0.2 || g.vx > 0.4 ? -1 : 0;
        if (dir) onIndexChange(indexRef.current + dir, dir);
        else Animated.timing(x, { toValue: -(indexRef.current - base) * W, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(x, { toValue: -(indexRef.current - base) * wRef.current, duration: 180, useNativeDriver: native }).start();
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [x, onIndexChange]);

  const h = heights[index];
  return (
    <View
      {...responder.panHandlers}
      style={{ overflow: "hidden", height: h ?? 0, minHeight: h ? undefined : 1 }}
      onLayout={(e) => {
        const W = e.nativeEvent.layout.width;
        if (W === wRef.current) return;
        wRef.current = W;
        setW(W);
        x.setValue(-(indexRef.current - base) * W);
        shown.current = indexRef.current;
      }}
    >
      {w ? (
        <Animated.View style={{ position: "absolute", left: 0, top: 0, width: w, transform: [{ translateX: x }] }}>
          {[index - 1, index, index + 1].map((i) => (
            <View
              key={i}
              style={{ position: "absolute", left: (i - base) * w, top: 0, width: w }}
              // the page out of view is hidden from screen readers
              aria-hidden={i !== index}
              importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}
              pointerEvents={i === index ? "auto" : "none"}
              onLayout={(e) => {
                const ph = Math.round(e.nativeEvent.layout.height);
                setHeights((m) => {
                  if (m[i] === ph) return m;
                  if (i === index && m[i] !== undefined) smoothLayout(200); // 5 ↔ 6 week rows: the list below glides
                  return { ...m, [i]: ph };
                });
              }}
            >
              {renderPage(i)}
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}
