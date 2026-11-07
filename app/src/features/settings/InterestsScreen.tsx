import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, BottomSheet, Button, ScreenHeader } from "../../components";
import { updateProfile, useDB } from "../../data/store";
import { goBack } from "../../lib/nav";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";

const MAX = 10;

/**
 * 관심사 (original's screen): up to 10 chips. Suggestions are the user's own category and routine names, as in the
 * recording; 직접 등록 adds any word.
 */
export function InterestsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  // selected separately: a selector that builds a new list each time would redraw forever
  const categories = useDB((d) => d.categories);
  const routines = useDB((d) => d.routines);
  const suggestions = [...categories.filter((x) => !x.endedAt).map((x) => x.title), ...routines.map((r) => r.title)];
  const [picked, setPicked] = useState<string[]>(profile.interests ?? []);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const all = [...new Set([...suggestions, ...picked])];
  const toggle = (w: string) =>
    setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : p.length >= MAX ? p : [...p, w]));
  const save = () => { updateProfile({ interests: picked }); goBack("/profile"); };
  const addOwn = () => {
    const w = text.trim().slice(0, 20);
    if (w && !picked.includes(w) && picked.length < MAX) setPicked((p) => [...p, w]);
    setText(""); setAdding(false);
  };

  const chip = (label: string, on: boolean, onPress: () => void, accent?: boolean) => (
    <Pressable key={label} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ height: 36, paddingHorizontal: 16, borderRadius: tokens.radius.pill, justifyContent: "center",
        backgroundColor: on ? c.surfaceStrong : c.surfaceRow }}>
      <AppText variant="body" weight={on ? 700 : 400} color={accent ? "saturday" : on ? "text" : "textMuted"}>{label}</AppText>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="관심사" onBack={() => goBack("/profile")} right={{ label: "확인", onPress: save }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted" style={{ marginBottom: 12 }}>{`최대 등록 개수 ${picked.length}/${MAX}`}</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {all.map((w) => chip(w, picked.includes(w), () => toggle(w)))}
          {chip("직접 등록", false, () => setAdding(true), true)}
        </View>
      </ScrollView>
      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="관심사 직접 등록">
        <TextInput value={text} onChangeText={setText} autoFocus placeholder="예: 독서" placeholderTextColor={c.textPlaceholder} accessibilityLabel="관심사 입력"
          onSubmitEditing={addOwn} maxLength={20}
          style={{ height: 52, borderRadius: tokens.radius.md, backgroundColor: c.surfaceInput, color: c.text, paddingHorizontal: 16,
            fontFamily: fontFamily(500), fontSize: tokens.type.bodyLg.size, outlineStyle: "none" as never }} />
        <View style={{ marginTop: 16 }}><Button kind="sheetPrimary" label="추가" onPress={addOwn} /></View>
      </BottomSheet>
    </View>
  );
}
