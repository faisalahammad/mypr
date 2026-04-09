import type { SupabaseClient } from '@supabase/supabase-js'
import { buildActiveRepoLookup, filterPRsByActiveRepos } from './repo-visibility'
import { getPublicActiveRepositoriesForUsers, type Database } from './supabase'

export type ReactionType = 'love' | 'thumbsup' | 'informative' | 'support' | 'funny'

export type ReactionCounts = Record<ReactionType, number>

export interface FeedPR {
  id: string
  pr_number: number
  title: string
  body_summary: string | null
  pr_url: string
  repo_full_name: string
  merged_at: string
  additions: number
  deletions: number
  commits_count: number
  reaction_counts: ReactionCounts
  user_reaction: ReactionType | null
  author: {
    id: string
    github_username: string
    github_avatar_url: string | null
    display_name: string | null
  }
  score: number
}

export interface FeedPage {
  items: FeedPR[]
  next_cursor: string | null
  generated_at: string
}

type FeedCategory = 'self' | 'followed' | 'github_followed' | 'discovery'

export type FeedSupabaseClient = Pick<SupabaseClient<Database>, 'from' | 'rpc'>

type CursorPayload = {
  score: number
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

type FollowRow = Pick<Database['public']['Tables']['follows']['Row'], 'following_id'>

type GitHubFollowRow = Pick<Database['public']['Tables']['github_follows']['Row'], 'following_id'>

type FeedCacheRow = Pick<
  Database['public']['Tables']['feed_cache']['Row'],
  'user_id' | 'feed_json' | 'generated_at' | 'expires_at'
>

type ProfileSelectBuilder = {
  eq: (column: string, value: string) => {
    maybeSingle: () => MaybeSingleResult<CandidateProfileRow | null>
  }
}

type FollowSelectBuilder = {
  eq: (column: string, value: string) => ListResult<FollowRow[]>
}

type GitHubFollowSelectBuilder = {
  eq: (column: string, value: string) => ListResult<GitHubFollowRow[]>
}

type PullRequestSelectBuilder = {
  order: (column: string, options: { ascending: boolean }) => {
    limit: (value: number) => ListResult<CandidatePRRow[]>
  }
}

type ReactionSelectBuilder = {
  eq: (column: string, value: string) => {
    in: (column: string, values: string[]) => ListResult<CandidateReactionRow[]>
  }
}

type FeedCacheSelectBuilder = {
  eq: (column: string, value: string) => {
    maybeSingle: () => MaybeSingleResult<FeedCacheRow | null>
  }
}

type ScoredCandidate = {
  row: CandidatePRRow
  category: FeedCategory
  baseScore: number
  userReaction: ReactionType | null
}

type DiversityEntry = {
  item: FeedPR
  cursorScore: number
  category: FeedCategory
}

const PAGE_SIZE_DEFAULT = 20
const DISCOVERY_MAX_AGE_DAYS = 60
const FOLLOWED_MAX_AGE_DAYS = 180
const HOURS_IN_DAY = 24
const MIN_CANDIDATE_POOL = 500

export const THRESHOLDS = {
  SOLO: 0,
  FORMING: 15,
  SOCIAL: 100,
} as const

export const HALF_LIVES: Record<FeedCategory, number> = {
  self: 96,
  followed: 72,
  github_followed: 48,
  discovery: 24,
}

export const EMPTY_REACTION_COUNTS: ReactionCounts = {
  love: 0,
  thumbsup: 0,
  informative: 0,
  support: 0,
  funny: 0,
}

export function getRelationshipWeight(
  authorId: string,
  currentUserId: string,
  followedIds: Set<string>,
  githubFollowedIds: Set<string>,
  followingCount: number
): number {
  if (authorId === currentUserId) {
    if (followingCount === 0) return 1.0
    if (followingCount <= THRESHOLDS.FORMING) return 0.7
    if (followingCount <= THRESHOLDS.SOCIAL) return 0.4
    return 0.2
  }

  if (followedIds.has(authorId)) return 1.0

  if (githubFollowedIds.has(authorId)) {
    if (followingCount === 0) return 0.5
    if (followingCount <= THRESHOLDS.FORMING) return 0.6
    if (followingCount <= THRESHOLDS.SOCIAL) return 0.4
    return 0.2
  }

  if (followingCount === 0) return 0.3
  if (followingCount <= THRESHOLDS.FORMING) return 0.15
  if (followingCount <= THRESHOLDS.SOCIAL) return 0.05
  return 0
}

export function getRecencyScore(mergedAt: string, category: FeedCategory): number {
  const hoursOld = (Date.now() - new Date(mergedAt).getTime()) / 3600000
  const halfLife = HALF_LIVES[category] ?? 48
  return 1 / (1 + hoursOld / halfLife)
}

export function getEngagementBoost(reactionCounts: ReactionCounts): number {
  const total = Object.values(reactionCounts).reduce((sum, value) => sum + value, 0)
  return Math.min(1 + total * 0.02, 1.4)
}

function normalizeReactionCounts(
  counts: Partial<ReactionCounts> | null | undefined
): ReactionCounts {
  return {
    ...EMPTY_REACTION_COUNTS,
    ...(counts ?? {}),
  }
}

function normalizeScore(score: number): number {
  return Number(score.toFixed(6))
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

function decodeCursor(cursor: string | null): CursorPayload | null {
  if (!cursor) return null

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Partial<CursorPayload>
    if (typeof parsed.score !== 'number' || typeof parsed.id !== 'string') {
      return null
    }
    return { score: parsed.score, id: parsed.id }
  } catch {
    return null
  }
}

function getCategory(
  authorId: string,
  currentUserId: string,
  followedIds: Set<string>,
  githubFollowedIds: Set<string>
): FeedCategory {
  if (authorId === currentUserId) return 'self'
  if (followedIds.has(authorId)) return 'followed'
  if (githubFollowedIds.has(authorId)) return 'github_followed'
  return 'discovery'
}

function isWithinAgeLimit(mergedAt: string, category: FeedCategory): boolean {
  if (category === 'self') return true

  const hoursOld = (Date.now() - new Date(mergedAt).getTime()) / 3600000

  if (category === 'discovery') {
    return hoursOld <= DISCOVERY_MAX_AGE_DAYS * HOURS_IN_DAY
  }

  return hoursOld <= FOLLOWED_MAX_AGE_DAYS * HOURS_IN_DAY
}

function isStaleForPrimaryPass(mergedAt: string, category: FeedCategory): boolean {
  return !isWithinAgeLimit(mergedAt, category)
}

function isAfterCursor(candidate: ScoredCandidate, cursor: CursorPayload | null): boolean {
  if (!cursor) return true

  if (candidate.baseScore < cursor.score) return true
  if (candidate.baseScore > cursor.score) return false
  return candidate.row.id < cursor.id
}

function compareScoredCandidates(left: ScoredCandidate, right: ScoredCandidate): number {
  if (left.baseScore !== right.baseScore) {
    return right.baseScore - left.baseScore
  }

  return right.row.id.localeCompare(left.row.id)
}

function buildFeedItem(candidate: ScoredCandidate, score: number): FeedPR {
  return {
    id: candidate.row.id,
    pr_number: candidate.row.pr_number,
    title: candidate.row.title,
    body_summary: candidate.row.body_summary,
    pr_url: candidate.row.pr_url,
    repo_full_name: candidate.row.repo_full_name,
    merged_at: candidate.row.merged_at,
    additions: candidate.row.additions,
    deletions: candidate.row.deletions,
    commits_count: candidate.row.commits_count,
    reaction_counts: normalizeReactionCounts(candidate.row.reaction_counts),
    user_reaction: candidate.userReaction,
    author: {
      id: candidate.row.profiles?.id ?? candidate.row.user_id,
      github_username: candidate.row.profiles?.github_username ?? '',
      github_avatar_url: candidate.row.profiles?.github_avatar_url ?? null,
      display_name: candidate.row.profiles?.display_name ?? null,
    },
    score,
  }
}

function applyDiversityPass(
  candidates: ScoredCandidate[],
  authorCounts: Map<string, number> = new Map()
): { entries: DiversityEntry[]; authorCounts: Map<string, number> } {
  const entries: DiversityEntry[] = []

  for (const candidate of candidates) {
    const seen = authorCounts.get(candidate.row.user_id) ?? 0
    if (seen >= 3) {
      continue
    }

    const nextCount = seen + 1
    authorCounts.set(candidate.row.user_id, nextCount)

    const penalty = nextCount === 1 ? 1 : nextCount === 2 ? 0.6 : 0.3

    entries.push({
      item: buildFeedItem(candidate, candidate.baseScore * penalty),
      cursorScore: candidate.baseScore,
      category: candidate.category,
    })
  }

  return {
    entries,
    authorCounts,
  }
}

function getFallbackCategoryOrder(followingCount: number): FeedCategory[] {
  if (followingCount === 0) {
    return ['self', 'discovery', 'github_followed', 'followed']
  }

  if (followingCount <= THRESHOLDS.FORMING) {
    return ['followed', 'self', 'github_followed', 'discovery']
  }

  if (followingCount <= THRESHOLDS.SOCIAL) {
    return ['followed', 'github_followed', 'self', 'discovery']
  }

  return ['followed', 'self', 'github_followed', 'discovery']
}

function fillByFallbackOrder(
  existing: DiversityEntry[],
  remaining: DiversityEntry[],
  followingCount: number,
  pageSize: number
): DiversityEntry[] {
  if (existing.length >= pageSize || remaining.length === 0) {
    return existing
  }

  const orderedCategories = getFallbackCategoryOrder(followingCount)
  const grouped = new Map<FeedCategory, DiversityEntry[]>()

  for (const entry of remaining) {
    const current = grouped.get(entry.category) ?? []
    current.push(entry)
    grouped.set(entry.category, current)
  }

  const filled = [...existing]
  for (const category of orderedCategories) {
    const entries = grouped.get(category) ?? []
    for (const entry of entries) {
      if (filled.length >= pageSize) {
        return filled
      }
      filled.push(entry)
    }
  }

  return filled
}

export async function buildFeed(
  supabase: FeedSupabaseClient,
  userId: string,
  cursor: string | null,
  pageSize: number = PAGE_SIZE_DEFAULT
): Promise<FeedPage> {
  const generated_at = new Date().toISOString()
  const safePageSize = Math.max(1, pageSize)
  const overfetch = Math.max(safePageSize * 5, 100, MIN_CANDIDATE_POOL)

  const profileQuery = supabase.from('profiles').select(
    'id, github_username, github_avatar_url, display_name'
  ) as unknown as ProfileSelectBuilder
  const { data: profile } = await profileQuery.eq('id', userId).maybeSingle()

  if (!profile) {
    return {
      items: [],
      next_cursor: null,
      generated_at,
    }
  }

  const [{ data: follows }, { data: githubFollows }, { data: rawPullRequests }] = await Promise.all([
    (supabase.from('follows').select('following_id') as unknown as FollowSelectBuilder).eq('follower_id', userId),
    (supabase.from('github_follows').select('following_id') as unknown as GitHubFollowSelectBuilder).eq(
      'follower_id',
      userId
    ),
    (
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
      .limit(overfetch),
  ])

  const followedIds = new Set(((follows ?? []) as FollowRow[]).map((follow) => follow.following_id))
  const githubFollowedIds = new Set(
    ((githubFollows ?? []) as GitHubFollowRow[]).map((follow) => follow.following_id)
  )
  const followingCount = followedIds.size
  const candidateRows = (rawPullRequests ?? []) as CandidatePRRow[]

  const activeAuthors = Array.from(new Set(candidateRows.map((row) => row.user_id)))
  const publicActiveRepos = await getPublicActiveRepositoriesForUsers(supabase, activeAuthors)
  const visibleRows = filterPRsByActiveRepos(candidateRows, buildActiveRepoLookup(publicActiveRepos))

  const candidatePrIds = visibleRows.map((row) => row.id)
  const reactionRows = candidatePrIds.length === 0
    ? []
    : (
        await ((supabase
          .from('reactions')
          .select('pr_id, reaction_type') as unknown as ReactionSelectBuilder)
          .eq('user_id', userId)
          .in('pr_id', candidatePrIds))
      ).data ?? []

  const userReactions = new Map<string, ReactionType>()
  for (const reaction of reactionRows as CandidateReactionRow[]) {
    userReactions.set(reaction.pr_id, reaction.reaction_type)
  }

  const decodedCursor = decodeCursor(cursor)
  const scoredCandidates = visibleRows
    .map((row): ScoredCandidate => {
      const category = getCategory(row.user_id, userId, followedIds, githubFollowedIds)
      const reaction_counts = normalizeReactionCounts(row.reaction_counts)
      const baseScore = normalizeScore(
        getRelationshipWeight(row.user_id, userId, followedIds, githubFollowedIds, followingCount) *
          getRecencyScore(row.merged_at, category) *
          getEngagementBoost(reaction_counts)
      )

      return {
        row,
        category,
        baseScore,
        userReaction: userReactions.get(row.id) ?? null,
      }
    })
    .sort(compareScoredCandidates)
    .filter((candidate) => isAfterCursor(candidate, decodedCursor))

  const freshCandidates = scoredCandidates.filter(
    (candidate) => !isStaleForPrimaryPass(candidate.row.merged_at, candidate.category)
  )
  const staleCandidates = scoredCandidates.filter((candidate) =>
    isStaleForPrimaryPass(candidate.row.merged_at, candidate.category)
  )

  const freshResult = applyDiversityPass(freshCandidates)
  const freshEligibleEntries = freshResult.entries

  let eligibleEntries = freshEligibleEntries

  if (freshEligibleEntries.length < safePageSize && staleCandidates.length > 0) {
    const staleResult = applyDiversityPass(staleCandidates, freshResult.authorCounts)
    eligibleEntries = [...freshEligibleEntries, ...staleResult.entries]
  }

  const primaryEntries = eligibleEntries.slice(0, safePageSize)
  const remainingEntries = eligibleEntries.slice(safePageSize)
  const filledEntries = fillByFallbackOrder(primaryEntries, remainingEntries, followingCount, safePageSize)
  const items = filledEntries.slice(0, safePageSize).map((entry) => entry.item)

  const next_cursor =
    eligibleEntries.length > safePageSize
      ? encodeCursor({
          score: eligibleEntries[safePageSize - 1].cursorScore,
          id: eligibleEntries[safePageSize - 1].item.id,
        })
      : null

  return {
    items,
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
