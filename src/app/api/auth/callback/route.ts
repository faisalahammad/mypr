import { createSupabaseRouteHandlerClient, createSupabaseServiceClient } from '@/lib/supabase'
import { getGitHubFollowing } from '@/lib/github'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createSupabaseRouteHandlerClient(request)

    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError)
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
    }

    if (!session?.user) {
      return NextResponse.redirect(new URL('/login?error=no_session', request.url))
    }

    // Get GitHub metadata from the user
    const userMetadata = session.user.user_metadata
    const githubUsername = userMetadata?.user_name || userMetadata?.login
    const githubAvatar = userMetadata?.avatar_url
    const displayName = userMetadata?.name

    // Get the GitHub access token from the provider token
    const githubAccessToken = session.provider_token

    // Use service role client to upsert user profile (bypasses RLS)
    const serviceClient = createSupabaseServiceClient()
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: session.user.id,
        github_username: githubUsername as string,
        github_avatar_url: githubAvatar || null,
        github_access_token: githubAccessToken || null,
        display_name: (displayName || githubUsername) as string
      } as Database['public']['Tables']['profiles']['Insert'], {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Error upserting profile:', profileError)
      // Continue anyway - the profile might already exist
    }

    // Sync GitHub follows — find which followed GitHub usernames have profiles here
    if (githubAccessToken) {
      try {
        const githubFollowing = await getGitHubFollowing(githubAccessToken)

        if (githubFollowing.length > 0) {
          // Look up which of those usernames have profiles in our app
          const { data: matchedProfiles } = await serviceClient
            .from('profiles')
            .select('id')
            .in('github_username', githubFollowing)
            .neq('id', session.user.id)

          if (matchedProfiles && matchedProfiles.length > 0) {
            const followRows = matchedProfiles.map((p: any) => ({
              follower_id: session.user.id,
              following_id: p.id,
            }))

            // Upsert — safe to call on every login, ignored on conflict
            await serviceClient
              .from('follows')
              .upsert(followRows, { onConflict: 'follower_id,following_id' })
          }
        }
      } catch (followError) {
        // Non-fatal — log and continue
        console.error('Error syncing GitHub follows:', followError)
      }
    }

    // Redirect to settings page (first-time setup)
    return NextResponse.redirect(new URL('/settings', request.url))
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
