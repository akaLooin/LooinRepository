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
