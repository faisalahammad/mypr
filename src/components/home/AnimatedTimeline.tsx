"use client";

import { GitMerge } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PRCard {
  repo: string;
  title: string;
  additions: number;
  deletions: number;
  commits: number;
  user: string;
  /** hsl string, e.g. "hsl(213 94% 58%)" */
  color: string;
}

// ─── Mock data (exact from Lovable source) ────────────────────────────────────

const MOCK_PRS: PRCard[] = [
  {
    repo: "wordpress/gutenberg",
    title: "Fix taxonomy query when meta_query is empty",
    additions: 84,
    deletions: 12,
    commits: 4,
    user: "faisalahammad",
    color: "hsl(213 94% 58%)",
  },
  {
    repo: "vercel/next.js",
    title: "Improve error boundary fallback for async server components",
    additions: 210,
    deletions: 45,
    commits: 6,
    user: "tanzid",
    color: "hsl(262 83% 58%)",
  },
  {
    repo: "pods-framework/pods",
    title: "Add support for repeatable field groups in REST API",
    additions: 133,
    deletions: 22,
    commits: 3,
    user: "mdrakib",
    color: "hsl(152 69% 45%)",
  },
  {
    repo: "nicehash/NiceHashQuickMiner",
    title: "Handle null response from pool stats endpoint",
    additions: 56,
    deletions: 8,
    commits: 2,
    user: "sabbir",
    color: "hsl(25 95% 60%)",
  },
  {
    repo: "roots/sage",
    title: "Update Blade directive registration for Laravel 11 compatibility",
    additions: 44,
    deletions: 17,
    commits: 5,
    user: "nahid",
    color: "hsl(330 80% 60%)",
  },
];

function initials(user: string) {
  return user.slice(0, 2).toUpperCase();
}

// ─── PR Card (exact Lovable source structure) ─────────────────────────────────

function Card({ pr, index }: { pr: PRCard; index: number }) {
  return (
    <div
      className={`animate-card-drift-${index + 1} glow-card rounded-xl border border-border bg-card p-5 shadow-sm relative overflow-hidden`}
    >
      {/* 1px colour stripe at top (exact from source: h-0.5, absolute) */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: pr.color }}
      />

      {/* Repo */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-medium text-muted-foreground">
          {pr.repo}
        </span>
      </div>

      {/* Title */}
      <p className="mt-1.5 text-sm font-semibold text-foreground leading-snug">
        {pr.title}
      </p>

      {/* Stats */}
      <div className="mt-2.5 flex items-center gap-3">
        <span className="font-mono text-xs">
          <span className="text-[hsl(152,69%,45%)]">+{pr.additions}</span>{" "}
          <span className="text-destructive">−{pr.deletions}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          · {pr.commits} commits
        </span>
      </div>

      {/* Footer: merged badge + user */}
      <div className="mt-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-1 rounded-full bg-[hsl(152,69%,45%)] px-2.5 py-0.5 font-mono text-[10px] text-white">
          <GitMerge className="h-3 w-3" />
          Merged
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {pr.user}
          </span>
          {/* Avatar colour driven by card colour, exact from source */}
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold text-white"
            style={{ background: pr.color }}
          >
            {initials(pr.user)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Animated Timeline ────────────────────────────────────────────────────────
// Animation is pure CSS (card-drift-up keyframe + staggered delays).
// No Framer Motion loop — matches Lovable source exactly.

export default function AnimatedTimeline() {
  return (
    <div className="flex flex-col gap-3">
      {MOCK_PRS.map((pr, i) => (
        <Card key={pr.repo} pr={pr} index={i} />
      ))}
    </div>
  );
}
