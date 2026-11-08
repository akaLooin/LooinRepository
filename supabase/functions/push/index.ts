// Edge Function: sends push notifications for new chat messages, crew chat messages and new 알림 (follows, reactions,
// crews). Called by Supabase Database Webhooks (INSERT on public.messages, public.crew_messages, public.notifications) with the header
// x-push-secret = the PUSH_WEBHOOK_SECRET set for this function. Setup: replica/backend.md 13.
// Deploy: supabase functions deploy push --no-verify-jwt   (the webhook sends the secret instead of a user token)
import { createClient } from "jsr:@supabase/supabase-js@2";
import { crewMessageText, deadTokens, expoBatches, messageText, noticeBody, noticeKind, wants } from "./payload.ts";

const EXPO = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret) return new Response("PUSH_WEBHOOK_SECRET is not set", { status: 500 });
  if (req.headers.get("x-push-secret") !== secret) return new Response("unauthorized", { status: 401 });

  const event = await req.json().catch(() => null);
  if (!event || event.type !== "INSERT" || !event.record) return Response.json({ skipped: "not an insert" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const r = event.record;

  let to: string | null = null, title = "", body = "", url = "/", channel = "social";
  let many: string[] | null = null; // crew chat: every other member
  if (event.table === "messages") {
    const { data: conv } = await admin.from("conversations").select("user_a, user_b").eq("id", r.conversation_id).single();
    if (!conv) return Response.json({ skipped: "no conversation" });
    to = conv.user_a === r.sender_id ? conv.user_b : conv.user_a;
    const { data: sender } = await admin.from("profiles").select("nickname").eq("id", r.sender_id).single();
    const { data: settings } = await admin.from("user_settings").select("notify_chat").eq("user_id", to).maybeSingle();
    if (!wants("chat", settings)) return Response.json({ skipped: "chat notifications off" });
    title = sender?.nickname ?? "새 메시지";
    body = messageText(r.kind, r.body);
    url = `/chat/${r.conversation_id}`;
    channel = "messages";
  } else if (event.table === "crew_messages") {
    const { data: crew } = await admin.from("crews").select("name").eq("id", r.crew_id).single();
    const { data: members } = await admin.from("crew_members").select("user_id").eq("crew_id", r.crew_id).eq("status", "member");
    const ids = (members ?? []).map((m) => m.user_id).filter((u) => u !== r.sender_id);
    const { data: off } = await admin.from("user_settings").select("user_id").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).eq("notify_chat", false);
    const quiet = new Set((off ?? []).map((x) => x.user_id));
    many = ids.filter((u) => !quiet.has(u));
    const { data: sender } = await admin.from("profiles").select("nickname").eq("id", r.sender_id).single();
    title = crew?.name ?? "크루";
    body = crewMessageText(sender?.nickname ?? "", r.kind, r.body);
    url = `/chat/crew-${r.crew_id}`;
    channel = "messages";
  } else if (event.table === "notifications") {
    to = r.user_id;
    const { data: actor } = await admin.from("profiles").select("nickname").eq("id", r.actor_id).single();
    const { data: settings } = await admin.from("user_settings").select("notify_likes, notify_following").eq("user_id", to).maybeSingle();
    if (!wants(noticeKind(r.type), settings)) return Response.json({ skipped: "turned off" });
    const todo = r.todo_id ? (await admin.from("todos").select("title").eq("id", r.todo_id).maybeSingle()).data : null;
    const crew = r.crew_id ? (await admin.from("crews").select("name").eq("id", r.crew_id).maybeSingle()).data : null;
    const text = noticeBody(r.type, actor?.nickname ?? "누군가", r.value, todo?.title, crew?.name);
    if (!text) return Response.json({ skipped: "unknown type" });
    title = "새 소식";
    body = text;
    url = "/alerts";
  } else {
    return Response.json({ skipped: "other table" });
  }

  const targets = many ?? (to ? [to] : []);
  if (!targets.length) return Response.json({ sent: 0 });
  const { data: rows } = await admin.from("push_tokens").select("token").in("user_id", targets);
  const batches = expoBatches((rows ?? []).map((x) => x.token), title, body, url, channel);
  let sent = 0;
  for (const batch of batches) {
    const res = await fetch(EXPO, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(batch) });
    const json = await res.json().catch(() => ({}));
    const dead = deadTokens(batch, Array.isArray(json?.data) ? json.data : []);
    if (dead.length) await admin.from("push_tokens").delete().in("token", dead);
    sent += batch.length - dead.length;
  }
  return Response.json({ sent });
});
