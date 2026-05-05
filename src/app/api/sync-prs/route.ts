import { createSupabaseRouteHandlerClient, createSupabaseServiceClient } from '@/lib/supabase'
import { syncUserPRs } from '@/lib/sync-user'
import type { DateRange } from '@/lib/github'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const supabase = createSupabaseRouteHandlerClient(request)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to sync PRs' },
        { status: 401 }
      )
    }

    // Get user profile with GitHub access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_username, github_access_token')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', message: 'User profile does not exist' },
        { status: 404 }
      )
    }

    type ProfileType = {
      github_username: string
      github_access_token: string | null
    }

    const typedProfile = profile as ProfileType

    if (!typedProfile.github_access_token) {
      return NextResponse.json(
        { error: 'No GitHub token', message: 'GitHub access token not found. Please reconnect your GitHub account.' },
        { status: 400 }
      )
    }

    // Get date range from request body (default to 3 months if not provided)
    let dateRange: DateRange = '3m'
    try {
      const body = await request.json()
      if (body?.dateRange) {
        dateRange = body.dateRange as DateRange
      }
    } catch {
      // No body / invalid JSON - use default
    }

    // Delegate to shared sync logic
    const result = await syncUserPRs(
      {
        id: session.user.id,
        github_username: typedProfile.github_username,
        github_access_token: typedProfile.github_access_token,
      },
      dateRange
    )

    if (result.error) {
      return NextResponse.json(
        { error: 'Sync failed', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      repos_found: result.repos_found,
      message: result.synced === 0
        ? 'No merged pull requests found for the selected time range.'
        : `Synced ${result.synced} merged PR${result.synced !== 1 ? 's' : ''} across ${result.repos_found} repo${result.repos_found !== 1 ? 's' : ''}`,
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteHandlerClient(request)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get latest sync timestamp from repositories
    const { data: repos } = await supabase
      .from('repositories')
      .select('last_synced_at')
      .eq('user_id', session.user.id)
      .not('last_synced_at', 'is', null)
      .order('last_synced_at', { ascending: false })
      .limit(1)

    // Get total PR count
    const { count } = await supabase
      .from('pull_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)

    const typedRepos = (repos ?? []) as Array<{ last_synced_at: string | null }>
    const lastSynced = typedRepos.length > 0 ? typedRepos[0].last_synced_at : null

    const { data: syncMeta } = await supabase
      .from('sync_metadata')
      .select('last_date_range, auto_sync_enabled')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const typedMeta = syncMeta as { last_date_range: string | null; auto_sync_enabled: boolean } | null

    return NextResponse.json({
      last_synced: lastSynced,
      total_prs: count || 0,
      last_date_range: typedMeta?.last_date_range ?? null,
      auto_sync_enabled: typedMeta?.auto_sync_enabled ?? false,
    })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH endpoint to toggle auto-sync
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteHandlerClient(request)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { auto_sync_enabled } = body

    if (typeof auto_sync_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid input', message: 'auto_sync_enabled must be a boolean' },
        { status: 400 }
      )
    }

    const serviceClient = createSupabaseServiceClient() as typeof supabase

    const { error } = await serviceClient
      .from('sync_metadata')
      .upsert({
        user_id: session.user.id,
        auto_sync_enabled,
        updated_at: new Date().toISOString(),
      } as Database['public']['Tables']['sync_metadata']['Insert'] as never)

    if (error) {
      console.error('Error updating auto_sync_enabled:', error)
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      auto_sync_enabled,
      message: `Auto-sync ${auto_sync_enabled ? 'enabled' : 'disabled'}`,
    })

  } catch (error) {
    console.error('Auto-sync toggle error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
