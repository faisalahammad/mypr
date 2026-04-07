import { createSupabaseRouteHandlerClient, createSupabaseServiceClient } from '@/lib/supabase'
import { getAllMergedPRs, getPRSummary } from '@/lib/github'
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

    // Get active repositories
    const { data: repositories, error: reposError } = await supabase
      .from('repositories')
      .select('repo_full_name')
      .eq('user_id', session.user.id)
      .eq('is_active', true)

    if (reposError) {
      return NextResponse.json(
        { error: 'Failed to fetch repositories', message: reposError.message },
        { status: 500 }
      )
    }

    type RepoType = {
      repo_full_name: string
    }

    if (!repositories || repositories.length === 0) {
      return NextResponse.json(
        { success: true, synced: 0, message: 'No active repositories found. Add repositories in settings first.' },
        { status: 200 }
      )
    }

    // Fetch PRs from GitHub
    const repoFullNames = (repositories as RepoType[]).map(r => r.repo_full_name)
    const gitHubPRs = await getAllMergedPRs(
      typedProfile.github_access_token!,
      repoFullNames,
      typedProfile.github_username
    )

    if (gitHubPRs.length === 0) {
      return NextResponse.json(
        { success: true, synced: 0, message: 'No merged pull requests found in your active repositories.' },
        { status: 200 }
      )
    }

    // Use service role client to bypass RLS for upsert
    const serviceClient = createSupabaseServiceClient()

    // Prepare PR data for upsert
    const prData = gitHubPRs.map(pr => ({
      user_id: session.user.id,
      repo_full_name: pr.base.repo.full_name,
      pr_number: pr.number,
      title: pr.title,
      body_summary: getPRSummary(pr.body),
      pr_url: pr.html_url,
      merged_at: pr.merged_at!,
      additions: pr.additions,
      deletions: pr.deletions,
      commits_count: pr.commits
    } as Database['public']['Tables']['pull_requests']['Insert']))

    // Upsert PRs
    const { data: upsertedPRs, error: upsertError } = await serviceClient
      .from('pull_requests')
      .upsert(prData, {
        onConflict: 'user_id,repo_full_name,pr_number'
      })
      .select()

    if (upsertError) {
      console.error('Error upserting PRs:', upsertError)
      return NextResponse.json(
        { error: 'Failed to sync PRs', message: upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      synced: prData.length,
      message: `Successfully synced ${prData.length} pull request${prData.length !== 1 ? 's' : ''}`,
      prs: upsertedPRs
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

    // Get latest sync timestamp
    const { data: prs, error } = await supabase
      .from('pull_requests')
      .select('synced_at')
      .eq('user_id', session.user.id)
      .order('synced_at', { ascending: false })
      .limit(1)

    type PRType = {
      synced_at: string
    }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sync status' },
        { status: 500 }
      )
    }

    // Get total PR count
    const { count } = await supabase
      .from('pull_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)

    return NextResponse.json({
      last_synced: prs && prs.length > 0 ? (prs as PRType[])[0].synced_at : null,
      total_prs: count || 0
    })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
