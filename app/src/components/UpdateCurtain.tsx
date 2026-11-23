import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { useUpdateStage } from "../lib/updateNow";
import { useTheme } from "../theme";
import { AppText } from "./AppText";
import { Clover } from "./Clover";

const WORDS = { checking: "새 버전을 찾고 있어요", downloading: "새 버전을 받고 있어요", applying: "새 버전으로 바꾸는 중이에요" } as const;

/**
 * 립마크's own screen while it updates (user, 2026-11-23: a white screen showed): the star turning slowly, what is
 * happening, and how much has come. Over everything, so nothing is tapped in between.
 */
export function UpdateCurtain() {
  const stage = useUpdateStage();
  const { c } = useTheme();
  const { downloadProgress } = Updates.useUpdates();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (stage === "idle") return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [stage, spin]);
  if (stage === "idle") return null;
  const pct = stage === "applying" ? 1 : stage === "downloading" ? Math.max(0.05, downloadProgress ?? 0.3) : 0.05;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 22 }}
      accessibilityViewIsModal accessibilityLiveRegion="polite" accessibilityLabel={WORDS[stage]}>
      <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
        <Clover size={64} state={{ kind: "fill", color: c.accent }} />
      </Animated.View>
      <AppText variant="bodyLg" weight={700}>{WORDS[stage]}</AppText>
      <View style={{ width: 180, height: 6, borderRadius: 3, backgroundColor: c.surfaceStrong, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(pct * 100)}%`, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
      </View>
      <AppText variant="small" color="textMuted">잠깐이면 끝나요. 앱을 닫지 말아 주세요</AppText>
      <View style={{ position: "absolute", bottom: 48 }}><AppText variant="small" weight={800} color="textMuted" style={{ letterSpacing: 2 }}>립마크</AppText></View>
    </View>
  );
}
