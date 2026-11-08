import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { AppText, ChevronRight, RipplePressable, ScreenHeader } from "../../components";
import { fontFamily, ScaledRoot, tokens, useInsets, useTheme } from "../../theme";

/** A rounded row with a label, its value and ›, as on the original's 프로필 and 계정 screens. */
export function BoxRow({ label, value, onPress, strong }: { label: string; value?: string; onPress?: () => void; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <RipplePressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label}
      style={{ minHeight: 52, borderRadius: tokens.radius.md, overflow: "hidden", backgroundColor: c.surfaceRow,
        flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 8 }}>
      <AppText variant="body" weight={strong ? 600 : 400} style={{ flex: 1 }}>{label}</AppText>
      {value ? <AppText variant="body" weight={600} numberOfLines={1} style={{ maxWidth: "60%" }}>{value}</AppText> : null}
      <ChevronRight size={18} color={c.textMuted} />
    </RipplePressable>
  );
}

/** Section title and the grey explanation under a setting (개인정보 보호). */
export function SectionTitle({ title }: { title: string }) {
  return <AppText variant="body" weight={700} style={{ marginTop: 22, marginBottom: 6 }}>{title}</AppText>;
}
export function Explain({ text }: { text: string }) {
  return <AppText variant="helper" color="textMuted" style={{ marginBottom: 8 }}>{text}</AppText>;
}

/** The floating choice panel at the bottom (프로필 이미지: 수정/삭제, 성별), with 취소 in blue. */
export function ActionSheet({ visible, options, onClose }: {
  visible: boolean; onClose: () => void; options: { label: string; onPress: () => void; danger?: boolean }[];
}) {
  const { c } = useTheme();
  const insets = useInsets();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <ScaledRoot>
        <Pressable style={{ flex: 1, backgroundColor: tokens.scrim }} onPress={onClose} accessibilityLabel="닫기" />
        <View style={{ position: "absolute", left: 14, right: 14, bottom: 14 + insets.bottom, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceRaised, overflow: "hidden" }}>
          {options.map((o) => (
            <RipplePressable key={o.label} onPress={() => { onClose(); o.onPress(); }} accessibilityRole="button"
              style={{ height: 56, alignItems: "center", justifyContent: "center" }}>
              <AppText variant="bodyLg" color={o.danger ? "danger" : "text"}>{o.label}</AppText>
            </RipplePressable>
          ))}
          <RipplePressable onPress={onClose} accessibilityRole="button" style={{ height: 56, alignItems: "center", justifyContent: "center" }}>
            <AppText variant="bodyLg" color="saturday">취소</AppText>
          </RipplePressable>
        </View>
      </ScaledRoot>
    </Modal>
  );
}

const ROW = 40;
/** A scrolling wheel of choices (생년월), the middle one picked. */
export function Wheel<T extends string | number>({ items, value, onChange, label, format = String }: {
  items: T[]; value: T; onChange: (v: T) => void; label: string; format?: (v: T) => string;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const start = Math.max(0, items.indexOf(value));
  useEffect(() => { const t = setTimeout(() => ref.current?.scrollTo({ y: start * ROW, animated: false }), 0); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (y: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ROW)));
    if (items[i] !== value) onChange(items[i]);
  };
  return (
    <View style={{ height: ROW * 5, flex: 1 }} accessibilityLabel={label}>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} snapToInterval={ROW} decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW * 2 }}
        onMomentumScrollEnd={(e) => pick(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => pick(e.nativeEvent.contentOffset.y)}>
        {items.map((it) => (
          <Pressable key={String(it)} onPress={() => { onChange(it); ref.current?.scrollTo({ y: items.indexOf(it) * ROW, animated: true }); }}
            style={{ height: ROW, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityState={{ selected: it === value }}>
            <AppText variant="bodyLg" weight={it === value ? 700 : 400} color={it === value ? "text" : "textMuted"} style={{ opacity: it === value ? 1 : 0.5 }}>{format(it)}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * One field on its own screen with 확인 at the top right and a counter, as on the original's 이름, 자기소개 and ID
 * screens.
 */
export function EditFieldScreen({ title, initial, max, multiline, placeholder, validate, onSave, onBack }: {
  title: string; initial: string; max: number; multiline?: boolean; placeholder?: string;
  validate?: (v: string) => string | undefined; onSave: (v: string) => void; onBack: () => void;
}) {
  const { c } = useTheme();
  const insets = useInsets();
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string>();
  const save = () => {
    const v = text.trim();
    const e = validate?.(v);
    if (e) return setError(e);
    onSave(v);
    onBack();
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title={title} onBack={onBack} right={{ label: "확인", onPress: save }} />
      <View style={{ paddingHorizontal: tokens.layout.gutter, paddingTop: 8, gap: 8 }}>
        <View style={{ borderRadius: tokens.radius.md, backgroundColor: c.surfaceRow, paddingHorizontal: 16, paddingVertical: multiline ? 14 : 0,
          minHeight: multiline ? 140 : 52, flexDirection: multiline ? "column" : "row", alignItems: multiline ? "stretch" : "center" }}>
          <TextInput value={text} onChangeText={(v) => { setText(v.slice(0, max)); setError(undefined); }} autoFocus multiline={multiline}
            placeholder={placeholder} placeholderTextColor={c.textPlaceholder} accessibilityLabel={title} onSubmitEditing={multiline ? undefined : save}
            style={{ flex: 1, color: c.text, fontFamily: fontFamily(500), fontSize: tokens.type.bodyLg.size, minHeight: multiline ? 90 : 52,
              textAlignVertical: multiline ? "top" : "center", outlineStyle: "none" as never }} />
          <AppText variant="helper" color="textMuted" style={{ alignSelf: multiline ? "flex-end" : "center", marginLeft: 8 }}>{`${text.length} / ${max}`}</AppText>
        </View>
        {error ? <AppText variant="helper" color="danger">{error}</AppText> : null}
      </View>
    </View>
  );
}
