'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { FEED_PAGE_SIZE, type FeedPage, type FeedPR, type FeedScope } from '@/lib/feed-types'
import { FeedSkeleton } from './FeedSkeleton'
import { PRFeedCard } from './PRFeedCard'

interface FeedContainerProps {
  initialFeed: FeedPage
  userId: string
  scope?: FeedScope
  initialFollowingIds?: string[]
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

export function FeedContainer({
  initialFeed,
  userId,
  scope = 'everyone',
  initialFollowingIds = [],
}: FeedContainerProps) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(() => new Set(initialFollowingIds))
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
        `/api/feed?cursor=${encodeURIComponent(nextCursor)}&limit=${FEED_PAGE_SIZE}&scope=${scope}`,
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
  }, [nextCursor, isLoading, scope])

  const handleFollowChange = useCallback((authorId: string, following: boolean) => {
    setFollowingIds((current) => {
      const next = new Set(current)
      if (following) next.add(authorId)
      else next.delete(authorId)
      return next
    })
  }, [])

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
    const followsNobody = scope === 'following' && followingIds.size === 0
    return (
      <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <Users className="h-9 w-9 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">
          {followsNobody ? 'You are not following anyone yet' : 'No pull requests here yet'}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {followsNobody
            ? 'Follow developers to see their merged pull requests in this tab.'
            : scope === 'following'
              ? 'The developers you follow have no public merged pull requests yet.'
              : 'Once developers sync their merged pull requests, they show up here.'}
        </p>
        <Link
          href="/explore"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Explore developers
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div>
        {items.map((pr) => (
          <PRFeedCard
            key={pr.id}
            pr={pr}
            currentUserId={userId}
            isFollowingAuthor={followingIds.has(pr.author.id)}
            onFollowChange={handleFollowChange}
          />
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
