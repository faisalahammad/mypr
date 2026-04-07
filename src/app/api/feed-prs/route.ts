import { createSupabaseRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/feed-prs - Fetch PRs from followed users with pagination
 *
 * Query params:
 * - limit: number of PRs to return (default: 20, max: 50)
 * - offset: number of PRs to skip (default: 0)
 *
 * Returns:
 * - 200: Array of PRs with profile information
 * - 401: Unauthorized (no session)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Get Supabase client for route handler
    const supabase = createSupabaseRouteHandlerClient(request)

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)
    const offset = Number(searchParams.get('offset')) || 0

    // Get the list of users that the current user follows
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', session.user.id)

    if (followsError) {
      console.error('Error fetching follows:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch follows' },
        { status: 500 }
      )
    }

    // If not following anyone, return empty array
    if (!follows || follows.length === 0) {
      return NextResponse.json({ prs: [], hasMore: false })
    }

    // Get the IDs of followed users
    const followingIds = follows.map((f: any) => f.following_id)

    // Fetch PRs from followed users with their profile information
    const { data: prs, error: prsError, count } = await supabase
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
      `, { count: 'exact' })
      .in('user_id', followingIds)
      .order('merged_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (prsError) {
      console.error('Error fetching followed PRs:', prsError)
      return NextResponse.json(
        { error: 'Failed to fetch PRs' },
        { status: 500 }
      )
    }

    // Transform the data to match PullRequestWithProfile type
    const transformedPRs = prs.map((pr: any) => ({
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

    // Determine if there are more PRs to load
    const hasMore = count !== null && (offset + limit) < count

    return NextResponse.json({
      prs: transformedPRs,
      hasMore,
      total: count || 0,
    })
  } catch (error) {
    console.error('Error in /api/feed-prs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
