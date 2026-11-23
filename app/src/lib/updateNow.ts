import * as Updates from "expo-updates";
import { useSyncExternalStore } from "react";
import { saveResume } from "./resume";

/**
 * 지금 업데이트 (user, 2026-11-23: updates needed closing the app once or twice, and some waiting). Looks for a new
 * version now, downloads it, and switches to it at once, with the 립마크 curtain (UpdateCurtain) over the screen the
 * whole time instead of a blank one. The tab in view comes back after the switch.
 */
export type UpdateStage = "idle" | "checking" | "downloading" | "applying";
let stage: UpdateStage = "idle";
const listeners = new Set<() => void>();
const set = (s: UpdateStage) => { stage = s; listeners.forEach((l) => l()); };
export const useUpdateStage = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => stage, () => stage);

/** "latest": nothing newer; "unavailable": updates are off here (the browser, a development build); "failed": no network or the like. */
export async function updateNow(): Promise<"applied" | "latest" | "unavailable" | "failed"> {
  if (!Updates.isEnabled) return "unavailable";
  if (stage !== "idle") return "failed";
  try {
    set("checking");
    const check = await Updates.checkForUpdateAsync();
    // a version downloaded earlier (waiting for the app to be left) is still "available": fetching it again is instant
    if (!check.isAvailable) { set("idle"); return "latest"; }
    set("downloading");
    await Updates.fetchUpdateAsync();
    set("applying");
    await saveResume();
    await new Promise((r) => setTimeout(r, 400)); // let the curtain show its last words
    await Updates.reloadAsync();
    return "applied";
  } catch {
    set("idle");
    return "failed";
  }
}
