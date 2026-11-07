import { Platform } from "react-native";
// Pretendard has one file per weight, and Android ignores fontWeight for custom fonts,
// so we always pick the family by weight.
export const fontFiles = {
  "Pretendard-Regular": require("../../assets/fonts/Pretendard-Regular.otf"),
  "Pretendard-Medium": require("../../assets/fonts/Pretendard-Medium.otf"),
  "Pretendard-SemiBold": require("../../assets/fonts/Pretendard-SemiBold.otf"),
  "Pretendard-Bold": require("../../assets/fonts/Pretendard-Bold.otf"),
};


/** 설정 → 화면 → 폰트. Pretendard is the default; the others are open-licence Korean fonts (assets/fonts/README.md). */
export type FontFace = "pretendard" | "system" | "nanumGothic" | "nanumPen";
export const FONT_LABEL: Record<FontFace, string> = { pretendard: "기본", system: "시스템", nanumGothic: "나눔고딕", nanumPen: "나눔손글씨 펜" };

/** Loaded only when picked (they are big); in the installed app they are built in (app.json expo-font). */
export const extraFontFiles: Record<Exclude<FontFace, "pretendard" | "system">, Record<string, number>> = {
  nanumGothic: {
    "NanumGothic-Regular": require("../../assets/fonts/NanumGothic-Regular.ttf"),
    "NanumGothic-Bold": require("../../assets/fonts/NanumGothic-Bold.ttf"),
  },
  nanumPen: { "NanumPenScript-Regular": require("../../assets/fonts/NanumPenScript-Regular.ttf") },
};

let face: FontFace = "pretendard";
/** Set by the theme when the setting changes; every text asks fontFamily() while drawing. */
export function setFontFace(f: FontFace) { face = f; }

export function fontFamily(weight: number) {
  if (face === "system") return Platform.OS === "web" ? "system-ui" : Platform.OS === "ios" ? "System" : "sans-serif";
  if (face === "nanumGothic") return weight >= 600 ? "NanumGothic-Bold" : "NanumGothic-Regular";
  if (face === "nanumPen") return "NanumPenScript-Regular";
  if (weight >= 700) return "Pretendard-Bold";
  if (weight >= 600) return "Pretendard-SemiBold";
  if (weight >= 500) return "Pretendard-Medium";
  return "Pretendard-Regular";
}
