import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { setFontFace, type FontFace } from "./fonts";
import { tokens, type Palette } from "./tokens";
import { useAppConfig } from "../lib/appConfig";
import { ADMIN_APP, DESIGN_TRIAL } from "../lib/variant";
import { usePrefs } from "../data/prefs";
import { pixelRadius, skinOf, SKINS, type Skin } from "./skins";
const NONE = {};

export type Scheme = "light" | "dark";
// the radii as drawn by the default look, so a square skin can be undone
const BASE_RADIUS = { ...tokens.radius };
type ThemeValue = {
  scheme: Scheme;
  c: Palette;
  setOverride: (s: Scheme | null) => void;
  /** 스킨 (설정 → 스킨): colours, light/dark, font, square corners, decoration */
  skin: Skin;
  /** the font in use (설정 → 화면 → 폰트); part of the theme so every text redraws when it changes */
  font: FontFace;
  setFont: (f: FontFace) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children, initial = null }: { children: ReactNode; initial?: Scheme | null }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<Scheme | null>(initial);
  // the main app's skin (the copy and admin apps keep the default look)
  const skinId = usePrefs().skin;
  const skin = DESIGN_TRIAL && !ADMIN_APP ? skinOf(skinId) : SKINS.default;
  const scheme: Scheme = skin.scheme ?? override ?? (system === "light" ? "light" : "dark");
  // square skins: the shared radii shrink; every component reads them while drawing, and the theme change redraws
  Object.assign(tokens.radius, skin.square ? Object.fromEntries(Object.entries(BASE_RADIUS).map(([k, v]) => [k, pixelRadius(v)])) : BASE_RADIUS);
  const [font, setFontState] = useState<FontFace>("pretendard");
  setFontFace(font); // before the children draw with it
  // colours the admin app changed (design app only; parseConfig keeps the usual app's empty)
  const remoteAll = useAppConfig().colors[scheme];
  const remote = ADMIN_APP ? NONE : remoteAll; // the admin app keeps its own colours, so a bad pick never hides the editor
  const value = useMemo(() => ({ scheme, skin, c: { ...(tokens.colors[scheme] as Palette), ...remote, ...skin.colors } as Palette, setOverride, font, setFont: setFontState }), [scheme, font, remote, skin]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
