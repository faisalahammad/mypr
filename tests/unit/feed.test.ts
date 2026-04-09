import {
  buildFeed,
  type FeedSupabaseClient,
  getCachedFeed,
  getEngagementBoost,
  getRecencyScore,
  getRelationshipWeight,
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
  profile?: FeedProfileRow | null
  follows?: Array<{ following_id: string }>
  githubFollows?: Array<{ following_id: string }>
  pullRequests?: PullRequestRow[]
  reactions?: ReactionRow[]
  activeRepos?: Array<{ user_id: string; repo_full_name: string; owner_avatar_url: string | null }>
  feedCache?: FeedCacheRow | null
}

function resolved<T>(data: T): QueryResult<T> {
  return Promise.resolve({ data, error: null })
}

function createFeedSupabaseMock(dataset: MockDataset) {
  const upsert = jest.fn().mockResolvedValue({ data: null, error: null })

  const from = jest.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => resolved(dataset.profile ?? null)),
          })),
        })),
      }
    }

    if (table === 'follows') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => resolved(dataset.follows ?? [])),
        })),
      }
    }

    if (table === 'github_follows') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => resolved(dataset.githubFollows ?? [])),
        })),
      }
    }

    if (table === 'pull_requests') {
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn((value: number) => resolved((dataset.pullRequests ?? []).slice(0, value))),
          })),
        })),
      }
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

  return { from, rpc, upsert }
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

describe('feed scoring helpers', () => {
  it('weights self PRs based on following count thresholds', () => {
    expect(getRelationshipWeight('user-1', 'user-1', new Set(), new Set(), 0)).toBe(1)
    expect(getRelationshipWeight('user-1', 'user-1', new Set(), new Set(), 5)).toBe(0.7)
    expect(getRelationshipWeight('user-1', 'user-1', new Set(), new Set(), 50)).toBe(0.4)
    expect(getRelationshipWeight('user-1', 'user-1', new Set(), new Set(), 101)).toBe(0.2)
  })

  it('always gives in-app followed authors full weight', () => {
    expect(getRelationshipWeight('user-2', 'user-1', new Set(['user-2']), new Set(), 0)).toBe(1)
    expect(getRelationshipWeight('user-2', 'user-1', new Set(['user-2']), new Set(), 1000)).toBe(1)
  })

  it('weights github-followed authors by follow-count band', () => {
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(['user-2']), 0)).toBe(0.5)
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(['user-2']), 5)).toBe(0.6)
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(['user-2']), 50)).toBe(0.4)
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(['user-2']), 101)).toBe(0.2)
  })

  it('weights discovery authors by follow-count band', () => {
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(), 0)).toBe(0.3)
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(), 5)).toBe(0.15)
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(), 50)).toBe(0.05)
    expect(getRelationshipWeight('user-2', 'user-1', new Set(), new Set(), 101)).toBe(0)
  })

  it('decays recency scores over time within a category', () => {
    const newer = getRecencyScore(isoHoursAgo(12), 'followed')
    const older = getRecencyScore(isoHoursAgo(144), 'followed')

    expect(newer).toBeGreaterThan(older)
  })

  it('caps engagement boost at 1.4', () => {
    expect(getEngagementBoost(baseReactionCounts())).toBe(1)
    expect(
      getEngagementBoost({
        love: 10,
        thumbsup: 10,
        informative: 10,
        support: 10,
        funny: 10,
      })
    ).toBe(1.4)
  })
})

describe('buildFeed', () => {
  it('treats an invalid cursor as the first page', async () => {
    const supabase = createFeedSupabaseMock({
      profile: {
        id: 'user-1',
        github_username: 'user-1',
        github_avatar_url: null,
        display_name: 'User 1',
      },
      pullRequests: [
        makePullRequestRow({ id: 'pr-b', user_id: 'author-b', merged_at: isoHoursAgo(2) }),
        makePullRequestRow({ id: 'pr-a', user_id: 'author-a', merged_at: isoHoursAgo(1) }),
      ],
      activeRepos: [
        { user_id: 'author-a', repo_full_name: 'author-a/repo', owner_avatar_url: null },
        { user_id: 'author-b', repo_full_name: 'author-b/repo', owner_avatar_url: null },
      ],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', 'not-base64', 20)

    expect(feed.items).toHaveLength(2)
    expect(feed.items[0]?.id).toBe('pr-a')
  })

  it('applies cursor pagination after sorting by score and id', async () => {
    const supabase = createFeedSupabaseMock({
      profile: {
        id: 'user-1',
        github_username: 'user-1',
        github_avatar_url: null,
        display_name: 'User 1',
      },
      pullRequests: [
        makePullRequestRow({ id: 'pr-c', user_id: 'author-c', merged_at: isoHoursAgo(1) }),
        makePullRequestRow({ id: 'pr-b', user_id: 'author-b', merged_at: isoHoursAgo(1) }),
        makePullRequestRow({ id: 'pr-a', user_id: 'author-a', merged_at: isoHoursAgo(1) }),
      ],
      activeRepos: [
        { user_id: 'author-a', repo_full_name: 'author-a/repo', owner_avatar_url: null },
        { user_id: 'author-b', repo_full_name: 'author-b/repo', owner_avatar_url: null },
        { user_id: 'author-c', repo_full_name: 'author-c/repo', owner_avatar_url: null },
      ],
    })

    const firstPage = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 2)
    const secondPage = await buildFeed(
      supabase as unknown as FeedSupabaseClient,
      'user-1',
      firstPage.next_cursor,
      2
    )

    expect(firstPage.items).toHaveLength(2)
    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.items[0]?.id).toBe('pr-a')
  })

  it('applies diversity penalties and drops the fourth PR from the same author', async () => {
    const sharedMergedAt = isoHoursAgo(1)
    const supabase = createFeedSupabaseMock({
      profile: {
        id: 'user-1',
        github_username: 'user-1',
        github_avatar_url: null,
        display_name: 'User 1',
      },
      pullRequests: [
        makePullRequestRow({ id: 'pr-4', user_id: 'author-1', merged_at: sharedMergedAt }),
        makePullRequestRow({ id: 'pr-3', user_id: 'author-1', merged_at: sharedMergedAt }),
        makePullRequestRow({ id: 'pr-2', user_id: 'author-1', merged_at: sharedMergedAt }),
        makePullRequestRow({ id: 'pr-1', user_id: 'author-1', merged_at: sharedMergedAt }),
        makePullRequestRow({ id: 'pr-x', user_id: 'author-2', merged_at: isoHoursAgo(12) }),
      ],
      activeRepos: [
        { user_id: 'author-1', repo_full_name: 'author-1/repo', owner_avatar_url: null },
        { user_id: 'author-2', repo_full_name: 'author-2/repo', owner_avatar_url: null },
      ],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 20)

    expect(feed.items.map((item) => item.id)).toEqual(['pr-4', 'pr-3', 'pr-2', 'pr-x'])
    expect(feed.items[1]?.score).toBeCloseTo(feed.items[0]!.score * 0.6, 5)
    expect(feed.items[2]?.score).toBeCloseTo(feed.items[0]!.score * 0.3, 5)
  })

  it('keeps stale items out of the first page when enough fresh followed content exists', async () => {
    const freshFollowed = Array.from({ length: 20 }, (_, index) =>
      makePullRequestRow({
        id: `followed-fresh-${index + 1}`,
        user_id: `followed-user-${index + 1}`,
        merged_at: isoHoursAgo(24 * (index + 1)),
      })
    )

    const supabase = createFeedSupabaseMock({
      profile: {
        id: 'user-1',
        github_username: 'user-1',
        github_avatar_url: null,
        display_name: 'User 1',
      },
      follows: [
        { following_id: 'followed-user' },
        ...freshFollowed.map((pr) => ({ following_id: pr.user_id })),
      ],
      githubFollows: [{ following_id: 'github-user' }, { following_id: 'github-fresh-user' }],
      pullRequests: [
        ...freshFollowed,
        makePullRequestRow({ id: 'github-fresh', user_id: 'github-fresh-user', merged_at: isoHoursAgo(24 * 10) }),
        makePullRequestRow({ id: 'self-old', user_id: 'user-1', merged_at: isoHoursAgo(24 * 365) }),
        makePullRequestRow({ id: 'followed-old', user_id: 'followed-user', merged_at: isoHoursAgo(24 * 181) }),
        makePullRequestRow({ id: 'github-old', user_id: 'github-user', merged_at: isoHoursAgo(24 * 181) }),
        makePullRequestRow({ id: 'discovery-old', user_id: 'discovery-user', merged_at: isoHoursAgo(24 * 61) }),
      ],
      activeRepos: [
        { user_id: 'user-1', repo_full_name: 'user-1/repo', owner_avatar_url: null },
        ...freshFollowed.map((pr) => ({
          user_id: pr.user_id,
          repo_full_name: pr.repo_full_name,
          owner_avatar_url: null,
        })),
        { user_id: 'github-fresh-user', repo_full_name: 'github-fresh-user/repo', owner_avatar_url: null },
        { user_id: 'followed-user', repo_full_name: 'followed-user/repo', owner_avatar_url: null },
        { user_id: 'github-user', repo_full_name: 'github-user/repo', owner_avatar_url: null },
        { user_id: 'discovery-user', repo_full_name: 'discovery-user/repo', owner_avatar_url: null },
      ],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 20)

    expect(feed.items).toHaveLength(20)
    expect(feed.items.map((item) => item.id)).toContain('followed-fresh-1')
    expect(feed.items.map((item) => item.id)).not.toContain('followed-old')
    expect(feed.items.map((item) => item.id)).not.toContain('github-old')
    expect(feed.items.map((item) => item.id)).not.toContain('discovery-old')
    expect(feed.items.map((item) => item.id)).not.toContain('self-old')
  })

  it('keeps stale items out when enough fresh items already fill the page', async () => {
    const freshDiscovery = Array.from({ length: 20 }, (_, index) =>
      makePullRequestRow({
        id: `fresh-${index + 1}`,
        user_id: `fresh-user-${index + 1}`,
        merged_at: isoHoursAgo(index + 1),
      })
    )

    const supabase = createFeedSupabaseMock({
      profile: {
        id: 'user-1',
        github_username: 'user-1',
        github_avatar_url: null,
        display_name: 'User 1',
      },
      pullRequests: [
        ...freshDiscovery,
        makePullRequestRow({
          id: 'stale-discovery',
          user_id: 'stale-discovery-user',
          merged_at: isoHoursAgo(24 * 120),
        }),
      ],
      activeRepos: [
        ...freshDiscovery.map((pr) => ({
          user_id: pr.user_id,
          repo_full_name: pr.repo_full_name,
          owner_avatar_url: null,
        })),
        {
          user_id: 'stale-discovery-user',
          repo_full_name: 'stale-discovery-user/repo',
          owner_avatar_url: null,
        },
      ],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 20)

    expect(feed.items).toHaveLength(20)
    expect(feed.items.map((item) => item.id)).not.toContain('stale-discovery')
  })

  it('looks far enough back to include discovery PRs beyond the first 100 recent rows', async () => {
    const selfPRs = Array.from({ length: 150 }, (_, index) =>
      makePullRequestRow({
        id: `self-${index + 1}`,
        user_id: 'user-1',
        merged_at: isoHoursAgo(index + 1),
      })
    )
    const discoveryPR = makePullRequestRow({
      id: 'discovery-late',
      user_id: 'discovery-user-late',
      merged_at: isoHoursAgo(151),
    })

    const supabase = createFeedSupabaseMock({
      profile: {
        id: 'user-1',
        github_username: 'user-1',
        github_avatar_url: null,
        display_name: 'User 1',
      },
      pullRequests: [...selfPRs, discoveryPR],
      activeRepos: [
        { user_id: 'user-1', repo_full_name: 'user-1/repo', owner_avatar_url: null },
        {
          user_id: discoveryPR.user_id,
          repo_full_name: discoveryPR.repo_full_name,
          owner_avatar_url: null,
        },
      ],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 20)

    expect(feed.items.map((item) => item.id)).toContain('discovery-late')
  })

  it('backfills with stale followed and discovery items when fresh content underfills the page', async () => {
    const recentSelf = Array.from({ length: 3 }, (_, index) =>
      makePullRequestRow({
        id: `self-${index + 1}`,
        user_id: 'user-1',
        merged_at: isoHoursAgo(index + 1),
      })
    )

    const staleFollowed = Array.from({ length: 8 }, (_, index) =>
      makePullRequestRow({
        id: `followed-old-${index + 1}`,
        user_id: `followed-user-${index + 1}`,
        merged_at: isoHoursAgo(24 * (220 + index)),
      })
    )

    const staleDiscovery = Array.from({ length: 9 }, (_, index) =>
      makePullRequestRow({
        id: `discovery-old-${index + 1}`,
        user_id: `discovery-user-${index + 1}`,
        merged_at: isoHoursAgo(24 * (120 + index)),
      })
    )

    const supabase = createFeedSupabaseMock({
      profile: {
        id: 'user-1',
        github_username: 'user-1',
        github_avatar_url: null,
        display_name: 'User 1',
      },
      follows: staleFollowed.map((pr) => ({ following_id: pr.user_id })),
      pullRequests: [...recentSelf, ...staleFollowed, ...staleDiscovery],
      activeRepos: [
        { user_id: 'user-1', repo_full_name: 'user-1/repo', owner_avatar_url: null },
        ...staleFollowed.map((pr) => ({
          user_id: pr.user_id,
          repo_full_name: pr.repo_full_name,
          owner_avatar_url: null,
        })),
        ...staleDiscovery.map((pr) => ({
          user_id: pr.user_id,
          repo_full_name: pr.repo_full_name,
          owner_avatar_url: null,
        })),
      ],
    })

    const feed = await buildFeed(supabase as unknown as FeedSupabaseClient, 'user-1', null, 20)

    expect(feed.items).toHaveLength(20)
    expect(feed.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(['followed-old-1', 'discovery-old-1'])
    )
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
