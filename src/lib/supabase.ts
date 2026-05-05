import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest, NextResponse } from 'next/server'
import { createClient as createBaseClient } from '@supabase/supabase-js'
import { applySupabaseCookies } from './supabase-cookie-bridge'
import { buildActiveRepoLookup, filterPRsByActiveRepos } from './repo-visibility'
import type { PullRequestWithProfile } from '@/types'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Type definitions for our database
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          github_username: string
          github_avatar_url: string | null
          github_access_token: string | null
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          github_username: string
          github_avatar_url?: string | null
          github_access_token?: string | null
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          github_username?: string
          github_avatar_url?: string | null
          github_access_token?: string | null
          display_name?: string | null
          created_at?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      github_follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      repositories: {
        Row: {
          id: string
          user_id: string
          repo_full_name: string
          description: string | null
          is_active: boolean
          pr_count: number
          last_synced_at: string | null
          owner_avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo_full_name: string
          description?: string | null
          is_active?: boolean
          pr_count?: number
          last_synced_at?: string | null
          owner_avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo_full_name?: string
          description?: string | null
          is_active?: boolean
          pr_count?: number
          last_synced_at?: string | null
          owner_avatar_url?: string | null
          created_at?: string
        }
      }
      pull_requests: {
        Row: {
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
          is_approved: boolean
          reaction_counts: Record<'love' | 'thumbsup' | 'informative' | 'support' | 'funny', number>
          synced_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo_full_name: string
          pr_number: number
          title: string
          body_summary?: string | null
          pr_url: string
          merged_at: string
          additions?: number
          deletions?: number
          commits_count?: number
          is_approved?: boolean
          reaction_counts?: Record<'love' | 'thumbsup' | 'informative' | 'support' | 'funny', number>
          synced_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo_full_name?: string
          pr_number?: number
          title?: string
          body_summary?: string | null
          pr_url?: string
          merged_at?: string
          additions?: number
          deletions?: number
          commits_count?: number
          is_approved?: boolean
          reaction_counts?: Record<'love' | 'thumbsup' | 'informative' | 'support' | 'funny', number>
          synced_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          pr_id: string
          user_id: string
          reaction_type: 'love' | 'thumbsup' | 'informative' | 'support' | 'funny'
          created_at: string
        }
        Insert: {
          id?: string
          pr_id: string
          user_id: string
          reaction_type: 'love' | 'thumbsup' | 'informative' | 'support' | 'funny'
          created_at?: string
        }
        Update: {
          id?: string
          pr_id?: string
          user_id?: string
          reaction_type?: 'love' | 'thumbsup' | 'informative' | 'support' | 'funny'
          created_at?: string
        }
      }
      feed_cache: {
        Row: {
          user_id: string
          feed_json: unknown
          generated_at: string
          expires_at: string
        }
        Insert: {
          user_id: string
          feed_json: unknown
          generated_at?: string
          expires_at: string
        }
        Update: {
          user_id?: string
          feed_json?: unknown
          generated_at?: string
          expires_at?: string
        }
      }
      sync_metadata: {
        Row: {
          user_id: string
          last_date_range: string | null
          auto_sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          last_date_range?: string | null
          auto_sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          last_date_range?: string | null
          auto_sync_enabled?: boolean
          updated_at?: string
        }
      }
    }
  }
}

type FeedProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'github_username' | 'github_avatar_url' | 'display_name'
>

export interface PublicActiveRepositoryRow {
  user_id: string
  repo_full_name: string
  owner_avatar_url: string | null
}

type RpcCapableClient = {
  rpc: (...args: any[]) => PromiseLike<{ data: unknown; error: unknown }>
}

type SupabaseRpcError = {
  code?: string
  message?: string
  details?: string
  hint?: string | null
}

type PRWithProfileRow = Database['public']['Tables']['pull_requests']['Row'] & {
  profiles: FeedProfile | null
}

const hasFeedProfile = (pr: PRWithProfileRow): pr is Database['public']['Tables']['pull_requests']['Row'] & {
  profiles: FeedProfile
} => pr.profiles !== null

const mapFeedPRs = (
  prs: PRWithProfileRow[],
  source: NonNullable<PullRequestWithProfile['source']>,
  repoAvatarLookup?: Map<string, string | null>
): PullRequestWithProfile[] =>
  prs
    .filter(hasFeedProfile)
    .map((pr) => ({
      id: pr.id,
      user_id: pr.user_id,
      repo_full_name: pr.repo_full_name,
      pr_number: pr.pr_number,
      title: pr.title,
      body_summary: pr.body_summary,
      pr_url: pr.pr_url,
      merged_at: pr.merged_at,
      additions: pr.additions,
      deletions: pr.deletions,
      commits_count: pr.commits_count,
      synced_at: pr.synced_at,
      source,
      profile: pr.profiles,
      repo_owner_avatar_url: repoAvatarLookup?.get(`${pr.user_id}:${pr.repo_full_name}`) ?? null,
    }))

const buildRepoAvatarLookup = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  prs: Array<{ user_id: string; repo_full_name: string }>
): Promise<Map<string, string | null>> => {
  const uniqueRepos = new Map<string, { user_id: string; repo_full_name: string }>()
  for (const pr of prs) {
    const key = `${pr.user_id}:${pr.repo_full_name}`
    if (!uniqueRepos.has(key)) {
      uniqueRepos.set(key, pr)
    }
  }

  const pairs = Array.from(uniqueRepos.values())
  if (pairs.length === 0) return new Map()

  const publicActiveRepos = await getPublicActiveRepositoriesForUsers(
    supabase,
    pairs.map((pair) => pair.user_id)
  )
  const pairKeys = new Set(pairs.map((pair) => `${pair.user_id}:${pair.repo_full_name}`))

  const lookup = new Map<string, string | null>()
  for (const repo of publicActiveRepos) {
    const key = `${repo.user_id}:${repo.repo_full_name}`
    if (pairKeys.has(key)) {
      lookup.set(key, repo.owner_avatar_url)
    }
  }
  return lookup
}

export const getPublicActiveRepositoriesForUsers = async (
  supabase: RpcCapableClient,
  userIds: string[]
): Promise<PublicActiveRepositoryRow[]> => {
  const uniqueUserIds = Array.from(new Set(userIds))

  if (uniqueUserIds.length === 0) {
    return []
  }

  const { data, error } = await supabase.rpc('get_public_active_repositories', {
    target_user_ids: uniqueUserIds,
  })

  if (error) {
    const rpcError = error as SupabaseRpcError

    if (rpcError.code === 'PGRST202') {
      console.error(
        'Public active repositories RPC is missing from Supabase. Apply migration 004_public_active_repositories_rpc.sql and refresh the schema cache.',
        rpcError
      )
    } else {
      console.error('Error fetching public active repositories:', rpcError)
    }
    return []
  }

  return (data ?? []) as PublicActiveRepositoryRow[]
}

// Server client for use in server components (reads cookies from next/headers)
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
    },
  })
}

export const createSupabasePublicClient = () => createBaseClient<Database>(supabaseUrl, supabaseAnonKey)

// Server client for use in API routes (reads cookies from Request)
const getRequestCookies = (request: Request | NextRequest) => {
  if ('cookies' in request && request.cookies && typeof request.cookies.getAll === 'function') {
    return request.cookies.getAll()
  }

  const cookieHeader = request.headers.get('cookie')

  if (!cookieHeader) {
    return []
  }

  return cookieHeader.split(';').map((cookie) => {
    const [name, ...values] = cookie.split('=')
    return { name: name.trim(), value: values.join('=') }
  })
}

export const createSupabaseRouteHandlerClient = (
  request: Request | NextRequest,
  response?: NextResponse
) => {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return getRequestCookies(request)
      },
      setAll(cookiesToSet) {
        if (!response) {
          return
        }

        applySupabaseCookies(request, response, cookiesToSet)
      },
    },
  })
}

// Service role client (bypasses RLS, use with caution - server-only)
export const createSupabaseServiceClient = (): ReturnType<typeof createSupabaseRouteHandlerClient> => {
  return createBaseClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  ) as ReturnType<typeof createSupabaseRouteHandlerClient>
}

// ============================================================================
// SESSION HELPERS
// ============================================================================

/**
 * Get the current user's session from a server component
 * Use this in server components to check authentication status
 */
export const getSession = async () => {
  const supabase = await createSupabaseServerClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error)
    return null
  }

  return session
}

/**
 * Get the current user from a server component
 * Returns null if not authenticated
 */
export const getUser = async () => {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting user:', error)
    return null
  }

  return user
}

/**
 * Get the current user's profile from the database
 * Returns null if not authenticated or profile doesn't exist
 */
export const getUserProfile = async () => {
  const user = await getUser()
  if (!user) return null

  const supabase = await createSupabaseServerClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error getting user profile:', error)
    return null
  }

  return profile
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use this at the top of protected server components
 */
export const requireAuth = async () => {
  const user = await getUser()
  if (!user) {
    // This will be handled by middleware, but we redirect as a fallback
    redirect('/login')
  }
  return user
}

/**
 * Check if a user is authenticated
 * Returns boolean - useful for conditional rendering
 */
export const isAuthenticated = async () => {
  const user = await getUser()
  return !!user
}

// ============================================================================
// FOLLOWER/FOLLOWING QUERIES
// ============================================================================

/**
 * Get pull requests from users that the current user follows
 *
 * @param userId - The current user's ID
 * @param limit - Maximum number of PRs to return (default: 20)
 * @param offset - Number of PRs to skip for pagination (default: 0)
 * @returns Array of PRs with profile information from followed users
 */
export const getFollowedPRs = async (
  userId: string,
  limit = 20,
  offset = 0
) : Promise<PullRequestWithProfile[]> => {
  type FollowRow = Database['public']['Tables']['follows']['Row']

  const supabase = await createSupabaseServerClient()

  // First, get the list of users that the current user follows
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (followsError) {
    console.error('Error fetching follows:', followsError)
    return []
  }

  // If not following anyone, return empty array
  if (!follows || follows.length === 0) {
    return []
  }

  // Get the IDs of followed users
  const followingIds = (follows as FollowRow[]).map((follow) => follow.following_id)
  const activeRepoLookup = await getActiveRepoLookupForUsers(followingIds)

  // Fetch PRs from followed users with their profile information
  const { data: prs, error: prsError } = await supabase
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
      synced_at,
      profiles (
        github_username,
        github_avatar_url,
        display_name
      )
    `)
    .in('user_id', followingIds)
    .order('merged_at', { ascending: false })

  if (prsError) {
    console.error('Error fetching followed PRs:', prsError)
    return []
  }

  const visiblePRs = filterPRsByActiveRepos(prs ?? [], activeRepoLookup)
    .slice(offset, offset + limit)

  const repoAvatarLookup = await buildRepoAvatarLookup(supabase, visiblePRs)
  return mapFeedPRs(visiblePRs as PRWithProfileRow[], 'followed', repoAvatarLookup)
}

const getFollowingIds = async (userId: string) => {
  type FollowRow = Database['public']['Tables']['follows']['Row']

  const supabase = await createSupabaseServerClient()
  const { data: follows, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (error || !follows) {
    if (error) {
      console.error('Error fetching follows:', error)
    }
    return []
  }

  return (follows as FollowRow[]).map((follow) => follow.following_id)
}

const getFollowedPRCount = async (userId: string) => {
  const supabase = await createSupabaseServerClient()
  const followingIds = await getFollowingIds(userId)

  if (followingIds.length === 0) {
    return 0
  }

  const activeRepoLookup = await getActiveRepoLookupForUsers(followingIds)
  const { data: prs, error } = await supabase
    .from('pull_requests')
    .select('id, user_id, repo_full_name')
    .in('user_id', followingIds)

  if (error) {
    console.error('Error fetching followed PR count:', error)
    return 0
  }

  return filterPRsByActiveRepos(prs ?? [], activeRepoLookup).length
}

const getActiveRepoLookupForUsers = async (userIds: string[]) => {
  const supabase = await createSupabaseServerClient()

  const repos = await getPublicActiveRepositoriesForUsers(supabase, userIds)
  return buildActiveRepoLookup(repos)
}

export const getSuggestedPRs = async (
  userId: string,
  limit = 20,
  offset = 0
) => {
  const supabase = await createSupabaseServerClient()
  const followingIds = await getFollowingIds(userId)
  const excludedIds = [userId, ...followingIds]

  const { data: candidateRepos, error: repoError } = await supabase
    .from('repositories')
    .select('user_id, repo_full_name, pr_count, last_synced_at')
    .eq('is_active', true)
    .order('last_synced_at', { ascending: false })
    .order('pr_count', { ascending: false })

  if (repoError || !candidateRepos) {
    if (repoError) {
      console.error('Error fetching suggested repos:', repoError)
    }
    return { prs: [], hasMore: false, total: 0 }
  }

  const typedCandidateRepos = (candidateRepos ?? []) as Array<{
    user_id: string
    repo_full_name: string
    pr_count: number
    last_synced_at: string | null
  }>

  const activeRepoLookup = buildActiveRepoLookup(
    typedCandidateRepos
      .filter((repo) => !excludedIds.includes(repo.user_id))
      .map((repo) => ({
        user_id: repo.user_id,
        repo_full_name: repo.repo_full_name,
      }))
  )

  const candidateIds = Array.from(activeRepoLookup.keys())

  if (candidateIds.length === 0) {
    return { prs: [], hasMore: false, total: 0 }
  }

  const { data: prs, error: prsError } = await supabase
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
      synced_at,
      profiles (
        github_username,
        github_avatar_url,
        display_name
      )
    `)
    .in('user_id', candidateIds)
    .order('merged_at', { ascending: false })

  if (prsError || !prs) {
    if (prsError) {
      console.error('Error fetching suggested PRs:', prsError)
    }
    return { prs: [], hasMore: false, total: 0 }
  }

  const visiblePRs = filterPRsByActiveRepos(prs, activeRepoLookup)
  const slicedPRs = visiblePRs.slice(offset, offset + limit)
  const repoAvatarLookup = await buildRepoAvatarLookup(supabase, slicedPRs)

  return {
    prs: mapFeedPRs(slicedPRs as PRWithProfileRow[], 'suggested', repoAvatarLookup),
    hasMore: offset + limit < visiblePRs.length,
    total: visiblePRs.length,
  }
}

export const getMixedFeedPRs = async (
  userId: string,
  limit = 20,
  offset = 0
) => {
  const followedTotal = await getFollowedPRCount(userId)
  const followedPRs = await getFollowedPRs(userId, limit, offset)

  if (followedPRs.length === limit) {
    return {
      prs: followedPRs,
      hasMore: offset + limit < followedTotal,
    }
  }

  const remaining = Math.max(0, limit - followedPRs.length)
  const suggestedOffset = Math.max(0, offset - followedTotal)
  const suggested = remaining > 0
    ? await getSuggestedPRs(userId, remaining, suggestedOffset)
    : { prs: [], hasMore: false, total: 0 }

  return {
    prs: [...followedPRs, ...suggested.prs],
    hasMore: offset + limit < followedTotal + suggested.total,
  }
}

/**
 * Check if the current user is following a specific user
 *
 * @param currentUserId - The current user's ID
 * @param targetUserId - The user ID to check if following
 * @returns Boolean indicating if following
 */
export const isFollowing = async (currentUserId: string, targetUserId: string) => {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle()

  if (error) {
    console.error('Error checking follow status:', error)
    return false
  }

  return !!data
}
