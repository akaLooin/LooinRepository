import { DESIGN_TRIAL } from "../lib/variant";
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Check } from "./icons";

/** ON/OFF switch with the label inside the track (S12d). */
export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  const { c } = useTheme();
  const w = tokens.size.toggleWidth;
  const h = tokens.size.toggleHeight;
  const knob = h - 4;
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [value, x]);
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      aria-checked={value}
      aria-disabled={!!disabled}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: value ? (DESIGN_TRIAL ? c.accent : c.toggleOn) : c.toggleOff, justifyContent: "center" }}>
        {/* the label is centred in the part of the track the knob leaves free, so it never touches the knob;
            the design app leaves the words out (a plain switch, not the original's ON/OFF track) */}
        {DESIGN_TRIAL ? null : <AppText variant="toggleLabel" color="onIcon" center numberOfLines={1}
          style={{ position: "absolute", left: value ? 2 : knob + 2, right: value ? knob + 2 : 2 }}>
          {value ? "ON" : "OFF"}
        </AppText>}
        <Animated.View
          style={{ position: "absolute", top: 2, width: knob, height: knob, borderRadius: knob / 2, backgroundColor: c.toggleThumb,
            left: x.interpolate({ inputRange: [0, 1], outputRange: [2, w - knob - 2] }) }}
        />
      </View>
    </Pressable>
  );
}

/** Plain radio as in the repeat list: black dot off, white dot on (S07c). */
export function Radio({ selected }: { selected: boolean }) {
  const { c } = useTheme();
  return <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: selected ? c.text : c.bg }} />;
}

/** Big round check used in sheets (S06c). */
export function RadioCheck({ selected }: { selected: boolean }) {
  const { c } = useTheme();
  // design app: only a check on the chosen line (no circles)
  if (DESIGN_TRIAL) return <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>{selected ? <Check size={22} color={c.text} strokeWidth={2.8} /> : null}</View>;
  if (!selected) return <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c.surfaceStrong }} />;
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.selectedBg, alignItems: "center", justifyContent: "center" }}>
      <Check size={18} color={c.onSelected} strokeWidth={3} />
    </View>
  );
}
