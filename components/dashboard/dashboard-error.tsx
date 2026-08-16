import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function DashboardError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
      <h2 className="text-base font-semibold text-red-800 dark:text-red-200">
        Unable to load dashboard data
      </h2>
      <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
        {message}
      </p>
      <Link
        className={buttonVariants({ className: "mt-4", variant: "outline" })}
        href="/dashboard"
      >
        Try again
      </Link>
    </div>
  );
}
