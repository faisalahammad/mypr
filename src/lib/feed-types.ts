/**
 * Client-safe feed types and constants.
 *
 * Kept separate from `feed.ts` so client components can import values
 * (e.g. FEED_PAGE_SIZE) without pulling the server-side Supabase client
 * into the browser bundle.
 */

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
}

export interface FeedPage {
  items: FeedPR[]
  next_cursor: string | null
  generated_at: string
}

export const FEED_PAGE_SIZE = 10

export const EMPTY_REACTION_COUNTS: ReactionCounts = {
  love: 0,
  thumbsup: 0,
  informative: 0,
  support: 0,
  funny: 0,
}
