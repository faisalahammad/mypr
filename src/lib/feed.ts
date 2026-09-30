import type { SupabaseClient } from '@supabase/supabase-js'
import { buildActiveRepoLookup, filterPRsByActiveRepos } from './repo-visibility'
import { getPublicActiveRepositoriesForUsers, type Database } from './supabase'
import { EMPTY_REACTION_COUNTS, FEED_PAGE_SIZE, type FeedPR, type FeedPage, type ReactionCounts, type ReactionType } from './feed-types'

export { EMPTY_REACTION_COUNTS, FEED_PAGE_SIZE } from './feed-types'
export type { FeedPR, FeedPage, ReactionCounts, ReactionType } from './feed-types'

export type FeedSupabaseClient = Pick<SupabaseClient<Database>, 'from' | 'rpc'>

type CursorPayload = {
  merged_at: string
  id: string
}

type MaybeSingleResult<T> = Promise<{ data: T; error: unknown }>
type ListResult<T> = Promise<{ data: T; error: unknown }>

type CandidateProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'github_username' | 'github_avatar_url' | 'display_name'
>

type CandidatePRRow = Pick<
  Database['public']['Tables']['pull_requests']['Row'],
  | 'id'
  | 'user_id'
  | 'repo_full_name'
  | 'pr_number'
  | 'title'
  | 'body_summary'
  | 'pr_url'
  | 'merged_at'
  | 'additions'
  | 'deletions'
  | 'commits_count'
  | 'reaction_counts'
> & {
  profiles: CandidateProfileRow | null
}

type CandidateReactionRow = Pick<
  Database['public']['Tables']['reactions']['Row'],
  'pr_id' | 'reaction_type'
>

type FeedCacheRow = Pick<
  Database['public']['Tables']['feed_cache']['Row'],
  'user_id' | 'feed_json' | 'generated_at' | 'expires_at'
>

type FeedCacheSelectBuilder = {
  eq: (column: string, value: string) => {
    maybeSingle: () => MaybeSingleResult<FeedCacheRow | null>
  }
}

type ReactionSelectBuilder = {
  eq: (column: string, value: string) => {
    in: (column: string, values: string[]) => ListResult<CandidateReactionRow[]>
  }
}

type PullRequestFilterBuilder = {
  order: (column: string, options: { ascending: boolean }) => PullRequestFilterBuilder
  lte: (column: string, value: string) => PullRequestFilterBuilder
  limit: (value: number) => ListResult<CandidatePRRow[]>
}

type PullRequestSelectBuilder = {
  order: (column: string, options: { ascending: boolean }) => PullRequestFilterBuilder
}

const MAX_BATCHES = 5

function normalizeReactionCounts(
  counts: Partial<ReactionCounts> | null | undefined
): ReactionCounts {
  return {
    ...EMPTY_REACTION_COUNTS,
    ...(counts ?? {}),
  }
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

function decodeCursor(cursor: string | null): CursorPayload | null {
  if (!cursor) return null

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Partial<CursorPayload>
    if (typeof parsed.merged_at !== 'string' || typeof parsed.id !== 'string') {
      return null
    }
    return { merged_at: parsed.merged_at, id: parsed.id }
  } catch {
    return null
  }
}

function buildFeedItem(row: CandidatePRRow, userReaction: ReactionType | null): FeedPR {
  return {
    id: row.id,
    pr_number: row.pr_number,
    title: row.title,
    body_summary: row.body_summary,
    pr_url: row.pr_url,
    repo_full_name: row.repo_full_name,
    merged_at: row.merged_at,
    additions: row.additions,
    deletions: row.deletions,
    commits_count: row.commits_count,
    reaction_counts: normalizeReactionCounts(row.reaction_counts),
    user_reaction: userReaction,
    author: {
      id: row.profiles?.id ?? row.user_id,
      github_username: row.profiles?.github_username ?? '',
      github_avatar_url: row.profiles?.github_avatar_url ?? null,
      display_name: row.profiles?.display_name ?? null,
    },
  }
}

function isAfterCursor(row: CandidatePRRow, cursor: CursorPayload | null): boolean {
  if (!cursor) return true

  // Rows share the query's ordering (merged_at desc, id asc), so a row comes
  // after the cursor when it is older, or equally old with a larger id.
  if (row.merged_at < cursor.merged_at) return true
  if (row.merged_at > cursor.merged_at) return false
  return row.id > cursor.id
}

export async function buildFeed(
  supabase: FeedSupabaseClient,
  userId: string,
  cursor: string | null,
  pageSize: number = FEED_PAGE_SIZE
): Promise<FeedPage> {
  const generated_at = new Date().toISOString()
  const safePageSize = Math.max(1, pageSize)
  const batchLimit = Math.max(safePageSize * 2, 20)
  const decodedCursor = decodeCursor(cursor)

  const collectedRows: CandidatePRRow[] = []
  // Position to resume strictly after, matching the query ordering
  // (merged_at desc, id asc). Starts at the decoded cursor and advances to the
  // last raw row of each batch so re-fetched tie rows are filtered out.
  let boundary = decodedCursor
  let exhausted = false

  for (let batch = 0; batch < MAX_BATCHES && collectedRows.length < safePageSize && !exhausted; batch++) {
    const queryBoundary = boundary

    let query = (
      supabase
        .from('pull_requests')
        .select(`
        id,
        user_id,
        repo_full_name,
        pr_number,
        title,
        body_summary,
        pr_url,
        merged_at,
        additions,
        deletions,
        commits_count,
        reaction_counts,
        profiles (
          id,
          github_username,
          github_avatar_url,
          display_name
        )
      `) as unknown as PullRequestSelectBuilder
    )
      .order('merged_at', { ascending: false })
      .order('id', { ascending: true })

    if (queryBoundary) {
      query = query.lte('merged_at', queryBoundary.merged_at)
    }

    const { data: rawRows } = await query.limit(batchLimit)
    const rows = (rawRows ?? []) as CandidatePRRow[]

    if (rows.length < batchLimit) {
      exhausted = true
    }

    const activeAuthors = Array.from(new Set(rows.map((row) => row.user_id)))
    const publicActiveRepos = await getPublicActiveRepositoriesForUsers(supabase, activeAuthors)
    const activeRepoLookup = buildActiveRepoLookup(publicActiveRepos)

    // Rows already scanned (up to and including the query boundary) are
    // dropped so repeated batches and tie groups do not duplicate items.
    collectedRows.push(
      ...filterPRsByActiveRepos(rows, activeRepoLookup).filter((row) =>
        isAfterCursor(row, queryBoundary)
      )
    )

    const lastRow = rows.at(-1)
    if (lastRow) {
      boundary = { merged_at: lastRow.merged_at, id: lastRow.id }
    }
  }

  const items = collectedRows.slice(0, safePageSize)
  const itemIds = items.map((row) => row.id)

  const reactionRows = itemIds.length === 0
    ? []
    : (
        await ((supabase
          .from('reactions')
          .select('pr_id, reaction_type') as unknown as ReactionSelectBuilder)
          .eq('user_id', userId)
          .in('pr_id', itemIds))
      ).data ?? []

  const userReactions = new Map<string, ReactionType>()
  for (const reaction of reactionRows as CandidateReactionRow[]) {
    userReactions.set(reaction.pr_id, reaction.reaction_type)
  }

  const lastItem = items.at(-1)
  let next_cursor: string | null = null

  if (collectedRows.length > safePageSize && lastItem) {
    // More visible rows were fetched than fit on this page; resume after the
    // last item shown.
    next_cursor = encodeCursor({ merged_at: lastItem.merged_at, id: lastItem.id })
  } else if (!exhausted && boundary) {
    // The batch loop hit its scan cap before exhausting the table; resume
    // after the newest raw row scanned so hidden rows are not re-scanned.
    next_cursor = encodeCursor({ merged_at: boundary.merged_at, id: boundary.id })
  }

  return {
    items: items.map((row) => buildFeedItem(row, userReactions.get(row.id) ?? null)),
    next_cursor,
    generated_at,
  }
}

export async function getCachedFeed(
  supabase: FeedSupabaseClient,
  userId: string
): Promise<FeedPage | null> {
  const cacheQuery = supabase.from('feed_cache').select(
    'user_id, feed_json, generated_at, expires_at'
  ) as unknown as FeedCacheSelectBuilder
  const { data } = await cacheQuery.eq('user_id', userId).maybeSingle()

  const cacheRow = data as FeedCacheRow | null

  if (!cacheRow) {
    return null
  }

  if (new Date(cacheRow.expires_at).getTime() <= Date.now()) {
    return null
  }

  return cacheRow.feed_json as FeedPage
}

export async function setCachedFeed(
  supabase: FeedSupabaseClient,
  userId: string,
  feed: FeedPage,
  ttlSeconds: number = 300
): Promise<void> {
  const now = Date.now()
  const payload: Database['public']['Tables']['feed_cache']['Insert'] = {
    user_id: userId,
    feed_json: feed,
    generated_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlSeconds * 1000).toISOString(),
  }

  await supabase.from('feed_cache').upsert?.([payload] as never, {
    onConflict: 'user_id',
  })
}
