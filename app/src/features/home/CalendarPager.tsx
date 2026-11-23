import { useEffect, useRef, useState } from "react";
import { FlatList, Platform, useWindowDimensions, View, type FlatListInstance } from "react-native";
import { useDesignScale } from "../../theme";

/**
 * The calendar as a sideways strip of pages (months, or weeks in week view): the grid follows the finger, the next
 * page slides in, a flick or a long enough drag settles on it. Arrow buttons and tapping the title change the page
 * at once (user).
 *
 * The phone's own paging scroll does the sliding (2026-11-23, user: a quick swipe sometimes stuck, in the skins
 * too). The earlier strip was moved from JavaScript; while the app was busy redrawing after a swipe, the next quick
 * swipe was read late and the up/down scroll took it. A native scroll reads the finger itself, flicks one after
 * another keep going, and the screen is updated once it comes to rest. Pages sit at fixed places on a long strip
 * (as the 시간표 does), so nothing is moved around when a swipe ends.
 */
const SPAN = 1200; // pages each way from the first one shown (100 years of months)
const DATA = Array.from({ length: SPAN * 2 + 1 }, (_, k) => k);
const web = Platform.OS === "web";
let swipedAt = 0;
/** true right after a calendar swipe: a swipe that started on a date must not also pick that date */
export const calendarJustSwiped = () => Date.now() - swipedAt < 400;

export function CalendarPager({ index, onIndexChange, renderPage, gutter = 0 }: {
  index: number;
  /** the page margin: the strip spans the whole screen and slides edge to edge, each page keeps its margins */
  gutter?: number;
  onIndexChange: (index: number, dir: 1 | -1) => void;
  renderPage: (index: number, width: number) => React.ReactNode;
}) {
  // the strip is as wide as the screen's canvas: start from that, so the month is drawn on the first frame
  const s = useDesignScale();
  const guess = Math.round(useWindowDimensions().width / s);
  const [w, setW] = useState(guess);
  const wRef = useRef(guess);
  const base = useRef(index).current;
  const list = useRef<FlatListInstance>(null);
  const shown = useRef(index); // the page the strip rests on
  const changeRef = useRef(onIndexChange);
  changeRef.current = onIndexChange;
  const [heights, setHeights] = useState<Record<number, number>>({});
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexOf = (i: number) => i - base + SPAN;

  // a page change that did not come from a swipe (arrows, title → today) jumps at once
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    list.current?.scrollToOffset({ offset: indexOf(index) * wRef.current, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const settle = (x: number) => {
    const W = wRef.current;
    if (!W) return;
    const i = base + Math.round(x / W) - SPAN;
    if (i === shown.current) return;
    const dir = i > shown.current ? 1 : -1;
    shown.current = i;
    swipedAt = Date.now();
    changeRef.current(i, dir);
  };

  const h = heights[index];
  return (
    <View style={{ height: h, overflow: "hidden", marginHorizontal: -gutter }}
      onLayout={(e) => {
        const W = Math.round(e.nativeEvent.layout.width);
        if (!W || W === wRef.current) return;
        wRef.current = W;
        setW(W);
        requestAnimationFrame(() => list.current?.scrollToOffset({ offset: indexOf(shown.current) * W, animated: false }));
      }}>
      <FlatList ref={list} horizontal pagingEnabled showsHorizontalScrollIndicator={false} data={DATA} keyExtractor={(k) => String(k)}
        // drawn again with the screen (the picked day, the stars), and the strip's own height when it changes
        extraData={renderPage}
        getItemLayout={(_, k) => ({ length: w, offset: w * k, index: k })} initialScrollIndex={indexOf(index)}
        windowSize={5} initialNumToRender={1} maxToRenderPerBatch={2} directionalLockEnabled nestedScrollEnabled
        decelerationRate="fast" disableIntervalMomentum={false} scrollEventThrottle={16}
        onScrollBeginDrag={() => { swipedAt = Date.now(); }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScroll={(e) => {
          if (!web) return; // the phone settles when the slide comes to rest; a browser has no such event
          if (settleTimer.current) clearTimeout(settleTimer.current);
          const x = e.nativeEvent.contentOffset.x;
          settleTimer.current = setTimeout(() => settle(x), 160);
        }}
        renderItem={({ item: k }) => {
          const i = base + k - SPAN;
          return (
            <View style={{ width: w, paddingHorizontal: gutter, alignSelf: "flex-start" }}
              // the page out of view is hidden from screen readers
              aria-hidden={i !== index} importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}
              onLayout={(e) => {
                const ph = Math.round(e.nativeEvent.layout.height);
                setHeights((m) => (m[i] === ph ? m : { ...m, [i]: ph }));
              }}>
              {renderPage(i, w - gutter * 2)}
            </View>
          );
        }} />
    </View>
  );
}
