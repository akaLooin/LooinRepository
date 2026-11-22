import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { cleanUrl } from "./cleanUrl";

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "");
const url = cleanUrl(rawUrl);

/** Set when .env.local has values the app cannot use; shown on screen instead of crashing. */
export const supabaseConfigError: string | null =
  !rawUrl && !key ? null
  : !url ? `EXPO_PUBLIC_SUPABASE_URL 값이 웹 주소가 아니에요: "${rawUrl ?? ""}"`
  : !key ? "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY 값이 비어 있어요"
  : null;

/** null when no project is configured: the app then runs in demo mode on sample data. */
export const supabase: SupabaseClient | null =
  url && key && !supabaseConfigError
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === "web",
        },
      })
    : null;

/** Shown in the config error screen so the user can compare with the dashboard. */
export const supabaseUrlInUse = url;

/**
 * The account saved on this phone, read straight from storage (no network). Supabase's own getSession() first
 * refreshes an expired sign-in over the network, so after an hour away the app waited on it before showing
 * anything; the sign-in gate opens with this instead and lets Supabase catch up (user, 2026-11-22: slow start).
 * Same key Supabase uses by default (`sb-<project>-auth-token`).
 */
export async function peekSavedUserId(): Promise<string | null> {
  if (!url || !supabase) return null;
  try {
    const raw = await AsyncStorage.getItem(`sb-${new URL(url).hostname.split(".")[0]}-auth-token`);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const id = saved?.user?.id ?? saved?.currentSession?.user?.id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}
