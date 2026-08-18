// WPI 7.63.4 — Signed Stripe subscription webhook.
// Stripe is the subscription-state authority; WPI stores only IDs/status/periods and
// grants/revokes Team Insights. No card number, CVV, or payment method is copied to WPI.
import Stripe from "npm:stripe@^22";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function ts(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}
function idOf(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  return typeof value === "string" ? value : value?.id || "";
}
function period(subscription: Stripe.Subscription) {
  const item = subscription.items?.data?.[0];
  return { start: ts(item?.current_period_start), end: ts(item?.current_period_end) };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const serviceRoleKey = secretKeys.default || Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) return json({ error: "Webhook is not configured" }, 503);

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature || "", webhookSecret, undefined, cryptoProvider);
  } catch (error) {
    console.error("Stripe signature verification failed", error instanceof Error ? error.message : error);
    return json({ error: "Invalid Stripe signature" }, 400);
  }

  const environment = event.livemode ? "live" : "test";
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: inserted, error: insertError } = await admin.from("live_billing_events").insert({
    provider: "stripe", environment, provider_event_id: event.id, event_type: event.type,
    event_created_at: ts(event.created), processing_status: "received",
  }).select("provider_event_id").maybeSingle();
  if (insertError && !String(insertError.code || "").includes("23505")) return json({ error: "Billing event ledger failed" }, 500);
  if (!inserted) return json({ status: "duplicate" });

  try {
    let subscription: Stripe.Subscription | null = null;
    if (["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type)) {
      subscription = event.data.object as Stripe.Subscription;
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (subscriptionId) subscription = await stripe.subscriptions.retrieve(subscriptionId);
    }

    if (subscription) {
      const meta = subscription.metadata || {};
      const userId = String(meta.wpi_user_id || "");
      const teamId = String(meta.wpi_team_id || "");
      const productCode = String(meta.wpi_product_code || "");
      const billingInterval = String(meta.wpi_billing_interval || "");
      const customerId = idOf(subscription.customer);
      const p = period(subscription);
      if (!userId || !teamId || productCode !== "team_insights" || !["monthly","annual"].includes(billingInterval) || !customerId) {
        throw new Error("Stripe subscription is missing required WPI metadata");
      }
      const { error } = await admin.rpc("live_apply_team_insights_subscription_v1", {
        target_user_id: userId,
        target_team_id: teamId,
        provider_environment: environment,
        provider_customer_id_value: customerId,
        provider_subscription_id_value: subscription.id,
        billing_interval_value: billingInterval,
        subscription_status_value: subscription.status,
        period_start_value: p.start,
        period_end_value: p.end,
        cancel_at_period_end_value: subscription.cancel_at_period_end || false,
        latest_invoice_status_value: null,
      });
      if (error) throw error;
    }

    await admin.from("live_billing_events").update({ processing_status: subscription ? "processed" : "ignored", processed_at: new Date().toISOString(), error_message: null })
      .eq("provider", "stripe").eq("environment", environment).eq("provider_event_id", event.id);
    return json({ status: subscription ? "processed" : "ignored" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Stripe webhook processing failed", message);
    await admin.from("live_billing_events").update({ processing_status: "failed", processed_at: new Date().toISOString(), error_message: message.slice(0,500) })
      .eq("provider", "stripe").eq("environment", environment).eq("provider_event_id", event.id);
    return json({ error: message }, 500);
  }
});
