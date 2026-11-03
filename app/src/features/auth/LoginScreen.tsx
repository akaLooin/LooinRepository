import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, Clover } from "../../components";
import { supabase } from "../../lib/supabase";
import { fontFamily, tokens, useTheme } from "../../theme";

const MIN_PASSWORD = 6; // Supabase Auth default minimum

/** Turns a Supabase Auth error into a message that says what to do. Unknown errors keep their original text. */
function explain(err: { message: string; status?: number }, mode: "signIn" | "signUp"): string {
  const m = err.message;
  if (/json parse|unexpected end of input|unexpected token/i.test(m))
    return "서버 주소가 맞지 않는 것 같아요. .env.local의 EXPO_PUBLIC_SUPABASE_URL이 https://<프로젝트>.supabase.co 형태인지 확인해 주세요";
  if (/network request failed|failed to fetch|fetch failed/i.test(m)) return "서버에 연결하지 못했어요. 인터넷 연결과 .env.local의 주소를 확인해 주세요";
  if (/not authorized|sending confirmation|error sending/i.test(m))
    return "확인 메일을 보내지 못했어요. Supabase 기본 메일은 프로젝트 팀원 이메일로만 보내요. 대시보드에서 Confirm email을 끄고 다시 가입해 주세요";
  if (/not confirmed/i.test(m)) return "가입 확인 메일의 링크를 먼저 눌러 주세요";
  if (/already registered|already exists/i.test(m)) return "이미 가입된 이메일이에요. 로그인해 주세요";
  if (/invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 맞지 않아요";
  if (/signups not allowed|signup.*disabled/i.test(m)) return "Supabase에서 이메일 가입이 꺼져 있어요";
  if (/invalid api key|apikey/i.test(m)) return "publishable 키가 맞지 않아요. .env.local을 확인해 주세요";
  if (/is invalid/i.test(m) && /email/i.test(m)) return "이 이메일 주소는 쓸 수 없어요";
  if (/password/i.test(m)) return "더 길거나 복잡한 비밀번호를 써 주세요";
  if (err.status === 429 || /rate limit/i.test(m)) return "잠시 후 다시 시도해 주세요";
  return `${mode === "signIn" ? "로그인" : "가입"}하지 못했어요 (${m})`;
}

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
    try {
      await run(e);
    } catch (err) {
      setBusy(false);
      setError(explain(err as Error, mode));
    }
  };

  const run = async (e: string) => {
    if (!supabase) return;
    if (mode === "signIn") {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      setBusy(false);
      if (!error) return; // AuthGate takes over
      return setError(explain(error, "signIn"));
    }
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    setBusy(false);
    if (error) return setError(explain(error, "signUp"));
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
