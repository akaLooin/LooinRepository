import { useFonts } from "expo-font";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadPrefs, usePrefs } from "../data/prefs";
import { AuthGate } from "../features/auth/AuthGate";
import { fontFiles, ScaledRoot, ThemeProvider, useTheme } from "../theme";

function Shell() {
  const { c, scheme, setOverride } = useTheme();
  const { theme } = usePrefs();
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
