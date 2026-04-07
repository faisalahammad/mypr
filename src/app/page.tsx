import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity,
  BookOpen,
  Code2,
  Download,
  Filter,
  GitPullRequestArrow,
  Lock,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import FloatingNav from "@/components/home/FloatingNav";
import AnimatedTimeline from "@/components/home/AnimatedTimeline";
import { FadeUp } from "@/components/home/FadeUp";

// ─── Shared ───────────────────────────────────────────────────────────────────

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LogoMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
        <span className="font-mono text-xs font-bold text-primary-foreground">
          M
        </span>
      </div>
      <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
        mypr.pro.bd
      </span>
    </div>
  );
}

// ─── Browser Mockup ───────────────────────────────────────────────────────────

const MOCK_BROWSER_PRS = [
  {
    repo: "wordpress/gutenberg",
    title: "Fix taxonomy query when meta_query is empty",
    additions: 84,
    deletions: 12,
  },
  {
    repo: "vercel/next.js",
    title: "Add custom headers in middleware response",
    additions: 142,
    deletions: 31,
  },
  {
    repo: "roots/sage",
    title: "Refactor asset pipeline to Vite 5.x format",
    additions: 203,
    deletions: 87,
  },
];

function BrowserMockup() {
  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="absolute -inset-4 rounded-2xl bg-primary/10 blur-2xl" />

      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/5">
        {/* Chrome bar */}
        <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(45,90%,55%)]/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(152,69%,45%)]/70" />
          </div>
          <div className="flex flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            <span>mypr.pro.bd/@username</span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-background p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">
                @username
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                12 merged PRs across 5 repos
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
              US
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {MOCK_BROWSER_PRS.map((pr) => (
              <div
                key={pr.repo}
                className="rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {pr.repo}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs font-medium text-[hsl(152,69%,45%)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(152,69%,45%)]" />
                    Merged
                  </span>
                </div>
                <p className="truncate text-sm font-medium text-foreground">
                  {pr.title}
                </p>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  <span className="font-semibold text-[hsl(152,69%,45%)]">
                    +{pr.additions}
                  </span>{" "}
                  <span className="font-semibold text-destructive">
                    −{pr.deletions}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pulsing download button */}
      <div className="absolute bottom-4 right-4">
        <div className="relative">
          <span className="absolute -inset-1 animate-ping rounded-lg bg-primary opacity-20" />
          <div className="relative flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-mono text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30">
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Marquee Strip ────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  "42,000+ PRs documented",
  "Timeline downloads as PNG",
  "Public profile for every developer",
  "Follow your favourite contributors",
  "Synced from GitHub automatically",
  "No AI — deterministic and fast",
];

function MarqueeStrip() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden border-y border-border bg-muted/50 py-3">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "marquee 30s linear infinite" }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex items-center font-mono text-xs font-medium tracking-wide text-muted-foreground"
          >
            <span className="mx-6 text-primary">◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  return (
    <>
      <FloatingNav />

      <main className="overflow-x-hidden bg-background text-foreground">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative flex min-h-screen items-center">
          {/* Subtle background glow */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[140px]"
              style={{ animation: "glow-pulse 7s ease-in-out infinite" }}
            />
            <div
              className="absolute -right-32 top-1/4 h-[400px] w-[400px] rounded-full bg-[hsl(330,80%,60%)]/6 blur-[120px]"
              style={{ animation: "glow-pulse 9s ease-in-out infinite 1.5s" }}
            />
          </div>

          <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-24 lg:grid-cols-2 lg:gap-24">

            {/* Left: copy + CTA */}
            <div className="flex flex-col gap-7">

              {/* Badge */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-xs font-medium text-foreground">
                  Built for developers who ship
                </span>
              </div>

              {/* Headline — 3 lines, exact colours from screenshot */}
              <h1 className="text-5xl font-bold leading-[1.08] tracking-tight lg:text-[3.5rem] lg:leading-[1.1]">
                Login with GitHub,
                <br />
                <span className="bg-gradient-to-r from-[hsl(262,83%,58%)] to-[hsl(330,80%,60%)] bg-clip-text text-transparent">
                  start building your
                </span>
                <br />
                <span className="text-[hsl(25,95%,60%)]">timeline.</span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-[480px] text-base leading-relaxed text-muted-foreground">
                Every merged PR you have ever shipped, in one place. Documented,
                shareable, and connected to the open source community.
              </p>

              {/* Terminal code block */}
              <div className="max-w-[420px] rounded-xl border border-border bg-secondary/60 px-4 py-3">
                <p className="mb-1.5 font-mono text-[11px] text-muted-foreground">
                  &gt;_ terminal
                </p>
                <p className="font-mono text-sm">
                  <span className="text-[hsl(152,69%,45%)]">$ </span>
                  <span className="text-foreground">mypr timeline </span>
                  <span className="text-[hsl(213,94%,58%)]">--user </span>
                  <span className="text-foreground">faisalahammad</span>
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "gap-2.5 rounded-xl bg-primary px-7 text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
                  )}
                >
                  <GitPullRequestArrow className="h-5 w-5" />
                  Get Started Free
                  <span aria-hidden="true">→</span>
                </a>
                <span className="font-mono text-sm text-muted-foreground">
                  No setup required
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 pt-2">
                {[
                  { value: "12K+", label: "PRs tracked" },
                  { value: "3.2K", label: "Developers" },
                  { value: "800+", label: "Repos" },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-2xl font-bold text-foreground">
                      {value}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: animated PR cards — desktop only */}
            <div className="hidden md:block">
              <AnimatedTimeline />
            </div>
          </div>
        </section>

        {/* ── Marquee ───────────────────────────────────────────────────────── */}
        <MarqueeStrip />

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <section className="border-b border-border py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {[
                {
                  value: "42k+",
                  label: "PRs documented",
                  accent: "text-primary",
                },
                {
                  value: "100%",
                  label: "From your GitHub — no manual entry",
                  accent: "text-[hsl(152,69%,45%)]",
                },
                {
                  value: "1 min",
                  label: "From signup to public timeline",
                  accent: "text-[hsl(25,95%,60%)]",
                },
              ].map(({ value, label, accent }) => (
                <FadeUp key={label}>
                  <div className="flex flex-col gap-2">
                    <p className={`text-5xl font-bold ${accent}`}>{value}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {label}
                    </p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who Is It For ─────────────────────────────────────────────────── */}
        <section className="border-b border-border py-28">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                Who it&apos;s for
              </p>
              <h2 className="mb-16 text-3xl font-bold tracking-tight lg:text-4xl">
                Built for developers who{" "}
                <span className="text-primary">ship.</span>
              </h2>
            </FadeUp>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  icon: <Code2 className="h-5 w-5" />,
                  label: "Open source contributors",
                  body: "You ship PRs to public repos and want a single place to show what you have built.",
                  topBorder: "border-t-primary",
                  iconBg: "bg-primary/10 text-primary",
                  delay: 0,
                },
                {
                  icon: <BookOpen className="h-5 w-5" />,
                  label: "Developers documenting their work",
                  body: "No more losing track of contributions across dozens of repos. Your timeline captures all of it.",
                  topBorder: "border-t-[hsl(152,69%,45%)]",
                  iconBg: "bg-[hsl(152,69%,45%)]/10 text-[hsl(152,69%,45%)]",
                  delay: 0.1,
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  label: "Community-driven builders",
                  body: "Follow other contributors, see what they are working on, and stay connected to projects you care about.",
                  topBorder: "border-t-[hsl(25,95%,60%)]",
                  iconBg: "bg-[hsl(25,95%,60%)]/10 text-[hsl(25,95%,60%)]",
                  delay: 0.2,
                },
              ].map(({ icon, label, body, topBorder, iconBg, delay }) => (
                <FadeUp key={label} delay={delay}>
                  <div
                    className={`flex h-full flex-col gap-5 rounded-xl border-t-2 border border-border bg-card p-6 shadow-sm ${topBorder}`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
                    >
                      {icon}
                    </div>
                    <div>
                      <p className="mb-2 text-base font-semibold text-foreground">
                        {label}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section className="border-b border-border py-28">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                Features
              </p>
              <h2 className="mb-16 text-3xl font-bold tracking-tight lg:text-4xl">
                Everything your timeline{" "}
                <span className="text-primary">needs.</span>
              </h2>
            </FadeUp>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  icon: <Activity className="h-6 w-6" />,
                  name: "Timeline Feed",
                  body: "Your merged PRs ordered by date, filtered by repo. See your full contribution history at a glance.",
                  accent: "text-primary",
                  iconBg: "bg-primary/10",
                  delay: 0,
                },
                {
                  icon: <Filter className="h-6 w-6" />,
                  name: "Repo Filter",
                  body: "Choose exactly which repos appear on your public timeline. Keep it focused on the work that matters.",
                  accent: "text-[hsl(213,94%,58%)]",
                  iconBg: "bg-[hsl(213,94%,58%)]/10",
                  delay: 0.1,
                },
                {
                  icon: <GitPullRequestArrow className="h-6 w-6" />,
                  name: "PR Card with Stats",
                  body: "Every PR shows its title, body summary, additions, deletions, and commit count in one sharp card.",
                  accent: "text-[hsl(152,69%,45%)]",
                  iconBg: "bg-[hsl(152,69%,45%)]/10",
                  delay: 0.2,
                },
                {
                  icon: <UserPlus className="h-6 w-6" />,
                  name: "Follow System",
                  body: "Follow contributors inside the app. Your home feed shows their merged PRs as they happen, synced from GitHub.",
                  accent: "text-[hsl(25,95%,60%)]",
                  iconBg: "bg-[hsl(25,95%,60%)]/10",
                  delay: 0.3,
                },
              ].map(({ icon, name, body, accent, iconBg, delay }) => (
                <FadeUp key={name} delay={delay}>
                  <div className="group flex h-full flex-col gap-5 rounded-xl border border-border bg-card p-7 shadow-sm transition-shadow duration-300 hover:shadow-md">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${accent}`}
                    >
                      {icon}
                    </div>
                    <div>
                      <p className="mb-2 text-base font-semibold text-foreground">
                        {name}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── Screenshot Download Demo ──────────────────────────────────────── */}
        <section className="border-b border-border bg-muted/40 py-28">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <div className="mb-16 text-center">
                <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                  Share your work
                </p>
                <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">
                  Download as PNG.{" "}
                  <span className="text-primary">Share anywhere.</span>
                </h2>
                <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
                  Export your timeline or any PR card as a beautiful PNG image.
                  Built for sharing on LinkedIn, Twitter, or anywhere you want
                  to show your work.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <BrowserMockup />
            </FadeUp>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-36">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div
              className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]"
              style={{ animation: "glow-pulse 5s ease-in-out infinite" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[hsl(330,80%,60%)]/5" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6">
            <FadeUp>
              <div className="flex flex-col items-center gap-8 text-center">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                  Get started
                </p>
                <h2 className="text-4xl font-bold tracking-tight lg:text-6xl">
                  Your contributions
                  <br />
                  deserve a{" "}
                  <span className="bg-gradient-to-r from-[hsl(262,83%,58%)] to-[hsl(330,80%,60%)] bg-clip-text text-transparent">
                    better home.
                  </span>
                </h2>
                <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                  Connect your GitHub account and your timeline is live in under
                  a minute. No setup, no configuration.
                </p>
                <a
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "gap-2.5 rounded-xl bg-primary px-8 py-4 text-lg text-primary-foreground shadow-2xl shadow-primary/30 hover:bg-primary/90"
                  )}
                >
                  <GitHubIcon className="h-5 w-5" />
                  Login with GitHub — it&apos;s free
                </a>
                <p className="font-mono text-xs text-muted-foreground">
                  No credit card · Public repos only · Delete anytime
                </p>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-border bg-muted/40 py-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
            <div className="flex flex-col gap-1">
              <LogoMark />
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Built for open source contributors. Hosted on Vercel.
              </p>
            </div>
            <a
              href="https://github.com/faisalahammad/mypr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub repository"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
