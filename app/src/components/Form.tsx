import { Pressable, TextInput, View } from "react-native";
import { fontFamily, tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { ChevronRight } from "./icons";

/** Rounded block of edit fields (S06b, S07b, S21b). Children are FieldRow. */
export function FieldGroup({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={{ borderRadius: tokens.radius.lg, overflow: "hidden", gap: 1, backgroundColor: c.bg }}>{children}</View>;
}

export function FieldRow({ title, value, onPress, right }: { title: string; value?: string; onPress?: () => void; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => ({ height: 64, paddingHorizontal: 20, backgroundColor: pressed ? c.surfaceRow : c.surfaceInput, flexDirection: "row", alignItems: "center", gap: 10 })}>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      {right}
      {value !== undefined && <AppText variant="bodyLg" weight={700}>{value}</AppText>}
      {onPress && <ChevronRight size={20} color={c.textMuted} />}
    </Pressable>
  );
}

/** Title field with a 2dp underline in the category colour (S04, S06b, S07b, S21b). */
export function TitleInput({ value, onChangeText, placeholder, underline, textColor, error, autoFocus }: {
  value: string; onChangeText: (s: string) => void; placeholder?: string; underline?: string; textColor?: string; error?: string; autoFocus?: boolean;
}) {
  const { c } = useTheme();
  const t = tokens.type["bodyLg"];
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textPlaceholder}
        autoFocus={autoFocus}
        accessibilityLabel={placeholder}
        style={{ fontFamily: fontFamily(500), fontSize: t.size, color: textColor ?? c.text, paddingVertical: 14, paddingHorizontal: 4,
          borderBottomWidth: 2, borderBottomColor: error ? c.danger : underline ?? c.text }}
      />
      {error ? <AppText variant="helper" color="danger" style={{ marginTop: 6 }}>{error}</AppText> : null}
    </View>
  );
}

/** Multi-line memo box (S05a, S07b). */
export function MemoInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (s: string) => void; placeholder: string }) {
  const { c } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.textPlaceholder}
      multiline
      accessibilityLabel={placeholder}
      style={{ minHeight: 140, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceInput, color: c.text, padding: 20, textAlignVertical: "top",
        fontFamily: fontFamily(400), fontSize: tokens.type["bodyLg"].size }}
    />
  );
}
