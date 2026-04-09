'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FeedPage, FeedPR } from '@/lib/feed'
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

  useEffect(() => {
    if (!hasMore || isLoading || !sentinelRef.current) {
      return
    }

    const node = sentinelRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry?.isIntersecting || isLoading || !nextCursor) {
          return
        }

        setIsLoading(true)
        setError(null)

        void fetch(`/api/feed?cursor=${encodeURIComponent(nextCursor)}`, {
          cache: 'no-store',
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error('Failed to load feed')
            }

            return (await response.json()) as FeedPage
          })
          .then((page) => {
            setItems((current) => mergeFeedItems(current, page.items))
            setNextCursor(page.next_cursor)
          })
          .catch(() => {
            setError('Failed to load more pull requests.')
          })
          .finally(() => {
            setIsLoading(false)
          })
      },
      {
        rootMargin: '200px 0px',
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoading, nextCursor])

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

      {error ? <p className="py-4 text-sm text-destructive">{error}</p> : null}

      {!hasMore && !isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">You are all caught up.</p>
      ) : null}

      <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
    </div>
  )
}
