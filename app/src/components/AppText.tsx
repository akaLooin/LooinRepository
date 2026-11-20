import { StyleSheet, Text, type TextProps } from "react-native";
import { useAppConfig } from "../lib/appConfig";
import { numberOf } from "../lib/configRules";
import { ADMIN_APP, DESIGN_TRIAL } from "../lib/variant";

const TITLES = new Set(["screenTitle", "monthTitle", "sheetTitle"]);
import { fontFamily, tokens, useTheme, type ColorName, type TypeName } from "../theme";

type Props = TextProps & { variant?: TypeName; color?: ColorName; raw?: string; weight?: number; center?: boolean };

/** Text with a token type style. `color` is a token name; `raw` is for user colours (category). */
export function AppText({ variant = "body", color = "text", raw, weight, center, style, ...rest }: Props) {
  const { c } = useTheme();
  const t = tokens.type[variant];
  const cfg = useAppConfig();
  const base = [
    {
      fontFamily: fontFamily(weight ?? t.weight),
      fontSize: t.size,
      lineHeight: t.line,
      color: raw ?? c[color],
      textAlign: center ? ("center" as const) : undefined,
    },
    style,
  ];
  // 글자 크기 from the admin app (design app only): titles and large text follow 제목, the rest 본문
  if (DESIGN_TRIAL && !ADMIN_APP) {
    const flat = StyleSheet.flatten(base) ?? {};
    const size = typeof flat.fontSize === "number" ? flat.fontSize : t.size;
    const k = numberOf(cfg, TITLES.has(variant) || size >= 20 ? "titleScale" : "textScale") / 100;
    if (k !== 1) return <Text {...rest} style={{ ...flat, fontSize: size * k, lineHeight: typeof flat.lineHeight === "number" ? flat.lineHeight * k : undefined }} />;
  }
  return <Text {...rest} style={base} />;
}
