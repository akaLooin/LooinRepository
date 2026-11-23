import * as Font from "expo-font";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { Appearance, Platform, Pressable } from "react-native";
import * as SystemUI from "expo-system-ui";
import { NavigationBar } from "expo-navigation-bar";
import { pushTarget } from "../lib/push";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadPrefs, usePrefs } from "../data/prefs";
import { KeyboardRoot } from "../components/KeyboardSpacer";
import { PhotoViewerHost } from "../components/PhotoViewer";
import { PortalHost } from "../components/Portal";
import { AuthGate } from "../features/auth/AuthGate";
import { AdminApp } from "../features/admin/AdminApp";
import { useQuietUpdates } from "../lib/quietUpdates";
import { ADMIN_APP, DESIGN_TRIAL } from "../lib/variant";
import { refreshAppConfig, useAppConfig } from "../lib/appConfig";
import { AppText } from "../components/AppText";
import { extraFontFiles, fontFiles, ScaledRoot, ThemeProvider, useTheme } from "../theme";

function Shell() {
  const { c, scheme, setOverride, setFont, skin } = useTheme();
  const { theme, font: pickedFont } = usePrefs();
  const font = skin.font ?? pickedFont; // a skin may bring its own font (8비트 모험: pixel letters)
  // a picked font is loaded first (in Expo Go and on the web; the installed app has them built in), then used
  useEffect(() => {
    let alive = true;
    const files = font === "pretendard" || font === "system" ? null : extraFontFiles[font as Exclude<typeof font, "pretendard" | "system">];
    (files ? Font.loadAsync(files).catch(() => {}) : Promise.resolve()).then(() => { if (alive) setFont(font); });
    return () => { alive = false; };
  }, [font, setFont]);
  useEffect(() => { loadPrefs(); }, []);
  useQuietUpdates(); // new versions download in the background and switch over when the app is left
  // tapping a push opens its chat or the 알림 tab (also when the tap started the app)
  useEffect(() => {
    if (Platform.OS === "web") return;
    const go = (data: unknown) => { const to = pushTarget(data); if (to) setTimeout(() => router.push(to as never), 300); };
    Notifications.getLastNotificationResponseAsync().then((r) => r && go(r.notification.request.content.data)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification.request.content.data));
    return () => sub.remove();
  }, []);
  useEffect(() => { setOverride(theme === "system" ? null : theme); }, [theme, setOverride]);
  // Android's own bars follow the app's theme, not the phone's (user, 2026-11-23: the navigation bar at the bottom
  // stayed white in dark mode). The app's choice is passed to the system, so the bar and its buttons turn dark or
  // light with it ("system" hands the choice back to the phone), and the window behind the bars takes the app's
  // background colour. Both modules are already in the installed apps (no new APK).
  useEffect(() => {
    if (Platform.OS !== "android") return;
    try { Appearance.setColorScheme(theme === "system" ? "unspecified" : theme); } catch { /* older system: keep */ }
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
    // the bar's own light/dark flag (custom bars such as Samsung Theme Park read it; user, 2026-11-23): dark app →
    // dark bar with light buttons. In expo-navigation-bar "light"/"dark" name the BUTTONS (its native code: "dark"
    // = dark content on a light bar), so a dark app asks for "light". The contrast veil is off (app.json).
    try { NavigationBar.setStyle(scheme === "dark" ? "light" : "dark"); } catch { /* an APK without the module */ }
  }, [theme, c.bg, scheme]);
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
        {/* the main app's sheets, drawn above every screen in the app's own window */}
        <PortalHost />
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
