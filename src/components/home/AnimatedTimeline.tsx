"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GitPullRequest } from "lucide-react";

// ─── Mock PR Data ────────────────────────────────────────────────────────────

interface MockPR {
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

const MOCK_PRS: MockPR[] = [
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
    avatarColor: "bg-violet-500",
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

// ─── Timing constants (ms) ────────────────────────────────────────────────────

const CARD_DURATION = 800;
const STAGGER = 200;
const HOLD = 4000;
const EXIT = 800;
// Time for the last card to finish entering
const ALL_IN = (MOCK_PRS.length - 1) * STAGGER + CARD_DURATION;

// ─── PR Card ─────────────────────────────────────────────────────────────────

function PRCard({ pr }: { pr: MockPR }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
      {/* Repo row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <GitPullRequest className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{pr.repo}</span>
        </div>
        {/* Merged badge */}
        <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Merged
        </div>
      </div>

      {/* Title */}
      <p className="mb-1.5 text-sm font-semibold leading-snug text-gray-900">
        {pr.title}
      </p>

      {/* Summary */}
      <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
        {pr.summary}
      </p>

      {/* Stats + avatar row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span className="font-medium text-green-600">+{pr.additions}</span>
          <span>−</span>
          <span className="font-medium text-red-500">{pr.deletions}</span>
          <span className="mx-0.5">·</span>
          <span>{pr.commits} commits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${pr.avatarColor}`}
          >
            {pr.initials}
          </div>
          <span className="text-xs text-gray-400">@{pr.username}</span>
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

  // Reduced motion: static render
  if (prefersReducedMotion) {
    return (
      <div className="flex flex-col gap-3">
        {MOCK_PRS.map((pr) => (
          <PRCard key={pr.repo} pr={pr} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      key={cycleKey}
      animate={phase === "out" ? { opacity: 0 } : { opacity: 1 }}
      transition={phase === "out" ? { duration: EXIT / 1000, ease: "easeIn" } : {}}
      className="flex flex-col gap-3"
    >
      {MOCK_PRS.map((pr, i) => (
        <motion.div
          key={pr.repo}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: CARD_DURATION / 1000,
            ease: "easeOut",
            delay: (i * STAGGER) / 1000,
          }}
        >
          <PRCard pr={pr} />
        </motion.div>
      ))}
    </motion.div>
  );
}
