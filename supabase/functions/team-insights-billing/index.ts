// WPI 7.63.4 — Stripe-ready Team Insights checkout/customer portal.
// Disabled until live_subscription_products.checkout_status='active', Stripe price IDs
// are configured, and server-side secrets are installed. WPI never receives card data.
import Stripe from "npm:stripe@^22";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2.110.8/cors";

const corsHeaders = {
  ...supabaseCorsHeaders,
  "Access-Control-Allow-Headers": `${supabaseCorsHeaders["Access-Control-Allow-Headers"]}, x-wpi-live-release`,
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });
const allowedIntervals = new Set(["monthly", "annual"]);

function safeBaseUrl(raw: string | undefined) {
  const value = String(raw || "").replace(/\/+$/, "");
  if (!/^https:\/\//i.test(value)) throw new Error("WPI_PUBLIC_BASE_URL must be an HTTPS origin");
  return value;
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const environment = Deno.env.get("WPI_BILLING_ENVIRONMENT") === "live" ? "live" : "test";
    const publicBaseUrl = safeBaseUrl(Deno.env.get("WPI_PUBLIC_BASE_URL"));
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !stripeKey) {
      return json({ error: "Billing is not configured yet" }, 503);
    }

    const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
    const { data: { user }, error: userError } = await userClient.auth.getUser(jwt);
    if (userError || !user) return json({ error: "Invalid user session" }, 401);

    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || "checkout").trim();
    const teamId = String(payload.team_id || "").trim();
    if (!teamId) return json({ error: "team_id is required" }, 400);

    // Use the existing server-side access RPC to prevent arbitrary team purchases.
    const { data: commerce, error: commerceError } = await userClient.rpc("live_team_insights_commerce_status_v1", { target_team_id: teamId });
    if (commerceError) return json({ error: commerceError.message || "Team access required" }, 403);
    const checkoutStatus = String(commerce?.product?.checkoutStatus || "preview");
    if (action === "checkout" && checkoutStatus !== "active") return json({ error: "Checkout is not live yet" }, 409);
    const adultPurchaserRequired = commerce?.product?.adultPurchaserRequired !== false;
    const adultPurchaserConfirmed = payload.adult_purchaser_confirmed === true;
    if (action === "checkout" && adultPurchaserRequired && !adultPurchaserConfirmed) {
      return json({ error: "Adult purchaser confirmation is required" }, 400);
    }

    const stripe = new Stripe(stripeKey);

    const { data: existingCustomer } = await admin.from("live_billing_customers")
      .select("external_customer_id")
      .eq("user_id", user.id).eq("provider", "stripe").eq("environment", environment).maybeSingle();
    let customerId = existingCustomer?.external_customer_id || "";
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { wpi_user_id: user.id },
      });
      customerId = customer.id;
      const { error } = await admin.from("live_billing_customers").upsert({
        user_id: user.id, provider: "stripe", environment, external_customer_id: customerId, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider,environment" });
      if (error) throw error;
    }

    if (action === "portal") {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${publicBaseUrl}/live-team-insights.html?teamId=${encodeURIComponent(teamId)}`,
      });
      return json({ status: "ok", url: portal.url });
    }
    if (action !== "checkout") return json({ error: "Unsupported billing action" }, 400);

    const interval = String(payload.billing_interval || "annual").trim();
    if (!allowedIntervals.has(interval)) return json({ error: "billing_interval must be monthly or annual" }, 400);

    const { data: priceRow, error: priceError } = await admin.from("live_subscription_prices")
      .select("external_price_id,status")
      .eq("product_code", "team_insights").eq("provider", "stripe").eq("environment", environment)
      .eq("billing_interval", interval).maybeSingle();
    if (priceError || !priceRow?.external_price_id || priceRow.status !== "active") {
      return json({ error: "This Team Insights price is not configured yet" }, 503);
    }

    const metadata = {
      wpi_user_id: user.id,
      wpi_team_id: teamId,
      wpi_product_code: "team_insights",
      wpi_billing_interval: interval,
      wpi_adult_purchaser_confirmed: adultPurchaserConfirmed ? "true" : "false",
    };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceRow.external_price_id, quantity: 1 }],
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
      success_url: `${publicBaseUrl}/live-team-insights.html?teamId=${encodeURIComponent(teamId)}&billing=success`,
      cancel_url: `${publicBaseUrl}/live-team-insights.html?teamId=${encodeURIComponent(teamId)}&billing=cancel`,
      submit_type: "subscribe",
    });
    return json({ status: "ok", url: session.url });
  } catch (error) {
    console.error("Team Insights billing failed", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Billing request failed" }, 500);
  }
});
