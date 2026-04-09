import { createSupabaseRouteHandlerClient, createSupabaseServiceClient } from '@/lib/supabase'
import { searchMergedPRs, getPRSummary, type DateRange } from '@/lib/github'
import { getProfileResultsTag } from '@/lib/profile-results'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
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

    // Use the GitHub Search API to find all authored merged PRs for the user
    const reposWithPRs = await searchMergedPRs(
      typedProfile.github_access_token,
      typedProfile.github_username,
      dateRange
    )

    if (reposWithPRs.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        repos_found: 0,
        message: 'No merged pull requests found for the selected time range.',
      })
    }

    const serviceClient = createSupabaseServiceClient() as typeof supabase
    const now = new Date().toISOString()
    let totalSynced = 0

    for (const repoData of reposWithPRs) {
      const { repo_full_name, description, owner_avatar_url, prs } = repoData

      // Check if repo already exists to preserve is_active status
      const { data: existingRepo } = await serviceClient
        .from('repositories')
        .select('is_active')
        .eq('user_id', session.user.id)
        .eq('repo_full_name', repo_full_name)
        .maybeSingle<{ is_active: boolean }>()

      // Upsert the repository into our cache with description and PR count
      // Only set is_active to false for NEW repos, preserve existing value
      const repoUpsertData = {
        user_id: session.user.id,
        repo_full_name,
        description,
        owner_avatar_url,
        pr_count: prs.length,
        last_synced_at: now,
        is_active: existingRepo?.is_active ?? false,
      } as Database['public']['Tables']['repositories']['Insert']

      const { error: repoError } = await serviceClient
        .from('repositories')
        .upsert(repoUpsertData as never, {
          onConflict: 'user_id,repo_full_name',
        })

      if (repoError) {
        console.error(`Error upserting repository ${repo_full_name}:`, repoError)
        continue
      }

      // Upsert all PRs for this repository
      const prInsertData = prs.map(pr => ({
        user_id: session.user.id,
        repo_full_name: pr.repo_full_name,
        pr_number: pr.pr_number,
        title: pr.title,
        body_summary: getPRSummary(pr.body),
        pr_url: pr.html_url,
        merged_at: pr.merged_at,
        additions: pr.additions,
        deletions: pr.deletions,
        commits_count: pr.commits,
        is_approved: true,
        synced_at: now,
      } as Database['public']['Tables']['pull_requests']['Insert']))

      const { error: prsError } = await serviceClient
        .from('pull_requests')
        .upsert(prInsertData as never, {
          onConflict: 'user_id,repo_full_name,pr_number',
        })

      if (prsError) {
        console.error(`Error upserting PRs for ${repo_full_name}:`, prsError)
      } else {
        totalSynced += prs.length
      }
    }

    // Update pr_count for each repo from the database (ensures accuracy after upsert)
    for (const { repo_full_name } of reposWithPRs) {
      const { count } = await serviceClient
        .from('pull_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('repo_full_name', repo_full_name)

      await serviceClient
        .from('repositories')
        .update(({ pr_count: count ?? 0, last_synced_at: now } as Database['public']['Tables']['repositories']['Update']) as never)
        .eq('user_id', session.user.id)
        .eq('repo_full_name', repo_full_name)
    }

    const { error: metaError } = await serviceClient
      .from('sync_metadata')
      .upsert({
        user_id: session.user.id,
        last_date_range: dateRange,
        updated_at: now,
      } as Database['public']['Tables']['sync_metadata']['Insert'] as never)

    if (metaError) {
      console.error('Error upserting sync metadata:', metaError)
    }

    const { data: followers } = await serviceClient
      .from('follows')
      .select('follower_id')
      .eq('following_id', session.user.id)

    const cacheInvalidationIds = Array.from(
      new Set([
        session.user.id,
        ...((followers ?? []) as Array<{ follower_id: string }>).map((row) => row.follower_id),
      ])
    )

    if (cacheInvalidationIds.length > 0) {
      await serviceClient
        .from('feed_cache')
        .delete()
        .in('user_id', cacheInvalidationIds)
    }

    revalidateTag(getProfileResultsTag(typedProfile.github_username), 'max')
    revalidatePath(`/${typedProfile.github_username}`)

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      repos_found: reposWithPRs.length,
      message: `Synced ${totalSynced} merged PR${totalSynced !== 1 ? 's' : ''} across ${reposWithPRs.length} repo${reposWithPRs.length !== 1 ? 's' : ''}`,
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
      .select('last_date_range')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const typedMeta = syncMeta as { last_date_range: string | null } | null

    return NextResponse.json({
      last_synced: lastSynced,
      total_prs: count || 0,
      last_date_range: typedMeta?.last_date_range ?? null,
    })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
