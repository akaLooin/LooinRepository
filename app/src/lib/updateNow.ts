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

/**
 * Is a new version still being made? Updates are published by the repository's GitHub workflow after each push
 * (.github/workflows/eas-update.yml, a few minutes); its latest run queued or running means "wait a little"
 * (user, 2026-11-23). The repository is public, so this needs no sign-in. Unknown (no network) counts as no.
 */
const RUNS = "https://api.github.com/repos/akaLooin/LooinRepository/actions/workflows/eas-update.yml/runs?per_page=1&branch=claude/replica-skill-install-ll9jb4";
async function beingMade(): Promise<boolean> {
  try {
    const res = await fetch(RUNS, { headers: { accept: "application/vnd.github+json" } });
    const run = (await res.json())?.workflow_runs?.[0];
    return !!run && run.status !== "completed";
  } catch { return false; }
}

/**
 * "latest": nothing newer; "preparing": nothing yet, but a new version is being made right now; "unavailable": updates
 * are off here (the browser, a development build); "failed": no network or the like.
 */
export async function updateNow(): Promise<"applied" | "latest" | "preparing" | "unavailable" | "failed"> {
  if (!Updates.isEnabled) return "unavailable";
  if (stage !== "idle") return "failed";
  try {
    set("checking");
    const check = await Updates.checkForUpdateAsync();
    // a version downloaded earlier (waiting for the app to be left) is still "available": fetching it again is instant
    if (!check.isAvailable) { const making = await beingMade(); set("idle"); return making ? "preparing" : "latest"; }
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
