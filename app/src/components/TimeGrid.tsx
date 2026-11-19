import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { fontFamily, tokens, useTheme } from "../theme";
import { AppText } from "./AppText";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM = tokens.size.wheelItem;
const VISIBLE = 5; // rows in sight; the middle one is the value

/**
 * One wheel: flick or drag it, it settles on a row; tapping a row picks it too. The value is the middle row.
 * (Android and the web both: the web has no momentum events, so a short pause after scrolling settles it.)
 */
function Wheel({ values, value, onChange, label, unit }: { values: number[]; value: number; onChange: (v: number) => void; label: string; unit: string }) {
  const { c } = useTheme();
  const ref = useRef<ScrollViewInstance>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quietUntil = useRef(0); // while the wheel is being turned by code, its scroll events are not the user's
  const shown = useRef(value);
  const go = (v: number, animated: boolean) => {
    quietUntil.current = Date.now() + (animated ? 450 : 80);
    shown.current = v;
    ref.current?.scrollTo({ y: values.indexOf(v) * ITEM, animated });
  };
  // first draw, and a value changed from outside (an event's end follows its start)
  useEffect(() => { if (value !== shown.current || !ref.current) go(value, false); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => go(value, false), 0); return () => { clearTimeout(t); if (settle.current) clearTimeout(settle.current); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (y: number) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM)));
    const v = values[i];
    if (Platform.OS === "web" && Math.abs(y - i * ITEM) > 1) go(v, true);
    shown.current = v;
    if (v !== value) onChange(v);
  };
  // tapping the middle (picked) number lets you type it (user)
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const pick = (v: number) => {
    if (v === value) { setTyped(String(v)); setTyping(true); return; }
    go(v, true); onChange(v);
  };
  const doneTyping = () => {
    setTyping(false);
    const n = Number(typed);
    if (typed.trim() === "" || !Number.isInteger(n) || !values.includes(n)) return; // nothing or out of range: keep the old value
    go(n, true);
    if (n !== value) onChange(n);
  };

  return (
    <View style={{ flex: 1, height: ITEM * VISIBLE }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: ITEM * 2, height: ITEM, borderRadius: tokens.radius.md, backgroundColor: c.surfaceRow }} />
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} snapToInterval={ITEM} decelerationRate="fast" nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM * 2 }} scrollEventThrottle={32}
        onMomentumScrollEnd={(e) => commit(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => { if (Platform.OS !== "web") { const y = e.nativeEvent.contentOffset.y; if (settle.current) clearTimeout(settle.current); settle.current = setTimeout(() => commit(y), 150); } }}
        onScroll={(e) => {
          if (Date.now() < quietUntil.current) return;
          const y = e.nativeEvent.contentOffset.y;
          if (settle.current) clearTimeout(settle.current);
          // native: momentum end settles it (this is only the fallback); web: settle after a short pause
          settle.current = setTimeout(() => commit(y), Platform.OS === "web" ? 140 : 400);
        }}>
        {values.map((v) => {
          const on = v === value;
          return (
            <Pressable key={v} onPress={() => pick(v)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${v}${unit}`}
              style={{ height: ITEM, alignItems: "center", justifyContent: "center" }}>
              <AppText variant={on ? "sheetTitle" : "bodyLg"} weight={on ? 700 : 400} color={on ? "text" : "textMuted"} style={{ fontVariant: ["tabular-nums"] }}>
                {String(v).padStart(2, "0")}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      {typing ? (
        <TextInput value={typed} onChangeText={(t) => setTyped(t.replace(/[^0-9]/g, "").slice(0, 2))} autoFocus selectTextOnFocus keyboardType="number-pad" maxLength={2}
          returnKeyType="done" onSubmitEditing={doneTyping} onBlur={doneTyping} accessibilityLabel={`${label} 직접 입력`}
          style={{ position: "absolute", left: 0, right: 0, top: ITEM * 2, height: ITEM, borderRadius: tokens.radius.md, borderWidth: 2, borderColor: c.text,
            backgroundColor: c.surfaceRow, color: c.text, textAlign: "center", fontFamily: fontFamily(700), fontSize: tokens.type.sheetTitle.size, padding: 0, outlineStyle: "none" as never }} />
      ) : null}
    </View>
  );
}

/**
 * Hour and minute wheels, one minute apart (user, 2026-11-19: no more 5-minute buttons); tapping the middle number
 * lets you type it. Used for to-do alarms, routines, reminders and 일정 times.
 */
export function TimeGrid({ hour, minute, onChange }: { hour: number; minute: number; onChange: (h: number, m: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Wheel values={HOURS} value={hour} onChange={(h) => onChange(h, minute)} label="시" unit="시" />
      <AppText variant="sheetTitle" color="textMuted">:</AppText>
      <Wheel values={MINUTES} value={minute} onChange={(m) => onChange(hour, m)} label="분" unit="분" />
    </View>
  );
}
