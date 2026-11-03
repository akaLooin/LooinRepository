import { useRef, useState } from "react";
import { Pressable, TextInput, View, type TextInputInstance } from "react-native";
import { AppText, Clover } from "../../components";
import { fontFamily, tokens, useTheme, visibleOn } from "../../theme";

/** The row that turns into a text field when adding (+) or editing (double tap) a to-do (S04). */
type Suggestion = { id: string; title: string };

/** `suggestions` are manual-add routines for this day: tapping one starts the text with its title. */
export function InlineTodoInput({ color, initial = "", onSubmit, onDone, suggestions = [] }: {
  color: string; initial?: string; onSubmit: (title: string, routineId?: string) => void; onDone: () => void; suggestions?: Suggestion[];
}) {
  const { c } = useTheme();
  const [text, setText] = useState(initial);
  const [routine, setRoutine] = useState<Suggestion | null>(null);
  const input = useRef<TextInputInstance>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  // Closing waits a moment so a tap on a suggestion (which blurs the field first) still counts.
  const scheduleClose = () => {
    closing.current = setTimeout(() => { if (!textRef.current.trim() || initial) onDone(); }, 180);
  };
  const pick = (s: Suggestion) => {
    if (closing.current) clearTimeout(closing.current);
    setRoutine(s);
    setText(`${s.title}: `);
    input.current?.focus();
  };
  const submit = () => {
    const t = text.trim();
    const linked = routine && t.startsWith(routine.title) ? routine.id : undefined;
    if (t) onSubmit(t.replace(/:\s*$/, ""), linked);
    setRoutine(null);
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
    {suggestions.length && !text ? (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginLeft: tokens.size.cloverTodo + 12, marginTop: 6 }}>
        {suggestions.map((s) => (
          <Pressable key={s.id} onPress={() => pick(s)} accessibilityRole="button" accessibilityLabel={`루틴 ${s.title} 넣기`}
            style={{ paddingHorizontal: 12, height: 32, borderRadius: tokens.radius.pill, backgroundColor: c.surface, justifyContent: "center" }}>
            <AppText variant="helper">{s.title}</AppText>
          </Pressable>
        ))}
      </View>
    ) : null}
    </View>
  );
}
