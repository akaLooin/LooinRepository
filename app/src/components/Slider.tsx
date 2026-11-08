import { useRef, useState } from "react";
import { PanResponder, View, type LayoutChangeEvent } from "react-native";
import { useTheme } from "../theme";

/** A plain horizontal slider (기분 온도): drag the knob or tap the track. Whole numbers between min and max. */
export function Slider({ value, onChange, min = 0, max = 100, label, color }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; color?: string;
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const width = useRef(0);
  const startX = useRef(0);
  const clamp = (x: number) => Math.round(min + Math.max(0, Math.min(1, x / Math.max(1, width.current))) * (max - min));
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { startX.current = e.nativeEvent.locationX; onChangeRef.current(clamp(startX.current)); },
    onPanResponderMove: (_e, g) => onChangeRef.current(clamp(startX.current + g.dx)),
  })).current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pos = ((value - min) / (max - min)) * w;
  const K = 24;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => { width.current = e.nativeEvent.layout.width; setW(width.current); }}
      style={{ height: 44, justifyContent: "center" }}
      accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === "increment" ? 5 : -5))))}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: c.surfaceStrong }}>
        <View style={{ width: pos, height: 4, borderRadius: 2, backgroundColor: color ?? c.text }} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: pos - K / 2, width: K, height: K, borderRadius: K / 2, backgroundColor: c.checkWhite }} />
    </View>
  );
}
