import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  createAdminClient: vi.fn(),
  processStripeCheckoutCompleted: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/stripe/config", () => ({
  getStripeWebhookSecret: () => "whsec_test",
}));
vi.mock("@/lib/stripe/server", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/invoices/stripe-webhook", () => ({
  processStripeCheckoutCompleted: mocks.processStripeCheckoutCompleted,
}));

import { POST } from "@/app/api/stripe/webhook/route";

function webhookRequest(signature = "t=123,v1=test") {
  return new Request("http://localhost:3000/api/stripe/webhook", {
    body: '{"id":"evt_test"}',
    headers: { "stripe-signature": signature },
    method: "POST",
  });
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn() });
  });

  it("rejects a missing or invalid signature before elevated database access", async () => {
    const missingResponse = await POST(
      new Request("http://localhost:3000/api/stripe/webhook", {
        body: "{}",
        method: "POST",
      }),
    );
    expect(missingResponse.status).toBe(400);

    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const invalidResponse = await POST(webhookRequest());

    expect(invalidResponse.status).toBe(400);
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      '{"id":"evt_test"}',
      "t=123,v1=test",
      "whsec_test",
    );
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("acknowledges irrelevant verified events without database access", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_test",
      type: "customer.created",
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.processStripeCheckoutCompleted).not.toHaveBeenCalled();
  });

  it("processes a verified completion and revalidates payment views", async () => {
    const event = { id: "evt_test", type: "checkout.session.completed" };
    mocks.constructEvent.mockReturnValue(event);
    mocks.processStripeCheckoutCompleted.mockResolvedValue({ kind: "processed" });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.createAdminClient).toHaveBeenCalledOnce();
    expect(mocks.processStripeCheckoutCompleted).toHaveBeenCalledWith({
      event,
      supabase: expect.any(Object),
    });
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/dashboard/invoices"],
      ["/dashboard"],
    ]);
  });

  it("returns a retryable server error for transient synchronization failures", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.constructEvent.mockReturnValue({
      id: "evt_test",
      type: "checkout.session.completed",
    });
    mocks.processStripeCheckoutCompleted.mockResolvedValue({
      error: new Error("database unavailable"),
      kind: "error",
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to synchronize payment.",
    });
    consoleError.mockRestore();
  });
});
