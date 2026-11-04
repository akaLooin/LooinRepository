import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, ArrowRight, BottomSheet, Button, Clover, Copy, List, RadioCheck, Redo2, X } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import type { Category } from "../../data/store";
import { useTheme } from "../../theme";

/** ▼ next to the month: which categories the calendar clovers count (null = all). */
export function CalendarFilterSheet({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: Category[] }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const [picked, setPicked] = useState<string[]>(prefs.calendarCategoryIds ?? categories.map((x) => x.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : [...p, id]));
  const save = () => {
    const all = categories.every((x) => picked.includes(x.id));
    setPref("calendarCategoryIds", all ? null : picked);
    onClose();
  };
  return (
    <BottomSheet visible={open} onClose={onClose} title="캘린더에 표시할 카테고리">
      {categories.map((cat) => {
        const on = picked.includes(cat.id);
        return (
          <Pressable key={cat.id} onPress={() => toggle(cat.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={cat.title}
            style={{ flexDirection: "row", alignItems: "center", height: 54, gap: 14 }}>
            <Clover size={22} state={{ kind: "fill", color: cat.color }} />
            <AppText variant="bodyLg" style={{ flex: 1 }}>{cat.title}</AppText>
            <RadioCheck selected={on} />
          </Pressable>
        );
      })}
      <AppText variant="helper" color="textMuted" style={{ marginTop: 6 }}>고른 카테고리의 할 일만 날짜의 클로버에 세어요. 최소 하나는 남겨 두어야 해요.</AppText>
      <View style={{ marginTop: 18 }}><Button kind="sheetPrimary" label="확인" onPress={save} /></View>
    </BottomSheet>
  );
}

export type ListAction = "tomorrow" | "otherDay" | "select" | "copyAll" | "deleteAll";

const LIST_ACTIONS: { key: ListAction; label: string; color: "menuSoft" | "menuEdit" | "menuDelete"; Icon: typeof ArrowRight; danger?: boolean }[] = [
  { key: "tomorrow", label: "미완료 할 일 내일 하기", color: "menuSoft", Icon: ArrowRight },
  { key: "otherDay", label: "미완료 할 일 다른 날 하기", color: "menuSoft", Icon: Redo2 },
  { key: "select", label: "할 일 선택", color: "menuSoft", Icon: List },
  { key: "copyAll", label: "모든 할 일 복사", color: "menuEdit", Icon: Copy },
  { key: "deleteAll", label: "모든 할 일 삭제", color: "menuDelete", Icon: X, danger: true },
];

/** 리스트 메뉴 (S03 bottom): pick one action for the selected day, then 확인. Matches the reference screenshot. */
export function ListMenuSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (a: ListAction) => void }) {
  const { c } = useTheme();
  const [picked, setPicked] = useState<ListAction | null>(null);
  const close = () => { setPicked(null); onClose(); };
  return (
    <BottomSheet visible={open} onClose={close} title="리스트 메뉴">
      <View accessibilityRole="radiogroup">
        {LIST_ACTIONS.map(({ key, label, color, Icon, danger }) => (
          <Pressable key={key} onPress={() => setPicked(key)} accessibilityRole="radio" accessibilityState={{ checked: picked === key }}
            style={{ flexDirection: "row", alignItems: "center", height: 59, gap: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c[color], alignItems: "center", justifyContent: "center" }}>
              <Icon size={18} color={c.onIcon} strokeWidth={2.6} />
            </View>
            <AppText variant="bodyLg" color={danger ? "danger" : "text"} style={{ flex: 1 }}>{label}</AppText>
            <RadioCheck selected={picked === key} />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
        <Button kind="sheetBlock" flex label="취소" onPress={close} />
        <Button kind="sheetBlock" flex label="확인" disabled={!picked} onPress={() => { const p = picked; setPicked(null); if (p) onConfirm(p); }} />
      </View>
    </BottomSheet>
  );
}
