"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { GitPullRequest } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PRCard {
  repo: string;
  title: string;
  additions: number;
  deletions: number;
  commits: number;
  summary: string;
  username: string;
  initials: string;
  avatarColor: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PRS: PRCard[] = [
  {
    repo: "wordpress/gutenberg",
    title: "Fix taxonomy query when meta_query is empty",
    additions: 84,
    deletions: 12,
    commits: 4,
    summary:
      "Prevents fatal when post meta query is applied without a base taxonomy query. Adds regression test for the edge case.",
    username: "faisal_a",
    initials: "FA",
    avatarColor: "bg-primary",
  },
  {
    repo: "vercel/next.js",
    title: "Add support for custom headers in middleware response",
    additions: 142,
    deletions: 31,
    commits: 6,
    summary:
      "Extends the middleware response API to allow setting arbitrary response headers before forwarding to the origin.",
    username: "tanvir_d",
    initials: "TD",
    avatarColor: "bg-sky-500",
  },
  {
    repo: "roots/sage",
    title: "Refactor asset pipeline to use Vite 5.x manifest format",
    additions: 203,
    deletions: 87,
    commits: 9,
    summary:
      "Migrates the manifest reader from the legacy array format to the flat object format introduced in Vite 5.",
    username: "linh_n",
    initials: "LN",
    avatarColor: "bg-emerald-500",
  },
  {
    repo: "nicehash/NiceHashQuickMiner",
    title: "Resolve GPU detection fallback on multi-GPU rigs",
    additions: 57,
    deletions: 23,
    commits: 3,
    summary:
      "Adds fallback detection path for systems where the primary CUDA enumeration fails on specific driver versions.",
    username: "marcos_r",
    initials: "MR",
    avatarColor: "bg-orange-500",
  },
  {
    repo: "pods-framework/pods",
    title: "Correct relationship field traversal in REST API output",
    additions: 118,
    deletions: 44,
    commits: 5,
    summary:
      "Fixes nested relationship fields returning raw IDs instead of resolved objects when depth > 1 in REST context.",
    username: "priya_s",
    initials: "PS",
    avatarColor: "bg-pink-500",
  },
];

// ─── Animation timing (ms) ────────────────────────────────────────────────────

const CARD_DURATION = 800;
const STAGGER = 200;
const HOLD = 4000;
const EXIT = 800;
const ALL_IN = (MOCK_PRS.length - 1) * STAGGER + CARD_DURATION;

// ─── Container variants (stagger children) ────────────────────────────────────

const containerVariants: Variants = {
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER / 1000,
    },
  },
  hidden: {
    opacity: 0,
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: CARD_DURATION / 1000, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── PR Card (light theme) ────────────────────────────────────────────────────

function Card({ pr }: { pr: PRCard }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm shadow-black/5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-muted-foreground">
          <GitPullRequest className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{pr.repo}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[hsl(152,69%,45%)]/10 px-2 py-0.5 text-xs font-medium text-[hsl(152,69%,45%)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(152,69%,45%)]" />
          Merged
        </div>
      </div>

      <p className="mb-1.5 text-sm font-semibold leading-snug text-foreground">
        {pr.title}
      </p>

      <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {pr.summary}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <span className="font-semibold text-[hsl(152,69%,45%)]">
            +{pr.additions}
          </span>
          <span className="text-border">−</span>
          <span className="font-semibold text-destructive">{pr.deletions}</span>
          <span className="mx-0.5 text-border">·</span>
          <span>{pr.commits} commits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[9px] font-bold text-white ${pr.avatarColor}`}
          >
            {pr.initials}
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            @{pr.username}
          </span>
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
        phase === "out" ? { duration: EXIT / 1000, ease: "easeIn" } : undefined
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
