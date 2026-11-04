import { goBack } from "../lib/nav";
import { useInsets } from "../theme";
import { View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { ScreenHeader } from "./ScreenHeader";

/** Placeholder for a screen that is routed but not built yet. Says which screen and when. */
export function StubScreen({ id, title, when, back = true }: { id: string; title: string; when: string; back?: boolean }) {
  const { c } = useTheme();
  const insets = useInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title={title} onBack={back ? () => goBack("/") : undefined} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: tokens.layout.gutter }}>
        <AppText variant="bodyLg" weight={600}>아직 만드는 중이에요</AppText>
        <AppText variant="helper" color="textMuted" center>{`${id} · ${when}`}</AppText>
      </View>
    </View>
  );
}
