import {
  buildFeed,
  FEED_PAGE_SIZE,
  type FeedSupabaseClient,
  getCachedFeed,
  setCachedFeed,
  type FeedPage,
  type ReactionCounts,
} from '@/lib/feed'

type QueryResult<T> = Promise<{ data: T; error: null }>

type FeedProfileRow = {
  id: string
  github_username: string
  github_avatar_url: string | null
  display_name: string | null
}

type PullRequestRow = {
  id: string
  user_id: string
  repo_full_name: string
  pr_number: number
  title: string
  body_summary: string | null
  pr_url: string
  merged_at: string
  additions: number
  deletions: number
  commits_count: number
  reaction_counts: Partial<ReactionCounts> | null
  profiles: FeedProfileRow | null
}

type ReactionRow = {
  pr_id: string
  reaction_type: 'love' | 'thumbsup' | 'informative' | 'support' | 'funny'
}

type FeedCacheRow = {
  user_id: string
  feed_json: FeedPage
  generated_at: string
  expires_at: string
}

type MockDataset = {
  pullRequests?: PullRequestRow[]
  reactions?: ReactionRow[]
  activeRepos?: Array<{ user_id: string; repo_full_name: string; owner_avatar_url: string | null }>
  feedCache?: FeedCacheRow | null
}

function resolved<T>(data: T): QueryResult<T> {
  return Promise.resolve({ data, error: null })
}

/**
 * Simulates the pull_requests query: rows ordered by merged_at desc then id
 * asc, with an optional inclusive merged_at ceiling from `.lte`.
 */
interface MockPullRequestBuilder {
  select: jest.Mock<MockPullRequestBuilder, []>
  order: jest.Mock<MockPullRequestBuilder, []>
  lte: jest.Mock<MockPullRequestBuilder, [string, string]>
  limit: jest.Mock<QueryResult<PullRequestRow[]>, [number]>
}

function createPullRequestQuery(dataset: PullRequestRow[]) {
  let mergedAtCeiling: string | null = null

  const compareRows = (left: PullRequestRow, right: PullRequestRow) => {
    if (left.merged_at !== right.merged_at) {
      return left.merged_at < right.merged_at ? 1 : -1
    }
    return left.id < right.id ? -1 : 1
  }

  const builder: MockPullRequestBuilder = {
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    lte: jest.fn((_column: string, value: string) => {
      mergedAtCeiling = value
      return builder
    }),
    limit: jest.fn((value: number) => {
      const sorted = [...dataset].sort(compareRows)
      const filtered = mergedAtCeiling
        ? sorted.filter((row) => row.merged_at <= mergedAtCeiling!)
        : sorted
      return resolved(filtered.slice(0, value))
    }),
  }

  return builder
}

function createFeedSupabaseMock(dataset: MockDataset) {
  const upsert = jest.fn().mockResolvedValue({ data: null, error: null })
  const pullRequestQuery = createPullRequestQuery(dataset.pullRequests ?? [])

  const from = jest.fn((table: string) => {
    if (table === 'pull_requests') {
      return pullRequestQuery
    }

    if (table === 'reactions') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => resolved(dataset.reactions ?? [])),
          })),
        })),
      }
    }

    if (table === 'feed_cache') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => resolved(dataset.feedCache ?? null)),
          })),
        })),
        upsert,
      }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  const rpc = jest.fn().mockResolvedValue({
    data: dataset.activeRepos ?? [],
    error: null,
  })

  return { from, rpc, upsert, pullRequestQuery }
}

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600000).toISOString()
}

function baseReactionCounts(): ReactionCounts {
  return {
    love: 0,
    thumbsup: 0,
    informative: 0,
    support: 0,
    funny: 0,
  }
}

function makePullRequestRow(overrides: Partial<PullRequestRow> = {}): PullRequestRow {
  const id = overrides.id ?? 'pr-1'
  const userId = overrides.user_id ?? 'author-1'

  return {
    id,
    user_id: userId,
    repo_full_name: overrides.repo_full_name ?? `${userId}/repo`,
    pr_number: overrides.pr_number ?? 1,
    title: overrides.title ?? `PR ${id}`,
    body_summary: overrides.body_summary ?? null,
    pr_url: overrides.pr_url ?? `https://github.com/${userId}/repo/pull/1`,
    merged_at: overrides.merged_at ?? isoHoursAgo(1),
    additions: overrides.additions ?? 10,
    deletions: overrides.deletions ?? 2,
    commits_count: overrides.commits_count ?? 1,
    reaction_counts: overrides.reaction_counts ?? baseReactionCounts(),
    profiles: overrides.profiles ?? {
      id: userId,
      github_username: userId,
      github_avatar_url: null,
      display_name: userId,
    },
  }
}

function allAuthorsActive(prs: PullRequestRow[]) {
  return Array.from(new Set(prs.map((pr) => ({ user_id: pr.user_id, repo_full_name: pr.repo_full_name })))).map(
    (entry) => ({ ...entry, owner_avatar_url: null })
  )
}

describe('buildFeed', () => {
  it('returns every registered user\'s PRs newest first', async () => {
    const prs = [
      makePullRequestRow({ id: 'pr-old', user_id: 'author-a', merged_at: isoHoursAgo(72) }),
      makePullRequestRow({ id: 'pr-new', user_id: 'author-b', merged_at: isoHoursAgo(1) }),
      makePullRequestRow({ id: 'pr-mid', user_id: 'author-c', merged_at: isoHoursAgo(24) }),
    ]

    const supabase = createFeedSupabaseMock({ pullRequests: prs, activeRepos: allAuthorsActive(prs) })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null)

    expect(FEED_PAGE_SIZE).toBe(10)
    expect(feed.items.map((item) => item.id)).toEqual(['pr-new', 'pr-mid', 'pr-old'])
    expect(feed.items.map((item) => item.author.github_username)).toEqual([
      'author-b',
      'author-c',
      'author-a',
    ])
    expect(feed.next_cursor).toBeNull()
  })

  it('paginates with cursors and reports when the end is reached', async () => {
    const prs = Array.from({ length: 5 }, (_, index) =>
      makePullRequestRow({ id: `pr-${index + 1}`, user_id: `author-${index + 1}`, merged_at: isoHoursAgo(index + 1) })
    )

    const supabase = createFeedSupabaseMock({ pullRequests: prs, activeRepos: allAuthorsActive(prs) })
    const client = supabase as unknown as FeedSupabaseClient

    const firstPage = await buildFeed(client, 'user-1', null, 2)
    expect(firstPage.items.map((item) => item.id)).toEqual(['pr-1', 'pr-2'])
    expect(firstPage.next_cursor).not.toBeNull()

    const secondPage = await buildFeed(client, 'user-1', firstPage.next_cursor, 2)
    expect(secondPage.items.map((item) => item.id)).toEqual(['pr-3', 'pr-4'])
    expect(secondPage.next_cursor).not.toBeNull()

    const thirdPage = await buildFeed(client, 'user-1', secondPage.next_cursor, 2)
    expect(thirdPage.items.map((item) => item.id)).toEqual(['pr-5'])
    expect(thirdPage.next_cursor).toBeNull()
  })

  it('treats an invalid cursor as the first page', async () => {
    const prs = [
      makePullRequestRow({ id: 'pr-a', user_id: 'author-a', merged_at: isoHoursAgo(1) }),
      makePullRequestRow({ id: 'pr-b', user_id: 'author-b', merged_at: isoHoursAgo(2) }),
    ]

    const supabase = createFeedSupabaseMock({ pullRequests: prs, activeRepos: allAuthorsActive(prs) })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', 'not-base64', 2)

    expect(feed.items.map((item) => item.id)).toEqual(['pr-a', 'pr-b'])
  })

  it('orders PRs that share a merged_at timestamp by id ascending', async () => {
    const sharedMergedAt = isoHoursAgo(3)
    const prs = [
      makePullRequestRow({ id: 'pr-b', user_id: 'author-b', merged_at: sharedMergedAt }),
      makePullRequestRow({ id: 'pr-a', user_id: 'author-a', merged_at: sharedMergedAt }),
      makePullRequestRow({ id: 'pr-c', user_id: 'author-c', merged_at: sharedMergedAt }),
    ]

    const supabase = createFeedSupabaseMock({ pullRequests: prs, activeRepos: allAuthorsActive(prs) })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 2)

    expect(feed.items.map((item) => item.id)).toEqual(['pr-a', 'pr-b'])
    expect(feed.next_cursor).not.toBeNull()
  })

  it('skips PRs outside the authors\' public active repos and keeps filling the page', async () => {
    const hidden = Array.from({ length: 18 }, (_, index) =>
      makePullRequestRow({
        id: `hidden-${index + 1}`,
        user_id: 'author-hidden',
        repo_full_name: 'author-hidden/private-repo',
        merged_at: isoHoursAgo(index + 1),
      })
    )
    const visible = Array.from({ length: 10 }, (_, index) =>
      makePullRequestRow({
        id: `visible-${index + 1}`,
        user_id: 'author-visible',
        merged_at: isoHoursAgo(100 + index),
      })
    )

    const supabase = createFeedSupabaseMock({
      pullRequests: [...hidden, ...visible],
      activeRepos: [{ user_id: 'author-visible', repo_full_name: 'author-visible/repo', owner_avatar_url: null }],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 10)

    expect(feed.items).toHaveLength(10)
    expect(feed.items.map((item) => item.id)).toEqual(visible.map((pr) => pr.id))
    expect(feed.next_cursor).toBeNull()
  })

  it('attaches the viewer\'s reactions to the returned items', async () => {
    const prs = [
      makePullRequestRow({
        id: 'pr-loved',
        user_id: 'author-a',
        reaction_counts: { love: 3 },
      }),
      makePullRequestRow({ id: 'pr-unreacted', user_id: 'author-b' }),
    ]

    const supabase = createFeedSupabaseMock({
      pullRequests: prs,
      reactions: [{ pr_id: 'pr-loved', reaction_type: 'love' }],
      activeRepos: allAuthorsActive(prs),
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 10)

    expect(feed.items.find((item) => item.id === 'pr-loved')?.user_reaction).toBe('love')
    expect(feed.items.find((item) => item.id === 'pr-loved')?.reaction_counts.love).toBe(3)
    expect(feed.items.find((item) => item.id === 'pr-unreacted')?.user_reaction).toBeNull()
  })

  it('returns an empty page with no cursor when there are no pull requests', async () => {
    const supabase = createFeedSupabaseMock({})

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null)

    expect(feed.items).toEqual([])
    expect(feed.next_cursor).toBeNull()
  })

  it('keeps paginating when a page of raw rows is entirely filtered out', async () => {
    const hidden = Array.from({ length: 20 }, (_, index) =>
      makePullRequestRow({
        id: `hidden-${index + 1}`,
        user_id: 'author-hidden',
        repo_full_name: 'author-hidden/private-repo',
        merged_at: isoHoursAgo(index + 1),
      })
    )
    const visible = Array.from({ length: 6 }, (_, index) =>
      makePullRequestRow({
        id: `visible-${index + 1}`,
        user_id: 'author-visible',
        merged_at: isoHoursAgo(100 + index),
      })
    )

    const supabase = createFeedSupabaseMock({
      pullRequests: [...hidden, ...visible],
      activeRepos: [{ user_id: 'author-visible', repo_full_name: 'author-visible/repo', owner_avatar_url: null }],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 10)

    expect(feed.items.map((item) => item.id)).toEqual(visible.map((pr) => pr.id))
    expect(feed.next_cursor).toBeNull()
  })
})

describe('feed cache helpers', () => {
  it('returns a fresh cached feed', async () => {
    const cachedFeed: FeedPage = {
      items: [],
      next_cursor: null,
      generated_at: new Date().toISOString(),
    }

    const supabase = createFeedSupabaseMock({
      feedCache: {
        user_id: 'user-1',
        feed_json: cachedFeed,
        generated_at: cachedFeed.generated_at,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    })

    await expect(getCachedFeed(supabase as unknown as FeedSupabaseClient, 'user-1')).resolves.toEqual(cachedFeed)
  })

  it('returns null for an expired cached feed', async () => {
    const supabase = createFeedSupabaseMock({
      feedCache: {
        user_id: 'user-1',
        feed_json: {
          items: [],
          next_cursor: null,
          generated_at: new Date().toISOString(),
        },
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() - 60000).toISOString(),
      },
    })

    await expect(getCachedFeed(supabase as unknown as FeedSupabaseClient, 'user-1')).resolves.toBeNull()
  })

  it('upserts cached feeds with a ttl-based expiry', async () => {
    const supabase = createFeedSupabaseMock({})
    const feed: FeedPage = {
      items: [],
      next_cursor: null,
      generated_at: new Date().toISOString(),
    }

    await setCachedFeed(supabase as unknown as FeedSupabaseClient, 'user-1', feed, 300)

    expect(supabase.upsert).toHaveBeenCalledTimes(1)
    const [payload] = supabase.upsert.mock.calls[0] as [Array<{ expires_at: string; user_id: string }>, unknown?]
    expect(payload[0].user_id).toBe('user-1')
    expect(new Date(payload[0].expires_at).getTime()).toBeGreaterThan(Date.now())
  })
})
