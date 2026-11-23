import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { saveResume } from "./resume";

/**
 * Updates without waiting at startup (user, 2026-11-22: slow first open). The app opens at once with what it has
 * (app.json updates.fallbackToCacheTimeout 0) while expo-updates downloads a new version in the background. This
 * hook then (1) looks for a new version again when the app comes back after a while, and (2) switches to a
 * downloaded version the moment the app goes to the background, so the next look already shows it and nothing
 * reloads under the user's finger.
 */
export function useQuietUpdates() {
  const { isUpdatePending } = Updates.useUpdates();
  const pending = useRef(isUpdatePending);
  pending.current = isUpdatePending;
  useEffect(() => {
    let leftAt = 0;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") {
        leftAt = Date.now();
        // the tab in view is kept first, so the restart (or Android closing the app) reopens it, not 홈
        saveResume().then(() => { if (pending.current) Updates.reloadAsync().catch(() => {}); });
      } else if (s === "active" && leftAt && Date.now() - leftAt > 10 * 60_000) {
        // back after 10+ minutes: fetch a newer version quietly (used the next time the app is left)
        Updates.checkForUpdateAsync().then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null)).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);
}
