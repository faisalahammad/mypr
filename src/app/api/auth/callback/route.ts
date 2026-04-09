import { createSupabaseRouteHandlerClient } from '@/lib/supabase'
import { getGitHubFollowing } from '@/lib/github'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase'
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  getSafeAuthRedirectPath,
} from '@/lib/auth-redirect'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = getSafeAuthRedirectPath(requestUrl.searchParams.get('next'))
  const loginUrl = new URL('/login', request.url)

  if (nextPath !== DEFAULT_AUTH_REDIRECT_PATH) {
    loginUrl.searchParams.set('redirect', nextPath)
  }

  if (!code) {
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url))
  response.headers.set('Cache-Control', 'private, no-store')
  const supabase = createSupabaseRouteHandlerClient(request, response)
  const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    console.error('Error exchanging code for session:', sessionError)
    loginUrl.searchParams.set('error', 'auth_failed')
    return NextResponse.redirect(loginUrl)
  }

  if (!session?.user) {
    loginUrl.searchParams.set('error', 'no_session')
    return NextResponse.redirect(loginUrl)
  }

  // Get GitHub metadata from the user
  const userMetadata = session.user.user_metadata
  const githubUsername = userMetadata?.user_name || userMetadata?.login
  const githubAvatar = userMetadata?.avatar_url
  const displayName = userMetadata?.name

  // Get the GitHub access token from the provider token
  const githubAccessToken = session.provider_token

  const profileRow = {
    id: session.user.id,
    github_username: githubUsername as string,
    github_avatar_url: githubAvatar || null,
    github_access_token: githubAccessToken || null,
    display_name: (displayName || githubUsername) as string
  } satisfies Database['public']['Tables']['profiles']['Insert']

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profileRow as never, {
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
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('github_username', githubFollowing)
          .neq('id', session.user.id)

        const typedMatchedProfiles = (matchedProfiles ?? []) as Array<Pick<Database['public']['Tables']['profiles']['Row'], 'id'>>

        if (typedMatchedProfiles.length > 0) {
          const githubFollowRows = typedMatchedProfiles.map((profile) => ({
            follower_id: session.user.id,
            following_id: profile.id,
          })) as Database['public']['Tables']['github_follows']['Insert'][]

          await supabase
            .from('github_follows')
            .upsert(githubFollowRows as never, { onConflict: 'follower_id,following_id' })

          await supabase
            .from('feed_cache')
            .delete()
            .eq('user_id', session.user.id)
        }
      }
    } catch (followError) {
      // Non-fatal — log and continue
      console.error('Error syncing GitHub follows:', followError)
    }
  }

  return response
}
