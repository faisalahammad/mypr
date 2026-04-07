'use client'

import { useState } from 'react'
import { PRCard } from '@/components/pr-card/PRCard'
import type { PullRequestWithProfile } from '@/types'
import { Loader2 } from 'lucide-react'

interface FeedClientProps {
  /**
   * Initial PRs to display (from server component)
   */
  initialPRs: PullRequestWithProfile[]
  /**
   * Initial value indicating if there are more PRs to load
   */
  initialHasMore: boolean
}

/**
 * FeedClient - Client component for the home feed with "Load more" functionality
 *
 * This component:
 * - Displays PRs from followed users with timeline styling
 * - Provides a "Load more" button to fetch additional PRs
 * - Shows loading state while fetching
 * - Handles errors gracefully
 */
export function FeedClient({ initialPRs, initialHasMore }: FeedClientProps) {
  const [prs, setPRs] = useState<PullRequestWithProfile[]>(initialPRs)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load more PRs from the API
   */
  const loadMore = async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/feed-prs?limit=20&offset=${prs.length}`)

      if (!response.ok) {
        throw new Error('Failed to load more PRs')
      }

      const data = await response.json()

      setPRs((prev) => [...prev, ...data.prs])
      setHasMore(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

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
        <p className="text-lg text-muted-foreground">
          You're not following anyone yet. Visit a developer's profile to follow them and see their pull requests here.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Timeline of PRs */}
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

      {/* Error message */}
      {error && (
        <div className="mt-6 text-center text-sm text-destructive">
          {error}
          <button
            onClick={loadMore}
            className="ml-2 underline hover:text-destructive/80"
          >
            Try again
          </button>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !error && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
