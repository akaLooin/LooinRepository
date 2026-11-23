import { useEffect, useId, useSyncExternalStore } from "react";
import { View } from "react-native";

/**
 * Draws things (the main app's sheets) on top of the whole app from anywhere, inside the app's own window. A React
 * Native Modal opens a separate Android window: the keyboard closes when it opens and reopens after, which made
 * typing in a sheet slow to start and broke "keep typing" from one field to the next (user, 2026-11-23).
 */
const nodes = new Map<string, React.ReactNode>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };

/** Puts `node` on top of the app while the caller is mounted (null removes it). */
export function usePortal(node: React.ReactNode | null) {
  const id = useId();
  useEffect(() => {
    if (node === null) { if (nodes.delete(id)) emit(); return; }
    nodes.set(id, node);
    emit();
  });
  useEffect(() => () => { if (nodes.delete(id)) emit(); }, [id]);
}

/** Place once, above the app's screens (root layout). */
export function PortalHost() {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version, () => version);
  if (!nodes.size) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {[...nodes.entries()].map(([k, n]) => <View key={k} pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>{n}</View>)}
    </View>
  );
}
