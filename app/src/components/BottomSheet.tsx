import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { TextButton } from "./Button";

/**
 * Sheet that slides up over a dimmed screen (S05, S05a, S06c, S07d, S22b).
 * Closes on backdrop tap and Android back. Drag-to-close comes with the gesture library in replica-build.
 */
export function BottomSheet({ visible, onClose, title, right, children, inline }: {
  visible: boolean; onClose: () => void; title?: string; right?: { label: string; onPress: () => void }; children: React.ReactNode; inline?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = (
    <View style={{ backgroundColor: c.surfaceRaised, borderTopLeftRadius: tokens.radius.sheet, borderTopRightRadius: tokens.radius.sheet, paddingTop: 12, paddingHorizontal: tokens.layout.gutter, paddingBottom: 24 + insets.bottom }}>
      <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.grabber }} />
      {title ? (
        <View style={{ height: 64, justifyContent: "center" }}>
          <AppText variant="sheetTitle" center accessibilityRole="header" numberOfLines={1} style={{ paddingHorizontal: 64 }}>{title}</AppText>
          {right ? <View style={{ position: "absolute", right: 0 }}><TextButton label={right.label} onPress={right.onPress} /></View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
  if (inline) return sheet; // for the design gallery
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.scrim }} onPress={onClose} accessibilityLabel="닫기" />
        {sheet}
      </View>
    </Modal>
  );
}
