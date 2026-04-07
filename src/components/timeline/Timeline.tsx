import { PRCard } from '@/components/pr-card/PRCard'
import type { PullRequestWithProfile } from '@/types'

interface TimelineProps {
  /**
   * Array of PRs to display, ordered reverse-chronologically
   */
  prs: PullRequestWithProfile[]
  /**
   * Message to show when no PRs are available
   */
  emptyMessage?: string
}

/**
 * Timeline - Displays PRs in chronological order with a vertical line connector
 *
 * Features:
 * - Vertical line on the left side
 * - Dot marker at each PR position
 * - Left-aligned cards for easy scanning
 * - Empty state with custom message
 */
export function Timeline({ prs, emptyMessage = 'No pull requests yet' }: TimelineProps) {
  if (prs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-lg text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />

      {/* PR cards */}
      <div className="space-y-6">
        {prs.map((prWithProfile) => (
          <div key={prWithProfile.id} className="relative pl-12">
            {/* Dot on the line */}
            <div
              className="absolute left-[19px] top-6 w-3 h-3 rounded-full bg-primary border-2 border-background"
              aria-hidden="true"
            />

            <PRCard pr={prWithProfile} />
          </div>
        ))}
      </div>
    </div>
  )
}
