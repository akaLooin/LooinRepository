import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, Clover } from "../../components";
import { supabase } from "../../lib/supabase";
import { fontFamily, tokens, useTheme } from "../../theme";

const MIN_PASSWORD = 6; // Supabase Auth default minimum

/**
 * S01: email + password. Chosen over email codes because Supabase's built-in mailer no longer lets the
 * template show a code without your own SMTP server (see replica/backend.md).
 */
export function LoginScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();

  const input = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
      {...props}
      placeholderTextColor={c.textPlaceholder}
      style={{ height: 56, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceInput, color: c.text, paddingHorizontal: 20,
        fontFamily: fontFamily(500), fontSize: tokens.type.bodyLg.size, outlineStyle: "none" as never }}
    />
  );

  const submit = async () => {
    if (!supabase) return;
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setError("이메일 주소를 확인해 주세요");
    if (password.length < MIN_PASSWORD) return setError(`비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요`);
    setBusy(true); setError(undefined); setInfo(undefined);
    if (mode === "signIn") {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      setBusy(false);
      if (!error) return; // AuthGate takes over
      if (/not confirmed/i.test(error.message)) return setError("가입 확인 메일의 링크를 먼저 눌러 주세요");
      if (error.status === 429) return setError("잠시 후 다시 시도해 주세요");
      if (error.status === 400) return setError("이메일 또는 비밀번호가 맞지 않아요");
      return setError("로그인하지 못했어요. 인터넷 연결을 확인해 주세요");
    }
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    setBusy(false);
    if (error) {
      if (/already registered/i.test(error.message)) return setError("이미 가입된 이메일이에요. 로그인해 주세요");
      if (error.status === 429) return setError("잠시 후 다시 시도해 주세요");
      if (/password/i.test(error.message)) return setError("더 길거나 복잡한 비밀번호를 써 주세요");
      return setError("가입하지 못했어요. 인터넷 연결을 확인해 주세요");
    }
    if (!data.session) {
      // Email confirmation is on: the user clicks the link once, then signs in here.
      setMode("signIn");
      setInfo(`${e}로 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 여기서 로그인해 주세요.`);
    }
  };

  const signUp = mode === "signUp";
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 80, paddingHorizontal: tokens.layout.gutter, gap: 14 }}>
        <Clover size={48} state={{ kind: "done", color: tokens.colors.dark.accent }} />
        <AppText variant="monthTitle" style={{ marginTop: 12 }} accessibilityRole="header">{signUp ? "계정 만들기" : "오늘 할 일을 시작해요"}</AppText>
        <AppText variant="body" color="textMuted" style={{ marginBottom: 20 }}>
          {signUp ? "이메일과 비밀번호를 정해 주세요." : "이메일과 비밀번호로 로그인해요."}
        </AppText>
        {input({ value: email, onChangeText: setEmail, placeholder: "이메일", keyboardType: "email-address", autoCapitalize: "none", autoComplete: "email", accessibilityLabel: "이메일" })}
        {input({ value: password, onChangeText: setPassword, placeholder: signUp ? `비밀번호 (${MIN_PASSWORD}자 이상)` : "비밀번호", secureTextEntry: true,
          autoCapitalize: "none", autoComplete: signUp ? "new-password" : "current-password", accessibilityLabel: "비밀번호", onSubmitEditing: submit })}
        {error ? <AppText variant="helper" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        {info ? <AppText variant="helper" color="textSecondary" accessibilityLiveRegion="polite">{info}</AppText> : null}
        <View style={{ marginTop: 8 }}>
          <Button kind="sheetPrimary" label={signUp ? "가입하기" : "로그인"} loading={busy} onPress={submit} />
        </View>
        <Pressable onPress={() => { setMode(signUp ? "signIn" : "signUp"); setError(undefined); setInfo(undefined); }} accessibilityRole="button" style={{ alignSelf: "center", padding: 12 }}>
          <AppText variant="body" color="textMuted">{signUp ? "이미 계정이 있어요 · 로그인" : "처음이에요 · 계정 만들기"}</AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
