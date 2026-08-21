import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const serverConfigSchema = z.object({
  serviceRoleKey: z.string().min(1),
  supabaseUrl: z.url(),
});

export function createAdminClient() {
  const config = serverConfigSchema.parse({
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
