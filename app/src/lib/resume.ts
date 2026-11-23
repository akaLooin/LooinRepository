import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Where the user was, kept when the app goes to the background (user, 2026-11-23: after leaving the app for a
 * moment it came back on 홈). Leaving the app may restart it: a downloaded update is put in then (lib/quietUpdates),
 * and Android can close a background app. A restart soon after opens the same tab again.
 */
const KEY = "libmark:resume";
const FRESH = 30 * 60_000; // older than this: start from 홈 as usual
let tab: string | null = null;

export const setResumeTab = (t: string | null) => { tab = t; };

/** Written before the app may be restarted. */
export async function saveResume() {
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ tab, at: Date.now() })); } catch { /* not kept: start from 홈 */ }
}

/** The tab to reopen after a restart, if it was left a short while ago. Read once. */
export async function takeResumeTab(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    await AsyncStorage.removeItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v.tab === "string" && Date.now() - Number(v.at) < FRESH ? v.tab : null;
  } catch { return null; }
}
