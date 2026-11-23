import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, ArrowRight, BottomSheet, Button, CalendarClock, CalendarRange, Clover, Copy, CopyPlus, List, RadioCheck, Redo2, SkipForward, X } from "../../components";
import { Eraser, ListChecks } from "lucide-react-native";
import { DESIGN_TRIAL } from "../../lib/variant";
import { setPref, usePrefs } from "../../data/prefs";
import type { Category } from "../../data/store";
import { tokens, useTheme } from "../../theme";

/**
 * ▼ next to the month: 캘린더 종류 (clovers, or the 긴 할 일 calendar with the multi-day to-dos as bars; user's
 * feature), then which categories the calendar counts (null = all).
 */
export function CalendarFilterSheet({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: Category[] }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const [picked, setPicked] = useState<string[]>(prefs.calendarCategoryIds ?? categories.map((x) => x.id));
  const kind = prefs.calendarKind;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : [...p, id]));
  const save = () => {
    const all = categories.every((x) => picked.includes(x.id));
    setPref("calendarCategoryIds", all ? null : picked);
    onClose();
  };
  // a calendar is switched as soon as it is tapped (user), without 확인
  const pickKind = (k: typeof kind) => { if (k !== kind) setPref("calendarKind", k); save(); };
  return (
    <BottomSheet visible={open} onClose={onClose} title="캘린더 종류">
      {([["basic", "할 일 캘린더", "날짜마다 클로버, 일정은 날짜 아래 얇은 줄"], ["span", "일정 캘린더", "일정을 이름이 적힌 막대로. 날짜를 누르면 시간표"]] as const).map(([k, label, sub]) => (
        <Pressable key={k} onPress={() => pickKind(k)} accessibilityRole="radio" accessibilityState={{ checked: kind === k }} accessibilityLabel={label}
          style={{ flexDirection: "row", alignItems: "center", height: 58, gap: 14 }}>
          {k === "basic" ? <Clover size={22} state={{ kind: "fill", color: categories[0]?.color ?? c.accent }} /> : <CalendarRange size={22} color={c.text} />}
          <View style={{ flex: 1 }}>
            <AppText variant="bodyLg">{label}</AppText>
            <AppText variant="small" color="textMuted">{sub}</AppText>
          </View>
          <RadioCheck selected={kind === k} />
        </Pressable>
      ))}
      {kind === "basic" ? <>
      <AppText variant="body" weight={700} style={{ marginTop: 18, marginBottom: 2 }}>표시할 카테고리</AppText>
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
      <AppText variant="helper" color="textMuted" style={{ marginTop: 6 }}>고른 카테고리의 할 일만 캘린더에 보여요. 최소 하나는 남겨 두어야 해요.</AppText>
      <View style={{ marginTop: 18 }}><Button kind="sheetPrimary" label="확인" onPress={save} /></View>
      </> : null}
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

const MAIN_ACTIONS: { key: ListAction; label: string; sub: string; Icon: typeof ArrowRight; danger?: boolean }[] = [
  { key: "tomorrow", label: "남은 것 내일로", sub: "끝내지 못한 할 일을 내일로", Icon: SkipForward },
  { key: "otherDay", label: "남은 것 다른 날로", sub: "날짜를 골라 옮기기", Icon: CalendarClock },
  { key: "select", label: "골라서 정리", sub: "여러 개 골라 옮기거나 지우기", Icon: ListChecks },
  { key: "copyAll", label: "하루 복사", sub: "이날 할 일을 다른 날에도", Icon: CopyPlus },
  { key: "deleteAll", label: "하루 비우기", sub: "이날 할 일을 모두 지우기", Icon: Eraser, danger: true },
];

/** 리스트 메뉴 (S03 bottom): pick one action for the selected day, then 확인. Matches the reference screenshot. */
export function ListMenuSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (a: ListAction) => void }) {
  const { c } = useTheme();
  const [picked, setPicked] = useState<ListAction | null>(null);
  // 메인 앱 (user, 2026-11-23: not like the original's list): a grid of tiles in our own words; one tap acts
  // (deleting the whole day still asks first, where the list handles it)
  if (DESIGN_TRIAL) return (
    <BottomSheet visible={open} onClose={onClose} title="이날 한꺼번에">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {MAIN_ACTIONS.map(({ key, label, sub, Icon, danger }) => (
          <Pressable key={key} onPress={() => onConfirm(key)} accessibilityRole="button" accessibilityLabel={label}
            style={({ pressed }) => ({ width: "48%", flexGrow: 1, padding: 14, gap: 8, borderRadius: tokens.radius.lg, backgroundColor: pressed ? c.surfaceRow : c.surface })}>
            <Icon size={20} color={danger ? c.danger : c.text} />
            <View>
              <AppText variant="body" weight={700} color={danger ? "danger" : "text"}>{label}</AppText>
              <AppText variant="small" color="textMuted">{sub}</AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
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
