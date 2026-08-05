// WPI 7.56.1 live-scoring pilot: authenticated GroupMe delivery foundation.
// Deploy only after setting GROUPME_BOT_ID as a Supabase Edge Function secret.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = secretKeys.default || Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const groupMeBotId = Deno.env.get("GROUPME_BOT_ID");
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) throw new Error("Supabase function environment is incomplete");
    if (!groupMeBotId) throw new Error("GROUPME_BOT_ID secret is not configured");

    const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return Response.json({ error: "Invalid user session" }, { status: 401, headers: corsHeaders });

    const payload = await req.json();
    const eventId = String(payload.event_id || "");
    if (!eventId) return Response.json({ error: "event_id is required" }, { status: 400, headers: corsHeaders });

    const { data: event, error: eventError } = await userClient
      .from("live_events")
      .select("id,message_text,status,game_id,game:live_games!inner(id,team_id,environment,status,messages_paused,message_frequency,destination:live_destinations(display_name,enabled))")
      .eq("id", eventId)
      .single();
    if (eventError || !event) return Response.json({ error: "Event not found or access denied" }, { status: 404, headers: corsHeaders });

    const game = Array.isArray(event.game) ? event.game[0] : event.game;
    const { data: membership } = await userClient
      .from("live_team_members")
      .select("role")
      .eq("team_id", game.team_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || !["owner","admin","scorer"].includes(membership.role)) {
      return Response.json({ error: "Scorer access required" }, { status: 403, headers: corsHeaders });
    }
    if (event.status !== "active") return Response.json({ error: "Voided events cannot be delivered" }, { status: 409, headers: corsHeaders });
    if (game.messages_paused || game.message_frequency === "none") return Response.json({ status: "suppressed" }, { headers: corsHeaders });
    if (!event.message_text) return Response.json({ error: "Event has no message_text" }, { status: 422, headers: corsHeaders });

    const { data: prior } = await adminClient.from("live_deliveries").select("id,status").eq("event_id",eventId).eq("provider","groupme").maybeSingle();
    if (prior?.status === "sent") return Response.json({ status: "already_sent", delivery_id: prior.id }, { headers: corsHeaders });

    const response = await fetch("https://api.groupme.com/v3/bots/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: groupMeBotId, text: event.message_text }),
    });
    const responseText = await response.text();
    const status = response.ok ? "sent" : "failed";

    const delivery = {
      event_id: eventId,
      provider: "groupme",
      destination_name: game.destination?.display_name || "GroupMe",
      status,
      attempt_count: (prior ? 1 : 0) + 1,
      provider_response_code: response.status,
      provider_response_excerpt: responseText.slice(0,500),
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error: saveError } = await adminClient.from("live_deliveries").upsert(delivery,{onConflict:"event_id,provider"}).select("id,status").single();
    if (saveError) throw saveError;
    if (!response.ok) return Response.json({ error: "GroupMe delivery failed", delivery: saved }, { status: 502, headers: corsHeaders });
    return Response.json({ status: "sent", delivery: saved }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500, headers: corsHeaders });
  }
});
