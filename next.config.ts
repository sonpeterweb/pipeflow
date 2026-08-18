import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/dashboard/invoices/[id]/pdf": [
      "./node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf",
    ],
    "/dashboard/quotes/[id]/pdf": [
      "./node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf",
    ],
  },
  serverExternalPackages: ["pdfkit"],
  // Pin Turbopack's workspace root so HMR does not lose the installed `next`
  // package after cache churn (common cause of "Next.js package not found").
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
