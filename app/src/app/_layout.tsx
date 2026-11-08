import * as Font from "expo-font";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { pushTarget } from "../lib/push";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadPrefs, usePrefs } from "../data/prefs";
import { KeyboardRoot } from "../components/KeyboardSpacer";
import { AuthGate } from "../features/auth/AuthGate";
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
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScaledRoot>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            {/* 할 일 정보 보기 is a sheet over the current screen, as in the original */}
            <Stack.Screen name="todo/[id]" options={{ presentation: "transparentModal", animation: "none", contentStyle: { backgroundColor: "transparent" } }} />
          </Stack>
        </AuthGate>
      </ScaledRoot>
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
