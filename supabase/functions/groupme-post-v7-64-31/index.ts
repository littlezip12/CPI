// WPI 7.64.31 — Live Delivery & Finalization Reliability.
// Adds server-side game catch-up delivery and scorer-handoff/finalization resilience.
// Builds on 7.64.11 authenticated delivery + Final Whistle stats image handling.
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
      "User-Agent": "WPHQ-Live/7.64.31",
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

async function postGroupMeBot(botId: string, text: string, imageUrl: string | null = null) {
  try {
    const response = await fetch("https://api.groupme.com/v3/bots/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, text, ...(imageUrl ? { attachments:[{ type:"image", url:imageUrl }] } : {}) }),
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

async function postGroupMeTopic(accessToken: string, topicId: string, text: string, imageUrl: string | null = null) {
  try {
    const response = await fetch(`https://api.groupme.com/v3/groups/${encodeURIComponent(topicId)}/messages`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Access-Token": accessToken,
        "User-Agent": "WPHQ-Live/7.64.31",
      },
      body: JSON.stringify({
        message: {
          source_guid: crypto.randomUUID(),
          text,
          ...(imageUrl ? { attachments:[{ type:"image", url:imageUrl }] } : {}),
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
  imageUrl: string | null = null,
) {
  const mode = destination?.delivery_mode === "topic" ? "topic" : "bot";
  if (mode === "topic") {
    const topicId = groupMeId(destination.groupme_topic_id);
    if (!topicId) {
      return { ok: false, status: null, excerpt: "", error: "The GroupMe topic destination is incomplete" };
    }
    return postGroupMeTopic(credential, topicId, text, imageUrl);
  }
  return postGroupMeBot(credential, text, imageUrl);
}


async function deliveryAuthorization(
  adminClient: any,
  userClient: any,
  userId: string,
  game: any,
  allowManagerWhileLive = false,
) {
  const { data: membership } = await adminClient
    .from("live_team_members")
    .select("role")
    .eq("team_id", game.team_id)
    .eq("user_id", userId)
    .maybeSingle();
  const isManager = ["owner", "admin"].includes(String(membership?.role || ""));

  if (["final", "cancelled"].includes(String(game.status || ""))) {
    const { data: latestSession } = await adminClient
      .from("live_game_scorer_sessions")
      .select("id,user_id,status,ended_at,activated_at")
      .eq("game_id", game.id)
      .order("activated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const endedAt = latestSession?.ended_at ? new Date(latestSession.ended_at).getTime() : 0;
    const recentLatestScorer = Boolean(
      latestSession?.user_id === userId
      && endedAt
      && endedAt >= Date.now() - 30 * 60 * 1000
    );
    return {
      authorized: isManager || recentLatestScorer,
      isManager,
      scorerControl: null,
      error: "Final-game delivery requires the most recent scorer (within 30 minutes) or a Team Owner/Admin",
    };
  }

  const { data: scorerControl, error } = await userClient.rpc("live_scorer_control_status", {
    target_game_id: game.id,
  });
  const activeScorer = !error && Boolean(scorerControl?.canScore);
  return {
    authorized: activeScorer || (allowManagerWhileLive && isManager),
    isManager,
    scorerControl,
    error: scorerControl?.activeDisplayName
      ? `Scoring control is assigned to ${scorerControl.activeDisplayName}`
      : "Active scorer access required",
  };
}

async function privateDestinationCredential(adminClient: any, destination: any) {
  if (!destination?.id || !destination?.enabled) {
    return { error: "No enabled GroupMe destination is connected to this game", privateDestination: null, credential: null };
  }
  const { data: privateDestination, error } = await adminClient
    .from("live_destinations")
    .select("secret_name,delivery_mode,groupme_topic_id")
    .eq("id", destination.id)
    .single();
  if (error || !privateDestination) {
    return { error: "GroupMe destination is unavailable", privateDestination: null, credential: null };
  }
  const secretName = environmentKey(privateDestination.secret_name);
  const credential = secretName ? Deno.env.get(secretName) : null;
  if (!secretName || !credential) {
    return { error: "The server-side GroupMe connection is not configured", privateDestination, credential: null };
  }
  return { error: null, privateDestination, credential };
}

async function processStoredEventDelivery({
  adminClient,
  event,
  game,
  destination,
  userId,
  force = false,
  triggerSource = "worker",
  privateDestination,
  credential,
}: any) {
  if (event.status !== "active") return { ok:false, status:"voided", error:"Voided events cannot be delivered" };

  if (game.messages_paused || game.message_frequency === "none") {
    const { data: existingDelivery } = await adminClient
      .from("live_deliveries")
      .select("id,status")
      .eq("event_id", event.id)
      .eq("provider", "groupme")
      .maybeSingle();
    if (existingDelivery?.status === "sent") {
      return { ok:true, status:"already_sent", delivery:{ id:existingDelivery.id, status:"sent" } };
    }
    const { data: suppressed, error: suppressedError } = await adminClient.from("live_deliveries").upsert({
      event_id: event.id,
      provider: "groupme",
      destination_id: destination?.id || null,
      destination_name: destination?.display_name || "GroupMe",
      status: "suppressed",
      message_text_snapshot: event.message_text,
      next_retry_at: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "event_id,provider" }).select("id,status,attempt_count,next_retry_at,sent_at,last_error").single();
    if (suppressedError) throw suppressedError;
    return { ok:true, status:"suppressed", delivery:suppressed };
  }

  if (!event.message_text) return { ok:false, status:"missing_message", error:"Event has no GroupMe message text" };
  if (!destination?.id || !destination.enabled) return { ok:false, status:"no_destination", error:"No enabled GroupMe destination is connected to this game" };
  if (!credential || !privateDestination) return { ok:false, status:"not_configured", error:"The server-side GroupMe connection is not configured" };

  const requestId = crypto.randomUUID();
  const { data: claim, error: claimError } = await adminClient.rpc("live_claim_groupme_delivery", {
    target_event_id: event.id,
    target_destination_id: destination.id,
    target_destination_name: destination.display_name,
    target_message_text: event.message_text,
    force_retry: force,
    claim_request_id: requestId,
  });
  if (claimError) throw claimError;

  if (!claim?.claimed) {
    return {
      ok:true,
      status:String(claim?.status || "queued"),
      delivery:{
        id:claim?.deliveryId || null,
        status:String(claim?.status || "queued"),
        next_retry_at:claim?.nextRetryAt || null,
      },
    };
  }

  const pending = { id: String(claim.deliveryId) };
  const attemptNumber = Number(claim.attemptNumber || 1);
  const imageUrl = typeof event.metrics?.groupmeImageUrl === "string" ? event.metrics.groupmeImageUrl : null;
  const result = await postGroupMeDestination(credential, privateDestination, event.message_text, imageUrl);
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
    invoked_by: userId,
    trigger_source: triggerSource,
    provider_response_code: result.status,
    provider_response_excerpt: result.excerpt,
    outcome: finalStatus,
    error_message: result.error,
    attempted_at: new Date().toISOString(),
  });

  return { ok:result.ok, status:finalStatus, error:result.error, delivery:saved };
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

    if (action === "upload_stats_card") {
      const gameId = String(payload.game_id || "");
      const dataUrl = String(payload.data_url || "");
      if (!gameId || !dataUrl) return json({ error:"game_id and data_url are required" },400);

      const { data:game, error:gameError } = await adminClient
        .from("live_games")
        .select("id,team_id,status,destination_id,destination:live_destinations(id,enabled,secret_name)")
        .eq("id",gameId).single();
      if (gameError || !game) return json({ error:"Game not found" },404);
      const destination = Array.isArray(game.destination) ? game.destination[0] : game.destination;
      if (!destination?.id || !destination.enabled) return json({ error:"No enabled GroupMe destination is connected to this game" },409);

      const [{ data:membership }, { data:scorerStatus }] = await Promise.all([
        adminClient.from("live_team_members").select("role").eq("team_id",game.team_id).eq("user_id",user.id).maybeSingle(),
        userClient.rpc("live_scorer_control_status",{target_game_id:game.id}),
      ]);
      if (!["owner","admin"].includes(membership?.role) && !scorerStatus?.canScore) {
        return json({ error:"Active scorer or Team Owner/Admin access required" },403);
      }

      const match = dataUrl.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ error:"Stats card must be a PNG or JPEG data URL" },422);
      const binary = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      if (binary.byteLength > 1_000_000) return json({ error:"Stats card image is too large" },413);

      const secretName = environmentKey(destination.secret_name);
      const credential = secretName ? Deno.env.get(secretName) : null;
      if (!credential) return json({ error:"The server-side GroupMe connection is not configured" },409);
      const upload = await fetch("https://image.groupme.com/pictures",{
        method:"POST",
        headers:{"X-Access-Token":credential,"Content-Type":match[1]==="jpeg"?"image/jpeg":"image/png","User-Agent":"WPHQ-Live/7.64.31"},
        body:binary,
        signal:AbortSignal.timeout(15000),
      });
      const responseText = await upload.text();
      let body:Record<string,unknown> = {};
      try { body = responseText ? JSON.parse(responseText) : {}; } catch (_) {}
      const payloadBody = (body.payload && typeof body.payload === "object") ? body.payload as Record<string,unknown> : {};
      const responseBody = (body.response && typeof body.response === "object") ? body.response as Record<string,unknown> : {};
      const url = String(payloadBody.picture_url || responseBody.picture_url || body.picture_url || "");
      if (!upload.ok || !url.startsWith("https://i.groupme.com/")) {
        return json({ error:`GroupMe image upload failed${upload.status ? ` (HTTP ${upload.status})` : ""}` },502);
      }
      return json({ status:"uploaded", url });
    }

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

      // WPI 7.57.4: credential selection is no longer browser-configurable.
      // Existing teams retain their server-side environment-variable name; a
      // newly created team uses the platform-managed default. The token value
      // itself remains only in the Edge Function environment.
      const secretName = environmentKey(existingDestination?.secret_name) || "GROUPME_ACCESS_TOKEN_WPI_LIVE";
      const accessToken = Deno.env.get(secretName);
      if (!accessToken) {
        return json({
          error: "WPI's protected GroupMe connection is not configured. Ask the Platform Owner to complete the one-time connection."
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

    if (action === "flush_game") {
      const gameId = String(payload.game_id || "");
      const maxEvents = Math.max(1, Math.min(25, Number(payload.max_events || 20)));
      const force = Boolean(payload.force);
      if (!gameId) return json({ error:"game_id is required" },400);

      const { data: game, error: gameError } = await adminClient
        .from("live_games")
        .select("id,team_id,status,messages_paused,message_frequency,destination_id,destination:live_destinations(id,display_name,enabled,delivery_mode,groupme_topic_id,groupme_topic_name)")
        .eq("id",gameId)
        .single();
      if (gameError || !game) return json({ error:"Game not found" },404);
      const destination = Array.isArray(game.destination) ? game.destination[0] : game.destination;
      const authz = await deliveryAuthorization(adminClient,userClient,user.id,game,true);
      if (!authz.authorized) return json({ error:authz.error },403);

      const { data: events, error: eventsError } = await adminClient
        .from("live_events")
        .select("id,client_event_id,sequence,created_at,message_text,status,metrics")
        .eq("game_id",game.id)
        .eq("status","active")
        .not("message_text","is",null)
        .order("sequence",{ascending:true})
        .order("created_at",{ascending:true});
      if (eventsError) throw eventsError;
      if (!events?.length) return json({ status:"flushed",game_id:game.id,scanned:0,processed:0,sent:0,already_sent:0,suppressed:0,queued:0,failed:0,remaining:0,deliveries:[] });

      const eventIds = events.map((event:any)=>event.id);
      const { data: existingRows, error: existingError } = await adminClient
        .from("live_deliveries")
        .select("event_id,status,next_retry_at")
        .in("event_id",eventIds)
        .eq("provider","groupme");
      if (existingError) throw existingError;
      const existing = new Map((existingRows || []).map((row:any)=>[row.event_id,row]));
      const candidates = events.filter((event:any)=>{
        const delivery = existing.get(event.id);
        if (!delivery) return true;
        if (["sent","suppressed"].includes(String(delivery.status))) return false;
        if (!force && delivery.next_retry_at && new Date(delivery.next_retry_at).getTime() > Date.now()) return false;
        return true;
      });
      const batch = candidates.slice(0,maxEvents);
      const credentialState = await privateDestinationCredential(adminClient,destination);
      if (credentialState.error && batch.length) return json({ error:credentialState.error },409);

      const output:any[] = [];
      const counts:any = {sent:0,already_sent:0,suppressed:0,queued:0,failed:0};
      for (const event of batch) {
        try {
          const result = await processStoredEventDelivery({
            adminClient,event,game,destination,userId:user.id,force,
            triggerSource:"worker",
            privateDestination:credentialState.privateDestination,
            credential:credentialState.credential,
          });
          const normalized = result.status === "already_sent" ? "sent" : ["queued","in_flight"].includes(result.status) ? "pending" : result.status;
          if (result.status === "already_sent") counts.already_sent += 1;
          else if (result.status === "sent") counts.sent += 1;
          else if (result.status === "suppressed") counts.suppressed += 1;
          else if (["queued","in_flight"].includes(result.status)) counts.queued += 1;
          else counts.failed += 1;
          output.push({
            eventId:event.client_event_id,
            remoteEventId:event.id,
            status:normalized,
            attemptCount:result.delivery?.attempt_count || 0,
            nextRetryAt:result.delivery?.next_retry_at || null,
            sentAt:result.delivery?.sent_at || null,
            lastError:result.error || result.delivery?.last_error || "",
          });
        } catch (error) {
          counts.failed += 1;
          output.push({eventId:event.client_event_id,remoteEventId:event.id,status:"failed",attemptCount:0,nextRetryAt:null,sentAt:null,lastError:error instanceof Error ? error.message : "Delivery failed"});
        }
      }
      return json({
        status:"flushed",
        game_id:game.id,
        scanned:events.length,
        processed:batch.length,
        ...counts,
        remaining:Math.max(0,candidates.length-batch.length),
        deliveries:output,
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
      .select("id,client_event_id,message_text,status,metrics,game_id,game:live_games!inner(id,team_id,environment,status,messages_paused,message_frequency,destination_id,destination:live_destinations(id,display_name,enabled,delivery_mode,groupme_topic_id,groupme_topic_name))")
      .eq("id", eventId)
      .single();
    if (eventError || !event) return json({ error: "Event not found or access denied" }, 404);

    const game = Array.isArray(event.game) ? event.game[0] : event.game;
    const destination = Array.isArray(game.destination) ? game.destination[0] : game.destination;
    const authz = await deliveryAuthorization(adminClient,userClient,user.id,game,false);
    if (!authz.authorized) return json({ error:authz.error },403);

    const credentialState = await privateDestinationCredential(adminClient,destination);
    if (credentialState.error && event.message_text && !game.messages_paused && game.message_frequency !== "none") {
      return json({ error:credentialState.error },409);
    }
    const result = await processStoredEventDelivery({
      adminClient,event,game,destination,userId:user.id,force,triggerSource,
      privateDestination:credentialState.privateDestination,
      credential:credentialState.credential,
    });
    if (!result.ok && result.status === "failed") return json({ error:result.error || "GroupMe delivery failed",delivery:result.delivery },502);
    if (!result.ok) return json({ error:result.error || "GroupMe delivery failed" },409);
    return json({
      status:result.status,
      delivery:result.delivery || null,
      delivery_id:result.delivery?.id || null,
      next_retry_at:result.delivery?.next_retry_at || null,
      delivery_mode:credentialState.privateDestination?.delivery_mode || destination?.delivery_mode || "bot",
      topic_name:destination?.groupme_topic_name || null,
    }, ["queued","in_flight"].includes(result.status) ? 202 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("groupme-post failed", { message });
    return json({ error: message }, 500);
  }
});
