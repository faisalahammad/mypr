"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { GitPullRequestArrow } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PRCard {
  repo: string;
  title: string;
  additions: number;
  deletions: number;
  commits: number;
  username: string;
  initials: string;
  avatarBg: string;
  topBorder: string;
}

// ─── Mock data (matches screenshot) ──────────────────────────────────────────

const MOCK_PRS: PRCard[] = [
  {
    repo: "wordpress/gutenberg",
    title: "Fix taxonomy query when meta_query is empty",
    additions: 84,
    deletions: 12,
    commits: 4,
    username: "faisalahammad",
    initials: "FA",
    avatarBg: "bg-[hsl(213,94%,58%)]",
    topBorder: "border-t-[hsl(213,94%,58%)]",
  },
  {
    repo: "vercel/next.js",
    title: "Improve error boundary fallback for async server components",
    additions: 210,
    deletions: 45,
    commits: 6,
    username: "tanzid",
    initials: "TA",
    avatarBg: "bg-primary",
    topBorder: "border-t-primary",
  },
  {
    repo: "pods-framework/pods",
    title: "Add support for repeatable field groups in REST API",
    additions: 133,
    deletions: 22,
    commits: 3,
    username: "mdrakib",
    initials: "MD",
    avatarBg: "bg-[hsl(152,69%,45%)]",
    topBorder: "border-t-[hsl(152,69%,45%)]",
  },
  {
    repo: "nicehash/NiceHashQuickMiner",
    title: "Handle null response from pool stats endpoint",
    additions: 56,
    deletions: 8,
    commits: 2,
    username: "sabbir",
    initials: "SA",
    avatarBg: "bg-[hsl(25,95%,60%)]",
    topBorder: "border-t-[hsl(25,95%,60%)]",
  },
  {
    repo: "roots/sage",
    title: "Update Blade directive registration for Laravel 11 compatibility",
    additions: 44,
    deletions: 17,
    commits: 5,
    username: "nahid",
    initials: "NA",
    avatarBg: "bg-[hsl(330,80%,60%)]",
    topBorder: "border-t-[hsl(330,80%,60%)]",
  },
];

// ─── Animation timing (ms) ────────────────────────────────────────────────────

const CARD_DURATION = 800;
const STAGGER = 180;
const HOLD = 4000;
const EXIT = 800;
const ALL_IN = (MOCK_PRS.length - 1) * STAGGER + CARD_DURATION;

// ─── Framer Motion variants ───────────────────────────────────────────────────

const containerVariants: Variants = {
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER / 1000 },
  },
  hidden: { opacity: 0 },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: CARD_DURATION / 1000, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── PR Card ─────────────────────────────────────────────────────────────────

function Card({ pr }: { pr: PRCard }) {
  return (
    <div
      className={`rounded-xl border border-border border-t-2 bg-card px-4 py-3.5 shadow-sm ${pr.topBorder}`}
    >
      {/* Repo */}
      <p className="mb-1.5 font-mono text-xs text-muted-foreground">
        {pr.repo}
      </p>

      {/* Title */}
      <p className="mb-2 text-sm font-semibold leading-snug text-foreground">
        {pr.title}
      </p>

      {/* Stats */}
      <p className="mb-3 font-mono text-xs text-muted-foreground">
        <span className="font-semibold text-[hsl(152,69%,45%)]">
          +{pr.additions}
        </span>{" "}
        <span className="font-semibold text-destructive">-{pr.deletions}</span>
        {"  ·  "}
        {pr.commits} commits
      </p>

      {/* Footer: merged badge + user */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-[hsl(152,69%,45%)] px-2.5 py-1 text-xs font-medium text-white">
          <GitPullRequestArrow className="h-3 w-3" />
          Merged
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {pr.username}
          </span>
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[9px] font-bold text-white ${pr.avatarBg}`}
          >
            {pr.initials}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Animated Timeline ────────────────────────────────────────────────────────

export default function AnimatedTimeline() {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;

    if (phase === "in") {
      const t = setTimeout(() => setPhase("hold"), ALL_IN);
      return () => clearTimeout(t);
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("out"), HOLD);
      return () => clearTimeout(t);
    }
    if (phase === "out") {
      const t = setTimeout(() => {
        setCycleKey((k) => k + 1);
        setPhase("in");
      }, EXIT);
      return () => clearTimeout(t);
    }
  }, [phase, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="flex flex-col gap-3">
        {MOCK_PRS.map((pr) => (
          <Card key={pr.repo} pr={pr} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      key={cycleKey}
      variants={containerVariants}
      initial="hidden"
      animate={phase === "out" ? "hidden" : "visible"}
      transition={
        phase === "out"
          ? { duration: EXIT / 1000, ease: "easeIn" }
          : undefined
      }
      className="flex flex-col gap-3"
    >
      {MOCK_PRS.map((pr) => (
        <motion.div key={pr.repo} variants={cardVariants}>
          <Card pr={pr} />
        </motion.div>
      ))}
    </motion.div>
  );
}
