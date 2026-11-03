import { Text, type TextProps } from "react-native";
import { fontFamily, tokens, useTheme, type ColorName, type TypeName } from "../theme";

type Props = TextProps & { variant?: TypeName; color?: ColorName; raw?: string; weight?: number; center?: boolean };

/** Text with a token type style. `color` is a token name; `raw` is for user colours (category). */
export function AppText({ variant = "body", color = "text", raw, weight, center, style, ...rest }: Props) {
  const { c } = useTheme();
  const t = tokens.type[variant];
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFamily(weight ?? t.weight),
          fontSize: t.size,
          lineHeight: t.line,
          color: raw ?? c[color],
          textAlign: center ? "center" : undefined,
        },
        style,
      ]}
    />
  );
}
