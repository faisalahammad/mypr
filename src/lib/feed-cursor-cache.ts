import type { FeedPage } from './feed-types'

type CursorCacheEntry = {
  feed: FeedPage
  expiresAt: number
}

// Per-process cache so repeated scroll requests for the same cursor skip the
// multi-query buildFeed scan. Not shared across server instances; the
// Postgres-backed feed_cache table remains the cross-instance cache for page 1.
const DEFAULT_TTL_SECONDS = 300
const MAX_ENTRIES = 1000

const cache = new Map<string, CursorCacheEntry>()

function cacheKey(userId: string, cursor: string, limit: number): string {
  return `${userId}:${limit}:${cursor}`
}

export function getCachedCursorFeed(
  userId: string,
  cursor: string,
  limit: number
): FeedPage | null {
  const key = cacheKey(userId, cursor, limit)
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }

  // Re-insert so the eviction order reflects recency.
  cache.delete(key)
  cache.set(key, entry)

  return entry.feed
}

export function setCachedCursorFeed(
  userId: string,
  cursor: string,
  limit: number,
  feed: FeedPage,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): void {
  const now = Date.now()

  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key)
    }
  }

  if (!cache.has(cacheKey(userId, cursor, limit)) && cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }

  cache.set(cacheKey(userId, cursor, limit), {
    feed,
    expiresAt: now + ttlSeconds * 1000,
  })
}

export function invalidateCursorFeedCache(userId: string): void {
  const prefix = `${userId}:`

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}
