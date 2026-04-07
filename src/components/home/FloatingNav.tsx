"use client";

import { useEffect, useState } from "react";
import { GitPullRequest } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export default function FloatingNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Exact threshold from Lovable source: scrollY > 80
    const onScroll = () => setVisible(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // CSS transition — exact from Lovable source: transition-all duration-500
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-border bg-background/70 backdrop-blur-xl ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo — gradient-bg icon, font-display label */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg gradient-bg flex items-center justify-center">
            <GitPullRequest className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-bold text-foreground tracking-tight">
            mypr.pro.bd
          </span>
        </div>

        {/* CTA — gradient-bg, exact from source */}
        <a
          href="/login"
          className={cn(
            buttonVariants({ size: "sm" }),
            "gap-2 gradient-bg text-primary-foreground border-0 hover:opacity-90 rounded-lg"
          )}
        >
          <GitHubIcon className="h-4 w-4" />
          Login with GitHub
        </a>
      </div>
    </nav>
  );
}
