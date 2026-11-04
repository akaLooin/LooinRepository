// Pure helpers for stored photo paths (no device imports, so tests can load them).
/** Photos already uploaded are stored as "<bucket>/<user id>/<file>"; anything else is still only on this device. */
export const BUCKETS = ["avatars", "todo-photos", "diary-images"] as const;
export type Bucket = (typeof BUCKETS)[number];
export const isUploaded = (uri?: string) => !!uri && BUCKETS.some((b) => uri.startsWith(b + "/"));
export function splitStored(uri: string): { bucket: Bucket; path: string } {
  const i = uri.indexOf("/");
  return { bucket: uri.slice(0, i) as Bucket, path: uri.slice(i + 1) };
}
