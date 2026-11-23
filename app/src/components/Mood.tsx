import { View } from "react-native";
import { tokens } from "../theme";
import { AppText } from "./AppText";
import { isSticker, Sticker } from "./Sticker";

/** 오늘의 기분: a sticker of ours or an emoji, at the given size. */
export function MoodMark({ value, size }: { value: string; size: number }) {
  return isSticker(value) ? <Sticker id={value} size={size} /> : <AppText style={{ fontSize: size * 0.8, lineHeight: size }}>{value}</AppText>;
}

/** 기분 온도 under the mood (original: a short bar, pink up to the temperature, and "33°"). `ink` = text colour. */
export function MoodGauge({ temp, ink, track }: { temp: number; ink: string; track: string }) {
  const W = 48;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" }} accessibilityLabel={`기분 온도 ${temp}도`}>
      <View style={{ width: W, height: 6, borderRadius: 3, backgroundColor: track, overflow: "hidden" }}>
        <View style={{ width: (W * Math.max(0, Math.min(100, temp))) / 100, height: 6, backgroundColor: tokens.sticker.heart }} />
      </View>
      <AppText variant="helper" weight={600} raw={ink}>{`${temp}°`}</AppText>
    </View>
  );
}

/**
 * 낭만 농도 (메인 앱, user 2026-11-23: our own name for the day's mood strength, in place of the original's 기분 온도).
 * The same 0–100 number, read as a percentage, with a word for each fifth.
 */
export const ROMANCE_STAGES = ["담백한 하루", "잔잔한 하루", "설레는 하루", "몽글몽글한 하루", "낭만 가득한 하루"] as const;
export const romanceStage = (v: number) => ROMANCE_STAGES[Math.min(4, Math.floor(Math.max(0, Math.min(100, v)) / 20))];

/** 낭만 농도 as a bar that fills from the left, the percentage and its word. */
export function RomanceGauge({ value, ink, track, wide }: { value: number; ink: string; track: string; wide?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: wide ? 1 : undefined }} accessibilityLabel={`낭만 농도 ${v}%, ${romanceStage(v)}`}>
      <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : 56, height: 8, borderRadius: 4, backgroundColor: track, overflow: "hidden" }}>
        <View style={{ width: `${v}%`, height: 8, borderRadius: 4, backgroundColor: tokens.sticker.heart, opacity: 0.35 + (v / 100) * 0.65 }} />
      </View>
      <AppText variant="helper" weight={700} raw={ink}>{`${v}%`}</AppText>
      <AppText variant="small" raw={ink} style={{ opacity: 0.7 }}>{romanceStage(v)}</AppText>
    </View>
  );
}
