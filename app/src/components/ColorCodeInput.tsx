import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { contrast, fontFamily, normalizeHex, tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Clover } from "./Clover";

export const PRESET_COLORS = ["#00FF7F", "#FF5A5F", "#FFB020", "#FCD218", "#3D8BFF", "#7B61FF", "#F060E4", "#9C9C9C"];

/** Category colour by hex code. Differs from the original on purpose (user request). */
export function ColorCodeInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { c } = useTheme();
  const [text, setText] = useState(value.replace("#", ""));
  const parsed = normalizeHex(text);
  const invalid = text.length > 0 && !parsed;
  const lowContrast = parsed ? contrast(parsed, c.bg) < 3 : false;

  const update = (s: string) => {
    const clean = s.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
    setText(clean);
    const hex = normalizeHex(clean);
    if (hex && clean.length !== 3) onChange(hex);
  };

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Clover size={48} state={{ kind: "done", color: parsed ?? value }} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: invalid ? c.danger : parsed ?? value }}>
          <AppText variant="monthTitle" color="textMuted">#</AppText>
          <TextInput
            value={text}
            onChangeText={update}
            onBlur={() => parsed && setText(parsed.slice(1))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="00FF7F"
            placeholderTextColor={c.textPlaceholder}
            accessibilityLabel="색상 코드"
            style={{ flex: 1, fontFamily: fontFamily(600), fontSize: tokens.type["monthTitle"].size, color: c.text, paddingVertical: 10, paddingHorizontal: 4, letterSpacing: 1 }}
          />
        </View>
      </View>
      {invalid ? <AppText variant="helper" color="danger">6자리 색상 코드를 입력해 주세요. 예: 00FF7F</AppText> : null}
      {lowContrast ? <AppText variant="helper" color="textMuted">이 색은 지금 배경에서 잘 안 보일 수 있어요.</AppText> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {PRESET_COLORS.map((hex) => (
          <Pressable key={hex} onPress={() => update(hex.slice(1))} accessibilityRole="button" accessibilityLabel={`색 ${hex}`}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: hex, borderWidth: hex === (parsed ?? value) ? 3 : 0, borderColor: c.text }} />
        ))}
      </View>
    </View>
  );
}
