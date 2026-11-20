import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  AppText, Archive, Bell, BottomSheet, CalendarRange, Check, Clover, FileText, List, Palette, ReorderableList, Search, Settings, Sparkles, Users,
} from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { selectActiveCategories, useDB } from "../../data/store";
import { today } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";

type Icon = typeof Archive;
/** Every shortcut 홈 can show. Ids are stored, so never rename one. */
export const SHORTCUTS: { id: string; label: string; icon: Icon | "clover"; go: () => void }[] = [
  { id: "event", label: "일정 추가", icon: CalendarRange, go: () => router.push(`/events/${today()}` as never) },
  { id: "diary", label: "일기 쓰기", icon: FileText, go: () => router.push(`/diary/${today()}` as never) },
  { id: "inbox", label: "보관함", icon: Archive, go: () => router.push("/inbox" as never) },
  { id: "routines", label: "루틴", icon: List, go: () => router.push("/routines" as never) },
  { id: "categories", label: "카테고리", icon: "clover", go: () => router.push("/categories" as never) },
  { id: "ddays", label: "디데이", icon: Sparkles, go: () => router.push("/ddays" as never) },
  { id: "reminders", label: "리마인더", icon: Bell, go: () => router.push("/reminders" as never) },
  { id: "friends", label: "친구", icon: Users, go: () => router.push("/people" as never) },
  { id: "search", label: "검색", icon: Search, go: () => router.push("/search" as never) },
  { id: "display", label: "화면 설정", icon: Palette, go: () => router.push("/settings/display" as never) },
  { id: "settings", label: "설정", icon: Settings, go: () => router.push("/settings" as never) },
];
const DEFAULT = ["event", "diary", "inbox", "routines", "categories", "ddays", "reminders", "friends"];
export const shortcutIds = (saved: string[] | null) => (saved ?? DEFAULT).filter((id) => SHORTCUTS.some((x) => x.id === id));

function Mark({ icon, size }: { icon: Icon | "clover"; size: number }) {
  const { c } = useTheme();
  const cats = useDB(selectActiveCategories);
  if (icon === "clover") return <Clover size={size} state={{ kind: "fill", color: cats[0]?.color ?? c.accent }} />;
  const I = icon;
  return <I size={size} color={c.text} />;
}

/** The grid on 홈 (user: shortcuts you can add, remove and reorder). */
export function ShortcutGrid() {
  const { c } = useTheme();
  const prefs = usePrefs();
  const list = shortcutIds(prefs.homeShortcuts).map((id) => SHORTCUTS.find((x) => x.id === id)!);
  if (!list.length) return <AppText variant="helper" color="textMuted">편집을 눌러 바로가기를 골라 보세요</AppText>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {list.map((x) => (
        <Pressable key={x.id} onPress={x.go} accessibilityRole="button" accessibilityLabel={x.label} style={{ width: "25%", alignItems: "center", gap: 6, paddingVertical: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>
            <Mark icon={x.icon} size={20} />
          </View>
          <AppText variant="small" numberOfLines={1}>{x.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

/** Tap a row to show or hide it on 홈; hold a row to move it. Saved as soon as it changes. */
export function ShortcutEditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const on = shortcutIds(prefs.homeShortcuts);
  const [order, setOrder] = useState<string[] | null>(null);
  const rows = order ?? [...on, ...SHORTCUTS.map((x) => x.id).filter((id) => !on.includes(id))];
  const save = (ids: string[], shown: string[]) => setPref("homeShortcuts", ids.filter((id) => shown.includes(id)));
  return (
    <BottomSheet visible={open} onClose={() => { setOrder(null); onClose(); }} title="바로가기 편집" right={{ label: "완료", onPress: () => { setOrder(null); onClose(); } }}>
      <AppText variant="helper" color="textMuted" style={{ marginBottom: 6 }}>눌러서 보이기·숨기기, 꾹 눌러 순서 바꾸기</AppText>
      <ReorderableList items={rows} keyOf={(id) => id} labelOf={(id) => SHORTCUTS.find((x) => x.id === id)!.label}
        onReorder={(ids) => { setOrder(ids); save(ids, on); }}
        renderItem={(id, drag) => {
          const x = SHORTCUTS.find((s) => s.id === id)!;
          const shown = on.includes(id);
          return (
            <Pressable {...drag} onPress={() => save(rows, shown ? on.filter((k) => k !== id) : [...on, id])}
              role="checkbox" aria-checked={shown} accessibilityLabel={x.label}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 54 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: shown ? c.accent : "transparent", borderWidth: shown ? 0 : 1.5, borderColor: c.textMuted }}>
                {shown ? <Check size={15} color={c.onAccent} /> : null}
              </View>
              <View style={{ width: 36, height: 36, borderRadius: tokens.radius.md, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>
                <Mark icon={x.icon} size={18} />
              </View>
              <AppText variant="bodyLg" color={shown ? "text" : "textMuted"} style={{ flex: 1 }}>{x.label}</AppText>
              <List size={18} color={c.textMuted} />
            </Pressable>
          );
        }} />
    </BottomSheet>
  );
}
