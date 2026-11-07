import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react";
import { Keyboard, Platform, ScrollView, type ScrollViewInstance, type ScrollViewProps, type ViewInstance } from "react-native";
import { useDesignScale } from "../theme";

const LockContext = createContext<((locked: boolean) => void) | null>(null);
const RevealContext = createContext<((row: RefObject<ViewInstance | null>) => void) | null>(null);

/** Used by ReorderableList: stops the page from scrolling while a row is held. */
export const useScrollLock = () => useContext(LockContext);
/** Used by text fields in the list: scroll so the row sits above the keyboard (original). */
export const useReveal = () => useContext(RevealContext);

/**
 * A ScrollView that a held row can lock and a text field can scroll into view. The lock lives here, not in the
 * screen, so holding and dropping a row re-renders only this wrapper (its children are the same elements and are
 * skipped), not the whole screen. A screen-wide re-render at those moments made lifting and dropping stutter.
 */
export function DragScrollView({ scrollEnabled = true, onScroll, ...props }: ScrollViewProps) {
  const [locked, setLocked] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const y = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const pending = useRef<RefObject<ViewInstance | null> | null>(null);
  const s = useDesignScale();

  // Bring the pending row above the keyboard: measured on screen, scrolled in canvas units (the app is scaled by s).
  const bring = () => {
    const row = pending.current?.current;
    const top = keyboardTop.current;
    if (!row || top === null) return;
    row.measureInWindow((_x: number, rowY: number, _w: number, h: number) => {
      const margin = 64 * s; // room for the coloured underline under the text and a little air above the keyboard
      const below = rowY + h + margin - top;
      const above = 80 * s - rowY; // also keep it clear of the top of the screen
      if (below > 0) scroll.current?.scrollTo({ y: y.current + below / s, animated: true });
      else if (above > 0) scroll.current?.scrollTo({ y: Math.max(0, y.current - above / s), animated: true });
    });
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => { keyboardTop.current = e.endCoordinates.screenY; bring(); });
    const hide = Keyboard.addListener("keyboardDidHide", () => { keyboardTop.current = null; });
    return () => { show.remove(); hide.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  const reveal = (row: RefObject<ViewInstance | null>) => {
    pending.current = row;
    // the keyboard may already be up (switching rows); otherwise keyboardDidShow brings it
    setTimeout(bring, 60);
    setTimeout(() => { if (pending.current === row) pending.current = null; }, 2000);
  };

  return (
    <LockContext.Provider value={setLocked}>
      <RevealContext.Provider value={reveal}>
        <ScrollView
          ref={scroll}
          {...props}
          scrollEnabled={scrollEnabled && !locked}
          scrollEventThrottle={16}
          onScroll={(e) => { y.current = e.nativeEvent.contentOffset.y; onScroll?.(e); }}
        />
      </RevealContext.Provider>
    </LockContext.Provider>
  );
}
