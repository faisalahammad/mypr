import type { FeedPage } from '@/lib/feed-types'

type CursorCacheModule = typeof import('@/lib/feed-cursor-cache')

function makeFeed(generatedAt: string): FeedPage {
  return {
    items: [],
    next_cursor: null,
    generated_at: generatedAt,
  }
}

async function loadFreshModule(): Promise<CursorCacheModule> {
  jest.resetModules()
  return (await import('@/lib/feed-cursor-cache')) as CursorCacheModule
}

describe('feed cursor cache', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-30T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns a cached feed for the same user, cursor, and limit', async () => {
    const { getCachedCursorFeed, setCachedCursorFeed } = await loadFreshModule()
    const feed = makeFeed(new Date().toISOString())

    setCachedCursorFeed('user-1', 'cursor-a', 10, feed)

    expect(getCachedCursorFeed('user-1', 'cursor-a', 10)).toEqual(feed)
  })

  it('returns null after the ttl expires', async () => {
    const { getCachedCursorFeed, setCachedCursorFeed } = await loadFreshModule()
    const feed = makeFeed(new Date().toISOString())

    setCachedCursorFeed('user-1', 'cursor-a', 10, feed, 60)
    jest.advanceTimersByTime(60_000)

    expect(getCachedCursorFeed('user-1', 'cursor-a', 10)).toBeNull()
  })

  it('does not serve an entry for a different user, cursor, or limit', async () => {
    const { getCachedCursorFeed, setCachedCursorFeed } = await loadFreshModule()
    const feed = makeFeed(new Date().toISOString())

    setCachedCursorFeed('user-1', 'cursor-a', 10, feed)

    expect(getCachedCursorFeed('user-2', 'cursor-a', 10)).toBeNull()
    expect(getCachedCursorFeed('user-1', 'cursor-b', 10)).toBeNull()
    expect(getCachedCursorFeed('user-1', 'cursor-a', 20)).toBeNull()
  })

  it('clears only the given user entries on invalidation', async () => {
    const { getCachedCursorFeed, invalidateCursorFeedCache, setCachedCursorFeed } =
      await loadFreshModule()
    const feed = makeFeed(new Date().toISOString())

    setCachedCursorFeed('user-1', 'cursor-a', 10, feed)
    setCachedCursorFeed('user-1', 'cursor-b', 10, feed)
    setCachedCursorFeed('user-2', 'cursor-a', 10, feed)

    invalidateCursorFeedCache('user-1')

    expect(getCachedCursorFeed('user-1', 'cursor-a', 10)).toBeNull()
    expect(getCachedCursorFeed('user-1', 'cursor-b', 10)).toBeNull()
    expect(getCachedCursorFeed('user-2', 'cursor-a', 10)).toEqual(feed)
  })

  it('evicts the least recently used entry beyond the size cap', async () => {
    const { getCachedCursorFeed, setCachedCursorFeed } = await loadFreshModule()
    const feed = makeFeed(new Date().toISOString())

    for (let i = 0; i < 1000; i++) {
      setCachedCursorFeed('user-1', `cursor-${i}`, 10, feed)
    }
    // Touch the oldest entry so it survives eviction.
    expect(getCachedCursorFeed('user-1', 'cursor-0', 10)).toEqual(feed)

    setCachedCursorFeed('user-1', 'cursor-1000', 10, feed)

    expect(getCachedCursorFeed('user-1', 'cursor-1000', 10)).toEqual(feed)
    expect(getCachedCursorFeed('user-1', 'cursor-0', 10)).toEqual(feed)
    expect(getCachedCursorFeed('user-1', 'cursor-1', 10)).toBeNull()
  })
})
