import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, BottomSheet, Button, Check, ColorCodeInput, ConfirmDialog, Plus, PRESET_COLORS, RadioList, ScreenHeader, Trash2, useFrame } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { deleteEventCategory, saveEventCategory, selectActiveCategories, selectEventCategories, useDB } from "../../data/store";
import { goBack } from "../../lib/nav";
import { fontFamily, onColor, tokens, useInsets, useTheme } from "../../theme";

/** 강조 색 choices; any #RRGGBB can be typed too */
export const GLOW_PRESETS = ["#00FF7F", "#3DF5FF", "#FFE14D", "#FF5AF7", "#FF7A45", "#B388FF", "#FFFFFF"];
const NONE = "event:none";

/** A list of rows in one rounded card. */
function Card({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  const frame = useFrame();
  return <View style={{ borderRadius: tokens.radius.lg, backgroundColor: c.surface, overflow: "hidden", ...frame }}>{children}</View>;
}

function Row({ title, color, note, onPress, first, a11y }: { title: string; color?: string; note?: string; onPress: () => void; first?: boolean; a11y: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 16, borderTopWidth: first ? 0 : 1, borderTopColor: c.sectionLine }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color ?? "transparent", borderWidth: color ? 0 : 1.5, borderColor: c.textMuted, borderStyle: "dashed" }} />
      <AppText variant="bodyLg" numberOfLines={1} style={{ flex: 1 }}>{title}</AppText>
      {note ? <AppText variant="small" color="textMuted">{note}</AppText> : null}
    </Pressable>
  );
}

/** Picking a colour: swatches, a code field, and (optionally) going back to the item's own colour. */
function ColorSheet({ open, title, value, own, onClose, onPick, onReset, resetLabel }: {
  open: boolean; title: string; value: string; own?: string; onClose: () => void; onPick: (hex: string) => void; onReset?: () => void; resetLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [pick, setPick] = useState(0);
  const [seen, setSeen] = useState(open);
  if (open !== seen) { setSeen(open); if (open) { setDraft(value); setPick((n) => n + 1); } }
  const choose = (col: string) => { setDraft(col); setPick((n) => n + 1); };
  const swatches = [...new Set([...(own ? [own.toUpperCase()] : []), ...GLOW_PRESETS, ...PRESET_COLORS])].slice(0, 14);
  return (
    <BottomSheet visible={open} onClose={onClose} title={title}>
      <ColorCodeInput key={pick} value={draft} onChange={setDraft} presets={swatches} />
      <View style={{ marginTop: 20, flexDirection: "row", gap: 10 }}>
        {onReset ? <Button kind="sheetBlock" flex label={resetLabel ?? "원래 색으로"} onPress={onReset} /> : null}
        <Button kind="sheetBlock" flex label="확인" onPress={() => onPick(draft.toUpperCase())} />
      </View>
    </BottomSheet>
  );
}

/**
 * 강조 색 (메인 앱, user 2026-11-23): by default every highlighted item glows in its own colour (an event's colour, a
 * to-do's category colour). 카테고리별로 정하기 picks a glow colour per to-do category and per 일정 카테고리.
 */
export function GlowSettingsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const p = usePrefs();
  const cats = useDB(selectActiveCategories);
  const eventCats = useDB(selectEventCategories);
  const [editing, setEditing] = useState<{ id: string; title: string; own?: string } | null>(null);
  const set = (id: string, hex: string | null) => {
    const next = { ...p.glowColors };
    if (hex) next[id] = hex; else delete next[id];
    setPref("glowColors", next);
    setEditing(null);
  };
  const row = (id: string, title: string, own: string | undefined, first: boolean) => {
    const mine = p.glowColors[id];
    return <Row key={id} first={first} title={title} color={mine ?? own} note={mine ? mine : own ? "원래 색" : "일정 색"} a11y={`${title}, 강조 색 ${mine ?? "원래 색"}`} onPress={() => setEditing({ id, title, own })} />;
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="강조 색" onBack={() => goBack("/settings/display")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted" style={{ marginVertical: 12 }}>중요한 할 일과 강조한 일정이 빛나는 색이에요.</AppText>
        <RadioList value={p.glowMode} onChange={(v) => setPref("glowMode", v)} options={[
          { value: "follow", label: "기본 · 일정과 카테고리 색을 따라가요" },
          { value: "custom", label: "카테고리별로 정하기" },
        ]} />
        {p.glowMode === "custom" ? (
          <>
            <AppText variant="small" weight={700} color="textMuted" style={{ marginTop: 22, marginBottom: 8, marginLeft: 4 }} accessibilityRole="header">할 일 카테고리</AppText>
            <Card>{cats.length ? cats.map((k, i) => row(k.id, k.title, k.color, i === 0)) : <AppText variant="body" color="textMuted" style={{ padding: 16 }}>할 일 카테고리가 없어요</AppText>}</Card>
            <AppText variant="small" weight={700} color="textMuted" style={{ marginTop: 22, marginBottom: 8, marginLeft: 4 }} accessibilityRole="header">일정 카테고리</AppText>
            <Card>
              {eventCats.map((k, i) => row(k.id, k.title, k.color, i === 0))}
              {row(NONE, "카테고리 없는 일정", undefined, !eventCats.length)}
            </Card>
            <AppText variant="small" color="textMuted" style={{ marginTop: 10, marginLeft: 4 }}>정하지 않은 곳은 원래 색으로 빛나요.</AppText>
          </>
        ) : null}
      </ScrollView>
      <ColorSheet open={!!editing} title={editing ? `${editing.title} 강조 색` : ""} value={editing ? p.glowColors[editing.id] ?? editing.own ?? "#00FF7F" : "#00FF7F"} own={editing?.own}
        onClose={() => setEditing(null)} onPick={(hex) => editing && set(editing.id, hex)} onReset={() => editing && set(editing.id, null)} />
    </View>
  );
}

/** 일정 카테고리 (user, 2026-11-23): the events' own categories, apart from the to-dos'. Name, colour, add, remove. */
export function EventCategoriesScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const list = useDB(selectEventCategories);
  const [name, setName] = useState("");
  const [colorOf, setColorOf] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const picked = list.find((k) => k.id === colorOf);
  const add = () => {
    const title = name.trim();
    if (!title) return;
    saveEventCategory({ title, color: PRESET_COLORS[list.length % PRESET_COLORS.length] });
    setName("");
  };
  const input = { flex: 1, height: 46, paddingHorizontal: 14, borderRadius: tokens.radius.md, backgroundColor: c.surfaceInput, color: c.text, fontFamily: fontFamily(400), fontSize: tokens.type.body.size, outlineStyle: "none" as never };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="일정 카테고리" onBack={() => goBack("/settings")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <AppText variant="helper" color="textMuted" style={{ marginVertical: 12 }}>할 일 카테고리와 따로 일정을 나눠요. 일정에 카테고리를 고르면 그 색이 돼요.</AppText>
        <Card>
          {list.length ? list.map((k, i) => (
            <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 54, paddingLeft: 16, paddingRight: 6, borderTopWidth: i ? 1 : 0, borderTopColor: c.sectionLine }}>
              <Pressable onPress={() => setColorOf(k.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${k.title} 색 바꾸기`}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: k.color }} />
              <Pressable onPress={() => setRenaming({ id: k.id, title: k.title })} style={{ flex: 1, paddingVertical: 14 }} accessibilityRole="button" accessibilityLabel={`${k.title} 이름 바꾸기`}>
                <AppText variant="bodyLg" numberOfLines={1}>{k.title}</AppText>
              </Pressable>
              <Pressable onPress={() => setRemoving(k.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${k.title} 지우기`} style={{ padding: 10 }}>
                <Trash2 size={20} color={c.textMuted} />
              </Pressable>
            </View>
          )) : <AppText variant="body" color="textMuted" style={{ padding: 16 }}>아직 일정 카테고리가 없어요</AppText>}
        </Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
          <TextInput value={name} onChangeText={setName} onSubmitEditing={add} placeholder="새 카테고리 이름 (예: 수업, 약속)" placeholderTextColor={c.textPlaceholder} maxLength={40}
            accessibilityLabel="새 일정 카테고리 이름" returnKeyType="done" style={input} />
          <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="카테고리 추가"
            style={{ width: 46, height: 46, borderRadius: tokens.radius.md, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
            <Plus size={22} color={onColor(c.accent)} />
          </Pressable>
        </View>
      </ScrollView>
      <ColorSheet open={!!picked} title={picked ? `${picked.title} 색` : ""} value={picked?.color ?? "#4A90E2"} onClose={() => setColorOf(null)}
        onPick={(hex) => { if (picked) saveEventCategory({ id: picked.id, title: picked.title, color: hex }); setColorOf(null); }} />
      <BottomSheet visible={!!renaming} onClose={() => setRenaming(null)} title="이름 바꾸기"
        right={renaming ? { label: "완료", onPress: () => { const k = list.find((x) => x.id === renaming.id); if (k && renaming.title.trim()) saveEventCategory({ id: k.id, title: renaming.title.trim(), color: k.color }); setRenaming(null); } } : undefined}>
        {renaming ? <TextInput value={renaming.title} onChangeText={(title) => setRenaming({ ...renaming, title })} autoFocus maxLength={40} accessibilityLabel="카테고리 이름" style={{ ...input, flex: undefined }} /> : null}
      </BottomSheet>
      <ConfirmDialog visible={!!removing} message="이 카테고리를 지울까요? 일정은 남고 카테고리만 없어져요." cancel="취소" ok="지우기" danger
        onCancel={() => setRemoving(null)} onOk={() => { if (removing) deleteEventCategory(removing); setRemoving(null); }} />
    </View>
  );
}
