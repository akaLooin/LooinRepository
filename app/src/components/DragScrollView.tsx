import { createContext, useContext, useState } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";

const LockContext = createContext<((locked: boolean) => void) | null>(null);

/** Used by ReorderableList: stops the page from scrolling while a row is held. */
export const useScrollLock = () => useContext(LockContext);

/**
 * A ScrollView that a held row can lock. The lock lives here, not in the screen, so holding and dropping a row
 * re-renders only this wrapper (its children are the same elements and are skipped), not the whole screen.
 * A screen-wide re-render at those moments was what made lifting and dropping stutter on the phone.
 */
export function DragScrollView({ scrollEnabled = true, ...props }: ScrollViewProps) {
  const [locked, setLocked] = useState(false);
  return (
    <LockContext.Provider value={setLocked}>
      <ScrollView {...props} scrollEnabled={scrollEnabled && !locked} />
    </LockContext.Provider>
  );
}
