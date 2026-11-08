import { Modal, Pressable, View } from "react-native";
import { ScaledRoot, tokens, useTheme } from "../theme";
import { AppText } from "./AppText";

/** A small centred question with two buttons (original: "작성을 완료하시겠습니까?" 취소 / 확인). */
export function ConfirmDialog({ visible, message, cancel = "취소", ok = "확인", danger, onCancel, onOk }: {
  visible: boolean; message: string; cancel?: string; ok?: string; danger?: boolean; onCancel: () => void; onOk: () => void;
}) {
  const { c } = useTheme();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <ScaledRoot>
        <View style={{ flex: 1, backgroundColor: tokens.scrim, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: "100%", maxWidth: 320, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceRaised, padding: 20, gap: 20 }} accessibilityRole="alert">
            <AppText variant="bodyLg" center>{message}</AppText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[{ label: cancel, on: onCancel, strong: false }, { label: ok, on: onOk, strong: true }].map((b) => (
                <Pressable key={b.label} onPress={b.on} accessibilityRole="button"
                  style={{ flex: 1, height: 44, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceButton }}>
                  <AppText variant="body" weight={600} color={b.strong && danger ? "danger" : "text"}>{b.label}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScaledRoot>
    </Modal>
  );
}
