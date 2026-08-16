import { cn } from "@/lib/utils";

export function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function ProgressRow({
  color,
  label,
  value,
  width,
}: {
  color: string;
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-950 dark:text-slate-100">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.max(width, 4)}%` }}
        />
      </div>
    </div>
  );
}
