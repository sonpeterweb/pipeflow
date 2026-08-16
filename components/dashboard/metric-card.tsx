import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MetricCard({
  description,
  icon,
  label,
  tone = "blue",
  trend,
  value,
}: {
  description?: string;
  icon: ReactNode;
  label: string;
  tone?: "blue" | "green" | "slate" | "amber";
  trend?: {
    direction: "up" | "down";
    label: string;
  };
  value: string;
}) {
  const toneClasses = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    blue: "bg-brand-primary-light text-brand-primary dark:bg-blue-950 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950/70 dark:text-green-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };
  const TrendIcon = trend?.direction === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            toneClasses[tone],
          )}
        >
          {icon}
        </div>
      </div>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {trend ? (
        <div
          className={cn(
            "mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            trend.direction === "down"
              ? "bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300"
              : "bg-green-50 text-green-700 dark:bg-green-950/70 dark:text-green-300",
          )}
        >
          <TrendIcon aria-hidden="true" className="size-3.5" />
          {trend.label}
        </div>
      ) : null}
    </article>
  );
}
