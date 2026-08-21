import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/stripe/config";

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), {
      appInfo: {
        name: "PipeFlow",
        version: "1.0.0",
      },
    });
  }

  return stripeClient;
}
