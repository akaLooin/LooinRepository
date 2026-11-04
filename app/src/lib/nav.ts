import { router } from "expo-router";

/** Back, or to `fallback` when the screen was opened directly (refresh, link) and there is nothing to go back to. */
export function goBack(fallback = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}
