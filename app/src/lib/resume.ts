import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Where the user was, kept just before the app restarts itself to put in a downloaded update (lib/quietUpdates;
 * user, 2026-11-23: after leaving the app for a moment it came back on 홈). That restart reopens the same tab.
 * An app the user closed (swiped away from the recent apps) starts on 홈 (user, 2026-11-23): nothing is kept then.
 */
const KEY = "libmark:resume";
const FRESH = 5 * 60_000; // the restart reads it at once; an older note is left from something else
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
