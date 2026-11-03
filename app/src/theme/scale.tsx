/**
 * Design scale. Sizes were measured from screenshots assuming the phone is 411dp wide. On a narrower phone
 * (most Samsung phones are 360–393dp), everything would be that much too big, so the whole UI is laid out on a
 * 411dp-wide canvas and scaled down to the real width. On the phone the screenshots came from, pixels then match.
 * The user can override the factor in 설정 → 화면 → 화면 크기.
 */
import { createContext, useContext, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrefs } from "../data/prefs";
import { tokens } from "./tokens";

export const DESIGN_WIDTH = tokens.layout.screenWidthBasis; // 411

/** "auto": real width / 411, kept between 0.8 and 1 (never enlarges on wide screens). */
export function useDesignScale() {
  const { width } = useWindowDimensions();
  const { uiScale } = usePrefs();
  if (typeof uiScale === "number") return uiScale;
  return Math.min(1, Math.max(0.8, width / DESIGN_WIDTH));
}

const ScaleContext = createContext(1);

/** Lays children out on a canvas 1/scale times bigger and scales it down to fit. Use at the root and inside each Modal. */
export function ScaledRoot({ children }: { children: React.ReactNode }) {
  const s = useDesignScale();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View style={{ flex: 1, overflow: "hidden" }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size ? (
        <ScaleContext.Provider value={s}>
          <View style={s === 1 ? { flex: 1 } : { width: size.w / s, height: size.h / s, transform: [{ scale: s }], transformOrigin: "top left" }}>
            {children}
          </View>
        </ScaleContext.Provider>
      ) : null}
    </View>
  );
}

/** Safe-area insets in canvas units (divided by the scale), for code inside ScaledRoot. */
export function useInsets() {
  const i = useSafeAreaInsets();
  const s = useContext(ScaleContext);
  return { top: i.top / s, bottom: i.bottom / s, left: i.left / s, right: i.right / s };
}
