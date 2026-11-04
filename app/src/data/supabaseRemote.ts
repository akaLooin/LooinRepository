import type { SupabaseClient } from "@supabase/supabase-js";
import type { Remote } from "./sync";

/** The Remote the sync engine talks to: Supabase tables (RLS limits everything to the signed-in user). */
export function supabaseRemote(sb: SupabaseClient): Remote {
  return {
    async pull(since) {
      const { data, error } = await sb.rpc("pull_changes", { since: since ?? "1970-01-01T00:00:00Z" });
      if (error) throw new Error(error.message);
      const { server_time, ...tables } = data as Record<string, unknown>;
      return { serverTime: String(server_time), tables: tables as never };
    },
    async upsert(table, rows) {
      const { error } = await sb.from(table).upsert(rows, { onConflict: "id" });
      return { error: error?.message };
    },
    async uploadImage(bucket, path, localUri) {
      try {
        const body = await (await fetch(localUri)).arrayBuffer();
        if (body.byteLength > 8 * 1024 * 1024) return false; // keep within the free plan; photos are resized before this
        const { error } = await sb.storage.from(bucket).upload(path, body, { contentType: "image/jpeg", upsert: true });
        return !error;
      } catch {
        return false;
      }
    },
    async softDelete(table, ids) {
      const { error } = await sb.from(table).update({ deleted_at: new Date().toISOString() }).in("id", ids);
      return { error: error?.message };
    },
  };
}
