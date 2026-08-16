import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  FileText,
  Receipt,
  Users,
  Wrench,
} from "lucide-react";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProgressRow, percent } from "@/components/dashboard/progress-row";
import { buttonVariants } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import {
  calculateDashboardMetrics,
  formatCurrency,
  type DashboardInvoiceMetricRow,
  type DashboardJobMetricRow,
} from "@/lib/dashboard/metrics";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [customersResult, jobsResult, invoicesResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("jobs")
      .select("status,estimated_amount")
      .eq("user_id", user.id),
    supabase
      .from("invoices")
      .select("status,amount")
      .eq("user_id", user.id),
  ]);

  if (customersResult.error || jobsResult.error || invoicesResult.error) {
    return (
      <section className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            Business overview
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
            Live overview of customers, jobs, invoices, and revenue signals for
            your PipeFlow workspace.
          </p>
        </div>
        <DashboardError message="Refresh the page or try again shortly." />
      </section>
    );
  }

  const metrics = calculateDashboardMetrics({
    invoices: (invoicesResult.data ?? []) as DashboardInvoiceMetricRow[],
    jobs: (jobsResult.data ?? []) as DashboardJobMetricRow[],
    totalCustomers: customersResult.count ?? 0,
  });
  const totalJobCount = metrics.activeJobs + metrics.completedJobs;
  const totalRevenueSignal =
    metrics.outstandingInvoices + metrics.estimatedRevenue + metrics.paidRevenue;
  const activityItems = [
    {
      icon: <Users aria-hidden="true" className="size-4" />,
      title: `${metrics.totalCustomers} customer${
        metrics.totalCustomers === 1 ? "" : "s"
      } in workspace`,
      description: "Customer records are synced from your Supabase data.",
      timestamp: "Live",
    },
    {
      icon: <Wrench aria-hidden="true" className="size-4" />,
      title: `${metrics.activeJobs} active job${
        metrics.activeJobs === 1 ? "" : "s"
      } need attention`,
      description: "Includes leads, quoted, scheduled, and in-progress work.",
      timestamp: "Updated now",
    },
    {
      icon: <Receipt aria-hidden="true" className="size-4" />,
      title: `${metrics.outstandingInvoiceCount} outstanding invoice${
        metrics.outstandingInvoiceCount === 1 ? "" : "s"
      }`,
      description: `${formatCurrency(
        metrics.outstandingInvoices,
      )} currently sent or overdue.`,
      timestamp: "Finance",
    },
  ];

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            Business overview
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
            Live overview of customers, jobs, invoices, and revenue signals for
            your PipeFlow workspace.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            className={buttonVariants({
              variant: "outline",
              className: "w-full gap-2 sm:w-auto",
            })}
            href="/dashboard/customers"
          >
            <Users aria-hidden="true" className="size-4" />
            New Customer
          </Link>
          <Link
            className={buttonVariants({ className: "w-full gap-2 sm:w-auto" })}
            href="/dashboard/jobs"
          >
            <FilePlus2 aria-hidden="true" className="size-4" />
            New Job
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={<Users aria-hidden="true" className="size-5" />}
          label="Total Customers"
          tone="blue"
          trend={{ direction: "up", label: "Ready for jobs" }}
          value={String(metrics.totalCustomers)}
        />
        <MetricCard
          icon={<Wrench aria-hidden="true" className="size-5" />}
          label="Active Jobs"
          tone="amber"
          trend={{ direction: "up", label: "In pipeline" }}
          value={String(metrics.activeJobs)}
        />
        <MetricCard
          icon={<CheckCircle2 aria-hidden="true" className="size-5" />}
          label="Completed Jobs"
          tone="green"
          trend={{ direction: "up", label: "Completed" }}
          value={String(metrics.completedJobs)}
        />
        <MetricCard
          description={`${metrics.outstandingInvoiceCount} invoice${
            metrics.outstandingInvoiceCount === 1 ? "" : "s"
          } sent or overdue`}
          icon={<Receipt aria-hidden="true" className="size-5" />}
          label="Outstanding Invoices"
          tone="slate"
          value={formatCurrency(metrics.outstandingInvoices)}
        />
        <MetricCard
          description="Non-cancelled job estimates"
          icon={<FileText aria-hidden="true" className="size-5" />}
          label="Estimated Revenue"
          tone="blue"
          value={formatCurrency(metrics.estimatedRevenue)}
        />
        <MetricCard
          description="Paid invoice total"
          icon={<Banknote aria-hidden="true" className="size-5" />}
          label="Paid Revenue"
          tone="green"
          value={formatCurrency(metrics.paidRevenue)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <DashboardCard
          icon={<Banknote aria-hidden="true" className="size-5" />}
          subtitle="Revenue distribution across active work and invoicing."
          title="Revenue pipeline"
        >
          <div className="space-y-5">
            <ProgressRow
              color="bg-brand-primary"
              label="Estimated revenue"
              value={formatCurrency(metrics.estimatedRevenue)}
              width={percent(metrics.estimatedRevenue, totalRevenueSignal)}
            />
            <ProgressRow
              color="bg-amber-500 dark:bg-amber-400"
              label="Outstanding invoices"
              value={formatCurrency(metrics.outstandingInvoices)}
              width={percent(metrics.outstandingInvoices, totalRevenueSignal)}
            />
            <ProgressRow
              color="bg-green-600"
              label="Paid revenue"
              value={formatCurrency(metrics.paidRevenue)}
              width={percent(metrics.paidRevenue, totalRevenueSignal)}
            />
          </div>
        </DashboardCard>

        <DashboardCard
          icon={<CalendarClock aria-hidden="true" className="size-5" />}
          subtitle="Operational split between open and completed jobs."
          title="Job mix"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Active share
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {percent(metrics.activeJobs, totalJobCount)}%
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${percent(metrics.activeJobs, totalJobCount)}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Completion share
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {percent(metrics.completedJobs, totalJobCount)}%
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-green-600"
                  style={{
                    width: `${percent(metrics.completedJobs, totalJobCount)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <DashboardCard
          icon={<FilePlus2 aria-hidden="true" className="size-5" />}
          subtitle="Common workspace actions."
          title="Quick actions"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              className={buttonVariants({
                className: "h-11 justify-start gap-2",
                variant: "outline",
              })}
              href="/dashboard/jobs"
            >
              <Wrench aria-hidden="true" className="size-4" />
              New Job
            </Link>
            <Link
              className={buttonVariants({
                className: "h-11 justify-start gap-2",
                variant: "outline",
              })}
              href="/dashboard/customers"
            >
              <Users aria-hidden="true" className="size-4" />
              New Customer
            </Link>
            <Link
              className={buttonVariants({
                className: "h-11 justify-start gap-2",
                variant: "outline",
              })}
              href="/dashboard/invoices"
            >
              <Receipt aria-hidden="true" className="size-4" />
              Create Invoice
            </Link>
            <Link
              className={buttonVariants({
                className: "h-11 justify-start gap-2",
                variant: "outline",
              })}
              href="/dashboard/jobs"
            >
              <CalendarClock aria-hidden="true" className="size-4" />
              View Schedule
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard
          action={
            <Link
              className={buttonVariants({
                className: "h-9 px-3",
                variant: "ghost",
              })}
              href="/dashboard/jobs"
            >
              View jobs
            </Link>
          }
          icon={<CalendarClock aria-hidden="true" className="size-5" />}
          subtitle="A concise feed generated from current workspace metrics."
          title="Activity"
        >
          <ActivityFeed items={activityItems} />
        </DashboardCard>
      </div>
    </section>
  );
}
