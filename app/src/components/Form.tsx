import { DESIGN_TRIAL } from "../lib/variant";
import { useEffect, useRef } from "react";
import { Pressable, TextInput, View, type TextInputInstance } from "react-native";
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
  const base = { height: tokens.size.fieldHeight, paddingHorizontal: 18, flexDirection: "row" as const, alignItems: "center" as const, gap: 10 };
  const inner = (
    <>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      {right}
      {value !== undefined && <AppText variant="bodyLg" weight={700}>{value}</AppText>}
      {onPress && <ChevronRight size={20} color={c.textMuted} />}
    </>
  );
  // Without an action it is a plain container, so a Toggle inside stays enabled.
  if (!onPress) return <View style={[base, { backgroundColor: c.surfaceInput }]}>{inner}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => [base, { backgroundColor: pressed ? c.surfaceRow : c.surfaceInput }]}>
      {inner}
    </Pressable>
  );
}

/** Title field with a 2dp underline in the category colour (S04, S06b, S07b, S21b). */
/**
 * 메인 앱: a field that keeps its own text (the value is only its starting text). The main app's sheets are drawn
 * through the in-app layer (Portal), so a value sent back while typing arrived one draw late and mixed up Korean
 * letters being composed (user, 2026-11-23: typing a new 일정 went wrong). A change from outside (a reset) is still
 * written into the field.
 */
function useOwnText(ref: React.RefObject<TextInputInstance | null>, value: string, onChangeText: (s: string) => void) {
  const typed = useRef(value);
  useEffect(() => {
    if (value === typed.current) return;
    typed.current = value;
    if (!value) ref.current?.clear();
    else (ref.current as unknown as { setNativeProps?: (p: object) => void })?.setNativeProps?.({ text: value });
  }, [value, ref]);
  return { defaultValue: value, onChangeText: (s: string) => { typed.current = s; onChangeText(s); } };
}

export function TitleInput({ value, onChangeText, placeholder, underline, textColor, error, autoFocus, bold, onSubmit }: {
  value: string; onChangeText: (s: string) => void; placeholder?: string; underline?: string; textColor?: string; error?: string; autoFocus?: boolean; bold?: boolean;
  /** the keyboard's 완료 key */
  onSubmit?: () => void;
}) {
  const { c } = useTheme();
  // autoFocus alone is not always honoured on Android inside a sheet: focus right after mounting too (user: the
  // keyboard should open by itself when editing a to-do)
  const ref = useRef<TextInputInstance>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [autoFocus]);
  const t = tokens.type["bodyLg"];
  const own = useOwnText(ref, value, onChangeText);
  // design app: a filled box with a colour bar on its left instead of the original's coloured underline
  if (DESIGN_TRIAL) return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", borderRadius: tokens.radius.md, backgroundColor: c.surface, overflow: "hidden",
        borderWidth: error ? 1 : 0, borderColor: c.danger }}>
        <View style={{ width: 4, alignSelf: "stretch", backgroundColor: underline ?? c.textMuted }} />
        <TextInput ref={ref} {...own} placeholder={placeholder} placeholderTextColor={c.textPlaceholder} autoFocus={autoFocus} accessibilityLabel={placeholder}
          onSubmitEditing={onSubmit} returnKeyType={onSubmit ? "done" : undefined}
          style={{ flex: 1, outlineStyle: "none" as never, fontFamily: fontFamily(bold ? 700 : 600), fontSize: bold ? 18 : t.size, color: textColor ?? c.text, paddingVertical: 14, paddingHorizontal: 14 }} />
      </View>
      {error ? <AppText variant="helper" color="danger" style={{ marginTop: 6 }}>{error}</AppText> : null}
    </View>
  );
  return (
    <View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textPlaceholder}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder}
        style={{ outlineStyle: "none" as never, fontFamily: fontFamily(bold ? 700 : 500), fontSize: bold ? 18 : t.size, color: textColor ?? c.text, paddingVertical: 10, paddingHorizontal: 4,
          borderBottomWidth: 2, borderBottomColor: error ? c.danger : underline ?? c.text }}
      />
      {error ? <AppText variant="helper" color="danger" style={{ marginTop: 6 }}>{error}</AppText> : null}
    </View>
  );
}

/** Multi-line memo box (S05a, S07b). */
export function MemoInput({ value, onChangeText, placeholder, focusOnOpen }: { value: string; onChangeText: (s: string) => void; placeholder: string; focusOnOpen?: boolean }) {
  const { c } = useTheme();
  const ref = useRef<TextInputInstance>(null);
  // after the sheet has slid up, so the keyboard and the sheet rise together
  useEffect(() => {
    if (!focusOnOpen) return;
    // the main app's sheets live in the app's own window: focus at once (the keyboard rises with the sheet); the copy
    // app waits for its sheet window to slide up first
    const t = setTimeout(() => ref.current?.focus(), DESIGN_TRIAL ? 30 : 280);
    return () => clearTimeout(t);
  }, [focusOnOpen]);
  const own = useOwnText(ref, value, onChangeText);
  return (
    <TextInput
      ref={ref}
      {...(DESIGN_TRIAL ? own : { value, onChangeText })}
      placeholder={placeholder}
      placeholderTextColor={c.textPlaceholder}
      multiline
      accessibilityLabel={placeholder}
      style={{ minHeight: 98, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceInput, color: c.text, padding: 20, textAlignVertical: "top",
        fontFamily: fontFamily(400), fontSize: tokens.type["bodyLg"].size }}
    />
  );
}
