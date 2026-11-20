// Edge Function: the admin panel's "알림 보내기" — one push to every phone that has the app with push turned on.
// Only a signed-in user listed in public.admins may call it. Deploy: supabase functions deploy admin-broadcast
// Uses SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides to functions.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { deadTokens, expoBatches } from "../push/payload.ts";

const EXPO = "https://exp.host/--/api/v2/push/send";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: me } = await asUser.auth.getUser();
  if (!me.user) return new Response("unauthorized", { status: 401, headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await admin.from("admins").select("user_id").eq("user_id", me.user.id).maybeSingle();
  if (!row) return new Response("not an admin", { status: 403, headers: cors });

  const input = await req.json().catch(() => null);
  const title = String(input?.title ?? "").trim().slice(0, 100);
  const body = String(input?.body ?? "").trim().slice(0, 500);
  if (!title || !body) return new Response("title and body are needed", { status: 400, headers: cors });
  const dryRun = input?.dryRun === true; // count the phones without sending

  const tokens: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from("push_tokens").select("token").range(from, from + 999);
    tokens.push(...(data ?? []).map((x) => x.token));
    if (!data || data.length < 1000) break;
  }
  const batches = expoBatches(tokens, title, body, "/alerts", "social");
  if (dryRun) return Response.json({ phones: batches.flat().length }, { headers: cors });
  let sent = 0;
  for (const batch of batches) {
    const res = await fetch(EXPO, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(batch) });
    const json = await res.json().catch(() => ({}));
    const dead = deadTokens(batch, Array.isArray(json?.data) ? json.data : []);
    if (dead.length) await admin.from("push_tokens").delete().in("token", dead);
    sent += batch.length - dead.length;
  }
  await admin.from("admin_broadcasts").insert({ title, body, sent, created_by: me.user.id });
  return Response.json({ sent }, { headers: cors });
});
