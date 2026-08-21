import { z } from "zod";

const testSecretKeySchema = z
  .string()
  .trim()
  .regex(/^sk_test_/, "Stripe must use a test-mode secret key.");

const webhookSecretSchema = z.string().trim().regex(/^whsec_/);

const appUrlSchema = z
  .url()
  .transform((value) => value.replace(/\/$/, ""));

export function getStripeSecretKey() {
  return testSecretKeySchema.parse(process.env.STRIPE_SECRET_KEY);
}

export function getStripeWebhookSecret() {
  return webhookSecretSchema.parse(process.env.STRIPE_WEBHOOK_SECRET);
}

export function getTrustedAppUrl() {
  return appUrlSchema.parse(process.env.APP_URL);
}
