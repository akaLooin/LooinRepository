import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthGate } from "../features/auth/AuthGate";
import { fontFiles, ThemeProvider, useTheme } from "../theme";

function Shell() {
  const { c, scheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
      </AuthGate>
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
