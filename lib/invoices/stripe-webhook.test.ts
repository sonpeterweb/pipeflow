import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { processStripeCheckoutCompleted } from "@/lib/invoices/stripe-webhook";

const invoiceId = "40000000-0000-0000-0000-000000000013";
const userId = "70000000-0000-4000-8000-000000000001";

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    neq: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  return query;
}

function createSupabase(invoice: Record<string, unknown>, updated: unknown = { id: invoiceId }) {
  const selectQuery = queryResult(invoice);
  const updateQuery = queryResult(updated);
  const from = vi
    .fn()
    .mockReturnValueOnce(selectQuery)
    .mockReturnValueOnce(updateQuery);

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    updateQuery,
  };
}

function checkoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    created: 1_785_321_600,
    data: {
      object: {
        amount_total: 118000,
        currency: "nzd",
        id: "cs_test_paid",
        metadata: { invoice_id: invoiceId, user_id: userId },
        payment_intent: "pi_test_paid",
        payment_status: "paid",
        ...overrides,
      },
    },
    id: "evt_test_paid",
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    amount: "1180.00",
    paid_at: null,
    status: "sent",
    stripe_checkout_session_id: "cs_test_paid",
    stripe_payment_intent_id: null,
    ...overrides,
  };
}

describe("processStripeCheckoutCompleted", () => {
  it("ignores irrelevant events without database access", async () => {
    const from = vi.fn();

    await expect(
      processStripeCheckoutCompleted({
        event: { type: "customer.created" } as Stripe.Event,
        supabase: { from } as unknown as SupabaseClient,
      }),
    ).resolves.toEqual({ kind: "ignored", reason: "irrelevant_event" });
    expect(from).not.toHaveBeenCalled();
  });

  it("marks only the matching invoice paid using the Stripe event time", async () => {
    const { client, updateQuery } = createSupabase(invoice());

    await expect(
      processStripeCheckoutCompleted({ event: checkoutEvent(), supabase: client }),
    ).resolves.toEqual({ kind: "processed" });
    expect(updateQuery.update).toHaveBeenCalledWith({
      paid_at: new Date(1_785_321_600 * 1000).toISOString(),
      status: "paid",
      stripe_payment_intent_id: "pi_test_paid",
    });
    expect(updateQuery.eq).toHaveBeenCalledWith("amount", "1180.00");
    expect(updateQuery.eq).toHaveBeenCalledWith(
      "stripe_checkout_session_id",
      "cs_test_paid",
    );
  });

  it("does not update on amount, currency, session, or metadata mismatch", async () => {
    for (const [event, expectedDatabaseReads] of [
      [checkoutEvent({ amount_total: 117999 }), 1],
      [checkoutEvent({ currency: "aud" }), 1],
      [checkoutEvent({ id: "cs_test_other" }), 1],
      [checkoutEvent({ metadata: { invoice_id: invoiceId } }), 0],
    ] as const) {
      const { client, from } = createSupabase(invoice());
      const result = await processStripeCheckoutCompleted({ event, supabase: client });

      expect(result.kind).toBe("ignored");
      expect(from).toHaveBeenCalledTimes(expectedDatabaseReads);
    }
  });

  it("treats a repeated valid delivery as a harmless duplicate", async () => {
    const { client, from } = createSupabase(
      invoice({
        paid_at: "2026-07-30T00:00:00.000Z",
        status: "paid",
        stripe_payment_intent_id: "pi_test_paid",
      }),
    );

    await expect(
      processStripeCheckoutCompleted({ event: checkoutEvent(), supabase: client }),
    ).resolves.toEqual({ kind: "duplicate" });
    expect(from).toHaveBeenCalledTimes(1);
  });
});
