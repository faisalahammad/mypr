import { createSupabaseRouteHandlerClient, getMixedFeedPRs } from '@/lib/supabase'
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

    const { prs, hasMore } = await getMixedFeedPRs(session.user.id, limit, offset)

    return NextResponse.json({
      prs,
      hasMore,
    })
  } catch (error) {
    console.error('Error in /api/feed-prs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
