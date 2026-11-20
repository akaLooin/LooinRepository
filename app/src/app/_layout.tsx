import * as Font from "expo-font";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform, Pressable } from "react-native";
import { pushTarget } from "../lib/push";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadPrefs, usePrefs } from "../data/prefs";
import { KeyboardRoot } from "../components/KeyboardSpacer";
import { PhotoViewerHost } from "../components/PhotoViewer";
import { AuthGate } from "../features/auth/AuthGate";
import { AdminApp } from "../features/admin/AdminApp";
import { ADMIN_APP, DESIGN_TRIAL } from "../lib/variant";
import { refreshAppConfig, useAppConfig } from "../lib/appConfig";
import { AppText } from "../components/AppText";
import { extraFontFiles, fontFiles, ScaledRoot, ThemeProvider, useTheme } from "../theme";

function Shell() {
  const { c, scheme, setOverride, setFont } = useTheme();
  const { theme, font } = usePrefs();
  // a picked font is loaded first (in Expo Go and on the web; the installed app has them built in), then used
  useEffect(() => {
    let alive = true;
    const files = font === "pretendard" || font === "system" ? null : extraFontFiles[font];
    (files ? Font.loadAsync(files).catch(() => {}) : Promise.resolve()).then(() => { if (alive) setFont(font); });
    return () => { alive = false; };
  }, [font, setFont]);
  useEffect(() => { loadPrefs(); }, []);
  // tapping a push opens its chat or the 알림 tab (also when the tap started the app)
  useEffect(() => {
    if (Platform.OS === "web") return;
    const go = (data: unknown) => { const to = pushTarget(data); if (to) setTimeout(() => router.push(to as never), 300); };
    Notifications.getLastNotificationResponseAsync().then((r) => r && go(r.notification.request.content.data)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification.request.content.data));
    return () => sub.remove();
  }, []);
  useEffect(() => { setOverride(theme === "system" ? null : theme); }, [theme, setOverride]);
  // 점검 모드 from the admin app (design app only)
  const { maintenance } = useAppConfig();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScaledRoot>
        <AuthGate>
          {/* the admin app (APP_VARIANT=admin) is only the admin screens */}
          {ADMIN_APP ? <AdminApp /> : maintenance.on && DESIGN_TRIAL ? <Maintenance message={maintenance.message} /> : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            {/* 할 일 정보 보기 is a sheet over the current screen, as in the original */}
            <Stack.Screen name="todo/[id]" options={{ presentation: "transparentModal", animation: "none", contentStyle: { backgroundColor: "transparent" } }} />
          </Stack>
          )}
        </AuthGate>
      </ScaledRoot>
      <PhotoViewerHost />
    </View>
  );
}

/** 점검 중 화면: the admin app's message, and a button to check again. */
function Maintenance({ message }: { message: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
      <AppText variant="bodyLg" weight={800} style={{ fontSize: 22, lineHeight: 30 }} center accessibilityRole="header">잠시 점검 중이에요</AppText>
      <AppText variant="body" color="textSecondary" center>{message || "더 나은 앱을 위해 손보고 있어요. 조금 뒤에 다시 열어 주세요."}</AppText>
      <Pressable onPress={() => refreshAppConfig()} accessibilityRole="button" style={{ marginTop: 8, height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: c.surfaceStrong, justifyContent: "center" }}>
        <AppText variant="body" weight={700}>다시 확인</AppText>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts(fontFiles);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <KeyboardRoot>
        <ThemeProvider initial="dark">
          <Shell />
        </ThemeProvider>
      </KeyboardRoot>
    </SafeAreaProvider>
  );
}
