import { revalidatePath } from "next/cache";
import type Stripe from "stripe";

import { processStripeCheckoutCompleted } from "@/lib/invoices/stripe-webhook";
import { getStripeWebhookSecret } from "@/lib/stripe/config";
import { getStripeClient } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    console.warn("[stripeWebhook] Signature verification failed.", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  try {
    const result = await processStripeCheckoutCompleted({
      event,
      supabase: createAdminClient(),
    });

    if (result.kind === "error") {
      console.error("[stripeWebhook] Payment synchronization failed.", {
        eventId: event.id,
        error:
          result.error instanceof Error ? result.error.name : "DatabaseError",
      });
      return Response.json(
        { error: "Unable to synchronize payment." },
        { status: 500 },
      );
    }

    if (result.kind === "ignored") {
      console.warn("[stripeWebhook] Verified event was ignored.", {
        eventId: event.id,
        reason: result.reason,
      });
    }

    if (result.kind === "processed") {
      revalidatePath("/dashboard/invoices");
      revalidatePath("/dashboard");
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[stripeWebhook] Unexpected processing failure.", {
      eventId: event.id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Unable to synchronize payment." },
      { status: 500 },
    );
  }
}
