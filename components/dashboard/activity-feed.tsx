import type { ReactNode } from "react";

export type ActivityFeedItem = {
  description: string;
  icon: ReactNode;
  timestamp: string;
  title: string;
};

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div className="flex gap-3" key={item.title}>
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium text-slate-950 dark:text-slate-100">{item.title}</p>
              <time className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {item.timestamp}
              </time>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
