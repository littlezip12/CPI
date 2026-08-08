// WPI 7.57.1 — high-accuracy roster image extraction.
// The OpenAI API key is server-side only. Roster images are processed in-memory and are not written to WPI storage.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2.110.8/cors";

const corsHeaders = {
  ...supabaseCorsHeaders,
  "Access-Control-Allow-Headers": `${supabaseCorsHeaders["Access-Control-Allow-Headers"]}, x-wpi-live-release`,
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });
const MAX_DATA_URL_CHARS = 8_000_000;
const MODEL = Deno.env.get("OPENAI_ROSTER_MODEL") || "gpt-5.6";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    players: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          cap: { type: "string", description: "Visible water polo cap/jersey number only, without # or punctuation." },
          name: { type: "string", description: "Player name exactly as visibly readable on the roster." },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["cap", "name", "confidence"],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["players", "warnings"],
} as const;

function extractOutputText(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string") return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as Array<Record<string, unknown>>
      : [];
    for (const part of content) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
      if (part?.type === "refusal" && typeof part.refusal === "string") {
        throw new Error("The roster reader could not process this image.");
      }
    }
  }
  return "";
}

function sanitizeRoster(payload: unknown) {
  const object = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const inputPlayers = Array.isArray(object.players) ? object.players : [];
  const seen = new Set<string>();
  const players: Array<{cap:string;name:string;confidence:"high"|"medium"|"low"}> = [];

  for (const raw of inputPlayers.slice(0, 60)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const cap = String(row.cap || "").trim().replace(/^#/, "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 3);
    const name = String(row.name || "").replace(/\s+/g, " ").replace(/^[\-–—:|,;.]+|[\-–—:|,;.]+$/g, "").trim().slice(0, 100);
    let confidence = ["high", "medium", "low"].includes(String(row.confidence))
      ? String(row.confidence) as "high"|"medium"|"low"
      : "low";

    if (!cap || !name || !/[A-Za-z]/.test(name)) continue;
    if (!/^\d{1,3}[A-Z]?$/.test(cap)) confidence = "low";
    if (name.length < 3 || /[^A-Za-zÀ-ÖØ-öø-ÿ'’\-. ]/.test(name)) confidence = "low";
    if (!/\s/.test(name)) confidence = confidence === "high" ? "medium" : confidence;

    const key = `${cap}|${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({ cap, name, confidence });
  }

  const capCounts = new Map<string, number>();
  players.forEach(player => capCounts.set(player.cap, (capCounts.get(player.cap) || 0) + 1));
  players.forEach(player => {
    if ((capCounts.get(player.cap) || 0) > 1) player.confidence = "low";
  });

  const warnings = Array.isArray(object.warnings)
    ? object.warnings.map(value => String(value || "").trim()).filter(Boolean).slice(0, 12)
    : [];

  return { players, warnings };
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
    if (!userJwt || userJwt === authorization) return json({ error: "A valid signed-in user token is required" }, 401);

    const { data: { user }, error: userError } = await userClient.auth.getUser(userJwt);
    if (userError || !user) return json({ error: "Invalid user session" }, 401);

    const payload = await req.json();
    const teamId = String(payload.team_id || "").trim();
    const imageDataUrl = String(payload.image_data_url || "");
    if (!teamId) return json({ error: "team_id is required" }, 400);
    if (!imageDataUrl || imageDataUrl.length > MAX_DATA_URL_CHARS) return json({ error: "Roster image is missing or too large" }, 400);
    if (!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(imageDataUrl)) {
      return json({ error: "Roster image must be a supported JPEG, PNG, WEBP, or GIF image" }, 400);
    }

    const { data: membership } = await adminClient
      .from("live_team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return json({ error: "Team Owner or Admin access is required to import a roster" }, 403);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "High-accuracy roster reading is not configured yet. Use manual entry or ask the WPI Owner to finish setup." }, 503);

    const prompt = [
      "You are reading a youth water polo team roster from a photo or screenshot.",
      "Extract ONLY visible player roster rows. Do not invent, autocomplete, or infer a person who is not clearly present.",
      "For each row, return the cap/jersey number and player name exactly as visibly readable.",
      "Common formats include: '1 - First Last', '#1 First Last', or separate cap/name columns.",
      "Ignore bullets, headings, team names, ages, dates, coaches, and unrelated text.",
      "Preserve row order from top to bottom.",
      "Confidence guidance: high = cap and full name are clearly legible; medium = readable but one character/word is mildly uncertain; low = substantial uncertainty.",
      "If a row is genuinely unreadable, omit it rather than fabricate text and add a short warning.",
      "Return only the structured roster schema.",
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        max_output_tokens: 3000,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageDataUrl, detail: "original" },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "water_polo_roster_extraction",
            strict: true,
            schema,
          },
        },
      }),
      signal: AbortSignal.timeout(45000),
    });

    const responseText = await response.text();
    let responseBody: Record<string, unknown> = {};
    try { responseBody = responseText ? JSON.parse(responseText) : {}; } catch (_) {}
    if (!response.ok) {
      const apiError = responseBody?.error && typeof responseBody.error === "object"
        ? String((responseBody.error as Record<string, unknown>).message || "")
        : "";
      console.error("Roster vision provider error", { status: response.status, model: MODEL, message: apiError.slice(0, 240) });
      return json({ error: response.status === 401 ? "Roster-reading service credentials need attention" : "High-accuracy roster reading is temporarily unavailable" }, 502);
    }

    const outputText = extractOutputText(responseBody);
    if (!outputText) return json({ error: "Roster reader returned no structured roster" }, 502);

    let parsed: unknown;
    try { parsed = JSON.parse(outputText); } catch (_) { return json({ error: "Roster reader returned an invalid structured result" }, 502); }
    const result = sanitizeRoster(parsed);
    if (!result.players.length) {
      return json({ status: "ok", players: [], warnings: result.warnings.length ? result.warnings : ["No player rows were confidently readable in the image."], model: MODEL });
    }

    return json({ status: "ok", ...result, model: MODEL });
  } catch (error) {
    console.error("Roster extraction failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: error instanceof Error ? error.message : "Roster extraction failed" }, 500);
  }
});
