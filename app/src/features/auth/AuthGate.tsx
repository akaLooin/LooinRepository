import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { endSession, startSession } from "../../data/store";
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
        if (uid) await startSession({ mode: "cloud", userId: uid, remote: supabaseRemote(sb) });
        else await endSession();
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
  if (supabase && !session) return <LoginScreen />;
  return <>{children}</>;
}
