import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Platform, StyleSheet, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { DESIGN_TRIAL } from "../lib/variant";
import { useScrollLock } from "./DragScrollView";

/**
 * Measured on the original (screen recording, 30 fps): the row lifts after 0.5 s, neighbours slide in ~0.15 s.
 * The design app lifts sooner (0.3 s) and shows a soft white glow spreading from the finger instead of the grey band
 * (user, 2026-11-21: "반응이 느리다", "누른 자리로부터 퍼지듯").
 */
const HOLD_MS = DESIGN_TRIAL ? 300 : 500;
const RIPPLE = DESIGN_TRIAL;
const RIPPLE_MS = 520;
const SLIDE_MS = 150;
const BAND_MS = 120;
// On the phone every movement runs on the UI thread, so a busy JavaScript thread (saving, redrawing) cannot stall it.
const native = Platform.OS !== "web";
const slide = (v: Animated.Value, to: number, done?: () => void, ms = SLIDE_MS) =>
  Animated.timing(v, { toValue: to, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(done);

export type DragHandle = { onLongPress: () => void; delayLongPress: number };

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  labelOf: (item: T) => string;
  /** Spread `drag` into the row's own Pressable (onLongPress) so holding the row starts the drag. */
  renderItem: (item: T, drag: DragHandle, dragging: boolean) => React.ReactNode;
  /** `moved` is the row that was held (or stepped by a screen reader). */
  onReorder: (keys: string[], moved: string) => void;
  /** While a row is held: the order it would make if let go now (`moved` = the held row); null when let go. */
  onTargetChange?: (keys: string[], moved: string | null) => void;
  /** Tell the parent ScrollView to stop scrolling while a row is held. */
  onDragging?: (dragging: boolean) => void;
  gap?: number;
  /** Rows that cannot be held (e.g. category titles): they still slide out of the held row's way. */
  fixed?: (item: T) => boolean;
  /**
   * Somewhere outside the list a held row can be dropped on (home: a calendar date, user's feature). Given the
   * finger's place on screen, returns what is under it, or null. Called once when a row is lifted (`prepare`) and on
   * every move. While over a target the list keeps its order; letting go there calls onDropOn instead of reordering.
   */
  drop?: { prepare: () => void; at: (x: number, y: number) => string | null; onHover: (target: string | null) => void; onDropOn: (key: string, target: string) => void };
};

/**
 * Hold a row, then move it up or down. Built on PanResponder (no extra library), so it works on phones and web.
 * Like the original: the held row gets a grey band and follows the finger 1:1, the others slide out of its way,
 * and on release the order is saved at once while the row glides into its new place.
 * Screen readers get "위로 이동" / "아래로 이동" actions instead of dragging.
 */
const noDrag: DragHandle = { onLongPress: () => {}, delayLongPress: HOLD_MS };

export function ReorderableList<T>({ items, keyOf, labelOf, renderItem, onReorder, onTargetChange, onDragging, gap = 0, fixed, drop }: Props<T>) {
  const { c } = useTheme();
  const lock = useScrollLock();
  const keys = items.map(keyOf);
  const shifts = useRef(new Map<string, Animated.Value>()).current;
  const shiftOf = (k: string) => {
    let v = shifts.get(k);
    if (!v) shifts.set(k, (v = new Animated.Value(0)));
    return v;
  };
  const resetAfterRender = useRef(false);
  const heights = useRef<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(null);
  const [fading, setFading] = useState<string | null>(null); // the row whose band is fading out after a drop
  const glide = useRef<{ key: string; from: number } | null>(null); // a dropped row still to glide into its new place
  const lastDy = useRef(0);
  const [target, setTarget] = useState(0);
  const band = useRef(new Animated.Value(0)).current; // the grey band under the held row fades in and out
  const ripple = useRef(new Animated.Value(0)).current; // design app: 0 → 1 spreads and fades the glow
  const touch = useRef<{ key: string; x: number; y: number } | null>(null); // where the finger went down, in the row
  const [rippleAt, setRippleAt] = useState<{ key: string; x: number; y: number; w: number; h: number } | null>(null);
  const widths = useRef<Record<string, number>>({});
  const targetCb = useRef(onTargetChange);
  targetCb.current = onTargetChange;
  // the touch handler is made once, so it reads the parent's latest callbacks through these (it used to keep the
  // first ones: a to-do added after the list appeared was then unknown to the drop, and its category did not change)
  const latest = useRef({ onReorder, onDragging, lock });
  latest.current = { onReorder, onDragging, lock };
  const preview = (to: number) => {
    const { active: a, from, keys: ks } = state.current;
    if (a === null || !targetCb.current) return;
    const next = ks.filter((k) => k !== a);
    next.splice(to, 0, a);
    targetCb.current(next, a);
  };
  const state = useRef({ active: null as string | null, from: 0, target: 0, keys, over: null as string | null });
  state.current.keys = keys;
  const [overDrop, setOverDrop] = useState(false); // the held row is over a drop target: see-through, so the date shows
  const dropRef = useRef(drop);
  dropRef.current = drop;

  const rowRefs = useRef<Record<string, RowRef | null>>({});
  const rowH = (k: string) => (heights.current[k] ?? 56) + gap;
  const clearAll = () => shifts.forEach((v) => v.setValue(0));
  /** Runs the pending glide: the dropped row starts where the finger left it and slides into its slot. */
  const runGlide = () => {
    const g = glide.current;
    if (!g) return;
    glide.current = null;
    clearAll();
    shiftOf(g.key).setValue(g.from);
    slide(shiftOf(g.key), 0);
  };

  const finish = () => {
    const { active: a, from, target: to, keys: ks, over } = state.current;
    if (a === null) return;
    state.current.active = null;
    state.current.over = null;
    latest.current.onDragging?.(false);
    latest.current.lock?.(false);
    setOverDrop(false);
    targetCb.current?.([], null);
    if (over !== null && dropRef.current) {
      // dropped on a target outside the list: the row leaves this list (or glides home if the move is refused)
      dropRef.current.onHover(null);
      slide(band, 0);
      setActive(null);
      slide(shiftOf(a), 0);
      dropRef.current.onDropOn(a, over);
      return;
    }
    // The order is saved the moment the finger lifts. It used to wait for the glide's "finished" signal, which in
    // Expo Go arrived seconds late: until then the list was still in drag mode and the moved row could not be tapped
    // (user's video). The glide now runs on its own after the save.
    let offset = 0;
    if (to > from) for (let i = from + 1; i <= to; i++) offset += rowH(ks[i]);
    if (to < from) for (let i = to; i < from; i++) offset -= rowH(ks[i]);
    slide(band, 0);
    setFading(a);
    setTimeout(() => setFading((f) => (f === a ? null : f)), SLIDE_MS + 50);
    setActive(null);
    if (from !== to) {
      const next = ks.filter((k) => k !== a);
      next.splice(to, 0, a);
      glide.current = { key: a, from: lastDy.current - offset }; // where the row is now, measured from its new slot
      resetAfterRender.current = true;
      latest.current.onReorder(next, a);
      // if the save did not change the order on screen (e.g. refused), glide back from where it is
      requestAnimationFrame(() => { if (glide.current?.key === a) runGlide(); });
    } else {
      slide(shiftOf(a), 0);
    }
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => state.current.active !== null,
        onMoveShouldSetPanResponderCapture: () => state.current.active !== null,
        onMoveShouldSetPanResponder: () => state.current.active !== null,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderMove: (_e, g) => {
          const { active: a, from, keys: ks } = state.current;
          if (a === null) return;
          // the held row moves with its own value: every row keeps one value for its whole life, because swapping
          // a row from one value to another left it stuck at the old offset after a drop (user's video)
          shiftOf(a).setValue(g.dy);
          lastDy.current = g.dy;
          const d = dropRef.current;
          const over = d ? d.at(g.moveX, g.moveY) : null;
          if (over !== state.current.over) { state.current.over = over; d?.onHover(over); setOverDrop(over !== null); }
          if (over !== null) {
            // over a drop target: the other rows go back to their places
            if (state.current.target !== from) { state.current.target = from; setTarget(from); }
            return;
          }
          // where the held row's centre is now, measured in row heights
          const h = rowH;
          let to = from;
          let moved = g.dy;
          if (moved > 0) {
            for (let i = from + 1; i < ks.length && moved > h(ks[i]) / 2; i++) { moved -= h(ks[i]); to = i; }
          } else {
            for (let i = from - 1; i >= 0 && -moved > h(ks[i]) / 2; i--) { moved += h(ks[i]); to = i; }
          }
          if (to !== state.current.target) {
            state.current.target = to;
            setTarget(to);
            preview(to);
          }
        },
        onPanResponderRelease: finish,
        onPanResponderTerminate: finish,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gap],
  );

  const start = (key: string) => {
    const from = state.current.keys.indexOf(key);
    state.current = { ...state.current, active: key, from, target: from, over: null };
    dropRef.current?.prepare();
    lastDy.current = 0;
    glide.current = null;
    band.setValue(0);
    setActive(key);
    setTarget(from);
    preview(from);
    if (RIPPLE) {
      const t = touch.current?.key === key ? touch.current : null;
      const w = widths.current[key] ?? 360, h = heights.current[key] ?? 56;
      setRippleAt({ key, x: t?.x ?? w / 2, y: t?.y ?? h / 2, w, h });
      ripple.setValue(0);
      Animated.timing(ripple, { toValue: 1, duration: RIPPLE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native })
        .start(() => setRippleAt((r) => (r?.key === key ? null : r)));
    } else slide(band, 1, undefined, BAND_MS);
    onDragging?.(true);
    lock?.(true);
  };

  const step = (key: string, dir: -1 | 1) => {
    const i = keys.indexOf(key), j = i + dir;
    if (j < 0 || j >= keys.length) return;
    const next = [...keys];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next, key);
  };

  const from = active ? keys.indexOf(active) : -1;
  const activeH = active ? rowH(active) : 0;

  // neighbours slide out of the way whenever the held row's place changes
  useEffect(() => {
    if (!active) return;
    keys.forEach((k, i) => {
      if (k === active) return;
      const to = from < target && i > from && i <= target ? -activeH : from > target && i >= target && i < from ? activeH : 0;
      slide(shiftOf(k), to);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target]);

  // after a drop the rows render in their new order; only then drop the offsets, so nothing jumps back for a frame
  const order = keys.join();
  useLayoutEffect(() => {
    // also whenever the list changes while nothing is held, so no row can ever stay displaced
    if (resetAfterRender.current || state.current.active === null) {
      resetAfterRender.current = false;
      if (glide.current) runGlide();
      else clearAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <View {...responder.panHandlers}>
      {items.map((item, i) => {
        const k = keyOf(item);
        const isActive = k === active;
        const banded = isActive || k === fading;
        const still = fixed?.(item) ?? false;
        return (
          <Animated.View
            key={k}
            onLayout={(e) => { heights.current[k] = e.nativeEvent.layout.height; widths.current[k] = e.nativeEvent.layout.width; }}
            // where the finger lands inside the row (offsetX/Y on web), so the glow can start there
            onTouchStart={RIPPLE ? (e) => {
              const n = e.nativeEvent as unknown as { locationX?: number; locationY?: number; pageX: number; pageY: number };
              touch.current = { key: k, x: n.locationX ?? 0, y: n.locationY ?? 0 };
              rowRefs.current[k]?.measureInWindow?.((x: number, y: number) => {
                if (touch.current?.key === k && typeof x === "number") touch.current = { key: k, x: n.pageX - x, y: n.pageY - y };
              });
            } : undefined}
            ref={(r: unknown) => { rowRefs.current[k] = r as RowRef | null; }}
            accessibilityActions={still ? undefined : [{ name: "up", label: "위로 이동" }, { name: "down", label: "아래로 이동" }]}
            onAccessibilityAction={still ? undefined : (e) => step(k, e.nativeEvent.actionName === "up" ? -1 : 1)}
            accessibilityHint={still ? undefined : `${labelOf(item)}: 길게 눌러 끌면 순서를 바꿀 수 있어요`}
            style={{
              marginBottom: i < items.length - 1 ? gap : 0,
              zIndex: banded ? 10 : 0,
              opacity: isActive && overDrop ? 0.45 : 1,
              transform: [{ translateY: shiftOf(k) }],
            }}
          >
            {banded && !RIPPLE ? (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: tokens.radius.sm, backgroundColor: c.surfaceRow, opacity: band }]} />
            ) : null}
            {rippleAt?.key === k ? <Ripple at={rippleAt} progress={ripple} /> : null}
            {renderItem(item, still ? noDrag : { onLongPress: () => start(k), delayLongPress: HOLD_MS }, isActive)}
          </Animated.View>
        );
      })}
    </View>
  );
}

type RowRef = { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void };

/**
 * A soft white glow that spreads from the finger across the whole row, edge to edge of the screen, then fades
 * (design app). A radial gradient grows from small to past the row's far corner while its opacity rises and falls.
 */
function Ripple({ at, progress }: { at: { x: number; y: number; w: number; h: number }; progress: Animated.Value }) {
  const { c } = useTheme();
  const G = tokens.layout.gutter;
  // white on the dark theme; on the light theme the same glow in the text colour, or it would not show
  const hex = c.text.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");
  // the glow reaches past the row's sides to the screen edges (user: "양쪽 끝에 닿지 않는다")
  const x = at.x + G, w = at.w + G * 2;
  const r = Math.max(Math.hypot(x, at.y), Math.hypot(w - x, at.y), Math.hypot(x, at.h - at.y), Math.hypot(w - x, at.h - at.y));
  const size = r * 2;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: -G, right: -G, overflow: "hidden" }}>
      <Animated.View style={{
        position: "absolute", left: x - r, top: at.y - r, width: size, height: size, borderRadius: r,
        backgroundImage: `radial-gradient(circle at center, rgba(${rgb},0.26) 0%, rgba(${rgb},0.12) 45%, rgba(${rgb},0) 72%)`,
        // spreads fast and stays bright until it has reached both edges, then fades
        opacity: progress.interpolate({ inputRange: [0, 0.12, 0.55, 1], outputRange: [0, 1, 0.85, 0] }),
        transform: [{ scale: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.2, 1, 1.1] }) }],
      } as never} />
    </View>
  );
}
