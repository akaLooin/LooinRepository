import { useRef, useState } from "react";
import { TextInput, View, type TextInputInstance } from "react-native";
import { Clover } from "../../components";
import { fontFamily, tokens, useTheme, visibleOn } from "../../theme";

/** The row that turns into a text field when adding (+) or editing (double tap) a to-do (S04). */
export function InlineTodoInput({ color, initial = "", onSubmit, onDone }: { color: string; initial?: string; onSubmit: (title: string) => void; onDone: () => void }) {
  const { c } = useTheme();
  const [text, setText] = useState(initial);
  const input = useRef<TextInputInstance>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  // Closing waits a moment so tapping another control first does not lose the text.
  const scheduleClose = () => {
    closing.current = setTimeout(() => { if (!textRef.current.trim() || initial) onDone(); }, 180);
  };
  const submit = () => {
    const t = text.trim();
    if (t) onSubmit(t);
    if (initial) onDone(); // editing: one shot
    else setText(""); // adding: stay open for the next one
  };
  return (
    <View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
      <Clover size={tokens.size.cloverTodo} state={{ kind: "todoOpen" }} />
      <TextInput
        ref={input}
        autoFocus
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        onBlur={scheduleClose}
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
