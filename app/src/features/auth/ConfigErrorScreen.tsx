import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../components";
import { tokens, useTheme } from "../../theme";

/** .env.local has something the app cannot use. Says what, instead of crashing. */
export function ConfigErrorScreen({ message }: { message: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 80, paddingHorizontal: tokens.layout.gutter, gap: 14 }}>
      <AppText variant="monthTitle">연결 설정을 확인해 주세요</AppText>
      <AppText variant="body" color="danger" selectable>{message}</AppText>
      <AppText variant="body" color="textSecondary">
        app 폴더의 .env.local 첫 줄은 이런 모양이어야 해요:{"\n"}EXPO_PUBLIC_SUPABASE_URL=https://프로젝트코드.supabase.co
      </AppText>
      <AppText variant="helper" color="textMuted">고친 뒤에는 컴퓨터에서 Ctrl+C로 멈추고 npx.cmd expo start로 다시 실행해 주세요.</AppText>
    </View>
  );
}
