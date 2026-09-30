'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FEED_PAGE_SIZE, type FeedPage, type FeedPR } from '@/lib/feed-types'
import { FeedSkeleton } from './FeedSkeleton'
import { PRFeedCard } from './PRFeedCard'

interface FeedContainerProps {
  initialFeed: FeedPage
  userId: string
}

function mergeFeedItems(existing: FeedPR[], incoming: FeedPR[]): FeedPR[] {
  const seen = new Set(existing.map((item) => item.id))
  const merged = [...existing]

  for (const item of incoming) {
    if (!seen.has(item.id)) {
      merged.push(item)
      seen.add(item.id)
    }
  }

  return merged
}

export function FeedContainer({ initialFeed, userId }: FeedContainerProps) {
  const [items, setItems] = useState<FeedPR[]>(initialFeed.items)
  const [nextCursor, setNextCursor] = useState<string | null>(initialFeed.next_cursor)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const hasMore = useMemo(() => nextCursor !== null, [nextCursor])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/feed?cursor=${encodeURIComponent(nextCursor)}&limit=${FEED_PAGE_SIZE}`,
        { cache: 'no-store' }
      )

      if (!response.ok) {
        throw new Error('Failed to load feed')
      }

      const page = (await response.json()) as FeedPage

      setItems((current) => mergeFeedItems(current, page.items))
      setNextCursor(page.next_cursor)
    } catch {
      setError('Failed to load more pull requests.')
    } finally {
      setIsLoading(false)
    }
  }, [nextCursor, isLoading])

  useEffect(() => {
    const node = sentinelRef.current

    if (!node || !nextCursor) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          void loadMore()
        }
      },
      {
        rootMargin: '200px 0px',
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [loadMore, nextCursor])

  if (items.length === 0) {
    return (
      <div className="border-t border-border py-8 text-sm text-muted-foreground">
        No pull requests in your feed yet.
      </div>
    )
  }

  return (
    <div>
      <div>
        {items.map((pr) => (
          <PRFeedCard key={pr.id} pr={pr} currentUserId={userId} />
        ))}
      </div>

      {isLoading ? <FeedSkeleton /> : null}

      {error ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-destructive">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="underline hover:text-destructive/80"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!hasMore && !isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">You are all caught up.</p>
      ) : null}

      <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
    </div>
  )
}
