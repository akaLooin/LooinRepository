import { router } from "expo-router";

/**
 * Design app: switch tabs without changing the route. Replacing the route rebuilt the whole tab layout and every
 * screen in it on each tap (the slowness the user saw); the tab layout listens here instead.
 */
type Tab = "home" | "calendar" | "together" | "me";
const PATHS: Record<Tab, string> = { home: "/", calendar: "/calendar", together: "/together", me: "/me" };
let listener: ((t: Tab) => void) | null = null;

export function onTabSwitch(l: ((t: Tab) => void) | null) { listener = l; }

export function goTab(t: Tab) {
  if (listener) listener(t);
  else router.replace(PATHS[t] as never);
}
