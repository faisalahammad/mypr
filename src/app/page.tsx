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
  Sparkles,
  Terminal,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    commits: 4,
    color: "hsl(213 94% 58%)",
  },
  {
    repo: "vercel/next.js",
    title: "Improve error boundary fallback for async server components",
    additions: 210,
    deletions: 45,
    commits: 6,
    color: "hsl(262 83% 58%)",
  },
  {
    repo: "pods-framework/pods",
    title: "Add support for repeatable field groups in REST API",
    additions: 133,
    deletions: 22,
    commits: 3,
    color: "hsl(152 69% 45%)",
  },
];

function BrowserMockup() {
  return (
    <div className="mt-12 mx-auto max-w-2xl rounded-2xl gradient-border bg-card shadow-xl overflow-hidden">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-secondary/60">
        <span className="h-3 w-3 rounded-full bg-[hsl(0,84%,60%,0.6)]" />
        <span className="h-3 w-3 rounded-full bg-[hsl(45,90%,55%,0.6)]" />
        <span className="h-3 w-3 rounded-full bg-[hsl(152,69%,45%,0.6)]" />
        <div className="ml-4 flex-1 rounded-md bg-secondary/80 px-3 py-1">
          <span className="font-mono text-[11px] text-muted-foreground">
            mypr.pro.bd/faisalahammad
          </span>
        </div>
      </div>

      {/* PR cards */}
      <div className="p-5 space-y-3">
        {MOCK_BROWSER_PRS.map((pr) => (
          <div
            key={pr.repo}
            className="rounded-xl border border-border p-4 text-left glow-card relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
              style={{ background: pr.color }}
            />
            <div className="pl-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                {pr.repo}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {pr.title}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-mono text-xs text-[hsl(152,69%,45%)]">
                  +{pr.additions}
                </span>
                <span className="font-mono text-xs text-destructive">
                  −{pr.deletions}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {pr.commits} commits
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Download button inside mockup */}
      <div className="px-6 pb-5 flex justify-center">
        <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg gradient-bg text-primary-foreground border-0 animate-gentle-pulse`}>
          <Download className="h-4 w-4" />
          Download PNG
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

// Force dynamic rendering - don't statically generate during build
export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: { code?: string } }) {
  // DEBUG: Handle OAuth callback if code is present
  if (searchParams.code) {
    console.log('DEBUG: Received code on homepage:', searchParams.code);
    // Redirect to the proper callback handler
    return redirect(`/api/auth/callback?code=${searchParams.code}`);
  }

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
        {/* Exact structure from Lovable source (lC component) */}
        <section className="relative flex min-h-screen items-center overflow-hidden">
          {/* Blob backgrounds — exact positions/sizes/colours from source */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[hsl(262,83%,58%,0.08)] blur-3xl animate-blob" />
            <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-[hsl(330,80%,60%,0.08)] blur-3xl animate-blob-delay-2" />
            <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-[hsl(172,66%,50%,0.06)] blur-3xl animate-blob-delay-4" />
          </div>

          <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16">

            {/* Left: copy + CTA */}
            <div className="flex flex-col justify-center">

              {/* Badge — exact from source */}
              <div className="inline-flex items-center gap-2 w-fit rounded-full border border-border bg-card px-4 py-1.5 mb-6 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-xs text-muted-foreground">
                  Built for developers who ship
                </span>
              </div>

              {/* Headline — "Login with GitHub, " plain + gradient-text span */}
              <h1 className="font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] xl:leading-[1.1]">
                Login with GitHub,{" "}
                <span className="gradient-text">
                  start building your timeline.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
                Every merged PR you have ever shipped, in one place. Documented, shareable, and connected to the open source community.
              </p>

              {/* Terminal block — exact from source */}
              <div className="mt-6 rounded-lg border border-border bg-foreground/[0.03] p-3 max-w-md font-mono text-xs">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>terminal</span>
                </div>
                <div className="text-foreground">
                  <span className="text-primary">$</span>{" "}
                  mypr timeline{" "}
                  <span className="text-[hsl(152,69%,45%)]">--user</span>{" "}
                  faisalahammad
                  <span className="animate-cursor ml-0.5 text-primary">▊</span>
                </div>
              </div>

              {/* CTA — gradient-bg button exact from source */}
              <div className="mt-8 flex items-center gap-4">
                <a
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "gap-2 gradient-bg text-primary-foreground border-0 hover:opacity-90 rounded-xl px-7 shadow-lg shadow-[hsl(262,83%,58%,0.25)]"
                  )}
                >
                  <GitPullRequestArrow className="h-5 w-5" />
                  Get Started Free
                  <span aria-hidden="true" className="ml-0.5">→</span>
                </a>
                <span className="text-xs text-muted-foreground font-mono">
                  No setup required
                </span>
              </div>

              {/* Stats — font-display values, exact from source */}
              <div className="mt-10 flex items-center gap-8">
                {[
                  { value: "12K+", label: "PRs tracked" },
                  { value: "3.2K", label: "Developers" },
                  { value: "800+", label: "Repos" },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-xl font-bold text-foreground font-heading sm:text-2xl xl:text-3xl">
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: PR cards — desktop only */}
            <div className="hidden lg:block">
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
                    <p className={`text-4xl sm:text-5xl font-bold ${accent}`}>{value}</p>
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
              <div className="mb-16 text-center">
                <Badge className="gradient-bg text-primary-foreground border-0 font-mono text-xs px-3 py-1 mb-5 inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  WHO IS IT FOR
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight lg:text-4xl xl:text-5xl">
                  Built for developers who{" "}
                  <span className="gradient-text">ship.</span>
                </h2>
              </div>
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
              <div className="mb-16 text-center">
                <Badge className="gradient-bg text-primary-foreground border-0 font-mono text-xs px-3 py-1 mb-5 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  FEATURES
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight lg:text-4xl xl:text-5xl">
                  Everything your timeline{" "}
                  <span className="gradient-text">needs.</span>
                </h2>
              </div>
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
        <section className="py-28 bg-secondary/80 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-20 right-10 w-60 h-60 rounded-full bg-[hsl(262,83%,58%,0.05)] blur-3xl" />
            <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[hsl(330,80%,60%,0.05)] blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <FadeUp>
              <Badge className="gradient-bg text-primary-foreground border-0 font-mono text-xs px-3 py-1 inline-flex items-center gap-1">
                <Download className="h-3 w-3 mr-1" />
                SHARE
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-5">
                Share your work{" "}
                <span className="gradient-text">in one click</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-md mx-auto">
                Download your PR timeline as a beautiful image and share it on
                LinkedIn, Twitter, or anywhere.
              </p>
            </FadeUp>
            <FadeUp delay={0.2}>
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
                <Badge className="gradient-bg text-primary-foreground border-0 font-mono text-xs px-3 py-1 inline-flex items-center gap-1">
                  <GitPullRequestArrow className="h-3 w-3" />
                  GET STARTED
                </Badge>
                <h2 className="text-4xl font-bold tracking-tight lg:text-6xl xl:text-7xl">
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
                  Login with GitHub
                  <span aria-hidden="true" className="ml-0.5">→</span>
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
