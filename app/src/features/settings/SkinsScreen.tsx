import * as Font from "expo-font";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, Check, ScreenHeader, Sparkles } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { goBack } from "../../lib/nav";
import { extraFontFiles, fontFamily, FREE_SKINS, SKIN_ORDER, SKINS, tokens, useInsets, useTheme, type Skin, type SkinId } from "../../theme";

/**
 * 설정 → 스킨 (user, 2026-11-23): the skins this phone owns, each with a small preview drawn in its own colours, font
 * and shape; one tap switches. A shop to get more is coming (the list of owned skins is `ownedSkins`).
 */
export function SkinsScreen() {
  const { c } = useTheme();
  // the pixel font, so its preview shows real pixel letters before it is picked
  const [, setFontsReady] = useState(false);
  useEffect(() => { Font.loadAsync(extraFontFiles.galmuri).then(() => setFontsReady(true)).catch(() => {}); }, []);
  const insets = useInsets();
  const prefs = usePrefs();
  const owned = SKIN_ORDER.filter((id) => prefs.ownedSkins.includes(id) || FREE_SKINS.includes(id));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="스킨" onBack={() => goBack("/me")} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 14, paddingBottom: 40 }}>
        <AppText variant="small" color="textMuted">앱 전체의 색과 분위기를 바꿔요. 스킨이 정한 밝기(다크·라이트)와 글꼴이 먼저 쓰여요.</AppText>
        {owned.map((id) => <SkinCard key={id} skin={SKINS[id]} active={prefs.skin === id} onPick={() => setPref("skin", id as SkinId)} />)}
        <View style={{ padding: 16, gap: 6, borderRadius: tokens.radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: c.textMuted, alignItems: "center" }}>
          <Sparkles size={20} color={c.textMuted} />
          <AppText variant="body" weight={700}>스킨 상점</AppText>
          <AppText variant="small" color="textMuted" center>더 많은 스킨을 고를 수 있는 상점이 곧 열려요.</AppText>
        </View>
      </ScrollView>
    </View>
  );
}

/** A preview in the skin's own look: its background, a card with a sample to-do in its font, its accent. */
function SkinCard({ skin, active, onPick }: { skin: Skin; active: boolean; onPick: () => void }) {
  const { c } = useTheme();
  const [bg, surface, accent, other] = skin.swatch;
  const text = skin.colors.text ?? (skin.scheme === "light" ? "#111111" : "#ffffff");
  const muted = skin.colors.textMuted ?? "#8c8c8c";
  const r = skin.square ? 3 : 14;
  const font = (w: number) => (skin.font === "galmuri" ? (w >= 600 ? "Galmuri11-Bold" : "Galmuri11") : fontFamily(w));
  return (
    <Pressable onPress={onPick} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${skin.name}, ${skin.desc}`}
      style={{ borderRadius: tokens.radius.lg, backgroundColor: c.surface, padding: 12, gap: 12, borderWidth: 2, borderColor: active ? c.text : "transparent" }}>
      <View style={{ height: 120, borderRadius: r, backgroundColor: bg, padding: 12, gap: 8, overflow: "hidden", borderWidth: skin.square ? 2 : 0, borderColor: text }}>
        {skin.decor === "stars" ? [8, 22, 37, 55, 71, 86, 93].map((x, i) => (
          <View key={i} style={{ position: "absolute", left: `${x}%`, top: 6 + ((i * 13) % 30), width: 3, height: 3, borderRadius: 2, backgroundColor: i % 3 ? text : accent, opacity: 0.7 }} />
        )) : null}
        {skin.decor === "hearts" || skin.decor === "snow" ? [10, 28, 47, 66, 84].map((x, i) => (
          <AppText key={i} style={{ position: "absolute", left: `${x}%`, top: 4 + ((i * 11) % 22), fontSize: 10, color: skin.decor === "hearts" ? accent : other, opacity: 0.7 }}>{skin.decor === "hearts" ? "♥" : "❄"}</AppText>
        )) : null}
        <AppText style={{ fontFamily: font(700), fontSize: 15, color: text, marginTop: skin.decor ? 14 : 0 }}>오늘 할 일</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: r, backgroundColor: surface, borderWidth: skin.square ? 2 : 0, borderColor: text }}>
          <View style={{ width: 16, height: 16, borderRadius: skin.square ? 1 : 5, backgroundColor: accent, transform: [{ rotate: "45deg" }] }} />
          <AppText style={{ fontFamily: font(500), fontSize: 13, color: text, flex: 1 }}>산책 30분</AppText>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: skin.square ? 1 : 6, backgroundColor: other }}>
            <AppText style={{ fontFamily: font(700), fontSize: 10, color: bg }}>중요</AppText>
          </View>
        </View>
        <AppText style={{ fontFamily: font(400), fontSize: 11, color: muted }}>11월 23일 · 별 3개</AppText>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyLg" weight={800}>{skin.name}</AppText>
          <AppText variant="small" color="textMuted">{skin.desc}</AppText>
        </View>
        {active ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.surfaceStrong }}>
            <Check size={14} color={c.text} strokeWidth={3} /><AppText variant="small" weight={700}>사용 중</AppText>
          </View>
        ) : (
          <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.text, justifyContent: "center" }}>
            <AppText variant="small" weight={700} raw={c.bg}>쓰기</AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}
