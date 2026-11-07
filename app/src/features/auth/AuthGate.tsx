import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { parseAuthLink } from "../../lib/authLink";
import { NewPasswordScreen } from "./NewPasswordScreen";
import { endSession, startSession } from "../../data/store";
import { registerPush } from "../../lib/push";
import { supabase, supabaseConfigError } from "../../lib/supabase";
import { ConfigErrorScreen } from "./ConfigErrorScreen";
import { supabaseRemote } from "../../data/supabaseRemote";
import { LoginScreen } from "./LoginScreen";

/**
 * No Supabase keys: demo mode (sample data on this device).
 * Keys set: sign-in required, then this device's copy is loaded and kept in sync.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // the reset mail's link opened the app: sign in with its one-time tokens, then ask for a new password
  const [recovery, setRecovery] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string>();

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    const handle = async (url: string | null) => {
      const link = parseAuthLink(url);
      if (!link) return;
      if (link.kind === "error") return setLinkMessage(link.message);
      const { error } = await sb.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
      if (error) return setLinkMessage("메일의 링크가 만료됐거나 이미 쓰였어요. 비밀번호 재설정 메일을 다시 받아 주세요");
      setRecovery(true);
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => { handle(e.url); });
    const { data } = sb.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => { sub.remove(); data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase) {
      startSession({ mode: "demo" }).then(() => setReady(true));
      return;
    }
    const sb = supabase;
    let current: string | null = null;
    const apply = async (s: Session | null) => {
      const uid = s?.user.id ?? null;
      if (uid !== current) {
        current = uid;
        if (uid) {
          await startSession({ mode: "cloud", userId: uid, remote: supabaseRemote(sb) });
          registerPush(); // this phone gets the account's chat and friend pushes (in the installed app)
        } else await endSession();
      }
      setSession(s);
      setReady(true);
    };
    sb.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => { apply(s); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (supabaseConfigError) return <ConfigErrorScreen message={supabaseConfigError} />;
  if (!ready) return null;
  if (supabase && session && recovery) return <NewPasswordScreen mode="reset" onDone={() => setRecovery(false)} />;
  if (supabase && !session) return <LoginScreen linkMessage={linkMessage} />;
  return <>{children}</>;
}
