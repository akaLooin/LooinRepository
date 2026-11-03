// Pretendard has one file per weight, and Android ignores fontWeight for custom fonts,
// so we always pick the family by weight.
export const fontFiles = {
  "Pretendard-Regular": require("../../assets/fonts/Pretendard-Regular.otf"),
  "Pretendard-Medium": require("../../assets/fonts/Pretendard-Medium.otf"),
  "Pretendard-SemiBold": require("../../assets/fonts/Pretendard-SemiBold.otf"),
  "Pretendard-Bold": require("../../assets/fonts/Pretendard-Bold.otf"),
};

export function fontFamily(weight: number) {
  if (weight >= 700) return "Pretendard-Bold";
  if (weight >= 600) return "Pretendard-SemiBold";
  if (weight >= 500) return "Pretendard-Medium";
  return "Pretendard-Regular";
}
