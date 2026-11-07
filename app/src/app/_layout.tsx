import * as Font from "expo-font";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadPrefs, usePrefs } from "../data/prefs";
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
      <ThemeProvider initial="dark">
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
