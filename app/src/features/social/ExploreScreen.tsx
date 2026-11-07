import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, Search, X } from "../../components";
import { searchPeople, type Person } from "../../data/social";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";
import { PersonRow } from "./PersonRow";
import { PersonSheet } from "./PersonSheet";

/**
 * 둘러보기 (S15), as far as the recording shows it: a search field "계정 또는 크루" on top; typing finds people by
 * ID or name, tapping one opens their profile (follow, their home). Crews and the feed are not built.
 */
export function ExploreScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Person | null>(null);
  const asked = useRef(0);
  useEffect(() => {
    if (!q.trim()) { setResults(null); setError(null); return; }
    const n = ++asked.current;
    const t = setTimeout(() => {
      setBusy(true);
      searchPeople(q)
        .then((r) => { if (n === asked.current) { setResults(r); setError(null); } })
        .catch((e) => { if (n === asked.current) setError(e instanceof Error ? e.message : "찾지 못했어요"); })
        .finally(() => { if (n === asked.current) setBusy(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const G = tokens.layout.gutter;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: G, paddingTop: 10, paddingBottom: 12 }}>
        <View style={{ height: 44, borderRadius: 22, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 10, gap: 8 }}>
          <Search size={18} color={c.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="계정 또는 크루" placeholderTextColor={c.textPlaceholder} autoCapitalize="none" autoCorrect={false}
            accessibilityLabel="계정 또는 크루 찾기" returnKeyType="search"
            style={{ flex: 1, color: c.text, fontSize: tokens.type.bodyLg.size, fontFamily: fontFamily(400), paddingVertical: 0, outlineStyle: "none" as never }} />
          {busy ? <ActivityIndicator size="small" color={c.textMuted} /> : null}
          {q ? <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="지우기"><X size={18} color={c.textMuted} /></Pressable> : null}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40 }}>
        {error ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>{error}</AppText>
          : results === null ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>ID나 이름으로 친구를 찾아보세요</AppText>
          : results.length === 0 ? <AppText variant="body" color="textMuted" center style={{ paddingVertical: 40 }}>찾는 사람이 없어요</AppText>
          : results.map((p) => <PersonRow key={p.id} p={p} onPress={() => setOpen(p)} />)}
      </ScrollView>
      <PersonSheet person={open} onClose={() => setOpen(null)} onChange={(p) => setResults((r) => r?.map((x) => (x.id === p.id ? p : x)) ?? r)} />
    </View>
  );
}
