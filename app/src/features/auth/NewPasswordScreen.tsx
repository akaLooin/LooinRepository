import { useState } from "react";
import { TextInput, View } from "react-native";
import { AppText, Button, Clover, ScreenHeader } from "../../components";
import { supabase } from "../../lib/supabase";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";

const MIN_PASSWORD = 6;

/**
 * Set a new password. Opened by the reset mail's link (signed in for that purpose only), or from 설정 →
 * 비밀번호 바꾸기 while signed in.
 */
export function NewPasswordScreen({ mode, onDone, onBack }: { mode: "reset" | "change"; onDone: () => void; onBack?: () => void }) {
  const { c } = useTheme();
  const insets = useInsets();
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (!supabase) return;
    if (pw.length < MIN_PASSWORD) return setError(`비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요`);
    if (pw !== again) return setError("두 비밀번호가 달라요");
    setBusy(true); setError(undefined);
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (!e) return onDone();
    if (/different from the old|same/i.test(e.message)) return setError("지금 비밀번호와 다른 비밀번호를 써 주세요");
    if (/session|jwt|expired/i.test(e.message)) return setError("시간이 지나 다시 로그인해야 해요. 재설정 메일을 다시 받아 주세요");
    if (/weak|password/i.test(e.message)) return setError("더 길거나 복잡한 비밀번호를 써 주세요");
    setError(`바꾸지 못했어요 (${e.message})`);
  };

  const field = (value: string, onChangeText: (v: string) => void, label: string, last?: boolean) => (
    <TextInput value={value} onChangeText={onChangeText} placeholder={label} accessibilityLabel={label} secureTextEntry autoCapitalize="none"
      autoComplete="new-password" placeholderTextColor={c.textPlaceholder} onSubmitEditing={last ? save : undefined}
      style={{ height: 56, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceInput, color: c.text, paddingHorizontal: 20,
        fontFamily: fontFamily(500), fontSize: tokens.type.bodyLg.size, outlineStyle: "none" as never }} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {mode === "change" ? <ScreenHeader title="비밀번호 바꾸기" onBack={onBack} /> : null}
      <View style={{ paddingTop: mode === "reset" ? 80 : 24, paddingHorizontal: tokens.layout.gutter, gap: 14 }}>
        {mode === "reset" ? (
          <>
            <Clover size={48} state={{ kind: "done", color: tokens.colors.dark.accent }} />
            <AppText variant="monthTitle" style={{ marginTop: 12 }} accessibilityRole="header">새 비밀번호</AppText>
          </>
        ) : null}
        <AppText variant="body" color="textMuted" style={{ marginBottom: 12 }}>{`앞으로 로그인할 때 쓸 비밀번호예요 (${MIN_PASSWORD}자 이상).`}</AppText>
        {field(pw, setPw, "새 비밀번호")}
        {field(again, setAgain, "새 비밀번호 한 번 더", true)}
        {error ? <AppText variant="helper" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <View style={{ marginTop: 8 }}>
          <Button kind="sheetPrimary" label="비밀번호 바꾸기" loading={busy} onPress={save} />
        </View>
      </View>
    </View>
  );
}
