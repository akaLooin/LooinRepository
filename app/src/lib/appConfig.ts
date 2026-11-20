import { useSyncExternalStore } from "react";
import { DESIGN_TRIAL } from "./variant";
import { supabase } from "./supabase";
import { configDefaults, parseConfig, type AppConfig } from "./configRules";
export type { AppConfig };

/**
 * Switches the admin panel sets for everyone (table `app_config`, key → JSON value; see admin/). Read once at start
 * and when the app comes back; until then, and when the table is not there yet, the defaults below apply.
 * crews: the design app hides crews until they are turned on (user, 2026-11-21); the usual app keeps them.
 */
const DEFAULTS = configDefaults(DESIGN_TRIAL);

let current: AppConfig = DEFAULTS;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

export function refreshAppConfig(): Promise<void> {
  if (!supabase) return Promise.resolve();
  loading ??= (async () => {
    try {
      const { data, error } = await supabase!.from("app_config").select("key, value");
      if (!error && data) { current = parseConfig(data as { key: string; value: unknown }[], DESIGN_TRIAL); listeners.forEach((l) => l()); }
    } catch { /* offline: keep what we have */ } finally { loading = null; }
  })();
  return loading;
}

export function useAppConfig(): AppConfig {
  return useSyncExternalStore((l) => { listeners.add(l); if (listeners.size === 1) refreshAppConfig(); return () => listeners.delete(l); }, () => current, () => current);
}
