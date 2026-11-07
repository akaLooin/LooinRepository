import { useEffect, useRef, useState } from "react";
import { Platform, TextInput, View, type TextInputInstance, type ViewInstance } from "react-native";
import { Clover, useReveal } from "../../components";
import { fontFamily, tokens, useTheme, visibleOn } from "../../theme";

/**
 * The row that turns into a text field when adding (+) or editing (double tap) a to-do (S04).
 * As in the original: the keyboard comes up at once, and the page scrolls so the row stays above it.
 */
export function InlineTodoInput({ color, initial = "", editing = !!initial, focusOnOpen = true, onSubmit, onDone, onChangeText, onFocusChange }: {
  color: string; initial?: string; editing?: boolean;
  /** false when the field comes back on its day: shown in edit mode, keyboard only after a tap */
  focusOnOpen?: boolean;
  onSubmit: (title: string) => void; onDone: () => void; onChangeText?: (text: string) => void; onFocusChange?: (focused: boolean) => void;
}) {
  const { c } = useTheme();
  const reveal = useReveal();
  const [text, setText] = useState(initial);
  const input = useRef<TextInputInstance>(null);
  const row = useRef<ViewInstance>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  // autoFocus alone did not always bring the keyboard up on Android when the row appears inside the list
  useEffect(() => {
    const t = focusOnOpen ? setTimeout(() => input.current?.focus(), Platform.OS === "android" ? 80 : 0) : undefined;
    return () => {
      if (t) clearTimeout(t);
      if (closing.current) clearTimeout(closing.current);
      onFocusChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Closing waits a moment so tapping another control first does not lose the text.
  const scheduleClose = () => {
    closing.current = setTimeout(() => { if (!textRef.current.trim() || editing) onDone(); }, 180);
  };
  const submit = () => {
    const t = text.trim();
    if (t) onSubmit(t);
    if (editing) onDone(); // editing: one shot
    else setText(""); // adding: stay open for the next one
  };
  return (
    <View ref={row} collapsable={false}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
      <Clover size={tokens.size.cloverTodo} state={{ kind: "todoOpen" }} />
      <TextInput
        ref={input}
        autoFocus={focusOnOpen}
        value={text}
        onChangeText={(v) => { setText(v); onChangeText?.(v); }}
        onSubmitEditing={submit}
        onFocus={() => { onFocusChange?.(true); reveal?.(row); }}
        onBlur={() => { onFocusChange?.(false); scheduleClose(); }}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder="할 일 입력"
        placeholderTextColor={c.textPlaceholder}
        accessibilityLabel="할 일 입력"
        style={{ flex: 1, minWidth: 0, outlineStyle: "none" as never, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, color: c.text, paddingVertical: 8,
          borderBottomWidth: 2, borderBottomColor: visibleOn(color, c.bg, c.text) }}
      />
    </View>
    </View>
  );
}
