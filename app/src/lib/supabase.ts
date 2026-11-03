import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

/** Keep only "https://<ref>.supabase.co": people often paste the URL with /rest/v1/ or a trailing slash. */
function cleanUrl(raw?: string) {
  if (!raw) return raw;
  const s = raw.trim().replace(/^["']|["']$/g, "");
  const m = s.match(/^https?:\/\/[^/]+/);
  return m ? m[0] : s;
}

const url = cleanUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "");

/** null when no project is configured: the app then runs in demo mode on sample data. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === "web",
        },
      })
    : null;
