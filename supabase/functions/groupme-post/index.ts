// WPI 7.56.6 — authenticated member/guest scorer → GroupMe delivery with persisted retry/audit state.
// Deploy only after setting the destination's bot ID as a Supabase Edge Function secret.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2.110.8/cors";

const corsHeaders = {
  ...supabaseCorsHeaders,
  "Access-Control-Allow-Headers": `${supabaseCorsHeaders["Access-Control-Allow-Headers"]}, x-wpi-live-release`,
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });
const retryDelaySeconds = (attempt: number) => [60, 300, 900, 3600][Math.min(Math.max(attempt - 1, 0), 3)];

function environmentKey(name: string | null | undefined): string | null {
  const cleaned = String(name || "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{2,127}$/.test(cleaned) ? cleaned : null;
}

async function postGroupMe(botId: string, text: string) {
  try {
    const response = await fetch("https://api.groupme.com/v3/bots/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, text }),
      signal: AbortSignal.timeout(15000),
    });
    const responseText = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      excerpt: responseText.slice(0, 500),
      error: response.ok ? null : `GroupMe returned HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      excerpt: "",
      error: error instanceof Error ? error.message : "GroupMe request failed",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = secretKeys.default || Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) throw new Error("Supabase function environment is incomplete");

    const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userJwt = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!userJwt || userJwt === authorization) {
      return json({ error: "A valid signed-in user token is required" }, 401);
    }
    const { data: { user }, error: userError } = await userClient.auth.getUser(userJwt);
    if (userError || !user) return json({ error: "Invalid user session" }, 401);

    const payload = await req.json();
    const action = String(payload.action || "event");

    if (action === "test") {
      const destinationId = String(payload.destination_id || "");
      if (!destinationId) return json({ error: "destination_id is required" }, 400);
      const { data: destination, error: destinationError } = await userClient
        .from("live_destinations")
        .select("id,team_id,display_name,enabled")
        .eq("id", destinationId)
        .single();
      if (destinationError || !destination) return json({ error: "Destination not found or access denied" }, 404);

      const { data: membership } = await userClient
        .from("live_team_members")
        .select("role")
        .eq("team_id", destination.team_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership || !["owner", "admin"].includes(membership.role)) return json({ error: "Owner or Admin role required" }, 403);

      const { data: privateDestination } = await adminClient
        .from("live_destinations")
        .select("secret_name")
        .eq("id", destination.id)
        .single();
      const secretName = environmentKey(privateDestination?.secret_name);
      const botId = secretName ? Deno.env.get(secretName) : null;
      if (!secretName || !botId) {
        await adminClient.from("live_destinations").update({
          last_tested_at: new Date().toISOString(),
          last_test_status: "failed",
          last_test_error: "Configured Edge Function secret was not found",
          updated_at: new Date().toISOString(),
        }).eq("id", destination.id);
        return json({ error: "The server-side GroupMe connection is not configured" }, 409);
      }

      const text = String(payload.text || "WPI Live test: GroupMe delivery is connected and ready for game updates.").slice(0, 1200);
      const result = await postGroupMe(botId, text);
      await adminClient.from("live_destinations").update({
        last_tested_at: new Date().toISOString(),
        last_test_status: result.ok ? "sent" : "failed",
        last_test_error: result.error,
        updated_at: new Date().toISOString(),
      }).eq("id", destination.id);
      if (!result.ok) return json({ error: result.error || "GroupMe test failed", provider_status: result.status }, 502);
      return json({ status: "sent", destination_id: destination.id, destination_name: destination.display_name });
    }

    const eventId = String(payload.event_id || "");
    if (!eventId) return json({ error: "event_id is required" }, 400);
    const force = Boolean(payload.force);
    const triggerSource = ["scorer", "manual_retry", "worker"].includes(String(payload.trigger_source))
      ? String(payload.trigger_source)
      : (force ? "manual_retry" : "scorer");

    const { data: event, error: eventError } = await userClient
      .from("live_events")
      .select("id,message_text,status,game_id,game:live_games!inner(id,team_id,environment,status,messages_paused,message_frequency,destination_id,destination:live_destinations(id,display_name,enabled))")
      .eq("id", eventId)
      .single();
    if (eventError || !event) return json({ error: "Event not found or access denied" }, 404);

    const game = Array.isArray(event.game) ? event.game[0] : event.game;
    const destination = Array.isArray(game.destination) ? game.destination[0] : game.destination;
    const { data: scorerControl, error: scorerControlError } = await userClient.rpc("live_scorer_control_status", {
      target_game_id: game.id,
    });
    if (scorerControlError || !scorerControl?.canScore) {
      return json({
        error: scorerControl?.activeDisplayName
          ? `Scoring control is assigned to ${scorerControl.activeDisplayName}`
          : "Active scorer access required",
      }, 403);
    }

    if (event.status !== "active") return json({ error: "Voided events cannot be delivered" }, 409);
    if (game.messages_paused || game.message_frequency === "none") {
      const { data: existingDelivery } = await adminClient
        .from("live_deliveries")
        .select("id,status")
        .eq("event_id", eventId)
        .eq("provider", "groupme")
        .maybeSingle();
      if (existingDelivery?.status === "sent") {
        return json({ status: "already_sent", delivery_id: existingDelivery.id });
      }
      await adminClient.from("live_deliveries").upsert({
        event_id: eventId,
        provider: "groupme",
        destination_id: destination?.id || null,
        destination_name: destination?.display_name || "GroupMe",
        status: "suppressed",
        message_text_snapshot: event.message_text,
        next_retry_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "event_id,provider" });
      return json({ status: "suppressed" });
    }
    if (!event.message_text) return json({ error: "Event has no GroupMe message text" }, 422);
    if (!destination || !destination.enabled) return json({ error: "No enabled GroupMe destination is connected to this game" }, 409);

    const { data: privateDestination } = await adminClient
      .from("live_destinations")
      .select("secret_name")
      .eq("id", destination.id)
      .single();
    const secretName = environmentKey(privateDestination?.secret_name);
    const botId = secretName ? Deno.env.get(secretName) : null;
    if (!secretName || !botId) return json({ error: "The server-side GroupMe connection is not configured" }, 409);

    const requestId = crypto.randomUUID();
    const { data: claim, error: claimError } = await adminClient.rpc("live_claim_groupme_delivery", {
      target_event_id: eventId,
      target_destination_id: destination.id,
      target_destination_name: destination.display_name,
      target_message_text: event.message_text,
      force_retry: force,
      claim_request_id: requestId,
    });
    if (claimError) throw claimError;
    if (!claim?.claimed) {
      const status = String(claim?.status || "queued");
      const responseStatus = status === "already_sent" ? 200 : 202;
      return json({
        status,
        delivery_id: claim?.deliveryId || null,
        next_retry_at: claim?.nextRetryAt || null,
      }, responseStatus);
    }

    const pending = { id: String(claim.deliveryId) };
    const attemptNumber = Number(claim.attemptNumber || 1);
    const result = await postGroupMe(botId, event.message_text);
    const nextRetryAt = result.ok ? null : new Date(Date.now() + retryDelaySeconds(attemptNumber) * 1000).toISOString();
    const finalStatus = result.ok ? "sent" : "failed";

    const { data: saved, error: saveError } = await adminClient.from("live_deliveries").update({
      status: finalStatus,
      provider_response_code: result.status,
      provider_response_excerpt: result.excerpt,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: nextRetryAt,
      sent_at: result.ok ? new Date().toISOString() : null,
      last_error: result.error,
      updated_at: new Date().toISOString(),
    }).eq("id", pending.id).eq("request_id", requestId).select("id,status,attempt_count,next_retry_at,sent_at,last_error").maybeSingle();
    if (saveError) throw saveError;
    if (!saved) throw new Error("Delivery claim expired before provider response was saved");

    await adminClient.from("live_delivery_attempts").insert({
      delivery_id: pending.id,
      attempt_number: attemptNumber,
      request_id: requestId,
      invoked_by: user.id,
      trigger_source: triggerSource,
      provider_response_code: result.status,
      provider_response_excerpt: result.excerpt,
      outcome: finalStatus,
      error_message: result.error,
      attempted_at: new Date().toISOString(),
    });

    if (!result.ok) return json({ error: result.error || "GroupMe delivery failed", delivery: saved }, 502);
    return json({ status: "sent", delivery: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("groupme-post failed", { message });
    return json({ error: message }, 500);
  }
});
