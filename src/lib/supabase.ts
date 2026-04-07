import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient as createBaseClient } from '@supabase/supabase-js'

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
      repositories: {
        Row: {
          id: string
          user_id: string
          repo_full_name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo_full_name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo_full_name?: string
          is_active?: boolean
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
          synced_at?: string
        }
      }
    }
  }
}

// Server client for use in server components (reads cookies from next/headers)
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

// Server client for use in API routes (reads cookies from Request)
export const createSupabaseRouteHandlerClient = (request: Request) => {
  const requestHeaders = new Headers(request.headers)
  const cookieHeader = requestHeaders.get('cookie')

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (!cookieHeader) return []
        return cookieHeader.split(';').map((cookie) => {
          const [name, ...values] = cookie.split('=')
          return { name: name.trim(), value: values.join('=') }
        })
      },
      setAll(cookiesToSet) {
        // This method won't be used in API routes since we return cookies via headers
        cookiesToSet.forEach(({ name, value, options }) => {
          const setCookieHeader = `${name}=${value}; Path=${options?.path || '/'}`
          requestHeaders.append('set-cookie', setCookieHeader)
        })
      },
    },
  })
}

// Service role client (bypasses RLS, use with caution - server-only)
export const createSupabaseServiceClient = () => {
  const client = createBaseClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Type assertion to ensure proper typing
  return client as any
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
  const session = await getSession()
  return session?.user ?? null
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
) => {
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
  const followingIds = follows.map((f: any) => f.following_id)

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
    .range(offset, offset + limit - 1)

  if (prsError) {
    console.error('Error fetching followed PRs:', prsError)
    return []
  }

  // Transform the data to match PullRequestWithProfile type
  return prs.map((pr: any) => ({
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
    profile: pr.profiles || null,
  }))
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
