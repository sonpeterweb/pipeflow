import { afterEach, describe, expect, it } from "vitest";

import {
  getStripeSecretKey,
  getStripeWebhookSecret,
  getTrustedAppUrl,
} from "@/lib/stripe/config";

const originalEnvironment = {
  APP_URL: process.env.APP_URL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("Stripe server configuration", () => {
  it("accepts test credentials and normalizes the trusted app URL", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_example";
    process.env.APP_URL = "http://localhost:3000/";

    expect(getStripeSecretKey()).toBe("sk_test_example");
    expect(getStripeWebhookSecret()).toBe("whsec_example");
    expect(getTrustedAppUrl()).toBe("http://localhost:3000");
  });

  it("rejects live-mode Stripe credentials", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_not_allowed";

    expect(() => getStripeSecretKey()).toThrow();
  });
});
