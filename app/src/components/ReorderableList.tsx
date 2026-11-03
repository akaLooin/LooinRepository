import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, View } from "react-native";

export type DragHandle = { onLongPress: () => void; delayLongPress: number };

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  labelOf: (item: T) => string;
  /** Spread `drag` into the row's own Pressable (onLongPress) so holding the row starts the drag. */
  renderItem: (item: T, drag: DragHandle, dragging: boolean) => React.ReactNode;
  onReorder: (keys: string[]) => void;
  /** Tell the parent ScrollView to stop scrolling while a row is held. */
  onDragging?: (dragging: boolean) => void;
  gap?: number;
};

/**
 * Hold a row, then move it up or down. Built on PanResponder (no extra library), so it works on phones and web.
 * Screen readers get "위로 이동" / "아래로 이동" actions instead of dragging.
 */
export function ReorderableList<T>({ items, keyOf, labelOf, renderItem, onReorder, onDragging, gap = 0 }: Props<T>) {
  const keys = items.map(keyOf);
  const heights = useRef<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(null);
  const [target, setTarget] = useState(0);
  const dy = useRef(new Animated.Value(0)).current;
  const state = useRef({ active: null as string | null, from: 0, target: 0, keys });
  state.current.keys = keys;

  const finish = () => {
    const { active: a, from, target: to, keys: ks } = state.current;
    state.current.active = null;
    setActive(null);
    dy.setValue(0);
    onDragging?.(false);
    if (a !== null && from !== to) {
      const next = ks.filter((k) => k !== a);
      next.splice(to, 0, a);
      onReorder(next);
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
          dy.setValue(g.dy);
          // where the held row's centre is now, measured in row heights
          const h = (k: string) => (heights.current[k] ?? 56) + gap;
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
    state.current = { ...state.current, active: key, from, target: from };
    setActive(key);
    setTarget(from);
    onDragging?.(true);
  };

  const step = (key: string, dir: -1 | 1) => {
    const i = keys.indexOf(key), j = i + dir;
    if (j < 0 || j >= keys.length) return;
    const next = [...keys];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next);
  };

  const from = active ? keys.indexOf(active) : -1;
  const activeH = active ? (heights.current[active] ?? 56) + gap : 0;

  return (
    <View {...responder.panHandlers}>
      {items.map((item, i) => {
        const k = keyOf(item);
        const isActive = k === active;
        // rows between the old and new place slide out of the way
        const shift = active && !isActive ? (from < target && i > from && i <= target ? -activeH : from > target && i >= target && i < from ? activeH : 0) : 0;
        return (
          <Animated.View
            key={k}
            onLayout={(e) => { heights.current[k] = e.nativeEvent.layout.height; }}
            accessibilityActions={[{ name: "up", label: "위로 이동" }, { name: "down", label: "아래로 이동" }]}
            onAccessibilityAction={(e) => step(k, e.nativeEvent.actionName === "up" ? -1 : 1)}
            accessibilityHint={`${labelOf(item)}: 길게 눌러 끌면 순서를 바꿀 수 있어요`}
            style={{
              marginBottom: i < items.length - 1 ? gap : 0,
              zIndex: isActive ? 10 : 0,
              elevation: isActive ? 6 : 0,
              opacity: isActive ? 0.92 : 1,
              transform: [{ translateY: isActive ? dy : shift }, { scale: isActive ? 1.02 : 1 }],
            }}
          >
            {renderItem(item, { onLongPress: () => start(k), delayLongPress: 300 }, isActive)}
          </Animated.View>
        );
      })}
    </View>
  );
}
