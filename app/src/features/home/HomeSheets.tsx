import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, BottomSheet, Button, Clover, RadioCheck, RadioList, SettingsRow, Toggle, TextAlignStart } from "../../components";
import { setPref, usePrefs, type Prefs } from "../../data/prefs";
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

const SORT: Record<Prefs["todoSort"], string> = { done_last: "완료 여부 순", manual: "추가한 순" };

/** 리스트 메뉴 (bottom of home). The original's contents are not in the reference shots; these are our list options. */
export function ListMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const go = (href: string) => () => { onClose(); router.push(href as never); };
  return (
    <BottomSheet visible={open} onClose={onClose} title="리스트 메뉴">
      <View style={{ flexDirection: "row", alignItems: "center", height: 54 }}>
        <AppText variant="bodyLg" style={{ flex: 1 }}>완료한 할 일 숨기기</AppText>
        <Toggle value={prefs.hideDone} onChange={(v) => setPref("hideDone", v)} label="완료한 할 일 숨기기" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", height: 54 }}>
        <AppText variant="bodyLg" style={{ flex: 1 }}>카테고리 접기 펼치기</AppText>
        <Toggle value={prefs.collapsibleCategories} onChange={(v) => setPref("collapsibleCategories", v)} label="카테고리 접기 펼치기" />
      </View>
      <AppText variant="helper" color="textMuted" weight={600} style={{ marginTop: 12, marginBottom: 8 }}>할 일 정렬</AppText>
      <RadioList value={prefs.todoSort} onChange={(v) => setPref("todoSort", v)} options={(Object.keys(SORT) as Prefs["todoSort"][]).map((v) => ({ value: v, label: SORT[v] }))} />
      <View style={{ marginTop: 12 }}>
        <SettingsRow title="카테고리 관리" icon={<TextAlignStart size={22} color={c.text} />} onPress={go("/categories")} />
        <SettingsRow title="루틴 관리" icon={<TextAlignStart size={22} color={c.text} />} onPress={go("/routines")} />
      </View>
    </BottomSheet>
  );
}
