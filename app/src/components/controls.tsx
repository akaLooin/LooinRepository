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
      <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: value ? c.toggleOn : c.toggleOff, justifyContent: "center" }}>
        <AppText variant="toggleLabel" color="onIcon" style={{ position: "absolute", left: value ? 9 : undefined, right: value ? undefined : 7 }}>
          {value ? "ON" : "OFF"}
        </AppText>
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
  if (!selected) return <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c.surfaceStrong }} />;
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.selectedBg, alignItems: "center", justifyContent: "center" }}>
      <Check size={18} color={c.onSelected} strokeWidth={3} />
    </View>
  );
}
