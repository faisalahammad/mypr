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
