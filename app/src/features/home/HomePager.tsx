import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PagerContext, type Pager } from "./pagerContext";
import { Animated, BackHandler, Easing, PanResponder, Platform, View } from "react-native";
import { useTheme } from "../../theme";
import { InboxScreen } from "../inbox/InboxScreen";
import { HomeScreen } from "./HomeScreen";

/**
 * Home and 보관함 side by side, as in the original (user's screen recording): 보관함 is the page to the left of
 * home. A sideways swipe drags both pages with the finger; let go past a quarter of the width (or flick) and it
 * settles on the other page, otherwise it slides back. The box button slides over the same way.
 */

const native = Platform.OS !== "web";
const keepInbox = Platform.OS !== "web";
const SETTLE_MS = 260;
const horizontal = (dx: number, dy: number, dir: number) => dx * dir > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;

export function HomePager() {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const [page, setPage] = useState<0 | 1>(1);
  // On the phone 보관함 is built once, shortly after home has appeared, and kept: building it at the moment a swipe
  // started made the first part of the slide stutter (user). On the web (tests) it is only built while in view.
  const [inboxOn, setInboxOn] = useState(false);
  useEffect(() => {
    if (!keepInbox) return;
    const timer = setTimeout(() => setInboxOn(true), 1200);
    return () => clearTimeout(timer);
  }, []);
  const x = useRef(new Animated.Value(0)).current; // translateX of the two-page strip: 0 = 보관함, -w = home
  const wRef = useRef(0);
  const pageRef = useRef<0 | 1>(1);
  const swipedAt = useRef(0);

  const settle = useCallback((to: 0 | 1) => {
    pageRef.current = to;
    setPage(to);
    if (to === 0) setInboxOn(true);
    Animated.timing(x, { toValue: -to * wRef.current, duration: SETTLE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native })
      .start(({ finished }) => { if (!keepInbox && finished && to === 1 && pageRef.current === 1) setInboxOn(false); });
  }, [x]);

  // Android back on 보관함 returns home, like a page you came from
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pageRef.current === 0) { settle(1); return true; }
      return false;
    });
    return () => sub.remove();
  }, [settle]);

  const responders = useMemo(() => {
    const make = (dir: 1 | -1) => {
      let start = 0;
      return PanResponder.create({
        // capture too, so a swipe that starts on a to-do row still moves the page; a held (dragging) row keeps its gesture
        onMoveShouldSetPanResponderCapture: (_e, g) => horizontal(g.dx, g.dy, dir),
        onMoveShouldSetPanResponder: (_e, g) => horizontal(g.dx, g.dy, dir),
        onPanResponderGrant: () => {
          if (!keepInbox) setInboxOn(true);
          x.stopAnimation();
          start = -pageRef.current * wRef.current;
        },
        onPanResponderMove: (_e, g) => {
          const W = wRef.current;
          x.setValue(Math.max(-W, Math.min(0, start + g.dx)));
        },
        onPanResponderRelease: (_e, g) => {
          swipedAt.current = Date.now();
          const W = wRef.current;
          const far = g.dx * dir > W * 0.25 || g.vx * dir > 0.5;
          const from = pageRef.current;
          settle(far ? (dir === 1 ? 0 : 1) : from);
        },
        onPanResponderTerminate: () => settle(pageRef.current),
        onPanResponderTerminationRequest: () => false,
      }).panHandlers;
    };
    return { 1: make(1), [-1]: make(-1) } as Record<1 | -1, ReturnType<typeof make>>;
  }, [x, settle]);

  // the screens themselves never change when the page does, so they are not redrawn while sliding
  const inboxPage = useMemo(() => (inboxOn ? <InboxScreen /> : null), [inboxOn]);
  const homePage = useMemo(() => <HomeScreen />, []);

  const pager = useMemo<Pager>(() => ({ open: settle, swipe: (dir) => responders[dir], justSwiped: () => Date.now() - swipedAt.current < 400 }), [settle, responders]);

  return (
    <View
      style={{ flex: 1, overflow: "hidden", backgroundColor: c.bg }}
      onLayout={(e) => {
        const W = e.nativeEvent.layout.width;
        wRef.current = W;
        setW(W);
        x.setValue(-pageRef.current * W);
      }}
    >
      <PagerContext.Provider value={pager}>
        <Animated.View style={{ flex: 1, flexDirection: "row", width: w ? w * 2 : "200%", transform: [{ translateX: x }] }}>
          {/* the page out of view is hidden from screen readers and from touches */}
          <View style={{ width: w || "50%", flex: w ? undefined : 1 }} pointerEvents={page === 0 ? "auto" : "none"}
            aria-hidden={page !== 0} importantForAccessibility={page === 0 ? "auto" : "no-hide-descendants"}>
            {inboxPage}
          </View>
          <View style={{ width: w || "50%", flex: w ? undefined : 1 }} pointerEvents={page === 1 ? "auto" : "none"}
            aria-hidden={page !== 1} importantForAccessibility={page === 1 ? "auto" : "no-hide-descendants"}>
            {homePage}
          </View>
        </Animated.View>
      </PagerContext.Provider>
    </View>
  );
}
