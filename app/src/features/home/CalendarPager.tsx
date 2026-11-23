import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Platform, useWindowDimensions, View } from "react-native";
import { useScrollLock } from "../../components";
import { useDesignScale } from "../../theme";

/**
 * The calendar as a sideways strip of pages (months, or weeks in week view), as in the original (user's recording):
 * the grid follows the finger, the next page slides in, and letting go past a fifth of the width (or a flick)
 * settles on it; otherwise it slides back. Arrow buttons and tapping the title change the page at once (user).
 *
 * Smoothness, learned on the phone:
 * - The slide runs first and the screen is updated only after it (a timer, not the animation's "finished" signal,
 *   which Expo Go delivers late). Updating at release redrew three months while the slide was starting, so it
 *   started late and looked choppy.
 * - Every page sits at a fixed place on the strip (page i at (i - base) × width), so pages never move themselves.
 * - Pages get their width up front, so a page that comes in does not rearrange its dates while sliding.
 */
const native = Platform.OS !== "web";
const SLIDE_MS = 240;
let swipedAt = 0;
/** true right after a calendar swipe: a swipe that started on a date must not also pick that date */
export const calendarJustSwiped = () => Date.now() - swipedAt < 400;
// a quick flick is rarely straight: a little slant still counts as sideways
const horizontal = (dx: number, dy: number) => Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2;

export function CalendarPager({ index, onIndexChange, renderPage, gutter = 0 }: {
  index: number;
  /** the page margin: the strip spans the whole screen and slides edge to edge, each page keeps its margins */
  gutter?: number;
  onIndexChange: (index: number, dir: 1 | -1) => void;
  renderPage: (index: number, width: number) => React.ReactNode;
}) {
  const lock = useScrollLock();
  // the strip is as wide as the screen's canvas: start from that, so the month is drawn on the first frame instead
  // of after a measuring pass (the design app's 달력 tab opened blank for a moment, user)
  const s = useDesignScale();
  const guess = Math.round(useWindowDimensions().width / s);
  const [w, setW] = useState(guess);
  const wRef = useRef(guess);
  const x = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(index);
  // positions are counted from the first page shown, so they stay small numbers
  const base = useRef(index).current;
  const placed = useRef(index); // the page the strip is on (or sliding to)
  const changeRef = useRef(onIndexChange);
  changeRef.current = onIndexChange;
  // pages this strip asked for after a swipe: when they arrive, the strip is already there (or further on)
  const asked = useRef(new Set<number>());
  const [heights, setHeights] = useState<Record<number, number>>({});

  // a page change that did not come from a swipe (arrows, title → today) jumps at once
  useEffect(() => {
    indexRef.current = index;
    if (asked.current.has(index)) { asked.current.clear(); return; }
    // moved the same way a swipe moves it (a zero-length animation on the UI thread): setting the value directly left
    // the dates not answering taps on the phone until the next swipe (user, first APK)
    if (placed.current !== index && wRef.current)
      Animated.timing(x, { toValue: -(index - base) * wRef.current, duration: 0, useNativeDriver: native }).start();
    placed.current = index;
  }, [index, x, base]);

  const responder = useMemo(() => {
    let start = 0;
    // the screen update after a slide waits on a timer. Quick swipes one after another (user 2026-11-23: a fast swipe
    // sometimes stuck): a swipe that starts before it fires holds it (redrawing under the finger cut the swipe off)
    // and runs it on letting go, then moves one page on from where the strip is; two pages wait on each side.
    let pending: { timer: ReturnType<typeof setTimeout>; run: () => void } | null = null;
    const flush = () => { if (!pending) return; clearTimeout(pending.timer); const r = pending.run; pending = null; r(); };
    const settleBack = () =>
      Animated.timing(x, { toValue: -(placed.current - base) * wRef.current, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => horizontal(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_e, g) => horizontal(g.dx, g.dy),
      onPanResponderGrant: () => {
        lock?.(true); // no vertical scrolling while the month is being dragged
        // from where the strip is now (mid-slide too), not from where it started
        start = -(placed.current - base) * wRef.current;
        x.stopAnimation((v) => { start = v; });
        if (pending) clearTimeout(pending.timer);
      },
      onPanResponderMove: (_e, g) => x.setValue(start + g.dx),
      onPanResponderRelease: (_e, g) => finish(g),
      // the page redraws under the finger mid-flick (a quick second swipe): finish the swipe instead of dropping it
      onPanResponderTerminate: (_e, g) => finish(g),
      onPanResponderTerminationRequest: () => false,
    });
    function finish(g: { dx: number; vx: number }) {
        swipedAt = Date.now();
        lock?.(false);
        const W = wRef.current;
        const dir: 0 | 1 | -1 = g.dx < -W * 0.2 || g.vx < -0.4 ? 1 : g.dx > W * 0.2 || g.vx > 0.4 ? -1 : 0;
        if (!dir) { settleBack(); flush(); return; }
        flush();
        const to = placed.current + dir;
        placed.current = to;
        // the remaining distance at a speed close to the finger's, so a flick does not slow down
        const left = Math.abs(-(to - base) * W - (start + g.dx));
        const ms = Math.max(140, Math.min(SLIDE_MS, Math.abs(g.vx) > 0.1 ? left / Math.abs(g.vx) : SLIDE_MS));
        Animated.timing(x, { toValue: -(to - base) * W, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
        const run = () => { asked.current.add(to); changeRef.current(to, dir); };
        pending = { timer: setTimeout(() => { pending = null; run(); }, ms + 20), run };
    }
  }, [x, base, lock]);

  const h = heights[index];
  // until the page's height is known, the page in view sits in the normal flow and gives the strip its height
  const flow = !h;
  return (
    <View
      {...responder.panHandlers}
      style={{ overflow: "hidden", height: h, marginHorizontal: -gutter }}
      onLayout={(e) => {
        const W = e.nativeEvent.layout.width;
        if (W === wRef.current) return;
        wRef.current = W;
        setW(W);
        x.setValue(-(placed.current - base) * W);
      }}
    >
      {w ? (
        <Animated.View style={{ position: flow ? "relative" : "absolute", left: 0, top: 0, width: w, transform: [{ translateX: x }] }}>
          {[index - 2, index - 1, index, index + 1, index + 2].map((i) => (
            <View
              key={i}
              style={{ position: flow && i === index ? "relative" : "absolute", left: (i - base) * w, top: 0, width: w, paddingHorizontal: gutter }}
              // the page out of view is hidden from screen readers
              aria-hidden={i !== index}
              importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}
              // pages overlap a little at the edges (the dates reach past the margins), so only the current one takes touches
              pointerEvents={i === index ? "auto" : "none"}
              onLayout={(e) => {
                const ph = Math.round(e.nativeEvent.layout.height);
                setHeights((m) => (m[i] === ph ? m : { ...m, [i]: ph }));
              }}
            >
              {renderPage(i, w - gutter * 2)}
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}
