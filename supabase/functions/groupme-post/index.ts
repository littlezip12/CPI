// WPI 7.57.2 — authenticated member/guest scorer → GroupMe delivery with scoped setup administration.
// Bot IDs and GroupMe access tokens remain in Supabase Edge Function secrets.
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

function groupMeId(value: unknown): string | null {
  const cleaned = String(value || "").trim();
  return /^[0-9]+$/.test(cleaned) ? cleaned : null;
}

function unwrapGroupMe(body: unknown): unknown {
  if (body && typeof body === "object" && "response" in body) {
    return (body as Record<string, unknown>).response;
  }
  return body;
}

async function groupMeFetchJson(path: string, accessToken: string) {
  const response = await fetch(`https://api.groupme.com/v3${path}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-Access-Token": accessToken,
      "User-Agent": "WPI-Live/7.56.8",
    },
    signal: AbortSignal.timeout(15000),
  });
  const responseText = await response.text();
  let body: unknown = null;
  try {
    body = responseText ? JSON.parse(responseText) : null;
  } catch (_) {
    body = responseText;
  }
  if (!response.ok) {
    throw new Error(`GroupMe returned HTTP ${response.status}`);
  }
  return unwrapGroupMe(body);
}

async function postGroupMeBot(botId: string, text: string) {
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

async function postGroupMeTopic(accessToken: string, topicId: string, text: string) {
  try {
    const response = await fetch(`https://api.groupme.com/v3/groups/${encodeURIComponent(topicId)}/messages`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Access-Token": accessToken,
        "User-Agent": "WPI-Live/7.56.8",
      },
      body: JSON.stringify({
        message: {
          source_guid: crypto.randomUUID(),
          text,
        },
      }),
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
      error: error instanceof Error ? error.message : "GroupMe topic request failed",
    };
  }
}

async function postGroupMeDestination(
  credential: string,
  destination: {
    delivery_mode?: string | null;
    groupme_topic_id?: string | null;
  },
  text: string,
) {
  const mode = destination?.delivery_mode === "topic" ? "topic" : "bot";
  if (mode === "topic") {
    const topicId = groupMeId(destination.groupme_topic_id);
    if (!topicId) {
      return { ok: false, status: null, excerpt: "", error: "The GroupMe topic destination is incomplete" };
    }
    return postGroupMeTopic(credential, topicId, text);
  }
  return postGroupMeBot(credential, text);
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

    if (action === "discover_groups" || action === "discover_topics") {
      const teamId = String(payload.team_id || "");
      if (!teamId) return json({ error: "team_id is required" }, 400);

      const { data: membership } = await adminClient
        .from("live_team_members")
        .select("role,can_manage_groupme")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle();

      const canManageSetup = Boolean(
        membership && (membership.role === "owner" || (membership.role === "admin" && membership.can_manage_groupme === true))
      );
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return json({ error: "Owner or Admin role required" }, 403);
      }
      if (action === "discover_topics" && !canManageSetup) {
        return json({ error: "Tournament GroupMe management permission required" }, 403);
      }

      const { data: existingDestination } = await adminClient
        .from("live_destinations")
        .select("id,secret_name,delivery_mode,groupme_group_id")
        .eq("team_id", teamId)
        .eq("provider", "groupme")
        .maybeSingle();

      if (action === "discover_groups" && membership.role !== "owner") {
        return json({ error: "Only the Team Owner may browse the connected GroupMe account's groups" }, 403);
      }

      const requestedSecretName = environmentKey(payload.secret_name);
      if (requestedSecretName && membership.role !== "owner") {
        return json({ error: "Only the Team Owner may choose a server-side credential secret" }, 403);
      }

      const secretName = requestedSecretName || environmentKey(existingDestination?.secret_name);
      const accessToken = secretName ? Deno.env.get(secretName) : null;
      if (!secretName || !accessToken) {
        return json({
          error: membership.role === "owner"
            ? "Set the GroupMe access token as a Supabase secret, enter that secret name, and try again"
            : "The Team Owner has not configured the server-side GroupMe access token yet"
        }, 409);
      }

      if (action === "discover_groups") {
        const allGroups: Array<Record<string, unknown>> = [];
        for (let page = 1; page <= 10; page += 1) {
          const result = await groupMeFetchJson(`/groups?page=${page}&per_page=100&omit=memberships`, accessToken);
          const groups = Array.isArray(result) ? result as Array<Record<string, unknown>> : [];
          allGroups.push(...groups);
          if (groups.length < 100) break;
        }

        const groups = allGroups
          .map((group) => ({
            id: groupMeId(group.id || group.group_id),
            name: String(group.name || "").trim(),
            createdAt: Number(group.created_at || 0) || null,
          }))
          .filter((group) => group.id && group.name)
          .sort((a, b) => a.name.localeCompare(b.name) || Number(b.createdAt || 0) - Number(a.createdAt || 0));

        return json({ status: "ok", groups });
      }

      const requestedGroupId = groupMeId(payload.group_id);
      if (!requestedGroupId) return json({ error: "A valid GroupMe group is required" }, 400);
      if (
        membership.role === "admin"
        && String(existingDestination?.groupme_group_id || "") !== requestedGroupId
      ) {
        return json({ error: "Admins may browse topics only inside the Team Owner-approved GroupMe" }, 403);
      }

      const result = await groupMeFetchJson(
        `/groups/${encodeURIComponent(requestedGroupId)}/subgroups?page=1&per_page=100`,
        accessToken,
      );
      let subgroupRows: Array<Record<string, unknown>> = [];
      if (Array.isArray(result)) {
        subgroupRows = result as Array<Record<string, unknown>>;
      } else if (result && typeof result === "object") {
        const objectResult = result as Record<string, unknown>;
        for (const key of ["subgroups", "topics", "children"]) {
          if (Array.isArray(objectResult[key])) {
            subgroupRows = objectResult[key] as Array<Record<string, unknown>>;
            break;
          }
        }
      }

      const topics = subgroupRows
        .map((topic) => ({
          id: groupMeId(topic.id || topic.subgroup_id || topic.group_id),
          name: String(topic.topic || topic.name || topic.subgroup_topic || topic.title || "").trim(),
        }))
        .filter((topic) => topic.id && topic.name)
        .sort((a, b) => a.name.localeCompare(b.name));

      return json({ status: "ok", group_id: requestedGroupId, topics });
    }

    if (action === "test") {
      const destinationId = String(payload.destination_id || "");
      if (!destinationId) return json({ error: "destination_id is required" }, 400);

      const { data: destination, error: destinationError } = await userClient
        .from("live_destinations")
        .select("id,team_id,display_name,delivery_mode,groupme_topic_id,groupme_topic_name,enabled")
        .eq("id", destinationId)
        .single();
      if (destinationError || !destination) return json({ error: "Destination not found or access denied" }, 404);

      const { data: membership } = await userClient
        .from("live_team_members")
        .select("role,can_manage_groupme")
        .eq("team_id", destination.team_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership || !["owner", "admin"].includes(membership.role)) return json({ error: "Owner or Admin role required" }, 403);
      if (membership.role === "admin" && membership.can_manage_groupme !== true) {
        return json({ error: "Tournament GroupMe management permission required" }, 403);
      }

      const { data: privateDestination } = await adminClient
        .from("live_destinations")
        .select("secret_name,delivery_mode,groupme_topic_id")
        .eq("id", destination.id)
        .single();

      const secretName = environmentKey(privateDestination?.secret_name);
      const credential = secretName ? Deno.env.get(secretName) : null;
      if (!secretName || !credential) {
        await adminClient.from("live_destinations").update({
          last_tested_at: new Date().toISOString(),
          last_test_status: "failed",
          last_test_error: "Configured Edge Function secret was not found",
          updated_at: new Date().toISOString(),
        }).eq("id", destination.id);
        return json({ error: "The server-side GroupMe connection is not configured" }, 409);
      }

      const text = String(payload.text || "WPI Live test: GroupMe delivery is connected and ready for game updates.").slice(0, 1200);
      const result = await postGroupMeDestination(credential, privateDestination, text);
      await adminClient.from("live_destinations").update({
        last_tested_at: new Date().toISOString(),
        last_test_status: result.ok ? "sent" : "failed",
        last_test_error: result.error,
        updated_at: new Date().toISOString(),
      }).eq("id", destination.id);

      if (!result.ok) return json({ error: result.error || "GroupMe test failed", provider_status: result.status }, 502);
      return json({
        status: "sent",
        destination_id: destination.id,
        destination_name: destination.display_name,
        delivery_mode: privateDestination?.delivery_mode || "bot",
        topic_name: destination.groupme_topic_name || null,
      });
    }

    const eventId = String(payload.event_id || "");
    if (!eventId) return json({ error: "event_id is required" }, 400);
    const force = Boolean(payload.force);
    const triggerSource = ["scorer", "manual_retry", "worker"].includes(String(payload.trigger_source))
      ? String(payload.trigger_source)
      : (force ? "manual_retry" : "scorer");

    const { data: event, error: eventError } = await adminClient
      .from("live_events")
      .select("id,message_text,status,game_id,game:live_games!inner(id,team_id,environment,status,messages_paused,message_frequency,destination_id,destination:live_destinations(id,display_name,enabled,delivery_mode,groupme_topic_id,groupme_topic_name))")
      .eq("id", eventId)
      .single();
    if (eventError || !event) return json({ error: "Event not found or access denied" }, 404);

    const game = Array.isArray(event.game) ? event.game[0] : event.game;
    const destination = Array.isArray(game.destination) ? game.destination[0] : game.destination;
    let scorerControl = null;
    let deliveryAuthorized = false;

    if (["final", "cancelled"].includes(game.status)) {
      const [{ data: membership }, { data: endedSession }] = await Promise.all([
        adminClient
          .from("live_team_members")
          .select("role")
          .eq("team_id", game.team_id)
          .eq("user_id", user.id)
          .maybeSingle(),
        adminClient
          .from("live_game_scorer_sessions")
          .select("id")
          .eq("game_id", game.id)
          .eq("user_id", user.id)
          .eq("status", "ended")
          .order("ended_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      deliveryAuthorized = ["owner", "admin"].includes(membership?.role) || Boolean(endedSession?.id);
    } else {
      const { data, error } = await userClient.rpc("live_scorer_control_status", {
        target_game_id: game.id,
      });
      scorerControl = data;
      deliveryAuthorized = !error && Boolean(scorerControl?.canScore);
    }

    if (!deliveryAuthorized) {
      return json({
        error: ["final", "cancelled"].includes(game.status)
          ? "Final-game delivery requires the last scorer or a Team Owner/Admin"
          : scorerControl?.activeDisplayName
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
      .select("secret_name,delivery_mode,groupme_topic_id")
      .eq("id", destination.id)
      .single();

    const secretName = environmentKey(privateDestination?.secret_name);
    const credential = secretName ? Deno.env.get(secretName) : null;
    if (!secretName || !credential) return json({ error: "The server-side GroupMe connection is not configured" }, 409);

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
    const result = await postGroupMeDestination(credential, privateDestination, event.message_text);
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
    return json({
      status: "sent",
      delivery: saved,
      delivery_mode: privateDestination?.delivery_mode || "bot",
      topic_name: destination.groupme_topic_name || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("groupme-post failed", { message });
    return json({ error: message }, 500);
  }
});
