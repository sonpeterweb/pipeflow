import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hammer,
  Receipt,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";

import { AppLogo } from "@/components/app-logo";
import { DemoLoginButton } from "@/components/auth/demo-login-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: ClipboardList,
    title: "Job Management",
    description:
      "See what needs doing today, what is scheduled next, and which jobs still need follow-up.",
  },
  {
    icon: Users,
    title: "Customer Management",
    description:
      "Keep customer details, site notes, and job history easy to find before you head out.",
  },
  {
    icon: FileText,
    title: "Quotes",
    description:
      "Prepare quotes that stay connected to the right customer, site, and job record.",
  },
  {
    icon: Receipt,
    title: "Invoices",
    description:
      "Keep draft, sent, overdue, and paid invoices visible so nothing slips through.",
  },
  {
    icon: BarChart3,
    title: "Business Insights",
    description:
      "Understand active work, outstanding invoices, and revenue without building reports.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description:
      "Check key details on site, in the van, or back at the office on any screen size.",
  },
];

const benefits = [
  "Finish paperwork in minutes instead of chasing notes across the day.",
  "Know exactly what every job is worth before it turns into an invoice.",
  "Get invoices out faster while the job details are still fresh.",
  "Keep every customer, site, quote, and invoice in one place.",
];

const process = [
  {
    icon: Users,
    title: "Add Customers",
    description: "Create customer and site records once, then reuse them across jobs.",
  },
  {
    icon: Hammer,
    title: "Manage Jobs",
    description: "Track status, priority, schedule, and notes from first lead to paid work.",
  },
  {
    icon: Receipt,
    title: "Get Paid Faster",
    description: "Turn operational work into quotes and invoices you can follow up.",
  },
];

const mvpScope = [
  {
    title: "Operational CRM",
    description:
      "Customer records, site notes, contact details, and linked work history in one protected workspace.",
  },
  {
    title: "Job-to-cash workflow",
    description:
      "Jobs, quotes, and invoices stay connected so follow-up is visible from first call to payment.",
  },
  {
    title: "Secure SaaS foundation",
    description:
      "Supabase Auth, PostgreSQL RLS, Server Actions, validation, and tests support a production-ready MVP.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary dark:text-blue-300">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof ClipboardList;
  title: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="flex size-10 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary dark:bg-blue-950 dark:text-blue-300">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </article>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="size-3 rounded-full bg-red-400" />
            <span className="size-3 rounded-full bg-amber-400" />
            <span className="size-3 rounded-full bg-green-400" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            PipeFlow workspace
          </p>
        </div>
        <div className="grid gap-0 lg:grid-cols-[180px_1fr]">
          <aside className="hidden border-r border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-6 space-y-2">
              {["Dashboard", "Customers", "Jobs", "Quotes", "Invoices"].map(
                (item, index) => (
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium",
                      index === 0
                        ? "bg-brand-primary-light text-brand-primary dark:bg-blue-950 dark:text-blue-300"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                    key={item}
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </aside>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-blue-300">
                  Dashboard
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  Business overview
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Live view of jobs, customers, invoices, and revenue signals.
                </p>
              </div>
              <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 dark:bg-green-950/70 dark:text-green-300 dark:ring-green-900">
                Live data
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Active Jobs", "12"],
                ["Outstanding", "$8.4k"],
                ["Paid Revenue", "$24.8k"],
              ].map(([label, value]) => (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                  key={label}
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              {[
                ["Hot water repair", "Scheduled", "Mount Eden"],
                ["Leak inspection", "In progress", "Auckland Central"],
                ["Bathroom quote", "Draft", "Ponsonby"],
              ].map(([title, status, area]) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800"
                  key={title}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {area}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                    {status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur max-sm:px-3 max-sm:py-3 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 max-sm:gap-1">
          <AppLogo className="shrink-0 max-sm:[&_img]:h-8" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400 md:flex">
            <a className="hover:text-slate-950 dark:hover:text-slate-100" href="#features">
              Features
            </a>
            <a className="hover:text-slate-950 dark:hover:text-slate-100" href="#benefits">
              Benefits
            </a>
            <a className="hover:text-slate-950 dark:hover:text-slate-100" href="#how-it-works">
              How it works
            </a>
            <a className="hover:text-slate-950 dark:hover:text-slate-100" href="#scope">
              Scope
            </a>
          </nav>
          <div className="flex min-w-0 shrink-0 items-center gap-2 max-sm:gap-1">
            <Link
              className={buttonVariants({
                variant: "ghost",
                className:
                  "h-10 shrink-0 whitespace-nowrap px-3 max-sm:h-11 max-sm:px-2 max-sm:text-xs",
              })}
              href="/login"
            >
              Sign In
            </Link>
            <Link
              className={buttonVariants({
                className:
                  "h-10 shrink-0 whitespace-nowrap px-4 max-sm:h-11 max-sm:px-2 max-sm:text-xs",
              })}
              href="/signup"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-5 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-brand-primary-light px-3 py-1 text-sm font-semibold text-brand-primary dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                <Sparkles aria-hidden="true" className="size-4" />
                Built for plumbing businesses
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-6xl">
                Spend less time on paperwork. More time on the tools.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
                PipeFlow helps plumbing businesses manage customers, jobs,
                quotes and invoices from one simple workspace.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className={buttonVariants({
                    className: "h-12 w-full gap-2 px-6 text-base sm:w-auto",
                  })}
                  href="/signup"
                >
                  Start Free Trial
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  className={buttonVariants({
                    variant: "outline",
                    className: "h-12 w-full px-6 text-base sm:w-auto",
                  })}
                  href="/login"
                >
                  Sign In
                </Link>
                <DemoLoginButton
                  className="h-12 w-full px-6 text-base sm:w-auto"
                  formClassName="w-full sm:w-auto"
                  label="Explore Demo"
                  variant="secondary"
                />
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No sign-up required. Explore a workspace populated with realistic
                New Zealand trade-business data.
              </p>
              <div className="mt-8 grid gap-3 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-3">
                {["Less admin", "Clear job records", "Faster invoicing"].map(
                  (item) => (
                    <div className="flex items-center gap-2" key={item}>
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4 text-green-600 dark:text-green-400"
                      />
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section
          className="border-y border-slate-200 bg-slate-50 px-5 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-20"
          id="features"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Features"
              title="Practical tools for the work plumbers do every day."
              description="PipeFlow keeps customers, jobs, quotes, invoices, and business numbers connected so admin does not slow the team down."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20" id="benefits">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary dark:text-blue-300">
                Business value
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
                Spend less time sorting admin after hours.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                PipeFlow is designed around real plumbing operations: changing
                schedules, customer details, quotes, invoices, and follow-up all
                competing for attention.
              </p>
            </div>
            <div className="grid gap-3">
              {benefits.map((benefit) => (
                <div
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  key={benefit}
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400"
                  />
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-y border-slate-200 bg-slate-50 px-5 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-20"
          id="how-it-works"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="How it works"
              title="From first call to final invoice."
              description="Add the customer, manage the job, and keep quote and invoice follow-up visible until the work is paid."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {process.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                    key={step.title}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary dark:bg-blue-950 dark:text-blue-300">
                        <Icon aria-hidden="true" className="size-5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-slate-100">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary dark:text-blue-300">
              Portfolio MVP
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
              Built around real field service workflows.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
              PipeFlow is scoped as a realistic SaaS foundation for plumbing,
              electrical, HVAC, and other trade businesses that need customer,
              job, quote, and invoice visibility.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Authenticated workspace",
                "Live Supabase data",
                "Mobile-friendly dashboard",
              ].map((item) => (
                <div
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-y border-slate-200 bg-slate-50 px-5 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-20"
          id="scope"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="What this demo includes"
              title="A complete MVP slice, not a static mockup."
              description="The portfolio build covers the core product surface a client would expect before extending into payments, portals, or advanced automation."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {mvpScope.map((item) => (
                <article
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  key={item.title}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary dark:bg-blue-950 dark:text-blue-300">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl rounded-2xl bg-slate-950 p-8 text-white shadow-md dark:bg-slate-900 sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Ready to simplify your plumbing business?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  Bring customers, jobs, quotes, invoices, and follow-up into one
                  calm workspace built for plumbers.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  className={buttonVariants({
                    className: "h-12 px-6 text-base",
                  })}
                  href="/signup"
                >
                  Start Free Trial
                </Link>
                <DemoLoginButton
                  className="h-12 px-6 text-base"
                  formClassName="w-full sm:w-auto"
                  label="Open Demo Workspace"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-5 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <AppLogo />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Practical business management for plumbing teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-950 dark:text-slate-100">
              Product
            </span>
            <a className="hover:text-slate-950 dark:hover:text-slate-100" href="#features">
              Features
            </a>
            <a className="hover:text-slate-950 dark:hover:text-slate-100" href="#benefits">
              Demo
            </a>
            <a className="hover:text-slate-950 dark:hover:text-slate-100" href="#scope">
              Scope
            </a>
            <Link className="hover:text-slate-950 dark:hover:text-slate-100" href="/login">
              Sign In
            </Link>
            <Link className="hover:text-slate-950 dark:hover:text-slate-100" href="/signup">
              Contact
            </Link>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2026 PipeFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
