import { useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, Clover } from "../../components";
import { supabase } from "../../lib/supabase";
import { fontFamily, tokens, useTheme } from "../../theme";

/** S01: sign in with a one-time code sent by email. No passwords to remember or leak. */
export function LoginScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const field = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
      {...props}
      placeholderTextColor={c.textPlaceholder}
      style={{ height: 56, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceInput, color: c.text, paddingHorizontal: 20,
        fontFamily: fontFamily(500), fontSize: tokens.type.bodyLg.size, outlineStyle: "none" as never }}
    />
  );

  const send = async () => {
    if (!supabase) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("이메일 주소를 확인해 주세요");
    setBusy(true); setError(undefined);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setError(error.status === 429 ? "잠시 후 다시 시도해 주세요" : "코드를 보내지 못했어요. 잠시 후 다시 시도해 주세요");
    setStep("code");
  };
  const verify = async () => {
    if (!supabase) return;
    setBusy(true); setError(undefined);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("코드가 맞지 않거나 시간이 지났어요");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 80, paddingHorizontal: tokens.layout.gutter, gap: 14 }}>
        <Clover size={48} state={{ kind: "done", color: tokens.colors.dark.accent }} />
        <AppText variant="monthTitle" style={{ marginTop: 12 }}>오늘 할 일을 시작해요</AppText>
        <AppText variant="body" color="textMuted" style={{ marginBottom: 20 }}>
          {step === "email" ? "이메일로 받은 코드로 로그인해요. 처음이면 계정이 바로 만들어져요." : `${email.trim()}로 보낸 코드를 입력해 주세요.`}
        </AppText>
        {step === "email"
          ? field({ value: email, onChangeText: setEmail, placeholder: "이메일", keyboardType: "email-address", autoCapitalize: "none", autoComplete: "email", accessibilityLabel: "이메일", onSubmitEditing: send })
          : field({ value: code, onChangeText: (s) => setCode(s.replace(/\D/g, "").slice(0, 10)), placeholder: "인증 코드", keyboardType: "number-pad", autoComplete: "one-time-code", accessibilityLabel: "인증 코드", onSubmitEditing: verify })}
        {error ? <AppText variant="helper" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <View style={{ marginTop: 8 }}>
          <Button kind="sheetPrimary" label={step === "email" ? "코드 받기" : "로그인"} loading={busy} onPress={step === "email" ? send : verify} disabled={step === "code" && code.length < 6} />
        </View>
        {step === "code" ? <Button kind="plain" label="이메일 다시 입력" onPress={() => { setStep("email"); setCode(""); setError(undefined); }} /> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
