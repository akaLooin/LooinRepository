// Edge Function: deletes the calling user's account, rows and files.
// Deploy: supabase functions deploy delete-account
// Uses SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides to functions.
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKETS = ["avatars", "todo-photos", "diary-images"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const auth = req.headers.get("Authorization") ?? "";
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data.user) return new Response("unauthorized", { status: 401 });
  const userId = data.user.id;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  for (const bucket of BUCKETS) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
  }
  // Rows go with the profile (on delete cascade from auth.users → profiles → everything else).
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return new Response("could not delete", { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
