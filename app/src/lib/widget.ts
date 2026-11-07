// The home-screen widget exists on Android only (widget.android.tsx); elsewhere these do nothing.
import type { DB } from "../data/types";

export async function setWidgetSource(_key: string | null): Promise<void> {}
export async function takeWidgetChecks(): Promise<string[]> { return []; }
export function refreshWidget(_db: DB | null): void {}
