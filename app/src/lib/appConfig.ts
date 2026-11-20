import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { DESIGN_TRIAL } from "./variant";
import { supabase } from "./supabase";
import { configDefaults, featureOn, numberOf, parseConfig, textOf, type AppConfig } from "./configRules";
import type { FeatureKey, NumberKey, TextKey } from "./remoteCatalog";
export type { AppConfig };

/**
 * What the admin app sets for everyone (table `app_config`, key → JSON value): crews, home notice, and for the design
 * app texts, colours, shown parts, numbers, card order and a maintenance notice. Read at start, live while open (see
 * watch below) and whenever the app comes back.
 * The last copy is kept on the phone, so the changes show at once on the next start and offline too.
 */
const CACHE = "appConfig.rows.v1";
const DEFAULTS = configDefaults(DESIGN_TRIAL);

let current: AppConfig = DEFAULTS;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;
let lastRows = "";
// only when something really changed, so the minute check never redraws the app for nothing
const publish = (rows: { key: string; value: unknown }[]) => {
  const key = JSON.stringify([...rows].sort((a, b) => (a.key < b.key ? -1 : 1)).map((r) => [r.key, r.value]));
  if (key === lastRows) return;
  lastRows = key;
  current = parseConfig(rows, DESIGN_TRIAL);
  listeners.forEach((l) => l());
};

// the copy kept on the phone, before the server answers
AsyncStorage.getItem(CACHE).then((s) => { if (s && current === DEFAULTS) publish(JSON.parse(s)); }).catch(() => {});

export function refreshAppConfig(): Promise<void> {
  if (!supabase) return Promise.resolve();
  loading ??= (async () => {
    try {
      const { data, error } = await supabase!.from("app_config").select("key, value");
      if (!error && data) {
        publish(data as { key: string; value: unknown }[]);
        AsyncStorage.setItem(CACHE, JSON.stringify(data)).catch(() => {});
      }
    } catch { /* offline: keep what we have */ } finally { loading = null; }
  })();
  return loading;
}

const subscribe = (l: () => void) => { listeners.add(l); if (listeners.size === 1) { refreshAppConfig(); watch(); } return () => { listeners.delete(l); }; };
export function useAppConfig(): AppConfig {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
/** The current settings outside React (e.g. the moment a hold starts). */
export const appConfigNow = () => current;

/** `t("home.today")` → the admin's wording or the default. */
export function useT() {
  const cfg = useAppConfig();
  return (key: TextKey, vars?: { date?: string }) => textOf(cfg, key, vars);
}
export const useFeature = (key: FeatureKey) => featureOn(useAppConfig(), key);
export const useNumber = (key: NumberKey) => numberOf(useAppConfig(), key);

// Live: the server tells the phone the moment the admin app saves (Supabase Realtime on app_config; needs the
// table in the realtime publication, SQL 20261122000000_admin_live). As a fallback the phone also looks again every
// minute while the app is open, and whenever it comes back to the front.
let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  AppState.addEventListener("change", (s) => { if (s === "active") refreshAppConfig(); });
  setInterval(() => { if (AppState.currentState === "active") refreshAppConfig(); }, 60_000);
  try {
    supabase?.channel("app_config_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_config" }, () => { refreshAppConfig(); })
      .subscribe();
  } catch { /* no realtime: the minute check still works */ }
}
