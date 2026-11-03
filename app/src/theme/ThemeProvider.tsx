import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { tokens, type Palette } from "./tokens";

export type Scheme = "light" | "dark";
type ThemeValue = {
  scheme: Scheme;
  c: Palette;
  setOverride: (s: Scheme | null) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children, initial = null }: { children: ReactNode; initial?: Scheme | null }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<Scheme | null>(initial);
  const scheme: Scheme = override ?? (system === "light" ? "light" : "dark");
  const value = useMemo(() => ({ scheme, c: tokens.colors[scheme] as Palette, setOverride }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
