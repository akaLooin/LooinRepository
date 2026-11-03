/**
 * Accepts what people actually paste: quotes, spaces, a missing https://, or /rest/v1/ on the end.
 * Returns "https://<ref>.supabase.co" (or another https origin), or null when it still is not a web address.
 */
export function cleanUrl(raw?: string): string | null {
  if (!raw) return null;
  let s = raw.replace(/^﻿/, "").trim().replace(/^["']|["']$/g, "").trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  const m = s.match(/^(https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,})(:\d+)?/);
  return m ? m[0] : null;
}

