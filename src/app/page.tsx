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
  GitPullRequest,
  Lock,
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
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900">
        <span className="text-xs font-bold text-white">M</span>
      </div>
      <span className="text-sm font-semibold tracking-tight text-gray-900">
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
      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-2xl shadow-gray-300/50">
        {/* Chrome bar */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex flex-1 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-400">
            <Lock className="h-3 w-3 shrink-0" />
            <span>mypr.pro.bd/@username</span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                @username
              </p>
              <p className="text-xs text-gray-400">12 merged PRs across 5 repos</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center">
              US
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {MOCK_BROWSER_PRS.map((pr) => (
              <div
                key={pr.repo}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{pr.repo}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Merged
                  </span>
                </div>
                <p className="truncate text-sm font-medium text-gray-800">
                  {pr.title}
                </p>
                <div className="mt-1 text-xs text-gray-400">
                  <span className="font-medium text-green-600">
                    +{pr.additions}
                  </span>{" "}
                  <span className="font-medium text-red-400">
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
          <span className="absolute -inset-1 animate-ping rounded-lg bg-gray-900 opacity-10" />
          <div className="relative flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </div>
        </div>
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

      <main className="overflow-x-hidden bg-white text-gray-900">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative flex min-h-screen items-center border-b border-gray-100">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-20">

            {/* Left: copy + CTA */}
            <div className="flex flex-col gap-7">
              <h1 className="font-heading text-5xl font-bold leading-[1.08] tracking-tight text-gray-900 lg:text-6xl xl:text-7xl">
                Login with GitHub,{" "}
                <br className="hidden sm:block" />
                start building{" "}
                <br className="hidden sm:block" />
                your timeline.
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-gray-500">
                Every merged PR you have ever shipped, in one place. Documented,
                shareable, and connected to the open source community that built
                it with you.
              </p>
              <div>
                <a
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "gap-2.5 rounded-xl bg-gray-900 px-7 text-white hover:bg-gray-700",
                  )}
                >
                  <GitHubIcon className="h-5 w-5" />
                  Login with GitHub
                </a>
              </div>
            </div>

            {/* Right: animated timeline — desktop only */}
            <div className="hidden md:block">
              <AnimatedTimeline />
            </div>
          </div>
        </section>

        {/* ── Who Is It For ─────────────────────────────────────────────────── */}
        <section className="border-b border-gray-100 py-28">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <p className="mb-14 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Who it&apos;s for
              </p>
            </FadeUp>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
              {[
                {
                  icon: <Code2 className="h-5 w-5" />,
                  label: "Open source contributors",
                  body: "You ship PRs to public repos and want a single place to show what you have built.",
                  delay: 0,
                },
                {
                  icon: <BookOpen className="h-5 w-5" />,
                  label: "Developers documenting their work",
                  body: "No more losing track of contributions across dozens of repos. Your timeline captures all of it.",
                  delay: 0.1,
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  label: "Community-driven builders",
                  body: "Follow other contributors, see what they are working on, and stay connected to the projects you care about.",
                  delay: 0.2,
                },
              ].map(({ icon, label, body, delay }) => (
                <FadeUp key={label} delay={delay}>
                  <div className="flex flex-col gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                      {icon}
                    </div>
                    <div>
                      <p className="mb-1.5 text-base font-semibold text-gray-900">
                        {label}
                      </p>
                      <p className="text-sm leading-relaxed text-gray-500">
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
        <section className="border-b border-gray-100 py-28">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <p className="mb-14 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Features
              </p>
            </FadeUp>
            <div className="grid grid-cols-1 gap-px border border-gray-200 bg-gray-200 sm:grid-cols-2">
              {[
                {
                  icon: <Activity className="h-5 w-5" />,
                  name: "Timeline Feed",
                  body: "Your merged PRs ordered by date, filtered by repo. See your full contribution history at a glance.",
                  delay: 0,
                },
                {
                  icon: <Filter className="h-5 w-5" />,
                  name: "Repo Filter",
                  body: "Choose exactly which repos appear on your public timeline. Keep it focused on the work that matters to you.",
                  delay: 0.1,
                },
                {
                  icon: <GitPullRequest className="h-5 w-5" />,
                  name: "PR Card with Stats",
                  body: "Every PR shows its title, body summary, additions, deletions, and commit count. The full picture in one card.",
                  delay: 0.2,
                },
                {
                  icon: <UserPlus className="h-5 w-5" />,
                  name: "Follow System",
                  body: "Follow contributors inside the app. Your home feed shows their merged PRs as they happen, synced from GitHub.",
                  delay: 0.3,
                },
              ].map(({ icon, name, body, delay }) => (
                <FadeUp key={name} delay={delay}>
                  <div className="flex flex-col gap-4 bg-white p-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                      {icon}
                    </div>
                    <div>
                      <p className="mb-1.5 text-base font-semibold text-gray-900">
                        {name}
                      </p>
                      <p className="text-sm leading-relaxed text-gray-500">
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
        <section className="border-b border-gray-100 bg-gray-50 py-28">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <div className="mb-14 text-center">
                <h2 className="font-heading mb-4 text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
                  Share your work in one click.
                </h2>
                <p className="mx-auto max-w-lg text-base leading-relaxed text-gray-500">
                  Download your timeline or any PR card as a PNG. Built for
                  sharing on LinkedIn, Twitter, or anywhere you want to show
                  your work.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <BrowserMockup />
            </FadeUp>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="bg-zinc-50 py-32">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <div className="flex flex-col items-center gap-7 text-center">
                <h2 className="font-heading text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl">
                  Your contributions deserve
                  <br className="hidden sm:block" /> a better home.
                </h2>
                <p className="max-w-md text-base leading-relaxed text-gray-500">
                  Connect your GitHub account and your timeline is ready in
                  under a minute.
                </p>
                <a
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "gap-2.5 rounded-xl bg-gray-900 px-7 text-white hover:bg-gray-700",
                  )}
                >
                  <GitHubIcon className="h-5 w-5" />
                  Login with GitHub
                </a>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-gray-100 py-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
            <div className="flex flex-col gap-1">
              <LogoMark />
              <p className="mt-1 text-xs text-gray-400">
                Built for open source contributors. Hosted on Vercel.
              </p>
            </div>
            <a
              href="https://github.com/faisalahammad/mypr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 transition-colors hover:text-gray-700"
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
